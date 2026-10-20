const path = require('node:path');

module.exports = async ({ page, origin, out, width, expect }) => {
  const go = route => page.evaluate(value => { location.hash = `#/pages/${value}`; }, route);
  const tab = label => page.getByRole('button', { name: `${label}统计`, exact: true });
  async function layout(label) {
    await require('./section-title-checks.cjs')(page, expect);
    const sizes = await page.locator('.statistics-page').evaluate(node => ({
      document: document.documentElement.scrollWidth - innerWidth,
      page: node.scrollWidth - node.clientWidth,
      cards: [...node.querySelectorAll('.activity-analysis,.statistics-card,.statistics-domain-choice,.statistics-growth-domain,.statistics-diet-totals')].map(card => card.scrollWidth - card.clientWidth),
    }));
    expect(Math.max(sizes.document, sizes.page, 0, ...sizes.cards), `${width}: ${label} fits the page`).toBeLessThanOrEqual(2);
    await page.locator('.page-scroll').evaluate(node => { node.scrollTop = 0; });
    await page.screenshot({ path: path.join(out, `statistics-${label}-${width}.png`) });
  }
  await page.goto(`${origin}/?statistics-${width}#/pages/posts/index`);
  const today = await page.evaluate(() => {
    localStorage.clear();
    const now = new Date(), stamp = new Date(now.getTime() - 1000).toISOString();
    const date = days => { const day = new Date(now); day.setDate(day.getDate() + days); return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`; };
    const task = { description: '', categoryId: '', important: true, urgent: false, createdAt: stamp, updatedAt: stamp };
    const session = { plannedSeconds: 1500, startedAt: stamp, endedAt: stamp, taskId: null };
    const domain = { id: 'work', name: '工作', iconId: 'work', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] };
    window.__miniFixture.guestToolStates = {
      todos: { version: 1, categories: [], tasks: [
        { ...task, id: 'done', title: '统计迁移完成任务', dueDate: '', completedAt: stamp },
        { ...task, id: 'open', title: '统计迁移逾期任务', dueDate: date(-1), completedAt: null },
      ] },
      pomodoro: { version: 1, settings: { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4 }, mode: 'focus', active: null, selection: { taskId: null, title: '' }, sessions: [
        { ...session, id: 'full', mode: 'focus', durationSeconds: 1500, completed: true, title: '统计迁移专注' },
        { ...session, id: 'partial', mode: 'focus', durationSeconds: 300, completed: false, title: '统计迁移提前结束' },
        { ...session, id: 'rest', mode: 'shortBreak', durationSeconds: 300, completed: true, title: '' },
      ] },
      reminders: { version: 1, items: [
        { id: 'habit-a', title: '统计迁移习惯', group: '工作', domainId: 'work', kind: 'walk', note: '', minutes: 0, enabled: true },
        { id: 'habit-b', title: '统计迁移暂停习惯', group: '工作', domainId: 'work', kind: 'walk', note: '', minutes: 0, enabled: false },
      ], done: { [date(0)]: ['habit-a'], [date(-1)]: ['habit-a'], [date(-2)]: ['habit-a'] } },
      meals: { version: 1, meals: [], nutrition: [
        { id: 'food-a', date: date(0), name: '午餐', carbs: 20.2, protein: 10, fat: 2 },
        { id: 'food-b', date: date(0), name: '晚餐', carbs: 10.1, protein: 15, fat: 3 },
        { id: 'food-old', date: date(-1), name: '历史餐', carbs: 7, protein: 8, fat: 9 },
      ] },
      domains: { version: 1, domains: [domain], completedGoals: [
        { id: 'goal-a', content: '领域短期完成目标', status: 'completed', createdAt: stamp, completedAt: stamp, domainId: 'work', kind: 'shortTerm' },
        { id: 'goal-b', content: '领域长期完成目标', status: 'completed', createdAt: stamp, completedAt: stamp, domainId: 'work', kind: 'longTerm' },
      ] },
      growth: { version: 1, domains: [
        { id: 'growth-work', name: '独立成长领域', iconId: 'work', archived: false },
        { id: 'growth-old', name: '已归档成长', iconId: 'plant', archived: true },
      ], events: [
        { id: 'progress-a', domainId: 'growth-work', size: 'small', createdAt: stamp },
        { id: 'progress-b', domainId: 'growth-work', size: 'large', createdAt: stamp },
        { id: 'progress-old', domainId: 'growth-old', size: 'medium', createdAt: stamp },
        { id: 'progress-future', domainId: 'growth-work', size: 'large', createdAt: new Date(now.getTime() + 86400000).toISOString() },
      ], completedGoals: [{ id: 'growth-goal', title: '独立成长完成目标', createdAt: stamp, completedAt: stamp, domainId: 'growth-work' }] },
    };
    location.hash = '#/pages/statistics/index?panel=todos';
    return date(0);
  });
  await expect(page.locator('.statistics-tab')).toHaveText(['待办', '专注', '习惯', '饮食', '领域', '成长']);
  await expect(tab('待办')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.analysis-kpis > div')).toHaveText(['1期间完成', '1当前待办', '1当前逾期']);
  await page.getByRole('button', { name: `${today} 1 件`, exact: true }).click();
  await expect(page.locator('.analysis-details')).toContainText('统计迁移完成任务');
  await page.getByRole('button', { name: '近30天', exact: true }).click();
  await expect(page.locator('.analysis-column')).toHaveCount(30);
  await layout('todos');
  await tab('专注').click();
  await expect(page.locator('.analysis-kpis > div')).toHaveText(['30专注分钟', '1完整番茄', '15平均每轮分钟']);
  await page.getByRole('button', { name: `${today} 30 分钟`, exact: true }).click();
  await expect(page.locator('.analysis-details')).toContainText('5 分钟 · 提前结束');
  await expect(page.locator('.analysis-details')).not.toContainText('shortBreak');
  await layout('focus');
  await tab('习惯').click();
  await expect(page.locator('.statistics-today-completed')).toHaveText('1');
  await expect(page.locator('.statistics-today-total')).toHaveText('1');
  await expect(page.locator('.habit-calendar-stats > div').nth(1)).toHaveText('3天总打卡');
  await expect(page.locator('.habit-calendar-stats > div').nth(3)).toHaveText('3天当前连续');
  await page.getByRole('button', { name: '查看统计迁移暂停习惯统计', exact: true }).click();
  await expect(page.locator('.habit-calendar-stats > div').nth(1)).toHaveText('0天总打卡');
  await page.getByRole('button', { name: '查看统计迁移习惯统计', exact: true }).click();
  await layout('habits');
  await tab('饮食').click();
  await expect(page.locator('.statistics-diet-totals .statistics-fg-metric')).toHaveText(['碳水30.3 g', '蛋白质25 g', '脂肪5 g']);
  await page.getByRole('button', { name: '前一天', exact: true }).click();
  await expect(page.locator('.statistics-diet-totals .statistics-fg-metric')).toHaveText(['碳水7 g', '蛋白质8 g', '脂肪9 g']);
  await page.getByRole('button', { name: '今天', exact: true }).click();
  await layout('meals');
  await tab('领域').click();
  await expect(page.locator('.statistics-domain-goals')).toHaveText('2');
  await expect(page.locator('.statistics-completed-goal')).toHaveCount(2);
  await expect(page.locator('.statistics-domain-history')).toContainText('领域短期完成目标');
  await layout('domains');
  await tab('成长').click();
  await expect(page.locator('.statistics-growth-overview .statistics-fg-metric')).toHaveText(['9累计成长值', '+9本周成长值', '1已完成目标']);
  await expect(page.locator('.statistics-growth-domain')).toHaveCount(2);
  await expect(page.locator('.statistics-growth')).toContainText('已归档成长');
  await expect(page.locator('.statistics-growth-domain').filter({ hasText: '独立成长领域' }).locator('.statistics-growth-total')).toHaveText('累计 6 · 2 次记录 · 已完成目标 1');
  await layout('growth');
  expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path.startsWith('/personal-tools/') && request.method !== 'GET')), 'Viewing statistics does not write tool records').toEqual([]);

  // Detailed analysis moves out; habit cards retain their progress indicators (C21).
  for (const route of ['todos/index', 'pomodoro/index', 'daily/index', 'meals/index', 'domains/index', 'domain-detail/index?id=work', 'index/index']) {
    await go(route);
    await expect(page.locator('.page-scroll')).toBeVisible();
    await expect(page.locator('.activity-analysis,.habit-calendar,.habit-progress:not(.daily-suggestion-days):not(.daily-list-progress),.daily-progress-number,.daily-progress-track,.meal-nutrition-totals,.domain-goal-count,.growth-overview,.growth-legend,.growth-domain-values,.growth-progress')).toHaveCount(0);
    if (route === 'daily/index' || route.startsWith('domain-detail/')) {
      if (route === 'daily/index') await require('./habit-filter-test-helpers.cjs')({ page, expect }).select('全部');
      const habitCard = page.locator('.daily-suggestion').filter({ hasText: '统计迁移习惯' }).first();
      await expect(habitCard.locator('.habit-progress-total')).toHaveText('3 天');
      await expect(habitCard.locator('.habit-progress-streak')).toHaveText('3 天');
    }
  }
  const all = page.locator('.today-all-tool[data-feature-key="statistics"]').and(page.getByRole('button', { name: '打开统计', exact: true }));
  await all.scrollIntoViewIfNeeded();
  await all.click();
  await expect(page).toHaveURL(/pages\/statistics\/index$/);
  await page.getByRole('button', { name: '返回上一页', exact: true }).click();
  await expect(page).toHaveURL(/pages\/index\/index$/);
  await go('favorites/index');
  await page.getByRole('button', { name: '打开统计', exact: true }).click();
  await expect(tab('待办')).toHaveAttribute('aria-pressed', 'true');

  await require('./check-statistics-focus-history.cjs')({ page, origin, out, width, expect });
  if (width !== 360) return;
  await go('favorites/index');
  await page.getByPlaceholder('输入博客账号').fill('preview-reader');
  await page.getByPlaceholder('输入密码').fill('preview-password');
  await page.getByRole('button', { name: '登录并同步', exact: true }).click();
  await expect(page.getByRole('button', { name: '退出', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '打开统计', exact: true }).click();
  await tab('习惯').click();
  await expect(page.getByRole('button', { name: '查看统计迁移习惯统计', exact: true })).toHaveCount(0);
  await expect(page.locator('.statistics-today-completed')).toHaveText('0');
  await go('favorites/index');
  await page.getByRole('button', { name: '退出', exact: true }).click();
  await expect(page.getByRole('button', { name: '登录并同步', exact: true })).toBeVisible();
  await go('statistics/index?panel=habits');
  await expect(page.getByRole('button', { name: '查看统计迁移习惯统计', exact: true })).toBeVisible();
  await expect(page.locator('.statistics-today-completed')).toHaveText('1');

  // Invalid input is retained; a different valid category is still available.
  await page.goto(`${origin}/?statistics-invalid#/pages/posts/index`);
  await page.evaluate(() => { localStorage.clear(); window.__miniFixture.guestToolStates = { todos: { version: 1, categories: [], tasks: [] }, meals: { version: 99, nutrition: [{ id: 'preserved' }] } }; location.hash = '#/pages/statistics/index?panel=meals'; });
  await expect(page.locator('.statistics-state')).toContainText('原始数据已保留');
  await expect(page.locator('.statistics-diet-totals')).toHaveCount(0);
  await tab('待办').click();
  await expect(page.locator('.analysis-kpis > div')).toHaveText(['0期间完成', '0当前待办', '0当前逾期']);
  expect(await page.evaluate(() => window.__miniFixture.guestToolStates.meals)).toEqual({ version: 99, nutrition: [{ id: 'preserved' }] });
};
