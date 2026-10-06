# 开发说明

初版及规则确认：2026-10-04。开发规则见 [AGENTS.md](../AGENTS.md)，交互规则见 [Design.md](../Design.md)，正式决定与实现状态见 [决策记录](decisions.md)。

后续功能开发仅修改小程序（P01）。下文保留网页与 API 的结构和历史验证入口供兼容核对，不表示默认扩大改动范围。

2026-10-06 用户明确授权本次网站发布与双端数据同步（C69），配置与迁移步骤见 [云部署说明](cloud-deployment.md)。此例外不改变其他任务的默认端范围。

## 云部署与共用数据（C69）

网站、API 与部署文件已推送到 GitHub `main`（源码提交 `12ff106`），并通过 GitHub 读取分支确认。上传 309 个已检查文件，未提交小程序目录或其他原有未跟踪文件；没有上传个人数据库、导出、密钥、本机配置或构建产物。

2026-10-06 本地验证：网页 `npm.cmd run build` 通过（23 条路由）；`npm.cmd run dev -- --hostname 127.0.0.1 --port 3100` 正常启动。`node scripts/check-shared-api.mjs` 在独立临时库验证桌面／375×667 首页、网页代理、相同账号分别登录网页／小程序式直接请求、全部九个工具双向读写、原 ID 与游客隔离。此检查不是微信实机或线上 Supabase 测试。

后端 `dotnet build backend/Ottlog.Api/Ottlog.Api.csproj --no-restore -c PersonalTools` 零警告／错误；`dotnet run --project backend/Ottlog.Api/Verification --no-restore` 129 项通过，包含新增 19 项 Supabase 假 HTTP 检查：账号／键隔离、JSON 与 Unicode、同主键重试、远端失败不改旧值、健康检查、仅服务器 apikey、配置与容量拒绝。`scripts/personal-tools-test.py` 验证原 SQLite 账号／CSRF／容量、重启持久化与升级；`scripts/export-supabase-tools-test.py` 验证只读导出、ID／Unicode／SQL 引号、拒绝覆盖与游客。所有记录均为合成测试数据。

`node scripts/check-api-origin.mjs` 与本次变更文件的 ESLint 通过。全量 `npm.cmd run lint` 有既有 **86 个错误、4 个警告**，主要是旧 CommonJS 检查脚本与 React hooks 规则（包括 `motto-banner.tsx`），未放宽检查或扩大修改。这不是生产构建失败；上线前仍应处理其相关质量问题。Supabase SQL 尚未在真实 PostgreSQL 项目执行；云项目、托管、数据库迁移、DNS 和微信验证未完成。

## 项目地图

| 目录 | 作用 | 开发入口 |
| --- | --- | --- |
| `web/` | Next.js、React、TypeScript 网页及管理后台 | `src/app/`、`src/components/`、`src/lib/`；另读 `web/AGENTS.md` |
| `miniprogram/` | Taro、React、TypeScript 微信小程序 | `src/pages/`、`src/components/`、`src/lib/`、`src/app.config.ts` |
| `backend/Ottlog.Api/` | .NET 10 Web API、EF Core、SQLite | `Controllers/`、`Services/`、`Data/`、`Migrations/` |
| `docs/` | 使用、设计、开发、测试及配置说明 | [文档目录](README.md) |
| `scripts/`、`deploy/` | 备份与集成验证脚本、部署配置 | 按相关功能文档使用 |

依赖版本以各项目配置与锁文件为准。Windows 本地环境使用 .NET 10 SDK、Node.js 24；首次分别在 `web` 和 `miniprogram` 执行 `npm.cmd ci`。Python 集成脚本使用项目本机提供的 `.tools/python/python.exe` 时，先检查该文件是否存在，不假设系统安装了 `python`。

## 本地开发

- 推荐在 Visual Studio 打开 `backend/Ottlog.Api/Ottlog.slnx`，按根 README 启动。后端可联动网页；不要再重复启动相同服务。
- 网页默认 `http://localhost:3000`，API 默认 `http://localhost:5229`。运行测试前检查测试配置所需端口，不直接关闭用户正在运行的服务。
- 小程序开发者工具导入 `miniprogram` 项目目录；本地模拟器在该目录运行 `npm.cmd run build:local`，持续编译使用 `npm.cmd run dev:weapp`。
- `build:local` 默认连接 `http://127.0.0.1:5229`，本机私有配置关闭域名校验。手机不能用该地址连接电脑；真机地址和配置按 [小程序说明](miniprogram.md) 及 [真机调试](device-debugging.md) 核对。
- `npm.cmd run build:weapp` 默认使用正式接口地址，但环境变量 `TARO_APP_API_BASE_URL` 可以覆盖；切换接口后重新构建，不能仅凭命令名称判断包内地址。
- 所有小程序构建入口在编译前复用 `check-weapp-project.cjs`，检查源项目及私有覆盖是否关闭重复语法转换；构建产物启动检查同时检查生成配置。微信重新编译与缓存处理见 [调试说明](device-debugging.md)，不能把 VM 启动通过视为微信转换后通过。

## 按改动选择验证

以下命令在表中指定目录执行，本说明列出入口，不代表本次文档任务重新运行了这些测试。

按 P11 完成相关自动检查和构建；原生交互改动及发布前补微信环境验证。小屏验收以可读、易点和内容可达为准（P03），不固定首屏必须显示八张习惯卡。

| 改动 | 目录 | 相关命令 |
| --- | --- | --- |
| 小程序类型与数据逻辑 | `miniprogram` | `npm.cmd run typecheck`；逻辑改动运行 `npm.cmd run test:logic` |
| 习惯及领域交互 | `miniprogram` | `npm.cmd run test:daily`、`npm.cmd run test:domains` |
| 首页两屏导航、快捷入口（C48） | `miniprogram` | `npm.cmd run test:home-navigation`、`npm.cmd run test:home-shortcuts`；`test:home-overview`／`test:summary` 为导航检查的兼容别名 |
| 全部功能目录与便签／数据入口（C52） | `miniprogram` | `npm.cmd run test:home-navigation`、`test:home-shortcuts`、`test:statistics`；布局／滚动按 `test:screens`、`test:page-snap`，类型与小程序构建保留 |
| 全部功能操作／界面与快捷方式合并（C68） | `miniprogram` | 沿用首页导航／快捷方式、功能栏、统一创建、统计、页面布局与翻页手势检查；核对纯导航不启动／恢复计时、操作开始／恢复原计时、目录去重和自定义／排序持久化，保留类型与构建 |
| 旧成长存档统计 | `miniprogram` | `npm.cmd run test:growth`；验证旧数据的只读显示与计算，不恢复首页成长录入 |
| 番茄钟 | `miniprogram` | `node scripts/check-ui-preview.cjs --pomodoro` |
| 任务及日程面板 | `miniprogram` | `node scripts/check-todo-schedule.cjs`；`node scripts/check-ui-preview.cjs --todos` |
| 便签与餐单创建／编辑 | `miniprogram` | `node scripts/check-ui-preview.cjs --memos`；`node scripts/check-ui-preview.cjs --meals` |
| 任务／备忘录共用创建与兼容（C34） | `miniprogram` | `npm.cmd run test:entry-creation`（纯标签检查及 `--entry-creation` 隔离 UI）；`node scripts/check-ui-preview.cjs --todos`、`--memos` 与 `npm.cmd run test:home-shortcuts`；实际结果见下文 C34 |
| 按钮与分类控件外观（C39） | `miniprogram` | 既有 `--entry-creation`、`--home-shortcuts`、`--tag-row-spacing` 检查计算后的共享外观；按实际调用处补相关页面回归、`typecheck` 与 `build:weapp`，不另建只镜像实现的测试入口 |
| 管理员餐厅标签表单（隔离预览） | `miniprogram` | `node scripts/check-ui-preview.cjs --food-editor` |
| 统计与原页面分析迁移 | `miniprogram` | `npm.cmd run test:statistics`；并运行受影响原页面的相关检查 |
| 页面功能栏、文字入口与独立分类行（C51） | `miniprogram` | `npm.cmd run test:toolbars`；再运行受影响原页面交互、`typecheck` 与 `build:weapp`，末分类完整可达且首页输入大于 120px |
| 文本框旁创建与首页底部记录行（C65／C66） | `miniprogram` | `test:home-shortcuts`、`test:entry-creation`、`test:domains`、`test:toolbars`、`test:home-navigation`、`test:page-snap`；检查纯加号、首屏底部位置、空／小入口布局及原创建／排序／导航，保留类型和构建检查 |
| 通用内容分组小标题（C67） | `miniprogram` | 复用既有 `test:toolbars`、`test:home-shortcuts`、`test:screens` 的真实字号／颜色／间距与容器检查，按受影响页面补习惯、领域、统计、便签、饮食和专注交互；保留类型与构建 |
| 页面高度、返回、翻页和手势 | `miniprogram` | `npm.cmd run test:screens`、`npm.cmd run test:page-snap` |
| 弹层底部留白、分隔线与习惯默认日历完整性（C29／C32） | `miniprogram` | `npm.cmd run test:sheet-footers`；并运行受影响任务／习惯／领域的交互检查 |
| 标签行铺满与展开箭头间距（C30／C46） | `miniprogram` | `npm.cmd run test:tag-row-spacing`；并运行受影响标签表单的交互检查 |
| 小程序构建与启动、包体 | `miniprogram` | `npm.cmd run build:weapp` |
| 真机调试构建 | `miniprogram` | `npm.cmd run build:device`；随后在微信环境检查 |
| 网页 | `web` | `npm.cmd run lint`、`npm.cmd run build`；按范围运行 `npm.cmd run test:e2e`／`test:first-run` |
| API | 仓库根目录 | `dotnet build backend/Ottlog.Api/Ottlog.Api.csproj`；数据行为另运行相应隔离集成测试 |

小程序完整检查入口为 `npm.cmd run verify`。目前存在阅读页排序文案与全量 UI 断言不一致的已知问题，见 T01；不能把局部检查通过写成完整检查通过。

网页 E2E 需要先构建后端和网页，并在 `web` 安装 Playwright Chromium（`npx.cmd playwright install chromium`）；测试配置不复用现有服务，运行前确认相关端口空闲。小程序 UI 预览使用 `web/node_modules` 中的 Playwright，因此也需要安装网页依赖。

并行运行浏览器预览时，每个命令设置不同的 `$env:OTTLOG_UI_OUTPUT_TAG`，避免共享输出被覆盖。截图在 `miniprogram/test-results/`；预览适配器说明见 [UI-PREVIEW.md](../miniprogram/scripts/UI-PREVIEW.md)。

## 数据和构建边界

- 个人工具使用版本化 JSON，客户端复用状态层，后端按账号与工具键隔离。小程序的领域为 `domains`，习惯与打卡为 `reminders`；领域与成长足迹 `growth` 是不同工具。
- 统计页面按 C18 只读引用 `todos`、`pomodoro`、`reminders`、`meals`、`domains`、`growth`，不新增工具存储键或业务副本。沿用共享状态层的读取与既有同步，多源 `ready` 且 `owner` 一致、当前类别数据通过格式校验后才展示；账号切换、离线及不兼容数据的检查见 [统计说明](statistics-miniprogram.md)。
- 首页按 C48 保留快捷入口和全部入口两屏，原领域进展概览与页内停靠点已移除；`growth` 快捷方式进入领域主界面，保留既有布局设置。领域主列表的共享 `DomainProgressSummary`、目标累计／习惯今日口径和原数据保留，入口见 [首页两屏](miniprogram.md#首页两屏与领域入口c48)。
- 已确认但待实现的数据行为包括：持久自定义习惯排序（P02）、固定系统未分类（P05）、本机草稿恢复（P08）、个性设置账号同步（P09）、记录 ID 自动合并（P10）。新增字段和机制应兼容旧存档，并保留账号隔离；当前整份 JSON 保存不能称为自动合并。
- 后端餐食 `meals` 上限为 128 KiB，其他现有工具为 1 MiB；客户端还可能有更小的数量／字节限制，不能只依赖服务器拒绝超限。
- 数据库、上传图片和加密密钥默认在 `backend/Ottlog.Api/App_Data/`，配置 `Data:Directory` 可以覆盖目录。备份应覆盖实际使用的整个数据目录；修改迁移和恢复步骤前读 [工具导入导出说明](tool-backups.md) 及根 README。
- 主包本地预算严格小于 1,500,000 字节，各分包严格小于 2 MiB；源码映射放在测试输出目录，不进入上传目录。
- 保留 Taro 构建后的启动检查和分包边界校验。包体测量、微信预览／上传和正式审核分别报告。
- 小程序的 CommonJS 分包加载与 `optimizeMainPackage: false` 是现有构建方案；修改相关优化前核对 `miniprogram/config/index.ts` 和启动检查，不直接套用 Taro 默认值。
- 「统计」使用 `pages/statistics` 独立分包，主包保留 5 个底部导航页面；共 17 页、12 个分包。新增页面继续接受启动、依赖边界及原包体预算检查，不能通过放宽预算完成迁移。

## 任务与备忘录共用创建（C34）

交互主说明见 [Design.md](../Design.md#任务与备忘录共用创建c34)。共享组件和草稿机制已实现，本轮实际验收范围见本节末尾，不能用之前任务／备忘录独立表单的通过记录替代新弹窗验收。

- 任务和备忘录继续使用 `todos`／`memos` 的共享状态层及按账号保存队列；创建共用弹窗，不合并工具存储键。只提交当前类型，原实体编辑保留 ID、类型和未编辑的既有字段。
- 共享入口为 `components/entry-composer.tsx`，任务字段为 `components/todo-editor-fields.tsx`，备忘录字段为 `components/memo-editor-fields.tsx`，创建与原实体编辑复用对应字段。`lib/entry-draft.ts` 集中类型切换、草稿格式和保存校验；`initialMode` 决定入口创建类型并恢复各字段，未持久化的保存按原类型恢复重试。已有草稿标题非空且与首页新输入不同时，保留标题，将新输入追加备注／正文并提示；禁止覆盖恢复内容。
- `lib/entry-tags.ts` 的 `rankedEntryTags` 从任务标签、旧分类名称和备忘录标签按原标签规范合并频次，同记录重复名称只计一次，并列顺序稳定，保留 `DEFAULT_TODO_TAGS`。`lib/use-entry-tags.ts` 的 `useEntryTags` 返回 `{ tags, ready, owner }`：来源账号一致、就绪且有效才完整合并；未齐时只取当前账号可用来源，账号不一致时不显示混合目录。目录只读派生，不设置新标签存储键。
- `Memo.priority` 为可选的高／中／低／无枚举，历史缺省按无读取，不迁移或覆盖存档，不改旧排序；普通新建按 C47 默认无，象限任务沿用明确传入的优先度；已有记录及恢复草稿不被默认值覆盖。格式校验、旧存档、Markdown、图片和容量边界仍须验证。
- 创建草稿键为 `ottlog-mini-entry-draft-v1:${owner}`，游客与账号独立，只存本机，不放入正式工具记录。格式为 `version: 1`、`mode: 'task' | 'memo'`、`task`／`memo` 两套草稿与 `tagsText`；可选 `pendingSave` 标明本机失败的待重试类型，`captureText` 标记已带入的首页输入，避免重开重复追加或覆盖弹窗内改过的标题。关闭恢复及类型切换保留完整共用输入与各类型独立字段，输入时不按目标类型截断；保存时分别校验任务标题／备注 100／10000 字、备忘录标题／正文 80／6000 字。C34 仅涉及此共用创建流程，P08 全局草稿机制仍待统一实现。
- 最终保存核对当前身份、原来源有效性和最新工具状态，重复点击、晚到读取／图片回调及账号变化不得覆盖新数据或串账号；本机草稿读取失败不能覆盖旧内容，草稿／业务写入和图片失败需保留输入并允许重试。图片沿用原选择、压缩、预览和容量校验（`chooseMedia`、压缩、base64 与地址安全处理），不新增图片上传或录音识别接口；语音由输入法自带转文字完成。
- 共享状态层本机写入失败可能只保留 `volatile` 内存，保存 Promise 返回成功也须由 `hasVolatilePersonalTool` 判定未持久化。创建弹窗保留界面及原 ID 草稿，用 `pendingSave` 锁定原类型并提供同 ID 重试；不能先显示成功、清空草稿，或用新 ID 重试生成重复记录。持久化后才清理草稿；残留草稿通过已保存 ID 避免重复恢复。原因与通用规则见 T13。
- 创建弹窗晚于页面 `onShow` 挂载，不只依赖状态层 `useDidShow`：`EntryComposer`、`useEntryTags` 和 `MemoEditorFields` 的图片只读来源在挂载时显式 `retry` 初始化，复用共享读取，不新增同步流程。浏览器预览可能掩盖这一时序，微信需额外验证；见 T12。
- 字号、高度和按钮在两套共享字段中封顶，保留至少 40PX 触控，避免宽屏 `rpx` 扩大后默认字段落到视口外。检查默认无滚动的字段位置及底部保存、长内容／图片／下一步滚动可达，不用取消边界或缩小字号绕过；见 T14。
- 相关检查覆盖合并标签的频次／并列／旧分类、优先度缺省与合法枚举、单来源读取和账号隔离；UI 覆盖首页单行输入就地展开、快捷入口一致、双向切换不丢专属字段、长文本不截断且保存校验、关闭恢复、新输入合并旧草稿、仅保存当前类型、编辑原 ID、异步失败及账号变化。使用隔离数据完成四种尺寸（含 375×667），验证本机 `volatile` 与同 ID 重试、晚挂载来源读取和默认字段完整可见，再做相关任务／备忘录回归、类型、构建、17 页启动和原预算检查。原生输入法语音、键盘和微信安全区需在微信环境验证，浏览器预览不能替代。

2026-10-05 已完成：`typecheck`、全部 `test:logic`、最终 `--todos`、`--entry-creation`、新共享样式 `--memos`、`--home-shortcuts`、`--screens`、`--snap` 与 `--sheet-footers`（34px 模拟安全区）通过；浏览器适配预览套件覆盖 360／375／430／768px，含 375×667 短屏。最后版统一创建再次通过四尺寸，其中 144 字原始标签切换保留及保存限制、首页新内容追加／相同输入重开去重／编辑标题防覆盖、长标题和正文按四尺寸验证；账号切换、业务本机写失败后的 `volatile` 同 ID 重试仅一条记录和坏草稿分支仅在 360px 执行，套件另覆盖草稿及图片失败。首页快捷最终复测通过；翻页检查覆盖首页三屏、其他两屏、长页、取消与水平手势。`check-entry-tags.cjs` 已纳入 `test:logic`，新增 `npm.cmd run test:entry-creation` 并纳入 `verify`。最后版本 `typecheck` 与 `build:weapp` 通过，主包 **1,447,262 字节**，17 页／12 分包启动、依赖边界及原 1,500,000 字节预算通过。

本轮相关检查均按范围完成，未一次运行完整 `verify` 或全部无关 UI，不能称全量验证通过。微信开发者工具、真机、输入法语音转文字及原生键盘尚未实测。

2026-10-05 C34 便签排版补充：`components/memo-editor-fields.tsx`／`.css` 已以任务字段为基准调整标题字号和高度、彩色旗帜优先度入口，以及紧接标题的正文书写框体、边线、字号、高度和间距；书写／预览、图片、计数整合到正文下方工具栏。标签去掉额外小标题，前排常用四项与任务一致；统一创建和原便签编辑复用共享字段，保留颜色／置顶、Markdown／图片、类型切换与原 ID。本轮仅调整排版和显示，`typecheck` 与最终 `build:weapp` 通过，主包 **1,447,575 字节**，17 页／12 分包启动及原预算通过。`--entry-creation`（`ui-preview-memo-layout-entry`）与 `--memos`（`ui-preview-memo-layout-memos`）在 360／375／430／768px（含 375×667 短屏）通过：新增检查「标题→正文→工具栏→标签→设置」的实际顺序、正文与任务备注左右边界／高度一致、有边框／底色，以及标题和优先度至少 40px 触控；原切换输入、保存、图片、颜色和草稿流程及原便签编辑通过，375／768 创建和原编辑截图已目视。微信环境未测。以上 C34 原有检查与 C35 颜色栅格的历史包体记录保留，不改写为本轮数据。

## 筛选浮窗位置（C36）

交互规则见 [Design.md](../Design.md#筛选与相邻展开c36)。待办与便签筛选已从独立底部 `overlay` 迁到锚定按钮的 `ChoicePopover`，当次验收通过；日程内部选项的展开方式后续由 C41 更新，阅读内容及业务列表仍可内联展开。

- 复用共享浮窗测量按钮实际位置，使用 8px 间距，按可用视口选上方／下方并限高。中部 `ScrollView` 承载可滚动筛选内容，标题与底部查看／清除保留；页面沿用原筛选状态和回调，不另存数据或重写筛选逻辑。
- 展开／收起由同一状态驱动面板和旋转箭头；外部关闭及查看关闭须同时恢复。查看左／清除右遵循 C33，原关键词、标签、条件、结果数量与清除行为保留。
- 通用验收量按钮边界、面板边界、8px 间距及视口内可见性，核对上方／下方放置、内部滚动、标题／操作可达、外部／查看关闭及箭头恢复，再检查原筛选行为；不能以旧底部筛选测试通过替代相邻位置验收。

2026-10-05 C36 本轮最终结果：`--memos`（`ui-preview-filter-anchor-memos`）和 `--improvements`（`ui-preview-filter-anchor-todos`）在 360／375×667／430／768 四尺寸通过，测量实际按钮下方约 8px 邻接、视口不溢出、标题／操作栏常驻、滚到末项可达、查看左／清除右及原真实筛选结果、箭头 0／180° 和关闭后的无障碍展开状态恢复；便签创建、原编辑、图片和颜色回归通过。计数角标 18px 等宽高、任务筛选输入 40～44px 几何检查通过；`--tag-row-spacing` 四尺寸及 `typecheck` 通过，最新 375／768 两页截图已目视。最终 `build:weapp` 主包 **1,447,721 字节**，17 页／12 分包启动及原预算通过。本轮筛选实际均在上部按钮下方，未额外验证强制上方场景；共享控件的空间不足翻上方能力及两方向通用验收规范保留。微信环境未测，历史 C34／C35 验证数据不改写为本轮结果。

## 按钮标准与迁移（C37）

主标准见 [Design.md](../Design.md#按钮文字与图标c37)。本轮创建模块及迁移已实现：首页、任务、便签、习惯，以及实际挂载的领域／目标、格言、餐单／餐厅等入口已接入；未引用 `growth-garden` 不迁移。相关四尺寸预览已通过，最终联合构建结果另记；历史 C34–C36 的检查和包体保留。

- 先区分实体创建入口、提交、普通业务动作和明确上下文的辅助操作，再按主标准接入共享组件与图形。同一对象跨页统一创建名称；保留原回调、表单创建／编辑状态、加载／禁用、账号守卫和业务数据流程。按钮文字统一不修改存储 `mode`、记录 ID 或全部页面标题，局部插入与业务类型／状态符号不机械替换。
- 紧凑入口使用 `CreateButton`；首页创建快捷卡／链接／全部功能／最近入口保留原容器、功能图标及自定义名称，名称旁按后续 C39 不加小加号，不能机械替换卡片。创建／编辑提交改为纯文字，首页与习惯编辑的取消／保存用文字，加载更多去掉无添加语义的加号；记录餐单／补记餐单／添加常用餐食保留业务词。餐厅创建与收起复用同组件，保留 chevron 节点动画，收起隐藏创建加号。
- 窄容器通过换行或布局调整保留完整创建名称；沿用现有强调色，封顶字号／控件尺寸。相关检查核对加号在左、同对象文字一致、提交无装饰符号、辅助图标的对象名称与至少 40px 触控，并通过实际点击确认仍打开原编辑器及保存原记录；保留返回、展开、正负类型、火花／闪电与现有业务动词。
2026-10-05 C37 验收：`--entry-creation`、`--todos`、`--domains`、`--mottos`、`--daily`、`--home-shortcuts`、`--screens` 最终在 360／375×667／430／768 四尺寸通过，输出目录为 `ui-preview-button-standard-final-对应参数`；便签、餐单、餐厅编辑既有套件本轮也分别通过，目录为 `ui-preview-button-standard-memos/meals/food-editor`。验证共用加号在左、完整创建名称、纯文字提交、四象限底栏可见及原创建／编辑／保存／账号隔离流程；首页排序继续保留原精确几何与像素对比，修正图标按 rpx 增长造成的状态切换高度差后重跑通过。餐厅展开检查同一 chevron 节点、0／180° 与收起隐藏加号；习惯／格言关闭、任务完成和领域记录删除补足触控尺寸。375／768 首页与 375 任务四象限截图已目视。类型检查通过；最终联合构建结果见下方 C37／C38 本轮最终结果，未运行无关全部 UI 或完整 `verify`，微信未实测。

## 领域单线进展（C38）

领域主列表使用 `components/domain-progress.tsx/.css` 的只读 `DomainProgressSummary` 与单轨 `DomainProgressLine`；行内不嵌套操作按钮，调用页保留原领域导航。`lib/domain-progress.ts` 按 6／3／1 派生宽度与全域共同刻度，不新增保存；原 `domainCompletionCounts` 口径、归档及撤销、共享习惯和账号隔离保留。C38 原右侧目标复用 `displayedDomainGoal`，当前优先、其次最近完成；后续 C50 在主列表隐藏此内容，目标数据与详情保留。

原 C38 使用紧凑单列，主列表现已按 C50 改为每行两张领域卡；原首页概览及其内部滚动已按 C48 移除。原微滑动来自八行高度、间距和尾部 padding 略大于扣除上下导航后的可用区；不通过禁止手势或裁切掩盖。修复以固定 PX 触控／字号和紧凑布局减少实际高度，验收量最后行、内容溢出及上下导航边界；管理／更多领域可滚动。领域源已就绪而习惯未就绪时，仍显示领域详情入口、数量「—」及重试，不能用初始习惯数据伪造零值。

`check-domain-completion.cjs` 已补权重及连续段派生的纯逻辑验收；当时的 `--home-overview` 与 `--domains` 四尺寸套件按新结构更新（首页部分后续由 C48 替代），保留十二领域、完成撤销、习惯联动、跨日、持久化与账号流程。最终两套四尺寸几何和业务流程、纯逻辑与联合构建已通过，详情如下；浏览器适配不等同微信真机。

2026-10-05 C37／C38 本轮最终结果：`--home-overview`（`ui-preview-domain-single-line-home`）、`--domains`（`ui-preview-domain-single-line-domains`）在 360／375×667／430／768 四尺寸通过。检查单条连续色段、6∶3∶1 单位长度、全列表共同刻度、右侧目标内容及完成状态、长目标真实省略节点／完整无障碍文字、完成撤销和习惯联动；保留跨日、持久化及账号隔离。首页八域普通 View 所有行完整且无内滚；十二域仍有独立 ScrollView／提示，375 短屏确有内滚且末项可达，外层屏不移动；较高视口允许十二域恰好无需实际滚动，不制造溢出。主列表默认八域完整免滚，宽屏仍单列，无效习惯源显示「—」和重试、原数据保留。纯逻辑 `check-domain-completion.cjs` 和脚本语法通过，375／768 两页截图已目视。最终 `typecheck`、`build:weapp` 通过：主包 **1,455,699 字节**，17 页（5 主包、12 分包）启动及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/buttons-domain-progress-build.log`。没有运行无关全量 `verify`，微信开发者工具／真机未测，历史包体和当次验收保留。

## 控件外观与复用（C39）

下方为 C39 当次实现和历史验收；2026-10-06 起按钮选型与尺寸规范按 [C60](#按钮分层与动态尺寸c60)，原默认调用继续兼容，不以本段旧绑定关系限制新增场景。

设计主说明见 [Design.md](../Design.md#按钮与分类控件外观c39)，根目录 AGENTS 约束后续开发。共用实现为 `components/ui-button.tsx/.css`：`ActionButton` 区分 primary／secondary／quiet／danger／icon，`ChoiceButton` 统一表单选项状态，页面分类栏通过 C53 的 category 变体统一。正式主提交 16px／600／至少 48px，其他文字控件 14px／500／至少 40px；同字体、行高 1.4、字距 0、默认圆角 10px及各类型三种颜色均由共享变量定义，分类栏外观例外见 [C53](#通用分类栏c53)。

- 页面样式仅安排布局，共用组件保护外观，不让原高优先级 CSS 或调用处 style 意外覆盖字号／字重／颜色。新动作明确主次；兼容旧 `tool-primary` 等类名只是迁移适配，不作为新增按钮规范。按钮子文字继承，业务色标显式使用原数据的颜色，防止中性前景色覆盖优先度旗帜。
- 创建和返回封装基于动作按钮，表单单选、多标签、颜色和优先度使用选择按钮，原生 Picker 的显示入口复用同一个选择外观。实际挂载的首页、任务、便签、习惯、领域／目标、格言、专注、饮食／餐单／餐厅、阅读与账号等调用处已迁移；未引用的旧组件不据此声称完成。
- 保留原 ID、状态层、保存回调、加载／禁用、账号校验和业务图标。完成标记、日历日期格、对象卡片与颜色素材块保留专用语义，原触控尺寸要求仍适用；日程 quiet 行单独保留 C29 行边界，旧最后 Text 的 chevron 样式移除，防止错设右侧值文字字号。
- 首页创建快捷卡、链接、全部功能及最近入口不在名称旁添加小加号，原功能图标和自定义名称保持；首页输入右侧创建和其他紧凑创建仍用带加号的 `CreateButton`。这是 C37 的明确例外，不能再批量给快捷方式标题加回加号。
- 验收使用既有 runner、真实共享组件和隔离数据，量计算后的字体、字重、行高、零字距、文字／底色／边框、圆角和触控，核对选中／未选中及独立业务色标；保留原标签间距、等宽栅格、严格快捷方式排序几何／像素与保存／草稿／账号断言。浏览器将零字距计算为 normal 时归一为数值零，仍拒绝非零，不放宽外观标准。

2026-10-05 C39 最终验收：`--entry-creation`、`--home-shortcuts`、`--tag-row-spacing`、`--daily`、`--domains`、`--sheet-footers`、`--screens`、`--todos`、`--pomodoro`、`--memos`、`--meals` 共十一套在 360／375×667／430／768 四尺寸通过。输出前缀 `ui-preview-controls-standard-final-*`，`screens`／`todos` 最终为 `ui-preview-controls-standard-fix-*`；底栏套件含 34px 模拟安全区。检查实际字体和三种颜色、选中前后、优先度旗帜／色点及无优先度空心标记、长标签与等宽列、首页卡／链接／最近入口及自定义名称无小加号；保留原保存／草稿／账号隔离、排序精确几何与像素、计时／撤销和完整日历断言。375／768 相关截图已目视。

待办 40px 控件分两行后，旧象限占视口 80% 的断言在 375×667 与可读控件冲突，已替换为工具栏下缘→等宽等高四象限→40px 底部提示→视口下缘的严格接缝几何，并核对完成／编辑不重叠及创建触控；不压小字体或移除边界检查。专注测试的旧 rpx 高度假设改为 C39 固定尺寸与实际样式断言。日程日期格保留原浅绿选择色，快捷选项采用 C39 深绿，二者各明确选中且联动，旧同底色断言改为各类型的明确色值。餐单来源未就绪时禁用依赖账号来源的入口，避免初始化重挂载丢失刚选择的菜单；保存和坏存档处理沿用原逻辑。

最终 `typecheck`、`build:weapp` 通过，主包 **1,460,043 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/controls-standard-build.log`。C37／C38 的历史包体及当次结果保留；未运行无关全量 `verify`，微信开发者工具／真机未测。

## 优先度浮窗与任务步骤（C40）

主规则见 [Design.md](../Design.md#优先度与下一步c40)。共用 `PriorityFlag` 统一优先度图形与原业务色，高／中／低为实心、无为轮廓；`PriorityOptions` 改为四项单列。任务、便签及习惯表单复用该图形，优先度 `ChoicePopover` 明确传入 `showIndicator={false}`、`panelWidth={168}`；其他调用保持默认 chevron 和原面板宽度、锚定／限高逻辑。取消与关闭不写业务数据，选择后只回填原草稿。

`TodoEditorFields` 的所有下一步行使用 6px 圆点，删除首行文字和后续折箭头，备注与下一步之间增加 1px 分隔线；保留输入提示、首行焦点、追加／排序／删除、空首行与保存规则。统一创建与原任务编辑同步使用，数据和任务链计算不变。优先度是 C28 chevron 的明确例外，不把本条扩展为删除其他分类／标签／筛选箭头。

2026-10-05 最终验收：既有 `--entry-creation`、`--todos`、`--daily`、`--domains`、`--memos`、`--tag-row-spacing` 六套均通过 360／375×667／430／768 四尺寸，输出 `ui-preview-priority-vertical-entry/todos/daily/domains/memos/tags`。任务与统一创建套件补充实际窄窗宽度／8px 相邻距离、四项竖排同列、业务旗帜颜色与轮廓无优先度、无箭头、圆点和分隔线检查；原完整布局／草稿／账号／保存、任务链与其他标签箭头断言保留。375 优先度浮窗／任务默认及 768 相关截图已目视。

`typecheck`、最终 `build:weapp` 通过，主包 **1,459,883 字节**，17 页（5 主包、12 分包）启动及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/priority-vertical-build.log`。C39 历史包体与当次验收保留；未运行无关全量 `verify`，微信开发者工具／真机未测。

## 日程独立选项窗口（C41）

主规则见 [Design.md](../Design.md#独立选项窗口c41)。此前条件渲染的 `todo-schedule-section`／年月输入直接插入主日历滚动区，导致展开后高度增大、日历挤压；提醒日期复用主日历目标还会改变主视图。现改为共享 `ChoicePopover` 承载年月、时间、提醒、重复和提醒日期，日期主面板始终保留完整日历与三行设置。原因及预防见 T20。

- `TodoScheduleSheet` 保留原日程状态、确认／关闭／清除和保存边界；子窗关闭只改变显示状态，不清空当前日程草稿或写业务数据。重复的月底／闰日锚点、提醒绝对时间、平台授权与最终任务保存流程保留。
- 共享 `ScheduleCalendar` 统一 42 格、年月边界、今天／明天／下周与选中反馈。任务／提醒分别持有显示月份，提醒日历使用居中完整窗口，年月窗口仍相邻；提醒选择后返回原提醒设置。
- `ChoicePopover` 支持 quiet 行入口、明确的居中位置及内容变化重新测量；动态自定义输入不能超过小窗可滚动中部；提醒／重复选项使用三列，按实际可用空间限高；出现日期时间或自定义间隔后使用完整居中窗口，避免机械沿用 65% 高度上限或强行锚定截断输入／授权按钮。键盘收起和关闭层级仅在开窗时处理，内容尺寸重算不重复收起键盘。嵌套 Esc 只关闭最上层窗口，避免同时关闭日程或创建弹窗；必要的微信授权保持。
- 复用原日程测试 helper 与既有 `--todos`、`--entry-creation`、`--sheet-footers`，核对独立窗口、主日历完整与位置稳定、42 格提醒日历、嵌套关闭、相邻间距、选中反馈、输入／保存重开／取消，以及原提醒与重复业务流程；共享浮窗需回归标签和便签筛选，不能只证明新面板可见。

2026-10-05 最终验收：`--todos`、`--entry-creation`、`--sheet-footers` 在 360／375×667／430／768 四尺寸通过，输出 `ui-preview-schedule-popovers-final-todos/entry/footers`；共享浮窗的 `--memos`（`ui-preview-schedule-popovers-verified-memos`）和 `--tag-row-spacing`（`ui-preview-schedule-popovers-tags`）本轮四尺寸回归通过。测量主日历／三行／按钮栏展开前后位置与高度差不超过 1px、普通小窗 8px 相邻距离、完整 42 格提醒日历的行列边界／无重叠／至少 40px 日期格、时间／间隔／微信提醒按钮完整可见，以及窗口标题／操作栏不越界；底部套件含 34px 模拟安全区。嵌套逐层关闭、快捷日期、年月边界、日期与提醒互不替换、确认／清除／取消、保存重开、重复锚点与提醒授权原流程通过；375 提醒设置／提醒日期／时间与 768 时间截图已目视。

纯逻辑 `node scripts/check-todo-schedule.cjs`、`typecheck`、最终 `build:weapp` 通过，主包 **1,465,406 字节**，17 页（5 主包、12 分包）启动及原主包 <1.5 MB 预算通过；构建日志 `miniprogram/test-results/schedule-popovers-build.log`。历史 C40 包体和当次验收保留，未执行无关全量 `verify`；微信开发者工具／真机布局、键盘与授权未实测。

## 日程数字输入对齐（C42）

主规则见 [Design.md](../Design.md#单行数字输入对齐c42)，原因记录为 T21。原年月输入将高度、边框和上下 padding 直接放在原生 `Input` 上，未明确单行行高；源码还允许继承页级 1.65 行高及全局输入样式。用户截图显示数字默认偏下。原浏览器检查只证明外框可见，不能证明微信文字与光标对齐。

现复用 `components/schedule-number-input.tsx/.css`：40px 外框居中承载 24px 输入行，明确 16px 字号与 24px 行高、零上下 padding；外框负责边框、背景与横向 padding，整个框点击通过原生 `focus` 聚焦，禁用仍不可编辑。共享日历的任务／提醒年月和 `TodoScheduleSheet` 的时间／提醒时间／重复间隔均接入，原数字过滤、范围校验、日期语义、授权与保存不变。移除原日程两组直接为 Input 设置高度及上下 padding 的样式，作用域防止外层通用输入规则覆盖。

既有任务 helper 增加输入行／外框／单位实际中心、文本行可容纳、默认与填写后状态以及完整框边缘点击聚焦检查，任务套件补充用户截图的 2026 年 7 月填写与取消、四尺寸截图；原独立窗口、主日历完整性、快捷日期、年月边界、提醒与重复业务断言保留。2026-10-05 最终验收：`--todos`、`--entry-creation`、`--sheet-footers` 三套在 360／375×667／430／768 四尺寸通过，输出 `ui-preview-schedule-number-align-todos/entry/footers`。数字输入行与外框、单位中心差不超过 1px，零上下 padding、文字行不超出输入区，默认与填写后布局、整个触控框边缘点击聚焦通过；原日程／保存／提醒／任务链及 34px 模拟安全区检查保留。375／768 的年月输入截图已目视。微信开发者工具／真机字形、光标及键盘未实测。

`typecheck`、最终 `build:weapp` 通过，主包 **1,465,933 字节**，17 页（5 主包、12 分包）启动及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/schedule-number-align-build.log`。C41 历史验证和包体保留，未执行无关全量 `verify`。

## 无边框按钮反馈（C43）

`ui-button.tsx/.css` 为 quiet／icon 动作按钮及未选中的 `ChoiceButton iconOnly` 共用半透明反馈。默认透明、鼠标悬停／按下显示浅底、移开恢复；禁用无反馈，已选中的选项色保留。背景由内联样式引用局部反馈变量，在共享 CSS 切换变量，避免受保护的透明内联背景覆盖普通 `:hover` 规则；原生 Button 接入 `ui-control-pressed` 的 `hoverClass`，保留调用者显式设置和原事件。浏览器悬停限定在 `hover: hover`，按下另有反馈，文字、边框和几何不变。

2026-10-05 本轮 `typecheck` 及 `--todos`、`--entry-creation` 两套四尺寸预览通过（360／375×667／430／768），输出 `ui-preview-borderless-feedback-todos/entry`。日程检查覆盖三个月份按钮及年月入口默认透明、悬停半透明、按下反馈、移开恢复和几何不变；1000-01／9999-12 边界禁用按钮不高亮且点击不改变月份，原日期／提醒／循环／任务链保存回归保留。统一创建套件验证普通与已选中的图标、选项样式及原切换、草稿、保存流程；375／768 悬停截图已目视。微信开发者工具／真机原生按下反馈未实测。

最终 `build:weapp` 通过，主包 **1,466,759 字节**，17 页（5 主包、12 分包）启动及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/borderless-feedback-build.log`。C42 历史包体与当次验收保留，未执行无关全量 `verify`。

## 任务备注与共享 Markdown 编辑（C44）

任务备注和备忘录正文使用 `components/markdown-note-editor.tsx/.css`；从原 `MemoEditorFields` 提取渲染、书写／预览、原生选图／压缩、点击图片预览及移除，`TodoEditorFields` 同时覆盖统一创建和原任务编辑。两类父字段负责原草稿与来源状态，挂载时显式 retry；编辑区接收当前账号、对象 ID 和容量回调，选图完成后重新核对上下文及就绪来源，禁止跨账号／对象回写。处理时锁住字段、提交、切换与关闭；失败或取消不清空输入。

任务沿用 `description` 保存 Markdown，新增可选 `images: MemoImage[]`，旧 v1 记录无需迁移；`note-image-data.ts` 共用纯数据校验（最多 6 张、每图 180 KB、持久 data URL）及 900 KB 完整状态预留。原 `memo-images.ts` 保留压缩／原生预览 API 和兼容导出，服务器继续以原 JSON 存储／1 MB 上限接收，不改后端或网页。任务保存与生成循环／下一步复用容量校验；生成继承备注／图片，先验证完整结果，再一次提交，超限保留原未完成状态。

`entry-draft.ts` 切换共享正文与图片，`entryDraftForStorage` 将公共图片仅存于当前类型，避免同一图片在 task／memo 两份草稿中重复占容量，旧 v1 草稿可恢复；继续原账号草稿键，不新建存储。任务创建原 volatile 同 ID 重试保留，原任务编辑也检查本机持久化状态后才关闭。旧备注长度与当前类型保存校验保留，图片临时设备路径不进入存档。

2026-10-05 本轮验收：`typecheck`、任务逻辑（含新增图片验证／保存／删除／旧编辑省略字段保留／循环及下一步容量原子性）、Markdown、共用标签与任务双端 metadata 往返检查通过。`--todos`、`--memos`、`--entry-creation`、`--sheet-footers` 四套在 360／375×667／430／768 四尺寸通过，输出 `ui-preview-task-markdown-final-todos/memos/entry/footers`，底栏含 34px 模拟安全区。新增任务正文检查真实 Markdown 渲染和完整长预览、图片查看／保存重开／删除、双向类型切换（含移除同步）、一份图片的创建草稿恢复、取消／读取失败保留输入；360px 另验证原任务本机写失败保留编辑器及同 ID 重试，以及选图期间锁定提交／切换／关闭、换账号后忽略旧回调。原任务日程、提醒、循环、任务链、便签及共享创建回归保留。375／768 默认任务编辑与 375 长预览截图已目视，默认工具栏、下一步与标签完整可见。

最终 `build:weapp` 通过，主包 **1,471,075 字节**，17 页（5 主包、12 分包）启动及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/task-markdown-build.log`。微信开发者工具／真机选图、压缩、键盘及 RichText 未实测；未执行无关全量 `verify`，历史 C43 验收和包体保留。

## 备忘录标签末项（C45）

`MemoEditorFields` 将 `TagChoiceRow` 的真实节点移到颜色／置顶设置之后，统一创建和原便签编辑同步生效。设置下方间距为 12px、标签末项为 4px，交换原中间／末项间距，总高度保持；保存／删除等操作、共用标签目录、切换及持久化逻辑沿用。既有统一创建的几何检查顺序同步为「标题→正文→工具栏→设置→标签」。

2026-10-05 本轮 `typecheck` 通过；`--entry-creation`（`ui-preview-memo-tags-last-entry`）与 `--memos`（`ui-preview-memo-tags-last-memos`）在 360／375×667／430／768 四尺寸通过。既有创建几何检查覆盖设置→标签的实际顺序、默认字段完整可见；原标签选择／切换／保存、颜色／置顶、Markdown／图片及原便签编辑回归通过，375／768 创建截图已目视。最终 `build:weapp` 通过，主包 **1,471,075 字节**，17 页（5 主包、12 分包）启动与原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/memo-tags-last-build.log`。微信开发者工具／真机未实测；未运行无关全量 `verify`，C44 历史验收保留。

## 标签行宽度分配（C46）

C30 为修正箭头前的填充空白，将标签区和按钮都按内容宽度收拢；短标签因此在行尾留下未使用空间。C46 改为共享 `.form-tag-common` 分配可用宽度，内部按钮采用等宽弹性项，6px 间距保持，展开按钮不伸缩。可用空间由实际按钮占据，避免只拉长容器而在箭头左侧重现空白；无常用项仍不渲染标签容器。任务、备忘录、餐单与餐厅共用布局，原选项顺序、选择／自定义、共享标签目录和保存逻辑保留。

既有 `test:tag-row-spacing` 补充实际行首／行尾铺满、按钮等宽、触控宽度和项间距离，保留空／单个／短／长／两位数计数／动态选项、完整名称及多选同步检查。2026-10-05 本轮 `typecheck`、`--tag-row-spacing`、`--entry-creation`、`--memos`、`--meals` 四套预览均通过 360／375×667／430／768 四尺寸，输出 `ui-preview-tag-row-fill-tags/entry/memos/meals`。核对行首／行尾铺满、短／长按钮等宽、正常间距与触控，保留选择同步、类型切换、草稿、保存／重开、Markdown／图片及餐单原流程；375／768 标签示例、375 备忘录与 768 任务默认截图已目视。最终 `build:weapp` 通过，主包 **1,471,065 字节**，17 页（5 主包、12 分包）启动与原主包 <1.5 MB 预算通过，日志 `miniprogram/test-results/tag-row-fill-build.log`。微信开发者工具／真机未实测；未运行无关全量 `verify`，C45 与其他历史验收保留。

额外的 `--food-editor` 在 360px 通过、375×667px 于长标签浮窗「完成」按钮完整可见断言失败，可见比例 0.991406；未继续后两尺寸。仅恢复此次两行宽度样式作改前对照，结果在同一断言复现相同比例，随后已恢复 C46 样式；输出 `ui-preview-tag-row-fill-food-editor/food-baseline`。已记录 T23 为既有问题，不改浮窗源码或放宽断言，后续按浮窗可视高度单独修复。

## 新建默认优先度（C47）

`createTodo` 未指定象限或收到无效象限时默认 `later`（important／urgent 均为 false）；四象限入口继续传入明确 ID。`newEntryDraft` 由该任务初始化备忘录共用优先度，因此首页、待办通用入口和备忘录入口同步默认无，不另外写页面默认值。`switchEntryMode`、已有草稿恢复、手动优先度和编辑保存规则保留，旧存档不迁移。

既有任务逻辑断言更新普通／无效入口默认值，四象限检查保留；统一创建检查覆盖四象限实际入口与保存、普通入口默认无及保存、类型切换与手动选择后的草稿恢复。2026-10-05 本轮 `typecheck`、`check-todos.cjs`、`check-entry-tags.cjs` 与 `check-todo-cross-client.cjs` 通过；`--entry-creation`（`ui-preview-default-none-priority-entry`）、最终 `--todos`（`ui-preview-default-none-priority-todos-final`）和 `--memos`（`ui-preview-default-none-priority-memos`）三套通过 360／375×667／430／768 四尺寸。覆盖四象限入口的优先度、类型切换及保存；普通任务／备忘录无需手动重置即可保存为无，恢复手动中优先度草稿不被覆盖。任务旧流程曾断言普通创建出现在高象限，已按新规则改为无象限；同象限现在有两件任务，原提醒测试按既有任务名称定位，保留原业务断言。默认 375px 任务轮廓旗及 768px 备忘录切换截图已目视。最终 `build:weapp` 通过，主包 **1,471,068 字节**，17 页（5 主包、12 分包）启动与原主包 <1.5 MB 预算通过，日志 `miniprogram/test-results/default-none-priority-build.log`。微信开发者工具／真机未实测，未运行无关全量 `verify`；前述历史结果保留。

## 首页移除领域进展（C48）

首页取消 `HomeDomainOverview` 挂载和两份专用组件文件，使用 `PageScroll` 默认的 page-core／page-more 两个停靠点；首屏下一页直达全部入口，返回直达首屏。`growth` 旧键通过 `Taro.switchTab` 打开已注册的领域页，不再由 `ShortcutButton` 跳页内锚点；去掉仅为该入口使用的滚动上下文，已有快捷设置不迁移。领域进展共用组件、领域／习惯／成长原存档与统计保留。

既有首页检查改为两屏结构、完整相邻布局、按钮往返、未挂载旧概览及导航保留；快捷方式检查同步验证两次进入领域页并返回。翻页套件更新首页为两个停靠点，保留前后滑、快速滑、取消、水平手势和长页流程；旧成长回归只验证首页无成长录入、原存档不被移除。新增命令 `test:home-navigation`，原 `test:home-overview`／`test:summary` 及 CLI --home-overview／--home-summary 为兼容入口，领域完成逻辑继续由 test:logic 与领域回归覆盖。2026-10-05 本轮 `typecheck` 与 domain-completion／page-snap-logic／home-shortcuts 三项纯逻辑检查通过；`--home-navigation`、`--home-shortcuts`、`--screens`、`--snap`、`--domains`、`--growth` 六套浏览器预览均通过 360／375×667／430／768 四尺寸，输出前缀 `ui-preview-home-remove-progress-`，分别为 navigation／shortcuts／screens／snap／domains／growth。首页无旧概览和空白停靠页，两屏按钮往返、前后滑、快速滑、取消及水平手势通过；保留快捷排序严格几何／像素、持久布局、域主列表的连续进展线／目标／共享习惯及完成撤销、账号隔离和旧成长统计只读回归。375／768 首屏及 375 全部入口截图已目视。最终 `build:weapp` 通过，主包 **1,462,934 字节**，17 页（5 主包、12 分包）启动与原主包 <1.5 MB 预算通过，日志 `miniprogram/test-results/home-remove-progress-build.log`。微信开发者工具／真机未实测；未运行无关全量 `verify`，历史 C20／C38 当次结果保留。

## 进展记录共用创建（C49）

共享创建入口为 `EntryComposer`，现在支持 `task／memo／progress`。领域列表的 `DomainQuickRecord` 仅是入口适配，领域详情的正负半区也调用它；旧 `DomainRecordInput` 和单独记录弹层样式已移除。正记录在上、负记录在下的字段复用 `ProgressEditorFields` 与原 `MarkdownNoteEditor`，不是另一套备注实现；既有目标与习惯编辑流程保留。

`EntryDraft` 沿用账号键 `ottlog-mini-entry-draft-v1:${owner}`，增加可选 `progress: { domainId, positive, negative }` 和 `lastContentMode`；每侧有固定 ID、原 Markdown 字符串、可选持久 `images` 与创建时间。兼容无新字段的旧 v1 创建草稿，恢复时补充空双框而不换原 ID。任务／备忘录共用正文与图片仍只存一份；进展两框各自独立，三种模式往返不覆盖彼此的输入。关闭存草稿而不写业务数据，保存只提交当前模式。

`progressEntries` 忽略纯空白且无图片的框；`saveDomainRecords` 校验完整一批后通过原状态层更新 `domains` 一次，未分类只在有效保存时创建。领域 v1 记录新增可选 `images`，正文上限改为 6000 字；每框图片共用最多 6 张、单图压缩／格式限制，保留原 5000 条记录／980 KiB 领域数据总容量，账号创建草稿仍为 900 KiB。已有无图片纯文本记录可读，无清理或批量迁移；后端通用 JSON 接口与 1 MiB 请求限制已只读核对，未修改网页或后端。领域详情用共享渲染器展示 Markdown 与可查看的图片，图片记录在最近活动中有明确摘要。

业务保存后检查 `volatile`，失败保留两侧 ID、领域和内容，锁定输入与模式后允许同批重试。T24 修复共享 `tool-state-store.edit`：内容相同只有在已经持久化时才跳过，内存数据仍重试写入且保留原 pending 状态。正常持久化的无变化编辑仍不写入；不改账号同步协议或全局 P10 冲突规则。图片处理沿用原上下文／账号检查，处理时阻止提交、切换和关闭，晚到回调不得把图片放进其他账号草稿。

T25 的宽屏遮挡来自标签的行内 Text 继承父层行框而增加实际高度：改为块级并明确行高，末组工具栏不重复留底部外距。默认两框和工具栏完整显示；验收直接量标签到输入框的 8px 间距以及最后一组工具栏与固定按钮的边界，不以遮挡或隐藏滚动条通过检查。

验证入口：`node scripts/check-progress-draft.cjs`，`npm.cmd run test:entry-creation`（包含双框与三模式 UI 回归）、`test:domains`、`test:sheet-footers`；状态层变更运行 `test:logic`。2026-10-06 实际结果：完整 `test:logic`、最终类型与进展草稿／领域完成数纯逻辑检查通过；统一创建、领域、底部操作、待办和便签五套浏览器适配预览在 360／375×667／430／768 四尺寸通过。覆盖正／负／双框／纯图片、Markdown／图片查看、关闭刷新恢复、三类型数据保留、账号切换与晚到图片、容量和本机写入失败后的原 ID 重试；同账号重新读取已持久化后再次提交不重复创建。底部套件显式模拟 34px 安全区，分别检查原生 tabBar 页和详情页的默认两框／工具栏完整可见，375／768 截图已目视。输出 `miniprogram/test-results/ui-preview-progress-unified-entry`、`ui-preview-progress-unified-footers`、`ui-preview-progress-unified-todos`、`ui-preview-progress-unified-memos`；最终领域卡和联合构建见 C50。

设计主说明见 [C49](../Design.md#进展记录与共用创建c49)。未运行无关全量 `verify`，微信原生选图／RichText／键盘及真机安全区未测；不代表其他编辑器的 P08 或固定系统未分类 P05 已完成。

## 领域首页卡片（C50）

2026-10-06 按用户要求，领域首页在所有尺寸保持两列卡片，暂不显示长期／短期目标内容；名称、图标、完成数和 C38 单线进展保留，点击继续进入原领域详情。`pages/domains/index.tsx` 调用共享 `DomainProgressSummary` 的 `showGoals={false}`，不另做卡片数据源；`domain-progress.css` 调整摘要布局，页面 CSS 固定两列与卡片间距，覆盖原宽屏三／四列规则。四项管理动作按两行两列排布，保留至少 40px 触控。未改目标、习惯、记录、存储键或计数口径。

`node scripts/check-ui-preview.cjs --domains` 的四尺寸回归通过：量两列等宽卡、默认八域完整显示且无微小内滚、目标内容节点不渲染、每卡一条进展线及原 6／3／1 连续色段；保留详情导航、目标完成／撤销与历史、共享习惯编辑／打卡、记录进展、更多领域／管理操作、持久化、账号隔离和本机失败重试。`typecheck`、`check-domain-completion.cjs` 与 `check-progress-draft.cjs` 通过；375／768 卡片截图已目视。输出 `miniprogram/test-results/ui-preview-domain-cards`。最终 C49／C50 联合 `build:weapp` 通过：主包 **1,461,179 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/progress-and-domain-cards-build.log`。微信开发者工具和真机未测。主说明见 [Design.md](../Design.md#领域首页卡片c50)。

## 文档与问题记录

- 新功能先确定数据来源、已有组件和对应的验证入口，再修改页面。
- 多项选择浮窗按 [C35](../Design.md#多项选择面板对齐c35) 核对同组选项的等宽列、列边界及行列间距；本轮备忘录颜色复用现有 `.form-option-grid` 三列，其他面板按实际宽度与长文字需要调整。常用标签前排按 C46 等宽铺满单行，不改成多行栅格；浮窗末行不拉宽余项或增加空按钮，名称／数量／选择语义保留。原因见 T15：按内容宽度 `flex-wrap` 会让五个短选项变成松散 4＋1，仅检查无溢出不能发现这一问题。
- C35 本轮已实现并验收：`memo-palette` 复用 `.form-option-grid` 三列，按钮填满单元格、`min-width: 0`、文字可换行，字号／色点封顶且触控至少 40PX；统一创建与原便签编辑共用 `MemoEditorFields` 同步生效。2026-10-05 的 `typecheck`、`build:weapp` 通过，主包 **1,447,564 字节**，17 页／12 分包启动及原预算通过。`--entry-creation`（`ui-preview-c35-entry`）和 `--memos`（`ui-preview-c35-memos`）各在 360／375／430／768px（含 375×667）通过；两脚本新增实际五色几何断言：等宽三列、完整首行铺满、同行／同列边界对齐、选择前后几何不变。统一创建与原便签编辑均实际选择并保存颜色，375／768 截图已目视。此记录仅为 C35 本轮检查，C34 历史数据保留；未执行无关全部检查，微信环境未验证。
- 标签宽度按 [C46](../Design.md#标签行宽度分配c46) 检查等宽按钮使用可用空间，展开箭头按 C30 保持紧邻末项，核对 flex 分配和空节点，不用负 margin／绝对定位掩盖空白。`test:tag-row-spacing` 使用真实共享 `TagChoiceRow` 的隔离示例，覆盖空／单个／短／长标签、两位数计数、动态选项、完整名称与多选同步，按四种尺寸量整行使用宽度、标签按钮宽度及末项到展开按钮的距离；已纳入 `verify`，不只检查无溢出。
- 底部留白按 [C29](../Design.md#弹层底部操作c29) 排查：先量按钮底边、按钮栏底边及页面可视底边，核对原生 tabBar 是否已承载安全区；不要靠改变日历高度或缩小触控区域补偿。相关弹层复用 `components/sheet-actions.tsx`，页面只保留按钮样式与水平布局；导航页清单共用 `lib/native-tab-bar.ts`，不能各写一份判断。设置末行与操作栏之间的分隔线只由后者绘制。
- `test:sheet-footers`（`--sheet-footers`）模拟 34px 整机底部安全区，检查任务日程／任务表单、习惯页详情／编辑以及无 tabBar 的领域习惯详情／编辑，覆盖默认与重复独立小窗状态、单一分隔线、按钮贴近底边、任务六行日历免滚动和取消不写业务记录；已纳入 `verify`。C32 几何检查复用 `scripts/check-habit-detail-layout.cjs`，也由 `test:daily`／`test:domains` 调用：默认未滚动时四项统计、完整日历面板、最后日期格、图例及日志／专注按钮均位于可见内容区并高于操作栏。联合覆盖 375×667、60 字标题、240 字备注、25 分钟专注与非零安全区，日期行至少 30px、按钮至少 40px、长标题正文宽度大于 120px；检查展开收起后恢复默认及取消保留数据。不能仅以 DOM 数量或容器边界判断通过；模拟通过不等于微信真机通过。
- 习惯详情按 C27／C32 复用 `HabitCalendar layout='detail'` 和共享 `HabitDetailTitle`／`HabitDetailNote`，从原 `reminders` 及习惯 ID 读取；面板 `height: min(620PX,100%)`、`max-height: 100%`，按实际可用视口限制。相关回归检查默认核心内容与入口完整可见、标题／备注摘要及全文展开、月份切换／回到本月、日志展开与完成／撤销同步，保留七日补记及统计原模式。标题超过 32 字默认最多两行，备注超过 48 字或多行提供阅读入口，原文保留；编辑表单备注仍常显且可为空。展开内容可滚动查看，不复制日历组件或新增存储。
- 领域完成数的纯逻辑检查为 `node scripts/check-domain-completion.cjs`，纳入 `test:logic`；覆盖本地跨日、目标完成／撤销、未来过滤、启停／删除、旧分类及改名映射、归档与明确撤销、只读不改原数据。`test:home-navigation` 检查首页两屏与旧概览移除，旧 test:home-overview／--home-summary 为兼容入口；导航或滚动变更另运行 `test:screens`、`test:page-snap`，领域业务回归运行 `test:domains`。
- 修改选择控件时先核对 [C12／C13／C28／C41](decisions.md#已确认) 与现有同类组件；实体表单的单选浮窗、标签常用行及多选浮窗、自定义输入复用共用实现，备注保持常显。检查各调用页面的选中反馈、常用默认、原值编辑、保存与重开、小屏浮窗边界及旋转箭头方向；范围按当前用户要求确定，局部任务不扩大到无关选择器。
- 任务日程使用 `TodoScheduleSheet` 统一创建／编辑入口（C14），继续沿用 `dueDate`、`dueTime`、`reminderAt`、`recurrence` 和原有任务保存流程。验证面板确认回填、取消不回填、清除仅作用于日程字段、保存后重开及旧任务兼容；提醒时间编辑不代表微信订阅授权完成，保留已有取消旧提醒和同步处理。
- 日程布局按 C25 检查默认完整六行日历及三项设置无需滚动、内容不被固定底部操作遮挡；覆盖 360／375／430／768px 宽度及 375×667 短屏，选项在独立小窗内选择，主日历与三行位置不变；必要时仅小窗中部滚动且操作可达。浏览器检查不替代微信 ScrollView 和底部安全区验证。
- 已确认设计写入 `Design.md`，工程约定写入根 `AGENTS.md`，命令及流程写入本文件；使用步骤写入对应功能说明。
- P01–P12 已于 2026-10-04 确认；后续直接遵循决定，无须重复询问。P02 新增对象的位置、P10 编辑与删除冲突等未定细节在实施时补足。
- T01 等已知工程问题与各项实现缺口记录事实和证据，只有实际修复并验证后才标记解决。用户要求撤回时仅撤销最近一项相关变更（P12）。

## 微信编译配置校验（T06）

2026-10-06 根据用户的首页 `e[r] is not a function` 日志核对：`project.config.json` 的 `es6`／`enhance` 开启，与既有调试约定不同；Node VM 启动检查没有经过微信转换，也未校验该配置。源配置现已关闭两项；`build:weapp`、`local-build.cjs`（含 watch）和 `device-build.cjs` 编译前复用 `check-weapp-project.cjs`，合并读取私有配置后检查有效值，禁止重新开启重复转换或上传映射，压缩保持开启。`check-weapp-bootstrap.cjs` 同时检查源配置与生成配置，原 17 页独立／正反序启动、旧全局 chunk ID、原生基组件加载及跨分包边界检查保留。

实际验证：`typecheck`、四个相关 CJS 脚本语法检查通过；隔离临时配置覆盖合法设置、三个危险私有覆盖、无关覆盖及源配置回退，正确拒绝开启。最终 `build:weapp` 通过，主包 **1,462,633 字节**，17 页／12 分包启动与原预算通过；日志 `miniprogram/test-results/wechat-loader-config-build.log`。没有修改页面、业务记录或后端，也未运行无关 UI 全量套件。

本轮修复已证实的配置冲突与检查缺口，不把它写成原生日志的已证实根因。命令行连接微信工具因不能写入工具用户目录 `.cli` 而失败，未完成微信冷启动／真机验证；清除编译缓存、保留业务 Storage 后重新编译的步骤，以及仍失败时取得模块 ID 的方法见 [调试说明](device-debugging.md#首页模块加载报错t062026-10-06)。

## 全部功能目录（C52）

2026-10-06 首页全部功能改为 `lib/home-features.ts` 的独立分组目录，放在第二屏顶部，复用共享 `ActionButton` 与原 `ShortcutIcon`。`memo-list` 明确导航到原便签列表，原 `memos` 快捷方式继续打开统一创建弹窗；「数据」仍导航到统计分包。目录合并重复的领域／个人空间入口，更多自定义快捷方式和最近打开保留在其后；未修改默认快捷方式、已有设置迁移、正式业务数据或账号状态层。设计主说明见 [C52](../Design.md#全部功能目录c52)，操作见 [首页快捷方式](home-shortcuts.md)。

最终 `typecheck` 通过；首页目录／快捷方式／统计、页面布局和翻页手势的浏览器适配回归在 360／375×667／430／768 四尺寸通过。目录回归测量两列边界、固定 14px／500、完整名称、图标与至少 40px 触控，并要求默认 15 个入口全部在实际页面视口内完整可见；验证便签列表与创建便签分流、数据六分类及返回，保留首页两屏、不读取旧概览与不写业务记录的断言。翻页检查保留长页连续滚动、往返及取消／水平手势。375／768 最终截图已目视。输出 `miniprogram/test-results/ui-preview-feature-directory-navigation-final`、`ui-preview-feature-directory-shortcuts-final`、`ui-preview-feature-directory-statistics`、`ui-preview-feature-directory-screens-final`、`ui-preview-feature-directory-snap-final`。

最终 `build:weapp` 通过，主包 **1,464,573 字节**，17 页（5 主包、12 分包）启动、依赖边界和原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/feature-directory-final-build.log`。未运行无关全量 `verify`，微信开发者工具和真机未测。

## 页面功能栏与分类行（C51）

`components/page-toolbar.tsx/.css` 提供功能栏四个可选槽位和独立 `CategoryRow`；按真实节点的排序／筛选／管理／创建顺序渲染，页面只传原回调与状态。共享布局负责行、间距和滚动，功能栏文字／底色继续由 `ui-button` 和原创建控件负责，分类栏当前统一调用 C53 的 `CategoryButton`。习惯、待办、领域、便签、首页、文章、格言、餐单和管理员餐厅列表接入原操作，专注和统计接入原分类行；未添加无业务来源的管理、筛选或排序功能。下方为 C51 当次结果，C53 本轮验证单独记录。

习惯首屏删除 PageJump 的「全部习惯」按钮；顶部管理沿用下页管理区，原完整列表／历史仍可从原下页按钮进入。排序入口从分类行移到功能栏，仍用原拖动、取消、保存与保留隐藏习惯的规则；筛选沿用未完成状态，作用于主网格及原列表。待办完成状态与四象限语义保留，排序沿用原时间／默认切换；便签排序独立为小窗，标签分类仍更新原 tagFilter，不新增目录。文章分类单行显示，原排序／标签／页数选择迁入相邻应用内小窗，仍用同一 PostFilter。首页输入与创建回调保留，共用栏左侧输入需要 flex 容器承载原 width:0 单行控件，避免换包装节点后输入宽度归零；旧捕获行按钮的 60px 最小宽度改为 40px，文字与共享内边距保留，四尺寸输入仍大于 120px，不能机械放宽原可读性断言。

2026-10-06 实际验证：最终 `typecheck`、`test:toolbars` 十页四尺寸布局检查及统一创建、习惯、待办、便签、首页快捷方式、领域、格言、餐单、统计、专注相关预览均通过 360／375×667／430／768。检查真实节点和几何顺序、文字／触控、分类末项、习惯首屏无「全部习惯」、管理返回、文章分类／排序／筛选和首页输入；保留原拖动保存／取消、打卡、图片、三模式草稿、账号隔离、容量及失败重试。默认习惯与首页 375px、便签和待办 768px 截图已目视；输出为 `miniprogram/test-results/ui-preview-toolbar-layout-final`、`ui-preview-toolbar-entry-final`、`ui-preview-toolbar-home-final` 及 `ui-preview-toolbar-各参数`，习惯／待办最终输出为 `ui-preview-toolbar-daily-final`／`ui-preview-toolbar-todos-final`。

浏览器检查发现预览适配器的 DOM `scrollIntoView()` 连带滚动祖先，造成管理返回后按钮移到模拟平台导航后；已改为只更新当前 `ScrollView` 的横／纵偏移，并验收返回后按钮相对 `.preview-content` 的真实边界，不把浏览器可见误当导航内可见。此为预览修正，不报告成微信原生问题。`--home-navigation` 与 `--snap` 补充回归也通过四尺寸，保留首页两屏、工具页往返、长页滚动、水平手势与取消手势；输出 `ui-preview-toolbar-navigation`／`ui-preview-toolbar-snap`。

最终 `build:weapp` 通过，主包 **1,462,631 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/page-toolbars-final-build.log`。管理员餐厅套件 360px 通过，375px 长标签浮窗「完成」按钮仍为 0.991406 可见比例，复现既有 T23；430／768px 未继续执行。保留严格断言和原数据，不把此项报告为通过。本轮未运行无关全量 `verify`，微信原生交互／真机未测。设计主说明见 [C51](../Design.md#页面功能栏与分类行c51)。

## 通用分类栏（C53）

2026-10-06 分类栏按用户要求恢复原习惯首屏外观，主说明见 [Design.md](../Design.md#通用分类栏c53)。共用入口为 `components/page-toolbar.tsx` 的 `CategoryRow` 与 `CategoryButton`；`CategoryButton` 固定使用 `ui-button.tsx` 的 `ChoiceButton variant='category'`，复用共享字体、触控、反馈、禁用与 `aria-pressed`，分类专用颜色／圆角由 `ui-button.css` 变量定义。`page-toolbar.css` 负责单行、2px 分类间距、默认 8px 行距、少量分类分满宽度和横向滚动；页面只保留必要布局，清除旧按钮及容器外观覆盖，功能栏内部 6px 间距保留。

本轮实现范围为习惯、待办、便签、文章、饮食、专注、统计七页原分类行，习惯下页的内容模式及列表分类，以及图标库、习惯选择、待办选择三个弹层。习惯分组选择改为共享单行横向滑动，搜索、最近专注和纵向列表沿用原逻辑；图标分类保留 `enhanced`／`bounces={false}`，统计保留选中项 `scrollIntoView`。原 class hooks、筛选／模式／单选语义、禁用条件和数据来源保留，未改存储、账号状态或业务记录。表单标签／浮窗选项继续 C39，日期格和卡片不使用分类变体。

相关验证入口在 `miniprogram` 目录执行 `npm.cmd run typecheck`、`npm.cmd run test:toolbars`、`npm.cmd run test:daily`、`npm.cmd run test:icons`、`npm.cmd run test:statistics`；待办／便签／专注／饮食交互使用 `node scripts/check-ui-preview.cjs --todos`、`--memos`、`--pomodoro`、`--meals`，最终使用 `npm.cmd run build:weapp` 保留启动与原包体预算检查。分类检查须覆盖 360／375×667／430／768 四尺寸、少量／更多／长名称、默认与选中实际颜色及几何、悬停／移开／按下／禁用、单行和末项可达；同时回归原筛选、模式、图标及习惯／待办选择和页面往返。浏览器适配预览与微信原生横滑、按下反馈为不同验证环境。

2026-10-06 本轮实际验证：最终 `typecheck`、`test:toolbars`、`test:daily`、`test:icons`、`test:statistics`，待办／便签／专注／饮食交互及 `test:screens` 17 页浏览器适配预览均通过 360／375×667／430／768 四尺寸。分类检查保留 C51 的十页严格断言，并覆盖七页分类、习惯下页两行和三个选择弹层的实际颜色、固定字体／圆角／触控、透明无框容器、2px 间距、选中前后几何、少量分类分满宽度、横向滑动与末项完整可达、长名称完整可读。反馈检查覆盖悬停／移开／按下、选中底色保持、真实习惯排序禁用不触发，以及 Taro 按下类样式；后者为浏览器 CSS 验证，不报告成微信原生触摸通过。习惯下页使用自身纵向滚动展示分类行后检查完整可见，没有降低可见比例断言；首屏分类不补偿位置。默认习惯 375px、便签 768px、长名称和图标库弹层 375px 截图已目视。

分类输出为 `miniprogram/test-results/ui-preview-category-standard-toolbars`；其他相关输出为 `ui-preview-category-standard-daily`、`ui-preview-category-standard-icons`、`ui-preview-category-standard-todos`、`ui-preview-category-standard-memos`、`ui-preview-category-standard-meals`、`ui-preview-category-standard-pomodoro-final`、`ui-preview-category-standard-statistics` 和 `ui-preview-category-standard-screens`。原筛选、排序、模式、打卡、习惯／待办专注选择和页面往返回归保留；未改业务存储或账号规则。图标回归保留 64 个素材加载、分类／搜索／滚动、习惯与便签保存／重开／取消、旧 kind 兼容和移除图标；只将两处旧测试文案校正为现有统一创建的「关闭编辑」及便签编辑的「保存」，未放宽行为断言。

最终 `build:weapp` 通过，主包 **1,463,166 字节**，17 页（5 主包、12 分包）启动、依赖边界和原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/category-standard-build.log`。未运行无关全量 `verify`，微信开发者工具和真机未测。

## 力量训练与有氧运动（C54）

2026-10-06 默认习惯种子将 `exercise` 改为「力量训练」，紧后新增 `cardio`「有氧运动」，复用既有运动／跑步图标与原领域关系。`reminder-data.ts` 的 `splitDefaultExerciseHabit` 仅识别原 ID／标题／类型，原项只改标题，保留全部原字段和历史；新有氧继承领域、启停、优先度、创建时间及专注分钟，不复制打卡、归档和日志。已有同领域有氧复用原记录；新 ID 避开现存习惯及历史所引用的 ID，拆分幂等，之后删除有氧不会补回。80 项数量上限或完整 JSON 超过 reminders 原 1 MiB 上限时原样保留，不截断记录或部分改名。

迁移在 `tool-state-store.ts` 的共享 `load` 中校验格式和账号后，经原 `edit`、按账号串行保存队列落盘和同步；页面不维护新缓存，`cleanState` 不做只读派生迁移。领域、专注、统计和详情继续读取同一源。游客／账号隔离、迟到读取与本机 `volatile` 的恢复沿用原状态层。

2026-10-06 本轮最终 `typecheck`、完整 `test:logic` 通过。纯迁移检查覆盖精确识别、旧字段／历史保留、独立完成／撤销、幂等、删除／改名不恢复、已有有氧、稳定领域关系、现存和孤立历史 ID 冲突、80 项及完整 UTF-8 存档容量。共享状态层检查覆盖游客落盘／重开、两个账号隔离、未知身份与跨账号读取不写、迟到读取保留最新编辑、离线待同步及 `volatile` 同 ID 重试，使用隔离存档和模拟账号，不操作真实数据。习惯日志测试由位置取样改为固定 exercise／unplug ID，格言和成长测试加载器补充共享状态层新增依赖的解析；原业务断言保留，最终完整逻辑套件通过。

`test:daily` 在 360／375×667／430／768 四尺寸通过，保留原网格／筛选／拖动／推荐／历史回归；新增两张默认卡片、分别完成／撤销／历史不复制、刷新持久化、专注实际开始时的对应 habitId，以及领域页操作返回习惯页的同源检查。375px 独立完成与 768px 冷启动截图已目视，输出 `miniprogram/test-results/ui-preview-exercise-split-daily`。

最终 `build:weapp` 通过，主包 **1,465,282 字节**，17 页（5 主包、12 分包）启动、依赖边界和原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/exercise-split-build.log`。未运行无关全量 `verify`，微信开发者工具和真机未测。

## 领域页图例移除（C55）

2026-10-06 移除 `pages/domains/index.tsx` 中 `PageToolbar` 的左侧文字图例节点及其旧专用 CSS，管理／创建继续由共享功能栏右对齐。卡片、计数、进展及业务数据不变，主说明见 [Design.md](../Design.md#领域首页卡片c50)。最终 `typecheck`、`test:domains` 通过，后者保留领域模型与共享习惯编辑，以及 360／375×667／430／768 四尺寸的两列八卡、默认完整可见、原计数／进展和导航／管理回归；375／768 主页截图已目视，输出 `miniprogram/test-results/ui-preview-domain-legend-removed`，未新增或放宽测试。

最终 `build:weapp` 通过，主包 **1,464,752 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/domain-legend-removed-build.log`。未运行无关全量 `verify`，微信开发者工具和真机未测。

## 四象限创建入口（C56）

2026-10-06 各象限的创建入口移到 `pages/todos/index.tsx` 的标题区右上角，仅显示共享 `AddSymbol`；复用 `ActionButton appearance='icon'` 的外观、反馈和 40×40px 触控。页面 CSS 只负责定位及为标题／说明预留 40px 空间，删除原象限底部按钮栏，空提示改为指向右上角加号。四个无障碍名称、禁用条件及 `createTodo(q.id)` 回调保留，继续使用 `EntryComposer`；通用创建仍在页面功能栏最右，使用原 `CreateButton`。未改正式任务数据或状态层。设计主说明见 [C56](../Design.md#四象限创建入口c56)。

最终 `typecheck`、`--todos` 和 `test:entry-creation` 通过 360／375×667／430／768 四尺寸。现有待办展示回归按新要求区分通用完整文字入口与四个纯加号，检查标题区右上位置、完整符号、40×40px、标题／说明不重叠、列表滚动后位置不变，保留四区等分、视口接缝和密集列表完成／编辑／滚动断言；列表底部改为与卡片内部边界对齐，不保留已移除的底栏假设。共用创建回归验证四个初始优先度、填写关闭不生成正式记录、重开保留输入／优先度，以及原类型切换和最终保存规则，纯标签和进展草稿检查同时通过。悬停／移开／按下、人工禁用和 Taro 按下类为浏览器 CSS 检查；真实坏存档下原四区入口不渲染、通用创建禁用且记录保留另行通过，不报告成微信原生触摸验证。375／768 密集四象限截图已目视；输出 `miniprogram/test-results/ui-preview-quadrant-plus-todos` 和 `ui-preview-quadrant-plus-entry`。

最终 `build:weapp` 通过，主包 **1,464,605 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/quadrant-create-corner-build.log`。未运行无关全量 `verify`，微信开发者工具和真机未测。

## 四象限顶部留白（C57）

2026-10-06 根据用户反馈，将 `components/page-sections.css` 中 `.todo-core` 的顶部 padding 从零改为固定 `12PX`。原首屏 `box-sizing: border-box` 和弹性高度分配继续使用，留白计入已有可用首屏高度，四象限等分剩余空间；不新增导航高度扣减、不更改共享按钮或业务数据。主说明见 [Design.md](../Design.md#四象限顶部留白c57)。

相关验证使用 `typecheck`、`node scripts/check-ui-preview.cjs --todos`、`test:page-snap` 和 `build:weapp`。待办展示及流程脚本原先将功能栏紧贴内容区顶部作为通过条件，本次改为真实导航边界内的固定 12px 留白；保留四区等分、完整视口边界、40px 触控、四个右上角加号、密集列表滚动和任务操作断言。展示回归同时检查下页返回及底部导航往返后仍有留白。

本轮实际验证：`typecheck`、两项相关 CJS 脚本语法检查、完整 `--todos` 和 `test:page-snap` 均通过；浏览器适配回归覆盖 360／375×667／430／768 四尺寸。功能栏三个操作完整处于导航下方、固定留白不随屏幕放大，下页返回和底部导航往返后几何一致；原任务编辑／完成／筛选／日程及长页滚动、取消／水平手势检查保留。375／768 密集和返回截图已目视，输出 `miniprogram/test-results/ui-preview-todo-top-spacing-todos`、`ui-preview-todo-top-spacing-snap`，对应日志为 `todo-top-spacing-todos.log`、`todo-top-spacing-snap.log`。

最终 `build:weapp` 通过，主包 **1,464,608 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/todo-top-spacing-build.log`。未运行无关全量 `verify`，微信开发者工具和真机未测。

## 领域卡图标（C58）

2026-10-06 领域主列表图标由原窄屏 24px／宽屏 28px 放大为统一 40×40px，接近习惯卡在常用屏幕上的整体图标区域比例。尺寸在 `components/domain-progress.css` 的共享无目标卡片样式中定义，移除 `pages/domains/index.css` 两处旧覆盖；原 88px 卡高、两列布局、8px／宽屏 10px 图文间距、名称／完成数／单线进展和详情导航保留。未改图标素材、业务数据或状态层，设计主说明见 [C50／C58](../Design.md#领域首页卡片c50)。

相关验证入口为 `typecheck`、`test:domains` 和 `build:weapp`。原领域回归的默认八卡检查加入每个图标的真实尺寸、可见状态、正文间距及图标／名称／全部计数／进展线完整处于卡内的检查，保留原两列、八卡无滚动完整显示以及领域管理、共享习惯编辑、持久化和账号隔离断言。

本轮实际验证：`typecheck`、相关 CJS 脚本语法检查和完整 `test:domains` 通过；后者包含原领域模型／共享习惯编辑检查及 360／375×667／430／768 四尺寸浏览器适配流程，原 1280px 两列检查保留。八张默认卡的图标均完整放大且不挤压正文；375／768 主页截图已目视。输出 `miniprogram/test-results/ui-preview-domain-larger-icons`，日志 `miniprogram/test-results/domain-larger-icons-domains.log`。

最终 `build:weapp` 通过，主包 **1,464,519 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/domain-larger-icons-build.log`。未运行无关全量 `verify`，微信开发者工具和真机未测。

## 优先度选项文字与宽度（C59）

2026-10-06 `components/priority-options.tsx` 统一将四个选项显示为「高优先度／中优先度／低优先度／无优先度」，只映射可见文字，原短称、无障碍名称及业务值保留。任务、便签与习惯的 `ChoicePopover` 复用该模块导出的 `PRIORITY_POPOVER_WIDTH = 136`，替代原 168px；文字节点使用共享单行样式，旗帜、按钮字体／触控、8px 相邻定位、可用视口限制及原选择／关闭／保存逻辑沿用共用实现。未修改业务存档、草稿规则或其他选项窗口；设计主说明见 [C40／C59](../Design.md#优先度与下一步c40)。

相关回归沿用统一创建、任务编辑、习惯及领域流程，更新浮窗可见文字断言，保留原 aria 选择和业务结果。实际测量文字 Range 的单行及边界、旗帜与文字间距、末字到右边的空白，确认面板宽度不超过 137px（含测量误差）、文字保持 14px、触控不少于 40px，以及选中／未选中和四尺寸完整可见，不能仅核对 CSS 类名或新文案。

本轮实际验证：`typecheck`、四份相关 CJS 脚本语法检查、完整 `test:entry-creation`、`--todos`、`test:daily` 和 `test:domains` 通过 360／375×667／430／768 四尺寸；统一创建同时检查任务和便签两种菜单。测量末字到按钮右边的空白不超过 24px，文字完整单行、旗帜不重叠且菜单保持相邻；保存重开、草稿、账号隔离、日程、图片、习惯打卡和领域业务的原断言保留。375／768 任务、便签及习惯浮窗截图已目视，输出 `miniprogram/test-results/ui-preview-priority-labels-entry`、`ui-preview-priority-labels-todos`、`ui-preview-priority-labels-daily`、`ui-preview-priority-labels-domains`，对应日志为 `priority-labels-entry.log`、`priority-labels-todos.log`、`priority-labels-daily.log`、`priority-labels-domains.log`。

最终 `build:weapp` 通过，主包 **1,464,824 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/priority-labels-build.log`。未运行无关全量 `verify`，微信开发者工具和真机未测。

## 按钮分层与动态尺寸（C60）

2026-10-06 根据用户纠正，将详细规则整理到 [按钮分层规范](button-guidelines.md)，根 `AGENTS.md` 与 `Design.md` 同步引用，替代 C39 根据颜色类型强制决定字号、高度及内距的做法。规则按功能语义、所在组件、局部层级、尺寸／宽度和状态逐步选型；场景矩阵、触控下限、自适应、专用组件、状态与无障碍为后续新增和相关修改的正式依据，不表示全部旧页面已重新排版。

`components/ui-button.tsx/.css` 新增独立 `size`（compact／regular／large，40／44／48px 下限）与 `width`（content／fill）参数，文字高度按内容增长；`intent='danger'` 可以与轻量／图标外观组合，`context='overlay'` 提供图片覆盖层的圆形、深半透明底及高对比图形。覆盖图标的禁用状态保留对比、取消悬停／按下反馈，普通禁用仍为原 0.45 透明度。`CreateButton`、`BackButton` 和 `SelectTrigger` 透传对应规格；默认调用、旧 compact 和危险外观兼容，显式尺寸优先。本轮具体界面修复是共享 `MarkdownNoteEditor` 的图片移除入口及其失效的局部外观覆盖，任务／便签／进展共用编辑器同步生效。

原 `--toolbars` 回归加入只在浏览器预览挂载真实共用控件的上下文示例，检查同档位不同层级的几何、同层级不同档位、内容／填满宽度、容器变窄时长文案增高而完整可读、封装透传、轻量危险动作及明暗图片上覆盖图标的对比／反馈／禁用。原统一创建图片流程同时检查真实移除入口，保留任务／便签草稿字节、账号隔离、图片处理、保存及重开断言；不是仅镜像类名或固定样式的测试。

2026-10-06 最终验收：`typecheck`、三个相关回归脚本的 Node 语法检查，以及 `test:toolbars`／`test:entry-creation` 在 360／375×667／430／768 四尺寸通过。同一短文按钮 compact／regular／large 实测为 50×40／54×44／66×48px；显式 regular 优先于旧 compact。父容器宽度 120→320px 时，content 保持 54px，fill 随容器变化；长文案由四行约 100.4px 增高恢复至单行 44px，完整文字保留。真实任务／便签图片移除入口在明暗图片、悬停／移开／按下／禁用状态通过对比和反馈检查。375／768 上下文尺寸与覆盖图标截图已目视，输出为 `miniprogram/test-results/ui-preview-button-context-toolbars` 与 `ui-preview-button-context-entry`。

最终 `build:weapp` 通过，主包 **1,466,860 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/button-context-build.log`。未运行无关全量 `verify`，微信开发者工具和真机未测。

## 记录领域选择（C61）

2026-10-06 根据用户截图，将 `ProgressEditorFields` 的领域行改为一个横向填满的选择按钮，移除外侧「领域」标签；沿用 `SingleChoiceField`／`ChoicePopover`，后者向共享控件透传触发器 size／width，单选字段支持可选图标。记录领域使用 regular／fill，图标与名称在左，原 chevron 在右，长名称完整换行；其他未设置可选参数的字段继续兼容原布局。

图标读取原领域的 `domainIcon` 并由 `LibraryIcon` 显示，临时未分类显式为 notes；共享字段将图标固定 20px，避免宽屏 rpx 放大，选项保留等宽栅格、完整名称、相邻独立浮窗及选择后关闭。首页／领域列表／领域详情入口均由原 `EntryComposer` 复用，不改业务数据、领域 ID、来源守卫、草稿或双框保存流程。设计主说明见 [C61](../Design.md#记录领域选择c61)。

本轮实际验证：`typecheck`、三份相关 CJS 语法检查、完整 `test:entry-creation` 和 `test:domains` 通过 360／375×667／430／768 四尺寸。共享字段回归量真实按钮填满行边界、至少 44px、20px 图标加载与原素材、14px 文字、图标／文字／箭头间距及无溢出；375px 入口实测 343×44px。检查默认八域及未分类、旧无图标存档、24 个真实分类和长自定义名称、选中回填、外部／Escape 关闭恢复箭头及重开草稿。多分类按实际内容是否溢出检查滚动，末项保留 0.999 完整可见要求；对浏览器自动滚动取整的不足补充实际滚动，不放宽几何断言。原短屏默认双编辑框、保存／取消、正负记录、图片、草稿及账号隔离断言保留。

长名称在 360px 下完整换成两行，按钮自动增高到约 61.2px，其他尺寸完整单行。375／768 常规按钮与分类窗、375 长名称与末项菜单截图已目视；输出为 `miniprogram/test-results/ui-preview-progress-domain-choice-entry` 和 `ui-preview-progress-domain-choice-domains`，日志为 `progress-domain-choice-entry.log`／`progress-domain-choice-domains.log`。

最终 `build:weapp` 通过，主包 **1,467,679 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/progress-domain-choice-build.log`。未运行无关全量 `verify`，微信开发者工具和真机未测。

## 便签颜色入口（C62）

2026-10-06 仅移除 `components/memo-editor-fields.tsx` 的颜色触发器可见文字「颜色 ·」前缀，保留当前颜色名称、色点、chevron、无障碍名称及选择／保存回调。统一创建与原便签编辑共用该字段，未改 CSS、颜色数据或业务存储；设计主说明见 [C62](../Design.md#便签颜色入口c62)。

本轮 `typecheck` 和既有 `--memos` 在 360／375×667／430／768 四尺寸通过，保留五色栅格、选择回填、保存重开、原 ID 编辑以及图片／标签／预览／移除断言；未新增测试或修改预期。375／768 颜色截图已目视，按钮仅显示颜色名，色点与展开箭头保留。输出为 `miniprogram/test-results/ui-preview-memo-color-name`，日志 `memo-color-name-memos.log`。

最终 `build:weapp` 通过，主包 **1,467,655 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/memo-color-name-build.log`。未运行无关全量 `verify`，微信开发者工具和真机未测。

## 标签显示前缀（C63）

2026-10-06 `lib/tag-label.ts` 集中标签显示格式 `#名称`，仅在展示时处理原起始 #，不修改值或存档。`TagChoiceRow` 的常用及完整选项默认复用该格式，`labelKind='plain'` 保留用餐时段的原普通选项。待办／便签的标签筛选、便签标签分类行与卡片、阅读标签选择／活动筛选／文章卡片／详情／分类目录、餐厅标签卡片和比较摘要接入同一函数；已有文章和分类彩色 # 图形保留。不新增原来未展示的标签，不改标签目录、频次、输入、查询、回调、账号草稿及业务保存规则。设计主说明见 [C63](../Design.md#标签显示前缀c63)。

本轮 `typecheck`、五份相关 CJS 语法检查，以及 `test:tag-row-spacing`、`test:entry-creation`、`--todos`、`--memos`、`--meals`、`--food-editor`、`test:toolbars` 七套均通过 360／375×667／430／768 四尺寸。可见名称断言按新前缀更新，原 aria、输入、实际选择值、存档、账号草稿及几何断言保留；餐厅测试不再从带显示前缀的 innerText 推导存档标签。标签行保留空／单个／短／长／两位数计数、等宽分配、末项到箭头间距及完整浮窗名称检查；文章真实选择 #Markdown 后仍匹配原五篇记录，卡片 #Markdown／#代码显示正确，全部标签无前缀；用餐时段继续原普通选项。餐厅浮窗使用实际滚到底的用户操作处理自动滚动取整，保留原 ratio:1 完整可见要求，不放宽断言。

375／768 标签行、375 餐厅标签窗、768 餐厅保存卡片和文章筛选截图已目视。输出为 `miniprogram/test-results/ui-preview-tag-prefix-{spacing,entry,todos,memos,meals,food,toolbars}`，同名对应日志 `tag-prefix-*.log`。文章详情与分类页接入共享格式，未单独做该两页 UI 流程；未跑无关全量 UI／verify。

最终 `build:weapp` 通过，主包 **1,467,904 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/tag-prefix-build.log`。微信开发者工具和真机未测。

## 全部功能的操作与界面（C68）

2026-10-06 `home-features.ts` 将目录定义分为「快捷操作／功能界面」，显式标记 action／page，增加独立 `pomodoro-page` 目录标识并复用原番茄钟图标与 `openPomodoro()`；不修改底部导航标题、番茄钟状态或存储结构。操作「开始番茄钟」仍传入原 start／launch，页面「番茄钟」不带开始意图。操作显示功能图标与名称，页面显示导航箭头，两组复用 `SectionTitle`。

`mergedHomeFeatureGroups` 将首屏溢出快捷方式映射到目录中的同一目的地，按保存顺序优先显示并保留原排序 ID、自定义名称、图标配色与点击来源。默认「查看任务／读点什么」用界面名称「待办／文章」；首屏卡片和纯小入口布局保留，目录中的溢出项统一为原目录紧凑格式，不再额外渲染大卡、小链接或「更多快捷方式」标题。`growth`／`domains` 别名去重只影响显示，不重写原偏好，点击仍使用原来源键以保留最近打开名称。目录始终完整，空偏好不隐藏业务入口，排序和管理复用原保存／取消／失败重试。组间距由 12px 改为 8px，保留 375×667 最后一项完整可见，不缩小标题、文字或触控，也不放宽可见性断言。

在既有快捷方式逻辑检查中补操作／界面标识、目录完整性、别名去重、自定义名称／颜色与输入不变；浏览器首页回归验证默认 16 项全部完整可见、两列边界及名称、合并后排序／保存／刷新、空偏好与自定义入口。番茄钟实际交互检查从界面入口打开保持未开始状态、不写业务数据，操作开始后暂停，再从界面入口打开保留同一暂停状态，再从操作入口恢复原 ID；原提醒与创建流程沿用既有回归。目录测试使用隔离 fixture，不操作真实账号。

本轮 `typecheck`、四份相关 CJS 语法检查、既有快捷方式偏好逻辑检查，以及 `test:home-navigation`、`test:home-shortcuts`、`test:toolbars`、`test:entry-creation`、`test:statistics`、`test:screens`、`test:page-snap` 七套通过 360／375×667／430／768 四尺寸。保留首屏正常／排序几何与像素、实际拖动和边缘滚动、草稿／账号及只读统计断言，页面往返、取消／水平手势和长页面可达通过。375／768 全部功能截图已目视，操作与页面清晰分组，底部无额外快捷方式区。输出 `miniprogram/test-results/ui-preview-directory-split-{navigation,home,toolbars,entry,statistics,screens,snap}`，日志对应 `directory-split-*.log`。

最终 `build:weapp` 通过，主包 **1,467,812 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `directory-split-build.log`。未跑无关全量 `verify`，微信开发者工具和真机未测。规则见 [C68](../Design.md#全部功能的操作与界面c68)。

## 通用小标题（C67）

2026-10-06 增加共享 `SectionTitle` 与单一令牌来源 `section-title.css`，沿用首页「记录与生活／更多快捷方式」的 14px／600、行高 1.4、零字距、灰蓝色 `#9cafb9`。独立标题到内容为 6px，标题行 `inRow` 不额外补外距；文字样式在组件中保护，布局由调用容器负责，长标题完整换行。固定逻辑像素在 WXSS 使用大写 `PX`，避免被 Taro／预览适配按设计稿尺寸缩放。

17 个实际挂载页面／组件接入：首页快捷方式和目录分组、习惯待打卡／列表／历史、领域详情每日习惯、便签列表、饮食记录、专注提醒／历史、文章最近记录／分类标签／留言、选境回看、统计分析／图表／习惯／领域／饮食分组、习惯月日志、习惯与任务选择窗内部组名、图标结果组名。移除这些标题原页面字号／颜色／字重／行高／字距覆盖；字段名、实体标题、分类按钮、指标数字、辅助计数以及页面／弹层主标题保留原语义，不新增标题或修改数据。未挂载的旧 `growth-garden`／`today-summary` 不作为已迁移范围。

在既有首页、功能栏、页面布局与统计回归中加入真实计算样式和容器检查，测 14px／600／19.6px 行高／颜色／零字距、0 或 6px 标题下间距、完整文字和容器边界；核对四个用户示例及额外快捷方式出现后的标题。「更多快捷方式」按原条件渲染，测试保留已存在的额外入口，不能假设仅四个标题而重置个性布局。

本轮 `typecheck`、五份相关 CJS 语法检查通过；`test:home-shortcuts`、`test:daily`、`test:domains`、`test:toolbars`、`test:statistics`、`--meals`、`--memos`、`--pomodoro`、`test:screens` 九套通过 360／375×667／430／768 四尺寸。功能栏十页、统计六类与页面布局十四条注册路由及选境／饮食结果、习惯管理／历史、专注返回等场景保留原完整可见与原业务断言；领域独立回归覆盖目标／习惯详情与持久化。375 首页与 768 习惯首屏截图已目视，字号格式一致，底部记录行与待打卡模块完整。输出 `miniprogram/test-results/ui-preview-section-title-{home,daily-final,domains,toolbars,statistics,meals,memos,pomodoro,screens}`，对应日志 `section-title-*.log`；早期 `section-title-daily` 使用修正固定 PX 前的构建，不作为最终验收结果。

最终 `build:weapp` 通过，主包 **1,468,592 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `section-title-build.log`。未跑无关全量 `verify`，微信开发者工具和真机未测。通用设计规则见 [C67](../Design.md#通用小标题c67)。

## 文本框创建与首页记录行（C65／C66）

2026-10-06 为 `CreateButton` 增加 `iconOnly`，仅渲染共享 `AddSymbol`，原完整动作／对象名用于无障碍名称；最小宽度随共享 compact／regular／large 规格变化，保留 primary 层级。首页输入与领域详情长期／短期目标设置框接入；正式创建提交、其他功能栏创建和首页快捷卡沿用各自文案。设计主说明见 [C65](../Design.md#文本框旁创建入口c65)。

首页将快捷记录行的真实节点移到首屏内容最后，独立区域以剩余高度落在翻页提示上方，与入口区保留 12px 间距；记录行只有输入与纯加号。「我的快捷方式」旁独立 `PageToolbar` 承载排序／管理和排序时的取消／保存。移除记录行旧按钮外观覆盖，保留输入、创建草稿、编辑禁用、快捷方式存储和两屏导航。此布局替代 C51 当次首页输入同栏排版，规则见 [C66](../Design.md#首页底部快捷记录c66)。

本轮 `typecheck`、五份相关 CJS 语法检查，以及 `test:home-shortcuts`、`test:entry-creation`、`test:domains`、`test:toolbars`、`test:home-navigation`、`test:page-snap` 六套通过 360／375×667／430／768 四尺寸浏览器适配回归。首页默认、空快捷方式和仅小入口三种布局量记录行真实底部位置、完整可见与 12px 间距；原排序几何／像素、拖动、保存／取消与失败流程保留。新增小入口后先通过真实「返回主页」操作回首屏再量位置，避免将停留在全部功能页误判为首屏布局失败。领域长期／短期目标检查纯加号、至少 40px 与双向居中，保留创建／编辑／保存流程；统一创建与账号草稿检查保留。页面功能栏十页及翻页手势十七页回归通过。

375／768 首页完整截图已目视。输出目录 `miniprogram/test-results/ui-preview-capture-bottom-{home,entry,domains,toolbars,navigation,snap}`，日志为对应 `capture-bottom-*.log`。最终 `build:weapp` 通过，主包 **1,468,256 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；构建日志 `capture-bottom-build.log`。未跑无关全量 `verify`，微信开发者工具、真机输入键盘和原生手势未实测。

## 领域卡图标留白（C64）

2026-10-06 共享 `components/domain-progress.css` 的 `.domain-progress-summary.without-goals` 将图文间距固定为 12px，与领域主卡原 12px 左内距一致；宽屏不再沿用通用摘要的 10px 间距。图标仍为 40px，原两列、88px 卡高、名称／计数／进展与导航保留，未改素材或数据；本条替代 C58 当次保留的 8px／10px 间距，设计主说明见 [C50／C64](../Design.md#领域首页卡片c50)。

在既有领域回归的默认八卡几何检查中量图标左侧及到正文的真实间距，核对两侧相等；保留完整可见、40px 图标、原两列与业务流程断言。本轮 `typecheck`、完整 `test:domains` 通过，后者包括原领域模型／共享习惯编辑检查及 360／375×667／430／768 四尺寸浏览器回归，1280px 两列检查保留。默认八卡左右间距均为 12px，图标与正文完整；375／768 主页截图已目视。输出 `miniprogram/test-results/ui-preview-domain-icon-balanced`，日志 `domain-icon-balanced-domains.log`。

最终 `build:weapp` 通过，主包 **1,467,952 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/domain-icon-balanced-build.log`。未运行无关全量 `verify`，微信开发者工具和真机未测。
