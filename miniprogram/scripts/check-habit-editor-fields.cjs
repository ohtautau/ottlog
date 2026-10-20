/** Actual editor geometry, including its native input line, on both hosts. */
module.exports = async function checkHabitEditorFields(editor, expect, context) {
  const priority = editor.getByRole('button', { name: '选择习惯优先度', exact: true });
  await expect(priority).toHaveText('');
  await expect(priority.locator('.priority-flag')).toHaveCount(1);
  await expect(priority.locator('.select-chevron')).toHaveCount(0);
  const domain = editor.getByRole('button', { name: '选择习惯领域', exact: true });
  const timePeriod = editor.locator('.daily-time-period-field');
  await expect(domain.locator('.library-icon')).toHaveCount(1);
  await expect(domain.locator('.select-chevron')).toHaveCount(1);
  await expect(timePeriod.locator('.select-chevron,.form-popover-layer')).toHaveCount(0);
  await expect(timePeriod.locator('button')).toHaveText(['上午', '中午', '下午', '夜晚', '自由']);
  await expect(timePeriod.locator('button[aria-pressed="true"]')).toHaveCount(1);
  const geometry = await editor.evaluate(node => {
    const priority = node.querySelector('.priority-select-trigger'), flag = priority.querySelector('.priority-flag');
    const frame = priority.getBoundingClientRect(), icon = flag.getBoundingClientRect();
    const domain = node.querySelector('[aria-label="选择习惯领域"]'), field = domain.closest('.form-choice-field');
    const timeField = node.querySelector('.daily-time-period-field'), timePeriod = timeField.querySelector('button');
    const row = domain.closest('.daily-domain-field'), settings = timeField.closest('.daily-editor-settings'), d = domain.getBoundingClientRect(), t = timePeriod.getBoundingClientRect();
    return { priorityWidth: frame.width, priorityHeight: frame.height, x: (icon.left + icon.right - frame.left - frame.right) / 2,
      y: (icon.top + icon.bottom - frame.top - frame.bottom) / 2, domainWidth: d.width,
      fieldWidth: field.getBoundingClientRect().width, rowWidth: row.getBoundingClientRect().width,
      availableWidth: node.querySelector('.daily-editor').clientWidth - parseFloat(getComputedStyle(node.querySelector('.daily-editor')).paddingLeft) - parseFloat(getComputedStyle(node.querySelector('.daily-editor')).paddingRight), domainHeight: d.height,
      timeFieldWidth: timeField.getBoundingClientRect().width, timeWidth: t.width, timeHeight: t.height,
      settingsWidth: settings.getBoundingClientRect().width, leftOffset: t.left - d.left,
      periods: [...timeField.querySelectorAll('button')].map(button => { const r = button.getBoundingClientRect(), style = getComputedStyle(button); return { x: r.x, y: r.y, width: r.width, height: r.height, font: parseFloat(style.fontSize), overflow: button.scrollWidth - button.clientWidth }; }) };
  });
  expect(geometry.priorityWidth, `${context}: shared priority width`).toBeCloseTo(48, 1);
  expect(geometry.priorityHeight, `${context}: shared priority touch height`).toBeCloseTo(40, 1);
  expect(Math.abs(geometry.x), `${context}: flag horizontal symmetry`).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.y), `${context}: flag vertical symmetry`).toBeLessThanOrEqual(1);
  expect(geometry.rowWidth, `${context}: domain fills the available row`).toBeCloseTo(geometry.availableWidth, 0);
  expect(geometry.fieldWidth, `${context}: domain field uses the full row`).toBeCloseTo(geometry.availableWidth, 0);
  expect(geometry.fieldWidth).toBeCloseTo(geometry.domainWidth, 0);
  expect(geometry.timeFieldWidth).toBeCloseTo(geometry.availableWidth, 0);
  expect(geometry.settingsWidth, `${context}: separate settings row fills the available width`).toBeCloseTo(geometry.availableWidth, 0);
  expect(Math.abs(geometry.leftOffset), `${context}: settings selector aligns with the domain`).toBeLessThanOrEqual(1);
  expect(geometry.periods).toHaveLength(5);
  for (const [index, period] of geometry.periods.entries()) {
    expect(period.width).toBeCloseTo(geometry.timeWidth, 0); expect(period.y).toBeCloseTo(geometry.periods[0].y, 0);
    expect(period.width).toBeGreaterThanOrEqual(40); expect(period.height).toBeGreaterThanOrEqual(40);
    expect(period.font).toBe(14); expect(period.overflow).toBeLessThanOrEqual(1);
    if (index) expect(period.x - geometry.periods[index - 1].x - geometry.periods[index - 1].width).toBeCloseTo(6, 0);
  }
  expect(geometry.domainHeight).toBeGreaterThanOrEqual(44);
  expect(geometry.timeHeight).toBeGreaterThanOrEqual(40);

  await expect(editor.getByRole('spinbutton', { name: '专注分钟', exact: true })).toHaveCount(0);
  const order = await editor.evaluate(node => {
    const domain = node.querySelector('.daily-domain-field'), title = node.querySelector('.daily-title-row'), note = node.querySelector('.daily-note-input'), settings = node.querySelector('.daily-editor-settings'), actions = node.querySelector('.daily-editor-lifecycle');
    const before = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    return { domainBeforeTitle: before(domain, title), noteAfterTitle: before(title, note), settingsAfterNote: before(note, settings), actionsAfterSettings: !actions || before(settings, actions),
      noteBottom: note.getBoundingClientRect().bottom, settingsTop: settings.getBoundingClientRect().top,
      domainBottom: domain.getBoundingClientRect().bottom, titleTop: title.getBoundingClientRect().top,
      buttons: actions ? [...actions.querySelectorAll('button')].map(button => ({ h: button.getBoundingClientRect().height, w: button.getBoundingClientRect().width })) : [] };
  });
  expect(order.domainBeforeTitle).toBe(true); expect(order.noteAfterTitle).toBe(true); expect(order.settingsAfterNote).toBe(true); expect(order.actionsAfterSettings).toBe(true);
  expect(order.settingsTop - order.noteBottom, `${context}: shared space above independent settings row`).toBeCloseTo(8, 1);
  expect(order.domainBottom).toBeLessThanOrEqual(order.titleTop + 1);
  for (const button of order.buttons) { expect(button.h).toBeGreaterThanOrEqual(40); expect(button.w).toBeGreaterThanOrEqual(40); }
  const existing = !!await editor.locator('.daily-editor-lifecycle').count();
  await expect(editor.locator('.daily-editor-footer button')).toHaveCount(existing ? 2 : 1);
  await expect(editor.locator('.daily-editor-footer .sheet-delete-button')).toHaveCount(existing ? 1 : 0);
};
