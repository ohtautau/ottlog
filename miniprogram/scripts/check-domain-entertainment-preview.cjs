const assert = require('node:assert/strict');
const { createDomainPreviewRecords, extendEntertainmentDomainPreview } = require('./domain-preview-records.cjs');

const existing = createDomainPreviewRecords(Date.parse('2026-10-11T12:00:00.000Z'));
existing.retainedField = { value: '保留预览扩展字段' };
existing.domains[0].retainedField = { value: '保留领域扩展字段' };
const before = JSON.stringify(existing);
const next = extendEntertainmentDomainPreview(existing);
assert.equal(JSON.stringify(existing), before, 'Appending entertainment never changes the original preview');
assert.notEqual(next, existing);
assert.notEqual(next.domains, existing.domains);
assert.deepEqual(next.domains.slice(0, 8).map(domain => domain.id), existing.domains.map(domain => domain.id), 'The original eight keep their order before the continuation card');
for (let index = 0; index < existing.domains.length; index++) assert.equal(next.domains[index], existing.domains[index], 'Existing objects and their edited fields retain their identity');
assert.equal(next.completedGoals, existing.completedGoals);
assert.equal(next.retainedField, existing.retainedField, 'Unknown state fields are retained');
assert.deepEqual(next.domains.at(-1), {
  id: 'entertainment', name: '娱乐', iconId: 'game',
  longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [],
}, 'The added card has no invented goals, records or habits');
assert.equal(extendEntertainmentDomainPreview(next), next, 'A partial persistence retry never duplicates the new card');

for (const domain of [
  { ...next.domains.at(-1), name: '我修改后的领域' },
  { ...next.domains.at(-1), id: 'my-entertainment', name: ' 娱乐 ' },
]) {
  const duplicate = { ...existing, domains: [...existing.domains, domain] };
  assert.equal(extendEntertainmentDomainPreview(duplicate), duplicate, 'A renamed stable ID or existing same-name domain is preserved without duplication');
}
const customized = { ...existing, domains: [...existing.domains].reverse().slice(0, 5) };
const customizedNext = extendEntertainmentDomainPreview(customized);
assert.deepEqual(customizedNext.domains.slice(0, -1), customized.domains, 'Appending never restores deleted starter domains or changes a customized order');
const fresh = extendEntertainmentDomainPreview(existing);
assert.notEqual(fresh.domains.at(-1), next.domains.at(-1), 'Each first-time candidate owns its new empty domain');
assert.notEqual(fresh.domains.at(-1).positiveRecords, next.domains.at(-1).positiveRecords);
console.log('PASS entertainment preview: empty continuation card, preserved order and references, immutable/idempotent append, renamed-ID and existing-name guards');
