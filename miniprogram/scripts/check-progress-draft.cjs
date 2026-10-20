const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/lib', `${name}.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  new Function('exports', 'require', source)(exports, name => load(name.replace(/^\.\//, '')));
  modules.set(name, exports); return exports;
}
const data = load('domain-data'), progress = load('progress-draft'), entry = load('entry-draft');
const clone = value => JSON.parse(JSON.stringify(value));
const initial = () => clone(data.initialDomainState);
const image = { id: 'progress-picture', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' };
const oldDual = (domainId = 'work') => {
  const draft = progress.newProgressDraft(domainId); delete draft.pair; delete draft.kinds; return draft;
};
const oldSingle = (domainId = 'work', kind = 'positive') => ({ ...oldDual(domainId), single: true, kind });
function freeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object' && !Object.isFrozen(child)) freeze(child);
  return value;
}
const draft = progress.newProgressDraft('work');
assert.equal(draft.pair, true); assert.deepEqual(draft.kinds, ['positive', 'negative']);
assert.equal(draft.single, undefined);
assert.equal(progress.hasProgressContent(draft), false);
assert.throws(() => progress.saveProgressDraft(initial(), draft), /请先输入/);
draft.positive.content = '# 进展\n\n**完成了第一步**'; draft.positive.images = [image];
draft.negative.content = '  遇到了阻碍  ';
const old = initial(), before = JSON.stringify(old);
const saved = progress.saveProgressDraft(old, draft);
const work = saved.domains.find(domain => domain.id === 'work');
assert.equal(JSON.stringify(old), before, 'Two-box saves never mutate the source');
assert.equal(work.positiveRecords.length, 1); assert.equal(work.negativeRecords.length, 1);
assert.equal(work.negativeRecords[0].content, '遇到了阻碍');
assert.deepEqual(work.positiveRecords[0].images, [image]); assert.ok(data.isDomainState(clone(saved)));
assert.equal(progress.saveProgressDraft(saved, draft, true), saved, 'A retry with the same IDs cannot duplicate either side');
assert.throws(() => progress.saveProgressDraft(saved, draft), /已存在/);
const changed = clone(draft); changed.positive.content = '不同的已保存内容';
assert.throws(() => progress.saveProgressDraft(saved, changed, true), /发生变化/);
const moved = { ...draft, domainId: 'life' };
assert.throws(() => progress.saveProgressDraft(saved, moved, true), /发生变化/);
assert.throws(() => progress.saveProgressDraft(saved, { ...draft, domainId: 'missing' }), /不存在/);
const positive = progress.newProgressDraft(); positive.positive.images = [image]; positive.negative.content = ' \n ';
const fallback = progress.saveProgressDraft(initial(), positive).domains.at(-1);
assert.equal(fallback.name, '未分类'); assert.equal(fallback.positiveRecords[0].content, ''); assert.equal(fallback.negativeRecords.length, 0);
const negative = progress.newProgressDraft('work'); negative.positive.content = '仅负记录'; negative.kinds[0] = 'negative';
assert.equal(progress.saveProgressDraft(initial(), negative).domains.find(domain => domain.id === 'work').positiveRecords.length, 0);
for (const images of [null, {}, [image, image], Array(7).fill(image), [{ id: 'bad', dataUrl: '/temporary.png' }]]) {
  const invalid = clone(draft); invalid.negative.images = images;
  assert.equal(progress.isProgressDraft(invalid), false);
  assert.throws(() => progress.saveProgressDraft(old, invalid));
  assert.equal(JSON.stringify(old), before);
}
const tooLong = clone(draft); tooLong.negative.content = '字'.repeat(6001);
assert.throws(() => progress.saveProgressDraft(old, tooLong), /6000/);
assert.equal(JSON.stringify(old), before, 'An invalid second box never saves the first');
const full = initial(); full.domains[0].positiveRecords = Array.from({ length: data.MAX_DOMAIN_RECORDS - 1 }, (_, i) => ({ id: `full-${i}`, content: '历史记录', createdAt: draft.positive.createdAt }));
assert.throws(() => progress.saveProgressDraft(full, draft), /5000/);
assert.equal(full.domains.find(domain => domain.id === 'work').positiveRecords.length, 0);
const heavy = clone(draft);
heavy.positive.images = Array.from({ length: 3 }, (_, i) => ({ id: `positive-${i}`, dataUrl: 'data:image/png;base64,' + 'A'.repeat(240000) }));
heavy.negative.images = Array.from({ length: 2 }, (_, i) => ({ id: `negative-${i}`, dataUrl: 'data:image/png;base64,' + 'A'.repeat(240000) }));
assert.throws(() => progress.saveProgressDraft(old, heavy), /空间已满/);
assert.equal(JSON.stringify(old), before, 'Total image capacity is checked before either sign is committed');
let shared = entry.newEntryDraft('task'); shared.task.title = '任务标题'; shared.task.description = '共享备注'; shared.task.images = [image];
shared.task.dueDate = '2099-10-05'; shared.task.nextTasks = [{ id: 'next', title: '下一步' }];
shared = entry.switchEntryMode(shared, 'memo'); shared.memo.color = 'sage'; shared.memo.pinned = true; shared.memo.body = '备忘录修改后的正文';
shared = entry.switchEntryMode(shared, 'progress'); shared.progress = clone(draft);
const cached = clone(entry.entryDraftForStorage(shared));
assert.ok(entry.isEntryDraft(cached));
assert.equal(JSON.stringify(cached).split(image.dataUrl).length - 1, 2, 'Common images are stored once; the separate positive attachment stays independent');
const task = entry.switchEntryMode(cached, 'task');
assert.equal(task.task.description, '备忘录修改后的正文'); assert.deepEqual(task.task.images, [image]);
assert.equal(task.task.dueDate, '2099-10-05'); assert.equal(task.task.nextTasks[0].title, '下一步');
const memo = entry.switchEntryMode(entry.switchEntryMode(task, 'progress'), 'memo');
assert.equal(memo.memo.color, 'sage'); assert.equal(memo.memo.pinned, true); assert.equal(memo.progress.positive.content, draft.positive.content);
assert.deepEqual(entry.validateEntry(entry.switchEntryMode(memo, 'progress')), []);
const legacy = clone(entry.newEntryDraft('memo')); delete legacy.progress; delete legacy.lastContentMode;
assert.ok(entry.isEntryDraft(legacy));
assert.ok(progress.isProgressDraft(entry.switchEntryMode(legacy, 'progress').progress));
const single = oldSingle(); single.positive.content = '**单条记录**'; single.positive.images = [image];
for (const kind of ['negative', 'positive']) {
  const candidate = { ...single, kind }, state = progress.saveProgressDraft(initial(), candidate);
  const domain = state.domains.find(item => item.id === 'work');
  assert.equal(domain[`${kind}Records`].length, 1);
  assert.equal(domain[kind === 'positive' ? 'negativeRecords' : 'positiveRecords'].length, 0);
  assert.equal(domain[`${kind}Records`][0].id, single.positive.id);
  assert.equal(progress.saveProgressDraft(state, candidate, true), state);
  assert.throws(() => progress.saveProgressDraft(state, { ...candidate, kind: kind === 'positive' ? 'negative' : 'positive' }, true), /发生变化/);
}
let common = entry.newEntryDraft('task'); common.task.title = '任务标题'; common.task.description = '保留备注';
const taskId = common.task.id, memoId = common.memo.id;
common = entry.switchEntryMode(common, 'progress'); assert.equal(common.progress.positive.content, '任务标题');
common.progress.positive.content = '多行记录\n第二行';
common = entry.switchEntryMode(common, 'memo'); assert.equal(common.memo.title, '多行记录\n第二行');
common.memo.title = '改过的备忘录标题';
common = entry.switchEntryMode(common, 'progress'); assert.equal(common.progress.positive.content, '改过的备忘录标题');
common = entry.switchEntryMode(common, 'task'); assert.equal(common.task.title, '改过的备忘录标题');
assert.equal(common.task.description, '保留备注'); assert.equal(common.task.id, taskId); assert.equal(common.memo.id, memoId);
common = entry.switchEntryMode(common, 'progress'); common.progress.positive.content = '字'.repeat(101);
assert.equal(entry.switchEntryMode(common, 'task').task.title.length, 101);
assert.throws(() => entry.validateEntry(entry.switchEntryMode(common, 'task')), /100/);
assert.throws(() => entry.validateEntry(entry.switchEntryMode(common, 'memo')), /80/);
const migrated = progress.singleProgressDraft(draft);
assert.deepEqual(migrated.legacy.map(item => item.record.id), [draft.positive.id, draft.negative.id]);
const remainder = progress.remainingProgressDraft(migrated);
assert.equal(remainder.positive.id, draft.negative.id); assert.equal(remainder.positive.content, draft.negative.content);
assert.equal(progress.remainingProgressDraft(remainder), undefined);
const replaced = progress.setProgressText(migrated, '新的共享标题');
assert.notEqual(replaced.positive.id, draft.positive.id);
assert.equal(progress.remainingProgressDraft(replaced).positive.id, draft.positive.id);
assert.ok(entry.isEntryDraft(JSON.parse(JSON.stringify({ ...common, progress: replaced }))));
const originalDual = { ...draft }; delete originalDual.pair; delete originalDual.kinds;
const pendingLegacy = freeze({ ...entry.newEntryDraft('progress'), progress: originalDual, pendingSave: 'progress' });
assert.equal(entry.switchEntryMode(pendingLegacy, 'progress'), pendingLegacy, 'An old pending batch must not be migrated or change either target');
assert.equal(progress.saveProgressDraft(saved, entry.switchEntryMode(pendingLegacy, 'progress').progress, true), saved);

for (const kinds of [['positive', 'positive'], ['negative', 'negative'], ['negative', 'positive'], ['positive', 'negative']]) {
  const paired = progress.newProgressDraft('work'); paired.kinds = kinds;
  paired.positive.content = '上框正文'; paired.negative.images = [image];
  freeze(paired);
  assert.ok(progress.isProgressDraft(paired));
  assert.deepEqual(progress.progressEntries(paired).map(item => item.kind), kinds);
  const target = progress.saveProgressDraft(freeze(initial()), paired), records = target.domains.find(item => item.id === 'work');
  assert.equal(records.positiveRecords.length, kinds.filter(kind => kind === 'positive').length);
  assert.equal(records.negativeRecords.length, kinds.filter(kind => kind === 'negative').length);
  assert.equal(progress.saveProgressDraft(freeze(target), paired, true), target, 'Both same-sign IDs retry without duplication');
  const text = progress.setProgressText(paired, '任务共享标题');
  assert.equal(text.positive.id, paired.positive.id); assert.equal(text.negative, paired.negative);
  assert.equal(text.kinds, paired.kinds); assert.equal(text.domainId, paired.domainId);
  assert.equal(progress.progressRecord({ ...paired, positive: { ...paired.positive, content: '' } }).id, paired.positive.id, 'Pair title always comes from the upper box, even when empty');
  assert.equal(progress.pairedProgressDraft(paired), paired, 'Read-only conversion is idempotent');
  assert.equal(progress.progressRows(paired)[1].record.images, paired.negative.images, 'Image bytes are never copied for the row view');
}
const lowerOnly = progress.newProgressDraft('work'); lowerOnly.kinds = ['negative', 'positive']; lowerOnly.negative.images = [image]; freeze(lowerOnly);
assert.equal(progress.hasProgressContent(lowerOnly), true);
assert.deepEqual(progress.progressEntries(lowerOnly).map(item => [item.kind, item.record.id]), [['positive', lowerOnly.negative.id]], 'A lower image-only record saves alone with its chosen sign');
assert.equal(progress.progressRecord(lowerOnly).content, '', 'Lower contents never become the pair shared title');
const pendingPair = freeze({ ...entry.newEntryDraft('progress'), progress: lowerOnly, pendingSave: 'progress' });
assert.equal(entry.switchEntryMode(pendingPair, 'memo'), pendingPair);
assert.deepEqual(entry.validateEntry(pendingPair), []);
for (const mutate of [
  value => value.pair = false,
  value => delete value.kinds,
  value => value.kinds = ['positive'],
  value => value.kinds = ['positive', 'negative', 'positive'],
  value => value.kinds = ['positive', 'unknown'],
  value => value.kinds = new Array(2),
  value => value.kinds = null,
  value => value.single = true,
  value => value.kind = 'positive',
  value => { delete value.pair; },
  value => value.negative.id = value.positive.id,
  value => value.legacy = new Array(1),
]) {
  const invalid = clone(draft); mutate(invalid);
  assert.equal(progress.isProgressDraft(invalid), false, `Reject malformed signs/slots: ${mutate}`);
  assert.throws(() => progress.progressEntries(invalid), /格式/);
}

const dual = oldDual(); dual.positive.content = '旧上框'; dual.negative.content = '旧下框'; dual.negative.images = [image]; freeze(dual);
const upgraded = progress.pairedProgressDraft(dual);
assert.equal(upgraded.positive, dual.positive); assert.equal(upgraded.negative, dual.negative);
assert.deepEqual(upgraded.kinds, ['positive', 'negative']); assert.equal(upgraded.single, undefined);
assert.deepEqual(progress.progressEntries(upgraded).map(item => item.record.id), [dual.positive.id, dual.negative.id]);
assert.equal(progress.pairedProgressDraft(upgraded), upgraded);
assert.equal(progress.progressRecord({ ...dual, positive: { ...dual.positive, content: '' } }).id, dual.negative.id, 'Old dual title fallback remains readable before migration');
const unsentSingle = oldSingle('life', 'negative'); unsentSingle.positive.content = '旧负记录'; unsentSingle.positive.images = [image]; freeze(unsentSingle);
const upgradedSingle = progress.pairedProgressDraft(unsentSingle);
assert.deepEqual(upgradedSingle.kinds, ['negative', 'negative']); assert.equal(upgradedSingle.positive, unsentSingle.positive);
assert.equal(upgradedSingle.negative, unsentSingle.negative); assert.equal(upgradedSingle.positive.images, unsentSingle.positive.images);
const unsentEntry = freeze({ ...entry.newEntryDraft('progress'), progress: unsentSingle });
assert.deepEqual(entry.switchEntryMode(unsentEntry, 'progress').progress, upgradedSingle, 'Only unsent cached single drafts upgrade to two slots');

const pendingSingle = freeze({ ...unsentEntry, pendingSave: 'progress' });
assert.equal(entry.switchEntryMode(pendingSingle, 'task'), pendingSingle);
assert.equal(entry.switchEntryMode(pendingSingle, 'progress'), pendingSingle);
assert.equal(progress.progressRows(pendingSingle.progress)[0].kind, 'negative');
assert.equal(progress.progressRows(pendingSingle.progress)[1].record.content, '');
assert.deepEqual(progress.progressEntries(pendingSingle.progress).map(item => [item.kind, item.record.id]), [['negative', unsentSingle.positive.id]]);
const savedPending = progress.saveProgressDraft(initial(), pendingSingle.progress);
assert.equal(progress.saveProgressDraft(freeze(savedPending), pendingSingle.progress, true), savedPending);

const legacySingle = progress.singleProgressDraft(dual); freeze(legacySingle);
const restoredPair = progress.pairedProgressDraft(legacySingle);
assert.deepEqual(progress.progressEntries(restoredPair).map(item => item.record.id), [dual.positive.id, dual.negative.id]);
assert.equal(restoredPair.negative.images, dual.negative.images);
assert.equal(progress.remainingProgressDraft(restoredPair), undefined, 'Both displayed legacy boxes are consumed by one batch');
assert.equal(progress.remainingProgressDraft(legacySingle).positive.id, dual.negative.id, 'An old single pending only consumes its original first ID');
const third = { kind: 'negative', record: { ...dual.negative, id: 'legacy-third', content: '第三个独立旧记录' } };
const queued = { ...legacySingle, legacy: [...legacySingle.legacy, third, third] }; freeze(queued);
const queuedPair = progress.pairedProgressDraft(queued), remaining = progress.remainingProgressDraft(queuedPair);
assert.equal(remaining.positive, third.record); assert.deepEqual(remaining.kinds, ['negative', 'negative']);
assert.equal(remaining.legacy.length, 1, 'Duplicate recovery IDs are offered once');
assert.equal(progress.remainingProgressDraft(remaining), undefined);
const recoveredState = progress.saveProgressDraft(progress.saveProgressDraft(initial(), queuedPair), remaining);
assert.deepEqual(recoveredState.domains.find(item => item.id === 'work').negativeRecords.map(item => item.id), [dual.negative.id, third.record.id], 'Successive recovered batches save every independent old record exactly once');
const changedLegacy = progress.setProgressText(legacySingle, '新的上框');
const oldUpper = progress.remainingProgressDraft(changedLegacy);
assert.equal(oldUpper.positive, dual.positive); assert.equal(progress.remainingProgressDraft(oldUpper), undefined);
assert.equal(changedLegacy.negative, dual.negative, 'Changing a shared title preserves the independent lower box');
const partial = { ...restoredPair, negative: { ...restoredPair.negative, content: '', images: [] } };
assert.equal(progress.remainingProgressDraft(partial).positive.id, dual.negative.id, 'An empty slot does not discard its unsaved original recovery record');
const oldNegativeDual = oldDual(); oldNegativeDual.negative.content = '旧迁移只填负框';
const legacyWithoutKind = progress.singleProgressDraft(oldNegativeDual); delete legacyWithoutKind.kind; freeze(legacyWithoutKind);
assert.deepEqual(progress.pairedProgressDraft(legacyWithoutKind).kinds, ['negative', 'negative'], 'An unsent v1 legacy queue restores the original sign when no kind was recorded');
assert.equal(progress.progressEntries(legacyWithoutKind)[0].kind, 'positive', 'An old pending single without a kind still retains its original default save target');
const legacyPending = freeze({ ...entry.newEntryDraft('progress'), progress: legacyWithoutKind, pendingSave: 'progress' });
assert.equal(entry.switchEntryMode(legacyPending, 'progress'), legacyPending);
assert.equal(progress.progressRows(legacyPending.progress)[1].record.content, '');

const independent = entry.newEntryDraft('progress'); independent.progress.negative.content = '下框始终独立'; independent.progress.negative.images = [image]; independent.progress.kinds = ['negative', 'positive'];
independent.progress.positive.content = '上框任务互通';
const lowerBeforeSwitch = independent.progress.negative, signsBeforeSwitch = independent.progress.kinds;
const switchedMemo = entry.switchEntryMode(independent, 'memo'); switchedMemo.memo.title = '备忘录改上框';
const backToProgress = entry.switchEntryMode(switchedMemo, 'progress');
assert.equal(backToProgress.progress.positive.content, '备忘录改上框');
assert.equal(backToProgress.progress.negative, lowerBeforeSwitch);
assert.equal(backToProgress.progress.kinds, signsBeforeSwitch);
assert.equal(backToProgress.progress.positive.id, independent.progress.positive.id);

const atomicSameKind = { ...draft, kinds: ['negative', 'negative'] };
assert.throws(() => progress.saveProgressDraft(full, atomicSameKind), /5000/);
assert.throws(() => progress.saveProgressDraft(old, { ...heavy, kinds: ['positive', 'positive'] }), /空间已满/);
const secondConflict = clone(initial()); secondConflict.domains.find(item => item.id === 'work').negativeRecords = [progress.progressEntries(atomicSameKind)[1].record];
const conflictBefore = JSON.stringify(secondConflict);
assert.throws(() => progress.saveProgressDraft(freeze(secondConflict), atomicSameKind), /已存在/);
assert.equal(JSON.stringify(secondConflict), conflictBefore, 'A collision in the second same-sign row never saves the first');
console.log('PASS progress drafts: independent signed pairs, same-sign atomic saves, stable IDs/retries, upper shared titles, pending v1 targets, legacy recovery, images, capacity and account-local drafts');
