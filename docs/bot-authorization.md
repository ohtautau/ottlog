# 独立机器人授权

机器人不再复用网页登录 Cookie。网页登录仍保持原8小时有效期，独立机器人令牌没有8小时到期限制，持续有效直到单独撤销、账号删除或安全标记变更。每个令牌只对应一个账号，数据库只保存256位随机令牌的SHA-256摘要；原始令牌仅在创建时返回一次。

## 权限与接口

- 登录账号管理：`GET /api/account/bot-grants`列出本账号的授权；`POST`创建（正文`{"name":"Ottbot"}`）；`DELETE /api/account/bot-grants/{id}`撤销。创建、撤销必须有网页登录和CSRF，不允许机器人自己创建更多授权。
- 机器人：Bearer令牌访问`GET /api/bot/session`查询身份；`GET /api/bot/personal-tools/{key}`只允许`todos`、`memos`、`reminders`；`PUT`只允许`todos`、`memos`。`DELETE /api/bot/grant`只撤销当前令牌。
- 机器人身份仅在`/api/bot`路由启用，不能用于管理员、发布文章、账号管理或原来的个人工具接口。数据操作委托原PersonalToolsController及存储服务，沿用账号隔离、容量和提醒处理，不直接修改业务表。
- 同时携带Cookie不会改变令牌对应的账号；无效令牌不能回退到Cookie。撤销后发起的新请求返回401，已经通过认证的在途请求不强行中断。

## 绑定、检查和撤销

Ottbot仓库提供`bridge/ottlog-auth.mjs`维护工具。在机器人服务器使用该服务的Node运行：

```sh
node ~/ottbot-relay/current/ottlog-auth.mjs bind --name Ottbot
node ~/ottbot-relay/current/ottlog-auth.mjs status
node ~/ottbot-relay/current/ottlog-auth.mjs revoke --confirm
```

首次绑定从私有`~/ottbot-relay/shared/ottlog.json`读取尚未失效的登录Cookie，创建并验证同账号令牌后，以600权限原子保存令牌并移除Cookie。密码不保存、不用于后台自动重登。也可用`--session-file <私有登录文件>`传入同一博客的有效Cookie，`--config <私有配置>`指定目标。已绑定时拒绝覆盖；更换应先撤销，再用新的有效登录重新授权。

撤销只影响这一条授权，不退出网页、不撤销其他授权、不删除业务数据；本地配置移除令牌并保留已停用标记。机器人检测到撤销后停止博客读写，不回退到Cookie。若令牌遗失，账号所有者仍可通过上述Cookie管理接口撤销对应授权ID。

## 部署与验证

迁移`20261031090000_AddBotGrants`只新增BotGrants表及索引，原表不改写。上线前使用SQLite在线备份、保留旧API镜像和Compose覆盖文件，先用备份的隔离副本验证迁移及业务记录哈希，再仅替换API；网页、代理与原持久卷保持。回滚API不会删除授权表或业务数据；旧API不支持机器人接口，机器人会停止读写而不会降级。

```sh
dotnet build backend/Ottlog.Api/Ottlog.Api.csproj -c BotAuthorization
node scripts/bot-authorization-test.mjs
```

测试使用临时数据库和本机随机端口，覆盖创建／一次性密钥、摘要存储、权限及账号隔离、Cookie与Bearer混用、CSRF、无Cookie访问、超过8小时的授权、重启、账号撤销／自撤销、其他授权保留和安全标记变更，不触碰生产数据。
