const path = require('node:path');

// Exercise the moved history against the real statistics cohort and original tool queue.
module.exports = async function checkStatisticsFocusHistory({ page: parentPage, origin, out, width, expect }) {
  const page = await parentPage.context().browser().newPage({ viewport: parentPage.viewportSize(), reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  await page.clock.install({ time: new Date('2026-09-15T12:00:00Z') });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const go = route => page.evaluate(value => { location.hash = `#/pages/${value}`; }, route);
  const history = () => page.locator('.focus-history-card');
  const records = () => history().locator('.focus-record');
  const dialog = () => page.getByRole('dialog', { name: '删除计时记录', exact: true });
  const persisted = () => page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:pomodoro')).data);
  async function openHistory() {
    await go('statistics/index?panel=focus');
    await expect(history()).toBeVisible();
    await expect(page.locator('.activity-analysis.is-focus,.focus-reminders')).toHaveCount(2);
  }
  try {
    await page.goto(`${origin}/?statistics-focus-history-${width}#/pages/posts/index`);
    const days = await page.evaluate(() => {
      localStorage.clear();
      const now = new Date(), at = minutes => new Date(now.getTime() - minutes * 60000).toISOString();
      const day = count => { const date = new Date(now); date.setDate(date.getDate() - count); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
      const session = (id, title, minutes, mode = 'focus', completed = true) => ({ id, title, mode, completed, taskId: null, habitId: null,
        startedAt: at(minutes + 1), endedAt: at(minutes), durationSeconds: 60, plannedSeconds: 60 });
      const sessions = Array.from({ length: 21 }, (_, index) => ({ ...session(`today-${index}`, `今日记录${index}`, index + 2),
        ...(index === 0 ? { taskId: 'linked-task', completed: false, durationSeconds: 15 } : {}) }));
      sessions.push(session('yesterday', '昨日专注记录', 1440), session('older', '十天前专注记录', 14400),
        session('rest-short', '今日短休息记录', 0.5, 'shortBreak'), session('rest-long', '今日长休息记录', 1, 'longBreak'));
      const pomodoro = { version: 1, settings: { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4, transitionMode: 'autoBreak' },
        mode: 'focus', selection: { taskId: null, habitId: null, title: '' }, active: null, sessions: sessions.reverse(), completedFocusCount: 99 };
      const task = { id: 'linked-task', title: '投入记录关联待办', description: '', categoryId: '', important: true, urgent: false,
        dueDate: '', completedAt: null, createdAt: at(10), updatedAt: at(10) };
      window.__miniFixture.persistEntryTools = true;
      window.__miniFixture.guestToolStates = { pomodoro, todos: { version: 1, categories: [], tasks: [task] } };
      for (const [key, data] of Object.entries(window.__miniFixture.guestToolStates)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${key}`, JSON.stringify({ data, pending: false, revision: 0 }));
      location.hash = '#/pages/statistics/index?panel=focus';
      return { today: day(0), yesterday: day(1), older: day(10) };
    });
    await expect(history()).toBeVisible();
    await expect(history().locator('.focus-history-day-scroll button')).toHaveCount(7);
    await expect(records()).toHaveCount(10);
    await expect(records().first().locator('.focus-record-title')).toHaveText('今日记录0');
    const original = await persisted(), kpis = await page.locator('.analysis-kpis').innerText();
    await history().getByRole('button', { name: '加载更多', exact: true }).click();
    await expect(records()).toHaveCount(20);
    await history().getByRole('button', { name: '加载更多', exact: true }).click();
    await expect(records()).toHaveCount(21);
    await expect(history().getByRole('button', { name: '加载更多', exact: true })).toHaveCount(0);
    await history().getByRole('button', { name: '休息', exact: true }).click();
    await expect(records()).toHaveCount(2);
    await expect(records().locator('.focus-record-title')).toHaveText(['今日短休息记录', '今日长休息记录']);
    await history().getByRole('button', { name: '全部', exact: true }).click();
    await expect(records()).toHaveCount(10);
    await history().getByRole('button', { name: '查看全部', exact: true }).click();
    await expect(history().locator('.focus-date-select')).toHaveText('全部日期');
    await expect(history().locator('.focus-record-filters').last()).toContainText('25 条');
    await history().getByRole('button', { name: '专注', exact: true }).click();
    await expect(history().locator('.focus-record-filters').last()).toContainText('23 条');
    await history().getByRole('button', { name: '返回选中日', exact: true }).click();
    await history().getByRole('button', { name: `查看${days.yesterday}计时记录`, exact: true }).click();
    await expect(records().locator('.focus-record-title')).toHaveText(['昨日专注记录']);
    await history().getByLabel('选择日期', { exact: true }).fill(days.older);
    await expect(records().locator('.focus-record-title')).toHaveText(['十天前专注记录']);
    await history().getByRole('button', { name: `查看${days.today}计时记录`, exact: true }).click();
    await expect(records()).toHaveCount(10);
    expect(await page.locator('.analysis-kpis').innerText(), 'History date and type filters do not change analysis scope').toBe(kpis);
    expect(await persisted(), 'Browsing migrated history remains read only').toEqual(original);
    expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path.startsWith('/personal-tools/') && request.method !== 'GET'))).toEqual([]);
    await records().first().getByRole('button', { name: '查看关联待办 ↗', exact: true }).click();
    await expect(page).toHaveURL(/pages\/todos\/index$/);
    await expect(page.getByRole('button', { name: '删除任务', exact: true })).toBeVisible();
    await expect(page.getByLabel('任务名称', { exact: true })).toHaveValue('投入记录关联待办');
    expect((await persisted()).sessions).toEqual(original.sessions);
    await openHistory();
    await history().getByRole('button', { name: '删除今日记录0记录', exact: true }).click();
    await expect(dialog()).toBeVisible();
    await require('./prompt-test-helpers.cjs')(dialog(), expect);
    await dialog().getByRole('button', { name: '关闭删除确认', exact: true }).click();
    expect(await persisted()).toEqual(original);
    await history().getByRole('button', { name: '删除今日记录0记录', exact: true }).click();
    await page.locator('.app-dialog-layer > .sheet-backdrop').click({ position: { x: 4, y: 4 } });
    await expect(dialog()).toHaveCount(0);
    expect(await persisted()).toEqual(original);
    await history().getByRole('button', { name: '删除今日记录0记录', exact: true }).click();
    await page.evaluate(() => { window.__miniFixture.failToolWrites = ['pomodoro']; });
    await dialog().getByRole('button', { name: '删除', exact: true }).click();
    await expect(dialog()).toContainText('本机尚未保存');
    await expect(dialog().getByRole('button', { name: '取消', exact: true })).toHaveCount(0);
    await expect(dialog().getByRole('button', { name: '关闭删除确认', exact: true })).toBeDisabled();
    await page.locator('.app-dialog-layer > .sheet-backdrop').click({ position: { x: 4, y: 4 } });
    await expect(dialog()).toBeVisible();
    await page.screenshot({ path: path.join(out, `statistics-focus-delete-retry-${width}.png`) });
    expect(await persisted(), 'Failed writes do not report a persisted deletion').toEqual(original);
    await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
    await dialog().getByRole('button', { name: '删除', exact: true }).click();
    await expect(dialog()).toHaveCount(0);
    const saved = await persisted();
    expect(saved.sessions).toEqual(original.sessions.filter(item => item.id !== 'today-0').sort((a, b) => b.endedAt.localeCompare(a.endedAt)));
    expect(saved.completedFocusCount).toBe(99);
    await go('pomodoro/index');
    await expect(page.locator('#page-more,.focus-history-card,.focus-reminders')).toHaveCount(0);
    await expect(page.locator('.page-toolbar-summary-count')).toHaveText('今日完成 20');
    await expect(page.locator('.page-toolbar-summary-recent')).toHaveText('今日记录1');
    await page.locator('.page-scroll').dispatchEvent('touchstart', { touches: [{ identifier: 1, clientX: 120, clientY: 300 }] });
    await page.locator('.page-scroll').evaluate(node => { node.scrollTop = 200; });
    await page.locator('.page-scroll').dispatchEvent('touchend', { touches: [], changedTouches: [{ identifier: 1, clientX: 120, clientY: 190 }] });
    expect(await page.locator('.page-scroll').evaluate(node => node.scrollTop), 'The removed second screen cannot be reached').toBeLessThan(2);
    await openHistory();
    await history().evaluate(node => node.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(out, `statistics-focus-history-${width}.png`), fullPage: true });
    // Account changes unmount pending confirmation and hide every previous-account panel.
    const makeAccount = title => ({ ...saved, sessions: [{ ...saved.sessions.find(item => item.id === 'today-1'), id: title, title }] });
    await page.evaluate(({ a, b }) => {
      window.__miniFixture.accountToolStates = { 'focus-history-a': { pomodoro: a }, 'focus-history-b': { pomodoro: b },
        'focus-history-invalid': { pomodoro: { ...a, sessions: [{ ...a.sessions[0], endedAt: 'invalid-date' }] } } };
      window.__miniFixture.sessionProfile = { authenticated: true, userName: 'focus-history-a', isAdmin: false };
      window.__miniPreviewControl.emit('ottlog-session');
    }, { a: makeAccount('账号甲的投入记录'), b: makeAccount('账号乙的投入记录') });
    await expect(records().locator('.focus-record-title')).toHaveText(['账号甲的投入记录']);
    await history().getByRole('button', { name: '删除账号甲的投入记录记录', exact: true }).click();
    await page.evaluate(() => {
      window.__miniFixture.deferToolReads = ['pomodoro']; window.__miniFixture.pendingToolReads = [];
      window.__miniFixture.sessionProfile = { authenticated: true, userName: 'focus-history-b', isAdmin: false };
      window.__miniPreviewControl.emit('ottlog-session');
    });
    await expect.poll(() => page.evaluate(() => window.__miniFixture.pendingToolReads.length)).toBeGreaterThan(0);
    await expect(page.locator('.focus-history-card,.focus-reminders')).toHaveCount(0);
    await expect(dialog()).toHaveCount(0);
    await page.evaluate(() => { window.__miniFixture.deferToolReads = []; for (const read of window.__miniFixture.pendingToolReads.splice(0)) read.resolve(); });
    await expect(records().locator('.focus-record-title')).toHaveText(['账号乙的投入记录']);
    expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path.startsWith('/personal-tools/') && request.method === 'PUT')), 'Account switching never submits a previous deletion target').toEqual([]);
    await page.evaluate(() => { window.__miniFixture.sessionProfile = { authenticated: true, userName: 'focus-history-invalid', isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session'); });
    await expect(page.locator('.statistics-state')).toContainText('原始数据已保留');
    await expect(page.locator('.focus-history-card,.focus-reminders')).toHaveCount(0);
    await page.getByRole('button', { name: '习惯统计', exact: true }).click();
    await expect(page.locator('.statistics-content')).toBeVisible();
    expect(errors).toEqual([]);
  } catch (error) {
    await page.screenshot({ path: path.join(out, `statistics-focus-history-failed-${width}.png`), fullPage: true });
    console.log('Focus history failure geometry', await page.evaluate(() => [...document.querySelectorAll('.focus-history-heading,.focus-history-heading input,.focus-record-filters button,.focus-delete-window')].map(node => ({
      class: node.className, text: node.textContent, box: node.getBoundingClientRect().toJSON(), position: getComputedStyle(node).position, boxSizing: getComputedStyle(node).boxSizing,
    }))));
    throw error;
  } finally { await page.close(); }
};
