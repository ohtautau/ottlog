// Render the native tab icons from vector paths; no external artwork or image request.
const path = require('node:path');
const { chromium } = require('../../web/node_modules/@playwright/test');
const icons = {
  home: '<path d="M10 29 32 10 54 29M17 26v28h30V26M27 54V36h10v18"/>',
  todos: '<rect x="12" y="10" width="40" height="46" rx="7"/><path d="m20 25 4 4 7-9M35 25h9m-24 16 4 4 7-9M35 41h9"/>',
  pomodoro: '<path d="M32 16c-12-9-22 0-22 14 0 15 10 24 22 24s22-9 22-24c0-14-10-23-22-14ZM32 16V8M24 9l8 7 8-7M32 25v11l8 5"/>',
  daily: '<path d="M32 54V29M32 37C17 37 10 27 11 14c14 0 22 9 21 23ZM32 29C32 17 41 9 53 10c0 12-8 21-21 19ZM19 23l13 14m11-18-11 10M21 54h22"/>',
  posts: '<path d="M32 17c-7-6-15-7-23-5v39c8-2 16-1 23 5 7-6 15-7 23-5V12c-8-2-16-1-23 5Zm0 0v39M17 23l8 3m-8 7 8 3m14-10 8-3m-8 13 8-3"/>',
  profile: '<circle cx="32" cy="21" r="11"/><path d="M12 55v-4c0-10 9-16 20-16s20 6 20 16v4"/>',
};
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
    const requestedIcons = new Set(process.argv.slice(2));
    const chosenIcons = Object.entries(icons).filter(([name]) => !requestedIcons.size || requestedIcons.has(name));
    for (const [name, shape] of chosenIcons) for (const active of [false, true]) {
      await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="${active ? '#b9dbca' : '#8f9fae'}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`);
      await page.screenshot({ path: path.join(__dirname, '../src/assets', `tab-${name}${active ? '-active' : ''}.png`), omitBackground: true });
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
