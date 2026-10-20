// PostCSS accepts empty statements and universal selectors that WXSS rejects.
const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const selectorParser = require('postcss-selector-parser');

function checkStyles(source, filename) {
  const root = postcss.parse(source, { from: filename });
  function check(node) {
    for (const key of ['before', 'after', 'ownSemicolon']) {
      const raw = (node.raws[key] || '').replace(/\/\*[\s\S]*?\*\//g, '');
      if (raw.includes(';')) throw new Error(`${filename}:${node.source?.start?.line || 1}: empty WXSS statement (unexpected semicolon)`);
    }
  }
  check(root); root.walk(check);
  let unsupportedSelector;
  root.walkRules(rule => {
    selectorParser(selectors => selectors.walkUniversals(() => {
      unsupportedSelector ||= rule.source?.start || { line: 1, column: 1 };
    })).processSync(rule.selector);
  });
  if (unsupportedSelector) throw new Error(`${filename}:${unsupportedSelector.line}:${unsupportedSelector.column}: unsupported WXSS universal selector (unexpected token *)`);
}

function checkStyleDirectory(directory, extension) {
  let count = 0;
  function visit(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.name.endsWith(extension)) { checkStyles(fs.readFileSync(file, 'utf8'), file); count++; }
    }
  }
  visit(directory);
  return count;
}

module.exports = { checkStyles, checkStyleDirectory };
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const source = checkStyleDirectory(path.join(root, 'src'), '.css');
  const emitted = checkStyleDirectory(path.join(root, 'dist'), '.wxss');
  console.log(`PASS WXSS syntax guards: ${source} source styles and ${emitted} emitted styles. Not a native WeChat compiler test.`);
}
