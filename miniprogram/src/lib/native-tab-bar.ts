/** Native tabBar owns its bottom safe area; page-level sheets stop above it. */
export const nativeTabBarItems = [
  { pagePath: 'pages/index/index', text: '今日', iconPath: 'assets/tab-home.png', selectedIconPath: 'assets/tab-home-active.png' },
  { pagePath: 'pages/todos/index', text: '待办', iconPath: 'assets/tab-todos.png', selectedIconPath: 'assets/tab-todos-active.png' },
  { pagePath: 'pages/domains/index', text: '领域', iconPath: 'assets/tab-categories.png', selectedIconPath: 'assets/tab-categories-active.png' },
  { pagePath: 'pages/daily/index', text: '习惯', iconPath: 'assets/tab-daily.png', selectedIconPath: 'assets/tab-daily-active.png' },
  { pagePath: 'pages/favorites/index', text: '我的', iconPath: 'assets/tab-profile.png', selectedIconPath: 'assets/tab-profile-active.png' },
];
