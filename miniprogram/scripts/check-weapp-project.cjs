const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

function checkProject(directory, { privateConfig = true } = {}) {
  const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  const project = read(path.join(directory, 'project.config.json'));
  const privateFile = path.join(directory, 'project.private.config.json');
  const local = privateConfig && fs.existsSync(privateFile) ? read(privateFile) : {};
  const settings = { ...project.setting, ...local.setting };
  for (const key of ['es6', 'enhance', 'uploadWithSourceMap']) {
    assert.equal(settings[key], false, `${directory}: ${key} must be false; Taro already compiles JavaScript. Check project.config.json and private overrides.`);
  }
  assert.equal(settings.minified, true, `${directory}: minified must remain true.`);
  return settings;
}

module.exports = { checkProject };
if (require.main === module) {
  checkProject(path.resolve(__dirname, '..'));
  console.log('PASS WeChat project settings: no duplicate JavaScript transform or uploaded source maps, including private overrides.');
}
