const path = require('node:path');
const checkHabitCore = require('./check-habit-detail-layout.cjs');
const checkHabitEditorFields = require('./check-habit-editor-fields.cjs');
const habitFilterControls = require('./habit-filter-test-helpers.cjs');
const habitDomainFixture = require('./habit-domain-test-fixture.cjs');

module.exports = async function checkDailyWorkflow({ page, origin, out, width, expect }) {
  const habitFilter = habitFilterControls({ page, expect });
  const nearTitle = '把今天的想法写在笔记里';
  const nextTitle = '给自己留一点伸展时间';
  const savedLine = '原来读完两页，心情就会轻一点。';
  const olderLine = '不用着急，一页也是一步。';
  const recentLine = '今天又找回了一点安静。';
  const today = '2026-09-15';
  await page.clock.install({ time: new Date('2026-09-15T10:45:00') });
  await page.goto(`${origin}/?daily-${width}#/pages/posts/index`);
  await page.evaluate(domains => {
    for (const tool of ['reminders', 'domains']) localStorage.removeItem(`ottlog-mini-tool-v1:guest:${tool}`);
    const groups = { plant: '精神', notes: '学习', water: '健康', walk: '健身', tidy: '健康', stretch: '健身', sun: '健康', music: '精神' };
    const item = (id, title, enabled = true, kind = 'plant') => ({ id, title, note: '用一个现在就能开始的小动作，重新找回自己的节奏。', kind, group: groups[kind], minutes: 0, enabled, timePeriod: 'free' });
    const at = (day, hour, minute = 0) => new Date(2026, 8, day, hour, minute).getTime();
    const extraTitles = ['认真吃一顿早餐', '给朋友发一句问候', '走到窗边看看远处', '收拾桌上的小物件', '听一首喜欢的音乐', '记下一件开心的事', '读两页想读的书', '整理一张旧照片', '给植物浇一点水', '出门散步十分钟', '做一次肩颈放松', '放下手机一会儿', '慢慢喝完这杯水', '练习一段新的旋律', '看看今天的天空', '复习几个英语单词', '准备明天的衣服', '洗好用过的杯子', '写一句想说的话', '记录此刻的感受', '给房间开窗通风', '回想今天的小进步', '试一个新的动作', '给好奇心留点时间'];
    const kinds = ['plant', 'notes', 'water', 'walk', 'tidy', 'stretch', 'sun', 'music'];
    window.__miniFixture.guestToolStates = { reminders: { version: 1, items: [
      item('old1', '打开那本一直想读的书'), item('old2', '在窗边照顾一下植物'), item('old3', '整理抽屉里遗忘的明信片'),
      item('near', '把今天的想法写在笔记里', true, 'notes'), item('next', '给自己留一点伸展时间', true, 'stretch'),
      item('third', '打开窗透一会儿气', true, 'sun'), item('far', '起身给自己倒一杯温水', true, 'water'), item('new', '走到室外呼吸新鲜空气', true, 'walk'),
      ...extraTitles.map((title, index) => item(`random-${index}`, title, true, kinds[index % kinds.length])), item('paused', '已归档的习惯', false),
    ], done: { '2026-09-01': ['old1', 'old2', 'old3', 'near'], '2026-09-07': ['near'] }, reflections: [
      { id: 'memo-old', habitId: 'old1', day: '2026-09-01', text: '不用着急，一页也是一步。', createdAt: at(1, 10), lastShownAt: at(3, 10) },
      { id: 'memo-recent', habitId: 'near', day: '2026-09-07', text: '今天又找回了一点安静。', createdAt: at(7, 10), lastShownAt: at(14, 10) },
    ] } };
    window.__miniFixture.guestToolStates.domains = domains;
    for (const [tool, data] of Object.entries(window.__miniFixture.guestToolStates)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data, pending: false, revision: 0 }));
    window.__miniFixture.habitOpenLogs = { 'ottlog.habit-openings.v1.guest': { version: 1, opened: {
      near: [at(11, 10, 30), at(12, 10, 40), at(13, 10, 35), at(14, 21)],
      next: [at(11, 10, 50), at(12, 10, 50), at(13, 10, 50)],
      third: [at(11, 11, 15), at(12, 11, 15), at(13, 11, 15)],
      far: [at(11, 16), at(12, 16, 10), at(13, 15, 50)],
    } } };
    location.hash = '#/pages/daily/index';
  }, habitDomainFixture());
  const core = page.locator('#page-core');
  const nearCard = () => core.locator('.daily-habit-scroll .daily-suggestion').filter({ has: page.locator('.daily-suggestion-title', { hasText: nearTitle }) });
  const coreCard = title => core.locator('.daily-habit-scroll .daily-suggestion').filter({ has: page.locator('.daily-suggestion-title', { hasText: new RegExp(`^${title}$`) }) });
  async function openCalendarDetail(title = '打开那本一直想读的书') {
    await habitFilter.select('全部');
    await coreCard(title).getByRole('button', { name: `查看习惯：${title}`, exact: true }).click();
    await expect(page.locator('.daily-detail-sheet .habit-calendar')).toBeVisible();
  }
  const localState = () => page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:reminders')).data);
  const editor = () => page.locator('.daily-editor-sheet');
  const closePrompt = () => page.getByRole('dialog', { name: '保存修改？', exact: true });
  const priorityTrigger = () => editor().getByRole('button', { name: '选择习惯优先度', exact: true });
  async function checkEditorLayout() {
    await checkHabitEditorFields(editor(), expect, `daily/${width}`);
    await expect(editor().locator('select'), 'Habit fields use app-owned floating choices').toHaveCount(0);
    await expect(editor().getByRole('button', { name: '选择习惯图标', exact: true })).toHaveCount(1);
    await expect(editor().getByRole('textbox', { name: '提醒自己的话', exact: true })).toBeVisible();
    const layout = await editor().evaluate(node => {
      const box = selector => node.querySelector(selector).getBoundingClientRect();
      const icon = box('[aria-label="选择习惯图标"]'), title = box('[aria-label="习惯名称"]'), priority = box('[aria-label="选择习惯优先度"]');
      const row = box('.daily-title-row'), note = box('[aria-label="提醒自己的话"]'), domain = box('[aria-label="选择习惯领域"]');
      return { iconEnd: icon.right - title.left, titleEnd: title.right - priority.left, priorityEnd: row.right - priority.right, noteStart: note.top - row.bottom, domainEnd: domain.bottom - row.top };
    });
    expect(layout.iconEnd, `${width}: icon stays left of the title`).toBeLessThanOrEqual(1);
    expect(layout.titleEnd, `${width}: priority stays right of the title`).toBeLessThanOrEqual(1);
    expect(layout.priorityEnd, `${width}: priority is the rightmost title control`).toBeLessThanOrEqual(2);
    expect(layout.noteStart, `${width}: remarks follow the title`).toBeGreaterThanOrEqual(-1);
    expect(layout.domainEnd, `${width}: domain precedes the title`).toBeLessThanOrEqual(1);
  }
  async function checkPriority(selected) {
    await expect(priorityTrigger()).toHaveText('');
    if (selected === '无') await expect(priorityTrigger().locator('.priority-flag')).toHaveClass(/is-none/);
    else await expect(priorityTrigger().locator('.priority-flag')).not.toHaveClass(/is-none/);
    await expect(priorityTrigger()).toHaveAttribute('aria-expanded', 'false');
    await priorityTrigger().click();
    const popup = editor().locator('.form-popover-panel');
    await expect(popup).toBeVisible();
    await expect(priorityTrigger()).toHaveAttribute('aria-expanded', 'true');
    await expect(popup.locator('.priority-option')).toHaveText(['高优先度', '中优先度', '低优先度', '无优先度']);
    await expect(popup.locator('.priority-option[aria-pressed="true"]')).toHaveText(`${selected}优先度`);
    for (const label of ['高', '中', '低', '无']) {
      await expect(popup.getByRole('button', { name: `优先度${label}`, exact: true })).toHaveAttribute('aria-pressed', String(label === selected));
    }
    const layout = await popup.evaluate(node => {
      const panel = node.getBoundingClientRect(), viewport = document.querySelector('.preview-content').getBoundingClientRect();
      const trigger = document.querySelector('[aria-label="选择习惯优先度"]').getBoundingClientRect();
      return { width: panel.width, top: panel.top - viewport.top, bottom: panel.bottom - viewport.bottom, left: panel.left - viewport.left, right: panel.right - viewport.right,
        anchorGap: panel.top >= trigger.bottom ? panel.top - trigger.bottom : trigger.top - panel.bottom,
        overflow: node.scrollWidth - node.clientWidth,
        buttons: [...node.querySelectorAll('.priority-option')].map(button => {
          const rect = button.getBoundingClientRect(), flag = button.querySelector('.priority-flag').getBoundingClientRect(), text = button.querySelector(':scope > span');
          const range = document.createRange(); range.selectNodeContents(text);
          const label = range.getBoundingClientRect(), style = getComputedStyle(text);
          return { height: rect.height, font: parseFloat(style.fontSize), lines: range.getClientRects().length, textHeight: label.height, lineHeight: parseFloat(style.lineHeight),
            flagEnd: flag.right - label.left, rightSpace: rect.right - label.right, textTop: label.top - rect.top, textBottom: label.bottom - rect.bottom,
            left: rect.left - panel.left, right: rect.right - panel.right, overflow: button.scrollWidth - button.clientWidth };
        }) };
    });
    expect(layout.width, `${width}: full priority labels use a compact panel on every screen`).toBeLessThanOrEqual(137);
    expect(layout.top, `${width}: priority panel stays below native navigation`).toBeGreaterThanOrEqual(-1);
    expect(layout.bottom, `${width}: priority panel stays above the native bottom boundary`).toBeLessThanOrEqual(1);
    expect(layout.left, `${width}: priority panel stays within the left page boundary`).toBeGreaterThanOrEqual(-1);
    expect(layout.right, `${width}: priority panel stays within the right page boundary`).toBeLessThanOrEqual(1);
    expect(layout.anchorGap, `${width}: priority choices remain adjacent to their trigger`).toBeCloseTo(8, 0);
    expect(layout.overflow, `${width}: priority panel has no horizontal overflow`).toBeLessThanOrEqual(2);
    for (const button of layout.buttons) {
      expect(button.height, `${width}: priority choice has a complete touch target`).toBeGreaterThanOrEqual(40);
      expect(button.font, `${width}: priority label retains the shared font size`).toBeCloseTo(14, 1);
      expect(button.lines, `${width}: full priority label stays on one line`).toBe(1);
      expect(button.textHeight, `${width}: full priority label is not wrapped`).toBeLessThanOrEqual(button.lineHeight + 1);
      expect(button.flagEnd, `${width}: flag does not overlap its label`).toBeLessThanOrEqual(-1);
      expect(button.rightSpace, `${width}: full label is visible inside the button`).toBeGreaterThanOrEqual(9);
      expect(button.rightSpace, `${width}: priority row has compact space after the label`).toBeLessThanOrEqual(24);
      expect(button.textTop, `${width}: full label top stays inside the button`).toBeGreaterThanOrEqual(-1);
      expect(button.textBottom, `${width}: full label bottom stays inside the button`).toBeLessThanOrEqual(1);
      expect(button.left, `${width}: priority choice stays within the panel`).toBeGreaterThanOrEqual(-1);
      expect(button.right, `${width}: priority choice stays within the panel`).toBeLessThanOrEqual(1);
      expect(button.overflow, `${width}: full priority label fits the button`).toBeLessThanOrEqual(2);
    }
    await page.screenshot({ path: path.join(out, `daily-priority-options-${selected}-${width}.png`) });
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    await expect(editor()).toBeVisible();
    await expect(priorityTrigger()).toHaveAttribute('aria-expanded', 'false');
  }
  async function choosePriority(label) {
    await priorityTrigger().click();
    await editor().locator('.form-popover-panel').getByRole('button', { name: `优先度${label}`, exact: true }).click();
    await expect(editor().locator('.form-popover-panel')).toHaveCount(0);
    await expect(priorityTrigger()).toHaveAttribute('aria-expanded', 'false');
    await expect(priorityTrigger()).toHaveText('');
  }
  async function chooseDomain(label) {
    const trigger = editor().getByRole('button', { name: '选择习惯领域', exact: true });
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await editor().locator('.form-popover-panel').getByRole('button', { name: label, exact: true }).click();
    await expect(editor().locator('.form-popover-panel')).toHaveCount(0);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveText(label);
  }
  const openings = () => page.evaluate(() => window.__miniFixture.habitOpenLogs['ottlog.habit-openings.v1.guest']);
  const finishWithoutReflection = async (whitespace = false) => {
    const sheet = page.locator('.daily-reflection-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('button')).toHaveCount(2);
    await expect(sheet.getByRole('button', { name: '关闭打卡留言', exact: true })).toBeVisible();
    await expect(sheet.getByRole('button', { name: '取消', exact: true })).toHaveCount(0);
    await expect(sheet.locator('.daily-reflection-done')).toHaveText('完成');
    const before = (await localState()).reflections || [];
    if (whitespace) await page.getByRole('textbox', { name: '打卡的一句话', exact: true }).fill('  　 ');
    await expect(sheet.locator('.daily-reflection-done')).toBeEnabled();
    await sheet.locator('.daily-reflection-done').click();
    await expect(page.locator('.daily-reflection-sheet')).toHaveCount(0);
    expect((await localState()).reflections || []).toEqual(before);
  };
  async function checkStatistics({ title, days, streak, completed, markedDay, marked, restoreDay }) {
    await page.evaluate(() => { location.hash = '#/pages/statistics/index?panel=habits'; });
    await expect(page.locator('.statistics-habits')).toBeVisible();
    if (completed !== undefined) await expect(page.locator('.statistics-today-completed')).toHaveText(String(completed));
    if (title) await page.getByRole('button', { name: `查看${title}统计`, exact: true }).click();
    const calendar = page.locator('.habit-calendar');
    if (days !== undefined) await expect(calendar.locator('.habit-calendar-stat-number').nth(1)).toHaveText(`${days}天`);
    if (streak !== undefined) await expect(calendar.locator('.habit-calendar-stat-number').nth(3)).toHaveText(`${streak}天`);
    if (markedDay) {
      const cell = calendar.locator(`.habit-calendar-day[aria-label^="${markedDay} "]`);
      if (marked) await expect(cell).toHaveClass(/is-completed/);
      else await expect(cell).not.toHaveClass(/is-completed/);
    }
    await page.evaluate(() => { location.hash = '#/pages/daily/index'; });
    await expect(page.locator('.daily-habit-scroll')).toBeVisible();
    if (completed > 0) await habitFilter.select('全部');
    if (restoreDay) {
      await openCalendarDetail(title);
    }
  }

  const grid = () => core.locator('.swipe-panel-current .daily-habit-scroll');
  const scrollPane = () => grid().locator('.daily-time-period-section[data-time-period="free"] .daily-time-period-scroll').or(grid().filter({ hasNot: page.locator('.daily-time-period-section') }));
  await habitFilter.assertNoStatusRow();
  const order = () => grid().locator('.habit-sort-tile').evaluateAll(rows => rows.map(row => row.id.slice('habit-sort-'.length)));
  const categories = core.locator('.daily-core-filter-scroll');
  async function drag(from, to, finish = 'touchend') {
    const tile = grid().locator('#habit-sort-' + from);
    const targetTile = grid().locator('#habit-sort-' + to);
    await tile.scrollIntoViewIfNeeded();
    const start = await tile.boundingBox(), viewport = await scrollPane().boundingBox();
    let target = await targetTile.boundingBox();
    const touch = { identifier: 1, clientX: start.x + start.width / 2, clientY: start.y + start.height / 2 };
    await tile.dispatchEvent('touchstart', { touches: [touch] });
    await page.clock.runFor(450);
    await expect(tile).toHaveClass(/is-dragging/);
    // A short free window can clip the next row. Bring it into view through the
    // real edge-scrolling gesture before releasing; an off-window drop is invalid.
    for (let step = 0; step < 30 && (target.y + target.height / 2 < viewport.y || target.y + target.height / 2 > viewport.y + viewport.height); step++) {
      const y = target.y + target.height / 2 < viewport.y ? viewport.y + 2 : viewport.y + viewport.height - 2;
      await tile.dispatchEvent('touchmove', { touches: [{ ...touch, clientX: target.x + target.width / 2, clientY: y }] });
      await page.clock.runFor(80);
      target = await targetTile.boundingBox();
    }
    const end = { ...touch, clientX: target.x + target.width / 2, clientY: target.y + target.height / 2 };
    expect(end.clientY, 'The intended drop target is reached inside its own list window').toBeGreaterThanOrEqual(viewport.y);
    expect(end.clientY).toBeLessThanOrEqual(viewport.y + viewport.height);
    await tile.dispatchEvent('touchmove', { touches: [end] });
    await expect(grid().locator('#habit-sort-' + to)).toHaveClass(/is-drop-target/);
    await tile.dispatchEvent(finish, { touches: [], changedTouches: [end] });
    await expect(core.locator('.is-dragging')).toHaveCount(0);
  }
  await expect(core.locator('.daily-neglected .section-title')).toHaveText('提醒');
  await expect(grid().locator('.daily-suggestion')).toHaveCount(32);
  await expect(categories.locator('button')).toHaveText(['全部', '成长', '工作', '英语', '健身', '生活', '心理', '摄影', '自媒体', '未分类']);
  await expect(core.getByRole('button', { name: '排序习惯', exact: true })).toHaveText('');
  await expect(core.getByRole('button', { name: '全部习惯', exact: true })).toHaveCount(0);
  await core.getByRole('button', { name: '筛选习惯', exact: true }).click();
  await page.getByRole('button', { name: '习惯完成状态：进行中', exact: true }).click();
  await page.getByRole('dialog', { name: '筛选习惯', exact: true }).getByRole('button', { name: /^筛选 \d+ 个习惯$/ }).click();
  await expect(core.getByRole('button', { name: '筛选习惯', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await core.getByRole('button', { name: '筛选习惯', exact: true }).click();
  await page.getByRole('button', { name: '习惯完成状态：进行中', exact: true }).click();
  await page.getByRole('dialog', { name: '筛选习惯', exact: true }).getByRole('button', { name: /^筛选 \d+ 个习惯$/ }).click();
  await expect(core.locator('.daily-neglected .daily-suggestion-title')).toHaveText([nextTitle, '打开窗透一会儿气']);
  await expect(core.locator('.habit-progress')).toHaveCount(34);
  await expect(nearCard().locator('.habit-progress-total')).toHaveText('2 天');
  await expect(nearCard().locator('.habit-progress-streak')).toHaveText('0 天');
  await expect.poll(() => core.locator('.habit-progress img').evaluateAll(nodes => nodes.every(node => node.complete && node.naturalWidth > 0))).toBe(true);
  expect(await grid().locator('.daily-suggestion').evaluateAll(nodes => new Set(nodes.map(node => getComputedStyle(node).backgroundColor)).size)).toBe(1);
  await expect.poll(() => page.locator('.habit-icon').evaluateAll(nodes => nodes.every(node => node.complete && node.naturalWidth === 192))).toBe(true);
  await page.waitForTimeout(250);
  const layout = await page.evaluate(() => {
    const box = node => { const rect = node.getBoundingClientRect(); return { x: rect.x, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }; };
    const viewport = box(document.querySelector('.preview-content'));
    const core = box(document.querySelector('#page-core'));
    const scroll = document.querySelector('.daily-time-period-section[data-time-period="free"] .daily-time-period-scroll') || document.querySelector('.daily-habit-scroll'), grid = box(scroll);
    const cards = [...scroll.querySelectorAll('.daily-suggestion')].map(node => ({ box: box(node), title: box(node.querySelector('.daily-suggestion-title')), overflow: node.scrollWidth - node.clientWidth }));
    return { core, viewport, grid, contentHeight: scroll.scrollHeight, cards, neglected: box(document.querySelector('.daily-neglected')), overflow: document.querySelector('.page-scroll').scrollWidth - document.querySelector('.page-scroll').clientWidth };
  });
  expect(Math.abs(layout.core.height - layout.viewport.height), JSON.stringify(layout)).toBeLessThanOrEqual(2);
  await expect(page.locator('#page-more')).toHaveCount(0);
  await expect(page.locator('.screen-return-hint')).toHaveCount(0);
  expect(layout.overflow).toBeLessThanOrEqual(2);
  expect(layout.contentHeight, 'The long habit list keeps internal scrolling with compact cards').toBeGreaterThan(layout.grid.height);
  expect(layout.cards.filter(card => card.box.top >= layout.grid.top - 1 && card.box.bottom <= layout.grid.bottom + 1).length, 'The free window keeps a complete two-card row visible').toBeGreaterThanOrEqual(2);
  expect(layout.neglected.top).toBeGreaterThan(layout.grid.bottom);
  expect(layout.neglected.bottom).toBeLessThanOrEqual(layout.viewport.bottom);
  for (const [index, card] of layout.cards.entries()) {
    expect(Math.abs(card.box.x - layout.cards[index % 2].box.x), JSON.stringify(card)).toBeLessThan(1);
    expect(Math.abs(card.box.width - layout.cards[0].box.width), JSON.stringify(card)).toBeLessThan(1);
    expect(card.title.top, JSON.stringify(card)).toBeGreaterThanOrEqual(card.box.top - 1);
    expect(card.title.bottom, JSON.stringify(card)).toBeLessThanOrEqual(card.box.bottom + 1);
    expect(card.overflow).toBeLessThanOrEqual(2);
  }
  await page.screenshot({ path: path.join(out, `daily-habit-grid-${width}.png`) });
  await nearCard().locator('.daily-suggestion-open').click();
  await expect(page.locator('.daily-detail-title')).toHaveText(nearTitle);
  const detailCalendar = page.locator('.daily-detail-sheet .habit-calendar');
  await expect(detailCalendar).toBeVisible();
  await expect(detailCalendar.locator('.habit-calendar-stat-number')).toHaveText(['2天', '2天', '7%', '0天']);
  await expect(detailCalendar.locator('.habit-calendar-day')).toHaveCount(42);
  await expect(detailCalendar.locator('.habit-calendar-day.is-today')).toContainText('15');
  await checkHabitCore({ page, sheetSelector: '.daily-detail-sheet', footerSelector: '.daily-detail-actions', phase: 'initial open, zero safe area', width, expect });
  await expect(detailCalendar.locator('.habit-calendar-log')).toHaveCount(1);
  await expect(detailCalendar.locator('.habit-calendar-log-toggle')).toHaveCount(0);
  await expect(detailCalendar.locator('.habit-calendar-log-heading')).toContainText('月打卡日志');
  await expect(detailCalendar.locator('.habit-calendar-log-text')).toHaveText([recentLine]);
  await expect(detailCalendar.locator('button.habit-calendar-day'), 'Detail dates support check-ins; statistics stay read-only').toHaveCount(42);
  const beforeCalendarNavigation = await localState();
  await detailCalendar.getByRole('button', { name: '查看上个月打卡', exact: true }).click();
  await expect(detailCalendar.locator('.habit-calendar-month')).toHaveText('2026年8月');
  await expect(detailCalendar.locator('.habit-calendar-log-empty')).toBeVisible();
  await detailCalendar.getByRole('button', { name: '回到本月打卡', exact: true }).click();
  await expect(detailCalendar.locator('.habit-calendar-month')).toHaveText('2026年9月');
  await expect(detailCalendar.getByRole('button', { name: '查看下个月打卡', exact: true })).toBeDisabled();
  await checkHabitCore({ page, sheetSelector: '.daily-detail-sheet', footerSelector: '.daily-detail-actions', phase: 'returned to this month', width, expect });
  expect(await localState(), 'Viewing or changing the calendar month preserves the original check-ins and notes').toEqual(beforeCalendarNavigation);
  await expect(page.locator('.daily-detail-actions .daily-check-primary')).toBeInViewport();
  const detailLayout = await page.locator('.daily-detail-sheet').evaluate(node => {
    const box = node.getBoundingClientRect(), viewport = document.querySelector('.preview-content').getBoundingClientRect();
    const scroll = node.querySelector('.daily-detail-scroll').getBoundingClientRect(), actions = node.querySelector('.daily-detail-actions').getBoundingClientRect();
    return { top: box.top - viewport.top, bottom: box.bottom - viewport.bottom, scrollBottom: scroll.bottom, actionsTop: actions.top, overflow: node.scrollWidth - node.clientWidth };
  });
  expect(detailLayout.top, `${width}: habit detail avoids the native header`).toBeGreaterThanOrEqual(-2);
  expect(detailLayout.bottom, `${width}: habit detail fits the visible page`).toBeLessThanOrEqual(2);
  expect(detailLayout.scrollBottom, `${width}: calendar scroll does not overlap fixed actions`).toBeLessThanOrEqual(detailLayout.actionsTop + 2);
  expect(await page.locator('.daily-detail-sheet').evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(2);
  await page.screenshot({ path: path.join(out, `daily-detail-calendar-${width}.png`) });
  await page.locator('.daily-editor-overlay > .sheet-backdrop').click({ position: { x: 8, y: 6 } });
  await expect(page.locator('.daily-detail-sheet')).toHaveCount(0);
  expect(await localState(), 'Dismissing habit details does not change check-ins or notes').toEqual(beforeCalendarNavigation);
  await page.evaluate(() => { location.hash = '#/pages/statistics/index?panel=habits'; });
  await page.getByRole('button', { name: `查看${nearTitle}统计`, exact: true }).click();
  const calendar = page.locator('.habit-calendar');
  await expect(calendar.locator('.habit-calendar-stat-number')).toHaveText(['2天', '2天', '7%', '0天']);
  await expect(calendar.locator('.habit-calendar-stat-label')).toHaveText(['月打卡', '总打卡', '月完成率', '当前连续']);
  await expect(calendar.locator('.habit-calendar-weekdays > *')).toHaveText(['日', '一', '二', '三', '四', '五', '六']);
  await expect(calendar.locator('.habit-calendar-day')).toHaveCount(42);
  await expect(calendar.locator('.habit-calendar-day.is-today')).toContainText('15');
  await expect(calendar.locator('.habit-calendar-day.is-completed')).toHaveCount(2);
  await expect(calendar.locator('.habit-calendar-log-row')).toHaveCount(1);
  await expect(calendar.locator('.habit-calendar-log-text').first()).toHaveText(recentLine);
  await expect(calendar.getByRole('button', { name: '查看下个月打卡', exact: true })).toBeDisabled();
  await calendar.getByRole('button', { name: '查看上个月打卡', exact: true }).click();
  await expect(calendar.locator('.habit-calendar-month')).toHaveText('2026年8月');
  await expect(calendar.locator('.habit-calendar-stat-number')).toHaveText(['0天', '2天', '0%', '0天']);
  await expect(calendar.locator('.habit-calendar-log-empty')).toBeVisible();
  await calendar.getByRole('button', { name: '回到本月打卡', exact: true }).click();
  await expect(calendar.locator('.habit-calendar-month')).toHaveText('2026年9月');
  expect(await page.locator('.statistics-habits').evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(2);
  await page.screenshot({ path: path.join(out, `statistics-habit-calendar-${width}.png`) });
  await page.evaluate(() => { location.hash = '#/pages/daily/index'; });
  await expect(grid()).toBeVisible();
  const initialOrder = await order();
  const outerTop = await page.locator('.page-scroll').evaluate(node => node.scrollTop);
  const neglectedTop = (await core.locator('.daily-neglected').boundingBox()).y;
  await scrollPane().evaluate(node => { node.scrollTop = node.clientHeight; node.dispatchEvent(new Event('scroll')); });
  await expect.poll(() => scrollPane().evaluate(node => node.scrollTop)).toBeGreaterThan(100);
  expect(await page.locator('.page-scroll').evaluate(node => node.scrollTop)).toBe(outerTop);
  expect((await core.locator('.daily-neglected').boundingBox()).y).toBe(neglectedTop);
  await categories.getByRole('button', { name: '心理', exact: true }).click();
  const learningOrder = await order();
  expect(learningOrder[0]).toBe('old1');
  expect(learningOrder).toContain('old2');
  expect(learningOrder).not.toContain('near');
  expect(await scrollPane().evaluate(node => node.scrollTop)).toBe(0);
  await drag('old1', 'old2');
  await expect.poll(async () => (await localState()).sort?.field).toBe('custom');
  await expect.poll(async () => (await order()).slice(0, 2)).toEqual(['old2', 'old1']);
  const savedIds = (await localState()).items.map(row => row.id);
  expect(savedIds.filter(id => !learningOrder.includes(id))).toEqual(initialOrder.filter(id => !learningOrder.includes(id)).concat('paused'));
  await drag('old1', 'old2');
  await categories.getByRole('button', { name: '全部', exact: true }).click();
  expect(await order()).toEqual(initialOrder);
  await drag('old1', 'old3');
  await expect.poll(async () => (await order()).slice(0, 3)).toEqual(['old2', 'old3', 'old1']);
  await page.evaluate(() => { location.hash = '#/pages/index/index'; });
  await expect(page.locator('.today-grid')).toBeVisible();
  await expect(page.getByRole('button', { name: '排序快捷方式', exact: true })).toHaveCount(1);
  await page.evaluate(() => { location.hash = '#/pages/daily/index'; });
  await expect.poll(async () => (await order()).slice(0, 3)).toEqual(['old2', 'old3', 'old1']);
  await drag('old1', 'old2');
  expect(await order()).toEqual(initialOrder);
  await drag('old1', 'old3', 'touchcancel');
  expect(await order()).toEqual(initialOrder);
  const tile = grid().locator('#habit-sort-old1');
  const tileBox = await tile.boundingBox(), gridBox = await scrollPane().boundingBox();
  const initiallyVisibleIds = await scrollPane().locator('.habit-sort-tile').evaluateAll(nodes => {
    const viewport = nodes[0].closest('.daily-time-period-scroll,.daily-habit-scroll').getBoundingClientRect();
    return nodes.filter(node => { const box = node.getBoundingClientRect(); return box.top < viewport.bottom && box.bottom > viewport.top; }).map(node => node.id);
  });
  const touch = { identifier: 1, clientX: tileBox.x + tileBox.width / 2, clientY: tileBox.y + tileBox.height / 2 };
  await tile.dispatchEvent('touchstart', { touches: [touch] });
  await page.clock.runFor(450);
  await expect(tile).toHaveClass(/is-dragging/);
  const edgePoint = { ...touch, clientY: gridBox.y + gridBox.height - 5 };
  await tile.dispatchEvent('touchmove', { touches: [edgePoint] });
  await page.clock.runFor(1000);
  await expect.poll(() => scrollPane().evaluate(node => node.scrollTop)).toBeGreaterThan(gridBox.height / 2);
  expect(await page.locator('.page-scroll').evaluate(node => node.scrollTop)).toBe(outerTop);
  const dropId = await grid().locator('.is-drop-target').getAttribute('id');
  const targetIndex = initialOrder.indexOf(dropId.slice('habit-sort-'.length));
  expect(initiallyVisibleIds, 'Edge scrolling reaches a target that began outside the list window').not.toContain(dropId);
  expect(targetIndex).toBeGreaterThan(0);
  await tile.dispatchEvent('touchend', { touches: [], changedTouches: [edgePoint] });
  await expect.poll(async () => (await order())[targetIndex]).toBe('old1');
  await expect.poll(async () => (await localState()).items[targetIndex].id).toBe('old1');
  await page.clock.runFor(450);
  await scrollPane().evaluate(node => { node.scrollTop = 0; node.dispatchEvent(new Event('scroll')); });

  // Completion shows the least recently seen line across every habit, and is
  // committed before the optional new line is submitted.
  const before = await openings();
  // Two native taps can arrive before the first render removes this card.
  // Dispatch synchronously to the original element to exercise that race.
  await nearCard().locator('.daily-suggestion-check').evaluate(button => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await expect(core.locator('.daily-progress-number')).toHaveCount(0);
  await expect(page.locator('.daily-reflection-sheet')).toBeVisible();
  await expect(page.locator('.daily-reflection-sheet').getByRole('button')).toHaveCount(2);
  await expect(page.locator('.daily-reflection-done')).toHaveText('完成');
  await expect(page.locator('.daily-reflection-success')).toHaveText('已完成');
  const completionRow = await page.locator('.daily-reflection-habit').evaluate(row => {
    const box = selector => { const rect = row.querySelector(selector).getBoundingClientRect(); return { left: rect.left, right: rect.right, centerY: (rect.top + rect.bottom) / 2 }; };
    const sheet = row.closest('.daily-reflection-sheet');
    const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const surface = luminance(getComputedStyle(sheet).backgroundColor);
    const contrast = element => { const ink = luminance(getComputedStyle(element).color); return (Math.max(surface, ink) + .05) / (Math.min(surface, ink) + .05); };
    return { icon: box('.daily-reflection-icon'), title: box('.daily-reflection-title'), status: box('.daily-reflection-success'), headingContrast: contrast(sheet.querySelector('.editor-heading-title')), titleContrast: contrast(row.querySelector('.daily-reflection-title')) };
  });
  expect(completionRow.headingContrast, 'The shared heading stays readable on the habit tint').toBeGreaterThanOrEqual(4.5);
  expect(completionRow.titleContrast, 'The shared entity name stays readable on the habit tint').toBeGreaterThanOrEqual(4.5);
  expect(completionRow.status.left, JSON.stringify(completionRow)).toBeGreaterThanOrEqual(completionRow.title.right - 1);
  expect(Math.abs(completionRow.status.centerY - completionRow.icon.centerY), JSON.stringify(completionRow)).toBeLessThanOrEqual(2);
  await expect(page.locator('.daily-reflection-quote')).toContainText(olderLine);
  expect((await localState()).done[today]).toEqual(['near']);
  expect(await openings()).toEqual(before);
  await page.getByRole('textbox', { name: '打卡的一句话', exact: true }).fill(savedLine);
  await page.screenshot({ path: path.join(out, `daily-check-in-note-${width}.png`) });
  const beforeReflectionSave = await localState();
  await page.getByRole('button', { name: '关闭打卡留言', exact: true }).click();
  await expect(closePrompt()).toBeVisible(); await closePrompt().getByRole('button', { name: '继续编辑', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '打卡的一句话', exact: true })).toHaveValue(savedLine);
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['reminders']; });
  await page.getByRole('button', { name: '关闭打卡留言', exact: true }).click();
  await closePrompt().getByRole('button', { name: '保存', exact: true }).click();
  await expect(closePrompt()).toHaveCount(0); await expect(page.locator('.daily-reflection-sheet')).toBeVisible();
  await expect(page.locator('.daily-reflection-error')).toContainText('还没保存');
  await expect(page.getByRole('textbox', { name: '打卡的一句话', exact: true })).toHaveValue(savedLine);
  expect(await localState(), 'Failed close-save preserves the saved check-in and original reflections').toEqual(beforeReflectionSave);
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
  await page.getByRole('button', { name: '关闭打卡留言', exact: true }).click();
  await closePrompt().getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.locator('.daily-reflection-sheet')).toHaveCount(0);
  await expect(page.locator('.app-message')).toHaveCount(0);
  await expect(core.locator('.daily-page-toolbar .page-toolbar-summary-recent')).toHaveText(nearTitle);
  await expect(core.locator('.daily-page-toolbar .page-toolbar-summary-count')).toHaveText('今日完成 1');
  await expect(nearCard()).toHaveCount(0);
  await habitFilter.select('全部');
  await expect(nearCard()).toHaveClass(/is-done/);
  await expect(nearCard().locator('.habit-progress-total')).toHaveText('3 天');
  await expect(nearCard().locator('.habit-progress-streak')).toHaveText('1 天');
  expect(await core.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(2);
  await page.screenshot({ path: path.join(out, `daily-completed-feedback-${width}.png`) });
  const afterNote = await localState();
  expect(afterNote.reflections).toHaveLength(3);
  expect(afterNote.reflections.find(note => note.day === today).text).toBe(savedLine);
  expect(afterNote.reflections.find(note => note.id === 'memo-old').lastShownAt).toBeGreaterThan(afterNote.reflections.find(note => note.id === 'memo-recent').lastShownAt);
  expect(afterNote.done[today]).toEqual(['near']);
  await nearCard().locator('.daily-suggestion-open').click();
  await expect(detailCalendar.locator('.habit-calendar-stat-number')).toHaveText(['3天', '3天', '10%', '1天']);
  await expect(detailCalendar.locator(`.habit-calendar-day[aria-label^="${today} "]`)).toHaveClass(/is-completed/);
  await expect(detailCalendar.locator('.habit-calendar-log-toggle')).toHaveCount(0);
  await expect(detailCalendar.locator('.habit-calendar-log-text').first()).toHaveText(savedLine);
  await page.getByRole('button', { name: '关闭习惯详情', exact: true }).click();
  await checkStatistics({ title: nearTitle, days: 3, streak: 1, completed: 1 });
  await page.evaluate(() => { location.hash = '#/pages/index/index'; });
  await expect(page.locator('.today-grid')).toBeVisible();
  await page.evaluate(() => { location.hash = '#/pages/daily/index'; });
  await habitFilter.select('全部');
  await expect(nearCard()).toHaveClass(/is-done/);
  expect(await localState()).toEqual(afterNote);

  // Undo removes only that check-in's note; repeating rotates to the older unseen memory.
  await expect(core.locator('.daily-habit-scroll .daily-suggestion')).toHaveCount(33);
  await expect(nearCard()).toHaveClass(/is-done/);
  await expect(nearCard().locator('.daily-suggestion-check')).toHaveAttribute('aria-pressed', 'true');
  await nearCard().scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, `daily-completed-list-${width}.png`) });
  await nearCard().locator('.daily-suggestion-check').click();
  await expect(nearCard()).not.toHaveClass(/is-done/);
  await expect(nearCard().locator('.daily-suggestion-check')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.daily-reflection-sheet')).toHaveCount(0);
  expect((await localState()).reflections).toHaveLength(2);
  await nearCard().locator('.daily-suggestion-open').click();
  await expect(detailCalendar.locator('.habit-calendar-stat-number')).toHaveText(['2天', '2天', '7%', '0天']);
  await expect(detailCalendar.locator(`.habit-calendar-day[aria-label^="${today} "]`)).not.toHaveClass(/is-completed/);
  await expect(detailCalendar.locator('.habit-calendar-log-toggle')).toHaveCount(0);
  await expect(detailCalendar.locator('.habit-calendar-log')).not.toContainText(savedLine);
  await page.getByRole('button', { name: '关闭习惯详情', exact: true }).click();
  await nearCard().locator('.daily-suggestion-check').click();
  await expect(page.locator('.daily-reflection-quote')).toContainText(recentLine);
  const beforeDismiss = await localState();
  await page.locator('.daily-reflection-sheet .daily-reflection-title').click();
  await expect(page.locator('.daily-reflection-sheet')).toBeVisible();
  await page.getByRole('textbox', { name: '打卡的一句话', exact: true }).fill('这句话不保存');
  await page.locator('.daily-reflection-overlay > .sheet-backdrop').click({ position: { x: 8, y: 6 } });
  await expect(closePrompt()).toBeVisible(); await closePrompt().getByRole('button', { name: '继续编辑', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '打卡的一句话', exact: true })).toHaveValue('这句话不保存');
  await page.getByRole('button', { name: '关闭打卡留言', exact: true }).click();
  await closePrompt().getByRole('button', { name: '不保存', exact: true }).click();
  await expect(page.locator('.daily-reflection-sheet')).toHaveCount(0);
  expect(await localState(), 'Discarding the reflection preserves the completed check-in and existing reflections').toEqual(beforeDismiss);
  await expect(nearCard().locator('.daily-suggestion-check')).toHaveAttribute('aria-pressed', 'true');
  expect((await localState()).done[today]).toEqual(['near']);

  // Opening details records a time separately; keyboard confirmation also saves
  // the optional line and completes the one-button flow.
  const beforeNextOpening = await openings();
  await grid().getByRole('button', { name: `查看习惯：${nextTitle}`, exact: true }).click();
  await expect(page.locator('.daily-detail-title')).toHaveText(nextTitle);
  await expect(page.locator('.daily-detail-art .habit-icon')).toBeVisible();
  const withOpening = await openings();
  expect(withOpening.opened.next.length).toBe(before.opened.next.length + 1);
  expect(withOpening.opened.near).toEqual(beforeNextOpening.opened.near);
  await page.screenshot({ path: path.join(out, `daily-habit-detail-${width}.png`) });
  await page.locator('.daily-check-primary').click();
  await expect(page.locator('.daily-reflection-sheet').getByRole('button')).toHaveCount(2);
  const keyboardLine = '慢慢伸展开，肩膀轻了一点。';
  await page.getByRole('textbox', { name: '打卡的一句话', exact: true }).fill(keyboardLine);
  await page.getByRole('textbox', { name: '打卡的一句话', exact: true }).press('Enter');
  await expect(page.locator('.daily-reflection-sheet')).toHaveCount(0);
  expect((await localState()).reflections.find(note => note.habitId === 'next' && note.day === today).text).toBe(keyboardLine);
  await expect(page.locator('.daily-detail-sheet')).toHaveCount(0);
  await checkStatistics({ completed: 2 });
  await expect(core.locator('.daily-neglected .daily-suggestion-title')).toHaveText(['打开窗透一会儿气', '起身给自己倒一杯温水']);
  await coreCard(nextTitle).locator('.daily-suggestion-check').click();
  await expect(coreCard(nextTitle)).not.toHaveClass(/is-done/);
  expect((await localState()).done[today]).toEqual(['near']);

  const createHabit = core.locator('.daily-create');
  await expect(createHabit).toHaveClass(/create-button/);
  await expect(createHabit.locator('.create-button-label')).toHaveText('创建习惯');
  await expect(createHabit.locator('.button-add-symbol')).toHaveAttribute('aria-hidden', 'true');
  const createLayout = await createHabit.evaluate(node => {
    const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height }; };
    const label = node.querySelector('.create-button-label');
    return { button: box(node), symbol: box(node.querySelector('.button-add-symbol')), label: box(label), clipped: label.scrollWidth - label.clientWidth };
  });
  expect(createLayout.button.height, 'The habit creation entry retains a 40px touch target').toBeGreaterThanOrEqual(40);
  expect(createLayout.symbol.right).toBeLessThanOrEqual(createLayout.label.left);
  expect(createLayout.symbol.height).toBeGreaterThan(0);
  expect(createLayout.clipped).toBeLessThanOrEqual(1);
  for (const part of [createLayout.symbol, createLayout.label]) {
    expect(part.left).toBeGreaterThanOrEqual(createLayout.button.left - 1);
    expect(part.right).toBeLessThanOrEqual(createLayout.button.right + 1);
    expect(part.top).toBeGreaterThanOrEqual(createLayout.button.top - 1);
    expect(part.bottom).toBeLessThanOrEqual(createLayout.button.bottom + 1);
  }
  await createHabit.click();
  await expect(page.locator('.daily-sheet-title')).toHaveText('创建习惯');
  await expect(page.getByPlaceholder('想多做什么？', { exact: true })).toBeVisible();
  await expect(page.locator('.daily-editor-sheet')).not.toContainText('A LITTLE EVERY DAY');
  await expect(page.locator('.daily-editor-sheet')).not.toContainText('一件新的小事');
  await expect(page.locator('.daily-editor-sheet .daily-field-label').filter({ hasText: '提醒自己的话' })).toHaveCount(0);
  await expect(page.locator('.daily-editor-sheet')).not.toContainText('可选');
  await expect(page.locator('.daily-editor-footer .ui-button-primary')).toBeDisabled();
  await expect(page.locator('.daily-editor-footer .ui-button-primary')).toHaveText('创建习惯');
  await expect(editor().getByRole('button', { name: '删除习惯', exact: true })).toHaveCount(0);
  await checkEditorLayout();
  await checkPriority('无');
  await expect(editor().getByRole('spinbutton', { name: '专注分钟', exact: true }), 'The fixture most often uses zero focus minutes').toHaveCount(0);
  await chooseDomain('工作');
  await chooseDomain('心理');
  await page.getByPlaceholder('想多做什么？', { exact: true }).fill('睡前读两页书');
  await choosePriority('高');
  await page.screenshot({ path: path.join(out, `daily-create-habit-${width}.png`) });
  await page.locator('.daily-editor-footer .ui-button-primary').click();
  await expect(page.locator('.daily-editor-sheet')).toHaveCount(0);
  expect((await localState()).items.some(item => item.title === '睡前读两页书')).toBe(true);
  const newlyCreated = (await localState()).items.find(item => item.title === '睡前读两页书');
  expect(newlyCreated.priority).toBe('high');
  expect(newlyCreated.createdAt).toBeGreaterThan(0);
  expect(newlyCreated.domainId).toBe('mind');
  expect(newlyCreated.note, 'Removing the optional label does not make notes required').toBe('');
  expect(newlyCreated.timePeriod).toBe('night');
  await grid().getByRole('button', { name: '习惯时段分类：晚上', exact: true }).click();
  await expect(coreCard('睡前读两页书')).toHaveCount(1);
  expect((await localState()).sort.field, 'Creating a high-priority habit retains custom sorting').toBe('custom');
  await checkStatistics({ completed: 1, restoreDay: today });
  await expect(page.locator('.daily-history-sheet')).toHaveCount(0);
  const pastDay = () => page.locator('.daily-detail-sheet .habit-calendar-day[aria-label^="2026-09-14 "]');
  await pastDay().click();
  await expect(pastDay()).toHaveClass(/is-completed/);
  await checkStatistics({ title: '打开那本一直想读的书', days: 2, streak: 1, markedDay: '2026-09-14', marked: true, restoreDay: '2026-09-14' });
  expect((await localState()).done['2026-09-14']).toEqual(['old1']);
  expect((await localState()).done[today]).toEqual(['near']);
  await pastDay().click();
  await expect(pastDay()).not.toHaveClass(/is-completed/);
  await checkStatistics({ title: '打开那本一直想读的书', days: 1, streak: 0, markedDay: '2026-09-14', marked: false, restoreDay: '2026-09-14' });
  await page.getByRole('button', { name: '关闭习惯详情', exact: true }).click();
  await expect(page.getByRole('button', { name: '管理', exact: true })).toHaveCount(0);
  await grid().getByRole('button', { name: '习惯时段分类：晚上', exact: true }).click();
  const created = coreCard('睡前读两页书');
  await created.getByRole('button', { name: '查看习惯：睡前读两页书', exact: true }).click();
  await page.locator('.daily-detail-sheet').getByRole('button', { name: '编辑习惯', exact: true }).click();
  await expect(page.locator('.daily-sheet-title')).toHaveText('编辑习惯');
  await expect(page.locator('.daily-editor-footer .ui-button-primary')).toHaveText('保存');
  await expect(page.locator('.daily-editor-sheet')).not.toContainText('可选');
  await expect(page.getByRole('textbox', { name: '提醒自己的话', exact: true })).toHaveValue('');
  await checkEditorLayout();
  await checkPriority('高');
  await expect(editor().getByRole('spinbutton', { name: '专注分钟', exact: true })).toHaveCount(0);
  await page.getByPlaceholder('想多做什么？', { exact: true }).fill('睡前读三页书');
  await choosePriority('低');
  await page.locator('.daily-editor-footer .ui-button-primary').click();
  await expect(coreCard('睡前读三页书')).toHaveCount(1);
  const editedHabit = (await localState()).items.find(item => item.title === '睡前读三页书');
  expect(editedHabit.priority).toBe('low');
  expect(editedHabit.createdAt).toBe(newlyCreated.createdAt);
  expect(editedHabit.note).toBe('');
  await page.screenshot({ path: path.join(out, `daily-habit-management-${width}.png`) });
  expect(await openings()).toMatchObject(withOpening);
  expect((await localState()).reflections.map(note => note.text)).toEqual([olderLine, recentLine]);

  // Cold start keeps independent free/timed lists and two never-checked reminders.
  // The preview persists these two tools in localStorage across document loads.
  // Reset only this fixture's guest caches before either tool can read them.
  await page.goto(`${origin}/?daily-cold-${width}#/pages/posts/index`);
  await page.evaluate(() => {
    localStorage.removeItem('ottlog-mini-tool-v1:guest:reminders');
    localStorage.removeItem('ottlog-mini-tool-v1:guest:domains');
    location.hash = '#/pages/daily/index';
  });
  await expect(core.locator('.daily-time-period-section')).toHaveCount(2);
  await core.getByRole('button', { name: '习惯时段分类：上午', exact: true }).click();
  await expect(core.locator('.daily-time-period-section[data-time-period="morning"] .daily-suggestion-title').first()).toHaveText('早上刷牙');
  await expect(core.locator('.daily-neglected .section-title')).toHaveText('提醒');
  await expect(core.locator('.daily-neglected .daily-suggestion')).toHaveCount(2);
  await expect(core).not.toContainText('有 3 天的打开记录后');
  await expect(core.locator('.daily-suggestion-metadata,.daily-suggestion-time-period,.daily-suggestion-recency')).toHaveCount(0);
  await expect(core.locator('.daily-habit-scroll .daily-suggestion').first().locator('.habit-progress-total')).toHaveText('0 天');
  await expect(core.locator('.daily-habit-scroll .daily-suggestion').first().locator('.habit-progress-streak')).toHaveText('0 天');
  const coldHabit = await core.locator('.daily-suggestion-title').first().textContent();
  await checkStatistics({ title: coldHabit, days: 0, streak: 0, completed: 0 });
  const exerciseCard = title => grid().locator('.daily-suggestion').filter({ has: page.locator('.daily-suggestion-title', { hasText: new RegExp(`^${title}$`) }) });
  const afternoon = () => grid().getByRole('button', { name: '习惯时段分类：下午', exact: true }).click();
  await habitFilter.select('全部');
  await afternoon();
  const storedReminders = () => page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:reminders'))?.data);
  for (const title of ['力量训练', '有氧运动']) {
    await expect(exerciseCard(title)).toHaveCount(1);
    await expect(exerciseCard(title)).not.toHaveClass(/is-done/);
    await expect(exerciseCard(title).locator('.habit-progress-total')).toHaveText('0 天');
  }
  await expect(grid().locator('.daily-suggestion-title').filter({ hasText: '力量训练 / 有氧运动' })).toHaveCount(0);
  await page.screenshot({ path: path.join(out, `daily-cold-start-${width}.png`) });

  // The two defaults own distinct IDs, check-ins and histories. Checking strength
  // training cannot create a cardio completion, including after a document reload.
  await exerciseCard('力量训练').locator('.daily-suggestion-check').click();
  await finishWithoutReflection();
  const afterStrength = await storedReminders();
  const strength = afterStrength.items.find(item => item.title === '力量训练');
  const cardio = afterStrength.items.find(item => item.title === '有氧运动');
  expect(strength.id).toBe('exercise');
  expect(cardio.id).toBe('cardio');
  expect(cardio.domainId).toBe(strength.domainId);
  expect(afterStrength.done[today]).toEqual(['exercise']);
  expect(afterStrength.completionHistory.exercise).toHaveLength(1);
  expect(afterStrength.completionHistory).not.toHaveProperty('cardio');
  expect(afterStrength.reflections).toEqual([]);
  await expect(exerciseCard('力量训练').locator('.habit-progress-total')).toHaveText('1 天');
  await expect(exerciseCard('有氧运动').locator('.habit-progress-total')).toHaveText('0 天');
  await expect(exerciseCard('有氧运动')).not.toHaveClass(/is-done/);

  await exerciseCard('有氧运动').locator('.daily-suggestion-check').click();
  await finishWithoutReflection();
  expect((await storedReminders()).done[today]).toEqual(['exercise', 'cardio']);
  await exerciseCard('力量训练').locator('.daily-suggestion-check').click();
  const cardioOnly = await storedReminders();
  expect(cardioOnly.done[today]).toEqual(['cardio']);
  expect(cardioOnly.completionHistory).not.toHaveProperty('exercise');
  expect(cardioOnly.completionHistory.cardio).toHaveLength(1);
  await page.reload();
  await habitFilter.select('全部');
  await afternoon();
  await expect(exerciseCard('力量训练')).not.toHaveClass(/is-done/);
  await expect(exerciseCard('有氧运动')).toHaveClass(/is-done/);
  await expect(exerciseCard('力量训练').locator('.habit-progress-total')).toHaveText('0 天');
  await expect(exerciseCard('有氧运动').locator('.habit-progress-total')).toHaveText('1 天');
  expect(await storedReminders()).toEqual(cardioOnly);
  for (const id of ['exercise', 'cardio']) expect(cardioOnly.items.filter(item => item.id === id)).toHaveLength(1);
  await page.screenshot({ path: path.join(out, `daily-exercise-split-${width}.png`) });

  // The focus picker links the original shared reminder instead of making a copy.
  await page.evaluate(() => { location.hash = '#/pages/pomodoro/index'; });
  const source = require('./pomodoro-source-controls.cjs')({ page, expect });
  for (const [title, id] of [['力量训练', 'exercise'], ['有氧运动', 'cardio']]) {
    await source.select('habit');
    for (const optionTitle of ['力量训练', '有氧运动']) await expect(page.getByRole('button', { name: `选择习惯：${optionTitle}`, exact: true })).toHaveCount(1);
    await page.getByRole('button', { name: `选择习惯：${title}`, exact: true }).click();
    await expect(page.locator('.focus-habit-sheet')).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: '正在做什么', exact: true })).toHaveValue(title);
    await page.locator('.focus-start').click();
    await expect.poll(() => page.evaluate(() => window.__miniFixture.pomodoroLocalState?.active?.selection.habitId)).toBe(id);
    await page.locator('.focus-start').click();
    await expect(page.locator('.focus-live')).toContainText('已暂停');
    await page.getByRole('button', { name: '结束', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__miniFixture.pomodoroLocalState?.active)).toBe(null);
  }
  expect(await storedReminders()).toEqual(cardioOnly);

  // Domain cards use these same IDs; completing one there updates only that
  // reminder when returning to the habit grid, and never copies the other history.
  await page.evaluate(id => { location.hash = `#/pages/domain-detail/index?id=${id}`; }, strength.domainId);
  const domainCard = title => page.locator('.domain-habit-card').filter({ has: page.locator('.daily-suggestion-title', { hasText: new RegExp(`^${title}$`) }) });
  await expect(domainCard('力量训练')).toHaveCount(1);
  await expect(domainCard('有氧运动')).toHaveClass(/is-done/);
  await domainCard('有氧运动').locator('.daily-suggestion-check').click();
  await expect(domainCard('有氧运动')).not.toHaveClass(/is-done/);
  expect((await storedReminders()).done[today]).toEqual([]);
  await domainCard('力量训练').locator('.daily-suggestion-check').click();
  await expect(domainCard('力量训练')).toHaveClass(/is-done/);
  expect((await storedReminders()).done[today]).toEqual(['exercise']);
  await page.evaluate(() => { location.hash = '#/pages/daily/index'; });
  await habitFilter.select('全部');
  await afternoon();
  await expect(exerciseCard('力量训练')).toHaveClass(/is-done/);
  await expect(exerciseCard('有氧运动')).not.toHaveClass(/is-done/);
  await expect(exerciseCard('有氧运动').locator('.habit-progress-total')).toHaveText('0 天');
  await exerciseCard('力量训练').locator('.daily-suggestion-check').click();
  expect((await storedReminders()).done[today]).toEqual([]);
  expect((await storedReminders()).completionHistory).toEqual({});
  expect((await storedReminders()).reflections).toEqual([]);

  // The single page keeps paused habits reachable and changes the original ID only.
  const beforePause = await storedReminders();
  await exerciseCard('力量训练').getByRole('button', { name: '查看习惯：力量训练', exact: true }).click();
  await expect(page.locator('.daily-detail-sheet').getByRole('button', { name: '归档习惯', exact: true })).toHaveCount(0);
  await page.locator('.daily-detail-sheet').getByRole('button', { name: '编辑习惯', exact: true }).click();
  await editor().getByRole('button', { name: '归档习惯', exact: true }).click();
  await editor().getByRole('button', { name: '关闭习惯编辑', exact: true }).click();
  await expect(page.locator('.daily-detail-sheet')).toHaveCount(0);
  const paused = await storedReminders();
  expect(paused.items).toEqual(beforePause.items.map(item => item.id === 'exercise' ? { ...item, enabled: false } : item));
  expect({ ...paused, items: [] }).toEqual({ ...beforePause, items: [] });
  await page.reload();
  await expect(exerciseCard('力量训练')).toHaveCount(0);
  await page.getByRole('button', { name: '筛选习惯', exact: true }).click();
  await page.getByRole('button', { name: '习惯完成状态：已归档', exact: true }).click();
  await page.getByRole('dialog', { name: '筛选习惯', exact: true }).getByRole('button', { name: /^筛选 \d+ 个习惯$/ }).click();
  await afternoon();
  await expect(exerciseCard('力量训练')).toContainText('力量训练');
  await expect(exerciseCard('力量训练').locator('.daily-suggestion-check')).toBeDisabled();
  await expect(core.getByRole('button', { name: '排序习惯', exact: true })).toBeEnabled();
  await exerciseCard('力量训练').getByRole('button', { name: '查看习惯：力量训练', exact: true }).click();
  await expect(page.locator('.daily-detail-sheet .daily-check-primary')).toBeDisabled();
  for (const date of await page.locator('.daily-detail-sheet button.habit-calendar-day').all()) await expect(date).toBeDisabled();
  await page.locator('.daily-detail-sheet').getByRole('button', { name: '编辑习惯', exact: true }).click();
  await editor().getByRole('button', { name: '恢复习惯', exact: true }).click();
  await editor().getByRole('button', { name: '关闭习惯编辑', exact: true }).click();
  expect(await storedReminders()).toEqual(beforePause);
  await page.getByRole('button', { name: '筛选习惯', exact: true }).click();
  await page.getByRole('button', { name: '习惯完成状态：进行中', exact: true }).click();
  await page.getByRole('dialog', { name: '筛选习惯', exact: true }).getByRole('button', { name: /^筛选 \d+ 个习惯$/ }).click();
  await expect(exerciseCard('力量训练')).toBeVisible();
  await expect(page.locator('#page-more')).toHaveCount(0);

  await page.evaluate(() => { location.hash = '#/pages/statistics/index?panel=habits'; });
  const statisticsCalendar = page.locator('.statistics-habits .habit-calendar');
  await expect(statisticsCalendar).toBeVisible();
  await expect(statisticsCalendar.locator('.habit-calendar-day')).toHaveCount(42);
  await statisticsCalendar.getByRole('button', { name: '查看上个月打卡', exact: true }).click();
  expect(await storedReminders(), 'Browsing statistics history never creates a check-in').toEqual(beforePause);
  await page.screenshot({ path: path.join(out, `daily-statistics-calendar-${width}.png`) });
  await page.evaluate(() => { location.hash = '#/pages/daily/index'; });
  await expect(page.locator('.daily-history-sheet')).toHaveCount(0);
  expect(await storedReminders(), 'Returning from statistics leaves original records unchanged').toEqual(beforePause);
};
