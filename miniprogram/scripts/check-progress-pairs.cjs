const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const output = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/lib', `${name}.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} }; cache.set(name, module.exports);
  new Function('exports', 'module', 'require', output)(module.exports, module, dependency => load(dependency.replace(/^\.\//, '')));
  return module.exports;
}
function freeze(value) { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } return value; }
const progress = load('progress-draft'), domain = load('domain-data'), entry = load('entry-draft');
const empty = () => ({ version: 1, domains: [{ id: 'work', name: '工作', iconId: 'work', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] }], completedGoals: [] });
const image = { id: 'pair-image', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' };
const first = freeze(progress.newProgressDraft('work'));
let draft = progress.appendProgressPair(first);
draft = progress.appendProgressPair(draft);
assert.equal(draft.positive, first.positive); assert.equal(draft.negative, first.negative);
assert.equal(draft.domainId, 'work'); assert.equal(draft.pairs.length, 2);
assert.deepEqual(progress.progressRows(draft).map(row => row.pairIndex), [0, 0, 1, 1, 2, 2]);
assert.equal(new Set(progress.progressRows(draft).map(row => row.record.id)).size, 6, 'Each explicit add owns two unique stable IDs');
assert.equal(progress.hasProgressContent(draft), false);
assert.throws(() => progress.progressEntries(draft), /请先输入/);
const valid = JSON.parse(JSON.stringify(draft));
valid.positive.content = '第一组正记录'; valid.negative.content = '第一组负记录';
valid.pairs[0].positive.content = '第二组正记录'; valid.pairs[0].negative.images = [image];
valid.pairs[1].negative.content = '第三组负记录';
freeze(valid);
const before = empty(), encoded = JSON.stringify(before);
const saved = progress.saveProgressDraft(before, valid);
assert.equal(saved.domains[0].positiveRecords.length, 2);
assert.equal(saved.domains[0].negativeRecords.length, 3);
assert.equal(JSON.stringify(before), encoded, 'All five filled records save in one immutable state update');
assert.equal(progress.saveProgressDraft(saved, valid, true), saved, 'A failed local write retries the complete batch with the same IDs');
assert.equal(saved.domains[0].negativeRecords[1].images[0].dataUrl, image.dataUrl);
assert.equal(progress.progressEntries(valid).length, 5, 'Blank appended boxes never become business records');
assert.equal(progress.progressRows(valid)[2].record.images, valid.pairs[0].positive.images, 'Views never copy record images or allocate IDs');
const invalidLate = JSON.parse(JSON.stringify(valid)); invalidLate.pairs[1].negative.content = '字'.repeat(6001);
assert.throws(() => progress.saveProgressDraft(before, invalidLate), /6000/);
assert.equal(JSON.stringify(before), encoded, 'Invalid content in the last pair cannot partially append earlier pairs');
const colliding = empty(); colliding.domains[0].negativeRecords = [progress.progressEntries(valid).at(-1).record];
const collisionBefore = JSON.stringify(colliding);
assert.throws(() => progress.saveProgressDraft(colliding, valid), /已存在/);
assert.equal(JSON.stringify(colliding), collisionBefore);
const full = empty(); full.domains[0].positiveRecords = Array.from({ length: domain.MAX_DOMAIN_RECORDS - 4 }, (_, index) => ({ id: `kept-${index}`, content: '历史', createdAt: valid.positive.createdAt }));
assert.throws(() => progress.saveProgressDraft(full, valid), /5000/);
assert.equal(full.domains[0].negativeRecords.length, 0);
const changedRetry = JSON.parse(JSON.stringify(valid)); changedRetry.pairs[1].negative.content = '已改变的重试内容';
assert.throws(() => progress.saveProgressDraft(saved, changedRetry, true), /发生变化/);

for (const mutate of [
  value => value.pairs = null,
  value => value.pairs = new Array(1),
  value => value.pairs[0].positive.id = value.positive.id,
  value => value.pairs[1].negative.id = value.pairs[0].positive.id,
  value => value.pairs[0].kinds = ['unknown', 'negative'],
  value => value.pairs[0].negative.images = [image, image],
]) {
  const invalid = JSON.parse(JSON.stringify(valid)); mutate(invalid);
  assert.equal(progress.isProgressDraft(invalid), false);
  assert.throws(() => progress.saveProgressDraft(before, invalid));
}
let bounded = progress.newProgressDraft('work');
for (let index = 1; index < progress.MAX_PROGRESS_PAIRS; index++) bounded = progress.appendProgressPair(bounded);
assert.equal(progress.progressRows(bounded).length, domain.MAX_DOMAIN_RECORD_BATCH);
assert.equal(progress.isProgressDraft(bounded), true);
assert.throws(() => progress.appendProgressPair(bounded), /20/);

let common = entry.newEntryDraft('progress'); common.progress = valid;
const restored = JSON.parse(JSON.stringify(entry.entryDraftForStorage(common)));
assert.equal(entry.isEntryDraft(restored), true);
assert.deepEqual(restored.progress.pairs, valid.pairs);
const switched = entry.switchEntryMode(common, 'memo'); switched.memo.title = '只更新共享正记录';
const resumed = entry.switchEntryMode(switched, 'progress');
assert.equal(resumed.progress.pairs, valid.pairs, 'Switching creation modes never replaces appended pairs or their images');
assert.equal(resumed.progress.negative, valid.negative);
assert.equal(resumed.progress.positive.id, valid.positive.id);
assert.equal(resumed.progress.positive.content, switched.memo.title);
assert.deepEqual(entry.validateEntry(resumed), []);
const pending = freeze({ ...common, pendingSave: 'progress' });
assert.equal(entry.switchEntryMode(pending, 'task'), pending, 'Pending saves cannot change the pair batch or source domain');
assert.equal(progress.saveProgressDraft(saved, pending.progress, true), saved);
const single = progress.singleProgressDraft(valid);
assert.equal(single.pairs, undefined);
assert.equal(single.legacy.length, 5, 'Legacy single-box conversion retains every independently filled row');
let remaining = progress.remainingProgressDraft(single), recovered = progress.saveProgressDraft(empty(), single);
const recoveredIds = new Set(progress.progressEntries(single).map(row => row.record.id));
while (remaining) {
  for (const row of progress.progressEntries(remaining)) recoveredIds.add(row.record.id);
  recovered = progress.saveProgressDraft(recovered, remaining);
  remaining = progress.remainingProgressDraft(remaining);
}
assert.equal(recoveredIds.size, 5);
assert.equal(recovered.domains[0].positiveRecords.length + recovered.domains[0].negativeRecords.length, 5, 'Legacy recovery eventually saves every pair exactly once');
const firstAutosave = progress.saveAutoProgressDraft(empty(), null, valid);
assert.equal(firstAutosave.domains[0].positiveRecords.length, 2); assert.equal(firstAutosave.domains[0].negativeRecords.length, 3);
assert.equal(progress.saveAutoProgressDraft(firstAutosave, valid, valid), firstAutosave, 'Unchanged autosave acknowledgements do not generate another archive write');
const typedAgain = JSON.parse(JSON.stringify(valid)); typedAgain.pairs[0].positive.content = '第二组持续编辑'; typedAgain.pairs[1].positive.content = '之前空白的框现在填入';
const secondAutosave = progress.saveAutoProgressDraft(firstAutosave, valid, typedAgain);
assert.equal(secondAutosave.domains[0].positiveRecords.length, 3, 'Typing into another box adds its original ID rather than duplicating prior rows');
assert.equal(secondAutosave.domains[0].positiveRecords.find(record => record.id === valid.pairs[0].positive.id).content, '第二组持续编辑');
assert.equal(secondAutosave.domains[0].positiveRecords[0].createdAt, firstAutosave.domains[0].positiveRecords[0].createdAt);
assert.deepEqual(progress.saveAutoProgressDraft(firstAutosave, null, valid), firstAutosave, 'Retrying a failed first local write with the same IDs is idempotent');
const concurrent = JSON.parse(JSON.stringify(firstAutosave));
concurrent.domains[0].positiveRecords[0].images = [image]; concurrent.domains[0].positiveRecords[0].future = '保留远端字段';
concurrent.domains[0].negativeRecords.push({ id: 'unrelated-remote', content: '另一个窗口的记录', createdAt: valid.positive.createdAt });
const changedFirst = JSON.parse(JSON.stringify(valid)); changedFirst.positive.content = '本窗口改正文';
const merged = progress.saveAutoProgressDraft(freeze(concurrent), valid, changedFirst);
assert.deepEqual(merged.domains[0].positiveRecords[0].images, [image], 'An unchanged image field does not erase a newer attachment');
assert.equal(merged.domains[0].positiveRecords[0].future, '保留远端字段');
assert.equal(merged.domains[0].negativeRecords.at(-1), concurrent.domains[0].negativeRecords.at(-1), 'Unrelated records retain their order and reference');
const cleared = JSON.parse(JSON.stringify(valid)); cleared.pairs[0].negative.images = []; cleared.negative.content = '';
const clearedSaved = progress.saveAutoProgressDraft(firstAutosave, valid, cleared);
assert.equal(clearedSaved.domains[0].negativeRecords.length, 1, 'Clearing a saved row removes exactly its own record');
assert.equal(clearedSaved.domains[0].negativeRecords[0].id, valid.pairs[1].negative.id);
assert.throws(() => progress.saveAutoProgressDraft(clearedSaved, valid, cleared), /已删除或移动/);
assert.equal(progress.saveAutoProgressDraft(clearedSaved, valid, cleared, true), clearedSaved, 'A host-confirmed volatile clear retries the already-applied removal without duplication or resurrection');
const missing = { ...firstAutosave, domains: [{ ...firstAutosave.domains[0], positiveRecords: firstAutosave.domains[0].positiveRecords.slice(1) }] };
assert.throws(() => progress.saveAutoProgressDraft(missing, valid, changedFirst), /已删除或移动/, 'A deleted saved row is never recreated by late autosave');
assert.throws(() => progress.saveAutoProgressDraft(missing, valid, changedFirst, true), /已删除或移动/, 'Even a volatile retry cannot resurrect a nonempty deleted record');
assert.equal(missing.domains[0].positiveRecords.length, 1);
assert.throws(() => progress.saveAutoProgressDraft(firstAutosave, valid, invalidLate), /6000/);
assert.equal(firstAutosave.domains[0].positiveRecords.length, 2, 'A late invalid row prevents the complete autosave batch');
const otherDomain = { ...firstAutosave.domains[0], id: 'life', name: '生活', positiveRecords: [], negativeRecords: [] };
const movedDomain = progress.saveAutoProgressDraft({ ...firstAutosave, domains: [...firstAutosave.domains, otherDomain] }, valid, { ...valid, domainId: 'life' });
assert.equal(movedDomain.domains[0].positiveRecords.length + movedDomain.domains[0].negativeRecords.length, 0);
assert.equal(movedDomain.domains[1].positiveRecords.length + movedDomain.domains[1].negativeRecords.length, 5, 'Changing the creator domain moves just this window’s records atomically');
assert.throws(() => progress.saveAutoProgressDraft(firstAutosave, valid, { ...valid, domainId: 'removed-domain' }), /修改无效/);
const emptyDomainState = { version: 1, domains: [], completedGoals: [] };
assert.equal(progress.saveAutoProgressDraft(emptyDomainState, null, progress.newProgressDraft()), emptyDomainState, 'An empty open window never creates a system domain or blank record');
const firstFallbackDraft = progress.newProgressDraft(); firstFallbackDraft.negative.content = '负记录创建其它领域';
const firstFallback = progress.saveAutoProgressDraft(emptyDomainState, null, firstFallbackDraft);
assert.equal(firstFallback.domains[0].name, '其它'); assert.equal(firstFallback.domains[0].negativeRecords.length, 1);
console.log('PASS repeatable progress pairs: stable IDs, immutable append, draft recovery, shared domain, atomic multi-row save/retry/capacity/conflicts, image validation, blank-row filtering and bounded UI batch.');
