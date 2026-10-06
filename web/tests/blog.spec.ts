import { test, expect } from "@playwright/test";

test("search and category filters work together", async ({ page }) => {
  await page.goto("/posts");
  await page.getByLabel("关键词").fill("markdown");
  await page.getByLabel("分类", { exact: true }).selectOption("技术探索");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.locator("[data-journal-card]")).toHaveCount(2);
  await page.getByLabel("分类", { exact: true }).selectOption("日常生活");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.getByRole("heading", { name: "没有找到相关文章" })).toBeVisible();
  await page.getByRole("link", { name: "清除筛选" }).click();
  await expect(page.locator("[data-journal-card]")).toHaveCount(3);
});

test("API contract and query validation", async ({ request }) => {
  const api = "http://127.0.0.1:5229";
  const response = await request.get(`${api}/api/posts`);
  expect(response.status()).toBe(200);
  const posts = await response.json();
  expect(posts).toHaveLength(3);
  expect(posts[0]).not.toHaveProperty("content");
  const detail = await request.get(`${api}/api/posts/${posts[0].slug}`);
  expect((await detail.json()).content).toContain("##");
  const categories = await (await request.get(`${api}/api/categories`)).json();
  expect(categories).toEqual(expect.arrayContaining([{ name: "技术探索", count: 2 }, { name: "日常生活", count: 1 }]));
  const filtered = await request.get(`${api}/api/posts`, { params: { q: "  MARKDOWN  ", category: "技术探索" } });
  expect(await filtered.json()).toHaveLength(2);
  const bodySearch = await request.get(`${api}/api/posts`, { params: { q: "树影" } });
  expect((await bodySearch.json())[0].slug).toBe("slow-weekend");
  expect((await request.get(`${api}/api/posts/missing`)).status()).toBe(404);
  expect((await request.get(`${api}/api/posts`, { params: { q: "x".repeat(101) } })).status()).toBe(400);
  expect((await request.get(`${api}/images/quiet-hills.svg`)).status()).toBe(200);
});

test("read from home to archive and article", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/Ottlog/);
  await expect(page.locator("h1")).toContainText("让想法");
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-home.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "开始阅读" }).click();
  await expect(page).toHaveURL(/\/posts$/);
  await expect(page.locator("[data-journal-card]")).toHaveCount(3);
  await page
    .getByRole("link", { name: "从零开始，搭建自己的数字小屋", exact: true })
    .click();
  await expect(page.locator("h1")).toHaveText("从零开始，搭建自己的数字小屋");
  const picture = page.locator(".prose img");
  await expect(picture).toBeVisible();
  await expect
    .poll(() =>
      picture.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-article.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "返回所有文章" }).click();
  await expect(page).toHaveURL(/\/posts$/);
  expect(errors).toEqual([]);
});

test("all pages fit viewport and Markdown renders", async ({ page }) => {
  for (const route of [
    "/",
    "/posts",
    "/posts/hello-ottlog",
    "/posts/markdown-notes",
    "/posts/slow-weekend",
  ]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/posts/markdown-notes");
  await expect(page.locator("pre code")).toContainText("firstNote");
  await expect(page.locator(".prose table")).toBeVisible();
  await expect(page.locator(".prose blockquote")).toBeVisible();
  const response = await page.goto("/posts/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.locator("h1")).toContainText("这篇记录还未抵达");
});
