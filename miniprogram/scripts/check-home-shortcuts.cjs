const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/home-shortcuts.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const loaded = { exports: {} };
const libraryModule = { exports: {} };
new Function('exports', 'module', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/icon-library.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(libraryModule.exports, libraryModule);
const catalogModule = { exports: {} };
new Function('exports', 'module', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/home-feature-catalog.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(catalogModule.exports, catalogModule);
const iconsModule = { exports: {} };
new Function('exports', 'module', 'require', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/shortcut-icons.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(iconsModule.exports, iconsModule, id => {
  if (id === './home-feature-catalog') return catalogModule.exports;
  assert.equal(id, './icon-library'); return libraryModule.exports;
});
const backgroundsModule = { exports: {} };
new Function('exports', 'module', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/shortcut-backgrounds.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(backgroundsModule.exports, backgroundsModule);
new Function('exports', 'module', 'require', compiled)(loaded.exports, loaded, id => {
  if (id === './home-feature-catalog') return catalogModule.exports;
  if (id === './shortcut-icons') return iconsModule.exports;
  assert.equal(id, './shortcut-backgrounds'); return backgroundsModule.exports;
});
const { defaultHomeShortcuts, normalizeHomeShortcuts, moveHomeShortcut, moveHomeShortcutBy, replaceHomeShortcut, makeShortcut, nextHomeShortcutRank, shortcutCatalog } = loaded.exports;
const { shortcutBackgrounds, isShortcutBackground, defaultShortcutBackground } = backgroundsModule.exports;
const { defaultKeys, defaultNames, legacyLayout } = require('./home-shortcut-test-helpers.cjs');
const withBackgrounds = value => ({ ...value, items: value.items.filter(item => item.key !== 'eat').map(item => item.icon ? { ...item, icon: iconsModule.exports.normalizeShortcutIcon(item.icon) } : item) });
const legacyShortcut = (key, kind = 'card') => { if (key === 'eat') return { key, name: '今日食选', color: 'peach', kind }; const { background, icon, ...item } = makeShortcut(key, kind); return item; };
const selectedShortcut = (key, kind = 'card') => key === 'eat' ? { ...legacyShortcut(key, kind), icon: 'library:cook' } : makeShortcut(key, kind);
const legacyRanks = value => withBackgrounds({ ...value, items: [...value.items.filter(item => item.key !== 'eat' && item.kind !== 'link'), ...value.items.filter(item => item.key !== 'eat' && item.kind === 'link')].map((item, index) => ({ ...item, kind: 'card', rank: index + 1 })) });
const defaults = defaultHomeShortcuts();
assert.deepEqual(defaults.items.map(item => item.key), defaultKeys);
assert.deepEqual(defaults.items.map(item => item.name), defaultNames);
assert.deepEqual(defaults.items.map(item => item.rank), [1, 2, 3, 4, 5, 6]);
assert.ok(defaults.items.every(item => item.icon === iconsModule.exports.defaultShortcutIcon(item.key)), 'New defaults explicitly preserve their effective icon backgrounds');
const manuallySelectedOldSix = { version: 1, items: ['create','pomodoro','daily','memos','growth','eat'].map((key,index) => ({ ...selectedShortcut(key), rank: index + 1 })) };
assert.deepEqual(normalizeHomeShortcuts(manuallySelectedOldSix), withBackgrounds(manuallySelectedOldSix), 'Intentionally selecting the former six defaults is not mistaken for an untouched legacy layout');
assert.deepEqual(normalizeHomeShortcuts(JSON.parse(JSON.stringify(manuallySelectedOldSix))), withBackgrounds(manuallySelectedOldSix), 'The selected old-six layout survives saving and reopening');
assert.equal(shortcutCatalog.length, 18);
const retiredOnly = { version: 1, items: [{ ...legacyShortcut('eat'), rank: 1, name: '我的食选' }] };
assert.deepEqual(normalizeHomeShortcuts(retiredOnly), { version: 1, items: [] }, 'A sole retired card becomes an intentional empty layout');
const kept = { ...makeShortcut('meals'), rank: 19, name: '我的餐单', color: 'rose', background: 'fold' };
const removedFood = { ...legacyShortcut('eat'), rank: 19, icon: 'library:cook' };
const mixedRetirement = { version: 1, items: [removedFood, kept] }, retiredBefore = JSON.stringify(mixedRetirement);
assert.deepEqual(normalizeHomeShortcuts(mixedRetirement).items, [kept], 'Retirement preserves a remaining custom card and its historical rank limit');
assert.equal(JSON.stringify(mixedRetirement), retiredBefore, 'Reading never rewrites the saved retirement source');
// C172 texture keys remain read-compatible; C175 exposes only icon backgrounds.
assert.deepEqual(shortcutBackgrounds, [
  { key: 'ripple', name: '涟漪' }, { key: 'arc', name: '拱门' },
  { key: 'orbit', name: '环绕' }, { key: 'diagonal', name: '斜影' },
  { key: 'grid', name: '方格' }, { key: 'dots', name: '星点' },
  { key: 'wave', name: '流线' }, { key: 'steps', name: '阶梯' },
  { key: 'petals', name: '花瓣' }, { key: 'fold', name: '折页' },
]);
assert.equal(new Set(shortcutBackgrounds.map(item => item.key)).size, 10);
assert.ok(defaults.items.every(item => !Object.hasOwn(item, 'background')), 'New cards use icon backgrounds without adding legacy texture data');
assert.ok(shortcutCatalog.every(({ key }) => isShortcutBackground(defaultShortcutBackground(key))));
for (const key of ['unknown', '__proto__', 'constructor']) assert.equal(defaultShortcutBackground(key), 'ripple');
for (const background of [null, {}, 4, 'unknown', '../../bad', 'https://bad.example/image.png']) {
  assert.equal(isShortcutBackground(background), false);
  const safe = normalizeHomeShortcuts({ version: 1, items: [{ ...makeShortcut('create'), rank: 3, background }] });
  assert.equal(safe.items[0].background, undefined, 'Invalid legacy backgrounds are ignored without injecting texture defaults');
}
for (const { key: background } of shortcutBackgrounds) {
  assert.equal(isShortcutBackground(background), true);
  const selected = { ...makeShortcut('create'), name: '自定名称', color: 'rose', rank: 9, background };
  const restored = normalizeHomeShortcuts(JSON.parse(JSON.stringify({ version: 1, items: [selected] })));
  assert.deepEqual(restored.items, [selected], 'Every selected background preserves name, color and rank on reload');
}
for (const ranked of [false, true]) {
  const oldSix = legacyLayout();
  if (!ranked) oldSix.items = oldSix.items.map(({ rank, ...item }) => item);
  const original = JSON.stringify(oldSix);
  assert.deepEqual(normalizeHomeShortcuts(oldSix), defaults, 'Untouched old six cards upgrade with or without ranks');
  assert.equal(JSON.stringify(oldSix), original, 'Migration does not mutate stored input');
}
for (const customization of [
  item => ({ ...item, name: '我的任务' }), item => ({ ...item, color: 'rose' }), item => ({ ...item, icon: 'camera' }),
  item => ({ ...item, background: 'petals' }), item => ({ ...item, background: defaultShortcutBackground(item.key) }),
]) {
  const customSix = legacyLayout();
  customSix.items[0] = customization(customSix.items[0]);
  assert.deepEqual(normalizeHomeShortcuts(customSix), withBackgrounds(customSix), 'Custom old-six appearance remains intact, including an explicitly selected default background');
}
const customSixOrder = legacyLayout();
[customSixOrder.items[0].rank, customSixOrder.items[1].rank] = [2, 1];
assert.deepEqual(normalizeHomeShortcuts(customSixOrder).items, [...withBackgrounds(customSixOrder).items].sort((a, b) => a.rank - b.rank), 'Custom ranks preserve the selected old cards');
const customSixGap = legacyLayout(); customSixGap.items[5].rank = 8;
assert.deepEqual(normalizeHomeShortcuts(customSixGap), withBackgrounds(customSixGap), 'A vacant rank is an intentional custom layout');
const customSixLink = legacyLayout(); customSixLink.items[0].kind = 'link';
assert.deepEqual(normalizeHomeShortcuts(customSixLink), withBackgrounds(legacyLayout()), 'A custom link converts to a card without changing chosen keys');
const subset = { version: 1, items: legacyLayout().items.slice(0, 5) };
assert.deepEqual(normalizeHomeShortcuts(subset), withBackgrounds(subset), 'Removed cards remain removed');
assert.deepEqual(normalizeHomeShortcuts(legacyLayout(true)), withBackgrounds(legacyLayout(true)), 'UI sorting fixtures remain intentionally custom');
const lastDefaults = { version: 1, items: ['create', 'pomodoro', 'daily', 'memos', 'eat', 'choose', 'todos', 'posts'].map((key, index) => legacyShortcut(key, index < 6 ? 'card' : 'link')) };
assert.deepEqual(normalizeHomeShortcuts(lastDefaults), defaults, 'Existing default layouts receive growth and the swapped food shortcut');
const customLast = { version: 1, items: lastDefaults.items.map(item => item.key === 'choose' ? { ...item, name: '我的选境' } : item) };
assert.deepEqual(normalizeHomeShortcuts(customLast), legacyRanks(customLast), 'Legacy custom appearance and group order migrate to independent ranks');
const previousNames = { eat: '吃什么', daily: '习惯养成', memos: '写备忘录' };
const previousDefaults = { version: 1, items: ['eat', 'pomodoro', 'create', 'daily', 'memos', 'choose', 'todos', 'posts'].map((key, index) => {
  const item = legacyShortcut(key, index < 6 ? 'card' : 'link');
  return { ...item, name: previousNames[key] || item.name };
}) };
assert.deepEqual(normalizeHomeShortcuts(previousDefaults), defaults, 'Saved old defaults adopt the new layout');
const selectedOldBackground = { ...lastDefaults, items: lastDefaults.items.map((item, index) => index === 0 ? { ...item, background: 'fold' } : item) };
assert.deepEqual(normalizeHomeShortcuts(selectedOldBackground), legacyRanks(selectedOldBackground), 'A selected background preserves the older eight-entry layout');
const customized = { version: 1, items: previousDefaults.items.map(item => item.key === 'eat' ? { ...item, name: '午餐灵感', color: 'rose' } : item) };
const migratedCustom = normalizeHomeShortcuts(customized);
assert.deepEqual(migratedCustom.items.map(item => item.key), customized.items.filter(item => item.key !== 'eat').map(item => item.key), 'Custom layouts retain their order');
assert.ok(!migratedCustom.items.some(item => item.key === 'eat'));
assert.equal(migratedCustom.items[0].key, 'pomodoro');
assert.equal(migratedCustom.items.find(item => item.key === 'daily').name, '习惯');
assert.equal(migratedCustom.items.find(item => item.key === 'memos').name, '创建便签');
const newlySorted = legacyRanks({ version: 1, items: previousDefaults.items.map(item => selectedShortcut(item.key, item.kind)) });
assert.deepEqual(normalizeHomeShortcuts(newlySorted), newlySorted, 'A new custom sort is never mistaken for old defaults');
const formerHabitLabel = { version: 1, items: newlySorted.items.map(item => item.key === 'daily' ? { ...item, name: '习惯打卡' } : item) };
assert.deepEqual(normalizeHomeShortcuts(formerHabitLabel), newlySorted, 'Renaming a stored habit label preserves its custom order and styling');
const customHabitLabel = { version: 1, items: newlySorted.items.map(item => item.key === 'daily' ? { ...item, name: '每天进步', color: 'rose', kind: 'link' } : item) };
assert.deepEqual(normalizeHomeShortcuts(customHabitLabel), { ...customHabitLabel, items: customHabitLabel.items.map(item => ({ ...item, kind: 'card' })) }, 'Old link becomes a card, preserving custom name/color/rank');
const formerGrowthLabel = { version: 1, items: defaults.items.map(item => item.key === 'growth' ? { ...item, name: '成长足迹' } : item) };
assert.deepEqual(normalizeHomeShortcuts(formerGrowthLabel), defaults, 'Former default growth label becomes the shared domain overview');
const formerProgressLabel = { version: 1, items: defaults.items.map(item => item.key === 'growth' ? { ...item, name: '领域进展' } : item) };
assert.deepEqual(normalizeHomeShortcuts(formerProgressLabel), defaults, 'Cached domain progress label adopts the current domain name');
const styledProgressLabel = { version: 1, items: formerProgressLabel.items.map(item => item.key === 'growth' ? { ...item, color: 'blue' } : item) };
assert.deepEqual(normalizeHomeShortcuts(styledProgressLabel), { ...defaults, items: defaults.items.map(item => item.key === 'growth' ? { ...item, color: 'blue' } : item) }, 'Renaming cached domain label preserves styling and ranks');
const customGrowthLabel = { version: 1, items: defaults.items.map(item => item.key === 'growth' ? { ...item, name: '我的领域完成', color: 'blue', kind: 'link' } : item) };
assert.deepEqual(normalizeHomeShortcuts(customGrowthLabel), { ...customGrowthLabel, items: customGrowthLabel.items.map(item => ({ ...item, kind: 'card' })) }, 'Old overview link becomes a card, preserving custom name/color/rank');
assert.equal(defaults.items.filter(item => item.kind === 'card').length, 6);
assert.equal(defaults.items.filter(item => item.kind === 'link').length, 0);
assert.deepEqual(normalizeHomeShortcuts(null), defaults);
assert.deepEqual(normalizeHomeShortcuts({ version: 2, items: [] }), defaults);
assert.deepEqual(normalizeHomeShortcuts({ version: 1, items: [] }).items, []);
const cleaned = normalizeHomeShortcuts({ version: 1, items: [
  { key: 'memos', name: '   ', color: 'injected-class', kind: 'unknown' },
  { key: 'memos' }, { key: '/malicious-route' }, null,
  { key: 'meals', name: '一二三四五六七八九十', color: 'rose', kind: 'link' },
] });
assert.equal(cleaned.items.length, 2);
assert.deepEqual(cleaned.items[0], { ...legacyShortcut('memos'), rank: 1 }, 'Reading a legacy implicit icon does not materialize it');
assert.equal(makeShortcut('memos').name, '创建便签');
assert.equal(makeShortcut('memo-list').name, '便签');
assert.equal(makeShortcut('create').name, '创建任务');
assert.ok(!shortcutCatalog.some(item => item.key === 'eat'));
assert.equal(normalizeHomeShortcuts({ version: 1, items: [{ key: 'memos', name: '备忘录' }] }).items[0].name, '创建便签');
assert.equal(normalizeHomeShortcuts({ version: 1, items: [{ key: 'memos', name: '我的灵感' }] }).items[0].name, '我的灵感');
assert.equal(cleaned.items[1].name, '一二三四五六七八');
assert.equal(cleaned.items[1].color, 'rose');
assert.equal(cleaned.items[1].kind, 'card');
const before = JSON.stringify(defaults.items);
const moved = moveHomeShortcut(defaults.items, 'growth', 'statistics');
assert.deepEqual(moved.slice(0, 5).map(item => item.key), ['memo-list', 'pomodoro', 'daily', 'growth', 'statistics']);
assert.deepEqual(moveHomeShortcut(moved, 'growth', 'statistics'), defaults.items);
assert.equal(JSON.stringify(defaults.items), before);
assert.equal(new Set(moved.map(item => item.key)).size, defaults.items.length);
assert.deepEqual(normalizeHomeShortcuts(JSON.parse(JSON.stringify({ version: 1, items: moved }))).items, moved);
assert.equal(moveHomeShortcut(defaults.items, 'posts', 'eat'), defaults.items);
const legacyLinks = [...defaults.items, { ...makeShortcut('todos', 'link'), rank: 7 }, { ...makeShortcut('posts', 'link'), rank: 8 }];
const linksMoved = moveHomeShortcut(legacyLinks, 'posts', 'todos');
assert.deepEqual(linksMoved.slice(-2).map(item => item.key), ['posts', 'todos']);
assert.deepEqual(moveHomeShortcut(linksMoved, 'posts', 'todos'), legacyLinks);
for (const { rank, ...item } of moved) {
  const { rank: originalRank, ...original } = defaults.items.find(original => original.key === item.key);
  assert.deepEqual(item, original, 'Moving changes rank, preserving appearance');
}
assert.equal(JSON.stringify(defaults.items), before);
const styled = defaults.items.map((item, index) => ({
  ...item, name: `入口${index + 1}`, color: index % 2 ? 'lilac' : 'rose',
  background: shortcutBackgrounds[index + 2].key,
}));
const styledBefore = JSON.stringify(styled);
const styledMoved = moveHomeShortcut(styled, 'journal', 'pomodoro');
assert.deepEqual(styledMoved.map(item => item.key), ['memo-list', 'journal', 'pomodoro', 'daily', 'statistics', 'growth']);
for (const { rank, ...item } of styledMoved) {
  const { rank: previousRank, ...original } = styled.find(original => original.key === item.key);
  assert.deepEqual(item, original, 'Moving preserves the selected name, color and background together');
}
assert.deepEqual(normalizeHomeShortcuts(JSON.parse(JSON.stringify({ version: 1, items: styledMoved }))).items, styledMoved, 'Saved sorting and all three appearance fields survive reopening');
assert.equal(JSON.stringify(styled), styledBefore, 'Moving does not mutate stored appearances');
assert.deepEqual(moveHomeShortcut([], 'posts', 'eat'), []);
assert.equal(moveHomeShortcut(defaults.items, 'eat', 'eat'), defaults.items);
assert.equal(moveHomeShortcut(defaults.items, 'missing', 'eat'), defaults.items);
const gaps = defaults.items.filter(item => !['memo-list', 'daily'].includes(item.key));
const gapsBefore = JSON.stringify(gaps);
assert.deepEqual(normalizeHomeShortcuts({ version: 1, items: gaps }).items, gaps, 'Save/reload preserves vacant ranks and every surviving rank');
assert.equal(nextHomeShortcutRank(gaps), 1);
const filled = [...gaps, { ...makeShortcut('choose'), rank: nextHomeShortcutRank(gaps) }];
assert.equal(nextHomeShortcutRank(filled), 3, 'Allocation uses the smallest free rank, across both size groups');
const filledAgain = [...filled, { ...makeShortcut('daily'), rank: nextHomeShortcutRank(filled) }];
assert.equal(nextHomeShortcutRank(filledAgain), 7);
const gappedMove = moveHomeShortcut(gaps, 'growth', 'pomodoro');
assert.deepEqual(gappedMove.map(item => item.rank), [2, 4, 5, 6], 'Moving reassigns occupied slots without filling holes');
assert.deepEqual(gappedMove.filter(item => item.kind === 'link'), gaps.filter(item => item.kind === 'link'), 'Moving leaves the other group intact');
assert.deepEqual(moveHomeShortcut(gappedMove, 'growth', 'statistics'), gaps);
assert.equal(JSON.stringify(gaps), gapsBefore);
const mixedLegacy = { version: 1, items: [makeShortcut('posts', 'link'), makeShortcut('create'), makeShortcut('todos', 'link'), makeShortcut('daily')] };
assert.deepEqual(normalizeHomeShortcuts(mixedLegacy), legacyRanks(mixedLegacy), 'Old interleaved arrays retain each group order');
const invalidRanks = normalizeHomeShortcuts({ version: 1, items: [
  { ...makeShortcut('create'), rank: 4 }, { ...makeShortcut('daily'), rank: 4 },
  { ...makeShortcut('posts', 'link'), rank: 2 }, { ...makeShortcut('memos'), rank: -1 },
  { ...makeShortcut('meals'), rank: '3' }, { ...makeShortcut('choose'), rank: 1.5 },
  { ...makeShortcut('growth'), rank: 999 },
] });
assert.equal(invalidRanks.items.find(item => item.key === 'create').rank, 4);
assert.equal(invalidRanks.items.find(item => item.key === 'posts').rank, 2);
assert.equal(new Set(invalidRanks.items.map(item => item.rank)).size, invalidRanks.items.length);
assert.ok(invalidRanks.items.every(item => Number.isInteger(item.rank) && item.rank > 0 && item.rank <= shortcutCatalog.length));
assert.deepEqual(normalizeHomeShortcuts(JSON.parse(JSON.stringify(invalidRanks))), invalidRanks);
const customizedIcon = { version: 1, items: [{ ...makeShortcut('create', 'link'), name: '安排今天', color: 'rose', rank: 9, icon: 'camera' }] };
const migratedIcon = normalizeHomeShortcuts(customizedIcon);
assert.deepEqual(migratedIcon.items[0], { ...customizedIcon.items[0], icon: 'library:camera', kind: 'card' });
assert.equal(customizedIcon.items[0].icon, 'camera', 'Read compatibility does not mutate the old saved value');
assert.deepEqual(normalizeHomeShortcuts(JSON.parse(JSON.stringify(migratedIcon))), migratedIcon, 'Selected icon survives reload');
for (const icon of ['../../bad', 'https://bad.example/icon.png', 'unknown', null, {}, 4]) {
  const safe = normalizeHomeShortcuts({ version: 1, items: [{ ...makeShortcut('create'), rank: 3, icon }] });
  assert.equal(safe.items[0].icon, undefined, 'Invalid icon identifiers cannot inject image paths');
}
assert.equal(iconsModule.exports.defaultShortcutIcon('memo-list'), 'library:notes');
assert.equal(iconsModule.exports.defaultShortcutIcon('domains'), 'library:work');
for (const { key } of shortcutCatalog) assert.ok(libraryModule.exports.getLibraryIcon(iconsModule.exports.shortcutLibraryIcon(iconsModule.exports.defaultShortcutIcon(key))), 'Every feature receives an existing coloured-library icon');
const iconComponent = { exports: {} };
const iconCompiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/components/shortcut-icon.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
new Function('exports', 'module', 'require', iconCompiled)(iconComponent.exports, iconComponent, id => {
  if (id === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
  if (id === '@tarojs/components') return { View: 'View', Image: 'Image' };
  if (id === '../lib/shortcut-icons') return iconsModule.exports;
  if (id === './library-icon') return { default: 'LibraryIcon' };
  assert.equal(id, './shortcut-icon.css'); return {};
});
assert.equal(iconComponent.exports.default({ name: 'memo-list' }).props.children.props.name, 'notes');
assert.equal(iconComponent.exports.default({ name: 'memos' }).props.children.props.name, 'write');
const legacyCamera = iconComponent.exports.default({ name: 'memo-list', icon: 'camera', variant: 'background' });
assert.equal(legacyCamera.props.children.type, 'LibraryIcon', 'An existing camera preference resolves to the shared library');
assert.equal(legacyCamera.props.children.props.name, 'camera');
assert.equal(legacyCamera.props.children.props.variant, 'outline');
const libraryCamera = iconComponent.exports.default({ name: 'memo-list', icon: 'library:camera' });
assert.equal(libraryCamera.props['data-icon'], 'library:camera');
assert.equal(libraryCamera.props.children.type, 'LibraryIcon', 'A new background preview uses the existing colored-library component');
assert.equal(libraryCamera.props.children.props.name, 'camera');
assert.equal(libraryCamera.props.children.props.variant, 'colored', 'The selection trigger retains the original colored artwork');
const outlineCamera = iconComponent.exports.default({ name: 'memo-list', icon: 'library:camera', variant: 'background' });
assert.equal(outlineCamera.props.children.props.name, libraryCamera.props.children.props.name, 'The card outline and colored selector keep the same library identity');
assert.equal(outlineCamera.props.children.props.variant, 'outline', 'The decorative card background explicitly requests the shared outline variant');
const { homeFeatureGroups, homeFeatureCatalog } = catalogModule.exports;
assert.equal(shortcutCatalog, homeFeatureCatalog, 'Shortcut selection and directory use the same canonical definitions');
assert.deepEqual(homeFeatureGroups.map(group => group.title), ['快捷操作', '功能界面', '阅读与空间']);
assert.deepEqual(homeFeatureGroups[0].items.map(item => item.key), ['create', 'memos', 'create-habit', 'create-domain', 'pomodoro']);
assert.equal(new Set(homeFeatureGroups.flatMap(group => group.items.map(item => item.key))).size, 16);
assert.ok(!homeFeatureGroups.flatMap(group => group.items).some(item => item.key === 'posts' || item.key === 'domains'), 'Directory omits reading and duplicate domain destinations while saved identities remain valid');
for (const group of homeFeatureGroups) for (const item of group.items) {
  assert.equal(item, shortcutCatalog.find(entry => entry.key === item.key));
  assert.equal(iconsModule.exports.defaultShortcutIcon(item.key), 'library:' + item.icon);
}
assert.equal(makeShortcut('pomodoro-page').name, '番茄钟');
assert.equal(makeShortcut('pomodoro-page').icon, 'library:focus');
assert.deepEqual(normalizeHomeShortcuts({ version: 1, items: [{ ...makeShortcut('pomodoro-page'), rank: 17 }] }).items, [{ ...makeShortcut('pomodoro-page'), rank: 17 }]);
const legacyIcons = 'create pomodoro daily memos choose growth todos posts meals categories favorites journal statistics eat home book pen calendar alarm target flag folder archive tag bell heart leaf sun moon cloud coffee apple dumbbell bike music headphones camera image video briefcase lightbulb compass map palette code chat settings bolt'.split(' ');
assert.equal(legacyIcons.length, 48);
for (const icon of legacyIcons) {
  const iconLayout = { version: 1, items: [{ ...makeShortcut('memo-list'), rank: 4, name: '我的记录', color: 'rose', icon }] };
  const before = JSON.stringify(iconLayout);
  const migrated = normalizeHomeShortcuts(iconLayout);
  assert.deepEqual(migrated, withBackgrounds(iconLayout), 'Every old icon resolves to a valid library background while preserving other preferences');
  assert.ok(libraryModule.exports.getLibraryIcon(iconsModule.exports.shortcutLibraryIcon(migrated.items[0].icon)));
  assert.deepEqual(normalizeHomeShortcuts(migrated), migrated, 'Old icon normalization is idempotent');
  assert.equal(JSON.stringify(iconLayout), before, 'Reading an old preference never mutates its input');
}
assert.equal(libraryModule.exports.iconLibrary.length, 64);
const { isShortcutIcon, libraryShortcutIcon, shortcutLibraryIcon } = iconsModule.exports;
const libraryBackgrounds = libraryModule.exports.iconLibrary.map(({ id }) => libraryShortcutIcon(id));
assert.equal(new Set(libraryBackgrounds).size, 64, 'Each colored-library icon has a distinct persisted background identifier');
assert.equal(libraryShortcutIcon('camera'), 'library:camera');
assert.equal(isShortcutIcon('camera'), false, 'New writes only accept namespaced library identifiers');
assert.equal(shortcutLibraryIcon('camera'), 'camera', 'An old camera selection has a read-only library alias');
assert.equal(shortcutLibraryIcon('library:camera'), 'camera', 'The prefixed camera selection uses the colored library geometry');
for (const { id } of libraryModule.exports.iconLibrary) {
  const icon = libraryShortcutIcon(id);
  assert.equal(icon, `library:${id}`);
  assert.equal(isShortcutIcon(icon), true, `${icon} is accepted by the shared shortcut validator`);
  assert.equal(shortcutLibraryIcon(icon), id, `${icon} resolves back to its exact library ID`);
  const source = { version: 1, items: [{ ...makeShortcut('memo-list'), rank: 4, name: 'Library', color: 'rose', icon }, { ...makeShortcut('daily'), rank: 9 }] };
  const before = JSON.stringify(source);
  assert.deepEqual(normalizeHomeShortcuts(JSON.parse(before)), source, 'All 64 prefixed icons retain their name, color and vacant rank after saving and reloading');
  const moved = moveHomeShortcutBy(source.items, 'memo-list', 1);
  assert.deepEqual(moved.map(item => item.rank), [4, 9], 'A prefixed icon move uses the existing rank slots');
  assert.equal(moved.find(item => item.key === 'memo-list').icon, icon, 'Sorting retains the selected library background');
  assert.deepEqual(normalizeHomeShortcuts(JSON.parse(JSON.stringify({ version: 1, items: moved }))).items, moved, 'Sorting a library background survives reopening');
  const replaced = replaceHomeShortcut(source.items, 'memo-list', 'todos');
  assert.deepEqual(replaced[0], { ...source.items[0], key: 'todos' }, 'Replacing a function retains the exact library icon, custom name, color and rank');
  assert.deepEqual(normalizeHomeShortcuts(JSON.parse(JSON.stringify({ version: 1, items: replaced }))).items, replaced, 'A replaced library background survives reopening');
  assert.equal(JSON.stringify(source), before, 'Library validation, sorting and replacement do not mutate the saved input');
}
for (const icon of ['library:', 'library:unknown', 'library:../../bad', 'library:camera.png', 'library:https://bad.example/icon.png', 'library:library:camera', 'LIBRARY:camera', 'library:Camera', 'library:camera ', 'library:__proto__', 'library:constructor', 'library:toString', 'run']) {
  assert.equal(isShortcutIcon(icon), false, `${icon} is not a registered persisted background ID`);
  assert.equal(shortcutLibraryIcon(icon), undefined, 'Invalid namespaced IDs cannot supply a library artwork path');
  const safe = normalizeHomeShortcuts({ version: 1, items: [{ ...makeShortcut('create'), rank: 3, icon }] });
  assert.equal(safe.items[0].icon, undefined, 'Invalid namespaced IDs are omitted while the shortcut remains usable');
}
const adjacentMoved = moveHomeShortcutBy(gaps, 'growth', -1);
assert.deepEqual(adjacentMoved.map(item => item.key), ['pomodoro', 'growth', 'statistics', 'journal']);
assert.deepEqual(adjacentMoved.map(item => item.rank), [2,4,5,6], 'Adjacent movement preserves occupied rank slots');
assert.deepEqual(moveHomeShortcutBy(adjacentMoved,'growth',1), gaps);
assert.equal(moveHomeShortcutBy(defaults.items, 'memo-list', -1), defaults.items, 'First card cannot move upward');
assert.equal(moveHomeShortcutBy(defaults.items, 'journal', 1), defaults.items, 'Last card cannot move downward');
assert.equal(moveHomeShortcutBy(defaults.items, 'missing', 1), defaults.items);
const replacementSource = [{ ...makeShortcut('memo-list'), rank: 4, name: '我的记录', color: 'rose', icon: 'library:camera', background: 'fold' }, { ...makeShortcut('daily'), rank: 9 }];
const replacementBefore = JSON.stringify(replacementSource);
const replacement = replaceHomeShortcut(replacementSource, 'memo-list', 'todos');
assert.deepEqual(replacement[0], { ...replacementSource[0], key: 'todos' }, 'Replacement preserves slot, custom name, selected icon, color and legacy texture');
assert.deepEqual(replacement[1], replacementSource[1]);
assert.equal(JSON.stringify(replacementSource), replacementBefore, 'Replacing a function never mutates the original layout');
assert.deepEqual(normalizeHomeShortcuts(JSON.parse(JSON.stringify({ version: 1, items: replacement }))).items, replacement);
assert.equal(replaceHomeShortcut(replacementSource, 'memo-list', 'daily'), replacementSource, 'Replacement cannot duplicate another selected function');
assert.equal(replaceHomeShortcut(replacementSource, 'memo-list', 'memo-list'), replacementSource, 'Reselecting the current function does not change appearance');
assert.equal(replaceHomeShortcut(replacementSource, 'missing', 'todos'), replacementSource);
assert.equal(replaceHomeShortcut(replacementSource, 'memo-list', 'missing'), replacementSource);
const defaultReplacement = replaceHomeShortcut(defaults.items, 'memo-list', 'create');
assert.equal(defaultReplacement[0].name, '创建任务', 'A function default name follows the replacement function');
assert.equal(defaultReplacement[0].color, defaults.items[0].color);
assert.equal(defaultReplacement[0].rank, defaults.items[0].rank);
assert.equal(defaultReplacement[0].icon, iconsModule.exports.defaultShortcutIcon('memo-list'), 'Replacing a function retains its explicitly selected background');
const implicitReplacementSource = defaults.items.map(({ icon, ...item }) => item);
assert.equal(replaceHomeShortcut(implicitReplacementSource,'memo-list','create')[0].icon, iconsModule.exports.defaultShortcutIcon('memo-list'), 'Replacing a genuinely old implicit background fixes its previous effective icon');
console.log('PASS home shortcut preferences: 64 library backgrounds, 48 read-only legacy aliases, valid per-feature defaults, rejected image paths, empty layouts, immutable movement, vacant ranks and replacement appearance.');

