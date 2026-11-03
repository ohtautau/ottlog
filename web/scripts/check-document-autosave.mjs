// Final Docker assets, intercepted disposable API fixtures, no business traffic.
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const origin = process.env.OTTLOG_PARITY_ORIGIN || 'http://127.0.0.1:3017', target = new URL(origin);
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.protocol !== 'http:' || !target.port || ['3000', '5229'].includes(target.port)) throw new Error('Use a separate isolated loopback QA website.');
const out = path.resolve('test-results/document-autosave'); await fs.mkdir(out, { recursive: true });
const stamp = '2026-11-03T00:00:00.000Z', results = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const notes = ['blue', 'sage', 'sand', 'rose', 'violet', 'mint'].map((color, index) => ({ id: `memo-${index}`, title: `原便签${index + 1}`, body: `原正文${index + 1}`, color, tags: [], pinned: false, createdAt: stamp, updatedAt: stamp }));
    const states = { todos: { version: 1, categories: [], tasks: [] }, memos: { version: 1, notes: structuredClone(notes) }, domains: { version: 1, domains: [{ id: 'work', name: '工作', iconId: 'work', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] }], completedGoals: [] } };
    const errors = [], writes = [];
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', timezoneId: 'Asia/Singapore' }); page.setDefaultTimeout(12000);
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const request = route.request(), pathname = new URL(request.url()).pathname;
      if (pathname.startsWith('/api/account/')) return route.fulfill({ json: { authenticated: true, userName: 'document-fixture', isAdmin: false, csrfToken: 'isolated' } });
      if (pathname.startsWith('/api/personal-tools/')) {
        const key = pathname.slice('/api/personal-tools/'.length);
        if (request.method() === 'PUT') { states[key] = structuredClone(request.postDataJSON().data); writes.push({ key, data: structuredClone(states[key]) }); }
        return route.fulfill({ json: { data: states[key] ?? null } });
      }
      return route.fulfill({ json: { enabled: false, reminders: [], mottos: [] } });
    });
    const button = name => page.getByRole('button', { name, exact: true });
    const entry = () => page.locator('.entry-composer');
    const closeEntry = async () => { await page.keyboard.press('Escape'); await expect(entry()).toHaveCount(0); };
    const allRecords = () => states.domains.domains.flatMap(domain => [...domain.negativeRecords, ...domain.positiveRecords]);

    await page.goto(origin + '/today'); await expect(page.locator('.floating-create-button')).toBeEnabled();
    await expect(page.locator('.today-capture')).toHaveCount(0);
    await expect(page.locator('.floating-create-button')).toHaveCount(1);
    await page.locator('.floating-create-button').click(); await expect(entry()).toBeVisible();
    await expect(entry().getByRole('button', { name: /^(保存|创建任务|创建便签|关闭编辑)$/ })).toHaveCount(0);
    await button('创建类型：备忘').click();
    const newTitle = () => entry().getByRole('textbox', { name: '便签标题', exact: true });
    await expect(newTitle()).toBeEnabled(); await newTitle().fill('首页自动便签');
    await expect.poll(() => states.memos.notes.some(note => note.title === '首页自动便签')).toBe(true);
    const newId = states.memos.notes.find(note => note.title === '首页自动便签').id;
    await newTitle().fill('首页关窗最后输入'); await closeEntry();
    await expect.poll(() => states.memos.notes.find(note => note.id === newId).title).toBe('首页关窗最后输入');

    await page.goto(origin + '/memos'); await expect(page.locator('.memo-note')).toHaveCount(7);
    const paints = await page.locator('.memo-note').evaluateAll(nodes => nodes.map(node => ({ background: getComputedStyle(node).backgroundColor, border: getComputedStyle(node).borderTopColor })));
    expect(new Set(paints.map(paint => JSON.stringify(paint))).size).toBe(1);
    expect(paints[0].background).toBe('rgb(32, 51, 62)');
    await button('查看便签：原便签1').click(); await button('编辑便签：原便签1').click();
    const memo = () => page.locator('.document-editor-sheet');
    await expect(memo().getByRole('button', { name: /^(保存|关闭便签编辑)$/ })).toHaveCount(0);
    await expect(page.locator('.memo-palette,.memo-filter-colors')).toHaveCount(0);
    await memo().getByRole('textbox', { name: '便签标题', exact: true }).fill('已有便签自动更新');
    await expect.poll(() => states.memos.notes.find(note => note.id === 'memo-0').title).toBe('已有便签自动更新');
    await page.keyboard.press('Escape'); await expect(memo()).toHaveCount(0);
    expect(states.memos.notes.find(note => note.id === 'memo-0')).toMatchObject({ color: 'blue', body: '原正文1' });
    expect(states.memos.notes.filter(note => notes.slice(1).some(old => old.id === note.id))).toEqual(notes.slice(1));
    await page.screenshot({ path: path.join(out, `neutral-memos-${viewport.width}.png`) });

    await page.goto(origin + '/domains'); await button('记录进展').click();
    const field = (pair, slot) => entry().locator(`.progress-record-field[data-progress-pair="${pair}"][data-progress-slot="${slot}"] textarea`);
    await expect(field(0, 'negative')).toBeEnabled();
    await expect(entry().getByRole('button', { name: /^(保存记录|关闭编辑)$/ })).toHaveCount(0);
    const left = await field(0, 'negative').boundingBox(), right = await field(0, 'positive').boundingBox();
    expect(left.x + left.width).toBeLessThan(right.x); expect(left.y).toBeCloseTo(right.y, 0);
    await button('添加一组正负记录').click(); await expect(entry().locator('.progress-record-pair')).toHaveCount(2);
    await field(0, 'negative').fill('第一组负记录'); await field(0, 'positive').fill('第一组正记录'); await field(1, 'negative').fill('第二组负记录');
    await expect.poll(() => allRecords().length).toBe(3); const ids = allRecords().map(record => record.id).sort();
    await field(1, 'negative').fill('进展关窗最后输入'); await closeEntry();
    await expect.poll(() => allRecords().some(record => record.content === '进展关窗最后输入')).toBe(true);
    expect(allRecords().map(record => record.id).sort()).toEqual(ids);
    await page.locator('.domains-recent-record').filter({ hasText: '进展关窗最后输入' }).click();
    const editor = () => page.locator('.record-edit-autosave .document-editor-sheet');
    await expect(editor().getByRole('button', { name: /^(保存|关闭记录编辑)$/ })).toHaveCount(0);
    await editor().getByRole('textbox', { name: '记录内容', exact: true }).fill('已有进展也自动保存');
    await expect.poll(() => allRecords().some(record => record.content === '已有进展也自动保存')).toBe(true);
    await page.keyboard.press('Escape'); await expect(editor()).toHaveCount(0);
    expect(allRecords().map(record => record.id).sort()).toEqual(ids);
    await page.screenshot({ path: path.join(out, `progress-${viewport.width}.png`) });

    await page.goto(origin + '/domains/work');
    const history = page.getByRole('button', { name: '查看工作已完成目标', exact: true });
    await expect(history.locator('.completed-goals-history-symbol')).toHaveCount(1);
    const size = await history.boundingBox(); expect(size.width).toBeGreaterThanOrEqual(40); expect(size.height).toBeGreaterThanOrEqual(40);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]); expect(writes.length).toBeGreaterThanOrEqual(5);
    results.push({ viewport, writes: writes.map(write => write.key), errors, neutralPaint: paints[0], progressRecords: allRecords().length });
    await page.close();
  }
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify({ passed: true, origin, results }, null, 2));
  console.log('PASS production document autosave at 1440/390: home shared FAB, neutral legacy memos, create/edit/close flush, repeatable signed pairs, stable record IDs and history symbol; every API intercepted.');
} finally { await browser.close(); }
