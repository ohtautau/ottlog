const path = require('node:path');
module.exports = async ({ page, origin, out, width, expect }) => {
  await page.goto(`${origin}/?account-mottos=${width}#/pages/index/index`);
  await expect(page.locator('.today-shortcut-toolbar')).toBeVisible();
  await expect(page.locator('.today-quote')).toHaveCount(0);
  await page.evaluate(() => { location.hash = '#/pages/mottos/index'; });
  await expect(page.getByText('登录后查看自己的格言', { exact: true })).toBeVisible();
  await expect(page.locator('.motto-row,.empty-data-preview')).toHaveCount(0);
  await page.evaluate(() => {
    window.__miniFixture.sessionProfile = { authenticated: true, userName: 'motto-a', isAdmin: false };
    window.__miniFixture.accountToolStates = {
      'motto-a': { mottos: { version: 1, mottos: ['账号A自己的格言'], rotationSeconds: 16 } },
      'motto-b': { mottos: { version: 1, mottos: ['账号B自己的格言'], rotationSeconds: 7 } },
    };
    window.__miniPreviewControl.emit('ottlog-session');
    location.hash = '#/pages/index/index';
  });
  await expect(page.locator('.today-quote-text')).toHaveText('账号A自己的格言');
  await page.evaluate(() => {
    window.__miniFixture.sessionProfile = { authenticated: true, userName: 'motto-b', isAdmin: false };
    window.__miniFixture.toolRequestDelays = { '/personal-tools/mottos': 600 };
    window.__miniPreviewControl.emit('ottlog-session');
  });
  await expect(page.locator('.today-quote-text')).not.toHaveText('账号A自己的格言');
  await expect(page.locator('.today-quote-text')).toHaveText('账号B自己的格言');
  await page.screenshot({ path: path.join(out, `account-mottos-${width}.png`) });
  await page.evaluate(() => {
    window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false };
    window.__miniPreviewControl.emit('ottlog-session');
  });
  await expect(page.locator('.today-quote')).toHaveCount(0);
  expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path === '/mottos'))).toEqual([]);
};
