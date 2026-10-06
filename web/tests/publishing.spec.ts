import { test, expect } from '@playwright/test';

test('unified login reveals only role-appropriate navigation', async ({ page, request }) => {
  await page.goto('/account');
  await expect(page.getByText('站点管理员登录')).toHaveCount(0);
  await expect(page.locator('a[href="/admin"]')).toHaveCount(0);
  await page.getByLabel('账号', { exact: true }).fill('testadmin');
  await page.getByLabel('密码', { exact: true }).fill('E2e-only-password-2026!');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: '文章管理' })).toBeVisible();
  await page.locator('.account-menu summary').click();
  await expect(page.locator('.account-menu a[href="/admin/comments"]')).toBeVisible();
  const token = (await (await request.get('/api/account/session')).json()).csrfToken;
  expect((await request.post('/api/account/register', { headers: { 'X-CSRF-TOKEN': token }, data: { userName: 'TESTADMIN', password: 'Another-password-2026!' } })).status()).toBe(409);
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.getByRole('button', { name: '没有账号？注册' }).click();
  await page.getByLabel('账号', { exact: true }).fill(`role-${Date.now()}`);
  await page.getByLabel('密码', { exact: true }).fill('Reader-password-2026!');
  await page.getByRole('button', { name: '注册并登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '我的账号' })).toBeVisible();
  await page.goto('/admin/comments');
  await expect(page).toHaveURL(/\/account$/);
  expect((await page.request.get('/api/admin/posts')).status()).toBe(403);
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
});

test('draft action, required publishing channels, math in preview and article', async ({ page }, info) => {
  const anon = await (await page.request.get('/api/account/session')).json();
  await page.request.post('/api/account/login', { headers: { 'X-CSRF-TOKEN': anon.csrfToken }, data: { userName: 'testadmin', password: 'E2e-only-password-2026!' } });
  await page.goto('/admin');
  await page.getByRole('button', { name: '新建文章' }).click();
  await page.getByLabel('标题', { exact: true }).fill('公式与发布测试');
  await page.getByLabel('正文', { exact: true }).fill('行内公式 $E=mc^2$。\n\n$$\n\\frac{a}{b}+\\sqrt{x}\n$$');
  await expect(page.locator('.editor-preview .katex')).toHaveCount(2);
  await page.getByRole('button', { name: '发布文章', exact: true }).first().click();
  await expect(page.getByRole('status')).toContainText('请选择至少一个发布渠道');
  await page.getByLabel('在博客网站公开（PC / 手机网页）').check();
  await page.getByRole('button', { name: '保存草稿', exact: true }).first().click();
  await expect(page.getByRole('status')).toContainText('草稿已保存');
  const posts = await (await page.request.get('/api/admin/posts')).json();
  let post = posts.find((p: { title: string }) => p.title === '公式与发布测试');
  expect(post.published).toBe(false);
  const token = (await (await page.request.get('/api/account/session')).json()).csrfToken;
  const headers = { 'X-CSRF-TOKEN': token };
  try {
    expect((await page.request.get(`/api/posts/${post.slug}`)).status()).toBe(404);
    expect((await page.request.put(`/api/admin/posts/${post.id}`, { headers, data: { ...post, saveAction: 'publish', published: false, publishedMini: false } })).status()).toBe(400);
    await page.getByLabel('在博客网站公开（PC / 手机网页）').check();
    await page.getByRole('button', { name: '发布文章', exact: true }).first().click();
    await expect(page.getByRole('status')).toContainText('文章已发布');
    post = (await (await page.request.get('/api/admin/posts')).json()).find((p: { id: string }) => p.id === post.id);
    const popupEvent = page.waitForEvent('popup');
    await page.getByRole('button', { name: '独立窗口' }).click();
    const popup = await popupEvent;
    await expect(popup.locator('.editor-preview .katex')).toHaveCount(2);
    await expect(popup.getByRole('button', { name: '行内公式', exact: true })).toBeVisible();
    await popup.evaluate(() => document.fonts.ready);
    await popup.screenshot({ animations: "disabled", path: `test-results/${info.project.name}-math-window.png`, fullPage: true });
    await popup.close();
    await page.goto(`/posts/${post.slug}`);
    await expect(page.locator('.prose .katex')).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const result = await page.request.put(`/api/admin/posts/${post.id}`, { headers, data: { ...post, saveAction: 'draft', published: true, publishedMini: true } });
    expect(result.status()).toBe(200); post = await result.json();
    expect(post.published).toBe(false); expect(post.publishedMini).toBe(false);
  } finally { await page.request.delete(`/api/admin/posts/${post.id}?version=${post.version}`, { headers }); }
});

test('logo hover highlights every letter', async ({ page }) => {
  await page.goto('/');
  await page.locator('a.logo').hover();
  const colors = await page.locator('a.logo').evaluate(el => [el, ...el.querySelectorAll('span')].map(node => getComputedStyle(node).color));
  expect(new Set(colors).size).toBe(1);
});
