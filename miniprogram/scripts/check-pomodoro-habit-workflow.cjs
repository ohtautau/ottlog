const path = require('node:path');

module.exports = async function checkPomodoroHabitWorkflow({ page, origin, out, width, expect }) {
  const source = require('./pomodoro-source-controls.cjs')({ page, expect });
  const readTitle = '读完今天想读的两页书';
  const stretchTitle = '起身做一组肩颈伸展';
  const taskTitle = '整理今天的工作笔记';
  const pausedTitle = '暂时停下的乐器练习';
  const extraHabits = [
    ['记得喝一杯水', '健康', 'water'],
    ['出门散步十分钟', '健康', 'walk'],
    ['写下今天的小发现', '精神', 'write'],
    ['听一首喜欢的歌', '精神', 'music'],
    ['复习五个英语单词', '学习', 'language'],
    ['给阳台的植物浇水', '精神', 'plant'],
    ['准备明天的训练背包', '健身', 'bag'],
    ['认真吃一顿早餐', '饮食', 'food'],
    ['练习一次深呼吸', '健康', 'breathe'],
    ['整理桌面的一角', '精神', 'tidy'],
    ['拍一张今天的天空', '学习', 'camera'],
    ['做十个深蹲', '健身', 'exercise'],
    ['记录晚餐吃了什么', '饮食', 'food'],
    ['看看一本旧笔记', '学习', 'notes'],
    ['记下晨起的心率', '健身', 'pulse'],
    ['给朋友发一句问候', '精神', 'connect'],
    ['出门晒一会儿太阳', '健康', 'sun'],
    ['晚饭慢慢吃', '饮食', 'slow'],
    ['睡前放下手机', '健康', 'unplug'],
    ['尝试一个新的剪辑方法', '学习', 'film'],
    ['记下本周的身体数据', '健身', 'measure'],
    ['为自己准备一杯咖啡', '饮食', 'coffee'],
    ['做完小事鼓励自己', '精神', 'celebrate'],
    ['睡前认真刷牙', '健康', 'brush'],
  ];
  const enabledTitles = [readTitle, stretchTitle, ...extraHabits.map(([title]) => title)];
  const healthTitles = extraHabits.filter(([, group]) => group === '健康').map(([title]) => title);
  const state = () => page.evaluate(() => window.__miniFixture.pomodoroLocalState);
  const todoPicker = () => page.getByRole('button', { name: '从待办选择专注事项', exact: true });
  const habitPicker = () => page.getByRole('button', { name: '从习惯选择专注事项', exact: true });
  const habitSheet = () => page.locator('.focus-habit-sheet');
  const habitOptions = () => page.locator('.focus-habit-option');
  const habitOption = title => page.getByRole('button', { name: `选择习惯：${title}`, exact: true });
  const search = () => page.getByRole('textbox', { name: '搜索习惯', exact: true });
  const groupButton = group => page.getByRole('button', { name: `习惯分组：${group}`, exact: true });
  const moveTo = route => page.evaluate(value => { location.hash = `#/pages/${value}/index`; }, route);
  async function openHabits() {
    await source.select('habit');
    await expect(habitSheet()).toBeVisible();
  }
  async function closeHabits() {
    await page.getByRole('button', { name: '关闭习惯选择', exact: true }).click();
    await expect(habitSheet()).toHaveCount(0);
  }
  async function chooseHabit(title) {
    await openHabits();
    await search().fill(title);
    await habitOption(title).click();
    await expect(habitSheet()).toHaveCount(0);
  }
  async function optionTitles(locator = habitOptions()) {
    return locator.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label').replace(/^选择习惯：/, '')));
  }
  async function assertCoreActionsFit() {
    const layout = await page.evaluate(() => {
      const box = node => { const rect = node.getBoundingClientRect(); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }; };
      return {
        scrollTop: document.querySelector('.page-scroll').scrollTop,
        viewport: box(document.querySelector('.preview-content')),
        card: box(document.querySelector('.focus-clock-card')),
        arrow: box(document.querySelector('#page-core')),
        actions: [...document.querySelectorAll('.focus-primary-actions button,.focus-end')].map(box),
      };
    });
    expect(layout.scrollTop, JSON.stringify(layout)).toBeLessThanOrEqual(1);
    for (const action of layout.actions) {
      expect(action.left, JSON.stringify(layout)).toBeGreaterThanOrEqual(layout.viewport.left - 1);
      expect(action.right, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport.right + 1);
      expect(action.top, JSON.stringify(layout)).toBeGreaterThanOrEqual(layout.card.top - 1);
      expect(action.bottom, JSON.stringify(layout)).toBeLessThanOrEqual(Math.min(layout.card.bottom, layout.arrow.bottom) + 1);
    }
  }

  await page.goto(`${origin}/?pomodoro-habits-${width}#/pages/index/index`);
  await page.evaluate(({ readTitle, stretchTitle, taskTitle, pausedTitle, extraHabits }) => {
    const habit = (id, title, kind, group, enabled = true, minutes = 7) => ({ id, title, kind, group, enabled, minutes, note: '' });
    const session = (id, habitId, title, hour) => ({ id, habitId, title, taskId: null, mode: 'focus', durationSeconds: 120, plannedSeconds: 1500, completed: false, startedAt: `2026-09-14T${hour}:00:00Z`, endedAt: `2026-09-14T${hour}:02:00Z` });
    window.__miniFixture.guestToolStates = {
      reminders: { version: 1, items: [
        habit('reading', readTitle, 'notes', '学习'),
        habit('stretching', stretchTitle, 'stretch', '健身'),
        ...extraHabits.map(([title, group, kind], index) => habit(`extra-${index}`, title, kind, group)),
        habit('paused-music', pausedTitle, 'music', '精神', false),
      ], done: { '2026-09-15': ['reading'] } },
      todos: { version: 1, categories: [], tasks: [{ id: 'work-note', title: taskTitle, description: '', categoryId: '', important: true, urgent: false, dueDate: '', completedAt: null, createdAt: '2026-09-15T00:00:00Z', updatedAt: '2026-09-15T00:00:00Z' }] },
      pomodoro: {
        version: 1, settings: { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4, transitionMode: 'autoBreak' },
        mode: 'focus', selection: { taskId: null, habitId: null, title: '' }, active: null, completedFocusCount: 0,
        sessions: [
          session('paused-history', 'paused-music', pausedTitle, '18'),
          session('deleted-history', 'deleted-habit', '已经删除的习惯', '17'),
          session('reading-recent', 'reading', readTitle, '16'),
          session('reading-repeat', 'reading', readTitle, '15'),
          session('water-recent', 'extra-0', extraHabits[0][0], '14'),
          session('walk-recent', 'extra-1', extraHabits[1][0], '13'),
          session('write-recent', 'extra-2', extraHabits[2][0], '12'),
          session('music-older', 'extra-3', extraHabits[3][0], '11'),
        ],
      },
    };
    location.hash = '#/pages/pomodoro/index';
  }, { readTitle, stretchTitle, taskTitle, pausedTitle, extraHabits });
  await source.open();
  await expect(habitPicker()).toBeEnabled();
  await expect(todoPicker()).toBeEnabled();
  await expect(page.locator('.focus-habit-picker select')).toHaveCount(0);
  await source.close();

  await openHabits();
  await expect(habitOptions()).toHaveCount(enabledTitles.length);
  await expect(habitOption(pausedTitle)).toHaveCount(0);
  await expect(habitOption('已经删除的习惯')).toHaveCount(0);
  expect(await optionTitles(page.locator('.focus-habit-recent .focus-habit-option'))).toEqual([readTitle, ...extraHabits.slice(0, 3).map(([title]) => title)]);
  expect((await optionTitles()).sort()).toEqual([...enabledTitles].sort());
  const sheetLayout = await habitSheet().evaluate(sheet => {
    const box = node => { const rect = node.getBoundingClientRect(); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width }; };
    const scroll = sheet.querySelector('.focus-habit-scroll');
    return {
      sheet: box(sheet), viewport: box(document.querySelector('.preview-content')),
      search: box(sheet.querySelector('[aria-label="搜索习惯"]')),
      close: box(sheet.querySelector('[aria-label="关闭习惯选择"]')),
      cards: [...sheet.querySelectorAll('.focus-habit-option')].slice(0, 2).map(box),
      overflow: sheet.scrollWidth - sheet.clientWidth,
      scrollHeight: scroll.scrollHeight, clientHeight: scroll.clientHeight,
      pageScroll: document.querySelector('.page-scroll').scrollTop,
    };
  });
  expect(sheetLayout.sheet.top, JSON.stringify(sheetLayout)).toBeGreaterThanOrEqual(sheetLayout.viewport.top - 1);
  expect(sheetLayout.sheet.bottom, JSON.stringify(sheetLayout)).toBeLessThanOrEqual(sheetLayout.viewport.bottom + 1);
  expect(sheetLayout.overflow).toBeLessThanOrEqual(2);
  expect(sheetLayout.scrollHeight).toBeGreaterThan(sheetLayout.clientHeight);
  expect(Math.abs(sheetLayout.cards[0].top - sheetLayout.cards[1].top), JSON.stringify(sheetLayout)).toBeLessThanOrEqual(1);
  expect(Math.abs(sheetLayout.cards[0].width - sheetLayout.cards[1].width), JSON.stringify(sheetLayout)).toBeLessThanOrEqual(1);
  expect(sheetLayout.cards[1].left, JSON.stringify(sheetLayout)).toBeGreaterThanOrEqual(sheetLayout.cards[0].right);
  await page.screenshot({ path: path.join(out, `pomodoro-habit-sheet-${width}.png`) });

  // A long habit collection scrolls independently while its search and close stay reachable.
  await page.locator('.focus-habit-scroll').evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(habitOption(extraHabits.at(-1)[0])).toBeInViewport();
  const afterScroll = await page.evaluate(() => {
    const search = document.querySelector('[aria-label="搜索习惯"]').getBoundingClientRect();
    const close = document.querySelector('[aria-label="关闭习惯选择"]').getBoundingClientRect();
    return { searchTop: search.top, closeTop: close.top, pageScroll: document.querySelector('.page-scroll').scrollTop };
  });
  expect(afterScroll.searchTop).toBeCloseTo(sheetLayout.search.top, 0);
  expect(afterScroll.closeTop).toBeCloseTo(sheetLayout.close.top, 0);
  expect(afterScroll.pageScroll).toBe(sheetLayout.pageScroll);
  await closeHabits();
  await expect(page.locator('.focus-purpose-input')).toHaveValue('');

  await openHabits();
  await groupButton('健康').click();
  expect((await optionTitles()).sort()).toEqual([...healthTitles].sort());
  await groupButton('全部').click();
  await search().fill('健康');
  expect((await optionTitles()).sort()).toEqual([...healthTitles].sort());
  await search().fill('  两页   书  ');
  await expect(habitOptions()).toHaveCount(1);
  await expect(habitOption(readTitle)).toBeVisible();
  await page.screenshot({ path: path.join(out, `pomodoro-habit-search-${width}.png`) });
  await search().fill('完全不存在的习惯');
  await expect(habitOptions()).toHaveCount(0);
  await expect(search()).toBeVisible();
  await search().fill('');
  await expect(habitOptions()).toHaveCount(enabledTitles.length);

  // Already completed habits remain available; selecting a card takes one click.
  await habitOption(readTitle).click();
  await expect(habitSheet()).toHaveCount(0);
  await expect(page.locator('.focus-purpose-input')).toHaveValue(readTitle);
  await source.open();
  await expect(todoPicker()).toHaveAttribute('aria-pressed', 'false');
  await expect(habitPicker()).toHaveAttribute('aria-pressed', 'true');
  await source.close();
  await openHabits();
  await expect(habitOption(readTitle)).toHaveAttribute('aria-pressed', 'true');
  await closeHabits();
  await expect(page.locator('.focus-purpose-input')).toHaveValue(readTitle);
  await source.select('todo');
  await page.getByRole('button', { name: `选择待办：${taskTitle}`, exact: true }).click();
  await expect(page.locator('.focus-purpose-input')).toHaveValue(taskTitle);
  await openHabits();
  await expect(habitOption(readTitle)).toHaveAttribute('aria-pressed', 'false');
  await search().fill(stretchTitle);
  await habitOption(stretchTitle).click();
  await expect(habitSheet()).toHaveCount(0);
  await expect(page.locator('.focus-purpose-input')).toHaveValue(stretchTitle);
  await source.open();
  await expect(todoPicker()).toHaveAttribute('aria-pressed', 'false');
  await source.close();

  const layout = await page.evaluate(() => {
    const box = selector => { const rect = document.querySelector(selector).getBoundingClientRect(); return { x: rect.x, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width }; };
    return { title: box('.focus-purpose-input'), source: box('.focus-source-toggle'), viewport: box('.preview-content'), overflow: document.querySelector('.page-scroll').scrollWidth - document.querySelector('.page-scroll').clientWidth };
  });
  expect(Math.abs((layout.title.top + layout.title.bottom) / 2 - (layout.source.top + layout.source.bottom) / 2), JSON.stringify(layout)).toBeLessThanOrEqual(1);
  expect(layout.source.x, JSON.stringify(layout)).toBeGreaterThanOrEqual(layout.title.right - 1);
  expect(layout.source.right, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport.right + 1);
  expect(layout.source.bottom, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport.bottom + 1);
  expect(layout.overflow, JSON.stringify(layout)).toBeLessThanOrEqual(2);
  await assertCoreActionsFit();
  await page.screenshot({ path: path.join(out, `pomodoro-habit-sources-${width}.png`) });

  await page.locator('.focus-start').click();
  await expect(page.locator('.focus-live')).toContainText('正在计时');
  const original = (await state()).active;
  expect(original.selection).toMatchObject({ taskId: null, habitId: 'stretching', title: stretchTitle });
  // Selecting a habit does not silently replace the configured focus duration.
  expect(original.totalSeconds).toBe(25 * 60);
  await page.locator('.focus-purpose-input').fill('把这一组动作做慢一点');
  expect((await state()).active).toEqual({ ...original, selection: { ...original.selection, title: '把这一组动作做慢一点' } });

  // Swapping either source during a running clock preserves the existing run.
  await source.select('todo');
  await page.getByRole('button', { name: `选择待办：${taskTitle}`, exact: true }).click();
  expect((await state()).active).toMatchObject({ id: original.id, deadline: original.deadline, selection: { taskId: 'work-note', habitId: null, title: taskTitle } });
  await chooseHabit(readTitle);
  const linked = (await state()).active;
  expect(linked).toMatchObject({ id: original.id, deadline: original.deadline, selection: { taskId: null, habitId: 'reading', title: readTitle } });
  await source.open();
  await expect(todoPicker()).toHaveAttribute('aria-pressed', 'false');
  await source.close();
  await page.clock.fastForward(12_000);
  await moveTo('index');
  await expect(page.locator('.today-grid')).toBeVisible();
  await moveTo('pomodoro');
  await expect(page.locator('.focus-purpose-input')).toHaveValue(readTitle);
  await source.open();
  await expect(habitPicker()).toHaveAttribute('aria-pressed', 'true');
  await source.close();
  await openHabits();
  await expect(habitOption(readTitle)).toHaveAttribute('aria-pressed', 'true');
  await closeHabits();
  expect((await state()).active).toEqual(linked);
  await assertCoreActionsFit();
  await page.screenshot({ path: path.join(out, `pomodoro-habit-running-${width}.png`) });
  await page.locator('.focus-start').click();
  await expect(page.locator('.focus-live')).toContainText('已暂停');
  await page.getByRole('button', { name: '结束', exact: true }).click();
  await expect(page.locator('.focus-live')).toContainText('准备就绪');
  const saved = (await state()).sessions.find(session => session.id === original.id);
  expect(saved).toMatchObject({ habitId: 'reading', taskId: null, title: readTitle, completed: false });
  expect(saved.durationSeconds).toBeGreaterThanOrEqual(12);
  await moveTo('index');
  await expect(page.locator('.today-grid')).toBeVisible();
  await moveTo('pomodoro');
  await expect(page.locator('.focus-live')).toContainText('准备就绪');
  expect((await state()).sessions.find(session => session.id === original.id)).toEqual(saved);
  await openHabits();
  expect((await optionTitles(page.locator('.focus-habit-recent .focus-habit-option')))[0]).toBe(readTitle);
  await expect(habitOption(readTitle)).toHaveCount(1);
  await page.getByRole('button', { name: '改为自由专注', exact: true }).click();
  await expect(habitSheet()).toHaveCount(0);
  await expect(page.locator('.focus-purpose-input')).toHaveValue('');
  await page.locator('.focus-start').click();
  await expect(page.locator('.focus-live')).toContainText('正在计时');
  expect((await state()).active.selection).toMatchObject({ taskId: null, habitId: null, title: '' });

  // An account change must not expose the guest's saved habits or active link.
  await moveTo('favorites');
  await page.getByPlaceholder('输入博客账号').fill('preview-reader');
  await page.getByPlaceholder('输入密码', { exact: true }).fill('fixture-only-password');
  await page.getByRole('button', { name: '登录并同步', exact: true }).click();
  await expect(page.locator('.account-user-name')).toHaveText('preview-reader');
  await moveTo('pomodoro');
  await source.open();
  await expect(habitPicker()).toBeEnabled();
  await source.close();
  await openHabits();
  await expect(habitOption(readTitle)).toHaveCount(0);
  await expect(habitOption(stretchTitle)).toHaveCount(0);
  await expect(page.locator('.focus-habit-recent .focus-habit-option')).toHaveCount(0);
  await closeHabits();
  await expect(page.locator('.focus-live')).toContainText('准备就绪');
  await expect(page.locator('.focus-purpose-input')).toHaveValue('');

  await page.goto(`${origin}/?pomodoro-no-habits-${width}#/pages/index/index`);
  await page.evaluate(() => {
    window.__miniFixture.guestToolStates = { reminders: { version: 1, items: [], done: {} } };
    location.hash = '#/pages/pomodoro/index';
  });
  await expect(page.locator('.focus-live')).toContainText('准备就绪');
  await source.open();
  await expect(habitPicker()).toBeDisabled();
  await source.close();
  await expect(habitSheet()).toHaveCount(0);

  // A removed habit can still be cleared from a restored focus selection.
  await page.goto(`${origin}/?pomodoro-stale-habit-${width}#/pages/index/index`);
  await page.evaluate(() => {
    window.__miniFixture.guestToolStates = {
      reminders: { version: 1, items: [], done: {} },
      pomodoro: { version: 1, settings: { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4, transitionMode: 'autoBreak' }, mode: 'focus', selection: { taskId: null, habitId: 'removed-habit', title: '过去的练习' }, active: null, sessions: [], completedFocusCount: 0 },
    };
    location.hash = '#/pages/pomodoro/index';
  });
  await expect(page.locator('.focus-purpose-input')).toHaveValue('过去的练习');
  await source.open();
  await expect(habitPicker()).toBeEnabled();
  await source.close();
  await openHabits();
  await expect(habitOptions()).toHaveCount(0);
  await page.getByRole('button', { name: '改为自由专注', exact: true }).click();
  await expect(habitSheet()).toHaveCount(0);
  await expect(page.locator('.focus-purpose-input')).toHaveValue('');
  await source.open();
  await expect(habitPicker()).toBeDisabled();
  await source.close();
};
