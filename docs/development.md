# 开发说明

初版及规则确认：2026-10-04。开发规则见 [AGENTS.md](../AGENTS.md)，交互规则见 [Design.md](../Design.md)，正式决定与实现状态见 [决策记录](decisions.md)。

后续功能开发仅修改小程序（P01）。下文保留网页与 API 的结构和历史验证入口供兼容核对，不表示默认扩大改动范围。

## 六类统计图表与自动分析（C299）

2026-10-12，仅小程序。statistics-insight-model统一类型、本地7／30日及前等长窗口、数值／增减和真实日期校验；三组纯模块提供六类各6指标、合计9张新增图和客观发现。StatisticsInsights统一指标网格、日柱／分布条、图例／单位／最大刻度、点选准确数值、缺记录及内部横滑，沿共用ChoiceButton／SectionTitle。原六源同owner就绪与格式校验后按当前类别派生，期间在六分类间保持，账号变化回7天，分钟／返回及原状态更新重新计算，不写入统计缓存或存档；ActivityAnalysis可受控读取同一期间并保留原点选明细，其他调用缺省行为保持。原月历、营养日期、目标历史、成长图、专注历史／删除和提醒授权保留，见[C299](../Design.md#六类统计图表与自动分析c299)。

新增任务当前日程分布／完成活跃、按有效日程计算的按时率及创建到完成经过时长；专注按结束时段归整轮实际投入，早结束计入、休息／active排除；习惯从cleanState合并的完整completionHistory读取并处理撤销／归档／删除，不推断历史应做数；营养未记录与真实0分开，日均只除记录日；领域按原ID显示正负记录及目标，不评分；成长按1／3／5原权重、原ID及归档贡献。旧ActivityAnalysis共享相同实际截止，修复同日未来时刻与无效日期／时刻被算入的口径差异；原任务／计时存档不改。排行合并项生成无碰撞key并保留总数，CSS间距由.statistics-insights.statistics-card避免旧卡类覆盖。

typecheck、git diff --check、check-statistics-data（接入三组新增纯测试）及check-todos通过。独立预期覆盖7／30边界、前期零基数、时间戳／本地日期、UTC／上海或新加坡／纽约与夏令时、跨年／闰日、未来1ms、倒序／无效完成时长、按时率分母、五互斥日程桶、专注结束时段、完整习惯区间／显式撤销／归档／删除／同名不同ID、图片记录、营养缺记录／真实零及记录日均、成长权重／目标／归档、多实体合并总数／合法ID碰撞和deepFreeze只读。原统计门禁仍覆盖未就绪／混账号／无效格式。

新增--statistics-insights在360×844／375×667／430×844／768×1024通过，独立fixture预期六类指标、九图／图例／刻度、点选数值、40px控件、真实堆叠比例／零柱、7／30期间与旧分析联动、30日首末内部横滑、缺记录／真实0、六类空态／无NaN及六源存档原文不变。初轮空态测试预期最高0不适用于未记录营养与空排行，改为严格分别验证暂无已记录数值及真实零刻度后全套通过。原完整--statistics四尺寸通过，涵盖既有计算／导航往返、月历与日志、营养日期／目标／成长、专注历史筛选／删除／失败同目标重试及授权、游客／账号和无效存档保留；将历史首页入口的「打开数据」测试名同步为已实现的「打开统计」，不改入口代码。375px六类图表截图已逐一目视。test:statistics现包含新旧两套，独立入口test:statistics-insights；日志test-results/statistics-expanded-{final-types,final-data,todos-data,legacy-final-ui}.log及statistics-insights-final-ui.log，输出ui-preview-statistics-insights-final／ui-preview-statistics-expanded-legacy-final。

build:device -- --preview-records沿原LAN及隔离预览更新dist，主包1,391,752字节、统计分包97,395字节，17页启动、94源码／19产物样式与预算通过；构建成功后wcsc编译实际19份WXSS全覆盖、退出0且stderr为空。日志test-results/statistics-expanded-{build,native-wxss}.log。微信模拟器冷启动及真机操作尚未验证。

## 首页格言正文与侧栏排版（C298）

2026-10-12，仅小程序。MottoBanner将原正文下方计数移入右侧today-quote-side，组合40px共用铅笔与下方居中计数、4PX间距和3PX斜线两侧留白；左侧独占正文，15PX／23PX两行，宽屏仍16PX／24PX。侧栏min-width:40PX／flex:none及正文min-width:0保证两列，保留原16PX水平／12PX上下内距、12PX列距；短／长／空值高度稳定，栏高约从91px缩至85px。自动轮播及触摸／可见守卫、管理导航、全文数据和账号保存不改，见[C298](../Design.md#首页格言正文与侧栏排版c298)。

typecheck、git diff --check及现有完整--mottos在360×844／375×667／430×844／768×1024通过。原几何断言改查右侧上下序号、4px间距／居中、40px按钮及新正文大小，现有长／单句／空值场景补查稳定栏高；两行摘要、自动缺省／自定义轮播、触摸与可见守卫、间隔数字窗／未保存关闭、创建编辑删除、失败同目标重试、游客／账号隔离和61条无数量限制继续通过。375px单句／两行长文与768px截图已目视，输出ui-preview-home-motto-side-layout，日志test-results/home-motto-side-layout-{types,ui}.log。

build:device -- --preview-records沿原LAN和隔离预览更新dist，主包1,391,752字节，17页启动、93源码／19产物样式及预算通过；等待构建完成后wcsc编译实际19份WXSS全覆盖、退出0且stderr为空。日志test-results/home-motto-side-layout-{build,native-wxss}.log。微信模拟器冷启动及真机操作尚未验证。

## 习惯详情备注缩小与单条日志视窗（C297）

2026-10-12，仅小程序。HabitNoteField只读框取消144rpx最小高，使用44PX最小高、6PX上下／12PX左右内距，14PX全文自然换行，编辑Textarea保持。HabitCalendar.detail用60PX独立ScrollView承载原十条日志及更多，标题下距4PX、日期／正文14PX和星期12PX；长留言无截断，其余通过内部滚动查看。按habitId／month的React键重建日志视口以回起点，统计page继续原自然列表，不改记录计算、账号队列或存档，见[C297](../Design.md#习惯详情备注缩小与单条日志视窗c297)。

typecheck及既有--habit-comment-logs三宿主、--habit-detail-edit两详情宿主在360×844／375×667／430×844／768×1024通过。现有两份日志／几何测试同步新增短备注自然高与内距、独立日志轮滚／最后普通行可达、日历／日志标题／外滚动／底栏不移动、完整长文／更多10→20→21、切月与切习惯回起点，统计无新内滚动且存档不变；完整日历／六行40px／8px字段间距继续检查。初版64px日志窗在375短屏超出约5px，未作验收，最终收为60px及4px标题下距后原严格几何通过；更多按钮允许1px内的亚像素边界误差，40px尺寸及相对日志窗边界仍明确验证。长备注／即时字段修改、保存失败同目标重试、补记与账号守卫四尺寸保持。375px滑动至日志的详情及430px含备注／日历／日志的领域宿主截图已目视；日志test-results/habit-detail-compact-log-{types,ui,inline-final-ui}.log，输出ui-preview-habit-detail-compact-log-ui／ui-preview-habit-detail-compact-log-inline-final。

最终build:device -- --preview-records沿原LAN与隔离预览更新dist，主包1,391,579字节，17页启动、93源码／19产物样式与预算通过。等待最终构建完成后wcsc编译实际19份WXSS全覆盖、退出0且stderr为空；日志test-results/habit-detail-compact-log-final-{build,native-wxss}.log。微信模拟器冷启动及真机操作尚未验证。

## 习惯日历移除底部图例与月天数（C296）

2026-10-12，仅小程序。共用HabitCalendar直接删除「已打卡／本月 N / M 天」节点及圆点／边线／专用内外距，移除统计页对应字体选择器及只含图例规则的宽屏media块；两个详情宿主与只读统计同源，不留占位。保留四项统计和业务计算、日期状态／无障碍、42格／40px触控、年月导航、打卡及留言历史，不改存档，见[C296](../Design.md#习惯日历移除底部图例与月天数c296)。

typecheck、git diff --check及现有--habit-comment-logs三宿主四尺寸360×844／375×667／430×844／768×1024通过；原完整月历／布局、共享年月导航、留言全文／十条分页／切换重置、原统计及只读存档不变继续通过。既有详情几何助手移除两处已删除图例测量并检查整行不存在，分类滑动测试原图例内距断言改为整行不存在且脚本语法通过，本次未运行无关完整分类滑动套件。375px习惯详情与统计截图已目视，未新增独立样式测试；输出ui-preview-habit-calendar-no-legend，日志test-results/habit-calendar-no-legend-{types,ui}.log。

build:device -- --preview-records沿现有LAN及隔离预览更新dist，主包1,390,855字节，17页启动、93源码／19产物样式与预算通过。构建完成后原生wcsc编译实际19份WXSS全覆盖、退出0且stderr为空；日志test-results/habit-calendar-no-legend-{build,native-wxss}.log。微信模拟器冷启动及真机操作尚未验证。

## 领域详情目标编辑按钮略向左移（C295）

2026-10-12，仅小程序。domain-detail/index.css在详情页的domain-goal-edit增加4PX右外距，长／短期目标两个编辑按钮整体向左4px，保留原flex居中、至少40px触控及共享ActionButton／EditSymbol。原创建按钮和目标保存逻辑不改，无存档变更，见[C295](../Design.md#领域详情目标编辑按钮略向左移c295)。

typecheck、git diff --check及现有--domain-recent-records四尺寸360×844／375×667／430×844／768×1024通过，包括375px模拟34px安全区、固定详情／双栏记录独立滚动、目标与纵向习惯布局、原ID编辑／删除保存、账号与失败守卫。375px详情截图已目视确认两个铅笔左侧调整及垂直居中；低影响布局未新增测试。输出ui-preview-domain-goal-edit-left，日志test-results/domain-goal-edit-left-{types,ui}.log。

build:device -- --preview-records沿既有LAN及隔离预览更新dist，主包1,392,151字节、领域详情分包25,502字节，17页启动、93源码／19产物样式与预算通过；等待构建完成后原生wcsc编译实际19份WXSS全覆盖、退出0且stderr为空。日志test-results/domain-goal-edit-left-{build,native-wxss}.log。微信模拟器冷启动及真机操作尚未验证。

## 任务排序入口保持已应用高亮（C294）

2026-10-12，仅小程序。任务SortPopover的selected由仅showSort改为展开或getTodoSortMode(state)不同于初始custom；确认创建时间／日程时间后关闭及重载仍用共享选中反馈，候选sortChoice不参与已应用判定。恢复默认或实际拖动保存custom后关闭恢复普通态，不改排序队列、存档格式或其他页面，见[C294](../Design.md#任务排序入口保持已应用高亮c294)。

typecheck、git diff --check及原--todo-sorting四尺寸360×844／375×667／430×844／768×1024通过。既有确认助手检查自动模式关闭后aria-pressed=true及实际共享绿色背景；重开／关闭助手检查已应用模式高亮、手动拖动及重载custom普通态。原未确认取消不写、排序顺序／同值稳定、记录保留／筛选／拖动取消、同目标失败重试、账号隔离及无效数据禁用继续通过。输出ui-preview-todo-sort-applied-highlight，日志test-results/todo-sort-applied-highlight-{types,ui}.log。

build:device -- --preview-records沿既有LAN及隔离预览更新dist，主包1,392,151字节，17页启动、93源码／19产物样式与包体预算通过。首次原生检查早于构建完成而未获得编译输出，未作为验收；等待构建成功后重跑wcsc，实际19份WXSS全覆盖、退出0且stderr为空。日志test-results/todo-sort-applied-highlight-{build,native-wxss}.log。微信模拟器冷启动和真机操作尚未验证。

## 专注事项来源浮窗左右留白统一（C293）

2026-10-12，仅小程序。Pomodoro的「正在做什么」来源ChoicePopover宽度156px改为104px，focus-source-options内原form-choice-content的width:100%改为auto并居中，去除整行左对齐造成的右侧多余空白。继续用原ChoiceButton、20px库图标／8px图文／14px文字和40px触控、tight正文12px水平／4px上下内距、4px行距及preferredSide='above'定位，不改来源选择／计时或业务存档，见[C293](../Design.md#专注事项来源浮窗左右留白统一c293)。

typecheck、git diff --check及现有--pomodoro四尺寸360×844／375×667／430×844／768×1024通过。原几何检查更新宽度，并按真实图标及文字Range测量前后留白差不超过1px、图文8px及完整一行；保留20px图库、40px选项、正文原内距／行距、向上真实8px位置及计时按钮不移动。原来源打开／取消不写、选择进入待办窗、关联与重选、输入、计时／提前结束、反馈／提醒及账号流程继续通过；375px新菜单截图已目视。输出ui-preview-pomodoro-source-symmetric，日志test-results/pomodoro-source-symmetric-{types,ui}.log。

build:device -- --preview-records沿既有LAN及隔离预览更新dist，主包1,392,121字节、专注分包93,942字节，17页启动、93源码／19产物样式与包体预算通过；原生wcsc编译实际19份WXSS全覆盖、退出0且stderr为空。日志test-results/pomodoro-source-symmetric-{build,native-wxss}.log。微信模拟器冷启动和真机操作尚未验证。

## 习惯时段设置一行五按钮（C292）

2026-10-12，仅小程序。HabitEditor备注下的daily-editor-settings用五列等宽ChoiceButton直接展示上午／中午／下午／夜晚／自由；daily-time-period-field仅负责整行网格与6px列距，按钮继续共用14px字／40px触控及选中态，删除SingleChoiceField导入及下拉。原habitTimePeriod缺省推断、timePeriod值／顺序、点击收键盘／草稿回调及分段线／12px内距／字段8px间距保持，习惯页与领域创建／编辑同源，见[C292](../Design.md#习惯时段设置一行五按钮c292)。

typecheck、check-habit-edit及git diff --check通过。现有--habit-time-periods在360×844／375×667／430×844／768×1024通过，编辑几何助手改查五按钮整行：等宽、同一y、至少40px宽高、14px字、6px列距、无溢出／下拉和唯一选中；领域／名称／备注／设置的原顺序及8px间距保持。原选择只改草稿、未保存继续／不保存、显式保存／失败保留同ID重试、领域编辑夜晚及创建中午、历史／账号隔离、五时段分组／筛选／拖动与旧缺省推断继续通过。旧测试末尾的领域横向分页选择器按已实现C278同步为纵向HabitGrid，其他排序／文本断言保持；未新增独立低影响样式测试。375px两个编辑宿主截图已目视。输出ui-preview-habit-period-five-buttons，日志test-results/habit-period-five-buttons-{types,data,ui}.log。

build:device -- --preview-records沿既有LAN及隔离预览更新dist，主包1,392,121字节，17页启动、93源码／19产物样式和包体预算通过。原生wcsc编译实际19份WXSS全覆盖、退出0且stderr为空；日志test-results/habit-period-five-buttons-{build,native-wxss}.log。微信模拟器冷启动和真机操作尚未验证。

## 排序筛选左侧一键恢复默认（C291）

2026-10-12，仅小程序。PageToolbar新增首位reset插槽，ToolbarResetButton统一40px／ResetSymbol；六页工具栏及首页全部功能共七处接入，沿原6px动作间距与左侧摘要。任务applySort支持显式TodoSortMode，pending保留custom真实目标，恢复初始手动模式及全部筛选／完成分组；失败显示原排序窗重试，候选按C275映射但不能覆盖pending。习惯恢复筛选／当前时段与优先度降序并调用原persistSort，已是默认不重复写；便签、文章沿原会话默认，领域及首页两组退出排序／管理且不改已保存顺序／外观。存档格式、业务内容、账号／busy／拖动／编辑／失败守卫保持，见[C291](../Design.md#排序筛选左侧一键恢复默认c291)。

typecheck、git diff --check通过。--toolbar-defaults在360×844／375×667／430×844／768×1024覆盖七处按钮：40px／无文字／共享符号、排序左侧6px且居中、直接恢复任务和习惯真实存档默认并保留记录内容、清筛选／恢复列表和入口普通态、便签退出删除管理且不写业务、文章默认排序／10篇、领域及首页两组保留手动卡片顺序和外观；360px还覆盖任务／习惯默认排序写失败、锁定恢复、原绝对目标重试成功。隔离fixture在新文档前预置存储并重载，避免测试读到前一场景缓存；未改生产数据。原--toolbars十页四尺寸及按钮环境／分类布局完整回归通过，更新reset插槽顺序及C268阅读与空间既有分组预期，未放宽溢出或触控断言。摘要测试的按钮数量同步，未额外跑--toolbar-summaries。375px习惯／便签／全部功能截图已目视。输出ui-preview-toolbar-restore-defaults／ui-preview-toolbar-restore-layout，日志test-results/toolbar-restore-{defaults-types,defaults-ui,layout-ui}.log。

build:device -- --preview-records沿既有LAN及隔离预览更新dist，主包1,391,954字节，文章分包12,234／便签34,774字节；17页启动、93源码／19产物样式和包体预算通过。原生wcsc编译实际19份WXSS全覆盖，退出0且stderr为空；日志test-results/toolbar-restore-defaults-{build,native-wxss}.log。微信模拟器冷启动及真机操作尚未验证。

## 便签卡点击不显示半透明区域（C290）

2026-10-12，仅小程序。便签列表阅读Button明确hoverClass='none'关闭默认原生按压背景，memo-note-open:active由原rgba(255,255,255,.035)改为透明／filter:none，覆盖全局button:active亮度效果。原按钮身份、点击setViewed、无障碍／键盘focus-visible、40px触控、六色外卡及置顶／删除控件保持，未改业务存档或共享按钮，见[C290](../Design.md#便签卡点击不显示半透明区域c290)。

typecheck、git diff --check及现有--memos四尺寸360×844／375×667／430×844／768×1024通过，原内容打开／优先度浮层、编辑保存返回内容、六色文字可读性、置顶／筛选／删除／创建及账号流程保持，无渲染错误或横向溢出。本次为局部可逆反馈样式，不新增测试。输出ui-preview-memo-card-no-highlight，日志test-results/memo-card-no-highlight-{types,ui}.log。

build:device -- --preview-records沿既有LAN及隔离预览更新dist，主包1,390,082字节、便签分包34,522字节，17页启动、93源码／19产物样式和包体预算通过；原生wcsc编译实际19份WXSS全覆盖、退出0且stderr为空。日志test-results/memo-card-no-highlight-{build,native-wxss}.log。浏览器适配不模拟微信默认hoverClass，原生按压显示、微信模拟器冷启动和真机操作尚未验证。

## 便签内容优先度浮窗脱离阅读滚动区（C289）

2026-10-12，仅小程序。原MemoReader把PrioritySelect选项嵌在阅读ChoicePopover的ScrollView／overflow:hidden面板内，有原生滚动裁切和层级遮挡风险。ChoicePopover新增triggerId／renderLayer／layerClassName可选参数，触发器独立实例不注册浮窗栈、隐藏键盘或测量；既有anchorId实例承担独立选项层。PrioritySelect透传，MemoReader在实体行只渲染原触发器，在阅读同级复用同一priorityProps渲染选项；专用层250高于阅读240、低于图库260。原定位／共用选项／即时保存／失败目标与账号规则保持，见[C289](../Design.md#便签内容优先度浮窗脱离阅读滚动区c289)。

typecheck、git diff --check及现有--memos四尺寸360×844／375×667／430×844／768×1024通过。新增结构断言确认选项在阅读面板、外层浮层与ScrollView之外，实际层级更高；四项完整在视口内、中心elementFromPoint命中按钮、触发aria-expanded与Escape／遮罩先关最上层且不写便签。原即时选择／失败重试、保存返回内容／Markdown图片、六色可读性、筛选／置顶／创建／账号隔离继续通过；375px选项覆盖阅读内容的截图已目视。共享PrioritySelect／ChoicePopover的--habit-detail-edit四尺寸两个宿主回归通过，保留原领域／图标／优先度、关闭／保存重试及日历流程。输出ui-preview-memo-priority-layer及ui-preview-memo-priority-layer-shared，日志test-results/memo-priority-layer-{types,ui,shared-ui}.log。

build:device -- --preview-records沿既有LAN及隔离预览更新dist，主包1,390,082字节、便签分包34,501字节，17页启动、93源码／19产物样式与包体预算通过；原生wcsc编译实际19份WXSS全覆盖，退出0且stderr为空。日志test-results/memo-priority-layer-{build,native-wxss}.log。以上浏览器适配和编译检查不能代替原生运行，微信模拟器冷启动及真机点击尚未验证。

## 编辑便签保存后返回内容（C288）

2026-10-12，仅小程序。便签页save沿原change队列持久化，既有mounted／owner／currentDraft ID与volatile校验通过后清编辑草稿，并setViewed为捕获的owner／原便签ID；readNote继续从最新state读取并复用MemoReader。saveAndClose仍调用同一保存器，失败不切换，创建／取消／删除没有新增行为或存档，见[C288](../Design.md#编辑便签保存后返回内容c288)。

typecheck、git diff --check及现有--memos四尺寸360×844／375×667／430×844／768×1024通过。原阅读测试覆盖直接保存返回同一内容、失败保留编辑输入且不打开阅读、重试成功返回、未保存提示中保存返回最新标题及Markdown、原图片／ID／创建时间／优先度保持；颜色编辑和图片删除后阅读同步，无重复创建。原六色可读性、列表筛选／置顶、创建／草稿／删除重试和账号隔离继续通过；375px保存返回截图已目视。旧图标及关闭守卫测试中需从列表重开的路径同步为已返回阅读，未重跑无关完整--icons／--window-close。输出ui-preview-memo-save-return-content，日志test-results/memo-save-return-content-{types,ui}.log。

build:device -- --preview-records沿既有LAN及隔离预览更新dist，主包1,389,798字节、便签分包34,150字节；17页启动、93源码／19产物样式与包体预算通过。原生wcsc编译实际19份WXSS全覆盖，退出0且stderr为空，日志test-results/memo-save-return-content-{build,native-wxss}.log。微信模拟器冷启动及真机操作尚未验证。

## 图标补充中英文搜索关键词（C287）

2026-10-12，仅小程序。仅扩展iconLibrary全部64项keywords，追加中文同义词及英文常用名称、用途／词形、短语和拼写变体；保留原关键词、标签／分类／顺序／id／src／fallback。findLibraryIcons、IconLibrarySheet及所有宿主的显示／布局和业务选择器未改，关键词仅出现在原检索字符串中，不渲染或保存到业务数据，见[C287](../Design.md#图标补充中英文搜索关键词c287)。

typecheck、git diff --check及原check-icon-library-data通过：全部64项中英关键词完整，八分类中英别名、短语／大小写／首尾空白、拼写变体、空查询原顺序及分类边界；原彩色资源与SVG一致、64格灰色图集来源／顺序／字节确定性、旧习惯／便签兼容继续通过。现有--home-shortcut-library四尺寸360×844／375×667／430×844／768×1024通过，新增镜头／PHOTOGRAPHY与脚踏车／bicycle查询，并检查搜索结果仍仅为原中文名称／原图片、分类限制及清空恢复；原选择、分层关闭、草稿保存／重试与账号守卫继续通过。其他图标宿主共用同一检索器与数据，未重跑无关完整--icons旧流程。输出ui-preview-icon-search-keywords，日志test-results/icon-search-keywords-{data,types,ui}.log。

build:device -- --preview-records沿既有LAN及隔离预览更新dist，主包1,389,798字节，17页启动、93源码／19产物样式与包体预算通过；原生wcsc编译实际19份WXSS全覆盖，退出0且stderr为空。日志test-results/icon-search-keywords-{build,native-wxss}.log。微信模拟器冷启动及真机操作尚未验证。

## 便签背景显色增强（C286）

2026-10-12，仅小程序。现有背景surface为不透明六位色值；按用户减少背景透明度的显色意图，将旧surface向对应value混合10%，直接更新memoColors六个surface，原memoColorStyle同步列表／创建编辑／阅读／EntryPreview。列表日期及标签从#b7c2c8提亮为#cdd7dd，保持文字对比。未改颜色身份／value、45%边框、置顶外观、控件／布局或业务存档，见[C286](../Design.md#便签背景显色增强c286)。

typecheck、git diff --check及现有--memos四尺寸360×844／375×667／430×844／768×1024通过，无渲染错误或横向溢出。六色列表文字实测最低对比：标题9.12:1、正文7.40:1、日期／标签7.02:1；阅读与创建／编辑六色可读性、Markdown／图片、颜色保存／筛选、置顶、原ID、失败重试与账号隔离继续通过，测试断言未放宽。375px列表和薄荷阅读截图已目视；输出ui-preview-memo-stronger-background，日志test-results/memo-stronger-background-{types,ui}.log。

build:device -- --preview-records沿既有LAN及隔离预览更新dist，主包1,384,110字节，17页启动、93源码／19产物样式与包体预算通过；原生wcsc编译实际19份WXSS全覆盖，退出0且stderr为空。日志test-results/memo-stronger-background-{build,native-wxss}.log。微信模拟器冷启动及真机操作尚未验证。

## 点击已有任务默认预览备注（C285）

2026-10-12，仅小程序。任务宿主向TodoEditorFields传defaultPreview={editing}，透传到MarkdownNoteEditor；组件初始及owner／recordId／format／默认值变化时恢复该模式。已有任务每次打开先显示原Markdown及图片预览，点书写沿原输入／图片移除；创建宿主与其他调用保持缺省false。模式不参与任务草稿比较、业务存档或未保存提示，原保存器／账号守卫未改，见[C285](../Design.md#点击已有任务默认预览备注c285)。

typecheck及git diff --check通过。现有check-todo-note-editor增加默认预览、完整Markdown／图片、书写再关闭重开恢复预览及模式切换不改原记录断言，原文本／图片创建和跨类型恢复、保存失败重试、原ID／更新保留、图片删除及异步图片账号隔离继续通过。增加--todo-note-editor复用该套现有测试单独执行，360×844／375×667／430×844／768×1024全部通过；375px初始预览截图已目视。输出ui-preview-task-default-preview，日志test-results/task-default-preview-{types,ui}.log，未运行无关全量verify。

build:device -- --preview-records沿既有LAN及隔离预览更新dist，主包1,384,110字节，17页启动、93源码／19产物样式及包体预算通过。原生wcsc编译实际19份WXSS全覆盖，退出0且stderr为空；日志test-results/task-default-preview-{build,native-wxss}.log。微信模拟器冷启动及真机操作尚未验证。

## 待办日期清除改为左侧符号按钮（C284）

2026-10-12，仅小程序。TodoScheduleSheet底栏使用SheetActions.leading组合40px普通意图ResetSymbol清除和48px伸缩确认，沿共享8px间距／居中与安全区；删除旧底栏布局、按钮尺寸与secondary覆盖样式。原clear／confirm、无障碍名称和busy守卫保持，创建与编辑同源，见[C284](../Design.md#待办日期清除改为左侧符号按钮c284)。

typecheck、原check-todo-schedule及git diff --check通过。现有--schedule-time在360×844／375×667／430×844／768×1024通过，含34px模拟安全区；原几何断言按新设计检查清除无文字／共享符号、40px与48px、8px间距、中心对齐及确认占余宽。原时间严格校验、分层取消／确认、清除日期／时间／提醒／重复、保存原ID及其他任务字段、重开／重载继续通过。375px底栏截图已目视；输出ui-preview-date-clear-symbol，日志test-results/date-clear-symbol-ui.log。

build:device -- --preview-records沿既有LAN及隔离预览更新dist，主包1,383,978字节，17页启动、93源码／19产物样式与包体预算通过；原生wcsc编译实际19份WXSS全覆盖，退出0且stderr为空。日志test-results/date-clear-symbol-{types,build,native-wxss}.log。微信模拟器冷启动及真机操作尚未验证。

## 待办提醒设置分区与减少层级（C283）

2026-10-12，仅小程序。TodoScheduleSheet用EditorFieldsLayout／FilterFieldHeading将提醒窗口分为时间、日期、实际提醒：五快捷时刻及自定义形成三列两行，六个日期直接调用原setReminderChoice；移除reminder-day子层和双结果下拉，reminderPart只保留time。快捷时刻只读调用relativeReminder展示并防御异常日期时刻，说明沿任务当天计算；完整年月日／时刻从原已应用草稿读取。缺任务时间新增直达setSection('time',true)入口，原pending快捷目标补齐时间后重新计算。自定义仍沿原数字窗、completeTime和useEditorCloseGuard，平台授权及业务存储未改。规则见[C283](../Design.md#待办提醒设置分区与减少层级c283)。

类型、日程逻辑、提醒授权／同步逻辑及git diff --check通过；--reminder-settings和--schedule-time在360×844／375×667／430×844／768×1024通过，含34px模拟安全区。提醒覆盖五快捷实际时刻、六日期直接选择／整月夹取、预览与真实存档一致、子窗关闭／键盘不自动弹出、严格时分校验／保留非法草稿、完成与清除取消、原任务ID／日期／重复保留、无任务日期的自定义提醒和缺时刻直达修复，以及纽约夏令时重复小时的原ISO提醒不重写。所有可见按钮的实际命中／完整可达和主日历几何保持通过，375px新提醒截图已目视。既有测试中创建后自动开编辑的假设按C246改为手动打开，原保存校验未放宽；其他依赖日期子窗的测试调用同步，未运行无关全量verify。

最终build:device -- --preview-records沿既有LAN与隔离预览更新dist，主包1,384,245字节，17页启动、93源码／19产物样式及包体预算通过。原生wcsc编译实际19份WXSS全覆盖，退出0且stderr为空。输出ui-preview-reminder-redesign-verified／ui-preview-reminder-redesign-schedule-final，日志test-results/reminder-redesign-{verified-ui,schedule-final,final-build,native-wxss}.log。微信模拟器冷启动、真机操作和真实提醒送达尚未验证。

## 自定义重复单位使用选择框（C282）

2026-10-12，仅小程序。TodoScheduleSheet在原NumericInputRow内用SingleChoiceField替换单位文字，删除下方五单位按钮网格及专用CSS；天／周／月／年／工作日映射和repeatWithAnchor调用保持，96×40px数字框与40px单位选框整行居中。单位选择只关闭子层，原自定义窗口和间隔保留，未改存档格式、校验或最终保存器。规则见[C282](../Design.md#自定义重复单位使用选择框c282)。

类型、任务日程逻辑、git diff --check及现有--schedule-time通过360×844／375×667／430×844／768×1024：默认每1天整组居中、无旧单位网格，五个单位逐一选择后关闭子层／保留数字2／保持父窗，短长单位的实际整组中心差不超过1px；Escape／遮罩先关子层且不改单位。每2月最终保存到原任务recurrence并保留日期／提醒，后续时间清除／编辑／重载仍保留原重复字段；原严格时间校验／非法值／分层取消／稳定按钮继续通过。旧任务编辑测试的天按钮路径同步为单位选框，未重跑无关全套--todos。375px默认每1天截图已目视，输出ui-preview-repeat-unit-select及repeat-unit-select-ui.log。

build:device -- --preview-records沿现有LAN与隔离预览更新dist，主包1,383,444字节，17页启动、93源码／19产物样式和包体预算通过；原生wcsc编译实际19份WXSS全覆盖、退出0且stderr为空。日志test-results/repeat-unit-select-{build,native-wxss}.log。微信模拟器冷启动和真机尚未验证。

## 习惯日历统一年月导航（C281）

2026-10-12，仅小程序。新增CalendarMonthNavigation共享左侧年月入口／选择浮窗、右侧‹／○／›、数字校验与useEditorCloseGuard；ScheduleCalendar移除原重复年月状态及UI，HabitCalendar用同一组件替换居中月份／两侧箭头和条件「回到本月」文字按钮。月份与存档仍由宿主拥有，习惯传0000-01至当前月，任务传原1000–9999年范围；数字沿NumericInputRow／ScheduleNumberInput，详情忙碌和目标变化守卫保持。删除旧标题栏及数字行的专用布局，原日期格、打卡和日志未改。规则见[C281](../Design.md#习惯日历统一年月导航c281)。

类型、习惯日历与任务日程逻辑检查通过；--habit-comment-logs在360×844／375×667／430×844／768×1024覆盖习惯页详情／领域习惯详情／只读统计，共享导航四按钮顺序、○常显、年月选择96×40px及居中、拒绝未来月份、直接跳到9月／回本月、修改后关闭不保存及Escape保存，原提醒／打卡存档不写。原42格、详情初始完整六行日期／40px触控、四项统计、留言全文和十条分页／切月重置继续通过。--schedule-time四尺寸通过，年月及时间／重复居中、任务范围／严格时间校验、原确认／关闭／保存保持；375px习惯详情导航截图已目视。

额外--habit-calendar-edit四尺寸通过两处详情的当天／90天内补记和撤销、未来／范围外禁用、归档限制、本机保存失败重试和账号隔离，输出ui-preview-calendar-month-shared-checkins及calendar-month-shared-checkins.log。

最终build:device -- --preview-records沿现有LAN与隔离预览更新dist，主包1,383,855字节，17页启动、93源码／19产物样式和包体预算通过；原生wcsc编译实际19份WXSS全覆盖、退出0且stderr为空。输出ui-preview-calendar-month-shared-{habits,schedule}，日志test-results/calendar-month-shared-{habits,schedule,final-build,native-wxss}.log。微信模拟器冷启动及真机尚未验证。

## 数字设置浮窗统一居中（C280）

2026-10-12，仅小程序。SingleLineInput继续拥有96×40px数字框、16px／24px居中原生行；新增NumericInputRow导出统一输入及单位的居中flex／8px间距，不修改数字范围或数据。ScheduleCalendar年月、TodoScheduleSheet任务／提醒时分和自定义重复、格言秒数及本次分钟实际复用，清理原专用行的重复定位CSS。年月与重复行原偏左已纠正；时间、格言及本次分钟保持原居中。规则见[C280](../Design.md#数字设置浮窗统一居中c280)。

其他popover按源码调用点和布局核对：所有number／digit参数仍沿SingleLineInput，餐食花费／准备时间自定义沿CustomChoiceRow，营养和专注节奏属于多字段编辑表单，保留字段组织；普通文字搜索、自定义标签、单／多选、图标库、优先度、排序及事项来源保留自身布局。此次只统一数字参数组合行，不改变选项排列或新增窗口。

类型检查、--schedule-time／--mottos／--pomodoro四尺寸回归通过360×844／375×667／430×844／768×1024。日程既有几何检查补充外框96×40px及数字／单位整组与面板中心差不超过1px，包含年月、时分和自定义重复，并等待重复间隔输入完整可见后输入2、截图检查；原校验、非法输入保留、按钮位置、逐层关闭、任务原ID／提醒／重复保存继续通过。测试旧「创建后自动打开任务编辑」假设按C246改为从列表手动打开已有任务，产品行为未改。格言轮播校验／取消／保存失败重试／账号隔离及专注分钟自动选中、持续输入、取消／本次时长／原计时行为通过。年月360px、自定义重复360px、格言375px及本次分钟375px截图已目视。

build:device -- --preview-records沿现有LAN与隔离预览更新dist，主包1,384,783字节，17页启动、92源码／19产物样式及包体预算通过；原生wcsc编译实际19份产物样式全覆盖、退出0且stderr为空。最终输出ui-preview-numeric-popovers-{schedule-visible,mottos,pomodoro}及test-results/numeric-popovers-{build,native-wxss,schedule-visible,mottos,pomodoro}.log。微信模拟器冷启动和真机输入法／运行尚未验证。

## 优先度浮窗左右留白对称（C279）

2026-10-12，仅小程序。共用priority-options.css把priority-option的justify-content从flex-start改为center，旗帜与完整文字组成一组居中，左右余宽平均分配。136px面板、原12px图文间距／8px面板内距／40px选项及四项名称保持；PrioritySelect全部宿主同源，未改数据或业务回调。规则见[C279](../Design.md#优先度浮窗左右留白对称c279)。

类型检查及原--entry-creation／--habit-detail-edit通过360×844／375×667／430×844／768×1024，覆盖任务／便签创建优先度四项的左右实际间隙差不超过1px、全文单行／图文间距／40px／选中及关闭，原完整创建／草稿／保存校验和账号隔离保持；习惯页／领域详情的即时优先度选择、取消、同目标失败重试和原历史继续通过。360px任务浮窗截图已目视旗帜前与末字后留白对称。原创建回归中的旧左距上限按新对称要求更新，其余断言保留，未新增专用测试。

build:device -- --preview-records沿现有LAN与隔离预览更新dist，主包1,384,498字节，17页启动、92源码／19产物样式及包体预算通过；原生wcsc编译实际19份产物样式全覆盖、退出0且stderr为空。输出test-results/ui-preview-priority-symmetric、ui-preview-priority-symmetric-habits及priority-symmetric-{ui,habits,build,native-wxss}.log；微信模拟器冷启动及真机尚未验证。

## 领域每日习惯改为纵向滚动（C278）

2026-10-12，仅小程序。领域详情移除habitPages四格分组，HabitGrid一次组合全部原习惯及末尾添加卡；宿主改为独立scrollY／enhanced／bounces=false，移除横向吸附、旧分页及行包装CSS。约两行视口，空／单习惯和添加卡约一行，账号／领域以独立habits键重置；目标及正负栏保持原位置。HabitCard原最小高度公式提为同名共享变量，卡片和视口同源，网格隐式等高行保持添加卡与真实卡高度一致。原ID／顺序、打卡／详情／当前领域创建及保存队列未改。规则见[C278](../Design.md#领域每日习惯改为纵向滚动c278)。

类型检查和现有--domain-recent-records、--domain-habit-creation通过360×844／375×667／430×844／768×1024。前者含详情实际滚动检查：有竖向滚动量、无横向溢出、滚轮上下访问习惯及末尾加号，边界不带动整页，目标／工具栏／两个记录栏位置不变，短屏及34px模拟安全区仍可阅读记录。后者覆盖0至5习惯、加号整卡／居中／等高、空／单一行、当前领域预选、创建失败同ID重试、原打卡和其他领域保留、重载持久化。原workflow中的横向断言同步为纵向，未重跑已知含历史八卡断言的无关全套--domains。最终375px滑动截图已目视，输出ui-preview-domain-habits-vertical-final和ui-preview-domain-habits-vertical-creation-final。

build:device -- --preview-records沿现有LAN与隔离预览更新dist，主包1,384,502字节、详情分包25,447字节；17页启动、92源码／19产物样式与包体预算通过。原生wcsc编译实际19份产物WXSS通过，输出覆盖全部、退出0且stderr为空。日志test-results/domain-habits-vertical-{build,native-wxss}.log、domain-habits-vertical-final-ui.log、domain-habits-vertical-creation-final.log；尚未微信模拟器冷启动及真机手势验证。

## 领域目标编辑按钮垂直居中（C277）

2026-10-12，仅小程序。目标卡原共用样式给domain-goal-edit增加align-self:center；领域详情该ActionButton移除width='content'，宽度继续由既有类拥有，避免共享控件生成的行内alignSelf:flex-start覆盖居中。保留40px尺寸、EditSymbol及原目标业务，无存储变更。规则见[C277](../Design.md#领域目标编辑按钮垂直居中c277)。

类型检查、git diff --check及现有--domain-recent-records四尺寸回归通过，包含短屏及34px模拟安全区、领域详情固定布局／双栏滚动、全文／图片和原编辑保存。最终375px截图目视确认长目标与短目标的铅笔均在各自目标行垂直中心；输出test-results/ui-preview-domain-goal-edit-center-final。本次低影响布局调整未新增专用测试。

build:device -- --preview-records沿现有LAN环境和隔离预览更新dist，主包1,384,655字节、领域详情分包25,605字节；17页启动、92源码／19产物样式及包体预算通过。原生wcsc编译实际19份产物样式通过，退出0且stderr为空。日志test-results/domain-goal-edit-center-final-{ui,build,native-wxss}.log；尚未微信模拟器冷启动或真机验证。

## 领域记录按实际行数展示（C276）

2026-10-12，仅小程序。领域最近记录和详情的共用domain-records.css把记录按钮min-height从40PX改为0，覆盖全局button最小高度，保留原上下2px内距；普通Text的pre-wrap及1.65行高自然撑开一行／多行。没有增加局部页面样式、改变记录内容或保存路径，旧图片及原独立滚动保持。规则见[C276](../Design.md#领域记录按实际行数展示c276)。

类型检查、git diff --check及现有--domain-recent-records通过360×844／375×667／430×844／768×1024，并覆盖375px模拟34px安全区。该套含领域详情独立滚动，补充一行、显式两行、无换行长文及图片记录的实际几何检查：记录高度只由正文／符号／图片与原内距决定，无空白第二行；全文、换行、原存档只读不变及正负独立滚动保持。原最新十条／稳定排序、编辑同ID／创建日期、删除补位／重载、账号隔离、固定顶部／领域卡滚动、跨八卡排序及同目标失败重试继续通过。截图输出test-results/ui-preview-domain-natural-height，375px最近记录截图已目视。

build:device -- --preview-records沿现有LAN环境及隔离预览模式更新dist，主包1,384,605字节；17页启动、92源码／19产物样式及原包体预算通过。额外用微信原生wcsc编译实际19份产物WXSS，输出全覆盖、退出0且stderr为空。日志test-results/domain-natural-height-{ui,build,native-wxss}.log；微信模拟器冷启动及手机运行尚未验证，既有调试接口不可连接不在本次修复范围。

## 待办移除自定义排序选项并保留拖动（C275）

2026-10-12，仅小程序。待办SortOptions移除custom选项，只显示日程时间最近／创建时间最近；页面排序草稿及失败模式目标限制为这两项。已有custom或缺省手动状态在窗口只读回退schedule草稿，hasChanges按同一草稿基准比较，打开／关闭不排序、不写入，也不因该回退触发未保存提示；明确排序确认仍沿原applyTodoSort及账号队列。原getTodoSortMode、orderTodos、useTodoDrag、moveTodo／retryTodoMove及存档结构未改，实际拖动换位继续保存custom。规则见[C275](../Design.md#待办移除自定义排序选项并保留拖动c275)。

类型、check-todos及现有--todo-sorting通过360×844、375×667、430×844、768×1024：窗口仅两项、40px选项及原定位／确认，手动顺序草稿回退、直接关闭无提示及数据不变，日程／创建排序与同时间稳定、旧存档读取／刷新保持。原拖动检查完整保留，覆盖自动模式下实际换位切custom、原位／取消／未持足不写、筛选隐藏槽位、已完成任务、跨象限优先度、任务原字段／ID及数量、同一绝对移动目标失败重试和账号变化／隔离。原模型三种存档兼容检查仍有效，没有删除custom的数据路径。输出为test-results/ui-preview-todo-no-custom。

build:device -- --preview-records沿现有LAN环境及隔离预览模式更新dist，主包1,384,608字节，17页启动、92源码／19产物样式与原包体预算通过，日志test-results/todo-no-custom-build.log。额外解析实际pages/todos/index.js及common.js的渲染参数，确认todo-sort-options只有schedule／created两项，custom按钮不在原生产物中。未改样式，微信模拟器冷启动与真机长按拖动尚未验证；既有调试接口不可连接不在本次修复范围。

## 首页快捷输入与类型切换不唤起键盘（C274）

2026-10-12，仅小程序。首页openCapture继续调用hideKeyboard并携带原输入／成功类型意图，按capture.length===0给EntryComposer传autoFocusOnOpen，不修改或清洗文字。共用创建增加会话focusRequested；初始由该参数申请、清空明确重新申请，类型按钮（含当前类型）及横滑开始取消请求并收键盘。原100ms就绪计时不再依赖mode重新聚焦，三类字段的autoFocus同时检查当前请求和就绪状态，旧延迟不越过已取消请求；手动输入、空白首页／其他明确创建入口首次聚焦及显式清空后聚焦保持。原字段组件、文字互通、草稿／ID／账号及保存流程不改，见[C274](../Design.md#首页快捷输入与类型切换不唤起键盘c274)。

类型及完整--entry-creation通过360×844、375×667、430×844、768×1024，包含现有清空／焦点、任务／备忘创建、进展、下一步及成功类型记忆套件。更新旧“非空首页／切换后自动聚焦”断言，等待原100ms聚焦窗口后检查无原生字段焦点，覆盖填字加号及键盘完成、三类类型点击、已选类型点击、横滑、手动点字段后可继续输入、空白创建及显式清空仍聚焦。原内容保留、草稿恢复／清空、图片／日程、校验及同ID保存重试、游客／两个账号、任务保存跳待办及成功类型记忆保持；无渲染错误或横向溢出。--home-creation-scroll同样四尺寸通过：模拟键盘避让不吸附翻页、反复备忘／进展保存或取消回原屏、第二屏创建保持原屏及双向手势。输出为test-results/ui-preview-capture-keyboard-final与ui-preview-capture-keyboard-scroll。

初次完整回归在旧进展草稿重开后点已选类型时发现仍有延迟初始聚焦；取消请求及收键盘移到同类型返回之前，避免该分支重新弹输入法。随后完整四尺寸重跑通过，未削弱未聚焦断言，也未更改数据保存目标。

build:device -- --preview-records沿现有LAN构建环境及隔离预览模式更新dist，主包1,384,577字节，17页启动、92源码／19产物样式及原包体守卫通过，日志test-results/capture-keyboard-build.log。样式未改。本轮浏览器只验证焦点及模拟键盘偏移；微信原生输入法、手机手势与实际接口连通尚未验证，既有调试接口不可连接不在本次修复范围。

## 快捷方式编辑确认保存与关闭提示（C273）

2026-10-12，仅小程序。HomeShortcutEditor移除名称／颜色／图标的即时persistEdit写入，字段与预览仅改草稿；单卡同选择／替换共用末行SheetActions的48px全宽「保存快捷方式」。单卡启用useEditorCloseGuard，×／遮罩／Escape对未保存修改提示不保存／保存，提示×继续编辑，未修改直接关闭且不写，图库仍先关闭最上层。保存失败保留绝对目标及输入、锁定其他字段，底部保存或提示保存重试；显式不保存可放弃未提交目标。删除原自动保存重试图标和专用状态／样式，错误仍在正文中。单卡移除父容器bottom安全区内距，ScrollView可用高度为固定保存栏预留空间，不改原设备设置或业务存档。规则见[C273](../Design.md#快捷方式编辑确认保存与关闭提示c273)。

类型、home-shortcuts逻辑与现有--home-shortcut-library通过360×844、375×667、430×844、768×1024。旧即时保存／无页脚断言按新规则更新，保留64图库分类／搜索／线稿、名称八字及空名、六色、层级关闭、旧值只读／明确保存升级、替换／排序、添加卡／空布局和滚动回归；新增实际底栏48px／全宽／单按钮／无上边线及8px下距、模拟34px安全区不重复添加、输入及选择不写、×继续编辑／不保存／保存、遮罩与Escape提示、失败回原表单及原绝对目标重试。原卡片和底部输入几何保持，无渲染错误或横向溢出。375px单卡保存栏及未保存提示截图已目视，输出为test-results/ui-preview-shortcut-explicit-save。全量--window-close未运行，本轮单卡关闭由上述真实快捷方式套件验证。

build:device -- --preview-records沿现有LAN构建环境及隔离预览模式更新dist，未改接口默认值或生产数据；主包1,384,337字节，17页启动、92源码／19产物样式、原生首页及原包体守卫通过。工具自带wcsc编译全部19份实际WXSS退出0、标准错误空。日志为test-results/shortcut-explicit-save-build.log、shortcut-explicit-save-native-wxss.log。微信模拟器冷启动、手机保存／关闭及键盘交互尚未验证，前两轮记录的调试接口不可连接不在本次修复范围。

## 首页格言控件精简与排版（C272）

2026-10-12，仅小程序。MottoBanner删除上一条／随机下一条及暂停／播放按钮、手动history／paused状态和旧控制栏、箭头／播放图形专用样式；自动随机定时轮播仍读取原mottos.rotationSeconds，触摸阅读、首页失活／隐藏及卸载清理保持。原管理按钮改用共享EditSymbol／ActionButton icon／compact，不改变/pages/mottos/index导航。正文／计数左侧，40px按钮右侧相对整卡居中；正文框44px（宽屏48px）内居中一／两行，保留两行省略和完整内容，原控制栏空位不再保留。布局规格见[C272](../Design.md#首页格言控件精简与排版c272)。

类型及motto-data检查通过。现有--mottos按新控件更新旧手动暂停／历史断言，完整通过360×844、375×667、430×844、768×1024：40px共享铅笔入口与导航、左文下计数／右按钮居中、默认十五秒与自定义秒数自动轮播、触摸阅读守卫、长格言两行／单句／空列表、列表原CRUD、间隔校验与关闭、存储失败重试和账号隔离保持。长／单／空场景只读保留原内容及间隔。--home-shortcut-library同样通过四尺寸原快捷卡编辑／替换／排序、末尾加号卡、独立滚动及底部输入固定，无渲染错误或横向溢出。375px和768px普通排版、375px长格言／空列表截图已目视，输出为test-results/ui-preview-motto-banner-final及ui-preview-motto-shortcut-layout。

build:device -- --preview-records沿现有构建环境的LAN接口与隔离预览模式更新dist，不改默认配置或业务存档；主包1,384,877字节，17页启动、92源码／19产物样式和包体守卫通过。实际原生JS核对新正文容器及「管理格言」入口，旧切换／暂停标签和控件节点均不存在；工具自带wcsc编译全部19份实际WXSS退出0、标准错误为空。日志为test-results/motto-banner-build.log、motto-banner-native-wxss.log。微信模拟器冷启动及真机轮播／点击尚未验证，前一轮已记录的局域网接口不可连接未在本次修复。

## 首页快捷方式添加卡（C271）

2026-10-12，仅小程序。HomeShortcutCreateCard沿共享快捷卡表面及圆角组合领域同源CardCreateButton／AddSymbol，只有居中加号及「添加快捷方式」无障碍名称；首页始终在原两列today-grid末尾挂载，快捷卡加添加卡超过六格时启用原独立滚动布局，空布局也保留入口。点击沿customize打开原HomeShortcutEditor选择窗口，不新增数据字段／保存流程；添加卡不进入cards、rank或移动操作，排序、排序失败、编辑及目录忙碌时禁用，管理模式仍可添加。删除原第二屏重复的空布局提示及专用样式。规则见[C271](../Design.md#首页快捷方式添加卡c271)。

类型及快捷方式数据逻辑检查通过；现有--home-shortcut-library补充真实加号卡的六格边界、默认六卡／十卡独立滚动、加号居中与至少40px触控、底部输入固定、空布局添加／关闭不保存／保存重开、选择保存失败重试和排序／管理禁用规则。完整套件及--home-navigation均通过360×844、375×667、430×844、768×1024，原名称／图标即时保存、替换、相邻排序及两屏往返保持，无渲染错误或横向溢出。375px顶部／滚到底加号卡／空布局截图已目视，输出位于miniprogram/test-results/ui-preview-shortcut-add及ui-preview-shortcut-add-navigation。

首次构建由原项目校验拒绝：源project.config.json的es6／enhance被打开。依T27／T28既有约定仅恢复这两项为false，其他配置保留，随后build:device -- --preview-records通过。构建沿现有环境传入LAN接口及隔离预览模式，不改默认接口或业务存档；主包1,388,086字节，17页启动、92源码／19产物样式、包体及原生首页守卫通过，并核对实际JS包含新卡和无障碍名称。微信工具自带wcsc编译全部19份实际WXSS退出0、标准错误空。构建及原生样式日志为test-results/shortcut-add-build.log、shortcut-add-native-wxss.log。

本次只读核对电脑LAN地址仍与现有构建接口一致，但/health无法连接；未启动或修改后端、未清业务Storage。构建及原生WXSS编译不等于微信运行：模拟器冷启动、手机接口health与真机上下滑动／点击尚未验证。

## 真机调试按钮无响应（T32，待诊断）

2026-10-11用户回复点击真机调试按钮完全无反应，明确问题处于开发者工具触发阶段。T31的接口拒绝连接虽已处理，不能当作按钮已修复。只读主日志及WeappRemote日志找到旧真机窗口启动、internal error 1、subscribeHandler injected failed及会话-50004，之后未见新窗口启动；没有足够证据归因本次无响应。未修改业务代码、工具安装目录、生产数据或清Storage。

官方cli.bat islogin初次被沙箱拒绝写工具用户目录Default/.cli；只读登录状态命令通过自动审批后实际返回服务端口已关闭。此非自动审批拒绝，阻塞来自工具自身配置。已请求用户开启“设置→安全设置→服务端口”，或选择手动恢复；未绕过用户授权、未强杀工具。日志device-button-islogin.log位于miniprogram/test-results。当前诊断访问、按钮触发及二维码／手机连接均尚未通过；步骤和验证边界见[调试说明](device-debugging.md#真机调试按钮无响应t32待诊断)。

## 真机调试接口回环地址排查（T31）

2026-10-11，用户无法真机调试。所贴Windows模拟器日志的账号profile、番茄提醒config及mottos均请求127.0.0.1:5229并拒绝连接；本机检查该端口未监听。默认HTTPS域名未解析到IP，故未仅替换为未验证的正式地址。电脑活动以太网IP为192.168.31.235，启动原后端已编译程序监听0.0.0.0:5229，Data:Directory显式使用miniprogram/test-results/device-api-data独立调试目录，不改后端源码或日常数据；health及上述三接口通过局域网地址均200。

device-build增加构建前接口地址守卫，URL解析后拒绝localhost／127.*／IPv6回环（含简写或整数形式），保留显式LAN／HTTPS接口；原缺省接口配置不改变。新增--preview-records以保留本次隔离预览数据模式，正常构建缺省仍正常存档，已有显式预览环境变量兼容。构建输出地址及模式，保留Taro转换、函数名／映射归档、启动、WXSS与包体守卫。check-device-build-config覆盖上述失败、合法地址、原环境不被修改及两种数据模式。

已完成本地准备：build:device -- --preview-records实际使用局域网接口，17页启动、92源码／19产物样式及包体守卫通过，主包1,388,094字节、dist无map文件。实际common.js包含所选LAN地址且不含原127.0.0.1:5229；集成检查用回环地址再次运行device-build，确认构建前退出1、原dist完整保留。重建包的19份WXSS再次通过微信原生wcsc（全部文件出现在输出、退出0、标准错误空）。日志device-lan-build.log及实际检查脚本check-device-lan-package.cjs位于miniprogram/test-results，服务仍运行供手机检查，未修改防火墙或尝试上线部署。此为本地／包内验证，手机同网与扫码结果仍待验证。

工具日志另有appLaunch／navigateTo timeout，目标含pages/preview-data/index；尚未获得手机错误或二维码生成错误，不能把这些超时认定为接口导致。只读wechatide project_list尝试需要codex授权，工具返回wait WechatIDE authorization timeout，未成功读取实时模拟器或执行真机连接，不把构建检查当作手机验证。恢复及手机health检查步骤见[真机调试](device-debugging.md#本地接口与手机连接t31)。

## WXSS 通配符编译失败（T30）

2026-10-11，用户控制台报 `common.wxss(1:29728): error at token *`。用本机微信开发者工具自带的 `wcc-exec/wcsc.exe` 对原产物编译，复现同一文件、偏移和错误。准确来源是C269的 `editor-fields-layout.css` 中 `.editor-fields-layout > *`，不是C270删除卡片文字或业务存档的问题；PostCSS、Taro构建和浏览器接受此选择器，原分号检查未覆盖微信对通配符的限制。

共享布局改用明确的view／text／button／input／textarea／scroll-view直接子节点选择器，保留flex-shrink:0、min-width:0及原8px字段间距，不手改dist。`check-weapp-styles.cjs`通过已锁定的postcss-selector-parser识别真正的通配选择器，源码和产物构建入口同时拒绝；不误报属性值／属性运算符、注释、字符串或calc中的星号。原空语句守卫保持，回归脚本补充本次错误及嵌套media、多选择器和合法星号场景。

已修复。守卫回归通过；build:preview通过92份源码／19份产物样式、17页启动及原主包预算，主包1,346,852字节。重建后用本机wcsc v0.4me_20200724_db编译全部19份实际WXSS及导入，退出码0、标准错误为空，并核对19个文件均出现在原生输出。日志wxss-native-before.log、wxss-native-final.log、wxss-native-report.json及wxss-universal-build.log位于miniprogram/test-results，当前dist已含修复；未只改生成文件或清业务Storage。原生WXSS编译通过只覆盖样式语法，不代表模拟器冷启动、真机交互或业务数据验证。

完整--entry-creation浏览器回归通过360／375×667／430／768px，覆盖三种创建、草稿恢复、静态快照、记录原子保存、下一步、校验／失败重试及账号隔离；375px进展截图已目视，原字段间距和文字框保持，无横向溢出或渲染错误。日志wxss-universal-entry-ui.log及ui-preview-wxss-universal截图位于miniprogram/test-results。本次不改业务逻辑，不重复无关全量回归。

## 习惯卡移除时段与最近打卡行（C270）

2026-10-11，仅小程序。HabitCard移除时段和最近打卡整行、metadata／recency Props及habitTimePeriod展示依赖，habit-card.css清理专用样式与完成／大屏覆盖；习惯页删除recency文案拼接。主网格／提醒／状态预览及领域详情自然同源，只保留名称及HabitProgress文字结构，原打卡／详情按钮、40px触控、卡片内距和最小高度保持；时段、推荐、归档与排序的数据层不改。见[C270](../Design.md#习惯卡移除时段与最近打卡行c270)。

原浏览器回归不再以被删除的卡片时段文字定位，改为验证所属分区／原名称及原存档时段；仍检查两个宿主编辑、失败重试、归档禁用、打卡与历史。排序测试按存档enabled判断启用项，不依赖已删除的归档附属文字。

实现完成。类型检查、完整--daily四尺寸浏览器回归通过360／375×667／430／768px，覆盖主网格／提醒／状态预览、领域习惯与两个编辑宿主、时段分区／筛选／编辑保存、原统计／打卡／留言、归档禁用及拖动／重试／账号隔离；375px卡片及768px独立列表截图已目视，名称／统计与40px操作保持。build:preview通过92源／19产物样式、17页启动及主包预算，主包1,346,690字节。日志habit-card-simplify-{typecheck,ui,build}.log及ui-preview-habit-card-simplify截图位于miniprogram/test-results，当前dist包含C270；微信开发者工具／真机未实测。

## 创建与同类编辑字段间距统一（C269）

2026-10-11，仅小程序。新增EditorFieldsLayout用于实际重复的纵向内容布局，app.css拥有--editor-field-gap:8px及--editor-section-inset:12px；共享布局提供字段gap和可选首行上距，嵌套组topSpace=false。任务／备忘／进展、习惯创建编辑、便签阅读、记录与领域定义／目标、快捷方式单卡、格言／餐食／专注节奏及打卡留言组合此布局，清除旧margin叠加；普通／紧凑MarkdownNoteEditor正文、工具栏及图片同源8px，原高度、文字内距、格式和图片逻辑保持。

EntryPreview同步复用布局、记录组与置顶分段，保留静态快照不创建输入／草稿；标题到正文8px与真实表单一致。HabitEditor两个宿主相同，标题下划线到HabitNoteField从无外距改为共享8px。MemoFieldsLayout的置顶／颜色／标签仍各自独立行，分段线下12px由共享变量拥有；任务下一步、习惯设置及归档分段同源。创建类型modeLabel和dialog的无障碍名称改为「备忘」，原memo标识、保存与队列代码保持。见[C269](../Design.md#创建与同类编辑字段间距统一c269)。

实现完成。类型检查及--entry-creation／--record-edit／--daily／--memos／--meals／--mottos／--home-shortcut-library／--home-directory／--pomodoro九套四尺寸浏览器回归通过，覆盖360／375×667／430／768px：三类型切换与静态快照、完整默认字段、两宿主习惯编辑、图片／阅读、记录及直接领域创建、即时保存、账号隔离和同ID失败重试。375px任务／备忘／进展、习惯创建及768px备忘截图已目视；关闭与固定底栏可用。

创建流程旧测试依据已有C240删除／保存结构定位主按钮；类型选择定位同步「备忘」，C246任务成功后先确认进入待办再返回首页检查新输入，专注记录删除确认的遮罩定位同步C230的AppDialog。原旧别名兼容与用户内容测试保持，业务代码不因旧测试改变。

旧--domains综合脚本仍在C211未分类投影的旧八卡断言停止，未把该套报告为通过；本次领域定义／目标另用一次性真实页面检查四尺寸，首行上距及目标框到计数均8px，字段margin为0，名称行填满可用宽度，375px截图已目视。检查仅替换旧综合脚本的执行入口，不等于全套领域回归；目录领域创建、两宿主习惯及记录编辑沿上述完整回归通过。

build:preview通过92源／19产物样式、17页启动及主包预算，主包1,347,726字节。日志editor-spacing-{typecheck,entry-ui,record-ui,daily-ui,memos-ui,meals-ui,mottos-ui,shortcut-ui,directory-ui,pomodoro-ui,inspection,build}.log及ui-preview-editor-spacing-*截图／测量位于miniprogram/test-results；当前dist包含C269，重新编译可查看，微信开发者工具／真机未实测。

## 全部功能分组与最近操作位置（C268）

2026-10-11，仅小程序。homeFeatureGroups从原功能界面过滤文章分类／收藏／个人空间，第三组「阅读与空间」继续按原目录相对顺序生成；快捷操作5／功能界面8／阅读与空间3，总16项，HomeFeatureList及HomeShortcutEditor同源。原泛化HomeFeatureOrder直接按三组读取和排序，旧键及版本1保持，不增加存储或迁移写入；旧顺序在各新组内保留、移动与失败重试仍写原绝对目标。见[C268](../Design.md#全部功能分组与最近操作位置c268)。

首页只移动原today-recent节点，放在MoreSection标题之后、排序错误／HomeFeatureList之前；margin改为0 0 16px，其名称／最近键／点击及编辑禁用保持，没有有效最近项时不补内容。第三组增加标题高度，375×667px从原PageScroll滑动查看后续卡片，不缩小文字／40px控件；既有导航回归由全部按钮必须首屏可见改为检查首组及后续逐组可达，原完整名称／两列／箭头不重叠检查保持。

实现完成。类型、快捷方式逻辑及目录顺序兼容通过，补齐旧两组重分后相对顺序、读取不改原值、三组边界、第三组排序不改其他组及保存后重开。--home-navigation／--home-directory通过360／375×667／430／768px原导航、三组排序／失败重试、选择／替换同源及习惯／领域创建取消和保存、旧食选兼容；375px标题下最近入口／滚动到底第三组及768px全目录截图已目视。

完整--home-shortcut-library四尺寸通过三组选择／替换、重复项选中且禁用、长列表到第三组及保存／取消、图库搜索／分类、即时编辑、同目标失败重试及安全区；375px选择窗末尾已目视。完整--snap四尺寸通过首页两屏切换、短屏续接滚动、取消／横向手势及其他原页面，分组和最近位置没有新增第三个吸附目标。两项日志home-directory-groups-{selector-ui,snap-ui}.log与对应截图保留。

build:preview通过91源／19产物样式、17页启动及主包预算，主包1,347,537字节。日志home-directory-groups-{typecheck,navigation-ui,order-ui,build}.log与对应ui-preview-home-directory-groups-*截图位于miniprogram/test-results；当前dist包含C268，重新编译可查看，微信开发者工具／真机未实测。

## 功能界面导航箭头稳定显示（C267）

2026-10-11，仅小程序。HomeFeatureList原来直接显示Text的↗字符，存在手机字体／emoji回退为图标的可能；改为无文字View，组件CSS用currentColor的斜线及两条箭头边绘制，12×20px、灰蓝色及原位置保持。pointer-events:none／aria-hidden保留整行点击，navigation页面项／快捷操作／selection序号的原条件保持，不引入图片或图库身份，见[C267](../Design.md#功能界面导航箭头稳定显示c267)。

实现完成。首轮首页几何回归发现page-sections旧.today-all-tool直接子view的flex:1将箭头拉宽，360px下名称裁切且斜线与箭头头部分离；已删除过时规则，让组件拥有名称伸缩与箭头固定宽度。既有检查改用箭头类定位，继续检查完整名称及箭头不重叠，没有新增样式专用测试。

类型检查、最终--home-navigation及--home-directory通过360／375×667／430／768px：16项目录名称完整、两列等宽、40px触控、页面箭头不重叠，原导航、排序／失败同目标重试、选择／替换序号及习惯／领域创建守卫保持。360／768px目录截图已目视，箭头连续完整、无背景图标且位置一致；首轮失败日志home-arrow-navigation-ui.log保留，最终日志home-arrow-{typecheck,navigation-verified-ui,directory-verified-ui,verified-build}.log及对应ui-preview-home-arrow-*截图位于miniprogram/test-results。

最终build:preview通过91源／19产物样式、17页独立启动及主包预算，主包1,347,386字节；原生产物保留箭头View及两段绘制样式。当前dist包含C267，重新编译可查看；差异格式检查通过。微信开发者工具／真机未实测，浏览器回归不作为真机字体复现；本次结构已去除该箭头的文字字体／emoji渲染路径。

## 移除今日食选（C266）

2026-10-11，仅小程序。删除pages/eat三个源文件及food-data／food-catalog／food-flow，app.config不再注册食选分包，homeFeatureCatalog省去eat，导航及选择／替换共用16项。饮食页移除食选链接和回退导航，TodaySummary／recentActivity不再读取dining或产生食选跳转；共用page-sections清理仅食选使用的样式，选境及饮食组件保持。

home-shortcuts保留仅用于旧默认识别的食选元数据，在原默认升级判断之后排除eat，其他有效卡片及历史19序号上限保持，已移除卡不占剩余卡的有效rank。浏览不改设备设置、目录顺序或dining归档，显式保存沿原流程。无生产数据清理、版本迁移或网页／后端修改，见[C266](../Design.md#移除今日食选c266)。

实现完成。类型、快捷卡／目录顺序／选境餐单／最近活动／统计逻辑与64共用图标检查通过；食选专用编辑回归移除，原选境和营养校验保留在check-choice-meals。--home-directory／--home-navigation／--meals／--screens通过360／375×667／430／768px，覆盖16项目录、排序失败原目标重试、习惯／领域创建取消及保存、旧食选自定义卡排除、其他卡外观及rank19保留、读取不写、选择替换无食选、仅食选布局为空、显式保存及原dining归档保留；饮食页不再提供食选链接，原餐食表单／营养和共用页面保持。375px目录和768px饮食页截图已目视。

初次首页导航回归仍按旧八张总卡断言，已改为八张普通卡与一张未分类；新增兼容回归最初误用当前不存在的非空布局添加入口，改为原替换窗口及空布局添加入口。两份初次失败日志保留，修正后完整四尺寸回归通过。日志remove-food-{typecheck,build,directory-verified-ui,navigation-verified-ui,meals-ui,screens-ui}.log与对应ui-preview-remove-food-*截图位于miniprogram/test-results。

build:preview通过91源／19产物样式、17页（五主包／十二分包，含隔离预览）独立启动及主包预算，主包1,347,038字节；app.json及产物不含食选页面。当前dist为包含C266的隔离预览，重新编译可查看；差异格式检查通过，微信开发者工具／真机未实测。

## 领域页固定与卡片独立滚动（C265）

2026-10-11，仅小程序。PageScroll新增可选scrollY（缺省true），false透传原生ScrollView并停用手势／吸附处理，保留上下文及AppDialogHost。领域页设为false，页面／domains-index按可用视口固定并隐藏外层溢出；下半domain-entry-scroll包含原domain-first-grid与domain-continuation-grid，使用原四行卡高，短屏允许只缩小ScrollView，卡片本身保持。续接6px、末尾4px留白，安全区仅固定页框保留。独立cards:owner键在账号变化时重置滚动，与最近记录的owner键区分；C252正／负栏及业务队列不改，见[C265](../Design.md#领域页固定与卡片独立滚动c265)。

类型检查及page-snap纯逻辑通过。--domain-recent-records／--domain-management／--domain-entertainment-preview均通过360／375×667／430／768px：外层无纵向滚动范围，初始仍完整八张两列四行；卡片区滚轮／边界不移动工具栏、最近记录或两个记录栏，未分类／创建／娱乐续接均可达。跨八卡换位、排序前后几何、失败同目标重试、记录双栏／详情历史、编辑／删除／导航、只浏览不写、账号／空值／容量／隔离预览守卫同批保持；375px另验34px安全区。首轮排序回归发现新卡片视口与最近记录重复使用owner键，已改为独立cards:owner，随后完整回归通过，首轮及验证日志均保留。

--screens四尺寸通过17页布局、无渲染错误／横向溢出；375px卡片滚动到底与34px安全区、768px娱乐卡续接截图已目视。build:preview通过92源／20产物样式、18页启动及主包预算，主包1,375,402字节。日志domain-cards-scroll-{typecheck,verified-ui,management-verified,entertainment,screens,page-snap,build}.log及对应ui-preview-domain-cards-scroll-*截图位于miniprogram/test-results，当前dist包含C265；差异格式检查通过。微信开发者工具／真机未实测。

完整--snap四尺寸也通过：其他页面继续沿原首页两屏、待办／习惯／便签／专注单屏、长页自由滚动及取消／横向手势规则；PageScroll缺省scrollY=true的行为保持。日志domain-cards-scroll-page-snap-ui.log及截图ui-preview-domain-cards-scroll-page-snap保留。

## 筛选输入文字内距统一（C264）

2026-10-11，仅小程序。single-line-input.css的SingleLineField水平内距由6px改为12px，任务／习惯／便签FilterSearch及其他SingleLineInput同源；对齐现有TagTextInput及普通备注框的12px内距。没有新增筛选／页面覆盖，原生Input仍按组件保护样式保持padding:0，提示词与输入文字共用同一文字行。原外框高度、数字固定尺寸／居中、trailing清空符号、聚焦和筛选业务不改，见[C264](../Design.md#筛选输入文字内距统一c264)。

类型检查及既有完整--toolbars／按钮上下文四尺寸回归通过360／375×667／430／768px，覆盖原筛选输入／重置、分类与控件布局、数字框触控及24px原生文字行。另用一次性预览检查读取三页、四尺寸共12组空值／输入后几何：左右padding均12px，含1px边框的文字起点偏移均13px，原生Input为0px内距，外框44px／文字行24px；输入后清空符号40px、不与文字重叠，清空均恢复空值。375px三页空值及便签输入后截图已目视。没有新增样式专用回归，检查脚本和截图仅保留为test-results验收产物。

build:preview通过92源／20产物样式、18页启动及主包预算，主包1,375,019字节。日志filter-input-inset-{typecheck,ui,inspect,build}.log和截图ui-preview-filter-input-inset／ui-preview-filter-input-inset-inspect位于miniprogram/test-results，当前dist包含C264；差异格式检查通过。微信开发者工具／真机未实测。

## 习惯移除自定义排序选项（C263）

2026-10-11，仅小程序。习惯页移除daily-sort-custom节点及专用样式，SortOptions只组合原五项自动排序，SortDirection固定展示。sortInitialChoice将缺省／custom投影为优先度降序，窗口初始化与hasChanges共用同一基线，避免打开旧手动顺序就提示保存；真实state.sort、orderedHabits及saveHabitOrder不改。入口高亮只引用已应用的非默认自动排序，手动顺序展开也保持普通态。原队列、绝对目标重试及账号守卫保持，见[C263](../Design.md#习惯移除自定义排序选项c263)。

类型检查和check-habit-order逻辑通过，保留旧custom持久顺序、可见ID换位及历史数据兼容。--habit-sorting通过360／375×667／430／768px：窗口只含五项自动排序与升降序；旧手动顺序打开后经×／遮罩／Escape关闭均不写、不提示保存，未确认修改不覆盖原方式，显式确认可应用默认自动排序。五项原排序、默认入口选中态、长按／取消／重载、失败同目标重试及账号隔离同批通过；拖动后的窗口打开／关闭也保留顺序，375px与768px截图已目视。

build:preview通过92源／20产物样式、18页启动及主包预算，主包1,375,018字节。日志habit-remove-custom-{typecheck,logic,ui,build}.log、截图ui-preview-habit-remove-custom位于miniprogram/test-results，当前dist包含C263；差异格式检查通过。微信开发者工具／真机未实测。

## 习惯时段按当前时间默认（C262）

2026-10-11，仅小程序。habit-metadata的currentHabitTimePeriod按设备本地小时划分11／13／18边界；习惯页activePeriod初始化、useDidShow及账号重置共用它。手动选择仍为会话状态，原分钟setNow只刷新时钟和统计，不抢回分类；原习惯时段推断、自由区、筛选／排序／拖动及存档保持。见[C262](../Design.md#习惯时段按当前时间默认c262)。

类型检查及check-habit-edit逻辑通过，验证本地午夜、10:59:59／11:00、12:59:59／13:00、17:59:59／18:00与23:59:59边界。完整--habit-time-periods通过360／375×667／430／768px：模拟八个时刻进入页面，默认分类及显示列表均符合时间，自由区仍独立；切时段及返回不写习惯／历史，分钟刷新保持手动选择，重新进入恢复当时时段，账号变化默认中午后可手动查看账号上午习惯。原筛选／排序／拖动／失败重试／编辑／自动时段推断及独立滚动布局同批通过。既有12点默认上午断言按C262调整，原布局及冷启动样本检查明确手动选上午后继续，不削弱原卡片／历史断言。375px中午／下午和768px晚上默认截图已目视。

完整--daily四尺寸回归复跑通过，覆盖原列表、分类、筛选、排序／拖动、归档、编辑、打卡留言、删除／补记重试和统计日历。首轮在check-daily-workflow边缘拖动的存档索引断言出现一次失败（预期old1，实际new）；保留原拖动实现及断言，未改源码后完整复跑通过，首轮日志habit-current-period-daily-first-ui.log及复跑habit-current-period-daily-verified-ui.log均保留，截图ui-preview-habit-current-period-daily-verified。

build:preview通过92源／20产物样式、18页启动及主包预算，主包1,375,401字节。日志habit-current-period-{typecheck,logic,ui,build}.log和截图ui-preview-habit-current-period位于miniprogram/test-results，当前dist为包含C262的隔离预览，重新编译可查看；差异格式检查通过。微信开发者工具／真机未实测。

## 习惯详情领域图标与优先度修改（C261）

2026-10-11，仅小程序。习惯页及领域详情共用HabitDetailHeader的领域、图标及优先度选择，复用现有控件；useHabitDetailEdit沿宿主原reminders队列保存并保持详情，patchHabitDetails合并最新记录的所选字段，保留其他字段及历史。未分类使用真实领域来源或空ID，不执行完整编辑的文本裁切、时段推断或其他习惯对齐。失败保留绝对目标及重试，两个宿主同源锁定关闭／日历／打卡／编辑；账号及详情目标变化清理旧状态。见[C261](../Design.md#习惯详情领域图标与优先度修改c261)。

实现完成。共享首行只持有图标库／优先度展开状态，图标库Escape只关闭当前选择；领域及优先度仍沿ChoicePopover最上层关闭。即时选择沿原图标fallback／backgroundKind规则、原领域ID／名称及优先度色表，不改backgroundImage；未分类选项来自真实domains，没有系统投影ID写入。patchHabitDetails不调用cleanState／prepareHabitEdit，完整名称／备注、其他孤立习惯、缺省时段及存档顺序不因即时选择被规范化。输入校验或已删除领域拒绝提交并允许重选，已进入volatile的保存失败保留原绝对目标直到重试成功；两个宿主的底栏、关闭、日历和编辑守卫同步。

类型及check-habit-edit逻辑通过，补齐完整长文本／背景图／归档／历史保留、其他孤立习惯不对齐、不补写时段、同选项无写入、未分类和已删除目标校验。--habit-detail-edit通过360／375×667／430／768px、两个详情宿主：三个选择取消不写、即时保存且详情保持、三类存储失败连续重试、原ID／全备注／历史／其他习惯保持、未分类空ID、领域存档不写、重新打开保留及账号切换清除选择。共享详情布局同时验证8px间距、领域满宽、图标40px、优先度原色／轮廓、完整42格／40px日历、短屏滚动与固定底栏；原两个宿主的日历补记／撤销、失败重试、历史保留及账号回归同批通过。375px两端及768px领域宿主正常／重试截图已目视。

完整--daily四尺寸回归也通过，覆盖习惯列表／分类／筛选／排序／拖动、归档、打卡留言、完整编辑、删除重试、补记及统计日历，日志habit-detail-inline-daily-ui.log、截图ui-preview-habit-detail-inline-daily；新增即时选择没有破坏这些原入口。

build:preview通过92源／20产物样式、18页启动和主包预算，主包1,375,160字节、领域详情分包24,672字节。日志habit-detail-inline-{typecheck,logic,ui,build}.log及截图ui-preview-habit-detail-inline位于miniprogram/test-results，当前dist为包含C261的隔离预览，重新编译可查看；差异格式检查通过。微信开发者工具／真机未实测。

## 便签内容图标与优先度修改（C260）

2026-10-11，仅小程序。MemoReader删除颜色名称设置插槽，MemoFieldsLayout未传settings时不留空容器；首行图标及优先度改为组合已有IconLibrarySheet／PrioritySelect。便签页负责同账号／原ID的即时更新，按队列最新记录合并字段及固定更新时间，保留正文、图片、颜色、标签及置顶。保存失败保留绝对目标及重试，账号变化清除目标，关闭选择不写入。见[C260](../Design.md#便签内容图标与优先度修改c260)。

实现完成。图标库在阅读窗口上方以260层展示，原其他宿主层级不变；ChoicePopover的Escape监听通过ref读取最新关闭回调，保持原最上层判断，解决图标选择打开后仍调用旧阅读关闭回调的问题。即时保存固定所选字段与更新时间，重试合并最新记录，原notes存档顺序不变。

类型检查、完整--memos及--app-prompts四尺寸浏览器回归通过360／375×667／430／768px。便签阅读回归补齐图标／优先度取消不写、原ID即时保存／字段保留、失败后修改及关闭锁定、连续失败后同目标重试、移除图标、重开保留及账号切换清除旧目标；原Markdown／图片／六色底色／置顶／完整编辑／筛选／删除回归保持。旧薄荷颜色名称断言按C260改为无颜色信息行；375px正常／重试及768px阅读截图已目视。提示回归覆盖未保存任务／便签、失败重试、账号隔离、两个习惯删除宿主及专注记录删除，确认共享Escape更新未破坏原关闭守卫。

build:preview通过92源／20产物样式、18页启动及主包预算，主包1,369,578字节、便签分包33,188字节。日志memo-reader-inline-{typecheck,build,ui}.log、memo-reader-inline-prompts-ui.log及截图ui-preview-memo-reader-inline／ui-preview-memo-reader-inline-prompts位于miniprogram/test-results。当前dist为包含C260的隔离预览，重新编译可查看；差异格式检查通过。微信开发者工具／真机未实测。

## 筛选副标题左侧留白对齐（C259）

2026-10-11，仅小程序。原EditorHeading横向32rpx而FilterFields／ChoicePopover正文为12px，造成筛选主标题与字段副标题左边界不同。editor-heading.css将原32rpx提取为--editor-heading-horizontal-space，标题读取同源变量；filter-popover.css只对筛选作用域下的副标题行补齐与12px之差，普通上下布局的输入／选项／底栏不移动。文章原ChoicePopover增加filter-popover作用域，两项inRow副标题同源，选择框仍按原fill占剩余宽度；没有新增主标题或改上下间距。专注节奏等非筛选FilterFieldHeading不受此左距影响，原字体／颜色／条件／账号与存档保持。见[C259](../Design.md#筛选副标题左侧留白对齐c259)。

类型检查及既有完整--toolbars／按钮上下文四尺寸回归通过360／375×667／430／768px。预览同时只读测量四页筛选：任务／习惯／便签所有副标题与主标题左边界差均为0px，原输入及选项仍在12px字段区起点；文章两项副标题左起点一致、沿共享留白，原左右选择与文章标签操作通过。375px四页及768px宽屏截图已目视。日志filter-title-inset-typecheck.log、filter-title-inset-verified-ui.log和截图ui-preview-filter-title-inset-verified位于miniprogram/test-results；未新增样式专用回归。既有分类长名检查补80ms等待原30ms异步自动定位完成再模拟横滑，解决C258后的测试时序冲突，原完整可见及选择／筛选断言保留。

build:preview通过92源／20产物样式、18页启动及主包预算，主包1,369,622字节，日志filter-title-inset-build.log。当前dist为包含C259的隔离预览，重新编译可查看；差异格式检查通过。微信开发者工具／真机未实测。

## 便签分类自动定位（C258）

2026-10-11，仅小程序。原因是便签已复用CategoryRow布局，但没有分类按钮ID／scrollIntoView／selectionOffset／contentKey，因而共享定位effect未启用。便签页补齐固定全部与标签按钮ID，传1.5及账号／真实标签列表上下文，从原tagFilters推导最后一个仍存在的已选标签；不新增定位状态、测量／滚动代码或存储。原多选与或筛选、页内单分类切换、全部清标签范围、排序／ID／账号守卫保持，CategoryRow和习惯页代码未改。见[C258](../Design.md#便签分类自动定位c258)。

类型及--memo-category-position通过360／375×667／430／768px浏览器适配回归，验证一格半前置、固定全部／回起点、手动横滑后再次定位、完整长名、末项限界、多选高亮及最后选择可见、浏览不写和账号切换。375／768px选中位置截图已目视；日志memo-category-position-{typecheck,ui}.log及ui-preview-memo-category-position截图位于miniprogram/test-results。

完整--memos四尺寸回归也通过，覆盖原阅读／Markdown／图片／置顶、筛选多选与或逻辑／重置、创建编辑、删除失败重试和账号隔离，日志memo-category-regression-ui.log及ui-preview-memo-category-regression截图；分类自动定位未改变这些业务行为。

build:preview通过92源／20产物样式、18页启动和主包预算，主包1,369,418字节、便签分包29,907字节，日志memo-category-position-build.log。当前dist为包含C258的隔离预览，重新编译可查看；差异格式检查通过。微信开发者工具／真机未实测。

## 提示窗口统一规范（C257）

2026-10-11，仅小程序。AppDialog新增统一error区域、独立无障碍名称及原生ScrollView正文；按实际遮罩、标题、正文和底栏测量正文高度，视口变化重新测量，短内容自然撑高、长内容只滚动正文，关闭与48px操作固定。EditorHeading新增prompt变体，固定18px／600／1.4；默认editor外观不变。app-dialog.css统一最大360px／视口12px／圆角12px、主题及8px操作间距，短反馈共用主题。任务错误展示迁入共享error，习惯两宿主、便签、领域及计时记录删除确认移除各自布局／样式并接入AppDialog。普通请求新增显式intent，格言／饮食记录／餐厅移除传danger，选境不再传任意confirmColor；原保存、删除、pending／账号及同目标重试保持。完整规范见[提示窗口规范](prompt-windows.md)和[C257](../Design.md#提示窗口统一规范c257)。

类型检查、--app-prompts、完整--memos及--domain-management均通过360／375×667／430／768px浏览器适配回归。提示套件检查统一字体／表面／关闭触控／48px操作与8px底距，100行正文原生ScrollView限高、全文保留与滚动时标题／操作固定，明确danger、排队确认、短反馈替换／到期／不接收触摸、页面隐藏取消、延迟保存busy防关闭；复用原任务／便签未保存与任务删除同ID失败重试、账号变化，以及两个习惯删除宿主和统计计时记录删除／重试／账号隔离。--app-prompts只运行关闭回归的任务／便签及普通提示部分，完整--window-close的后续快捷方式用例本轮未运行。便签回归保留正文／图片／置顶／删除与账号守卫，领域管理覆盖两宿主删除失败重试及持久化成功后导航，增加共享提示几何断言。新入口npm run test:app-prompts。375px普通提示、长正文、未保存与删除失败截图已目视；日志prompt-windows-{typecheck,ui}.log、prompt-{memos,domains}-ui.log及对应ui-preview-prompt-*截图位于miniprogram/test-results。

build:preview通过92源／20产物样式、18页启动与原主包预算，主包1,369,418字节，日志prompt-windows-build.log。当前dist为包含C257的隔离预览构建，重新编译可查看；差异格式检查通过。未调用系统modal／toast／actionSheet；微信开发者工具／真机未实测。

## 便签阅读底色与置顶外观（C256）

2026-10-11，仅小程序。memoColors六种surface换为低饱和深色，原key／label／value保持；memoColorStyle仍读取同源表并派生原45%边框，列表、创建编辑／阅读正文及EntryPreview同步，未新增配色数据或写入。列表标题／摘要／日期与标签提高对比度，移除is-pinned外观类和左侧inset box-shadow，原置顶按钮／文字／排序及所有布局、Markdown／图片、C255分隔线、账号和保存保持。见[C256](../Design.md#便签阅读底色与置顶外观c256)。

类型及完整--memos通过360／375×667／430／768px浏览器适配回归。沿原readability检查增加列表文字最低7:1目标，实测六色标题最低11.69:1、正文摘要9.48:1、日期／标签7.25:1；原六色创建输入、阅读Markdown和文本对比检查仍通过。原置顶流程增加前后卡片背景、左边框／内距、阴影和左侧图标一致断言，置顶／取消置顶均通过；保留同ID存储、草稿／图片编辑保存、读取不写、筛选／排序、删除失败重试及账号隔离。375px六色列表及阅读截图已目视，日志memo-reading-colors-{typecheck,ui}.log和截图ui-preview-memo-reading-colors位于miniprogram/test-results。既有创建检查的蓝色选中底色期望同步新surface，未运行旧完整entry-creation套件。

build:preview通过92源／20产物样式、18页启动、原图形分包及主包预算，主包1,369,360字节，日志memo-reading-colors-build.log。当前dist为包含C256的隔离预览构建，重新编译可查看；差异格式检查通过。微信开发者工具／真机未实测。

## 便签置顶行上方分隔线（C255）

2026-10-11，仅小程序。memo-editor-fields.css的memo-pin-row增加1px／#3b4b56上边线、12px线下内距，沿现有设置／标签区分隔样式；MemoFieldsLayout及EntryPreview继续复用MemoPinRow，编辑、便签内容阅读和共用创建同步。原8／12px外距、40px右对齐置顶、下方颜色／标签边界、Markdown／图片与保存／账号逻辑保持，无新业务节点或存储变更。见[C255](../Design.md#便签置顶行上方分隔线c255)。

类型检查与完整--memos通过360／375×667／430／768px浏览器适配回归，包含六色阅读、正文／图片内部滚动、阅读不写存档、置顶／取消置顶及失败重试、编辑／创建／标签／图片保存、删除确认和账号隔离。375px便签内容与带图片编辑、360px创建截图已目视，分隔线位于正文／图片之后及置顶上方；沿用原回归，未新增低影响样式专用测试。日志memo-pin-divider-{typecheck,ui}.log及截图ui-preview-memo-pin-divider位于miniprogram/test-results。

build:preview通过92源／20产物样式、18页启动、原图形分包和包体预算，主包1,369,360字节，日志memo-pin-divider-build.log。当前dist为包含C255的隔离预览构建，重新编译可查看；差异格式检查通过。微信开发者工具／真机未实测。

## 创建任务与习惯详情间距统一（C254）

2026-10-11，仅小程序。app.css声明--editor-field-gap:8px，ProgressEditorFields以同源变量保留现有上下／双记录间距；TodoEditorFields仅在创建宿主中把日期行2／4px改为上下8px，EntryPreview首行同步。HabitCalendar共享详情布局将正文上距、领域到实体、实体到备注、备注下距及统计／日历／日志分区改为8px，正文末尾及底栏上距同源，移除短屏对应间距覆盖。原标题栏、完整备注、六行40px日期、内部滚动、视口／安全区及保存不改，两个详情宿主同步，统计只读日历布局保持。见[C254](../Design.md#创建任务与习惯详情间距统一c254)。

类型检查、--sheet-footers及--habit-comment-logs通过360／375×667／430／768px浏览器适配回归；footer组另含430×720和模拟34px安全区。原几何检查按新决定更新，实测创建任务日期按钮上下各8px且与进展首行完全一致；两宿主正文／领域／实体／备注与分区均为8px，长标题／240字备注、完整42日期、月日志分页、固定编辑／完成、账号存档及取消不写保持。375px进展与习惯详情截图已目视，日志creation-detail-spacing-{typecheck,footers,logs}.log与ui-preview-creation-detail-spacing-{footers,logs}截图位于miniprogram/test-results。首次检查未使用隔离输出目录且新测量早于字段就绪；改为独立输出标签和等待真实日期行可见后，上述两组完整通过，不改变业务断言。

build:preview通过92源／20产物样式、18页启动、原图形分包及主包预算，主包1,369,314字节，日志creation-detail-spacing-build.log。当前dist为包含C254的隔离预览构建，微信开发者工具重新编译可查看；差异格式检查通过。微信开发者工具／真机未实测。

## 标题与记录尾部空白（C253）

2026-10-11，仅小程序。首页进展本来由progressEntries.trim提交，旧领域记录展示仍将原尾部空行交给pre-wrap；便签创建／编辑body也未清尾。新增trimTextEnd复用String.trimEnd，DomainRecordContent分别给纯文本和Markdown提供清理后的只读文本；EntityTitleText／EditorHeading／习惯备注与留言、标题卡片、领域目标／历史、统计、文章／评论、格言及创建静态快照使用同源处理。表单输入及草稿保留原值，普通保存入口原trim规则保持，只补齐两处便签body提交，保留开头和内部Markdown／缩进／空行，不修改原存档或触控间距。见[C253](../Design.md#标题与记录末尾空白清理c253)。

类型、check-text-whitespace及完整test:logic通过，新纯逻辑检查已接入test:logic，覆盖CRLF／制表符／全角／不换行／行段分隔符及BOM，保留开头／内部空行与非空白字符。--text-whitespace四尺寸360／375×667／430／768px通过：首页底部创建进展、未提交输入换行、存储失败同ID重试、原数组不改、旧记录清尾及同内容同卡高、任务／习惯／领域／便签标题、习惯全文备注、便签创建／编辑持久化、统计已完成目标只读与账号切换。375px截图已目视。原--domain-recent-records及--toolbars四尺寸通过，双栏独立滚动／固定详情与原ID编辑、最新十条／图片、账号与共享控件几何保持；日志text-tail-{typecheck,unit,logic,ui,domains,shared}.log及截图位于miniprogram/test-results。

旧--window-close在360px前部编辑流程后停在快捷方式「替换为：查看任务」，当前目录名称按C243为「任务」；旧--statistics入口仍定位「打开数据」，当前为「打开统计」，均未放宽无关断言，不宣称旧完整流程通过，日志text-tail-{close,statistics}.log。本轮统计的标题与记录展示由--text-whitespace直达原领域统计验证。微信原生／真机未实测。

最终build:preview通过92源／20产物样式、18页启动、原图形分包及包体预算检查，主包1,368,897字节，日志text-tail-build.log。当前dist为包含C253的隔离预览构建，微信开发者工具重新编译可查看；差异格式及新增脚本语法检查通过。

## 领域详情固定与记录双栏独立滚动（C252）

2026-10-11，仅小程序。DomainRecordColumns／Column新增可选scrollable组合，各栏由共享ScrollView拥有纵向滚动、隐藏滚动条、边界不外传及4px末尾阅读留白；默认静态调用保持。DomainRecentRecords移除原共同ScrollView，以两栏同高独立滚动替代，原合计最新十条及空状态、卡高和首屏分配不改。领域详情仍复用PageScroll的对话框宿主，页面／网格／卡片形成100vh不溢出的flex布局，记录占剩余区域，名称／目标及原四格横向习惯固定；短屏仅收紧局部布局留白，按钮触控及共享卡片保持。数据、排序、编辑及账号保存未改。见[C252](../Design.md#领域详情固定与记录双栏独立滚动c252)。

类型、--domain-recent-records与--domain-habit-creation四尺寸360／375×667／430／768px浏览器适配检查通过。最近记录新增两栏独立滚动、末条完整及滚动边界不带动列表检查；新增check-domain-detail-scroll-ui验证双栏各12条完整历史、长目标与长记录、固定顶部与零外层滚动范围、图片可达、滚轮独立及边界、横向习惯续页、编辑关闭、往返、空白创建不写入和375px模拟34px安全区。原最近记录排序、最新十条、ID编辑／删除／补位／持久化与账号隔离保持，习惯创建／失败重试及打卡检查通过。375px详情、安全区与最近记录截图已目视；日志domain-record-scroll-{typecheck,ui,habits}.log及对应截图位于miniprogram/test-results。

完整--domains仍在既有默认数量断言处失败：旧脚本期待8个domain-entry，当前C211增加只读未分类卡共9个；未放宽无关断言，日志domain-record-scroll-workflow.log。相关历史滚动断言已按C252更新，专项覆盖本次行为，不宣称完整旧流程通过。build:preview通过92源／20产物样式、18页启动、图形分包和包体预算，主包1,368,260字节，日志domain-record-scroll-build.log。dist为本轮隔离预览，微信开发者工具重新编译可查看；原生／真机未实测。

## 专注事项来源浮窗优化（C251）

2026-10-11，仅小程序。原来源浮窗180px横排双按钮会向下覆盖开始专注；Pomodoro改用156px、tight正文的单列图标名称菜单，复用LibraryIcon的plant／calendar及原form-choice-content／icon／label结构。40px来源ChoiceButton通过fill组合、4px行距与局部共享背景／边框变量形成无重复边框的菜单，原选中高亮、无障碍及空来源禁用保持。ChoicePopover新增默认auto的preferredSide，来源设置above；足够空间时向上，否则沿原可用空间选择。向上按layer到anchor的实际bottom定位，top设auto，真实面板底边距箭头8px，不受原测量中边框高度猜值影响，不在页面补偿位置。原事项／领域、选择宿主、计时和账号保存不改。见[C251](../Design.md#专注事项来源浮窗优化c251)。

类型检查、完整--pomodoro及--toolbars四尺寸360／375×667／430／768px浏览器回归通过。既有来源检查增加单列／156px、40px两行／4px行距、20px已加载图标、共享4／12px内距、向上真实8px间距与开始按钮完整可见断言；保留原按钮边界不移动、来源高亮／禁用、遮罩关闭、选择原任务／习惯、领域归属与保存／提醒流程。十页工具栏及共享按钮／独立弹窗、长名称、动态容器和入口／筛选检查保持。375px短屏及768px宽屏来源截图已目视；日志pomodoro-source-menu-typecheck.log／pomodoro-source-menu-ui.log／pomodoro-source-shared-ui.log与对应截图保留。

build:preview通过91源／19产物样式、18页启动、番茄图形分包及包体预算检查，主包1,367,685字节；日志miniprogram/test-results/pomodoro-source-menu-build.log。当前dist为包含C251的隔离预览构建，微信开发者工具重新编译后可查看；本轮微信原生／真机未实测。

## 番茄钟所属领域（C250）

2026-10-11，仅小程序。Pomodoro在原状态行下组合DomainChoiceField，当前账号domains就绪、格式有效且账号相同后提供原选项，缺省及已删除领域显示未分类。focus-domain-row只拥有满宽不伸缩布局与8px上距，按钮／图标／箭头／浮窗继续由基础组件拥有；领域及当前选择变化重测番茄舞台，长名称换行后保持图形完整。TimerSelection与FocusSession增加version 1可选domainId，读旧存档不补造字段，开始／结束及自动休息传播同轮领域。事项文字、习惯／待办选择保留独立领域；未开始沿原页面草稿，已有active沿原update／setValue按账号与active ID保存，volatile时锁定领域变更直到原队列重试。见[C250](../Design.md#番茄钟所属领域c250)。

类型、check-habits-focus及check-pomodoro-cross-client通过，覆盖旧缺省字段、校验／归一化、暂停恢复／提前结束／自动休息归属及旧节奏、截止时间与微信提醒关系。完整--pomodoro四尺寸360／375×667／430／768px浏览器回归通过，新增check-pomodoro-domain覆盖默认未分类、独立事项／任务／习惯、准备及暂停选域、运行中事项修改保留领域、长名换行后的图形与按钮边界、往返恢复、持久化失败锁定／同轮原目标重试、结束归属、切换未分类、账号变化关闭旧窗口、已删除领域只读回退及无效来源禁用；原两行48px按钮、40px反馈、模拟34px安全区、时长／节奏／提醒流程保持。375px默认／长领域名暂停截图已目视，日志pomodoro-domain-typecheck.log／pomodoro-domain-ui.log及截图ui-preview-pomodoro-domain保留。

本轮初次build:preview仍被源项目es6=true／enhance=true挡住，日志pomodoro-domain-build.log；按既有T06／T27明确约定仅将这两项恢复false，保留minified及原私有覆盖，最终build:preview通过91源／19产物样式、18页启动、图形分包及原包体预算检查，主包1,367,422字节，日志pomodoro-domain-build-final.log。当前dist为本轮隔离预览构建，包含C246–C250源码改动；差异格式检查通过。微信开发者工具仍需按[调试说明](device-debugging.md#首页模块加载报错t062026-10-06)只清编译缓存并重新编译、冷启动，不清业务Storage；本轮微信原生／真机未实测。

网页及后端未改。网页当前归一化读取能保留小程序active／session的domainId，已由往返检查验证；网页旧结束器尚未将domainId写入它生成的结束记录，该端结束路径不作为本次支持范围。

## 第二屏娱乐领域预览（C249）

2026-10-11，仅小程序隔离预览。domain-preview-records.cjs新增extendEntertainmentDomainPreview，在原八个领域后追加entertainment／娱乐／game空领域，旧对象、顺序及状态字段保留；已有同ID或同名沿用。preview-data/index接入独立v5标记，候选先按原容量与领域／习惯存档完整校验，再沿原缓存写入并最后写标记；失败以稳定ID去重重试。生产默认八域、原样本八域及领域页布局不改，第二屏沿现有slice(8)续接列表，后续改名／删除不补回。见[C249](../Design.md#第二屏娱乐领域预览c249)。

类型检查、check-domain-entertainment-preview及完整check-domain-preview纯逻辑通过，覆盖旧八项和修改保留、空数据、同ID／同名去重、写缓存／标记失败重试、满24拒绝且不写、pending／revision及正常账号／游客／草稿隔离。--domain-entertainment-preview四尺寸360／375×667／430／768px浏览器检查通过：原八卡完整留在首屏，娱乐沿第二屏续接可见，进入空详情及重复初始化不写入，原目标／记录与普通账号哨兵保留且无账号工具API调用。375px第二屏截图已目视；日志entertainment-domain-seed.log／entertainment-domain-ui-focused.log与截图ui-preview-entertainment-domain保留，差异格式检查通过。

完整--domain-preview在通过新增卡及原工作领域阅读后，被旧创建表单关闭断言挡住：脚本要求有修改的表单直接关闭，与C230当前应用内未保存确认不符；未放宽此断言，日志entertainment-domain-ui.log。build:preview仍被现有project.config.json的es6=true／enhance=true配置挡在项目配置检查，日志entertainment-domain-build.log，未跳过校验或修改无关配置；微信开发者工具／真机未实测。

## 专注番茄小幅上移（C248）

2026-10-11，仅小程序。pomodoro/core.css中focus-timer-stage的下margin由0改为12px，计时舞台的flex可用区域相应减少，原TomatoClock测量与自适应尺寸继续生效；图形底边上移12px，事项框及底部操作保持原位置，实际番茄到事项间距为24px。无图形transform或计时业务修改。见[C248](../Design.md#专注番茄小幅上移c248)。

类型检查、差异格式及原--pomodoro四尺寸360／375×667／430／768px浏览器回归通过；原几何断言按24px间距更新，图形保持舞台内完整显示，40px反馈槽、两行48px按钮、底部12px及模拟34px安全区、时长修改／计时／暂停／提前结束／设置／提醒流程保持。375px暂停图已目视，日志tomato-raise-ui.log与截图ui-preview-tomato-raise保留。build:preview仍被现有project.config.json的es6=true／enhance=true配置挡住，日志tomato-raise-build.log，未跳过校验或改无关配置；微信开发者工具／真机未实测。

## 首页快捷创建保持原屏（C247）

2026-10-11，仅小程序。原PageScroll在没有用户翻页的情况下也会对onScroll执行就近吸附，底部Input的键盘避让偏移因此可能触发第二屏。新增默认关闭的snapSuspended组合参数：首页底部输入聚焦、创建窗或首页隐藏时启用，立即禁用吸附并清理手势／定时器，保存暂停前位置；结束时重新设置scrollTop、清除旧锚点并重测边界。暂停期间保留ScrollView滚动及Input.adjustPosition，恢复后保留原双向／取消／水平手势规则。openCapture移交焦点时收键盘，隐藏页清除输入聚焦标记。原创建保存、成功类型与账号草稿不改，任务成功仍按C246跳待办。见[C247](../Design.md#首页快捷创建保持原屏c247)。

新增check-home-creation-scroll.cjs及--home-creation-scroll入口，在隔离浏览器适配器注入微信键盘避让式滚动偏移；修改前360px稳定复现意外吸附，日志home-create-scroll-before.log。修改后360／375×667／430／768px检查通过：底部加号及键盘完成、连续便签／进展保存、取消、输入失焦恢复、原第二屏创建入口位置、上下滑动、任务成功进入待办且无详情及返回首页。日志home-create-scroll-ui.log。类型、check-page-snap-logic与完整--snap四尺寸回归通过，后者包含其他整屏、单屏工具、长页及取消／水平手势，日志home-create-scroll-snap.log；差异格式检查通过。

build:preview仍因现有project.config.json的es6=true／enhance=true在项目配置检查处失败，保留home-create-scroll-build.log，未跳过校验或调整无关配置。浏览器注入偏移用于验证吸附与恢复逻辑，不代表已实测微信键盘；微信开发者工具／真机未验证。

## 创建任务后直接进入待办页（C246）

2026-10-11，仅小程序。EntryComposer在原持久化／账号检查、成功类型记忆与关闭创建窗后，对所有task成功提交统一switchTab到/pages/todos/index。删除仅带提醒时写ottlog.todos.focus／调用onTaskSaved的分支及待办宿主自动openEditor回调；保留原提醒授权提示，手动打开和专注关联任务的聚焦路径不变。跳转失败显示已保存及底部待办入口的错误提示，不重建任务。见[C246](../Design.md#创建任务后直接进入待办页c246)。

类型检查与差异格式检查通过。基于现有check-ui-preview适配器的一次性专项检查覆盖360／375×667／430／768px：首页快捷输入、明确创建任务快捷方式、待办象限、便签切换任务、领域列表／详情切换任务，保存后待办列表可见、无编辑／详情窗口且无创建聚焦意图。普通任务失败留在原页保留输入、同ID重试成功；原微信提醒检查更新为创建后手动打开任务，授权／取消／完成后取消提醒全流程通过。完整--todos四尺寸回归也通过，含排序／备注／日程／编辑／完成／微信提醒／任务显示及下一步，日志task-create-navigation-todos.log。日志task-create-navigation-focused.log及审计脚本test-results/task-create-navigation-ui.cjs保留，临时预览脚本已移除。

完整entry-creation检查在通过新增首页导航案例后，被既有编辑底栏断言挡住：它仍假定只有一个保存button，与C240删除符号并列的现有实现不符。未放宽旧断言或修改无关页面。build:preview被现有project.config.json的es6=true／enhance=true挡在项目配置检查，未调整配置或跳过检查，构建不记为通过；日志task-create-navigation-entry.log与task-create-navigation-build.log保留。微信开发者工具／真机未实测。

## 习惯详情顶部领域与完整备注框（C245）

HabitDetailHeader接收两个宿主的原domains、通过alignHabitDomain读取ID，领域用原DomainChoiceField／SingleChoiceField的readOnly变体放在EntityTitleRow前；共享choiceControlStyle和选项图标／名称，不提供交互箭头，原编辑分支和存档保持。HabitNoteField抽出原提醒Textarea框与只读正文变体，详情全文自然换行、固定14px，不再做摘要或重复展开；空备注沿原行为隐藏。共用组件明确拥有输入尺寸与只读高度，显式auto高度与原最小高度避免领域页宽屏tool-input压成48px，编辑字段沿原Textarea属性及144rpx尺寸。见[C245](../Design.md#习惯详情顶部领域与完整备注框c245)。

类型检查、habit-comment-logs与sheet-footers四尺寸360／375×667／430／768px浏览器适配检查通过；footer组另含430×720与模拟34px安全区。实测两宿主领域满宽且位于名称上方、40px图标／48px优先度区／24px备注上距、无备注展开控件，240字多行备注只显示一次且全部留在边框内；原长标题阅读、完整42格／六行40px日期、月日志／补记、固定操作及读取／取消不写业务数据保持。375px两宿主和768px多行备注截图已目视；build:preview、启动／样式／主包预算及差异格式检查通过。日志habit-detail-fields-{typecheck,logs,footers,build}.log和对应截图位于miniprogram/test-results，微信开发者工具／真机未实测。

## 节奏设置副标题与选项简化（C244）

Pomodoro五个副标题直接使用已有FilterFieldHeading，移除focus-field-label的页面字体／颜色／间距样式；transitionOptions只改显示为「自动休息」「不自动休息」，仍保存autoBreak／manual。原数字框与计时、节奏草稿、应用内未保存取消和账号守卫保持。见[C244](../Design.md#节奏设置副标题与选项简化c244)。

类型检查与原pomodoro四尺寸360／375×667／430／768px浏览器适配流程通过，既有检查按短文案定位；实测五个副标题的共享字号／字重／行高／颜色及边界，选择／应用内取消、实际计时、时长覆盖、结束／提醒与持久化守卫通过。375px设置截图已目视，build:preview及启动／样式／主包预算检查通过，差异格式检查通过；日志pomodoro-settings-headings-{typecheck,ui,build}.log与截图位于miniprogram/test-results。微信开发者工具／真机未实测。

## 首页全部功能创建与排序（C243）

homeFeatureCatalog增加create-habit／create-domain，任务／收藏名称同源调整，previousShortcutNames兼容旧默认名。保留19个存档身份，公开groups过滤posts／domains，显示五项操作／十二项界面；HomeFeatureList通过groups／sorting／onMove组合原40px CardMoveActions，MoreSection通过actions组合SortSymbol，HomeShortcutEditor接收同一已应用groups。默认六卡及已有自定义名称、图标／颜色／rank保持。见[C243](../Design.md#首页全部功能创建与排序c243)。

home-creation-navigation按原专注导航模式持有一次性target／owner，switchTab失败清理原请求、晚到失败不覆盖新请求；习惯／领域useDidShow接收，数据就绪且账号一致后调用原openEditor／definition.openCreate，隐藏页清除未消费意图。原编辑表单与保存队列不变，领域容量或账号变化有应用内反馈。card-order提取相邻不可变交换，领域原move只替换算法、队列／目标重试不改。目录独立homeFeatureOrder设备偏好读时归一化，按组补齐新项／排除重复或隐藏键，useHomeFeatureOrder每次写入成功才应用，失败锁定原绝对目标；不写默认值或领域业务状态。

类型、check-home-shortcuts、check-shortcut-icons与新增order／navigation纯逻辑检查通过，覆盖默认名／自定义外观、组边界／不可变输入／非法旧键／补齐、一次性所属账号意图／转场失败及晚到失败。home-directory、原domain-management、原home-shortcut-library三组360／375×667／430／768px浏览器适配检查通过：新增表单创建／空取消及应用内未保存取消、历史留言及原业务保留；17项／两组、共享40px／2px按钮、即时保存／刷新／同目标失败重试，选择／替换目录与外观原守卫保持；领域原排序／创建／编辑／删除／未分类／容量及账号隔离保持。375px普通／排序目录截图已目视。

build:preview通过18页启动、90源／19输出样式及主包1,365,825字节预算检查，差异格式检查通过。本轮专项检查命令npm.cmd run test:home-directory；日志home-directory-{typecheck,shortcuts,icons,order,navigation,ui,domain-sort,library,build}.log及截图位于test-results。浏览器适配测试的旧任务名称定位已对齐当前名称；本轮未宣称旧整套home-shortcuts／home-navigation检查通过。微信开发者工具／真机未实测。

## 首页领域入口名称（C242）

homeFeatureCatalog的growth.name改为「领域」，previousShortcutNames.growth追加「领域进展」，沿原默认名兼容与自定义外观守卫读取；更早「成长足迹」兼容保持。原key／数据／导航不变，页面不复制名称。既有检查的当前默认文字同步，旧名仅保留在兼容案例；同名选择选项通过data-feature-key定位。见[C242](../Design.md#首页领域入口名称c242)。

check-home-shortcuts既有纯逻辑检查及类型检查通过，覆盖缓存默认名转换、样式／rank与自定义名称保留。一次性浏览器检查四尺寸360／375×667／430／768px确认默认六卡及完整目录显示「领域」、旧缓存不写存档且新名可进入原领域页面、自定义名称保留；375px截图已目视。build:preview通过18页启动、90源／19输出样式及主包1,360,704字节预算检查，差异格式检查通过。日志home-domain-name-{logic,typecheck,visual,build}.log及截图位于test-results，临时预览副本已移除，未实测微信真机。

## 习惯详情独立首行与备注框（C241）

习惯页／领域详情顶部改为共享EditorHeading，原HabitDetailHeader移入原ScrollView的下一行，只接收item／className；关闭及底部编辑／完成仍使用原禁用与回调。entity-title-field抽出EntityIconPreview，创建／编辑／阅读备忘录与手势快照通过MemoIconPreview复用同一40px框及26px图案；MemoFieldsLayout用EntityTitleRow、MemoEditorFields用EntityTitleInput，移除重复首行字体／边框／图标尺寸。习惯背景图与habit-icon兼容class保留，原PriorityFlag及色表不变。

SingleLineInput导出SingleLineField，原输入几何保持，HabitDetailNote组合44px框与quiet展开按钮；显示实际备注单行摘要，完整原文独立展开。habit-calendar.css将正文上距固定16px、实体行下距24px、备注下距12px，删除≤760／≤680旧上距和下距覆盖；首选高度672／696→784／808px，日期六行40px及原视口边距不变。短屏从原内容区滚动查看完整月历／日志，固定关闭与底栏不移动，统计page布局和存档／账号／业务守卫不改。见[C241](../Design.md#习惯详情独立首行与备注框c241)。

类型检查、memos、habit-comment-logs与sheet-footers四尺寸360／375×667／430／768px浏览器适配检查通过；footer组另含430×720及模拟34px安全区。既有详情布局检查对齐新短屏滚动方式，确认完整42格、每行40px、月日志、原旗帜颜色、长标题／备注展开收起、底栏／月份和业务存档保持。三种日志宿主的全文、十条分页及补记保持，备忘录创建／阅读／编辑／图片／保存检查通过。

一次性视觉对照使用test-results/habit-detail-memo-row-visual-audit.cjs及临时原预览副本，四尺寸实测两宿主与创建备忘录的图标框／名称字体／优先度区相同，标题下16px、备注上24px、备注框44px且仅一层边线，阅读不写存档；375px真实「等等」样式、创建备忘录参照及两宿主普通／长摘要截图已目视。build:preview通过18页启动、90源／19输出样式及主包1,360,689字节预算，差异格式检查通过；临时副本完成后移除。日志habit-detail-memo-row-{typecheck,memos,logs,footers,visual,build}.log及对应截图目录位于test-results。以上为浏览器适配与构建验证，微信开发者工具／真机未实测。

## 编辑删除符号与底栏统一（C240）

SheetActions导出SheetDeleteButton，组合原ActionButton icon／compact／danger与DeleteSymbol，要求ariaLabel且传原回调／禁用状态。原leading插槽拥有40px图标／48px主按钮／8px间距及底部留白；不使用width='content'，避免基础组件alignSelf:flex-start覆盖底栏居中。todos、HabitEditor、memos、mottos、DomainRecordEditor五处组合，习惯两宿主同步。移除正文文字删除、记录日期旁按钮及memo-delete／mottos-delete／record-edit-delete独立样式；任务专注、习惯归档保持，记录旧class仅兼容定位。见[C240](../Design.md#编辑删除符号与底栏统一c240)。

类型检查与todos／daily／memos／mottos／record-edit／window-close六组360／375×667／430／768px浏览器适配检查通过；另复用原check-habit-delete-ui核对领域宿主四尺寸，原确认、删除目标／历史保留、未保存提示、失败同ID重试、图片及账号隔离保持。习惯与记录原检查增加底栏位置断言，记录旧取消流程对齐C230的关闭／应用内不保存确认，不修改业务守卫。375px六种编辑宿主截图已目视，任务／格言一次性视觉测量确认40px删除／48px保存、间距8px、中心差0、底部8px且无上边线；创建截图确认不新增删除入口。

build:preview通过18页bootstrap、90源／19输出样式及主包1,361,371字节预算检查，差异格式检查通过。日志editor-delete-footer-typecheck.log／editor-delete-footer-todos.log／editor-delete-footer-daily.log／editor-delete-footer-domain-habits.log／editor-delete-footer-memos.log／editor-delete-footer-mottos.log／editor-delete-footer-records.log／editor-delete-footer-close.log／editor-delete-footer-visual.log／editor-delete-footer-build.log；临时预览副本已移除，测量及截图保存在test-results。以上为浏览器适配和构建验证，微信开发者工具／真机未实测。

## 任务筛选标签提示移除（C239）

核对todos的标签FilterField，当前只传label='标签'，没有caption；FilterFieldHeading仅在caption非空时渲染辅助文字，因此没有提示或占位。src与dist均无「选择一个标签」，C238的375px任务筛选截图也已无该文字。本次仅明确规则并修正组件文档中C228的过时说明，不重复修改运行代码或新增测试。见[C239](../Design.md#任务筛选标签提示移除c239)。

## 筛选副标题统一（C238）

FilterFieldHeading从原FilterField中抽出标题行，复用SectionTitle普通规格，删除原独立14px／500字体声明；标题行由filter-popover.css拥有至少20px高度、居中对齐与6px下距，inRow省去下距。FilterField组合该组件使任务／习惯／便签同步，文章两处用inRow且SingleChoiceField明确width='fill'，移除页面旧副标题字体声明和旧picker宽度规则。条件、回调与存档不改。见[C238](../Design.md#筛选副标题统一c238)。

类型检查通过；基于原check-ui-preview浏览器适配器一次性核对任务／习惯／便签／文章四类筛选的360／375×667／430／768px显示，共16个窗口，所有副标题实际为14px／600／#9cafb9，文字与页面均无横向截断，习惯滚动后的时段／优先度仍同源。375px四窗及习惯底部截图已目视，文章选择框文字／箭头完整。使用test-results/filter-subtitles-visual-audit.cjs与临时预览副本核对，不新增生产测试；副本检查后移除。build:preview通过18页bootstrap、90源／19输出样式与主包1,361,325字节预算检查，差异格式检查通过。日志filter-subtitles-typecheck.log／filter-subtitles-visual.log／filter-subtitles-build.log，测量和截图位于test-results/ui-preview-filter-subtitles；微信开发者工具／真机未实测。

## 领域习惯创建占位卡（C237）

domain-detail在排序后的真实domainHabits末尾组合一个null展示项，再按四格分页；最后一格组合原daily-suggestion表面和共享CardCreateButton，只有一页且不超过两格时省去第二行。标题旁入口与「暂无习惯」文字移除，createHabit(domain)及原保存器不改。domains的添加卡同步复用CardCreateButton，保留原domain-create-card选择器和容器几何；共享组件拥有卡片大小的触控、加号居中及按压态，继续读取原AddSymbol。见[C237](../Design.md#领域习惯创建占位卡c237)。

类型检查与domain-habit-creation专项360／375×667／430／768px浏览器适配检查通过，覆盖两个共享添加入口的完整触控、居中符号、空列表到五张习惯的末尾排列／分页、当前领域预选、关闭不创建、写失败重试、其他习惯及打卡保留、刷新同ID与无页面横向溢出。375px空列表／末页、768px满四张后的加号截图已目视。build:preview通过18页bootstrap、90源／19输出样式及主包1,361,129字节预算检查，差异格式检查通过。日志domain-habit-add-card-typecheck.log／domain-habit-add-card-focused-ui.log／domain-habit-add-card-build.log；微信开发者工具／真机未实测。

旧完整--domains检查在既有未分类展示卡的数量断言处停止（预期8、实际9），尚未到本次创建入口检查，不记为通过；失败日志domain-habit-add-card-ui.log保留。本轮采用上述专项检查验证当前入口和分页，未改未分类业务或为旧断言改变页面。

## 领域记录创建按钮统一（C236）

domain-detail的CreateButton仅移除appearance='secondary'，与domains的「记录进展」沿相同默认primary／compact；原标签、disabled及createRecord回调不改，不新增CSS。主说明见[C236](../Design.md#领域记录创建按钮统一c236)。

类型检查与progress-creation四尺寸360／375×667／430／768px浏览器适配检查通过，详情工具栏40px按钮同排且无横向溢出，当前领域／未分类预选、草稿与原子保存、同目标重试和账号隔离保持。build:preview通过18页bootstrap、89源／19输出样式及主包1,360,663字节预算检查，差异格式检查通过。日志domain-record-button-typecheck.log／domain-record-button-ui.log／domain-record-button-build.log；微信开发者工具／真机未实测。

## 习惯分区边界与间距（C235）

HabitListSection拥有viewport及可选edgeFade，ScrollView继续原ID／scrollKey／scrollTop，onScroll先更新顶缘显示状态、再调用原回调；scrollKey／edgeFade变化清空展示状态。8px渐隐pointer-events:none，列表末尾8px内距，空区不启用；隐藏原生滚动条。daily仅向两个分区传递是否非空，布局拥有12px分区间距、6px网格行距、时段圆角底及8px提醒上距，共享HabitCard及其他宿主不变。主说明见[C235](../Design.md#习惯分区边界与间距c235)。

类型检查、habit-time-periods与daily两组360／375×667／430／768px浏览器适配检查通过；固定标题／等宽分类、独立滚动与末卡完整查看、下窗拖动不滚上窗、原ID保存／重试及账号隔离保持。最终375px与430px分区截图已目视，滚动后顶缘和截断下缘均有轻淡过渡。build:preview通过18页bootstrap、89源／19输出样式及包体检查，主包1,360,663字节，差异格式检查通过。日志habit-sections-typecheck-final.log／habit-sections-periods-final.log／habit-sections-daily.log／habit-sections-build.log；浏览器适配及构建验证，微信开发者工具／真机未实测。

## 界面说明文案精简（C234）

按用户确认的全小程序范围，页面和共用组件直接删除鼓励、普通成功与默认操作文案；EntryComposer／任务编辑只在类型偏好保存失败或需授权提醒时给出提示，其他错误／校验／同ID保存／账号隔离保持。ChoiceField省去默认页脚与空caption，图标窗、Markdown预览、统计与空列表使用简短状态，格言、备注、记录与文章不做运行时文本过滤或数据迁移。

番茄钟删除caption字段、节点及26px布局，操作容器上间距12px、原按钮组8px保持，40px反馈槽及底部对齐不变。已有布局检查改测事项到按钮间距，领域全页面检查限定首屏八卡并保留续接未分类卡的断言；习惯归档检查改用简短空状态，原保存与重试检查保留。主说明见[C234](../Design.md#界面说明文案精简c234)。

类型检查及八组360／375×667／430／768px浏览器适配检查通过：全页面screens、pomodoro、entry-creation（含首页类型记忆）、daily、memos、meals、food-editor与mottos。原留言持久化、失败重试、提醒取消／授权、图片、草稿及账号隔离断言保持；375px暂停／长休息、食选结果与个人空间截图已目视核对。最终build:preview通过18页bootstrap、89源／19输出样式和包体检查，主包1,359,560字节；差异格式检查通过。日志copy-cleanup-typecheck-final.log／copy-cleanup-screens-complete.log／copy-cleanup-pomodoro.log／copy-cleanup-entry-creation.log／copy-cleanup-daily-verified.log／copy-cleanup-memos.log／copy-cleanup-meals.log／copy-cleanup-food-editor.log／copy-cleanup-mottos.log／copy-cleanup-build-final.log。以上为浏览器适配及构建验证，微信开发者工具／真机未实测。

## 便签置顶独立行（C233）

MemoEditorFields将原设置区的ChoiceButton移入MemoFieldsLayout.pin，颜色设置仅保留MemoColorChoices。独立右对齐行抽为MemoPinRow供原阅读和EntryPreview静态置顶共用，沿原40px、同色选中态及回调，不复制样式或修改数据／保存。原创建布局检查加入这行的顺序与可见性检查。

类型检查、memos及entry-creation两组360／375×667／430／768px检查通过，保持六色色点一行／40px、完整创建字段顺序、图片、置顶、滑动快照、保存重试和账号隔离；360px创建、375px编辑与768px快照截图已目视。build:preview通过18页bootstrap、89源／19输出样式及主包1,362,881字节预算检查，差异格式检查通过。日志memo-pin-row-typecheck.log／memo-pin-row-ui.log／memo-pin-row-entry.log／memo-pin-row-build.log；浏览器适配及构建验证，微信开发者工具／真机未实测。

## 快捷方式选中高亮（C232）

HomeShortcutEditor向共享HomeFeatureList提供替换后的保留项／当前候选selected，重复项disabled条件不变。selection变体声明原控件颜色变量及未选图标透明度，选中disabled选项opacity保持1；navigation目录不受影响。原rank、确认保存与关闭守卫保持。

类型检查、home-shortcut-library四尺寸360／375×667／430／768px检查通过，包含已配置项选中／重复禁用、切换候选、取消不提交、保存／重开、外观／移动及原失败重试；375px与768px替换截图已目视。build:preview通过18页bootstrap、89源／19输出样式及主包1,362,762字节预算检查，差异格式检查通过。日志shortcut-selection-typecheck.log／shortcut-selection-ui.log／shortcut-selection-build.log；浏览器适配及构建验证，微信开发者工具／真机未实测。

## 彩色便签展示优化（C231）

列表仍读取原notes及memoColorStyle，用6px间距／12px圆角／上下8px内距替代相连色带与旧分隔线；图文只留8px，日期进入始终存在的辅助行，原标题／摘要字号、缩略图及操作尺寸保持。共享memoColorStyle派生--memo-paper-border，正文／EntryPreview和列表使用45%透明强调色；三个置顶节点及静态快照只在自身配置共享控件选中变量，避免影响标签、优先度和六色选择。未修改业务数据、过滤／排序、草稿／账号或保存行为。

类型检查、memos及entry-creation两组360／375×667／430／768px检查通过。六色标题／正文／日期／标签及创建输入的实际对比度均不低于4.5:1，辅助行日期完整可见，管理态长标题、缩略图与操作不重叠；原筛选、排序、图片、保存／删除重试、草稿、滑动快照与账号隔离保持通过。375px列表／管理态／薄荷阅读和360px创建截图已目视检查。

build:preview通过18页bootstrap、89源／19输出样式及包体检查，主包1,362,455字节低于1.5MB预算，差异格式检查通过。日志c231-memos-ui.log／memo-surface-entry-final.log／memo-surface-typecheck.log／memo-surface-build.log。以上为浏览器适配及构建验证，微信开发者工具／真机未实测。

## 独立窗口与应用内提示（C230）

EditorHeading统一已有标题，PopoverHeading适配title／actions、类型栏用titleContent；实体详情不补造标题。EntityTitleRow／Input／Text统一图标名称大字下划线。SheetActions.leading拥有40px编辑图标、8px间距及48px主按钮，习惯两宿主／便签阅读沿原回调，底距和无上边线保持。

useEditorCloseGuard按账号／对象scope统一×／遮罩／Escape，有修改时应用内不保存／保存，提示×继续编辑，失败回原表单。创建、任务／便签、习惯、领域／目标／记录、快捷方式完整选择与显式设置接入；即时选项不改变写入时机，原草稿、图片、busy、volatile和同ID重试保持。AppDialogHost由PageScroll兄弟持有，无PageScroll的格言／选境分支显式安装；隐藏／卸载取消旧页确认。普通确认／反馈用requestAppConfirmation／showAppMessage，系统modal／toast／actionSheet移除，微信授权保持。

类型检查及16组360／375×667／430／768px浏览器适配检查通过：window-close、todos、home-shortcut-library、daily、habit-sorting、mottos、meals、pomodoro、schedule-time、reminder-settings、memos、toolbars、habit-comment-logs、sheet-footers、domain-management、entry-creation。另检查34px底部安全区及430×720px布局，40px触控、完整月历与月日志标题初始可见断言保持；浅色打卡留言的实际标题／名称文字对比度检查通过。

关闭专项覆盖×／遮罩／Escape、分层窗口、继续编辑／不保存／保存、失败保留输入与同ID重试、账号切换及异步晚到、快捷方式自动保存与完整选择、任务排序失败后重试。任务／便签的空格标题及重复标签保存后重开验证通过；便签成功保存自行关闭时不再调用缓存型关闭，避免恢复已保存前的旧输入。普通系统modal／toast／actionSheet源码调用及显式取消按钮均已清零，微信授权接口保持。

最终build:preview通过18页bootstrap、89源／19输出样式检查，主包1,362,034字节低于1.5MB预算；差异格式检查通过。最终日志window-close-final-ui.log／c230-daily-final4.log／c230-habit-sorting-final2.log／c230-build-complete.log，短屏习惯详情与浅色留言截图已目视检查。以上为浏览器适配与构建验证，微信开发者工具／真机未实测。

## 横向分类栏固定全部（C229）

CategoryRow增加可选fixedLeading插槽，外层page-category-bar／page-category-fixed-row组合左侧page-category-fixed及右侧原page-category-scroll；固定节点不进入ScrollView。未提供插槽时仍输出原ScrollView，仅补通用page-category-bar类，少量分类填满、原滚动属性及无「全部」调用结构保持。共享组件拥有宽度分配和分类间距，不用sticky或各页复制布局。

习惯领域、便签标签、文章分类、IconLibrarySheet分类及专注选择习惯的分组把原「全部」节点移入插槽，保留原选中状态、回调、禁用与数据来源；静态／网格选项和没有「全部」的时段、统计、饮食、任务优先度栏不迁移。习惯selectionOffset=1.5只测右侧视口和按钮，选「全部」让右侧回起点，长名完整优先、首尾限界及账号／分类重测沿C221守卫。

原分类栏检查增加五处固定首项的实际位置／可见性、横滑不改选择、右侧末项／长名及点击「全部」恢复原过滤结果。原习惯检查的整行定位改为page-category-bar／daily-core-filter-scroll，默认筛选断言按C227保持普通态。大屏实测发现右ScrollView继承页面行高形成额外行框，固定模式以line-height:0与内容行vertical-align:top去掉空位；按钮本身的显式字体／行高／40px触控保持，无固定模式不受影响。

类型检查、toolbars／daily／memos／icons四组360／375×667／430／768px检查及最终build:preview通过，包含五个接入口与无固定插槽分类栏、原筛选／排序／保存／账号规则。375px习惯前置分类／便签长名与768px整行截图已目视，固定首项和右侧按钮准确水平对齐。构建验证18页bootstrap、88源／19输出样式及主包1,349,952字节符合预算，差异格式检查通过。日志fixed-all-toolbars.log／fixed-all-daily.log／fixed-all-memos.log／fixed-all-icons.log／fixed-all-build-final.log；微信开发者工具／真机未实测。

## 三页筛选间距与统一复用（C228）

用户本轮要求收紧习惯筛选间距并与任务、便签统一复用。原习惯字段组距16px、标签下距8px，选项没有局部margin复位，继承全局button上下留白；任务与便签则各有重复的字段、搜索和选项样式。

三页改为组合共享FilterPopover、FilterFields／FilterField／FilterOptionGrid／FilterSearch。FilterPopover基于ChoicePopover、PopoverHeading和FilterActions，拥有18px标题及固定标题／关闭／底栏；字段容器0／12／8px内距、组距8px、标签下6px、网格6px及选项margin:0同源，Field支持caption。FilterSearch组合SingleLineInput，外框44px、原生文字行24px，新增trailing插槽承接原清空符号。页面移除重复筛选布局、搜索与按钮样式，便签仅保留色点样式；条件、重置、多选逻辑、C227高亮和原账号／关闭守卫由宿主保留。

沿用现有habit-time-periods、todos、memos及toolbars四尺寸检查，任务筛选搜索尺寸改测共享外框，保留至少40px触控及44px上限；核对原关键词、清空、重置／数量、关闭重开、默认高亮及账号隔离，没有新增低影响样式测试。

类型检查、上述四组360／375×667／430／768px检查及build:preview均通过，覆盖共享三个页面及原任务／便签／习惯交互、长选项与内部滚动。375px三页筛选截图已目视，选项无额外上下外距、底栏固定且无横向溢出；构建验证18页bootstrap、88源／19输出样式、主包1,348,623字节符合预算，差异格式检查通过。日志shared-filters-habits.log／shared-filters-todos.log／shared-filters-memos.log／shared-filters-toolbar.log／shared-filters-build.log；微信开发者工具／真机未实测。

## 习惯默认排序筛选与排序窗精简（C227）

仅在习惯页调整共享入口的selected来源：缺省和优先度降序保持普通态，默认进行中无其他条件的筛选保持普通态；其他自动排序及非默认筛选继续高亮，自定义关闭／展开沿原反馈。窗口内选项高亮仍由原SortOptions／ChoiceButton拥有，不改排序保存或筛选值。删去全部daily-sort-hint说明与无用样式，方向组取消上边线及12px内距，底部确认沿原PopoverActions无上边线／8px底距。

沿用习惯排序和功能栏检查，更新已被替代的默认状态期待，覆盖优先度升降切换、缺省／明确保存默认、默认窗口内选择、非默认筛选／关键词及重置；保留取消、拖动、重试及账号隔离。功能栏调用的原数字禁用检查同步C225统一40px期待，没有新增低影响样式测试。验证结果在本节记录，微信开发者工具／真机未实测。

类型检查、habit-sorting与toolbars两组四尺寸360／375×667／430／768及build:preview通过；375px默认排序窗口和默认筛选功能栏已目视，说明／下方线均无空位，默认符号与内部选中态正确。构建验证18页bootstrap、87源／19输出样式及主包1,350,170字节符合预算，差异格式检查通过。日志habit-default-controls-sort.log／habit-default-controls-toolbar.log／habit-default-controls-build.log。

## 领域最近记录上方间距（C226）

仅调整domains-page-toolbar下间距，普通8→12px、短屏6→10px；原弹性最近记录窗吸收4px差值，八卡首屏与续接保持。沿原检查，不新增低影响样式测试。

domain-recent-records四尺寸360／375×667／430／768与34px安全区及build:preview通过，覆盖八张完整卡、续接／排序、记录内部滚动和原编辑保存／账号隔离；18页bootstrap、87源／19输出样式及包体预算通过。375px截图已目视，日志domain-records-gap.log／domain-records-gap-build.log；微信开发者工具／真机未实测。

## 数字输入统一尺寸与节奏精简（C225）

盘点所有number／digit入口，通过SingleLineInput numeric变体统一96×40px外框、原16px／24px行；共享变量及保护样式由基础组件拥有。专注、格言、日程年月／时分／重复、自定义餐食数值和营养字段同源，清理旧宽度覆盖及无用schedule-number-input.css。时分小窗300px避免窄屏挤压，营养网格沿同一96px最小宽自动换行。删除节奏标题下说明，保存栏核对沿共享SheetActions无上边线；原键盘／全选、范围、精度与保存守卫保持。

类型检查通过；沿原专注、格言、日程时间、提醒和饮食四尺寸检查验收全部直接调用处，不新增低影响样式测试，仅补充原营养编辑截图。详细结果记录在本节，微信开发者工具／真机未实测。

五组四尺寸360／375×667／430／768及build:preview全部通过，覆盖默认／输入／整框聚焦、专注全选与校验、年月跳转／时分／自定义重复、提醒分层保存、餐食小数／准备时间、营养原值与存档。375px节奏、时分、餐食及营养截图已目视；18页bootstrap、87源／19输出样式和主包预算通过。日志numeric-pomodoro.log／numeric-schedule.log／numeric-reminders.log／numeric-meals.log／numeric-mottos.log／numeric-build.log。

## 本次时长窗口精简（C224）

删除本次时长的说明节点和数字行下方8px占位，原SingleLineInput固定96px与单位居中，窗口最大宽度260px。SheetActions本身已无上边线，核对沿该共用样式；居中浮窗声明安全区为0，按钮底部统一8px，原检查对应期待从34px更新为8px。原自动全选、连续输入、校验、关闭与仅本次应用保持，没有新增低影响样式测试。

类型检查通过，四尺寸专注检查与预览构建结果记录在本节；微信开发者工具／真机未实测。

原pomodoro四尺寸360／375×667／430／768及build:preview通过，自动全选替换／连续输入、键盘确认、范围校验、关闭不应用及计时／授权保持。375px精简窗口截图已目视，无说明或底栏分隔线；18页bootstrap、88源／19输出样式及主包预算通过。日志focus-compact-duration.log／focus-compact-duration-build.log。

## 专注底部对齐与时长直接输入（C223）

原事项节点移出focus-action-area，顺序为番茄→12px间距→事项→提示→底部操作组；stage下对齐，卡片底部统一12px，继续／结束沿原全宽48px及两行占位。时长窗口沿SingleLineInput增加自动focus和原生选区，本次草稿selectAll在首次输入后关闭；键盘完成复用saveDuration，原范围／本次覆盖／运行暂停守卫保持。预览数字输入补齐选区适配。

类型检查通过，原pomodoro检查更新已被替代的底部几何，并增加无需再次点击输入即可替换25、连续输入及键盘确认的交互验证；没有新增独立样式测试。验证结果记录在本节，微信开发者工具／真机未实测。

pomodoro四尺寸360／375×667／430／768及build:preview通过，包含安全区、状态切换时按钮边界、事项间距、全选替换／连续输入、校验／关闭、仅本次覆盖、提醒授权和原结束计时。375px暂停／时长窗口及768px布局截图已目视；18页bootstrap、88源／19输出样式及主包预算通过。日志focus-bottom-input.log／focus-bottom-input-build.log。

## 专注页移除两条提示（C222）

计时页快捷启动成功不再写入鼓励文案，初次读取提醒配置失败不再写入计时页反馈；提醒配置读取及统计提醒卡仍沿原流程。仅修改两处消息来源，原恢复／计时／订阅守卫、40px反馈区域、按钮几何和保存／同步反馈保持，没有添加样式或测试。

类型检查和build:preview通过，18页启动、样式及包体预算通过；375px暂停布局截图已目视。日志focus-no-start-notices-build.log，微信开发者工具／真机未实测。

原pomodoro四尺寸360／375×667／430／768检查通过，覆盖计时、暂停继续、稳定全宽按钮、提前结束及提醒授权；无渲染错误或横向溢出。375px运行截图已目视，日志focus-no-start-notices.log。

## 习惯分区标题与分类滚动位置（C221）

CategoryRow增加compact字号变体，共用SectionTitle的12px变量；HabitListHeading三行统一宽度和4px下间距，提醒省去旧上边线／padding。习惯顶部通过selectionOffset=1.5和账号／分类contentKey启用实际几何测量：保留前置分类、长名完整可见优先、首尾限界、原生scrollLeft重新激活及异步失效守卫。后续C229固定「全部」后，测量只参考右侧滑动内容，不把固定首项计入前置格数。其他分类栏不启用偏移，业务状态与两个列表滚动保持。

类型检查、habit-time-periods四尺寸360／375×667／430／768及build:preview通过；覆盖分区宽度、独立滚动、时段切换、原筛选／拖动重试和账号隔离。375px分区截图已目视，18页bootstrap、88源／19输出样式及主包预算通过。现有toolbars检查增加实际滚动偏移／首尾与手动滑动后回位场景，预览适配器补齐scrollLeft；微信开发者工具／真机未实测。日志habit-row-periods.log／habit-row-build.log。

toolbars同四尺寸通过，覆盖十页共享调用处、长分类完整显示、首尾可达及一格半定位；手动横滑后返回首项、重复目标及末项限界均通过。375px分类选中位置截图已目视，日志habit-row-categories.log。

## 便签按所选颜色显示（C220）

MemoFieldsLayout增加color参数，memoColorStyle统一从原六色surface／value派生背景／强调色变量；列表整卡、创建编辑／阅读正文与EntryPreview同源。共用正文样式拥有底色及边框，不改Markdown渲染。列表日期／摘要／标签提高对比，六色上的四项文字最低对比约9.10／5.62／6.07／4.84:1；置顶使用同色细边，不覆盖卡片底色。原颜色键、实体ID、草稿、筛选和队列保持。

类型、memos四尺寸360／375×667／430／768及build:preview通过，覆盖颜色选择保存、列表／阅读、原图片、置顶／删除重试与账号隔离；18页bootstrap和主包预算通过。375px列表、创建和阅读截图已目视。沿用原检查，没有新增低影响样式测试；日志memo-colors-memos.log／memo-colors-build.log，微信开发者工具／真机未实测。

entry-creation同四尺寸也通过，覆盖类型切换、滑动快照、草稿恢复、原字段互通、稳定ID与账号隔离；375px共用创建选色截图已目视，日志memo-colors-creation.log。

## 弹窗末行按钮到底部留白统一（C219）

审计全部小程序弹窗底栏及父容器，统一--popup-actions-bottom-space:8px。SheetActions与PopoverActions共用，浮动ChoicePopover及tabBar拥有安全区边界，其他贴底窗口取max(8px,安全区)。独立图标库、专注选择、格言、饮食、习惯打卡提示、选境自定义和成长编辑／目标接入SheetActions，取消重复底部padding／margin；便签删除用PopoverActions，阅读及专注设置清理旧覆盖。饮食保存显式width='fill'保持原全宽，原按钮动作与数据保持。

类型及build:preview通过，88份源样式／19份生成样式、18页bootstrap与主包预算通过。sheet-footers、mottos、meals、pomodoro、memos、home-shortcut-library、daily、choose、growth、schedule-time、tag-row-spacing十一组四尺寸360／375×667／430／768通过；包含原生tabBar与普通详情宿主、模拟34px安全区、大小窗口、全部迁移的独立底栏及原交互。375px格言／饮食编辑截图已目视，底部8px及全宽保存正常。沿用现有检查，没有新增低影响样式测试；日志popup-edge-*.log，输出ui-preview-popup-edge-*。微信开发者工具／真机未实测。

## 便签内容下方独立置顶符号（C218）

MemoFieldsLayout的可选pin插槽在正文后渲染右对齐独立行，MemoReader用原PinSymbol／40px ChoiceButton替代颜色行里的置顶文字状态，并接收onPin／pinDisabled。便签页调用原pin(note)，沿最新原记录切换置顶、原ID与保存队列保持；账号／忙碌／图片／删除保护复用，点击保持窗口打开。

类型检查、memos四尺寸360／375×667／430／768及build:preview通过，覆盖阅读内置顶／取消、仅符号、其他便签不变、原正文／图片／标签／ID完整、创建编辑、删除同目标重试及账号隔离；18页bootstrap与主包预算通过。375px长正文窗口置顶截图已目视，日志memo-reader-pin-ui.log／memo-reader-pin-build.log，输出ui-preview-memo-reader-pin。本轮未进行微信开发者工具或真机验收。

## 弹窗单行底部按钮无分隔线（C217）

SheetActions取消上边线，PopoverActions默认separator=false；图标库／专注选择的独立footer和成长编辑／目标的单行footer同步。清理习惯、任务、便签、领域表单及日期设置的旧边线颜色覆盖，原布局及保存守卫保持。现有sheet-footers的日期按钮栏断言改为无边线，不新增低影响样式测试。

类型检查、build:preview及sheet-footers／tag-row-spacing／home-shortcut-library／pomodoro四组四尺寸360／375×667／430／768通过，覆盖底栏、模拟34px安全区、小窗口、图标库与事项选择，18页bootstrap及主包预算通过。375px日期窗口截图已目视确认按钮上方无分隔线。日志为miniprogram/test-results/popup-actions-*.log；未进行微信开发者工具或真机验收。

## 编辑窗口标题统一复用（C216）

新增EditorHeading，统一原习惯标题30rpx／600／1.4及18／32／6rpx内距，title／actions／caption插槽与embedded变体组合原内容。HabitEditor、任务／便签页、HomeShortcutEditor、DomainDefinitionEditor、DomainRecordEditor、领域目标Sheet、格言／饮食表单、GrowthGarden与专注设置接入；清理各页面重复标题定义。内嵌表单取消父顶部内距，原横向内距通过公开变量抵消；旧领域只读习惯Header样式限定非EditorHeading，创建类型切换栏继续自身布局。原关闭／保存／删除、草稿、账号队列与滚动不变。

类型检查与build:preview通过，88份源样式／19份生成样式、18页bootstrap及主包预算通过。home-shortcut-library、record-edit、sheet-footers、domain-management、todos、memos、meals、mottos、growth及pomodoro十组四尺寸360／375×667／430／768通过，覆盖各实体编辑、习惯两宿主、安全区、失败重试、原ID、保存／删除及账号隔离；375px快捷方式／记录／饮食截图已目视。领域管理旧「删除最右」断言同步C213创建入口，待办旧筛选标题选择器和操作宽度顺序同步C184，未改业务。未新增低影响样式测试。本轮未进行微信开发者工具或真机验收。

## 快捷方式编辑移除上下分隔线（C215）

HomeShortcutEditor样式仅取消is-single标题下边线和六色区底边线，名称栏下划线、原内距与其他窗口保持。现有颜色分隔断言同步新规则，不新增测试或业务状态。

home-shortcut-library四尺寸360／375×667／430／768及build:preview通过，原即时保存／重试、选择替换、窗口高度／34px安全区和包预算保持；375px截图已目视确认上下分隔线省去。仅CSS改动，本轮未进行微信开发者工具或真机验收。

## 快捷方式编辑预览置顶（C214）

HomeShortcutEditor仅把原home-editor-preview／HomeShortcutCard移到单卡home-editor-fields第一项，名称／图标与颜色设置依次在下；原CSS、分隔线、尺寸和即时保存不变。现有窗口留白断言改为末行颜色之后的内距／安全区，并确认预览在名称前。

类型、home-shortcut-library四尺寸360／375×667／430／768及build:preview通过，覆盖即时保存、失败同目标重试、选择／替换、34px安全区和无页脚留白；bootstrap及包预算通过。375px置顶预览截图已目视。本轮未进行微信开发者工具或真机验收。

## 领域详情右上创建记录（C213）

详情通过PageToolbar最右create插槽复用CreateButton secondary／compact「＋创建记录」，与原返回及编辑／删除保持同排；createRecord统一新按钮与原栏空白入口的守卫和DomainQuickRecord打开。EntryComposer初始化明确initialDomainId时，仅替换未提交进展草稿领域，正文／类型／ID及图片保留；pendingSave不替换，原目标重试优先，其他无明确领域入口不变。

类型及小程序build:preview通过，bootstrap与主包预算通过。progress-creation和domain-recent-records各四尺寸360／375×667／430／768通过，覆盖右上按钮加号、至少40px／同排无溢出、自动选择当前真实／未分类领域、恢复异领域草稿保留双框内容／类型／ID，以及从另一个详情进入时仍重试原已提交领域和绝对目标；原原子保存、旧草稿、账号和未分类续接保持。本轮未进行微信开发者工具或真机验收。

## 记录移除栏标题与插图入口（C212）

领域详情复用DomainRecordColumn showHeading=false，去掉原正／负标题整行，与最近记录统一直接显示正文。MarkdownNoteEditor增加默认开启的showImageInsertion参数，关闭时不显示图片按钮且同步禁止插入；ProgressEditorFields与DomainRecordEditor显式关闭，EntryComposer删去进展插图能力参数，EntryPreview同步。任务备注／便签默认行为不改，旧记录／草稿图片、移除／预览及业务校验保持。

类型、domain-record-edit-data及progress-draft通过。record-edit、progress-creation、domain-preview、entry-clear-focus及domain-recent-records各四尺寸360／375×667／430／768通过，覆盖无标题及无插图入口、只读滑动快照、旧图草稿恢复／保存、原ID／日期／原子批次、失败同目标重试、账号隔离、未分类续接、首屏几何及任务／便签图片守卫。旧插图测试改为恢复真实格式旧图草稿，原标题按钮断言改为保留的栏空白创建；标题移除后无需滚动即可显示完整历史的尺寸不强制滚动。375px记录区与创建双框截图已目视，未留下标题／图片按钮占位。

小程序build:preview通过，原生页面bootstrap、共享样式与主包预算检查通过；本轮未进行微信开发者工具或真机验收。

## 第二屏未分类领域卡（C211）

领域主列表先排除未分类再取前八张普通卡，其余普通卡与未分类续接在原PageScroll外层。普通／系统卡共用entryCard及DomainProgressSummary，未分类无移动入口，排序只交换普通领域槽位，真实来源中的未分类ID／位置／全部内容保留。domain-display提供空卡只读投影、旧ID复用及冲突避让，浏览不写；详情uncategorized路由使用同一投影，目标明确保存才按原容量物化，进展仍原未分类保存器，习惯准备／保存坚持真实来源，不把虚拟ID写入其他习惯。alignHabitDisplayDomain只读聚合无关联及已删除领域习惯，原alignHabitDomain业务映射保持，详情与完成数同源。

类型、domain-data、habit-edit及domain-completion通过，覆盖投影不改存档、旧未分类ID、ID冲突、24项容量、原计数／时区和习惯历史。domain-recent-records、domain-preview和domain-management各四尺寸360／375×667／430／768通过：第二屏位置、首屏八张普通卡、少于八张及空存档不补造普通卡、旧ID／记录读取不写、新习惯不产生虚拟关联、进展／目标保存刷新、未分类保护、普通卡排序跳过系统槽位、失败同目标重试、原领域创建／编辑／删除、共享习惯绑定和账号隔离。旧首屏／创建占位／空卡断言按新规则同步，375px第二屏截图已目视。

最终隔离预览构建、87源码／19产物样式、原生启动／首页契约和1.5MB预算通过，主包1,348,165字节。日志test-results/domain-uncategorized-{ui,preview-ui,management-ui,build}.log，截图ui-preview-domain-uncategorized／ui-preview-domain-uncategorized-preview／ui-preview-domain-uncategorized-management；微信开发者工具／真机未运行。P05固定系统ID／不占名额的存档迁移仍未实施。

## 领域负记录预览（C210）

隔离预览工厂新增extendNegativeRecordPreview，仅追加成长／工作／生活／自媒体四条普通文本负记录，时间为初始化前30／60／90／120秒，stable preview-v4 ID。原八域正记录最新约7分钟以前，新完整预览原合计十条中为四负六正。初始化页增加独立v4标记，不重跑已完成v2／v3升级，先校验候选再写入、标记最后保存；跳过已删除领域，原记录／目标／习惯及pending保持，重复ID不改日期，后续删除不恢复。

类型、domain-preview及domain-recent-records-data通过，新增覆盖旧编辑／删除、移除领域、只改隔离领域缓存、pending／revision、无账号API、记录和标记写失败后稳定ID重试、最近十条正负共存与删除不补回。实际domain-preview四尺寸360／375×667／430／768通过，验证初始四负六正、详情完整负记录、创建／编辑／删除／重开及v3留言翻页、普通账号／草稿隔离；375px领域首页截图已目视。隔离预览构建、87源码／19产物样式、原生启动／首页契约和1.5MB预算通过，主包1,346,904字节、预览分包24,388字节。日志test-results/domain-negative-preview-{ui,build}.log，截图ui-preview-domain-negative-preview；微信开发者工具／真机未运行。

## 首页目录与快捷选择复用（C209）

新增homeFeatureCatalog唯一提供17项稳定key、名称、类型、默认颜色、tab和原图库icon；home-shortcuts的shortcutCatalog引用它，shortcut-icons移除重复默认映射，home-features仅兼容重导出，原未使用溢出合并及目录名称别名删除。HomeFeatureList用navigation／selection变体、optionState和onChoose复用SectionTitle／ShortcutIcon与共享按钮，统一两列、24px彩色图标、等宽行及字号行高。首页与HomeShortcutEditor移除原重复目录节点／CSS，选择按功能分组，不跟随自定义卡片名和rank重排定义；rank仍在右侧显示。原16键保持，新增可选pomodoro-page仅打开番茄钟，首页目录补齐growth；默认六项、version1、本机设备键、自定义外观及保存／取消／重试规则保持。

类型、home-shortcuts及64图库资源／线稿检查通过；home-shortcut-library与home-navigation各四尺寸360／375×667／430／768通过，新增断言验证两处17项名称／图标／类型完全一致、两列等宽、禁用与选中、长列表底部可达、取消不写、确认替换后刷新及仅打开番茄钟不启动。原即时保存、旧图标只读、外观及移动保留、失败同目标重试与首页创建／导航／开始或继续计时回归保持。375px顶部及列表底部、首页目录截图已目视，无渲染错误或水平溢出。

初次构建发现源project.config.json的es6／enhance为true，与既有check-weapp-project约定冲突；仅恢复这两项false，其余配置不改。重建隔离预览、87源码／19产物样式、原生启动／首页契约和1.5MB预算通过，主包1,346,904字节。日志test-results/shared-feature-{list-ui,navigation-ui,list-build}.log，截图ui-preview-shared-feature-list／ui-preview-shared-feature-navigation；微信开发者工具／真机未运行。

## 开始番茄钟默认图标核对（C208）

当前shortcut-icons的featureIcons.pomodoro已使用focus，原图库标签为「专注」。makeShortcut显式保存library:focus；ShortcutIcon及ShortcutBackground缺省读取defaultShortcutIcon，首页卡片、编辑名称图标／预览及完整功能目录复用同源映射，无需修改业务代码或迁移有效自定义图标。本轮补充确认文档，未修改运行时代码。

home-shortcuts及shortcut-icons逻辑／64彩色资源与线稿检查通过；home-shortcut-library四尺寸360／375×667／430／768回归通过，原即时保存、选择与搜索、旧值兼容、替换／排序和失败同目标重试保持。日志test-results/pomodoro-default-focus-ui.log，截图ui-preview-pomodoro-default-focus。本轮未重复构建，微信开发者工具／真机未运行。

## 进展正负按钮配色（C207）

ProgressRecordField为原ChoiceButton增加is-positive／is-negative样式变体，通过公开control变量设置轻底色、选中加深底色及边框；文字分别复用领域详情的#aecabb／#c4b1ad。两项domain文本色移到app.css的page统一声明，领域主题不再重复定义；详情与最近记录颜色保持，创建和只读预览共用选择组件，原等宽40px、独立正负选择及保存逻辑不改。

类型检查、progress-draft逻辑及progress-creation／domain-recent-records四尺寸360／375×667／430／768回归通过，覆盖双框独立选择、原子保存、原目标重试、账号隔离与领域颜色／布局。375px实际截图已目视，按钮选中与未选中均清楚。隔离预览构建及1.5MB主包预算通过，主包1,348,218字节；日志test-results/progress-sign-colors-{ui,build}.log与progress-sign-domain-colors-ui.log，截图ui-preview-progress-sign-colors／ui-preview-progress-sign-domain-colors。微信开发者工具／真机未运行。

## 快捷编辑即时保存与紧凑窗口（C206）

HomeShortcutEditor单卡patch使用同步latestItems ref计算新目标，在React状态更新函数外调用原onSave(target,false)；首页saveShortcuts返回布尔结果，沿persistShortcuts原本机存储并保持窗口，不逐字弹成功Toast。保存失败保留同一个绝对目标和输入，锁定其他编辑并用ResetSymbol／40px ActionButton重试；关闭仍失败不丢弃目标。未编辑的打开／关闭、图库搜索分类与退出不写；实际修改才转换旧icon，名称空白保存默认名且预览同步，输入不被强制归一化。选择／替换仍原SheetActions确认，不改rank／其他卡或设备键。

单卡不渲染底部取消／保存，取消固定380px和旧伸缩空白，外框按内容高度；预览后普通12px／短屏8px加安全区，超出从原ScrollView内部查看。类型与home-shortcuts逻辑通过；home-shortcut-library四尺寸360／375×667／430／768通过，覆盖逐字名称、六色／图库选择立即持久化、关闭／重开／刷新恢复、不编辑不写、旧键只读／实际修改转换、失败保留原存档／原目标重试、错误清除继续编辑、替换确认和移动保留外观。无页脚、无额外留白及34px安全区已测；375／768实际截图已目视，无渲染错误或水平溢出。旧完整快捷工作流仍为历史手动保存断言，未运行其组合。

隔离预览构建、86源码／19产物样式、原生启动／首页契约及1.5MB主包预算通过，主包1,347,690字节。日志test-results/shortcut-autosave-{ui,build}.log，截图ui-preview-shortcut-autosave；微信开发者工具／真机未运行。

## 快捷编辑移除删除按钮（C205）

HomeShortcutEditor移除单卡标题删除按钮及DeleteSymbol导入，原关闭和保存／取消、图库分层、替换／完整选择保持，无新增样式或状态。类型与home-shortcut-library四尺寸360／375×667／430／768回归通过，原图标选择／搜索、分层关闭、保存取消／重开、替换／移动及旧值兼容保持；375px截图已目视，标题仅关闭。隔离预览构建、样式／原生启动／首页契约与1.5MB预算通过，主包1,346,431字节。日志test-results/shortcut-no-delete-{ui,build}.log，截图ui-preview-shortcut-no-delete；旧完整快捷组合未运行，真机未测。

## 轮播设置单行保存（C204）

格言页轮播设置的PopoverActions删除取消节点，唯一保存按钮显式primary／compact／fill全宽；使用原共享组件，无新样式或业务状态，右上关闭／外部关闭不提交及原秒数保存守卫保持。类型与motto-data通过，mottos四尺寸360／375×667／430／768通过：无取消、单个保存占满操作行、40px触控、错误不移动按钮、关闭／外部关闭不保存、持久化／失败重试、账号隔离及实际首页轮播保持。375px实际截图已目视。隔离预览构建、86源码／19产物样式、原生启动／首页契约与1.5MB预算通过，主包1,346,693字节。日志test-results/motto-full-save-{ui,build}.log，截图ui-preview-motto-full-save；微信开发者工具／真机未运行。

## 进展普通文本（C203）

MarkdownNoteEditor新增format变体，默认markdown保持，plain直接复用原Textarea、字数、图片工具、密度／聚焦与图片异步账号／记录守卫，隐藏模式切换且跳过渲染；ProgressEditorFields双框和DomainRecordEditor使用plain，EntryPreview同步只读快照。DomainRecordContent以format组合Text／RichText，普通Text的pre-wrap、继承字号颜色及1.65行高由共享样式拥有；DomainRecordCard统一plain，主列表最近记录及详情同步，MemoReader仍默认Markdown。无业务schema、新存储或旧内容迁移，旧标记作为字面文本保留。

类型、progress-draft及domain-record-edit-data通过。progress-creation、record-edit、domain-recent-records、memos及todo-display四尺寸360／375×667／430／768通过：无进展模式栏、原样标题／强调标记与换行、共享双框正负选择／标题互通、只读滑动快照、原子批次保存、旧草稿恢复、图片、原ID／日期、失败同目标重试和账号隔离；任务／便签默认Markdown预览与阅读保持。最近记录内部滚动、八卡首屏、更多领域外层续接、同源字号颜色及原序保持。375px进展实际截图已目视，无渲染错误或水平溢出。旧领域详情／预览脚本的Markdown节点断言同步为普通文本，未另跑其完整组合。

正常／隔离预览构建、86源码／19产物样式、原生启动／首页契约及1.5MB主包预算通过，主包1,346,272／1,346,693字节；最终保留隔离预览。日志test-results/progress-plain-{ui,edit-ui,recent-ui,memo-ui,todo-ui,normal-build,preview-build}.log；截图ui-preview-progress-plain及同前缀edit／recent／memo／todo。微信开发者工具／真机未运行。

## 备忘录一行六色色点（C202）

ColorChoiceRow统一拥有六列等宽选项、6px间距、20px圆形色点及ChoiceButton的40px触控和选中勾号／高亮；className／dotClassName保留快捷方式色变量和局部布局。HomeShortcutEditor删除重复色点结构／样式，MemoColorChoices封装memoColors并用于创建／编辑与EntryPreview静态变体。旧颜色入口、浮窗状态及两行文字色板删除，置顶继续右侧，原分隔及底栏保持；静态快照使用View，不新增原生输入或业务回调。

原五色追加mint薄荷（#b9dbca），原MemoColor校验、筛选和阅读自动同源支持，不迁移或补写旧记录。API只读核对确认原JSON存档可接受，后端不改；网页仍五色且其旧校验不接受mint记录，跨端颜色支持未在本轮实施。原版本、ID、账号草稿与保存队列保持。

类型检查、personal-tools／entry-tags／progress-draft逻辑通过。memos与home-shortcut-library四尺寸360／375×667／430／768通过：六色同排等宽、6px间距、40px触控、无色名、选中不移动几何，原创建／编辑／图片／标签／置顶／筛选／只读阅读与快捷方式保存取消保持；新增薄荷在原ID保存后阅读与重新编辑正确恢复。375px创建与编辑截图已目视。正常／隔离预览构建、86源码／19产物样式、原生启动／首页契约及1.5MB预算通过，主包1,345,723／1,346,179字节；最终保留隔离预览。日志test-results/memo-color-row-{ui,shortcut-ui,normal-build,preview-build}.log；截图ui-preview-memo-color-row与ui-preview-memo-color-row-shortcut。微信开发者工具／真机未运行。

entry-creation完整四尺寸回归也通过：共用创建、任务／备忘录字段与优先度互通、只读滑动预览、草稿恢复、图片、正负双框原子保存及账号守卫保持。日志test-results/memo-color-row-entry-ui.log，截图ui-preview-memo-color-row-entry。

## 快捷方式任务式编辑与统一图标（C201）

EntityTitleRow／EntityTitleInput统一拥有任务名称行的下划线、min(38rpx,24px)字号及高度；任务原输入及静态EntryPreview共用，旧className、字段Props、聚焦和保存行为保留。HomeShortcutEditor依次组合40px彩色图标＋大字号名称、无标题六色／1px分隔、原共享卡预览，省去独立背景行和名称／背景／颜色标题；图标打开时收键盘，原顶层关闭、草稿及SheetActions保持，单卡窗口380px。

shortcut-icons为所有功能分配现有64库ID，ShortcutIcon仅组合LibraryIcon colored／outline，固定16目录也用彩色源。旧48键只留读取映射、normalizeShortcutIcon返回library:合法值；读取和取消不写，实际保存才转换，原名称／颜色／rank／空布局及默认升级、替换／移动保持。删除旧生成器、旧图集渲染和闲置选择器CSS。113旧散图／图集PNG逐文件核对无源码或配置引用、SHA256清单校验后删除，再仅删除确认为空的目录；未改原64彩色资源或线稿源。

最终类型、home-shortcuts逻辑（16默认、64新键、48旧别名幂等及不变输入、空号、替换、非法路径）、shortcut-icons资源及icon-library-data原图／同源线稿校验通过。home-shortcut-library、home-navigation、entry-creation和todo-display四尺寸360／375×667／430／768均通过：名称字号／下划线／图标同排、40px触控、六色与分隔、选择分类／搜索、顶层关闭／Escape、取消／保存／重开、替换／移动、旧值只读及取消不补写，16目录加载／导航与共用任务真实表单／只读快照／账号守卫保持。375px短屏和768px实际截图已目视，无渲染错误或水平溢出。

正常／隔离预览构建、85源码／19产物样式、原生启动／首页产物契约及1.5MB预算通过，主包1,345,158／1,345,579字节，最终保留隔离预览。契约明确无旧图集资源或渲染分支。日志test-results/shortcut-task-layout-{typecheck,ui,navigation-ui,entry-ui,todo-ui,normal-build,preview-build}.log；截图ui-preview-shortcut-task-layout、ui-preview-shortcut-library-navigation、ui-preview-shortcut-title-entry、ui-preview-shortcut-title-todo。旧完整home-shortcuts组合未重跑，直接旧字段／图标断言已同步并检查语法，C199所记旧添加入口问题仍在该旧组合中；微信开发者工具／真机未运行。

## 习惯自由与时段双列表（C200）

习惯页领域「全部」组合HabitListSection／HabitListHeading：自由标题及列表、四项等宽CategoryRow及当前时段列表分别占一半余高，标题固定、各自上下滚动，移除折叠状态；具体领域仍使用原平铺ScrollView。提醒区明确加「提醒」标题，与主列表同用两侧各扩2px布局变量。HabitCard基础上下各增加4px、总高增加8px，主列表／提醒／领域详情同步，公开CSS变量可局部覆盖。

useHabitGridSort按可选scrollIdForItem测量／锁定／自动滚动源窗，scrollTopFor／onScrollFor隔离两窗；上下文、ID与最终落点守卫保留，同组移动只替换原可见槽位，隐藏时段及原持久化／失败绝对目标重试保持。时段选择仅会话，默认／切账号时段现按C262读取本地当前时间，状态预览无重复滚动ID且只读，不改时段存档、历史或业务schema。

类型检查、习惯排序／删除逻辑、habit-time-periods及habit-category-swipe专项四尺寸360／375×667／430／768通过：新密集样本覆盖两窗独立滚动、固定40px同宽标题、切时段保留自由位置／下窗归零、两窗边沿拖动隔离、同组保存／失败重试、筛选只读及原两宿主编辑和账号守卫。domains四尺寸完整回归通过，2×2习惯分页、第二页与详情／编辑／补记保持，375px主列表和领域详情截图已目视。测试fixture为各流程独立提供习惯与领域，防止先前单领域样本污染。

daily完整四尺寸回归通过，涵盖月留言分页、双窗／筛选／状态横滑、归档恢复及失败重试、排序持久化及边沿屏外落点、完成／撤销／留言／补记、跨页同源、创建编辑、删除与日历账号守卫，无渲染错误或水平溢出。原工作流同步当前窗选择器、双窗空态与显式时段切换，读取真实本机存档；合成拖动使用实际touchend位置，短屏先边沿滚动到原本屏外目标，再精确验证原ID及保存顺序，保留外层不动和业务守卫。

正常／隔离预览构建、85源码／19产物样式、原生启动及1.5MB主包预算通过，主包1,404,211／1,404,632字节，最终保留隔离预览产物。日志test-results/habit-split-{typecheck,focused-ui,swipe-ui,daily-ui,normal-build,preview-build}.log及habit-card-roomy-domains-ui.log，截图ui-preview-habit-split-focused、ui-preview-habit-split-daily、ui-preview-habit-card-roomy-domains；微信开发者工具／真机尚未运行。

## 快捷方式共用彩色库与灰色线稿（C199）

LibraryIcon新增colored／outline变体；ShortcutIcon用library:前缀解析同一64库ID，旧48值保留原图形；HomeShortcutEditor通过统一名称解析避免旧find断言，新背景选择组合IconLibrarySheet可配置标题／选项／关闭文案，原分类与搜索共用。快捷选择层保留Escape及外部关闭只收起顶层、保存才应用。原icon字段与版本／设备存储键保持，不批量迁移。

generate-library-outlines从web/public/habit-icons与小程序icon-library的原SVG按iconLibrary顺序生成512×512单色透明图集（30,670字节），原图层遮挡由生成期mask承接，彩色源与64PNG保持。config只打包当前使用的旧ink／muted／background图集，六个旧彩色图集仅留源产物；原固定目录视觉及六色卡背景不改。保留原预算，不以删检查或降图像颜色校验换包体。

类型检查、64新前缀与旧48逻辑、图标库像素／同源／幂等检查及旧9图集完整性通过；--icons共用图库四尺寸通过，--home-shortcut-library独立四尺寸360／375×667／430／768通过，覆盖原彩色选项、搜索／分类、顶层关闭／Escape、142px灰线、取消／保存重开／替换及移动保持同图标、无水平溢出。64项对照图及375px实际预览已目视。旧完整快捷方式回归在新段前被check-home-editor-order仍查找C177移除的「添加快捷方式」阻断，未修改旧排序脚本，不报告整套通过。正常／隔离预览构建与84源码／19产物样式、启动／首页契约及1.5MB预算通过，最终保留预览产物；微信开发者工具／真机未运行。

主要日志test-results/shared-outline-{typecheck,library-ui,normal-build,preview-build}.log、colored-outline-library-ui.log，旧失败colored-outline-shortcuts-ui.log；截图ui-preview-colored-outline-library与library-outline-preview.png。旧生成工具及逻辑检查的TS加载同步新icon-library依赖，仍能再生成旧图集。

## 习惯编辑删除按钮文案（C198）

共享HabitEditor归档旁的删除入口显示「删除习惯」，仅改Text内容，原ariaLabel、尺寸、禁用及确认回调保持。habit-time-periods四尺寸360／375×667／430／768及隔离预览构建通过，两个宿主编辑入口同步；375px截图已目视。日志test-results/habit-delete-label-{ui,preview-build}.log；微信开发者工具／真机未运行。

## 任务详情标签与操作分隔（C197）

todo-editor-actions顶部增加原任务表单1px／#3b4b56边线、12px内距，标签、按钮与底部SheetActions保持原结构及业务回调。本轮仅CSS及规则文档，无数据逻辑修改。

todo-display独立四尺寸360／375×667／430／768通过；临时截图步骤在原有效任务fixture中打开详情、滚动到操作组，四尺寸实际边线1px／rgb(59,75,86)、内距12px，375px截图已目视，临时脚本已移除。完整todos组合回归在360px已完成任务排序／备注／日程／编辑／工作流／提醒／卡片显示后，于check-product-improvements.cjs的旧筛选布局选择器取空而失败；与此CSS修改无关，本轮未扩大修改旧筛选测试，也不报告整套通过。隔离预览构建、84源码／19产物样式、启动及包体预算通过，主包1,491,807字节；未运行微信开发者工具／真机。日志test-results/todo-tags-divider-{ui,display-ui,detail-ui,preview-build}.log，实际详情截图ui-preview-todo-tags-divider-detail。

## 习惯时段独立设置行（C196）

HabitEditor顶部仅保留全宽DomainChoiceField，原时段SingleChoiceField移到备注下方独立设置行，compact／content、左对齐；设置行12px间距和分隔线由共享CSS拥有。习惯页及领域详情同步，未改字段、推断或保存逻辑。

类型检查与habit-time-periods四尺寸360／375×667／430／768通过，原字段几何回归同步独立行，覆盖两个宿主领域全宽、时段左对齐／40px触控、真实节点顺序，以及原创建编辑、取消、保存／重试与账号隔离。两个宿主375px截图已目视。普通／隔离预览构建、84源码／19产物样式、启动与1.5MB主包预算通过，主包1,491,340／1,491,761字节；最终保留预览产物。日志test-results/habit-period-settings-{typecheck,ui,normal-build,preview-build}.log，截图ui-preview-habit-period-settings；微信开发者工具／真机尚未验证。

## 习惯详情编辑与标题排版（C195）

habit-calendar新增HabitDetailHeader，习惯页和领域详情组合原图标／背景、可展开名称、领域和原优先度色表旗帜；右上编辑／关闭40px、2px间距，保留原回调及禁用，底栏仅原全宽完成操作。旧页面头部样式移除，共享名称／领域间距6px，备注间距增加，首选672／696px及按视口12／8／4px边距；短屏图例上下6px、其他8px，日期仍固定40px。长摘要保持原截断／展开，统计只读日历不使用详情头部。

类型及sheet-footers四尺寸360／375×667／430／768、额外430×720和模拟34px安全区检查通过：两处详情右上按钮顺序、40px同排／2px间距、底栏无编辑、名称／领域6px、填色／轮廓旗实际颜色；长名称／备注展开及收起、六行日期、统计和日志标题默认可见、留言滚动、底栏与原编辑取消保持，存档无写入。daily完整四尺寸回归通过，覆盖筛选／横滑、时段／排序拖动、创建编辑／归档、删除重试、打卡／历史及补记守卫。375px普通／长摘要截图已目视。回归里原从底栏点击编辑的步骤迁移到详情头部，图例检查支持短屏6px。

普通／隔离预览构建、84源码／19产物样式、启动／首页契约及1.5MB主包预算通过，主包1,491,238／1,491,659字节，最终保留预览产物。日志test-results/habit-detail-header-{typecheck,ui,daily-ui,normal-build,preview-build}.log，截图ui-preview-habit-detail-header及对应工作流目录；微信开发者工具／真机尚未验证。

## 便签删除管理符号（C194）

便签功能栏原ManageSymbol替换为已有DeleteSymbol，无障碍名称改为「管理便签删除」，ChoiceButton iconOnly／compact、原managing与禁用条件保持；无需新增图形、样式或状态。相关回归选择器同步名称。

类型与memos完整四尺寸360／375×667／430／768通过，现有阅读检查验证入口使用共享删除图形、旧设置图形消失，原模式切换、卡内删除显示、阅读编辑、确认／取消／失败重试及账号流程保持；375px管理截图已目视。图标库与共用创建关联脚本仅同步名称，本轮未重跑该两个完整组合套件。隔离预览构建、84源码／19产物样式、18页启动／首页契约、主包预算通过，主包1,491,198字节。日志test-results/memo-delete-management-{typecheck,ui,preview-build}.log，截图ui-preview-memo-delete-management；微信开发者工具／真机尚未验证。

## 习惯筛选统一与日历归统计（C193）

习惯筛选组合ChoicePopover、PopoverHeading、SingleLineInput、ChoiceButton与新增FilterActions；便签底栏也复用FilterActions并省去重复CSS。关键词搜索名称／备注／领域，状态与领域单选，时段／优先度多选按组内或、组间与；实时数量、选项保持打开、筛选关闭、重置恢复进行中并清空其他条件，排序保持。原账号变化清空及拖动／横滑上下文加入新条件。习惯页旧周日历及专属状态／列表移除，统计已有HabitCalendar标题明确为打卡日历，原详情补记保持。

类型、habit-time-periods（含新增关键词、同组多选、组间组合、实际匹配卡片与数量、重置40px／6px间距／同排、关闭重开、统计原打卡／留言和存档无写入）、memos、toolbars及habit-calendar-edit四尺寸360／375×667／430／768通过；daily完整四尺寸回归也通过，覆盖留言分页、时段分组、横滑、归档、排序／拖动、创建编辑、打卡／历史、删除及补记守卫。原筛选助手与功能栏／屏幕／归档／排序／工作流步骤同步底部确认和移除日历入口；旧工作流历史操作改为详情补记及统计只读月历，纯排序fixture显式自由以隔离C190推断，首页排序入口及冷启动时段顺序断言同步已确认规则。375px筛选截图已目视。

普通／隔离预览构建、84源码／19产物样式、启动／首页契约及1.5MB主包预算通过，主包1,490,777／1,491,198字节；最终保留预览产物。日志test-results/habit-filter-{typecheck,ui,memos-ui,toolbars-ui,calendar-ui,daily-ui,normal-build,preview-build}.log，截图ui-preview-habit-filter及对应后缀目录；微信开发者工具／真机尚未验证。

## 习惯时段标题减小字号（C192）

SectionTitle新增standard／compact字号变体，默认14px，compact共用12px变量；习惯列表时段分组选择compact，600字重、原颜色及40px展开区域保持。共享小标题检查识别字号变体，原时段回归检查改为验证实际12px。

类型检查、habit-time-periods完整四尺寸360／375×667／430／768通过，验证字号、触控、展开收起以及原分组排序／拖动重试／创建编辑和账号隔离；375px截图已目视。普通／隔离预览构建、83源码／19产物样式、启动／首页契约及主包预算通过，主包1,491,832／1,492,253字节，最终保留预览产物。日志test-results/habit-period-title-{typecheck,ui,normal-build,preview-build}.log，截图ui-preview-habit-period-title；微信开发者工具／真机尚未验证。

## 横向分类栏统一粗体（C191）

共享ChoiceButton的category变体新增--category-font-weight: 700，CategoryButton所有页面／弹窗调用处同步，选中与未选中字重一致。原13px字号、配色、间距和至少40px触控保持，普通按钮字重不变。

类型检查与原toolbars完整四尺寸360／375×667／430／768回归通过，覆盖十个页面的功能栏、分类字体、长名称单行／不裁切、末项横向访问、切换前后边界稳定及原筛选／入口交互；375px习惯分类截图已目视。普通／隔离预览构建、83源码／19产物样式、启动／首页契约及主包预算通过，主包1,491,635／1,492,056字节，最终保留预览产物。日志test-results/category-bold-{typecheck,ui,normal-build,preview-build}.log，截图ui-preview-category-bold；微信开发者工具／真机尚未验证。

## 习惯自动时段与卡片加宽（C190）

共享habitTimePeriod对缺省字段按名称／备注明确时间和常见惯例先自动分类，合法手动选择含自由始终优先，模糊／多时段保留自由，非法仍防御回退；只读不修改存档，原编辑保存沿用当前时段及原队列。习惯页及领域详情组合新增HabitGrid，两列4px列距、原行距由CSS变量保留；主列表每侧扩2px，375px主卡约168.5→171.5px，工具栏／分类栏及图文触控保持。

类型、habit-order（20个推断／优先／自由／非法案例及原排序／历史）、habit-edit和原隔离预览初始化检查通过。现有habit-time-periods完整四尺寸360／375×667／430／768通过，覆盖原分组排序、折叠、长按移动／重试、编辑／新建、账号及历史保留；新增验证实际网格比工具栏宽4px／每侧2px、4px列距，以及未设时段的名称／备注分类、手动自由保持、领域详情同源和完整存档无写入。375px截图已目视。新增自动分类场景最初沿用前一场景会话缓存，改为独立重载后又补齐工具fixture，最终四尺寸通过；未修改业务实现以适配该初始化问题。

普通／隔离预览构建、83源码／19产物WXSS、原生启动和首页渲染守卫、1.5MB主包预算通过，主包1,491,576／1,491,997字节。最终保留预览产物；日志test-results/habit-auto-period-{typecheck,logic,edit,preview-data,ui,normal-build,preview-build}.log，截图ui-preview-habit-auto-period；微信开发者工具／真机尚未验证。

## 便签筛选摘要重置符号（C189）

便签已应用筛选摘要栏右侧原文字按钮改为原ResetSymbol／compact图标ActionButton，无障碍名称「重置便签筛选」，保留40px方形触控与右侧位置；局部只保留宽度／flex／margin。原clearFilters不变，不改空结果区其他入口。

类型、memos完整四尺寸360／375×667／430／768回归通过，原摘要清除步骤新增无文字／共享符号／40px实际边界检查，点击后摘要消失、筛选高亮恢复且全量便签再次显示；原多选、阅读／编辑、图片、删除重试和账号流程保持。普通／隔离预览构建、82源码／19产物WXSS、原生启动与首页渲染守卫、主包1.5MB预算通过，主包1,490,056／1,490,477字节。日志test-results/memo-summary-reset-{typecheck,ui,normal-build,preview-build}.log，截图ui-preview-memo-summary-reset。最终保留预览产物；微信开发者工具／真机尚未验证。

## 便签筛选多选与或逻辑（C188）

便签页会话标签和颜色改为数组，原filtered使用标签some／颜色includes实现组内或，组间与关键词仍共同约束。原ChoiceButton支持多选高亮及再次取消，空表示全部；分类、摘要、结果数量与滚动上下文同步，分类栏仍单标签替换。重置、账号变化清空与排序规则保持，不新增存储。

普通／隔离预览构建、82源码／19产物WXSS、原生启动和首页渲染守卫、1.5MB主包预算通过，主包1,490,056／1,490,477字节，便签分包34,215字节。构建日志test-results/memo-filter-multiselect-{normal,preview}-build.log；最终保留预览产物。

类型及现有memos完整四尺寸360／375×667／430／768回归通过，新增验证同时两个标签／两个颜色的真实并集结果、数量和置顶顺序、组间与关键词组合、逐项取消／取消最后项、全部只清本组、关闭重开保留、分类单标签替换、摘要／高亮／重置、筛选不写便签存档。原阅读／编辑恢复／图片／删除重试及账号回归保持；375px多选截图已目视。日志test-results/memo-filter-multiselect-{typecheck,ui}.log，截图ui-preview-memo-filter-multiselect；微信开发者工具／真机尚未验证。

## 便签操作对齐与阅读编辑入口（C187）

卡片将常显置顶与管理时删除组合进同一居中操作组，40px按钮、2px间距，旧卡内编辑移到MemoReader右上关闭左侧；阅读通过onEdit／editDisabled调用原edit(note)，账号、原ID、草稿恢复和保存逻辑不变。原三个场景的外伸memo-pin-mark及位移补偿改为共享20px PinSymbol，表单置顶显式指定compact。阅读仍无输入或记录写入。

类型检查、memos及icons现有完整四尺寸360／375×667／430／768回归通过：选中／未选中置顶与删除均40px、按钮同高同top、2px间距、图形实际中心一致；卡内无编辑，阅读编辑／关闭同排；未开启设置也能阅读后进入原ID编辑，输入恢复、图标选择／取消／移除、图片／只读不写存档、保存、删除失败同目标重试与账号隔离保持。原entry-creation中的便签入口步骤已同步，本轮未重跑该完整组合套件；上述memos回归覆盖原便签编辑恢复与保存。375px管理及阅读截图已目视。

普通／隔离预览构建、82源码／19产物WXSS、原生启动和首页渲染守卫、1.5MB主包预算通过，主包1,490,056／1,490,477字节。日志test-results/memo-actions-reader-{typecheck,ui,icons-ui,normal-build,preview-build}.log，截图ui-preview-memo-actions-reader及ui-preview-memo-actions-reader-icons。最终保留预览产物；微信开发者工具／真机尚未验证。

## 便签筛选重置符号与位置（C186）

便签筛选复用原ResetSymbol及PopoverActions，底栏为左40px图标重置、右伸缩查看便签，间距6px且同排。原clearFilters不变，包括关键词／标签清空、颜色全部及排序最近修改；重置保持窗口打开。现有check-memo-list按新无障碍名称查找重置，补充实际40px边界、6px间距、主按钮占余宽、无文字／共享符号及重置后输入清空／窗口保持打开断言。

类型、memos完整四尺寸360／375×667／430／768回归通过，覆盖筛选／重置及原阅读／图片／创建编辑／删除失败重试／账号隔离，375px筛选截图已目视。普通／隔离预览构建、82源码／19产物WXSS、原生启动和首页渲染守卫、主包1.5MB预算通过，主包1,489,780／1,490,201字节；日志test-results/memo-filter-reset-{typecheck,ui,normal-build,preview-build}.log，截图ui-preview-memo-filter-reset。最终保留预览产物；微信开发者工具／真机尚未验证。

## 便签阅读复用创建样式（C185）

MemoFieldsLayout通过title／body／settings／tags组合创建、编辑和只读内容，MemoIconPreview统一图标框；原编辑字段逻辑不变。阅读正文复用Markdown预览框，标签移至颜色／置顶之后，窗口原内部滚动及图片预览保持；固定SheetActions底栏使用48px全宽主按钮完成，保留安全区。只读窗口不创建草稿、不写记录。

普通／隔离预览构建、82源码／19产物WXSS、原生启动和首页渲染守卫、1.5MB主包预算通过；主包1,489,780／1,490,201字节，日志test-results/memo-reader-style-{normal,preview}-build.log。最终保留预览构建。

类型检查、现有memos完整回归在360／375×667／430／768通过：完整长标题／Markdown、图片预览、只读不写存档、外部及按钮关闭、创建／编辑、筛选、删除失败同目标重试及账号隔离。首轮读取检查通过后，既有便签列表检查因C180筛选标题从memo-sheet-heading改为memo-filter-heading而失败；本轮只更新选择器，原布局／业务断言保留，重跑完整四尺寸通过。与用户截图同内容的375px展示已目视，长内容截图亦已检查。日志memo-reader-style-{typecheck,ui,inspection}.log，截图ui-preview-memo-reader-style及ui-preview-memo-reader-style-inspection；微信开发者工具／真机尚未验证。

## 待办筛选重置符号与位置（C184）

共享manage-symbol新增ResetSymbol，待办筛选底栏改为左40px重置、右伸缩查看，PopoverActions间距6px；原筛选回调不变，删除旧双文字按钮的比例样式。相关待办检查按「重置任务筛选」查找原动作。现有toolbars四尺寸360／375×667／430／768补充无可见文字、共享符号、40px、左侧6px间距、同排，以及关键词／标签／完成状态同时重置、入口高亮恢复；十页工具栏与控件回归通过。375px实际筛选截图已目视。

类型、普通／隔离预览构建、81源码／19产物WXSS、原生启动／首页渲染／包体守卫通过，主包1,489,368／1,489,789字节。日志 test-results/todo-filter-reset-{ui,typecheck,normal-build,preview-build}.log；一次性截图检查inspect-todo-filter-reset.cjs、ui-preview-todo-filter-reset-inspection/todo-filter-reset-375.png。微信开发者工具／真机尚未验证。

## 创建清空按钮移至底栏（C183）

EntryComposer将原清空ActionButton从entry-heading移至原SheetActions最左，保持clearInputs／canSwitchMode与全部原守卫；40px辅助按钮、8px间距、垂直居中，右侧原提交伸缩，顶部类型使用释放的宽度。三类统一，已有实体编辑不改。entry-submit仅为原提交添加明确节点标记，原同一事件内清空／提交检查改按该动作取节点，进展和底栏断言更新为左清空／右保存，不放宽业务校验。

四尺寸360／375×667／430／768清空／焦点检查通过，覆盖底栏位置、40px、8px间距、类型／上下文保留、三类清空与首页输入、图片／日程／草稿写入失败／账号隔离及未持久化守卫；375px截图已目视。底栏短屏／34px安全区／tab与详情来源及按钮可达检查、类型检查、普通／隔离预览构建、81源码／19产物WXSS、原生启动／首页渲染／包体守卫通过，主包1,488,752／1,489,173字节。日志 test-results/entry-clear-footer-{ui,typecheck,spacing,normal-build,preview-build}.log，截图 ui-preview-entry-clear-footer 与 ui-preview-entry-clear-footer-spacing。微信开发者工具／真机尚未验证。

## 标签输入内距与自动换行（C182）

新增共享TagTextInput并迁移任务／便签字段和餐厅标签，原生Textarea.autoHeight与外框12px／10px内距保持多行文字完整可见；删除旧页面单行标签输入高度规则，TagChoiceRow复用contentKey测量与PopoverActions固定完成。没有改变原解析、数量／长度限制、草稿与保存逻辑。浏览器Textarea适配器补充autoHeight模拟，验证代码不进入小程序包。

现有tag-row-spacing四尺寸360／375×667／430／768补充实际左内距、44px外框、12px组间距、长中文／无空格英文自动增高、无横向溢出与完整滚动查看、删减缩回、外框聚焦、关闭重开文字保留；原常用行等宽、长名称、两位计数、选中与零业务写入检查通过。375px多行截图已目视。真实创建组合初次出现一次下一步输入聚焦断言失败，未改下一步行为，完整四尺寸复跑通过，失败原因未明确；初次／复查日志tag-wrap-entry-ui.log／tag-wrap-entry-recheck.log。

类型检查、普通／隔离预览构建、81源码／19产物WXSS、原生启动／首页渲染／包体守卫通过，主包1,488,620／1,489,041字节。日志 test-results/tag-wrap-ui.log、截图 ui-preview-tag-wrap；类型与构建日志tag-wrap-{typecheck,normal-build,preview-build}.log。微信开发者工具／真机尚未验证。

## 下一步行宽与按钮间距（C181）

TodoEditorFields 将移动组与删除／添加组合在同宽 todo-next-actions 中，统一128px右侧操作区、40px按钮及内外4px间距；提示行／单条／多条的输入与整行边界保持一致。没有更改步骤更新、连续输入、ID、账号或保存规则。

现有 next-step 四尺寸360／375×667／430／768检查补充实际行边界／输入宽度／相邻按钮间距与40px触控断言，覆盖空提示、单条、多条和既有任务编辑；原聚焦／重复点击／移动／原ID／空白过滤／重载／图片忙碌守卫通过，375px截图已目视。类型检查、普通／隔离预览构建、80源码／19产物WXSS、原生启动／首页渲染／包体守卫通过，主包1,487,436／1,487,857字节；日志 test-results/next-step-alignment-{normal,preview}-build.log，界面日志 next-step-alignment-ui.log、截图 ui-preview-next-step-alignment。微信开发者工具／真机尚未验证。

## 展开小窗口紧凑布局（C180）

共享 form-options 新增 PopoverHeading／PopoverActions 与 ChoicePopover.bodySpacing，统一小窗口固定像素内距、按钮分组和无继承margin。排序、任务／便签筛选、日程年月／时间／提醒／重复及格言轮播接入；时间错误提示共用操作行左侧，删除独立空行，仍严格校验并保持完成边界。页面仅定制字段分组和业务行为，不改大表单 SheetActions 或数据来源。

四尺寸360／375×667／430／768隔离浏览器验证：时间严格校验、输入保留、错误可见且完成边界不变；提醒选择／日期／时刻／键盘与分层保存；十页工具栏、共享排序、完整单行文字与触控；轮播设置取消／保存／错误及账号隔离；表单安全区／分隔线与底部按钮通过。时间几何实测为260×111px，40px输入／按钮、行间15px，375px旧窗300×163px、行间53px。检查新增时间空白上限，工具栏同步C175／C176已确认的首页排序／领域纯图标断言，未放宽业务守卫。类型检查、普通／隔离预览构建、80源码／19产物WXSS、首页渲染及原生启动守卫、1.5MB主包预算通过；主包1,487,028／1,487,449字节。

日志为 test-results/popover-spacing-{typecheck,schedule-time,reminders,toolbars,mottos,footers,normal-build,preview-build}.log；一次性尺寸／截图检查在 inspect-popover-spacing.cjs 与 ui-preview-popover-spacing-{before,after}。浏览器仅适配真实React页面，微信开发者工具／真机尚未验证。

## 快捷方式选项文字对齐（C179）

2026-10-08，仅小程序。浏览器适配预览修复前「选境」两字已使用Microsoft YaHei且文字行框一致，未复现用户客户端视觉错位，不能据此断言已定位原生字体原因。原选项行高19.6px且位置为小数像素；本轮在共享HomeShortcutEditor功能栅格通过原控件变量优先中文字体、统一20px行高，名称Text明确继承字号／字重／字体／行高，序号也使用同一行框。原14px文字、40px触控、单行省略及完整选择／替换／保存行为保持，不对单字做位移补偿。

使用现有隔离浏览器预览作一次性字体／字符行框检查（非新增业务测试），360／375×667／430／768中普通／选中状态两字均使用同一实际字体、上／下边界一致，位置不变且按钮高40px；375截图已目视。类型检查、普通／隔离预览构建、80源码／19产物WXSS、首页渲染及原生启动／包体守卫通过，主包1,486,799／1,487,220字节。检查脚本及日志在test-results的 `inspect-shortcut-label.cjs`、`shortcut-label-{before,after}.log`、`shortcut-label-typecheck.log`，截图在 `ui-preview-shortcut-label-{before,after}`，构建日志 `shortcut-label-{normal,preview}-build.log`。微信开发者工具／真机尚未验证，C177后旧完整快捷方式流程本轮未重跑。

## 快捷方式选项移除加号（C178）

2026-10-08，仅小程序。共用 HomeShortcutEditor 的完整选择／替换功能栅格只在已选项渲染原rank节点，未选项直接显示名称，省去原加号与节点占位。共用 ChoiceButton 的高亮、禁用、无障碍名称和原保存／取消保持，CSS仍供已选序号使用，不改正式数据或其他创建加号。

类型检查、普通／隔离预览构建、80源码／19产物WXSS、首页渲染守卫、原生启动及包体预算通过，主包1,486,572／1,486,993字节；日志 `shortcut-option-remove-plus-{normal,preview}-build.log`、`shortcut-option-remove-plus-typecheck.log`。本轮为可逆展示调整，没有新增测试；既有完整快捷方式UI工作流的旧标题添加操作已按C177移除，本轮未重跑该旧流程。微信开发者工具／真机尚未验证。

## 首页快捷方式标题移除加号（C177）

2026-10-08，仅小程序。首页 PageToolbar 的标题组合删除管理时的添加按钮及40px占位样式，原「未保存」条件反馈直接复用现有提示节点。排序／设置、卡内编辑／替换、空布局原添加入口与底部创建输入保持，共用 CreateButton 本身不变，不改快捷方式设置或持久化。

类型检查、普通／隔离预览构建、80源码／19产物WXSS、首页渲染守卫、原生启动和包体预算通过，主包1,486,578／1,486,999字节；日志 `home-heading-remove-add-typecheck.log`、`home-heading-remove-add-{normal,preview}-build.log`。本轮为可逆入口移除，没有新增测试；C175完整快捷方式工作流中的旧标题加号操作不适用于C177，本轮未重跑该旧流程。微信开发者工具／真机尚未验证。

## 领域满屏布局与外层续接（C176）

2026-10-08，仅小程序。领域页移除管理符号及状态，保留摘要、排序和记录进展。首屏使用四行两列展示前八张真实领域卡，最近记录窗通过 flex 占满上方剩余空间；第九及以后由同一个全量卡片列表接在首屏下方，使用外层 PageScroll 自然滚动。创建占位在少于八张时放首网格剩余位置，其余情况在续列末尾，排序时保留位置并禁用；原创建控制器及账号／容量／同 ID 保存守卫保持。

`DomainProgressSummary` 卡片目标变体的上下留白归共享 CSS 管理，上内距5→7px、下内距0→2px，页面重复规则已删除；单行圆点、分隔线、40px图标及 inline 目标保持。首屏／续列共用卡高变量（手机86–108px、宽屏94–108px）、6px行距和整个列表1120px上限。最近记录不再限制64／96px，旧领域内部滚动与网格458px上限已移除。保存反馈仅有内容时显示44px固定视口浮层，不挤压首屏，续列排序失败仍可完整点击40px重试；反馈行统一清除旧按钮外边距，重试仍提交原绝对目标。

类型检查及六套界面回归通过：最近记录、卡片排序／详情操作、领域完整流程、真实隔离预览、工具栏摘要、页面布局，均覆盖360／375×667／430／768；另覆盖375＋34px安全区及1280×960宽屏。验证首屏恰好完整八张、第九完全不露、额外领域与创建外层可达、最近窗独立内部滚动、空／长／图片记录同高、跨八卡边界排序与失败同目标重试，以及原创建／编辑／删除／账号／容量守卫。日志 `domain-fullscreen-{typecheck,recent-ui,actions-ui,workflow-ui,preview-ui,toolbars-ui,screens-ui}.log`，截图在 `ui-preview-domain-fullscreen-*`；375及1280布局已目视。

最终普通／隔离预览构建、80源码／19产物WXSS、17页／12分包和18页／13分包启动及原包体预算通过，主包 **1,486,865／1,487,286字节**；日志 `domain-fullscreen-normal-build.log`、`domain-fullscreen-preview-build.log`。最终保留隔离预览包，未部署或清除业务存储；微信开发者工具／真机尚未验证。

## 首页快捷方式统一排序与图标背景（C175）

2026-10-08，仅小程序。首页排序改为领域同款的逐卡上移／下移，移除原拖动组件、触摸绑定及二次确认草稿。共享 `CardCornerActions` 通过 Composition 接收操作，统一右下4px、间距2px及40px按钮；`CardMoveActions` 组合共享上下移动符号，首页和领域同时使用，领域原right12px改为4px，下移按钮靠右下角。浏览／排序／管理保持卡片和功能栏几何，排序不显示编号；首末操作禁用，管理显示左编辑／右替换符号，操作不冒泡到卡片导航。

`moveHomeShortcutBy` 复用原rank槽位与纯移动函数，逐次成功写本机后更新显示；失败保留一次计算出的完整目标并锁定其他修改，由原排序按钮原位重试同一目标，不再移动一次。`replaceHomeShortcut` 只替换当前或未选功能，保留rank、颜色、所选图标和兼容旧背景；原默认名称更新为新功能名称，自定义名称保留，隐式图标在替换时固定为原显示图形。所有原导航、完整第二页目录、底部快捷输入及创建类型记忆保持。

`ShortcutBackground` 复用 `ShortcutIcon` 的background展示变体，由现有48款同源向量几何生成细线透明PNG图集；原八款普通图集与目录图标不改变。新背景图集16,668字节，统一大尺寸、旋转和淡墨透明度由背景组件拥有，名称和颜色独立编辑。`ShortcutIconPicker` 复用共享ChoicePopover和40px选项，内部滚动、标题／关闭固定；选择仅改外观草稿，点外部只关闭最上层。新增图集检查覆盖48个有效透明单元、同源细描边与18KB素材预算。

`HomeShortcutEditor` 共用草稿／取消／保存，按入口组合三种内容：单卡编辑保留预览和名称／图标背景／颜色；完整选择只显示16项功能栅格；替换窗口只显示同源栅格，其他已用功能禁用。后两者删除列表下方外观选择、预览、字段及恢复默认设置，固定底部取消／保存保持。原version1和本机设置键保持，合法旧图标继续使用，十款旧背景字段只兼容保留、不再显示；新建不再产生旧纹理字段，不覆盖原自定义与有意空布局。

最终兼容检查发现，新主动选择的原六项／默认颜色／默认名称／原序号组合，省去旧纹理后可能被旧默认升级条件误认。新建明确写原功能默认icon，外观／选择保存和排序目标在normalize前固定各卡实际显示图标；真实旧读取仍沿原缺省判断升级。这样主动配置和旧自定义排序恢复原顺序不会被改成C147默认六项，不增加版本或存储键。

原生首页守卫检查实际index.js及被领域共同引用后抽出的common.js，样式读取首页／app的真实WXSS导入且校验包内路径；要求共享操作、编辑／替换、图标选择及细线背景，旧十纹理节点由C175替代。类型检查、原纯逻辑与图集检查通过；本节最终回归与构建结果见下方补充，微信原生环境尚未实测。

最终类型、快捷方式纯逻辑和九图集检查通过。首页快捷方式／领域管理、首页完整导航、创建类型记忆普通／真实隔离预览、领域顶部最近记录六套回归在360／375×667／430／768全部通过；覆盖2×40px共用右下操作、首末禁用、立即移动／失败原位同目标重试、48图标／六色、取消／保存刷新、功能替换保留槽位外观及新key真实导航、纯功能选择窗口、rank空号／16项内部滚动／底部输入。375＋34px安全区及领域严格八卡／最近十条／原ID编辑保持；兼容补充覆盖从空布局主动选择旧六项、真正旧缺省icon自定义序号恢复、旧自定义颜色恢复默认，均保留主动配置，真正旧默认仍升级。

日志 `shortcut-controls-{typecheck,logic}.log`、`shortcut-controls-{home,domains,navigation,entry,entry-preview,domain-recent}-ui.log`。首页／导航等截图各在 `ui-preview-shortcut-controls-*`，领域管理首次命令的tag参数未生效，截图在原 `ui-preview`，日志仍对应真实四尺寸通过。375排序、纯功能选择、48图标窗口及默认首页已目视，共享动作与名称不重叠；既有脚本语法及补丁格式通过。

最终普通／隔离预览构建、80源码／19产物WXSS、17页／12分包和18页／13分包启动及原包体预算通过，主包 **1,486,836／1,487,257字节**。九张原生图集与源文件逐字节相同，新细线背景为768×576、16,668字节；日志 `shortcut-controls-normal-build.log`、`shortcut-controls-preview-build.log`、`shortcut-controls-native-assets.log`。最终保留最新隔离预览包，未部署或清除业务存储；微信开发者工具／真机尚未验证。

## 首页快捷方式运行界面核对（T29）

2026-10-08，用户截图显示旧大卡图标、中文说明／英文装饰、编号箭头和「名称与图标／大入口按序号排列」编辑区。当前源码及原生首页 JS 的渲染节点已是 C172 名称／背景／颜色组件，旧节点不在当前包内；首页 WXSS 含十款背景、六色变量及编辑器样式，产物更新时间晚于首页源码。全部原生构建指向同一个 `miniprogram/dist`，源工程 `miniprogramRoot=dist/`、产物 `./`；未发现另一个小程序工程或正在运行的预览／微信工具进程。确认了截图与本地当前包不一致，尚未确定旧代码的具体运行来源。

保留 C172 已完成的共享 UI 和旧设置兼容，不改数据或重复设计卡片。原生启动检查新增实际渲染代码／样式配套校验，识别共享卡、名称／背景／颜色编辑器及十背景／六色，拒绝旧渲染节点；功能目录保留的 `en`／`note` 数据不作为渲染证据。恢复步骤见 [微信真机调试 T29](device-debugging.md#首页快捷方式仍显示旧界面t29)。

类型及原首页快捷方式四尺寸交互回归通过，覆盖保存／取消、十背景／六色、排序与设置、旧设置／空布局、底部输入和375×667＋34px安全区；375首页和单卡编辑截图已目视。日志 `shortcut-runtime-typecheck.log`、`shortcut-runtime-home-ui.log`，截图位于 `ui-preview-shortcut-runtime-home`。微信工具／真机当前未连接，不能据自动检查宣称截图里的运行实例已恢复；本地构建不更新已发布版本。

普通 `build:local` 增加原生启动与包体检查，和 `build:weapp`、`build:preview`、`build:device` 一样自动调用新增首页产物守卫。最终普通／隔离预览构建均通过，79源码／19产物样式、17页／12分包和18页／13分包及原包体预算通过，主包 **1,475,621／1,476,042字节**；日志 `shortcut-runtime-normal-build.log`、`shortcut-runtime-preview-build.log`。最终保留最新隔离预览包，未部署，未清业务 Storage。

守卫对最终预览包的六项内存突变均能拒绝：插入旧卡片节点／旧编辑文案、缺失颜色变量／背景规则／纹理节点、全局薄荷色覆盖卡片按钮；单独保留旧目录文案不误报。脚本语法通过，日志 `shortcut-runtime-contract-probes.log`。这些检查只定位本地产物的一致性，实际运行入口仍需微信重新编译核对。

## 领域顶部最近记录与八卡首屏（C174）

2026-10-08，仅小程序。领域页使用实际可用视口的固定首屏：原PageToolbar之后显示固定最近记录窗，再显示两列四行领域卡。DomainRecentRecords根节点由共享CSS变量控制为96px、700px以下64px（组件缺省100px），含6px／8px内距及边框；始终同一个内部ScrollView，空态和长内容不改变高度。去掉「最近记录」「负记录／正记录」及领域metadata，保留左负右正双栏、±／原颜色、Markdown和图片。DomainRecordColumns增加默认不变的compact变体，DomainRecordColumn新增showHeading默认true；仅最近记录使用紧凑无标题形式，详情完整历史保持。

领域卡区用原ScrollView内部纵向滚动，flex接剩余高度并封顶458px；Grid固定高度、四行calc及行6px／列8px间距，超过八张及管理创建占位从卡区滚动访问，少于八张不制造占位领域。卡片在短屏按可用高度收紧，较大视口沿用最高110px含边框，原40px图标、文字、短期圆点／单行与40px排序控件保持；C173浏览／管理／排序同几何及原ID操作继续有效。必要保存反馈用44px固定内部滚动槽、上距4px，失败不挤动卡和按钮；底部补12／8px及实际安全区。

原最近十条、合法日期降序／同时间稳定ID、原ID编辑、来源／账号／队列及预览隔离规则保持，无数据或存储变更。规则见 [C174](../Design.md#领域顶部最近记录与八卡首屏c174)，C149的下方窗口及C153可见标题／metadata、C173固定108px首屏由本条替代。

类型和原最近记录／原ID编辑纯逻辑通过。六份现有回归脚本适配新布局并通过语法检查；`--domain-recent-records`、`--domain-management`、完整 `--domains`、真实隔离 `--domain-preview`、`--toolbar-summaries`、所选页面 `--screens` 六套在360／375×667／430／768全部通过。最近记录专项另覆盖375＋34px模拟安全区、十真实领域首屏严格八张完整卡／第九张完全不露出、额外领域和创建占位内滚、空／长／排序／管理时面板同高、不制造空卡，以及原最新十条／时间并列／Markdown／图片预览／ID编辑删补重开／账号读取守卫。完整领域还覆盖1280px及C173定义／移动／删除失败同目标重试，详情双栏默认标题与完整历史保持。

管理失败前后卡边界相同、40px移动控件与图标／标题不重叠的原守卫保留；初次条件显示反馈挤动卡区，修正为固定44px反馈槽。首次安全区检查发现底部未补实际安全区，按12／8px＋env补齐，字体／图标／按钮未缩小。375隔离示例、375＋34px安全区及768顶部记录截图已目视。日志 `domain-recent-top-{records,management,workflow,preview,summaries,screens}-ui.log`，截图对应 `ui-preview-domain-recent-top-*`。本次screens选择包含领域首屏，格言及领域详情未列入该子集，详情由完整领域／预览回归覆盖，不据通用成功文案声称所有17路由都跑过。

最终普通／隔离预览构建、79源码／19产物WXSS、17页／12分包和18页／13分包启动及原包体预算通过，主包 **1,475,621／1,476,042字节**，日志 `domain-recent-top-normal-build.log`、`domain-recent-top-normal-checks.log`、`domain-recent-top-preview-build.log`。当前保留隔离预览构建，微信开发者工具／真机未验证，未部署。

## 领域排序与详情编辑删除（C173）

本节保留当时实现与验证。C174将最近记录移到上方无标题紧凑固定窗，并将领域卡更新为适配首屏四行的高度；原排序、详情编辑删除及保存保护保持。

2026-10-08，仅小程序。领域列表 PageToolbar 在原管理左侧组合 SortSymbol，两模式互斥；排序使用原两列108px卡与 DomainProgressSummary，将进度和短期摘要真实节点隐藏保几何，右下仅两个40px MoveSymbol，不再有更多／卡内编辑删除。管理保留创建占位卡，其他卡显示摘要并可导航；原今日摘要、最近记录和创建进展保持。

详情最上方以 PageToolbar 组合左返回、右40px EditSymbol／DeleteSymbol，原领域名称、已完成目标及业务内容位置保持。共享 DomainDefinitionEditor 拥有名称／图标窗口、嵌套图标库及应用内删除确认，40px入口与48px固定SheetActions复用基础控件；useDomainDefinition直接接入两页原 domains／reminders 工具对象，不重复读取或另写存储。原ID、改名旧习惯绑定、候选创建重试、未分类保护和账号串行保存保持，整段改名异步链加忙碌／来源守卫。删除失败即使内存已移除对象，确认仍按原ID显示并可幂等重试；本机真正持久化后才返回列表。

列表移动继续复用原 reorderDomains／change／moveRetry，失败只重新保存原目标顺序，不再次移动。当前规范见 [C173](../Design.md#领域排序与详情编辑删除c173)，旧C89／C105／C130布局保留为历史。

类型、完整 `test:logic` 及领域原ID记录编辑纯逻辑通过。复用原行为回归，`--domain-management`、完整 `--domains`、`--domain-recent-records`、`--toolbar-summaries`、真实隔离 `--domain-preview` 五套在360／375×667／430／768全部通过。覆盖独立排序及仅两个40px移动按钮、首尾禁用、排序／管理互斥与同几何、移动失败原顺序重试、管理继续导航／创建、详情右上40px编辑删除、未分类保护、原ID改名及旧名称习惯绑定、取消／外部关闭、保存失败同ID重试、删除volatile不导航且确认可重试、持久化成功返回、账号／容量／空状态及原目标／习惯／记录业务。功能栏摘要不受模式影响，十条最近记录及预览数据隔离保持。

375短屏排序和详情右上操作、768详情截图已目视，八卡在375默认首屏完整显示；两排序符号、详情编辑删除与原图文均不重叠，基础控件尺寸保持。日志 `domain-sort-detail-{management,domains,recent,summary,preview}-ui.log`，截图对应 `ui-preview-domain-sort-detail-*`。768几何比较前恢复原滚动位置，避免失败提示引起外层8px滚动误判为卡片移动；没有放宽边界检查或修改无关生产功能。

最终普通／隔离预览构建、79源码／19产物WXSS、17页／12分包和18页／13分包启动及原包体预算通过，主包 **1,473,953／1,474,374字节**，日志 `domain-sort-detail-normal-build.log`、`domain-sort-detail-normal-checks.log`、`domain-sort-detail-preview-build.log`。当前保留隔离预览构建，微信开发者工具／真机未验证，未部署。

## 首页快捷方式背景与管理（C172）

2026-10-08，仅小程序。新 `ShortcutBackground` 用四个基本View和共享CSS几何定义十款纹理，沿用六色变量且与背景独立，不增加图片资产；`HomeShortcutCard` 组合纹理和名称，普通导航Button／管理只读View使用同一几何，右下40px共享编辑为同级节点，无按钮嵌套。卡与静态编辑预览共用组件，普通预览88px、700px以下短屏64px，十格背景预览也引用同一纹理。首页大卡移除原业务图标、编号、箭头及中英文小文案，编号仅排序期间显示；第二页完整功能目录保持原图标及动作／页面语义。

首页PageToolbar左排序／右设置共享40px符号，设置模式在标题旁预留40px加号位打开原选择，不增卡或挤动首屏输入。排序复用 `useHomeShortcutSort` 和原rank空号／已用槽位移动，草稿在首页显示，再点同符号保存才持久化；失败保留同一目标，切设置或离页取消未确认顺序。管理每卡右下铅笔直接传 `initialKey` 打开单卡名称／背景／颜色，完整选择保留添加、移除、恢复默认及一次只编辑一套外观。编辑器复用SingleLineInput、ChoiceButton、SheetActions，取消／外部关闭不应用，本机写失败保留窗口输入。卡片外观归共享组件，页面仅负责网格／滚动及原导航／创建动作。

`shortcut-backgrounds` 固定十款key及按原功能key稳定默认；原version1、设备级设置键及可选rank／旧icon兼容保留，新增可选background。make／normalize输出合法背景，旧缺省／非法回退，不把已明确设置背景的旧六／八布局误当未自定义默认；原自定义与空布局保持。不新增存档或云端同步。规则见 [C172](../Design.md#首页快捷方式背景与管理c172)。

类型、完整 `test:logic` 及更新的快捷方式纯逻辑通过。覆盖十款固定背景及合法默认、缺省／非法／旧icon兼容、旧默认升级与显式背景保护、自定义及空布局、rank空号和已用槽位排序。只适配两份现有UI脚本 `check-home-shortcut-workflow.cjs`／`check-home-editor-order.cjs`，其余首页回归复用原脚本；脚本语法检查通过。

真实组件浏览器适配器 `--home-shortcuts`、`--home-navigation`、`--home-entry-mode` 普通及真实隔离 `--preview-mode` 四套在360／375×667／430／768全部通过。包括名称／背景／颜色独立选中与保存重开、取消／外部关闭、移除／恢复／默认、同边界管理及右下40px编辑不重叠、普通触摸不排序、首页排序草稿取消／触摸取消／完成失败同目标重试、rank空号、16卡边缘自动滚动、10卡内部滚动及底部输入固定、完整功能目录、创建类型记忆与账号／预览隔离。旧习惯详情的专注分钟断言按 C94 改为不存在，任务传入专注的原业务断言仍保留。日志 `shortcut-redesign-{shortcuts,navigation,entry-mode,entry-mode-preview}-ui.log`，截图对应 `ui-preview-shortcut-redesign-*`。

实测发现共享卡编辑及编辑窗按钮继承全局16rpx外距，造成右下漂移和短屏控件裁切；分别在所属组件归零外距。单卡窗口按560px与可用区域减12px取小值，保留外部关闭空白；中部flex分配剩余高度，短屏只收紧预览与局部间距。375×667加0／34px模拟安全区下名称、十背景、六颜色默认全部可见，颜色底边519.97px低于内容底边540px，固定48px底栏完整；缩略图40px及共享按钮内距保持。375首页／单卡与768保存后截图已目视，十款纹理另有共享组件联系图。

最终普通／隔离预览构建、78源码／19产物WXSS、17页／12分包和18页／13分包启动及原包体预算通过，主包 **1,468,410／1,468,831字节**，日志 `shortcut-redesign-normal-build.log`、`shortcut-redesign-normal-checks.log`、`shortcut-redesign-preview-build.log`。当前保留隔离预览构建，微信开发者工具／真机未验证，未部署。

## 进展双框与独立正负选择（C171）

2026-10-08，仅小程序。共享 `ProgressEditorFields` 显示两个记录框，各框通过 `ProgressRecordField` 复用左负右正、选中高亮的等宽40px按钮；默认上正下负，可选两正／两负。`EntryPreview` 复用同一框及类型行，跟手快照保持无原生输入。`MarkdownNoteEditor` 新增 `density='compact'`，仅进展双框及其快照使用共享尺寸／间距变量，其他调用默认保持；底部一个共享 primary／large／fill「保存记录」，固定48px及原安全区。

原 version1 创建草稿增加 `pair:true` 和独立 `kinds` 元组，上下槽位保留原记录及图片引用。未提交旧 single／双框／legacy 草稿兼容迁移，`switchEntryMode` 对待重试原对象直接返回；只读 `progressRows` 为旧待重试单框保留空下框。上框继续与共用标题互通，下框保留独立记录。`progressEntries` 按选择只生成非空框一或两条，`saveDomainRecords` 允许同类型双条，保留全批容量、ID／目标／内容校验及单次原队列保存，任一失败不部分提交；原正式存档、云端和账号隔离不变。保存及已保存草稿恢复都按实际批次ID消费旧队列，原待重试领域、符号、ID和内容不变。规则见 [C171](../Design.md#进展双框与独立正负选择c171)。

类型和完整 `test:logic` 通过，包含上下槽位独立符号、同类型双条、空框／纯图片、6000字／图片总容量、全批ID冲突与稳定重试、旧single／双框／legacy及账号草稿的纯逻辑。专项发现业务校验失败后来源重读短暂清空owner，使创建窗口吞掉容量／冲突错误；仅修正 `EntryComposer` 的提示守卫，核对原草稿owner及三来源的所有已知owner，允许同账号重读期间显示错误，真实异账号仍不显示旧错误。状态层、存档及队列保持。

真实组件浏览器适配器的 `--progress-creation`、完整 `--entry-creation`／`--domains`、`--sheet-footers --progress-footers`、真实隔离 `--home-entry-mode --preview-mode` 及 `--toolbar-summaries`／`--domain-preview` 七套四尺寸360／375×667／430／768均通过，底部另覆盖430×720。包括两正／两负原子提交、下框独立文本／图片和领域、标题互通、双框无输入快照、旧草稿按原ID恢复、旧单框负pending锁定、交换符号双IDvolatile重试及账号异步图片守卫。4999+2容量和第二条ID冲突均提示并保留两框，不创建未分类或部分保存；任务／便签已保存时不误消费未提交进展legacy的回归也通过。只适配八个现有UI脚本并增加必要行为断言，语法检查通过，未增加独立样式测试。

375×667加模拟34px安全区的tabBar／详情host中默认两框、两组工具栏、40px符号选择及48px固定保存均完整可见；375两处底部及768双框截图已目视。长文／预览／图片沿用原中部滚动。UI日志 `progress-pair-{shared,entry,domains,footers,home-preview,summaries,domain-preview}-ui.log`，纯逻辑日志 `progress-pair-logic.log`，截图对应 `ui-preview-progress-pair-*` 目录。

普通／预览构建、76源码／19产物WXSS、17页／12分包和18页／13分包启动及原包体预算通过，主包 **1,464,651／1,465,072字节**。日志 `progress-pair-normal-build.log`、`progress-pair-normal-checks.log`、`progress-pair-preview-build.log`；当前保留隔离预览构建，微信开发者工具／真机未验证，未部署。

## 正负记录紧凑间距（C170）

2026-10-08，仅小程序。大留白来自Markdown的18px段尾、1.95行高，以及正文pre-wrap将生成HTML的格式换行显示成额外空行。共享渲染器和 `DomainRecordContent` 增加独立 `compact` 选项，默认false，只有 `DomainRecordCard` 启用；段尾4px、根节点／段落行高1.65，其他块间距同步收紧。正文normal、紧凑根节点显式normal；真实换行仍由br保留，代码块和行内代码明确pre-wrap保留换行／空格。渲染器按两个布尔选项最多缓存四种配置，原普通阅读输出保持。

共享卡上下内距4→2px，至少40px触控保持，领域详情与首页最近记录同步；数据、十条／全历史、字号／正负颜色、图片及原ID编辑保存流程保持。规则见 [C170](../Design.md#正负记录紧凑间距c170)。

同样本浏览器真实组件四尺寸测量：375px两行详情卡111.75→44.28px，首页含metadata条目130.55→63.08px；正文后空白43.44→6px，四尺寸尾空白均6px。原两行在pre-wrap下误显示成三行，修正后为真实两行；单行详情保持40px。证据 `ui-preview-domain-record-spacing-{before,after}/geometry.json` 及375两处截图，375／768已目视。

类型、原Markdown纯逻辑及现有 `--domain-recent-records`／完整 `--domains` 四尺寸回归通过，涵盖长文、真实换行、代码、图片预览、原ID编辑／草稿恢复、完整历史、最近十条及账号／保存守卫。未新增永久样式测试；只将原编辑回归的4px内距断言更新为2px，并将带图卡的编辑点击明确放在正文／符号区域，保留图片点击预览断言。日志 `domain-record-spacing-{recent,domains}-ui.log`。

普通／预览构建、76源码／19产物WXSS、17页／12分包及18页／13分包启动和原包体预算通过，主包 **1,462,476／1,462,897字节**。日志 `domain-record-spacing-{normal,preview}-build.log`；当前保留隔离预览构建，微信开发者工具／真机未验证，未部署。

## 领域卡短期目标圆点（C169）

2026-10-08，仅小程序。共享 `GoalSummary` 增加默认关闭的 `showBullet`，卡片短期目标变体启用6px装饰圆点，沿用4px间距和原单行省略／分隔线；当前、已完成历史及未设置共用结构，管理随原节点隐藏。仅修改 `domain-progress.tsx`／CSS，卡高、图文坐标、数据及保存保持；规则见 [C169](../Design.md#领域卡短期目标圆点c169)。

类型和现有 `--domain-recent-records` 四尺寸360／375×667／430／768回归通过，无需新增或修改测试。108px卡高、管理几何、40px操作及原ID编辑保存断言保持，375／768截图已目视。普通／预览构建、76源码／19产物WXSS、17页／12分包和18页／13分包启动与原包体预算通过，主包 **1,461,887／1,462,308字节**。日志 `domain-goal-bullet-ui.log`、`domain-goal-bullet-{normal,preview}-build.log`；当前保留隔离预览构建，微信开发者工具／真机未验证，未部署。

## 首页快捷创建记忆类型（C168）

2026-10-08，仅小程序。共享 `EntryComposer` 增加 `preferLastCreatedMode`，仅首页底部加号和键盘确认启用；明确任务／便签快捷操作、四象限、便签及领域进展继续传原初始类型。来源及账号就绪后读取 `homeEntryModeKey(owner)`，合法值为task／memo／progress，缺省、非法或偏好读取失败回退入口类型。新本机键 `ottlog-mini-home-entry-mode-v1:${owner}` 复用预览前缀隔离，无云端工具或正式存档字段变化。

共享创建的业务保存完成、通过volatile及最终账号／来源／mounted守卫后才更新成功类型；取消、类型切换、清空和失败不更新，既有实体编辑保持。偏好写失败不回滚已保存业务，显示「内容已保存，默认类型未记住」。原账号保存队列、草稿及ID保持，待重试原类型优先且不合入新首页输入；成功回调的 `captureConsumed` 使未消费输入继续保留。

默认进展时，首页文本通过原 `setProgressText` 进入上面的记录框（C171）并同步共用标题；旧非空内容与新输入换行追加，原 `captureText` 防重复，领域、图片及旧双框恢复保持。规则见 [C168](../Design.md#首页快捷创建记忆类型c168)。

类型及现有进展草稿／共用标签纯逻辑通过。新增行为回归复用真实首页、任务、便签和领域入口，`--home-entry-mode`普通及真实`--preview-mode`编译四尺寸360／375×667／430／768通过：三类成功记忆和刷新重开、加号／键盘确认、明确入口覆盖、切换／取消／清空／校验失败不记、volatile同ID重试优先及新输入保留、偏好写失败仍业务成功、非法值回退、游客／两个账号及预览命名空间隔离。新测试等待真实首字段聚焦及原后台flush稳态后切换模拟服务会话，保留原本机和云记录数量断言；无固定sleep。日志 `home-entry-mode-{normal,preview}-ui.log`，375普通／预览进展截图已目视。

包含新场景的完整 `--entry-creation` 四尺寸回归通过，原字段互通、跟手切换、图片、下一步、日程、清空、账号草稿及同ID重试断言保留。旧固定首页任务类型断言改为先验证最近成功便签默认，再切回任务验证原内容与只追加一次；日志 `home-entry-mode-entry-ui.log`。本轮生产改动仅共用创建、草稿类型辅助及首页三个文件，无网页或后端修改。

普通／预览构建、76源码／19产物WXSS、17页／12分包和18页／13分包启动与原包体预算通过，主包 **1,461,662／1,462,083字节**。日志 `home-entry-mode-{normal,preview}-build.log`；当前保留隔离预览构建，微信开发者工具／真机未验证，未部署。

## 任务表单移除标题图标（C167）

2026-10-08，仅小程序。共享 `TodoEditorFields` 删除任务名称前的装饰图标及两条专用样式，共用创建和原任务编辑同步；`EntryPreview` 的任务快照同步无图标，标题直接从原行左端开始。原标题输入、优先度及其他字段、ID、草稿和保存队列保持；规则见 [C167](../Design.md#任务表单移除标题图标c167)。

类型检查、现有 `--entry-creation` 与 `--todos` 四尺寸360／375×667／430／768回归通过，覆盖创建／编辑标题对齐、滑动快照、备忘录图标保留及原字段、保存ID、账号和重试流程。仅适配已有测试中的旧图标断言，未新增独立样式测试。375创建及375／768编辑与跟手截图已目视；日志 `todo-title-icon-{entry,todos}-ui.log`。

普通／预览构建、76源码／19产物WXSS、17页／12分包及18页／13分包启动与原包体预算通过，主包 **1,460,945／1,461,343字节**。日志 `todo-title-icon-normal-build.log`、`todo-title-icon-normal-checks.log`、`todo-title-icon-preview-build.log`；当前保留隔离预览构建，微信开发者工具／真机未验证，未部署。

## 习惯时段与全部分类分组（C166）

2026-10-08，仅小程序。习惯新增可选 `timePeriod`：morning／noon／afternoon／night／free，对应上午／中午／下午／夜晚／自由。统一元数据导出值、名称和校验；旧缺省只读为自由，不在读取或排序时补写，新建／编辑明确保存选择。原版本1、reminders存储键、账号保存队列和习惯生命周期／历史保持，领域旧习惯数据同样兼容；显式非法值严格拒绝，原网页归一化往返保留合法新字段，无网页或后端修改。

共享 `HabitEditor` 在领域同排组合 `SingleChoiceField` 时段，选择只更新草稿、保存期间禁用；`HabitCard` 的metadata行展示时段及原最近打卡信息，并保留组合插槽。宽屏回归发现content按钮的inline基线使两字段中心偏3.406px，时段字段外框改flex消除额外行盒，保持基础控件44px规格，不改字号或放宽对齐检查。

本轮按已向用户说明的领域分类栏「全部」口径分组；进行中／已完成／已归档／全部仍先按原完成状态筛选，其他领域分类平铺。`groupHabitsByTimePeriod` 将原已排序结果按固定时段分块、省略空组，组内保序。共享 `SectionTitle` 的受控展开变体组合14px／600灰蓝标题、40px quiet按钮和原旋转chevron，普通标题调用保持；默认展开，折叠仅保留当前页面会话、账号切换清空。相邻状态预览同样分组且只读。两列卡片及推荐保持，分组长内容从原内部列表滚动。

`useHabitGridSort` 增加可选groupForId，测量完整内容包装层而非首个网格，异步返回仅取当前可见ID。分组拖动只提交源组ID到原可见槽位，跨组落点不换位或改变时段／排序；收起、账号／分类／时段变化取消旧手势，失败仍重试同一绝对目标，不另存分组或排序状态。

类型、时段编辑／排序新逻辑、领域三时区和原专注／留言／日历／删除逻辑通过。四尺寸360／375×667／430／768的`--habit-time-periods`及集成新场景的完整`--daily`通过：五组顺序、旧自由不补写、标题规范／默认展开、折叠只读、组内排序及拖动槽位、跨组拒绝、后半组自动滚动、失败同目标重试、长按取消／横滑预览、两处原ID编辑与新建、状态／领域过滤及账号隔离。原至少八卡首屏、归档、补记、删除及保存断言保持；`--domains`与`--sheet-footers`四尺寸通过两字段对齐、原字段顺序／优先度及非零安全区固定底栏。日志`habit-time-periods-{shared,daily}-ui.log`及`habit-time-period-{domains,footers}-ui.log`，截图同名tag目录；375／768分组及字段截图已目视。

初次构建主包1,502,059字节超原预算，核对后将仅番茄分包消费的两张原PNG通过copy规则归入`pages/pomodoro/assets`，源图片和生成器保持，主包不再重复打包40,887字节。`check-package-size`新增仅出现一次、分包路径存在及源／产物逐字节相同检查；浏览器只映射新资源路径，原`--pomodoro`四尺寸流程及专注／休息两图960×860实际加载通过。375两图已目视，日志`habit-time-period-pomodoro-ui.log`。

最终普通／预览构建、76源码／19产物WXSS、17页／12分包和18页／13分包启动及原包预算通过，主包 **1,461,210／1,461,609字节**，番茄分包 **92,982字节**；日志`habit-time-period-{normal,preview}-build.log`。当前保留隔离预览构建，微信开发者工具／真机未验证，未部署。规则见 [C166](../Design.md#习惯时段与全部分类分组c166)。

## 习惯详情备注与统计留白（C165）

2026-10-08，仅小程序。根据用户截图，在共享 `habit-calendar.css` 增加备注区域上距及四项统计上下内距，习惯详情与领域习惯详情同步。普通窗口正文上距10→14px、统计上下6→10px；681–760px窗口正文上距6→10px、统计上下2→6px；680px以下正文上距3→5px、统计上下0→2px。最短屏将标题栏上下3px内距归零，回收6px供新增留白使用，标题、关闭和业务按钮仍保留原尺寸。备注下距10／6／4px、六行40px日期、图例上下8px、日志和固定操作／安全区保持；统计页独立布局及业务数据不变。

复用现有`--sheet-footers`及`--habit-comment-logs`回归，未新增样式测试或修改断言。四尺寸360／375×667／430／768均通过：两处详情普通／长名称／长备注，375×667及34px模拟安全区下完整42格、40px日期、图例和日志标题默认可见，原内容滚动与固定底栏保持；三处共享日历的统计读数、留言过滤、10→20→21、月份及对象重置保持。375短屏、430普通屏和长摘要截图已目视。日志`habit-detail-spacing-{footers,shared}-ui.log`，截图`ui-preview-habit-detail-spacing-{footers,shared}`。

普通／预览构建、76源码／19产物WXSS、17页／12分包和18页／13分包启动与原包预算通过，主包 **1,497,878／1,498,277字节**；日志`habit-detail-spacing-{normal,preview}-build.log`。当前保留隔离预览构建，微信开发者工具／真机未验证，未部署。规则见 [C165](../Design.md#习惯详情备注与统计留白c165)。

## 月打卡日志常显留言与更多（C164）

2026-10-08，仅小程序。`habitMonthCalendar` 从原已完成日期及有效留言派生日志，空白、未打卡和未来留言不展示，不改变四项打卡统计、日期标记、压缩历史或原留言归一化与保存限制。共享 `HabitCalendar` 在习惯详情、领域习惯详情和统计中直接显示完整留言，以普通 `SectionTitle` 和留言条数替代日志展开按钮；名称和备注原阅读展开保持。默认十条，末尾共享 `ActionButton compact／fill` 的「更多」每次追加十条，全部显示后隐藏，切换月份或习惯重置十条。长日志沿用原内容区滚动，底部操作固定，不增加嵌套滚动或业务存储。

短屏与34px模拟安全区下发现日志标题底部超出内容视口约2.5px，在680px以下窗口将日历到日志间距从8px收为C103的4px；日期仍为完整六行40px，字体和底部控件不缩小。

隔离预览一次性追加「晨间书写」，稳定ID `preview-v3-habit-morning-writing`，使用独立标记 `ottlog-mini-preview-v1:ottlog-habit-comment-preview-seed-v3 = 3`。上一个完整月有26次打卡和23条留言，可验证10→20→23；本月只追加截至昨天的前七天，截至10月8日为七次打卡／四条留言，不制造未来或改变今日完成数。原v2升级与新留言升级分别处理，容量及结构校验先于写入，版本标记最后写；同ID重试保持旧编辑／删除、孤立历史、正常账号／游客数据与草稿隔离。

验证类型、日历／留言／预览纯逻辑及相关脚本语法通过。完整`--daily`、`--domains`、`--statistics`与`--sheet-footers`四尺寸回归通过，保留原补记范围、账号／来源、同目标保存重试及只读统计守卫。最终`--habit-comment-logs`复用同一真实场景验证三处日历×360／375×667／430／768尺寸：24次月打卡与21条留言、空白／未打卡／未来过滤、全文无裁切、10→20→21、切月及对象重置、撤销去留言和无留言补记、读取及分页不保存。共享标题保持左对齐及14px／600／灰蓝标准，计数使用单独类名；完整42格、图例／日志标题默认可见、原滚动与固定底栏保持。底栏另覆盖375×667与34px安全区、长名称／备注。独立预览`--domain-preview`四尺寸通过实际种子页、10→20→23、原ID修改与删除后重开不覆盖／恢复，以及普通游客／账号工具缓存、草稿和API隔离。

375px最终详情、预览长留言和第二次「更多」截图已目视。日志`habit-comments-{shared,daily,domains,statistics,footers,preview}-ui.log`，截图`ui-preview-habit-comments-*`。普通／预览构建、76源码／19产物WXSS、17页／12分包和18页／13分包启动与原包预算通过，主包 **1,497,871／1,498,270字节**，预览数据分包 **23,129字节**；日志`habit-comment-logs-{normal,preview}-build.log`。当前保留隔离预览构建，微信开发者工具／真机未验证，未部署。规则见 [C164](../Design.md#月打卡日志常显留言与更多c164)。

## 专注移除重置与全宽操作（C163）

2026-10-08，仅小程序。番茄页面移除重置按钮及原左侧设置空位，开始／暂停／继续和暂停时的结束按钮均显式使用ActionButton large／fill，独占一行；结束槽保留同宽48px不可交互空位，状态切换及忙碌不移动边界。局部CSS仅负责布局，不覆盖共享按钮字体、颜色、触控或反馈。计时卡底部内距比原增加24px，普通36px、短屏34px，使底部操作整体上移；原番茄图形继续按可用stage测量，40px原生反馈滚动槽保持。

end移除reset参数及丢弃分支，只允许结束已暂停的当前active，保存前复核最新active ID及暂停状态，沿用finishTimer实际投入、原账号串行队列、完整轮数及剩余通知取消／同步守卫。不增加新的丢弃入口或数据结构，不修改共享计时库及网页／后端。

类型、相关JS脚本语法、差异格式及原提醒／跨端计时纯逻辑检查通过。四尺寸360／375×667／430／768的--pomodoro、--daily及--screens通过：全宽48px开始与结束行、结束位与卡底至少34px／可用屏底至少82px、零及34px安全区、完整首屏无滚动、状态／弹层／忙碌几何稳定、无重置及原空位；原实际时长、历史／完整轮数、自动与手动休息、来源／账号隔离、保存队列与同轮提醒取消断言保持。原重置测试按新流程改为暂停后结束，仍验证原ID与实际投入，不删除必要业务断言。375×667暂停截图已目视，两行按钮完整且底部间距充足。

普通／预览构建及76源码／19产物WXSS、17页／12分包和18页／13分包启动与原包体预算通过，主包 **1,499,252／1,499,651字节**，专注分包 **52,089字节**。日志pomodoro-full-actions-{normal,preview}-build.log、pomodoro-full-actions-ui.log及pomodoro-full-actions-{daily,screens}-ui.log，截图ui-preview-pomodoro-full-actions*，当前保留隔离预览构建。微信开发者工具／真机未验证，未部署。规则见 [C163](../Design.md#专注移除重置与全宽操作c163)。

## 专注第二页内容迁入统计（C162）

2026-10-08，仅小程序。统计的专注分类保留原ActivityAnalysis，通过PomodoroHistory／PomodoroNotifications接入番茄第二页的全部业务内容：七日／任意日期／全部日期、专注／休息／全部、十条递增分页、关联待办、原ID删除、微信配置与逐轮授权、提醒状态、后台计时及留存说明。历史筛选不改变分析来源；统计读取不推进或启动计时。组件Props使用原状态、账号及setValue，ChoiceButton／ChoicePopover／SheetActions负责共享控件，组件CSS拥有迁移后的基础布局；提醒资格与反馈文案移至既有pomodoro-reminders复用。

删除基于最新归一化状态，仅过滤原ID，保留active、settings、selection、completedFocusCount及兼容字段；本机volatile保留确认和同目标重试。原六来源同账号就绪／当前类别有效守卫保持，切账号或分类卸载旧内容。通知读取保留账号／轮次／可见／卸载／请求序号守卫，可见时秒刷新授权窗口、十五秒读取状态；显式授权直接从点击请求订阅，再沿用原同步及后端最新轮次校验。番茄开始与首页接续的自动授权、暂停／结束／重置的同步和取消保持，移除已无显示消费者的原页面提醒轮询。

番茄移除MoreSection、第二页返回及底部占位，PageScroll关闭翻页吸附，仅保留完整计时首屏。固定40px原生ScrollView反馈槽显示必要错误、消息与同步重试，status与重试同排，反馈变化不移动操作。共享page-sections.css仅清理已无调用的旧翻页提示及旧专注汇总样式，保留其他页面布局。

类型及原统计数据、微信授权／取消、番茄跨端兼容纯逻辑检查通过。四尺寸360／375×667／430／768的--statistics与--pomodoro通过，保留原计时／来源／通知／摘要断言，新增迁移后的日期和类型筛选、10→20→21分页、关联待办、只读分析及原记录不变、删除取消／外部关闭／本机失败同ID重试、累计轮数保留、返回番茄摘要、延迟账号读取与无效来源、统计内补充缺失通知授权且不改变计时。四尺寸--screens与--snap通过，覆盖17个路由、番茄无第二页及统计连续滚动。JS脚本语法与差异格式检查通过；375px番茄、历史和删除重试弹窗已目视。

浏览器日期Picker模拟input受全局min-height影响，宽屏曾超出原40px入口并覆盖下一行；仅修适配器的minHeight／minWidth／padding／border，使触控覆盖等于父Picker边界，保留value／min／max／onChange，未给生产CSS增加浏览器input补丁。相关日期选择由统计回归覆盖。

普通／预览构建、76源码／19产物WXSS、17页／12分包及18页／13分包启动与原包体预算通过；主包 **1,499,252／1,499,651字节**，专注／统计分包 **52,902／60,650字节**。日志focus-statistics-{normal,preview}-build.log及focus-statistics-{statistics,pomodoro,screens,snap}-ui.log，截图ui-preview-focus-statistics-*，当前保留隔离预览构建。未执行微信开发者工具／真机验证，未部署。规则见 [C162](../Design.md#专注第二页内容迁入统计c162)。

## 专注页顶部设置与今日摘要（C161）

2026-10-08，仅小程序。PageToolbar置于模式栏上方，manage插槽复用40px ActionButton和ManageSymbol打开原节奏窗口；左侧复用PageToolbarSummary显示今日完成及最近事项。移除原局部设置图形，开始行左格改同尺寸、aria-hidden的不可交互占位；开始／暂停／继续、重置及结束位沿用原网格，番茄图形继续测量可用区域。

pomodoro-toolbar-summary只由专注分包引用，从原规范化state.sessions投影：本地今天结束且completed的focus计入今日，最近有效focus含提前结束，最新title空则隐藏而不回退旧名称，时间非法／未来不计入，同时间按稳定ID。原ready／valid分支及当前owner控制显示，不受历史筛选或累计轮数影响；渲染时使用当前时间，沿用原可见时每秒／返回刷新及原保存队列，无新存储、额外计时器或摘要缓存。

类型、差异及脚本语法检查、--pomodoro／--toolbars／--screens在360×844／375×667／430×844／768×1024通过。既有专注回归增加顶部设置及空位几何、日计数／最新事项、长名省略、空名称不回退、同时间稳定、未来过滤、跨午夜、真实完成／提前结束／删除更新、账号延迟读取与无效源隐藏等检查；原计时、来源、通知、节奏保存及非零安全区边界保持。375px顶部摘要截图已目视，源码基础组件未改其他调用；输出ui-preview-focus-toolbar-{pomodoro,toolbars,screens}，日志focus-toolbar-{pomodoro,toolbars,screens}-ui.log。

普通／预览构建、74源码／19产物WXSS、17页／12分包及18页／13分包启动和原预算通过，主包 **1,499,598／1,499,997字节**。日志focus-toolbar-{normal,preview}-build.log，当前保留隔离预览构建。未进行微信开发者工具或真机验证，未部署。规则见 [C161](../Design.md#专注页顶部设置与今日摘要c161)。

## 专注运行提示文案移除（C160）

2026-10-08，仅小程序。pomodoro/index.tsx在运行中的专注省去该提示Text，保留原26px的focus-caption-slot，事项输入、按钮及番茄图形位置稳定；暂停／休息提示及原计时和保存规则保持。没有样式或存储变化。

类型、差异、源码文案检查及原--pomodoro四尺寸回归通过（360×844／375×667／430×844／768×1024），保留运行／暂停／休息、来源选择、按钮几何和通知断言；未新增低影响文案测试。普通／预览构建及原WXSS、启动、包体预算通过，日志focus-caption-ui.log、focus-caption-{normal,preview}-build.log。未进行微信开发者工具或真机验证，未部署。规则见 [C160](../Design.md#专注运行提示文案移除c160)。

## 专注事项箭头与待办选择布局（C159）

2026-10-08，仅小程序。ChoicePopover将iconOnly且无其他trigger内容的纯箭头加入共享居中规则，保留原SelectChevron及旋转；有内容加箭头、其他纯图标入口不变。TodoSelectionSheet分类改用PriorityFlag，直接读取todoQuadrants的红／黄／蓝／绿色，无为轮廓旗，原优先度无障碍名称和定位保留。

新增TodoTaskCard并由四象限和专注选择共用，任务行、标记、两行标题、日期／时间、今天／逾期及已完成外观从待办页面移入共享组件。leading接收组件生成的标记并组合原完成按钮或只读选择标记；rootProps转发原ID和拖动绑定，pressed及className定制关联选中态，原业务回调仍在各页面。选择列表改为单列，取消纸张图标和重复优先度副标题，场景CSS仅提供列表容器、可用标题宽度及选中背景；点击正文阻止冒泡，点击左侧标记通过根回调选择一次，均不完成任务。原数据来源、账号、筛选／最近专注、计时／保存队列保持，无新存储或打包配置变化。

类型、相关脚本语法和差异检查、原--pomodoro／--todos／--toolbars在360×844／375×667／430×844／768×1024通过。专注回归增加展开／收起箭头中心、四旗帜同源颜色／无轮廓／居中／40px、单列任务行、日期时间、点击标记关联不修改任务记录的检查。原关联、搜索、最近专注、自由专注、关闭、账号隔离及计时／通知保留；待办整套验证原完成／编辑、拖动排序及重试、长标题、日程、图片、下一步及账号隔离。分类检查将旧四字文本断言改为旗帜，并分别严格检查图标16×20px及中心、原文字单行和所有共享状态／间距，不放宽文字要求。375px选择窗口及箭头截图已目视。输出ui-preview-focus-todo-row-{pomodoro,todos,toolbars}-final，日志focus-todo-row-{pomodoro,todos,toolbars}-final-ui.log。

最终普通／预览构建、74源码／19产物WXSS、17页／12分包及18页／13分包启动检查、原预算通过，主包 **1,499,598／1,499,997字节**。日志focus-todo-row-{normal,preview}-build.log，当前保留隔离预览构建。未进行微信开发者工具或真机验证，未部署。规则见 [C159](../Design.md#专注事项箭头与待办选择布局c159)。

## 便签单页阅读与管理入口（C158）

2026-10-08，仅小程序。便签列表点击改为按当前账号及原ID读取内容，MemoReader组合ChoicePopover与DomainRecordContent，显示完整标题、标签、Markdown和图片，不创建编辑草稿或写入数据。DomainRecordContent接受content／images及inheritTypography参数，默认保留领域文字颜色和字号，便签使用原Markdown层级，局部正常空白处理避免HTML换行额外撑大段落。

PageToolbar的manage插槽新增共享ChoiceButton／ManageSymbol，默认关闭，开启后每条记录显示40px编辑／删除图标。原编辑器、原ID和会话输入恢复保持；删除从列表或编辑器进入同一应用内确认，复用原change及账号串行队列，检查本机volatile，未保存时保留同ID绝对删除目标重试。取消及外部关闭不删除，待保存目标不丢弃；账号切换关闭旧窗口并退出管理。移除MoreSection及旧外层底部内距，列表内部滚动，错误和同步重试移至首屏，无新存储键或数据格式变化。

类型和相关脚本语法检查、差异检查，以及--memos／--toolbars／--icons／--domains／--domain-recent-records／--screens／--entry-creation在360×844／375×667／430×844／768×1024通过。便签增加阅读不写数据、完整长标题／Markdown、纯图片／仅标题、图片预览、管理切换、40px控件、原ID编辑、应用内取消／外部关闭、删除失败同目标重试、账号隔离和单页手势检查；原编辑／创建／图片／标签／排序断言保持，相关编辑入口先开启管理。页面检查更新便签为单页，保留根容器不能滚动到第二屏的断言。375px完整阅读及管理截图已目视。输出ui-preview-memo-reading-{final,toolbars,icons,domains,domain-recent,screens-final,entry}，日志memo-reading-{final,toolbars,icons,domains,domain-recent,screens-final,entry}-ui.log。

最终普通／预览构建、73源码／19产物WXSS、17页／12分包及18页／13分包启动检查、原包体预算通过，主包 **1,499,265／1,499,664字节**。日志memo-reading-{normal,preview}-final-build.log，当前保留隔离预览构建。未进行微信开发者工具或真机验证，未部署。规则见 [C158](../Design.md#便签单页阅读与管理入口c158)。

## 排序窗口收紧标题下方留白（C157）

2026-10-08，仅小程序。只调整components/sort-options.css的共享布局：正文上下12→4px，标题上下4→0px，页脚上下8→6px；关闭按钮外边距统一归零，省去继承全局按钮而撑高标题行的上下空白。左右12px、控件40px、选项6px及分组12px间距保持。便签、习惯、待办、文章均沿用SortPopover／SortOptions／SortDirection，无页面补丁或文字尺寸变化。相邻定位、最大高度、内部滚动、关闭及原排序保存行为保持。

类型、差异检查及原--memos／--habit-sorting／--todo-sorting／--toolbars在360／375×667／430／768通过。共享功能栏检查实际打开便签／习惯／待办／文章四种排序窗口，保留40px触控、6px选项及12px分组、单行文字、标题／正文／操作边界检查；原排序、保存、拖动、重试和账号隔离断言保持。便签排序检查增加定位可见后再量布局及截图，未放宽原断言。375px便签及习惯窗口截图已目视。输出ui-preview-sort-spacing-{memos,habit,todo,toolbars}-final，日志sort-spacing-{memos,habit,todo,toolbars}-final-ui.log。

最终普通／预览构建、73源码／19产物WXSS、17页／12分包及18页／13分包启动检查和原预算通过，主包 **1,499,075／1,499,474字节**。日志sort-spacing-{normal,preview}-final-build.log，当前保留预览。未进行微信开发者工具或真机验证，未部署。规则见 [C157](../Design.md#排序窗口收紧标题下方留白c157)。

## 格言轮播设置收紧留白（C156）

2026-10-08，仅小程序。数字框沿用SingleLineInput的40px紧凑高度与原生输入几何，页面仅将外框宽设96px并居中；窗口宽280→240px，正文上下12→8px。移除正文内常驻42px空错误区，将完整错误组合到footer操作下方，无错误不占位。

ChoicePopover新增heightMode='content'，自然撑高并保留maxHeight和内容滚动；原默认measured高度及其他调用保持。反馈出现时无需等待测量先压缩正文，取消／保存位置保持，原输入、严格校验、关闭、保存与账号／重试规则不变。此差异通过共享浮窗参数实现，未另写输入框或页面定位算法。

类型、差异检查及原--mottos／--toolbars在360／375×667／430／768通过；覆盖错误前后按钮位置、完整整数校验、关闭／取消、保存及同目标重试、账号隔离、首页同源轮播，默认浮窗与十页功能栏沿用原行为。未新增或放宽测试断言，375px窗口截图已目视。输出ui-preview-motto-rotation-compact-final与ui-preview-motto-rotation-compact-toolbars，日志motto-rotation-compact-{final,toolbars}-ui.log。

最终普通／预览构建、73源码／19产物WXSS、17页／12分包及18页／13分包启动检查和原包体预算通过，主包 **1,499,044／1,499,443字节**。日志motto-rotation-compact-{normal,preview}-final-build.log，当前保留预览。未进行微信开发者工具或真机验证，未部署。规则见 [C156](../Design.md#格言轮播设置收紧留白c156)。

## 习惯卡收紧上下留白（C155）

2026-10-08，仅小程序。共享HabitCard文字区上下内距从8rpx收紧至4rpx，标题到统计从8rpx改为6rpx；最小卡高max(96rpx,56px)，其余高度由内容决定。移除习惯主页按视口拉伸四行的测量及内联高度、推荐固定高度、领域详情固定行高；领域两列两行横向分页及原卡间距保持。基础响应式规则归入habit-card.css，页面只负责容器。打卡及查看入口明确至少40px，长名称仍最多两行，统计、推荐信息、原数据和拖动测量保持。

类型、差异检查及原--daily／--domains在360／375×667／430／768通过，覆盖两列布局、长标题、统计、推荐、内部滚动、分类横滑、拖动、领域横向分页、打卡／撤销、原ID编辑及账号／失败守卫。既有长列表断言改为内部滚动及至少原八条完整可见，省去旧四行拉伸的高度倍数及恰好八条要求，其余检查保留。375px主网格／推荐、领域末页及768px主网格截图已目视；领域等分两行确保末页少量卡片也不单独拉高。输出ui-preview-habit-card-compact-{daily,domains}-final，日志habit-card-compact-{daily,domains}-final-ui.log。

最终普通／预览构建、73源码／19产物WXSS、17页／12分包及18页／13分包启动检查和原预算通过，主包 **1,498,821／1,499,220字节**，详情分包 **20,513字节**。日志habit-card-compact-normal-final-build.log与habit-card-compact-preview-build.log，当前保留预览。未进行微信开发者工具或真机验证，未部署。规则见 [C155](../Design.md#习惯卡收紧上下留白c155)。

## 可复用组件架构（C154）

2026-10-08，仅小程序。新增components/domain-records，提供DomainRecordColumns、DomainRecordColumn及DomainRecordCard。两处调用统一使用基础结构及样式；Column默认static，create变体通过类型要求创建名称／回调，Card转发原生属性、数据标识、className／style和业务点击，集中禁用及阻止冒泡。metadata和children用于组合场景内容，最近记录保留领域信息，详情保留标题／空白创建及完整历史。数据选择、账号守卫及原保存队列继续留在原页面／lib，无新存储。

记录布局、响应式规则、正负色、间距与反馈从页面及编辑器CSS迁到基础组件，Markdown内容的flex／换行由内容组件拥有；删除重复声明及场景内的基础样式覆盖。基础公开字号、列内距、符号间距及记录内距变量，页面只保留外层窗口及metadata样式。已有按钮、输入、功能栏、习惯卡及编辑器保持原共享实现，未将本次迁移表述为所有旧页面已重构。组件边界、Props／Variants／Composition与局部定制说明见 [组件架构](component-architecture.md)。

类型、脚本语法及差异检查通过。原--domains与--domain-recent-records在360／375×667／430／768通过；覆盖两种标题变体、记录／图片点击边界、Markdown同源字号与色彩、原ID编辑、全历史／合计十条、内部滚动、创建／完成／撤销、管理几何、失败重试与账号隔离。最近记录检查新增公开字体变量覆盖实际两栏及Markdown、周围卡片不变、撤销覆盖恢复默认的验收，其他数据及交互断言保留。375px最近窗口及详情历史截图已目视。输出ui-preview-component-architecture-{recent-final,domains-final}，日志component-architecture-{recent-final,domains-final}-ui.log。

初次普通构建通过，预览主包超过原预算141字节；合并重复字体／颜色声明、移除冗余布局声明并将正文布局归入内容组件后，两个最终构建均通过，未放宽预算或移除检查。最终73源码／19产物WXSS、17页／12分包及18页／13分包启动检查通过，普通／预览主包 **1,499,562／1,499,961字节**，详情分包 **20,513字节**。日志component-architecture-{normal,preview}-build.log，当前保留预览。未重跑无关全量UI，微信原生环境未实测，未部署。规则见 [C154](../Design.md#可复用组件架构c154)。

## 最近记录复用正负双栏布局（C153）

本节保留历史实现与验证。C174继续共用双栏、颜色、符号及记录卡，但最近窗口移到顶部，省去可见标题与领域metadata；详情默认标题及完整历史保持。

2026-10-08，仅小程序。DomainRecentRecords在原ScrollView中复用详情domain-records的左负／右正两栏、domain-record-column、domain-record／sign及原Markdown内容组件，删除旧最近记录的独立字号、行距、横向分隔和按钮反馈覆盖。每条所属领域／类型仍显示，分组标题用只读View复用详情外观，不增加创建动作。原recentDomainRecords先选合计最新十条，再按类型展示；每栏原降序、单个共同滚动区、空栏／全空、原ID编辑及图片事件保持，不修改存档、接口或队列。

原四尺寸--domain-recent-records通过。旧DOM遍历顺序断言按左负右正更新，仍明确验证相同最新十条及删除后的正确补位；原数据不变、同时间排序、40px控件、内部滚动、Markdown／图片、编辑／删除／重载及账号守卫断言保留，未新增样式镜像测试。375／768px双栏截图已目视，输出ui-preview-domain-recent-columns，日志domain-recent-columns-ui.log。

类型、脚本语法及差异检查通过。普通／预览构建、72源码／19产物WXSS、17页／12分包与18页／13分包启动及原<1.5MB预算通过，主包 **1,498,764／1,499,163字节**，日志domain-recent-columns-{normal,preview}-build.log，当前保留预览。未重跑无关全量UI，微信原生环境未实测，未部署。规则见 [C153](../Design.md#最近记录复用正负双栏布局c153)。

## 领域卡目标分隔与单行（C152）

2026-10-08，仅小程序。原DomainProgressSummary主卡底部复用GoalSummary，通过showLabel=false省去可见「短期」节点，保留完整ariaLabel及同源目标／状态；其他调用默认显示原标签。页面底部目标区增加1px领域线色分隔及5px上内距，继续使用共享nowrap／ellipsis，无新存储或卡高变化；管理隐藏整个原目标节点及分隔线，几何保持。未新增低影响展示的专用测试。

类型、脚本及差异检查通过，原--domain-recent-records在360／375×667／430／768通过，覆盖当前／历史完成／未设置目标、108px卡高、管理几何及40px操作、十条混合记录、原ID编辑和存储／账号守卫。375px主卡截图已目视标签移除、分隔线及单行目标，输出ui-preview-domain-card-divider，日志domain-card-divider-ui.log。普通／预览构建及72源码／19产物WXSS、17页／12分包和18页／13分包启动、原<1.5MB预算通过，主包 **1,499,293／1,499,692字节**，日志domain-card-divider-{normal,preview}-build.log，当前保留预览。未重跑无关全量UI，微信原生环境未实测，未部署。规则见 [C152](../Design.md#领域卡目标分隔与单行c152)。

## 待办页边距、分隔与加号对齐（C151）

2026-10-08，仅小程序待办主页CSS。左右页边距从10rpx改为32rpx，与习惯及移动端领域一致；摘要及排序／筛选沿用原PageToolbar。去掉象限标题下边线及任务行下边线；原优先度外框、拖动插入提示保持。加号回到标题区flex流，去掉旧绝对顶部定位及文字区的40px占位，父布局负责垂直居中，原共享图标控件外观与触控保持。未修改任务数据或保存逻辑，未新增低影响样式的专用测试。

类型、脚本语法及差异检查通过。既有显示检查将旧的顶部定位断言改为标题区垂直居中，其余完整可见、共享控件外观、触控、标题不遮挡及原交互断言保留；运行器增加--todo-display，独立复用原检查，没有另写样式镜像测试。四尺寸360／375×667／430／768的--todo-display及--toolbar-summaries通过，覆盖四象限填满首屏、长标题、40px按钮、内部滚动、完成分组、筛选、创建优先度及往返，摘要同时覆盖原三页统计、长名称、稳定控件、跨日及账号守卫。输出ui-preview-todo-layout-{display,summaries}，日志todo-layout-{display,summaries}-ui.log。375px三页摘要与最终密集任务页已目视。

完整--todos本轮未全部通过：首次在旧加号顶部断言失败，已按新要求更新；随后一次在360px任务备注Markdown预览的strong节点缺失，重跑通过该步骤及360／375px，但在430px下一步第二行聚焦断言失败。本轮没有修改这些编辑器逻辑，也未放宽其断言。完整回归日志todo-layout-todos-{final,rerun}-ui.log；上述四尺寸显示及摘要专项均独立通过，不将其表述为完整待办回归通过。

普通／预览构建通过，含72个源码／19个产物WXSS、17页／12分包及18页／13分包启动检查和原主包<1.5MB预算，主包 **1,499,191／1,499,590字节**。日志todo-layout-{normal,preview}-build.log，当前保留预览。微信原生环境未实测，未部署。规则见 [C151](../Design.md#待办页边距分隔与加号对齐c151)。

## 格言轮播设置（C150）

2026-10-08，仅小程序。格言创建／编辑框移除固定十五秒提示，原字数右对齐；主PageToolbar在创建左侧复用ManageSymbol及ChoicePopover的40px纯图标入口，设置小窗使用SingleLineInput／SectionTitle及共享按钮。移除旧功能栏baseline覆盖，设置与创建入口居中对齐；当时窗口统一12px内容内距，提供关闭／取消／保存，错误预留42px避免操作移动，不自动聚焦数值框。尺寸及空错误区已由后续C156更新。

PersonalMottos版本1增加可选rotationSeconds，旧存档缺省仍15000ms。mottoRotationMs与原存档验证用于首页只读，写入辅助置于仅格言分包使用的motto-settings，避免将设置提交及提示代码放进主包。严格正整数并限制在timeout溢出边界之内，窗口保存前校验；只更新原间隔，不物化默认列表，创建／编辑／删除保留该字段。首页原定时器引用同源间隔，变化时清理旧定时器；随机／上一条／暂停／触摸／隐藏条件沿用。保存复用原账号队列和最新状态，未持久化保留同秒数并禁用修改，仅重试同目标；账号变化收起旧窗口。不新增存储键或修改网页／后端。

类型、脚本语法及check-motto-data.cjs通过，覆盖旧存档十五秒、可选间隔持久化、默认来源及空列表不改变、CRUD保留间隔、非法数值／timeout边界、原单句校验、取消数量上限与账号队列隔离。360／375×667／430／768的 --mottos 全部通过，包含原格言随机／历史／十五秒／暂停、61句新增重载，以及新增设置入口左右及垂直对齐、无自动聚焦、严格秒数／错误操作位置、取消／外部关闭、保存重载、存储失败同目标重试、首页实际四秒计时及暂停恢复、账号设置读取／实际保存与游客隔离，未写共享默认格言接口。首页来源未就绪时可能先显示默认格言，计时测试等待个人数量就绪并暂停／恢复后测量；未放宽计时边界。日志 motto-rotation-ui.log，截图 ui-preview-motto-rotation；375px设置窗与按钮已目视。完整其他页面UI未在本轮重跑。

最终普通／预览构建及差异检查通过，含项目设置、72个源码／19个产物WXSS、17页／12分包及18页／13分包启动与原<1.5MB预算，主包 **1,499,399／1,499,798字节**。日志 motto-rotation-{normal,preview}-build.log，当前保留预览。未部署，微信原生环境未验证。规则见 [C150](../Design.md#格言轮播设置c150)。

## 领域卡短期目标与最近记录（C149）

C174将最近记录移到功能栏之后、领域卡之前，省去可见标题与领域metadata，卡高按首屏四行适配；本节旧下方位置及108px高度仅作历史。目标数据、十条选取与编辑规则保持。

本节保留历史实现与验证。C173将卡内操作改为排序模式下两个移动符号，短期摘要仅排序时隐藏；管理模式继续显示摘要并可导航。目标选取、卡片几何和最近记录规则保持。

2026-10-07，仅小程序。DomainProgressSummary 新增 showShortTermGoal，复用 displayedDomainGoal 和 GoalSummary，在主卡底部显示当前短期目标／原已完成历史摘要及状态，无目标显示「未设置」。长期目标仍只在详情显示。卡片保持两列、108px 内容高度、40px 图标和原图文坐标；管理时短期节点 visibility:hidden 保留几何，原三个40px操作不重叠。规则见 [C149](../Design.md#领域卡短期目标与最近记录c149)。

DomainRecentRecords 放在完整卡区下方，共用 SectionTitle、DomainRecordContent 与原状态；recentDomainRecords 将所有当前领域正／负记录合并，按创建时间降序、同时间稳定 ID 降序读取最新十条，排序不改源数组、记录或图片字节。一个内部滚动窗口保留全文、Markdown 和图片预览，空显示「暂无记录」；此上限仅作用于主列表窗口，详情全历史保持。新窗口正文不继承旧 HTML 空白保留样式，避免标签间换行增加空白。

原 record-editor.tsx/css 移至共享 components/domain-record-editor，record-edit.ts 移至 lib/domain-record-edit，两页沿用同一原 ID 编辑、创建日期、正负类型、领域、账号队列、容量／最新记录守卫、隔离草稿及同目标失败重试。主页面编辑窗口放在 PageScroll 外，避免内部滚动裁切；账号／来源未就绪或无效时不展示旧卡及记录，没有新增业务存储。

类型、原领域数据及原ID编辑纯逻辑检查通过；原领域完成数覆盖新加坡／纽约／UTC日期规则。新增 check-domain-recent-records-data.cjs 通过，覆盖跨领域正负合计十条、稳定ID／数值时间、limit边界、纯图片和原引用、不可变读取、编辑／删除补入和领域改名／删除；已加入 test:logic，独立入口为 npm.cmd run test:domain-recent-records。相关脚本语法与差异检查通过。

360／375×667／430／768四尺寸 --domain-recent-records 与原 --record-edit 通过。专项覆盖短期目标当前／已完成／未设置、管理与浏览同几何、领域重排后记录顺序不变、实际内部滚动及第十条完整可达、长文／Markdown／纯图片与预览、原ID编辑即时刷新、删除补入／重载、40px操作、空／加载／不兼容状态及账号隔离。原编辑回归覆盖隔离草稿恢复、图片、保存／删除未持久化同目标重试及账号守卫。375px短期卡和最近记录截图已目视，日志 domain-recent-{records,edit}-ui.log，截图 ui-preview-domain-recent-{records,edit}。

原 --domains（含管理）和 --domain-preview 四尺寸全部通过，覆盖默认八卡首屏、两列和图文／按钮几何、原完成数／进展线、详情导航、目标完成／撤销／历史、共享习惯创建编辑、记录创建、持久化失败与账号隔离、示例记录及正常游客／账号隔离。旧主卡无目标断言改为短期可见／长期隐藏；原整页不滚动断言改为八卡完整显示及下方窗口可达，原按钮和边界要求保留。日志 domain-recent-{domains,preview}-ui.log，截图 ui-preview-domain-recent-{domains,preview}；完整其他页面UI未在本轮重跑。

最终普通／预览构建通过，含项目转换设置、72个源码／19个产物WXSS、启动与原<1.5MB主包预算；主包 **1,499,138／1,499,537字节**，17页／12分包及18页／13分包。日志 domain-recent-{normal,preview}-build.log，当前保留预览。未部署，微信原生环境未验证。

## 待办与领域功能栏摘要（C148）

2026-10-07，仅小程序。待办／领域通过 PageToolbar 的 leading 使用共享 PageToolbarSummary，习惯原摘要也迁至该组件；原12px字体、颜色、2px间隔和长名称省略移到 page-toolbar.css，右侧按钮及功能栏高度沿用。没有额外摘要行、缓存或业务写入，完整名称用无障碍文本保留。

todoToolbarSummary 读取原全量任务，domainToolbarSummary 读取原 domains 正负记录和 completedGoals；本地今天计数、所有历史最近项排除无效／未来时间，领域只取仍存在领域的已完成短期目标，同时间按稳定ID破平局，不改原数组或筛选／排序。usePageNow 在可见时每分钟及页面显示时触发刷新，每次渲染返回当前时间，防止刚保存的记录因晚于上次tick被误判未来；待办原创建意图／焦点处理保留，领域原完成数用同一时间跨日刷新。摘要仅在对应原来源／账号就绪且有效时显示，领域不依赖习惯来源就绪来隐藏摘要。规则见 [C148](../Design.md#待办与领域功能栏摘要c148)。

类型、原待办逻辑及领域完成数检查通过；领域原逻辑覆盖新加坡／纽约／UTC本地日期、目标类型、完成／撤销、未来过滤、共享习惯与删除。新增 `check-toolbar-summaries-data.cjs` 在系统时区及新加坡／纽约／UTC通过，覆盖历史最近项、稳定ID、未来／无效时间、纯图片、撤销／删除、保留创建日期及不可变读取。

360／375×667／430／768四尺寸 `--toolbar-summaries` 通过，覆盖两页全局摘要与原habit摘要、长名称单行省略及完整无障碍文字、同排按钮／字体／几何、任务筛选／真实完成撤销／删除、正负记录创建／正文编辑／删除及跨页返回、目标撤销／删除领域、跨日归零与历史名称保留、12:00初次渲染30秒后完成／保存立即更新、账号读取时清除旧摘要及格式不兼容守卫。测试适配器支持指定tool账号读取挂起，默认行为保持，未改生产接口；每日习惯fixture补齐原兼容minutes，按钮限定主列表避免同名推荐卡。日志 `toolbar-summaries-ui.log`，截图 `ui-preview-toolbar-summaries`，375px待办／领域已目视；完整其他UI套件未在本轮重跑。

普通／预览构建及差异检查通过，含项目转换设置、71个源码／20个产物WXSS、启动及原<1.5MB主包预算，主包 **1,482,828／1,483,227字节**，17页／12分包及18页／13分包。日志 `toolbar-summaries-{normal,preview}-build.log`，当前保留预览，未部署；微信原生环境未验证。

## 首页默认便签、统计与个人空间（C147）

2026-10-07，仅小程序。`defaultHomeShortcuts` 使用明确六项键顺序 memo-list／pomodoro／daily／statistics／growth／journal，便签列表新增到原可编辑目录；ShortcutIcon 与 HomeShortcutEditor 共用 defaultShortcutIcon，memo-list 缺省复用 memos 图形并同步图标库选中态，仍使用原48项图集。首页已有 memo-list、统计及个人空间导航分支直接复用。旧 create／memos 创建及 eat 功能身份保持，完整目录不变。

`normalizeHomeShortcuts` 仅将原六卡键顺序、默认名称／颜色、card、无自定义图标且序号缺省或1–6的旧布局升级；其他自定义及空布局沿用原正常化与空号规则。原版本、设置键、保存失败及账号同步范围保持，不修改便签、任务或其他工具数据。规则见 [C147](../Design.md#首页默认便签统计与个人空间c147)。

类型、相关测试脚本语法、快捷方式纯逻辑和48图标／8色图集检查通过，覆盖新默认、旧六卡无／有序号升级、名称／颜色／图标／顺序／空号与空布局保留、便签缺省图标映射。默认创建入口相关旧回归使用显式自定义六卡测试布局，原创建／排序断言保留。360／375×667／430／768四尺寸 `--home-shortcut-layout` 和 `--home-navigation` 均通过，覆盖三入口真实导航、多颜色／标签便签全部显示且不进入创建、便签缺省图形及图标库选中、改图标保存／取消、旧默认真实升级、原自定义拖动／空号／保存失败重试、16项选择、空布局及恢复默认；完整目录仍为原16项，原任务／便签创建、今日食选与番茄钟动作保持。375px首页截图已目视，六卡及快捷输入完整可见。日志 `home-default-pages-{layout,navigation}-ui.log`，截图 `ui-preview-home-default-pages-{layout,navigation}`。首轮脚本的便签读取等待及食选定位已修正，业务源码无需额外改动；完整 entry-creation／memos／entry-clear-focus 未在本轮重跑。

最终普通／预览构建及差异检查通过，含项目转换设置、71个源码／20个产物WXSS、启动及原<1.5MB主包预算；主包 **1,480,226／1,480,625字节**，17页／12分包及18页／13分包。日志 `home-default-pages-{normal,preview}-build.log`，当前保留预览。未部署，微信原生环境未验证。

## 习惯移除独立状态行（C146）

2026-10-07，仅小程序。移除 daily 页独立状态 CategoryRow，不渲染空占位；原筛选窗口继续引用 habitStatuses 和 habitStatus，默认进行中、领域分类、主列表跟手横滑和 useHabitGridSort 保持。仅有归档习惯时空态提示改为从筛选查看，数据与保存队列不变。规则见 [C146](../Design.md#习惯移除独立状态行c146)。

相关测试通过共享 habit-filter-test-helpers 从真实筛选入口选择／核对状态，打开后按原外部遮罩关闭，保留四状态、归档、排序、补记及横滑守卫的原断言；同时验证无独立状态节点、主列表只留领域分类行。九个新增／修改脚本语法及 `test:daily` 通过，覆盖360／375×667／430／768四尺寸的默认进行中、四状态筛选、跟手预览／边界、取消／弹层／账号变化、长按排序、完成／撤销、归档恢复、删除、补记及月历日志。日志 `habit-remove-status-daily-ui.log`，截图 `ui-preview-habit-remove-status`，360／375px默认列表已目视。

typecheck、差异检查与普通／预览构建通过，含项目转换设置、71个源码／20个产物WXSS、启动及原<1.5MB主包预算，主包 **1,479,782／1,480,181字节**，17页／12分包及18页／13分包。日志 `habit-remove-status-{normal,preview}-build.log`，当前保留预览。仅删除状态行，未修改微信工具或后端，浏览器适配验证不代表真机验证。

## 进展单框、正负保存与标题互通（C145）

历史实现：单框与底部两个保存按钮已由 [C171](../Design.md#进展双框与独立正负选择c171) 替代；下文保留当时验收，当前上框继续与标题互通、下框独立保存，旧待重试仍保留原提交目标。

2026-10-07，仅小程序。`ProgressEditorFields` 和滑动 `EntryPreview` 改为单个 Markdown 记录框，底部复用 SheetActions／ActionButton large／fill，左「保存负记录」、右「保存正记录」，等宽48px且单行。局部 CSS 仅重置提交区的 flex／最小宽度／外距，避免新按钮继承全局 button 外距；共享字体、颜色、内距与触控规格保持。

`switchEntryMode` 双向同步当前任务／备忘录标题和进展内容，保留多行及长文本，目标保存时才校验任务100／备忘录80／进展6000字限制；正文／图片的原任务与备忘录互通、日程／下一步、颜色／置顶、领域和进展图片保留。ProgressDraft 兼容原结构，用 single 标记唯一输入、kind 记录本次保存类型；只向原 domains 队列提交一条、保留创建时ID／日期。未持久化时按原 pendingSave 保存类型，禁用相反按钮并再次核对目标，不允许以另一类型重复提交。

旧未提交双框保留为本机草稿恢复队列，当前记录保存后只移除相同ID，另一框用原ID继续保留，重开逐条确认；类型切换用新标题替换旧独立文字时保留旧记录候选。旧已提交待重试批次不迁移，仍以原两个候选幂等重试。未更改正式 DomainState、后端、存储键或既有实体编辑。

已通过 typecheck、进展纯逻辑、任务数据兼容、相关七个脚本语法、完整四尺寸 `test:entry-creation`、`test:domains` 及最终 `--progress-creation`。专项覆盖单框／两个按钮真实宽高与单行、点击／跟手滑动文本互通、长文不截断及目标长度校验、原字段／图片、图片单独保存为负记录、领域选择／未分类、关闭／刷新、旧双框逐条保留原ID、旧待重试批次、负记录失败后禁用正按钮并关闭重开同ID重试、来源刷新后再试、图片处理及账号切换丢弃晚到回调。测试注入旧草稿后刷新适配器，避免其本次会话内存缓存覆盖注入值。日志 `single-progress-entry-ui.log`／`single-progress-domains-ui.log`／`single-progress-final-ui.log`，截图 `ui-preview-single-progress`／`ui-preview-single-progress-domains`／`ui-preview-single-progress-final`；375px单框与操作已目视。

普通／预览构建的项目转换、71个源码／20个产物WXSS、启动及原<1.5MB主包预算通过，主包 **1,480,159／1,480,558字节**，17页／12分包及18页／13分包；日志 `single-progress-{normal,preview}-build.log`，当前保留预览。底部检查同步 C140 的右侧箭头入口和 C134／C135 的已完成习惯及默认日志步骤；完整 test:sheet-footers 在375px＋34px安全区的习惯详情核心布局校验仍失败，detail controls 底部574.92px超过滚动视口558px，涉及未改动的习惯详情，未放宽断言。日志 single-progress-footers-final-ui.log；本轮 `--sheet-footers --progress-footers` 专项通过四尺寸及额外430×720短屏，覆盖34px安全区、领域主列表／详情两种宿主、两个按钮同排及距页底8／34px、输入／工具栏可达、原业务数据保留；日志 single-progress-footers-scoped-ui.log，375px详情截图已目视。差异检查通过。微信开发者工具／真机未验证，未部署。

## 快捷提醒要求任务具体时间（C144）

2026-10-07：共用 `TodoScheduleSheet` 在当前窗口记录本轮快捷项的锚点／分钟偏移；未完成任务时间时不计算默认09:00的提醒，主行显示「还未设置具体时间」。提醒「完成」及日期「确认」共用校验，错误在当前提醒窗的预留行显示；关闭子窗不能绕过日期确认。有效完成任务时间后计算选定快捷提醒，手动完成提醒具体时刻或清除提醒／全部日程释放该依赖，不新增存档字段。原已保存绝对提醒不增加依赖，沿用 C121 的清除时间规则。

新增五快捷项缺少任务时间的回归在修改前失败；修改后 typecheck、日程纯逻辑及四尺寸 `test:reminder-settings` 通过，覆盖提示及完成按钮边界稳定、关闭子窗后总确认阻止回填、未完成数值输入不满足校验、补齐时间重新计算、再次清除时间继续阻止、最终保存／刷新同 ID 与准确时刻、手动具体提醒独立保存，原取消、月末、跨午夜、账号与存档断言保留。脚本使用两次动画帧等待快捷选择后的原浮窗测量完成，再量提示前后边界；375px提示截图已目视。日志 `reminder-requires-time-{before-ui,ui}.log`，截图 `ui-preview-reminder-requires-time`。四尺寸 `test:schedule-time` 通过，覆盖既有绝对提醒随任务时间清除／修改仍保留；日志 `reminder-requires-time-existing-ui.log`。普通／预览构建的项目转换、71个源码／20个产物WXSS、启动及原主包预算通过，主包 **1,478,076／1,478,475字节**；日志 `reminder-requires-time-{normal,preview}-build.log`，当前保留预览。差异检查通过，微信开发者工具／真机未验证，未部署。

## 提醒快捷项切回当天（C143）

2026-10-07：共用 `TodoScheduleSheet` 的五个快捷项使用原 `setReminderChoice(choice.id, 0)`，显式以任务当天为日期锚点重新计算。手动日期选择仍使用原偏移及当前快捷时间；没有新增状态或保存字段，取消、绝对 `reminderAt`、确认与最终保存保持。

原基线提醒回归通过；新增“先选前一天再点准时”断言在修改前失败（仍显示前一天），修改后 typecheck、日程纯逻辑及四尺寸提醒回归通过。覆盖五个快捷项各自重置此前的日期、从具体时刻切回、之后可再选前一月及月末收拢、00:05提前10分钟的结果锚点为当天且实际提醒为前日23:55、取消保留原存档、无日程默认和同 ID 保存。日志 `reminder-quick-{baseline,reset-before,reset}-ui.log`，截图 `ui-preview-reminder-quick-reset`；375px截图已目视，相关脚本语法检查通过。普通／预览构建的项目转换、71个源码／20个产物WXSS、启动及原主包预算通过，主包 **1,477,410／1,477,809字节**；日志 `reminder-quick-reset-{normal,preview}-build.log`，当前保留预览。微信开发者工具／真机未验证，未部署。

## 提醒日期选项汉字数字（C142）

2026-10-07：共用 `reminderDays` 的日期文案统一为「当天／前一天／前两天／前三天／前一周／前一月」，选项及选中结果同源；仅改显示文案，原数值偏移、月末收拢及绝对 `reminderAt` 保存保持。

typecheck、日程纯逻辑、相关五个脚本语法及提醒四尺寸浏览器回归通过，覆盖选择／重开、月末收拢、嵌套时间输入、取消与同 ID 保存；375px日期选项截图已目视。日志 `reminder-day-chinese-ui.log`，截图 `ui-preview-reminder-day-chinese`。普通／预览构建的项目转换、WXSS、启动及原主包预算通过，主包 **1,477,408／1,477,807字节**；日志 `reminder-day-chinese-{normal,preview}-build.log`，当前保留预览。微信开发者工具／真机未验证，未部署。

## 格言取消数量上限（C141）

2026-10-07：移除 `motto-data.ts` 的 MAX_MOTTOS、数组数量校验和新增拒绝；格言页完整读取默认来源，创建入口仅沿用来源可写守卫，计数显示当前「N句」。单句120字符、非空／重复、编辑冲突、原存档版本及账号队列保持，无替代数量上限。

类型及格言纯逻辑检查通过，覆盖第51句新增、超过50句存档往返及500→501句；原编辑／删除／默认来源保留／账号隔离断言继续通过。格言页面四尺寸浏览器回归通过，默认60句完整读取并滚到末项，第61句可创建，刷新后全部61句及末条原文保留，计数不含上限且创建按钮保持可用。浏览器适配器为该回归开启原隔离工具缓存持久化，并在切换默认来源fixture前仅清除测试账号的格言键，不接触真实存储。日志 `mottos-no-count-limit-ui.log`，截图 `ui-preview-mottos-no-count-limit`；相关脚本语法检查通过。

普通／预览构建的转换设置、71个源码／20个产物WXSS、启动与原<1.5MB预算通过，主包 **1,477,388／1,477,787字节**，17页／12分包及18页／13分包，当前保留预览；日志 `mottos-no-count-limit-{normal,preview}-build.log`。375px列表计数及长列表已目视，差异检查通过；微信开发者工具／真机未验证，未部署。

## 习惯、滑动、首页、排序与日程本轮调整（C134–C140）

2026-10-07，仅小程序。规则见 [C134–C140](../Design.md#本轮习惯滑动首页排序与日程c134c140)。习惯主列表增加四状态（默认今天未完成），领域栏继续独立；完成摘要放在原功能栏左侧，数量及最新名称读取 reminders 的原 done／checkInTimes。`useHabitGridSort` 与共享 `SwipePanels` 协调分类跟手预览、长按排序、取消和合成点击抑制，无分类缓存。

共享 HabitCalendar 的图例上下各 8px，月日志默认最近十条，全宽「更多」每次十条，月份／习惯变化重置；日志行上下 6px。详情首选高度 656／676px 对应新增图例留白，继续限制到可用视口减 12px，日期保持六行 40px。长日志从原内容区滚动，底部操作固定。任务列表上下 8px，便签上下 4px、正文／标签间距 2px；领域原上下 4px 保持。

EntryComposer 明确横滑后使用无 Input／Textarea 的 `EntryPreview` 草稿快照，当前和相邻内容随每次触摸移动；只保留当前真实编辑器，释放才更新原类型，原隔离草稿和 ID 保持。类型切换／清空先关闭键盘，移除旧节点并延后 100ms 发出新首字段聚焦请求；失焦不持续抢占。打开日程原标题与下一步失焦，原表单暂时禁用，关闭不重新聚焦。新增检查在 -12／-36／-3／-96px 移动阶段量真实两页边界、回拖近起点继续跟手、相邻可见宽度、类型尚未提交和无原生输入，备忘录切到进展后没有旧标题节点。图像仅快照读取，不写额外草稿或业务状态。

首页取消额外快捷项造成的无限高首屏，中部快捷区内部滚动、底部快捷输入固定可见，全量入口／设置／第二页保留。`SortPopover`／`SortOptions`／`SortDirection` 为任务、习惯、便签和文章统一窗口、40px按钮、6px按钮间距、12px分组间距与单行文字；便签排序／筛选使用共享纯符号，筛选高亮来自实际条件。

日程底部三行正文与右侧入口分开且无嵌套按钮，尾部只占一个 40px 位，未设为箭头、已设为清空叉。`ChoicePopover` 可选 `anchorId` 供外部按钮提供测量锚点，默认调用行为不变；日程选项及提醒日期／时刻层移到日期弹层同级，退出 ScrollView 与父选项的 overflow 裁切。快捷项不聚焦数值，日期／时刻子窗可真实命中；原严格校验、绝对 reminderAt、取消、分层确认及最终保存守卫保持。

已完成验证：typecheck、原创建／标签／进展与日程纯逻辑、完整 `test:entry-creation`、创建聚焦／清空专项、完整 `--daily`／`--todos`／`--memos`／`test:domains`、习惯状态跟手预览／排序／归档／月历补记、首页十快捷项、十页工具栏及统一排序、提醒／时间专项均通过四尺寸浏览器适配检查（360×844／375×667／430×844／768×1024）。覆盖草稿／账号隔离、ID与失败重试、日志10→20→30及月份重置、取消／多指／竖向／长按、快捷区末项和底部输入可达、弹层真实命中和非零安全区。相关脚本语法及差异检查通过；相关375px截图已目视。原领域工作流仅将默认日志及已完成习惯的查看步骤同步到新规则，原持久化、共享来源、删除和账号断言保持。

截图与日志在 `miniprogram/test-results`：`ui-preview-continuous-entry-final`／`continuous-entry-final.log`、`ui-preview-current-interactions-focus`、`ui-preview-habit-status-{progress,sort,archive,calendar,daily}`、`ui-preview-oct7-{shortcut-layout,sort-memos-final,sort-todos,sort-toolbar-final}`、`ui-preview-schedule-interaction-reminder-final`、`ui-preview-current-interactions-domains`。普通构建的项目转换设置、71个源码／20个产物WXSS、17页／12分包启动和原<1.5MB主包预算通过，主包 **1,477,539字节**，报告 `current-interactions-normal-package.json`。项目源配置关闭既有误开的 es6／enhance，保留其他设置；仅从资产复制排除无运行时引用的 `summary-radar/demo.png`（源文件与生成器保留），不修改产物或预算。

预览构建也通过相同WXSS、转换设置、启动与预算检查，18页／13分包，主包 **1,477,938字节**，示例分包 **17,902字节**；日志 `current-interactions-preview-build.log`，当前产物保留预览。微信开发者工具／真机的输入法、原生输入层及手势尚未验证，未部署。构建通过和浏览器焦点／命中检查不代表微信真机通过。

## 任务下一步连续输入与移动符号（C133）

2026-10-07：TodoEditorFields 在真实草稿行之后渲染一个稳定 ID 的提示占位行。末尾加号、该行聚焦和键盘「下一步」共用激活逻辑：保留当前原生 Input 节点，自动聚焦当前行，再分配新的末尾占位 ID；已有行输入不重复追加，同一事件内重复点击不会激活两次。用同步引用核对最新草稿及图片处理锁，移动按原步骤 ID 操作。上／下移复用 MoveSymbol 和共享 40×40px 图标按钮，删除及边界禁用保留，相关页面样式只负责宽度和间距。规范见 [C133](../Design.md#任务下一步连续输入与移动符号c133)。

saveTodo 和共用创建验证按有内容的下一步校验；正式保存过滤空白标题后再保留有效行 ID、顺序及原任务字段，不修改输入草稿。创建和编辑的提交按钮不再因未填行禁用，原图片、容量、来源及账号守卫保留。原任务编辑的比较与会话恢复忽略空行，单纯点击加号不触发未保存确认，也不把这些空行当成对最新步骤的修改；有内容的未提交输入继续恢复。创建草稿沿用原账号键，不新增存储或正式业务字段，不改完成生成规则及网页。

实际验证：typecheck、check-todos.cjs 纯逻辑及 mini/web 任务往返兼容、最终 --next-step 专项、完整 test:entry-creation 和 --todos 回归通过。360×844／375×667／430×844／768×1024 覆盖创建／编辑、加号／末尾输入／键盘聚焦、重复事件与图片锁、节点保持、纯箭头及 40px 点击区、原 ID／顺序、只激活空行直接关闭与外部收起、空白过滤和冷启动持久化；原标签、优先度、循环、通知、图片容量、切换保留与账号隔离检查保留。375px 创建和编辑截图已目视；相关脚本语法及差异检查通过。日志 next-step-{types,data,cross-client,ui-final,entry-final,todos-final}.log，相关浏览器截图位于 test-results/ui-preview；这是浏览器适配验证，不代表微信输入法已验证。

普通／预览构建的 WXSS、启动、项目转换及原主包预算通过，主包 **1,499,479／1,499,877 字节**，69 个源码／20 个产物 WXSS、17 页／12 分包和 18 页／13 分包；示例分包保持 **17,902 字节**，当前保留预览。日志 next-step-{normal,preview}-build.log。微信开发者工具／真机输入法未验证，未部署。

## 领域记录点击编辑与紧凑间距（C132）

2026-10-07：领域详情的既有记录使用完整业务行按钮，上下内距 4px、至少 40px 触控，正文和空白区域打开独立 DomainRecordEditor，不再显示列表删除按钮；DomainRecordContent 的图片阻止冒泡并保留预览。保留 C108 的正文字号／正负颜色、完整 Markdown、创建日期新到旧及页面滚动。编辑器放在领域详情分包，复用 MarkdownNoteEditor、SheetActions、compact DeleteSymbol，日期行显示原本机日期，删除 40×40px。规范见 [C132](../Design.md#领域记录点击编辑与紧凑间距c132)。

record-edit.ts 在最新 DomainState 中只更新指定领域／正负类型／记录，保留原 ID 和 createdAt；两者变化、记录已删除或最新记录与打开快照不同均拒绝覆盖，容量验证原完整状态后一次保存。图片仍按共享六张及压缩格式处理，空文字可有图片，空记录不可提交。编辑／删除沿用 domains 状态队列与账号守卫；volatile 时锁定输入及相反操作，按同 ID／同目标重试，成功才关闭并清理编辑草稿。

新增按账号及记录隔离的本机编辑草稿键 `ottlog-mini-domain-record-edit-v1:${owner}:${recordId}`，记录领域、正负类型、原快照、编辑内容及待重试动作；原与编辑图片共用一份图片池并以索引引用，使用原 900KiB 草稿容量校验。关闭／失焦页面保留本机编辑草稿；关闭写入失败时保留窗口和输入，恢复存储后可重试关闭。重新打开的普通草稿若原记录已改变，显示核对提示后基于当前快照明确保存；仍打开的窗口检测并拒绝晚到冲突，待重试草稿保留原快照及动作。来源挂载显式 retry，图片回调核对账号／记录，处理中或业务提交阻止删除／提交／关闭，不复制正式数据或改变旧存档结构。

实际验证：typecheck、记录编辑纯逻辑、最终 --record-edit 专项、完整 test:domains、test:preview、相关脚本语法及 git diff --check 通过。360×844／375×667／430×844／768×1024 覆盖真实行内距／至少 40px 触控／无列表删除、文字点击编辑／图片预览不冒泡、原 ID／日期／类型／领域、完整 Markdown、图片添加移除、日期及符号／底部操作可达、取消／外部关闭／刷新恢复、图片池只存一次原字节、保存后列表顺序及其他原数据保留；360px 补充空草稿恢复、保存失败关闭再开及同 ID 重试、删除失败同目标重试、草稿写入失败保留窗口与输入／恢复重存、图片处理禁止操作及账号切换后晚到图片丢弃。纯逻辑包含记录并发编辑／删除拒绝覆盖、容量／字数／图片和重试目标校验；完整领域回归保留原目标、习惯、全部历史与同步保护，原删除断言改为先打开编辑而未放宽。375px 列表及编辑窗口已目视。日志 record-edit-{types,data,ui-final,full-final,preview}.log，截图 ui-preview-record-edit-final／ui-preview-record-edit-full-final／ui-preview-record-edit-preview。

普通／预览构建的 69 个源码／20 个产物 WXSS、启动、项目转换及原 <1.5 MB 预算通过，主包保持 **1,499,364／1,499,763 字节**，领域详情分包 **32,324 字节**，示例分包保持 **17,902 字节**，17 页／12 分包、18 页／13 分包；当前保留预览。日志 record-edit-{normal,preview}-build.log。微信开发者工具／真机未验证，未部署。

## 共用创建自动聚焦与清空（C131）

2026-10-07：共用 EntryComposer 的首页输入／快捷操作、四象限、备忘录、领域列表及详情入口按 [C131](../Design.md#共用创建自动聚焦与清空c131) 自动聚焦。TodoEditorFields／MemoEditorFields 增加可选 autoFocus，标题失焦后关闭首次焦点请求；ProgressEditorFields 只给上框的 MarkdownNoteEditor 首次聚焦，当前按C171保留，下框不自动聚焦。既有实体编辑不传该选项，保持原交互。字段只在账号、来源和草稿就绪后挂载，切换类型及清空后的重新挂载请求焦点，不在编辑正文／预览／图片后抢焦点。

类型栏右侧的常驻清空按钮复用 compact icon 与 DeleteSymbol，实际 40×40px。clearInputs 使用 newEntryDraft／applyEntryQuadrant 一起重置任务、备忘录、进展两框及各自专属输入／图片，保留当前类型及入口默认上下文；首页 onCleared 同时清除原输入及其恢复种子。沿用账号创建草稿键，不删除正式记录、标签目录或其他账号。清空先同步最新草稿引用，防止同一事件循环的旧提交；图片处理以同步 ref 阻止清空／切换／关闭／提交。日程子窗、业务保存及未持久化待重试禁用清空，原 ID 重试仍有效；草稿落盘失败显示错误并保留已清空的当前输入，恢复存储后关闭可重存。移除本轮涉及字段和类型栏中已由共享按钮内联规范覆盖的局部外观声明，实际控件外观不变，包体预算未调整。

实际验证：typecheck、完整 test:entry-creation、最终 --entry-clear-focus 四尺寸、四个相关脚本语法及 git diff --check 通过。360×844／375×667／430×844／768×1024 检查真实焦点与不抢正文焦点、入口恢复、切换／清空再聚焦、40px 符号按钮、三种草稿的隐藏字段／图片全部重置、清空保留类型／象限／领域默认、首页输入不回带、刷新重开、同一事件循环的图片／旧提交守卫，以及正式数据／其他账号草稿保留。360px 补充草稿写入失败提示及恢复重存；原完整回归继续覆盖三个类型未持久化时禁用清空及同 ID 重试、账号切换、共享标签／优先度／Markdown 图片、类型滑动和容量校验。375px 创建窗口已目视。日志 entry-clear-focus-{types,full,ui-final}.log，截图 ui-preview-entry-clear-focus-full／ui-preview-entry-clear-focus-final。

普通／预览构建的 68 个源码／20 个产物 WXSS、启动、项目转换及原 <1.5 MB 预算通过，主包分别 **1,499,364／1,499,763 字节**，17 页／12 分包、18 页／13 分包；示例分包保持 **17,902 字节**，当前保留预览。日志 entry-clear-focus-{normal,preview}-build.log。浏览器只检查焦点状态，微信开发者工具／真机输入法呼出及键盘遮挡未验证，未部署。习惯、领域等独立创建窗口范围已询问，尚未答复，本条不代表其已改造。

## 领域卡上移下移与操作排列（C130）

本节保留历史实现与验证。当前按C173由独立排序入口显示两个移动符号，旧更多／卡内编辑删除移除，编辑删除位于详情右上角；移动队列及失败原目标重试保持。

2026-10-07：domains/index.tsx 删除 moveOpen 及排序浮窗，卡内直接使用原 move／reorderDomains 执行上移和下移；新增 MoveSymbol 复用 SortSymbol 的单向箭头样式，默认排序符号不变。卡内上移／下移／更多及浮窗编辑／删除均用共享 compact icon 40px 方形按钮，固定三列右下对齐；更多为 64px 相邻独立窄窗、单列 40px 编辑／删除，10px 内距及 6px 行距保持完整控件和对称留白。规范见 [C130](../Design.md#领域卡上移下移与操作排列c130)。

卡片内容统一 108px，高度与下内距各增加 20px，保留上部原 88px 图文区及摘要坐标；浏览／管理不变形，创建占位同高且加号居中。首尾方向、忙碌及待重试移动禁用；失败沿用原 volatile 目标顺序，在卡片外显示错误／重试，重试仅再次保存而不再次移动。未分类、编辑删除、账号隔离及创建失败同 ID 重试保持。仅小程序，无新存储或业务字段。

实际验证：typecheck、--domain-management 四尺寸和 test:preview 通过，脚本保留原确认／数据断言并将移除的排序入口改为直接移动。360×844／375×667／430×844／768×1024 管理检查覆盖全部按钮实际 40×40、同排右／下边距、无图标／标题重叠、展开前后及退出模式坐标不变、编辑删除竖排同列／6px 间距、8px 相邻窗口和视口边界、首尾禁用、直接上下移动、原 ID／记录／顺序、待重试禁止再次移动、同目标重试、取消编辑删除、未分类保护、容量／空列表、创建占位及账号切换。预览回归验证默认八域在短屏完整显示，原目标、共享习惯和正负记录、隔离草稿、编辑删除刷新和零真实账号接口调用。375px 管理菜单已目视。日志 domain-arrows-{types,ui,preview}.log，截图 ui-preview-domain-arrows／ui-preview-domain-arrows-preview。

完整 test:domains 四尺寸、相关脚本语法及 git diff --check 通过，保留领域详情、目标完成／撤销／历史、共享习惯创建编辑、正负进展、刷新持久化、账号及保存失败检查；check-domain-workflow 移除旧排序入口点击，原上下移动及数据断言保持。日志 domain-arrows-domains-final.log，截图 ui-preview-domain-arrows-full-final。

普通／预览构建的 68 个源码／20 个产物 WXSS、启动、项目转换及原 <1.5 MB 预算通过，主包分别 **1,499,016／1,499,415 字节**，17 页／12 分包、18 页／13 分包；示例分包保持 **17,902 字节**，当前保留预览。日志 domain-arrows-{normal,preview}-build.log。微信开发者工具／真机未验证，未部署。

## 习惯分类左右滑动（C129）

2026-10-07：daily/index.tsx 直接引用原领域名称和「全部／未分类」构成的分类列表，主 ScrollView 接入 useHabitGridSort.swipeHandlers；点击和滑动更新同一 coreGroup。CategoryRow 复用 scrollIntoView 与稳定位置 ID 显示当前选中项，分类栏自身横向滚动不切换分类，空列表可滑动。仅小程序，不增加业务字段、缓存、页面或分类副本。规范见 [C129](../Design.md#习惯分类左右滑动c129)。

原触摸协调器统一单指识别及长按等待，明确横滑复用原 400ms 点击阻止，长按进入拖动先取消分类手势；竖向、多指、取消、不完整结束或上下文变化不切换。保留最新 enabled／账号／分类／筛选守卫，切换回调另核对同步打卡和排序保存锁，防止尚未重绘禁用态时误切。长按等待只保留原始单指坐标，第二指加入即清除等待；精简重复触摸结构以满足原包体预算，未放宽检查或删除功能。

实际验证：typecheck、完整 test:daily、最终 --habit-category-swipe 专项及相关脚本语法通过。360×844／375×667／430×844／768×1024 覆盖两方向及首尾不循环、空分类、选中项真实可见、卡片按钮起手、横滑后的详情／打卡阻止、普通点击、竖向滚动、多指开始／加入、取消、短／斜移动、不同指及缺少结束坐标、分类栏自身滚动、未完成／归档筛选保留、排序／编辑／详情窗口、分类点击取消旧手势、长按真正换位及自定义顺序、同步保存锁、账号切换、页面往返及原记录／历史／排序持久化；完整回归还保留归档恢复、删除、完成感想和七日日历修改。375px 卡片及末项截图已目视，日志 habit-category-swipe-{types,ui-final,daily-final}.log，截图 ui-preview-habit-category-swipe-final。

普通／预览构建的 68 个源码／20 个产物 WXSS、启动、项目转换及原 <1.5 MB 预算通过，主包分别 **1,499,439／1,499,838 字节**，17 页／12 分包、18 页／13 分包；示例分包保持 **17,902 字节**，当前保留预览。日志 habit-category-swipe-{normal,preview}-build.log。微信开发者工具／真机触摸未验证，未部署。

## 习惯归档返回行移除（C128）

2026-10-07：daily/index.tsx 删除独立 daily-paused-entry 及条件包装，daily-core-summary 仅在 recentCompletion 存在时渲染原完成反馈；core.css 删除该归档按钮的无用样式。pausedCount 继续用于空状态，提示改为从筛选查看归档；原 viewPaused、筛选、恢复编辑器及数据规则不改。仅小程序，不删除习惯或历史。规范见 [C128](../Design.md#习惯归档返回行移除c128)。

实际验证：typecheck、完整 test:daily、相关脚本语法及 git diff --check 通过。360×844／375×667／430×844／768×1024 包含全部归档及归档筛选无独立行／边线、从筛选查看及返回进行中、冲突条件清除、编辑恢复和归档、原 ID／历史、失败同 ID 重试与账号切换，保留排序／高亮、拖动、主网格／推荐、打卡及原完成反馈、感想、日历日期修改、编辑删除、页面往返与刷新持久化。旧入口的检查统一改为通过筛选，原业务断言未放宽；375px 归档页已目视。日志 habit-archive-row-remove-types.log／habit-archive-row-remove-daily-final.log，截图 ui-preview-habit-archive-row-remove-final。

普通／预览构建的 68 个源码／20 个产物 WXSS、启动、项目转换及原 <1.5 MB 预算通过，主包 **1,498,677／1,499,076 字节**，分别 17 页／12 分包、18 页／13 分包；示例分包保持 **17,902 字节**，当前保留预览。日志 habit-archive-row-remove-{normal,preview}-build.log。微信开发者工具／真机未验证，未部署。

## 习惯关键词排序持续高亮（C127）

2026-10-07：daily/index.tsx 的原 ChoicePopover triggerSelected 由 showSort 扩展为窗口打开，或来源 ready／valid、owner 已确定且原 state.sort.field 不是 custom。旧无 sort 的缺省优先度属于关键词方式；sortChoice 仍只作窗口草稿，不参与已应用高亮。复用共享选中样式，无新增存储、CSS、业务字段或排序逻辑，其他页面保持。规范见 [C127](../Design.md#习惯关键词排序持续高亮c127)。

实际验证：typecheck、现有 check-ui-preview.cjs --habit-sorting、脚本语法和 git diff --check 通过。360×844／375×667／430×844／768×1024 覆盖默认及五种自动方式关闭后持续选中、共享实际背景色、自定义关闭后透明、未确认自动选择取消后仍为自定义、普通滑动／取消拖动不改高亮、实际拖动／刷新后取消高亮、失败重试与账号切换；原完整窗口、触控及功能栏几何检查保留，375px 高亮与普通状态已目视。日志 habit-sort-active-{types,ui}.log，截图 ui-preview-habit-sort-active。

普通／预览构建的 68 个源码／20 个产物 WXSS、启动、项目转换及原 <1.5 MB 预算通过，主包 **1,499,101／1,499,500 字节**，分别 17 页／12 分包、18 页／13 分包；示例分包保持 **17,902 字节**，当前保留预览。日志 habit-sort-active-{normal,preview}-build.log。微信开发者工具／真机未验证，未部署。

## 习惯自定义排序独立分组（C126）

2026-10-07：daily/index.tsx 在原排序窗口中增加单独的 daily-sort-custom 行，复用原 ChoiceButton、habitSortLabels.custom 和 custom／asc 草稿；下方原栅格仅过滤 custom，保留五项自动依据的顺序和选项值。core.css 只给独立行增加下分隔线及 8px 上下间距；方向行沿用 C124。该窗口复用 ChoicePopover 的 maxHeightRatio=.8，以容纳新增行，仍受按钮同侧可用高度及原安全边界限制，其他浮窗不改。确认仍调用 persistSort，原 custom 数组顺序、拖动、重试与账号规则保持。规范见 [C126](../Design.md#习惯自定义排序独立分组c126)。

实际验证：typecheck、现有 check-ui-preview.cjs --habit-sorting、脚本语法及 git diff --check 通过。360×844／375×667／430×844／768×1024 覆盖初始完整选项、手选自定义／隐藏方向／确认及原记录数组、外部取消、切回自动依据后完整方向和固定操作、长按、刷新自定义持久化、筛选、失败重试与账号隔离，控件至少 40px，原免滚动及可见边界断言保留。375px 两种稳定布局已目视；截图先推进原模拟时钟等待选项测量完成，避免抓取切换的旧窗口高度。日志 habit-sort-custom-group-types.log／habit-sort-custom-group-ui-final.log，截图 ui-preview-habit-sort-custom-group-final。

普通／预览构建的 68 个源码／20 个产物 WXSS、启动、项目转换及原 <1.5 MB 预算通过，主包 **1,499,012／1,499,411 字节**，分别 17 页／12 分包、18 页／13 分包；预览分包保持 **17,902 字节**。日志 habit-sort-custom-group-{normal,preview}-build.log，当前产物继续保留预览。微信开发者工具／真机未验证，未部署。

## 习惯筛选进行中文案（C125）

2026-10-07：daily/index.tsx 仅将状态筛选第一项及其默认选中名称由全部改为进行中，动态无障碍名称同步修改；未完成／归档分支、默认筛选高亮与原 enabled／今日打卡筛选保持，不改领域分类的全部。相关现有 UI 套件同步使用新名称，不新增逻辑或存储。规范见 [C125](../Design.md#习惯筛选进行中文案c125)。

实际验证：typecheck、现有 check-ui-preview.cjs --habit-sorting 的 360×844／375×667／430×844／768×1024 回归、git diff --check 通过，覆盖未完成返回进行中、筛选高亮恢复、排序／持久化／失败重试与账号隔离；375px 筛选窗口已目视。日志 habit-filter-active-types.log／habit-filter-active-ui-final.log，截图 ui-preview-habit-filter-active-final。普通／预览构建的 68 个源码／20 个产物 WXSS、启动、项目设置及原预算通过，主包 **1,498,625／1,499,024 字节**，分别 17 页／12 分包、18 页／13 分包，预览分包保持 17,902 字节；当前保留预览。日志 habit-filter-active-{normal,preview}-build.log。微信开发者工具／真机未验证，未部署。

## 习惯排序分组分隔线（C124）

2026-10-07：仅在 miniprogram/src/pages/daily/core.css 的 daily-sort-direction 增加 1PX、#3b4b56 上边线，并将上外距／内距设为 8PX，沿原内容宽度区分排序依据和方向。复用原组节点，自定义排序自动隐藏整组与边线；排序选项、共用按钮、数据及保存逻辑保持。规范见 [C124](../Design.md#习惯排序分组分隔线c124)。

实际验证：已有 check-ui-preview.cjs --habit-sorting 在 360×844／375×667／430×844／768×1024 通过，默认选项免滚动、完整触控及确认可见，保留原锚定、排序模式、长按、持久化、失败重试与账号隔离检查，375px 分隔线及完整窗口已目视。初次 12px 留白导致短屏轻微滚动，最终改为 8px 并保留原断言通过；未降低字号、触控或验证标准。日志 habit-sort-divider-ui-final.log，截图 ui-preview-habit-sort-divider-final。

最终普通／预览构建的 68 个源码／20 个产物 WXSS、启动、项目转换及原包体预算通过，主包 **1,498,613／1,499,012 字节**，分别 17 页／12 分包、18 页／13 分包；预览分包仍为 **17,902 字节**，当前保留预览产物。日志 habit-sort-divider-normal-build-final.log／habit-sort-divider-preview-build-final.log；git diff --check 通过。微信开发者工具／真机未验证，未部署。

## 任务与备忘录优先度统一（C123）

2026-10-07：MemoEditorFields 直接复用任务／习惯已有 PrioritySelect，移除独立 PriorityOptions／PriorityFlag 包装及三条局部优先度样式。tool-records.ts 的 memoPriorityColor 根据原 high／medium／low／none 映射到 todoQuadrants，选项、收起旗帜与列表角标均读取任务颜色，不复制色值。HabitPriorityCorner 只增加可选颜色参数，习惯默认行为保持。旧备忘录缺省仍按无，不新增存储或修改保存、账号、草稿、纸张配色；仅小程序。

实际验证：typecheck、test:entry-creation、check-ui-preview.cjs --memos、相关脚本语法和 git diff --check 通过。浏览器适配覆盖 360×844／375×667／430×844／768×1024，核对四级任务色值、任务／备忘录切换、实心／轮廓旗、48×40px 控件及图标居中、未设置旧记录角标、创建及原 ID 优先度编辑，并保留原图片、标签、纸张配色、草稿、保存失败重试与账号隔离回归。375px 创建、列表及四项窗口已目视；日志 priority-unify-{types,entry,memos}.log，截图 ui-preview-priority-unify-{entry,memos}。规范见 [C123](../Design.md#任务与备忘录优先度统一c123)。

普通 build:weapp 主包 **1,498,568 字节**、17 页／12 分包；build:preview 主包 **1,498,967 字节**、18 页／13 分包，示例分包保持 **17,902 字节**，当前产物继续保留预览。68 个源码／20 个产物 WXSS、启动、项目转换设置及原 <1.5 MB 预算通过；主包较上一版减少 498 字节。日志 priority-unify-normal-build.log／priority-unify-preview-build.log。微信开发者工具／真机未验证，未部署。

## 领域预览数据多样性（C122）

2026-10-07：scripts/domain-preview-records.cjs 保留原八域、16 个当前目标及旧样本 ID，将完成目标从 8 条增加至 36 条（11 长期／25 短期），正／负记录增加至 56／32 条；各域完成组合见 [C122](../Design.md#领域预览数据多样性c122)。createReminderPreviewRecords 保留全部初始共享习惯，再提供九个新稳定 ID 的示例习惯、近十五日本地打卡与有效打卡时间，今日分布为 1／1／1／2／1／1／0／1。领域 habits 仍为空，卡片、详情、习惯与统计沿用原数据选择器与统一刻度，无新业务计数或正常模式存储。

preview-data 原初始化页在预览命名空间补充 ottlog-domain-preview-seed-v2 标记。缺少标记时，extendDomainPreview／extendReminderPreview 仅补本轮新 ID，原名称、当前目标、记录、启停与历史保留；不重建已删领域／旧样本，习惯 ID 同时避开 items／done／completionHistory／reflections 的引用。旧稀疏 done 通过原 cleanState／habitDayIndex／hasHabitDay 读取已有归档完成，追加新日期记录不覆盖原打卡。两份候选先用原状态校验与容量限制检查；缓存更新保留元信息并增加 revision，最后写版本标记，任一写入失败不宣称成功跳页，重试保留已写 ID／时间点且不重复。标记后编辑／删除／撤销不重种，异常缓存沿用原显示／重试。当前日期仅首次准备时使用，不在重开时伪造当天打卡。

在 miniprogram 运行 npm.cmd run build:preview，重新编译／冷启动原预览项目；旧隔离缓存会一次性增加上述新样本，无需清除业务 Storage。正常构建仍不带初始化分包与样本，已有正常游客／账号、草稿及打开历史不改；其他环境边界沿用 C109。

实际验证：typecheck、check-domain-preview.cjs、完整 test:preview、相关脚本语法及 git diff --check 通过。真实 VM 加载初始化页与数据层，覆盖旧预览改名／目标／记录／习惯编辑、删除领域与旧样本、稀疏归档打卡、孤立 ID、不恢复升级后的删除／撤销、第二份缓存或标记写失败的同 ID 重试、容量先校验、异常缓存保留、正常账号／游客／身份／草稿／打开历史不改及零真实工具 API 调用。浏览器适配覆盖 360×844／375×667／430×844／768×1024，逐域量原组件的三种实际完成数，并保留八卡完整、六条工作目标历史、正负同字号／颜色／最新在上／下滑、共享习惯、共用创建关闭／草稿恢复／新增删除与刷新。375px 八卡已目视；日志 domain-variety-{types,isolation,ui-final}.log，截图 ui-preview-domain-variety-final。

普通 build:weapp 主包 **1,499,066 字节**、17 页／12 分包；最终 build:preview 主包 **1,499,465 字节**、18 页／13 分包，示例分包 **17,902 字节**，当前产物继续保留示例预览。68 个源码／20 个产物 WXSS、启动、项目转换设置及原主包 <1.5 MB 预算通过，普通主包未增加；日志 domain-variety-normal-build.log／domain-variety-preview-build-final.log。微信开发者工具冷启动／真机未验证，未部署。

## 日程时间一键清除（C121）

2026-10-07：共用 TodoScheduleSheet 删除任务时间小窗的「不设时间」，复用原右对齐完成栏，移除不再使用的 todo-schedule-time-actions 样式。时间行纳入已有 todo-schedule-clearable-row／clearControl，与提醒、重复使用同一个 DeleteSymbol 和 40px 非交互空位；无时间显示未设置，忙碌禁用且回调核对 busy。清除复用原取消时间状态更新，重置本次未确认输入及错误，保留日期、提醒绝对时间和重复，只改面板草稿；总确认与任务保存仍分层，无新字段、存储或网页改动。规则见 [C121](../Design.md#日程时间一键清除c121)。

原 check-schedule-time-ui.cjs 改用日期面板清除符号，并增加新建／编辑中清除、取消、总确认不落盘、同 ID 保存刷新、日期／提醒／重复保留及错误恢复的回归。量全部设置行、三个清除位置、主日历与页脚在设置／清除前后的实际边界；小窗只保留一个完成按钮、居中输入与严格校验原断言保持。原精简任务编辑器同步改为时间行清除；既有日程重复清除、月末锚点、提醒与账号规则保留。

实际验证：typecheck、test:schedule-time、完整 --todos、test:reminder-settings 与 test:sheet-footers 通过，覆盖 360×844／375×667／430×844／768×1024，专项与页脚含模拟 34px 安全区，页脚另含 430×720。时间专项核对新建／编辑、清除前后三行／清除位／日历／页脚边界相同、非法输入保留与提示、清除错误恢复、取消保留正式记录、总确认不落盘、同 ID 保存刷新后无时间且日期／提醒／重复保持；原月末／年度锚点、提醒授权与账号隔离回归保持。相关脚本语法与 git diff --check 通过。375px 默认时间小窗与 768px 清除后日期面板已目视。日志 time-clear-{types,schedule,todos,reminders,footers}.log，截图为对应 ui-preview-time-clear-* 目录。

普通 build:weapp 主包 **1,499,066 字节**、17 页／12 分包；build:preview 主包 **1,499,465 字节**、18 页／13 分包，当前产物继续保留示例预览。两种构建的 68 个源码／20 个产物 WXSS、启动、项目转换配置及原主包 <1.5 MB 预算通过，日志 time-clear-{normal,preview}-build.log。微信原生键盘／布局和真机未验证，未部署。

## 日程重复一键清除（C120）

2026-10-07：共用 TodoScheduleSheet 删除重复小窗的「不重复」，日期面板重复行设置后显示 DeleteSymbol 一键清除，无设置显示未设置及 40px 非交互空位。提醒与重复抽取面板内 clearControl，复用同一控件与 todo-schedule-clearable-row；忙碌时禁用，实际操作再核对 busy。行分隔线不占高度，末行省去附加分隔线，保留 SheetActions 的单条边界。清除复用 chooseRepeat()，退出自定义并将间隔重置为 1，只更新日程草稿；日期／时间／提醒、账号保存队列及既有循环规则保持，无新存档、网页改动或系统弹窗。规则见 [C120](../Design.md#日程重复一键清除c120)。

原 check-todo-schedule-editor.cjs 增加一条隔离循环任务，验证带月末锚点的重复清除／取消、两层确认与保存、同 ID 保留日期／时间／提醒、重开、重新选择间隔 1 及清除后完成不生成循环任务；量清除前后主日历、设置行、两个删除占位与页脚的实际边界。原精简编辑器改为点击重复行清除，原月末／闰年锚点和提醒边界回归保留；页脚测试核对实际末行及伪元素无第二条线。额外模拟 34px 安全区，包含 375×667 短屏。

初次短屏检查发现固定内容总高度使重复行删除按钮被滚动区截到约 0.97px；在宽度小于 700px、高度不超过 720px 时，收紧月份栏上方与日历到设置区的间距。保留概览末尾原 8rpx 内距、完整六行日历、字号、40px 按钮及完全可见断言；375×667 清除按钮完整显示，清除前后实际边界相同。375px 与 768px 截图已目视。

实际验证：typecheck、test:schedule-time、完整 --todos、test:reminder-settings 和 test:sheet-footers 通过，覆盖 360×844／375×667／430×844／768×1024 及模拟 34px 安全区；页脚另覆盖 430×720。包括取消／重开、两层确认及同 ID 保存、原日期／时间／提醒保留、清除自定义状态与间隔、清除后完成不生成循环任务，原月末／闰年锚点和提醒授权／保存边界保持。相关脚本语法及 git diff --check 通过。日志 repeat-clear-{types,schedule,todos,reminders}-final.log 与 repeat-clear-footers-done.log；截图为对应 ui-preview-repeat-clear-* 目录。

普通 build:weapp 主包 **1,499,256 字节**、17 页／12 分包；build:preview 主包 **1,499,655 字节**、18 页／13 分包，当前产物继续保留示例预览。两种构建的 68 个源码／20 个产物 WXSS、启动、项目转换配置与原主包 <1.5 MB 预算通过，日志 repeat-clear-{normal,preview}-build-final.log。微信原生／真机未验证，未部署。

## 提醒快捷选择与结果设置（C119）

2026-10-07：共用 TodoScheduleSheet 的提醒正文改为五个快捷按钮与两个可点击结果，日期小窗为六种相对日期，时刻小窗复用 C118 的居中时／分、右侧完成与严格校验。省去原不提醒／自定义提醒选择步骤、提醒完整月历及其已不用的样式。微信提醒授权移入固定页脚，仍须日程确认、任务保存及明确授权。日期面板的提醒行复用 DeleteSymbol 一键清除，未设置保留 40px 非交互空位；分隔线由不占布局高度的伪元素绘制，设置／删除不挤动主日历。规则见 [C119](../Design.md#提醒快捷选择与结果设置c119)，操作见 [待办日程](todo-miniprogram.md#日期提醒与重复)。

todo-schedule.ts 共用五个分钟偏移、六种日期、前月月末收拢、结果名称和只读重开匹配。当前按日期锚点与任务时刻偏移叠加，这是本次实现假设；用户后续答复优先。无任务日期／时刻沿用今天／09:00；单选日期不设置默认提醒，有效快捷项或完成具体时刻才启用。具体时刻另有草稿，非法输入保留并提示，外部关闭不应用；日程确认时继续拒绝过期提醒。原 reminderAt 唯一落盘、ID／账号隔离／取消旧提醒保持，无新存储或网页改动。

快捷偏移同时保留准确 ISO 时间点与本地显示值，避免夏令时回拨重复小时被重新解释为另一次时刻；旧提醒及任务日期／时间改动仍保留原绝对时间。重开匹配完整时间点，只推导展示，不重算业务存档。旧非六种日期显示原日期并可编辑时刻或清除；手动日期／时刻先校验，失败不部分更新。

实际验证：typecheck、check-todo-schedule.cjs、check-todo-reminders.cjs、test:reminder-settings、test:schedule-time、test:calendar-labels 通过。提醒专项覆盖 360×844／375×667／430×844／768×1024，额外模拟 34px 安全区；量两个结果控件、五／六种选项、窗口与实际输入行完整、提示前后按钮固定、设置／清除前后主日历与设置行边界相同。包括偏移与日期叠加、前月闰日、无日期任务、过期提醒阻止确认、输入错误与取消／重开、清除取消和同 ID 保存刷新、任务时间／重复保留、无隐式订阅。另在一张 375×667、America/New_York 浏览器页核对回拨重复小时：03:30 提前两小时正确保存 06:30Z 的 01:30，编辑重开保持；纯逻辑也覆盖缺失小时和本地日期跨夏令时。原任务／提醒边界、授权与账号隔离、原农历／节日和习惯打卡回归保持。

完整 `--todos` 与 test:entry-creation 最终四尺寸回归通过，原排序、备注图片、标签、下一步、循环、提醒授权／取消及账号隔离保持；日志 reminder-result-todos-ui-final.log／reminder-result-entry-ui-final.log。原完整提醒月历的检查按 C119 改为六种日期与独立时刻、主日历选择保持；无日期任务的未来提醒 fixture 显式先选任务日期，避免通过已删除的任意提醒日历写值。所有数据隔离于测试浏览器，无真实账号或 API 写入。

普通／预览最终构建主包 **1,498,967／1,499,366 字节**，17／18 页启动、68 个源码／20 个产物 WXSS、转换设置及原主包 <1.5 MB 预算通过；日志 reminder-result-{normal-build-final,preview-build-final}.log。验证日志另有 reminder-result-{types-final,ui-final,reminder-logic,time-ui,calendar-ui}.log，截图位于 ui-preview-reminder-result-final；375px 快捷结果／日期行及 768px 错误状态已目视。当前产物保留示例预览；微信原生键盘、嵌套窗口和真机未验证，未部署。

## 日程时间窗口两行设置（C118）

2026-10-07：共用 TodoScheduleSheet 的时间小窗首行直接显示居中的时／分输入，第二行右侧完成；原左侧不设时间随后按 C121 改为日期面板时间行的清除符号。省去重复标题和先选具体时间的步骤。沿用 ChoicePopover／ScheduleNumberInput，页面 CSS 只安排布局。clockTime 从原面板提取至 todo-schedule.ts，完成时严格检验完整整数小时 0–23／分钟 0–59；输入事件保留原值，不用 digits 清洗。非法值保留输入、在窗内提示，预留错误行确保按钮不移动。规则见 [C118](../Design.md#日程时间窗口两行设置c118)，操作见 [待办日程说明](todo-miniprogram.md#日期提醒与重复)。

小窗待确认的时／分与已应用的日程时间分开；有效完成才应用并关闭，外部关闭保留本次输入但不应用。单独取消时间的操作现按 C121，保留日期／提醒／重复，日程总清除重置全部日程及待确认输入／错误。原日程确认、任务保存、提醒绝对时间、原 ID 和账号隔离保持；无新字段、存储键或网页改动。

实际验证：typecheck、test:schedule-time、完整 test:entry-creation 通过。时间专项覆盖 360×844／375×667／430×844／768×1024，额外模拟 34px 安全区；量实际输入与单位整体居中、原生文本行对齐、整个框聚焦、右侧完成、提示前后按钮固定、日历／设置几何保持及默认控件完整。空白、越界、负数、小数、指数与三位数均拒绝并保留原值；00:00／23:59 和单数字补齐通过。验证外部关闭／重开、仅关闭子窗、无时间、总确认前不生成任务、新建与编辑取消、同 ID 保存、刷新持久化、原提醒保持及清除错误恢复；同入口继续运行原日程／提醒／重复及极端年份回归。独立测试的固定时钟可能使未改变记录不产生写入，原日程测试仅初始化其跟踪器为真实初始 fixture，后续仍跟踪实际写入，未修改业务或放宽断言。全部使用隔离浏览器数据。

完整 `node scripts/check-ui-preview.cjs --todos` 四尺寸回归通过，包含排序、共用正文、日程、精简编辑器、下一步、任务流程、提醒订阅流程及显示。初次遇到旧选日底色检查仍读取整个日期格；按 C117 改为读取其实际圆形内层，原颜色期望不变，未放宽断言或改业务。最终日志 schedule-time-todos-ui-final.log。

普通／预览构建通过，主包 **1,497,380／1,497,779 字节**，17／18 页启动、68 个源码／20 个产物 WXSS、转换设置及原主包 <1.5 MB 预算通过。日志 schedule-time-{types,ui-final,entry-ui,normal-build-final,preview-build-final}.log，时间截图 schedule-time-{default,invalid,saved}-{width}.png；375px 默认及 768px 错误状态已目视。当前产物保留示例预览，未部署；微信原生键盘、布局及真机未验证。

## 日历圆形日期与农历节日（C117）

2026-10-07：任务／提醒 ScheduleCalendar、习惯／领域／统计 HabitCalendar 复用 CalendarDayContent 与 calendarDateLabel。日期圆形内层独立等宽等高，选中背景和今天边框由内层承载；保留外部七列点击范围及已打卡角标。日期下显示农历，初一显示月名；节日以短名称替代。同名合并地区，不同节日保留全部内容，可操作日期长按打开应用内日期详情，不改变选中／打卡。浏览器详情在 window 捕获 Escape，先于 document 的选项窗关闭，只关最上层；遮罩／关闭按钮保持。规则与来源见 [C117](../Design.md#日历圆形日期与农历节日c117)／[日历说明](calendar-miniprogram.md)。

农历来源为香港天文台 1901–2100 年公开表，生成器验证全量 73,049 日及打包解码、闰月／年界；英文 2069 表缺少 12 月 30 日，以其官方中文表明确的十七补齐并核验。运行时无 Intl、网络或额外缓存依赖，不改选日范围或业务存档。四地区节日当前核实覆盖 2025–2027，其他年份保留农历且详情明确未收录；中国只标节日本日（国庆 10 月 1 日、劳动节 5 月 1 日、春节初一及除夕），不标连续休假，其他地区按官方实际日期排除补假。不预测尚未公布的宗教日期。

实际验证：typecheck、check-calendar-date-label.cjs、check-todo-schedule.cjs、完整 test:calendar-labels、test:entry-creation 和 test:sheet-footers 通过。日期专项覆盖 360×844／375×667／430×844／768×1024，数字圆形宽高相等、字幕至少 10px／12px 行高且上下完整、任务选择前后与提醒／打卡状态、长按完整多节日／地区、详情外部关闭和嵌套 Escape、日历与设置／统计／日志／底部操作默认完整；专项额外模拟 34px 安全区，页脚套件包含 430×720。原习惯补记／撤销、持久化、失败重试及 360px 账号隔离分支仍通过，统计保持只读。375px 任务／提醒和 360／768px 领域习惯截图已目视；记录位于 calendar-labels-ui.log、calendar-entry-ui.log、calendar-footers-ui.log 及对应 ui-preview-calendar-* 目录。

默认任务日历增加字幕后，初次 226px 预留令默认内容溢出；最终采用 214px 六行预留、22px 数字圆形与 12px 字幕，保留全部内容与原字号，不裁切字幕或遮住设置。源中遗留的六张 favorites／pomodoro／posts 旧导航图片无任何使用引用，构建复制排除、源码保留；当前五个 nativeTabBar 图标和 C115 图集保持，未提高预算或删除检查。

普通／预览最终构建主包 **1,496,245／1,496,643 字节**，17／18 页启动、68 个源码／20 个产物 WXSS、项目转换设置及原主包 <1.5 MB 预算通过；日志 calendar-normal-build.log／calendar-preview-build.log。当前产物保留示例预览，未部署。微信原生字形、长按及真机未验证。

既有失败单独记录：check-habit-calendar.cjs 的第 104／105 行仍预期「暂停或移除」，源保存规则此前已按归档需求使用「归档或移除」；本次执行在 104 行旧文案断言失败，未放宽断言、修改既有业务或声称其全量通过。本次日期纯逻辑及原真实打卡浏览器回归已通过。

## 创建类型左右滑动（C116）

2026-10-07 共用 EntryComposer 支持非交互空白处左右滑动切换「任务／备忘录／进展」，顶部点击仍保留；左进右退、首尾不循环。面板及原类型栏／滚动区／字段空白容器标记 data-entry-swipe，touchstart 只接受真实 target.dataset 白名单，输入、按钮及内部图形、正文工具、图片和独立浮窗保留原触摸操作；未修改共享输入或全局浮窗。单指横向至少 48px 且横纵比至少 1.5 才在 touchend 切换，竖向一旦确认、短移动、多指、换指、touchcancel 或不完整释放不切换。原外层遮罩 catchMove 保持，面板不增加阻止滚动行为，类型栏与底部操作几何保持。规则见 [C116](../Design.md#创建类型左右滑动c116)。

点击与滑动共用 changeMode，调用原 switchEntryMode 并读取 latest 草稿。开始、移动和结束都核对来源、账号、图片／保存锁、operating 即时保护、日程子窗及 pendingSave／retryMode；中途锁定、账号或类型变化由 effect 清除手势，结束再次核对捕获 owner／mode。没有新增业务字段、存储键或三份独立表单，任务／备忘录共用正文图片与独立日程／下一步、颜色／置顶等，以及进展两框／领域沿用原隔离草稿和同 ID 重试。滑动只改创建类型，不提交；既有实体编辑保持原类型与 ID。本地 Taro 运行时核对 data-* 的驼峰 dataset 和原生事件 target.sid 合并路径，不将 DOM tagName／closest 用于微信判断。

实际验证：typecheck、check-progress-draft.cjs、check-entry-tags.cjs 及完整 test:entry-creation 通过四尺寸（360×844／375×667／430×844／768×1024）。相关测试直接发送完整 touches／changedTouches，不模拟类型切换；合法起点用 elementFromPoint 命中可见边缘空白，核对 dataset 及起止坐标在窗内，再验证左右往返与首尾、短／竖／斜／取消／多指／换指／释放异常、输入／图片／按钮／优先度／标签／领域／日程及日程子窗保护，背后页面位置保持。原共用内容／图片／专属字段与独立进展两框切回保留、关闭恢复、当前类型保存、失败及账号隔离断言保留；新增图片处理、各类型本机未持久化重试和同一 JS 任务内保存期间的同步手势锁，以及进入锁定／切换后返回不复活旧手势。无真实账号、真实内容或 API 写入，未改测试适配器。375px 任务／备忘录／默认进展及填写后的进展已目视；结果 ui-preview-entry-type-swipe，日志 entry-type-swipe-entry.log 及 entry-swipe-{types,drafts,tags}.log。

四尺寸包含可见空白命中、方向／边界／无效手势、输入／子窗保护、复杂内容往返、备忘录图片处理前旧手势取消及同步提交期间保护；三类型 volatile 同 ID 重试、进展图片 busy 和账号切换只在原 360px 条件分支执行。未将这些特殊分支写为全部四尺寸覆盖，最终完整套件 exit 0。

普通 build:weapp 主包 **1,497,013 字节**、17 页／12 分包；build:preview 主包 **1,497,412 字节**、18 页／13 分包，当前产物继续保留示例预览。两种构建的 67 个源码／20 个产物 WXSS、启动及原主包 <1.5 MB 预算通过，微信配置无重复转换／上传 source map；日志 entry-swipe-{normal-build,preview-build}.log。浏览器合成触摸只验证适配后的事件与业务结果，不能代替微信原生触摸、滚动默认行为或键盘；开发者工具／真机未验证，未部署。

## 首页大入口与简笔图标库（C115）

本节保留历史实现与验证。首页大卡的图标属性及「名称与图标」编辑由 C172 的名称／背景／颜色替代；第二页完整目录及原导航语义保持。

2026-10-07 首页快捷方式编辑仅配置大卡片，删除显示样式选择；原「名称与样式」改为「名称与图标」，保留共享名称／六色选择并增加 48 个简笔图形的独立选择窗。第二页直接引用完整 homeFeatureGroups，固定显示 3 个快捷操作与 13 个功能界面，不受首区勾选、名称、颜色、图标或排序影响；开始番茄钟与番茄钟页面保持原不同回调。首区全部选中项按 C111 独立序号显示，默认六卡；更多时保留可读卡片高度、显示下滑提示与末尾快捷记录。PageScroll 增加可选 freeScrollSections，仅多入口首页启用，阅读长首区不被强制吸附，进入第二页及向下滑回首区的手势仍保留；其他页面默认规则保持。规则见 [C115](../Design.md#首页大入口与简笔图标库c115)，操作见 [快捷方式说明](home-shortcuts.md)。

原 ottlog.home-shortcuts.v1／version:1 items 增加可选 icon 白名单；旧 kind='link' 兼容为 card，保留名称、颜色、有效序号与图标，缺省／异常图标回退功能默认。旧未编号默认布局沿用原严格升级规则，定制布局不重置；拖动只重排已有序号槽位，取消释放空号、新增取最小空号。图标选择只改原编辑草稿，独立窗外部关闭不提交，编辑取消不保存，写失败保留重试；账号同步及全局草稿仍属原待办，本次不另加缓存或数据源。

src/lib/shortcut-icons.ts 统一 48 个 ID／名称，scripts/generate-shortcut-icons.cjs 扩充原线条几何，使用现有 web 的 sharp 依赖生成八种配色的透明 PNG 图集；每张 768×576、8×6 格、每格 96px，16 色调色板保留透明抗锯齿，共 **163,108 字节**。共享 ShortcutIcon 按原图标档位裁切，选择库图形 24px、触控至少 40px，复用居中 ChoicePopover／ChoiceButton、固定标题关闭与内部滚动。旧单图源码保留，config 的 copy 仅排除重复 shortcuts 目录；构建只打包 shortcut-sheets，无字体／emoji 或原生 SVG 依赖，不降低包体预算。

实际验证：typecheck、check-home-shortcuts.cjs、check-shortcut-icons.cjs 与 check-page-snap-logic.cjs 通过。偏好回归含旧大小／缺省／非法图标、有效序号空位、名称颜色保留、往返保存与不可变拖动；素材检查量八张真实 PNG 元信息和 384 个非空透明格。--home-shortcut-layout、--home-navigation、--snap 三套浏览器适配回归均通过 360×844／375×667／430×844／768×1024：六卡／空布局／十卡阅读／十五项编辑、六列 48 图标的完整图形及居中触控、图标窗外部关闭、选择后取消、保存刷新、默认恢复、写失败重试、空号与排序／边缘滚动／触摸取消、固定 16 入口导航及两屏手势往返。375px 图标库／保存首页／十卡下滑及 768px 图标库已目视。最终截图 ui-preview-home-card-icons-final／ui-preview-home-card-icons-navigation-final，工具翻页回归 ui-preview-home-card-icons-snap；日志 home-card-icons-{types,logic,assets,snap-logic,final-ui,navigation-final,snap}.log。完整 test:home-shortcuts 后半段的既有分钟专注断言与 C94 冲突，保留原说明，本次使用相关过滤回归，不声称全套通过。

普通 build:weapp 主包 **1,495,261 字节**、17 页／12 分包；build:preview 主包 **1,495,660 字节**、18 页／13 分包，当前产物保留示例预览。两种构建的 67 个源码／20 个产物 WXSS、启动及原主包 <1.5 MB 预算通过，日志 home-card-icons-{normal-build,preview-build}.log。微信项目及产物转换／source map 配置检查通过；微信原生触摸、图集显示与真机未验证，未部署。

## 首页格言正文垂直居中（C114）

2026-10-07 共享 MottoBanner 原先将两行固定高度放在 Text 本身，一行文字从顶端显示。现将 84rpx 预留高度移到独立 View 内容框，以 flex 垂直居中；内层 Text 取实际高度，原 WebKit 两行省略、字号／行高及左对齐保持。窄屏上内距与正文到控制栏的间距由 28／10rpx 均分为 19／19rpx，总量不变；宽屏保留并列网格及上下各 18rpx，内容框 height:auto／min-height:68rpx 随行高拉伸，避免控制区更高时偏上。轮播与按钮、计数、管理导航和数据源未改。规则见 [C114](../Design.md#首页格言正文垂直居中c114)。

实际验证：typecheck、现有 --mottos 四尺寸（360×844／375×667／430×844／768×1024）通过，原轮播／暂停、管理导航、创建／编辑／删除及长列表流程保持。使用忽略目录临时 preload 测量真实首页一行／两行／120 字不分词长句／空提示，无永久测试；实际文字高度为 1／2／2／1 行，原字号和两行截断保留。窄屏量内边线上方到实际 Text 及 Text 下方到控制栏，宽屏量实际 Text 到内边线上下；375px 一行／空提示均为 20／20px、两行／长句为 9.5／9.5px，768px 一行为 35.828／35.828px、两行为 18.422／18.422px，最大误差 0.016px。重建原 28／10rpx、固定 Text 几何比较，格言栏／控制栏／按钮／工具栏／底部快捷记录的实际边界保持，首页关键控件完整可见；隔离预览资料及原 fixture 已恢复，无真实账号请求或写入。375px 一／两行及 768px 截图已目视，结果 ui-preview-motto-center/motto-center-geometry-{width}.json 及 motto-center-{single,two}-{375,768}.png，日志 motto-center-ui.log。

普通／预览构建主包 **1,499,522／1,499,921 字节**，17／18 页产物启动、67 个源码／20 个产物 WXSS 和原预算通过。日志 motto-centering-{types,normal-build,preview-build}.log。当前保留示例预览；微信原生字形／真机未验证，未部署。

## 格言页标题精简（C113）

2026-10-07 小程序格言页 index.config.ts 的 navigationBarTitleText 改为「格言」，PageToolbar 左侧只保留原数量，删除重复「我的格言」与「留住想反复读到的话，在主页慢慢轮播。」节点；同时删除对应标题、宽屏标题与说明样式，不保留占位。列表、创建／编辑／删除、账号状态层和首页轮播没有变化。规则见 [C113](../Design.md#格言页标题精简c113)。

实际验证：typecheck、现有 --mottos 四尺寸（360×844／375×667／430×844／768×1024）通过，包含原首页轮播／暂停、创建、编辑、删除取消／确认、列表长文滚动和固定创建入口；375px 列表已目视，未新增低影响文案／样式的永久测试。直接核对源节点已删除及 dist/pages/mottos/index.json 导航标题为「格言」；浏览器适配导航显示通用 Ottlog，不能将该预览当作原生标题验证。输出 ui-preview-motto-title，日志 motto-title-{types,ui}.log。

最终普通／预览构建主包分别 **1,499,333／1,499,732 字节**，格言分包 **10,249 字节**，17／18 页启动、67 个源码／20 个产物 WXSS 和原预算通过，日志 motto-title-{normal,preview}-build.log。当前保留示例预览；微信开发者工具原生导航／真机未验证，没有部署。

## 快捷方式编辑排序符号（C112）

本节保留历史实现与验证。C172 将同一共享排序符号移回首页功能栏，编辑窗口不再承担排序；原序号空号及已用槽位移动规则保持。

2026-10-07 快捷方式编辑栏右侧的文字排序按钮改为共享 SortSymbol／ChoiceButton iconOnly、compact、content。普通和排序模式使用同一图标及 40px 触控框，排序中使用共享选中态，再次点击完成；保留原动态无障碍名称、拖动中／少于两项禁用、草稿和保存语义。仅改该编辑入口，不新建图标或页面样式。规则见 [C112](../Design.md#快捷方式编辑排序符号c112)。

实际验证：typecheck、原完整 --home-shortcut-layout 四尺寸（360×844／375×667／430×844／768×1024）通过，原空号、分配、拖动、边缘滚动、取消、失败重试、保存刷新及名称／样式流程保留。使用忽略目录中的临时 preload 包装测量，无新增永久测试；所有尺寸按钮 40×40、符号 20×20，文字为空、一个 SortSymbol、无 chevron、水平／垂直中心误差 0，普通→排序→返回时按钮及符号边界完全一致，aria-pressed 为 false→true→false、动态无障碍名称保持。附加检查恢复原首页与存储，375px 两态截图已目视；日志 home-sort-icon-ui.log，几何 ui-preview-home-sort-icon/home-sort-icon-geometry-{width}.json，截图 home-sort-icon-{inactive,active}-375.png。

普通与预览构建通过，主包分别 **1,499,333／1,499,732 字节**，17／18 页产物启动、67 个源码／20 个产物 WXSS 和原预算通过。日志 home-sort-icon-{types,normal-build,preview-build}.log。当前产物保留示例预览，未部署；微信原生交互未验证。

## 快捷方式保留空号与最小空号分配（C111）

2026-10-07 取消快捷方式不再重新计算后续角标，新增按最小空号分配。HomeShortcut 在原版本 1 的 items 增加可选 rank，仍沿用原设置键；normalizeHomeShortcuts 先保留有效且唯一的 1–目录项数整数，再按旧分区顺序为缺省／重复／无效值分配空号，返回按序号排序的副本。旧默认布局升级保留，已有有效序号不因旧默认数组模式被重置；原名称、颜色、样式和有意空布局保持。主规则见 [C111](../Design.md#快捷方式保留空号与最小空号分配c111)。

编辑新增使用 nextHomeShortcutRank，覆盖重新选择项原来的已释放序号；取消仅移除对应项。分组与排序复用 groupHomeShortcuts，样式变化保留 rank；同组拖动重新分配原已用序号槽位，不填空号或改另一组。排序及名称／颜色／样式仍是编辑草稿，保存时正常化并沿用原本机保存／失败重试。清理同一编辑组件不再使用的 home-editor-hint 和 home-option 色类以满足原包体预算，没有移除实际控件或放宽限制。

实际验证：typecheck、check-home-shortcuts.cjs 和完整 --home-shortcut-layout 四尺寸（360×844／375×667／430×844／768×1024）通过。逻辑覆盖旧混合样式数组迁移、异常值／重复序号修复、输入不可变、空号往返、最小空号跨组分配、拖动保留空号及另一组、外观保留。浏览器保留原排序、取消、写失败重试、导航及展开设置回归，并新增移除 1、3 后保存刷新仍为 2、4、5、6、7、8，新增依次得到 1、3、9；大小分区显示、样式变化保留 9、恢复默认及全 15 项边缘滚动均通过。375px 空号截图已目视，输出 ui-preview-shortcut-rank-final/home-editor-rank-gaps-{width}.png，日志 shortcut-rank-{types,logic,ui}.log。

普通 build:weapp 主包 **1,499,339 字节**、预览 build:preview 主包 **1,499,738 字节**，分别 17／18 页启动、67 个源码／20 个产物 WXSS 及原预算通过，日志 shortcut-rank-{normal,preview}-build.log。当前产物保持示例预览。构建前发现源配置 es6／enhance 又为 true，按既有 T06 恢复 false 后通过，其他工具设置保留。未运行无关的旧专注断言，微信原生触摸／模拟器及真机未验证，没有部署。

## 开发者工具 appservice 白屏排查（T28）

2026-10-07 原生开发者工具日志确认读取导航图标时发生 `EMFILE: too many open files`，并有页面框架／启动超时。源项目加入依赖、测试结果及 Git 目录的监听排除；预览产物已重新构建，18 页启动、WXSS 和原包体预算通过，主包 1,499,484 字节。源／产物监听配置一致，转换与压缩设置保留。未修改业务状态、示例初始化或领域输入框。

CLI 服务端口关闭，未自动重启开发者工具，原生恢复待确认。完整退出后直接打开 miniprogram/dist、仅清编译缓存的步骤及证据边界见 [调试说明 T28](device-debugging.md#开发者工具-appservice-白屏t28)。本次仅配置与文档，无发布。

## 领域名称单行输入对齐（C110）

2026-10-07 修正领域创建／编辑的名称文字偏上。原 Input 同时继承全局高度和上下 padding；共用领域编辑节点改用 `SingleLineInput frameClassName='domain-name-field' align='left'`，页面只设置外框 flex／宽度，移除窄／宽屏旧 `.domain-definition-content .tool-input` 外观。共享组件增加明确的水平 align 参数，默认 center 保持原数值及其他调用，内部 24px 行、16px 字与零 margin／padding／边框继续保护。原图标、24 字限制、焦点请求、键盘完成和保存回调保持。规则见 [C110](../Design.md#领域名称单行输入对齐c110)，基础几何见 C71。

一次性测量同时发现外部 focus 持续 true 时失焦后点外框无法重新聚焦；共享组件改为内部实际焦点状态，外部 focus 变化时同步，失焦 false、外框点击 true，禁用仍不触发。图标窗打开／关闭的外部 focus 变化保留，已有调用不用页面补丁。

实际验证：`typecheck`、现有 `--domain-management` 全流程四尺寸（360×844／375×667／430×844／768×1024）及临时运行时测量通过，没有增加永久测试。创建空提示／输入值／图标窗关闭后、已有编辑值／新编辑值共 20 组，外框 44px、原生行 24px、字号 16px／行高 24px、上下各 10px、中心误差 0、上下 padding 0、左对齐、24 字限制完整；失焦后点外框上内距可复焦，图标窗关闭后值与焦点保持。首页快捷方式名称默认居中、同一几何及整框聚焦在四尺寸保持。375px 创建、768px 编辑已目视。日志 `domain-name-alignment-{types,ui}.log`，测量 `ui-preview-domain-name-alignment/domain-name-geometry.json`，截图 `domain-name-{create,edit}-{375,768}.png`。

普通 `build:weapp` 17 页主包 **1,498,963 字节**，`build:preview` 18 页主包 **1,499,362 字节**，两种 67 个源码样式／20 个产物样式、WXSS、启动与原主包 <1.5 MB 预算通过。日志 `domain-name-alignment-{normal-build,preview-build}.log`，`git diff --check` 通过，当前产物继续保留预览模式。微信字形／光标／键盘未验证，没有部署。

## 领域示例预览记录（C109）

2026-10-07 初版增加开发预览记录，先提供微信开发者工具构建；用户未指定环境，不将此实现选择记为产品偏好。初版 `scripts/domain-preview-records.cjs` 生成虚构的八个原领域、16 个当前目标、8 个完成目标、40 条正记录和 24 条负记录；数量与共享习惯示例现按 C122 扩充。稳定领域 ID／图标沿用目录，记录按旧到新存储，C108 展示时最新在上。日期基于注入时钟，工厂每次生成独立对象，不读取或写入账号数据；领域习惯保持空数组，不复制 reminders。规则见 [C109](../Design.md#领域示例预览记录c109)。

在 `miniprogram` 运行 `npm.cmd run build:preview`；重新编译／冷启动微信开发者工具，应用进入仅此构建存在的 `pages/preview-data` 分包，初始化后切到领域。已有预览按 C122 一次性追加新样本，原内容不覆盖，格式异常的缓存不自动清理；写入或跳页失败保留重试入口。后续编辑复用原状态层与串行保存队列。`MINIPROGRAM_PREVIEW` 编译开关仅预览开启，工具存储及身份缓存使用 `ottlog-mini-preview-v1:` 前缀，工具会话固定为游客并避开真实账号 GET／PUT；任务／备忘录／进展的共用创建草稿和习惯打开历史同样隔离，避免清理默认习惯时改到原游客日志。首页个性设置等设备级配置、其他页面专用草稿和「我的」接口沿用当前开发环境；本次隔离范围为工具记录、共用创建草稿及习惯打开历史。正常构建保留原账号和键，移除初始化分包及示例代码。切回普通开发用 `npm.cmd run build:local`，发布仍使用原构建；只清编译缓存，不清业务 Storage。本次产物暂保留预览模式，方便查看记录。

实际验证：`typecheck`、`check-progress-draft.cjs`、`check-personal-tools.cjs`、`check-domain-preview.cjs` 通过，预览脚本加入 `test:logic`，`test:preview` 组合隔离与浏览器显示检查。真实 VM 加载工具状态层与 hook adapter 验证合法样本、首次初始化／已有及异常缓存不覆盖、写失败重试、编辑及重开、cookie 切换、原游客／账号／身份／草稿保持、零真实工具 API 调用，以及普通账号 GET／PUT 队列和原页面配置。

专用 `--domain-preview` 与普通完整 `--domains` 两套均通过四尺寸（360×844／375×667／430×844／768×1024），验证八卡完整、双目标和完成历史、默认共享习惯、五正三负的同字号同颜色／最新在上／外层下滑、共用创建关闭草稿后刷新恢复、新增和删除持久化、重新种子不覆盖编辑，普通存储与账号工具请求保持。375px 详情／记录及 768px 八卡已目视。新增浏览器模式使用真实种子页和编译开关，适配器只为预览命名空间补充持久化；模拟资料和账号请求均在本地，不读真实账号。截图 `ui-preview-domain-samples/domain-preview-{index,detail,records,history-bottom}-{width}.png`，普通回归截图 `ui-preview-domain-samples-normal`。

普通 `build:weapp` 17 页／12 分包，主包 **1,498,924 字节**，不带示例初始化页；`build:preview` 18 页／13 分包，主包 **1,499,323 字节**，示例分包 **11,446 字节**。两种构建的 67 个源码样式／20 个产物样式、WXSS、启动与原主包 <1.5 MB 预算通过。日志 `domain-samples-{types,isolation,normal-build,preview-build,ui,normal-ui}.log`。相关脚本语法和 `git diff --check` 通过；微信开发者工具冷启动／真机未验证，没有部署。

## 领域记录正文与历史顺序（C108）

2026-10-07 领域详情记录列共用字号变量及原正／负颜色，标题、正文与类型符号继承。`createMarkdownRenderer` 增加可选 `inheritTypography`，仅 `DomainRecordContent` 启用；`RichText` 及生成的正文、标题、引用、强调、链接、代码、表格等文本节点明确继承，保留原格式、图片与安全规则，其他 Markdown 调用默认输出保持原样。记录标题悬停只改变背景，仍保留对应颜色。规则见 [C108](../Design.md#领域记录正文与历史顺序c108)。

展示复制原数组后倒序并按合法 `createdAt` 降序排序，同时间采用倒序追加顺序；不回写、改 ID 或时间。移除两条切片、查看全部按钮和对应展开状态及无用样式，完整正／负记录直接复用现有外层 `PageScroll` 下滑，不新增嵌套滚动。正文阻止冒泡、图片预览、原创建／删除、保存和账号检查保持。

实际验证：`typecheck`、`check-markdown.cjs`（默认及继承外观、原格式与不安全内容拒绝）、`check-domain-data.cjs`、回归脚本语法和 `git diff --check` 通过。完整 `--domains` 四尺寸（360×844／375×667／430×844／768×1024）通过：临时本地六条正、六条负历史，乱序 createdAt 和同时间追加，实测正文／标题／强调／链接／代码／表格等节点与对应标题同字号同颜色，悬停保持正负色；完整历史自然下滑可达、图片预览及删除不冒泡、刷新顺序与原存档数组不变，恢复 fixture 后继续原目标、习惯创建／编辑、记录、失败及账号流程。375px 普通正负内容和历史下滑已目视；截图 `ui-preview-domain-record-history/domains-populated-375.png` 及 `domains-record-history-{top,bottom}-{width}.png`，本次 top 截图从首条正文开始，后续脚本仅调整截图定位到标题，不重复全量检查。

`build:weapp` 主包 **1,498,501 字节**，17 页启动、67 个源码样式／20 个产物样式、WXSS 与原主包 <1.5 MB 预算通过。日志 `domain-record-history-{types,markdown,build,ui}.log`。微信开发者工具／真机未验证，没有部署。

## 领域详情创建习惯入口（C107）

2026-10-07 领域详情「每日习惯」右侧管理跳转替换为 `CreateButton secondary／compact／content` 的「＋ 创建习惯」，使用共享中性灰蓝背景，清理已无引用的 `.domain-manage` 旧外观；局部只保留入口布局。点击直接打开共享 `HabitEditor` 空 ID 草稿，默认当前稳定领域 ID、无优先度、启用。保存复用 `prepareHabitEdit`／`saveHabitEdit` 与 reminders 队列，领域列表不增加独立习惯数据。规则见 [C107](../Design.md#领域详情创建习惯入口c107)。

第一次有效保存才分配候选 ID／创建时间，保留在编辑状态中；失败继续显示创建表单并保留最新输入，重试遇同 ID 已在暂存或最新状态时走原编辑保存，保留最新启停、创建时间、历史及其他记录，不重复创建。读取最新领域来源，确认账号、就绪和格式，按稳定 ID 取最新名称，领域已移除时阻止保存。回调前后核对账号及本机 `volatile`，持久化后才关闭。首次取消不写业务记录，空列表提示改为「暂无习惯」，原卡片查看／编辑保留；不新增存储键，不扩大未完成的全局 P08 草稿恢复。

实际验证：`typecheck`、`check-habit-edit.cjs`、`check-domain-data.cjs`、脚本语法及 `git diff --check` 通过。现有完整 `--domains` 四尺寸（360×844／375×667／430×844／768×1024）通过：入口加号／完整名称、共享中性背景与 40px 触控、右侧对齐；创建默认领域、取消无写入、新建写失败后推进时钟仍保存同一 ID／创建时间、刷新、账号创建及游客未提交输入隔离；原目标完成／撤销／历史、领域管理、习惯详情／编辑和共享历史、进展、持久化及失败流程保持。375px 入口已目视。日志 `domain-habit-create-{types,edit-logic,domain-logic,ui}.log`；截图 `ui-preview-domain-habit-create/domains-habit-create-entry-{width}.png`。

`build:weapp` 主包 **1,498,341 字节**，17 页启动、67 个源码样式／20 个产物样式、WXSS 与原主包 <1.5 MB 预算通过，日志 `domain-habit-create-build.log`。仅修改小程序及相关规范；微信开发者工具／真机未验证，没有部署。

## 已完成目标按钮上下留白（C106）

2026-10-07 领域详情历史入口明确使用 `ActionButton` 的 secondary／compact／content 规格，并以独立 Text 节点承载原「已完成目标」文字。共享 flex 居中、14px 字号、1.4 行高及对称内距保持；删除 `.domain-count` 原局部外观、宽屏重复和负 margin，只保留布局，不使用位移补偿。原历史查看及数据回调保持。规则见 [C106](../Design.md#已完成目标按钮上下留白c106)。

实际验证：`typecheck`、完整 `--domains` 与 `git diff --check` 通过。复用原四尺寸领域回归，在本次 Node 进程中一次性测量该按钮，没有增加永久验收脚本；360×844／375×667／430×844／768×1024 下均为 92×40px，Text 盒高 19.59375px，上下留白均 10.203125px，padding 上下均 8px，中心误差 0。原目标完成／撤销／历史、领域管理、习惯编辑、进展、持久化、账号隔离及失败流程通过，360／375／768px 截图已目视。日志 `goal-button-center-types.log`、`goal-button-center-ui.log`；截图 `ui-preview-goal-button-center/goal-button-center-{width}.png`。

`build:weapp` 主包 **1,498,650 字节**，17 页启动、67 个源码样式／20 个产物样式、WXSS 与原主包 <1.5 MB 预算通过，日志 `goal-button-center-build.log`。微信开发者工具／真机未验证，浏览器文字行测量不代表原生字体视觉验证；没有部署。

## 领域管理位置与更多操作（C105）

本节保留历史实现与验证。C173替代卡内更多窗口，领域编辑删除移至详情右上角；原管理入口与创建占位保持，管理卡可继续导航。

2026-10-07 领域管理移除原 44px 标题行压缩，入口本体保持浏览时的 88px 内容高度与 12px 内距。共享 `DomainProgressSummary` 的无目标／无进度摘要保留原 48px 正文布局，宽屏为 51px；进度真实节点仍移除，图标与标题坐标及尺寸保持。卡内正文列下方改为排序和共享 `MoreSymbol` 两个入口，至少 40px 触控，不与图文重叠；更多复用 `ChoicePopover` 的相邻 128px 小窗，里面为原编辑／删除两个符号按钮。两窗互斥，外部／Esc、退出管理、页面隐藏及账号切换关闭；选择编辑／删除转入原编辑器或应用内确认，保留未分类保护与原保存规则。规则见 [C105](../Design.md#领域管理位置与更多操作c105)。

实际验证：`typecheck`、两项修改脚本 CJS 语法和 `git diff --check` 通过。现有 `check-domain-management.cjs` 增加逐卡图标／标题的 x／y／宽／高在进入、退出及展开更多前后精确相等，保留原卡片边界断言；检查每卡仅两个 ≥40px 按钮、不与图文重叠，更多小窗相邻 8px、完整在视口内且两个动作完整位于窗口内部，空白处点击保持、外部关闭及排序互斥。原完整 `check-domain-workflow.cjs` 更新入口为先展开更多，原编辑／删除／未分类、目标／习惯／进展、持久化、账号隔离及失败重试断言保留。独立 `--domain-management` 与完整 `--domains` 均通过 360×844／375×667／430×844／768×1024；375px 管理与菜单、768px 菜单已目视。日志 `domain-manage-stable-ui-final.log`、`domain-manage-stable-domains.log`、`domain-manage-stable-types.log`，截图 `ui-preview-domain-manage-stable-final` 和 `ui-preview-domain-manage-stable-domains`。

最终 `build:weapp` 主包 **1,499,012 字节**，17 页启动、67 个源码样式／20 个产物样式、WXSS 与原主包 <1.5 MB 预算通过，日志 `domain-manage-stable-build-final.log`。仅修改小程序及相关规范，没有改业务存储或网页；微信开发者工具／真机未验证，没有部署。

## 待办三种排序与拖动切换（C104）

2026-10-07 任务排序小窗改为「日程时间最近／创建时间最近／自定义」单列三项，移除排序依据及升降序行。模式保存到原 todos 的可选 `sort` 字段，沿用账号状态层和队列；旧缺省或未知值保持旧数组并视为自定义。自动模式由最新任务派生展示序，确认切自定义先物化当前展示序。日程升序、创建降序，缺省置后、同时间稳定。规则见 [C104](../Design.md#待办三种排序与拖动切换c104)。

拖动沿用原触摸 Hook，仍以原数组下标映射真实任务 ID；派生排序保留原对象引用。实际换位一次保存新顺序与 `custom`，筛选只替换可见槽位，同槽／原位／取消不改模式或时间。失败保留绝对目标顺序并阻止重复拖动，重试合并最新任务内容、保留新增记录并跳过已删除记录，不再执行第二次相对移动；所有回调核对账号、操作代次和本机 `volatile`。切换账号清除旧目标，不串写其他账号。四象限、完成分组、原备注／标签／图片／日程及编辑行为保留。

实际验证：`typecheck`、`check-todos.cjs`、`check-todo-cross-client.cjs`、`check-personal-tools.cjs` 及相关脚本语法通过。新增纯逻辑覆盖旧存档、三模式、时间同值、缺省时间、自动模式新增／编辑后切自定义、筛选槽位、原位及最新记录重试。`--todo-sorting` 四尺寸（360×844／375×667／430×844／768×1024）通过，包含普通／筛选／已完成／跨象限真实拖动、取消／未持足／同槽不切换、失败目标展示与幂等重试、刷新、账号窗口隔离及失败游客目标切账号不串写；选项与拖动结果的 375px 截图已目视。完整 `--todos` 四尺寸通过，覆盖任务编辑、备注图片、标签、日程、重复、下一步、提醒、完成、筛选、拖动及布局，无渲染错误或横向溢出。日志 `todo-three-sort-final-ui.log`、`todo-three-sort-all-ui.log`、`todo-three-sort-types-final.log`；独立截图 `ui-preview-todo-three-sort-final`，完整截图 `ui-preview`。

最终 `build:weapp` 主包 **1,497,879 字节**，17 页启动、67 个源码样式／20 个产物样式、WXSS 及原主包 <1.5 MB 预算通过，日志 `todo-three-sort-build-final.log`。首次构建超预算后仅清理任务编辑器已不被源码或动态类使用的旧 Picker／标签／日程／步骤样式，保留现用控件与所有校验。网页和后端仅只读核对：网页正常工具规范化保留该可选字段，后端沿用 JSONB 无迁移；网页旧备份合并导入仍会重建对象而省去模式，任务和数组保留、缺省回到自定义，未扩大到网页实现。微信开发者工具／真机未验证，没有部署。

## 习惯详情空间分配（C103）

2026-10-07 共享习惯详情重新分配标题、备注、统计、月份日历与日志的空间，普通模块间距 10px，窗口高度不超过 760／680px 时分别为 6／4px；移除原广泛压到 0／2px 的短屏布局。备注 14px、统计数字 20px、标签 12px 使用固定像素；日期仍六行 40px，统计页面的原 page 模式保持。普通首选高度从 620 调整到 640px，长摘要仍 660px，宽度封顶 560px、实际高度仍扣除可用视口的 12px 外部空白。长名称的原展开按钮将名称摘要和领域信息放在同一触控块内，短屏摘要一行，展开仍显示原文。规则见 [C103](../Design.md#习惯详情空间分配c103)。

实际验证：`typecheck`、`test:daily` 与 `test:sheet-footers` 四尺寸（360×844／375×667／430×844／768×1024）通过；弹层检查额外包含 430×720、模拟 34px 安全区及习惯主页／领域详情两个容器。原默认无滚动、四统计、42 格、40px 日期、日志可达、底栏安全区与展开位置稳定断言保持，新增实际字体和模块间距检查，没有放宽完整可见要求。375px 普通／长内容和 430px 普通详情已目视。`build:weapp` 主包 **1,498,898 字节**，17 页启动、67 个源码样式／20 个产物样式、WXSS 及原预算通过；脚本语法及 `git diff --check` 通过。日志 `habit-detail-spacing-{types,build,daily,footers-complete}.log`，截图 `ui-preview-habit-detail-spacing-{daily,footers-complete}`。微信开发者工具／真机未验证，没有部署。

## 习惯备注省去标题（C102）

2026-10-07 共享 `HabitEditor` 删除备注框前的「提醒自己的话」可见标题节点，原备注直接接在名称下方，不保留标题占位；习惯主页和领域详情的创建／编辑同步。Textarea 的无障碍名称、原内容、占位提示、240 字限制、常显及保存／取消逻辑保持，详情长备注的阅读展开入口沿用原行为。规则见 [C102](../Design.md#习惯备注省去标题c102)。已有两处回归将可见标题断言调整为不存在，备注可见性、几何、内容和保存检查保留。

实际验证：`typecheck`、`test:daily` 和 `test:domains` 四尺寸（360×844／375×667／430×844／768×1024）通过，375px 两处编辑窗口已目视；原备注编辑／保存、归档／恢复、删除、账号隔离和失败重试检查保留并通过。`build:weapp` 主包 **1,497,246 字节**，17 页启动、67 个源码样式／20 个产物样式、WXSS 及原预算通过；检查脚本语法及 `git diff --check` 通过。日志 `habit-note-no-heading-{types,build,daily,domains}.log`，截图 `ui-preview-habit-note-no-heading-daily` 与 `ui-preview-habit-note-no-heading-domains`。微信开发者工具／真机未验证，没有部署。

## 纯图标选择入口对齐（C101）

2026-10-07 习惯排序／筛选和待办排序的偏移来自 `form-choice-trigger` 的两端对齐：只有一个图标时仍靠左，待办筛选此前通过页面 CSS 单独居中。现在 `ChoicePopover` 为纯图标且无 chevron 的入口提供独立布局类，在共用样式中居中并去除子项间距；删除待办筛选的局部补丁。共享图形、控件尺寸、反馈色与状态语义保持，领域管理卡内的同类排序入口同步居中。规则见 [C101](../Design.md#纯图标选择入口对齐c101)。

已有功能栏检查补充实际边界测量：习惯与待办排序／筛选在默认、悬停、按下、移开、排序展开选中和筛选生效状态均为 40×40px 触控、20×20px 图标，中心误差不超过 0.5px。实际验证：`typecheck`、`test:toolbars` 十页面和 `test:domains` 四尺寸（360×844／375×667／430×844／768×1024）通过，包含领域管理卡排序、原筛选／导航、账号隔离及失败重试。375px 习惯／待办排序高亮、768px 习惯筛选高亮和375px 领域管理卡已目视。

`build:weapp` 主包 **1,497,342 字节**，17 页启动、67 个源码样式／20 个产物样式、WXSS 及原预算通过；检查脚本语法和 `git diff --check` 通过。日志 `toolbar-icon-center-{types,ui,build,domains}.log`，截图 `ui-preview-toolbar-icon-center` 与 `ui-preview-toolbar-icon-center-domains`。微信开发者工具／真机未验证，没有部署。

## 习惯推荐区省去标题（C100）

2026-10-07 移除习惯主页推荐区的「待打卡习惯」标题及包裹节点，删除普通和宽屏的专用高度样式，不保留空占位。原分隔线、推荐卡片、空状态、打卡和详情操作保持；其他历史弹窗仍使用 `SectionTitle`。规则见 [C100](../Design.md#习惯推荐区省去标题c100)。已有回归将该标题存在断言改为不存在，其他推荐与打卡验证保留。

实际验证：`typecheck`、`test:daily` 四尺寸（360×844／375×667／430×844／768×1024）通过，包含筛选、拖动排序、推荐卡片、打卡和历史；375px 习惯页已目视，标题与空占位消失、推荐卡片完整。`build:weapp` 主包 **1,497,349 字节**，17 页启动、67 个源码样式／20 个产物样式、WXSS 及原预算通过；`git diff --check` 通过。日志 `habit-recommendation-no-heading-{types,ui,build}.log`，截图 `ui-preview-habit-recommendation-no-heading`。微信开发者工具／真机未验证，没有部署。

## 首页目录副标题间距（C99）

2026-10-07 首页目录的「快捷操作／功能界面」副标题仅增加上下各 8px 内距，继续与「我的快捷方式」使用同一 `SectionTitle` 的 14px／600、1.4 行高及颜色；删除重复的页面 margin 声明，内容间隔仍由共享标题提供 6px。其他标题、功能按钮尺寸、分组和导航保持。规则见 [C99](../Design.md#首页目录副标题间距c99)。

实际验证：`test:home-navigation` 四尺寸（360×844／375×667／430×844／768×1024）通过，包括完整目录默认可见、两屏手势、功能入口、长目录与返回导航；375px 目录已目视，无裁切或横向溢出，没有放宽原完整可见断言。`build:weapp` 主包 **1,497,697 字节**，17 页启动、67 个源码样式／20 个产物样式、WXSS 及原预算通过；`git diff --check` 通过。日志 `home-directory-heading-spacing-{ui,build}.log`，截图 `ui-preview-home-directory-heading-spacing`。微信开发者工具／真机未验证，没有部署。

## 首页排序移入编辑与序号（C98）

本节记录 C98 当时实现；连续编号与不存 rank 已由 C111 替代，仅编辑窗排序及首页只显示铅笔由 C172 替代。当前首页排序草稿再点排序符号才保存，切设置或离页取消；其他编辑保存语义保持。

2026-10-07 首页移除页面排序状态、入口和手势，只保留共享铅笔进入快捷方式编辑；编辑内点击排序进入拖动模式，完成返回设置，保存快捷方式才沿原存储键落盘。已选目录按草稿大卡片／小入口分区排列，角标为连续序号，未选仍加号；增删、切换样式和拖动从同一数组推导序号，不另存排名。原图标、名称、颜色、大小、目录合并和导航保留。用户明确选择各分区独立排序，因此原 `moveHomeShortcut` 的同组守卫保持；`useHomeShortcutSort` 接受滚动容器选择器，迁入编辑后读取原面板滚动位置和边缘区域，触摸取消不提交该次拖动。规则见 [C98](../Design.md#首页编辑排序与序号c98)。

四尺寸首页回归更新为编辑内排序，原名称／样式、取消／保存、失败重试及导航验证保留；删除仅针对已被 C98 替代的主页排序模式和截图断言。独立排序流程覆盖首页无排序入口／拖动绑定、连续移动、触摸取消、两个样式区、序号、取消不改变主页、保存前不落盘、写入失败保留顺序及刷新恢复。完整首页套件的无关旧专注断言仍见 C97；没有恢复该入口或放宽它。

实际验证：`typecheck`、偏好数据、`--home-shortcut-layout` 四尺寸完整编辑流程、`test:toolbars` 和 `test:home-navigation` 通过，尺寸为 360×844／375×667／430×844／768×1024。另覆盖移除／重加的重新编号、全部 15 项和有溢出时的编辑面板边缘滚动／触摸取消。375px 首页两屏及编辑排序已目视。最终 `build:weapp` 主包 **1,497,701 字节**，17 页启动、67 个源码样式／20 个产物样式、WXSS 和原预算通过，相关脚本语法及 `git diff --check` 通过。日志 `home-editor-order-{types,ui-final,toolbars,navigation,build-final}.log`，截图 `ui-preview-home-editor-order-{final,toolbars,navigation}`；微信开发者工具／真机未验证，没有部署。

## 首页名称与样式展开区（C97）

2026-10-07 用户确认异常位于首页快捷方式编辑的「名称与样式」展开设置。该区旧名称输入叠加上下 padding，样式仍用原生 Picker，颜色触控在 375px 下仅约 34px，文字／图标随 px→rpx 放大。现名称使用 `SingleLineInput` 的独立触控框和居中文字行，样式使用 `SingleChoiceField` 相邻应用内小窗，颜色使用 `ChoiceButton` 和固定 20px 色点。名称行复用 quiet 控件并将旋转箭头放在同一触控节点内；字段和图形使用固定像素、正常间距及六列色点布局。删除当前编辑器不再引用的旧拖动／添加／移除样式，保留首页卡片、勾选目录、保存／取消、恢复默认和本机偏好逻辑。规则见 [C97](../Design.md#首页名称与样式展开区c97)。

完整 `test:home-shortcuts` 在 360px 完成偏好编辑回归后，遇到原后半段「专注 17 分钟」习惯详情入口断言；该入口已按 C94 删除，属于既有测试与当前规则冲突。本次不恢复已删除功能，也不放宽该断言；增加 `--home-shortcut-layout`，复用同一完整编辑／排序／持久化／导航流程，独立覆盖四尺寸并省去无关专注入口段。原完整命令及其失败保留可见。名称行居中、展开容器内部不溢出、六色触控及固定图形尺寸新增实际几何检查；样式选择检查沿用真实应用内按钮。

实际验证：`typecheck`、偏好数据检查、`node scripts/check-ui-preview.cjs --home-shortcut-layout` 四尺寸（360×844／375×667／430×844／768×1024）及构建通过；包括名称／样式／颜色保存刷新、取消、恢复默认、写入失败重试、空偏好、排序及原卡片几何。375px／768px 展开区截图已目视。主包 **1,497,422 字节**，17 页启动、67 个源码样式／20 个产物样式、WXSS 和原包体预算通过；相关脚本语法及 `git diff --check` 通过。日志 `home-editor-fields-{types,build,ui-final}.log`，四尺寸截图 `ui-preview-home-editor-fields-final`，完整旧断言失败保留在 `home-editor-fields-ui.log`。微信开发者工具／真机未验证，没有部署。

## 记录进展创建按钮（C96）

2026-10-07 领域顶部记录入口直接使用与创建习惯相同的 `CreateButton` 默认 primary／compact，书写图标替换为共享加号，完整名称仍为「记录进展」。删除原 `.domain-record-trigger` 图形和布局样式，由共享组件提供间距；回调、权限／忙碌条件及领域详情原正负记录半区保持。规则见 [C96](../Design.md#记录进展创建入口c96)。

实际验证：`typecheck` 和四尺寸完整 `test:domains` 通过，覆盖 360×844／375×667／430×844／768×1024 的领域管理、详情、记录创建／草稿、账号隔离和存储失败；375px 顶部加号按钮已目视。日志 `progress-create-button-{types,domains}.log`，截图 `ui-preview-progress-create-button-domains`；微信开发者工具／真机未实测，没有部署。

本次构建前置检查发现 `project.config.json` 的 es6／enhance 再次为 true，按已有 T06 约定仅恢复这两项为 false，保留其他配置和原校验，未降低预算。使用新构建时需按调试说明清除编译缓存并冷启动，不清业务 Storage；微信环境实际验证尚未执行。

修正后 `build:weapp` 通过，主包 **1,498,967 字节**，17 页启动、67 个源码样式／20 个产物样式、WXSS 及原包体预算通过；日志 `progress-create-button-build-final.log`。`git diff --check` 通过。

## 习惯页省去日期与星期（C95）

以下为初次实现记录；顶部归档／返回行现按 C128 移除，daily-core-summary 仅保留实际当天完成反馈。

2026-10-06 小程序习惯主页面移除顶部今日日期／星期节点及其专用样式；`daily-core-summary` 仅在原完成反馈或归档／返回入口存在时渲染，省去空行和边线，有归档入口时靠右显示。原本地日期计算、打卡完成反馈、筛选／排序、归档恢复、详情月历及历史补记未改变，不涉及数据或其他端。C95 替代下文 C92／C94 的日期行位置表述，规则见 [C95](../Design.md#习惯页日期显示c95)。

实际验证：`typecheck`、四尺寸完整 `test:daily` 及 `build:weapp` 通过，360×844／375×667／430×844／768×1024 覆盖网格滚动、筛选／排序、完成反馈、月历、历史补记、编辑与归档恢复。375px 有归档入口及无归档的冷启动首屏已目视，均无顶部日期／星期，正常首屏无该行占位。主包 1,499,236 字节，17 页启动、WXSS 与原包体预算通过。日志 `habit-no-date-{types,daily,build}.log`，截图 `ui-preview-habit-no-date-daily`；微信开发者工具／真机未实测，没有部署。

## 习惯归档与编辑布局（C94）

2026-10-06 小程序共享 `HabitEditor` 的真实节点顺序调整为领域→名称／图标／优先度→提醒自己的话→归档／删除；操作行在原分钟区位置，底部只保留保存，新建不显示生命周期动作。习惯页和领域详情均删除详情中的归档／恢复按钮及专注分钟快捷入口，沿用 C93 铅笔进入同一个编辑器；日历、打卡／撤销和日志保持。分钟输入、卡片历史分钟展示和按分钟生成的推荐理由移除；旧 `minutes` 字段仍兼容读取，编辑只更新实际字段，不覆盖最新存档的分钟值。番茄钟仍按自身节奏关联原习惯 ID。正式规则见 [C94](../Design.md#习惯归档与编辑布局c94)。

两处编辑器共用 `use-habit-archive.ts`，只对当前账号的原 ID 保存 `enabled`，成功留在编辑器并保留尚未保存的标题等输入。`enabled=false` 的旧暂停记录直接显示为已归档，日期行可见入口、筛选、禁用打卡及恢复路径保持。失败保留明确目标，重试归档／恢复不因内存状态反转；暂禁保存和删除，账号变化不把旧目标写到另一账号。共享状态层重新读取时仍可重试该账号自己的未持久化写入，不另建缓存或存储键。删除移为共享编辑器的应用内确认，取消／点外部不删除，确认核对最新来源；失败在窗口中保留原 ID 供同 ID 重试。保存失败也保留原 ID 和编辑输入，取消不生成正式记录。

实际验证：`typecheck`、共享编辑／删除、个人工具账号隔离与持久化、习惯推荐和专注数据检查通过。四尺寸独立归档／恢复（习惯页及领域详情）、完整 `test:daily`／`test:domains`、`test:sheet-footers` 通过；标准尺寸为 360×844／375×667／430×844／768×1024，底栏另覆盖 430×720 和 34px 模拟安全区。检查归档／恢复两方向写入失败、原目标重试、同 ID 账号隔离、未保存输入、原历史／排序／创建时间／旧分钟保留、刷新后恢复、删除取消／外部关闭及失败重试；布局量真实字段顺序和位置、分钟节点缺省、操作至少 40px、单一保存底栏及完整日历。375px 编辑／详情和 768px 领域编辑截图已目视。日志 `habit-archive-*.log`，截图 `ui-preview-habit-archive-{final,daily,domains,footers}`。最终小程序构建结果见本节后续记录；微信开发者工具／真机未实测，没有部署。

最终构建 `build:weapp` 通过，主包 **1,499,429 字节**，沿用原 1,500,000 字节预算；17 页启动、67 个源码样式／20 个产物样式、WXSS 与项目配置检查通过。日志为 `habit-archive-build-final.log`。相关脚本语法和 `git diff --check` 通过。

本节替代下文 C70／C72／C91／C92 关于分钟能力、删除底栏、详情启停与暂停用词的历史实现说明；通用输入对齐、日历布局及其他数据规则继续有效。

## 管理与编辑符号入口（C93）

2026-10-06 按用户要求把小程序独立管理／编辑文字入口换为共享 ManageSymbol／EditSymbol。迁移首页快捷方式管理、格言管理、领域目标编辑与习惯管理、习惯页和领域详情的习惯编辑，以及饮食记录／常吃餐品编辑。沿用 ActionButton icon、compact／content，模式切换仍用原 ChoiceButton iconOnly；辅助编辑不再撑满主操作宽度。格言列表行的旧铅笔换为共享图形，移除两处废弃局部图标 CSS。未被当前页面引用的历史 GrowthGarden 也统一原管理／编辑图形，没有恢复旧首页入口。规则见 [C93](../Design.md#管理与编辑符号入口c93)。

原回调、数据、账号、权限、未分类保护与忙碌状态不变；补充习惯／饮食编辑入口的动作对象无障碍名称，保留实体标题、业务卡片内容和编辑窗口标题。既有交互检查改用明确名称；首页实际测量管理图形 20×16px、居中误差不超过 1px，并保留导航／编辑／排序验证。管理图形外框宽 20px、铅笔 20×20px，触控与图形尺寸独立。

实际验证：typecheck、小程序构建与原包体预算通过，主包 **1,498,727 字节**；17 页启动、67 个源码样式／20 个产物样式、WXSS 和配置检查通过。四尺寸完整习惯／领域、功能栏、首页快捷方式、饮食编辑和格言回归通过；弹层底栏含 34px 模拟安全区及额外 430×720 通过。标准尺寸为 360×844／375×667／430×844／768×1024，375px 首页、习惯底栏和领域详情已目视。输出 ui-preview-manage-edit-symbols-{daily,domains,toolbars-final,home-final,meals,mottos-final,footers}，日志 manage-edit-symbols-*.log。格言套件原「本机保存提示必须存在」断言与先前 C83 冲突，本次按明确旧决定改为正常游客无该节点，长列表滚动、创建与最后行可达断言保留。源码检索没有独立可见「管理／编辑」旧文字按钮或旧局部铅笔节点；相关脚本语法与 git diff --check 通过。微信开发者工具／真机未实测，没有部署。

## 暂停习惯恢复入口（C92）

以下为初次实现和验证记录；顶部归档／返回行现按 C128 移除，查看与返回使用筛选，恢复操作沿用 C94 共用编辑器。

2026-10-06 在小程序习惯页原日期行增加条件显示的紧凑 quiet「已暂停＋数量／返回习惯」，沿用共享控件，40px 触控；暂停查看统一调用 viewPaused 清除领域及未完成条件，原筛选入口复用相同逻辑。全部习惯都暂停时使用恢复提示，详情「启用习惯」改为「恢复习惯」，成功后回到全部启用习惯。规则见 [C92](../Design.md#暂停习惯恢复入口c92)。

toggleEnabled 保存明确的 enabled 目标，读取最新同账号 reminders，仅映射原 ID 的 enabled，不清洗或重建其他字段。保存返回后核对本机 volatile，失败保留原详情／目标，按钮显示重试恢复或重试暂停；重试时不用已变化的内存状态反转目标。待重试时日期、打卡和编辑禁用；其他保存已持久化后忽略旧待重试状态。账号切换清除旧页面操作，生命周期上下文和独立保存令牌阻止晚到回调关闭新详情或解除新操作忙碌状态。没有新增业务存储键、修改网页或操作用户实际记录。

新增 check-habit-recovery-ui.cjs，接入 --habit-recovery 与完整 test:daily。覆盖全部习惯暂停、可见入口与触控、领域及未完成冲突清除、原筛选、恢复后的正常列表／刷新、暂停及恢复写失败的幂等重试、完整原 ID／排序／创建时间／打卡时间／日志历史不变，以及同 ID 的游客与账号隔离、无系统窗口。测试后清理自己生成的合成存档，避免影响后续默认领域案例。

最终 typecheck、check-personal-tools.cjs、check-habit-edit.cjs、相关脚本语法和 git diff --check 通过。独立 --habit-recovery 与完整 test:daily 在 360×844／375×667／430×844／768×1024 通过，完整套件保留原排序、打卡、感想、日历、编辑／删除和账号隔离检查；输出 ui-preview-habit-recovery 与 ui-preview-habit-recovery-complete-final，日志 habit-recovery-ui.log／habit-recovery-daily-final.log。375px 暂停列表和恢复详情已目视，日期行入口和恢复按钮完整可见。构建日志 habit-recovery-build-final.log，主包 **1,498,886 字节**；17 页启动、67 个源码样式／20 个产物样式、WXSS、配置及原主包 <1.5 MB 预算通过，产物包含最终恢复提示。微信开发者工具／真机未实测，仅修改小程序及相关文档，没有部署。

## 习惯详情布局（C91）

2026-10-06 修正习惯详情「日期周行拉伸，而周围间距归零」导致的拥挤。`HabitCalendar` 共享详情样式将日期固定为六行、每行 40px，取消统计外框，月日志入口使用共享 quiet 按钮；保留原四项统计、42 格、月份导航、日志、专注和直接日期打卡。标题／正文／底部操作左右统一 16px，普通区块与操作栏顶部为 8px，短屏采用紧凑间距。统计与日历、日历与日志仍分开，实际日期触控不缩小；统计页默认 page 模式不受影响。规则见 [C91](../Design.md#习惯详情布局c91)。

两处通过 `habitDetailSheetClass` 使用同一详情尺寸：最大宽度 560px并居中，普通／长标题或长备注阅读摘要首选高度 620／660px，实际均不超过可用视口减 12px。660px 为长摘要留出正常阅读间距，不依靠减少日期触控或裁切核心区域；打开后的展开／收起、打卡与忙碌状态不改变尺寸和底部操作位置。实际短屏仍受视口上限限制，短屏间距在 760px 以下采用紧凑规则；底部继续由 `SheetActions` 按导航名单处理安全区，未复制业务数据或更改保存逻辑。

已完成 `typecheck`、相关脚本语法及四尺寸完整 `test:daily`／`test:domains` 回归。共享布局检查新增固定日期行高不超过 41px、统计与日历至少 2px 间距及 560px 最大宽度，原无默认滚动／42 格完整／至少 40px 触控／最后一周不遮挡断言保留。`test:sheet-footers` 覆盖普通与 60 字标题／240 字备注／25 分钟专注、月份切换、日志／阅读展开、固定操作栏、34px 模拟安全区、原生导航页与独立领域详情，额外增加 430×720 中等短屏以检查可用高度扣除导航后的布局。未放宽失败断言；所有检查使用本地合成数据。截图输出 `ui-preview-habit-detail-spacing-{daily-complete,domains-complete,footers-final}`，430×720 附加输出在 footer 目录的 `short-430x720`；375px／430px 普通详情及 768px 长标题详情已目视。日志为 `habit-detail-spacing-*.log`。

最终 `build:weapp` 通过，主包 **1,497,327 字节**，17 页启动、67 个源码样式／20 个产物样式、WXSS 防护、配置、依赖边界和原主包 <1.5 MB 预算通过，日志 `habit-detail-spacing-build-final2.log`。四尺寸习惯／领域完整回归与含额外 430×720 的最终弹层安全区检查全部通过，相关脚本语法和 `git diff --check` 通过。仅修改小程序共享组件、调用处、布局检查与规则文档，微信开发者工具／真机未实测，没有部署。

## 习惯排序与长按（C90）

2026-10-06 习惯 `PageToolbar` 的排序／筛选直接使用待办同款 `SortSymbol`／`FilterSymbol`、`ChoiceButton iconOnly` 和 `ChoicePopover`，40px 触控、无 chevron；排序展开高亮，筛选完成状态或领域分类生效时高亮。排序依据／升降序在相邻独立小窗选择，确认后保存模式，外部关闭不保存。选项复用 `form-option` 等宽两列，窗口标题复用 `SectionTitle`，操作保留底部；短屏默认全部选项与确认完整显示。规则见 [C90](../Design.md#习惯排序与长按c90)。

`ReminderState` v1 扩展可选 `sort`（field／direction）和 `checkInTimes`（day／habitId／实际时间戳），沿用原 reminders 账号状态层、容量检查与串行保存，不添加存储键。旧无 sort 使用原优先度／创建日期；自定义使用数组顺序，新建习惯由原编辑逻辑追加末尾。`orderedHabits` 引用原累计／连续打卡数据，平均时刻按最近 90 个保留记录日的有效当天时刻计算；缺省时刻／创建日期置后，同值稳定。`toggleReminderDone` 为实际当天新增打卡记时，历史补记不记时；`cleanState` 清理撤销、删除、不匹配日期的时刻，日历目标状态保存透传 now，幂等重试不更新原时刻。旧网页的只读兼容检查表明其 normalization 会保留这些可选字段；没有改网页。

共享 `useHabitGridSort` 改为长按 400ms 激活，提前滑动超过 8px 取消等待、保留列表滚动；拖动时通过原生 ScrollViewContext 锁滚动，原模板／scrollY 不变，边缘自动滚动沿用，结束恢复。松手实际换位后直接保存当前最新全序中的可见 ID 对应位置，其他记录保留，并设置 custom；原位／取消不保存，400ms 内抑制长按后的点击。保存使用最新账号状态，核对 `volatile`；失败保留目标操作，原目标顺序重试不重复换位。菜单保存失败保留小窗，拖动失败就地显示重试；账号变化重置窗口／待重试操作，不跨账号保存。P02 在该范围已实现，P10 多设备记录合并仍待实现。

已完成验证：`typecheck`、习惯排序／日期日历／感想纯逻辑、账号状态层保存与隔离通过；四尺寸独立 `--habit-sorting`、功能栏及完整领域回归通过。覆盖六种依据、升降序、平均时刻与相同值、缺省字段、旧网页字段往返、当天记时／撤销／补记、筛选拖动、刷新自定义持久化、触控／8px 邻接、外部取消、长按与滑动区分、不误打卡／详情、保存失败幂等重试和账号隔离。四尺寸为 360×844／375×667／430×844／768×1024；375px 排序窗口已目视。

完整 `test:daily` 四尺寸回归通过，包含独立排序、原网格／推荐／打卡／感想／历史、编辑／删除、单习惯日期修改、持久化与账号隔离。旧断言按 C90 更新：无需排序模式的取消／保存、暂停筛选仍可选择排序方式、新建高优先度不覆盖 custom；边缘拖动现在实际持久化，历史测试通过原「加载更多」找到移至后面的习惯，再恢复顶部检查完整日历，没有放宽可达性或数据断言。最终输出 `ui-preview-habit-sorting-complete`，功能栏 `ui-preview-habit-sorting-toolbar-final`，领域 `ui-preview-habit-sorting-domains`，独立窗口 `ui-preview-habit-sorting-options-final2`，对应 `habit-sorting-*.log`；最终完整习惯套件也包含默认选项无需滚动及长按后不误触的新增断言。

最终 `build:weapp` 通过，主包 **1,494,836 字节**，17 页启动、67 个源码样式／20 个产物样式、配置、依赖边界与原主包 <1.5 MB 预算通过，日志 `habit-sorting-build-final.log`。浏览器适配不代表微信原生验证，微信开发者工具、原生长按／滚动与真机未实测。仅修改小程序及相关规则文档，没有部署。

## 领域管理卡与创建占位（C89）

本节保留历史实现与验证。C173将排序从管理分离，卡内仅排序时显示上移／下移，编辑删除移至详情；原管理创建占位、两列及数据保护继续有效。

2026-10-07 管理图文与卡内操作布局由 C105 替代，以下为 C89 首次实现和验证记录。

2026-10-06 领域 `PageToolbar` 复用 `ChoiceButton iconOnly` 与 `ManageSymbol` 切换管理，右侧普通主操作改为原「记录进展」，仍打开 `DomainQuickRecord`／共用 `EntryComposer`。删除顶部创建及原独占一行的记录入口。管理卡保留原两列和 88px 内容高度，44px 标题行复用 `DomainProgressSummary showProgress={false}`，隐藏计数与进展真实节点；44px 操作行含排序／编辑／删除图标，各至少 40×40px。标题为普通 View，避免嵌套按钮；排序小窗保留上移／下移和首末禁用。管理时末尾追加同尺寸、仅居中加号的创建占位，不加入存储，空列表仍可创建，达到原容量限制时禁用。规则见 [C89](../Design.md#领域管理卡与创建占位c89)。

保存仍使用原 `domains` 状态层、账号及最新记录检查；核对本机 `volatile` 后才关闭。新领域写失败在原窗口保留生成 ID，以 `pendingId` 重试，不重复生成；排序写失败的小窗重试仅保存当前顺序，不再移动一次。编辑／删除入口保护未分类，确认删除改为 `SheetBackdrop`、原领域弹层样式与 `SheetActions` 的应用内窗口，明确共享习惯保留为未分类；取消或外部关闭不删除，删除写失败保持窗口并以原 ID 重试。共享习惯存档没有复制、删除或新键。P05 的固定系统 ID、按需保存方式和名额计算尚未完整实现，其他编辑器的 P08 范围未扩大。

实际验证：`typecheck`、原领域纯逻辑与日期时区、共享习惯编辑、账号状态层持久化／隔离、WXSS 防护及相关 CJS 语法通过。`--domain-management`、完整 `test:domains`、`test:toolbars` 和 `test:sheet-footers` 在 360×844／375×667／430×844／768×1024 通过。逐卡测量管理前后宽高和位置完全相同，核对操作位于卡内、触控至少 40px、占位加号居中、进度隐藏／恢复与数据不变；覆盖空列表／容量满、创建同 ID 重试、排序保存重试、删除取消／失败重试、未分类禁改删、原目标／习惯／记录交互、账号切换与游客不受影响。360px 执行额外账号案例；底栏套件包含 34px 模拟安全区。原测试删除未分类的路径改为禁用断言，因此其后保存的列表保留第九个未分类领域，原默认八域检查未放宽。375px 和 768px 管理截图已目视。输出 `ui-preview-domain-management-{final,domains-final,toolbar,footers}`，对应日志 `domain-management-*.log`。

最终 `build:weapp` 通过，主包 **1,488,253 字节**，17 页启动、67 个源码样式／20 个产物样式、配置、依赖边界及原主包 <1.5 MB 预算通过，日志 `domain-management-build-final.log`。微信开发者工具与真机未实测，浏览器适配不代表微信运行验证；仅修改小程序及相关规范，没有部署。

## 待办排序图标与窗口（C88）

2026-10-07 选项与持久化现按 C104，以下为 C88 首次实现和验证的历史记录，不能作为当前模式规则。

2026-10-06 待办使用 `PageToolbar` 的排序插槽，在筛选左侧增加共享 `SortSymbol` 纯图标。触控沿用 compact／40px、共用选中与按下反馈，无 chevron；`ChoicePopover` 按按钮实际位置打开相邻小窗，顶部关闭与底部排序操作保持可达。选项为日程时间／创建时间和升序／降序，只有确认才保存。原顶部创建及状态行未恢复，普通任务新增／编辑、筛选和拖动保留。规则见 [C88](../Design.md#待办排序入口c88)。

`todo-data.ts` 扩展原时间排序并保留 `sortTodosByTime` 兼容入口；复制数组排序，不改记录对象及字段。缺少时间始终放后，同时间稳定，日程缺少具体时间按当日 23:59，创建时间按实际时刻比较且兼容缺省旧值。确认使用当前账号最新完整任务状态，即使正在筛选也不删除或只重排可见记录；依旧按四象限和完成状态分组展示。通过原状态层持久保存数组顺序，不新增偏好或业务存储键，也不持续覆盖后续拖动。保存中阻止重复操作／关闭，失败在窗口提示并保留选项，核对 `volatile` 后才关闭；账号变化关闭原窗口并重置选项。

实际验证：`typecheck`、任务纯逻辑、账号状态层持久化／隔离、相关 CJS 语法及 WXSS 防护用例通过。独立 `node scripts/check-ui-preview.cjs --todo-sorting` 与 `test:toolbars` 在 360×844／375×667／430×844／768×1024 通过，覆盖图标位置与 40px 触控、8px 邻接、取消不保存、两种依据及升降序、同时间／缺省兼容、其他字段与分组保留、筛选期间全记录排序、刷新持久化、失败重试和没有系统反馈；360px 另验账号切换窗口关闭、配置隔离及排序不改游客记录。375px 小窗及结果截图已目视。完整 `--todos` 四尺寸回归通过，包括任务备注图片、编辑、日程、提醒、完成、筛选、跨象限拖动及首屏布局；旧断言中「没有排序插槽」更新为 C88 要求，未放宽其他检查。独立输出 `ui-preview-todo-sorting-final`，功能栏输出 `ui-preview-todo-sorting-toolbar`，完整输出 `ui-preview-todo-sorting-full-final`，对应日志 `todo-sorting-*.log`。

`build:weapp` 通过，主包 **1,481,048 字节**，17 页启动、66 个源码样式／20 个产物样式、配置、依赖边界及原主包 <1.5 MB 预算通过，日志 `todo-sorting-build.log`。微信开发者工具与真机未实测，浏览器适配不代表微信运行验证；仅修改小程序及相关规范，没有部署。

## 待办移除顶部创建入口（C87）

2026-10-06 删除待办 `PageToolbar` 的创建插槽及专用空容器样式，顶部只保留原筛选图标。四象限加号继续打开原 `EntryComposer`，带入对应优先度；首页入口及提交按钮保持。原回归中从已删除入口创建的路径改为无优先级象限的加号，没有改业务保存或降低布局／容量断言。正式规则见 [C87](../Design.md#待办顶部创建入口c87)。

`typecheck`、相关 CJS 语法、四尺寸 `--todos`、`test:toolbars`、`test:entry-creation` 和 `test:sheet-footers` 通过，375px 待办首屏已目视。覆盖顶部仅筛选、四象限创建与默认优先度、筛选／完成／拖动、编辑与日程、共用创建及 34px 模拟安全区，日志 `todo-remove-create-{complete,toolbar,entry,footers}.log`。`build:weapp` 通过，主包 **1,476,511 字节**，17 页启动、WXSS、配置及原包体预算通过，日志 `todo-remove-create-build.log`。浏览器适配检查不代表微信验证，微信开发者工具及真机未实测，没有部署。

## 领域卡图标上下留白（C86）

2026-10-06 领域主列表卡片由继承的 `align-items: flex-start` 改为 `align-items: center`，让共享摘要及 40px 图标在可点击卡片区域垂直居中；保留原卡高、左右 12px 间距、名称、计数、进展线和独立管理栏。375px 领域主列表截图已目视，上下留白对称。沿用四尺寸 `test:domains` 检查卡片与原业务交互，日志 `domain-icon-vertical.log`；`build:weapp` 通过，主包 1,476,789 字节，17 页启动、WXSS、项目配置及原包体预算通过，日志 `domain-icon-vertical-build.log`。微信环境未实测，仅修改小程序样式及相关规范，没有部署。

## 习惯日历直接打卡（C85）

2026-10-06 `HabitCalendar` 的详情模式增加可点击日期，习惯页与领域详情共用 `use-habit-calendar-edit.ts` 和 `habit-calendar-edit.ts`。未完成日期补记，已完成日期撤销，保持详情打开，不触发系统窗口或额外记录输入。沿用原历史最近 90 天范围，未来、范围外及暂停习惯禁用；统计页不传保存回调，仍只读。原批量历史入口和今日完成操作保留，读取原 `reminders`，没有新增业务存储键或独立日历数据。正式规则见 [C85](../Design.md#习惯日历直接打卡c85)。

保存沿用原账号状态层和队列，核对最新账号、习惯 ID、启停状态与日期；忙碌时禁用重复点击及关闭。按账号、习惯和日期保留页面会话中的操作目标，写失败后同一天重试保存同一状态，避免内存已经改变而再次点击反向撤销；只有对应账号持久化成功才清理其重试元数据，不影响其他账号。页面离开后的全局草稿仍按 P08 当前范围。

42 个日期使用专用业务按钮，触控至少 40×40px。详情收拢统计、标题、图例及操作栏的非必要间距，底栏使用共享 compact 规格；短屏仍完整显示六行日期、四项统计、日志／专注入口及原安全区，没有放宽完整可见断言。375×667 普通详情、长标题／备注及领域详情截图已目视。

实际验证：`typecheck`、`check-habit-calendar.cjs`、`check-habit-edit.cjs`、`check-personal-tools.cjs`、WXSS 防护用例及相关 CJS 语法通过。`test:daily`、`test:domains`、`test:sheet-footers` 和 `node scripts/check-ui-preview.cjs --habit-calendar-edit` 在 360×844／375×667／430×844／768×1024 通过。覆盖两处日期补记／撤销、跨月日期、刷新持久化、90 天边界、暂停禁用、原 ID／其他习惯保留、失败同状态重试、统计只读及没有系统反馈；360px 额外验证同习惯 ID 的账号切换与失败操作隔离。底栏套件包含长标题、长备注、专注入口和 34px 模拟安全区。输出为 `ui-preview-habit-calendar-{daily-complete,domains-complete,footers-final,verified}`，对应日志 `habit-calendar-*.log`。

最终 `build:weapp` 通过，主包 **1,476,770 字节**，17 页启动、65 个源码样式／20 个产物样式、配置、依赖边界与原主包 <1.5 MB 预算通过，日志 `habit-calendar-build-final.log`。浏览器适配检查不代表微信环境验证；微信开发者工具与真机未实测，未运行无关全量 `verify`，只修改小程序及相关文档，没有部署。

## 习惯单页（C84）

2026-10-06 习惯移除 `MoreSection` 及原全部／管理重复列表，`PageScroll` 不再设置第二页吸附点，单页底部不额外预留下页空间。原网格、分类、排序、创建、推荐、单习惯月份日历及共用编辑删除保留。筛选增加已暂停状态，暂停卡使用原 `HabitCard`，打卡和排序禁用；详情暂停／启用按当前账号及最新记录更新原 ID，原历史与其他字段保持。

原七日补记界面从筛选的「打卡日历」进入独立窗口，沿用日期／前后周、领域分类、加载更多、补记／撤销及原存储规则；滚动在窗口中部，标题和关闭按钮保持可达，窗口上方留 12px 外部关闭区域。新面板使用相对定位保证位于共享遮罩上方，点击日期或关闭不被遮罩拦截。正常本机说明仍按 C83 集中到「我的」，异常和重试保留首屏；没有新增业务存储键或复制习惯数据。正式规则见 [C84](../Design.md#习惯单页c84)。

实际验证：`typecheck`、原账号隔离／持久化／失败恢复、共用习惯编辑与删除、吸附逻辑、WXSS 防护用例、CJS 脚本语法及 `git diff --check` 通过。`test:daily`、`test:screens`、`test:toolbars` 在 360×844／375×667／430×844／768×1024 通过。新增检查覆盖没有第二页、已暂停筛选、暂停禁打卡／排序、暂停后刷新与重新启用、原 ID／非启停字段不变、窗口日期选择和外部关闭不保存记录；保留原网格滚动／排序、完成／撤销、历史补记、编辑、删除与领域／专注的共享数据回归。375px 网格、详情底栏与补记窗口截图已目视。最终输出 `ui-preview-habit-single-{daily-verified,screens-final,toolbars-final}`，对应日志 `habit-single-*.log`。

完整 `test:page-snap` 四尺寸通过，包含习惯与待办没有第二页、其他页面滑动往返、长页滚动、横向及取消手势，输出 `ui-preview-habit-single-snap`，日志 `habit-single-snap.log`。最终 `build:weapp` 通过，主包 **1,471,018 字节**，17 页启动、65 个源码样式／20 个产物样式、项目配置、依赖边界与原主包 <1.5 MB 预算通过，日志 `habit-single-build-final.log`。微信开发者工具与真机未实测，未运行无关全量 `verify`；仅修改小程序及相关规范，没有部署。

## 滑动翻页与数据提示（C82／C83）

2026-10-06 共用 `CoreScreen` 及选择页移除底部下箭头真实节点，页框底部保留正常 8px 间距，释放原翻页按钮空间。`MoreSection` 增加 `showReturn`，仅首页第二页关闭返回；原 `PageScroll` 滑动吸附、长页滚动及其他页面返回保持。待办删除原第二页，传入空吸附列表；四象限保留原创建、筛选、完成、拖动和内部滚动，读取／格式错误及重试在首屏显示，同步错误放在四象限下方。

共用 `toolPageStatus` 只在展示层省去正常游客本机保存说明，工具状态层原值、账号隔离、串行队列及存储格式未改变。相关页面省去空状态容器；「我的」复用已确认 session，通过「数据保存与同步」统一说明游客本机保存或账号同步及游客不自动合并。读取／保存失败、暂存、离线与同步失败保留原提示和重试。正式规则见 [C82／C83](../Design.md#滑动翻页与待办单页c82)。

原浏览器检查中点击下箭头的路径改为共用手势导航辅助；独立 `test:page-snap` 仍验证真实触摸处理、最小滑动、往返、取消、横向与长页偏移，待办验证没有第二页。整页检查增加下箭头不存在、首页返回不存在、其他页正常本机说明不存在及「我的」统一说明断言。番茄钟旧整页测试名称更新为已实现 C80 的「开始专注」，保留原计时与布局断言。

实际验证：`typecheck`、`check-tool-status-display.cjs`、`check-personal-tools.cjs`、`check-page-snap-logic.cjs`、WXSS 防护用例、全部 CJS 脚本语法及 `git diff --check` 通过。`test:screens`、`test:page-snap`、`test:home-navigation`、`test:toolbars`、`--todos`、`--pomodoro` 六套浏览器回归覆盖 360×844／375×667／430×844／768×1024，通过整页空间、滑动、目录、控件、任务编辑／筛选／拖动与原番茄钟操作；375px 首页、全部功能与待办截图已目视。输出 `miniprogram/test-results/ui-preview-swipe-{layout-final,gestures,navigation,toolbars,todos,pomodoro}`，对应日志 `swipe-*.log`。

`build:weapp` 通过，主包 **1,470,029 字节**，17 页启动、65 个源码样式／20 个产物样式、转换配置、依赖边界和原主包 <1.5 MB 预算通过，日志 `swipe-pages-build.log`。微信开发者工具和真机未实测；未运行无关全量 `verify`，仅修改小程序及相关文档，没有部署。

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

## WXSS 空语句编译失败（T27）

2026-10-06 用户提供首页 `pages/index/index.wxss(1:17710): unexpected token ;`。只读检查原 dist 的对应偏移，准确定位 `.today-feature-title{;margin-bottom:6PX}`；源码 `src/pages/index/index.css:40` 存在同一多余分号。删除该分号，原 6px 间距和布局不变，再运行 `build:weapp` 生成产物，没有手改 dist。

此前 PostCSS 允许空语句，其解析结果将多余分号保留在节点 `raws` 中；压缩产物仍包含 `{;`，而微信 WXSS 编译拒绝。新增 `scripts/check-weapp-styles.cjs` 使用现有 PostCSS 依赖检查解析错误及节点 before／after／ownSemicolon 中的空语句；不扫描声明值中的合法分号，不把注释或字符串误报为语法问题。`check-weapp-bootstrap.cjs` 在共用启动入口扫描全部源码 CSS 和产物 WXSS，正式／真机调试构建调用此入口；此检查不等于完整微信原生语法编译器，也不声称持续 watch 已逐轮接入。

实际验证：`node scripts/check-weapp-styles-test.cjs` 覆盖原空语句、重复／规则末尾多余分号、解析失败，以及合法声明尾分号、注释、字符串、自定义属性、import 与嵌套 media，全部通过。`build:weapp` 通过；补充后的样式守卫、产物启动和包体检查再次通过，扫描 **65** 份源码样式、**20** 份产物样式，17 页（5 主包、12 分包）启动及依赖边界通过，主包 **1,469,499 字节**，原 <1.5 MB 预算保留。构建日志 `miniprogram/test-results/wxss-semicolon-build.log`。未增加无意义的样式 UI 测试；微信开发者工具与真机未运行。重新打开开发者工具编译当前产物；若仍显示旧位置错误，只清编译缓存再编译，保留业务 Storage。

## 数据和构建边界

- 个人工具使用版本化 JSON，客户端复用状态层，后端按账号与工具键隔离。小程序的领域为 `domains`，习惯与打卡为 `reminders`；领域与成长足迹 `growth` 是不同工具。
- 统计页面按 C18 只读引用 `todos`、`pomodoro`、`reminders`、`meals`、`domains`、`growth`，不新增工具存储键或业务副本。沿用共享状态层的读取与既有同步，多源 `ready` 且 `owner` 一致、当前类别数据通过格式校验后才展示；账号切换、离线及不兼容数据的检查见 [统计说明](statistics-miniprogram.md)。
- 首页按 C48 保留快捷入口和全部入口两屏，原领域进展概览与页内停靠点已移除；`growth` 快捷方式进入领域主界面，保留既有布局设置。领域主列表的共享 `DomainProgressSummary`、目标累计／习惯今日口径和原数据保留，入口见 [首页两屏](miniprogram.md#首页两屏与领域入口c48)。
- 已确认但待实现的数据行为包括：固定系统未分类（P05）、本机草稿恢复（P08）、个性设置账号同步（P09）、记录 ID 自动合并（P10）。新增字段和机制应兼容旧存档，并保留账号隔离；当前整份 JSON 保存不能称为自动合并。
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
- `test:sheet-footers`（`--sheet-footers`）模拟 34px 整机底部安全区，检查任务日程／任务表单、习惯页详情／编辑以及无 tabBar 的领域习惯详情／编辑，覆盖默认与重复独立小窗状态、单一分隔线、按钮贴近底边、任务六行日历免滚动和取消不写业务记录；已纳入 `verify`。C32 几何检查复用 `scripts/check-habit-detail-layout.cjs`，也由 `test:daily`／`test:domains` 调用：默认未滚动时四项统计、完整日历面板、最后日期格、图例及日志按钮均位于可见内容区（专注分钟入口已按 C94 移除）并高于操作栏。联合覆盖 375×667、60 字标题、240 字备注、旧 minutes=25 存档与非零安全区，日期行至少 30px、按钮至少 40px、长标题正文宽度大于 120px；检查展开收起后恢复默认及取消保留数据。不能仅以 DOM 数量或容器边界判断通过；模拟通过不等于微信真机通过。
- 习惯详情按 C27／C32 复用 `HabitCalendar layout='detail'` 和共享 `HabitDetailTitle`／`HabitDetailNote`，从原 `reminders` 及习惯 ID 读取；面板尺寸和区块留白以后续 C91 为准，普通／长摘要首选 620／660px、宽度封顶 560px，实际高度不超过可用视口减 12px，日期固定六行、每行 40px。相关回归检查默认核心内容与入口完整可见、标题／备注摘要及全文展开、月份切换／回到本月、日志展开与完成／撤销同步，保留七日补记及统计原模式。标题超过 32 字默认最多两行，备注超过 48 字或多行提供阅读入口，原文保留；编辑表单备注仍常显且可为空。展开内容可滚动查看，不复制日历组件或新增存储。
- 领域完成数的纯逻辑检查为 `node scripts/check-domain-completion.cjs`，纳入 `test:logic`；覆盖本地跨日、目标完成／撤销、未来过滤、启停／删除、旧分类及改名映射、归档与明确撤销、只读不改原数据。`test:home-navigation` 检查首页两屏与旧概览移除，旧 test:home-overview／--home-summary 为兼容入口；导航或滚动变更另运行 `test:screens`、`test:page-snap`，领域业务回归运行 `test:domains`。
- 修改选择控件时先核对 [C12／C13／C28／C41](decisions.md#已确认) 与现有同类组件；实体表单的单选浮窗、标签常用行及多选浮窗、自定义输入复用共用实现，备注保持常显。检查各调用页面的选中反馈、常用默认、原值编辑、保存与重开、小屏浮窗边界及旋转箭头方向；范围按当前用户要求确定，局部任务不扩大到无关选择器。
- 任务日程使用 `TodoScheduleSheet` 统一创建／编辑入口（C14），继续沿用 `dueDate`、`dueTime`、`reminderAt`、`recurrence` 和原有任务保存流程。验证面板确认回填、取消不回填、清除仅作用于日程字段、保存后重开及旧任务兼容；提醒时间编辑不代表微信订阅授权完成，保留已有取消旧提醒和同步处理。
- 日程布局按 C25 检查默认完整六行日历及三项设置无需滚动、内容不被固定底部操作遮挡；覆盖 360／375／430／768px 宽度及 375×667 短屏，选项在独立小窗内选择，主日历与三行位置不变；必要时仅小窗中部滚动且操作可达。浏览器检查不替代微信 ScrollView 和底部安全区验证。
- 已确认设计写入 `Design.md`，工程约定写入根 `AGENTS.md`，命令及流程写入本文件；使用步骤写入对应功能说明。
- P01–P12 已于 2026-10-04 确认；后续直接遵循决定，无须重复询问。P02 新增习惯按 C90 在自定义顺序末尾加入；P10 编辑与删除冲突等未定细节在实施时补足。
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

习惯首屏删除 PageJump 的「全部习惯」按钮；当时顶部管理沿用下页管理区，后续 C72 移除该顶部入口，原完整列表／历史仍可从原下页按钮进入。排序入口从分类行移到功能栏，仍用原拖动、取消、保存与保留隐藏习惯的规则；筛选沿用未完成状态，作用于主网格及原列表。待办完成状态与四象限语义保留，排序沿用原时间／默认切换；便签排序独立为小窗，标签分类仍更新原 tagFilter，不新增目录。文章分类单行显示，原排序／标签／页数选择迁入相邻应用内小窗，仍用同一 PostFilter。首页输入与创建回调保留，共用栏左侧输入需要 flex 容器承载原 width:0 单行控件，避免换包装节点后输入宽度归零；旧捕获行按钮的 60px 最小宽度改为 40px，文字与共享内边距保留，四尺寸输入仍大于 120px，不能机械放宽原可读性断言。

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

## 习惯编辑共用控件与输入对齐（C70／C71）

2026-10-06 `HabitEditor` 与 `ProgressEditorFields` 共用 `DomainChoiceField`：领域图标／名称、横长填满、至少 44px 触控及右侧旋转箭头来自同一字段，不另显示「领域」标签。习惯旧 group 通过原 `alignHabitDomain` 解析显示，选择使用稳定 ID；仅打开编辑器不覆盖原草稿或创建额外习惯。任务与习惯共用 `PrioritySelect`，收起为 48×40px 居中彩色／轮廓旗帜，无文字、无 chevron；选项仍为 136px 相邻窗口与完整四项名称。删除任务弹窗局部 40px 宽度覆盖，保留原值、无障碍含义及保存规则。视觉主说明见 [C70](../Design.md#习惯编辑的共用选择c70)。

`SingleLineInput` 负责触控外框与原生文字行分离：常规框 44px、日程紧凑框 40px，内部 24px 高／行高、16px 字、零 margin／padding／边框，几何在组件内保护。`CustomChoiceRow` 和 `ScheduleNumberInput` 共用此基础实现，习惯专注、餐食花费／准备分钟与年月／时间／提醒／重复随之接入；页面只调外框宽度及所在行布局。修正原因见 T26，通用规则见 [C71](../Design.md#单行输入垂直对齐c71)，不代表全部旧输入已迁移。

`scripts/check-habit-editor-fields.cjs` 在习惯页及领域详情的真实编辑器量领域全宽／图标／箭头、优先度 48×40px／旗帜对称，以及内部文字行相对框体的中心。保留原输入，检查默认、0／5／25／120／空值提示、输入后与聚焦失焦，验证点击框边可聚焦，再恢复原值继续保存回归。`check-button-context.cjs` 的隔离控件检查两种尺寸在禁用时仍居中、完整框不能聚焦，并验证调用方的旧高度／padding／行高不能覆盖内部几何。优先度测量先等相邻窗口定位完成，保留原文字、宽度和右侧留白断言；旧 `.todo-priority.is-active` 的业务断言改为共用按钮的当前无障碍值，不删选中优先度检查。

本轮 `typecheck`、习惯编辑／专注、领域模型、进展草稿和共用标签逻辑检查通过；`--daily`、`--domains`、`--entry-creation`、`--todos`、`--meals`、`--sheet-footers`、`--toolbars` 七套通过 360×844／375×667／430×844／768×1024 浏览器适配回归。保留原编辑 ID／打卡历史／保存重开、领域关联／账号隔离、任务日程／下一步、餐单自定义数值及 34px 模拟安全区检查；禁用与样式干扰检查在隔离控件执行。375／768 习惯表单及 375 任务／习惯优先度窗口截图已目视。输出 `miniprogram/test-results/ui-preview-habit-fields-final-{daily,domains,entry,todos,meals,footers}` 和 `ui-preview-habit-fields-input-disabled`，日志为对应 `habit-fields-*.log`。

最终 `build:weapp` 通过，主包 **1,469,023 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/habit-fields-build.log`。未运行无关全量 `verify`，微信开发者工具、真机字形／光标／键盘未实测。本轮仅修改小程序及规则文档。

## 习惯编辑删除入口（C72）

2026-10-06 习惯页 `PageToolbar` 移除顶部管理入口及不再使用的 `PageJump` 导入，保留排序／筛选／创建和原下页完整列表、历史、暂停／启用功能。共享 `HabitEditor` 在已有 ID 时显示左侧危险意图「删除」、右侧主操作「保存」，两项共用 large／fill、至少 48px 并等分宽度；新建仍只有创建提交。底栏沿用 `SheetActions` 与 C29 安全区，习惯页和领域详情共用同一按钮。原下页同一删除操作的文案由「移除」统一为「删除」。设计主说明见 [C72](../Design.md#习惯编辑删除入口c72)。

两处复用 `lib/habit-delete.ts` 的确认流程及 `habit-edit.ts` 的按 ID 清理，沿用 `cleanState` 删除对应习惯的打卡、归档与一句话记录，其他习惯最新状态保留。取消确认不提交未保存标题／备注；确认与落盘均核对账号、编辑对象及页面上下文，晚到的确认不能跨账号或导航继续删除。保存／删除共用互斥锁；本机 `volatile` 保留编辑器和原 ID，重试不因内存中已删除而跳过写入，只有持久化后关闭并提示成功。习惯页原可选打开日志清理继续沿用，不新增业务存储。

`check-habit-edit.cjs` 增加删除单 ID、相关历史清理、其他记录保留、不变性及幂等重试；`check-habit-delete.cjs` 覆盖取消、确认失败、迟到上下文、确认期间新增记录和未落盘同 ID 重试，并接入 `test:daily`。两套页面流程增加隔离 `check-habit-delete-ui.cjs`：真实编辑器的删除／保存节点顺序、同宽／至少 48px／完整可见，取消与确认失败保留输入，模拟写失败保持持久存档，恢复后删除同 ID、重开及另一页面同源。该场景显式恢复对应验收视口，避免继承领域流程额外 1280px 检查的宽度。旧保存操作选择器改为主提交，保留原保存业务断言；功能栏测试改从原「进入第二页」按钮检查往返，直接断言习惯栏只有排序／筛选／创建。

实际验证：`typecheck`、习惯编辑／删除逻辑、共享状态层与相关脚本语法检查通过；`--daily`、`--domains`、`--toolbars`、`--sheet-footers`、`--icons` 五套通过 360×844／375×667／430×844／768×1024 浏览器适配回归，保留原打卡／拖动排序／编辑重开、领域关联／账号隔离、导航往返、图标选择及模拟 34px 安全区检查。375 习惯编辑和 768 领域习惯编辑截图已目视；输出 `miniprogram/test-results/ui-preview-habit-delete-final-{daily,domains,toolbars,footers,icons}`，日志为对应 `habit-delete-final-*.log`。取消、写失败及删除回归只使用隔离 fixture；未操作真实账号或日常数据库。

最终 `build:weapp` 通过，主包 **1,470,762 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/habit-delete-build.log`。未运行无关全量 `verify`，微信开发者工具和真机确认交互未实测。本轮仅修改小程序及规则文档。

## 创建类型的进展文案（C73）

2026-10-06 共用 `EntryComposer` 的进展类型标题改为「进展」，相应无障碍名称同步，三个类型显示「任务／备忘录／进展」。页面操作「记录进展」及提交「保存记录」沿用原文案，模式值、字段、草稿和保存规则不变；既有创建回归选择器同步使用新标题。

`test:entry-creation` 的进展草稿、共用标签及 360×844／375×667／430×844／768×1024 浏览器适配回归通过；`typecheck`、`build:weapp`、17 页启动及原包体预算通过，主包 **1,470,750 字节**。日志为 `miniprogram/test-results/progress-title-{entry,build}.log`，截图位于 `ui-preview-progress-title`；微信环境未实测。

## 待办顶部入口与筛选状态（C74）

2026-10-06 待办 `PageToolbar` 仅保留筛选／创建，删除排序与状态分类行，完成状态继续使用原筛选小窗。移除本页 `timeOrder` 临时切换及局部排序／状态栏旧样式；原任务数组和 `moveTodo` 拖动保存保留，未修改数据结构或存储。界面规范见 [C74](../Design.md#待办顶部入口与筛选状态c74)。

新增 `FilterSymbol` 的 20px 漏斗图形；入口复用 compact `ChoiceButton iconOnly` 和共享选中色。`ChoicePopover` 增加可选 `triggerSelected`，默认仍沿用打开态，待办显式传入关键词 trim 后非空／标签非 null／非全部状态的合并条件；`aria-pressed` 与 `aria-expanded` 分别对应筛选和展开，无文字或箭头。小窗原相邻定位、关键词／状态／标签、查看数量及清除保留。

既有待办流程通过筛选小窗选择完成状态；布局回归核对筛选／创建两个入口、无状态行、顶部 12px 留白和四区可见。`check-product-improvements.cjs` 验证三类条件各自生效、空白关键词、关闭后高亮、清除恢复及 40px 框／20px 图形居中，保留原拖动顺序、取消、长列表边缘滚动、跨区与导航释放原生滚动锁；在 `--todos` 中使用 `tasksOnly` 运行相关部分，默认综合模式的原统计与习惯断言保留。

无关的既有失败：综合 `--improvements` 在 360px 的习惯图标检查失败，C54 有氧运动使用已加载的 `/assets/icons/run.png`，旧断言仍要求每个图标都来自 `/assets/habits/`。本轮未修改习惯组件或该断言，不能将综合套件报告为通过。

实际验证：`--todos` 与 `test:toolbars` 两套通过 360×844／375×667／430×844／768×1024 浏览器适配回归；任务表单、完成状态筛选、清除／关闭高亮、条件组合、原保存重开、任务链、提醒守卫、拖动／滚动及往返布局检查保留。`check-todos.cjs`、相关脚本语法、`typecheck` 和 `git diff --check` 通过。375 默认待办与 360／768 筛选高亮截图已目视；输出 `miniprogram/test-results/ui-preview-todo-filter-{workflow,toolbars}`，日志 `todo-filter-{workflow,toolbars,improvements}.log`。

最终 `build:weapp` 通过，主包 **1,467,310 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `miniprogram/test-results/todo-filter-build.log`。未运行无关全量 `verify`，微信开发者工具及真机未实测；本轮仅修改小程序及规则文档。

## 窗口外部关闭（C75）

2026-10-06 `SheetBackdrop` 提供独立外部点击区域、停止传播及 `catchMove`，共用习惯编辑器、习惯页详情与打卡一句话接入；面板按原位置层叠，内部点击不触发遮罩，保存／打卡／一句话写入沿用原忙碌守卫。领域习惯详情原遮罩继续复用，图标库和 `ChoicePopover` 嵌套窗仅关闭自身。源码核对统一创建、任务／便签编辑、领域／目标、筛选／选项、专注设置／来源选择、快捷方式、格言、餐食及选境自定义窗口已有外部关闭处理；保留原业务回调，不重写系统授权或重要操作确认。通用交互主说明见 [C75](../Design.md#窗口外部关闭c75)。

原任务／便签编辑的遮罩改为直接收起，不触发普通离开确认。当前页面以按对象 ID 的内存 Map 保留输入及来源账号，重开同对象恢复；账号变化清空 Map，恢复仍核对账号和原对象。共享 `resumeEditorInput` 只回填草稿相对关闭时正式记录确实改变的字段，未编辑字段来自最新对象，独立标签文本按相同规则恢复。不修改正式记录、ID、图片字节或存储键；此会话恢复不包含页面卸载后的本机持久草稿，P08 全局状态保留。

短屏习惯详情原来铺满整个可用视口，单补遮罩仍没有外部可点区域。两处详情高度改为 `min(620PX,calc(100% - 12PX))`，共用编辑器上限同时保留 12px；日历正文去除上下各 4px padding，日历上距由 6px 收到 2px，对应最小高度由 372px 收到 368px。日期格仍至少 30px、日历操作至少 40px，完整四项统计、42 格、图例及日志／专注保持可见。最终间距在两处详情、60 字标题／240 字备注、25 分钟专注及模拟 34px 安全区下通过严格无默认滚动／无遮挡检查，未裁切或降低断言。

实际验证：`typecheck`、`check-todos.cjs` 及相关脚本语法检查通过；`--daily`、`--domains`、`--todos`、`--memos`、`--sheet-footers` 五套四尺寸浏览器适配回归通过。真实窗口检查内部点击不关闭、外部关闭且不保存／删除／撤销、图标／优先度只收起最上层及展开状态复原；任务／便签模拟原生确认失败后外部仍直接收起，重开保留输入，原图片和编辑保存回归继续。恢复逻辑检查最新完成状态／未编辑字段、可选字段移除、标签与不变性。尺寸为 360×844／375×667／430×844／768×1024，最终间距另由底栏套件覆盖两处详情及非零安全区；375 长标题习惯详情与 768 领域习惯详情截图已目视。

输出 `miniprogram/test-results/ui-preview-outside-close-final-{daily,domains,footers}` 及 `ui-preview-outside-close-{todos,memos}`，对应日志 `outside-close-final-{daily,domains,sheet-footers}.log`／`outside-close-{todos,memos}.log`。最终 `build:weapp` 通过，主包 **1,468,800 字节**，17 页（5 主包、12 分包）启动、依赖边界及原主包 <1.5 MB 预算通过；日志 `outside-close-final-build.log`。未运行无关全量 `verify`，微信开发者工具与真机未实测；本轮仅修改小程序及规则文档。

## 分类栏紧凑尺寸（C76）

2026-10-06 根据用户截图要求缩小分类行，共用 `ChoiceButton variant='category'` 使用分类专用 `--category-font-size: 13PX`，内距为上下 6px／左右 8px；`CategoryRow` 默认行下间距为 6px，触控下限仍为 40px。习惯、便签、文章、饮食、专注、统计及既有分类选择窗同步生效，页面不增加独立外观覆盖；普通动作／选项、选中色、分类间距与筛选／禁用逻辑沿用原规范。主说明见 [C53／C76](../Design.md#通用分类栏c53)。

初次功能栏检查发现 375px 便签末项在最大滚动位置右侧超出约 0.08px：文字的小数宽度与整数滚动范围产生尾部裁切。内容行右侧增加 1px 滚动余量，保留原末项完全可见断言，未降低文字完整性、触控或选中状态检查。既有分类外观断言更新为 13px 及新内距，普通按钮原字号断言保留；未新增镜像实现的测试套件。

实际验证：`typecheck`、相关脚本语法及 `git diff --check` 通过；`test:toolbars` 在 360×844／375×667／430×844／768×1024 通过十页功能栏、分类选中前后、长名称、下页及三个选择弹层、末项滑动可达、悬停／按下与禁用检查。375px 习惯分类截图已目视。输出 `miniprogram/test-results/ui-preview-category-compact-final-toolbars`，日志 `category-compact-final-toolbars.log`。最终 `build:weapp` 通过，主包 **1,468,886 字节**，17 页启动、依赖边界及原主包 <1.5 MB 预算通过，日志 `category-compact-final-build.log`。微信开发者工具及真机未实测；仅修改小程序共用样式与规范文档。

## 便签编辑工具与设置分隔（C77）

2026-10-06 在 `MemoEditorFields` 共用设置行增加 `border-top: 1PX solid #3b4b56` 与 12px 顶部内距，使书写／预览及已有图片与颜色／置顶一行通过单条细线区分。统一创建与原便签编辑同步生效；任务及进展 Markdown 编辑器保持各自原分组。仅改共用便签样式，字段顺序、按钮、草稿与保存逻辑沿用原实现；主说明见 [C45／C77](../Design.md#备忘录标签位置c45)。

实际验证：`typecheck`、`git diff --check`、完整 `test:entry-creation` 和 `--memos` 通过，后两套覆盖 360×844／375×667／430×844／768×1024 的默认表单完整可见、原编辑保存、颜色、书写／预览、图片、标签及草稿恢复；未新增低影响样式的专用测试。375px 创建及带图片的便签编辑截图已目视分隔线位置。截图输出 `miniprogram/test-results/ui-preview-memo-divider-{entry,memos}`，日志 `memo-divider-{entry,memos}.log`。

最终 `build:weapp` 通过，主包 **1,468,932 字节**，17 页启动、依赖边界及原主包 <1.5 MB 预算通过，日志 `memo-divider-build.log`。微信开发者工具及真机未实测；仅修改小程序及相关规则文档。

## 便签标签上方分隔（C78）

2026-10-06 共用 `MemoEditorFields` 的标签区增加上边线，与 C77 设置行共用同一条样式：1px、`#3b4b56`，顶部内距 12px。创建和原便签编辑一致，设置行下间距保留，各边界仅一条线；标签选项、浮窗及存储逻辑沿用原实现。主说明见 [C45／C77／C78](../Design.md#备忘录标签位置c45)。

实际验证：`typecheck`、`git diff --check`、完整 `test:entry-creation` 和 `--memos` 通过；两套浏览器检查覆盖 360×844／375×667／430×844／768×1024 的默认表单完整显示、创建／编辑、标签、颜色、图片、类型切换和草稿恢复。375px 创建截图已目视标签上方分隔线、间距及底部提交，未新增低影响样式的专用测试。输出 `miniprogram/test-results/ui-preview-memo-tag-divider-{entry,memos}`，日志 `memo-tag-divider-{entry,memos}.log`。最终 `build:weapp` 通过，主包 **1,469,011 字节**，17 页启动、依赖边界及原主包 <1.5 MB 预算通过，日志 `memo-tag-divider-build.log`。微信开发者工具及真机未实测；仅修改小程序及相关规范文档。

## 象限创建的优先度（C79）

2026-10-06 修复四象限新建恢复旧草稿时忽略入口优先度的问题：原入口 `createTodo(q.id)` 已正确，但 `EntryComposer` 恢复分支完全采用旧草稿，未使用本次入口。待办创建状态现在一并保存任务模板与可选象限 ID，普通创建不传象限；共用创建在当前账号草稿恢复和类型转换后调用 `applyEntryQuadrant`，只更新任务重要／紧急标记及共用便签优先度。原 ID、标题、正文、图片、日程、下一步、标签及进展草稿保留，打开后的手动选择不被重新应用入口覆盖。`pendingSave` 草稿保留原类型及优先度，同 ID 重试；不改业务存储结构或键。主说明见 [C47／C79](../Design.md#新建默认优先度c47)。

相关检查新增有旧草稿的真实入口场景，覆盖高／中／低／无四区：先从普通入口留下不同优先度的便签模式草稿，再由象限创建，确认对应默认值、内容与原 ID、关闭重开、打开后手动改值及切换类型，最终保存到对应象限。360px 另覆盖本机保存失败后从高区重开无优先度的待重试任务，保持原值和类型并只保存一次。逻辑检查冻结输入，验证所有非优先度字段、图片与日期保留、普通入口不覆盖、手动类型切换及三种待重试类型；原账号隔离、草稿和任务流程断言保留。

实际验证：`typecheck`、`check-todos.cjs`、相关脚本语法及 `git diff --check` 通过；完整 `test:entry-creation` 和 `--todos` 两套在 360×844／375×667／430×844／768×1024 通过。待办同时覆盖原保存／编辑、日程、提醒、任务链、筛选、拖动及往返；375px 高区恢复截图已目视。输出 `miniprogram/test-results/ui-preview-quadrant-defaults-{entry,todos}`，日志 `quadrant-defaults-{entry,todos}.log`。最终 `build:weapp` 通过，主包 **1,469,431 字节**，17 页启动、依赖边界及原主包 <1.5 MB 预算通过，日志 `quadrant-defaults-build.log`。微信开发者工具及真机未实测；仅修改小程序及相关规范文档。

## 番茄钟独立选择与操作位置（C80／C81）

2026-10-06 来源选择迁入 `ChoicePopover`，输入框右侧仅保留上下 chevron，独立浮窗紧邻 8px，选择或外部关闭恢复箭头；不增加页面按钮或挤动开始区。「时间结束后」移除普通 Picker，复用 `SingleChoiceField` 独立小窗。待办选择复用 `todoQuadrants`／`todoQuadrant` 与 `CategoryRow` 显示高／中／低／无，按当前关联或最高非空优先度定位，保留四项、标题搜索和当前分类的去重最近记录；原分类数据与任务不变。

核心操作区使用共享尺寸变量分配「节奏图标／开始暂停继续／重置图标」及固定的下一行结束位，节奏入口移到主按钮左边。下一行未开始或运行时是不可点击空位，暂停时显示同宽同高的「结束」；状态提示和休息时的事项区域保留布局空间，避免改变主操作位置。计时图形只在初始化、账号与视口变化时测量，按钮状态不触发缩放。重置直接清空当前 active，不生成记录；暂停后结束直接调用原 `finishTimer`，保留实际时长、原 ID 与提醒取消守卫，运行时不能提前结束。

`TomatoClock` 的时间为专用可触控数字按钮，未开始时打开居中的本次时长窗口，运行及暂停禁用。`startTimer` 可接收有界整数分钟覆盖，仅写原 active 的总秒数、剩余和截止时间，不改变常规 settings、存储格式或键；旧调用无参数时行为不变，已有 active 不重写。本次覆盖按当前账号／模式保留在页面会话，开始后清除；常规节奏与新窗口数字使用 `SingleLineInput`，底栏复用 `SheetActions`。设置草稿标记账号，账号变化后不可继续保存旧草稿。普通计时反馈保留在应用内，不调用系统 Toast／Modal；历史原生日期能力与微信平台订阅授权保留。

记录删除改为应用内确认，外部关闭和取消不改变记录；确认按原账号与记录 ID 删除，保存忙碌时不可关闭。共用更新返回后检查 `hasVolatilePersonalTool`，本机未落盘不报成功，确认窗及原 ID 保留以重试；沿用原工具串行状态层，没有新增数据缓存。系统窗口及位置原则主说明见 [C80／C81](../Design.md#番茄钟独立选择与操作c80)。

实际验证：`typecheck`、`check-habits-focus.cjs`、`check-pomodoro-reminders.cjs`、`check-pomodoro-cross-client.cjs`、相关脚本语法及 `git diff --check` 通过。`--pomodoro`、`test:toolbars`、`test:home-navigation` 三套浏览器回归在 360×844／375×667／430×844／768×1024 通过，覆盖独立窗口 8px 定位、纯图标入口、四优先度筛选、搜索／最近／关联、时间无效输入与取消、本次覆盖、已开始禁改、实际按钮边界不变及结束位同尺寸、34px 模拟安全区、暂停时长排除、自动短／长休息、原截止时间恢复、删除取消／外部关闭／本机失败同 ID 重试、账号隔离与微信提醒授权／拒绝／部分授权及取消。将模拟系统 Modal 设为不可用后结束／重置／删除仍通过，普通路径的调用列表为空；未调用真实账号或日常数据库。

375px 暂停、来源及节奏窗口截图已目视。最终截图输出 `miniprogram/test-results/ui-preview-pomodoro-controls-final`，功能栏与往返输出 `ui-preview-pomodoro-toolbars`／`ui-preview-pomodoro-navigation`，日志 `pomodoro-controls-final-ui.log`／`pomodoro-toolbars.log`／`pomodoro-navigation.log`。`build:weapp` 通过，主包 **1,469,500 字节**、专注分包 **68,847 字节**，17 页启动、依赖边界、项目转换配置及原主包 <1.5 MB 预算通过，日志 `pomodoro-controls-build.log`。未运行无关全量 `verify`；微信开发者工具、原生键盘和真机未实测。本轮仅修改小程序及规则文档，未部署。
