import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("./pomodoro-data.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const model = {};
new Function("exports", output)(model);
const { initialPomodoroState, startTimer, pauseTimer, resumeTimer, finishTimer, remainingSeconds, normalizePomodoroState } = model;
const start = Date.parse("2026-09-09T10:00:00.000Z");
const selection = { taskId: "read-book", title: "Read a chapter" };
const fresh = () => normalizePomodoroState(initialPomodoroState);

test("pause, refresh and resume exclude paused time from the actual duration", () => {
  const running = startTimer(fresh(), start, "session-one", selection);
  const paused = pauseTimer(running, start + 100_000);
  assert.equal(paused.active.remainingSeconds, 1400);
  assert.equal(remainingSeconds(paused.active, start + 3_600_000), 1400);
  const reloaded = normalizePomodoroState(JSON.parse(JSON.stringify(paused)));
  const resumed = resumeTimer(reloaded, start + 3_600_000);
  const finished = finishTimer(resumed, start + 3_700_000, true);
  assert.equal(finished.sessions[0].durationSeconds, 200);
  assert.equal(finished.sessions[0].completed, false);
  assert.equal(finished.active, null);
  assert.equal(finished.sessions[0].title, selection.title);
  assert.equal(finished.sessions[0].taskId, selection.taskId);
});

test("late hydration records the original deadline once and preserves linked title", () => {
  const running = startTimer(fresh(), start, "late-session", selection);
  const restored = normalizePomodoroState(JSON.parse(JSON.stringify(running)));
  const finished = finishTimer(restored, start + 86_400_000);
  assert.equal(finished.sessions.length, 1);
  assert.equal(finished.sessions[0].endedAt, new Date(start + 1500_000).toISOString());
  assert.equal(finished.sessions[0].durationSeconds, 1500);
  assert.equal(finished.mode, "shortBreak");
  assert.equal(finishTimer(finished, start + 90_000_000).sessions.length, 1);
  const staleActive = normalizePomodoroState({ ...finished, active: restored.active });
  assert.equal(staleActive.active, null);
  assert.equal(staleActive.sessions.length, 1);
});

test("refresh while running keeps the deadline and early finish never claims a full round", () => {
  const running = startTimer(fresh(), start, "refresh-session", { taskId: null, title: "Practice" });
  const restored = normalizePomodoroState(JSON.parse(JSON.stringify(running)));
  assert.equal(restored.active.deadline, start + 1500_000);
  assert.equal(remainingSeconds(restored.active, start + 60_000), 1440);
  const done = finishTimer(restored, start + 60_000, true);
  assert.equal(done.sessions[0].durationSeconds, 60);
  assert.equal(done.sessions[0].plannedSeconds, 1500);
  assert.equal(done.sessions[0].completed, false);
  assert.equal(done.mode, "focus");
});

test("rest rounds are stored separately and cannot inflate focus totals", () => {
  const rest = startTimer({ ...fresh(), mode: "shortBreak" }, start, "break-session", selection);
  const done = finishTimer(rest, start + 300_000);
  assert.equal(done.sessions[0].mode, "shortBreak");
  assert.equal(done.sessions[0].taskId, null);
  assert.equal(done.sessions[0].title, "");
  assert.equal(done.sessions.filter(session => session.mode === "focus").length, 0);
  assert.equal(done.mode, "focus");
});

test("four completed focus rounds select a long break without starting it", () => {
  let state = fresh();
  for (let i = 0; i < 4; i++) {
    state = startTimer({ ...state, mode: "focus" }, start + i * 2000_000, `round-${i}`, selection);
    state = finishTimer(state, start + i * 2000_000 + 1500_000);
  }
  assert.equal(state.sessions.length, 4);
  assert.equal(state.mode, "longBreak");
  assert.equal(state.active, null);
});

test("zero-second stop creates no misleading history and actions are idempotent", () => {
  const running = startTimer(fresh(), start, "instant", selection);
  assert.equal(startTimer(running, start, "second", selection).active.id, "instant");
  assert.equal(finishTimer(running, start, true).sessions.length, 0);
  assert.equal(finishTimer(running, start).active.id, "instant");
  assert.equal(pauseTimer(pauseTimer(running, start + 2000), start + 60_000).active.remainingSeconds, 1498);
});

test("cross-midnight finish uses the deadline day even when opened the following day", () => {
  const midnightStart = Date.parse("2026-09-09T23:50:00+08:00");
  const done = finishTimer(startTimer(fresh(), midnightStart, "overnight", selection), midnightStart + 86_400_000);
  assert.equal(done.sessions[0].endedAt, "2026-09-09T16:15:00.000Z");
});

test("normalization rejects duplicates and malformed fields, bounds history to 1000", () => {
  const session = finishTimer(startTimer(fresh(), start, "valid", selection), start + 1500_000).sessions[0];
  const state = normalizePomodoroState({ settings: { focus: Infinity, shortBreak: -5, longEvery: 99 }, sessions: [session, session, {}, null], active: { id: "broken", startedAt: "bad" } });
  assert.equal(state.sessions.length, 1);
  assert.equal(state.active, null);
  assert.equal(state.settings.focus, 25);
  assert.equal(state.settings.shortBreak, 1);
  assert.equal(state.settings.longEvery, 12);
  const many = normalizePomodoroState({ sessions: Array.from({ length: 1010 }, (_, i) => ({ ...session, id: `session-${i}` })) });
  assert.equal(many.sessions.length, 1000);
});
