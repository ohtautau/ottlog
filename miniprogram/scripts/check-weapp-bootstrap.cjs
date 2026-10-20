// Exercise the emitted Webpack runtime and module factories, not a rebuilt web preview.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../dist');
const { checkProject } = require('./check-weapp-project.cjs');
const { checkStyleDirectory } = require('./check-weapp-styles.cjs');
const { checkHomeShortcutBuild } = require('./check-home-shortcut-build.cjs');
checkProject(path.resolve(__dirname, '..'));
checkProject(root);
const sourceStyleCount = checkStyleDirectory(path.resolve(__dirname, '../src'), '.css');
const emittedStyleCount = checkStyleDirectory(root, '.wxss');
console.log(`PASS WXSS syntax guards: ${sourceStyleCount} source styles and ${emittedStyleCount} emitted styles. Not a native WeChat compiler test.`);
checkHomeShortcutBuild(root);
console.log('PASS emitted home shortcut render and WXSS contract: shared card moves, edit/replacement, library icon backgrounds, six colors, and no old card/editor nodes.');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const subpackages = manifest.subPackages || manifest.subpackages || [];
const allPages = [...manifest.pages, ...subpackages.flatMap(pkg => pkg.pages.map(page => `${pkg.root}/${page}`))];
assert.equal(new Set(allPages).size, allPages.length, 'page routes must be unique across packages');
for (const tab of manifest.tabBar.list) {
  assert.ok(manifest.pages.includes(tab.pagePath), `${tab.pagePath} must remain in the main package`);
}

function environment(staleRegistry = false) {
  const pages = [], components = [], cache = new Map();
  let app;
  const info = { platform: 'ios', system: 'iOS 18', version: '8.0', SDKVersion: '3.17.2', screenWidth: 375, screenHeight: 812, windowWidth: 375, windowHeight: 724, pixelRatio: 3 };
  const wx = { env: {}, getSystemInfoSync: () => info, getWindowInfo: () => info, getDeviceInfo: () => info,
    getAppBaseInfo: () => info, getLaunchOptionsSync: () => ({ path: manifest.pages[0], query: {} }),
    getEnterOptionsSync: () => ({ path: manifest.pages[0], query: {} }), canIUse: () => false,
    onAppRoute() {}, onAppRouteDone() {}, onAppShow() {}, onAppHide() {}, onError() {}, onUnhandledRejection() {},
    getStorageSync() { return ''; }, setStorageSync() {}, removeStorageSync() {},
    request(options) { options.fail?.({ errMsg: 'offline bootstrap test' }); },
  };
  // A previous compilation can leave chunk IDs on the shared wx object.
  // The old JSONP runtime marks these IDs loaded and skips fresh factories.
  if (staleRegistry) wx.webpackJsonp = [[[907], {}], [[96], {}], [[76], {}]];
  const context = vm.createContext({ wx, console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    App(config) { app = config; }, Page(config) { pages.push(config); }, Component(config) { components.push(config); }, Behavior: config => config,
    getApp: () => app, getCurrentPages: () => [], __wxConfig: { envVersion: 'develop' },
  });
  function load(relative, from) {
    const file = path.resolve(root, relative.endsWith('.js') ? relative : relative + '.js');
    assert.ok(file.startsWith(root + path.sep), 'module path remains inside dist');
    if (from) {
      const owner = name => subpackages.find(pkg => name.startsWith(pkg.root + '/'))?.root;
      const targetPackage = owner(path.relative(root, file).split(path.sep).join('/'));
      const sourcePackage = owner(path.relative(root, from).split(path.sep).join('/'));
      assert.ok(!targetPackage || sourcePackage === targetPackage, `Illegal cross-package dependency: ${from} -> ${file}`);
    }
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const run = vm.runInContext(`(function(require,module,exports){${fs.readFileSync(file, 'utf8')}\n})`, context, { filename: file });
    run(name => load(path.relative(root, path.resolve(path.dirname(file), name)), file), module, module.exports);
    return module.exports;
  }
  return { load, pages, components, context };
}

for (const order of [allPages, [...allPages].reverse()]) {
  const test = environment(); test.load('app.js');
  for (const page of order) {
    const before = test.pages.length;
    test.load(page);
    assert.equal(test.pages.length, before + 1, `${page} must register exactly once`);
  }
}
for (const page of allPages) {
  const test = environment(); test.load(page);
  assert.equal(test.pages.length, 1, `${page} must load its own shared chunks and register independently`);
}
for (const page of allPages) {
  const test = environment(true); test.load(page);
  assert.equal(test.pages.length, 1, `${page} must not depend on a clean wx.webpackJsonp registry`);
}
for (const componentFirst of [false, true]) {
  const test = environment(true);
  if (componentFirst) test.load('comp.js');
  test.load('app.js');
  if (!componentFirst) test.load('comp.js');
  for (const page of allPages) test.load(page);
  assert.equal(test.components.length, 1, 'native base component must register once');
  assert.equal(test.pages.length, allPages.length);
}
assert.ok(!fs.readFileSync(path.join(root, 'runtime.js'), 'utf8').includes('webpackJsonp'), 'loader must not read the shared wx JSONP registry');
console.log(`PASS emitted WeChat bootstrap: ${allPages.length} pages (${manifest.pages.length} main, ${subpackages.length} subpackages), independent/forward/reverse startup, stale global chunk IDs, and native component before/after app; network unavailable.`);
