const path = require('node:path');

module.exports = async function checkStatisticsInsights({ page: parentPage, origin, out, width, expect }) {
  // A fixed local clock makes every numerical expectation independent of UTC midnight.
  const page = await parentPage.context().browser().newPage({
    viewport: parentPage.viewportSize(), timezoneId: 'Asia/Shanghai', reducedMotion: 'reduce',
  });
  page.setDefaultTimeout(10000);
  await page.clock.install({ time: new Date('2026-10-12T06:30:00.000Z') });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const labels = ['待办', '专注', '习惯', '饮食', '领域', '成长'];
  const scope = () => page.locator('.statistics-insights');
  const tab = label => page.getByRole('button', { name: `${label}统计`, exact: true });
  const chart = title => scope().locator('.statistics-insight-chart').filter({ hasText: title });
  const button = (title, name) => chart(title).getByRole('button', { name, exact: true });
  const storage = () => page.evaluate(() => Object.fromEntries(
    ['todos', 'pomodoro', 'reminders', 'meals', 'domains', 'growth'].map(key => [key, localStorage.getItem(`ottlog-mini-tool-v1:guest:${key}`)]),
  ));
  async function metrics(expected) {
    await expect.poll(() => scope().locator('.statistics-insight-metric').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [
      node.querySelector('.statistics-insight-metric-label').textContent,
      node.querySelector('.statistics-insight-metric-value').textContent,
    ])))).toEqual(expected);
  }
  async function selectTab(label, period = 7) {
    await tab(label).click();
    await expect(scope()).toBeVisible();
    await expect(scope().getByRole('button', { name: `近${period}天`, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(scope().getByRole('button', { name: `近${period === 7 ? 30 : 7}天`, exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(scope().locator('.statistics-insight-metric')).toHaveCount(6);
    await expect(scope().locator('.statistics-insight-findings')).toContainText('自动发现');
    expect(await scope().innerText()).not.toMatch(/NaN|Infinity|undefined/);
  }
  async function checkGeometry(label) {
    const measured = await scope().evaluate(node => ({
      documentOverflow: document.documentElement.scrollWidth - innerWidth,
      cardOverflow: node.scrollWidth - node.clientWidth,
      chartOverflow: [...node.querySelectorAll('.statistics-insight-chart')].map(chart => chart.scrollWidth - chart.clientWidth),
      buttons: [...node.querySelectorAll('button')].map(button => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })),
      legends: [...node.querySelectorAll('.statistics-insight-chart')].map(chart => ({
        count: chart.querySelectorAll('.statistics-insight-swatch').length,
        knownPoints: [...chart.querySelectorAll('.statistics-insight-column,.statistics-insight-bar-choice')].filter(point => !point.querySelector('.statistics-insight-missing')).length,
        scale: chart.querySelector('.statistics-insight-scale')?.textContent,
        colors: [...chart.querySelectorAll('.statistics-insight-swatch')].map(swatch => getComputedStyle(swatch).backgroundColor),
      })),
    }));
    expect(Math.max(measured.documentOverflow, measured.cardOverflow, 0, ...measured.chartOverflow), `${width}: ${label} page fits around internal chart scroll`).toBeLessThanOrEqual(2);
    for (const size of measured.buttons) {
      expect(size.width, `${width}: ${label} chart/period touch width`).toBeGreaterThanOrEqual(39.9);
      expect(size.height, `${width}: ${label} chart/period touch height`).toBeGreaterThanOrEqual(39.9);
    }
    for (const legend of measured.legends) {
      expect(legend.count).toBeGreaterThan(0);
      if (legend.knownPoints) expect(legend.scale).toMatch(/^最高 \d/);
      else expect(legend.scale).toBe('暂无已记录数值');
      for (const color of legend.colors) expect(color).not.toBe('rgba(0, 0, 0, 0)');
    }
    await page.locator('.page-scroll').evaluate(node => { node.scrollTop = 0; });
    await page.screenshot({ path: path.join(out, `statistics-insights-${label}-${width}.png`) });
  }
  async function checkDailyScroll(title) {
    const scroll = chart(title).locator('.statistics-insight-day-scroll');
    await expect(chart(title).locator('.statistics-insight-column')).toHaveCount(30);
    const before = await scroll.evaluate(node => ({ width: node.clientWidth, content: node.scrollWidth }));
    expect(before.content, `${width}: ${title} 30 days scroll inside the chart`).toBeGreaterThan(before.width);
    await scroll.evaluate(node => { node.scrollLeft = 0; });
    const first = chart(title).locator('.statistics-insight-column').first();
    await first.click();
    await expect(first).toHaveAttribute('aria-pressed', 'true');
    await expect(chart(title).locator('.statistics-insight-point-title')).toHaveText('2026-09-13');
    const last = chart(title).locator('.statistics-insight-column').last();
    await last.click();
    await expect(last).toHaveAttribute('aria-pressed', 'true');
    await expect(chart(title).locator('.statistics-insight-point-title')).toHaveText('2026-10-12');
    await expect.poll(() => scroll.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
  }
  async function fresh(empty = false) {
    await page.goto(`${origin}/?statistics-insights-${empty ? 'empty' : 'rich'}-${width}#/pages/posts/index`);
    await page.evaluate(empty => {
      localStorage.clear();
      window.__miniFixture.persistEntryTools = true;
      const stamp = (day, hour = 12) => new Date(2026, 9, day, hour).toISOString();
      const todo = (id, patch = {}) => ({ id, title: `任务${id}`, description: '', categoryId: '', important: false, urgent: false,
        dueDate: '', completedAt: null, createdAt: stamp(10), updatedAt: stamp(10), ...patch });
      const session = (id, day, hour, minutes, completed = true, mode = 'focus') => ({ id, mode,
        durationSeconds: minutes * 60, plannedSeconds: Math.max(1500, minutes * 60), startedAt: stamp(day, hour - 1), endedAt: stamp(day, hour),
        completed, taskId: null, habitId: null, title: '保留专注事项' });
      const habit = (id, title, enabled = true) => ({ id, title, group: '工作', domainId: 'work', kind: 'walk', note: '', minutes: 0, priority: 'none', enabled });
      const record = (id, day) => ({ id, content: `原记录${id}`, createdAt: stamp(day) });
      const domain = (id, name, positiveRecords = [], negativeRecords = []) => ({ id, name, iconId: 'work',
        longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords, negativeRecords });
      const goal = (id, domainId, kind, day) => ({ id, content: '保留完成目标', status: 'completed', createdAt: stamp(1), completedAt: stamp(day), domainId, kind });
      const states = {
        todos: { version: 1, categories: [], tasks: empty ? [] : [
          todo('done-a', { completedAt: stamp(12), dueDate: '2026-10-12', dueTime: '13:00' }),
          todo('done-b', { completedAt: stamp(11), dueDate: '2026-10-11', dueTime: '11:00' }),
          todo('previous', { completedAt: stamp(5), createdAt: stamp(3) }),
          todo('overdue', { dueDate: '2026-10-11', important: true }),
          todo('today', { dueDate: '2026-10-12', dueTime: '18:00' }),
          todo('next-week', { dueDate: '2026-10-13' }), todo('later', { dueDate: '2026-10-20' }), todo('unscheduled'),
          todo('future', { completedAt: stamp(13) }),
        ] },
        pomodoro: { version: 1, settings: { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4, transitionMode: 'autoBreak' },
          mode: 'focus', selection: { taskId: null, title: '' }, active: null, completedFocusCount: 999, sessions: empty ? [] : [
            session('morning', 12, 10, 25), session('noon', 12, 12, 5, false),
            session('afternoon', 11, 15, 10), session('night', 11, 19, 5, false),
            session('previous', 5, 10, 15), session('rest', 12, 10, 10, true, 'shortBreak'), session('future', 13, 10, 25),
          ] },
        reminders: { version: 1, items: empty ? [] : [habit('habit-a', '阅读'), habit('habit-b', '归档练习', false), habit('habit-c', '散步')],
          done: empty ? {} : { '2026-10-12': ['habit-a', 'habit-b'], '2026-10-11': ['habit-a'], '2026-10-10': ['habit-a'],
            '2026-10-05': ['habit-b'], '2026-10-13': ['habit-a'] } },
        meals: { version: 1, meals: [], nutrition: empty ? [] : [
          { id: 'meal-a', date: '2026-10-12', name: '午餐', carbs: 20, protein: 10, fat: 5 },
          { id: 'meal-b', date: '2026-10-12', name: '加餐', carbs: 10, protein: 20, fat: 5 },
          { id: 'meal-zero', date: '2026-10-11', name: '明确零记录', carbs: 0, protein: 0, fat: 0 },
          { id: 'meal-previous', date: '2026-10-05', name: '之前记录', carbs: 10, protein: 5, fat: 2 },
          { id: 'meal-future', date: '2026-10-13', name: '未来记录', carbs: 99, protein: 99, fat: 99 },
        ] },
        domains: { version: 1, domains: empty ? [] : [
          domain('work', '工作', [record('positive-a', 12), record('positive-b', 11), record('positive-future', 13)], [record('negative-a', 12), record('negative-previous', 5)]),
          domain('life', '生活', [record('positive-c', 10)]),
        ], completedGoals: empty ? [] : [goal('goal-long', 'work', 'longTerm', 12), goal('goal-short', 'life', 'shortTerm', 11)] },
        growth: { version: 1, domains: empty ? [] : [
          { id: 'growth-work', name: '工作', iconId: 'work', archived: false },
          { id: 'growth-old', name: '旧目标', iconId: 'plant', archived: true },
        ], events: empty ? [] : [
          { id: 'growth-small', domainId: 'growth-work', size: 'small', createdAt: stamp(12) },
          { id: 'growth-large', domainId: 'growth-work', size: 'large', createdAt: stamp(12) },
          { id: 'growth-medium', domainId: 'growth-old', size: 'medium', createdAt: stamp(11) },
          { id: 'growth-previous', domainId: 'growth-work', size: 'medium', createdAt: stamp(5) },
          { id: 'growth-future', domainId: 'growth-work', size: 'large', createdAt: stamp(13) },
        ], completedGoals: empty ? [] : [{ id: 'growth-goal', title: '独立成长目标', createdAt: stamp(1), completedAt: stamp(12), domainId: 'growth-old' }] },
      };
      window.__miniFixture.guestToolStates = states;
      for (const [key, data] of Object.entries(states)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${key}`, JSON.stringify({ data, pending: false, revision: 0 }));
    }, empty);
    await page.reload();
    await page.evaluate(() => { window.__miniFixture.persistEntryTools = true; location.hash = '#/pages/statistics/index?panel=todos'; });
    await expect(scope()).toBeVisible();
    await expect(scope().getByRole('button', { name: '近7天', exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  try {
    await fresh();
    const original = await storage();
    await metrics({ '期间完成': '2', '完成活跃天': '2', '平均完成用时': '36', '按时完成率': '50', '当前待办': '5', '当前逾期': '1' });
    await expect(chart('当前待办日程分布').locator('.statistics-insight-bar-choice')).toHaveCount(5);
    await expect(chart('当前待办日程分布').locator('.statistics-insight-scale')).toHaveText('最高 1 件');
    await button('当前待办日程分布', 'next-week 待办任务 1 件').click();
    await expect(chart('当前待办日程分布').locator('.statistics-insight-point')).toContainText('未来7天');
    await expect(chart('当前待办日程分布').locator('.statistics-insight-point')).toContainText('明天至第7天');
    await expect(scope().locator('.statistics-insight-findings')).toContainText('增加 1 件完成任务');
    await checkGeometry('todos-7');

    await selectTab('专注');
    await metrics({ '专注分钟': '45', '投入天数': '2', '完整结束率': '50', '平均每轮': '11.3', '完整番茄': '2', '提前结束': '2' });
    await expect(chart('专注结束时段的投入分布').locator('.statistics-insight-scale')).toHaveText('最高 25 分钟');
    await button('专注结束时段的投入分布', 'noon 实际专注时长 5 分钟').click();
    await expect(chart('专注结束时段的投入分布').locator('.statistics-insight-point')).toContainText('中午');
    await expect(chart('专注结束时段的投入分布').locator('.statistics-insight-point')).toContainText('5 分钟');
    await expect(scope().locator('.statistics-insight-findings')).toContainText('增加 30 分钟专注');
    await checkGeometry('focus-7');

    await selectTab('习惯');
    await metrics({ '打卡次数': '4', '记录天数': '3', '日均打卡': '0.6', '打卡习惯': '2', '进行中习惯': '2', '最长当前连续': '3' });
    await expect(scope().locator('.statistics-insight-chart')).toHaveCount(2);
    await expect(chart('每日打卡次数').locator('.statistics-insight-column')).toHaveCount(7);
    await expect(chart('每日打卡次数').locator('.statistics-insight-scale')).toHaveText('最高 2 次');
    await button('每日打卡次数', '2026-10-10 打卡 1 次').click();
    await expect(chart('每日打卡次数').locator('.statistics-insight-point')).toContainText('2026-10-10');
    await button('习惯打卡分布', 'habit-b 打卡 1 次').click();
    await expect(chart('习惯打卡分布').locator('.statistics-insight-point')).toContainText('归档练习（已归档）');
    const zeroHabit = button('每日打卡次数', '2026-10-09 打卡 0 次');
    expect(await zeroHabit.locator('.statistics-insight-day-bar').evaluate(node => node.getBoundingClientRect().height)).toBe(0);
    await checkGeometry('habits-7');

    await selectTab('饮食');
    await metrics({ '记录天数': '2', '记录餐数': '3', '日均碳水': '15', '日均蛋白质': '15', '日均脂肪': '5', '每记录日餐数': '1.5' });
    const diet = chart('每日已记录营养');
    await expect(diet.locator('.statistics-insight-legend')).toContainText('碳水');
    await expect(diet.locator('.statistics-insight-swatch')).toHaveCount(3);
    await expect(diet.locator('.statistics-insight-scale')).toHaveText('最高 30 g');
    await button('每日已记录营养', '2026-10-12 碳水 30 g，蛋白质 30 g，脂肪 10 g').click();
    await expect(diet.locator('.statistics-insight-point')).toContainText('2 餐记录');
    const zero = button('每日已记录营养', '2026-10-11 碳水 0 g，蛋白质 0 g，脂肪 0 g');
    await zero.click(); await expect(diet.locator('.statistics-insight-point')).toContainText('1 餐记录');
    await expect(diet.locator('.statistics-insight-point')).not.toContainText('未记录');
    await expect(zero.locator('.statistics-insight-missing')).toHaveCount(0);
    expect(await zero.locator('.statistics-insight-day-bar').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height))).toEqual([0, 0, 0]);
    const missing = button('每日已记录营养', '2026-10-10 未记录');
    await missing.click(); await expect(diet.locator('.statistics-insight-point')).toContainText('未记录');
    await expect(missing.locator('.statistics-insight-missing')).toHaveText('—');
    await expect(missing.locator('.statistics-insight-day-bar')).toHaveCount(0);
    await checkGeometry('meals-7');

    await selectTab('领域');
    await metrics({ '记录总数': '4', '正向记录': '3', '负向记录': '1', '记录天数': '3', '完成目标': '2', '活跃领域': '2' });
    await expect(chart('每日领域记录').locator('.statistics-insight-swatch')).toHaveCount(2);
    await button('每日领域记录', '2026-10-12 正向 1 条，负向 1 条').click();
    await expect(chart('每日领域记录').locator('.statistics-insight-point')).toContainText('正向 1 条');
    await expect(chart('每日领域记录').locator('.statistics-insight-point')).toContainText('负向 1 条');
    const stacked = button('领域记录分布', 'work 正向 2 条，负向 1 条');
    await stacked.click();
    await expect(chart('领域记录分布').locator('.statistics-insight-scale')).toHaveText('最高 3 条');
    const shares = await stacked.locator('.statistics-insight-bar-track').evaluate(node => ({ width: node.clientWidth, bars: [...node.children].map(bar => bar.getBoundingClientRect().width) }));
    expect(shares.bars[0] / shares.width).toBeCloseTo(2 / 3, 2);
    expect(shares.bars[1] / shares.width).toBeCloseTo(1 / 3, 2);
    await checkGeometry('domains-7');

    await selectTab('成长');
    await metrics({ '期间成长值': '9', '成长记录': '3', '有记录天数': '2', '已完成目标': '1', '有记录领域': '2', '活跃日日均成长': '4.5' });
    await button('每日成长值', '2026-10-12 成长值 6 点').click();
    await expect(chart('每日成长值').locator('.statistics-insight-point')).toContainText('2 次成长记录');
    await expect(chart('每日成长值').locator('.statistics-insight-scale')).toHaveText('最高 6 点');
    await button('成长领域贡献', 'growth-old 期间成长值 3 点').click();
    await expect(chart('成长领域贡献').locator('.statistics-insight-point')).toContainText('旧目标（已归档）');
    await expect(scope().locator('.statistics-insight-findings')).toContainText('小进步 1 次、中等进步 1 次、大进步 1 次');
    await checkGeometry('growth-7');

    // One applied period drives every category, the retained old analysis and all daily charts.
    await scope().getByRole('button', { name: '近30天', exact: true }).click();
    await metrics({ '期间成长值': '12', '成长记录': '4', '有记录天数': '3', '已完成目标': '1', '有记录领域': '2', '活跃日日均成长': '4' });
    await checkDailyScroll('每日成长值');
    await selectTab('待办', 30);
    await metrics({ '期间完成': '3', '完成活跃天': '3', '平均完成用时': '40', '按时完成率': '50', '当前待办': '5', '当前逾期': '1' });
    await expect(page.locator('.analysis-column')).toHaveCount(30);
    await selectTab('专注', 30);
    await metrics({ '专注分钟': '60', '投入天数': '3', '完整结束率': '60', '平均每轮': '12', '完整番茄': '3', '提前结束': '2' });
    await expect(page.locator('.analysis-column')).toHaveCount(30);
    await selectTab('习惯', 30);
    await metrics({ '打卡次数': '5', '记录天数': '4', '日均打卡': '0.2', '打卡习惯': '2', '进行中习惯': '2', '最长当前连续': '3' });
    await checkDailyScroll('每日打卡次数');
    await selectTab('饮食', 30);
    await metrics({ '记录天数': '3', '记录餐数': '4', '日均碳水': '13.3', '日均蛋白质': '11.7', '日均脂肪': '4', '每记录日餐数': '1.3' });
    await checkDailyScroll('每日已记录营养');
    await selectTab('领域', 30);
    await metrics({ '记录总数': '5', '正向记录': '3', '负向记录': '2', '记录天数': '4', '完成目标': '2', '活跃领域': '2' });
    await checkDailyScroll('每日领域记录');
    await checkGeometry('domains-30');
    expect(await storage()).toEqual(original, 'Reading, changing periods and chart selections preserve the exact six original storage values');
    expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path.startsWith('/personal-tools/') && request.method !== 'GET'))).toEqual([]);

    await fresh(true);
    const emptyOriginal = await storage();
    for (const label of labels) {
      await selectTab(label);
      expect(await scope().locator('.statistics-insight-chart').count()).toBeGreaterThanOrEqual(1);
      const emptyChart = await scope().locator('.statistics-insight-chart').evaluateAll(nodes => nodes.map(node => ({
        scale: node.querySelector('.statistics-insight-scale').textContent,
        knownPoints: [...node.querySelectorAll('.statistics-insight-column,.statistics-insight-bar-choice')].filter(point => !point.querySelector('.statistics-insight-missing')).length,
        dayHeights: [...node.querySelectorAll('.statistics-insight-day-bar')].map(bar => bar.getBoundingClientRect().height),
        barWidths: [...node.querySelectorAll('.statistics-insight-bar-track > *')].map(bar => bar.getBoundingClientRect().width),
      })));
      for (const item of emptyChart) {
        if (item.knownPoints) expect(item.scale).toMatch(/^最高 0 /);
        else expect(item.scale).toBe('暂无已记录数值');
        expect(item.dayHeights.every(height => height === 0)).toBe(true);
        expect(item.barWidths.every(value => value === 0)).toBe(true);
      }
      if (label === '饮食') {
        await expect(chart('每日已记录营养').locator('.statistics-insight-missing')).toHaveCount(7);
        await expect(chart('每日已记录营养').locator('.statistics-insight-point')).toContainText('未记录');
      }
      if (label === '待办' || label === '专注' || label === '饮食') await expect(scope().locator('.statistics-insight-metric-value').filter({ hasText: /^—$/ }).first()).toBeVisible();
      await checkGeometry(`empty-${label}`);
    }
    expect(await storage()).toEqual(emptyOriginal);
    expect(errors).toEqual([]);
  } finally { await page.close(); }
};
