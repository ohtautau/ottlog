# Ottlog.Web

Next.js + TypeScript 网页，通过 Ottlog.Web.esproj 纳入 Visual Studio。

启动、配置、写作功能和测试步骤以仓库根目录 [README](../README.md) 与 [测试说明](../docs/testing.md) 为准。

- `npm.cmd run dev`：网页开发服务器，端口 3000。
- `npm.cmd run build` / `npm.cmd start`：生产构建和运行。
- `npm.cmd run lint`：代码检查。
- `npm.cmd run test:e2e`：桌面、手机和 API 回归；先构建前后端并释放测试端口。
- `npm.cmd run test:first-run`：旧数据库升级、首次账户、持久化与会话撤销验证；需要 Node.js 24 和本地 dotnet-ef 工具。

生产 API 地址通过 API_BASE_URL 配置，更改后重新构建。开发默认后端 http://127.0.0.1:5229。

Vercel 导入 GitHub 仓库时将 Root Directory 设为 `web`，并设置独立后端的 HTTPS `API_BASE_URL`。网站和小程序继续共用 Ottlog 账号；Supabase 工具存储、建表与旧数据迁移见 [云部署说明](../docs/cloud-deployment.md)。

部署配置检查：`node scripts/check-api-origin.mjs`。共享 API 冒烟检查：先构建后端 `PersonalTools` 配置并在 3100 启动网页开发服务，再运行 `node scripts/check-shared-api.mjs`；脚本使用独立临时数据库，需空闲的 5229 端口。
