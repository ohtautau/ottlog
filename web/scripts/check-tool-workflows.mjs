import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const origin = process.env.OTTLOG_PARITY_ORIGIN || 'http://127.0.0.1:3100';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error('Use isolated local API.');
const out = path.resolve('test-results/web-parity'); await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 375 ? 812 : 1000 } });
    const page = await context.newPage(); page.setDefaultTimeout(10000); page.on('pageerror', e => errors.push(e.message));
    let app;
    const button = (name, scope = app) => scope.getByRole('button', { name, exact: true });
    const stored = key => app.evaluate(key => JSON.parse(localStorage.getItem(`ottlog-tool-v1:guest:${key}`) || '{"data":null}').data, key);
    async function go(route) { await page.goto(`${origin}${route}`); app = page; await app.locator('.tool-app-root .shared-app-content').waitFor(); await expect(app.locator('iframe,.browser-navigation')).toHaveCount(0); await expect(app.locator('.browser-error')).toHaveCount(0); }
    async function wheel(label, key = 'ArrowDown') { const column = app.getByRole('listbox', { name: label, exact: true }); await column.press(key); await expect(column.locator('[aria-selected=true]')).toHaveCount(1); await expect(column).toHaveAttribute('data-moving', 'false'); }
    async function discard(closeLabel) { await button(closeLabel).click(); const dialog = app.getByRole('dialog', { name: '保存修改？', exact: true }); await expect(dialog).toBeVisible(); await button('不保存', dialog).click(); }

    // The public creation URL and the real shared form, not seeded fixture UI.
    await go('/tasks/new');
    const title = `网页回归任务${width}`;
    await app.getByLabel('任务名称', { exact: true }).fill(title);
    await app.getByLabel('任务备注', { exact: true }).fill('**保留 Markdown**\n下一步继续。');
    await button('设置日期、提醒和重复').click();
    const schedule = app.locator('.todo-schedule-sheet');
    await button('选择明天', schedule).click();
    await button('设置时间', schedule).click();
    await wheel('任务小时', 'Home'); await wheel('任务小时');
    await wheel('任务分钟', 'Home'); await wheel('任务分钟');
    await expect(app.getByRole('listbox', { name: '任务小时', exact: true }).locator('[aria-selected=true]')).toHaveText('01');
    await button('完成时间设置', schedule).click();
    await button('设置提醒', schedule).click();
    await expect(app.locator('.todo-schedule-reminder-popover .browser-wheel-column')).toHaveCount(4);
    await wheel('提醒分钟', 'ArrowUp');
    await expect(app.locator('.todo-schedule-reminder-lead')).toHaveText('提前1分钟提醒');
    await button('完成提醒设置', schedule).click();
    await button('设置重复', schedule).click(); await button('自定义重复', schedule).click();
    await wheel('重复间隔'); await wheel('重复单位');
    await button('完成重复设置', schedule).click();
    await button('确认日期设置', schedule).click();
    await button('创建任务', app.locator('.entry-composer')).click();
    await expect(app.locator('.entry-composer')).toHaveCount(0);
    await expect(page).toHaveURL(`${origin}/todos`);
    await expect(app.locator('[data-tool-workspace="todos"] .tool-app-root')).toBeVisible();
    let task = (await stored('todos')).tasks.find(t => t.title === title);
    expect(task).toMatchObject({ dueTime: '01:01', recurrence: { interval: 2, unit: 'week' } });
    expect(task.reminderAt).toBeTruthy();
    await button(`编辑任务：${title}`).click();
    await app.getByLabel('任务名称', { exact: true }).fill(`${title}取消`); await discard('关闭编辑');
    expect((await stored('todos')).tasks.find(t => t.id === task.id).title).toBe(title);
    await button(`编辑任务：${title}`).click(); await app.getByLabel('任务名称', { exact: true }).fill(`${title}保存`);
    await button('保存', app.locator('.todo-sheet')).click(); await expect(app.locator('.todo-sheet')).toHaveCount(0);
    await page.reload(); await app.locator('.tool-app-root .shared-app-content').waitFor();
    await expect(button(`编辑任务：${title}保存`)).toBeVisible();
    await page.screenshot({ path: path.join(out, `task-saved-${width}.png`) });

    await go('/memos'); await button('创建便签').click();
    await app.getByLabel('便签标题', { exact: true }).fill(`网页便签${width}`);
    await app.getByLabel('便签内容', { exact: true }).fill('# 共享编辑器\n\n**完整正文**');
    await expect(app.getByLabel('便签标题', { exact: true })).toHaveValue(`网页便签${width}`);
    await expect(app.getByLabel('便签内容', { exact: true })).toHaveValue('# 共享编辑器\n\n**完整正文**');
    await button('创建便签', app.locator('.entry-composer')).click();
    await expect(app.locator('.entry-composer')).toHaveCount(0);
    await button(`查看便签：网页便签${width}`).click();
    const reader = app.getByRole('dialog', { name: '便签内容', exact: true });
    await expect(reader.locator('strong')).toHaveText('完整正文');
    await expect(reader.locator('.memo-icon-preview img')).toHaveAttribute('src', '/tool-app/assets/habits/notes.png');
    await button(`编辑便签：网页便签${width}`, reader).click();
    await app.getByLabel('便签标题', { exact: true }).fill(`网页便签已更新${width}`);
    await button('保存', app.locator('.memo-sheet')).click();
    await expect(reader).toBeVisible(); await expect(reader).toContainText(`网页便签已更新${width}`);
    await button('完成', reader).click();
    expect((await stored('memos')).notes.some(n => n.title === `网页便签已更新${width}`)).toBe(true);

    await go('/domains'); await button('创建领域').click();
    const domainName = `网页领域${width}`; await app.getByLabel('领域名称', { exact: true }).fill(domainName);
    await button('创建领域', app.getByRole('dialog', { name: '创建领域', exact: true })).click();
    await expect(app.getByRole('dialog', { name: '创建领域', exact: true })).toHaveCount(0);
    const domain = (await stored('domains')).domains.find(d => d.name === domainName);
    expect(domain).toBeTruthy();
    await button(`打开${domainName}领域`).click();
    await expect(page).toHaveURL(`${origin}/domains/${encodeURIComponent(domain.id)}`);
    await expect(app.locator('[data-tool-workspace]')).toHaveAttribute('aria-label', '领域详情');
    await page.reload(); await app.locator('.tool-app-root .shared-app-content').waitFor();
    await expect(page).toHaveURL(`${origin}/domains/${encodeURIComponent(domain.id)}`);
    await expect(app.locator('[data-tool-workspace]')).toHaveAttribute('aria-label', '领域详情');
    await expect(app.locator('.shared-app-content')).toContainText(domainName);
    await button(`创建${domainName}长期目标`).click();
    await app.getByLabel('目标内容', { exact: true }).fill('网页目标的完整内容');
    await button('创建目标', app.locator('.domain-sheet')).click();
    await button(`完成${domainName}长期目标`).click();
    await button(`查看${domainName}已完成目标`).click();
    await expect(app.locator('.domain-history-item')).toContainText('网页目标的完整内容');
    await button('完成', app.locator('.domain-sheet')).click();

    await go('/daily'); await button('创建习惯').click();
    await app.getByLabel('习惯名称', { exact: true }).fill(`网页习惯${width}`);
    await app.getByLabel('提醒自己的话', { exact: true }).fill('每次做一点');
    await button('习惯时段：自由').click();
    await button('创建习惯', app.getByRole('dialog', { name: '创建习惯', exact: true })).click();
    await expect(app.getByRole('dialog', { name: '创建习惯', exact: true })).toHaveCount(0);
    expect((await stored('reminders')).items.some(h => h.title === `网页习惯${width}`)).toBe(true);
    await button(`网页习惯${width} 今天打卡`).click();
    await app.getByLabel('打卡的一句话').fill('浏览器打卡留言');
    await button('完成', app.locator('.daily-reflection-sheet')).click();
    expect(Object.values((await stored('reminders')).done).flat()).toContain((await stored('reminders')).items.find(h => h.title === `网页习惯${width}`).id);

    await go('/pomodoro'); await button('调整节奏').click();
    await wheel('专注时长'); await wheel('短休息时长'); await wheel('长休息时长'); await wheel('长休息间隔');
    await expect(button('保存节奏')).toBeEnabled(); await discard('关闭节奏设置');
    await button('调整节奏').click(); await wheel('专注时长'); await button('保存节奏').click();
    expect((await stored('pomodoro')).settings.focus).toBe(26);
    await button('修改当前计时时长').click(); await wheel('本次计时分钟'); await button('确认', app.getByRole('dialog', { name: '本次计时时长' })).click();
    await expect(app.locator('.focus-time')).toContainText('27:00');

    await go('/mottos'); await button('格言轮播设置').click();
    await wheel('格言轮播间隔秒');
    await button('保存', app.getByRole('dialog', { name: '格言轮播设置', exact: true })).click();
    expect((await stored('mottos')).rotationSeconds).toBe(16);
    await button('格言轮播设置').click(); await wheel('格言轮播间隔分'); await discard('关闭轮播设置');
    expect((await stored('mottos')).rotationSeconds).toBe(16);

    await go('/statistics');
    for (const name of ['待办统计', '专注统计', '习惯统计', '领域统计', '成长统计']) {
      await button(name).click(); await expect(app.locator('.statistics-insights')).toBeVisible();
      await button('近30天').click(); await expect(app.locator('.statistics-insights')).not.toContainText('NaN');
    }
    await page.screenshot({ path: path.join(out, `statistics-flow-${width}.png`) });
    await context.close(); console.log(`PASS ${width}: task, memo, domain, habit, focus, motto, statistics real UI workflows.`);
  }
  expect(errors).toEqual([]);
} catch(error) { for (const context of browser.contexts()) for (const page of context.pages()) { await page.screenshot({ path: path.join(out, 'workflow-failure.png') }); await fs.writeFile(path.join(out, 'workflow-failure.txt'), await page.locator('body').innerText()); } throw error; }
finally { await browser.close(); }
