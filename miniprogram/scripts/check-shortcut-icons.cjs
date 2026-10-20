const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const sharp = require('../../web/node_modules/sharp');
const loaded = { exports: {} };
const libraryModule = { exports: {} };
new Function('exports', 'module', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/icon-library.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(libraryModule.exports, libraryModule);
const catalogModule = { exports: {} };
new Function('exports', 'module', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/home-feature-catalog.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(catalogModule.exports, catalogModule);
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/shortcut-icons.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
new Function('exports', 'module', 'require', source)(loaded.exports, loaded, id => {
  if (id === './home-feature-catalog') return catalogModule.exports;
  assert.equal(id, './icon-library'); return libraryModule.exports;
});
async function check() {
  const icons = libraryModule.exports.iconLibrary;
  assert.equal(icons.length, 64);
  const sheet = path.join(__dirname, '../src/assets/icons/outline-sheet.png');
  const meta = await sharp(sheet).metadata();
  assert.equal(meta.width, 512); assert.equal(meta.height, 512);
  const { data, info } = await sharp(sheet).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const [index, icon] of icons.entries()) {
    assert.equal(loaded.exports.shortcutLibraryIcon(loaded.exports.libraryShortcutIcon(icon.id)), icon.id);
    assert.ok(fs.existsSync(path.join(__dirname, '../src', icon.src)), `${icon.id} retains its existing coloured artwork`);
    let painted = 0, clear = 0;
    for (let y = Math.floor(index / 8) * 64; y < (Math.floor(index / 8) + 1) * 64; y++) {
      for (let x = index % 8 * 64; x < (index % 8 + 1) * 64; x++) {
        if (data[(y * info.width + x) * 4 + 3]) painted++; else clear++;
      }
    }
    assert.ok(painted > 20 && clear > 1500, `${icon.id} has a nonempty transparent outline cell`);
  }
  for (const folder of ['shortcuts', 'shortcut-sheets']) {
    const target = path.join(__dirname, '../src/assets', folder);
    assert.ok(!fs.existsSync(target) || !fs.readdirSync(target, { recursive: true }).some(name => name.endsWith('.png')), `Obsolete ${folder} PNGs were removed`);
  }
  assert.ok(!fs.existsSync(path.join(__dirname, 'generate-shortcut-icons.cjs')));
  console.log('PASS 64 shared coloured icons and transparent outline cells; obsolete shortcut sprites and generator removed.');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
