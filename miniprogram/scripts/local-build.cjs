const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
require('./check-weapp-project.cjs').checkProject(root);
const privateConfig = path.join(root, 'project.private.config.json');
const config = fs.existsSync(privateConfig) ? JSON.parse(fs.readFileSync(privateConfig, 'utf8').replace(/^\uFEFF/, '')) : {};
// Only this project's local developer tool reads this ignored file.
config.setting = { ...config.setting, urlCheck: false };
fs.writeFileSync(privateConfig, JSON.stringify(config, null, 2) + '\n');
const args = [path.join(root, 'node_modules/@tarojs/cli/bin/taro'), 'build', '--type', 'weapp'];
if (process.argv.includes('--watch')) args.push('--watch');
const previewRecords = process.argv.includes('--preview-records');
const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', env: { ...process.env, OTTLOG_MINIPROGRAM_PREVIEW: previewRecords ? '1' : '0', TARO_APP_API_BASE_URL: process.env.TARO_APP_API_BASE_URL || 'http://127.0.0.1:5229' } });
if (result.error) { console.error(result.error.message); process.exit(1); }
process.exit(result.status ?? 1);
