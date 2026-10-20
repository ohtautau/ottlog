# 小程序农历与节日（C117）

2026-10-12 C297：两个习惯详情备注框改为44px最小高并随全文自然撑高；日历下月日志用60px独立纵向视窗，约一条普通记录高，其余滑动查看，原十条／更多、完整留言和月份／习惯切换回起点保持。统计自然列表及原42格／40px日期、账号保存不改，见[C297](../Design.md#习惯详情备注缩小与单条日志视窗c297)。

2026-10-12 C296：共用习惯日历移除下方「已打卡／本月 N / M 天」整行及专用留白，习惯页／领域详情／只读统计同步。四项统计、日期打卡状态与42格、导航／补记和月日志保持，不改数据，见[C296](../Design.md#习惯日历移除底部图例与月天数c296)。

2026-10-12 C281：习惯与待办日期日历共用CalendarMonthNavigation，左侧年月打开选择窗、右侧上个月／○回当前月／下个月。习惯页／领域详情／统计同步，习惯保持0000年下限及本月上限；待办沿1000–9999年。年月输入沿C280居中96×40px，关闭未保存提示同源，原日期格／补记／统计及日志保持，月份浏览不写存档。见[C281](../Design.md#习惯日历统一年月导航c281)。

2026-10-12 C280：任务日期的年月选择共用NumericInputRow，将年份／年／月份／月整组居中，与任务和提醒时间设置同源。输入框沿SingleLineInput的96×40px与居中数值；原1000–9999年／1–12月范围、查看月份、草稿关闭和日期规则保持。见[C280](../Design.md#数字设置浮窗统一居中c280)。

2026-10-07。规则见 [C117](../Design.md#日历圆形日期与农历节日c117)，决定见 [决策记录](decisions.md#日历圆形日期与农历节日c117)。仅修改小程序，网页未同步。

任务日程使用 ScheduleCalendar，习惯页／领域详情／统计使用 HabitCalendar；数字、农历／节日字幕统一由 CalendarDayContent 生成。提醒日期在 C119 已改为六种相对日期独立选择，省去原提醒月历。选中、今天和已打卡的圆形内层与七列触控格分开，原任务选择日期、日程确认／取消及习惯历史规则保持。

普通日期下显示农历，初一显示月份；节日当天改为节日短名称，长文本省略。任务、提醒和只读统计日历长按日期可查看完整农历、所有同日节日及地区；习惯详情仍限制原可操作日期，可长按这些日期查看。窗口使用应用内遮罩与关闭按钮，不改变选中日期或打卡。浏览器 Escape 关闭本层详情并保留后面的选项窗。

## 日期范围与来源

农历覆盖 1901–2100，来自[香港天文台公历与农历对照表](https://www.hko.gov.hk/tc/gts/time/conversion.htm)。不依赖微信环境的 Intl 或设备语言。按公历年打包初始农历月／日、闰月段及大小月，运行时用 UTC 日期计算；月份名称与日名由共享纯函数生成。农历元数据范围外仍保留原日期选择范围，不改存档。

节假日当前核实覆盖 **2025–2027**，其他年份只显示农历，详情注明该年份节假日尚未收录。地区固定为中国大陆、新加坡全国、英格兰／威尔士及美国全国联邦；只显示实际节日日期，排除 observed／substitute、整段放假及普通纪念日。浮动星期制节日采用其法定星期日期。

- 中国法定节日范围采用[《全国年节及纪念日放假办法》2024 年修订](https://big5.www.gov.cn/gate/big5/www.gov.cn/zhengce/zhengceku/202411/content_6986381.htm)。按用户「节日当天」只标节日本日，例如劳动节 5 月 1 日、国庆 10 月 1 日、春节正月初一及另列的除夕；不将初二／初三、5 月 2 日或 10 月 2–3 日连续休假逐日标为节日。农历节日及清明日期按天文台当年对照表核对，不导入调休安排。
- 新加坡使用 MOM 的 [2025](https://www.mom.gov.sg/newsroom/press-releases/2024/0805-public-holidays-for-2025)、[2026](https://www.mom.gov.sg/newsroom/press-releases/2025/0616-public-holidays-for-2026)、[2027](https://www.mom.gov.sg/newsroom/press-releases/2026/0618-public-holidays-for-2027) 年正式表；2025 年另外收录[5 月 3 日投票日](https://www.mom.gov.sg/newsroom/press-releases/2025/0415-public-holiday-on-polling-day_3-may-2025)。2026 年伊斯兰节日已核对 MUIS 的[官方年历](https://isomer-user-content.by.gov.sg/48/a15fa771-aa25-4b91-8406-5678b8003c38/Muis%20Calendar%202026.pdf)及[哈芝节公告](https://www.muis.gov.sg/resources/media-releases/prayer-arrangement-for-hari-raya-aidiladha-2026-1447h/)。宗教日期按官方年份录入，不以固定农历／算法外推未来年份。
- 英国只使用[GOV.UK 英格兰／威尔士银行假日](https://www.gov.uk/bank-holidays)，可机读来源为[官方 JSON](https://www.gov.uk/bank-holidays.json)；圣诞和节礼仍显示 12 月 25／26 日，不显示替代的 27／28 日，不采用苏格兰或北爱尔兰专属假日。
- 美国采用[5 USC 6103(a)](https://www.govinfo.gov/content/pkg/USCODE-2024-title5/html/USCODE-2024-title5-partIII-subpartE-chap61-subchapI-sec6103.htm) 全国联邦假日，并核对 [OPM 年度表](https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/)。例如独立日显示 7 月 4 日，不显示周末提前／顺延的补休；不含州级及地区限定就职日。

## 维护与验证

在 miniprogram 执行 `node scripts/generate-calendar-lunar.cjs`，首次生成需要读取公开天文台文件；原表缓存于忽略的 test-results/calendar-source-cache，不进入应用。脚本先验证各年日期完整及连续，再验证生成表解码的全部 73,049 天，全部成功才写 calendar-lunar-data.ts。英文 2069 表漏了 12 月 30 日，脚本只用同一官方中文表明确的「十七」补齐该行，并保留校验，不自行猜补。

节日维护在 calendar-date-label.ts 的已核实年份、官方实际日期数组和既有中国法定规则内进行；同步更新 check-calendar-date-label.cjs 的独立年度预期、本文范围及决策记录。不得仅扩大年份边界但遗漏宗教／特别法定日期。节日与农历仅派生显示，无网络运行时依赖、额外存储键或业务数据复制。

验证命令为 `npm.cmd run typecheck`、`npm.cmd run test:calendar-labels`、现有日程／习惯纯逻辑检查及普通／预览构建。浏览器检查圆形几何、字幕完整、独立详情关闭、短屏默认完整、非零安全区、原打卡持久化／重试／账号隔离；不能作为微信原生长按、字形或真机通过的证明。实际运行结果见[开发说明](development.md#日历圆形日期与农历节日c117)。
