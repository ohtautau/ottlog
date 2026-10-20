// Rasterize the existing web vector artwork; keep live time/progress native.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const esbuild = require('../node_modules/esbuild');
const sharp = require('../../web/node_modules/sharp');
const source = fs.readFileSync(path.resolve(__dirname, '../../web/src/app/pomodoro/tomato-scene.tsx'), 'utf8')
  .replace('import styles from "./pomodoro.module.css";', 'const styles = {tomato:"tomato",dial:"dial",fruit:"fruit",floatingSeeds:"floatingSeeds",sweep:"sweep"};');
const compiled = esbuild.transformSync(source, { loader: 'tsx', format: 'cjs', jsx: 'automatic' });
const sceneModule = new Module(__filename, module);
sceneModule.paths = module.paths;
sceneModule._compile(compiled.code, __filename);
async function main() {
  const output = path.resolve(__dirname, '../src/assets/pomodoro');
  fs.mkdirSync(output, { recursive: true });
  for (const resting of [false, true]) {
    const svg = renderToStaticMarkup(React.createElement(sceneModule.exports.default, { progress: 0, running: false, resting }))
      .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
      .replace(/<g class="dial">[\s\S]*?<\/g>/, '')
      .replace(/<path class="sweep"[^>]*><\/path>|<path class="sweep"[^>]*\/>/, '')
      .replace(/<g fill="#98afc4"[\s\S]*?<\/g>/, '');
    const file = path.join(output, resting ? 'tomato-rest.png' : 'tomato-focus.png');
    await sharp(Buffer.from(svg)).resize(960, 860).png({ palette: true, colours: 128 }).toFile(file);
    console.log(`${path.basename(file)}: ${Math.round(fs.statSync(file).size / 1024)} KB`);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
