const { goToPageSection } = require('./page-section-test-helpers.cjs');
const path = require('node:path');

async function checkIconCenter(button, context, expect) {
  const geometry = await button.evaluate(node => {
    const control = node.getBoundingClientRect();
    const icon = node.querySelector('.sort-symbol,.filter-symbol').getBoundingClientRect();
    return { width: control.width, height: control.height, iconWidth: icon.width, iconHeight: icon.height,
      x: (icon.left + icon.right - control.left - control.right) / 2,
      y: (icon.top + icon.bottom - control.top - control.bottom) / 2 };
  });
  expect(geometry.width, `${context}: square touch width`).toBeCloseTo(40, 0);
  expect(geometry.height, `${context}: touch height`).toBeCloseTo(40, 0);
  expect(geometry.iconWidth, `${context}: fixed icon width`).toBeCloseTo(20, 0);
  expect(geometry.iconHeight, `${context}: fixed icon height`).toBeCloseTo(20, 0);
  expect(Math.abs(geometry.x), `${context}: horizontal center`).toBeLessThanOrEqual(.5);
  expect(Math.abs(geometry.y), `${context}: vertical center`).toBeLessThanOrEqual(.5);
}

// Inspect the real shared controls in their page containers; no production
// account or storage is used by this browser adapter.
async function categorySnapshot(category) {
  return category.evaluate(node => {
    const scroll = node.matches('.page-category-scroll') ? node : node.querySelector('.page-category-scroll');
    const fixed = node.querySelector('.page-category-fixed');
    const row = scroll.querySelector('.page-category-row'), rowBox = row.getBoundingClientRect();
    const barBox = node.getBoundingClientRect(), fixedBox = fixed?.getBoundingClientRect(), scrollBox = scroll.getBoundingClientRect();
    const surface = element => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, border: ['Top', 'Right', 'Bottom', 'Left'].map(edge => parseFloat(style[`border${edge}Width`])),
        padding: ['Top', 'Right', 'Bottom', 'Left'].map(edge => parseFloat(style[`padding${edge}`])) };
    };
    return { surface: surface(node), scrollSurface: surface(scroll), rowSurface: surface(row), gap: parseFloat(getComputedStyle(row).columnGap),
      fixedGap: fixedBox ? scrollBox.left - fixedBox.right : null,
      clientWidth: scroll.clientWidth, scrollWidth: scroll.scrollWidth, width: rowBox.width,
      buttons: [...node.querySelectorAll('button')].map(button => {
        const rect = button.getBoundingClientRect(), style = getComputedStyle(button), range = document.createRange();
        const isFixed = !!fixed?.contains(button), origin = isFixed ? fixedBox : rowBox;
        range.selectNodeContents(button); const label = range.getBoundingClientRect();
        return { text: button.textContent.trim(), fixed: isFixed, icon: !!button.querySelector('.priority-flag'), shared: button.classList.contains('ui-choice') && button.classList.contains('ui-category'),
          selected: button.getAttribute('aria-pressed') === 'true', disabled: button.disabled,
          foreground: style.color, background: style.backgroundColor, borders: surface(button).border, padding: surface(button).padding,
          font: parseFloat(style.fontSize), weight: Number(style.fontWeight), lineHeight: parseFloat(style.lineHeight), radius: parseFloat(style.borderTopLeftRadius),
          letterSpacing: style.letterSpacing === 'normal' ? 0 : parseFloat(style.letterSpacing), whiteSpace: style.whiteSpace,
          box: { left: rect.left - origin.left, right: rect.right - origin.left, top: rect.top - barBox.top, width: rect.width, height: rect.height },
          label: { left: label.left - rect.left, right: rect.right - label.right, top: label.top - rect.top, bottom: rect.bottom - label.bottom, width: label.width, height: label.height },
          clipped: button.scrollWidth - button.clientWidth };
      }) };
  });
}

function expectCategoryAppearance(snapshot, context, expect) {
  for (const [index, surface] of [snapshot.surface, snapshot.rowSurface].entries()) {
    expect(surface.background, `${context}: unboxed category row`).toBe('rgba(0, 0, 0, 0)');
    expect(surface.border, `${context}: category row has no border`).toEqual([0, 0, 0, 0]);
    expect(surface.padding, `${context}: only the content row reserves a pixel for fractional scroll widths`).toEqual(index ? [0, 1, 0, 0] : [0, 0, 0, 0]);
  }
  expect(snapshot.scrollSurface.padding, `${context}: the real scroller has no extra padding`).toEqual([0, 0, 0, 0]);
  if (snapshot.fixedGap !== null) expect(snapshot.fixedGap, `${context}: fixed and scrolling categories retain shared spacing`).toBeCloseTo(2, 1);
  expect(snapshot.gap, `${context}: shared category spacing`).toBe(2);
  expect(snapshot.buttons.length, `${context}: category options exist`).toBeGreaterThan(0);
  expect(snapshot.buttons.filter(button => button.selected).length, `${context}: exactly one category selected`).toBe(1);
  for (const [index, button] of snapshot.buttons.entries()) {
    const label = `${context}: ${button.text}`;
    expect(button.shared, `${label}: uses CategoryButton`).toBe(true);
    expect(button.font, `${label}: compact category type size`).toBe(13);
    expect(button.padding, `${label}: shared compact category padding`).toEqual([6, 8, 6, 8]);
    expect(button.weight, `${label}: selected and unselected categories use bold type`).toBe(700);
    expect(button.lineHeight / button.font).toBeCloseTo(1.4, 3);
    expect(button.letterSpacing).toBe(0);
    expect(button.radius, `${label}: original habit corners`).toBe(6);
    expect(button.borders, `${label}: original borderless categories`).toEqual([0, 0, 0, 0]);
    expect([button.foreground, button.background], `${label}: shared category state colors`).toEqual(button.selected
      ? ['rgb(40, 74, 58)', 'rgb(215, 232, 221)'] : ['rgb(151, 173, 174)', 'rgba(0, 0, 0, 0)']);
    expect(button.box.height, `${label}: complete touch target`).toBeGreaterThanOrEqual(40);
    expect(Math.abs(button.box.top - snapshot.buttons[0].box.top), `${label}: one category line`).toBeLessThanOrEqual(1);
    expect(button.whiteSpace, `${label}: retains a single complete label`).toBe('nowrap');
    expect(button.clipped, `${label}: no text clipping`).toBeLessThanOrEqual(1);
    for (const edge of ['left', 'right', 'top', 'bottom']) expect(button.label[edge], `${label}: text stays inside button (${edge})`).toBeGreaterThanOrEqual(-1);
    if (button.icon) {
      expect(button.label.width, `${label}: fixed flag width`).toBe(16);
      expect(button.label.height, `${label}: fixed flag height`).toBe(20);
      expect(Math.abs(button.label.left - button.label.right), `${label}: centered flag horizontally`).toBeLessThanOrEqual(1);
      expect(Math.abs(button.label.top - button.label.bottom), `${label}: centered flag vertically`).toBeLessThanOrEqual(1);
    } else expect(button.label.height, `${label}: text does not wrap`).toBeLessThanOrEqual(button.lineHeight + 1);
    if (index && button.fixed === snapshot.buttons[index - 1].fixed) expect(button.box.left - snapshot.buttons[index - 1].box.right, `${label}: adjacent spacing`).toBeCloseTo(2, 1);
  }
  expect(snapshot.buttons[0].box.left, `${context}: first option starts at row edge`).toBeCloseTo(0, 1);
  const scrolling = snapshot.buttons.filter(button => !button.fixed);
  if (scrolling.length) {
    expect(scrolling[0].box.left, `${context}: scrolling options start at their own row edge`).toBeCloseTo(0, 1);
    expect(Math.abs(snapshot.width - scrolling.at(-1).box.right), `${context}: scrolling options fill the available row`).toBeLessThanOrEqual(1);
  }
  if (snapshot.scrollWidth <= snapshot.clientWidth + 1) expect(snapshot.width, `${context}: short category rows fill available width`).toBeCloseTo(snapshot.clientWidth, 0);
}

async function checkCategoryFeedback({ page, category, context, expect, disabled = false }) {
  const unselected = category.locator(`button[aria-pressed="false"]${disabled ? '[disabled]' : ':not([disabled])'}`).first();
  const selected = category.locator('button[aria-pressed="true"]').first();
  const background = button => button.evaluate(node => getComputedStyle(node).backgroundColor);
  const feedback = disabled ? 'rgba(0, 0, 0, 0)' : 'rgba(199, 215, 223, 0.1)';
  await unselected.hover({ force: disabled });
  expect(await background(unselected), `${context}: hover feedback`).toBe(feedback);
  const bounds = await unselected.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  expect(await background(unselected), `${context}: pressed feedback`).toBe(feedback);
  await page.mouse.move(0, 0); await page.mouse.up();
  expect(await background(unselected), `${context}: leaving restores transparent background`).toBe('rgba(0, 0, 0, 0)');
  // Taro applies this class during native touch. The adapter does not synthesize
  // native hoverClass, so also verify the same class against the real shared CSS.
  await unselected.evaluate(node => node.classList.add('ui-control-pressed'));
  expect(await background(unselected), `${context}: native pressed-class feedback`).toBe(feedback);
  await unselected.evaluate(node => node.classList.remove('ui-control-pressed'));
  await selected.hover({ force: disabled });
  expect(await background(selected), `${context}: selected hover retains state`).toBe('rgb(215, 232, 221)');
  await page.mouse.down();
  expect(await background(selected), `${context}: selected press retains state`).toBe('rgb(215, 232, 221)');
  await page.mouse.move(0, 0); await page.mouse.up();
  if (disabled) {
    const choice = await selected.textContent();
    await unselected.evaluate(node => node.click());
    expect(await selected.textContent(), `${context}: disabled category cannot trigger a change`).toBe(choice);
    await expect(selected).toHaveAttribute('aria-pressed', 'true');
    await expect(unselected).toHaveAttribute('aria-pressed', 'false');
  }
}

async function revealLowerCategory(category) {
  await category.evaluate(node => {
    const scroll = node.closest('.page-scroll'), viewport = document.querySelector('.preview-content').getBoundingClientRect(), rect = node.getBoundingClientRect();
    if (scroll && (rect.top < viewport.top + 1 || rect.bottom > viewport.bottom - 1)) scroll.scrollTop += rect.top - viewport.top - 12;
  });
}

async function checkCategoryRow({ page, category, context, expect, feedback = true, lowerPage = false }) {
  await expect(category).toBeVisible();
  if (lowerPage) await revealLowerCategory(category);
  await page.mouse.move(0, 0);
  const before = await categorySnapshot(category);
  expectCategoryAppearance(before, context, expect);
  const selectedIndex = before.buttons.findIndex(button => button.selected);
  const nextIndex = before.buttons.findIndex(button => !button.selected && !button.disabled);
  if (nextIndex >= 0) {
    await category.locator('button').nth(nextIndex).click();
    await page.mouse.move(0, 0);
    const after = await categorySnapshot(category);
    expectCategoryAppearance(after, `${context} after selection`, expect);
    expect(after.buttons[nextIndex].selected, `${context}: original category selection updates`).toBe(true);
    expect(after.buttons.map(button => button.text)).toEqual(before.buttons.map(button => button.text));
    for (const [index, button] of after.buttons.entries()) for (const key of ['left', 'top', 'width', 'height']) {
      expect(Math.abs(button.box[key] - before.buttons[index].box[key]), `${context}: selecting ${after.buttons[nextIndex].text} preserves ${before.buttons[index].text} ${key}`).toBeLessThanOrEqual(1);
    }
    await category.locator('button').nth(selectedIndex).click();
    await page.mouse.move(0, 0);
    if (feedback) await checkCategoryFeedback({ page, category, context, expect });
  }
  if (lowerPage) await revealLowerCategory(category);
  const beforeScroll = await categorySnapshot(category);
  const fixedButton = category.locator('.page-category-fixed button');
  const fixedBefore = await fixedButton.count() ? await fixedButton.boundingBox() : null;
  await category.evaluate(node => { const scroll = node.matches('.page-category-scroll') ? node : node.querySelector('.page-category-scroll'); scroll.scrollLeft = scroll.scrollWidth; });
  const endBounds = await category.evaluate(node => {
    const scroll = node.matches('.page-category-scroll') ? node : node.querySelector('.page-category-scroll');
    return { scroll: scroll.getBoundingClientRect().toJSON(), last: [...scroll.querySelectorAll('button')].at(-1).getBoundingClientRect().toJSON(),
      viewport: document.querySelector('.preview-content').getBoundingClientRect().toJSON(), offset: scroll.scrollLeft, clientWidth: scroll.clientWidth, scrollWidth: scroll.scrollWidth };
  });
  await expect(category.locator('button').last(), `${context}: last category remains fully reachable ${JSON.stringify(endBounds)}`).toBeInViewport({ ratio: 1 });
  expect(endBounds.last.left, `${context}: last option stays inside the scrolling viewport`).toBeGreaterThanOrEqual(endBounds.scroll.left - 1);
  expect(endBounds.last.right, `${context}: last option is not clipped by the scrolling viewport`).toBeLessThanOrEqual(endBounds.scroll.right + 1);
  expect((await categorySnapshot(category)).buttons.map(button => button.selected), `${context}: horizontal scrolling does not change classification`).toEqual(beforeScroll.buttons.map(button => button.selected));
  if (fixedBefore) {
    await expect(fixedButton).toHaveCount(1);
    await expect(fixedButton).toHaveText('全部');
    await expect(fixedButton, `${context}: all remains visible while later categories scroll`).toBeInViewport({ ratio: 1 });
    const fixedAfter = await fixedButton.boundingBox(), bar = await category.boundingBox();
    for (const edge of ['x', 'y', 'width', 'height']) expect(fixedAfter[edge], `${context}: fixed all preserves ${edge}`).toBeCloseTo(fixedBefore[edge], 1);
    expect(fixedAfter.x, `${context}: all stays at the whole row's left edge`).toBeCloseTo(bar.x, 1);
    await category.locator('.page-category-row button').last().click();
    await fixedButton.click(); await page.mouse.move(0, 0);
    await expect(fixedButton, `${context}: fixed all restores the original all choice`).toHaveAttribute('aria-pressed', 'true');
    expectCategoryAppearance(await categorySnapshot(category), `${context} all restored`, expect);
    if (!before.buttons[0].selected) await category.locator('button').nth(selectedIndex).click();
  }
  await category.evaluate(node => { const scroll = node.matches('.page-category-scroll') ? node : node.querySelector('.page-category-scroll'); scroll.scrollLeft = 0; });
  await page.mouse.move(0, 0);
}

async function checkCategoryContainers({ page, origin, out, width, expect }) {
  await page.goto(`${origin}/?category-containers-${width}#/pages/posts/index`);
  await expect(page.locator('.posts-page .page-toolbar')).toBeVisible();
  const longDomain = '需要完整显示且可以横向滑动的领域分类';
  const longTag = '长期计划与日常生活记录分类';
  const longArticle = '需要完整显示的文章分类名称';
  await page.evaluate(({ longDomain, longTag, longArticle }) => {
    const stamp = '2026-10-06T00:00:00Z';
    const domains = [['growth', '成长'], ['work', '工作'], ['english', '英语'], ['fitness', '健身'], ['life', '生活'], ['mind', '心理'], ['photo', '摄影'], ['media', '自媒体'], ['long-domain', longDomain],
      ...Array.from({ length: 12 }, (_, index) => [`overflow-${index}`, `分类${index + 1}`])];
    window.__miniFixture.guestToolStates = {
      domains: { version: 1, domains: domains.map(([id, name]) => ({ id, name, longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] })), completedGoals: [] },
      reminders: { version: 1, items: [
        { id: 'category-first', title: '分类回归习惯一', group: '成长', domainId: 'growth', kind: 'plant', note: '', minutes: 0, enabled: true },
        { id: 'category-long', title: '分类回归习惯二', group: longDomain, domainId: 'long-domain', kind: 'plant', note: '', minutes: 0, enabled: true },
      ], done: {} },
      memos: { version: 1, notes: ['日常', '阅读', longTag].map((tag, index) => ({ id: `category-memo-${index}`, title: `分类回归便签 ${index}`, body: '仅用于隔离界面回归', color: 'sage', tags: [tag], pinned: false, createdAt: stamp, updatedAt: stamp })) },
      todos: { version: 1, categories: [{ id: 'growth', name: '成长', color: '#abd0b2' }, { id: 'long-domain', name: longDomain, color: '#abd0b2' }], tasks: ['growth', 'long-domain'].map((categoryId, index) => ({ id: `category-todo-${index}`, title: `分类回归任务 ${index}`, description: '', categoryId, important: false, urgent: false, dueDate: '', completedAt: null, createdAt: stamp, updatedAt: stamp })) },
    };
    window.__miniFixture.posts.push({ ...window.__miniFixture.posts[0], slug: 'category-long-post', title: '长分类回归文章', category: longArticle });
    location.hash = '#/pages/daily/index';
  }, { longDomain, longTag, longArticle });
  const moveTo = route => page.evaluate(value => { location.hash = `#/pages/${value}/index`; }, route);
  async function checkLongName(category, label, context, results) {
    await checkCategoryRow({ page, category, context, expect });
    // Selection resets queue a shared 30ms auto-position; let it settle before the next manual swipe.
    await page.waitForTimeout(80);
    const originalResults = results ? await results.count() : undefined;
    const option = category.getByRole('button', { name: label, exact: true });
    // Move only the category scroller so the native navigation stays fixed.
    await option.evaluate(node => { const scroll = node.closest('.page-category-scroll'); scroll.scrollLeft += node.getBoundingClientRect().left - scroll.getBoundingClientRect().left; });
    await expect(option).toBeInViewport({ ratio: 1 });
    await option.click(); await page.mouse.move(0, 0);
    await expect(option).toHaveAttribute('aria-pressed', 'true');
    if (results) await expect(results, `${context}: the selected long category keeps its original filter`).toHaveCount(1);
    expectCategoryAppearance(await categorySnapshot(category), `${context} long name selected`, expect);
    const visibleLabel = label.replace(/^(便签分类：|文章分类：|习惯分组：|待办分类：)/, '');
    await expect(option).toHaveText(context === 'memos-long' ? `#${visibleLabel}` : visibleLabel);
    await page.screenshot({ path: path.join(out, `category-${context.replace(/[^a-z0-9-]/gi, '-')}-${width}.png`) });
    await category.locator('button').first().click(); await page.mouse.move(0, 0);
    await expect(category.locator('.page-category-fixed button')).toHaveAttribute('aria-pressed', 'true');
    if (results) await expect(results, `${context}: fixed all restores all original results`).toHaveCount(originalResults);
    await category.evaluate(node => { const scroll = node.matches('.page-category-scroll') ? node : node.querySelector('.page-category-scroll'); scroll.scrollLeft = 0; });
  }
  await checkLongName(page.locator('#page-core .daily-core-filter-scroll'), longDomain, 'daily-long', page.locator('#page-core .habit-sort-tile'));
  const habitCategories = page.locator('#page-core .daily-core-filter-scroll');
  const leadingOffset = () => habitCategories.evaluate(node => {
    const scroll = node.querySelector('.page-category-scroll');
    const buttons = [...scroll.querySelectorAll('button')].map(button => button.getBoundingClientRect());
    // 健身 is scrolling index three: preceding context begins halfway through index one.
    return (buttons[1].left + buttons[2].left) / 2 - scroll.getBoundingClientRect().left;
  });
  const selectFitness = async () => {
    const option = habitCategories.getByRole('button', { name: '健身', exact: true });
    await option.evaluate(node => { const scroll = node.closest('.page-category-scroll'); scroll.scrollLeft += node.getBoundingClientRect().left - scroll.getBoundingClientRect().left; });
    await option.click(); await page.mouse.move(0, 0);
    await expect.poll(async () => Math.abs(await leadingOffset()), 'selected habit category retains one and a half preceding slots').toBeLessThanOrEqual(1);
    await expect(option).toBeInViewport({ ratio: 1 });
  };
  await selectFitness();
  await page.screenshot({ path: path.join(out, `category-daily-selection-offset-${width}.png`) });
  // Returning to an earlier target after a manual swipe must re-arm native scrollLeft.
  await habitCategories.evaluate(node => { const scroll = node.querySelector('.page-category-scroll'); scroll.scrollLeft = scroll.scrollWidth; });
  await habitCategories.locator('button').first().evaluate(node => node.click());
  await expect.poll(() => habitCategories.evaluate(node => node.querySelector('.page-category-scroll').scrollLeft), 'fixed all returns later categories to the start').toBeLessThanOrEqual(1);
  await habitCategories.locator('.page-category-row button').first().click();
  await expect.poll(() => habitCategories.evaluate(node => node.querySelector('.page-category-scroll').scrollLeft), 'the first scrolling category also clamps to the start').toBeLessThanOrEqual(1);
  await selectFitness();
  await habitCategories.locator('button').last().evaluate(node => node.click());
  await expect.poll(() => habitCategories.evaluate(node => { const scroll = node.querySelector('.page-category-scroll'); return Math.abs(scroll.scrollWidth - scroll.clientWidth - scroll.scrollLeft); }), 'last category clamps to the end').toBeLessThanOrEqual(1);
  await expect(habitCategories.locator('button').last()).toBeInViewport({ ratio: 1 });
  await expect(habitCategories.locator('.page-category-fixed button'), 'fixed all remains visible at the last selected category').toBeInViewport({ ratio: 1 });
  await habitCategories.locator('button').first().evaluate(node => node.click());
  await expect.poll(() => habitCategories.evaluate(node => node.querySelector('.page-category-scroll').scrollLeft)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: '筛选习惯', exact: true }).click();
  await expect(page.getByRole('button', { name: '打卡日历', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '关闭习惯筛选', exact: true }).click();
  await page.locator('#page-core').getByRole('button', { name: '创建习惯', exact: true }).click();
  await page.locator('.daily-editor-sheet').getByRole('button', { name: '选择习惯图标', exact: true }).click();
  await expect(page.locator('.icon-library-option').first()).toBeVisible();
  const iconResults = await page.locator('.icon-library-option').count();
  await checkCategoryRow({ page, category: page.locator('.icon-library-sheet .page-category-bar'), context: `icon library ${width}px`, expect });
  await expect(page.locator('.icon-library-option'), 'fixed all restores the complete icon catalog').toHaveCount(iconResults);
  await page.screenshot({ path: path.join(out, `category-icon-library-${width}.png`) });
  await page.getByRole('button', { name: '关闭图标库', exact: true }).click();
  await page.getByRole('button', { name: '关闭习惯编辑', exact: true }).click();
  await moveTo('memos');
  await expect(page.locator('.memo-category-row button')).toHaveCount(4);
  await checkLongName(page.locator('.memo-category-row'), `便签分类：${longTag}`, 'memos-long', page.locator('.memo-note'));
  await moveTo('posts');
  await expect(page.getByRole('button', { name: `文章分类：${longArticle}`, exact: true })).toBeVisible();
  await checkLongName(page.locator('.posts-category-row'), `文章分类：${longArticle}`, 'posts-long', page.locator('.article-card'));
  await moveTo('pomodoro');
  const source = require('./pomodoro-source-controls.cjs')({ page, expect });
  await source.select('habit');
  await checkLongName(page.locator('.focus-habit-sheet .page-category-bar'), `习惯分组：${longDomain}`, 'habit-selection-long', page.locator('.focus-habit-option'));
  await page.getByRole('button', { name: '关闭习惯选择', exact: true }).click();
  await source.select('todo');
  await expect(page.locator('.focus-todo-sheet .page-category-scroll button')).toHaveText(['', '', '', '']);
  await expect(page.locator('.focus-todo-sheet .page-category-scroll .priority-flag')).toHaveCount(4);
  await checkCategoryRow({ page, category: page.locator('.focus-todo-sheet .page-category-scroll'), context: `todo priorities ${width}px`, expect });
  await page.getByRole('button', { name: '关闭待办选择', exact: true }).click();
  expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path.startsWith('/personal-tools/') && request.method === 'PUT')), 'Classification only filters existing records').toEqual([]);
}

module.exports = async function checkPageToolbars({ page, origin, out, width, expect }) {
  const routes = ['daily', 'todos', 'domains', 'memos', 'index', 'posts', 'mottos', 'meals', 'pomodoro', 'statistics'];
  for (const route of routes) {
    await page.goto(`${origin}/#/pages/${route}/index`);
    await page.waitForTimeout(500);
    const toolbar = page.locator('.page-toolbar').first();
    if (!['pomodoro', 'statistics'].includes(route)) await expect(toolbar).toBeVisible();
    if (['daily', 'todos', 'memos'].includes(route)) {
      for (const slot of ['sort', 'filter']) {
        const button = toolbar.locator(`.page-toolbar-${slot} button`).first();
        const context = `${route} ${slot} ${width}px`;
        await checkIconCenter(button, `${context} default`, expect);
        await button.hover();
        await checkIconCenter(button, `${context} hover`, expect);
        await page.mouse.down();
        await checkIconCenter(button, `${context} pressed`, expect);
        await page.mouse.move(0, 0); await page.mouse.up();
        await checkIconCenter(button, `${context} released`, expect);
      }
    }
    if (['daily', 'todos', 'memos', 'posts'].includes(route)) {
      const sortTrigger = toolbar.locator('.page-toolbar-sort button').first();
      await sortTrigger.click();
      await expect(page.locator('.sort-popover')).toBeVisible();
      const geometry = await page.locator('.sort-popover').evaluate(node => {
        const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
        const body = node.querySelector('.sort-panel-content'), style = getComputedStyle(body);
        return { gap: parseFloat(style.rowGap), heading: box(node.querySelector('.sort-panel-heading')), footer: box(node.querySelector('.sort-panel-footer')), scroll: box(node.querySelector('.form-popover-scroll')),
          groups: [...node.querySelectorAll('.sort-options')].map(group => ({ gap: parseFloat(getComputedStyle(group).rowGap), buttons: [...group.querySelectorAll('button')].map(button => {
            const label = button.querySelector('.sort-option-label');
            return { ...box(button), label: box(label), lineHeight: parseFloat(getComputedStyle(label).lineHeight), overflow: label.scrollWidth - label.clientWidth };
          }) })) };
      });
      expect(geometry.gap, `${route}: common compact sorting group spacing`).toBe(8);
      expect(geometry.scroll.top).toBeGreaterThanOrEqual(geometry.heading.bottom - 1);
      expect(geometry.scroll.bottom).toBeLessThanOrEqual(geometry.footer.top + 1);
      for (const group of geometry.groups) {
        expect(group.gap, `${route}: common sorting button spacing`).toBe(6);
        for (const button of group.buttons) {
          expect(button.left).toBe(group.buttons[0].left); expect(button.width).toBe(group.buttons[0].width);
          expect(button.height).toBeGreaterThanOrEqual(40); expect(button.label.height).toBeLessThanOrEqual(button.lineHeight + 1);
          expect(button.overflow, `${route}: complete sorting text on one line`).toBeLessThanOrEqual(1);
        }
      }
      await page.keyboard.press('Escape');
    }
    const titles = await require('./section-title-checks.cjs')(page, expect);
    if (route === 'index') expect(titles.map(title => title.label)).toEqual(['我的快捷方式', '快捷操作', '功能界面', '阅读与空间']);
    if (route === 'daily') expect(titles.some(title => title.label === '待打卡习惯')).toBe(false);
    const layout = await page.evaluate(() => {
      const box = node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
      const viewport = box(document.querySelector('.preview-content'));
      const bar = document.querySelector('.page-toolbar');
      const slots = bar ? [...bar.querySelectorAll('.page-toolbar-slot')].map(slot => ({
        kind: ['reset', 'sort', 'filter', 'manage', 'create'].find(kind => slot.classList.contains(`page-toolbar-${kind}`)),
        box: box(slot), buttons: [...slot.querySelectorAll('button')].map(button => ({ box: box(button), text: button.textContent, font: getComputedStyle(button).fontSize }))
      })) : [];
      const category = document.querySelector('#page-core .page-category-bar,.statistics-page .page-category-bar');
      const field = document.querySelector('.today-capture input');
      return { viewport, bar: bar && box(bar), slots, field: field && box(field), category: category && box(category),
        categories: category ? [...category.querySelectorAll('button')].map(button => box(button)) : [],
        overflow: Math.max(document.documentElement.scrollWidth - innerWidth, ...[...document.querySelectorAll('.page-scroll,.tool-page,.today-page')].map(node => node.scrollWidth - node.clientWidth)) };
    });
    expect(layout.overflow, `${route} page overflow`).toBeLessThanOrEqual(2);
    const ranks = layout.slots.map(slot => ['reset', 'sort', 'filter', 'manage', 'create'].indexOf(slot.kind));
    expect(ranks, `${route} reading order`).toEqual([...ranks].sort((a, b) => a - b));
    if (route === 'index') expect(layout.slots.map(slot => slot.kind), 'Shortcut sorting and settings stay separate from capture').toEqual(['reset', 'sort', 'manage']);
    if (route === 'todos') {
      expect(layout.slots.map(slot => slot.kind), 'Task toolbar has sorting and filtering').toEqual(['reset', 'sort', 'filter']);
      await expect(page.locator('.todo-toolbar .page-category-bar,.todo-status-row')).toHaveCount(0);
      await expect(page.getByRole('button', { name: '筛选', exact: true })).toHaveText('');
      await expect(page.locator('.todo-filter-toggle .filter-symbol')).toHaveCount(1);
      await expect(page.locator('.todo-filter-toggle .select-chevron')).toHaveCount(0);
      const sortButton = toolbar.locator('.page-toolbar-sort button').first();
      await sortButton.click();
      await expect(page.locator('.todo-sort-popover')).toBeVisible();
      await expect(sortButton).toHaveAttribute('aria-pressed', 'true');
      await checkIconCenter(sortButton, `todos sorting selected ${width}px`, expect);
      await page.screenshot({ path: path.join(out, `toolbar-todos-sort-selected-${width}.png`) });
      await page.keyboard.press('Escape');
      const filterButton = page.getByRole('button', { name: '筛选', exact: true });
      await filterButton.click();
      await page.getByRole('button', { name: '筛选状态：待完成', exact: true }).click();
      await page.getByRole('button', { name: /^查看 \d+ 件任务$/ }).click();
      await expect(filterButton).toHaveAttribute('aria-pressed', 'true');
      await checkIconCenter(filterButton, `todos filtering selected ${width}px`, expect);
      await page.screenshot({ path: path.join(out, `toolbar-todos-filter-selected-${width}.png`) });
      await filterButton.click();
      const reset = page.getByRole('button', { name: '重置任务筛选', exact: true });
      await expect(reset).toHaveText(''); await expect(reset.locator('.reset-symbol')).toHaveCount(1);
      const resetBox = await reset.boundingBox(), resultBox = await page.getByRole('button', { name: /^查看 \d+ 件任务$/ }).boundingBox();
      expect(resetBox.width).toBe(40); expect(resetBox.height).toBe(40);
      expect(resultBox.x - resetBox.x - resetBox.width, 'Reset is immediately left of the task results button').toBe(6);
      expect(resetBox.y, 'Reset and results stay in the same row').toBe(resultBox.y);
      await page.getByRole('textbox', { name: '筛选关键词', exact: true }).fill('不存在的任务');
      await page.getByRole('button', { name: '筛选标签：工作', exact: true }).click();
      await reset.click();
      await expect(page.getByRole('textbox', { name: '筛选关键词', exact: true })).toHaveValue('');
      await expect(page.getByRole('button', { name: '筛选状态：全部', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('button', { name: '不限标签', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(filterButton).toHaveAttribute('aria-pressed', 'false');
      await page.getByRole('button', { name: '关闭筛选', exact: true }).click();
    }
    for (let i = 0; i < layout.slots.length; i++) {
      const slot = layout.slots[i];
      if (i) expect(slot.box.left, `${route} adjacent actions`).toBeGreaterThanOrEqual(layout.slots[i - 1].box.right + 5);
      for (const button of slot.buttons) {
        expect(button.box.height, `${route} touch height`).toBeGreaterThanOrEqual(40);
        expect(button.box.left, `${route} left edge`).toBeGreaterThanOrEqual(layout.viewport.left);
        expect(button.box.right, `${route} right edge`).toBeLessThanOrEqual(layout.viewport.right + 1);
        expect(button.box.top, `${route} controls below navigation`).toBeGreaterThanOrEqual(layout.viewport.top - 1);
        expect(button.box.bottom, `${route} controls above footer`).toBeLessThanOrEqual(layout.viewport.bottom + 1);
        expect(button.font, `${route} ${slot.kind}: shared control font`).toBe(['todos', 'daily', 'memos', 'domains', 'index'].includes(route) && ['sort', 'filter'].includes(slot.kind) || ['reset', 'manage'].includes(slot.kind) ? '22px' : '14px');
        if (['sort', 'filter'].includes(slot.kind)) {
          if (['todos', 'daily', 'memos', 'domains', 'index'].includes(route)) expect(button.text.trim()).toBe('');
          else expect(button.text.trim()).toMatch(/^(排序|筛选)/);
        }
      }
    }
    if (layout.slots.length) expect(layout.slots.at(-1).box.right, `${route} right alignment`).toBeGreaterThanOrEqual(layout.bar.right - 5);
    if (layout.field) expect(layout.field.width, 'Home capture retains readable input space after wrapping').toBeGreaterThan(120);
    if (layout.category && layout.bar) expect(layout.category.top, `${route} categories on a separate line`).toBeGreaterThanOrEqual(layout.bar.bottom - 1);
    for (const button of layout.categories) {
      expect(button.height).toBeGreaterThanOrEqual(40);
      expect(Math.abs(button.top - layout.categories[0].top), `${route} categories stay on one row`).toBeLessThanOrEqual(1);
    }
    const category = page.locator('#page-core .page-category-bar,.statistics-page .page-category-bar').first();
    if (await category.count()) {
      await checkCategoryRow({ page, category, context: `${route} ${width}px`, expect });
    }
    if (route === 'daily') {
      await expect(page.locator('#page-core').getByRole('button', { name: '全部习惯', exact: true })).toHaveCount(0);
      await expect(page.locator('#page-core').getByRole('button', { name: '管理习惯', exact: true })).toHaveCount(0);
      expect(layout.slots.map(slot => slot.kind), 'Habit toolbar omits management').toEqual(['reset', 'sort', 'filter', 'create']);
      await expect(page.locator('#page-more')).toHaveCount(0);
      await page.getByRole('button', { name: '筛选习惯', exact: true }).click();
      await expect(page.getByRole('textbox', { name: '搜索习惯', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: '重置习惯筛选', exact: true })).toBeInViewport();
      await expect(page.getByRole('button', { name: '打卡日历', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: /^筛选 \d+ 个习惯$/ }).click();
      await expect(page.getByRole('button', { name: '排序习惯', exact: true })).toBeInViewport();
      await expect.poll(async () => {
        const button = await page.getByRole('button', { name: '排序习惯', exact: true }).boundingBox();
        const viewport = await page.locator('.preview-content').boundingBox();
        return button.y - viewport.y;
      }, { message: 'Returning from the full list restores controls below native navigation' }).toBeGreaterThanOrEqual(0);
      await page.getByRole('button', { name: '排序习惯', exact: true }).click();
      await expect(page.getByRole('dialog', { name: '排序习惯', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: '排序习惯', exact: true })).toHaveText('');
      await expect(page.getByRole('button', { name: '排序习惯', exact: true })).toHaveAttribute('aria-pressed', 'false');
      await expect(page.locator('.daily-page-toolbar .select-chevron')).toHaveCount(0);
      await checkIconCenter(page.getByRole('button', { name: '排序习惯', exact: true }), `daily sorting default ${width}px`, expect);
      await page.screenshot({ path: path.join(out, `toolbar-daily-sort-default-${width}.png`) });
      await page.getByRole('button', { name: '关闭习惯排序', exact: true }).click();
      const filterButton = page.getByRole('button', { name: '筛选习惯', exact: true });
      await filterButton.click();
      await page.getByRole('button', { name: '习惯完成状态：进行中', exact: true }).click();
      await page.getByRole('dialog', { name: '筛选习惯', exact: true }).getByRole('button', { name: /^筛选 \d+ 个习惯$/ }).click();
      await expect(filterButton).toHaveAttribute('aria-pressed', 'false');
      await checkIconCenter(filterButton, `daily filtering default ${width}px`, expect);
      await page.screenshot({ path: path.join(out, `toolbar-daily-filter-default-${width}.png`) });
      await filterButton.click();
      await page.getByRole('button', { name: '习惯完成状态：全部', exact: true }).click();
      await page.getByRole('dialog', { name: '筛选习惯', exact: true }).getByRole('button', { name: /^筛选 \d+ 个习惯$/ }).click();
      await expect(filterButton).toHaveAttribute('aria-pressed', 'true');
      await expect(category.locator('button').first()).toBeEnabled();
    }
    if (route === 'posts') {
      await page.getByRole('button', { name: '文章分类：技术探索', exact: true }).click();
      await expect(page.locator('.article-category')).toHaveText(Array(5).fill('技术探索'));
      await page.getByRole('button', { name: '排序文章', exact: true }).click();
      await page.getByRole('button', { name: '文章标题', exact: true }).click();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: '筛选文章', exact: true }).click();
      await expect(page.getByRole('dialog', { name: '筛选文章', exact: true })).toBeVisible();
      await page.getByRole('button', { name: '文章标签', exact: true }).click();
      const tags = page.getByRole('dialog', { name: '文章标签', exact: true });
      await expect(tags.getByRole('button', { name: '全部标签', exact: true })).toHaveText('全部标签');
      await expect(tags.getByRole('button', { name: 'Markdown', exact: true })).toHaveText('#Markdown');
      await tags.getByRole('button', { name: 'Markdown', exact: true }).click();
      await expect(page.getByRole('button', { name: '文章标签', exact: true })).toHaveText('#Markdown');
      await expect(page.locator('.article-category'), 'Choosing the visible # label filters by the original tag value').toHaveText(Array(5).fill('技术探索'));
      await expect(page.locator('.posts-featured .article-tags button')).toHaveText(['#Markdown', '#代码']);
      await page.screenshot({ path: path.join(out, `toolbar-posts-tag-filter-${width}.png`) });
      await page.getByRole('button', { name: '文章标签', exact: true }).click();
      await tags.getByRole('button', { name: '全部标签', exact: true }).click();
      await page.getByRole('button', { name: '文章显示数量', exact: true }).click();
      await page.getByRole('button', { name: '20 篇', exact: true }).click();
      await page.keyboard.press('Escape');
    }
    await page.screenshot({ path: path.join(out, `toolbar-${route}-${width}.png`) });
  }
  await checkCategoryContainers({ page, origin, out, width, expect });
};
