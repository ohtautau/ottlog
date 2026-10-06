/* eslint-disable @typescript-eslint/no-require-imports -- This standalone Node.js test runner uses CommonJS. */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium, expect } = require("@playwright/test");

const runtimePath = path.join(__dirname, "..", "test-results", "productivity-runtime.json");
const origin = process.env.TEST_ORIGIN || (fs.existsSync(runtimePath) ? JSON.parse(fs.readFileSync(runtimePath, "utf8").replace(/^\uFEFF/, "")).origin : undefined);
if (!origin || new URL(origin).port === "3000") throw new Error("Set TEST_ORIGIN to an isolated preview; do not use the normal development session.");
const cacheKey = "ottlog-tool-v1:guest:memos";
const draftKey = "ottlog-memos-editor:v1:guest";

async function cached(page) {
  return page.evaluate(({ cacheKey, draftKey }) => ({ library: JSON.parse(localStorage.getItem(cacheKey) || "null"), editor: JSON.parse(localStorage.getItem(draftKey) || "null") }), { cacheKey, draftKey });
}

async function select(page, title) {
  await page.locator("aside button[aria-pressed]").filter({ hasText: title }).click();
  await expect(page.getByLabel("备忘标题")).toHaveValue(title);
  await expect(page.getByLabel("备忘编辑器")).toHaveAttribute("aria-busy", "false");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(`${origin}/memos`, { waitUntil: "networkidle" });
    await expect(page.getByLabel("备忘正文", { exact: true })).toBeVisible();
    await page.getByLabel("备忘标题").fill("第一张异步测试纸页");
    await page.getByLabel("备忘正文").fill("第一张原始内容");
    const hasLocks = await page.evaluate(() => Boolean(navigator.locks));
    assert.equal(hasLocks, true, "The preview origin should support Web Locks");

    // Hold the same lock as the shared hook, forcing the save to stay pending.
    await page.evaluate(() => {
      window.__memoLockHeld = false;
      void navigator.locks.request("ottlog-edit:ottlog-tool-v1:guest:memos", async () => {
        window.__memoLockHeld = true;
        await new Promise((resolve) => { window.__releaseMemoLock = resolve; });
      });
    });
    await page.waitForFunction(() => window.__memoLockHeld);
    await page.getByRole("button", { name: "保存备忘" }).click();
    await expect(page.getByLabel("备忘编辑器")).toHaveAttribute("aria-busy", "true");
    await expect(page.getByLabel("备忘正文")).toBeDisabled();
    await expect(page.getByRole("button", { name: "新建备忘", exact: true })).toBeDisabled();
    await page.keyboard.press("Control+s");
    await page.keyboard.press("Control+s");
    await page.evaluate(() => document.querySelector('button[aria-label="新建备忘"]').click());
    assert.equal((await cached(page)).editor.draft.body, "第一张原始内容");
    await page.evaluate(() => window.__releaseMemoLock());
    await expect(page.getByText("「第一张异步测试纸页」已提交保存。同步进度见页面上方。", { exact: true })).toBeVisible();
    await expect(page.getByLabel("备忘编辑器")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator('[class*="editorState"]')).toHaveText(/已保存$/);
    let snapshot = await cached(page);
    assert.equal(snapshot.library.data.notes.length, 1);
    assert.equal(snapshot.editor.draft, null);
    const firstId = snapshot.library.data.notes[0].id;

    // Creating another memo must wait for the current dirty memo to save.
    await page.getByLabel("备忘正文").fill("第一张在新建时自动保存");
    await page.getByRole("button", { name: "新建备忘", exact: true }).click();
    await expect(page.getByLabel("备忘标题")).toHaveValue("");
    snapshot = await cached(page);
    assert.equal(snapshot.library.data.notes.find((memo) => memo.id === firstId).body, "第一张在新建时自动保存");
    await page.getByLabel("备忘标题").fill("第二张异步测试纸页");
    await page.getByLabel("备忘正文").fill("第二张独立内容");
    await page.getByText("纸页颜色与标签", { exact: true }).click();
    await page.getByLabel("新标签", { exact: true }).fill("待整理");
    await page.keyboard.press("Control+s");
    await expect(page.getByText("「第二张异步测试纸页」已提交保存。同步进度见页面上方。", { exact: true })).toBeVisible();
    snapshot = await cached(page);
    assert.equal(snapshot.library.data.notes.length, 2);
    assert.deepEqual(snapshot.library.data.notes.find((memo) => memo.title === "第二张异步测试纸页").tags, ["待整理"]);
    assert.equal(snapshot.editor.draft, null);
    await select(page, "第一张异步测试纸页");
    await page.getByLabel("备忘正文").fill("第一张通过切换自动保存");
    await select(page, "第二张异步测试纸页");
    assert.equal((await cached(page)).library.data.notes.find((memo) => memo.id === firstId).body, "第一张通过切换自动保存");
    await expect(page.getByLabel("备忘正文")).toHaveValue("第二张独立内容");

    // A stale editor must retain its draft instead of overwriting another tab.
    const other = await context.newPage();
    other.on("pageerror", (error) => pageErrors.push(error.message));
    await other.goto(`${origin}/memos`, { waitUntil: "networkidle" });
    await select(other, "第一张异步测试纸页");
    await select(page, "第一张异步测试纸页");
    await page.getByLabel("备忘正文").fill("本页未保存的版本必须保留");
    await other.getByLabel("备忘正文").fill("另一个页面已提交的新版本");
    await other.getByRole("button", { name: "保存备忘" }).click();
    await expect(other.getByText("「第一张异步测试纸页」已提交保存。同步进度见页面上方。", { exact: true })).toBeVisible();
    await expect(page.getByText("已保存的版本有更新。当前草稿仍为你保留。", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "保存备忘" }).click();
    await expect(page.getByText("这条备忘已在其他页面更新。请另存为新备忘，或读取已保存的版本，避免覆盖新的内容。", { exact: true })).toBeVisible();
    await expect(page.getByLabel("备忘正文")).toHaveValue("本页未保存的版本必须保留");
    snapshot = await cached(page);
    assert.equal(snapshot.library.data.notes.find((memo) => memo.id === firstId).body, "另一个页面已提交的新版本");
    assert.equal(snapshot.editor.draft.body, "本页未保存的版本必须保留");
    await page.getByRole("button", { name: "新建备忘", exact: true }).click();
    await expect(page.getByLabel("备忘标题")).toHaveValue("第一张异步测试纸页");
    await expect(page.getByLabel("备忘正文")).toHaveValue("本页未保存的版本必须保留");
    await page.getByRole("button", { name: "将草稿另存一份" }).click();
    await page.getByRole("button", { name: "保存备忘" }).click();
    await expect(page.getByText("「第一张异步测试纸页（副本）」已提交保存。同步进度见页面上方。", { exact: true })).toBeVisible();
    snapshot = await cached(page);
    assert.equal(snapshot.library.data.notes.length, 3);
    assert.equal(snapshot.library.data.notes.find((memo) => memo.title.endsWith("（副本）")).body, "本页未保存的版本必须保留");
    assert.equal(snapshot.library.data.notes.find((memo) => memo.id === firstId).body, "另一个页面已提交的新版本");
    await page.getByRole("button", { name: "删除备忘", exact: true }).click();
    await page.getByRole("button", { name: "撤销删除" }).click();
    await expect(page.getByText("已恢复「第一张异步测试纸页（副本）」。", { exact: true })).toBeVisible();
    assert.equal((await cached(page)).library.data.notes.length, 3);
    assert.deepEqual(pageErrors, []);
    console.log("PASS memo transitions: delayed Web Lock commit, repeated save guard, successful notice, draft cleanup, two consecutive notes, autosave on switch, cross-tab conflict retained, save-as copy, asynchronous delete/undo.");
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
