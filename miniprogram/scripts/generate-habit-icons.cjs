const fs = require('node:fs');
const path = require('node:path');
const sharp = require('../../web/node_modules/sharp');

// The web SVGs are the editable source for both clients. WeChat gets packaged
// PNGs so icon colours and shapes never depend on device fonts or SVG support.
async function main() {
  const source = path.resolve(__dirname, '../../web/public/habit-icons');
  const output = path.resolve(__dirname, '../src/assets/habits');
  const model = fs.readFileSync(path.resolve(__dirname, '../src/lib/reminder-data.ts'), 'utf8');
  const scenes = model.match(/export const scenes = \{([\s\S]*?)\} as const;/)?.[1];
  if (!scenes) throw new Error('Habit scene registry was not found.');
  const names = [...scenes.matchAll(/([a-z]+):\s*"/g)].map(match => match[1]);
  if (!names.length) throw new Error('Habit scene registry is empty.');
  const present = fs.readdirSync(source).filter(name => name.endsWith('.svg')).map(name => path.basename(name, '.svg'));
  if (names.some(name => !present.includes(name)) || present.some(name => !names.includes(name))) {
    throw new Error('Habit SVG files must match the scene registry exactly.');
  }
  const rendered = [];
  for (const name of names) {
    const svg = fs.readFileSync(path.join(source, `${name}.svg`));
    const png = await sharp(svg).resize(192, 192, { fit: 'contain' }).png({ palette: true, colours: 128, compressionLevel: 9 }).toBuffer();
    rendered.push({ name, png });
  }
  fs.mkdirSync(output, { recursive: true });
  for (const { name, png } of rendered) fs.writeFileSync(path.join(output, `${name}.png`), png);
  const bytes = rendered.reduce((total, item) => total + item.png.length, 0);
  console.log(`Generated ${names.length} shared colour habit icons, ${(bytes / 1024).toFixed(1)} KB.`);

  if (process.argv.includes('--preview')) {
    const columns = 6, cellWidth = 156, cellHeight = 132;
    const width = columns * cellWidth, height = Math.ceil(names.length / columns) * cellHeight;
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
    const preview = path.resolve(__dirname, '../test-results/habit-icons-colour.png');
    fs.mkdirSync(path.dirname(preview), { recursive: true });
    await sharp(base).composite(images).png().toFile(preview);
    console.log(`Preview: ${preview}`);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
