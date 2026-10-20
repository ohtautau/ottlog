const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const modules = new Map();
function load(relative) {
  const filename = path.resolve(__dirname, relative);
  if (modules.has(filename)) return modules.get(filename);
  const exports = {}; modules.set(filename, exports);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function('exports', 'require', code)(exports, name => load(path.join(path.dirname(relative), `${name}.ts`)));
  return exports;
}
const data = load('../src/lib/domain-data.ts');
assert.equal(typeof data.recentDomainRecords, 'function', 'The shared domain source exports recentDomainRecords');
const recent = data.recentDomainRecords;
const clone = value => JSON.parse(JSON.stringify(value));
function freeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return value;
}
const ids = rows => rows.map(row => row.record.id);
const image = { id: 'image-only-photo', dataUrl: 'data:image/png;base64,AAAA' };
function emptyState() {
  const state = clone(data.initialDomainState);
  state.domains = ['mind', 'work', 'life'].map(id => state.domains.find(domain => domain.id === id));
  return state;
}
function record(id, createdAt, content = id) { return { id, content, createdAt }; }
function add(state, domainId, kind, item) {
  state.domains.find(domain => domain.id === domainId)[kind === 'positive' ? 'positiveRecords' : 'negativeRecords'].push(item);
}

const state = emptyState();
const chronology = [
  ['work', 'positive', 'work-p-old'], ['life', 'negative', 'life-n-old'], ['mind', 'positive', 'mind-p-old'],
  ['work', 'negative', 'work-n-middle'], ['life', 'positive', 'life-p-middle'], ['mind', 'negative', 'mind-n-middle'],
  ['work', 'positive', 'work-p-recent'], ['life', 'negative', 'life-n-recent'], ['mind', 'positive', 'mind-p-recent'],
  ['work', 'negative', 'work-n-recent'], ['life', 'positive', 'life-p-image'], ['mind', 'negative', 'mind-n-latest'],
  ['work', 'positive', 'work-p-latest'],
];
const originals = new Map();
for (const [index, [domainId, kind, id]] of chronology.entries()) {
  const item = record(id, `2026-10-01T08:${String(index + 1).padStart(2, '0')}:00.000Z`);
  if (id === 'life-p-image') { item.content = ''; item.images = [image]; }
  originals.set(id, { domainId, kind, item });
  add(state, domainId, kind, item);
}
// Saved arrays and the domain order deliberately differ from creation order.
state.domains.find(domain => domain.id === 'work').positiveRecords.reverse();
state.domains.find(domain => domain.id === 'mind').negativeRecords.reverse();
state.completedGoals = [{ id: 'completed-goal', domainId: 'work', kind: 'shortTerm', content: '不是领域记录', status: 'completed',
  createdAt: '2026-10-01T08:00:00.000Z', completedAt: '2030-01-01T00:00:00.000Z' }];
assert.ok(data.isDomainState(state), 'The mixed-sign and image-only fixture is a valid version 1 archive');
const source = freeze(state), before = JSON.stringify(source);
const expected = ['work-p-latest', 'mind-n-latest', 'life-p-image', 'work-n-recent', 'mind-p-recent',
  'life-n-recent', 'work-p-recent', 'mind-n-middle', 'life-p-middle', 'work-n-middle'];
const latest = recent(source);
assert.deepEqual(ids(latest), expected, 'The ten newest records are shared across all domains and both signs');
assert.deepEqual(ids(recent(source, 10)), expected);
assert.deepEqual(ids(recent(source, undefined)), expected);
for (const row of latest) {
  const original = originals.get(row.record.id);
  assert.deepEqual(Object.keys(row).sort(), ['domainId', 'domainName', 'kind', 'record']);
  assert.equal(row.domainId, original.domainId);
  assert.equal(row.domainName, source.domains.find(domain => domain.id === original.domainId).name);
  assert.equal(row.kind, original.kind);
  assert.equal(row.record, original.item, 'Recent rows retain the original record rather than duplicating persistent data');
}
const imageRow = latest.find(row => row.record.id === 'life-p-image');
assert.equal(imageRow.record.content, '', 'An image-only progress record remains eligible');
assert.equal(imageRow.record.images, originals.get('life-p-image').item.images, 'Image arrays are not copied');
assert.equal(imageRow.record.images[0], image, 'Image bytes remain in the original image object');

for (const limit of [0, -1, -0.1, NaN, Infinity, -Infinity]) assert.deepEqual(recent(source, limit), [], `Limit ${limit} produces no rows`);
for (const [limit, count] of [[0.5, 0], [1, 1], [1.9, 1], [9.9, 9], [10.9, 10], [11, 10], [Number.MAX_SAFE_INTEGER, 10]]) {
  assert.deepEqual(ids(recent(source, limit)), expected.slice(0, count), `Limit ${limit} floors fractions and never exceeds ten`);
}
assert.deepEqual(recent(freeze(emptyState())), [], 'Existing empty domains produce no placeholder rows');
assert.deepEqual(recent(freeze({ version: 1, domains: [], completedGoals: [] })), [], 'An empty saved layout produces no rows');

const ties = emptyState(), tiedAt = '2026-10-02T08:00:00.000Z';
for (const [domainId, kind, id] of [['work', 'positive', 'tie-a'], ['life', 'negative', 'tie-z'],
  ['mind', 'positive', 'tie-m'], ['work', 'negative', 'tie-b'], ['life', 'positive', 'tie-y']]) add(ties, domainId, kind, record(id, tiedAt));
assert.ok(data.isDomainState(ties));
const tiedOrder = ['tie-z', 'tie-y', 'tie-m', 'tie-b', 'tie-a'];
assert.deepEqual(ids(recent(freeze(ties))), tiedOrder, 'Equal creation timestamps use descending stable record IDs');
const shuffledTies = clone(ties);
shuffledTies.domains.reverse();
for (const domain of shuffledTies.domains) { domain.positiveRecords.reverse(); domain.negativeRecords.reverse(); }
assert.deepEqual(ids(recent(freeze(shuffledTies))), tiedOrder, 'Changing domain or saved record order cannot change equal-time ordering');

const timestamps = emptyState();
add(timestamps, 'work', 'positive', record('same-second-zero', '2026-10-02T09:00:00Z'));
add(timestamps, 'life', 'negative', record('same-second-one', '2026-10-02T09:00:00.001Z'));
add(timestamps, 'mind', 'positive', record('same-second-last', '2026-10-02T09:00:00.999Z'));
assert.ok(data.isDomainState(timestamps));
assert.deepEqual(ids(recent(freeze(timestamps))), ['same-second-last', 'same-second-one', 'same-second-zero'],
  'Timestamps compare their actual instants rather than their different ISO text lengths');
const defensive = clone(timestamps);
add(defensive, 'work', 'negative', record('invalid-time', 'invalid'));
add(defensive, 'life', 'positive', record('future-record', '2030-01-01T00:00:00.000Z'));
assert.deepEqual(ids(recent(freeze(defensive))), ['future-record', 'same-second-last', 'same-second-one', 'same-second-zero'],
  'A history view retains valid future creation dates and defensively excludes an invalid timestamp');

const withoutLatest = data.deleteDomainRecord(source, 'work', 'positive', 'work-p-latest');
assert.deepEqual(ids(recent(freeze(withoutLatest))), ['mind-n-latest', 'life-p-image', 'work-n-recent', 'mind-p-recent',
  'life-n-recent', 'work-p-recent', 'mind-n-middle', 'life-p-middle', 'work-n-middle', 'mind-p-old'],
  'Deleting the newest record immediately fills the tenth slot from older current data');
const withoutLife = data.deleteDomain(withoutLatest, 'life');
assert.deepEqual(ids(recent(freeze(withoutLife))), ['mind-n-latest', 'work-n-recent', 'mind-p-recent', 'work-p-recent',
  'mind-n-middle', 'work-n-middle', 'mind-p-old', 'work-p-old'], 'Deleting a domain removes every record of both signs');
assert.ok(recent(withoutLife).every(row => row.domainId !== 'life'));
const renamed = data.saveDomain(withoutLife, { id: 'work', name: '工作进展', iconId: 'work' });
assert.ok(recent(freeze(renamed)).filter(row => row.domainId === 'work').every(row => row.domainName === '工作进展'),
  'Domain names come from current domain data rather than cached result rows');
let removed = withoutLife;
for (const domainId of ['work', 'mind']) removed = data.deleteDomain(removed, domainId);
assert.deepEqual(recent(freeze(removed)), [], 'Deleting all current domains leaves no cached history');
assert.deepEqual(ids(latest), expected, 'A later read cannot rewrite an earlier returned array');
assert.equal(JSON.stringify(source), before, 'Sorting, limiting and deletion reads never mutate any original array or image');
console.log('PASS recent domain records: all-domain mixed-sign latest ten, stable ID ties, numeric timestamps, limit boundaries, original record/image references, image-only history, immutable reads and live edit/delete updates.');
