// Keep generated developer-tool entry points aligned with the source project.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) : {};
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');

function syncLocalProjectConfig() {
  const project = read(path.join(root, 'project.config.json'));
  const local = read(path.join(root, 'project.private.config.json'));
  const workspace = path.dirname(root);
  // The root file is a generated convenience entry, not another source config.
  write(path.join(workspace, 'project.config.json'), { ...project, miniprogramRoot: 'miniprogram/dist/' });
  for (const directory of [workspace, root, path.join(root, 'dist')]) {
    if (!fs.existsSync(path.join(directory, 'project.config.json'))) continue;
    const file = path.join(directory, 'project.private.config.json');
    const current = read(file);
    write(file, {
      ...current,
      ...(local.libVersion ? { libVersion: local.libVersion } : {}),
      setting: { ...current.setting, urlCheck: false, compileHotReLoad: false,
        es6: false, enhance: false, uploadWithSourceMap: false, minified: true },
    });
  }
  console.log('Local WeChat settings synchronized: root, miniprogram and existing dist; URL checks and hot reload disabled.');
}
module.exports = { syncLocalProjectConfig };
if (require.main === module) syncLocalProjectConfig();
