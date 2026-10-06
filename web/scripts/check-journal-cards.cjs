// Read-only browser checks against the isolated preview. Does not seed or change articles.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');

const runtimePath = path.join(__dirname, '../test-results/productivity-runtime.json');
const origin = process.env.TEST_ORIGIN || JSON.parse(fs.readFileSync(runtimePath, 'utf8')).origin;
const output = path.join(__dirname, '../test-results/journal-cards');
const selector = '[data-journal-card]';

async function appearance(link) {
  return link.evaluate(element => {
    const style = getComputedStyle(element);
    const image = element.querySelector('img');
    const rect = element.getBoundingClientRect();
    return {
      background: style.backgroundColor,
      color: style.color,
      transform: style.transform,
      imageTransform: image ? getComputedStyle(image).transform : 'none',
      focusVisible: element.matches(':focus-visible'),
      outlineWidth: parseFloat(style.outlineWidth),
      outlineStyle: style.outlineStyle,
      x: rect.x, y: rect.y, width: rect.width, height: rect.height,
    };
  });
}

async function checkCards(page, articles, route, width) {
  const cards = page.locator(selector);
  assert(await cards.count() > 0, `${route}: expected published seed articles`);
  for (const card of await cards.all()) {
    const link = card.locator(':scope > a');
    await expect(link).toHaveCount(1);
    const href = await link.getAttribute('href');
    assert(href?.startsWith('/posts/'), `Unexpected article URL: ${href}`);
    const slug = decodeURIComponent(href.slice('/posts/'.length));
    const post = articles.find(item => item.slug === slug);
    assert(post, `Card ${slug} must correspond to an API article`);
    await expect(link).toHaveAccessibleName(post.title);
    await expect(card.getByRole('heading', { level: 2 })).toHaveText(post.title);
    await expect(card.getByText(post.category, { exact: true })).toBeVisible();
    await expect(card.locator('time')).toHaveAttribute('datetime', post.date);
    await expect(card.locator('time')).toBeVisible();
    await expect(card.getByText(`${post.minutes} 分钟阅读`, { exact: true })).toBeVisible();
    if (post.tags.length) {
      const tags = card.locator('[aria-label="文章标签"]');
      await expect(tags).toBeVisible();
      for (const tag of post.tags) await expect(tags).toContainText(tag);
    }
    const rect = await card.boundingBox();
    assert(rect && rect.x >= -1 && rect.x + rect.width <= width + 1,
      `${route}, ${width}px: article ${slug} extends outside the viewport`);
    assert(!(await link.innerText()).includes('↗'), 'Article links should not show an external-window arrow');
  }
  const dimensions = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth }));
  assert(dimensions.scroll <= dimensions.width + 1,
    `${route}, ${width}px: page overflows horizontally (${dimensions.scroll}px)`);
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const response = await context.request.get(`${origin}/api/posts`);
    assert.equal(response.status(), 200, 'Published articles API must be available');
    const articles = await response.json();
    assert(Array.isArray(articles) && articles.length > 0,
      'The isolated preview has no published articles. Enable seed examples in the fixture before running this read-only check.');
    assert(articles.some(post => post.tags?.length), 'Include at least one tagged seed article to verify tags');
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));

    for (const width of [1440, 1024, 390, 320]) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
      for (const route of ['/', '/posts']) {
        const result = await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded' });
        assert.equal(result.status(), 200, `${route} should load`);
        await expect(page.locator(selector).first()).toBeVisible();
        await checkCards(page, articles, route, width);
        await page.locator(route === '/' ? '.journal-home-grid' : '.journal-archive-grid').screenshot({
          path: path.join(output, `${route === '/' ? 'home' : 'archive'}-${width}.png`),
          animations: 'disabled',
        });
      }
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const route of ['/', '/posts']) {
      await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded' });
      const link = page.locator(`${selector} > a`).first();
      const title = await link.getAttribute('aria-label');
      const href = await link.getAttribute('href');
      await link.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await link.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(link).toBeFocused();
      const focus = await appearance(link);
      assert(focus.focusVisible && focus.outlineWidth >= 2 && focus.outlineStyle !== 'none',
        `${route}: keyboard navigation must have a visible focus outline`);

      assert.equal((await appearance(link)).background, 'rgba(0, 0, 0, 0)', `${route}: card background should be transparent`);
      const restingTitle = await link.locator('h2').evaluate(e => getComputedStyle(e).color);
      await link.hover();
      await expect.poll(() => link.locator('h2').evaluate(e => getComputedStyle(e).color)).not.toBe(restingTitle);
      assert.equal((await appearance(link)).background, 'rgba(0, 0, 0, 0)', `${route}: hover should remain transparent`);
      await link.screenshot({ path: path.join(output, `${route === '/' ? 'home' : 'archive'}-hover.png`), animations: 'disabled' });

      await link.click();
      await expect(page).toHaveURL(new URL(href, origin).href);
      await expect(page.locator('h1')).toHaveText(title);
    }

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${origin}/posts`, { waitUntil: 'domcontentloaded' });
    const link = page.locator(`${selector} > a`).first();
    await link.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const reducedBefore = await appearance(link);
    await link.hover();
    const reducedHover = await appearance(link);
    assert.equal(reducedHover.transform, 'none', 'Reduced motion must disable hover displacement');
    assert.equal(reducedHover.imageTransform, 'none', 'Reduced motion must disable cover zoom');
    assert(Math.abs(reducedBefore.x - reducedHover.x) < 0.5 && Math.abs(reducedBefore.y - reducedHover.y) < 0.5,
      'Reduced-motion hover should preserve the card position');
    await page.mouse.down();
    const reducedActive = await appearance(link);
    assert.equal(reducedActive.transform, 'none', 'Reduced motion must disable pressed displacement');
    // Release outside the link to avoid an incidental navigation while checking its active state.
    await page.mouse.move(0, 0);
    await page.mouse.up();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const touchPage = await mobile.newPage();
    touchPage.on('pageerror', error => errors.push(error.message));
    await touchPage.goto(`${origin}/posts`, { waitUntil: 'domcontentloaded' });
    await checkCards(touchPage, articles, '/posts (touch)', 390);
    const touchLink = touchPage.locator(`${selector} > a`).first();
    const touchTitle = await touchLink.getAttribute('aria-label');
    await touchLink.tap();
    await expect(touchPage.locator('h1')).toHaveText(touchTitle);
    await mobile.close();

    assert.deepEqual(errors, [], 'Browser should not report page errors');
    console.log('PASS article cards: home/archive at 1440/1024/390/320px, metadata and tags, keyboard focus, transparent background and hover title highlight, reduced motion, desktop/touch navigation.');
    console.log(`Screenshots: ${output}`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
