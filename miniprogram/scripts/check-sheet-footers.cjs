const path = require('node:path');
const schedule = require('./todo-schedule-test-helpers.cjs');
const checkHabitDetailLayout = require('./check-habit-detail-layout.cjs');
const habitFilterControls = require('./habit-filter-test-helpers.cjs');

// Exercise the reported gap with a simulated 34 px device inset, rather than
// letting headless Chromium's usual zero inset hide a doubled safe area.
module.exports = async function checkSheetFooters({ page, origin, out, width, expect, progressOnly = false }) {
  const habitFilter = habitFilterControls({ page, expect });
  const shortTitle = '提醒自己戒游戏';
  const longTitle = '提醒自己戒游戏并把注意力留给可以持续的小事'.repeat(4).slice(0, 60);
  const longNote = '把注意力还给自己，先做一件可以开始的小事。\n'.repeat(15).slice(0, 240);
  await page.clock.setFixedTime(new Date('2026-10-05T12:00:00'));
  await page.goto(`${origin}/?sheet-footers-${width}#/pages/posts/index`);
  await page.evaluate(({ shortTitle, longTitle, longNote }) => {
    document.documentElement.style.setProperty('--preview-safe-area-bottom', '34px');
    const ids = ['footer-habit', 'footer-habit-long'];
    const dates = Array.from({ length: 5 }, (_, index) => `2026-10-${String(index + 1).padStart(2, '0')}`);
    window.__miniFixture.guestToolStates = {
      todos: { version: 1, tasks: [], categories: [] },
      domains: { version: 1, domains: [{ id: 'footer-domain', name: '生活', iconId: 'home', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] }], completedGoals: [] },
      reminders: { version: 1, items: [
        { id: ids[0], title: shortTitle, note: '这一周之后，把注意力还给自己。看看还有什么想做的。', kind: 'unplug', group: '生活', domainId: 'footer-domain', minutes: 0, enabled: true, priority: 'high' },
        { id: ids[1], title: longTitle, note: longNote, kind: 'notes', group: '生活', domainId: 'footer-domain', minutes: 25, enabled: true, priority: 'none' },
      ], done: Object.fromEntries(dates.map(day => [day, ids])), reflections: ids.flatMap(habitId => dates.map((day, index) => ({
        id: `${habitId}-reflection-${index}`, habitId, day,
        text: index === 0 ? '月初记录：从一件能够开始的小事继续。' : '今天重新找回了一点自己的节奏。',
        createdAt: new Date(`${day}T10:00:00`).getTime(),
      }))) },
    };
    location.hash = '#/pages/todos/index';
  }, { shortTitle, longTitle, longNote });
  const businessState = () => page.evaluate(() => Object.fromEntries(['todos', 'domains', 'reminders'].map(key => [key,
    window.__miniFixture[`${key === 'reminders' ? 'reminder' : key === 'domains' ? 'domain' : 'todo'}LocalState`] || window.__miniFixture.guestToolStates[key],
  ])));
  const businessBefore = await businessState();

  async function checkFooter(selector, nativeTabBar) {
    const footer = page.locator(selector);
    await expect(footer).toBeVisible();
    const geometry = await footer.evaluate(node => {
      const rect = node.getBoundingClientRect(), sheet = node.parentElement.getBoundingClientRect(), viewport = document.querySelector('.preview-content').getBoundingClientRect();
      const style = getComputedStyle(node), buttons = [...node.querySelectorAll('button')].map(button => button.getBoundingClientRect());
      return { pad: parseFloat(style.paddingBottom), gap: sheet.bottom - Math.max(...buttons.map(button => button.bottom)), bottom: rect.bottom - viewport.bottom, sheetGap: sheet.bottom - rect.bottom, buttonHeight: Math.min(...buttons.map(button => button.height)), scrollBottom: node.parentElement.querySelector('[class$="-scroll"]')?.getBoundingClientRect().bottom, top: rect.top };
    });
    const expectedGap = nativeTabBar ? 8 : 34;
    expect(geometry.pad, `${width} ${selector}: safe area is reserved only by its owner`).toBeCloseTo(expectedGap, 0);
    expect(geometry.gap, `${width} ${selector}: buttons end near the page edge`).toBeCloseTo(expectedGap, 0);
    expect(Math.abs(geometry.bottom), `${width} ${selector}: footer ends at the visible page edge`).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.sheetGap), 'No parent padding adds a second bottom gap').toBeLessThanOrEqual(2);
    expect(geometry.buttonHeight, 'Touch targets remain usable').toBeGreaterThanOrEqual(40);
    if (geometry.scrollBottom !== undefined) expect(geometry.scrollBottom, 'Scrollable content avoids the fixed buttons').toBeLessThanOrEqual(geometry.top + 2);
    for (const button of await footer.getByRole('button').all()) await expect(button).toBeInViewport({ ratio: 1 });
  }

  async function checkScheduleDivider() {
    const borders = await schedule.sheet(page).evaluate(node => ({
      last: parseFloat(getComputedStyle(node.querySelector('.todo-schedule-clearable-row:last-child .todo-schedule-row')).borderBottomWidth),
      extra: getComputedStyle(node.querySelector('.todo-schedule-clearable-row:last-child'), '::after').display,
      footer: parseFloat(getComputedStyle(node.querySelector('.todo-schedule-footer')).borderTopWidth),
    }));
    expect(borders.last, 'The final repeat row or detail does not duplicate the footer divider').toBe(0);
    expect(borders.extra, 'The final setting has no second separator from its clearable wrapper').toBe('none');
    expect(borders.footer, 'The final single-row actions have no divider').toBe(0);
  }

  const checkHabitCore = (sheetSelector, footerSelector, phase) => checkHabitDetailLayout({ page, sheetSelector, footerSelector, phase, width, expect });

  async function checkHabitHistory(sheetSelector, footerSelector) {
    const sheet = page.locator(sheetSelector), calendar = sheet.locator('.habit-calendar');
    await expect(calendar.locator('.habit-calendar-log-row')).toHaveCount(5);
    const last = calendar.locator('.habit-calendar-log-row').last();
    await expect(last).toContainText('月初记录：从一件能够开始的小事继续。');
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 1 });
    const bottom = await last.evaluate(node => {
      const rect = node.getBoundingClientRect();
      const scroll = node.closest('.daily-detail-scroll,.domain-sheet-scroll').getBoundingClientRect();
      const actions = node.closest('.daily-detail-sheet,.domain-sheet-habit-detail').querySelector('.sheet-actions').getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, viewportTop: scroll.top, viewportBottom: scroll.bottom, actionsTop: actions.top };
    });
    expect(bottom.top, `${width}: the final log starts inside the scroll viewport`).toBeGreaterThanOrEqual(bottom.viewportTop - 2);
    expect(bottom.bottom, `${width}: the final log can be read above the footer`).toBeLessThanOrEqual(Math.min(bottom.viewportBottom, bottom.actionsTop) + 2);
    await sheet.locator('.daily-detail-scroll,.domain-sheet-scroll').evaluate(node => { node.scrollTop = 0; });
    await checkHabitCore(sheetSelector, footerSelector, 'with default recent history');
  }

  await page.locator('.todo-quadrant-later .todo-quadrant-add').click();
  await expect(page.locator('.entry-composer .todo-editor-meta')).toBeVisible();
  const taskSpacing = await page.locator('.entry-composer').evaluate(node => {
    const row = node.querySelector('.todo-editor-meta'), button = row.querySelector('.todo-schedule-trigger');
    const fields = node.querySelector('.todo-sheet-fields'), title = node.querySelector('.todo-title-row');
    return { top: button.getBoundingClientRect().top - fields.getBoundingClientRect().top,
      bottom: title.getBoundingClientRect().top - button.getBoundingClientRect().bottom };
  });
  expect(taskSpacing.top, `${width}: task creation first button has eight pixels above`).toBeCloseTo(8, 1);
  expect(taskSpacing.bottom, `${width}: task creation first button has eight pixels below`).toBeCloseTo(8, 1);
  await checkFooter('.todo-sheet-footer', true);
  await schedule.openSchedule(page, expect);
  await schedule.checkScheduleLayout(page, expect, `${width} compact footer`);
  await checkFooter('.todo-schedule-footer', true);
  await checkScheduleDivider();
  const overviewScroll = await page.locator('.todo-schedule-scroll').evaluate(node => node.scrollHeight - node.clientHeight);
  expect(overviewScroll, 'The default calendar and all three setting rows still fit without scrolling').toBeLessThanOrEqual(2);
  await page.screenshot({ path: path.join(out, `schedule-footer-${width}.png`) });
  await schedule.openSection(page, '设置重复');
  await expect(schedule.sheet(page).locator('.todo-schedule-repeat-popover')).toBeVisible();
  await schedule.checkScheduleLayout(page, expect, `${width} repeat option window`);
  await checkFooter('.todo-schedule-footer', true);
  await checkScheduleDivider();
  const rotation = await schedule.button(page, '展开重复设置').locator('.select-chevron').evaluate(node => {
    const matrix = new DOMMatrix(getComputedStyle(node).transform); return { a: matrix.a, d: matrix.d };
  });
  expect(rotation.a).toBeCloseTo(-1, 4); expect(rotation.d).toBeCloseTo(-1, 4);
  await schedule.closeSchedule(page, expect);
  await page.getByRole('button', { name: '关闭编辑', exact: true }).click();

  for (const [hash, nativeTabBar] of [['#/pages/domains/index', true], ['#/pages/domain-detail/index?id=footer-domain', false]]) {
    await page.evaluate(hash => { location.hash = hash; }, hash);
    if (nativeTabBar) await page.getByRole('button', { name: '记录进展', exact: true }).click();
    else await page.locator('.domain-record-column.is-positive').dispatchEvent('click');
    const creator = page.locator('.entry-composer');
    await expect(creator.locator('.progress-record-field')).toHaveCount(2);
    await expect(creator.locator('.entry-footer button')).toHaveText(['', '保存记录']);
    const progressSpacing = await creator.evaluate(node => {
      const fields = node.querySelector('.todo-sheet-fields'), row = node.querySelector('.progress-domain-row');
      const button = row.querySelector('.form-choice-trigger'), first = node.querySelector('.progress-record-field');
      return { top: button.getBoundingClientRect().top - fields.getBoundingClientRect().top,
        bottom: first.getBoundingClientRect().top - button.getBoundingClientRect().bottom };
    });
    expect(progressSpacing).toEqual(taskSpacing);
    await checkFooter('.entry-footer', nativeTabBar);
    const layout = await creator.evaluate(node => {
      const scroll = node.querySelector('.entry-scroll').getBoundingClientRect(), footer = node.querySelector('.entry-footer').getBoundingClientRect();
      return [...node.querySelectorAll('.progress-record-field')].map(field => { const box = field.getBoundingClientRect(); return { top: box.top, bottom: box.bottom, scrollTop: scroll.top, limit: Math.min(scroll.bottom, footer.top) }; });
    });
    if (layout.some(box => box.top < box.scrollTop - 1 || box.bottom > box.limit + 1)) {
      console.log('Progress layout failure', { width, nativeTabBar, layout, metrics: await creator.evaluate(node => ({
        sheet: node.getBoundingClientRect().toJSON(),
        fields: [...node.querySelectorAll('.progress-record-field')].map(field => ({
          box: field.getBoundingClientRect().toJSON(),
          input: field.querySelector('textarea').getBoundingClientRect().toJSON(),
          toolbar: field.querySelector('.memo-editor-toolbar').getBoundingClientRect().toJSON(),
          toolbarMargin: getComputedStyle(field.querySelector('.memo-editor-toolbar')).margin,
          last: field.matches(':last-child'),
        })),
      })) });
      await page.screenshot({ path: path.join(out, `progress-footer-failed-${width}-${nativeTabBar ? 'tab' : 'detail'}.png`) });
    }
    for (const box of layout) { expect(box.top).toBeGreaterThanOrEqual(box.scrollTop - 1); expect(box.bottom).toBeLessThanOrEqual(box.limit + 1); }
    await page.screenshot({ path: path.join(out, `progress-${nativeTabBar ? 'tab' : 'detail'}-footer-${width}.png`) });
    await creator.getByRole('button', { name: '关闭编辑', exact: true }).click();
  }

  if (progressOnly) { expect(await businessState()).toEqual(businessBefore); return; }
  for (const [route, sheet, footer, nativeTabBar] of [
    ['#/pages/daily/index', '.daily-detail-sheet', '.daily-detail-actions', true],
    ['#/pages/domain-detail/index?id=footer-domain', '.domain-sheet-habit-detail', '.domain-sheet-actions', false],
  ]) {
    await page.evaluate(hash => { location.hash = hash; }, route);
    if (nativeTabBar) await habitFilter.select('已完成');
    const cards = nativeTabBar ? page.locator('.daily-habit-scroll') : page.locator('.domain-habit-scroll');
    for (const title of [shortTitle, longTitle]) {
      const long = title === longTitle, label = `${nativeTabBar ? 'habit' : 'domain-habit'}${long ? '-long' : ''}`;
      await cards.getByRole('button', { name: `查看习惯：${title}`, exact: true }).click();
      await checkHabitCore(sheet, footer, 'initial open');
      await checkFooter(footer, nativeTabBar);
      await page.screenshot({ path: path.join(out, `${label}-footer-${width}.png`) });
      const calendar = page.locator(sheet).locator('.habit-calendar');
      await calendar.getByRole('button', { name: '查看上个月打卡', exact: true }).click();
      await expect(calendar.locator('.habit-calendar-month')).toHaveText('2026年9月');
      await checkHabitCore(sheet, footer, 'previous month');
      await calendar.getByRole('button', { name: '回到本月打卡', exact: true }).click();
      await expect(calendar.locator('.habit-calendar-month')).toHaveText('2026年10月');
      await checkHabitCore(sheet, footer, 'returned to this month');
      if (long) {
        const expandTitle = page.locator(sheet).getByRole('button', { name: `展开习惯名称：${longTitle}`, exact: true });
        await expect(expandTitle).toHaveAttribute('aria-expanded', 'false');
        await expandTitle.click();
        const collapseTitle = page.locator(sheet).getByRole('button', { name: `收起习惯名称：${longTitle}`, exact: true });
        await expect(collapseTitle).toHaveAttribute('aria-expanded', 'true');
        await expect(collapseTitle.locator('.habit-detail-title-copy')).toHaveText(longTitle);
        await expect(collapseTitle.locator('.habit-detail-title-copy')).not.toHaveClass(/is-summary/);
        await expect(collapseTitle).toBeInViewport({ ratio: 1 });
        await collapseTitle.click();
        await checkHabitCore(sheet, footer, 'after closing long title');
      }
      await checkHabitHistory(sheet, footer);
      if (long) {
        const note = page.locator(sheet).locator('.habit-detail-note');
        await expect(note).toHaveCount(1);
        await expect(note).toHaveText(longNote);
        await expect(note).toBeVisible();
        await note.scrollIntoViewIfNeeded();
        await expect(note).toBeInViewport({ ratio: 1 });
        const frame = await note.evaluate(node => { const style = getComputedStyle(node), text = node.querySelector('span'), copy = getComputedStyle(text); return { border: parseFloat(style.borderTopWidth), wrap: style.whiteSpace, overflow: node.scrollHeight - node.clientHeight, height: style.height, font: style.fontSize, textFont: copy.fontSize, textHeight: text.getBoundingClientRect().height, clientHeight: node.clientHeight, scrollHeight: node.scrollHeight }; });
        expect(frame.border).toBeGreaterThan(0); expect(frame.wrap).toBe('pre-wrap'); expect(frame.overflow, `${width} ${label}: ${JSON.stringify(frame)}`).toBeLessThanOrEqual(1);
        await expect(page.locator(sheet).getByRole('button', { name: /^(展开|收起)习惯备注$/ })).toHaveCount(0);
        await checkHabitCore(sheet, footer, 'with full framed remarks');
        await expect(page.locator(sheet).getByRole('button', { name: /专注.*25.*分钟/ })).toHaveCount(0);
      }
      await page.locator(sheet).getByRole('button', { name: '编辑习惯', exact: true }).click();
      await checkFooter('.daily-editor-footer', nativeTabBar);
      await page.getByRole('button', { name: '关闭习惯编辑', exact: true }).click();
      if (await page.locator(sheet).count()) await page.locator(sheet).getByRole('button', { name: '关闭习惯详情', exact: true }).click();
      expect(await businessState(), `${width} ${label}: inspecting and cancelling leaves every business record intact`).toEqual(businessBefore);
    }
  }
  // Inspecting or cancelling these sheets never creates tasks or changes check-ins.
  expect(await businessState()).toEqual(businessBefore);
};
