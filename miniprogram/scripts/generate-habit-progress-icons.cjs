const fs = require('node:fs');
const path = require('node:path');
const sharp = require('../../web/node_modules/sharp');

// Editable SVG sources produce small packaged PNGs for reliable WeChat rendering.
async function main() {
  const source = path.join(__dirname, 'art/habit-progress');
  const target = path.join(__dirname, '../src/assets/habit-progress');
  fs.mkdirSync(target, { recursive: true });
  for (const name of ['bolt', 'fire']) {
    await sharp(path.join(source, `${name}.svg`)).resize(72, 72).png({ palette: true, colours: 64, compressionLevel: 9 }).toFile(path.join(target, `${name}.png`));
  }
  console.log('Generated 2 habit progress icons (72 × 72 PNG).');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
