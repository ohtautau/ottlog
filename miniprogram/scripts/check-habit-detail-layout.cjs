module.exports = async function checkHabitDetailLayout({ page, sheetSelector, footerSelector, phase, width, expect }) {
  const sheet = page.locator(sheetSelector), calendar = sheet.locator('.habit-calendar');
  await sheet.locator('.daily-detail-scroll,.domain-sheet-scroll').evaluate(node => { node.scrollTop = 0; });
  await expect(calendar.locator('.habit-calendar-day')).toHaveCount(42);
  await expect(calendar.locator('.habit-calendar-stats > div')).toHaveCount(4);
  await expect(calendar.locator('.habit-calendar-legend,.habit-calendar-month-rate')).toHaveCount(0);
  await expect(calendar.locator('.habit-calendar-log-scroll')).toHaveCount(1);
  // Read the initial geometry directly: scrolling a date into view would hide
  // the reported last-week clipping instead of verifying the opened sheet.
  const geometry = await sheet.evaluate((node, footerSelector) => {
    const box = element => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height, width: rect.width };
    };
    const scroll = node.querySelector('.daily-detail-scroll,.domain-sheet-scroll');
    const calendar = node.querySelector('.habit-calendar');
    const statistics = calendar.querySelector('.habit-calendar-stats');
    const panel = calendar.querySelector('.habit-calendar-panel');
    const controls = calendar.querySelector('.habit-calendar-log-heading');
    const note = node.querySelector('.habit-detail-note-section,.habit-detail-note');
    const elements = [
      ['statistics', calendar.querySelector('.habit-calendar-stats')],
      ['calendar panel', calendar.querySelector('.habit-calendar-panel')],
      ['month navigation', calendar.querySelector('.habit-calendar-navigation')],
      ['weekday labels', calendar.querySelector('.habit-calendar-weekdays')],
      ['calendar grid', calendar.querySelector('.habit-calendar-grid')],
      ['last date', calendar.querySelector('.habit-calendar-day:last-child')],
      ['month log heading', calendar.querySelector('.habit-calendar-log-heading')],
      ['month log viewport', calendar.querySelector('.habit-calendar-log-scroll')],
      ...[...calendar.querySelectorAll('.habit-calendar-day')].map((day, index) => [`date ${index + 1}`, day]),
    ];
    return {
      sizing: { sheet: box(node), body: box(scroll.firstElementChild), bodyStyle: { height: getComputedStyle(scroll.firstElementChild).height, minHeight: getComputedStyle(scroll.firstElementChild).minHeight, padding: getComputedStyle(scroll.firstElementChild).padding, boxSizing: getComputedStyle(scroll.firstElementChild).boxSizing }, calendar: box(calendar), heading: box(node.querySelector('.daily-detail-heading,.domain-sheet-heading')), footer: box(node.querySelector(footerSelector)), note: node.querySelector('.habit-detail-note,.habit-detail-note-section') ? box(node.querySelector('.habit-detail-note,.habit-detail-note-section')) : null },
      scrollTop: scroll.scrollTop, overflow: scroll.scrollHeight - scroll.clientHeight, viewport: box(scroll), actionsTop: node.querySelector(footerSelector).getBoundingClientRect().top,
      elements: elements.map(([name, element]) => ({ name, ...box(element) })),
      monthButtons: [...calendar.querySelectorAll('.habit-calendar-navigation button')].map(button => ({ name: button.getAttribute('aria-label'), ...box(button) })),
      titleWidth: node.querySelector('.habit-detail-title-copy')?.getBoundingClientRect().width,
      sheetWidth: node.getBoundingClientRect().width,
      calendarGap: calendar.querySelector('.habit-calendar-panel').getBoundingClientRect().top - calendar.querySelector('.habit-calendar-stats').getBoundingClientRect().bottom,
      statisticsFonts: [...statistics.querySelectorAll('.habit-calendar-stat-number,.habit-calendar-stat-label')].map(element => ({
        number: element.classList.contains('habit-calendar-stat-number'), fontSize: parseFloat(getComputedStyle(element).fontSize),
      })),
      readingCollapsed: !node.querySelector('.habit-detail-title-toggle[aria-expanded="true"],.habit-detail-note-toggle[aria-expanded="true"]'),
      logToggleCount: node.querySelectorAll('.habit-calendar-log-toggle').length,
      logCount: calendar.querySelectorAll('.habit-calendar-log-row').length,
      logViewport: box(calendar.querySelector('.habit-calendar-log-scroll')),
      compactViewport: window.innerHeight <= 680,
      moduleGaps: [
        ...(note ? [{ name: 'remarks to statistics', gap: box(statistics).top - box(note).bottom }] : []),
        { name: 'statistics to calendar', gap: box(panel).top - box(statistics).bottom },
        { name: 'calendar to logs', gap: box(controls).top - box(panel).bottom },
      ],
    };
  }, footerSelector);
  const context = `${width} ${sheetSelector} ${phase}`;
  const header = sheet.locator('.habit-detail-header');
  await expect(header.getByRole('button', { name: '编辑习惯', exact: true })).toHaveCount(0);
  await expect(sheet.locator(footerSelector).getByRole('button', { name: '编辑习惯', exact: true })).toHaveCount(1);
  const headerLayout = await header.evaluate(node => {
    const box = element => element.getBoundingClientRect();
    const title = box(node.querySelector('.habit-detail-header-title')), meta = node.querySelector('.habit-detail-header-meta');
    const flag = node.querySelector('.priority-flag'), priority = flag.closest('button')?.getAttribute('aria-label')?.replace('选择习惯优先度：', '优先度') || flag.parentElement.getAttribute('aria-label');
    const domain = node.parentElement.querySelector('.habit-detail-domain-field'), domainBox = box(domain), field = domain.querySelector('.form-choice-trigger'), fieldBox = box(field);
    return { gap: meta ? box(meta).top - title.bottom : null, priority, color: getComputedStyle(flag).color, outlined: flag.classList.contains('is-none'),
      domain: { rowWidth: domainBox.width, fieldWidth: fieldBox.width, height: fieldBox.height, beforeTitle: domainBox.bottom <= box(node).top, label: field.textContent,
        topGap: domainBox.top - box(node.parentElement).top, nextGap: box(node).top - domainBox.bottom },
      titleFont: parseFloat(getComputedStyle(node.querySelector('.habit-detail-header-title')).fontSize),
      underline: parseFloat(getComputedStyle(node).borderBottomWidth),
      icon: box(node.querySelector('.entity-icon-preview')).toJSON(),
      noteGap: node.parentElement.querySelector('.habit-detail-note-section')?.getBoundingClientRect().top - node.getBoundingClientRect().bottom,
      buttons: [...node.closest('.habit-calendar-editor').querySelectorAll('.editor-heading .habit-detail-close')].map(button => ({ label: button.getAttribute('aria-label'), ...box(button).toJSON() })) };
  });
  if (headerLayout.gap !== null) expect(headerLayout.gap, `${context}: title and archive state have visible space`).toBeGreaterThanOrEqual(5.9);
  expect(headerLayout.domain.beforeTitle, `${context}: domain occupies the first independent row`).toBe(true);
  expect(headerLayout.domain.topGap, `${context}: details use the progress form's eight-pixel upper gap`).toBeCloseTo(8, 1);
  expect(headerLayout.domain.nextGap, `${context}: domain and entity use the progress form's eight-pixel field gap`).toBeCloseTo(8, 1);
  expect(headerLayout.domain.fieldWidth, `${context}: shared domain frame fills the row`).toBeCloseTo(headerLayout.domain.rowWidth, 1);
  expect(headerLayout.domain.height).toBeGreaterThanOrEqual(44);
  expect(headerLayout.domain.label.trim()).not.toBe('');
  await expect(header.locator('.habit-detail-header-domain')).toHaveCount(0);
  await expect(sheet.locator('.habit-detail-domain-field button')).toHaveCount(1);
  await expect(sheet.getByRole('button', { name: '选择习惯领域', exact: true })).toBeEnabled();
  await expect(sheet.getByRole('button', { name: /^(展开|收起)习惯备注$/ })).toHaveCount(0);
  expect(headerLayout.titleFont).toBeCloseTo(Math.min(width * 38 / 750, 24), 1);
  expect(headerLayout.underline).toBeGreaterThan(0);
  expect(headerLayout.icon.width).toBe(40); expect(headerLayout.icon.height).toBe(40);
  if (Number.isFinite(headerLayout.noteGap)) expect(headerLayout.noteGap, `${context}: remarks use the progress form's eight-pixel field gap even on short screens`).toBeCloseTo(8, 1);
  expect(headerLayout.buttons.map(button => button.label)).toEqual(['关闭习惯详情']);
  for (const button of headerLayout.buttons) { expect(button.width).toBe(40); expect(button.height).toBe(40); }
  const footerLayout = await sheet.locator(footerSelector).evaluate(node => [...node.querySelectorAll('button')].map(button => button.getBoundingClientRect().toJSON()));
  expect(footerLayout).toHaveLength(2);
  expect(footerLayout[0].width).toBe(40); expect(footerLayout[0].height).toBe(40);
  expect(footerLayout[1].height).toBe(48);
  expect(footerLayout[1].left - footerLayout[0].right).toBeCloseTo(8, 1);
  expect(footerLayout[0].top + footerLayout[0].height / 2).toBeCloseTo(footerLayout[1].top + footerLayout[1].height / 2, 1);
  const colors = { '优先度高': 'rgb(239, 179, 163)', '优先度中': 'rgb(227, 206, 151)', '优先度低': 'rgb(169, 217, 185)', '优先度无': 'rgb(145, 166, 174)' };
  expect(headerLayout.color).toBe(colors[headerLayout.priority]);
  expect(headerLayout.outlined).toBe(headerLayout.priority === '优先度无');
  expect(geometry.scrollTop, `${context}: the collapsed core stays at the initial scroll position`).toBeLessThanOrEqual(2);
  expect(geometry.logToggleCount, `${context}: month comments have no expand/collapse control`).toBe(0);
  expect(geometry.logCount, `${context}: the default history displays at most ten recent comments`).toBeLessThanOrEqual(10);
  expect(geometry.logViewport.height, `${context}: comment history uses the compact shared scroll viewport`).toBeCloseTo(60, 1);
  expect(geometry.sheetWidth, `${context}: wide detail panels retain a readable width`).toBeLessThanOrEqual(560);
  expect(geometry.calendarGap, `${context}: statistics and calendar have separate space`).toBeGreaterThanOrEqual(2);
  for (const font of geometry.statisticsFonts) {
    expect(font.fontSize, `${context}: statistics ${font.number ? 'numbers' : 'labels'} keep the shared fixed font size`).toBeCloseTo(font.number ? 20 : 12, 1);
  }
  if (geometry.readingCollapsed) {
    for (const module of geometry.moduleGaps) {
      expect(module.gap, `${context}: ${module.name} uses the progress form's eight-pixel field gap`).toBeCloseTo(8, 1);
    }
  }
  if (geometry.titleWidth !== undefined) expect(geometry.titleWidth, `${context}: a long title keeps readable line width`).toBeGreaterThan(120);
  // The taller title and framed remarks keep their spacing on short screens.
  // Reveal the unchanged calendar through the existing internal scroll area.
  let visibleElements = geometry.elements;
  if (geometry.elements.some(element => element.bottom > geometry.viewport.bottom + 2)) {
    await calendar.locator('.habit-calendar-stats').evaluate(node => node.scrollIntoView({ block: 'start' }));
    visibleElements = await sheet.evaluate(node => {
      const box = element => element.getBoundingClientRect().toJSON();
      const calendar = node.querySelector('.habit-calendar');
      return [
        ['statistics', '.habit-calendar-stats'], ['calendar panel', '.habit-calendar-panel'],
        ['month navigation', '.habit-calendar-navigation'], ['weekday labels', '.habit-calendar-weekdays'],
        ['calendar grid', '.habit-calendar-grid'], ['last date', '.habit-calendar-day:last-child'],
        ['month log heading', '.habit-calendar-log-heading'],
        ['month log viewport', '.habit-calendar-log-scroll'],
      ].map(([name, selector]) => ({ name, ...box(calendar.querySelector(selector)) }))
        .concat([...calendar.querySelectorAll('.habit-calendar-day')].map((day, index) => ({ name: `date ${index + 1}`, ...box(day) })));
    });
  }
  for (const element of visibleElements) {
    expect(element.height, `${context}: ${element.name} is not collapsed`).toBeGreaterThan(0);
    expect(element.top, `${context}: ${element.name} starts inside the scroll viewport`).toBeGreaterThanOrEqual(geometry.viewport.top - 2);
    expect(element.bottom, `${context}: ${element.name} fits in the scroll viewport`).toBeLessThanOrEqual(geometry.viewport.bottom + 2);
    expect(element.bottom, `${context}: ${element.name} avoids the fixed action bar`).toBeLessThanOrEqual(geometry.actionsTop + 2);
    expect(element.left, `${context}: ${element.name} starts inside the viewport width`).toBeGreaterThanOrEqual(geometry.viewport.left - 2);
    expect(element.right, `${context}: ${element.name} fits in the viewport width`).toBeLessThanOrEqual(geometry.viewport.right + 2);
    if (/^date \d+$/.test(element.name)) {
      expect(element.height, `${context}: interactive dates keep complete touch targets`).toBeGreaterThanOrEqual(40);
      expect(element.height, `${context}: unused sheet height does not stretch date rows`).toBeLessThanOrEqual(41);
    }
  }
  for (const button of geometry.monthButtons) {
    expect(button.height, `${context}: ${button.name} remains at least 40px tall`).toBeGreaterThanOrEqual(40);
    expect(button.width, `${context}: ${button.name} remains at least 40px wide`).toBeGreaterThanOrEqual(40);
  }
  await sheet.locator('.daily-detail-scroll,.domain-sheet-scroll').evaluate(node => { node.scrollTop = 0; });
};
