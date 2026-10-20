const assert = require('node:assert/strict');
const { deviceBuildEnvironment } = require('./device-build-config.cjs');
for (const base of ['http://127.0.0.1:5229', 'http://127.1', 'http://2130706433', 'http://localhost:5229', 'http://LOCALHOST.:5229', 'http://api.localhost', 'http://[::1]:5229']) {
  assert.throws(() => deviceBuildEnvironment({ TARO_APP_API_BASE_URL: base }), /loopback/, base);
}
for (const base of ['https://example.test', 'http://192.168.31.235:5229', 'http://10.0.0.2:5229']) {
  assert.equal(deviceBuildEnvironment({ TARO_APP_API_BASE_URL: base }).TARO_APP_API_BASE_URL, base);
}
assert.throws(() => deviceBuildEnvironment({ TARO_APP_API_BASE_URL: 'invalid' }), /valid HTTP/);
assert.throws(() => deviceBuildEnvironment({ TARO_APP_API_BASE_URL: 'file:///tmp/api' }), /use HTTP/);
const original = { EXAMPLE: 'keep', OTTLOG_MINIPROGRAM_PREVIEW: '0' };
assert.equal(deviceBuildEnvironment(original, ['--preview-records']).OTTLOG_MINIPROGRAM_PREVIEW, '1');
assert.equal(deviceBuildEnvironment(original).OTTLOG_MINIPROGRAM_PREVIEW, '0');
assert.equal(deviceBuildEnvironment({ OTTLOG_MINIPROGRAM_PREVIEW: '1' }).OTTLOG_MINIPROGRAM_PREVIEW, '1');
assert.equal(deviceBuildEnvironment({}).TARO_APP_API_BASE_URL, undefined);
assert.equal(deviceBuildEnvironment(original).EXAMPLE, 'keep');
assert.equal(original.OTTLOG_MINIPROGRAM_PREVIEW, '0');
console.log('PASS device build configuration: loopback rejected before compilation; LAN/HTTPS, preview isolation, normal defaults and existing environment preserved.');
