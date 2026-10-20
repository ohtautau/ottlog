/* Browser-only interaction/visual checks of real mini-program React pages.
   Taro components/hooks are adapted to HTML. This does NOT certify the WeChat runtime.
   API is a local fixture; no accounts/content on the real backend are mutated. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const esbuild = require('../node_modules/esbuild');
const { chromium, expect } = require('../../web/node_modules/@playwright/test');
const root = path.resolve(__dirname, '..');
const outputTag = (process.env.OTTLOG_UI_OUTPUT_TAG || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 60);
const out = path.join(root, 'test-results', outputTag ? `ui-preview-${outputTag}` : 'ui-preview');
const onlyHomeShortcuts = process.argv.includes('--home-shortcuts') || process.argv.includes('--home-shortcut-layout');
const onlyHomeShortcutLibrary = process.argv.includes('--home-shortcut-library');
const onlyHomeNavigation = ['--home-navigation', '--home-overview', '--home-summary'].some(flag => process.argv.includes(flag));
const onlyHomeDirectory = process.argv.includes('--home-directory');
const onlyPomodoro = process.argv.includes('--pomodoro');
const onlyTodos = process.argv.includes('--todos');
const onlyTodoDisplay = process.argv.includes('--todo-display');
const onlyAppPrompts = process.argv.includes('--app-prompts');
const onlyWindowClose = process.argv.includes('--window-close') || onlyAppPrompts;
const onlyMeals = process.argv.includes('--meals');
const onlySheetFooters = process.argv.includes('--sheet-footers');
const onlyTagRowSpacing = process.argv.includes('--tag-row-spacing');
const onlyEntryCreation = process.argv.includes('--entry-creation');
const onlyHomeEntryMode = process.argv.includes('--home-entry-mode');
const onlyHomeCreationScroll = process.argv.includes('--home-creation-scroll');
const homeEntryModePreview = onlyHomeEntryMode && process.argv.includes('--preview-mode');
const onlyProgressCreation = process.argv.includes('--progress-creation');
const onlyScreens = process.argv.includes('--screens');
const onlyToolbars = process.argv.includes('--toolbars');
const onlyEntertainmentPreview = process.argv.includes('--domain-entertainment-preview');
const onlyDomainPreview = process.argv.includes('--domain-preview') || onlyEntertainmentPreview;
const onlyCalendarLabels = process.argv.includes('--calendar-labels');
const onlyScheduleTime = process.argv.includes('--schedule-time');
const onlyReminderSettings = process.argv.includes('--reminder-settings');
const onlyToolbarSummaries = process.argv.includes('--toolbar-summaries');
const onlyDomainRecentRecords = process.argv.includes('--domain-recent-records');
const onlyTextWhitespace = process.argv.includes('--text-whitespace');
const onlyHabitCommentLogs = process.argv.includes('--habit-comment-logs');
const onlyHabitTimePeriods = process.argv.includes('--habit-time-periods');
const onlyDomainHabitCreation = process.argv.includes('--domain-habit-creation');
const onlyHabitDetailEdit = process.argv.includes('--habit-detail-edit');
const onlyStatisticsInsights = process.argv.includes('--statistics-insights');
fs.mkdirSync(out, { recursive: true });
const fixture = {
  persistEntryTools: onlyHomeDirectory || onlyWindowClose || process.argv.includes('--mottos') || onlyEntryCreation || onlyHomeEntryMode || onlyProgressCreation || process.argv.includes('--entry-clear-focus') || process.argv.includes('--record-edit') || process.argv.includes('--next-step') || onlyDomainPreview || onlyCalendarLabels || onlyScheduleTime || onlyReminderSettings || onlyToolbarSummaries || onlyDomainRecentRecords || onlyDomainHabitCreation || onlyHabitDetailEdit,
  domainPreview: onlyDomainPreview,
  mottos: ['别评判自己，别审判自己。', '记得分享观察和感受。', '不休息怎么工作！'],
  comments: [{ id: 'preview-comment', name: '来访者', text: '把好奇心继续写下来。', createdAt: '2026-09-10T10:00:00Z' }],
  posts: Array.from({ length: 13 }, (_, index) => ({
    slug: `preview-${index}`, title: ['让记录有一个自己的地方', '在日常的缝隙里散步', '给想法留一盏灯'][index % 3] + (index ? ` · ${index + 1}` : ''),
    category: ['技术探索', '日常生活', '随笔'][index % 3], tags: [['Markdown', '代码'], ['散步', '观察'], ['记录', '思考']][index % 3],
    date: `2026-09-${String(10 - index % 9).padStart(2, '0')}`, minutes: 3 + index,
    description: '用自己的方式整理灵感，把此刻的观察和想法留在这里。文章、分类和收藏一起组成这个持续生长的空间。',
    coverUrl: '/__preview-cover.svg', content: '# 让记录有一个自己的地方\n\n这里是用于界面验证的文章，不会写入真实博客。\n\n## 一点观察\n\n- 记录生活\n- 保持好奇\n\n**这是重点**，也可以保留 `一段代码`。\n\n```ts\nconst message = "hello, Ottlog";\n```\n\n| 主题 | 内容 |\n| --- | --- |\n| 日常 | 散步 |\n\n![示例图片](/__preview-cover.svg)\n\n[网页链接](https://ohtautau.com)',
  })),
};
const routes = ['index', 'todos', 'posts', 'categories', 'detail', 'favorites', 'journal', 'daily', 'pomodoro', 'memos', 'choose', 'meals', 'mottos', 'domains', 'domain-detail', 'statistics', ...(onlyDomainPreview ? ['preview-data'] : [])].filter(page => fs.existsSync(path.join(root, 'src', 'pages', page, 'index.tsx')));
if (process.argv.includes('--toolbar-defaults')) fixture.persistEntryTools = true;
const imports = routes.map((p, i) => `import Page${i} from ${JSON.stringify(path.join(root, 'src', 'pages', p, 'index.tsx'))};`).join('\n');
const source = `import React, {useState,useEffect} from 'react'; import {createRoot} from 'react-dom/client'; import ${JSON.stringify(path.join(root, 'src/app.css'))};
${imports}
${onlyWindowClose ? `import { requestAppConfirmation, showAppMessage } from ${JSON.stringify(path.join(root, 'src/lib/app-dialog.ts'))}; (window as any).__miniAppDialogPreview={requestAppConfirmation,showAppMessage};` : ''}
${onlyWindowClose ? `import CloseGuardFixture from ${JSON.stringify(path.join(__dirname, 'ui-preview-close-guard.tsx'))};` : ''}
${onlyTagRowSpacing ? `import TagRowFixture from ${JSON.stringify(path.join(__dirname, 'ui-preview-tag-row.tsx'))};` : ''}
${onlyToolbars ? `import ButtonContextFixture from ${JSON.stringify(path.join(__dirname, 'ui-preview-button-context.tsx'))};` : ''}
const pages={${routes.map((p, i) => `${JSON.stringify(`pages/${p}/index`)}:Page${i}`).join(',')}${onlyTagRowSpacing ? ",'pages/tag-row-fixture/index':TagRowFixture" : ''}${onlyToolbars ? ",'pages/button-context-fixture/index':ButtonContextFixture" : ''}${onlyWindowClose ? ",'pages/close-guard-fixture/index':CloseGuardFixture" : ''}};
const tabs=[['index','今日','⌂'],['todos','待办','☑'],['domains','领域','◇'],['daily','习惯','✿'],['favorites','我的','○']];
function Preview(){ const [route,setRoute]=useState(location.hash || '#/pages/index/index'); useEffect(()=>{const cb=()=>{setRoute(location.hash);window.scrollTo(0,0)};addEventListener('hashchange',cb);return()=>removeEventListener('hashchange',cb)},[]);const routePath=route.replace(/^#\\/?/,'').split('?')[0];const Component=pages[routePath] || Page0;const tab=tabs.find(t=>routePath==='pages/'+t[0]+'/index');return <div className={'preview-device '+(tab?'preview-with-tabs':'')}><header className='preview-native-header'>{!tab&&<button onClick={()=>history.back()}>‹</button>}<span>{tab?tab[1]:routePath==='pages/statistics/index'?'统计':'Ottlog'}</span><span className='preview-capsule'>•••　◉</span></header><main className='preview-content'><Component key={route}/></main>{tab&&<nav className='preview-native-tabs'>{tabs.map(t=><a key={t[0]} href={'#/pages/'+t[0]+'/index'} className={t===tab?'active':''}><span>{t[2]}</span>{t[1]}</a>)}</nav>}</div>; } createRoot(document.getElementById('root')).render(<Preview/>);`;
const cover = '<svg xmlns="http://www.w3.org/2000/svg" width="750" height="480" viewBox="0 0 750 480"><rect width="750" height="480" fill="#14263d"/><circle cx="540" cy="130" r="70" fill="#d69a85"/><path d="M0 360L240 160L440 360L620 210L750 380V480H0Z" fill="#396988"/><path d="M0 420L210 260L410 430L600 330L750 450V480H0Z" fill="#83b9a4"/></svg>';
function previewCss(source) {
  const media = [];
  return source.replace(/@media[^{}]+/g, text => `@MEDIA_PREVIEW_${media.push(text) - 1}@`)
    .replace(/env\(safe-area-inset-bottom\)/g, 'var(--preview-safe-area-bottom,0PX)')
    .replace(/(\d+(?:\.\d+)?)(?:d|s)?vh/g, (_, number) => `calc(var(--preview-page-height) * ${Number(number) / 100})`)
    .replace(/(?<![-\w.])(page|view|text|image|picker)(?=[\s{,.:>\[]|$)/g, (_, tag) => ({ page: 'body', view: 'div', text: 'span', image: 'img', picker: 'div' }[tag]))
    .replace(/(-?\d*\.?\d+)r?px\b/g, (_, number) => `${Number(number) / 7.5}vw`)
    .replace(/@MEDIA_PREVIEW_(\d+)@/g, (_, index) => media[Number(index)]);
}
async function checkButtonSpacing(page, context, failures) {
  const issues = await page.locator('.preview-content button').evaluateAll(buttons => buttons.flatMap(button => {
    // Plain labels expose the min-height/vertical-alignment regression directly.
    if (button.children.length || !button.textContent.trim()) return [];
    const box = button.getBoundingClientRect();
    if (!box.width || !box.height) return [];
    const range = document.createRange();
    range.selectNodeContents(button);
    const label = range.getBoundingClientRect();
    const top = label.top - box.top, bottom = box.bottom - label.bottom;
    return Math.abs(top - bottom) > 4 || top < -2 || bottom < -2
      ? [`${button.className || button.textContent.trim()}: label spacing top=${top.toFixed(1)}, bottom=${bottom.toFixed(1)}`] : [];
  }));
  failures.push(...issues.map(issue => `${context}: ${issue}`));
}
async function checkCardLayout(page, context, failures) {
  const issues = await page.locator('.today-entry,.todo-quadrant,.categories-tile').evaluateAll(cards => cards.flatMap(card => {
    const issues = [];
    const expectedDisplay = card.classList.contains('today-entry') || card.classList.contains('todo-quadrant') || card.classList.contains('categories-tile') && card.closest('.core-screen') ? 'flex' : 'block';
    if (card.classList.contains('button-label') || getComputedStyle(card).display !== expectedDisplay) issues.push(`${card.className}: unexpected card layout`);
    const title = card.querySelector('.today-entry-name,.todo-quadrant-title');
    if (title) {
      const box = title.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(title).lineHeight);
      if (box.height > lineHeight * 1.2) issues.push(`${card.className}: title unexpectedly wraps into multiple lines`);
      const caption = card.querySelector('.today-entry-note,.todo-quadrant-caption');
      if (caption && caption.getBoundingClientRect().top < box.bottom - 1) issues.push(`${card.className}: caption overlaps title`);
    }
    return issues;
  }));
  failures.push(...issues.map(issue => `${context}: ${issue}`));
}
async function checkButtonAppearance(button, { kind = 'secondary', compact = false, selected = false, size, expectedColors } = {}, expect) {
  const appearance = await button.evaluate(node => {
    const style = getComputedStyle(node), rect = node.getBoundingClientRect();
    return { fontSize: parseFloat(style.fontSize), fontWeight: Number(style.fontWeight), lineHeight: parseFloat(style.lineHeight), fontFamily: style.fontFamily,
      foreground: style.color, background: style.backgroundColor, border: style.borderTopColor, radius: parseFloat(style.borderTopLeftRadius), letterSpacing: style.letterSpacing, height: rect.height, width: rect.width };
  });
  const primary = kind === 'primary';
  const large = size ? size === 'large' : primary && !compact;
  expect(appearance.height, `${kind}: complete shared touch target`).toBeGreaterThanOrEqual(size === 'regular' ? 44 : large ? 48 : 40);
  if (kind === 'icon') expect(appearance.width, 'Auxiliary icons retain a full touch target').toBeGreaterThanOrEqual(40);
  else {
    const fontSize = large ? 16 : 14;
    expect(appearance.fontSize, `${kind}: one fixed readable size on narrow and wide screens`).toBe(fontSize);
    expect(appearance.fontWeight).toBe(large && primary ? 600 : 500);
    expect(appearance.lineHeight / appearance.fontSize, `${kind}: shared label line height`).toBeCloseTo(1.4, 3);
    // Chromium computes an explicitly authored 0px letter-spacing as "normal".
    expect(appearance.letterSpacing === 'normal' ? 0 : parseFloat(appearance.letterSpacing)).toBe(0);
  }
  const colors = expectedColors ?? (selected ? ['rgb(211, 239, 223)', 'rgb(48, 76, 66)', 'rgb(164, 207, 188)']
    : primary ? ['rgb(24, 51, 44)', 'rgb(185, 219, 202)', 'rgb(185, 219, 202)']
    : kind === 'danger' ? ['rgb(237, 184, 182)', 'rgb(66, 45, 52)', 'rgb(99, 64, 74)']
    : kind === 'quiet' || kind === 'icon' ? ['rgb(199, 215, 223)', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)']
    : ['rgb(199, 215, 223)', 'rgb(32, 51, 62)', 'rgb(59, 80, 90)']);
  expect([appearance.foreground, appearance.background, appearance.border], `${kind}: shared foreground, background and border for this state`).toEqual(colors);
  expect(appearance.radius, `${kind}: shared corner format`).toBe(10);
  return appearance;
}
async function checkCreateButton(button, label, expect, { iconOnly = false } = {}) {
  await expect(button).toHaveClass(/create-button/);
  if (iconOnly) {
    await expect(button.locator('.create-button-label')).toHaveCount(0);
    await expect(button).toHaveText('');
    expect(await button.getAttribute('aria-label'), 'Icon creation retains an accessible action name').toBeTruthy();
  } else await expect(button.locator('.create-button-label')).toHaveText(label);
  await expect(button.locator('.button-add-symbol')).toHaveAttribute('aria-hidden', 'true');
  const layout = await button.evaluate(node => {
    const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height }; };
    const text = node.querySelector('.create-button-label');
    return { button: box(node), symbol: box(node.querySelector('.button-add-symbol')), label: text && box(text), clipped: text ? text.scrollWidth - text.clientWidth : 0 };
  });
  expect(layout.button.height, `${label}: at least 40px touch target`).toBeGreaterThanOrEqual(40);
  expect(layout.symbol.height).toBeGreaterThan(0);
  if (iconOnly) {
    expect(layout.button.right - layout.button.left).toBeGreaterThanOrEqual(40);
    expect((layout.symbol.left + layout.symbol.right) / 2).toBeCloseTo((layout.button.left + layout.button.right) / 2, 0);
    expect((layout.symbol.top + layout.symbol.bottom) / 2).toBeCloseTo((layout.button.top + layout.button.bottom) / 2, 0);
  } else expect(layout.symbol.right).toBeLessThanOrEqual(layout.label.left);
  expect(layout.clipped, `${label}: the complete action label fits`).toBeLessThanOrEqual(1);
  for (const part of [layout.symbol, layout.label].filter(Boolean)) {
    expect(part.left).toBeGreaterThanOrEqual(layout.button.left - 1);
    expect(part.right).toBeLessThanOrEqual(layout.button.right + 1);
    expect(part.top).toBeGreaterThanOrEqual(layout.button.top - 1);
    expect(part.bottom).toBeLessThanOrEqual(layout.button.bottom + 1);
  }
}
async function main() {
  await esbuild.build({ stdin: { contents: source, resolveDir: root, loader: 'tsx' }, bundle: true, platform: 'browser', format: 'iife', outfile: path.join(out, 'preview.js'), jsx: 'automatic', define: { API_BASE_URL: JSON.stringify('https://preview.invalid'), MINIPROGRAM_PREVIEW: onlyDomainPreview || homeEntryModePreview ? 'true' : 'false', 'process.env.NODE_ENV': JSON.stringify('development') }, plugins: [{ name: 'test-taro-adapter', setup(build) {
    build.onResolve({ filter: /^@tarojs\/(taro|components)$/ }, () => ({ path: path.join(__dirname, 'ui-preview-taro.tsx') }));
    build.onLoad({ filter: /\.css$/ }, args => ({ loader: 'css', contents: previewCss(fs.readFileSync(args.path, 'utf8')) }));
  } }] });
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/__preview-cover.svg') { res.setHeader('Content-Type', 'image/svg+xml'); res.end(cover); return; }
    if (pathname === '/preview.js' || pathname === '/preview.css') { res.setHeader('Content-Type', pathname.endsWith('.js') ? 'text/javascript' : 'text/css'); res.end(fs.readFileSync(path.join(out, pathname.slice(1)))); return; }
    const assetPath = /^\/pages\/pomodoro\/assets\/tomato-(?:focus|rest)\.png$/.test(pathname) ? pathname.replace('/pages/pomodoro/assets/', '/assets/pomodoro/') : pathname;
    if (assetPath.startsWith('/assets/')) {
      const file = path.resolve(root, 'src', '.' + assetPath);
      if (file.startsWith(path.join(root, 'src', 'assets') + path.sep) && fs.existsSync(file)) { res.setHeader('Content-Type', file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.png') ? 'image/png' : 'application/octet-stream'); res.end(fs.readFileSync(file)); return; }
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;padding:0;min-height:100%}button,input,textarea,select{font:inherit}button{display:block;cursor:pointer;text-align:center}input,textarea{display:block;width:100%}img{max-width:100%}#root{min-height:100vh}.preview-device{--preview-page-height:calc(100dvh - 44px)}.preview-with-tabs{--preview-page-height:calc(100dvh - 106px)}.preview-native-header{height:44px;display:flex;align-items:center;justify-content:center;background:#101923;color:#f3eddf;font:14px sans-serif;position:relative}.preview-native-header button{position:absolute;left:12px;background:transparent;border:0;color:#eee;margin:0;padding:0;min-height:36px;font-size:26px}.preview-capsule{position:absolute;right:8px;border:1px solid #34424b;border-radius:18px;padding:4px 10px;font-size:13px}.preview-content{height:var(--preview-page-height);position:relative;transform:translateZ(0);overflow:hidden}.preview-native-tabs{height:62px;display:flex;justify-content:space-around;align-items:center;border-top:1px solid #293b46;box-sizing:border-box;background:#101923}.preview-native-tabs a{color:#91a3b0;text-decoration:none;font:10px sans-serif;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:50px}.preview-native-tabs a span{font-size:21px}.preview-native-tabs a.active{color:#b9dbca}</style><link rel="stylesheet" href="/preview.css"><div id="root"></div><script>window.__miniFixture=${JSON.stringify(fixture).replace(/</g, '\\u003c')};window.__miniRequests=[];window.__miniNotices=[];</script><script src="/preview.js"></script></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const failures = [];
    for (const width of [360, 375, 430, 768]) {
      const page = await browser.newPage({ viewport: { width, height: width === 375 ? 667 : width < 768 ? 844 : 1024 }, reducedMotion: 'reduce' });
      page.setDefaultTimeout(10000);
      page.on('pageerror', error => failures.push(`${width}: ${error.message}`));
      await page.route('https://preview.invalid/**', route => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: cover }));
      if (onlyTextWhitespace) {
        try { await require('./check-text-whitespace-ui.cjs')({ page, origin, out, width, expect }); }
        catch (error) { await page.screenshot({ path: path.join(out, `text-whitespace-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (onlyWindowClose) {
        try {
          await require('./check-window-close-guard.cjs')({ page, origin, out, width, expect, onlyPromptCases: onlyAppPrompts });
          if (onlyAppPrompts) {
            await require('./check-app-prompts-ui.cjs')({ page, origin, out, width, expect });
            for (const host of ['daily', 'domain']) await require('./check-habit-delete-ui.cjs')({ page, origin, out, width, expect, host });
            await require('./check-statistics-focus-history.cjs')({ page, origin, out, width, expect });
          }
        }
        catch (error) { await page.screenshot({ path: path.join(out, `window-close-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (process.argv.includes('--memo-category-position')) {
        try { await require('./check-memo-category-position.cjs')({ page, origin, out, width, expect }); }
        catch (error) { await page.screenshot({ path: path.join(out, `memo-category-position-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (onlyHomeShortcutLibrary) {
        try { await require('./check-home-shortcut-library-ui.cjs')({ page, origin, out, width, expect }); }
        catch (error) { await page.screenshot({ path: path.join(out, `shortcut-library-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (onlyTodoDisplay) {
        await require('./check-todo-display.cjs')({ page, origin, out, width, expect });
        await page.close(); continue;
      }
      if (onlyDomainHabitCreation) {
        try { await require('./check-domain-habit-create-card-ui.cjs')({ page, origin, out, width, expect, checkCreateButton }); }
        catch (error) { await page.screenshot({ path: path.join(out, `domain-habit-create-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (onlyDomainRecentRecords) {
        try { await require('./check-domain-recent-records-ui.cjs')({ page, origin, out, width, expect }); }
        catch (error) { await page.screenshot({ path: path.join(out, `domain-recent-records-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (onlyToolbarSummaries) {
        try { await require('./check-toolbar-summaries-ui.cjs')({ page, origin, out, width, expect }); }
        catch (error) { await page.screenshot({ path: path.join(out, `toolbar-summaries-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (onlyDomainPreview) {
        try { await require('./check-domain-preview-ui.cjs')({ page, origin, out, width, expect, checkCreateButton, entertainmentOnly: onlyEntertainmentPreview }); }
        catch (error) { await page.screenshot({ path: path.join(out, `domain-preview-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (onlyProgressCreation) {
        try { await require('./check-progress-creation.cjs')({ page, origin, out, width, expect, checkButtonAppearance }); }
        catch (error) { await page.screenshot({ path: path.join(out, `progress-creation-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (onlyHomeEntryMode) {
        try { await require('./check-home-entry-mode.cjs')({ page, origin, out, width, expect, preview: homeEntryModePreview }); }
        catch (error) { await page.screenshot({ path: path.join(out, `home-entry-mode-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (onlyHomeCreationScroll) {
        await require('./check-home-creation-scroll.cjs')({ page, origin, width, expect });
        await page.close(); continue;
      }
      if (onlyEntryCreation) {
        await require('./check-entry-clear-focus.cjs')({ page, origin, out, width, expect });
        try { await require('./check-entry-creation.cjs')({ page, origin, out, width, expect, checkButtonAppearance });
        await require('./check-progress-creation.cjs')({ page, origin, out, width, expect, checkButtonAppearance });
        await require('./check-next-step-entry.cjs')({ page, origin, out, width, expect });
        await require('./check-home-entry-mode.cjs')({ page, origin, out, width, expect }); }
        catch (error) { await page.screenshot({ path: path.join(out, `entry-creation-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (process.argv.includes('--entry-clear-focus')) {
        await require('./check-entry-clear-focus.cjs')({ page, origin, out, width, expect });
        await page.close(); continue;
      }
      if (process.argv.includes('--record-edit')) {
        try { await require('./check-domain-record-edit.cjs')({ page, origin, out, width, expect }); }
        catch (error) { await page.screenshot({ path: path.join(out, `record-edit-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (process.argv.includes('--next-step')) {
        try { await require('./check-next-step-entry.cjs')({ page, origin, out, width, expect }); }
        catch (error) { await page.screenshot({ path: path.join(out, `next-step-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (process.argv.includes('--toolbar-defaults')) {
        await require('./check-toolbar-defaults-ui.cjs')({ page, origin, out, width, expect });
        await page.close(); continue;
      }
      if (process.argv.includes('--toolbars')) {
        await require('./check-page-toolbars.cjs')({ page, origin, out, width, expect });
        await require('./check-button-context.cjs')({ page, origin, out, width, expect });
        await page.close(); continue;
      }
      if (onlyTagRowSpacing) {
        await require('./check-tag-row-spacing.cjs')({ page, origin, out, width, expect, checkButtonAppearance });
        await page.close(); continue;
      }
      if (onlySheetFooters) {
        await require('./check-sheet-footers.cjs')({ page, origin, out, width, expect, progressOnly: process.argv.includes('--progress-footers') });
        if (width === 430) {
          const shortOut = path.join(out, 'short-430x720'); fs.mkdirSync(shortOut, { recursive: true });
          const shortPage = await browser.newPage({ viewport: { width: 430, height: 720 }, reducedMotion: 'reduce' });
          shortPage.setDefaultTimeout(10000);
          shortPage.on('pageerror', error => failures.push(`430x720: ${error.message}`));
          await shortPage.route('https://preview.invalid/**', route => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: cover }));
          await require('./check-sheet-footers.cjs')({ page: shortPage, origin, out: shortOut, width: 430, expect, progressOnly: process.argv.includes('--progress-footers') });
          await shortPage.close();
        }
        await page.close(); continue;
      }
      if (process.argv.includes('--choose')) {
        await require('./check-choose-layout.cjs')({ page, origin, out, width, expect });
        await page.close(); continue;
      }
      if (onlyHabitDetailEdit) {
        for (const host of ['daily', 'domain']) await require('./check-habit-detail-edit-ui.cjs')({ page, origin, out, width, expect, host });
        for (const host of ['daily', 'domain']) await require('./check-habit-calendar-edit-ui.cjs')({ page, origin, out, width, expect, host });
        await page.close(); continue;
      }
      if (process.argv.includes('--habit-calendar-edit')) {
        for (const host of ['daily', 'domain']) await require('./check-habit-calendar-edit-ui.cjs')({ page, origin, out, width, expect, host });
        await page.close(); continue;
      }
      if (process.argv.includes('--todo-sorting')) {
        await require('./check-todo-sorting.cjs')({ page, origin, out, width, expect });
        await page.close(); continue;
      }
      if (process.argv.includes('--domain-management')) {
        await require('./check-domain-management.cjs')({ page, origin, out, width, expect });
        await page.close(); continue;
      }
      if (process.argv.includes('--habit-sorting')) {
        await require('./check-habit-sorting-ui.cjs')({ page, origin, out, width, expect });
        await page.close(); continue;
      }
      if (process.argv.includes('--habit-category-swipe')) {
        await require('./check-habit-category-swipe-ui.cjs')({ page, origin, out, width, expect });
        await page.close(); continue;
      }
      if (process.argv.includes('--habit-recovery')) {
        await require('./check-habit-archive-ui.cjs')({ page, origin, out, width, expect });
        await require('./check-habit-archive-ui.cjs')({ page, origin, out, width, expect, host: 'domain' });
        await page.close(); continue;
      }
      if (onlyReminderSettings) {
        try { await require('./check-reminder-settings-ui.cjs')({ page, origin, out, width, expect }); }
        catch (error) { await page.screenshot({ path: path.join(out, `reminder-result-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (onlyScheduleTime) {
        try { await require('./check-schedule-time-ui.cjs')({ page, origin, out, width, expect }); }
        catch (error) { await page.screenshot({ path: path.join(out, `schedule-time-failed-${width}.png`) }); throw error; }
        await page.evaluate(() => localStorage.removeItem('ottlog-mini-tool-v1:guest:todos'));
        await require('./check-todo-schedule-editor.cjs')({ page, origin, out, width, expect });
        await page.close(); continue;
      }
      if (onlyCalendarLabels) {
        await require('./check-calendar-label-ui.cjs')({ page, origin, out, width, expect });
        await page.close(); continue;
      }
      if (onlyHabitCommentLogs) {
        for (const host of ['daily', 'domain', 'statistics']) await require('./check-habit-comment-log-ui.cjs')({ page, origin, out, width, expect, host });
        await page.close(); continue;
      }
      if (onlyHabitTimePeriods) {
        try { await require('./check-habit-time-period-ui.cjs')({ page, origin, out, width, expect }); }
        catch (error) { await page.screenshot({ path: path.join(out, `habit-time-period-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (process.argv.includes('--daily')) {
        await require('./check-habit-comment-log-ui.cjs')({ page, origin, out, width, expect, host: 'daily' });
        await require('./check-habit-time-period-ui.cjs')({ page, origin, out, width, expect });
        await require('./check-habit-category-swipe-ui.cjs')({ page, origin, out, width, expect });
        await require('./check-habit-archive-ui.cjs')({ page, origin, out, width, expect });
        await require('./check-habit-sorting-ui.cjs')({ page, origin, out, width, expect });
        await require('./check-daily-workflow.cjs')({ page, origin, out, width, expect });
        await require('./check-habit-delete-ui.cjs')({ page, origin, out, width, expect, host: 'daily' });
        await require('./check-habit-calendar-edit-ui.cjs')({ page, origin, out, width, expect, host: 'daily' });
        await page.close(); continue;
      }
      if (process.argv.includes('--icons')) {
        await require('./check-icon-library.cjs')({ page, origin, out, width, expect });
        await page.close(); continue;
      }
      if (process.argv.includes('--mottos')) {
        await require('./check-motto-workflow.cjs')({ page, origin, out, width, expect, checkCreateButton });
        await page.close(); continue;
      }
      if (onlyHomeNavigation) {
        try { await require('./check-today-summary.cjs')({ page, origin, out, width, expect }); }
        catch (error) { await page.screenshot({ path: path.join(out, `home-navigation-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (onlyHomeDirectory) {
        try { await require('./check-home-directory.cjs')({ page, origin, out, width, expect }); }
        catch (error) { await page.screenshot({ path: path.join(out, `home-directory-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (process.argv.includes('--growth')) {
        try { await require('./check-growth-workflow.cjs')({ page, origin, out, width, expect }); }
        catch (error) { await page.screenshot({ path: path.join(out, `growth-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (process.argv.includes('--domains')) {
        try {
          await require('./check-habit-comment-log-ui.cjs')({ page, origin, out, width, expect, host: 'domain' });
          await require('./check-habit-archive-ui.cjs')({ page, origin, out, width, expect, host: 'domain' });
          await require('./check-domain-management.cjs')({ page, origin, out, width, expect });
          await require('./check-domain-workflow.cjs')({ page, origin, out, width, expect, checkCreateButton });
          await require('./check-domain-record-edit.cjs')({ page, origin, out, width, expect });
          await require('./check-habit-delete-ui.cjs')({ page, origin, out, width, expect, host: 'domain' });
          await require('./check-habit-calendar-edit-ui.cjs')({ page, origin, out, width, expect, host: 'domain' });
        }
        catch (error) { await page.screenshot({ path: path.join(out, `domains-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (onlyStatisticsInsights) {
        try { await require('./check-statistics-insights-ui.cjs')({ page, origin, out, width, expect }); }
        catch (error) { await page.screenshot({ path: path.join(out, `statistics-insights-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (process.argv.includes('--statistics')) {
        try {
          await require('./check-habit-comment-log-ui.cjs')({ page, origin, out, width, expect, host: 'statistics' });
          await require('./check-statistics-workflow.cjs')({ page, origin, out, width, expect });
        }
        catch (error) { await page.screenshot({ path: path.join(out, `statistics-failed-${width}.png`) }); throw error; }
        await page.close(); continue;
      }
      if (process.argv.includes('--improvements')) {
        await require('./check-product-improvements.cjs')({ page, origin, out, width, expect });
        await page.close(); continue;
      }
      if (onlyScreens) {
        await require('./check-screen-layout.cjs')({ page, origin, out, width, expect, routes: routes.filter(route => !['mottos', 'domain-detail'].includes(route)), failures });
        await page.close(); continue;
      }
      if (process.argv.includes('--snap')) {
        await require('./check-page-snap.cjs')({ page, origin, width, expect, routes: routes.filter(route => !['mottos', 'domains', 'domain-detail'].includes(route)) });
        await page.close(); continue;
      }
      if (onlyPomodoro) {
        await require('./check-pomodoro-workflow.cjs')({ page, origin, out, width, expect, checkButtonAppearance });
        await page.close(); continue;
      }
      if (process.argv.includes('--memos')) {
        await require('./check-memo-reading.cjs')({ page, origin, out, width, expect });
        await require('./check-memo-list.cjs')({ page, origin, out, width, expect });
        await require('./check-memo-workflow.cjs')({ page, origin, out, width, expect });
        await page.close(); continue;
      }
      if (onlyMeals) {
        await require('./check-meal-editor.cjs')({ page, origin, out, width, expect, checkCreateButton });
        await page.close(); continue;
      }
      if (process.argv.includes('--todo-note-editor')) {
        await require('./check-todo-note-editor.cjs')({ page, origin, out, width, expect });
        await page.close(); continue;
      }
      if (onlyTodos) {
        await require('./check-todo-sorting.cjs')({ page, origin, out, width, expect });
        await require('./check-todo-note-editor.cjs')({ page, origin, out, width, expect });
        await require('./check-todo-schedule-editor.cjs')({ page, origin, out, width, expect });
        await require('./check-todo-editor.cjs')({ page, origin, out, width, expect });
        await checkButtonSpacing(page, `${width} compact task editor`, failures);
        await checkCardLayout(page, `${width} compact task editor`, failures);
        await require('./check-todo-workflow.cjs')({ page, origin, out, width, expect });
        await require('./check-todo-notification-workflow.cjs')({ page, origin, out, width, expect });
        await require('./check-todo-display.cjs')({ page, origin, out, width, expect });
        await require('./check-product-improvements.cjs')({ page, origin, out, width, expect, tasksOnly: true });
        await require('./check-next-step-entry.cjs')({ page, origin, out, width, expect });
        await page.close(); continue;
      }
      await require('./check-home-shortcut-workflow.cjs')({ page, origin, out, width, expect, checkButtonSpacing, checkCardLayout, checkCreateButton, checkButtonAppearance, failures });
      if (onlyHomeShortcuts) { await page.close(); continue; }
      for (const route of routes) {
        await page.goto(`${origin}/#/pages/${route}/index${route === 'detail' ? '?slug=preview-0' : ''}`);
        await page.waitForTimeout(450);
        const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth - innerWidth, ...Array.from(document.querySelectorAll('.page-scroll,.page,.tool-page,.today-page')).map(element => element.scrollWidth - element.clientWidth)));
        if (overflow > 2) failures.push(`${width} ${route}: horizontal overflow ${overflow}px`);
        await checkButtonSpacing(page, `${width} ${route}`, failures);
        await checkCardLayout(page, `${width} ${route}`, failures);
        await page.screenshot({ path: path.join(out, `${route}-${width}.png`), fullPage: true });
      }
      if (routes.includes('posts')) {
        await page.goto(`${origin}/#/pages/posts/index`);
        await expect(page.locator('.article-card')).toHaveCount(10);
        await page.getByRole('button', { name: '加载更多', exact: true }).click();
        await expect(page.locator('.article-card')).toHaveCount(13);
        await page.locator('.posts-filter-toggle').click();
        await expect(page.locator('.posts-sort-direction')).toHaveText('↓');
        await page.locator('.posts-sort-direction').click();
        await expect(page.locator('.posts-sort-direction')).toHaveText('↑');
        await page.locator('.posts-search-input').fill('日常');
        await page.locator('.posts-search-submit').click();
        await expect(page.locator('.article-card')).toHaveCount(4);
        await page.getByRole('button', { name: '清空筛选', exact: true }).click();
        await expect(page.locator('.article-card')).toHaveCount(10);
        await page.locator('.article-category').first().click();
        const categories = await page.locator('.article-category').allTextContents();
        if (new Set(categories).size !== 1) failures.push(`${width}: category filter mixed articles`);
        await page.locator('.article-read').first().click();
        await expect(page).toHaveURL(/pages\/detail\/index\?slug=preview-/);
      }
      if (routes.includes('categories')) {
        await page.goto(`${origin}/#/pages/categories/index`);
        await expect(page.locator('.categories-tile')).toHaveCount(3);
        const category = await page.locator('.categories-tile-name').first().textContent();
        await page.locator('.categories-tile').first().click();
        await expect(page).toHaveURL(/pages\/posts\/index/);
        await expect(page.locator('.article-category').first()).toHaveText(category);
        await expect(page.locator('.posts-active-filters')).toContainText(category);
      }
      await page.goto(`${origin}/#/pages/index/index`);
      await expect(page.locator('.today-entry')).toHaveCount(6);
      await require('./home-shortcut-test-helpers.cjs').seedCustomLegacyLayout(page);
      await page.locator('#home-sort-create').click();
      await expect(page).toHaveURL(/pages\/index\/index$/);
      await expect(page.locator('.entry-composer')).toBeVisible();
      await expect(page.locator('.todo-sheet')).toBeVisible();
      await expect(page.locator('.todo-priority-toggle')).toHaveAttribute('aria-label', '高优先级');
      await expect(page.locator('.todo-description')).toBeVisible();
      await expect(page.locator('.todo-schedule-trigger')).toHaveText('日期');
      await page.getByRole('button', { name: '选择现有标签', exact: true }).click();
      await expect(page.getByPlaceholder('输入标签，用符号分隔')).toHaveValue('');
      await page.keyboard.press('Escape');
      await page.getByPlaceholder('准备做什么？').fill('手机上记录的小事');
      await checkButtonSpacing(page, width + ' todos editor', failures);
      await checkCardLayout(page, width + ' todos editor', failures);
      await page.screenshot({ path: path.join(out, `todos-editor-${width}.png`), fullPage: true });
      await page.locator('.entry-composer').getByRole('button', { name: '创建任务', exact: true }).click();
      await page.evaluate(() => { location.hash = '#/pages/todos/index'; });
      await expect(page.locator('.todo-task-title')).toHaveText('手机上记录的小事');
      await page.screenshot({ path: path.join(out, `todos-saved-${width}.png`), fullPage: true });
      await expect(page.locator('.todo-quadrant-do .todo-task-title')).toHaveText('手机上记录的小事');
      await page.getByRole('button', { name: '完成：手机上记录的小事', exact: true }).click();
      await page.getByRole('button', { name: '已完成', exact: true }).click();
      await expect(page.locator('.todo-task-title')).toHaveText('手机上记录的小事');
      if (routes.includes('memos')) {
        await page.evaluate(() => { location.hash = '#/pages/memos/index'; });
        await page.getByRole('button', { name: '创建便签', exact: true }).click();
        await page.getByPlaceholder('准备记下什么？').fill('留给明天的灵感');
        await page.locator('.memo-body-input').fill('**认真生活**，也记得休息。');
        await page.getByRole('button', { name: '预览', exact: true }).click();
        await expect(page.locator('.memo-body-preview strong')).toHaveText('认真生活');
        await checkButtonSpacing(page, width + ' memos editor', failures);
        await page.screenshot({ path: path.join(out, `memos-editor-${width}.png`), fullPage: true });
        await page.locator('.entry-composer').getByRole('button', { name: '创建便签', exact: true }).click();
        await expect(page.locator('.memo-note-title')).toHaveText('留给明天的灵感');
        await page.getByRole('button', { name: '置顶便签：留给明天的灵感', exact: true }).click();
        await expect(page.locator('.memo-note-meta')).toContainText('置顶');
        await page.screenshot({ path: path.join(out, `memos-saved-${width}.png`), fullPage: true });
        await page.evaluate(() => { location.hash = '#/pages/index/index'; });
        await page.getByRole('button', { name: '创建便签', exact: true }).click();
        await page.getByRole('button', { name: '关闭编辑', exact: true }).click();
        await expect(page).toHaveURL(/pages\/index\/index$/);
        await page.evaluate(() => { location.hash = '#/pages/memos/index'; });
        await expect(page.locator('.memo-note-title')).toHaveText('留给明天的灵感');
      }
      if (routes.includes('pomodoro')) {
        await page.evaluate(() => { location.hash = '#/pages/pomodoro/index'; });
        await page.getByPlaceholder('正在做什么？').fill('读十页书');
        await page.locator('.focus-start').click();
        await expect(page.locator('.focus-live')).toContainText('正在计时');
        await page.locator('.focus-start').click();
        await expect(page.locator('.focus-live')).toContainText('已暂停');
        const paused = await page.locator('.focus-time').textContent();
        await page.evaluate(() => { location.hash = '#/pages/index/index'; });
        await expect(page.locator('.today-grid')).toBeVisible();
        await page.evaluate(() => { location.hash = '#/pages/pomodoro/index'; });
        await expect(page.locator('.focus-live')).toContainText('已暂停');
        await expect(page.locator('.focus-time')).toHaveText(paused);
        await page.locator('.focus-start').click();
        await expect(page.locator('.focus-live')).toContainText('正在计时');
        await page.screenshot({ path: path.join(out, `pomodoro-running-${width}.png`), fullPage: true });
        await page.locator('.focus-start').click();
        await expect(page.locator('.focus-live')).toContainText('已暂停');
        await page.getByRole('button', { name: '结束', exact: true }).click();
        await expect(page.locator('.focus-live')).toContainText('准备就绪');
      }
      if (routes.includes('daily')) {
        await page.evaluate(() => { location.hash = '#/pages/statistics/index?panel=habits'; });
        await expect(page.locator('.statistics-today-completed')).toHaveText('0');
        await page.evaluate(() => { location.hash = '#/pages/daily/index'; });
        await page.locator('.daily-suggestion-open').first().click();
        await page.locator('.daily-check-primary').click();
        await page.getByRole('button', { name: '关闭习惯详情', exact: true }).click();
        await page.evaluate(() => { location.hash = '#/pages/statistics/index?panel=habits'; });
        await expect(page.locator('.statistics-today-completed')).toHaveText('1');
        await page.evaluate(() => { location.hash = '#/pages/daily/index'; });
        await page.getByRole('button', { name: '打卡日历', exact: true }).click();
        await expect(page.locator('.daily-day.is-selected')).toHaveCount(1);
        await page.screenshot({ path: path.join(out, `daily-calendar-${width}.png`), fullPage: true });
      }
      if (routes.includes('choose')) {
        await page.evaluate(() => { location.hash = '#/pages/choose/index'; });
        for (let step = 0; step < 9; step++) {
          await expect(page.locator('.choice-aligned-option').first()).toBeEnabled();
          const point = await page.locator('.choice-aligned-option').first().evaluate(element => { const box = element.getBoundingClientRect(); return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; });
          await page.mouse.click(point.x, point.y);
          await page.waitForTimeout(200);
        }
        await expect(page.locator('.choice-result-title')).toBeVisible();
        await expect(page.locator('.choice-trail-button')).toHaveCount(9);
        await page.screenshot({ path: path.join(out, `choose-result-${width}.png`), fullPage: true });
        await page.locator('.choice-trail-button').first().click();
        await expect(page.getByRole('button', { name: '下一步', exact: true })).toBeEnabled();
      }
      await page.goto(`${origin}/#/pages/journal/index`);
      await expect(page.locator('.home-greeting')).toContainText('Tau');
      await expect(page.locator('.home-mark img')).toBeVisible();
      if (!(await page.locator('.home-mark img').evaluate(img => img.complete && img.naturalWidth > 0))) failures.push(`${width}: local homepage logo did not load`);
      await page.getByRole('button', { name: '暂停', exact: true }).click();
      const motto = await page.locator('.home-motto-text').textContent();
      await page.getByRole('button', { name: '换一句', exact: true }).click();
      await expect(page.locator('.home-motto-text')).not.toHaveText(motto);
      await page.locator('.home-like-wrap button').click();
      await expect(page.locator('.home-like-wrap button')).toContainText('1');
      await page.locator('.home-like-wrap button').click();
      await expect(page.locator('.home-like-wrap button')).toContainText('2');
      await page.goto(`${origin}/#/pages/detail/index?slug=preview-0`);
      await expect(page.locator('.detail-title')).toHaveText(fixture.posts[0].title);
      await expect(page.locator('.detail-prose h1')).toHaveCount(1);
      await expect(page.locator('.detail-prose pre')).toHaveCount(1);
      await expect(page.locator('.detail-prose table')).toHaveCount(1);
      await expect(page.locator('.detail-prose img')).toHaveCount(1);
      await page.locator('.detail-tag').first().click();
      await expect(page).toHaveURL(/pages\/posts\/index/);
      await expect(page.locator('.posts-active-filters')).toContainText('Markdown');
      await page.goto(`${origin}/#/pages/detail/index?slug=preview-0`);
      await page.getByRole('button', { name: '☆ 收藏文章', exact: true }).click();
      await expect(page).toHaveURL(/pages\/favorites\/index/);
      await page.getByPlaceholder('输入博客账号').fill('preview-reader');
      await page.getByPlaceholder('输入密码', { exact: true }).fill('fixture-only-password');
      await page.getByRole('button', { name: '登录并同步', exact: true }).click();
      await expect(page.locator('.account-user-name')).toHaveText('preview-reader');
      await page.evaluate(() => { location.hash = '#/pages/todos/index'; });
      await expect(page.locator('.todo-task')).toHaveCount(0);
      await page.locator('.todo-quadrant-later .todo-quadrant-add').click();
      await page.getByPlaceholder('准备做什么？').fill('同步到账号的待办');
      await page.locator('.entry-composer').getByRole('button', { name: '创建任务', exact: true }).click();
      await expect(page.locator('.tool-status')).toContainText('已保存到账号');
      await page.evaluate(() => { location.hash = '#/pages/posts/index'; });
      await page.evaluate(() => { location.hash = '#/pages/todos/index'; });
      await expect(page.locator('.todo-task-title')).toHaveText('同步到账号的待办');
      if (routes.includes('meals')) {
        await page.evaluate(() => { location.hash = '#/pages/meals/index'; });
        await page.getByRole('button', { name: '记录餐单', exact: true }).click();
        await page.getByPlaceholder('例如：午餐的鸡肉饭').fill('午餐鸡肉饭');
        const nutrientInputs = page.locator('.meal-nutrient-fields input');
        for (const [index, amount] of ['60', '30', '15'].entries()) await nutrientInputs.nth(index).fill(amount);
        await checkButtonSpacing(page, width + ' meals editor', failures);
        await page.locator('.meal-sheet').getByRole('button', { name: '保存餐单记录', exact: true }).click();
        await expect(page.locator('.meal-entry')).toHaveCount(1);
        await expect(page.locator('.meal-status')).toContainText('这一餐');
        await expect.poll(() => page.evaluate(() => window.__miniRequests.some(request => request.path === '/personal-tools/meals' && request.method === 'PUT'))).toBe(true);
        await page.screenshot({ path: path.join(out, `meals-saved-${width}.png`), fullPage: true });
      }
      await page.evaluate(() => { location.hash = '#/pages/detail/index?slug=preview-0'; });
      await page.getByRole('button', { name: '☆ 收藏文章', exact: true }).click();
      await expect(page.getByRole('button', { name: '★ 已收藏', exact: true })).toBeVisible();
      await page.getByPlaceholder('你的昵称').fill('测试读者');
      await page.getByPlaceholder('读完以后，想说点什么？').fill('用于测试的留言，仅保存在 mock 中。');
      await page.getByRole('button', { name: '提交留言', exact: true }).click();
      await expect(page.locator('.detail-feedback')).toContainText('审核通过');
      await page.evaluate(() => { location.hash = '#/pages/favorites/index'; });
      await expect(page.locator('.account-saved-card')).toHaveCount(1);
      await page.screenshot({ path: path.join(out, `favorites-saved-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: '移除收藏', exact: true }).click();
      await expect(page.locator('.account-saved-card')).toHaveCount(0);
      await page.getByRole('button', { name: '退出', exact: true }).click();
      await expect(page.locator('.account-auth')).toBeVisible();
      await page.evaluate(() => { location.hash = '#/pages/todos/index'; });
      await page.getByRole('button', { name: '已完成', exact: true }).click();
      await expect(page.locator('.todo-task-title')).toHaveText('手机上记录的小事');
      await require('./check-todo-workflow.cjs')({ page, origin, out, width, expect });
      await require('./check-todo-schedule-editor.cjs')({ page, origin, out, width, expect });
      await require('./check-todo-editor.cjs')({ page, origin, out, width, expect });
      await checkButtonSpacing(page, `${width} task workflow`, failures);
      await checkCardLayout(page, `${width} task workflow`, failures);
      await require('./check-todo-notification-workflow.cjs')({ page, origin, out, width, expect });
      await checkButtonSpacing(page, `${width} reminder workflow`, failures);
      await require('./check-todo-display.cjs')({ page, origin, out, width, expect });
      await require('./check-pomodoro-workflow.cjs')({ page, origin, out, width, expect, checkButtonAppearance });
      await page.close();
    }
    if (failures.length) throw new Error(failures.join('\n'));
    if (onlyHabitDetailEdit) { console.log(`PASS both habit detail hosts at 360/375/430/768px (includes 375x667): inline domain/icon/priority choices, cancellation, durable retries, preserved text/history, account isolation, shared layout and original calendar operations. Browser adapter only. Screenshots: ${out}`); return; }
    if (onlyTextWhitespace) { console.log(`PASS trailing text whitespace at 360/375/430/768px including 375x667: home progress shortcut, stable retries and IDs, legacy read-only rendering, record heights, preserved inner blank lines, title/notes/memo save paths and account boundaries. Browser adapter only. Screenshots: ${out}`); return; }
    if (onlyHomeDirectory) { console.log(`PASS browser-adapted home directory: shared sorting and same-target retries, group bounds, direct habit/domain creation, cancellation and preserved archives at 360/375/430/768px including 375x667. Not a native WeChat runtime test. Screenshots: ${out}`); return; }
    if (onlyAppPrompts) { console.log(`PASS shared app prompts at 360/375/430/768px: consistent title/body/actions, short-screen native scrolling, fixed chrome, explicit danger intent, queued confirmations, nonblocking feedback, dismissal and busy guards, unsaved task/memo save/retry and account scope, both habit-delete hosts and focus-history durable deletion/retry. Browser adapter only. Screenshots: ${out}`); return; }
    if (process.argv.includes('--memo-category-position')) { console.log(`PASS memo category selection at 360/375/430/768px: shared one-and-a-half preceding context, fixed all/start, manual-swipe re-selection, long/end labels, multiple-filter highlights and positioning, read-only browsing and account changes. Browser adapter only. Screenshots: ${out}`); return; }
    if (onlyWindowClose) { console.log(`PASS app-owned close/save decisions at 360/375/430/768px: unchanged dismissal, close/backdrop/Escape, layered prompts, keep editing, retained input, durable saves and same-ID retries, delete guards, complete/replacement and single-card shortcut draft/save decisions, account changes and late-save protection, app-owned feedback and no platform modal/toast calls. Browser adapter only. Screenshots: ${out}`); return; }
    if (onlyDomainRecentRecords) {
      console.log(`PASS domain recent records at 360/375/430/768px (includes 375x667 and 34px safe area): independently scrolling signed recent columns and domain cards, fixed page/toolbar/recent window, fixed detail card with independent full histories, wheel boundaries, stable goals and independently scrolling vertical habits, round-trip navigation, enlarged content-only recent panel, exactly eight full real cards filling the first screen, additional-domain/creation access inside the card window, cross-boundary sorting, stable mode geometry, short-goal spacing, combined latest ten, stable ties, original arrays, literal plain text/line breaks/image preview, same-ID editing/deletion/refill/reload, 40px controls, empty/loading/invalid states and account isolation. Browser adapter only. Screenshots: ${out}`);
      return;
    }
    if (process.argv.includes('--toolbar-defaults')) { console.log(`PASS seven toolbar default actions at four sizes: shared reset geometry, filters/sort restoration, durable retries and preserved manual card preferences. Browser adapter only. ${out}`); return; }
    if (onlyHomeShortcutLibrary) {
      console.log(`PASS browser-adapted React preview: shared 64 colored choices, search/category selection, outline atlas identity, name/color/icon drafts, fixed 48px full-width save footer with one 8px bottom gap, 34px safe-area ownership, X/backdrop/Escape save/discard/continue prompts, layered icon dismissal, same-target explicit-save retry, unchanged replacement confirmation and movement preserving namespaced icons; centered add card, fixed capture during shortcut scrolling, six-slot boundary, empty-layout add/discard/save, selector save retry and mode guards at 360/375/430/768px (includes 375x667), no render errors or horizontal overflow. Not a native WeChat runtime test. Screenshots: ${out}`);
      return;
    }
    if (onlyTodoDisplay) {
      console.log(`PASS todo display at 360/375/430/768px (includes 375x667): complete quadrants, centered shared creation controls, long titles, internal scrolling, completion, filtering and return navigation. Browser adapter only. Screenshots: ${out}`);
      return;
    }
    if (onlyToolbarSummaries) {
      console.log(`PASS toolbar summaries at 360/375/430/768px (includes 375x667): global daily counts, latest historical task/short-goal feedback, long-title truncation, stable shared controls, filters, real undo/delete/create/edit, cross-page refresh, 30-second saves, local-day rollover and account reading/invalid guards. Browser adapter only. Screenshots: ${out}`);
      return;
    }
    if (process.argv.includes('--todo-note-editor')) { console.log(`PASS task Markdown creation and existing-task default preview at four sizes: rendered full text/images, explicit writing, reopen reset, preserved ID/data, save retries and account guards. Browser adapter only. ${out}`); return; }
    if (onlyScheduleTime) {
      console.log(`PASS compact time window at 360/375/430/768px (includes 375x667): centered native fields, right completion, complete strict time validation, retained invalid input, stable actions, staged completion/cancellation, unset time and existing schedule/reminder preservation. Browser adapter only. Screenshots: ${out}`);
      return;
    }
    if (onlyCalendarLabels) {
      console.log(`PASS calendar labels at 360/375/430/768px (includes 375x667): round task selections and habit discs, complete subtitles and default layouts, full holiday details with layered dismissal, reminder day choices preserving the main calendar, shared daily/domain/read-only statistics calendars, preserved check-in persistence, retry and account isolation. Browser adapter only. Screenshots: ${out}`);
      return;
    }
    if (onlyDomainPreview) {
      console.log(onlyEntertainmentPreview
        ? `PASS isolated entertainment domain preview at 360/375/430/768px (includes 375x667): original eight first-screen cards, empty game-icon card in second-screen continuation, detail/read without writes, one-time reseed, ordinary guest/account isolation and zero account-tool API calls. Browser adapter only. Screenshots: ${out}`
        : `PASS isolated domain preview at 360/375/430/768px (includes 375x667): source sample factory, eight domain cards, goals, signed newest-first history, scrolling, shared composer creation/deletion, draft/edit persistence, ordinary guest/account isolation and zero account-tool API calls. Browser adapter only. Screenshots: ${out}`);
      return;
    }
    if (onlyReminderSettings) {
      console.log(`PASS reminder settings: five quick offsets and explicit custom time, six inline dates, complete actual reminder preview, direct task-time setup, month-end/midnight/DST preservation, nested clock validation, stable touch/layout, draft-only clear/cancel and same-ID persistence at 360/375/430/768px including 375x667 and simulated 34px safe area. Browser adapter only. ${out}`); return;
    }
    if (process.argv.includes('--todo-sorting')) {
      console.log(`PASS browser-adapted React preview: task sorting icons, anchored options, schedule/creation order, stable ties, retained filters and records, persistence, write retry and account isolation at 360/375/430/768px (includes 375x667). Not a WeChat runtime test. Screenshots: ${out}`);
      return;
    }
    if (process.argv.includes('--domain-management')) {
      console.log(`PASS browser-adapted React preview: removed domain settings entry, two in-card sort controls, stable full-screen recent/eight-card geometry, creation access inside the independent card window, fixed outer page, detail-header edit/delete, shared creation/editing, preserved habit bindings, same-target move/save/delete retries, durable deletion navigation, uncategorized protection, account separation and empty/capacity states at 360/375/430/768px (includes 375x667). Not a WeChat runtime test. Screenshots: ${out}`);
      return;
    }
    if (process.argv.includes('--entry-clear-focus')) { console.log(`PASS conditional creation focus and full draft clear at four sizes: prefilled home capture and type buttons/current type/swipes do not reopen focus, manual field input stays available, empty creation and explicit clear retain autofocus; all shared entries/modes/images/settings, source and owner isolation, reopen and same-task image/save guards. Browser adapter only. ${out}`); return; }
    if (process.argv.includes('--record-edit')) { console.log(`PASS signed record editing at four sizes: compact touch rows, plain text editing and image preview, original ID/date, isolated restored drafts, shared text/image controls without Markdown modes, same-target save/delete retries and account guards. Browser adapter only. ${out}`); return; }
    if (onlyStatisticsInsights) { console.log(`PASS six automatic statistics panels at 360/375/430/768px: independent expected metrics, charts/legend/scale/point selection, shared 7/30-day scope, missing versus real zero, local chart scrolling, empty states, 40px controls and unchanged archives. Browser adapter only. ${out}`); return; }
    if (process.argv.includes('--mottos')) { console.log(`PASS mottos at four sizes: compact home text/count with a 40px pencil entry, no manual switching or playback controls, automatic default/custom rotation and touch/visibility guards, aligned interval popup, strict seconds/dismissal, stable error actions, guest persistence/retry, account reads/writes/isolation and unlimited collection editing. Browser adapter only. ${out}`); return; }
    if (process.argv.includes('--next-step')) { console.log(`PASS next-step continuous entry at four sizes: creation/editing, add/row/keyboard focus, one trailing prompt, same-task duplicate and image guards, 40px arrow controls, original IDs/order, blank filtering and reload. Browser adapter only. ${out}`); return; }
    if (process.argv.includes('--habit-category-swipe')) { console.log(`PASS habit category swipes at four sizes: both directions, boundaries, empty lists, visible selection, vertical scrolling, long-press, click suppression, overlays, filters, persistence, account isolation. Browser adapter only. ${out}`); return; }
    if (process.argv.includes('--habit-sorting')) { console.log(`PASS habit sorting at four sizes: anchored icons, modes, long-press, persistence, retries, account isolation. Browser adapter only. ${out}`); return; }
    if (onlyHomeCreationScroll) { console.log('PASS home creation scroll at 360/375/430/768px (includes 375x667): keyboard avoidance does not snap, repeated memo/progress saves and close restore the origin, directory origin and bidirectional swipes stay intact, task creation still opens the todo list. Browser adapter only; no WeChat runtime test.'); return; }
    if (onlyHomeEntryMode) { console.log(`PASS home successful creation type memory at 360/375/430/768px (includes 375x667): capture and keyboard entrances, explicit entrance types, persisted reloads, progress text, failures, same-ID retries, invalid values and ${homeEntryModePreview ? 'real preview namespace isolation' : 'account separation'}. Browser adapter only. Screenshots: ${out}`); return; }
    if (process.argv.includes('--toolbars')) {
      console.log(`PASS browser-adapted React preview: shared action order, complete text controls, standalone category rows, last-category access and preserved entry/filter interactions on ten pages; contextual button levels, independent sizes, dynamic containers, complete long labels, wrapper forwarding and image-overlay feedback at 360/375/430/768px (includes 375x667). Not a WeChat runtime test. Screenshots: ${out}`);
      return;
    }
    console.log(`PASS browser-adapted React preview: ${onlyDomainHabitCreation ? 'shared domain/habit add cards, full-card touch targets, empty/single-row and vertically scrolling habit grids, domain preselection, failed-save retry, preserved check-ins and reload persistence' : onlyHabitTimePeriods ? 'independent free/time-period lists, fixed equal-width headers, period selection, local scrolling and drag retries, shared editing and account separation' : onlyHabitCommentLogs ? 'comment-only monthly logs, immediate full text, ten-entry pagination, resets, three calendar hosts and preserved completion statistics' : onlyProgressCreation ? 'two progress editors, independent sign choices, one atomic save, shared top title text, legacy recovery, batch rejection, stable retry targets, images and account isolation' : onlyEntryCreation ? 'home inline capture, shared task/memo/progress creation, two Markdown record boxes, one atomic signed save, retained fields, shared labels and priorities, local draft recovery, save validation and account isolation' : onlyTagRowSpacing ? 'tag-row arrow spacing, empty and long labels, count states, dynamic options and shared multiselect' : onlySheetFooters ? 'sheet footer spacing, simulated 34px safe area, tabBar and detail hosts, divider-free single-row actions and reachable controls' : process.argv.includes('--statistics') ? 'six statistics panels, preserved calculations, source-page migration, entry/back navigation, read-only analyses, focus history operations and reminders, invalid data and account isolation' : process.argv.includes('--domains') ? 'domain management, detail navigation, goals, habits, quick records, persistence and account isolation' : process.argv.includes('--growth') ? 'preserved growth archives, period calculations, read-only statistics and account isolation' : onlyHomeNavigation ? 'two-screen home navigation, removed overview and preserved domain shortcuts' : process.argv.includes('--choose') ? 'symmetric choice layouts and touch targets' : process.argv.includes('--daily') ? 'habit grid, filters, drag order, neglected habits, check-ins and history' : process.argv.includes('--improvements') ? 'task dragging, filters, analytics and fixed habit icons' : process.argv.includes('--memos') ? 'memo creation, tags, image persistence, preview and removal' : onlyMeals ? 'meal creation and editing, common values, custom numbers, tags and persistence' : onlyPomodoro ? 'pomodoro controls, full-width stable actions, early finish, cancellation and reminders' : onlyTodos ? 'compact task editor, tags, recurrence, next steps and notifications' : onlyHomeShortcuts ? 'home shortcut customization, sorting, persistence and navigation' : routes.join(', ')} at 360/375/430/768px (includes 375x667), no render errors or horizontal overflow. Not a WeChat runtime test. Screenshots: ${out}`);
  } finally { if (browser) await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); esbuild.stop(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
