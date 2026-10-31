# 服务器私密预览（2026-10-22）

后续状态：2026-10-30 服务已迁移新加坡，见[迁移说明](singapore-deployment.md)。2026-10-31 用户授权小程序直连独立 API、网页保留私密访问，见[API直连](api-direct-access.md)。本文广州和小程序依赖3300的说明为旧阶段记录；服务器网页的私密 SSH 入口仍保留。

## 网页和开发者工具共用服务器数据（2026-10-29）

运行仓库PowerShell脚本`./deploy/start-shared-test.ps1`：先建立只监听电脑`127.0.0.1:3300`的SSH隧道，再以此为`TARO_APP_API_BASE_URL`构建普通小程序；网页用相同的`API_BASE_URL`启动在`127.0.0.1:3000`。网页入口为`http://127.0.0.1:3000/today`，实际API及数据库在广州服务器，3300也可预览服务器上原发布版本。脚本不停止占用3000的现有进程，重复启动前应先确认已有服务的来源。日志和进程ID在`local-state/shared-test`，不提交Git。

两端登录同一账号后共用`personal-tools`接口；任务、便签、习惯、领域、专注、格言和成长使用同账号数据，统计从这些内容派生。登录Cookie分别保管，原owner校验／CSRF／离线暂存及队列保持。进入页面／恢复前台或重新读取时读取账号数据，不把游客缓存自动归到任意账号，不保证同时编辑的两端能实时合并。同一电脑各端旧数据需明确选择账号并备份后迁移。小程序应在原`D:\Projects\ottlog`入口重新编译；不要改为旧隔离预览构建。

本机也可使用`http://ohtautau.localhost:3000/today`作为测试域名。在当前Chromium环境实测网页及会话接口200，Secure Cookie正常保存；`.localhost`指本机，无需编辑hosts或公共DNS。它是本机测试名称，与正式的`ohtautau.com`是不同地址，登录Cookie和游客缓存按站点隔离，请固定使用一个入口。测试连接关闭或本机服务停止后不可访问，其他人的电脑同名地址也只会访问他们自己的电脑。

此配置只用于电脑上的浏览器和微信开发者工具。手机的`127.0.0.1`指手机自身，真机测试需要另设可达的内网／VPN地址，不能声称本次已接通手机。

备案期间保持公网DNS和服务器80／443不变。若要在这台电脑使用正式域名进行私密测试，可手动用本机hosts把域名指到127.0.0.1，再连接只监听本机的SSH隧道；HTTPS还需与该域名匹配并受信任的证书。当前生产Cookie要求Secure，不能把正式域名的明文HTTP当作完整登录测试。未修改系统hosts、证书信任或公共DNS；其他设备不会因本机映射自动获得访问权限。

当前服务器为腾讯云广州Ubuntu24.04，网页、API与Caddy均在Docker运行，镜像业务版本为`20261022T144614Z-7448419444cb`。公网域名尚未切换；代理只绑定服务器`127.0.0.1:8088`，通过已认证的SSH隧道测试，不开放公网80／443。

## 本机访问

当前隧道已启动，访问[服务器预览](http://127.0.0.1:3300/memos)。3000端口仍是本机开发用网页，3300端口经过SSH访问真实服务器。

如果隧道关闭，在仓库的PowerShell终端运行：

```powershell
./deploy/open-private-preview.ps1
```

保持终端开启；Ctrl+C只断开本机通道，不会停止服务器容器。SSH私钥和known_hosts保存在本机`local-state/server-deploy`，不在Git／镜像里。密码文件`local-state/server-deploy/server-admin-password.txt`只允许当前Windows账号访问；新站点管理员名称为`admin`。旧管理员已随本次清理移除，新密码由服务器随机生成，不在聊天或日志中输出。

## 实际部署配置与恢复

服务器当前源码位于`/home/ubuntu/ottlog/current`，指向只读核验后的发布目录；应用的配置和秘密位于`/home/ubuntu/ottlog/shared`。Compose始终按以下顺序读取：

1. 发布目录`deploy/compose.yml`。
2. 发布目录`deploy/compose.preview.yml`，只绑定本机8088端口。
3. `/home/ubuntu/ottlog/shared/compose.network.yml`，网页固定为172.30.41.4，避免动态分配占用Caddy的172.30.41.2；API为172.30.41.3。此修复已同步到仓库的基础compose配置，旧发布目录保持不变。

环境文件为`/home/ubuntu/ottlog/shared/deploy.env`。数据保存在`ottlog_blog_data`，备份保存在`/home/ubuntu/ottlog/backups`。首次恢复到空卷后按API镜像内真实app UID／GID授予权限；后续部署不可再次执行首次恢复，也不能删除已有卷。恢复前始终先做一致备份。

网页由服务器构建。首次完整.NET SDK镜像下载慢，因此API使用同一源码在本机以Release、UseAppHost=false生成的跨平台框架依赖产物，附Linux x64 SQLite原生库；逐文件哈希校验后装入微软官方ASP.NET10运行镜像。打包仅包含DLL、运行时描述、生产基础配置、必要静态内容及Linux库，排除了开发配置、业务数据库和密钥。实际Linux启动、SQLite完整性及健康检查通过。原Dockerfile仍支持完整服务器构建。

## 本次验证与数据

三个容器运行正常，API与网页健康，Caddy端口仅为127.0.0.1:8088。已通过真实浏览器管理员登录／Secure Cookie／CSRF及任务、便签、领域、习惯、格言页面检查。服务器文章、读者、评论、收藏、工具存档及微信提醒均为0；有1个新初始化管理员，保留22条公共格言，保留原习惯目录。预览不写业务存档。

清理前本机备份在仓库backups，迁移的是清理后的快照。部署后已另保存服务器快照`ottlog-20261022T145931112673Z.tar.gz`。未连接的真机缓存未操作；浏览器／Linux验证不等同微信真机验证。

备案完成后再使用正式域名、DNS、HTTPS与小程序合法域名进行公网联调；不可把带固定HTTPS转发头的私密预览Caddy配置直接暴露到公网。
