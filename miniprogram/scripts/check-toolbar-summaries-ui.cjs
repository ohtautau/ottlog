const path = require('node:path');
const { longTask, longGoal, todoSeed, domainSeed, reminderSeed, times } = require('./toolbar-summary-fixtures.cjs');
const habitFilterControls = require('./habit-filter-test-helpers.cjs');

module.exports = async function checkToolbarSummaries({ page, origin, out, width, expect }) {
  const now = new Date(2026, 9, 7, 12), nextDay = new Date(2026, 9, 8, 0, 1);
  await page.clock.install({ time: now });
  const toolbar = type => page.locator(type === 'todos' ? '.todo-page-toolbar' : type === 'domains' ? '.domains-page-toolbar' : '.daily-page-toolbar');
  const summary = type => toolbar(type).locator('.page-toolbar-summary');
  async function expectSummary(type, count, title) {
    await expect(summary(type).locator('.page-toolbar-summary-count')).toHaveText(`${type === 'domains' ? '今日记录' : '今日完成'} ${count}`);
    const recent = summary(type).locator('.page-toolbar-summary-recent');
    if (title) {
      await expect(recent).toHaveText(title);
      await expect(recent).toHaveAttribute('aria-label', `${type === 'domains' ? '最近完成短期目标' : '最近完成'}：${title}`);
    } else await expect(recent).toHaveCount(0);
  }
  async function fresh(name, tools, route) {
    await page.clock.setSystemTime(now);
    await page.goto(`${origin}/?toolbar-summaries-${name}-${width}#/pages/posts/index`);
    await page.evaluate(({ tools, route }) => {
      localStorage.clear(); window.__miniFixture.persistEntryTools = true;
      window.__miniFixture.guestToolStates = tools;
      for (const [tool, data] of Object.entries(tools)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data, pending: false, revision: 0 }));
      location.hash = `#/pages/${route}/index`;
    }, { tools, route });
  }
  async function geometry(type, { truncated = false } = {}) {
    const result = await toolbar(type).evaluate(node => {
      const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
      const summary = node.querySelector('.page-toolbar-summary'), recent = summary.querySelector('.page-toolbar-summary-recent'), actions = node.querySelector('.page-toolbar-actions');
      return { toolbar: box(node), summary: box(summary), actions: box(actions), buttons: [...actions.querySelectorAll('.page-toolbar-slot > button,.page-toolbar-slot .form-choice-trigger')].map(box),
        text: recent && { ...box(recent), nowrap: getComputedStyle(recent).whiteSpace, ellipsis: getComputedStyle(recent).textOverflow, overflow: recent.scrollWidth - recent.clientWidth },
        overflow: document.documentElement.scrollWidth - innerWidth };
    });
    expect(result.summary.left).toBeCloseTo(result.toolbar.left, 1);
    expect(result.summary.right, `${width} ${type}: summary and controls never overlap`).toBeLessThanOrEqual(result.actions.left - 5);
    expect(result.summary.top).toBeGreaterThanOrEqual(result.toolbar.top - 1);
    expect(result.summary.bottom).toBeLessThanOrEqual(result.toolbar.bottom + 1);
    expect(result.toolbar.height, `${width} ${type}: summary does not create another row`).toBeLessThanOrEqual(44);
    expect(result.overflow).toBeLessThanOrEqual(1);
    expect(result.buttons).toHaveLength(type === 'daily' ? 4 : 3);
    for (const button of result.buttons) {
      expect(button.width).toBeGreaterThanOrEqual(40); expect(button.height).toBeGreaterThanOrEqual(40);
      expect(button.top).toBeCloseTo(result.buttons[0].top, 1);
    }
    if (result.text) {
      expect(result.text.nowrap).toBe('nowrap'); expect(result.text.ellipsis).toBe('ellipsis');
      if (truncated) expect(result.text.overflow, `${width} ${type}: long title is clipped inside its text slot`).toBeGreaterThan(0);
    }
    return result.buttons;
  }
  async function stable(type, before) {
    const after = await geometry(type);
    for (let index = 0; index < before.length; index++) for (const key of ['left', 'top', 'width', 'height']) expect(after[index][key], `${width} ${type}: ${key} stays stable`).toBeCloseTo(before[index][key], 1);
  }
  const todos = todoSeed(now), domains = domainSeed(now), reminders = reminderSeed(now);
  await fresh('todo', { todos }, 'todos');
  await expectSummary('todos', 2, longTask);
  const todoButtons = await geometry('todos', { truncated: true });
  await page.screenshot({ path: path.join(out, `toolbar-todos-${width}.png`) });
  await page.locator('.todo-filter-toggle').click();
  await page.getByRole('textbox', { name: '筛选关键词', exact: true }).fill('不匹配任何任务');
  await page.getByRole('button', { name: '筛选状态：待完成', exact: true }).click();
  await page.locator('.todo-filter-actions').getByRole('button', { name: /^查看/ }).click();
  await expect(page.locator('.todo-task')).toHaveCount(0);
  await expectSummary('todos', 2, longTask); await stable('todos', todoButtons);
  await page.locator('.todo-filter-toggle').click();
  await page.getByRole('button', { name: '重置任务筛选', exact: true }).click();
  await page.locator('.todo-filter-actions').getByRole('button', { name: /^查看/ }).click();
  await page.getByRole('button', { name: `重新打开：${longTask}`, exact: true }).click();
  await expectSummary('todos', 1, '今天完成的第一件任务');
  await page.getByRole('button', { name: '编辑任务：今天完成的第一件任务', exact: true }).click();
  await page.getByRole('button', { name: '删除任务', exact: true }).click();
  await expect(page.locator('.todo-sheet')).toHaveCount(0);
  await expectSummary('todos', 0, '昨日已完成任务'); await stable('todos', todoButtons);
  await page.getByRole('button', { name: '重新打开：昨日已完成任务', exact: true }).click();
  await expectSummary('todos', 0);
  // A real completion 30s after first render must not wait for a minute refresh.
  await page.clock.runFor(30000);
  await page.getByRole('button', { name: '完成：稍后真实完成的任务', exact: true }).click();
  await expectSummary('todos', 1, '稍后真实完成的任务'); await stable('todos', todoButtons);
  await page.clock.setSystemTime(nextDay); await page.clock.runFor(60001);
  await expectSummary('todos', 0, '稍后真实完成的任务');

  await fresh('domain', { domains, reminders }, 'domains');
  await expectSummary('domains', 3, longGoal);
  const domainButtons = await geometry('domains', { truncated: true });
  await page.screenshot({ path: path.join(out, `toolbar-domains-${width}.png`) });
  await page.getByRole('button', { name: '排序领域', exact: true }).click();
  await expectSummary('domains', 3, longGoal); await stable('domains', domainButtons);
  await page.getByRole('button', { name: '排序领域', exact: true }).click();
  await expect(page.getByRole('button', { name: '管理领域', exact: true })).toHaveCount(0);
  await expectSummary('domains', 3, longGoal); await stable('domains', domainButtons);
  await page.screenshot({ path: path.join(out, `toolbar-domains-browsing-${width}.png`) });
  await page.clock.runFor(30000);
  await page.getByRole('button', { name: '记录进展', exact: true }).click();
  const composer = page.locator('.entry-composer');
  await composer.getByRole('button', { name: '选择记录领域', exact: true }).click();
  await composer.getByRole('button', { name: '记录到工作', exact: true }).click();
  await composer.getByRole('textbox', { name: '记录内容', exact: true }).fill('三十秒后新建记录');
  await composer.getByRole('button', { name: '保存记录', exact: true }).click();
  await expect(composer).toHaveCount(0);
  await expectSummary('domains', 4, longGoal); await stable('domains', domainButtons);
  await page.getByRole('button', { name: '打开工作领域', exact: true }).click();
  await page.getByRole('button', { name: '编辑正记录：昨日正记录', exact: true }).click();
  const recordEditor = page.locator('.domain-sheet-record-edit');
  await recordEditor.getByRole('textbox', { name: '记录内容', exact: true }).fill('今日修改但昨日创建');
  await recordEditor.getByRole('button', { name: '保存', exact: true }).click();
  await expect(recordEditor).toHaveCount(0);
  await page.locator('.preview-native-header > button').click();
  await expectSummary('domains', 4, longGoal);
  await page.getByRole('button', { name: '打开工作领域', exact: true }).click();
  await page.getByRole('button', { name: '编辑正记录：今日正记录', exact: true }).click();
  await recordEditor.getByRole('button', { name: '删除正记录：今日正记录', exact: true }).click();
  await expect(recordEditor).toHaveCount(0);
  await page.getByRole('button', { name: '撤销完成工作短期目标', exact: true }).click();
  await page.locator('.preview-native-header > button').click();
  await expectSummary('domains', 3, '生活的历史短期目标');
  await page.getByRole('button', { name: '打开生活领域', exact: true }).click();
  await page.getByRole('button', { name: '删除生活领域', exact: true }).click();
  await page.getByRole('dialog', { name: '删除领域', exact: true }).getByRole('button', { name: '删除', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '删除领域', exact: true })).toHaveCount(0);
  await expectSummary('domains', 2, '额外领域的历史短期目标');
  await page.clock.setSystemTime(nextDay); await page.clock.runFor(60001);
  await expectSummary('domains', 0, '额外领域的历史短期目标');
  await stable('domains', domainButtons);

  await fresh('daily', { reminders, domains }, 'daily');
  await expectSummary('daily', 1, '已完成的摘要习惯');
  const dailyButtons = await geometry('daily');
  await page.screenshot({ path: path.join(out, `toolbar-daily-${width}.png`) });
  const habitFilter = habitFilterControls({ page, expect });
  await habitFilter.select('全部'); await expectSummary('daily', 1, '已完成的摘要习惯');
  await page.locator('.daily-habit-scroll').getByRole('button', { name: '待完成的摘要习惯 今天打卡', exact: true }).click();
  await expectSummary('daily', 2, '待完成的摘要习惯');
  await page.locator('.daily-reflection-overlay .sheet-backdrop').click({ position: { x: 2, y: 2 } });
  await stable('daily', dailyButtons);
  await page.clock.setSystemTime(nextDay); await page.clock.runFor(60001);
  await expectSummary('daily', 0); await stable('daily', dailyButtons);
  await expect(page.locator('.daily-core-summary,.daily-completion-count,.daily-completion-title')).toHaveCount(0);

  // Pause an actual account GET to observe the reading guard without timing races.
  for (const type of ['todos', 'domains']) {
    await fresh(`account-${type}`, { todos, domains, reminders }, type);
    const a = type === 'todos' ? { ...todos, tasks: [{ ...todos.tasks[1], id: 'a-private', title: '账号甲专属任务' }] } : { ...domains, domains: [domains.domains[0]], completedGoals: [{ ...domains.completedGoals[2], id: 'a-private', content: '账号甲专属短期目标' }] };
    const b = type === 'todos' ? { ...todos, tasks: [{ ...todos.tasks[0], id: 'b-private', title: '账号乙昨日任务' }] } : { ...domains, domains: [{ ...domains.domains[0], positiveRecords: [], negativeRecords: [] }], completedGoals: [{ ...domains.completedGoals[2], id: 'b-private', content: '账号乙历史短期目标' }] };
    await page.evaluate(({ type, a, b }) => {
      window.__miniFixture.accountToolStates = { 'summary-a': { [type]: a }, 'summary-b': { [type]: b }, 'summary-invalid': { [type]: { version: 99, tasks: [], categories: [], domains: [], completedGoals: [] } } };
      window.__miniFixture.sessionProfile = { authenticated: true, userName: 'summary-a', isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session');
    }, { type, a, b });
    await expectSummary(type, type === 'todos' ? 1 : 2, type === 'todos' ? '账号甲专属任务' : '账号甲专属短期目标');
    await page.evaluate(type => {
      window.__miniFixture.deferToolReads = [type]; window.__miniFixture.pendingToolReads = [];
      window.__miniFixture.sessionProfile = { authenticated: true, userName: 'summary-b', isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session');
    }, type);
    await expect.poll(() => page.evaluate(() => window.__miniFixture.pendingToolReads.length)).toBeGreaterThan(0);
    await expect(summary(type), `${type}: the previous account summary is hidden while reading`).toHaveCount(0);
    await page.evaluate(() => { window.__miniFixture.deferToolReads = []; for (const read of window.__miniFixture.pendingToolReads.splice(0)) read.resolve(); });
    await expectSummary(type, 0, type === 'todos' ? '账号乙昨日任务' : '账号乙历史短期目标');
    await page.evaluate(() => { window.__miniFixture.sessionProfile = { authenticated: true, userName: 'summary-invalid', isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session'); });
    await expect(summary(type), `${type}: invalid account data never displays default-data feedback`).toHaveCount(0);
    await expect(toolbar(type).getByRole('button').first()).toBeDisabled();
    await page.evaluate(() => { window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session'); });
    await expectSummary(type, type === 'todos' ? 2 : 3, type === 'todos' ? longTask : longGoal);
    expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path.startsWith('/personal-tools/') && request.method === 'PUT')), 'Reading summaries never writes account records').toEqual([]);
  }
};
