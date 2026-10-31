# Ottlog.Web

Next.js + TypeScript 网页，通过 Ottlog.Web.esproj 纳入 Visual Studio。

正式站点为[https://ohtautau.com](https://ohtautau.com)，新加坡运行；小程序单独使用https://api.ohtautau.com。当前线上网页为Next16.4.3，部署与验收见[API直连与网页](../docs/api-direct-access.md)。

启动、配置、写作功能和测试步骤以仓库根目录 [README](../README.md) 与 [测试说明](../docs/testing.md) 为准。

- `npm.cmd run dev`：网页开发服务器，端口 3000。
- `npm.cmd run build` / `npm.cmd start`：生产构建和运行。
- `npm.cmd run lint`：代码检查。
- `npm.cmd run build:tools`：从小程序源码重新生成网页共用工具；`dev`／`build`会自动先执行此步骤，修改共用源码后重建并刷新。
- `npm.cmd run test:tool-workspace`：新版工具工作区回归；需要独立测试数据库的本地API及3100端口网页，详见[功能对齐与验收](../docs/web-parity.md)。
- `npm.cmd run test:desktop-layout`：任务、领域列表／详情、习惯、便签、专注和统计的桌面同屏／内部滚动／弹窗检查，覆盖1366×768／1440×900／1920×1080／1024×768／1280×600，沿隔离测试环境运行。
- `npm.cmd run test:e2e`：桌面、手机和 API 回归；先构建前后端并释放测试端口。
- `npm.cmd run test:first-run`：旧数据库升级、首次账户、持久化与会话撤销验证；需要 Node.js 24 和本地 dotnet-ef 工具。

生产 API 地址通过 API_BASE_URL 配置，更改后重新构建。开发默认后端 http://127.0.0.1:5229。

Vercel 导入 GitHub 仓库时将 Root Directory 设为 `web`，并设置独立后端的 HTTPS `API_BASE_URL`。网站和小程序继续共用 Ottlog 账号；Supabase 工具存储、建表与旧数据迁移见 [云部署说明](../docs/cloud-deployment.md)。

当前日常工具共用`../miniprogram/src`的生产页面、组件与业务逻辑，`shared-app/`负责浏览器平台与宽屏响应式展示。构建产物通过custom element中的独立React root挂载到原Next页面DOM，CSS限定作用域；工具入口共用原网站导航。根地址服务端跳转今日`/today`，原选项页保留在`/options`。网页登录可选择记住30天，默认不勾选；账号页与今日账号窗口共用同一控件。食选和餐单游戏已退役，饮食功能也已移除，`/eat`、`/eat/legacy`和`/meals`只重定向`/today`；旧存档保持兼容。

六个主要工具页在≥900px使用真实剩余视口，标题／主要操作固定可见，长列表、分析和历史在区域内滚动。`shared-app/desktop-viewport.css`负责公共框架、任务／便签及弹窗，另两份`desktop-domains-habits.css`、`desktop-focus-statistics.css`补充专属布局。ResizeObserver更新实际`--app-page-height`；fixed弹窗仍按真实viewport定位，宽屏分栏且固定标题／底栏，保留原关闭、保存与取消。

构建环境须同时提供`../miniprogram/src`；Vercel需允许访问Root Directory之外的仓库源码。Dockerfile已包含该构建输入。`public/tool-app/`为可重新生成的JS／CSS／素材，不手工维护或提交，不再生成独立HTML工具文档。

部署配置检查：`node scripts/check-api-origin.mjs`。共享 API 冒烟检查：先构建后端 `PersonalTools` 配置并在 3100 启动网页开发服务，再运行 `node scripts/check-shared-api.mjs`；脚本使用独立临时数据库，需空闲的 5229 端口。
