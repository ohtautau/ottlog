// Source cascade contract, not browser geometry or native compiler acceptance.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const {checkStyleDirectory} = require('./check-weapp-styles.cjs');
const root = path.resolve(__dirname, '../..');
const shared = fs.readFileSync(path.join(root, 'miniprogram/src/pages/pomodoro/core.css'), 'utf8');
const desktop = ['desktop.css', 'desktop-focus-statistics.css'].map(file => fs.readFileSync(path.join(root, 'web/shared-app', file), 'utf8'));
const matches = (query, width, height) => [...query.matchAll(/\((min|max)-(width|height):\s*(\d+)px\)/g)].every(([,bound,axis,n]) => bound === 'min' ? (axis === 'width' ? width : height) >= +n : (axis === 'width' ? width : height) <= +n);
for (const [width,height] of [[375,667],[390,844],[768,900],[840,900],[900,667],[1440,667],[1440,900],[2412,1080]]) {
 const declarations = {};
 for (const source of [shared,...desktop]) postcss.parse(source).walkRules(rule => {
  if (!/^\s*(?:\.tool-app-root )?(?:\.focus-page )?\.focus-feedback-slot\s*$/.test(rule.selector)) return;
  for (let parent = rule.parent; parent; parent = parent.parent) if (parent.type === 'atrule' && parent.name === 'media' && !matches(parent.params,width,height)) return;
  rule.walkDecls(decl => {declarations[decl.prop] = decl.value.toLowerCase();});
 });
 assert.equal(declarations.height,'40px',`${width}x${height}: invariant feedback height`);
 assert.equal(declarations['overflow-y'],'auto','long errors and retry remain accessible');
 for (const prop of ['min-height','max-height']) if (declarations[prop]) assert.equal(declarations[prop],'40px');
}
const page = fs.readFileSync(path.join(root,'miniprogram/src/pages/pomodoro/index.tsx'),'utf8');
assert.match(page, /className='focus-feedback-slot'/);
assert.match(page, /onClick=\{retry\}>重新同步/);
assert.match(page, /backgroundSettings/);
assert.match(shared, /max-width: 599px/);
assert.match(shared, /focus-action-area \.ui-button \{ min-height: 40PX/);
console.log(`PASS feedback cascade at 8 wide/short/narrow viewports; retry retained; ${checkStyleDirectory(path.join(root,'miniprogram/src'),'.css')} source CSS WXSS guards. Browser geometry pending.`);
