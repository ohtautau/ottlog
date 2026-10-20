const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const file = path.resolve(__dirname, '../src/lib', `${name}.ts`);
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function('exports', 'module', 'require', output)(module.exports, module, name => load(name.replace(/^\.\//, '')));
  cache.set(name, module.exports);
  return module.exports;
}
const records = load('tool-records');
const { createTodo, saveTodo, completeTodo, toggleTodo, nextRecurrenceDate, MAX_TODO_TASKS } = load('todo-data');
const now = new Date(2026, 8, 14, 9, 30);
const task = (patch = {}) => ({ ...createTodo('do', now), id: 'task-a', title: '第一步', ...patch });
const state = (...tasks) => ({ ...records.initialTodoState, tasks });
// Persistent note attachments survive saving, type switches and generated work.
const noteImage = { id: 'note-photo', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' };
const illustrated = task({ description: '# 备注\n\n**进展**', images: [noteImage] });
assert.equal(records.isTodoState(state(illustrated)), true);
for (const images of [null, {}, [{ id: 'bad', dataUrl: '/temporary/photo.png' }], Array(7).fill(noteImage), [noteImage, noteImage]]) {
  assert.equal(records.isTodoState(state(task({ images }))), false);
  assert.throws(() => saveTodo(state(), task({ images }), now), /图片/);
}
const illustratedSaved = saveTodo(state(), illustrated, now);
assert.deepEqual(illustratedSaved.tasks[0].images, [noteImage]);
const oldEditorDraft = { ...illustrated };
delete oldEditorDraft.images;
assert.deepEqual(saveTodo(illustratedSaved, oldEditorDraft, now).tasks[0].images, [noteImage], 'An older editor omitting the optional image field cannot erase attachments');
assert.deepEqual(saveTodo(illustratedSaved, { ...illustrated, images: [] }, now).tasks[0].images, []);
const generatedIllustrated = completeTodo(state({ ...illustrated, recurrence: { unit: 'day', interval: 1 }, nextTasks: [{ id: 'later', title: '后续' }] }), illustrated.id, now);
for (const generated of generatedIllustrated.tasks.filter(item => item.generatedFrom)) {
  assert.equal(generated.description, illustrated.description);
  assert.deepEqual(generated.images, [noteImage]);
  assert.notEqual(generated.images, illustrated.images);
}
const heavyImages = Array.from({ length: 3 }, (_, index) => ({ id: String(index), dataUrl: 'data:image/png;base64,' + 'A'.repeat(240000) }));
const heavy = task({ images: heavyImages, recurrence: { unit: 'day', interval: 1 } });
assert.throws(() => saveTodo(state(), { ...heavy, images: [...heavyImages, { ...heavyImages[0], id: 'fourth' }] }, now), /空间不足/);
assert.throws(() => completeTodo(state(heavy), heavy.id, now), /空间不足/);
assert.equal(heavy.completedAt, null, 'Capacity errors never partially complete the original');
const entry = load('entry-draft');
const noteDraft = entry.newEntryDraft('task', illustrated);
const switched = entry.switchEntryMode(noteDraft, 'memo');
assert.deepEqual(switched.memo.images, [noteImage]);
assert.deepEqual(entry.switchEntryMode(switched, 'task').task.images, [noteImage]);
for (const active of [noteDraft, switched]) {
  const cached = JSON.parse(JSON.stringify(entry.entryDraftForStorage(active)));
  assert.equal(JSON.stringify(cached).split(noteImage.dataUrl).length - 1, 1, 'Shared image bytes occupy the local draft only once');
  assert.equal(entry.isEntryDraft(cached), true);
  assert.deepEqual(entry.switchEntryMode(cached, active.mode === 'task' ? 'memo' : 'task')[active.mode === 'task' ? 'memo' : 'task'].images, [noteImage]);
}
const legacyImageDraft = { ...noteDraft, task: { ...noteDraft.task, images: undefined }, memo: { ...noteDraft.memo, images: [noteImage] } };
assert.deepEqual(entry.switchEntryMode(legacyImageDraft, 'memo').memo.images, [noteImage], 'Old memo-only image drafts remain recoverable');
console.log('PASS task Markdown attachments: validation, persistence, removal, type switching, one-copy draft recovery and atomic generation capacity');
const { mergeTodoCategories, rankedTodoTags, parseTodoTags } = load('todo-data');
assert.deepEqual(parseTodoTags('工 作/学习；生活😀购物'), ['工作', '学习', '生活', '购物']);
assert.deepEqual(parseTodoTags('#工作,,工作\\学习|生活+购物_旅行—复盘'), ['工作', '学习', '生活', '购物', '旅行', '复盘']);
assert.deepEqual(parseTodoTags(' \t，。！👩‍💻❤️\n'), []);
assert.deepEqual(parseTodoTags('ＡＢＣ 123/cafe\u0301/项目\u3000二'), ['ＡＢＣ123', 'cafe\u0301', '项目二']);
const legacyTags = state(task({ categoryId: 'work', tags: ['工作', '复盘'] }));
const mergedTags = mergeTodoCategories(legacyTags);
assert.equal(legacyTags.tasks[0].categoryId, 'work');
assert.equal(mergedTags.tasks[0].categoryId, '');
assert.deepEqual(mergedTags.tasks[0].tags, ['工作', '复盘']);
assert.deepEqual(mergeTodoCategories(mergedTags), mergedTags);
assert.deepEqual(rankedTodoTags(state()).slice(0, 4), ['工作', '学习', '生活', '购物']);
assert.deepEqual(rankedTodoTags(mergedTags).slice(0, 2), ['工作', '复盘']);
assert.deepEqual(mergeTodoCategories({ ...legacyTags, categories: [{ id: 'work', name: '项目', color: '' }] }).tasks[0].tags, ['工作', '复盘', '项目']);
function freeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); }
  return value;
}

const draft = createTodo(undefined, now);
assert.equal(draft.important, false);
assert.equal(draft.urgent, false);
assert.equal(draft.dueDate, '');
assert.equal(draft.dueTime, undefined);
assert.equal(draft.reminderAt, undefined);
assert.equal(draft.description, '');
assert.deepEqual(draft.tags, []);
assert.equal(draft.createdAt, now.toISOString());
assert.deepEqual(records.todoQuadrants.map(q => [q.id, q.title, q.important, q.urgent]), [
  ['do', '高优先级', true, true], ['plan', '中优先级', true, false],
  ['delegate', '低优先级', false, true], ['later', '无优先级', false, false],
]);
for (const quadrant of records.todoQuadrants) assert.equal(records.todoQuadrant(createTodo(quadrant.id)).id, quadrant.id);
assert.equal(records.todoQuadrant(createTodo('all')).id, 'later');

const retainedEntry = freeze({ ...noteDraft, task: { ...noteDraft.task, dueDate: '2099-01-31', nextTasks: [{ id: 'retained-next', title: '保留下一步' }] }, tagsText: '保留标签' });
assert.equal(entry.applyEntryQuadrant(retainedEntry), retainedEntry, 'Ordinary creation retains draft priority');
for (const [index, quadrant] of records.todoQuadrants.entries()) {
  const resumed = entry.applyEntryQuadrant(retainedEntry, quadrant.id);
  assert.equal(records.todoQuadrant(resumed.task).id, quadrant.id);
  assert.equal(resumed.memo.priority, ['high', 'medium', 'low', 'none'][index]);
  assert.deepEqual({ ...resumed.task, important: retainedEntry.task.important, urgent: retainedEntry.task.urgent }, retainedEntry.task, 'Only task priority changes; IDs, input, images, schedule and next tasks survive');
  assert.deepEqual({ ...resumed.memo, priority: retainedEntry.memo.priority }, retainedEntry.memo);
  assert.equal(resumed.tagsText, retainedEntry.tagsText);
  assert.equal(resumed.progress, retainedEntry.progress);
  const switchedPriority = entry.switchEntryMode({ ...resumed, task: { ...resumed.task, important: !quadrant.important, urgent: !quadrant.urgent } }, 'memo');
  assert.equal(records.todoQuadrant(entry.switchEntryMode(switchedPriority, 'task').task).id, records.todoQuadrant({ important: !quadrant.important, urgent: !quadrant.urgent }).id, 'Manual priority survives type switches');
}
for (const mode of ['task', 'memo', 'progress']) {
  const pending = { ...retainedEntry, mode, pendingSave: mode };
  assert.equal(entry.applyEntryQuadrant(pending, 'do'), pending, 'Pending same-ID retries retain original values and type');
}
console.log('PASS quadrant creation defaults: all four priorities, retained IDs/content, ordinary drafts, manual switching and pending-save protection');

const legacy = {
  id: 'legacy', title: '旧任务', description: '', categoryId: '', important: false, urgent: true,
  dueDate: '', completedAt: null, createdAt: now.toISOString(), updatedAt: now.toISOString(),
  subtasks: [{ id: 'checklist', title: '原有清单', completed: false }], extraFromWeb: { label: '保留' },
};
assert.equal(records.isTodoState(state(legacy)), true, 'Existing version 1 records need no migration');
assert.equal(records.isTodoState(state(task({ recurrence: { unit: 'month', interval: 1 } }))), true);
for (const patch of [{ tags: [1] }, { nextTasks: [null] }, { dueTime: '25:00' }, { recurrence: { unit: 'day', interval: 0 } }, { recurrence: { unit: 'month', interval: 1, anchorDay: 32 } }, { reminderAt: 'invalid' }]) {
  assert.equal(records.isTodoState(state(task(patch))), false, `Reject invalid optional fields: ${JSON.stringify(patch)}`);
}
assert.equal(records.isTodoState({ ...state(legacy), version: 2 }), false);
const legacyState = freeze({ ...state(legacy), rootMetadata: { source: 'web' } });
const legacySnapshot = JSON.stringify(legacyState);
const legacyEdited = saveTodo(legacyState, { ...legacy, title: '  旧任务改名  ', extraFromWeb: undefined, tags: [' 工作 ', '工作', ''] }, now);
// Unknown properties absent from a draft are merged from the existing record.
const { extraFromWeb, ...partialLegacy } = legacy;
const preserved = saveTodo(legacyState, { ...partialLegacy, title: '修改' }, now);
assert.deepEqual(preserved.tasks[0].extraFromWeb, legacy.extraFromWeb);
assert.deepEqual(preserved.rootMetadata, legacyState.rootMetadata);
assert.deepEqual(preserved.tasks[0].subtasks, legacy.subtasks);
assert.equal(legacyEdited.tasks[0].title, '旧任务改名');
assert.deepEqual(legacyEdited.tasks[0].tags, ['工作']);
assert.equal(completeTodo(legacyState, 'legacy', now).tasks.length, 1);
assert.equal(JSON.stringify(legacyState), legacySnapshot, 'Editing and completion never mutate old state');
assert.equal(toggleTodo(legacyState, 'missing', now), legacyState);
assert.throws(() => saveTodo(state(), task({ dueDate: '2026-02-30' }), now), /日期/);
assert.throws(() => saveTodo(state(), task({ dueTime: '10:00' }), now), /日期/);
assert.throws(() => saveTodo(state(), task({ recurrence: { unit: 'day', interval: 0 } }), now), /周期/);
assert.deepEqual(saveTodo(state(), task({ nextTasks: [{ id: 'n', title: ' ' }] }), now).tasks[0].nextTasks, [], 'Unfilled editing rows are not formal next steps');
const withBlankRows = task({ nextTasks: [{ id: 'blank-first', title: '' }, { id: 'step-a', title: '  第一步  ' }, { id: 'blank-middle', title: ' ' }, { id: 'step-b', title: '第二步' }, { id: 'blank-last', title: '' }] });
const blankSnapshot = JSON.stringify(withBlankRows);
const filteredRows = saveTodo(state(), withBlankRows, now);
assert.deepEqual(filteredRows.tasks[0].nextTasks, [{ id: 'step-a', title: '第一步' }, { id: 'step-b', title: '第二步' }]);
assert.equal(JSON.stringify(withBlankRows), blankSnapshot, 'Filtering never mutates the editing draft');
const completedWithRows = completeTodo(filteredRows, withBlankRows.id, now);
assert.equal(completedWithRows.tasks.length, 2, 'Completion generates one real next task without any blank tasks');
assert.deepEqual(completedWithRows.tasks.find(item => item.id !== withBlankRows.id).nextTasks, [{ id: 'step-b', title: '第二步' }]);
assert.throws(() => saveTodo(state(), task({ nextTasks: [{ id: 'too-long', title: 'x'.repeat(101) }] }), now), /100/);
assert.throws(() => saveTodo(state(), task({ nextTasks: Array.from({ length: 51 }, (_, i) => ({ id: `step-${i}`, title: `第${i}步` })) }), now), /50/);

const monthly = task({ dueDate: '2026-01-31', dueTime: '18:30', recurrence: { unit: 'month', interval: 1 } });
for (const [date, next] of [['2026-09-17', '2026-09-18'], ['2026-09-18', '2026-09-21'], ['2026-09-19', '2026-09-21'], ['2026-09-20', '2026-09-21'], ['2026-12-31', '2027-01-01']]) {
  const weekday = task({ dueDate: date, recurrence: { unit: 'weekday', interval: 1 } });
  assert.equal(records.isTodoState(state(weekday)), true);
  assert.equal(nextRecurrenceDate(weekday, now), next);
  assert.equal(completeTodo(state(weekday), weekday.id, now).tasks[0].dueDate, next);
}
let annual = saveTodo(state(), task({ dueDate: '2024-02-29', recurrence: { unit: 'year', interval: 1 } }), now).tasks[0];
for (const next of ['2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']) {
  assert.equal(records.isTodoState(state(annual)), true);
  annual = completeTodo(state(annual), annual.id, now).tasks[0];
  assert.equal(annual.dueDate, next);
  assert.equal(annual.recurrence.anchorDay, 29);
}
assert.equal(nextRecurrenceDate(task({ dueDate: '2026-12-31', recurrence: { unit: 'year', interval: 1 } }), now), '2027-12-31');
assert.equal(nextRecurrenceDate(task({ dueDate: '', recurrence: { unit: 'weekday', interval: 1 } }), now), '2026-09-15');
for (const interval of [0, -1, 1.5, 366, NaN]) assert.throws(() => saveTodo(state(), task({ recurrence: { unit: 'day', interval } }), now), /周期/);
assert.equal(nextRecurrenceDate(monthly, now), '2026-02-28');
assert.equal(nextRecurrenceDate({ ...monthly, dueDate: '2024-01-31' }, now), '2024-02-29');
assert.equal(nextRecurrenceDate({ ...monthly, dueDate: '2026-12-31' }, now), '2027-01-31');
assert.equal(nextRecurrenceDate({ ...monthly, recurrence: { unit: 'month', interval: 2 } }, now), '2026-03-31');
const february = completeTodo(state(monthly), monthly.id, now).tasks.find(item => !item.completedAt);
assert.equal(february.dueDate, '2026-02-28');
assert.equal(february.dueTime, '18:30');
assert.equal(february.recurrence.anchorDay, 31);
assert.equal(nextRecurrenceDate(february, now), '2026-03-31', 'A clamped month preserves the original calendar day');
const rescheduled = saveTodo(state(february), { ...february, dueDate: '2026-02-15' }, now).tasks[0];
assert.equal(nextRecurrenceDate(rescheduled, now), '2026-03-15', 'Explicit rescheduling resets the monthly anchor');
const clearedDate = saveTodo(state(february), { ...february, dueDate: '', dueTime: '' }, now).tasks[0];
assert.equal(clearedDate.recurrence.anchorDay, undefined);
assert.equal(nextRecurrenceDate(clearedDate, now), '2026-10-14', 'Clearing a date starts the next cycle from the completion day');
const legacyClearedDate = { ...february, dueDate: '', dueTime: '' };
assert.equal(nextRecurrenceDate(legacyClearedDate, now), '2026-10-14', 'A stale anchor is ignored when another client clears the date');
const regeneratedUndated = completeTodo(state(legacyClearedDate), legacyClearedDate.id, now).tasks.find(item => !item.completedAt);
assert.equal(regeneratedUndated.recurrence.anchorDay, 14);
const webRescheduled = { ...february, dueDate: '2026-02-15' };
assert.equal(nextRecurrenceDate(webRescheduled, now), '2026-03-15', 'An anchor inconsistent with a web-edited date is reset');
assert.equal(completeTodo(state(webRescheduled), webRescheduled.id, now).tasks.find(item => !item.completedAt).recurrence.anchorDay, 15);
assert.equal(nextRecurrenceDate({ ...february, dueDate: '2026-04-30' }, now), '2026-05-31', 'A legitimate month-end clamp still preserves the anchor');
assert.equal(nextRecurrenceDate(task({ dueDate: '2026-09-01', recurrence: { unit: 'week', interval: 1 } }), now), '2026-09-08', 'Overdue cycles advance exactly once');
assert.equal(nextRecurrenceDate(task({ dueDate: '', recurrence: { unit: 'day', interval: 2 } }), now), '2026-09-16', 'Undated cycles use the local completion day');
assert.equal(nextRecurrenceDate(task({ dueDate: '2026-12-31', recurrence: { unit: 'day', interval: 1 } }), now), '2027-01-01');

const original = freeze(state(task({
  description: '备注', categoryId: 'work', tags: ['标签'], dueDate: '2026-09-15', dueTime: '08:00',
  reminderAt: '2026-09-15T00:00:00.000Z', recurrence: { unit: 'week', interval: 1 },
  nextTasks: [{ id: 'next-b', title: '第二步' }, { id: 'next-c', title: '第三步' }, { id: 'next-d', title: '第四步' }],
  subtasks: [{ id: 'check', title: '旧步骤', completed: true }], extraFromWeb: { retained: true },
})));
const snapshot = JSON.stringify(original);
const done = completeTodo(original, 'task-a', now);
assert.equal(done.tasks.length, 3, 'A recurring task and its next step create separate branches');
assert.deepEqual(done, completeTodo(original, 'task-a', now), 'Repeated evaluation with the same state and clock is deterministic');
const cycle = done.tasks.find(item => item.recurrence && !item.completedAt);
const second = done.tasks.find(item => item.title === '第二步');
assert.deepEqual(cycle.nextTasks, original.tasks[0].nextTasks, 'Every cycle preserves the entire next-step chain');
assert.notEqual(cycle.nextTasks, original.tasks[0].nextTasks);
assert.notEqual(cycle.nextTasks[0], original.tasks[0].nextTasks[0], 'Cycles own independent action objects');
for (const key of ['title', 'description', 'categoryId', 'tags', 'important', 'urgent', 'dueTime', 'recurrence']) assert.deepEqual(cycle[key], original.tasks[0][key]);
const followingCycleState = completeTodo(done, cycle.id, now);
const followingCycle = followingCycleState.tasks.find(item => item.generatedFrom === cycle.id && item.recurrence);
assert.equal(followingCycle.dueDate, '2026-09-29');
assert.deepEqual(followingCycle.nextTasks, original.tasks[0].nextTasks, 'Actions survive repeated cycles');
assert.equal(followingCycleState.tasks.filter(item => item.generatedFrom === cycle.id && item.title === '第二步').length, 1);
assert.equal(cycle.subtasks[0].completed, false, 'Recurring checklist starts unchecked');
assert.equal(cycle.reminderAt, undefined, 'A one-time subscription is never inherited');
assert.equal(cycle.dueDate, '2026-09-22');
assert.equal(second.dueDate, original.tasks[0].dueDate);
assert.equal(second.dueTime, original.tasks[0].dueTime);
assert.equal(second.reminderAt, undefined);
assert.equal(second.recurrence, undefined);
assert.equal(second.description, '备注');
assert.equal(second.categoryId, 'work');
assert.equal(second.important, true);
assert.equal(second.urgent, true);
assert.deepEqual(second.tags, ['标签']);
assert.notEqual(second.tags, original.tasks[0].tags, 'Next steps own an independent copy of inherited tags');
assert.deepEqual(second.nextTasks.map(item => item.title), ['第三步', '第四步']);
assert.deepEqual(second.extraFromWeb, { retained: true });
assert.equal(second.generatedFrom, 'task-a');
assert.equal(JSON.stringify(original), snapshot);
assert.equal(completeTodo(done, 'task-a', now), done, 'Completing an already completed task is idempotent');
const reopened = toggleTodo(done, 'task-a', now);
assert.equal(reopened.tasks.find(item => item.id === 'task-a').completedAt, null);
assert.equal(reopened.tasks.find(item => item.id === 'task-a').completionGeneration, undefined);
const recompleted = completeTodo(reopened, 'task-a', now);
assert.equal(recompleted.tasks.length, 5, 'An explicit new completion generates both branches again');
assert.equal(new Set(recompleted.tasks.map(item => item.id)).size, 5, 'Same-millisecond completions still have unique generated IDs');
assert.equal(completeTodo(recompleted, 'task-a', now), recompleted, 'Repeating the same completed state never generates twice');
assert.deepEqual(completeTodo(reopened, 'task-a', now), recompleted, 'Replayed updates from the same input remain deterministic');
const newCycle = recompleted.tasks.find(item => item.recurrence && !done.tasks.some(old => old.id === item.id));
assert.deepEqual(newCycle.nextTasks, original.tasks[0].nextTasks);
assert.equal(newCycle.dueDate, '2026-09-22');
assert.deepEqual(recompleted.tasks.filter(item => done.tasks.some(old => old.id === item.id) && item.id !== 'task-a'), done.tasks.filter(item => item.id !== 'task-a'), 'Prior generated work remains unchanged');
const removedChildren = { ...reopened, tasks: reopened.tasks.filter(item => item.id === 'task-a') };
assert.equal(completeTodo(removedChildren, 'task-a', now).tasks.length, 3, 'A new completion works after earlier children were deleted');
const legacyReopened = state({ ...original.tasks[0], completionGeneration: now.toISOString() });
assert.equal(completeTodo(legacyReopened, 'task-a', now).tasks.length, 3, 'Previously reopened records with stale markers are repaired without another reopen');
const staleCompletedDraft = done.tasks.find(item => item.id === 'task-a');
const savedReopened = saveTodo(reopened, { ...staleCompletedDraft, title: '重新编辑' }, now);
assert.equal(savedReopened.tasks.find(item => item.id === 'task-a').completedAt, null);
assert.equal(savedReopened.tasks.find(item => item.id === 'task-a').completionGeneration, undefined, 'Stale drafts cannot resurrect a cleared completion marker');
const thirdState = completeTodo(done, second.id, now);
const third = thirdState.tasks.find(item => item.title === '第三步');
assert.equal(thirdState.tasks.length, 4);
assert.deepEqual(third.nextTasks.map(item => item.title), ['第四步']);
const fourthState = completeTodo(thirdState, third.id, now);
const fourth = fourthState.tasks.find(item => item.title === '第四步');
for (const step of [third, fourth]) {
  for (const key of ['dueDate', 'dueTime', 'tags', 'important', 'urgent']) assert.deepEqual(step[key], original.tasks[0][key], `Later steps inherit ${key}`);
  assert.equal(step.reminderAt, undefined);
  assert.equal(step.recurrence, undefined);
}
assert.equal(fourthState.tasks.length, 5);
assert.deepEqual(fourth.nextTasks, []);
assert.equal(completeTodo(fourthState, fourth.id, now).tasks.length, 5, 'The last step ends the chain');
const completedLegacy = task({ completedAt: now.toISOString(), recurrence: { unit: 'day', interval: 1 } });
assert.equal(completeTodo(toggleTodo(state(completedLegacy), completedLegacy.id, now), completedLegacy.id, now).tasks.length, 2, 'Old completed records can start another cycle after reopening');
const staleEditor = { ...original.tasks[0], title: '编辑原任务', completedAt: null };
assert.equal(saveTodo(done, staleEditor, now).tasks.find(item => item.id === 'task-a').completedAt, now.toISOString(), 'A stale editor cannot silently reopen a completed task');

const filler = count => Array.from({ length: count }, (_, index) => task({ id: `filler-${index}`, completedAt: index % 2 ? now.toISOString() : null }));
const full = freeze(state(...filler(MAX_TODO_TASKS - 1), original.tasks[0]));
const fullSnapshot = JSON.stringify(full);
const fullReopened = freeze(state(...filler(MAX_TODO_TASKS - 3), ...reopened.tasks));
assert.throws(() => completeTodo(fullReopened, 'task-a', now), /清理.*2 个空位/);
assert.equal(fullReopened.tasks.find(item => item.id === 'task-a').completedAt, null, 'Capacity failure leaves reopened tasks uncompleted');
assert.throws(() => completeTodo(full, 'task-a', now), /清理.*2 个空位/, 'Insufficient room prevents the entire completion');
assert.equal(JSON.stringify(full), fullSnapshot, 'A failed completion neither marks the task nor drops existing records');
assert.throws(() => saveTodo(full, task({ id: 'new' }), now), /清理/);
assert.equal(saveTodo(full, { ...full.tasks[0], title: '允许修改' }, now).tasks.length, MAX_TODO_TASKS);
const twoSpaces = state(...filler(MAX_TODO_TASKS - 3), original.tasks[0]);
const filled = completeTodo(twoSpaces, 'task-a', now);
assert.equal(filled.tasks.length, MAX_TODO_TASKS);
assert.ok(twoSpaces.tasks.every(before => filled.tasks.some(after => before.id === after.id)), 'Generated work never truncates old records');
assert.equal(completeTodo(full, 'filler-0', now).tasks.length, MAX_TODO_TASKS, 'Completion without generation still works at capacity');

console.log('PASS todos: priority defaults, version 1 compatibility, immutable saves, optional-field validation, monthly anchors, calendar boundaries, overdue cycles, next-step chains, duplicate prevention, one-time reminder isolation and atomic capacity checks.');

const { moveTodo, sortTodosByTime, sortTodos, getTodoSortMode, orderTodos, applyTodoSort, retryTodoMove } = load('todo-data');
const board = state(task({ id: 'a', dueDate: '' }), task({ id: 'b', dueDate: '2026-12-16', dueTime: '12:00' }), task({ id: 'c', dueDate: '2026-12-16', dueTime: '08:00' }), task({ id: 'd', dueDate: '2026-12-16' }));
assert.deepEqual(sortTodosByTime(board.tasks).map(item => item.id), ['c', 'b', 'd', 'a']);
assert.deepEqual(board.tasks.map(item => item.id), ['a', 'b', 'c', 'd']);
assert.deepEqual(sortTodos(freeze(board.tasks), 'schedule', 'desc').map(item => item.id), ['d', 'b', 'c', 'a'], 'Descending schedules keep unscheduled records last');
const createdOrder = freeze([task({ id: 'old', createdAt: '2026-09-01T00:00:00Z' }), task({ id: 'missing', createdAt: '' }), task({ id: 'new', createdAt: '2026-10-01T08:00:00+08:00' }), task({ id: 'tie', createdAt: '2026-10-01T00:00:00Z' })]);
assert.deepEqual(sortTodos(createdOrder, 'created', 'desc').map(item => item.id), ['new', 'tie', 'old', 'missing'], 'Creation dates compare actual instants, preserve ties and tolerate legacy missing values');
assert.deepEqual(sortTodos(createdOrder, 'created', 'asc').map(item => item.id), ['old', 'new', 'tie', 'missing']);
assert.deepEqual(createdOrder.map(item => item.id), ['old', 'missing', 'new', 'tie'], 'Sorting does not mutate records or source arrays');
const reordered = moveTodo(freeze(board), 'c', 'do', 'a');
assert.deepEqual(reordered.tasks.map(item => item.id), ['c', 'a', 'b', 'd']);
assert.equal(reordered.sort, 'custom');
const across = moveTodo(reordered, 'c', 'plan', null);
assert.equal(records.todoQuadrant(across.tasks.find(item => item.id === 'c')).id, 'plan');
assert.equal(across.tasks.find(item => item.id === 'c').dueTime, '08:00');
assert.equal(moveTodo(across, 'missing', 'do', null), across);
assert.equal(moveTodo(across, 'c', 'invalid', null), across);
const ids = tasks => tasks.map(item => item.id);
const legacyBoard = freeze({ ...board, unknownStateField: { retained: true } });
assert.equal(getTodoSortMode(legacyBoard), 'custom');
assert.equal(orderTodos(legacyBoard), legacyBoard.tasks, 'Old states retain their stored manual array without a migration');
for (const sort of ['schedule', 'created', 'custom', 'future-mode', null, {}]) {
  const compatible = freeze({ ...board, sort });
  assert.equal(records.isTodoState(compatible), true, 'Unknown optional metadata must never make valid task records inaccessible');
  assert.equal(getTodoSortMode(compatible), ['schedule', 'created'].includes(sort) ? sort : 'custom');
}
const scheduled = freeze(applyTodoSort(legacyBoard, 'schedule'));
assert.equal(scheduled.sort, 'schedule');
assert.deepEqual(ids(scheduled.tasks), ['c', 'b', 'd', 'a']);
assert.deepEqual(scheduled.tasks, orderTodos({ ...legacyBoard, sort: 'schedule' }));
assert.equal(scheduled.unknownStateField, legacyBoard.unknownStateField);
for (const current of scheduled.tasks) assert.equal(current, legacyBoard.tasks.find(item => item.id === current.id), 'Automatic sorting preserves every task field and object');
assert.equal(applyTodoSort(scheduled, 'schedule'), scheduled, 'Confirming the existing mode and order is a no-op');
const newest = freeze(applyTodoSort({ ...legacyBoard, tasks: createdOrder }, 'created'));
assert.equal(newest.sort, 'created');
assert.deepEqual(ids(orderTodos(newest)), ['new', 'tie', 'old', 'missing']);
const manual = freeze(applyTodoSort(newest, 'custom'));
assert.deepEqual(ids(manual.tasks), ids(newest.tasks), 'Selecting custom retains the current full array order');
assert.equal(manual.sort, 'custom');
for (const mode of ['schedule', 'created', 'custom']) {
  const automatic = freeze({ ...legacyBoard, tasks: mode === 'created' ? createdOrder : board.tasks, sort: mode });
  const displayed = orderTodos(automatic);
  const first = displayed[0], next = displayed[1], last = displayed.at(-1);
  const original = JSON.stringify(automatic);
  assert.equal(moveTodo(automatic, first.id, 'do', next.id), automatic, 'Dropping a task directly before its current successor preserves the mode and timestamps');
  assert.equal(moveTodo(automatic, last.id, 'do', null), automatic, 'Dropping an already last task at the group tail is a no-op');
  for (const [id, q, before] of [[first.id, 'do', first.id], [first.id, 'do', '__gone__'], ['__gone__', 'do', null], [first.id, 'invalid', null]]) {
    assert.equal(moveTodo(automatic, id, q, before), automatic);
  }
  const moved = moveTodo(automatic, last.id, 'do', first.id);
  assert.equal(moved.sort, 'custom', 'Actual dragging from every sort mode switches atomically to custom');
  assert.deepEqual(ids(moved.tasks), [last.id, ...ids(displayed).slice(0, -1)], 'Dragging begins from the currently displayed automatic order');
  assert.deepEqual(ids(orderTodos(JSON.parse(JSON.stringify(moved)))), ids(moved.tasks), 'The saved custom order survives reload');
  const altered = moved.tasks.find(item => item.id === last.id);
  assert.notEqual(altered.updatedAt, last.updatedAt);
  assert.deepEqual({ ...altered, updatedAt: last.updatedAt }, last, 'Only the moved record timestamp changes inside a quadrant');
  for (const before of automatic.tasks.filter(item => item.id !== last.id)) assert.equal(moved.tasks.find(item => item.id === before.id), before);
  assert.equal(JSON.stringify(automatic), original, 'Immutable automatic states are never changed during drag');
}
const interleaved = freeze(state(
  task({ id: 'one', dueDate: '2026-10-01' }),
  task({ id: 'other-q', important: true, urgent: false, dueDate: '2026-10-02' }),
  task({ id: 'two', dueDate: '2026-10-03' }),
  task({ id: 'done', completedAt: now.toISOString(), dueDate: '2026-10-04' }),
  task({ id: 'three', dueDate: '2026-10-05' }),
));
const interleavedAuto = freeze({ ...interleaved, sort: 'schedule' });
assert.equal(moveTodo(interleavedAuto, 'one', 'do', 'two'), interleavedAuto, 'Interleaving other quadrants does not turn a same-group original position into a reorder');
assert.equal(moveTodo(interleavedAuto, 'three', 'do', null), interleavedAuto, 'Other completion groups do not affect a group-tail no-op');
assert.equal(moveTodo(interleavedAuto, 'one', 'do', 'done'), interleavedAuto, 'Drops cannot change completion groups');
assert.equal(moveTodo(interleavedAuto, 'one', 'do', 'other-q'), interleavedAuto, 'A target belonging to another quadrant is invalid');
const visible = ['one', 'three'];
const filteredMoved = moveTodo(interleavedAuto, 'three', 'do', 'one', visible);
assert.deepEqual(ids(filteredMoved.tasks), ['three', 'other-q', 'two', 'done', 'one']);
assert.equal(filteredMoved.sort, 'custom');
for (const index of [1, 2, 3]) assert.equal(filteredMoved.tasks[index], interleavedAuto.tasks[index], 'Filtered-out records preserve their slots and all metadata');
assert.equal(moveTodo(interleavedAuto, 'one', 'do', 'two', visible), interleavedAuto, 'Targets outside the captured visible IDs cannot be used');
assert.equal(moveTodo(interleavedAuto, 'two', 'do', null, visible), interleavedAuto, 'Sources outside the captured visible IDs cannot be used');
const staleTarget = freeze({ ...interleavedAuto, tasks: interleavedAuto.tasks.filter(item => item.id !== 'one') });
assert.equal(moveTodo(staleTarget, 'three', 'do', 'one', visible), staleTarget, 'A disappeared target never turns a move into an unexpected append');
const emptyTarget = moveTodo(interleavedAuto, 'one', 'later', null, visible);
assert.equal(emptyTarget.sort, 'custom');
assert.equal(records.todoQuadrant(emptyTarget.tasks.find(item => item.id === 'one')).id, 'later');
assert.deepEqual(ids(emptyTarget.tasks), ['three', 'other-q', 'two', 'done', 'one'], 'Cross-quadrant moves still preserve filtered-out positions');
assert.equal(emptyTarget.tasks.find(item => item.id === 'one').completedAt, null);
const scheduleAdded = saveTodo(scheduled, task({ id: 'added', dueDate: '2026-12-15' }), now);
assert.equal(scheduleAdded.sort, 'schedule');
assert.equal(orderTodos(scheduleAdded)[0].id, 'added', 'An automatic schedule mode also orders subsequent changes');
const scheduleEdited = saveTodo(scheduleAdded, { ...scheduleAdded.tasks.find(task => task.id === 'a'), dueDate: '2026-12-14' }, now);
assert.notDeepEqual(ids(scheduleEdited.tasks), ids(orderTodos(scheduleEdited)), 'Editing a schedule can make display and underlying order diverge');
assert.deepEqual(ids(applyTodoSort(scheduleEdited, 'custom').tasks), ids(orderTodos(scheduleEdited)), 'Selecting custom materializes the current schedule display after additions and edits');
const createdAdded = saveTodo(newest, task({ id: 'latest-created', createdAt: '2026-11-01T00:00:00Z' }), now);
assert.equal(createdAdded.sort, 'created');
assert.equal(orderTodos(createdAdded)[0].id, 'latest-created');
const createdBackdated = saveTodo(createdAdded, task({ id: 'backdated-created', createdAt: '2026-08-01T00:00:00Z' }), now);
assert.notDeepEqual(ids(createdBackdated.tasks), ids(orderTodos(createdBackdated)), 'A new backdated task is displayed by its actual creation time');
assert.deepEqual(ids(applyTodoSort(createdBackdated, 'custom').tasks), ids(orderTodos(createdBackdated)), 'Selecting custom materializes the current creation-time display instead of reverting to raw order');
assert.equal(completeTodo(scheduled, scheduled.tasks[0].id, now).sort, 'schedule');
const fullImageOrder = { ...state(task({ id: 'capacity-a', title: 'A', images: [noteImage] }), task({ id: 'capacity-b', title: 'B' })), filler: '' };
fullImageOrder.filler = 'A'.repeat(900 * 1024 - Buffer.byteLength(JSON.stringify(fullImageOrder), 'utf8'));
freeze(fullImageOrder);
assert.equal(load('note-image-data').noteStateFits(fullImageOrder), true);
assert.throws(() => applyTodoSort(fullImageOrder, 'schedule'), /空间不足/, 'New sort metadata respects the existing image-state capacity limit');
assert.throws(() => moveTodo(fullImageOrder, 'capacity-b', 'do', 'capacity-a'), /空间不足/);
assert.equal(fullImageOrder.sort, undefined);
assert.deepEqual(ids(fullImageOrder.tasks), ['capacity-a', 'capacity-b']);
const retryTarget = freeze(moveTodo(scheduled, 'a', 'plan', null));
const recent = freeze({ ...scheduled, extraLatestField: 'retained', tasks: [
  { ...scheduled.tasks.find(task => task.id === 'b'), title: 'Latest B' },
  { ...scheduled.tasks.find(task => task.id === 'a'), title: 'Latest A', description: 'Latest body', completedAt: now.toISOString(), updatedAt: '2030-01-01T00:00:00Z' },
  scheduled.tasks.find(task => task.id === 'd'),
  task({ id: 'new-during-retry', title: 'New' }),
] });
const retried = retryTodoMove(recent, retryTarget, 'a');
assert.equal(retried.sort, 'custom');
assert.deepEqual(ids(retried.tasks), [...ids(retryTarget.tasks).filter(id => id !== 'c'), 'new-during-retry']);
assert.equal(retried.extraLatestField, 'retained');
const retriedSource = retried.tasks.find(task => task.id === 'a');
assert.equal(records.todoQuadrant(retriedSource).id, 'plan');
assert.equal(retriedSource.title, 'Latest A');
assert.equal(retriedSource.description, 'Latest body');
assert.equal(retriedSource.completedAt, now.toISOString());
assert.equal(retriedSource.updatedAt, '2030-01-01T00:00:00Z', 'A retry cannot regress a newer record update timestamp');
assert.equal(retried.tasks.find(task => task.id === 'b'), recent.tasks.find(task => task.id === 'b'));
assert.deepEqual(retryTodoMove(freeze(retried), retryTarget, 'a'), retried, 'Retrying the same target is idempotent');
const deletedSource = freeze({ ...recent, tasks: recent.tasks.filter(task => task.id !== 'a') });
assert.throws(() => retryTodoMove(deletedSource, retryTarget, 'a'), /不存在/);
assert.equal(deletedSource.tasks.some(task => task.id === 'a'), false, 'Retry never revives a deleted task');
console.log('PASS three persistent task sort modes, legacy and unknown metadata, automatic display order, no-op drops, filtered slots, cross-quadrant moves, reload and capacity boundaries.');
const { analysisDays, focusAnalysis, taskAnalysis } = load('activity-analytics');
const dates = analysisDays(new Date(2026, 0, 2, 12), 7);
assert.equal(dates[0], '2025-12-27'); assert.equal(dates[6], '2026-01-02');
const sessions = [
  { id: 'f', mode: 'focus', title: 'Read', durationSeconds: 1200, completed: true, endedAt: new Date(2026, 0, 2, 0, 1).toISOString() },
  { id: 'early', mode: 'focus', title: 'Read', durationSeconds: 300, completed: false, endedAt: new Date(2026, 0, 1, 23, 59).toISOString() },
  { id: 'rest', mode: 'shortBreak', title: '', durationSeconds: 600, completed: true, endedAt: new Date(2026, 0, 2).toISOString() },
  { id: 'old', mode: 'focus', title: 'Old', durationSeconds: 600, completed: true, endedAt: new Date(2025, 0, 2).toISOString() },
];
const focusReport = focusAnalysis(sessions, dates);
assert.equal(focusReport.total, 1500); assert.equal(focusReport.completed, 1);
assert.equal(focusReport.daily.at(-1).value, 20); assert.equal(focusReport.groups[0].value, 25);
const taskReport = taskAnalysis([task({ id: 'due', dueDate: '2026-01-02', dueTime: '10:00' }), task({ id: 'later', dueDate: '2026-01-02', dueTime: '18:00' }), task({ id: 'done', completedAt: new Date(2026, 0, 2, 11).toISOString() })], dates, new Date(2026, 0, 2, 12));
assert.equal(taskReport.completed.length, 1); assert.equal(taskReport.open.length, 2); assert.equal(taskReport.overdue.length, 1);
const invalidDeadlines = freeze([task({ id: 'invalid-day', dueDate: '2025-02-30' }), task({ id: 'invalid-clock', dueDate: '2026-01-02', dueTime: '00:99' })]);
assert.equal(taskAnalysis(invalidDeadlines, dates, new Date(2026, 0, 2, 12)).overdue.length, 0, 'Invalid legacy calendar dates and clocks never become overdue facts');
// The retained charts and new insights share the current instant, rather than
// accidentally including a later timestamp on the same device-local day.
const { taskStatisticsInsight, focusStatisticsInsight } = load('statistics-task-focus-insights');
const analysisNow = new Date(2026, 0, 2, 12);
const instantTasks = freeze([
  task({ id: 'at-now', completedAt: analysisNow.toISOString() }),
  task({ id: 'valid-before', completedAt: new Date(2026, 0, 1, 23, 59).toISOString() }),
  task({ id: 'future-same-day', completedAt: new Date(analysisNow.getTime() + 1).toISOString() }),
  task({ id: 'future-date', completedAt: new Date(2026, 0, 3).toISOString() }),
  task({ id: 'invalid-completed', completedAt: 'invalid' }),
]);
const legacyTasks = taskAnalysis(instantTasks, dates, analysisNow);
const newTasks = taskStatisticsInsight({ version: 1, tasks: instantTasks, categories: [] }, analysisNow, 7);
assert.deepEqual(legacyTasks.completed.map(item => item.id), ['at-now', 'valid-before']);
assert.equal(legacyTasks.completed.length, Number(newTasks.metrics.find(item => item.label === '期间完成').value));
assert.equal(legacyTasks.daily.at(-1).value, 1, 'Same-day future completion is absent from the retained daily chart');
const instantSession = patch => ({ id: 'valid', mode: 'focus', title: '保留专注', durationSeconds: 600, plannedSeconds: 1500,
  startedAt: new Date(2026, 0, 2, 11, 50).toISOString(), endedAt: analysisNow.toISOString(), completed: true, taskId: null, habitId: null, ...patch });
const instantSessions = freeze([
  instantSession({ id: 'at-now' }),
  instantSession({ id: 'early', durationSeconds: 300, completed: false, endedAt: new Date(2026, 0, 2, 11, 55).toISOString() }),
  instantSession({ id: 'future-same-day', endedAt: new Date(analysisNow.getTime() + 1).toISOString() }),
  instantSession({ id: 'future-date', endedAt: new Date(2026, 0, 3).toISOString() }),
  instantSession({ id: 'invalid-started', startedAt: 'invalid' }),
  instantSession({ id: 'invalid-ended', endedAt: 'invalid' }),
  instantSession({ id: 'reversed', startedAt: new Date(analysisNow.getTime() + 1).toISOString() }),
  instantSession({ id: 'zero', durationSeconds: 0 }),
  instantSession({ id: 'negative', durationSeconds: -1 }),
  instantSession({ id: 'rest', mode: 'shortBreak' }),
]);
const legacyFocus = focusAnalysis(instantSessions, dates, analysisNow);
const newFocus = focusStatisticsInsight({ ...load('pomodoro-data').initialPomodoroState, sessions: instantSessions }, analysisNow, 7);
assert.deepEqual(legacyFocus.selected.map(item => item.id), ['at-now', 'early']);
assert.equal(legacyFocus.total / 60, Number(newFocus.metrics.find(item => item.label === '专注分钟').value));
assert.equal(legacyFocus.completed, Number(newFocus.metrics.find(item => item.label === '完整番茄').value));
assert.equal(legacyFocus.daily.at(-1).value, 15);
assert.equal(legacyFocus.groups[0].value, 15, 'The same cutoff applies to retained title totals');
console.log('PASS manual task ordering, cross-quadrant moves, due-time sorting and task/focus analytics boundaries.');
const { resumeEditorInput } = load('resume-editor-input');
const baselineInput = freeze({ id: 'original', title: '原名称', description: '原正文', tags: ['工作'], completedAt: null, optional: { value: 1 } });
const latestInput = freeze({ ...baselineInput, tags: ['最新标签'], completedAt: '2026-10-06', extra: '保留最新字段' });
const unsavedInput = freeze({ ...baselineInput, title: '未保存名称', description: '未保存正文', optional: undefined });
assert.deepEqual(resumeEditorInput(latestInput, baselineInput, unsavedInput), { ...latestInput, title: '未保存名称', description: '未保存正文', optional: undefined });
assert.equal(resumeEditorInput(latestInput, baselineInput, baselineInput).completedAt, '2026-10-06');
assert.deepEqual(resumeEditorInput(latestInput, baselineInput, { ...baselineInput, tags: ['待保存标签'] }).tags, ['待保存标签']);
console.log('PASS dismissed editor recovery: unsaved fields, latest untouched fields and completion, removed optional values, tags and immutable inputs.');
