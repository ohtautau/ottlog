import { defineConfig } from '@tarojs/cli';
import path from 'node:path';
const { apiOrigin } = require('./api-endpoint.cjs');
const deviceDebug = process.env.TARO_DEVICE_DEBUG === '1';
export default defineConfig({
  projectName: 'ottlog', date: '2026-09-07', designWidth: 750,
  deviceRatio: { 640: 1.17, 750: 1, 828: 0.905 }, sourceRoot: 'src', outputRoot: 'dist',
  // Shortcut icons reuse the existing coloured library and its outline atlas.
  // Only active native tabs enter the package.
  // Timer artwork stays alongside the focus tab, without a duplicate assets copy.
  copy: { patterns: [
    { from: 'src/assets', to: 'dist/assets', ignore: ['**/pomodoro/**'] },
    { from: 'src/assets/pomodoro', to: 'dist/pages/pomodoro/assets' },
  ], options: {} },
  framework: 'react', compiler: 'webpack5', plugins: [
    '@tarojs/plugin-platform-weapp',
    path.resolve(__dirname, 'webview-scroll-view.cjs'),
    path.resolve(__dirname, 'local-debug.cjs'),
  ],
  ...(deviceDebug ? { terser: { config: { keep_fnames: true, keep_classnames: true } } } : {}),
  defineConstants: { API_BASE_URL: JSON.stringify(apiOrigin()), MINIPROGRAM_PREVIEW: JSON.stringify(process.env.OTTLOG_MINIPROGRAM_PREVIEW === '1') },
  mini: {
    // markdown-it ships modern ESM; DevTools' preview uploader still parses
    // dependencies without optional chaining. Compile it through our Babel rule.
    compile: { include: [path.resolve(__dirname, '../node_modules/markdown-it')] },
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
