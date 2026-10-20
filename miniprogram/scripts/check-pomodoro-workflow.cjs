/* Real React timer controls exercised with an isolated clock and mock WeChat only. */
const path = require('node:path');

module.exports = async function checkPomodoroWorkflow({ page: parentPage, origin, out, width, expect, checkButtonAppearance }) {
  const page = await parentPage.context().browser().newPage({ viewport: parentPage.viewportSize(), reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://preview.invalid/**', route => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' }));
  await page.clock.install({ time: new Date('2026-09-15T01:00:00Z') });
  const state = () => page.evaluate(() => window.__miniFixture.pomodoroLocalState);
  const posted = () => page.evaluate(() => window.__miniRequests.filter(request => request.path === '/wechat/pomodoro' && request.method === 'POST'));
  const subscriptions = () => page.evaluate(() => window.__miniFixture.subscriptionCalls || []);
  const reminders = () => page.evaluate(() => window.__miniFixture.pomodoroReminders || []);
  const moveTo = route => page.evaluate(value => { location.hash = value; }, `#/pages/${route}/index`);
  async function focusStatistics() {
    await moveTo('statistics');
    await page.getByRole('button', { name: '专注统计', exact: true }).click();
    await expect(page.locator('.focus-history-heading')).toBeVisible();
  }
  async function timerPage() {
    await moveTo('pomodoro');
    await expect(page.locator('.focus-live')).toBeVisible();
    await expect(page.locator('#page-more,.focus-history-heading,.focus-reminders')).toHaveCount(0);
  }
  const prompt = () => page.getByRole('dialog', { name: '保存修改？', exact: true });
  const discard = async () => { await expect(prompt()).toBeVisible(); await prompt().getByRole('button', { name: '不保存', exact: true }).click(); };
  const toolbar = () => page.locator('.focus-page-toolbar');
  const summary = () => toolbar().locator('.page-toolbar-summary');
  async function expectSummary(count, title) {
    await expect(summary().locator('.page-toolbar-summary-count')).toHaveText(`今日完成 ${count}`);
    const recent = summary().locator('.page-toolbar-summary-recent');
    if (title) {
      await expect(recent).toHaveText(title);
      await expect(recent).toHaveAttribute('aria-label', `最近专注：${title}`);
    } else await expect(recent).toHaveCount(0);
  }
  async function screenshot(name, target) {
    await page.locator(target).evaluate(element => element.scrollIntoView({ block: 'start' }));
    expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth - innerWidth,
      ...Array.from(document.querySelectorAll('.page-scroll,.focus-page')).map(element => element.scrollWidth - element.clientWidth)))).toBeLessThanOrEqual(2);
    await page.screenshot({ path: path.join(out, `${name}-${width}.png`), fullPage: true });
  }
  async function passDeadline() {
    const elapsed = await page.evaluate(() => Math.max(0, window.__miniFixture.pomodoroLocalState.active.deadline - Date.now()) + 1100);
    await page.clock.fastForward(elapsed);
  }
  async function settings(values) {
    const scrollBefore = await page.locator('.page-scroll').evaluate(node => node.scrollTop);
    await page.locator('#page-core .focus-settings-toggle').click();
    await expect(page.locator('.focus-settings')).toBeVisible();
    await page.getByRole('button', { name: '关闭节奏设置', exact: true }).click();
    await expect(page.locator('.focus-settings')).toHaveCount(0); await expect(prompt()).toHaveCount(0);
    await page.locator('#page-core .focus-settings-toggle').click();
    await expect(page.locator('.page-scroll .focus-settings')).toHaveCount(0);
    expect(await page.locator('.page-scroll').evaluate(node => node.scrollTop)).toBe(scrollBefore);
    const inputs = page.locator('.focus-settings-input input');
    for (let index = 0; index < values.length; index++) await inputs.nth(index).fill(String(values[index]));
    const bounds = await page.locator('.focus-settings').evaluate(sheet => {
      const box = node => { const rect = node.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }; };
      return { sheet: box(sheet), footer: box(sheet.querySelector('.focus-settings-actions')), viewport: box(document.querySelector('.preview-content')), overflow: sheet.scrollWidth - sheet.clientWidth };
    });
    expect(bounds.sheet.top, JSON.stringify(bounds)).toBeGreaterThanOrEqual(bounds.viewport.top - 1);
    expect(bounds.footer.bottom, JSON.stringify(bounds)).toBeLessThanOrEqual(bounds.viewport.bottom + 1);
    expect(bounds.overflow).toBeLessThanOrEqual(2);
    await page.screenshot({ path: path.join(out, `pomodoro-settings-sheet-${width}.png`) });
    const beforeSave = await state();
    await page.getByRole('button', { name: '关闭节奏设置', exact: true }).click(); await expect(prompt()).toBeVisible();
    await page.evaluate(() => { window.__miniFixture.failToolWrites = ['pomodoro']; });
    await prompt().getByRole('button', { name: '保存', exact: true }).click();
    await expect(prompt()).toHaveCount(0); await expect(page.locator('.focus-settings')).toBeVisible();
    await expect(page.locator('.focus-settings-error')).toContainText('未能保存');
    for (let index = 0; index < values.length; index++) await expect(inputs.nth(index)).toHaveValue(String(values[index]));
    expect(await state(), 'Failed settings save leaves the current timer and persisted settings intact').toEqual(beforeSave);
    await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
    await page.getByRole('button', { name: '关闭节奏设置', exact: true }).click();
    await prompt().getByRole('button', { name: '保存', exact: true }).click();
    await expect(page.locator('.focus-settings')).toHaveCount(0);
    expect(await page.locator('.page-scroll').evaluate(node => node.scrollTop)).toBe(scrollBefore);
  }
  async function loginScenario(name, resultByTemplate) {
    await page.goto(`${origin}/?pomodoro-${name}-${width}#/pages/favorites/index`);
    await page.getByPlaceholder('输入博客账号').fill('preview-reader');
    await page.getByPlaceholder('输入密码', { exact: true }).fill('fixture-only-password');
    await page.getByRole('button', { name: '登录并同步', exact: true }).click();
    await expect(page.locator('.account-user-name')).toHaveText('preview-reader');
    await page.evaluate(results => {
      window.__miniFixture.pomodoroConfig = { enabled: true, requiresSubscription: true, templates: [
        { event: 'focus_start', templateId: 'preview-focus-start' },
        { event: 'break_start', templateId: 'preview-break-start' },
        { event: 'break_end', templateId: 'preview-break-end' },
      ] };
      window.__miniFixture.subscriptionResults = results;
      location.hash = '#/pages/index/index';
    }, resultByTemplate || {});
    await expect(page.getByRole('button', { name: '开始番茄钟', exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__miniRequests.some(request => request.path === '/wechat/pomodoro/config'))).toBe(true);
    // The home page preloads consent configuration; complete the adapter's 15 ms requests.
    await page.clock.runFor(100);
    await page.getByRole('button', { name: '开始番茄钟', exact: true }).click();
    await expect(page.locator('.focus-live')).toContainText('正在计时');
  }

  async function sourceMenu() {
    const source = require('./pomodoro-source-controls.cjs')({ page, expect });
    const snapshot = () => page.evaluate(() => window.__miniFixture.pomodoroLocalState || window.__miniFixture.guestToolStates.pomodoro);
    await page.goto(`${origin}/?pomodoro-source-menu-${width}#/pages/posts/index`);
    await page.evaluate(() => {
      const createdAt = '2026-09-15T00:00:00Z';
      window.__miniFixture.guestToolStates = {
        reminders: { version: 1, items: [{ id: 'source-habit', title: '阅读并整理摘录', kind: 'notes', group: '学习', minutes: 15, enabled: true, note: '' }], done: {} },
        todos: { version: 1, categories: [], tasks: [{ id: 'source-task', title: '校对本周工作报告', description: '', categoryId: '', important: false, urgent: false, dueDate: '', completedAt: null, createdAt, updatedAt: createdAt }] },
        pomodoro: { version: 1, settings: { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4, transitionMode: 'autoBreak' }, mode: 'focus', selection: { taskId: null, habitId: null, title: '整理较长的专注事项名称并校对今天的工作记录 / 阅读 50% & 摘录' }, active: null, sessions: [], completedFocusCount: 0 },
      };
      location.hash = '#/pages/pomodoro/index';
    });
    await expect(page.locator('.focus-live')).toContainText('准备就绪');
    await expect(source.toggle()).toBeEnabled();
    await expect(source.toggle()).toHaveText('');
    await expect(source.toggle()).toHaveAttribute('aria-expanded', 'false');
    await expect(source.menu()).toHaveCount(0);
    const before = await snapshot();
    await page.clock.runFor(120);
    const actionBounds = await page.locator('.focus-primary-actions button').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; }));
    await source.open();
    // The independent choices leave the clock and action geometry intact.
    await page.clock.runFor(120);
    await expect(source.menu().getByRole('button')).toHaveText(['习惯', '待办']);
    await expect(source.option('habit')).toBeEnabled();
    await expect(source.option('todo')).toBeEnabled();
    const layout = await page.evaluate(() => {
      const box = node => { const rect = node.getBoundingClientRect(); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }; };
      return {
        input: box(document.querySelector('.focus-purpose-input')), toggle: box(document.querySelector('.focus-source-toggle')),
        menu: box(document.querySelector('.focus-source-menu')), viewport: box(document.querySelector('.preview-content')),
        menuIcons: [...document.querySelectorAll('.focus-source-menu .library-icon')].map(node => ({ ...box(node), src: node.getAttribute('src'), loaded: node.complete && node.naturalWidth > 0 })),
        bodyPadding: (() => { const style = getComputedStyle(document.querySelector('.focus-source-menu .form-popover-body')); return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft]; })(),
        stage: box(document.querySelector('.focus-timer-stage')), tomato: box(document.querySelector('.focus-tomato-scene')),
        options: [...document.querySelectorAll('.focus-source-menu button')].map(button => {
          const r = button.getBoundingClientRect(), icon = button.querySelector('.form-choice-icon').getBoundingClientRect();
          const label = button.querySelector('.form-choice-label'), range = document.createRange(); range.selectNodeContents(label);
          const text = range.getBoundingClientRect();
          return { ...box(button), leading: icon.left - r.left, trailing: r.right - text.right, textGap: text.left - icon.right, lines: range.getClientRects().length };
        }),
        actions: [...document.querySelectorAll('.focus-primary-actions button')].map(box),
        arrow: box(document.querySelector('#page-core')),
        overflow: document.querySelector('.page-scroll').scrollWidth - document.querySelector('.page-scroll').clientWidth,
      };
    });
    expect(Math.abs((layout.input.top + layout.input.bottom) / 2 - (layout.toggle.top + layout.toggle.bottom) / 2), JSON.stringify(layout)).toBeLessThanOrEqual(1);
    expect(layout.input.width, JSON.stringify(layout)).toBeGreaterThan(120);
    expect(layout.toggle.left, JSON.stringify(layout)).toBeGreaterThanOrEqual(layout.input.right - 1);
    expect(layout.toggle.right, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport.right + 1);
    expect(layout.menu.top, JSON.stringify(layout)).toBeGreaterThanOrEqual(layout.viewport.top);
    expect(layout.menu.bottom, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport.bottom);
    expect(layout.menu.width, 'Two sources use a compact menu').toBeCloseTo(104, 0);
    expect(layout.toggle.top - layout.menu.bottom, 'The menu opens above the arrow with a true eight-pixel gap').toBeCloseTo(8, 0);
    expect(layout.menu.bottom, 'The source menu leaves the start button uncovered').toBeLessThan(layout.actions[0].top);
    expect(layout.options[1].top - layout.options[0].bottom, 'Sources occupy two full rows').toBeCloseTo(4, 0);
    expect(layout.options[0].left).toBeCloseTo(layout.options[1].left, 0);
    expect(layout.options[0].width).toBeCloseTo(layout.options[1].width, 0);
    expect(layout.bodyPadding).toEqual(['4px', '12px', '4px', '12px']);
    expect(layout.menuIcons.map(icon => icon.src)).toEqual(['/assets/habits/plant.png', '/assets/icons/calendar.png']);
    for (const icon of layout.menuIcons) { expect(icon.loaded).toBe(true); expect(icon.width).toBeCloseTo(20, 0); expect(icon.height).toBeCloseTo(20, 0); }
    expect(Math.min(Math.abs(layout.menu.top - layout.toggle.bottom), Math.abs(layout.toggle.top - layout.menu.bottom)), JSON.stringify(layout)).toBeCloseTo(8, 0);
    expect(layout.tomato.left, JSON.stringify(layout)).toBeGreaterThanOrEqual(layout.stage.left - 2);
    expect(layout.tomato.right, JSON.stringify(layout)).toBeLessThanOrEqual(layout.stage.right + 2);
    expect(layout.tomato.top, JSON.stringify(layout)).toBeGreaterThanOrEqual(layout.stage.top - 2);
    expect(layout.tomato.bottom, JSON.stringify(layout)).toBeLessThanOrEqual(layout.stage.bottom + 2);
    for (const option of layout.options) {
      expect(Math.abs(option.leading - option.trailing), 'The icon and full label have equal leading/trailing space').toBeLessThanOrEqual(1);
      expect(option.textGap).toBeCloseTo(8, 0); expect(option.lines, 'Each two-character label fits on one line').toBe(1);
      expect(option.height, JSON.stringify(layout)).toBeGreaterThanOrEqual(40);
      expect(option.left, JSON.stringify(layout)).toBeGreaterThanOrEqual(layout.viewport.left - 1);
      expect(option.right, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport.right + 1);
    }
    for (const action of layout.actions) {
      expect(action.bottom, JSON.stringify(layout)).toBeLessThanOrEqual(layout.arrow.bottom + 1);
    }
    layout.actions.forEach((action, index) => Object.keys(actionBounds[index]).forEach(key => expect(Math.abs(action[key] - actionBounds[index][key]), 'Source popup preserves each action boundary').toBeLessThanOrEqual(1)));
    expect(layout.overflow, JSON.stringify(layout)).toBeLessThanOrEqual(2);
    await page.screenshot({ path: path.join(out, `pomodoro-source-menu-${width}.png`) });
    await source.close();
    expect(await snapshot()).toEqual(before);
    await source.open();
    await page.locator('.form-popover-backdrop').click({ position: { x: 4, y: 4 } });
    await expect(source.toggle()).toHaveAttribute('aria-expanded', 'false');
    await expect(source.menu()).toHaveCount(0);
    expect(await snapshot()).toEqual(before);
    await source.select('todo');
    await page.getByRole('button', { name: '选择待办：校对本周工作报告', exact: true }).click();
    await expect(page.locator('.focus-todo-sheet')).toHaveCount(0);
    await expect(source.menu()).toHaveCount(0);
    await expect(page.locator('.focus-purpose-input')).toHaveValue('校对本周工作报告');
    await source.open();
    await expect(source.option('todo')).toHaveAttribute('aria-pressed', 'true');
    await expect(source.option('habit')).toHaveAttribute('aria-pressed', 'false');
    await source.close();
    // A ready clock keeps its source in the existing local draft until start.
    expect(await snapshot()).toEqual(before);

    await page.goto(`${origin}/?pomodoro-empty-sources-${width}#/pages/posts/index`);
    await page.evaluate(() => {
      window.__miniFixture.guestToolStates = {
        reminders: { version: 1, items: [], done: {} },
        todos: { version: 1, categories: [], tasks: [] },
      };
      location.hash = '#/pages/pomodoro/index';
    });
    await expect(page.locator('.focus-live')).toContainText('准备就绪');
    await source.open();
    await expect(source.option('habit')).toBeDisabled();
    await expect(source.option('todo')).toBeDisabled();
    await expect(page.locator('.focus-habit-sheet,.focus-todo-sheet')).toHaveCount(0);
    await source.close();
    await page.locator('.focus-purpose-input').fill('自由专注');
    await expect(page.locator('.focus-purpose-input')).toHaveValue('自由专注');
  }

  async function quickDurationAndStableActions() {
    await page.goto(`${origin}/?pomodoro-quick-${width}#/pages/pomodoro/index`);
    await expect(page.locator('.focus-live')).toContainText('准备就绪');
    async function assertActionLayout(safeArea) {
      const layout = await page.evaluate(() => {
        const box = node => { const rect = node.getBoundingClientRect(); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }; };
        const scroll = document.querySelector('.page-scroll');
        return { viewport: box(document.querySelector('.preview-content')), card: box(document.querySelector('.focus-clock-card')),
          purpose: box(document.querySelector('.focus-purpose-slot')), scene: box(document.querySelector('.focus-tomato-scene')), start: box(document.querySelector('.focus-start')),
          end: box(document.querySelector('.focus-end-slot')), feedback: box(document.querySelector('.focus-feedback-slot')),
          overflow: scroll.scrollHeight - scroll.clientHeight, horizontal: scroll.scrollWidth - scroll.clientWidth };
      });
      expect(layout.start.left, JSON.stringify(layout)).toBeCloseTo(layout.purpose.left, 0);
      expect(layout.start.width, 'Start/pause/resume uses the complete input row width').toBeCloseTo(layout.purpose.width, 0);
      expect(layout.start.height).toBeCloseTo(48, 0);
      expect(layout.end.left).toBeCloseTo(layout.start.left, 0);
      expect(layout.end.width).toBeCloseTo(layout.start.width, 0);
      expect(layout.end.height).toBeCloseTo(48, 0);
      expect(layout.card.bottom - layout.end.bottom, 'Operations align with the card bottom inset and border').toBeCloseTo(13, 0);
      expect(layout.purpose.top - layout.scene.bottom, 'The raised tomato leaves a 24 px gap above the unchanged purpose row').toBeCloseTo(24, 0);
      expect(layout.start.top - layout.purpose.bottom, 'Purpose and controls keep a compact gap without a caption row').toBeCloseTo(20, 0);
      expect(layout.viewport.bottom - layout.end.bottom, 'End is clear of both the fixed feedback area and screen bottom').toBeGreaterThanOrEqual(52);
      expect(layout.end.bottom, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport.bottom - safeArea - 24);
      expect(layout.feedback.height).toBeCloseTo(40, 0);
      expect(layout.feedback.bottom, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport.bottom + 1);
      expect(layout.overflow, 'The complete timer fits without scrolling').toBeLessThanOrEqual(2);
      expect(layout.horizontal).toBeLessThanOrEqual(2);
    }
    await page.clock.runFor(120);
    await assertActionLayout(0);
    await page.evaluate(() => document.documentElement.style.setProperty('--preview-safe-area-bottom', '34px'));
    await page.clock.runFor(120);
    await assertActionLayout(34);
    const geometry = () => page.locator('.focus-primary-actions button,.focus-end-slot,.focus-timer-stage').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
    const before = await geometry();
    const assertStable = async () => { const after = await geometry(); expect(after).toHaveLength(before.length); after.forEach((box, i) => Object.keys(box).forEach(key => expect(Math.abs(box[key] - before[i][key]), JSON.stringify({ before, after })).toBeLessThanOrEqual(1))); await assertActionLayout(34); };
    const start = page.locator('.focus-start'), end = page.getByRole('button', { name: '结束', exact: true });
    await expect(page.locator('.focus-end-space')).toBeVisible();
    expect(await page.locator('.focus-settings-toggle').innerText()).toBe('');
    await expect(toolbar().locator('.page-toolbar-manage .focus-settings-toggle')).toHaveCount(1);
    await expect(page.locator('.focus-primary-actions .focus-settings-toggle')).toHaveCount(0);
    await expect(page.locator('.focus-settings-space,.focus-reset')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '重置', exact: true })).toHaveCount(0);
    await expect(page.locator('.focus-primary-actions button')).toHaveCount(1);
    await expect(page.locator('.focus-end-space')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('.focus-end-space button')).toHaveCount(0);
    const settingBounds = await page.locator('.focus-settings-toggle').boundingBox(), toolbarBounds = await toolbar().boundingBox();
    expect(settingBounds.x + settingBounds.width).toBeCloseTo(toolbarBounds.x + toolbarBounds.width, 0);
    expect(settingBounds.y + settingBounds.height).toBeLessThanOrEqual((await page.locator('.focus-primary-actions').boundingBox()).y);
    expect(settingBounds.width).toBeGreaterThanOrEqual(40); expect(settingBounds.height).toBeGreaterThanOrEqual(40);
    await expectSummary(0);
    await page.getByRole('button', { name: '修改当前计时时长', exact: true }).click();
    const minutes = page.getByLabel('本次计时分钟', { exact: true });
    await expect(minutes).toBeFocused();
    expect(await minutes.evaluate(node => [node.selectionStart, node.selectionEnd])).toEqual([0, 2]);
    // Type without clicking/filling the field: the original 25 must be replaced.
    await page.keyboard.type('0');
    await expect(minutes).toHaveValue('0');
    await page.getByRole('button', { name: '确认', exact: true }).click();
    await expect(page.locator('.focus-settings-error')).toContainText('1 至 120');
    await page.getByLabel('本次计时分钟', { exact: true }).fill('7');
    const quickFooterPadding = await page.locator('.focus-quick-window .sheet-actions').evaluate(node => parseFloat(getComputedStyle(node).paddingBottom));
    expect(quickFooterPadding).toBe(8);
    await page.locator('.focus-quick-overlay .sheet-backdrop').click({ position: { x: 4, y: 4 } });
    await expect(prompt()).toBeVisible(); await prompt().getByRole('button', { name: '继续编辑', exact: true }).click();
    await expect(minutes).toHaveValue('7');
    await page.getByRole('button', { name: '关闭时长设置', exact: true }).click(); await discard();
    await expect(page.locator('.focus-time')).toHaveText('25:00');
    await page.getByRole('button', { name: '修改当前计时时长', exact: true }).click();
    await expect(minutes).toBeFocused();
    expect(await minutes.evaluate(node => [node.selectionStart, node.selectionEnd])).toEqual([0, 2]);
    await page.keyboard.type('7');
    await expect(minutes).toHaveValue('7');
    await page.keyboard.type('2');
    await expect(minutes).toHaveValue('72');
    await minutes.press('Backspace');
    await expect(minutes).toHaveValue('7');
    await page.screenshot({ path: path.join(out, `pomodoro-quick-duration-${width}.png`) });
    await minutes.press('Enter');
    await expect(page.locator('.focus-time')).toHaveText('07:00');
    await assertStable();
    await page.locator('.focus-settings-toggle').click();
    expect(await page.locator('.focus-settings-actions').evaluate(node => parseFloat(getComputedStyle(node).paddingBottom))).toBe(34);
    await expect(page.locator('.focus-transition-picker select')).toHaveCount(0);
    await expect(page.locator('.focus-settings .filter-field-label')).toHaveText(['专注', '短休息', '长休息', '长休息间隔', '时间结束后']);
    await require('./section-title-checks.cjs')(page.locator('.focus-settings'), expect);
    await expect(page.getByRole('button', { name: '时间结束后', exact: true })).toContainText('自动休息');
    await page.getByRole('button', { name: '时间结束后', exact: true }).click();
    await expect(page.locator('.form-popover-panel')).toBeVisible();
    await expect(page.locator('.form-popover-panel').getByRole('button', { name: '自动休息', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '不自动休息', exact: true }).click();
    await expect(page.getByRole('button', { name: '时间结束后', exact: true })).toContainText('不自动休息');
    await page.screenshot({ path: path.join(out, `pomodoro-settings-${width}.png`) });
    await page.getByRole('button', { name: '关闭节奏设置', exact: true }).click(); await discard();
    await assertStable();
    await page.evaluate(() => { window.__miniFixture.modalFailure = true; });
    await start.click(); await expect(page.locator('.focus-live')).toContainText('正在计时');
    expect((await state()).active.totalSeconds).toBe(420);
    expect((await state()).settings.focus).toBe(25);
    await expect(page.locator('.focus-time')).toBeDisabled();
    await expect(end).toHaveCount(0); await assertStable();
    await page.clock.fastForward(12000);
    await start.click(); await expect(page.locator('.focus-live')).toContainText('已暂停');
    await assertStable();
    const a = await start.boundingBox(), b = await end.boundingBox();
    expect(b.x).toBeCloseTo(a.x, 0); expect(b.width).toBeCloseTo(a.width, 0); expect(b.height).toBeCloseTo(a.height, 0);
    await page.screenshot({ path: path.join(out, `pomodoro-stable-paused-${width}.png`) });
    await start.click(); await expect(page.locator('.focus-live')).toContainText('正在计时'); await expect(end).toHaveCount(0); await assertStable();
    await start.click(); await expect(page.locator('.focus-live')).toContainText('已暂停');
    await end.click(); await expect(page.locator('.focus-live')).toContainText('准备就绪'); await assertStable();
    expect((await state()).sessions).toHaveLength(1);
    expect((await state()).sessions[0]).toMatchObject({ durationSeconds: 12, plannedSeconds: 420, completed: false });
    await expectSummary(0);
    const firstEnded = (await state()).sessions[0];
    await start.click(); await expect(page.locator('.focus-live')).toContainText('正在计时');
    const secondId = (await state()).active.id;
    await page.clock.fastForward(6000);
    await start.click(); await expect(page.locator('.focus-live')).toContainText('已暂停'); await assertStable();
    await end.click();
    await expect(page.locator('.focus-live')).toContainText('准备就绪'); await assertStable();
    expect((await state()).sessions).toHaveLength(2);
    expect((await state()).sessions.find(session => session.id === secondId)).toMatchObject({ durationSeconds: 6, plannedSeconds: 1500, completed: false });
    expect((await state()).sessions.find(session => session.id === firstEnded.id)).toEqual(firstEnded);
    await expectSummary(0);
    expect(await page.evaluate(() => window.__miniFixture.modalCalls || [])).toEqual([]);
  }

  async function toolbarSummaryScenario() {
    const now = new Date('2026-09-15T01:00:00Z').getTime();
    const at = offset => new Date(now + offset).toISOString();
    const recentTitle = '最近提前结束的专注事项'.repeat(8);
    const session = (id, title, offset, completed = true, mode = 'focus') => ({ id, title, mode, completed, taskId: null, habitId: null,
      startedAt: at(offset - 60000), endedAt: at(offset), durationSeconds: 60, plannedSeconds: 60 });
    const sessions = [
      session('previous-day', '昨日完成的番茄钟', -26 * 3600000), session('today-first', '今天较早完成的番茄钟', -20 * 60000),
      session('today-second', '今天第二个完整番茄钟', -10 * 60000), session('latest-early', recentTitle, -5 * 60000, false),
      session('latest-rest', '休息记录不能替代最近事项', -60000, true, 'shortBreak'), session('future-focus', '未来记录不能计入今日或最近', 3600000),
    ];
    const seed = records => ({ version: 1, settings: { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4, transitionMode: 'autoBreak' },
      mode: 'focus', selection: { taskId: null, habitId: null, title: '' }, active: null, sessions: records, completedFocusCount: 99 });
    async function fresh(name, records) {
      await page.clock.setSystemTime(now);
      await page.goto(`${origin}/?pomodoro-summary-${name}-${width}#/pages/posts/index`);
      await page.evaluate(data => {
        localStorage.clear(); window.__miniFixture.persistEntryTools = true;
        window.__miniFixture.guestToolStates = { pomodoro: data };
        localStorage.setItem('ottlog-mini-tool-v1:guest:pomodoro', JSON.stringify({ data, pending: false, revision: 0 }));
        location.hash = '#/pages/pomodoro/index';
      }, seed(records));
      await expect(page.locator('.focus-live')).toContainText('准备就绪');
    }
    const settingsGeometry = () => toolbar().getByRole('button', { name: '调整节奏', exact: true }).boundingBox();
    await fresh('records', sessions);
    await expectSummary(2, recentTitle);
    const geometry = await toolbar().evaluate(node => {
      const box = element => { const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, height: rect.height }; };
      const recent = node.querySelector('.page-toolbar-summary-recent');
      return { toolbar: box(node), summary: box(node.querySelector('.page-toolbar-summary')), actions: box(node.querySelector('.page-toolbar-actions')),
        recent: { whiteSpace: getComputedStyle(recent).whiteSpace, textOverflow: getComputedStyle(recent).textOverflow, overflow: recent.scrollWidth - recent.clientWidth },
        modeTop: document.querySelector('.focus-toolbar').getBoundingClientRect().top, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    expect(geometry.summary.left).toBeCloseTo(geometry.toolbar.left, 1);
    expect(geometry.summary.right, 'Summary never overlaps the right-hand settings entry').toBeLessThanOrEqual(geometry.actions.left - 5);
    expect(geometry.summary.top).toBeGreaterThanOrEqual(geometry.toolbar.top - 1);
    expect(geometry.summary.bottom).toBeLessThanOrEqual(geometry.toolbar.bottom + 1);
    expect(geometry.toolbar.height, 'Summary and setting share the same first row').toBeLessThanOrEqual(44);
    expect(geometry.toolbar.bottom).toBeLessThanOrEqual(geometry.modeTop + 1);
    expect(geometry.recent.whiteSpace).toBe('nowrap'); expect(geometry.recent.textOverflow).toBe('ellipsis');
    expect(geometry.recent.overflow).toBeGreaterThan(0); expect(geometry.overflow).toBeLessThanOrEqual(2);
    const settingsBefore = await settingsGeometry();
    await page.screenshot({ path: path.join(out, `pomodoro-toolbar-summary-${width}.png`) });
    // History filters alter the visible log, never the toolbar's all-history summary.
    await focusStatistics();
    await page.getByRole('button', { name: '休息', exact: true }).click();
    await timerPage();
    await expectSummary(2, recentTitle);
    // The current date changes while this page remains mounted.
    const nextDay = await page.evaluate(() => { const date = new Date(); date.setDate(date.getDate() + 1); date.setHours(0, 1, 0, 0); return date.getTime(); });
    await page.clock.setSystemTime(nextDay); await page.clock.runFor(60001);
    await expectSummary(0, '未来记录不能计入今日或最近');
    const settingsAfter = await settingsGeometry();
    for (const key of ['x', 'y', 'width', 'height']) expect(settingsAfter[key], `Midnight refresh preserves settings ${key}`).toBeCloseTo(settingsBefore[key], 1);

    await fresh('unnamed', [...sessions, session('latest-unnamed', '', -30000, false)]);
    await expectSummary(2);
    await fresh('delete-completed', [sessions[0], sessions[1], sessions[2]]);
    await expectSummary(2, '今天第二个完整番茄钟');
    await focusStatistics();
    await page.getByRole('button', { name: '删除今天第二个完整番茄钟记录', exact: true }).click();
    await page.getByRole('dialog', { name: '删除计时记录', exact: true }).getByRole('button', { name: '删除', exact: true }).click();
    await expect(page.getByRole('dialog', { name: '删除计时记录', exact: true })).toHaveCount(0);
    await timerPage();
    await expectSummary(1, '今天较早完成的番茄钟');
    // Stable ties cannot depend on the source array's insertion order.
    const tied = [session('tie-a', '同一时刻的事项甲', -120000, false), session('tie-z', '同一时刻的事项乙', -120000, false)];
    await fresh('tie-first', [...sessions, ...tied]);
    await expect(summary().locator('.page-toolbar-summary-recent')).toHaveText(/同一时刻的事项[甲乙]/);
    const tieTitle = await summary().locator('.page-toolbar-summary-recent').innerText();
    await fresh('tie-reversed', [...sessions, ...tied.reverse()]);
    await expectSummary(2, tieTitle);

    // Observe a real deferred GET across accounts, then a malformed source.
    const accountA = seed([session('account-a', '账号甲的专注事项', -60000)]);
    const accountB = seed([session('account-b', '账号乙昨日的专注事项', -26 * 3600000)]);
    await page.evaluate(({ a, b }) => {
      window.__miniFixture.accountToolStates = { 'focus-summary-a': { pomodoro: a }, 'focus-summary-b': { pomodoro: b },
        'focus-summary-invalid': { pomodoro: { ...a, sessions: [{ ...a.sessions[0], endedAt: 'invalid-date' }] } } };
      window.__miniFixture.sessionProfile = { authenticated: true, userName: 'focus-summary-a', isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session');
    }, { a: accountA, b: accountB });
    await expectSummary(1, '账号甲的专注事项');
    await toolbar().getByRole('button', { name: '调整节奏', exact: true }).click();
    await expect(page.locator('.focus-settings')).toBeVisible();
    await page.evaluate(() => {
      window.__miniFixture.deferToolReads = ['pomodoro']; window.__miniFixture.pendingToolReads = [];
      window.__miniFixture.sessionProfile = { authenticated: true, userName: 'focus-summary-b', isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session');
    });
    await expect.poll(() => page.evaluate(() => window.__miniFixture.pendingToolReads.length)).toBeGreaterThan(0);
    await expect(summary(), 'Previous account information is hidden until the new source is ready').toHaveCount(0);
    await expect(page.locator('.focus-settings')).toHaveCount(0);
    await page.evaluate(() => { window.__miniFixture.deferToolReads = []; for (const read of window.__miniFixture.pendingToolReads.splice(0)) read.resolve(); });
    await expectSummary(0, '账号乙昨日的专注事项');
    await page.evaluate(() => { window.__miniFixture.sessionProfile = { authenticated: true, userName: 'focus-summary-invalid', isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session'); });
    await expect(summary(), 'Invalid history must not display normalized default feedback').toHaveCount(0);
    await page.evaluate(() => { window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session'); });
    await expectSummary(2, tieTitle);
    expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path.startsWith('/personal-tools/') && request.method === 'PUT')), 'Reading the toolbar never writes account records').toEqual([]);
  }

  try {
    await toolbarSummaryScenario();
    await sourceMenu();
    await quickDurationAndStableActions();
    await require('./check-pomodoro-domain.cjs')({ page, origin, out, width, expect });
    await require('./check-pomodoro-todo-workflow.cjs')({ page, origin, out, width, expect });
    await require('./check-pomodoro-habit-workflow.cjs')({ page, origin, out, width, expect });
    await page.goto(`${origin}/?pomodoro-unconfigured-${width}#/pages/index/index`);
    await page.getByRole('button', { name: '开始番茄钟', exact: true }).click();
    await expect(page.locator('.focus-live')).toContainText('正在计时');
    await expect.poll(async () => (await state())?.active?.totalSeconds).toBe(1500);
    const defaultRun = await state();
    expect(defaultRun.settings).toMatchObject({ focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4, transitionMode: 'autoBreak' });
    expect(defaultRun.active.running).toBe(true);
    expect(defaultRun.sessions).toHaveLength(0);
    await focusStatistics();
    await expect(page.locator('.focus-reminder-note')).toContainText('尚未配置');
    await timerPage();
    expect(await posted()).toHaveLength(0);
    expect(await subscriptions()).toHaveLength(0);
    // Core entry opens an independent sheet; cancelling and invalid input never
    // change settings or the current timer, and errors stay inside the sheet.
    await expect(page.locator('#page-core .focus-settings-toggle')).toHaveCount(1);
    await expect(page.locator('#page-more')).toHaveCount(0);
    const rhythmButton = await page.locator('.focus-settings-toggle').boundingBox();
    expect(rhythmButton.y + rhythmButton.height).toBeLessThanOrEqual((await page.locator('.preview-content').boundingBox()).y + (await page.locator('.preview-content').boundingBox()).height);
    await page.locator('.focus-settings-toggle').click();
    await page.getByLabel('专注时长', { exact: true }).fill('35');
    await page.getByRole('button', { name: '关闭节奏设置', exact: true }).click();
    await expect(prompt()).toBeVisible(); await prompt().getByRole('button', { name: '继续编辑', exact: true }).click();
    await expect(page.getByLabel('专注时长', { exact: true })).toHaveValue('35');
    await page.getByRole('button', { name: '关闭节奏设置', exact: true }).click(); await discard();
    expect(await state()).toEqual(defaultRun);
    await page.locator('.focus-settings-toggle').click();
    await expect(page.getByLabel('专注时长', { exact: true })).toHaveValue('25');
    await page.getByLabel('专注时长', { exact: true }).fill('0');
    await page.getByRole('button', { name: '保存节奏', exact: true }).click();
    await expect(page.locator('.focus-settings-error')).toContainText('1 至 120');
    expect(await state()).toEqual(defaultRun);
    await page.locator('.focus-settings-backdrop').click({ position: { x: 12, y: 12 } });
    await expect(prompt()).toBeVisible(); await prompt().getByRole('button', { name: '保存', exact: true }).click();
    await expect(prompt()).toHaveCount(0); await expect(page.locator('.focus-settings-error')).toContainText('1 至 120');
    await expect(page.getByLabel('专注时长', { exact: true })).toHaveValue('0');
    await page.getByRole('button', { name: '关闭节奏设置', exact: true }).click(); await discard();
    await expect(page.locator('.focus-settings')).toHaveCount(0);
    await settings([1, 1, 2, 2]);
    const adjusted = await state();
    expect(adjusted.active.id).toBe(defaultRun.active.id);
    expect(adjusted.active.deadline).toBe(defaultRun.active.deadline);
    expect(adjusted.active.totalSeconds).toBe(1500);
    expect(adjusted.settings).toMatchObject({ focus: 1, shortBreak: 1, longBreak: 2, longEvery: 2 });
    await screenshot('pomodoro-default-running', '.focus-clock-card');

    await page.clock.fastForward(5000);
    await page.locator('.focus-start').click();
    await expect(page.locator('.focus-live')).toContainText('已暂停');
    const initialPaused = (await state()).active;
    await page.getByRole('button', { name: '结束', exact: true }).click();
    await expect(page.locator('.focus-live')).toContainText('准备就绪');
    await expect(page.locator('.focus-time')).toHaveText('01:00');
    const initialEnded = await state();
    expect(initialEnded.sessions).toHaveLength(1);
    expect(initialEnded.sessions[0]).toMatchObject({ id: defaultRun.active.id, durationSeconds: initialPaused.totalSeconds - initialPaused.remainingSeconds, plannedSeconds: 1500, completed: false });
    expect(initialEnded.sessions[0].durationSeconds).toBeGreaterThanOrEqual(5);
    expect(initialEnded.completedFocusCount).toBe(0);
    await page.locator('.focus-start').click();
    await expect(page.locator('.focus-live')).toContainText('正在计时');
    const first = (await state()).active;
    await page.clock.fastForward(30_000);
    await expect(page.locator('.focus-time')).toHaveText('00:30');
    await expect(page.locator('.focus-tomato-tick.is-lit')).toHaveCount(18);
    expect(await page.locator('.focus-tomato-progress > div').evaluate(node => parseFloat(node.style.width))).toBe(50);
    await expect(page.locator('.focus-tomato-art')).toHaveAttribute('src', '/pages/pomodoro/assets/tomato-focus.png');
    await expect.poll(() => page.locator('.focus-tomato-art').evaluate(node => ({ complete: node.complete, width: node.naturalWidth, height: node.naturalHeight }))).toEqual({ complete: true, width: 960, height: 860 });
    await screenshot('pomodoro-subpackage-focus', '.focus-clock-card');
    await passDeadline();
    await expect(page.locator('.focus-dial-kind')).toHaveText('短休息时间');
    await expect(page.locator('.focus-tomato-art')).toHaveAttribute('src', '/pages/pomodoro/assets/tomato-rest.png');
    await expect.poll(() => page.locator('.focus-tomato-art').evaluate(node => ({ complete: node.complete, width: node.naturalWidth, height: node.naturalHeight }))).toEqual({ complete: true, width: 960, height: 860 });
    await screenshot('pomodoro-subpackage-rest', '.focus-clock-card');
    await expect(page.locator('.focus-live')).toContainText('正在计时');
    const shortRest = await state();
    expect(shortRest.active.rootRunId).toBe(first.id);
    expect(shortRest.active.originFocusId).toBe(first.id);
    expect(shortRest.active.deadline).toBe(first.deadline + 60_000);
    expect(shortRest.sessions).toHaveLength(initialEnded.sessions.length + 1);
    expect(shortRest.sessions[0].endedAt).toBe(new Date(first.deadline).toISOString());
    await expectSummary(1);
    await passDeadline();
    await expect(page.locator('.focus-live')).toContainText('准备就绪');
    await expect(page.locator('.focus-dial-kind')).toHaveText('专注时间');
    expect((await state()).sessions).toHaveLength(initialEnded.sessions.length + 2);
    await expectSummary(1);
    await page.locator('.focus-start').click();
    await expect(page.locator('.focus-live')).toContainText('正在计时');
    const second = (await state()).active;
    await passDeadline();
    await expect(page.locator('.focus-dial-kind')).toHaveText('长休息时间');
    const longRest = await state();
    expect(longRest.active.totalSeconds).toBe(120);
    expect(longRest.active.deadline).toBe(second.deadline + 120_000);
    expect(longRest.completedFocusCount).toBe(2);
    await expectSummary(2);
    await screenshot('pomodoro-automatic-long-rest', '.focus-clock-card');

    // Leaving the timer unmounts the page; the persisted deadline remains the clock source.
    await moveTo('index');
    await expect(page.locator('.today-grid')).toBeVisible();
    await page.clock.fastForward(86_400_000);
    await moveTo('pomodoro');
    await expect(page.locator('.focus-live')).toContainText('准备就绪');
    const recovered = await state();
    expect(recovered.active).toBeNull();
    expect(recovered.sessions).toHaveLength(initialEnded.sessions.length + 4);
    expect(recovered.completedFocusCount).toBe(2);
    await expectSummary(0);
    expect(recovered.sessions[0].endedAt).toBe(new Date(longRest.active.deadline).toISOString());
    await moveTo('index');
    await expect(page.locator('.today-grid')).toBeVisible();
    await moveTo('pomodoro');
    await expect(page.locator('.focus-live')).toContainText('准备就绪');
    expect((await state()).sessions).toEqual(recovered.sessions);

    // End appears only when paused, then saves actual elapsed time directly.
    await page.locator('.focus-start').click();
    await expect(page.locator('.focus-live')).toContainText('正在计时');
    const earlyId = (await state()).active.id;
    const beforeEdit = (await state()).active;
    await page.locator('.focus-purpose-input').fill('Finish the draft');
    expect((await state()).active).toEqual({ ...beforeEdit, selection: { ...beforeEdit.selection, title: 'Finish the draft' } });
    await moveTo('index');
    await expect(page.locator('.today-grid')).toBeVisible();
    await moveTo('pomodoro');
    await expect(page.locator('.focus-purpose-input')).toHaveValue('Finish the draft');
    const endButton = page.getByRole('button', { name: '结束', exact: true });
    await expect(endButton).toHaveCount(0);
    await page.clock.fastForward(12000);
    await page.locator('.focus-start').click();
    await expect(page.locator('.focus-live')).toContainText('已暂停');
    const buttonStyles = await page.locator('.focus-end').evaluateAll(buttons => buttons.map(button => {
      const css = getComputedStyle(button);
      return { background: css.backgroundColor, border: parseFloat(css.borderTopWidth), height: button.getBoundingClientRect().height };
    }));
    for (const button of buttonStyles) {
      expect(button.background).not.toBe('rgba(0, 0, 0, 0)');
      expect(button.border).toBeGreaterThan(0);
      expect(button.height).toBeGreaterThanOrEqual(40);
    }
    await checkButtonAppearance(endButton, { kind: 'secondary', size: 'large' }, expect);
    await checkButtonAppearance(page.locator('.focus-start'), { kind: 'primary', size: 'large' }, expect);
    await screenshot('pomodoro-full-width-actions', '.focus-clock-card');
    await page.evaluate(() => { window.__miniFixture.modalFailure = true; });
    const paused = (await state()).active;
    await page.locator('.focus-purpose-input').fill('Review the draft');
    expect((await state()).active).toEqual({ ...paused, selection: { ...paused.selection, title: 'Review the draft' } });
    await page.clock.fastForward(30000);
    await endButton.click();
    await expect(page.locator('.focus-live')).toContainText('准备就绪');
    const ended = await state();
    expect(ended.sessions).toHaveLength(recovered.sessions.length + 1);
    expect(ended.sessions.find(session => session.id === earlyId)).toMatchObject({ title: 'Review the draft', completed: false, durationSeconds: paused.totalSeconds - paused.remainingSeconds });
    expect(ended.completedFocusCount).toBe(recovered.completedFocusCount);
    await expectSummary(0, 'Review the draft');
    await moveTo('index');
    await expect(page.locator('.today-grid')).toBeVisible();
    await moveTo('pomodoro');
    await expect(page.locator('.focus-live')).toContainText('准备就绪');
    expect((await state()).sessions).toEqual(ended.sessions);

    // Record deletion uses app confirmation; outside close and cancel preserve data.
    await focusStatistics();
    await page.getByRole('button', { name: '查看全部', exact: true }).click();
    await page.getByRole('button', { name: '删除Review the draft记录', exact: true }).click();
    await expect(page.getByRole('dialog', { name: '删除计时记录' })).toBeVisible();
    await page.getByRole('button', { name: '关闭删除确认', exact: true }).click();
    expect((await state()).sessions).toEqual(ended.sessions);
    await page.getByRole('button', { name: '删除Review the draft记录', exact: true }).click();
    await page.locator('.app-dialog-layer > .sheet-backdrop').click({ position: { x: 4, y: 4 } });
    expect((await state()).sessions).toEqual(ended.sessions);
    await page.getByRole('button', { name: '删除Review the draft记录', exact: true }).click();
    await page.evaluate(() => { window.__miniFixture.failToolWrites = ['pomodoro']; });
    await page.getByRole('button', { name: '删除', exact: true }).click();
    await expect(page.getByRole('dialog', { name: '删除计时记录' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: '删除计时记录' })).toContainText('本机尚未保存');
    expect((await state()).sessions).toEqual(ended.sessions);
    await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
    await page.getByRole('button', { name: '删除', exact: true }).click();
    await expect(page.getByRole('dialog', { name: '删除计时记录' })).toHaveCount(0);
    expect((await state()).sessions.some(session => session.id === earlyId)).toBe(false);
    await timerPage();
    await expectSummary(0);

    await loginScenario('accepted');
    await expect.poll(async () => (await posted()).length).toBe(1);
    await focusStatistics();
    await expect(page.locator('.focus-reminder-badge')).toHaveText('本轮已授权');
    await timerPage();
    const acceptedPosts = await posted();
    expect(acceptedPosts[0].data.events).toEqual(['focus_start', 'break_start', 'break_end']);
    expect(await subscriptions()).toEqual([['preview-focus-start', 'preview-break-start', 'preview-break-end']]);
    const subscribedRun = (await state()).active;
    expect(acceptedPosts[0].data.runId).toBe(subscribedRun.rootRunId);
    await expect.poll(async () => (await reminders()).map(item => item.status)).toEqual(['pending', 'pending', 'pending']);
    await page.locator('.focus-start').click();
    await expect(page.locator('.focus-live')).toContainText('已暂停');
    await expect.poll(async () => (await reminders()).map(item => item.status)).toEqual(['paused', 'paused', 'paused']);
    await page.clock.fastForward(30_000);
    await page.locator('.focus-start').click();
    await expect(page.locator('.focus-live')).toContainText('正在计时');
    await expect.poll(async () => (await reminders()).map(item => item.status)).toEqual(['pending', 'pending', 'pending']);
    const continued = (await state()).active;
    expect(continued.rootRunId).toBe(subscribedRun.rootRunId);
    expect(continued.deadline).toBeGreaterThan(subscribedRun.deadline);
    expect(await subscriptions()).toHaveLength(1);
    expect(await posted()).toHaveLength(1);
    await focusStatistics();
    await screenshot('pomodoro-notifications-authorized', '.focus-reminders');
    await timerPage();
    await page.clock.fastForward(6000);
    await page.locator('.focus-start').click();
    await expect(page.locator('.focus-live')).toContainText('已暂停');
    const notifiedPaused = (await state()).active;
    const beforeNotifiedEnd = await state();
    await page.getByRole('button', { name: '结束', exact: true }).click();
    await expect(page.locator('.focus-live')).toContainText('准备就绪');
    const notifiedEnded = await state();
    expect(notifiedEnded.active).toBeNull();
    expect(notifiedEnded.sessions).toHaveLength(beforeNotifiedEnd.sessions.length + 1);
    expect(notifiedEnded.sessions.find(session => session.id === subscribedRun.id)).toMatchObject({ rootRunId: subscribedRun.rootRunId, durationSeconds: notifiedPaused.totalSeconds - notifiedPaused.remainingSeconds, completed: false });
    expect(notifiedEnded.sessions.find(session => session.id === subscribedRun.id).durationSeconds).toBeGreaterThanOrEqual(6);
    expect(notifiedEnded.completedFocusCount).toBe(beforeNotifiedEnd.completedFocusCount);
    await expect.poll(async () => (await reminders()).map(item => item.status)).toEqual(['cancelled', 'cancelled', 'cancelled']);
    // The state PUT may reconcile reminder statuses before the explicit
    // cancellation request finishes its own session/CSRF lookup.
    await expect.poll(() => page.evaluate(runId => window.__miniRequests.some(request => request.path === `/wechat/pomodoro/${runId}` && request.method === 'DELETE'), subscribedRun.rootRunId)).toBe(true);
    const cancellation = await page.evaluate(runId => window.__miniRequests.find(request => request.path === `/wechat/pomodoro/${runId}` && request.method === 'DELETE'), subscribedRun.rootRunId);
    expect(cancellation).toBeTruthy();
    expect(notifiedPaused.deadline).toBeNull();
    expect(new URLSearchParams(cancellation.query).has('expectedDeadline'), 'Ending the paused round cancels its original run without a running deadline').toBe(false);

    await loginScenario('rejected', { 'preview-focus-start': 'reject', 'preview-break-start': 'reject', 'preview-break-end': 'reject' });
    expect(await subscriptions()).toHaveLength(1);
    await expect(page.locator('.focus-reminder-feedback')).toContainText('未同意订阅');
    expect(await posted()).toHaveLength(0);
    expect((await state()).active.running).toBe(true);

    await loginScenario('partial', { 'preview-focus-start': 'accept', 'preview-break-start': 'reject', 'preview-break-end': 'accept' });
    await expect.poll(async () => (await posted()).length).toBe(1);
    expect((await posted())[0].data.events).toEqual(['focus_start', 'break_end']);
    expect(await subscriptions()).toHaveLength(1);
    expect((await state()).active.running).toBe(true);
    await focusStatistics();
    await expect(page.locator('.focus-reminder-enable')).toHaveText('补充本轮微信授权');
    expect((await reminders()).map(item => item.event)).toEqual(['focus_start', 'break_end']);
    await screenshot('pomodoro-notifications-partial', '.focus-reminders');
    // The migrated card still requests only missing consent within its own click.
    const beforeSupplement = (await state()).active;
    await page.evaluate(() => { window.__miniFixture.subscriptionResults = {}; });
    await page.locator('.focus-reminder-enable').click();
    await expect.poll(async () => (await posted()).length).toBe(2);
    expect((await posted())[1].data.events).toEqual(['break_start']);
    expect(await subscriptions()).toEqual([
      ['preview-focus-start', 'preview-break-start', 'preview-break-end'], ['preview-break-start'],
    ]);
    await expect(page.locator('.focus-reminder-badge')).toHaveText('本轮已授权');
    await expect(page.locator('.focus-reminder-statuses > div')).toHaveCount(3);
    expect((await state()).active).toEqual(beforeSupplement);
    await timerPage();
    await expect(page.locator('.focus-live')).toContainText('正在计时');
    expect(errors).toEqual([]);
  } finally { await page.close(); }
};
