# 网页正式访问与小程序直连 API

2026-10-31后续：用户改为正式公开网页，并已添加根域名与api的A记录到新加坡43.134.239.75，Cloudflare仅DNS；腾讯云已按指导放行IPv4 TCP443。以下“仅API公开、网页私密”为初始准备方案，当前通过--public-web启用主域名网页，API子域名仍只提供接口。小程序暂不上线，本地开发者工具沿已有调试设置使用HTTPS直连，正式发布前再核验微信后台域名许可。

## 当前发布流程

实际状态：网页与API的公网受信任HTTPS已启用并检查正常，网页镜像为ottlog-web:20261031T123156Z-48fe8ed8809a，API原bot-auth授权版本和业务卷保留。小程序dist已改为直连接口，开发者工具仍发生模拟器启动失败；窗口操作被用户Esc停止，尚未完成模拟器内直连验收。小程序未发布，手机真机未验收。具体报告见[开发说明](development.md#新加坡网页正式启用与api直连2026-10-31后续)。

网页运行源码通过scripts/package-server-release.py按哈希打包，prepare-server-release.py --source-only核验后解压到独立发布目录，不改服务器密码／部署环境／当前API。使用web/Dockerfile在新加坡构建Next.js16.4.3生产镜像；上线检查发现原16.3.8的已公布漏洞后更新Next及eslint-config-next到16.4.3，生产依赖审计高危／严重均为0，仍有4项低危的数学渲染依赖报告，未使用强制跨主版本修复。

configure-api-edge.py --public-web --web-image ottlog-web:<发布ID> --apply从运行中API标签获取最新Compose覆盖链，包括账号文章及机器人授权覆盖；生成独立且不覆盖已挂载文件的代理配置，固定API当前镜像，只更新网页及proxy。切换前保存数据库一致备份、原Caddyfile、镜像与Compose元数据。主域名的网页路由来自原deploy/Caddyfile，API子域名继续限制所需接口，错误Host拒绝。TCP80用于HTTPS跳转与签发，TCP443用于正式访问。

主域名的HTTPS Cookie与API子域名Cookie分别保管，使用相同账号和后端数据；无需Domain通配Cookie或放宽CSRF。验证需分别检查公网健康、证书、双域名登录／同账号数据／匿名保护，以及正式网页宽窄屏与微信模拟器。运行中API版本和容器不因网页部署改变。

网页/images路径交由Next先匹配前端public图片，未匹配的上传文件再经Next原有rewrite到内部API，避免站点logo被API静态文件404。API子域名/images仍直接到API；两个来源不复制或移动用户图片。

## 初始私密网页准备记录（历史）

2026-10-31 用户授权：小程序直接连接新加坡 API，不再依赖电脑 SSH 隧道；服务器网页仍只允许私密访问。

## 入口与状态

目标小程序地址为 `https://api.ohtautau.com`，DNS A 记录应为 `api → 43.134.239.75`，Cloudflare 选择仅 DNS，避免把另一个代理层混入本轮连接验证。不修改根域名或 www 的记录。

本轮已将代理配置和部署工具上传到新加坡，并通过 Caddy／Compose 校验及不发布端口的真实 Caddy 隔离路由测试。普通／本地／真机构建的源码默认地址已统一；实际 DNS、证书、公网监听和微信后台域名尚需完成后才能报告直连可用。原 `miniprogram/dist` 在公网 HTTPS 验证前保持原运行包，不把配置准备当作上线成功。

## 服务器启用

配置文件为 `deploy/Caddyfile.api-private-web`、`deploy/compose.api-private-web.yml`；部署脚本为 `deploy/configure-api-edge.py`。服务器已准备在 `~/ottlog/shared/api-direct-source/`，运行：

```sh
python3 ~/ottlog/shared/api-direct-source/configure-api-edge.py --check-routes
# DNS 已解析到该服务器、云防火墙允许 TCP 80/443 后：
python3 ~/ottlog/shared/api-direct-source/configure-api-edge.py --apply
python3 ~/ottlog/shared/api-direct-source/configure-api-edge.py --verify
```

脚本从运行中代理的 Compose 标签读取原文件顺序及私有环境文件，追加新覆盖，只重建 proxy，不构建／重启 API 或网页，不处理业务数据。修改前保存原代理文件链、映射和 Caddyfile 到 `~/ottlog/backups/api-edge-<UTC时间>/`。激活前检查 DNS 仅解析到核验的服务器 IPv4；有未知 IPv6 或其他地址时拒绝继续。

公网 TCP 80 供证书验证／HTTPS 跳转，443 仅提供 API 域名。API 采用原代理 `172.30.41.2`，保留后端可信转发头、客户端限流、Secure Cookie、CSRF 与账号隔离；不添加跨域通配或匿名个人工具权限。Caddy证书沿原持久卷自动签发和续期。

仅放行小程序需要的账号、个人工具、收藏、格言、公开文章／分类／评论、微信提醒、图片与健康接口。`/`、`/today`、`/articles`、`/admin`、`/feed.xml`、后台 API 和未知 Host 不转发到网页。公开文章接口仍只返回原本允许公开的文章；个人文章沿账号存档保护。

私密网页改为容器内 HTTP 8080，经宿主 `127.0.0.1:8088` 映射，原 SSH 访问方式保持。网页和 API 容器自身不发布端口。私密入口的固定 HTTPS 转发头不会用于公网入口。

## 小程序切换与验证

`miniprogram/config/api-endpoint.cjs` 拥有唯一默认地址，普通 Taro 构建、本地 build/watch、真机构建同源。显式 `TARO_APP_API_BASE_URL` 仍可用于隔离开发；手机构建继续拒绝回环地址。`start-shared-test.ps1` 仅给本地网页保留私密 API 通道，不再把小程序编译到 3300。

公网 HTTPS 健康与权限验证后，清除临时环境覆盖，再执行 `npm.cmd run build:local`。检查生成包使用 `https://api.ohtautau.com` 且没有回环接口，再在原微信项目编译；不清 Storage 或账号。

微信后台需配置 `https://api.ohtautau.com` 为 request 合法域名，图片按实际需要配置 downloadFile 合法域名，刷新开发者工具域名信息。平台不接受该域名时按后台实际要求处理，不能以关闭本地校验作为正式版通过。正式上传、体验版与手机真机仍需分别验证。

验收至少包括：受信任证书／健康／匿名个人数据 401／网页与管理入口 404；真实账号登录、CSRF 与读取同一账号数据；电脑隧道不运行时开发者工具仍可请求。不要为验收覆盖现有工具内容或自动导入游客数据。
