/* Operate the real schedule editor through its accessible controls. */
const sheet = page => page.locator('.todo-schedule-sheet');
const button = (page, name) => sheet(page).getByRole('button', { name, exact: true });

async function closeOptionWindows(page) {
  for (let level = 0; level < 5 && await sheet(page).locator('.form-popover-panel').count(); level++) {
    const before = await sheet(page).locator('.form-popover-panel').count();
    await page.keyboard.press('Escape');
    await require('./confirm-unsaved-close.cjs')(page);
    await require('../../web/node_modules/@playwright/test').expect.poll(() => sheet(page).locator('.form-popover-panel').count()).toBeLessThan(before);
  }
}

async function openSchedule(page, expect) {
  await page.getByRole('button', { name: '设置日期、提醒和重复', exact: true }).click();
  await expect(sheet(page)).toBeVisible();
  const view = await sheet(page).evaluate(node => {
    const scroll = node.querySelector('.todo-schedule-scroll'), footer = node.querySelector('.todo-schedule-footer');
    return { overview: node.classList.contains('is-overview'), overflow: scroll.scrollHeight - scroll.clientHeight, scrollTop: scroll.scrollTop,
      calendarBottom: node.querySelector('.todo-schedule-calendar').getBoundingClientRect().bottom,
      rows: [...node.querySelectorAll('.todo-schedule-row')].map(row => row.getBoundingClientRect().bottom),
      scrollBottom: scroll.getBoundingClientRect().bottom, footerTop: footer.getBoundingClientRect().top };
  });
  expect(view.overview, 'Opening a schedule shows its collapsed overview').toBe(true);
  expect(view.overflow, 'Default calendar and settings fit without scrolling').toBeLessThanOrEqual(2);
  expect(view.scrollTop, 'The overview opens at the top').toBe(0);
  expect(view.calendarBottom).toBeLessThanOrEqual(view.scrollBottom + 1);
  expect(Math.max(...view.rows), 'All three settings rows remain above the footer').toBeLessThanOrEqual(view.footerTop + 1);
}

async function openSection(page, name) {
  const control = button(page, name);
  if (await control.getAttribute('aria-expanded') !== 'true') { await closeOptionWindows(page); await control.click(); }
}

async function viewMonth(page, year, month) {
  const reminder = await sheet(page).locator('.todo-schedule-calendar-popover').count() > 0;
  if (!reminder) await closeOptionWindows(page);
  const prefix = reminder ? '提醒' : '';
  await button(page, `选择${prefix}年月`).click();
  await sheet(page).getByLabel(`${prefix}日历年份`, { exact: true }).fill(String(year));
  await sheet(page).getByLabel(`${prefix}日历月份`, { exact: true }).fill(String(month));
  await button(page, '查看月份').click();
}

async function selectDate(page, date) {
  const reminder = await sheet(page).locator('.todo-schedule-calendar-popover').count() > 0;
  const [year, month] = date.split('-').map(Number);
  await viewMonth(page, year, month);
  await button(page, `选择${reminder ? '提醒' : ''}日期${date}`).click();
}

async function setTime(page, hour, minute) {
  await openSection(page, '设置时间');
  await sheet(page).getByLabel('任务小时', { exact: true }).fill(String(hour));
  await sheet(page).getByLabel('任务分钟', { exact: true }).fill(String(minute));
  await button(page, '完成时间设置').click();
}

async function setCustomReminder(page, date, hour = 9, minute = 0) {
  await openSection(page, '设置提醒');
  const label = await sheet(page).evaluate((node, target) => {
    const selected = node.querySelector('.todo-schedule-calendar [aria-pressed="true"]');
    const base = selected?.getAttribute('aria-label').slice(-10) || new Date().toLocaleDateString('en-CA');
    for (const [days, name] of [[0, '当天'], [1, '前一天'], [2, '前两天'], [3, '前三天'], [7, '前一周'], [-1, '前一月']]) {
      const value = new Date(`${base}T12:00:00`);
      if (days === -1) { const day = value.getDate(); value.setDate(1); value.setMonth(value.getMonth() - 1); const end = new Date(value); end.setMonth(end.getMonth() + 1); end.setDate(0); value.setDate(Math.min(day, end.getDate())); }
      else value.setDate(value.getDate() - days);
      const key = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
      if (key === target) return name;
    }
    throw new Error(`Fixture reminder ${target} is outside the six day choices for ${base}`);
  }, date);
  await sheet(page).locator('.todo-schedule-reminder-days-inline').getByRole('button', { name: label, exact: true }).click();
  await button(page, '设置提醒时刻').click();
  await sheet(page).getByLabel('提醒小时', { exact: true }).fill(String(hour));
  await sheet(page).getByLabel('提醒分钟', { exact: true }).fill(String(minute));
  await button(page, '完成提醒时间设置').click();
}

async function confirmSchedule(page, expect) {
  await closeOptionWindows(page);
  await button(page, '确认日期设置').click();
  await expect(sheet(page)).toHaveCount(0);
}

async function closeSchedule(page, expect) {
  await closeOptionWindows(page);
  await button(page, '关闭日期设置').click();
  await require('./confirm-unsaved-close.cjs')(page);
  await expect(sheet(page)).toHaveCount(0);
}

async function checkScheduleInputAlignment(page, expect, context) {
  const alignment = await sheet(page).locator('.schedule-number-field').evaluateAll(nodes => nodes.map(node => {
    const frame = node.getBoundingClientRect(), input = node.querySelector('input'), line = input.getBoundingClientRect(), style = getComputedStyle(input);
    const unit = node.nextElementSibling?.tagName === 'SPAN' ? node.nextElementSibling.getBoundingClientRect() : null;
    return { height: frame.height, centerOffset: (line.top + line.bottom - frame.top - frame.bottom) / 2,
      top: line.top - frame.top, bottom: frame.bottom - line.bottom, width: line.width, frameWidth: frame.width, overflow: input.scrollWidth - input.clientWidth,
      lineHeight: parseFloat(style.lineHeight), lineBox: line.height, paddingTop: parseFloat(style.paddingTop), paddingBottom: parseFloat(style.paddingBottom),
      unitOffset: unit ? (unit.top + unit.bottom - frame.top - frame.bottom) / 2 : 0 };
  }));
  for (const field of alignment) {
    expect(field.height, `${context}: numeric frames share the compact height`).toBeCloseTo(40, 1);
    expect(Math.abs(field.centerOffset), `${context}: the native text line is centered inside its frame`).toBeLessThanOrEqual(1);
    expect(Math.abs(field.unitOffset), `${context}: numbers and their units share the same center`).toBeLessThanOrEqual(1);
    expect(field.top).toBeGreaterThanOrEqual(0); expect(field.bottom).toBeGreaterThanOrEqual(0);
    expect(field.frameWidth, `${context}: all numeric frames share the same width`).toBeCloseTo(96, 1);
    expect(field.width).toBeGreaterThan(30); expect(field.overflow).toBeLessThanOrEqual(2);
    expect(field.paddingTop + field.paddingBottom, 'Native single-line inputs do not accumulate vertical padding').toBe(0);
    expect(field.lineHeight, 'The text line cannot overflow its input box').toBeLessThanOrEqual(field.lineBox + 1);
  }
  const groups = await sheet(page).locator('.numeric-input-row').evaluateAll(nodes => nodes.map(node => {
    const panel = node.closest('.form-popover-panel').getBoundingClientRect();
    const first = node.firstElementChild.getBoundingClientRect(), last = node.lastElementChild.getBoundingClientRect();
    return (first.left + last.right - panel.left - panel.right) / 2;
  }));
  for (const center of groups) expect(Math.abs(center), `${context}: inputs and units are centered together in the numeric popover`).toBeLessThanOrEqual(1);
}

async function checkScheduleLayout(page, expect, context) {
  await checkScheduleInputAlignment(page, expect, context);
  const viewport = await page.locator('.preview-content').boundingBox();
  const layout = await sheet(page).evaluate(node => {
    const box = node.getBoundingClientRect();
    return { x: box.x, right: box.right, y: box.y, bottom: box.bottom, width: node.clientWidth, scroll: node.scrollWidth };
  });
  expect(layout.scroll, `${context}: schedule has no horizontal overflow`).toBeLessThanOrEqual(layout.width + 2);
  expect(layout.x).toBeGreaterThanOrEqual(viewport.x - 1);
  expect(layout.right).toBeLessThanOrEqual(viewport.x + viewport.width + 1);
  expect(layout.y).toBeGreaterThanOrEqual(viewport.y - 1);
  expect(layout.bottom).toBeLessThanOrEqual(viewport.y + viewport.height + 1);
  const boxes = [];
  for (const name of ['清除日期设置', '确认日期设置']) {
    const control = button(page, name);
    await expect(control, `${context}: ${name} stays reachable`).toBeInViewport();
    const box = await control.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(viewport.y - 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.y + viewport.height + 1);
    expect(box.x).toBeGreaterThanOrEqual(layout.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(layout.right + 1);
    boxes.push(box);
  }
  expect(Math.abs(boxes[0].y + boxes[0].height / 2 - boxes[1].y - boxes[1].height / 2), `${context}: clear and confirm are vertically centered`).toBeLessThanOrEqual(1);
  expect(boxes[0].width).toBeCloseTo(40, 0);
  expect(boxes[0].height).toBeCloseTo(40, 0);
  expect(boxes[1].height).toBeCloseTo(48, 0);
  expect(boxes[1].x - boxes[0].x - boxes[0].width).toBeCloseTo(8, 0);
  expect(boxes[1].width).toBeGreaterThan(boxes[0].width);
  await expect(button(page, '清除日期设置')).toHaveText('');
  await expect(button(page, '清除日期设置').locator('.reset-symbol')).toHaveCount(1);
  const overview = await sheet(page).evaluate(node => {
    const scroll = node.querySelector('.todo-schedule-scroll');
    return { overflow: scroll.scrollHeight - scroll.clientHeight, calendarBottom: node.querySelector('.todo-schedule-calendar').getBoundingClientRect().bottom,
      rows: [...node.querySelectorAll('.todo-schedule-row')].map(row => row.getBoundingClientRect().bottom), scrollBottom: scroll.getBoundingClientRect().bottom };
  });
  expect(overview.overflow, `${context}: option windows do not stretch the overview`).toBeLessThanOrEqual(2);
  expect(overview.calendarBottom).toBeLessThanOrEqual(overview.scrollBottom + 1);
  expect(Math.max(...overview.rows)).toBeLessThanOrEqual(overview.scrollBottom + 1);
  const panels = sheet(page).locator('.form-popover-panel');
  if (await panels.count()) {
    const panel = panels.last();
    await expect(panel).toBeInViewport({ ratio: 1 });
    const bounds = await panel.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(viewport.x - 1);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.x + viewport.width + 1);
    expect(bounds.y).toBeGreaterThanOrEqual(viewport.y - 1);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.y + viewport.height + 1);
    const popup = await panel.evaluate(node => {
      const box = node.getBoundingClientRect(), anchor = document.getElementById(node.id.replace(/-panel$/, '')).getBoundingClientRect();
      const calendar = node.querySelector('.todo-schedule-calendar'), scroll = node.querySelector('.form-popover-scroll')?.getBoundingClientRect();
      const days = calendar ? [...calendar.querySelectorAll('button')].map(day => day.getBoundingClientRect()) : [];
      const calendarBox = calendar?.getBoundingClientRect();
      return { centered: node.classList.contains('is-centered'), isCalendar: node.classList.contains('todo-schedule-calendar-popover'),
        gap: Math.min(Math.abs(box.top - anchor.bottom), Math.abs(anchor.top - box.bottom)), cells: days.length,
        firstTop: days.length ? Math.min(...days.map(day => day.top)) : 0, lastBottom: days.length ? Math.max(...days.map(day => day.bottom)) : 0,
        minDayHeight: days.length ? Math.min(...days.map(day => day.height)) : 0, scrollTop: scroll?.top, scrollBottom: scroll?.bottom,
        dayBoxes: days.map(day => ({ x: day.x, right: day.right, top: day.top, bottom: day.bottom, width: day.width })),
        calendarLeft: calendarBox?.left, calendarRight: calendarBox?.right };
    });
    if (!popup.centered) expect(popup.gap, `${context}: independent choices stay adjacent to the triggering row`).toBeCloseTo(8, 0);
    if (await panel.locator('.todo-schedule-section,.todo-schedule-time-fields').count()) {
      for (const input of await panel.locator('.form-popover-scroll input').all()) await expect(input, `${context}: default time, interval and reminder controls are complete`).toBeInViewport({ ratio: 1 });
      const fields = await panel.evaluate(node => {
        const visible = node.querySelector('.form-popover-scroll').getBoundingClientRect();
        return [...node.querySelectorAll('.form-popover-scroll input')].map(input => { const box = input.getBoundingClientRect(); return { top: box.top - visible.top, bottom: box.bottom - visible.bottom }; });
      });
      for (const field of fields) { expect(field.top).toBeGreaterThanOrEqual(-1); expect(field.bottom).toBeLessThanOrEqual(1); }
    }
    if (popup.isCalendar) {
      expect(popup.cells, 'The reminder date window displays the entire six-week calendar').toBe(42);
      expect(popup.firstTop).toBeGreaterThanOrEqual(popup.scrollTop - 1);
      expect(popup.lastBottom).toBeLessThanOrEqual(popup.scrollBottom + 1);
      expect(popup.minDayHeight).toBeGreaterThanOrEqual(40);
      for (const [index, day] of popup.dayBoxes.entries()) {
        expect(day.width, 'All reminder dates retain their full column').toBeGreaterThan(30);
        expect(day.x).toBeGreaterThanOrEqual(popup.calendarLeft - 1);
        expect(day.right).toBeLessThanOrEqual(popup.calendarRight + 1);
        if (index % 7) expect(day.x, 'Adjacent date columns never overlap').toBeGreaterThanOrEqual(popup.dayBoxes[index - 1].right - 1);
        if (index >= 7) expect(day.top, 'All six calendar rows remain distinct').toBeGreaterThanOrEqual(popup.dayBoxes[index - 7].bottom - 1);
      }
    }
    for (const action of await panel.locator(':scope > .form-popover-heading button,:scope > .form-popover-footer button').all()) await expect(action).toBeInViewport({ ratio: 1 });
  }
}

async function checkBorderlessFeedback(page, control, expect) {
  const state = () => control.evaluate(node => {
    const style = getComputedStyle(node), rect = node.getBoundingClientRect();
    return { background: style.backgroundColor, foreground: style.color, border: style.borderTopColor, radius: style.borderTopLeftRadius,
      font: style.font, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  await page.mouse.move(1, 1);
  const resting = await state(), disabled = await control.isDisabled();
  expect(resting.background, 'Borderless controls rest on a transparent surface').toBe('rgba(0, 0, 0, 0)');
  await control.hover({ force: true });
  const hovered = await state();
  expect(hovered.background, 'Only enabled controls show a translucent hover surface').toBe(disabled ? resting.background : 'rgba(199, 215, 223, 0.1)');
  expect({ ...hovered, background: resting.background }, 'Hover does not move or restyle the control').toEqual(resting);
  await page.mouse.down();
  expect((await state()).background, 'Pressed feedback keeps the same translucent surface; disabled controls stay clear').toBe(hovered.background);
  // Release outside the control so the feedback check does not select a month.
  await page.mouse.move(1, 1);
  await page.mouse.up();
  expect(await state(), 'Leaving clears feedback and restores the original geometry').toEqual(resting);
}

async function checkCalendarBounds(page, expect) {
  for (const [year, month, disabledArrow, enabledArrow] of [[1000, 1, '上个月', '下个月'], [9999, 12, '下个月', '上个月']]) {
    await viewMonth(page, year, month);
    await expect(button(page, disabledArrow)).toBeDisabled();
    await expect(button(page, enabledArrow)).toBeEnabled();
    const monthLabel = await button(page, '选择年月').textContent();
    await checkBorderlessFeedback(page, button(page, disabledArrow), expect);
    await button(page, disabledArrow).click({ force: true });
    await expect(button(page, '选择年月'), 'Disabled month arrows cannot change the viewed month').toHaveText(monthLabel);
    const cells = await sheet(page).locator('.todo-schedule-calendar button').evaluateAll(nodes => nodes.map(node => ({
      date: node.getAttribute('aria-label').replace('选择日期', ''), disabled: node.disabled,
    })));
    expect(cells).toHaveLength(42);
    const outside = cells.filter(cell => Number(cell.date.split('-')[0]) < 1000 || Number(cell.date.split('-')[0]) > 9999);
    expect(outside.length, `${year}-${month}: calendar includes disabled overflow placeholders`).toBeGreaterThan(0);
    expect(outside.every(cell => cell.disabled), 'overflow dates cannot be selected').toBe(true);
    expect(cells.filter(cell => !cell.disabled).every(cell => /^\d{4}-\d{2}-\d{2}$/.test(cell.date))).toBe(true);
  }
  await viewMonth(page, 999, 1);
  await expect(sheet(page).getByRole('alert')).toContainText('1000');
  await expect(button(page, '选择年月')).toContainText('9999');
  // A failed jump retains the inputs, and correcting them restores normal use.
  await sheet(page).getByLabel('日历年份', { exact: true }).fill('1000');
  await button(page, '查看月份').click();
  await expect(sheet(page).getByRole('alert')).toHaveCount(0);
  await expect(button(page, '选择年月')).toContainText('1000');
}

async function checkReminderValues(page, expect, date, hour, minute, preset) {
  await openSection(page, '设置提醒');
  if (preset) await expect(button(page, preset)).toHaveAttribute('aria-pressed', 'true');
  else await expect(sheet(page).locator('.is-reminders [aria-pressed="true"]')).toHaveAttribute('aria-label', '设置提醒时刻');
  await expect(button(page, '设置提醒')).toContainText(`${Number(date.slice(5, 7))}月${Number(date.slice(8))}日 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  await button(page, '设置提醒时刻').click();
  expect(Number(await sheet(page).getByLabel('提醒小时', { exact: true }).inputValue())).toBe(hour);
  expect(Number(await sheet(page).getByLabel('提醒分钟', { exact: true }).inputValue())).toBe(minute);
  await page.keyboard.press('Escape');
}

module.exports = { sheet, button, closeOptionWindows, openSchedule, openSection, viewMonth, selectDate, setTime, setCustomReminder, confirmSchedule, closeSchedule, checkScheduleInputAlignment, checkScheduleLayout, checkBorderlessFeedback, checkCalendarBounds, checkReminderValues };
