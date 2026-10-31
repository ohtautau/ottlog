const { sources } = require('webpack');

// Taro emits Skyline-only padding even when the app uses WebView rendering.
// Register the CLI hook: a config-level callback is overwritten by Taro CLI.
module.exports = ctx => {
  ctx.modifyBuildAssets(({ assets }) => {
    for (const [name, asset] of Object.entries(assets)) {
      if (!name.endsWith('.wxml')) continue;
      const original = String(asset.source());
      const updated = original.replace(/<scroll-view\b[^>]*>/g, tag => tag.replace(/\s+padding="[^"]*"/g, ''));
      if (updated !== original) assets[name] = new sources.RawSource(updated);
    }
    return assets;
  });
};
