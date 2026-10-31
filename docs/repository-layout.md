# 目录与文件管理

2026-10-21 整理。保留小程序、网页、API 三个独立项目，不增加工作区依赖或改变业务架构。

## 源码与配置

- `miniprogram/src/`：运行时代码与实际使用的图片；`components/` 放共享组件，`lib/` 放模型与状态，`pages/` 放页面。
- `miniprogram/config/`：Taro 构建配置；`miniprogram/project.config.json` 是微信公共配置的唯一维护入口。
- `miniprogram/scripts/`：构建、生成与隔离验证脚本；`fixtures/` 放脚本示例数据，`UI-PREVIEW.md` 说明浏览器验证。
- `miniprogram/design-assets/`：不参与打包的设计素材，包括已停用的原生 tab 图标。
- `web/`、`backend/Ottlog.Api/`：网站与共用 API；各自保留已有项目结构。
- `web/shared-app/`：浏览器平台适配、custom element挂载及桌面宽屏响应式展示；业务页面／模型／共用样式直接来自`miniprogram/src/`，在原Next页面DOM的独立React root中渲染，CSS限定作用域。原网站负责首页和导航；`web/public/tool-app/`为可生成JS／CSS／素材，不提交，见[网页同步](web-parity.md)。
- `deploy/`、`supabase/migrations/`：部署配置、数据库迁移。
- `scripts/`：跨项目运维脚本；`content/` 放内容来源，`logos/` 放品牌原稿。

## 本机文件与生成内容

| 内容 | 位置 | 处理方式 |
| --- | --- | --- |
| 微信根目录配置 | 根目录 `project.config.json` | 由 `debug:config` 从小程序公共配置生成，Git 忽略 |
| 微信私有设置 | 各入口 `project.private.config.json` | 本机专用，统一脚本同步调试开关，不提交 |
| 小程序构建产物 | `miniprogram/dist/` | 通过构建更新，不手工修改 |
| 检查日志、截图、示例图 | `artifacts/`、各项目 `test-results/` | 可重新生成，不进入源码或 Docker 上下文 |
| 备份、源码压缩包、校验清单 | `backups/` | 保留，不参与构建与提交 |
| 本机业务状态 | `local-state/`、API 的 `App_Data/` | 保留，不进入源码或 Docker 上下文 |
| 本机工具与依赖 | `.tools/`、`node_modules/` | 本机运行时，按需安装，不提交 |

本轮根目录六份备份相关文件归入 `backups/workspace-import-20261020/`，移动前后 SHA256 一致；没有删除备份或业务数据。根目录旧品牌 SVG 移入 `logos/`。删除了根目录调试日志和可再生成的雷达示例 PNG；后者通过 `node scripts/generate-summary-radar.cjs` 生成到 `miniprogram/test-results/summary-radar/`。

文档保留现有功能说明和决策历史，查阅从 [docs/README.md](README.md) 开始。历史验收记录不能当作今天重新执行的结果。
