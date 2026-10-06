import { test, expect, type APIRequestContext } from "@playwright/test";

async function csrf(request: APIRequestContext) { return (await (await request.get('/api/account/session')).json()).csrfToken as string; }
async function admin(request: APIRequestContext) {
  expect((await request.post('/api/auth/login', { headers: { 'X-CSRF-TOKEN': await csrf(request) }, data: { userName: 'testadmin', password: 'E2e-only-password-2026!' } })).status()).toBe(200);
  return { 'X-CSRF-TOKEN': await csrf(request) };
}

test('automatic metadata and independent publishing channels', async ({ request }) => {
  const headers = await admin(request);
  const response = await request.post('/api/admin/posts', { headers, data: { title: '自动文章', date: '2026-09-08', category: '渠道测试', tags: ['选择标签'], content: '## 自动摘要\n\n![封面](/images/quiet-hills.svg)', publishedMini: true } });
  expect(response.status()).toBe(201);
  let post = await response.json();
  try {
    expect(post.slug).toMatch(/^post-[a-f0-9]{16}$/);
    expect(post.description).toBe('');
    expect((await request.get(`/api/posts/${post.slug}`)).status()).toBe(404);
    expect((await request.get(`/api/posts/${post.slug}/comments`)).status()).toBe(404);
    const mini = await request.get(`/api/posts/${post.slug}?channel=mini`);
    expect(mini.status()).toBe(200);
    expect((await mini.json()).coverUrl).toBe('/images/quiet-hills.svg');
    expect((await mini.json()).description).toContain('自动摘要');
    expect((await request.get(`/api/posts/${post.slug}/comments?channel=mini`)).status()).toBe(200);
    expect((await (await request.get('/api/categories')).json()).some((c: { name: string }) => c.name === '渠道测试')).toBe(false);
    expect((await (await request.get('/api/categories?channel=mini')).json()).some((c: { name: string }) => c.name === '渠道测试')).toBe(true);
    expect(await (await request.get('/feed.xml')).text()).not.toContain(post.slug);
    const updated = await request.put(`/api/admin/posts/${post.id}`, { headers, data: { ...post, slug: null, title: '改标题地址不变', published: true, publishedMini: false, autoCover: false, coverUrl: '/images/custom.png' } });
    expect(updated.status()).toBe(200);
    const next = await updated.json(); expect(next.slug).toBe(post.slug); post = next;
    expect((await (await request.get(`/api/posts/${post.slug}`)).json()).coverUrl).toBe('/images/custom.png');
    expect((await request.get(`/api/posts/${post.slug}?channel=mini`)).status()).toBe(404);
    expect(await (await request.get('/feed.xml')).text()).toContain(post.slug);
    expect((await request.get('/api/posts?channel=other')).status()).toBe(400);
  } finally { await request.delete(`/api/admin/posts/${post.id}?version=${post.version}`, { headers }); }
});

test('account favorites synchronize across sessions and remain isolated from other readers', async ({ request, playwright }) => {
  const userName = `sync-${Date.now()}`;
  const password = 'Reader-sync-password!';
  expect((await request.get('/api/favorites')).status()).toBe(401);
  expect((await request.post('/api/account/register', { data: { userName, password }, headers: { 'X-CSRF-TOKEN': await csrf(request) } })).status()).toBe(200);
  expect((await request.get('/api/admin/posts')).status()).toBe(403);
  expect((await request.get('/api/admin/comments')).status()).toBe(403);
  expect((await request.post('/api/auth/password', { headers: { 'X-CSRF-TOKEN': await csrf(request) }, data: { currentPassword: password, newPassword: 'Some-new-password!' } })).status()).toBe(403);
  expect((await request.put('/api/favorites/hello-ottlog')).status()).toBe(400);
  const headers = { 'X-CSRF-TOKEN': await csrf(request) };
  expect((await request.put('/api/favorites/hello-ottlog', { headers })).status()).toBe(204);
  expect((await request.put('/api/favorites/hello-ottlog', { headers })).status()).toBe(204);
  expect(await (await request.get('/api/favorites')).json()).toHaveLength(1);
  const second = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3000' });
  const other = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3000' });
  try {
    expect((await second.post('/api/account/login', { headers: { 'X-CSRF-TOKEN': await csrf(second) }, data: { userName, password } })).status()).toBe(200);
    expect(await (await second.get('/api/favorites?channel=mini')).json()).toHaveLength(1);
    expect((await other.post('/api/account/register', { headers: { 'X-CSRF-TOKEN': await csrf(other) }, data: { userName: `${userName}-other`, password } })).status()).toBe(200);
    expect(await (await other.get('/api/favorites')).json()).toHaveLength(0);
    await other.delete('/api/favorites/hello-ottlog', { headers: { 'X-CSRF-TOKEN': await csrf(other) } });
    expect(await (await second.get('/api/favorites')).json()).toHaveLength(1);
    await second.delete('/api/favorites/hello-ottlog', { headers: { 'X-CSRF-TOKEN': await csrf(second) } });
    expect(await (await request.get('/api/favorites')).json()).toHaveLength(0);
  } finally { await second.dispose(); await other.dispose(); }
});

test('editor split preview, popup synchronization, tags and management filters', async ({ page }, info) => {
  const headers = await admin(page.request);
  await page.goto('/admin');
  await page.getByRole('button', { name: '新建文章' }).click();
  await page.getByLabel('标题', { exact: true }).fill('编辑体验测试');
  await expect(page.getByLabel('文章地址', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('自动选择封面')).toBeChecked();
  await page.getByLabel('正文', { exact: true }).fill('## 实时预览\n\n正文内容');
  await expect(page.locator('.editor-preview h2')).toHaveText('实时预览');
  const tag = page.locator('.tag-choices button').first();
  await tag.click(); await expect(tag).toHaveAttribute('aria-pressed', 'true');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: '独立窗口' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  await popup.getByLabel('正文', { exact: true }).fill('## 独立窗口正文');
  await popup.getByRole('button', { name: '粗体', exact: true }).click();
  await expect(popup.getByLabel('正文', { exact: true })).toHaveValue(/\*\*粗体文字\*\*/);
  await popup.getByRole('button', { name: '返回主窗口' }).click();
  await expect(page.getByLabel('正文', { exact: true })).toHaveValue(/独立窗口正文/);
  const pixel = { name: 'pixel.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') };
  await page.getByLabel('插入图片', { exact: true }).setInputFiles(pixel);
  await expect(page.getByRole('status')).toContainText('图片已上传');
  await expect(page.getByLabel('正文', { exact: true })).toHaveValue(/!\[图片说明\]\(\/images\/.*\.png\)/);
  const autoCover = await page.locator('.cover-preview').getAttribute('src');
  expect(autoCover).toMatch(/\.png$/);
  await page.getByLabel('上传自定义封面', { exact: true }).setInputFiles(pixel);
  await expect(page.getByLabel('自动选择封面')).not.toBeChecked();
  expect(await page.locator('.cover-preview').getAttribute('src')).not.toBe(autoCover);
  const secondPopup = page.waitForEvent('popup');
  await page.getByRole('button', { name: '独立窗口' }).click();
  const editorWindow = await secondPopup;
  await expect(editorWindow.getByLabel('正文', { exact: true })).toHaveValue(/独立窗口正文/);
  await editorWindow.close();
  await expect(page.getByLabel('正文', { exact: true })).toHaveValue(/独立窗口正文/);
  await page.getByRole('button', { name: '保存草稿', exact: true }).first().click();
  await expect(page.getByRole('status')).toContainText('草稿已保存');
  const post = (await (await page.request.get('/api/admin/posts')).json()).find((p: { title: string }) => p.title === '编辑体验测试');
  try {
    await page.getByLabel('发布筛选').selectOption('draft');
    await expect(page.locator('.admin-list button')).toHaveCount(1);
    await page.getByLabel('发布筛选').selectOption('web');
    await expect(page.locator('.admin-list')).not.toContainText('编辑体验测试');
    await page.getByLabel('发布筛选').selectOption('all');
    await page.getByLabel('分类筛选').selectOption('技术探索');
    await expect(page.locator('.admin-list button')).toHaveCount(2);
    await page.getByLabel('分类筛选').selectOption('');
    await page.getByLabel('文章排序').selectOption('oldest');
    const oldest = await page.locator('.admin-list button').first().innerText();
    await page.getByLabel('文章排序').selectOption('newest');
    expect(await page.locator('.admin-list button').first().innerText()).not.toBe(oldest);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/${info.project.name}-new-editor.png`, fullPage: true });
  } finally { if (post) await page.request.delete(`/api/admin/posts/${post.id}?version=${post.version}`, { headers }); }
});

test('public footer hides admin links and RSS has a readable subscription page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer a[href^="/admin"]')).toHaveCount(0);
  await expect(page.locator('header')).toContainText('登录 / 注册');
  await page.getByRole('link', { name: 'RSS 订阅' }).click();
  await expect(page).toHaveURL(/\/subscribe$/);
  await expect(page.getByRole('heading', { name: '订阅 Ottlog', exact: true })).toBeVisible();
  await expect(page.getByLabel('正式站点订阅地址')).toHaveValue('https://ohtautau.com/feed.xml');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
