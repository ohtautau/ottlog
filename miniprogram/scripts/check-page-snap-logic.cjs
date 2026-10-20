const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/page-snap.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
const loaded = {};
new Function('exports', source)(loaded);
const { pageSnapTarget } = loaded;

// Existing two-screen callers and long-page behavior stay compatible.
for (const stops of [600, [0, 600]]) {
  assert.equal(pageSnapTarget(0, 90, stops, 'up'), 600);
  assert.equal(pageSnapTarget(0, 0, stops, 'up'), 600);
  assert.equal(pageSnapTarget(600, 600, stops, 'down'), 0);
  assert.equal(pageSnapTarget(800, 780, stops, 'down'), 0);
  assert.equal(pageSnapTarget(600, 800, stops, 'up'), null);
  assert.equal(pageSnapTarget(800, 900, stops, 'up'), null);
  assert.equal(pageSnapTarget(0, 90, stops), 0);
  assert.equal(pageSnapTarget(0, 450, stops), 600);
  assert.equal(pageSnapTarget(600, 600, stops), null);
  assert.equal(pageSnapTarget(800, 800, stops), null);
}

const stops = [0, 600, 1200, 1800];
for (let index = 0; index < stops.length - 1; index += 1) {
  const before = stops[index], after = stops[index + 1];
  assert.equal(pageSnapTarget(before, before + 90, stops, 'up'), after);
  assert.equal(pageSnapTarget(before, before, stops, 'up'), after);
  assert.equal(pageSnapTarget(after, after - 90, stops, 'down'), before);
  assert.equal(pageSnapTarget(after, after, stops, 'down'), before);
  assert.equal(pageSnapTarget(before, before + 90, stops), before);
  assert.equal(pageSnapTarget(before, after - 90, stops), after);
  assert.equal(pageSnapTarget(before, before + 300, stops), after);
  assert.equal(pageSnapTarget(before, after - 1, stops), null);
}
// Even a large native movement advances only one screen from the gesture origin.
assert.equal(pageSnapTarget(0, 1800, stops, 'up'), 600);
assert.equal(pageSnapTarget(600, 1900, stops, 'up'), 1200);
assert.equal(pageSnapTarget(1800, 0, stops, 'down'), 1200);
assert.equal(pageSnapTarget(1200, 0, stops, 'down'), 600);
assert.equal(pageSnapTarget(0, 0, stops, 'down'), 0);
assert.equal(pageSnapTarget(1800, 1950, stops, 'up'), null);
assert.equal(pageSnapTarget(2000, 2400, stops, 'up'), null);
assert.equal(pageSnapTarget(2200, 2150, stops, 'down'), 1200);
assert.equal(pageSnapTarget(1800, 2200, stops), null);
assert.equal(pageSnapTarget(599.5, 600, stops, 'up'), 1200);
assert.equal(pageSnapTarget(600.5, 600, stops, 'down'), 0);
assert.equal(pageSnapTarget(590, 630, [0, 591, 1190, 1802], 'up'), 1190);

for (const invalid of [0, -2, NaN, [], [0], [0, 0], [0, -2], [0, NaN], [0, 600, 500]]) {
  assert.equal(pageSnapTarget(0, 90, invalid, 'up'), null);
}
assert.equal(pageSnapTarget(NaN, 90, stops, 'up'), null);
assert.equal(pageSnapTarget(0, Infinity, stops, 'up'), null);
assert.deepEqual(stops, [0, 600, 1200, 1800]);
console.log('Page snapping: two/four screens, adjacent navigation, long page, cancellation, rounding and invalid measurements passed');
