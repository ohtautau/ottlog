import { test, expect, type APIRequestContext } from "@playwright/test";

const userName = "testadmin";
const password = "E2e-only-password-2026!";
async function login(request: APIRequestContext) {
  const anonymous = await (await request.get('/api/auth/session')).json();
  const result = await request.post('/api/auth/login', { data: { userName, password }, headers: { 'X-CSRF-TOKEN': anonymous.csrfToken } });
  expect(result.status()).toBe(200);
  return (await (await request.get('/api/auth/session')).json()).csrfToken as string;
}

test('authorization, drafts, conflicts, moderation and upload protection', async ({ request }) => {
  expect((await request.get('/api/admin/posts')).status()).toBe(401);
  const csrf = await login(request);
  const headers = { 'X-CSRF-TOKEN': csrf };
  const slug = `api-test-${Date.now()}`;
  const data = { slug, title: '测试草稿', description: '测试摘要', date: '2026-09-07', category: '测试', tags: ['测试'], content: '持久化正文', coverUrl: '', published: false };
  expect((await request.post('/api/admin/posts', { data })).status()).toBe(400);
  const response = await request.post('/api/admin/posts', { headers, data });
  expect(response.status()).toBe(201);
  const created = await response.json();
  try {
    expect((await request.get(`/api/posts/${slug}`)).status()).toBe(404);
    expect((await request.post(`/api/posts/${slug}/comments`, { data: { name: 'reader', text: 'hello' } })).status()).toBe(404);
    expect(await (await request.get('/feed.xml')).text()).not.toContain(slug);
    expect((await request.post('/api/admin/posts', { headers, data })).status()).toBe(409);
    const publishedResponse = await request.put(`/api/admin/posts/${created.id}`, { headers, data: { ...data, version: created.version, published: true } });
    expect(publishedResponse.status()).toBe(200);
    const published = await publishedResponse.json();
    expect((await request.put(`/api/admin/posts/${created.id}`, { headers, data: { ...data, version: created.version } })).status()).toBe(409);
    expect((await request.get(`/api/posts/${slug}`)).status()).toBe(200);
    expect(await (await request.get('/feed.xml')).text()).toContain(`https://ohtautau.com/posts/${slug}`);
    const commentResponse = await request.post(`/api/posts/${slug}/comments`, { data: { name: 'reader', text: '<script>alert(1)</script>评论' } });
    expect(commentResponse.status()).toBe(202);
    expect(await (await request.get(`/api/posts/${slug}/comments`)).json()).toHaveLength(0);
    const comments = await (await request.get('/api/admin/comments')).json();
    const comment = comments.find((c: { postTitle: string }) => c.postTitle === data.title);
    expect((await request.put(`/api/admin/comments/${comment.id}`, { headers, data: { approved: true } })).status()).toBe(204);
    expect(await (await request.get(`/api/posts/${slug}/comments`)).json()).toHaveLength(1);
    const badFile = await request.post('/api/admin/uploads', { headers, multipart: { file: { name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('<script>alert(1)</script>') } } });
    expect(badFile.status()).toBe(400);
    const goodFile = await request.post('/api/admin/uploads', { headers, multipart: { file: { name: 'pixel.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') } } });
    expect(goodFile.status()).toBe(200);
    const image = await request.get((await goodFile.json()).url);
    expect(image.headers()['content-type']).toContain('image/png');
    expect((await request.delete(`/api/admin/posts/${created.id}?version=${published.version}`, { headers })).status()).toBe(204);
    expect((await request.get(`/api/posts/${slug}`)).status()).toBe(404);
  } finally {
    const remaining = (await (await request.get('/api/admin/posts')).json()).find((p: { id: string }) => p.id === created.id);
    if (remaining) await request.delete(`/api/admin/posts/${remaining.id}?version=${remaining.version}`, { headers });
  }
  expect((await request.post('/api/auth/logout', { headers })).status()).toBe(204);
  expect((await request.get('/api/admin/posts')).status()).toBe(401);
});

test('administrator can write, preview, publish and delete from browser', async ({ page, request }, testInfo) => {
  const slug = `browser-test-${Date.now()}`;
  await page.goto('/admin');
  await page.getByLabel('账号', { exact: true }).fill(userName);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.getByRole('button', { name: '新建文章' }).click();
  await page.getByLabel('标题', { exact: true }).fill('浏览器测试文章');
  await page.getByLabel('自定义文章地址').check();
  await page.getByLabel('文章地址', { exact: true }).fill(slug);
  await page.getByLabel('摘要', { exact: true }).fill('端到端测试摘要');
  await page.getByLabel('正文', { exact: true }).fill('## 预览标题\n\n这是测试正文。');
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.locator('.editor-preview h2')).toHaveText('预览标题');
  await page.getByRole('button', { name: '保存草稿', exact: true }).first().click();
  await expect(page.getByRole('status')).toContainText('草稿已保存');
  expect((await request.get(`/api/posts/${slug}`)).status()).toBe(404);
  await page.getByLabel('在博客网站公开（PC / 手机网页）').check();
  await page.getByRole('button', { name: '发布文章', exact: true }).first().click();
  await expect(page.getByRole('status')).toContainText('文章已发布');
  await page.screenshot({ path: `test-results/${testInfo.project.name}-admin.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '删除文章', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('文章已删除');
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
});

test('reader can save and remove favorites', async ({ page }) => {
  const session = await (await page.request.get('/api/account/session')).json();
  expect((await page.request.post('/api/account/register', { data: { userName: `reader-${Date.now()}`, password: 'Reader-test-password!' }, headers: { 'X-CSRF-TOKEN': session.csrfToken } })).status()).toBe(200);
  await page.goto('/posts/hello-ottlog');
  await page.getByRole('button', { name: '收藏文章' }).click();
  await expect(page.getByRole('button', { name: '已收藏' })).toBeVisible();
  await page.goto('/favorites');
  await expect(page.locator('.favorite-row')).toHaveCount(1);
  await page.getByRole('button', { name: '移除' }).click();
  await expect(page.locator('.favorite-row')).toHaveCount(0);
});
