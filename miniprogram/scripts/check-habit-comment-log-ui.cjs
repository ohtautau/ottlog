const path = require('node:path');
const habitFilters = require('./habit-filter-test-helpers.cjs');
const checkHabitDetailLayout = require('./check-habit-detail-layout.cjs');

// Exercise the same production calendar through both editors and read-only statistics.
module.exports = async function checkHabitCommentLogs({ page, origin, out, width, expect, host }) {
  await page.clock.install({ time: new Date('2026-10-25T12:00:00') });
  await page.goto(`${origin}/?habit-comment-log-${host}-${width}#/pages/posts/index`);
  const fullComment = await page.evaluate(() => {
    localStorage.clear();
    window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false };
    const target = 'comment-habit', other = 'comment-other';
    const item = (id, title) => ({ id, title, note: id === target ? '给每日阅读留一点时间，完成后记录今天的进展。' : '', group: '工作', domainId: 'comment-domain', kind: 'plant', minutes: 0, enabled: true, priority: 'none' });
    const day = n => `2026-10-${String(n).padStart(2, '0')}`;
    const longText = '长留言第一段，完整记录当天感受和行动。\n第二段继续记录希望保留的具体想法。'.repeat(3);
    const reflection = (n, habitId = target, text = `留言第${n}天`) => ({ id: `${habitId}-${n}`, habitId, day: day(n), text, createdAt: new Date(`${day(n)}T10:00:00`).getTime() });
    const reminders = {
      version: 1, items: [item(target, '留言分页习惯'), item(other, '切换留言习惯')],
      done: { ...Object.fromEntries(Array.from({ length: 24 }, (_, index) => [day(index + 1), [target, other]])), '2026-09-30': [target] },
      reflections: [
        ...Array.from({ length: 21 }, (_, index) => reflection(index + 1, target, index === 20 ? longText : `留言第${index + 1}天`)),
        ...Array.from({ length: 21 }, (_, index) => reflection(index + 1, other)),
        reflection(22, target, ' \n\t '),
        reflection(25, target, '未打卡留言不可显示'),
        reflection(26, target, '未来留言不可显示'),
        { id: 'comment-previous', habitId: target, day: '2026-09-30', text: '上个月的留言', createdAt: new Date('2026-09-30T10:00:00').getTime() },
      ],
    };
    const domains = { version: 1, domains: [{ id: 'comment-domain', name: '工作', iconId: 'work', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] }], completedGoals: [] };
    window.__miniFixture.guestToolStates = { reminders, domains };
    for (const [tool, data] of Object.entries(window.__miniFixture.guestToolStates)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data, pending: false, revision: 0 }));
    window.__miniRequests.length = 0;
    return longText.replace(/\s+/g, ' ').trim();
  });
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:reminders')).data);
  const route = host === 'daily' ? '#/pages/daily/index' : host === 'domain' ? '#/pages/domain-detail/index?id=comment-domain' : '#/pages/statistics/index?panel=habits';
  const sheetSelector = host === 'daily' ? '.daily-detail-sheet' : '.domain-sheet-habit-detail';
  const footerSelector = host === 'daily' ? '.daily-detail-actions' : '.domain-sheet-actions';
  await page.evaluate(route => { location.hash = route; }, route);
  if (host === 'daily') await habitFilters({ page, expect }).select('全部');
  if (host === 'statistics') await page.getByRole('button', { name: '查看留言分页习惯统计', exact: true }).click();
  else await page.getByRole('button', { name: '查看习惯：留言分页习惯', exact: true }).first().click();
  const calendar = page.locator('.habit-calendar'), rows = calendar.locator('.habit-calendar-log-row');
  const more = calendar.getByRole('button', { name: '更多', exact: true });
  const logScroll = calendar.locator('.habit-calendar-log-scroll');
  async function revealMore() {
    await more.scrollIntoViewIfNeeded(); await expect(more).toBeInViewport({ ratio: .975 });
    if (host !== 'statistics') {
      const bounds = await more.evaluate(node => {
        const button = node.getBoundingClientRect(), viewport = node.closest('.habit-calendar-log-scroll').getBoundingClientRect();
        return { top: button.top, bottom: button.bottom, viewportTop: viewport.top, viewportBottom: viewport.bottom };
      });
      expect(bounds.top, `${width} ${host}: the full More button begins inside the log window`).toBeGreaterThanOrEqual(bounds.viewportTop - 1);
      expect(bounds.bottom, `${width} ${host}: the full More button fits inside the log window`).toBeLessThanOrEqual(bounds.viewportBottom + 1);
    }
  }
  const buttons = () => page.locator(`${sheetSelector} ${footerSelector} button`).evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
  const before = await read();
  await require('./check-habit-month-navigation.cjs')({ page, calendar, read, width, host, out, expect });
  await expect(calendar.locator('.habit-calendar-log-heading')).toContainText('月打卡日志');
  await expect(calendar.locator('.habit-calendar-log-heading')).toContainText('21 条');
  const headingStyle = await calendar.locator('.habit-calendar-log-heading .section-title').evaluate(node => {
    const style = getComputedStyle(node);
    return { left: node.getBoundingClientRect().left, parentLeft: node.parentElement.getBoundingClientRect().left, fontSize: parseFloat(style.fontSize), fontWeight: Number(style.fontWeight), color: style.color };
  });
  expect(headingStyle.left, `${width} ${host}: the shared log title starts at the row's left edge`).toBeCloseTo(headingStyle.parentLeft, 0);
  expect(headingStyle.fontSize, `${width} ${host}: log titles keep the shared fixed font size`).toBe(14);
  expect(headingStyle.fontWeight, `${width} ${host}: log titles keep the shared heading weight`).toBe(600);
  expect(headingStyle.color, `${width} ${host}: log titles keep the shared gray-blue color`).toBe('rgb(156, 175, 185)');
  await expect(calendar.locator('.habit-calendar-log-toggle')).toHaveCount(0);
  await expect(calendar.getByRole('button', { name: /展开月打卡日志|收起月打卡日志/ })).toHaveCount(0);
  await expect(calendar.locator('.habit-calendar-stat-number').first()).toHaveText('24天');
  await expect(calendar.locator('.habit-calendar-day.is-completed')).toHaveCount(25); // Includes the September 30 adjacent cell.
  await expect(rows).toHaveCount(10);
  await expect(rows.first()).toContainText('10月21日');
  await expect(rows.last()).toContainText('10月12日');
  await expect(rows.first().locator('.habit-calendar-log-text')).toHaveText(fullComment);
  await expect(calendar.locator('.habit-calendar-log')).not.toContainText('完成打卡');
  await expect(calendar.locator('.habit-calendar-log')).not.toContainText('未打卡留言不可显示');
  await expect(calendar.locator('.habit-calendar-log')).not.toContainText('未来留言不可显示');
  const textSize = await rows.first().locator('.habit-calendar-log-text').evaluate(node => ({ height: node.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(node).lineHeight), overflow: node.scrollHeight - node.clientHeight, clamp: getComputedStyle(node).webkitLineClamp }));
  expect(textSize.height, `${width} ${host}: the long saved comment wraps immediately`).toBeGreaterThan(textSize.lineHeight * 2);
  expect(textSize.overflow, `${width} ${host}: no saved comment text is clipped`).toBeLessThanOrEqual(1);
  expect(textSize.clamp, `${width} ${host}: comments have no line clamp`).toBe('none');
  let fixedButtons;
  if (host !== 'statistics') {
    await checkHabitDetailLayout({ page, sheetSelector, footerSelector, phase: 'comment log initial open', width, expect });
    const note = page.locator(`${sheetSelector} .habit-note-field.is-readonly`);
    await expect(note).toHaveText('给每日阅读留一点时间，完成后记录今天的进展。');
    const noteGeometry = await note.evaluate(node => {
      const css = getComputedStyle(node), text = node.firstElementChild;
      return { height: node.getBoundingClientRect().height, minHeight: parseFloat(css.minHeight), paddingX: parseFloat(css.paddingLeft), paddingY: parseFloat(css.paddingTop), verticalChrome: parseFloat(css.paddingTop) + parseFloat(css.paddingBottom) + parseFloat(css.borderTopWidth) + parseFloat(css.borderBottomWidth), lineHeight: parseFloat(css.lineHeight), textHeight: text.getBoundingClientRect().height, overflow: node.scrollHeight - node.clientHeight, clamp: css.webkitLineClamp };
    });
    expect(noteGeometry.minHeight, `${width} ${host}: remarks no longer reserve the old tall frame`).toBe(44);
    expect(noteGeometry.paddingX).toBe(12); expect(noteGeometry.paddingY).toBe(6);
    expect(noteGeometry.height, `${width} ${host}: the frame follows the complete one/two-line remark`).toBeCloseTo(Math.max(44, noteGeometry.textHeight + noteGeometry.verticalChrome), 0);
    expect(noteGeometry.textHeight).toBeLessThanOrEqual(noteGeometry.lineHeight * 2 + 1);
    expect(noteGeometry.overflow, `${width} ${host}: complete remarks have no hidden overflow`).toBeLessThanOrEqual(1);
    expect(noteGeometry.clamp).toBe('none');
    fixedButtons = await buttons();
    await expect(logScroll).toHaveCount(1);
    await logScroll.scrollIntoViewIfNeeded();
    await logScroll.evaluate(node => { node.scrollTop = 0; });
    const fixedCore = () => page.locator(sheetSelector).evaluate(node => {
      const bounds = selector => node.querySelector(selector).getBoundingClientRect().toJSON();
      return { outerScroll: node.querySelector('.daily-detail-scroll,.domain-sheet-scroll').scrollTop, month: bounds('.habit-calendar-navigation'), grid: bounds('.habit-calendar-grid'), heading: bounds('.habit-calendar-log-heading'), footer: bounds('.sheet-actions') };
    });
    const coreBeforeScroll = await fixedCore();
    const scrollGeometry = await logScroll.evaluate(node => ({ height: node.getBoundingClientRect().height, overflow: node.scrollHeight - node.clientHeight }));
    expect(scrollGeometry.height).toBeCloseTo(60, 1);
    expect(scrollGeometry.overflow, `${width} ${host}: other monthly comments remain reachable inside the log window`).toBeGreaterThan(60);
    await logScroll.hover(); await page.mouse.wheel(0, 120); await page.waitForTimeout(200);
    expect(await logScroll.evaluate(node => node.scrollTop), `${width} ${host}: wheel gestures scroll the monthly log`).toBeGreaterThan(0);
    expect(await fixedCore(), `${width} ${host}: reading comments does not move the month, grid, heading, outer viewport, or footer`).toEqual(coreBeforeScroll);
    await rows.last().scrollIntoViewIfNeeded(); await expect(rows.last()).toBeInViewport({ ratio: 1 });
    await logScroll.evaluate(node => { node.scrollTop = 0; });
  } else {
    await expect(calendar.locator('button.habit-calendar-day')).toHaveCount(0);
    await expect(logScroll, 'Statistics retain the original page scrolling layout').toHaveCount(0);
  }
  await expect(more).toHaveClass(/ui-button/);
  const moreSize = await more.evaluate(node => ({ width: node.getBoundingClientRect().width, parent: node.parentElement.getBoundingClientRect().width, height: node.getBoundingClientRect().height }));
  expect(moreSize.width / moreSize.parent).toBeGreaterThan(.95);
  expect(moreSize.height).toBeGreaterThanOrEqual(40);
  await page.screenshot({ path: path.join(out, `habit-comment-log-initial-${host}-${width}.png`) });
  await revealMore();
  await more.click(); await expect(rows).toHaveCount(20); await expect(rows.last()).toContainText('10月2日');
  await revealMore();
  await more.click(); await expect(rows).toHaveCount(21); await expect(rows.last()).toContainText('10月1日'); await expect(more).toHaveCount(0);
  await rows.last().scrollIntoViewIfNeeded(); await expect(rows.last()).toBeInViewport({ ratio: 1 });
  if (fixedButtons) expect(await buttons(), `${host}: adding comments leaves fixed footer buttons at the original bounds`).toEqual(fixedButtons);
  expect(await read(), `${host}: viewing and paging comments cannot save or normalize the archive`).toEqual(before);
  await page.screenshot({ path: path.join(out, `habit-comment-log-${host}-${width}.png`) });
  await calendar.getByRole('button', { name: '查看上个月打卡', exact: true }).click();
  await expect(rows).toHaveCount(1); await expect(rows.first()).toContainText('上个月的留言'); await expect(more).toHaveCount(0);
  if (host !== 'statistics') {
    await expect.poll(() => logScroll.evaluate(node => node.scrollTop), 'Changing month resets the comment scroll position').toBe(0);
    await logScroll.scrollIntoViewIfNeeded(); await expect(rows.first()).toBeInViewport({ ratio: 1 });
    expect(await rows.first().evaluate(node => node.getBoundingClientRect().height), `${width} ${host}: one ordinary monthly comment fits below the calendar`).toBeLessThanOrEqual(60);
  }
  await calendar.getByRole('button', { name: '回到本月打卡', exact: true }).click();
  await expect(rows).toHaveCount(10); await expect(more).toBeVisible();
  if (host !== 'statistics') await expect.poll(() => logScroll.evaluate(node => node.scrollTop), 'Returning to this month resets the comment scroll position').toBe(0);
  if (host === 'statistics') {
    await more.click(); await expect(rows).toHaveCount(20);
    await page.getByRole('button', { name: '查看切换留言习惯统计', exact: true }).click();
    await expect(rows).toHaveCount(10); await expect(rows.first()).toContainText('留言第21天');
    await page.getByRole('button', { name: '查看留言分页习惯统计', exact: true }).click();
    await expect(rows).toHaveCount(10); await expect(rows.first().locator('.habit-calendar-log-text')).toHaveText(fullComment);
    expect(await read(), 'Read-only statistics habit changes preserve all stored comments and completion data').toEqual(before);
  } else {
    await more.click(); await more.click();
    await calendar.locator('button.habit-calendar-day[aria-label^="2026-10-21 "]').click();
    await expect(rows).toHaveCount(20); await expect(calendar.locator('.habit-calendar-log')).not.toContainText(fullComment);
    await expect(calendar.locator('.habit-calendar-stat-number').first()).toHaveText('23天');
    expect((await read()).reflections.some(entry => entry.habitId === 'comment-habit' && entry.day === '2026-10-21')).toBe(false);
    await calendar.locator('button.habit-calendar-day[aria-label^="2026-10-21 "]').click();
    await expect(calendar.locator('.habit-calendar-stat-number').first()).toHaveText('24天');
    await expect(rows).toHaveCount(20); await expect(calendar.locator('.habit-calendar-log')).not.toContainText('完成打卡');
    await page.getByRole('button', { name: '关闭习惯详情', exact: true }).click();
    await page.getByRole('button', { name: '查看习惯：切换留言习惯', exact: true }).first().click();
    await expect(rows).toHaveCount(10); await expect(rows.first()).toContainText('留言第21天');
    await expect.poll(() => logScroll.evaluate(node => node.scrollTop), 'Changing the selected habit starts its logs at the beginning').toBe(0);
    await page.getByRole('button', { name: '关闭习惯详情', exact: true }).click();
  }
  expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path.startsWith('/personal-tools/') && request.method !== 'GET')), `${host}: local preview checks make no account writes`).toEqual([]);
  await page.evaluate(() => localStorage.clear());
};
