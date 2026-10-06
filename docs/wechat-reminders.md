# 微信待办订阅提醒配置

代码已接入；已填写当前项目的小程序 AppID 及用户提供的「备忘录任务提醒」模板（编号 17066）。AppSecret 仍留空，因此提醒服务默认关闭；完成后端凭据配置并在微信内同意本次订阅后，后端才会登记发送。当前测试使用模拟微信接口，未向真实微信账号发送消息。

## 1. 微信公众平台准备

当前模板 ID：`xD7UZPKKaTGpGviIRBkQkSp9AY_dZTikphC7HrVoVXk`（下划线前没有反斜杠）。需确认该模板属于项目的小程序 `wxa4e94d31db93d2f3`。

| 模板字段 | 配置键 | 发送内容 |
| --- | --- | --- |
| 任务名称 `thing1` | `TitleField` | 任务标题 |
| 截止时间 `character_string2` | `TimeField` | 任务日期和时间，如 `2026-10-01T18:30`；仅日期时发送日期，未设日期时发送 `-` |
| 提醒原因 `thing9` | `ReasonField` | 已到你设置的提醒时间 |
| 备注 `thing10` | `NoteField` | 任务描述；为空时为「请打开小程序查看任务」 |

发送时刻仍由用户选择的通知时间决定，与任务截止时间相互独立。兼容旧模板的 `time*` 字段时继续发送通知时间；待办的 `character_string*` 字段用于截止时间。一次性订阅需要用户主动授权，不能凭模板 ID 无限推送。

模板字段名称必须照后台填写，例如后台显示任务名称 `thing4`、提醒时间 `time5`，就分别填写 `thing4`、`time5`，不能复制其他账号的编号。`thing` 内容按最多 20 个 Unicode 字符截断。

腾讯云官方示例说明了[模板类目、用户点击订阅与发送接口](https://github.com/TCloudBase/wxcloudrun-wxapp-subscribe)。微信接口参考：[登录凭证校验](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html)、[获取接口凭据](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-access-token/getAccessToken.html)、[发送订阅消息](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-message-management/subscribe-message/sendMessage.html)。开发期间微信文档站访问受限，发送结构与授权次数规则已依据腾讯云官方示例核对；最终账号权限及模板字段须在实际后台确认。

## 2. 服务端配置

通过服务器密钥配置或进程环境变量设置以下值。AppSecret 仅放在后端，勿写入小程序源码、前端环境变量、Git 或日志。项目 `appsettings.json` 已填写非敏感的 AppID、模板 ID 及字段映射。

| 环境变量 | 内容 |
| --- | --- |
| `WeChat__AppId` | 当前小程序 AppID |
| `WeChat__AppSecret` | 当前小程序 AppSecret |
| `WeChat__TodoTemplateId` | 当前账号的待办模板 ID |
| `WeChat__TitleField` | 任务名字段，例如 `thing4` |
| `WeChat__TimeField` | 当前为截止时间字段 `character_string2`；兼容旧提醒时间字段，例如 `time5` |
| `WeChat__ReasonField` | 当前为提醒原因字段 `thing9`；其他模板没有此字段时留空 |
| `WeChat__NoteField` | 可选备注字段；没有此字段时留空 |
| `WeChat__MiniProgramState` | `formal` 正式版；联调时用 `developer` 或 `trial` |
| `WeChat__TimeZone` | 消息内时间显示时区，默认 `Asia/Shanghai`，与新加坡均为 UTC+8 |
| `WeChat__PollSeconds` | 后台轮询秒数，默认 15，限制 1–60 |
| `WeChat__MaximumPendingPerAccount` | 每账号待发送数量上限，默认 100，限制 1–500 |

现有 Docker Compose 已把宿主机的 `WECHAT_APP_SECRET` 映射为 API 的 `WeChat__AppSecret`。本地直接运行 API 时设置 `WeChat__AppSecret`。如需覆盖其他配置，在 API 服务的 `environment` 或受控 `env_file` 中显式传入对应变量。启用后重建 API 容器（本地重启 API），启动时 EF 自动迁移增加 `WeChatBindings` 和 `WeChatReminders` 表，保留原有账号和内容。发布前照常备份数据库。

后端需持续运行并可访问 `https://api.weixin.qq.com`。小程序请求 API 域名需配置 HTTPS 合法域名；如微信后台要求服务器 IP 白名单，也应配置实际服务器出口 IP。当前部署采用单个 API 进程/提醒工作器，同一 AppID 的 access token 应由本服务统一获取，避免其他服务刷新导致凭据失效。

`GET /api/wechat/reminders/config` 返回 `enabled: true` 只表示本地配置完整，不代表微信模板权限或真实投递已经验证。

## 3. 用户流程与接口

用户先登录现有 Ottlog 账号，保存同步任务，再点击界面上的微信提醒按钮。小程序在这次点击中调用 `requestSubscribeMessage`，收到对应模板的 `accept` 后，通过 `wx.login` 的临时 `code` 绑定当前微信身份，然后创建提醒。取消、拒绝或尚未开通都不伪装为订阅成功。

除配置查询外，下列接口均使用已有登录 cookie；写请求需要 `X-CSRF-TOKEN`。前端不可指定 `owner` 或 `openid`。

| 方法与地址 | 输入 / 返回 |
| --- | --- |
| `GET /api/wechat/reminders/config` | `{ enabled, templateId, reason, requiresSubscription: true }`，不返回密钥 |
| `POST /api/wechat/reminders/bind` | `{ code }` → `{ bound: true }`；服务端使用 `jscode2session` 校验 |
| `POST /api/wechat/reminders` | `{ taskId, remindAt, subscriptionGranted: true }` → 提醒状态 |
| `GET /api/wechat/reminders` | `{ reminders: [{ taskId, remindAt, status, errorCode }] }`，当前账号最近 500 条 |
| `DELETE /api/wechat/reminders/{taskId}?expectedRemindAt=旧提醒时间` | 仅取消符合旧时间的待发送提醒，幂等返回 204；可防止延迟取消误删新提醒。旧客户端可省略该参数 |

`remindAt` 必须为含时区的 ISO 时间，例如 `2026-10-01T01:00:00.000Z`。后端保存 UTC 毫秒时间戳，仅接受未来 366 天以内的提醒；必须与当前账号同步到 `personal-tools/todos` 的任务 `reminderAt` 相同，且任务 `completedAt` 必须为 `null`。

每次授权只用于本次任务提醒，循环任务及后续任务不会自动继承订阅授权；它们生成之后需要用户再次选择提醒并同意订阅。前端申报同意不等于服务器能够验证用户剩余次数，最终发送权限仍由微信接口判断。相同任务、时间的重复请求幂等，不会增加发送次数。

## 4. 发送与取消行为

任务完成、删除、移除或更改提醒时间时，同步任务会取消无效排队记录。发送前，后台再次读取该账号最新任务及微信绑定，任何不一致均取消发送；服务端从不按客户端传入的其他账号信息查任务。已完成的发送无法撤回；离线修改必须同步成功后，服务器才可能知道任务状态已改变。

状态包括 `pending`（待发送）、`dispatching`（处理中）、`sent`（微信确认成功）、`failed`（明确失败）、`cancelled`（取消）和 `unknown`（无法确认投递）。微信成功响应并不代表用户已阅读，也不保证手机一定提示铃声。后台停机超过一天后不会补发过期提醒。

发送超时、连接中断或进程发送途中崩溃时，可能已投递，记录为 `unknown`，**不会自动重试**以免重复发送。超时处理中记录在两分钟后转为未知。微信拒绝（例如 `43101`）记录为 `failed`，不视为拥有持续授权；如需新的提醒，修改至未来时间并重新订阅。access token 只在内存缓存，不返回客户端，也关闭了此 HttpClient 的请求 URL 日志。

## 5. 验证

可在项目根目录运行，不占用正在使用的 5229 端口，不操作现有数据库，也不需要真实微信凭据：

```powershell
dotnet run --project backend/Ottlog.Api/Verification/WeChatReminderChecks.csproj -c ReminderChecks
.tools/python/python.exe backend/Ottlog.Api/Verification/http-checks.py
```

第一组使用临时 SQLite 和模拟 HTTP 检查迁移、账号隔离、日期、单次提醒、完成/删除/变更取消、模板 Unicode 长度及时区、成功/拒绝/超时/崩溃状态和 token 缓存。第二组使用随机本地端口及临时数据库验证实际 HTTP 登录、CSRF、输入限制和未配置状态。

真实联调需等模板和凭据配置后：登录微信开发者工具或真机，保存一个几分钟后的任务；点击微信提醒并同意；检查状态由 `pending` 变为 `sent`，再在接收微信的服务通知中核实内容、跳转和时区；另建任务后完成/删除，确认不收到通知。这一步目前尚未执行。
