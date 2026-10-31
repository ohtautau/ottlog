// Desktop acceptance uses synthetic guest caches on the isolated local website.
// No reader account, normal 3000 website, or normal 5229 API is used.
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const origin = process.env.OTTLOG_PARITY_ORIGIN || 'http://127.0.0.1:3100';
const parsed = new URL(origin);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) || parsed.protocol !== 'http:' || !parsed.port || ['3000', '5229'].includes(parsed.port)) throw new Error('Use the separately configured localhost test website (default 3100), never the ordinary website/API.');
const viewports = (process.env.OTTLOG_DESKTOP_VIEWPORTS || '1366x768,1440x900,1920x1080,1024x768,1280x600').split(',').map(value => {
  const [width, height] = value.split('x').map(Number);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 900 || height < 500) throw new Error(`Invalid desktop viewport: ${value}`);
  return { width, height };
});
const allGroups = ['tasks', 'schedule', 'domains', 'habits', 'memos', 'focus', 'statistics'];
const groups = (process.env.OTTLOG_DESKTOP_GROUPS || allGroups.join(',')).split(',');
if (groups.some(group => !allGroups.includes(group))) throw new Error(`Unknown desktop check group. Choose: ${allGroups.join(',')}`);
const out = path.resolve('test-results/desktop-layout');
await fs.mkdir(out, { recursive: true });
const errors = [], failures = [], observations = [];
const stamp = new Date().toISOString(), day = new Date().toLocaleDateString('en-CA');
const previous = new Date(); previous.setDate(previous.getDate() - 1);
const yesterday = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}-${String(previous.getDate()).padStart(2, '0')}`;
const quadrants = [['do', true, true], ['plan', true, false], ['delegate', false, true], ['later', false, false]];
const fixtures = {
  todos: { version: 1, categories: [], sort: 'custom', tasks: quadrants.flatMap(([zone, important, urgent]) => Array.from({ length: 20 }, (_, index) => ({ id: `layout-${zone}-${index}`, title: `宽屏任务 ${zone} ${String(index + 1).padStart(2, '0')}`, description: '**完整备注**\n\n保留所有内容，检查内部滚动和保存。', categoryId: '', important, urgent, dueDate: day, dueTime: '09:30', tags: ['布局回归'], completedAt: null, createdAt: stamp, updatedAt: stamp, nextTasks: [] }))) },
  domains: { version: 1, domains: Array.from({ length: 24 }, (_, index) => ({ id: `layout-domain-${index}`, name: `布局领域${String(index + 1).padStart(2, '0')}`, iconId: 'plant', longTermGoal: { id: `layout-long-${index}`, content: '长期目标保留完整文字，按可用区域展示。', status: 'active', createdAt: stamp }, shortTermGoal: { id: `layout-short-${index}`, content: '完成本次宽屏页面和弹窗检查。', status: 'active', createdAt: stamp }, habits: [], positiveRecords: Array.from({ length: index === 0 ? 30 : 1 }, (_, record) => ({ id: `positive-${index}-${record}`, content: `正向记录 ${record + 1}：完整记录内容与换行\n继续保留。`, createdAt: stamp })), negativeRecords: Array.from({ length: index === 0 ? 30 : 1 }, (_, record) => ({ id: `negative-${index}-${record}`, content: `负向记录 ${record + 1}：用于验证独立滚动。`, createdAt: stamp })) })), completedGoals: [{ id: 'layout-completed', domainId: 'layout-domain-0', kind: 'shortTerm', content: '已完成目标历史保持可访问。', status: 'completed', createdAt: stamp, completedAt: stamp }] },
  reminders: { version: 1, items: Array.from({ length: 40 }, (_, index) => ({ id: `layout-habit-${index}`, title: `宽屏习惯${String(index + 1).padStart(2, '0')}`, group: '布局领域01', domainId: 'layout-domain-0', kind: 'plant', iconId: 'plant', note: '完整提醒备注。\n'.repeat(20), minutes: 0, enabled: true, priority: 'none', timePeriod: index < 20 ? 'free' : 'morning', createdAt: Date.now() })), done: { [yesterday]: ['layout-habit-0', 'layout-habit-20'] }, reflections: [] },
  memos: { version: 1, notes: Array.from({ length: 48 }, (_, index) => ({ id: `layout-memo-${index}`, title: `宽屏便签${String(index + 1).padStart(2, '0')}`, body: index === 0 ? '# 便签完整正文\n\n' + Array.from({ length: 100 }, (_, line) => `第${line + 1}行：阅读窗保留完整正文。`).join('\n\n') + '\n\n正文末尾标记' : '用自然文字检查宽屏卡片的可读性，所有卡片都应通过列表内部滚动访问。', color: ['blue', 'sage', 'sand', 'rose', 'violet', 'mint'][index % 6], tags: ['布局回归'], pinned: false, priority: 'none', createdAt: stamp, updatedAt: stamp })) },
};

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const label = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({ viewport, timezoneId: 'Asia/Singapore' });
    await context.addInitScript(data => {
      for (const [key, value] of Object.entries(data)) {
        const cacheKey = `ottlog-tool-v1:guest:${key}`;
        if (!localStorage.getItem(cacheKey)) localStorage.setItem(cacheKey, JSON.stringify({ data: value, pending: false }));
      }
    }, fixtures);
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', error => errors.push(`${label}: ${error.message}`));
    const root = page.locator('.tool-app-root');
    const button = (name, scope = root) => scope.getByRole('button', { name, exact: true });
    const stored = key => page.evaluate(key => JSON.parse(localStorage.getItem(`ottlog-tool-v1:guest:${key}`)).data, key);

    async function go(route) {
      await page.goto(`${origin}${route}`);
      await expect(root).toHaveCount(1);
      await expect(root.locator('.shared-app-content')).toBeVisible();
      await expect(root).not.toContainText('正在读取…');
      await expect(root.locator('.browser-error')).toHaveCount(0);
      await expect(page.locator('iframe,.browser-navigation')).toHaveCount(0);
    }
    async function inside(locator, name) {
      await expect(locator, name).toBeVisible();
      const box = await locator.boundingBox();
      expect(box, `${name} has geometry`).toBeTruthy();
      expect(box.x, `${name} left`).toBeGreaterThanOrEqual(-1);
      expect(box.y, `${name} top`).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width, `${name} right`).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.y + box.height, `${name} bottom`).toBeLessThanOrEqual(viewport.height + 1);
      return box;
    }
    async function documentFits(route) {
      const geometry = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollX, scrollY, scrollWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth), scrollHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) }));
      observations.push({ viewport: label, route, geometry });
      expect(geometry.scrollWidth - geometry.width, `${route}: document horizontal overflow`).toBeLessThanOrEqual(1);
      expect(geometry.scrollHeight - geometry.height, `${route}: document vertical overflow`).toBeLessThanOrEqual(1);
      expect(geometry.scrollX, `${route}: document did not pan horizontally`).toBe(0);
      expect(geometry.scrollY, `${route}: document did not scroll vertically`).toBe(0);
      await inside(page.locator('body > header.header'), `${route}: original website header`);
      await inside(page.locator('.tool-workspace-heading'), `${route}: heading`);
    }
    async function reachLast(scroll, last, name, requireOverflow = true) {
      await inside(scroll, `${name}: scroll region`);
      const metrics = await scroll.evaluate(node => ({ height: node.clientHeight, extent: node.scrollHeight, overflow: getComputedStyle(node).overflowY }));
      expect(metrics.height, `${name}: positive viewport`).toBeGreaterThan(32);
      if (requireOverflow) expect(metrics.extent - metrics.height, `${name}: retains long content`).toBeGreaterThan(16);
      if (metrics.extent > metrics.height + 2) {
        expect(['auto', 'scroll'], `${name}: content can really scroll`).toContain(metrics.overflow);
        await scroll.evaluate(node => { node.scrollTop = 0; });
        const box = await scroll.boundingBox();
        // Hit the list's own right inset, avoiding nested scrollable calendars
        // or chart tracks that may intentionally consume their own wheel input.
        await page.mouse.move(box.x + box.width - 6, box.y + box.height / 2);
        await page.mouse.wheel(0, 240);
        await expect.poll(() => scroll.evaluate(node => node.scrollTop), { message: `${name}: mouse wheel moves the list (${JSON.stringify(metrics)})` }).toBeGreaterThan(0);
        await scroll.evaluate(node => { node.scrollTop = node.scrollHeight; });
      }
      await expect(last, `${name}: final item exists`).toBeVisible();
      const [viewportBox, lastBox] = await Promise.all([scroll.boundingBox(), last.boundingBox()]);
      expect(lastBox.y + lastBox.height, `${name}: final item is not clipped below list`).toBeLessThanOrEqual(viewportBox.y + viewportBox.height + 2);
      expect(lastBox.y, `${name}: final item intersects list`).toBeLessThan(viewportBox.y + viewportBox.height);
      expect(lastBox.y + lastBox.height, `${name}: final item intersects list top`).toBeGreaterThan(viewportBox.y);
    }
    async function modal(panel, closeName, actionName) {
      await inside(panel, 'modal panel');
      await inside(button(closeName, panel), 'modal close control');
      if (actionName) await inside(button(actionName, panel), 'modal final action');
    }
    async function discard(closeName) {
      await button(closeName).click();
      const prompt = root.getByRole('dialog', { name: '保存修改？', exact: true });
      await modal(prompt, '继续编辑', '保存');
      await inside(button('不保存', prompt), 'discard action');
      await button('不保存', prompt).click();
    }
    async function run(name, work) {
      if (!groups.includes(name)) return;
      try {
        await work();
        console.log(`PASS ${label}: ${name}`);
      } catch (error) {
        failures.push({ viewport: label, name, error: String(error.stack || error) });
        await page.screenshot({ path: path.join(out, `${label}-${name}-failure.png`) });
        await fs.writeFile(path.join(out, `${label}-${name}-failure.txt`), await page.locator('body').innerText());
        console.error(`FAIL ${label}: ${name}: ${error.message}`);
      }
    }

    await run('tasks', async () => {
      await go('/todos');
      await expect(root.locator('.todo-quadrant')).toHaveCount(4);
      const boxes = [];
      for (const [zone] of quadrants) {
        const quadrant = root.locator(`#todo-zone-${zone}`);
        boxes.push(await inside(quadrant, `${zone} quadrant`));
        await reachLast(quadrant.locator('.todo-quadrant-scroll'), button(`编辑任务：宽屏任务 ${zone} 20`, quadrant), `${zone} tasks`);
      }
      expect(boxes[0].x).toBeLessThan(boxes[1].x);
      expect(boxes[0].y).toBeLessThan(boxes[2].y);
      await documentFits('/todos');
      await button('编辑任务：宽屏任务 do 20').click();
      const editor = root.locator('.todo-sheet');
      await modal(editor, '关闭编辑', '保存');
      await root.getByLabel('任务名称', { exact: true }).fill('宽屏任务已保存');
      await button('保存', editor).click();
      await expect(editor).toHaveCount(0);
      expect((await stored('todos')).tasks.find(task => task.id === 'layout-do-19').title).toBe('宽屏任务已保存');
      await button('编辑任务：宽屏任务已保存').click();
      await root.getByLabel('任务名称', { exact: true }).fill('这份修改应该取消');
      await discard('关闭编辑');
      expect((await stored('todos')).tasks.find(task => task.id === 'layout-do-19').title).toBe('宽屏任务已保存');
      await page.screenshot({ path: path.join(out, `${label}-tasks.png`) });
    });

    await run('schedule', async () => {
      await go('/tasks/new');
      await modal(root.locator('.entry-composer'), '关闭编辑', '创建任务');
      await button('设置日期、提醒和重复').click();
      const schedule = root.locator('.todo-schedule-sheet');
      await modal(schedule, '关闭日期设置', '确认日期设置');
      await button('选择明天', schedule).click();
      await button('设置时间', schedule).click();
      const time = root.getByRole('dialog', { name: '设置时间', exact: true });
      await modal(time, '关闭时间设置', '完成时间设置');
      await expect(time.locator('.browser-wheel-column')).toHaveCount(2);
      await inside(time.getByRole('listbox', { name: '任务小时', exact: true }), 'hour wheel');
      await button('完成时间设置', time).click();
      await button('设置提醒', schedule).click();
      const reminder = root.getByRole('dialog', { name: '设置提醒', exact: true });
      await modal(reminder, '关闭提醒设置', '完成提醒设置');
      await expect(reminder.locator('.browser-wheel-column')).toHaveCount(4);
      for (const wheel of await reminder.locator('.browser-wheel-column').all()) await inside(wheel, 'reminder wheel');
      await button('完成提醒设置', reminder).click();
      await button('设置重复', schedule).click();
      const repeat = root.getByRole('dialog', { name: '设置重复', exact: true });
      await button('自定义重复', repeat).click();
      await button('选择重复单位').click();
      const unit = root.getByRole('dialog', { name: '选择重复单位', exact: true });
      await inside(unit, 'repeat units');
      for (const name of ['天', '周', '月', '年', '工作日']) await inside(button(name, unit), `unit ${name}`);
      await page.keyboard.press('Escape');
      await expect(unit).toHaveCount(0);
      await expect(repeat).toBeVisible();
      await modal(repeat, '关闭重复设置', '完成重复设置');
      await button('完成重复设置', repeat).click();
      await modal(schedule, '关闭日期设置', '确认日期设置');
      await button('确认日期设置', schedule).click();
      await discard('关闭编辑');
    });

    await run('domains', async () => {
      await go('/domains');
      await reachLast(root.locator('#domain-entry-scroll'), root.locator('.domain-create-card'), 'domain cards');
      await documentFits('/domains');
      await go('/domains/layout-domain-0');
      await inside(root.locator('.domain-goals'), 'domain goals');
      await expect(root.locator('.domain-habit-grid .domain-habit-card')).toHaveCount(40);
      await reachLast(root.locator('.domain-habit-scroll'), root.locator('.domain-habit-create-card'), 'domain habits');
      for (const column of await root.locator('.domain-record-column.has-scroll').all()) {
        await reachLast(column.locator('.domain-record-scroll'), column.locator('.domain-record').last(), 'domain record column');
      }
      await documentFits('/domains/layout-domain-0');
      await button('查看布局领域01已完成目标').click();
      const history = root.locator('.domain-sheet-history');
      await modal(history, '关闭编辑', '完成');
      await expect(history).toContainText('已完成目标历史保持可访问。');
      await button('完成', history).click();
      await button('编辑布局领域01领域').click();
      const editor = root.getByRole('dialog', { name: '编辑领域', exact: true });
      await modal(editor, '关闭编辑', '保存');
      await button('选择领域图标').click();
      const icons = root.getByRole('dialog', { name: '图标库', exact: true });
      await modal(icons, '关闭图标库');
      await reachLast(icons.locator('.icon-library-scroll'), icons.locator('.icon-library-option').last(), 'domain icon library');
      await page.keyboard.press('Escape'); await expect(icons).toHaveCount(0); await expect(editor).toBeVisible();
      await button('关闭编辑', editor).click();
      await page.screenshot({ path: path.join(out, `${label}-domain-detail.png`) });
    });

    await run('habits', async () => {
      await go('/daily');
      await button('习惯时段分类：上午').click();
      await reachLast(root.locator('#daily-habit-free-scroll'), button('查看习惯：宽屏习惯20'), 'free habits');
      await reachLast(root.locator('#daily-habit-period-scroll'), button('查看习惯：宽屏习惯40'), 'period habits');
      await documentFits('/daily');
      await button('查看习惯：宽屏习惯20').click();
      const detail = root.locator('.daily-detail-sheet');
      await modal(detail, '关闭习惯详情', '已完成');
      await reachLast(detail.locator('.daily-detail-scroll'), detail.locator('.habit-calendar'), 'habit detail body', false);
      await button('编辑习惯', detail).click();
      const editor = root.getByRole('dialog', { name: '编辑习惯', exact: true });
      await modal(editor, '关闭习惯编辑', '保存');
      await button('选择习惯优先度', editor).click();
      const priority = root.getByRole('dialog', { name: '选择习惯优先度', exact: true });
      await inside(priority, 'habit priority');
      await page.keyboard.press('Escape'); await expect(priority).toHaveCount(0); await expect(editor).toBeVisible();
      await button('关闭习惯编辑', editor).click();
      if (await detail.count()) await button('关闭习惯详情', detail).click();
      await page.screenshot({ path: path.join(out, `${label}-habits.png`) });
    });

    await run('memos', async () => {
      await go('/memos');
      await reachLast(root.locator('.memo-list-scroll'), button('查看便签：宽屏便签48'), 'memo cards');
      await documentFits('/memos');
      await root.locator('.memo-list-scroll').evaluate(node => { node.scrollTop = 0; });
      await button('查看便签：宽屏便签01').click();
      const reader = root.getByRole('dialog', { name: '便签内容', exact: true });
      await modal(reader, '关闭便签内容', '完成');
      const readerScroll = reader.locator('.form-popover-scroll');
      await reachLast(readerScroll, reader.getByText('正文末尾标记', { exact: true }), 'long memo reader');
      await readerScroll.evaluate(node => { node.scrollTop = 0; });
      await root.getByRole('button', { name: /^选择便签优先度：/ }).click();
      const priority = root.locator('.memo-reader-priority-popover');
      await inside(priority, 'memo priority layer');
      const option = priority.getByRole('button').last();
      await inside(option, 'memo priority last option');
      await option.click({ trial: true });
      await page.keyboard.press('Escape'); await expect(priority).toHaveCount(0); await expect(reader).toBeVisible();
      await button('选择便签图标', reader).click();
      const icons = root.getByRole('dialog', { name: '图标库', exact: true });
      await modal(icons, '关闭图标库', '不使用图标');
      await page.keyboard.press('Escape'); await expect(icons).toHaveCount(0); await expect(reader).toBeVisible();
      await button('编辑便签：宽屏便签01', reader).click();
      const editor = root.locator('.memo-sheet');
      await modal(editor, '关闭便签编辑', '保存');
      await root.getByLabel('便签标题', { exact: true }).fill('便签取消不修改原文');
      await discard('关闭便签编辑');
      expect((await stored('memos')).notes[0].title).toBe('宽屏便签01');
      await page.screenshot({ path: path.join(out, `${label}-memos.png`) });
    });

    await run('focus', async () => {
      await go('/pomodoro');
      await inside(root.locator('.focus-clock-card'), 'focus clock card');
      await inside(root.getByLabel('正在做什么', { exact: true }), 'focus purpose field');
      await inside(root.locator('.focus-action-area'), 'focus actions');
      await documentFits('/pomodoro');
      await button('调整节奏').click();
      const settings = root.locator('.focus-settings');
      await modal(settings, '关闭节奏设置', '保存节奏');
      for (const name of ['专注时长', '短休息时长', '长休息时长', '长休息间隔']) {
        const wheel = settings.getByRole('listbox', { name, exact: true });
        await wheel.scrollIntoViewIfNeeded();
        await inside(wheel, `${name} wheel`);
        await wheel.press('ArrowDown');
        await expect(wheel).toHaveAttribute('data-moving', 'false');
      }
      await discard('关闭节奏设置');
      await button('修改当前计时时长').click();
      const duration = root.getByRole('dialog', { name: '本次计时时长', exact: true });
      await modal(duration, '关闭时长设置', '确认');
      await inside(duration.getByRole('listbox', { name: '本次计时分钟', exact: true }), 'current duration wheel');
      await button('关闭时长设置', duration).click();
      await page.screenshot({ path: path.join(out, `${label}-focus.png`) });
    });

    await run('statistics', async () => {
      await go('/statistics');
      for (const name of ['待办统计', '专注统计', '习惯统计', '领域统计', '成长统计']) {
        await button(name).click();
        const insight = root.locator('.statistics-insights');
        await expect(insight).toBeVisible();
        await button('近30天', insight).click();
        await expect(insight.locator('.statistics-insight-chart').first()).toBeVisible();
        await expect(insight).not.toContainText(/NaN|Infinity|undefined/);
        for (const chart of await insight.locator('.statistics-insight-chart').all()) {
          const point = chart.locator('.statistics-insight-column,.statistics-insight-bar-choice').first();
          if (await point.count()) {
            await point.click();
            await expect(chart.locator('.statistics-insight-point')).toBeVisible();
            await expect(chart.locator('.statistics-insight-point')).not.toContainText(/NaN|Infinity|undefined/);
          }
        }
        const panels = root.locator('.statistics-content > :is(.statistics-insights,.activity-analysis,.statistics-habits,.statistics-domains,.statistics-growth,.focus-history-card,.focus-reminders)');
        expect(await panels.count(), `${name}: original history and insight panes remain`).toBeGreaterThanOrEqual(2);
        for (const panel of await panels.all()) {
          await inside(panel, `${name}: bounded statistics pane`);
          const metrics = await panel.evaluate(node => ({ height: node.clientHeight, extent: node.scrollHeight }));
          if (metrics.extent > metrics.height + 2) await reachLast(panel, panel.locator(':scope > *').last(), `${name}: complete pane content`, false);
        }
        await documentFits(`/statistics:${name}`);
        await inside(root.locator('.statistics-tabs-scroll'), `${name}: classification controls`);
      }
      await page.screenshot({ path: path.join(out, `${label}-statistics.png`) });
    });
    await context.close();
  }
} finally {
  await browser.close();
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify({ viewports, groups, observations, errors, failures }, null, 2));
}
expect(errors, 'No browser runtime errors').toEqual([]);
expect(failures, 'Desktop viewport/list/modal acceptance').toEqual([]);
console.log(`PASS ${viewports.length} desktop viewports / ${groups.join(', ')}: complete page frames, full-content access, and shared window interactions for the selected groups.`);
