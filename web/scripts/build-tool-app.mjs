import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import postcss from 'postcss';
const root = path.resolve(import.meta.dirname, '..');
const mini = path.resolve(root, '../miniprogram/src');
const require = createRequire(path.join(root, 'package.json'));
const output = path.join(root, 'public/tool-app');
const pages = ['index', 'todos', 'memos', 'articles', 'domains', 'domain-detail', 'daily', 'pomodoro', 'mottos', 'statistics'];
function browserCss(source) {
  const media = [];
  const converted = source.replace(/@media[^{}]+/g, text => `@BROWSER_MEDIA_${media.push(text) - 1}@`)
    .replace(/(\d+(?:\.\d+)?)(?:d|s)?vh/g, (_, n) => `calc(var(--app-page-height) * ${Number(n) / 100})`)
    .replace(/(?<![-\w.])(page|scroll-view|picker-view-column|picker-view|rich-text|view|text|image|picker)(?=[\s{,.:>\[]|$)/g, (_, tag) => ({ page: '.tool-app-root', text: 'span', image: 'img' }[tag] || 'div'))
    .replace(/(-?\d*\.?\d+)r?px\b/g, (_, n) => `calc(var(--app-unit) * ${Number(n)})`)
    .replace(/@BROWSER_MEDIA_(\d+)@/g, (_, i) => media[Number(i)]);
  const css = postcss.parse(converted), animations = new Map();
  css.walkAtRules(/keyframes$/, rule => { animations.set(rule.params, `ottlog-tool-${rule.params}`); rule.params = `ottlog-tool-${rule.params}`; });
  css.walkRules(rule => {
    if (rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
    rule.selectors = [...new Set(rule.selectors.map(selector => {
      const scoped = selector.replace(/:root\b/g, '.tool-app-root');
      return scoped.includes('.tool-app-root') ? scoped : `.tool-app-root ${scoped}`;
    }))];
  });
  css.walkDecls(/^animation(?:-name)?$/, declaration => {
    declaration.value = declaration.value.replace(/\b[a-zA-Z_][\w-]*\b/g, name => animations.get(name) || name);
  });
  return css.toString();
}
await fs.mkdir(output, { recursive: true });
await build({
  stdin: { contents: `${pages.map((p, i) => `import Page${i} from ${JSON.stringify(path.join(mini, 'pages', p, 'index.tsx'))};`).join('\n')}
    import {registerTools} from './shared-app/shell.jsx';
    import MottoWidget from './shared-app/motto-widget.jsx';
    import ${JSON.stringify(path.join(mini, 'app.css'))};
    import './shared-app/desktop.css';
    import './shared-app/desktop-viewport.css';
    import './shared-app/desktop-domains-habits.css';
    import './shared-app/desktop-focus-statistics.css';
    import './shared-app/category-controls.css';
    import './shared-app/mobile-layout.css';
    registerTools({${pages.map((p, i) => `${JSON.stringify(`pages/${p}/index`)}:Page${i}`).join(',')},'pages/motto-widget/index':MottoWidget});`, resolveDir: root, loader: 'tsx' },
  bundle: true, platform: 'browser', format: 'esm', outfile: path.join(output, 'app.js'), jsx: 'automatic', minify: true, nodePaths: [path.join(root, 'node_modules')],
  define: { API_BASE_URL: '""', MINIPROGRAM_PREVIEW: 'false', 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'browser-personal-tools', setup(builder) {
    builder.onResolve({ filter: /(?:^|\/)login-preference$/ }, args => path.resolve(args.resolveDir, args.path) === path.join(mini, 'components/login-preference') ? { path: path.join(root, 'shared-app/login-preference.tsx') } : undefined);
    builder.onResolve({ filter: /(?:^|\/)todo-drag$/ }, args => path.resolve(args.resolveDir, args.path) === path.join(mini, 'components/todo-drag') ? { path: path.join(root, 'shared-app/todo-drag.jsx') } : undefined);
    builder.onResolve({ filter: /(?:^|\/)desktop-notifications$/ }, args => path.resolve(args.resolveDir, args.path) === path.join(mini, 'lib/desktop-notifications') ? { path: path.join(root, 'shared-app/desktop-notifications.ts') } : undefined);
    builder.onResolve({ filter: /(?:^|\/)tool-platform$/ }, args => path.resolve(args.resolveDir, args.path) === path.join(mini, 'lib/tool-platform') ? { path: path.join(root, 'shared-app/tool-platform.ts') } : undefined);
    builder.onResolve({ filter: /^@tarojs\/(taro|components)$/ }, args => ({ path: path.join(root, 'shared-app', args.path.endsWith('/taro') ? 'platform.jsx' : 'components.jsx') }));
    builder.onResolve({ filter: /^react(?:-dom)?(?:\/.*)?$/ }, args => ({ path: require.resolve(args.path) }));
    builder.onResolve({ filter: /(?:^|\/)api$/ }, args => path.resolve(args.resolveDir, args.path) === path.join(mini, 'api') ? { path: path.join(root, 'shared-app/api.ts') } : undefined);
    builder.onLoad({ filter: /\.css$/ }, async args => ({ loader: 'css', contents: args.path.startsWith(mini) ? browserCss(await fs.readFile(args.path, 'utf8')) : await fs.readFile(args.path, 'utf8') }));
  } }],
});
await fs.cp(path.join(mini, 'assets'), path.join(output, 'assets'), { recursive: true });
await fs.copyFile(path.join(mini, 'components/search-symbol.css'), path.join(output, 'search-symbol.css'));
await fs.mkdir(path.join(output, 'pages/pomodoro/assets'), { recursive: true });
for (const name of ['tomato-focus.png', 'tomato-rest.png']) await fs.copyFile(path.join(mini, 'assets/pomodoro', name), path.join(output, 'pages/pomodoro/assets', name));
await fs.rm(path.join(output, 'index.html'), { force: true });
console.log('Built shared personal tools from mini-program source (production browser platform, no fixtures).');
