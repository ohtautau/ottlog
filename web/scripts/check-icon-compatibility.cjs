/* eslint-disable @typescript-eslint/no-require-imports -- This standalone Node.js test runner uses CommonJS. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { fixtures, load, createToolBackup, parseToolBackup, importToolData } = require('./tool-backup-fixtures.cjs');
const a = fixtures('one'), b = fixtures('two');
const { cleanState } = load('app/daily/reminders.ts');
const { makeMemo, sameMemoContent, isMemo } = load('app/memos/memo-data.ts');

// Older web clients retain library choices without needing the new icon catalog.
const iconHabits = { ...a.reminders, items: a.reminders.items.map(item => ({ ...item, iconId: 'running' })) };
const iconMemos = { ...a.memos, notes: a.memos.notes.map(note => ({ ...note, iconId: 'future-library-icon' })) };
for (const [key, state] of [['reminders', iconHabits], ['memos', iconMemos]]) {
  assert.deepEqual(parseToolBackup(JSON.stringify(createToolBackup(key, state)), key).data, state, `${key} backup preserves library icons`);
  const records = key === 'memos' ? 'notes' : 'items';
  assert.deepEqual(importToolData(key, state, b[key], 'merge')[records][0], state[records][0]);
}
assert.equal(cleanState(iconHabits).items[0].iconId, 'running');
assert.equal(Object.hasOwn(makeMemo('fresh', '2026-09-16T08:00:00.000Z'), 'iconId'), false);
assert.equal(Object.hasOwn(cleanState(a.reminders).items[0], 'iconId'), false);
assert.equal(sameMemoContent(a.memos.notes[0], { ...a.memos.notes[0], iconId: 'running' }), false, 'An icon-only remote edit must trigger stale-draft protection');
assert.equal(sameMemoContent(iconMemos.notes[0], { ...iconMemos.notes[0] }), true);
assert.equal(isMemo({ ...a.memos.notes[0], iconId: 5 }), false);

// Run the actual form handler with a newer stored record than the open editor.
const filename = path.join(__dirname, '../src/app/daily/daily-experience.tsx');
const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let saveHandler;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'saveReminder') saveHandler = node.getText(source);
  ts.forEachChild(node, visit);
}
visit(source);
assert(saveHandler, 'The daily editor save handler exists');
const handler = ts.transpileModule(saveHandler, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function saveHabit(editing, latest) {
  let saved = { version: 1, items: [latest], done: {} };
  const noop = () => {};
  const context = {
    imageBusy: false, ready: true, editing, state: saved, cleanState,
    crypto: { randomUUID: () => 'new-habit' },
    FormData: class { constructor(form) { this.form = form; } get(key) { return this.form[key] ?? null; } },
    setValue: update => { saved = update(saved); },
    setEditing: noop, setFormKey: noop, setSelected: noop, setGroup: noop, setOnlyTodo: noop, setMessage: noop,
  };
  const save = new Function(...Object.keys(context), `${handler}\nreturn saveReminder;`)(...Object.values(context));
  save({ preventDefault: noop, currentTarget: { title: 'Edited title', note: '', group: '精神', kind: 'notes', minutes: '0', backgroundKind: '', backgroundImage: '' } });
  return saved;
}
const stale = iconHabits.items[0];
const edited = saveHabit(stale, { ...stale, iconId: 'cycling', backgroundKind: 'plant' }).items[0];
assert.equal(edited.iconId, 'cycling', 'Editing text must preserve the latest mini-program icon choice');
assert.equal(edited.title, 'Edited title');
assert.equal(Object.hasOwn(edited, 'backgroundKind'), false, 'Clearing the form background still works');
assert.equal(Object.hasOwn(saveHabit(a.reminders.items[0], a.reminders.items[0]).items[0], 'iconId'), false, 'Editing legacy habits does not add icons');
const created = saveHabit(null, stale).items.find(item => item.id === 'new-habit');
assert.equal(Object.hasOwn(created, 'iconId'), false, 'New web habits keep the existing default');
console.log('PASS web icon compatibility: form edits, latest icon preservation, legacy defaults, backup round trips, merge, and memo conflict detection.');
