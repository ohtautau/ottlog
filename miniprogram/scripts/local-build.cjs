const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
require('./check-weapp-project.cjs').checkProject(root);
const { syncLocalProjectConfig } = require('./local-project-config.cjs');
const { apiOrigin } = require('../config/api-endpoint.cjs');
syncLocalProjectConfig();
const args = [path.join(root, 'node_modules/@tarojs/cli/bin/taro'), 'build', '--type', 'weapp'];
if (process.argv.includes('--watch')) args.push('--watch');
const previewRecords = process.argv.includes('--preview-records');
console.log(`Mini-program API: ${apiOrigin()}`);
const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', env: { ...process.env, OTTLOG_LOCAL_DEBUG: '1', OTTLOG_MINIPROGRAM_PREVIEW: previewRecords ? '1' : '0', TARO_APP_API_BASE_URL: apiOrigin() } });
if (result.error) { console.error(result.error.message); process.exit(1); }
if (result.status === 0) syncLocalProjectConfig();
process.exit(result.status ?? 1);
