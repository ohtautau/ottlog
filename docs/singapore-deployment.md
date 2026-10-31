# 新加坡单服务器部署

2026-10-31 后续授权小程序通过独立 HTTPS API 域名直连、网页保留私密入口。当前配置准备、DNS 前置条件与实际激活步骤见[API直连](api-direct-access.md)；下文3300同通道为迁移当时方案，不能用它覆盖新的小程序默认地址。公网验证完成前不宣称已切换。

2026-10-30：博客、API、SQLite数据库、上传文件和会话加密密钥迁往新加坡，与微信接收器、Codex执行器和消息路由同机。迁移保持广州实际运行的镜像版本，不把电脑上尚未提交的页面开发自动混入线上版本。广州保留迁移前快照作为回滚来源；正常链路不再经过广州。

## 服务与数据

- Docker Compose：`ottlog-api-1`、`ottlog-web-1`、`ottlog-proxy-1`。
- 持久卷：`ottlog_blog_data`（SQLite、上传图片、Data Protection密钥）、`ottlog_caddy_data`、`ottlog_caddy_config`，全部迁移。
- 发布目录：`~/ottlog/current`指向`~/ottlog/releases/<版本>`。`~/ottlog/shared`只存私有Compose覆盖、密码文件和部署环境，不能提交Git。
- 私密预览继续仅绑定`127.0.0.1:8088`，沿用原预览Caddy。它含固定HTTPS转发设置，不能直接改为公网监听。
- 微信服务的`shared/ottlog.json`连接同机`http://127.0.0.1:8088`，Cookie仅服务账号可读。停止并禁用原跨广州的`ottbot-ottlog`隧道；不在仓库保存Cookie、SSH私钥或用户密码。
- Codex和微信服务仍使用`~/.config/systemd/user/ottbot-*.service`，服务器已启用linger；Docker容器使用`unless-stopped`自动恢复。

## 本机连接

`deploy/open-private-preview.ps1`与`deploy/start-shared-test.ps1`共用`get-server-target.ps1`解析目标，顺序为`-Server`参数、`OTTLOG_SSH_TARGET`环境变量、本机私有`local-state/server-deploy/connection.json`的`sshTarget`。不再内置广州地址。私钥和经核验的主机指纹沿原本机私有目录保存。

```powershell
./deploy/open-private-preview.ps1 -Server ubuntu@your-new-server
# 或先将目标保存到本机connection.json，再运行原命令。
```

小程序与本机网页仍通过`127.0.0.1:3300`的SSH转发访问同一个服务器API。这个地址只用于电脑联调；手机自身的localhost不能访问电脑。迁移不自动发布公网域名，也不修改DNS、备案、HTTPS证书或小程序合法域名。

## 迁移与恢复

1. 在原服务器记录实际容器镜像ID、Compose文件顺序及卷名，导出对应Docker镜像和运行目录；不只依赖旧`OTTLOG_RELEASE_ID`，因为API可能有更新的私有覆盖镜像。
2. 提前把镜像和配置通过SSH复制到目标服务器，比较SHA256。用`restore-private-host.py --prepare-only`校验安全路径、导入镜像并检查镜像ID和Compose配置；该阶段不启动应用、不恢复业务卷。
3. 最终切换前暂停微信入口及原API写入。冷备份全部三个卷，保留数据库、上传和会话密钥一致性，计算SHA256后传输到目标；原卷与备份不删除。
4. `restore-private-host.py`要求目标业务卷为空，拒绝覆盖现有运行目录或非空卷；检查归档安全路径、SHA256及SQLite完整性，保留源UID/GID，再用原Compose文件顺序启动API、网页和代理。
5. 比较数据库表计数及账号个人工具记录，验证登录会话、CSRF、上传和业务读写，再把微信连接改为同机API并恢复接收。禁用广州旧执行器、路由和代理；广州实例本身保持可回滚，不自动销毁。
6. 本机连接目标改为新加坡，停止旧隧道。数据库、卷备份、镜像包、私有环境和迁移元数据只放私有目录，Git只同步部署代码和说明。

脚本参数见`python3 deploy/restore-private-host.py --help`。它需以具备Docker和卷目录权限的账号运行；`--root`明确指定目标路径。只能用于经过验证的新目标，不能用来重置现有服务器数据。

## 回滚边界

新加坡开始接收写入后，不能直接重新启动广州旧数据并继续写；应先暂停写入、备份新加坡并回传最新卷，再按同一验证流程恢复。这样可避免双主或丢失迁移后的任务、便签和打卡。日常后续备份继续使用`scripts/backup.py`，完整主机迁移另保存全部卷和私有运行配置。
