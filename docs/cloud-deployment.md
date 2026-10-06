# GitHub、Vercel 与 Supabase

用户于 2026-10-06 确认采用此方案（[C69](decisions.md#githubvercel-与-supabasec69)）。网站为 Next.js 16，GitHub 仓库为 `ohtautau/ottlog`，Vercel 项目 Root Directory 必须选择 `web`。

网站、后端与部署源码已推送到 `main`，源码提交为 [12ff106](https://github.com/ohtautau/ottlog/commit/12ff1060678be44f3362cc4c5e2205bc7570a4cd)。本次上传排除了小程序目录、个人数据库／导出、会话密钥、本机配置、构建产物和依赖；小程序源码与其他未提交文件仍保留在本机。使用已有仓库原来的公开属性，没有修改可见性。

## 当前架构

```text
网站 ohtautau.com → Vercel Next.js → 独立托管的 Ottlog .NET API
微信小程序                         → 同一 Ottlog .NET API
                                       ├─ 原 SQLite：账号、文章、收藏、微信绑定／提醒
                                       └─ Supabase：账号隔离的工具 JSON
```

Vercel 的 Next.js 部署不包含这个 .NET 后端。先为原 API 保留或建立有持久磁盘的服务，再将网页代理与小程序指向它。服务器与 Supabase 应选择相近地区，实际可达性须分别从 Vercel 和微信网络验证。

网页和小程序沿用现有登录，不另建 Supabase Auth 账号。后端从已验证的会话计算 `admin:<ID>`／`reader:<ID>`，不接受客户端指定 owner。Supabase 密钥只放 API 的环境／密钥设置，网页和小程序不需要任何 Supabase 密钥。账号与工具 ID 必须保留，不能重新注册一套账号后期待历史记录自动出现。

## 1. 本地运行

先在独立测试数据目录启动 API，避免自动化写入日常数据库；日常手动开发仍可按根 README 使用原目录。

```powershell
dotnet build backend/Ottlog.Api/Ottlog.Api.csproj -c PersonalTools
# 第一个终端：启动隔离的本地 API（5229），不会使用日常 App_Data。
$cloudLocalData = Join-Path (Get-Location) '.tmp/cloud-local-api'
dotnet run --project backend/Ottlog.Api/Ottlog.Api.csproj --launch-profile http -- --Data:Directory=$cloudLocalData
```

在第二个终端从仓库根目录启动网页：

```powershell
cd web
npm.cmd ci
npm.cmd run dev
```

默认网站为 `http://localhost:3000`，API 为 `http://127.0.0.1:5229`。`web/.env.example` 列出 API 配置；API 未启动时账号和文章接口不可用。网站独立构建：`npm.cmd run build`。

## 2. GitHub 与 Vercel

1. 在 Vercel 连接 GitHub，导入 `ohtautau/ottlog`，Root Directory 设为 **web**，Framework 选 Next.js，Production Branch 为 `main`。
2. 使用提交的 `web/vercel.json`：`npm ci` 安装，`npm run build` 构建，Output Directory 保持默认。使用 Node.js 24。
3. 在 Vercel 设置 `API_BASE_URL` 为实际独立 API 的 HTTPS **origin**，例如已经配置并验证过的 `https://api.ohtautau.com`。该子域名只是配置示例，并未自动创建。不要加 `/api`，不要设成 Vercel 网站自身地址，否则代理会循环。代码会拒绝缺失配置、本机地址及可识别的自身地址。
4. 部署后验证首页、文章、登录、保存与退出。Preview 默认使用独立测试 API，避免预览页面操作正式账号记录。
5. 在 Vercel Domains 添加 `ohtautau.com`，按 Vercel **实际显示**的 DNS 记录配置域名服务商，不硬编码或猜测 IP。DNS 切换前，确认 `/api/*`、`/images/*` 与 `/feed.xml` 都已通过 Next.js 转发到原 API，原图片和会话密钥仍可用。

Vercel 连接建立后，后续 `git push` 才能触发自动部署。目前本机 CLI 的 GitHub 凭据可能失效，已连接的 GitHub 应用与 CLI 是独立认证；CLI 推送前可运行 `gh auth login -h github.com` 修复，切勿将 token 写入仓库。

小程序默认请求 `https://ohtautau.com`，可经 Vercel 转发到同一 API；也可构建时设置 `TARO_APP_API_BASE_URL` 为独立 API origin。使用新域名时在微信管理后台配置合法 request 域名并重新构建；当前代码未修改生产域名。两端 Cookie 各自保存，登录同一个 Ottlog 账号后读取同一 owner 数据。

## 3. Supabase 建表与配置

1. 创建 Supabase 项目，在 SQL Editor 执行 [建表脚本](../supabase/migrations/202610060001_personal_tool_states.sql)。脚本仅适用于首次创建；遇到已存在对象会停止，不覆盖表或数据。
2. 表 `public.personal_tool_states` 使用 `(owner, key)` 联合主键、`data jsonb` 与 `updated_at timestamptz`。现有九个工具键保留：`meals/reminders/todos/pomodoro/memos/dining/mottos/growth/domains`；领域和旧进展独立保存，习惯仍在 `reminders`，原记录 ID 和图片字段保留。
3. 表开启 RLS，撤销 `anon/authenticated/PUBLIC` 权限，不添加公开读取策略。仅 API 的 `service_role` 可以读取／新增／更新。启用 Data API 并确认 public schema 已暴露此表；不能套用官方示例的公开 instruments 策略到私人数据。
4. 从 Supabase API Keys 获取新的服务器 secret key（`sb_secret_...`），放入 .NET API 的私密设置 `Supabase__SecretKey`；`Supabase__Url` 为项目 HTTPS origin。使用 `deploy/supabase.env.example` 查看配置名称，不能把真实文件提交或发到聊天。
5. **完成下节迁移与核对后**，设置 `PersonalTools__Provider=Supabase` 并重启 API。缺省仍为 Sqlite；选 Supabase 后读取、写入、提醒校验与就绪检查都使用同一远端存储，不在失联时回退或复制到 SQLite。

账号、文章、收藏、图片、微信提醒和 Data Protection 会话密钥仍在原后端磁盘，必须继续备份。此阶段没有迁移整个 SQLite，也没有解决 P10 的同记录同时编辑冲突；仍按原工具快照保存。域名上线和数据库替换不能报告为记录级合并完成。

## 4. 迁移已有工具记录

先暂停实际工具写入并完成 SQLite、图片和密钥的一致备份，再对**备份副本**操作。不要把 SQLite 文件、SQL 导出、密码或个人记录提交到公开 GitHub。

```powershell
# 默认仅验证格式、容量及数量；只读，不修改源库或云端。
./.tools/python/python.exe scripts/export-supabase-tools.py backups/ottlog.db
# 显式创建新的导出文件；已有文件不会覆盖。
./.tools/python/python.exe scripts/export-supabase-tools.py backups/ottlog.db --output backups/supabase-tools.sql
```

在已建表的新 Supabase 目标库中执行导出 SQL。整个导出为一笔事务，目标同一 owner/key 已有记录时主键冲突会阻止覆盖。大导出用 PostgreSQL 客户端通过 Supabase Connect 提供的连接信息执行；密钥／密码放安全设置，不写命令历史。导出保留原 owner、key、业务 ID、JSON 与更新时间，数据库仍使用原 API 中的账号身份。

切换前逐账号、逐工具比对记录数和 JSON 语义，确认游客不在导出中。再切换 Provider 并测试原账号双端登录、历史记录、新增／编辑／删除、重启、离线重试、账号隔离和微信提醒。恢复写入之后不能简单改回 SQLite，否则会读到旧快照；需要先导回停写后取得的最新远端记录。实际迁移与回滚须另行执行，本次只准备脚本。

## 本次验证与尚未完成

相关本地检查见 [开发说明](development.md#云部署与共用数据c69)。GitHub 上传已完成并读取远端分支核对；本次临时开发服务已停止。云项目创建、服务器配置、真实密钥、数据库实际建表／迁移、Vercel 部署、DNS 与微信实机验证均须在对应账号中完成；提供代码与模拟测试不代表这些步骤已完成。`ohtautau.com` 的公开访问检查未能在本次工具环境完成，不据此判断实际 DNS 或服务状态。

官方资料：[Vercel 构建设置](https://vercel.com/docs/builds/configure-a-build)、[Supabase Next.js 快速接入](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)、[Supabase 密钥](https://supabase.com/docs/guides/getting-started/api-keys)、[数据库连接](https://supabase.com/docs/guides/database/connecting-to-postgres)、[PostgREST upsert](https://docs.postgrest.org/en/stable/references/api/tables_views.html#upsert)。本项目采用原 API 接入 Supabase，保留已有登录与数据兼容。
