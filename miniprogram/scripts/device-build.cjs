const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

// Use the same production runtime/API configuration as a normal build, but
// preserve function names and archive source maps outside the upload directory.
const root = path.resolve(__dirname, '..');
require('./check-weapp-project.cjs').checkProject(root);
const { deviceBuildEnvironment } = require('./device-build-config.cjs');
let buildEnvironment;
try { buildEnvironment = deviceBuildEnvironment(process.env, process.argv.slice(2)); }
catch (error) { console.error(error.message); process.exit(1); }
console.log(`Device API: ${buildEnvironment.TARO_APP_API_BASE_URL || 'https://ohtautau.com (project default)'}`);
console.log(`Device data: ${buildEnvironment.OTTLOG_MINIPROGRAM_PREVIEW === '1' ? 'isolated preview records' : 'normal accounts/storage'}`);
const result = spawnSync(process.execPath, [path.join(root, 'node_modules/@tarojs/cli/bin/taro'), 'build', '--type', 'weapp'], {
  cwd: root,
  stdio: 'inherit',
  env: buildEnvironment,
});
if (result.error) { console.error(result.error.message); process.exit(1); }
if (result.status !== 0) process.exit(result.status ?? 1);

const output = path.join(root, 'dist');
const maps = path.join(root, 'test-results', 'device-sourcemaps');
let bytes = 0;
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { collect(file); continue; }
    if (!entry.isFile()) continue;
    if (entry.name.endsWith('.map')) {
      const destination = path.join(maps, path.relative(output, file));
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(file, destination);
      fs.unlinkSync(file);
    } else {
      bytes += fs.statSync(file).size;
    }
  }
}
collect(output);
console.log(`Local dist files (before WeChat packaging): ${(bytes / 1024).toFixed(0)} KB. Source maps: ${maps}`);
require('./check-package-size.cjs');
const settings = JSON.parse(fs.readFileSync(path.join(output, 'project.config.json'), 'utf8')).setting;
if (settings.es6 || settings.enhance || settings.uploadWithSourceMap || !settings.minified) {
  console.error('WeChat upload settings must disable es6/enhance/uploadWithSourceMap and enable minified. Taro already transpiles the code; local file size does not include WeChat compiler overhead.');
  process.exit(1);
}
require('./check-weapp-bootstrap.cjs');
