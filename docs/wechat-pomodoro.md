# 番茄钟微信提醒配置

代码已经接入微信订阅消息。仓库中的模板和凭据保持为空，因此当前配置会返回“番茄钟微信提醒尚未开通”，计时功能照常运行，不会把本地提示当作微信发送成功。

## 提醒范围

默认每轮包括专注开始、自动休息开始、休息结束三个事件。默认参数为 25 分钟专注、5 分钟休息，每完成 4 次专注使用 15 分钟长休息。长休息的计算使用累计完成专注次数，和页面保留多少条历史记录无关。休息结束后等用户开始下一次专注。

每一轮必须由用户点击触发订阅授权。前端只把微信返回 `accept` 的事件提交给服务器；拒绝、关闭、`ban`、`filter` 不会安排发送。一次性订阅不是永久通知权限，下一轮需要再次申请。点击触发、每次最多三个模板和同标题过滤限制已参照[腾讯云官方小程序订阅消息教程](https://cloud.tencent.com/document/product/1301/103770)及[腾讯云官方示例](https://github.com/TCloudBase/wxcloudrun-wxapp-subscribe)核对。计时过程中暂停和恢复会保留这一轮尚未发送的授权，并按恢复后的截止时间重新排程；已发送的事件不会重复发送。

本实现为三个事件使用 **三个不同 ID、不同模板标题的一次性订阅消息模板**。需要在微信公众平台的当前小程序账号中确认服务类目支持的模板，不能只把同一个模板 ID 填三次。个人主体能否获得适用模板以该账号后台可选模板和审核结果为准；代码配置无法新增账号权限。

微信接口文档：[申请订阅消息](https://developers.weixin.qq.com/miniprogram/dev/api/open-api/subscribe-message/wx.requestSubscribeMessage.html)、[订阅消息说明](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html)、[服务端发送消息](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-message-management/subscribe-message/sendMessage.html)。本次开发环境未能直接读取微信文档站正文，以上微信链接保留作配置入口；已读取的依据是前述腾讯云官方资料。上线前请在微信文档及账号后台再次确认模板要求。

## 服务端配置

在部署环境的环境变量或私有配置中设置 `WeChat`。AppSecret 只放服务端，不填写到小程序代码、聊天、Git 或公开配置文件中。微信身份绑定、access token 缓存和安全 HTTP 客户端复用[待办提醒](wechat-reminders.md)；只配置番茄钟模板也能正常绑定，不要求先配置待办模板。

示例值都需要替换成当前小程序后台的实际模板及字段：

```json
{
  "WeChat": {
    "AppId": "当前小程序的 AppID",
    "AppSecret": "仅在服务器配置",
    "PomodoroFocusTemplateId": "专注开始模板 ID",
    "PomodoroBreakStartTemplateId": "休息开始模板 ID",
    "PomodoroBreakEndTemplateId": "休息结束模板 ID",
    "PomodoroFocus": {
      "TitleField": "thing1",
      "TimeField": "time2",
      "NoteField": "thing3"
    },
    "PomodoroBreakStart": {
      "TitleField": "thing4",
      "TimeField": "time5",
      "NoteField": ""
    },
    "PomodoroBreakEnd": {
      "TitleField": "thing6",
      "TimeField": "time7",
      "NoteField": "thing8"
    },
    "MiniProgramState": "formal",
    "TimeZone": "Asia/Shanghai",
    "PollSeconds": 15,
    "MaximumPendingPerAccount": 100
  }
}
```

每种模板单独配置字段名。标题字段必须是 `thingN`，时间字段必须是 `timeN`；备注为可选、与标题不同的 `thingN`。模板须符合这些字段类型，且实际选取的模板不能另外要求当前发送数据中没有提供的必填字段。`thing` 文本按 Unicode 字符截断为 20 字；页面链接为 `pages/pomodoro/index`。开发版本使用 `MiniProgramState=developer`，体验版本使用 `trial`，正式版本使用 `formal`。

环境变量使用双下划线，例如 `WeChat__PomodoroFocusTemplateId`、`WeChat__PomodoroFocus__TitleField`。服务器需要出站访问 `https://api.weixin.qq.com`，配置公众号平台要求的服务器 IP 白名单，并将小程序请求域名指向 HTTPS API 域名。生产部署为 **单个 API 进程**，使保存计时器、取消通知和发送时的共享互斥保持一致；多实例需要先把此互斥改为共享数据库锁或消息队列。

启动 API 会应用迁移 `WeChatPomodoroReminders`，增加独立的持久消息表，不改变待办提醒数据。不要删除历史发送记录来清理队列：`账号 + runId + event` 同时是一次性发送凭据，保留终态记录才能防止旧请求重放。

## API 契约

除配置查询外，接口均要求现有账号登录 Cookie；写操作要求现有 `X-CSRF-TOKEN`。所有权由服务器登录身份决定，客户端不能指定 owner、openid、标题或发送时间。

| 方法与地址 | 请求或结果 |
| --- | --- |
| `GET /api/wechat/pomodoro/config` | `{enabled,reason,templates:[{event,templateId}],requiresSubscription:true}`；配置不全时 `enabled=false,templates=[]` |
| `POST /api/wechat/reminders/bind` | `{code}`，由 `wx.login` 获取临时 code，服务端换取并绑定微信身份 |
| `POST /api/wechat/pomodoro` | `{runId,events:["focus_start","break_start","break_end"]}`，events 只含本次实际接受的事件，返回 `{reminders:[...]}` |
| `GET /api/wechat/pomodoro` | `{reminders:[{runId,event,remindAt,status,errorCode}]}`，只返回当前账号最近的记录 |
| `DELETE /api/wechat/pomodoro/{runId}?expectedDeadline=毫秒时间戳` | 停止该轮尚未发送的事件；204 表示请求已处理，不会撤回已发送消息 |

必须先将 `pomodoro` 工具状态保存并成功同步到服务器，再绑定并提交安排请求。服务器从当前运行中的 `active.rootRunId`（旧记录回退 `active.id`）识别这一轮，从 `active.deadline` 和参数计算时间。自动生成的休息保持相同 `rootRunId`，用 `originFocusId` 关联专注。`expectedDeadline` 是发起停止操作时当前阶段的 `active.deadline`，不是固定的原专注截止时间；迟到的旧取消请求不会误取消恢复后新截止时间的记录。

`PUT /api/personal-tools/pomodoro` 与发送共用互斥，并立即核对消息队列：暂停转为 `paused`，恢复重排为 `pending`，删除、重置、提前结束、切换到另一轮则取消未发送事件。自动休息完成后即便页面先保存完成记录，服务端仍可通过同一 `rootRunId` 的自然完成休息记录确认“休息结束”事件。切换为手动开始休息时，专注阶段只安排“专注开始”；实际开始休息后才能为该次休息安排开始和结束提醒。

状态包括 `pending`、`paused`、`dispatching`、`sent`、`failed`、`cancelled`、`unknown`。已是 `sent/failed/cancelled/unknown` 的相同轮次和事件不会因重复 POST 再次安排。微信超时可能已经发送，因此结果记为 `unknown`，不会自动重发；进程退出留下的超时发送占用也会转为 `unknown`。新的一轮使用新的 runId 并重新授权。

## 时效与验证

提醒由服务器轮询发送，默认可能有约 15 秒的调度等待，再加网络和微信投递耗时。每个事件超过发生时间 120 秒就标记 `failed/event_expired`；“开始”事件如果对应阶段已经结束也不再补发。服务器长时间离线恢复后，不会连发过期的开始/结束消息。小程序退出后台时，只要先前成功保存了运行状态并授权，服务端仍可从原截止时间推导本轮休息开始、休息结束。

离线暂停或停止无法立即告知服务器，已有提醒可能仍按服务器最后收到的状态发送；页面必须显示同步失败或待同步状态，恢复连接后重新同步。计时器本地功能不依赖授权成功。

已使用临时 SQLite、假微信 HTTP 和隔离端口验证：数据库迁移、账号/CSRF 隔离、部分授权、每四次长休息、focus/break 暂停恢复复用授权、截止时间变更、条件取消、自然结束与发送竞态、超时未知、不重复发送和未配置禁用行为。没有使用真实 AppSecret 或向真实微信账号发送消息。

```powershell
dotnet run --project backend/Ottlog.Api/Verification/WeChatReminderChecks.csproj -c ReminderChecks
.tools/python/python.exe backend/Ottlog.Api/Verification/http-checks.py
```

配置好真实模板后，登录小程序，在真机点击开始并接受三个模板；分别检查开始、短休息、第四轮长休息和休息结束通知，随后验证部分拒绝、暂停恢复和提前结束。浏览器预览和开发者工具不能替代微信真机订阅与投递验证。
