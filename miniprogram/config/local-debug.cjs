const { syncLocalProjectConfig } = require('../scripts/local-project-config.cjs');

module.exports = ctx => {
  if (process.env.OTTLOG_LOCAL_DEBUG !== '1') return;
  // Taro cleans dist on rebuild. Restore its private settings on every watch
  // compilation too, without relying on the parent watch process exiting.
  ctx.onBuildFinish(({ error, stats }) => {
    if (!error && !stats?.hasErrors()) syncLocalProjectConfig();
  });
};
