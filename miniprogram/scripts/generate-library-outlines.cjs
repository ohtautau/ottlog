// Both colour and outline modes originate from the editable shared SVG files.
// Package one transparent PNG atlas for the native WeChat Image renderer.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('../../web/node_modules/sharp');
const { loadLibrary, sourceSvg, outlineSvg } = require('./library-icon-outline.cjs');

async function main() {
  const icons = loadLibrary();
  const rendered = [];
  for (const icon of icons) {
    const svg = sourceSvg(icon);
    const png = await sharp(Buffer.from(outlineSvg(svg, icon.id))).png().toBuffer();
    rendered.push({ icon, svg, png });
  }
  const composite = rendered.map(({ png }, index) => ({ input: png, left: index % 8 * 64, top: Math.floor(index / 8) * 64 }));
  const canvas = sharp({ create: { width: 512, height: 512, channels: 4, background: '#00000000' } }).composite(composite);
  const paletteOptions = { palette: true, compressionLevel: 9, effort: 10, dither: 0 };
  const eight = await canvas.clone().png({ ...paletteOptions, colours: 8 }).toBuffer();
  const sixteen = await canvas.clone().png({ ...paletteOptions, colours: 16 }).toBuffer();
  // Sixteen shades preserve small round details and thin diagonal edges. The
  // eight-shade comparison remains available in the output for budget review.
  const output = path.resolve(__dirname, '../src/assets/icons/outline-sheet.png');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, sixteen);
  console.log(`Generated ${icons.length} source-matched outlines in one 512x512 PNG; 8 colours ${eight.length} bytes, 16 colours ${sixteen.length} bytes; selected 16.`);

  if (process.argv.includes('--preview')) {
    const cellWidth = 180, cellHeight = 164, width = 8 * cellWidth, height = 8 * cellHeight;
    const cards = rendered.map(({ icon }, index) => {
      const x = index % 8 * cellWidth, y = Math.floor(index / 8) * cellHeight;
      return `<rect x="${x + 3}" y="${y + 3}" width="174" height="158" rx="10" fill="#b9dbca"/><text x="${x + 10}" y="${y + 147}" font-family="Arial,sans-serif" font-size="12" fill="#263c3e">${icon.id}</text>`;
    }).join('');
    const base = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#14212b"/>${cards}</svg>`);
    const samples = [];
    for (const [index, { svg }] of rendered.entries()) {
      const left = index % 8 * cellWidth, top = Math.floor(index / 8) * cellHeight;
      samples.push({ input: await sharp(Buffer.from(svg)).resize(54, 54).png().toBuffer(), left: left + 9, top: top + 38 });
      samples.push({ input: await sharp(sixteen).extract({ left: index % 8 * 64, top: Math.floor(index / 8) * 64, width: 64, height: 64 }).resize(112, 112).png().toBuffer(), left: left + 64, top: top + 14 });
    }
    const preview = path.resolve(__dirname, '../test-results/library-outline-preview.png');
    fs.mkdirSync(path.dirname(preview), { recursive: true });
    await sharp(base).composite(samples).png().toFile(preview);
    console.log(`Preview: ${preview}`);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
