// Native Image works consistently in WeChat. Generate lightweight board PNGs
// from the exact polygons used for touch hit testing; no CSS clipping required.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const sharp = require('../../web/node_modules/sharp');
const input = fs.readFileSync(path.join(__dirname, '../src/lib/choice-aligned-geometry.ts'), 'utf8');
const model = { exports: {} };
new Function('module', 'exports', ts.transpileModule(input, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(model, model.exports);
const { makeAlignedChoiceRegions, alignedChoiceSurfaces } = model.exports;
async function main() {
  const root = path.join(__dirname, '../src/assets/choice');
  fs.mkdirSync(root, { recursive: true });
  let bytes = 0;
  for (let count = 2; count <= 9; count += 1) {
    const polygons = makeAlignedChoiceRegions(count).map(({ points }, index) => `<polygon points="${points.map(([x, y]) => `${x * 750},${y * 1000}`).join(' ')}" fill="${alignedChoiceSurfaces[index]}" stroke="${alignedChoiceSurfaces[index]}" stroke-width="1"/>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="750" height="1000" viewBox="0 0 750 1000">${polygons}</svg>`;
    const buffer = await sharp(Buffer.from(svg)).png({ palette: true, compressionLevel: 9 }).toBuffer();
    fs.writeFileSync(path.join(root, `layout-${count}.png`), buffer);
    bytes += buffer.length;
  }
  console.log(`Generated 8 symmetric choice boards: ${(bytes / 1024).toFixed(1)} KB.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
