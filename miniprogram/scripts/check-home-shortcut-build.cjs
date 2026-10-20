// Check the emitted native page's render calls, not legacy catalog copy or a web rebuild.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { parseSync } = require('@babel/core');
const postcss = require('postcss');

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end', 'extra'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}

function checkHomeShortcutTexts(script, styles) {
  const rendered = { className: new Set(), children: new Set(), ariaLabel: new Set() };
  const properties = new Set();
  const ast = parseSync(script, { babelrc: false, configFile: false, sourceType: 'unambiguous' });
  walk(ast, node => {
    if (node.type !== 'CallExpression') return;
    const callee = node.callee.type === 'SequenceExpression' ? node.callee.expressions.at(-1) : node.callee;
    if (callee.type !== 'MemberExpression' || !['jsx', 'jsxs', 'createElement'].includes(callee.property.name)) return;
    walk(node.arguments[1], property => {
      if (property.type !== 'ObjectProperty') return;
      const key = property.key.name || property.key.value;
      properties.add(key);
      const values = Object.hasOwn(rendered, key) && rendered[key];
      if (values) walk(property.value, value => { if (value.type === 'StringLiteral') values.add(value.value); });
    });
  });
  const classes = new Set([...rendered.className].flatMap(value => value.trim().split(/\s+/)));
  const required = ['home-shortcut-card', 'home-shortcut-open', 'home-shortcut-edit', 'home-shortcut-replace', 'today-entry-name', 'shortcut-background', 'shortcut-background-icon', 'card-corner-actions', 'home-editor-fields', 'home-editor-preview', 'home-editor-colors', 'home-editor-name-row', 'entity-title-row', 'entity-title-input', 'icon-library-option'];
  for (const name of required) {
    assert.ok(classes.has(name), `Emitted home render must include ${name}`);
  }
  for (const name of ['today-entry-icon', 'today-entry-copy', 'today-entry-note', 'today-entry-en', 'today-entry-arrow', 'today-entry-num', 'today-symbol', 'home-editor-details-toggle', 'home-editor-sort', 'home-editor-backgrounds', ...[1,2,3,4].map(index => `shortcut-background-mark-${index}`)]) {
    assert.ok(!classes.has(name), `Emitted home must not render the old ${name} node`);
  }
  for (const label of ['名称与图标', '大入口按序号排列']) assert.ok(!rendered.children.has(label), `Emitted shortcut editor must not render ${label}`);
  for (const label of ['设置快捷方式', '排序快捷方式']) assert.ok(rendered.ariaLabel.has(label), `Emitted home toolbar must expose ${label}`);
  assert.ok(properties.has('data-background-icon'), 'Emitted backgrounds identify the validated icon');
  assert.ok(!script.includes('/assets/shortcut-sheets/') && !classes.has('shortcut-icon-sheet'), 'Obsolete shortcut artwork is absent from the native render');
  assert.ok(script.includes('/assets/icons/outline-sheet.png') && script.includes('library:'), 'New backgrounds use the shared colour library outline atlas and namespaced identifiers');

  const rules = [];
  postcss.parse(styles).walkRules(rule => rules.push(rule));
  const declarations = selector => {
    const values = new Map();
    for (const rule of rules.filter(rule => rule.selector.split(',').some(value => value.trim() === selector))) {
      rule.walkDecls(declaration => values.set(declaration.prop, declaration.value.toLowerCase()));
    }
    return values;
  };
  const palette = { peach: '#eab69f', mint: '#b9dbca', blue: '#a9c4e8', yellow: '#e2d6a4', lilac: '#c5badd', rose: '#dcb6bb' };
  for (const [color, value] of Object.entries(palette)) assert.equal(declarations(`.shortcut-color-${color}`).get('--shortcut-color'), value, `Emitted home must include the ${color} color variable`);
  const background = declarations('.shortcut-background .shortcut-background-icon');
  assert.ok(parseFloat(background.get('width')) >= 100 && parseFloat(background.get('height')) >= 100, 'Library icons become large background line art');
  assert.ok(parseFloat(background.get('opacity')) > 0 && parseFloat(background.get('opacity')) <= .3, 'Background line art keeps the quiet decorative tone');
  const actions = declarations('.card-corner-actions');
  assert.equal(actions.get('right'), '4px', 'Shared card actions align four pixels from the right edge');
  assert.equal(actions.get('bottom'), '4px', 'Shared card actions align four pixels above the bottom edge');
  assert.equal(actions.get('gap'), '2px', 'Shortcut and domain actions share the same spacing');
  assert.equal(declarations('.home-shortcut-card').get('background'), 'var(--shortcut-color)', 'Card color must come from its selected color');
  const open = declarations('.home-shortcut-card .home-shortcut-open');
  assert.equal(open.get('background'), 'transparent', 'Global mint button background must not cover the shortcut background');
  assert.equal(open.get('margin'), '0', 'Global button margins must not shift the shortcut card content');
  return true;
}

function checkHomeShortcutBuild(root = path.resolve(__dirname, '../dist')) {
  for (const name of ['shortcut-sheets', 'shortcuts']) assert.ok(!fs.existsSync(path.join(root, 'assets', name)), `Obsolete ${name} artwork is no longer packaged`);
  assert.ok(fs.existsSync(path.join(root, 'assets/icons/outline-sheet.png')), 'The shared outline atlas enters the native package');
  const page = path.join(root, 'pages/index/index');
  // Components reused by another native page are extracted into common.js.
  const common = path.join(root, 'common.js');
  const scripts = [fs.readFileSync(`${page}.js`, 'utf8'), fs.existsSync(common) ? fs.readFileSync(common, 'utf8') : ''];
  const readStyles = (file, visited = new Set()) => {
    if (visited.has(file)) return '';
    visited.add(file);
    const source = fs.readFileSync(file, 'utf8');
    const imports = [...source.matchAll(/@import\s+['"]([^'"]+)['"]\s*;/g)];
    return [source, ...imports.map(([, name]) => {
      const target = path.resolve(path.dirname(file), name);
      const relative = path.relative(root, target);
      assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Native stylesheet imports stay within the emitted package');
      return readStyles(target, visited);
    })].join('\n');
  };
  return checkHomeShortcutTexts(scripts.join('\n'), [readStyles(`${page}.wxss`), readStyles(path.join(root, 'app.wxss'))].join('\n'));
}

module.exports = { checkHomeShortcutBuild, checkHomeShortcutTexts };
if (require.main === module) {
  checkHomeShortcutBuild(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
  console.log('PASS emitted native home shortcuts: shared card actions, edit/replacement nodes, library icon line-art backgrounds and six colors. Not a native WeChat runtime test.');
}
