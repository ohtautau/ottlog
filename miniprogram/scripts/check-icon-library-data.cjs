const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const sharp = require('../../web/node_modules/sharp');
const { loadLibrary, sourceSvg, outlineSvg } = require('./library-icon-outline.cjs');
const loaded = new Map();
function load(file) {
  file = path.resolve(file);
  if (loaded.has(file)) return loaded.get(file);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {}; loaded.set(file, exports);
  new Function('exports', 'require', source)(exports, name => load(path.resolve(path.dirname(file), name + '.ts')));
  return exports;
}

async function main() {
  const icons = load(path.join(__dirname, '../src/lib/icon-library.ts'));
  const habits = load(path.join(__dirname, '../src/lib/reminder-data.ts'));
  const records = load(path.join(__dirname, '../src/lib/tool-records.ts'));
  const all = icons.iconLibrary;
  assert.equal(all.length, 64);
  assert.equal(new Set(all.map(icon => icon.id)).size, all.length, 'Icon ids are unique');
  assert.equal(new Set(all.map(icon => icon.label)).size, all.length, 'Chinese names identify individual choices');
  assert.equal(new Set(all.map(icon => icon.src)).size, all.length, 'Choices have distinct artwork');
  assert.equal(icons.iconCategories.length, 8);
  assert.deepEqual(new Set(all.map(icon => icon.category)), new Set(icons.iconCategories));
  for (const icon of all) {
    assert.match(icon.keywords, /[\u4e00-\u9fff]/, `${icon.id}: Chinese search aliases are available`);
    assert.match(icon.keywords, /[a-z]+/, `${icon.id}: English search aliases are available`);
    assert.ok(Object.hasOwn(habits.scenes, icon.fallback), `${icon.id} has a legacy-compatible fallback`);
    assert.equal(icons.getLibraryIcon(icon.id), icon);
    assert.ok(icon.src.startsWith('/assets/') && icon.src.endsWith('.png'), 'Use local PNGs in WeChat');
    const metadata = await sharp(path.join(__dirname, '../src', icon.src)).metadata();
    assert.equal(metadata.format, 'png', icon.id);
    assert.equal(metadata.width, 192, icon.id);
    assert.equal(metadata.height, 192, icon.id);
    assert.equal(metadata.hasAlpha, true, `${icon.id} retains transparent edges`);
    const colour = await sharp(path.join(__dirname, '../src', icon.src)).ensureAlpha().raw().toBuffer();
    const original = await sharp(Buffer.from(sourceSvg(icon))).resize(192, 192, { fit: 'contain' }).ensureAlpha().raw().toBuffer();
    let saturatedPixels = 0, colourError = 0, colourWeight = 0, alphaError = 0;
    for (let pixel = 0; pixel < colour.length; pixel += 4) {
      const channels = colour.subarray(pixel, pixel + 3);
      if (colour[pixel + 3] > 200 && Math.max(...channels) - Math.min(...channels) > 45) saturatedPixels++;
      const weight = Math.min(colour[pixel + 3], original[pixel + 3]) / 255;
      for (let channel = 0; channel < 3; channel++) {
        colourError += Math.abs(colour[pixel + channel] - original[pixel + channel]) * weight;
        colourWeight += weight;
      }
      alphaError += Math.abs(colour[pixel + 3] - original[pixel + 3]);
    }
    assert.ok(saturatedPixels > 500, `${icon.id}: the original colour asset must remain colourful, not become an outline.`);
    assert.ok(colourWeight > 0 && colourError / colourWeight < 1, `${icon.id}: existing colour PNG must still match its editable source.`);
    assert.ok(alphaError / (192 * 192) < 1, `${icon.id}: existing colour geometry and filled regions must remain intact.`);
  }

  const atlasFile = path.join(__dirname, '../src/assets/icons/outline-sheet.png');
  const atlasBytes = fs.readFileSync(atlasFile);
  const atlasMetadata = await sharp(atlasBytes).metadata();
  assert.equal(atlasMetadata.format, 'png');
  assert.equal(atlasMetadata.width, 512);
  assert.equal(atlasMetadata.height, 512);
  assert.equal(atlasMetadata.hasAlpha, true);
  const atlas = await sharp(atlasBytes).ensureAlpha().raw().toBuffer();
  for (const [index, icon] of all.entries()) {
    let painted = 0, transparent = 0;
    for (let y = Math.floor(index / 8) * 64; y < (Math.floor(index / 8) + 1) * 64; y++) {
      for (let x = index % 8 * 64; x < (index % 8 + 1) * 64; x++) {
        const pixel = (y * 512 + x) * 4;
        const alpha = atlas[pixel + 3];
        if (!alpha) { transparent++; continue; }
        painted++;
        // Near-transparent antialias pixels may have slightly different RGB
        // after palette quantization; visible pixels retain the selected grey.
        if (alpha >= 32) {
          [102, 116, 124].forEach((grey, channel) => {
            assert.ok(Math.abs(atlas[pixel + channel] - grey) <= 4, `${icon.id}: outline strokes must use grey #66747c.`);
          });
        }
      }
    }
    assert.ok(painted > 100, `${icon.id}: every library icon needs visible line geometry.`);
    assert.ok(transparent > 2048, `${icon.id}: outline cells must retain transparent interiors, rather than grey solid fills.`);
  }

  // Re-render real editable artwork without writing files. Byte equality
  // catches stale geometry, a reordered atlas, or an independently drawn icon
  // substituted for a shared-library entry; the second encoding checks repeat
  // builds remain deterministic.
  const generatorLibrary = loadLibrary();
  assert.deepEqual(generatorLibrary.map(icon => icon.id), all.map(icon => icon.id));
  const cells = await Promise.all(all.map(async (icon, index) => ({
    input: await sharp(Buffer.from(outlineSvg(sourceSvg(icon), icon.id))).png().toBuffer(),
    left: index % 8 * 64, top: Math.floor(index / 8) * 64,
  })));
  const renderAtlas = () => sharp({ create: { width: 512, height: 512, channels: 4, background: '#00000000' } })
    .composite(cells).png({ palette: true, colours: 16, compressionLevel: 9, effort: 10, dither: 0 }).toBuffer();
  const regenerated = await renderAtlas();
  assert.ok(regenerated.equals(atlasBytes), 'Packaged outline atlas must follow source geometry and the exact 64-entry library order.');
  assert.ok((await renderAtlas()).equals(regenerated), 'Generating the same outline atlas twice must be byte-identical.');
  // Keywords and the Chinese category name both work; whitespace and English
  // ids are accepted without making search case-sensitive.
  assert.ok(icons.findLibraryIcons('全部', '运动').some(icon => icon.id === 'swim'));
  assert.ok(icons.findLibraryIcons('全部', '读书').some(icon => icon.id === 'book'));
  assert.deepEqual(icons.findLibraryIcons('全部', '  SWIM  ').map(icon => icon.id), ['swim']);
  assert.equal(icons.findLibraryIcons('饮食', '游泳').length, 0);
  assert.equal(icons.findLibraryIcons('全部', '不可能存在的图标xyz').length, 0);
  const bilingualAliases = [
    ['运动健康', '健身房', '  WEIGHT TRAINING  ', 'exercise'],
    ['学习工作', '程序员', 'programming', 'code'],
    ['生活家务', '断舍离', 'declutter', 'tidy'],
    ['饮食', '甜品', 'dessert', 'cake'],
    ['心情休息', '入睡', 'snooze', 'sleep'],
    ['创作兴趣', '镜头', 'photography', 'camera'],
    ['社交家庭', '育儿', 'parenting', 'family'],
    ['出行财务', '收支', 'bookkeeping', 'wallet'],
  ];
  for (const [category, chinese, english, id] of bilingualAliases) {
    for (const query of [chinese, english]) {
      assert.ok(icons.findLibraryIcons('全部', query).some(icon => icon.id === id), `${query}: synonym finds ${id} without using its display label or ID`);
      assert.ok(icons.findLibraryIcons(category, query).some(icon => icon.id === id), `${query}: synonym works inside its category`);
      assert.equal(icons.findLibraryIcons(category === '饮食' ? '学习工作' : '饮食', query).some(icon => icon.id === id), false, `${query}: search respects category boundaries`);
    }
  }
  for (const [query, id] of [['deep breathing', 'breathe'], ['digital detox', 'unplug'], ['organisation', 'tidy'], ['favorite', 'star'], ['favourite', 'star'], ['aeroplane', 'travel']]) {
    assert.ok(icons.findLibraryIcons('全部', query).some(icon => icon.id === id), `${query}: common English phrases and spelling variants are searchable`);
  }
  assert.deepEqual(icons.findLibraryIcons('全部', '   '), all, 'Empty search retains the complete original library order');
  for (const category of icons.iconCategories) assert.ok(icons.findLibraryIcons(category, '').every(icon => icon.category === category));
  for (const invalid of [undefined, null, '', 'no-such-icon', '__proto__', 'constructor', 1, {}]) assert.equal(icons.getLibraryIcon(invalid), undefined);

  const legacy = { id: 'legacy', title: '保留原来的习惯', kind: 'walk', group: '健康', note: '', minutes: 0, enabled: true };
  const data = habits.cleanState({ version: 1, items: [legacy, { ...legacy, id: 'selected', iconId: 'swim' }], done: { '2026-09-16': ['selected'] } });
  assert.ok(habits.isReminderState(data));
  assert.equal(icons.habitIconId(data.items[0]), 'walk', 'Old records keep their existing artwork');
  assert.equal(icons.habitIconId(data.items[1]), 'swim');
  assert.equal(data.items[1].kind, 'walk', 'The optional icon does not replace the legacy kind');
  assert.equal(habits.cleanState(JSON.parse(JSON.stringify(data))).items[1].iconId, 'swim');
  assert.equal(habits.toggleReminderDone(data, 'selected', '2026-09-16').items[1].iconId, 'swim', 'Checking in cannot reset a selected icon');
  assert.equal(icons.habitIconId({ ...legacy, iconId: 'future-unknown-id' }), 'walk', 'Unknown icons from another client fall back safely');

  const note = { id: 'memo', title: '旅行记录', body: '', tags: ['生活'], color: 'sand', pinned: false, createdAt: '2026-09-16T00:00:00Z', updatedAt: '2026-09-16T00:00:00Z' };
  assert.ok(records.isMemoState({ version: 1, notes: [note] }), 'Existing notes need no migration');
  const memo = JSON.parse(JSON.stringify({ version: 1, notes: [{ ...note, iconId: 'travel' }] }));
  assert.ok(records.isMemoState(memo));
  assert.equal(memo.notes[0].iconId, 'travel');
  delete memo.notes[0].iconId;
  assert.ok(records.isMemoState(memo), 'Clearing a memo icon returns to the original record shape');
  console.log('Icon library data/assets: 64 original colour icons, source-matched grey outlines, deterministic atlas order, search, legacy habits, persistence, and optional memo icons passed.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
