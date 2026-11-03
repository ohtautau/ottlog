// Use the actual Docker website assets with disposable intercepted API data.
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const origin = process.env.OTTLOG_PARITY_ORIGIN || 'http://127.0.0.1:3017';
const target = new URL(origin);
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.protocol !== 'http:' || !target.port || ['3000', '5229'].includes(target.port)) throw new Error('Use a separate isolated loopback QA website.');
const out = path.resolve('test-results/task-detail'); await fs.mkdir(out, { recursive: true });
const stamp = '2026-11-03T00:00:00.000Z', results = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const state = { version: 1, categories: [], tasks: [{ id: 'detail-existing', title: '原始任务', description: '', categoryId: '', important: true, urgent: true, dueDate: '', completedAt: null, createdAt: stamp, updatedAt: stamp, tags: ['工作'], subtasks: [], nextTasks: [] }] };
    const errors = [], writes = [];
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', timezoneId: 'Asia/Singapore' }); page.setDefaultTimeout(12000);
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const request = route.request(), pathname = new URL(request.url()).pathname;
      if (pathname.startsWith('/api/account/')) return route.fulfill({ json: { authenticated: true, userName: 'detail-fixture', isAdmin: false, csrfToken: 'isolated' } });
      if (pathname === '/api/personal-tools/todos') {
        if (request.method() === 'PUT') { const next = request.postDataJSON().data; Object.keys(state).forEach(key => delete state[key]); Object.assign(state, structuredClone(next)); writes.push(structuredClone(state)); }
        return route.fulfill({ json: { data: state } });
      }
      if (pathname.startsWith('/api/personal-tools/')) return route.fulfill({ json: { data: null } });
      return route.fulfill({ json: { enabled: false, reminders: [], mottos: [] } });
    });
    const button = name => page.getByRole('button', { name, exact: true }), panel = () => page.locator('.task-detail-panel');
    const task = () => state.tasks.find(item => item.id === 'detail-existing');
    const categoryId = () => task()?.categoryId ?? '';
    const categoryName = () => state.categories.find(c=>c.id===categoryId())?.name ?? '收集箱';
    async function closeEditor() { await page.keyboard.press('Escape'); await expect(panel()).toHaveCount(0); }
    async function openTask(title) { await button(`编辑任务：${title}`).first().click(); await expect(panel()).toBeVisible(); }
    async function remap(slot, source) {
      await button('待办更多操作').click();await button('编辑').click();const names={do:'高优先级',plan:'中优先级',delegate:'低优先级',later:'无优先级'};await button(`更换${names[slot]}区域显示`).click();
      await button(`显示分类：${source}`).click(); await expect(page.locator('.todo-panel-source-panel')).toHaveCount(0);await button('关闭象限显示编辑').click();
    }
    await page.goto(origin + '/todos'); await expect(button('编辑任务：原始任务')).toBeVisible();
    await button('完成：原始任务').click(); await expect(page.locator('.operation-toast')).toContainText('已完成：原始任务');
    await button('撤销最近一次操作').click(); await expect(button('完成：原始任务')).toBeVisible();
    const fab = await page.locator('.floating-create-button').boundingBox();
    expect(Math.abs(viewport.width - fab.x - fab.width - viewport.width / 8)).toBeLessThan(1);
    expect(Math.abs(viewport.height - fab.y - fab.height - viewport.width / 8)).toBeLessThan(1);
    await expect(page.locator('.todo-check').first()).toHaveCSS('border-top-color', 'rgb(231, 160, 151)');
    await openTask('原始任务');
    await expect(panel().locator('.task-detail-check').first()).toHaveCSS('border-top-color', 'rgb(231, 160, 151)');
    await expect(panel().locator('.task-detail-tag-symbol > div')).toHaveCount(4);
    await expect(panel().getByRole('button', { name: /^(保存|创建任务|关闭编辑)$/ })).toHaveCount(0);
    await expect(panel().locator('.task-detail-heading .sheet-close')).toHaveCount(0);
    await expect(panel().getByRole('textbox',{name:'任务备注',exact:true})).toHaveAttribute('placeholder','备注');
    await expect(panel().locator('.task-detail-tools > button')).toHaveCount(4);
    await expect(button('任务附件')).toBeEnabled();
    await button('更多任务操作').click(); await expect(button('后续任务')).toBeVisible(); await expect(button('删除任务')).toBeVisible();
    const menuSpacing = await page.locator('.form-popover-panel.is-action-menu').evaluate(node => { const button = [...node.querySelectorAll('button')].find(b => b.textContent === '为任务专注'), range = document.createRange(); range.setStartBefore(button.querySelector('.action-menu-option').firstElementChild);range.setEndAfter(button.querySelector('.action-menu-option').lastElementChild); const t = range.getBoundingClientRect(), p = node.getBoundingClientRect(); return { left:t.left-p.left, right:p.right-t.right, width:p.width }; });
    expect(Math.abs(menuSpacing.left - menuSpacing.right)).toBeLessThan(2); expect(menuSpacing.width).toBeLessThan(200);
    await page.keyboard.press('Escape'); await expect(panel()).toBeVisible();
    const dividers = await panel().locator('.task-detail-heading,.task-detail-title,.memo-body-preview,.task-detail-footer').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).borderBottomWidth));
    expect(dividers.every(width => width === '0px')).toBe(true);
    await panel().getByRole('textbox', { name: '任务名称', exact: true }).fill('自动保存任务');
    await expect.poll(() => task()?.title).toBe('自动保存任务'); await expect(panel()).toBeVisible();
    await button('添加子任务').click(); await panel().getByRole('textbox', { name: '子任务 1', exact: true }).fill('检查子项');
    await expect.poll(() => task()?.subtasks?.[0]?.title).toBe('检查子项');
    const field = panel().getByRole('textbox', { name: '子任务 1', exact: true }); await field.focus();
    const style = await field.evaluate(node => { const s = getComputedStyle(node); return { outline: s.outlineStyle, border: s.borderTopWidth, background: s.backgroundColor, shadow: s.boxShadow }; });
    expect(style).toMatchObject({ outline: 'none', border: '0px', background: 'rgba(0, 0, 0, 0)', shadow: 'none' });
    await panel().getByRole('textbox', { name: '任务备注', exact: true }).fill('备注也自动保存');
    await expect.poll(() => task()?.description).toBe('备注也自动保存');
    await panel().getByRole('button', { name: '任务标签', exact: true }).click();
    await page.getByRole('textbox', { name: '任务标签', exact: true }).fill('工作，新标签');
    await page.keyboard.press('Escape'); await expect.poll(() => task()?.tags).toEqual(['工作', '新标签']);
    await expect(panel().locator('.selected-tag-chip')).toHaveText(['工作','新标签']);
    await button('任务优先级').click();
    const optionStyles = await page.locator('.priority-option').evaluateAll(nodes => nodes.map(n => { const s=getComputedStyle(n); return { background:s.backgroundColor, border:s.borderTopColor }; }));
    expect(optionStyles.every(s => s.background === 'rgba(0, 0, 0, 0)' && s.border === 'rgba(0, 0, 0, 0)')).toBe(true);
    await button('中优先级').click();
    await expect(panel().locator('.task-detail-check').first()).toHaveCSS('border-top-color', 'rgb(228, 206, 133)');
    await expect.poll(() => task()?.urgent).toBe(false);
    await button('任务优先级').click(); await button('高优先级').click();
    await expect.poll(() => task()?.urgent).toBe(true);
    await button('设置日期、提醒和重复').click(); await button('选择明天').click(); await button('确认日期设置').click();
    const tomorrow = await page.evaluate(() => { const date = new Date(); date.setDate(date.getDate() + 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; });
    await expect.poll(() => task()?.dueDate).toBe(tomorrow);
    await button('设置日期、提醒和重复').click(); await button('编辑提醒日期').click();
    await expect(page.locator('.todo-schedule-controls .time-wheel')).toBeVisible();await expect(page.locator('.todo-schedule-reminder-popover')).toHaveCount(0);
    await button('确认日期设置').click(); expect(task()?.reminderAt).toBeUndefined();
    await button('任务分类').click(); await button('新建任务分类').click();
    await page.getByRole('textbox', { name: '分类名称', exact: true }).fill('娱乐');
    await button('选择分类图标').click(); await button('选择图标：游戏').click(); await button('完成分类编辑').click();
    await expect.poll(() => state.categories.find(c=>c.name==='娱乐')?.iconId).toBe('game');
    await expect(page.locator('.todo-category-editor,.todo-category-panel')).toHaveCount(0);
    await expect.poll(() => categoryName()).toBe('娱乐');
    await button('任务分类').click(); await button('编辑分类：娱乐').click();
    await page.getByRole('textbox', { name: '分类名称', exact: true }).fill('娱乐休闲'); await button('选择分类图标').click();
    await button('选择图标：礼物').click(); await button('完成分类编辑').click();
    await expect.poll(() => state.categories.find(c=>c.name==='娱乐休闲')?.iconId).toBe('gift');
    await expect(page.locator('.todo-category-editor,.todo-category-panel')).toHaveCount(0);
    await expect.poll(() => categoryName()).toBe('娱乐休闲');
    await closeEditor(); await remap('later', '娱乐休闲');
    await expect.poll(() => state.panelSources?.later).toEqual({ kind:'category',categoryId:categoryId() });
    await expect(page.locator('#todo-zone-later .todo-quadrant-title')).toContainText('娱乐休闲');
    await remap('delegate', '娱乐休闲');
    const rowIds = await page.locator('.todo-task[id]').evaluateAll(nodes => nodes.map(node => node.id));
    expect(new Set(rowIds).size).toBe(rowIds.length);
    await expect(page.locator('#todo-zone-delegate').getByRole('button', { name: '编辑任务：自动保存任务', exact: true })).toBeVisible();
    // A tag alone never assigns a task to an independent category.
    await openTask('自动保存任务'); await button('任务分类').click(); await button('选择分类：收集箱').click();
    await expect.poll(() => categoryName()).toBe('收集箱'); await closeEditor();
    await expect(page.locator('#todo-zone-later .todo-task')).toHaveCount(0);
    expect(task().tags).toEqual(['工作','新标签']);
    const from = await page.locator('#todo-zone-do .todo-task').first().boundingBox(), to = await page.locator('#todo-zone-later .todo-quadrant-scroll').boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2); await expect(page.locator('.todo-drag-ghost')).toBeVisible();
    await page.mouse.move(to.x + to.width / 2, to.y + Math.min(to.height / 2, 70), { steps: 8 }); await page.mouse.up();
    await expect.poll(() => categoryName()).toBe('娱乐休闲'); expect(task()).toMatchObject({ id: 'detail-existing', important: true, urgent: true });
    expect(task().tags).toContain('工作'); expect(task().tags).toContain('新标签');
    await expect(page.locator('.todo-drag-ghost')).toHaveCount(0);
    // A new draft autosaves and dismisses without an explicit create/save action.
    await page.locator('.floating-create-button').click(); await panel().getByRole('textbox', { name: '任务名称', exact: true }).fill('新任务自动保存');
    await closeEditor(); await expect.poll(() => state.tasks.some(item => item.title === '新任务自动保存')).toBe(true);
    expect(state.tasks.filter(item => item.title === '新任务自动保存')).toHaveLength(1);
    await page.locator('.floating-create-button').click(); await panel().getByRole('textbox', { name: '任务名称', exact: true }).fill('离页立即保存');
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await expect.poll(() => state.tasks.some(item => item.title === '离页立即保存')).toBe(true); await closeEditor();
    await openTask('自动保存任务'); await page.screenshot({ path: path.join(out, `detail-${viewport.width}.png`) });
    state.tasks = state.tasks.filter(item => item.id !== 'detail-existing');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.locator('#todo-zone-do .todo-task')).toHaveCount(0);
    await panel().getByRole('textbox', { name: '任务名称', exact: true }).fill('不得恢复已删除任务');
    await expect(panel().getByRole('alert')).toContainText('已删除'); expect(state.tasks.some(item => item.id === 'detail-existing')).toBe(false);
    await page.screenshot({ path: path.join(out, `deleted-guard-${viewport.width}.png`) });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); expect(overflow).toBeLessThanOrEqual(1); expect(errors).toEqual([]);
    await page.goto(origin + '/today'); await button('创建记录').click();
    await expect(page.locator('.entry-composer.task-detail-panel')).toBeVisible();
    await expect(page.locator('.entry-composer .task-detail-tools > button')).toHaveCount(4);
    const creationTitle = page.locator('.entry-composer').getByRole('textbox', { name:'任务名称', exact:true });
    await creationTitle.focus(); await expect(creationTitle).toHaveCSS('outline-style', 'none'); await expect(creationTitle).toHaveCSS('border-top-width', '0px');
    await creationTitle.fill('首页共用任务编辑器'); await button('添加子任务').click(); await page.getByRole('textbox', { name:'子任务 1', exact:true }).fill('首页子任务');
    await button('任务标签').click(); await page.getByRole('textbox', { name:'任务标签', exact:true }).fill('实际，微信采集'); await page.keyboard.press('Escape');
    await expect(page.locator('.entry-composer .selected-tag-chip')).toHaveText(['实际','微信采集']);
    await page.screenshot({ path:path.join(out, `shared-creation-${viewport.width}.png`) });
    await closeEditor(); await expect.poll(() => state.tasks.find(t => t.title === '首页共用任务编辑器')?.tags).toEqual(['实际','微信采集']);
    const created = state.tasks.find(t => t.title === '首页共用任务编辑器'); expect(created.subtasks[0].title).toBe('首页子任务');
    results.push({ viewport, writes: writes.length, categoryRemap: '娱乐休闲', deletedTaskRestored: false, sharedCreation:true, menuSpacing, noBusinessApi: true }); await page.close();
    console.log(`PASS task detail ${viewport.width}: autosave, notes/subtasks/tags, category icon/name, panel remap, duplicate IDs, category drag, close/pagehide flush and deletion guard.`);
  }
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify({ origin, results }, null, 2));
} finally { await browser.close(); }
