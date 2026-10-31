# 微信真机调试

## 当前上线前步骤（2026-10-31）

用户已完成小程序备案，代码直连https://api.ohtautau.com且公网HTTPS已验证。本轮未上传、提审或发布小程序。

本轮用户已在微信后台配置request的api及根域名、downloadFile的api域名，并开启工具域名校验后确认可编译。2026-10-31后续精简移除两端选境和网页分类城市，已重建当前dist；点“编译”后重新预览，不沿用旧二维码。Unexpected token .的依赖转译与ES2019守卫已修复，本地通过不等于微信预览上传通过。媒体总量提示仍为建议未通过，现有单张资源均小于200KB。

本地配置同步现在默认开启域名检查，避免下次build:local又关闭上线验收校验；仅显式设置OTTLOG_SKIP_DOMAIN_CHECK=1时允许本地跳过。其余热重载／重复JS转换约定保持。

1. 微信公众平台补全名称、图标、简介、与功能一致的服务类目及用户隐私保护指引。
2. 开发管理／开发设置添加https://api.ohtautau.com为request合法域名，图片下载按需要添加downloadFile域名。小程序备案与接口域名ICP备案不同；后台若拒绝域名，按实际提示完成要求，不能把本地跳过校验当作上线通过。
3. 排除当前工具“模拟器启动失败”，再以开启域名校验的正常构建检查真实手机的登录、数据保存、专注、图片与提醒授权。当前构建和包体通过，模拟器及手机本轮未通过实际验收。
4. 工具上传版本，后台版本管理设置体验版，由体验成员测试；审核需登录的功能准备独立测试账号，不使用个人真实记录或在文档中公开密码。
5. 提交审核，通过后管理员确认发布。如需微信通知，先完成订阅模板、后端配置与真机授权，提醒时间可保存不等同通知可用。

## 首页旧编译缓存导致空白（T06，2026-10-30复验）

本次用户日志为基础库3.17.2、开发者工具2.02.2608080，首页在Webpack模块装载器抛出`e[r] is not a function`，入口编号3605与当前磁盘产物不同。先通过官方自动化SDK确认模拟器确实空白；只清除当前项目的compile缓存再重新编译，未重建或修改业务源码，首页随即恢复。因此本次恢复点在开发者工具编译缓存，不能用Node VM启动通过代替这项检查。

当前窗口打开的是仓库根目录`D:\Projects\ottlog`，其miniprogramRoot指向miniprogram/dist。对同一项目路径运行官方CLI的`cache --clean compile --project <仓库根目录>`，然后重新编译；不要使用storage、auth、session或all，也不要在根目录、miniprogram和dist三个入口之间换开后比较不同的缓存。

实际检查包含首页reLaunch、右上角账号窗口打开／关闭、今日／待办／领域／习惯／专注往返；SDK异常事件与wx.onError均无记录。额外发现本机127.0.0.1:3300私有API通道停止，恢复原有SSH隧道后health为200 Healthy；未修改服务器配置或公开域名，也未提交登录或清理用户存储。原生复查报告见miniprogram/test-results/native-startup-recovery.json，截图为native-startup-recovered.png及native-startup-account.png。


在 `miniprogram` 中运行 `npm.cmd run build:device`，再在微信开发者工具重新编译并开始真机调试。

## 本地配置同步与 ScrollView 警告（2026-10-21）

在 `miniprogram` 中运行 `npm.cmd run debug:config`。公共配置只维护 `miniprogram/project.config.json`；脚本生成仓库根目录入口，并同步根目录、小程序目录和已有 dist 的私有设置：关闭域名校验、热重载及重复 JS 转换，保持压缩，基础库版本沿用小程序私有配置。其余各入口的本机设置保留。`build:local`／`dev:weapp`／`build:device` 自动调用同一同步逻辑。正式公共配置仍开启域名校验，不因本地调试修改线上规则。

推荐开发者工具打开本仓库的 `miniprogram/dist`；本文早期记录的 E 盘路径仅是当时环境。配置修改后重新打开项目、清除编译缓存并冷启动，不清 Storage。关闭本地域名校验只影响调试；线上仍需配置实际 API 的 request 合法域名。

首页 padding 警告来自 Taro 自动生成的 ScrollView 原生 `padding` 属性（即使页面未传入也会输出默认数组），不是首页 CSS 内距。当前项目使用 WebView，在 Taro 公共构建钩子中移除各 WXML 的该属性，保留内部 View 的布局；不修改 node_modules 或手工修改 dist。产物启动检查断言 base.wxml 不再携带它。

2026-10-21 使用本机 curl 在沙箱外复查 `https://ohtautau.com/health`，返回退出码 6（无法解析主机）；没有取得 HTTP 状态或响应体，不能报告 health 正常。需修复域名解析后重新检查，再验证微信和手机访问。

## 真机调试按钮无响应（T32，待诊断）

2026-10-11用户进一步确认：点击工具顶部真机调试按钮完全没有反应，尚未到生成二维码／手机扫码阶段。T31修复了日志中另一个接口连接问题，不能因此标记按钮恢复。

只读日志显示此前真机窗口曾启动，WeappRemote会话随后报internal error 1／subscribeHandler injected failed及-50004，之后未发现新窗口启动记录；不能仅凭旧会话错误确定本次按钮根因。工具同时存在appLaunch／navigateTo超时，系统进程Responding=true不证明工具内部调试状态正常。包内接口、启动、包体及原生WXSS检查已通过，不为按钮无响应继续盲目改业务代码。

官方CLI读取登录状态在允许写工具自身.cli缓存后，明确返回“服务端口已关闭”。继续直接诊断需用户在微信开发者工具“设置→安全设置→服务端口”开启后再运行官方命令；必要的工具授权由用户在工具内完成。开启命令端口只解决诊断访问，不能据此断言真机按钮已修复。未授权前不绕过工具授权、不修改工具安装文件，也不强杀可能有未保存编辑内容的进程。

手动恢复可先保存工具内未保存文件，完全退出所有微信开发者工具窗口后重新打开当前dist，仅清编译缓存，再重新编译并点击真机调试；不清Storage。若仍无响应，捕获点击前后工具主日志与WeappRemote日志变化，区分没有触发新会话、编译／打包失败及登录／权限错误，而不是要求用户提供不存在的手机报错。当前恢复结果未验证。

## 本地接口与手机连接（T31）

模拟器日志中的 `http://127.0.0.1:5229/... net::ERR_CONNECTION_REFUSED` 表示本机接口未监听；手机也不能用回环地址访问电脑。先检查API实际可达，再重建真机包，不能只切换开发者工具的域名校验。默认HTTPS地址 `https://ohtautau.com` 在2026-10-11本机检查未解析到IP，不能把此默认值当作已上线接口。

本次已在电脑当前局域网地址 `192.168.31.235:5229` 启动现有API程序，仅使用 `miniprogram/test-results/device-api-data` 隔离调试数据。health、账号profile、番茄提醒config与mottos四个GET均返回200；未修改后端源码或日常数据库。服务PID保存在 `miniprogram/test-results/device-api.pid`，运行日志为device-api-out.log／device-api-error.log。此IP随网络变化，不应写入正式源码常量；停止调试服务时先核对PID对应的dotnet进程及此API程序，再停止该进程。

重建命令（在miniprogram目录）：

```powershell
$env:TARO_APP_API_BASE_URL='http://192.168.31.235:5229'
npm.cmd run build:device -- --preview-records
```

`--preview-records`保持当前隔离预览与娱乐领域；普通build:device仍使用正常账号／存档。构建前拒绝localhost、127.*及IPv6回环等地址，输出实际接口和数据模式；显式局域网或HTTPS地址保留。环境变量仅影响当前终端，后续正式构建应移除该覆盖或换成已验证的HTTPS地址，不上传局域网调试包作为正式版本。

手机接入与电脑相同路由器网络，先用手机浏览器访问 `http://192.168.31.235:5229/health`。成功后完全重开微信开发者工具，打开 `E:\projects\ottlog\miniprogram\dist`，仅清编译缓存并重新编译，再点击真机调试扫码。health不通时继续查同网段／电脑防火墙，不清业务Storage。日志另有appLaunch与navigateTo超时，不能直接归因于API；如二维码无法生成，应保留真机调试弹窗的具体错误，如扫码后失败应取手机侧错误。当前电脑接口可达不代表手机连通或真机运行已验证。

- Taro 编译并压缩代码，保留函数名。源码映射保存在 `miniprogram/test-results/device-sourcemaps`，不放入上传目录 `dist`。
- 普通、本地和真机调试构建的项目配置均关闭 `es6`、`enhance` 和 `uploadWithSourceMap`，开启 `minified`。Taro 已完成语法转换，避免开发者工具重复转换及额外上传映射。`check-weapp-project.cjs` 在构建前检查源配置及 `project.private.config.json` 的有效覆盖；产物启动检查再检查 `dist` 配置，不能只改生成文件。
- 本地调试配置关闭 `compileHotReLoad`。修改后重新编译，以便检查完整的冷启动过程。
- 构建脚本分别检查主包小于 1,500,000 字节、每个分包小于 2 MiB，并检查上传配置。**本地 `dist` 大小不是微信服务端计算的上传源码大小**；最终体积仍以实际预览或上传结果为准。

错误码 `80051` 若附带 `source size ... exceed max limit 2MB`，应按包体超限处理，即使外层消息写着「网络请求错误」。

WXSS 报 `unexpected token ;` 时核对具体产物偏移及对应源码，不能因 Taro 构建或浏览器预览通过就排除样式语法错误。T27 首页问题来自规则开头多余分号，已修复源码并重新构建；共用产物检查增加空语句守卫，说明见 [开发说明](development.md#wxss-空语句编译失败t27)。使用新产物重新编译；如果仍显示旧位置错误，只清编译缓存，不清除业务 Storage。

WXSS 报 `common.wxss(1:29728): error at token *` 时，T30已准确复现为共享表单布局的通配选择器；源码已改为明确节点选择器，并接入源码／产物守卫。排查新WXSS错误应取完整文件／行列／token，使用开发者工具自带的 `resources/app.asar.unpacked/node_modules/wcc-exec/wcsc.exe` 编译实际WXSS及其导入文件，不凭汇总截图猜测或先归因缓存。编译器可用 `-pc <文件数>` 后传入相对dist的全部WXSS路径，从dist作为工作目录运行，输出重定向到test-results；保存版本、退出状态和标准错误。原生样式语法检查仍不等于模拟器或真机运行验证，见[开发说明](development.md#wxss-通配符编译失败t30)。

`https://usr//app-service.js` 是微信真机调试中的虚拟源码地址，应在开发者工具的源代码面板查看，不能在普通浏览器打开。

## 开发者工具 appservice 白屏（T28）

2026-10-07 模拟器显示 `something wrong in electron appservice`。工具日志先后出现页面框架请求超时、启动超时及读取 dist/assets 导航图标失败，后者明确报 `EMFILE: too many open files`。同次日志包含源码目录和仓库根目录监听。不要只根据白屏文字判断业务组件出错；本次已有文件句柄耗尽证据，其完整来源尚未确认。

源 `miniprogram/project.config.json` 已加入 `watchOptions.ignore`，排除 `**/node_modules/**`、`**/test-results/**` 和 `**/.git/**`。开发者工具自带配置参考说明此设置需重新打开项目生效；构建同步到产物，不直接编辑 dist。

恢复时完全退出微信开发者工具后重新打开，选择 **E:\projects\ottlog\miniprogram\dist** 作为项目目录，而非仓库根目录；这里有生成的 project.config.json，miniprogramRoot 为 `./`。选择「清缓存 → 清除编译缓存」再编译，不清 Storage 或业务记录。后续构建仍在源码 miniprogram 目录执行。

实际完成：`build:preview`、项目转换配置、18 页产物启动、67 个源码／20 个产物 WXSS 与主包 **1,499,484 字节**的原预算检查通过；源与产物 watchOptions 一致。日志 `miniprogram/test-results/appservice-recovery-build.log`。当前保持隔离的领域示例预览模式。

原生命令行尝试返回「服务端口已关闭」，没有实际关闭项目；未启用命令服务或强制终止工具。因此尚未验证重启后的微信模拟器或真机恢复。若仍白屏，需要取重启后的最新工具日志，确认是否继续出现 EMFILE，不能把本次产物检查当作原生恢复证明。

## 首页快捷方式仍显示旧界面（T29）

本节保留C172时期截图排查依据。后续C175将十款几何背景改为现有图标库的细线背景，并将拖动改为共享逐卡移动；最新产物守卫已检查共享common模块及WXSS导入，当前界面以 [C175](../Design.md#首页快捷方式统一排序与图标背景c175) 为准。

2026-10-08 用户截图包含旧的大卡图标、中英文文案、编号箭头和「名称与图标／大入口按序号排列」编辑区。核对当前源码与 `dist/pages/index/index.js` 的实际渲染节点，这些旧节点均已移除；产物包含 C172 的共享卡片、名称／背景／颜色编辑器，首页 WXSS 也含十款背景和六色变量。截图与当前本地包不一致，具体是旧运行会话、编译缓存还是先前发布版本，需要结合实际运行入口确认，不能只凭截图确定。

重新生成包后，微信开发者工具打开 `E:\projects\ottlog\miniprogram\dist`，确认项目内首页为 `pages/index/index`，清除编译缓存并重新编译、冷启动。仅清编译缓存，保留 Storage 中的业务记录和快捷方式设置；不要用「恢复默认」来处理旧运行代码。手机调试需从当前包重新预览，已发布的体验版／正式版不会因本地构建自动更新。

原生启动检查增加首页渲染代码与 WXSS 配套校验，检查真实 `className`／`children`、十款背景及六色声明；旧目录兼容数据仍可保留英文，不据目录元数据误判大卡渲染。该检查和浏览器四尺寸交互回归都不能替代微信冷启动验证。详细结果见 [开发说明](development.md#首页快捷方式运行界面核对t29)。

## 首页模块加载报错（T06，2026-10-06）

用户日志中的 `e[r] is not a function` 位于 Webpack 模块加载器，页面入口模块为 `9678`，发生在首页注册期间。日志未给出失败依赖的模块 ID，不能把此错误直接归因于某个 UI 组件。

此次核对发现源项目开启了 `es6`／`enhance`，与本文的既有约定冲突；本地 Node VM 直接执行 Taro 产物，不经过微信的二次转换，过去的启动通过不能覆盖这项差异。现已关闭并增加构建前与产物配置校验。重复转换及旧编译缓存是需要排除的因素，原生失败的准确原因仍待重新编译验证。

重新构建后，在开发者工具选择「清缓存 → 清除编译缓存」，再重新编译，关闭热重载后检查首页冷启动及底部页面往返。只清编译缓存，保留业务数据和 Storage。若仍报错，在源码面板暂停于异常并查看运行时参数 `r` 及实际加载的 `runtime.js`、`taro.js`、`vendors.js`、`common.js`，记录缺失模块 ID 与当前构建，避免只重复猜测压缩变量。

此轮命令行连接开发者工具未成功：CLI 无权写入工具用户目录的 `.cli` 文件；未执行微信环境冷启动，不能报告原生错误已消失。构建与自动检查结果见 [开发说明](development.md#微信编译配置校验t06)。
