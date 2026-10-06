// Browser regressions for same-origin personal-tool synchronization.
// Account and personal-tool APIs are mocked; no real account/database is modified.
// Run against an existing isolated preview: TEST_ORIGIN=http://... node scripts/check-tool-cache-races.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium, expect } = require("@playwright/test");

const runtimePath = path.join(__dirname, "../test-results/productivity-runtime.json");
const origin = process.env.TEST_ORIGIN || (fs.existsSync(runtimePath) ? JSON.parse(fs.readFileSync(runtimePath, "utf8")).origin : "");
if (!origin) throw new Error("Set TEST_ORIGIN to an existing preview server URL.");

const initial = () => ({
  version: 1,
  settings: { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4 },
  mode: "focus", selection: { taskId: null, title: "" }, active: null, sessions: [],
});
const storageKey = owner => `ottlog-tool-v1:reader:${owner}:pomodoro`;

async function mockAccount(context, owner) {
  await context.route("**/api/account/**", route => route.fulfill({ json: { authenticated: true, isAdmin: false, userName: owner, csrfToken: "fixture-token" } }));
}
async function readCache(page, owner) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey(owner));
}

async function delayedReadMustKeepNewSave(browser) {
  const context = await browser.newContext();
  const owner = "regression-delayed-read";
  let serverState = initial(), pageB, held;
  let onReadHeld;
  const readHeld = new Promise(resolve => { onReadHeld = resolve; });
  try {
    await mockAccount(context, owner);
    await context.route("**/api/personal-tools/**", async route => {
      const request = route.request();
      if (!request.url().endsWith("/pomodoro")) return route.fulfill({ json: { data: null } });
      if (request.method() === "PUT") {
        serverState = request.postDataJSON().data;
        return route.fulfill({ json: { ok: true } });
      }
      const snapshot = structuredClone(serverState);
      if (request.frame().page() === pageB && !held) {
        held = { route, snapshot };
        onReadHeld();
        return;
      }
      return route.fulfill({ json: { data: snapshot } });
    });
    const pageA = await context.newPage();
    await pageA.goto(`${origin}/pomodoro`);
    await expect(pageA.getByRole("button", { name: "开始专注", exact: true })).toBeEnabled();
    pageB = await context.newPage();
    await pageB.goto(`${origin}/pomodoro`);
    await Promise.race([readHeld, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error("Timed out waiting for tab B's mocked GET")), 15000); timer.unref(); })]);

    await pageA.getByRole("button", { name: "开始专注", exact: true }).click();
    await pageA.waitForFunction(key => { const cache = JSON.parse(localStorage.getItem(key)); return cache?.data?.active && !cache.pending; }, storageKey(owner));
    const before = await readCache(pageA, owner);
    assert.ok(before.data.active.id);
    // Tab B now gets the stale snapshot, after A's newer PUT has completed.
    await held.route.fulfill({ json: { data: held.snapshot } });
    await expect(pageB.getByRole("button", { name: "暂停一下", exact: true })).toBeEnabled();
    assert.equal((await readCache(pageB, owner)).data.active.id, before.data.active.id);
    assert.equal((await readCache(pageA, owner)).data.active.id, before.data.active.id);
    assert.equal(serverState.active.id, before.data.active.id);
    console.log("PASS delayed GET preserves a newer fully-saved timer in both tabs");
  } finally { await context.close(); }
}

async function delayedStorageEventMustNotResurrectTimer(browser, useWebLocks = true) {
  const context = await browser.newContext();
  if (!useWebLocks) await context.addInitScript(() => Object.defineProperty(navigator, "locks", { configurable: true, value: undefined }));
  const owner = useWebLocks ? "regression-busy-tab" : "regression-busy-tab-fallback";
  const now = Date.now();
  let serverState = { ...initial(), active: {
    id: "fixture-running-timer", mode: "focus", totalSeconds: 1500, remainingSeconds: 1500,
    running: true, deadline: now + 1_400_000, startedAt: new Date(now - 100_000).toISOString(),
    selection: { taskId: null, title: "Synchronization fixture" },
  } };
  try {
    await mockAccount(context, owner);
    await context.route("**/api/personal-tools/**", async route => {
      if (!route.request().url().endsWith("/pomodoro")) return route.fulfill({ json: { data: null } });
      if (route.request().method() === "PUT") {
        serverState = route.request().postDataJSON().data;
        return route.fulfill({ json: { ok: true } });
      }
      return route.fulfill({ json: { data: structuredClone(serverState) } });
    });
    const pageA = await context.newPage(), pageB = await context.newPage();
    await pageA.goto(`${origin}/pomodoro`);
    await expect(pageA.getByRole("button", { name: "暂停一下", exact: true })).toBeEnabled();
    await pageB.goto(`${origin}/pomodoro`);
    await expect(pageB.getByRole("button", { name: "暂停一下", exact: true })).toBeEnabled();
    const blockStarted = pageB.waitForEvent("console", { predicate: message => message.text() === "fixture-block-start", timeout: 10000 });
    const busy = pageB.evaluate(key => {
      console.log("fixture-block-start");
      const until = performance.now() + 2500;
      // Intentionally block delivery of queued storage events, then act on stale UI.
      while (performance.now() < until) { /* regression fixture */ }
      const pause = [...document.querySelectorAll("button")].find(button => button.textContent.startsWith("暂停一下"));
      if (!pause) throw new Error("Missing stale pause button");
      const beforeAction = JSON.parse(localStorage.getItem(key));
      pause.click();
      return { active: beforeAction?.data?.active?.id ?? null, sessions: beforeAction?.data?.sessions.length };
    }, storageKey(owner));
    busy.catch(() => {});
    await blockStarted;
    await pageA.getByRole("button", { name: "提前结束 · 记录", exact: true }).click();
    await pageA.waitForFunction(key => { const data = JSON.parse(localStorage.getItem(key))?.data; return data?.active === null && data.sessions.length === 1; }, storageKey(owner));
    const recorded = await readCache(pageA, owner);
    assert.equal(recorded.data.active, null);
    assert.equal(recorded.data.sessions.length, 1);
    const actionSnapshot = await busy;
    console.log("busy-tab action snapshot", JSON.stringify(actionSnapshot));
    await pageA.waitForFunction(key => { const cache = JSON.parse(localStorage.getItem(key)); return cache && !cache.pending; }, storageKey(owner));
    await expect(pageB.getByRole("button", { name: "开始专注", exact: true })).toBeEnabled();
    for (const page of [pageA, pageB]) {
      const final = await readCache(page, owner);
      assert.equal(final.data.active, null);
      assert.equal(final.data.sessions.length, 1);
      assert.equal(final.data.sessions[0].id, "fixture-running-timer");
    }
    assert.equal(serverState.active, null);
    assert.equal(serverState.sessions.length, 1);
    console.log(`PASS busy tab's stale pause cannot resurrect a finished timer or lose its record (${useWebLocks ? "Web Locks" : "without Web Locks"})`);
  } finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await delayedReadMustKeepNewSave(browser);
    await delayedStorageEventMustNotResurrectTimer(browser);
    await delayedStorageEventMustNotResurrectTimer(browser, false);
    console.log("3 cache-race regressions passed; mocked APIs only.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
