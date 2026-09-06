# Ottlog

个人博客，目前已初始化 ASP.NET Core Web API 后端。Next.js 网页、小程序和数据库将在后续阶段添加。

## 在 Visual Studio 中运行

1. 打开 `backend/Ottlog.Api/Ottlog.slnx`。
2. 确认 `Ottlog.Api` 为启动项目，在运行按钮旁选择 `http` 配置。
3. 按 Ctrl+F5 运行（F5 为调试运行）。浏览器将打开 `http://localhost:5229`，显示 API 运行状态 JSON。
4. 访问 `http://localhost:5229/health`，应显示 `Healthy`。

项目使用 .NET 10 SDK，需要支持该 SDK 的 Visual Studio，并安装“ASP.NET 和 Web 开发”工作负载。

## 在终端中运行

在仓库根目录执行：

```powershell
dotnet restore backend/Ottlog.Api/Ottlog.Api.csproj
dotnet build backend/Ottlog.Api/Ottlog.Api.csproj --no-restore
dotnet run --project backend/Ottlog.Api/Ottlog.Api.csproj --launch-profile http
```

使用 Ctrl+C 停止终端启动的服务。避免同时用 Visual Studio 和终端启动相同端口的实例。

## 可访问的接口

| 地址 | 用途 |
| --- | --- |
| `/` | API 名称和运行状态 |
| `/health` | 进程健康检查，正常返回 HTTP 200 和 `Healthy` |
| `/weatherforecast` | 模板示例接口，后续替换为博客接口 |
| `/openapi/v1.json` | OpenAPI JSON 文档，仅开发环境可用 |

也可以打开 `backend/Ottlog.Api/Ottlog.Api.http` 发送示例请求。当前未安装 Swagger UI，因此没有 `/swagger` 页面。

## 可选 HTTPS

首次使用 HTTPS 时，在本机终端执行 `dotnet dev-certs https --trust` 并完成系统证书信任提示，然后选择 `https` 配置运行。HTTPS 地址为 `https://localhost:7120`。

开发环境支持直接使用 HTTP；非开发环境启用 HTTPS 重定向。

## 常见启动问题

- 提示 EXE 被占用：先停止 Visual Studio 调试或之前运行的终端实例，再重新生成。
- 提示端口被占用：先停止之前启动的 Ottlog 实例。
- 浏览器显示证书错误：完成上述证书信任步骤，或先选择 `http` 配置。
- 根地址显示 JSON 是正常的：当前是后端接口，博客网页将在 `web/` 中单独创建。

## 目录

```text
backend/Ottlog.Api/    ASP.NET Core Web API
```

后续将在根目录添加 `web/`（Next.js）和 `miniprogram/`（Taro）。
