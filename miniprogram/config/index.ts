import { defineConfig } from '@tarojs/cli';
const deviceDebug = process.env.TARO_DEVICE_DEBUG === '1';
export default defineConfig({
  projectName: 'ottlog', date: '2026-09-07', designWidth: 750,
  deviceRatio: { 640: 1.17, 750: 1, 828: 0.905 }, sourceRoot: 'src', outputRoot: 'dist',
  // Shortcut icons reuse the existing coloured library and its outline atlas.
  // Only active native tabs enter the package.
  // Timer artwork belongs to its sole consuming subpackage, without a main copy.
  copy: { patterns: [
    { from: 'src/assets', to: 'dist/assets', ignore: ['**/pomodoro/**', '**/summary-radar/demo.png', '**/tab-favorites*.png', '**/tab-pomodoro*.png', '**/tab-posts*.png'] },
    { from: 'src/assets/pomodoro', to: 'dist/pages/pomodoro/assets' },
  ], options: {} },
  framework: 'react', compiler: 'webpack5', plugins: ['@tarojs/plugin-platform-weapp'],
  ...(deviceDebug ? { terser: { config: { keep_fnames: true, keep_classnames: true } } } : {}),
  defineConstants: { API_BASE_URL: JSON.stringify(process.env.TARO_APP_API_BASE_URL || 'https://ohtautau.com'), MINIPROGRAM_PREVIEW: JSON.stringify(process.env.OTTLOG_MINIPROGRAM_PREVIEW === '1') },
  mini: {
    // Taro's sub-common relocation assumes JSONP registration and breaks the
    // CommonJS runtime below. Page code/styles still live in their subpackages.
    optimizeMainPackage: { enable: false },
    // Mini-programs provide synchronous CommonJS require. Register factories
    // through those module exports instead of the mutable wx.webpackJsonp queue,
    // whose stale chunk IDs can suppress the current compilation's factories.
    output: { chunkFormat: 'commonjs', chunkLoading: 'require' },
    // Each page loads the shared runtime explicitly. DevTools can evaluate page
    // modules separately; relying solely on app.js leaves registration fragile.
    addChunkPages(pages, pageNames) {
      (pageNames || []).forEach(name => pages.set(name, ['runtime', 'vendors', 'taro', 'common']));
    },
    // Taro's cosmetic webpackbar plugin uses options removed by patched Webpack.
    webpackChain(chain) {
      chain.plugins.delete('webpackbar');
      // Compress the device package but retain useful stack-frame names.
      // device-build.cjs archives maps outside dist before uploading.
      if (deviceDebug) {
        chain.optimization.minimize(true);
        chain.devtool('hidden-source-map');
      }
    },
    postcss: { pxtransform: { enable: true }, url: { enable: true, config: { limit: 1024 } }, cssModules: { enable: false } }
  }
});
