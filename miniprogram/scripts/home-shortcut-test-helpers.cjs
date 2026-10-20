const path = require('node:path');

const storageKey = 'ottlog.home-shortcuts.v1';
const defaultKeys = ['memo-list', 'pomodoro', 'daily', 'statistics', 'growth', 'journal'];
const defaultNames = ['便签', '开始番茄钟', '习惯', '统计', '领域', '个人空间'];
const legacyKeys = ['create', 'pomodoro', 'daily', 'memos', 'growth', 'eat'];
const legacyNames = ['创建任务', '开始番茄钟', '习惯', '创建便签', '领域', '今日食选'];
const legacyColors = ['blue', 'mint', 'yellow', 'lilac', 'rose', 'peach'];
const legacyLayout = (custom = false) => ({ version: 1, items: legacyKeys.map((key, index) => ({
  key, name: legacyNames[index], color: custom && index === 0 ? 'rose' : legacyColors[index], kind: 'card', rank: index + 1,
})) });
const fixtureKeys = legacyKeys.map(key => key === 'eat' ? 'meals' : key);
const fixtureNames = legacyNames.map((name, index) => fixtureKeys[index] === 'meals' ? '饮食记录' : name);
const fixtureLayout = (custom = false) => ({ ...legacyLayout(custom), items: legacyLayout(custom).items.map((item, index) => ({ ...item, key: fixtureKeys[index], name: fixtureNames[index] })) });
async function writeLayout(page, layout) {
  await page.evaluate(({ storageKey, layout }) => localStorage.setItem(storageKey, JSON.stringify(layout)), { storageKey, layout });
  await page.reload();
}
// The changed color makes this an intentional custom layout, so migration
// cannot erase the creation/diary fixtures used by sorting and editor tests.
const seedCustomLegacyLayout = page => writeLayout(page, fixtureLayout(true));
async function assertDefaultCards(page, expect) {
  await expect(page.locator('.today-entry-name')).toHaveText(defaultNames);
  expect(await page.locator('.today-entry').evaluateAll(nodes => nodes.map(node => node.id.replace('home-sort-', '')))).toEqual(defaultKeys);
}
async function checkDefaultEntrances({ page, expect, out, width }) {
  await assertDefaultCards(page, expect);
  const titles = ['首页入口 · 生活', '首页入口 · 工作', '首页入口 · 灵感'];
  await page.evaluate(titles => {
    const time = '2026-10-04T03:00:00.000Z';
    window.__miniFixture.guestToolStates = { ...window.__miniFixture.guestToolStates, memos: { version: 1, notes: titles.map((title, index) => ({
      id: `home-default-memo-${index}`, title, body: `便签正文 ${index}`, color: ['sand', 'blue', 'sage'][index], tags: [['生活'], ['工作'], ['灵感']][index],
      pinned: index === 1, priority: ['none', 'high', 'low'][index], createdAt: time, updatedAt: time,
    })) } };
  }, titles);
  await page.locator('#home-sort-memo-list').click();
  await expect(page).toHaveURL(/pages\/memos\/index$/);
  await expect(page.locator('.memo-page')).toBeVisible();
  await expect(page.locator('.entry-composer,.memo-editor')).toHaveCount(0);
  await expect(page.locator('.memo-list-label')).toHaveText('全部便签');
  await expect(page.locator('.memo-active-filters')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '便签分类：全部', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.memo-note-title')).toHaveCount(titles.length);
  expect((await page.locator('.memo-note-title').allTextContents()).sort()).toEqual([...titles].sort());
  await page.locator('.preview-native-header > button').click();
  await expect(page).toHaveURL(/pages\/index\/index$/);
  await page.locator('#home-sort-statistics').click();
  await expect(page).toHaveURL(/pages\/statistics\/index$/);
  await expect(page.locator('.statistics-tab')).toHaveText(['待办', '专注', '习惯', '饮食', '领域', '成长']);
  await page.getByRole('button', { name: '返回上一页', exact: true }).click();
  await expect(page).toHaveURL(/pages\/index\/index$/);
  await page.locator('#home-sort-journal').click();
  await expect(page).toHaveURL(/pages\/journal\/index$/);
  await expect(page.locator('.home-brand')).toContainText('TAU / JOURNAL');
  await page.locator('.preview-native-header > button').click();
  await expect(page).toHaveURL(/pages\/index\/index$/);
  await assertDefaultCards(page, expect);
  if (out) await page.screenshot({ path: path.join(out, `home-default-pages-${width}.png`) });
}
module.exports = { storageKey, defaultKeys, defaultNames, legacyKeys, legacyNames, legacyLayout, fixtureKeys, fixtureNames, fixtureLayout, writeLayout, seedCustomLegacyLayout, assertDefaultCards, checkDefaultEntrances };
