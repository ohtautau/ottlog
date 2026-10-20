import { nativeTabBarItems } from './lib/native-tab-bar';

export default defineAppConfig({
  // Keep tab pages in the main package; existing links and shared page paths stay stable.
  pages: nativeTabBarItems.map(item => item.pagePath),
  subPackages: [
    { root: 'pages/posts', pages: ['index'] },
    { root: 'pages/categories', pages: ['index'] },
    { root: 'pages/detail', pages: ['index'] },
    { root: 'pages/journal', pages: ['index'] },
    { root: 'pages/memos', pages: ['index'] },
    { root: 'pages/choose', pages: ['index'] },
    { root: 'pages/meals', pages: ['index'] },
    { root: 'pages/mottos', pages: ['index'] },
    { root: 'pages/pomodoro', pages: ['index'] },
    { root: 'pages/domain-detail', pages: ['index'] },
    { root: 'pages/statistics', pages: ['index'] },
    ...(MINIPROGRAM_PREVIEW ? [{ root: 'pages/preview-data', pages: ['index'] }] : []),
  ],
  window: { navigationBarTitleText: 'Ottlog', navigationBarBackgroundColor: '#101923', navigationBarTextStyle: 'white', backgroundColor: '#101923', backgroundTextStyle: 'light' },
  tabBar: { color: '#8f9fae', selectedColor: '#b9dbca', backgroundColor: '#101923', borderStyle: 'black', list: nativeTabBarItems }
});
