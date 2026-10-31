# Ottlog

Next.js + TypeScript 响应式博客、ASP.NET Core Web API、SQLite 和 Taro 微信小程序。通过 Visual Studio 统一管理三个项目。

正式网页：[ohtautau.com](https://ohtautau.com)；小程序API：[api.ohtautau.com](https://api.ohtautau.com/health)。服务位于新加坡，小程序默认HTTPS直连，不依赖电脑3300隧道；小程序暂未发布，开发者工具验收状态及部署方式见[直连与正式网页](docs/api-direct-access.md)。

## 目录与入口

| 目录 | 用途 |
| --- | --- |
| `miniprogram/` | Taro 小程序源码、构建配置和验证脚本；当前主要开发入口 |
| `web/` | Next.js 网站，独立依赖与构建 |
| `backend/Ottlog.Api/` | 共用 .NET API、解决方案与数据库迁移 |
| `deploy/`、`supabase/` | 容器部署配置与 Supabase 迁移 |
| `docs/` | 使用、开发、调试和决策文档 |
| `scripts/` | 仓库级备份、导出和健康检查工具 |
| `content/`、`logos/` | 内容来源和品牌设计素材 |

本机依赖放在 `.tools/`，验证输出放在 `artifacts/` 或各项目 `test-results/`，备份放在 `backups/`，本地状态保留在 `local-state/`；这些内容不提交、不进入 Docker 构建上下文。详见[目录与文件管理](docs/repository-layout.md)。

## 开发文档

开发前阅读 [AGENTS.md](AGENTS.md)、[Design.md](Design.md) 和 [开发说明](docs/development.md)。2026-10-04 已确认后续功能开发仅修改小程序；12 项正式规则、当前实现缺口及已知工程问题集中在 [决策记录](docs/decisions.md)，完整索引见 [文档目录](docs/README.md)。

## 本地启动

网页根地址直接进入今日`/today`，原选项页保留在`/options`；日常工具整合进原网站导航，包含今日、任务、便签、领域、习惯、专注、统计和格言。共用小程序业务代码直接挂载到原网页，以电脑宽屏为主并自适应小屏；保存沿原账号与共用API。「吃什么」及「餐单与游戏」已退役，饮食功能也已在两端退役，`/eat`、`/eat/legacy`和`/meals`转到`/today`，旧存档保留兼容。详见[网页功能对齐](docs/web-parity.md)及[选境与网页入口](docs/options-web.md)。

1. 安装 .NET 10 SDK、Node.js 24，以及 VS 的 ASP.NET/Web 开发、JavaScript/TypeScript 项目组件。
2. 打开 `backend/Ottlog.Api/Ottlog.slnx`，将 `Ottlog.Api` 设为启动项目。
3. 运行配置选择 **Ottlog**，按 F5。API 自动启动 Next.js；浏览器从 5229 等待页跳转至 `http://localhost:3000`。
4. 管理员首次在本机访问 `http://localhost:3000/admin` 创建账号，密码至少 12 位。初始化完成后，管理员和读者均从 `/account` 统一登录，系统按账号权限显示界面。
5. 用 Shift+F5 停止；不要同时在 VS 和终端重复启动。

首次依赖还原可以在 `web` 和 `miniprogram` 目录分别运行 `npm.cmd ci`，再生成解决方案。PowerShell 使用 `npm.cmd`，避免 npm.ps1 执行策略限制。

- 3000：PC/手机博客网页。
- 5229：HTTP API，直接打开显示 JSON 是正常行为。
- 7120：只有选择后端 https 配置时才使用。
- 手机与电脑在同一局域网时访问 `http://电脑IPv4:3000`；必要时允许 Node.js 专用网络防火墙通信。首次管理员创建须在电脑 localhost 完成。

## 写作与管理

- **地址**：首次保存自动生成稳定地址；勾选“自定义文章地址”可修改。修改标题不改变地址，修改已发布地址会使旧链接失效。
- **摘要**：可留空，公开列表和 RSS 自动截取正文，原始摘要字段仍为空，后续正文更新时重新计算。
- **封面**：默认取正文第一张本地 Markdown 图片，没有则使用默认插画。取消自动选封面可填写本地图片地址，也可以上传 PNG/JPEG/WebP（最多 5 MB）。上传自定义封面自动切换为自定义模式。
- **标签**：点击已有标签添加/移除，也可输入逗号分隔的新标签。
- **管理列表**：支持标题/地址/分类/标签搜索、发布状态筛选、分类筛选，以及日期升降序、标题升序排序。
- **正文**：默认左侧 Markdown、右侧实时预览；小屏上下排列。支持纯代码、纯预览和独立窗口。工具栏提供标题、粗体、斜体、引用、列表、任务、链接、代码块、表格和图片。
- **快捷键**：正文内 Ctrl/⌘+B 加粗，Ctrl/⌘+S 保存草稿。独立窗口实时同步主页面；关闭主页面前需保存。浏览器拦截弹窗时会提示。
- **发布渠道**：使用“保存草稿”保存不公开文章；点击“发布文章”必须至少勾选博客网站或微信小程序。将已发布文章保存为草稿会取消两端公开。博客公开文章进入 RSS 和网站地图；小程序只读小程序公开文章。渠道是展示范围，不是保密边界。
- **评论**：读者提交后待审；管理员在管理区审核或删除。

## 账号、收藏与入口

网页右上角“登录 / 注册”是所有账号的统一入口，注册创建普通读者账号。同一读者账号可在网页和小程序登录，收藏存入 SQLite，跨设备同步。各端仅显示该端已公开的收藏文章；文章删除时收藏记录随之删除。

管理员账号与读者账号权限分离。管理员与读者统一从 `/account` 登录，管理员登录成功后进入后台，右上角账号菜单显示文章管理、评论审核；页脚不再展示后台管理入口。隐藏入口不替代服务端权限检查。

旧版本的浏览器/小程序本地收藏不会自动归入某个账号，以免把共用设备上的收藏归给错误的用户；可登录后重新收藏。当前没有邮箱找回密码或微信授权登录。

## RSS

页脚 RSS 入口打开 `/subscribe`，说明订阅步骤并可复制正式订阅地址 `https://ohtautau.com/feed.xml`。原始 `/feed.xml` 是给 RSS 阅读器解析的 XML，直接用浏览器查看代码属于正常情况。正式域名需上线后才能订阅，本地可访问 `http://localhost:3000/feed.xml`。

参考：[WordPress RSS 说明](https://wordpress.com/support/feeds/)、[Ghost 管理员入口](https://ghost.org/help/how-do-i-login-to-ghost-admin/)。

## 数据与升级

SQLite 数据库、上传图片、会话加密密钥默认保存在 `backend/Ottlog.Api/App_Data/`。请备份整个数据目录，不能只保留数据库而丢掉图片和密钥。

EF Core 启动时自动迁移。此次升级保留原文章内容和封面，旧的已发布文章保持博客与小程序双端公开；草稿保持不公开。`Content/Posts/*.md` 只在首次初始化时作为示例导入，之后请通过后台编辑数据库中的文章。

## 验证

2026-10-06 网站发布与双端数据同步按 [GitHub、Vercel 与 Supabase](docs/cloud-deployment.md) 进行：Vercel 项目根目录选择 `web`，原 .NET API 独立托管，可选 Supabase 工具存储保留现有账号与业务 ID。云账号配置与真实数据迁移需按文档完成，本地验证不等于线上同步已完成。

先停止 VS 调试，释放 3000、5229、5231 端口。在仓库根目录运行：

```powershell
dotnet build backend/Ottlog.Api/Ottlog.Api.csproj
cd web
npm.cmd run lint
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run test:first-run
cd ../miniprogram
npm.cmd run typecheck
npm.cmd run build:weapp
```

浏览器测试使用独立临时数据库，不复用你的日常数据库。包含桌面/模拟手机布局、编辑发布、上传、评论、账号权限、收藏同步、渠道隔离、RSS、独立编辑窗口与管理筛选。首次启动测试还验证旧数据库升级、重启保留内容和密码变更撤销会话。

详细手测步骤见 [测试说明](docs/testing.md)。

## 小程序与部署状态

小程序包含四象限待办、习惯打卡、专注、便签、文章、格言、领域目标与统计；两端选境、网页分类城市及饮食功能均已退役。底部导航为「今日、待办、专注、领域、习惯」。完整范围、预览与真机检查见 [小程序使用说明](docs/miniprogram.md)。

待办支持红黄蓝绿四象限、循环任务、顺序下一步和每区已完成折叠，见 [任务使用说明](docs/todo-miniprogram.md)。微信订阅提醒已完成代码接入，当前默认关闭；模板和服务端凭据配置见 [微信提醒配置](docs/wechat-reminders.md)。

首页「开始番茄钟」点击即开始，默认 25 分钟专注、5 分钟休息、每四轮后 15 分钟长休息，支持自定义和三种节点通知。见 [番茄钟使用说明](docs/pomodoro-miniprogram.md)；微信通知需按 [番茄钟通知配置](docs/wechat-pomodoro.md) 开通。

小程序源码在 `miniprogram/`，产物在 `miniprogram/dist/`。在 miniprogram 目录运行 `npm.cmd run debug:config` 可同步三个开发者工具入口的本地配置；推荐导入 `miniprogram/dist`。模拟器用 `build:local` 或 `dev:weapp`，默认连接 `http://127.0.0.1:5229`。真机用 `build:device` 并显式提供手机可达接口；正式构建用 `build:weapp`，默认 `https://ohtautau.com`，需有效 HTTPS 接口和后台合法域名。`TARO_APP_API_BASE_URL` 可覆盖接口，更改后重新构建。详见[真机调试](docs/device-debugging.md)。

`deploy/compose.yml`、`deploy/Caddyfile` 与前后端 Dockerfile 已准备，生产配置指向 ohtautau.com。服务器、HTTPS 域名配置、真实小程序 AppID 和微信上线审核尚未完成；编译成功不代表真机验收或正式上线。Taro 依赖仍有审计告警，不能宣称依赖安全审计全部通过。

## Markdown 公式

网页正文、编辑预览及独立窗口支持 KaTeX 公式，工具栏可直接插入行内公式或公式块。

```markdown
行内公式：$E=mc^2$

$$
\frac{a}{b}+\sqrt{x}
$$
```

独立窗口与主页面共用按钮样式、公式 CSS 和本地字体。小程序目前仍使用独立 Markdown 渲染器，本次网页公式支持不代表小程序已完成公式适配。

实现参考：[react-markdown 公式插件示例](https://github.com/remarkjs/react-markdown#use-remark-and-rehype-plugins-math)。
