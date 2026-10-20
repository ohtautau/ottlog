const fs = require('node:fs');
const path = require('node:path');
const sharp = require('../../web/node_modules/sharp');

// Editable vectors stay in icon-library. Package small transparent PNGs so
// rendering never depends on native SVG support or the device's emoji font.
async function main() {
  const source = path.resolve(__dirname, '../icon-library');
  const output = path.resolve(__dirname, '../src/assets/icons');
  const names = fs.readdirSync(source).filter(file => file.endsWith('.svg')).sort();
  if (!names.length) throw new Error('The shared icon library is empty.');
  const rendered = [];
  for (const file of names) {
    const name = path.basename(file, '.svg');
    const png = await sharp(fs.readFileSync(path.join(source, file)))
      .resize(192, 192, { fit: 'contain' })
      .png({ palette: true, colours: 64, compressionLevel: 9, effort: 10 })
      .toBuffer();
    rendered.push({ name, png });
  }
  fs.mkdirSync(output, { recursive: true });
  for (const { name, png } of rendered) fs.writeFileSync(path.join(output, `${name}.png`), png);
  const bytes = rendered.reduce((total, item) => total + item.png.length, 0);
  console.log(`Generated ${rendered.length} shared library icons, ${(bytes / 1024).toFixed(1)} KB.`);

  if (process.argv.includes('--preview')) {
    const columns = 6, cellWidth = 156, cellHeight = 132;
    const width = columns * cellWidth, height = Math.ceil(rendered.length / columns) * cellHeight;
    const tiles = rendered.map(({ name }, index) => {
      const x = index % columns * cellWidth, y = Math.floor(index / columns) * cellHeight;
      return `<rect x="${x + 4}" y="${y + 4}" width="148" height="124" rx="12" fill="#223749"/><text x="${x + 16}" y="${y + 115}" font-family="Arial,sans-serif" font-size="14" fill="#e5edf2">${name}</text>`;
    }).join('');
    const base = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#101923"/>${tiles}</svg>`);
    const images = [];
    for (const [index, { png }] of rendered.entries()) {
      const left = index % columns * cellWidth, top = Math.floor(index / columns) * cellHeight;
      images.push({ input: await sharp(png).resize(76, 76).toBuffer(), left: left + 12, top: top + 16 });
      images.push({ input: await sharp(png).resize(32, 32).toBuffer(), left: left + 108, top: top + 42 });
    }
    const preview = path.resolve(__dirname, '../test-results/icon-library-new.png');
    fs.mkdirSync(path.dirname(preview), { recursive: true });
    await sharp(base).composite(images).png().toFile(preview);
    console.log(`Preview: ${preview}`);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
