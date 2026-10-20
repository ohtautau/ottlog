# 小程序可复用组件架构

按 [C154](../Design.md#可复用组件架构c154)，多处共用的UI由同一基础组件拥有结构、样式和通用交互。页面提供数据、状态与业务回调；共享组件的修改作用于全部调用处。优先扩展已有组件，只有真实的重复或场景差异才增加抽象与变体。

## 六类自动统计与图表（C299）

statistics-insight-model拥有指标／图表／点位的共享类型及本地日窗口、前等长比较；三组纯统计模块分别读取任务专注、习惯领域及饮食成长原存档，StatisticsInsights统一拥有期间控件、图例／单位／刻度、可点选日柱／分布条、指标及客观发现。统计页面按原就绪／同owner／格式校验提供数据和期间，ActivityAnalysis可读取同一期间；不复制页面图表或写入新统计状态，原历史／月历／授权组件保持，见[C299](../Design.md#六类统计图表与自动分析c299)。

## 首页格言正文与侧栏（C298）

MottoBanner组合左侧正文及右侧today-quote-side内的共用ActionButton／EditSymbol和原计数，局部共享CSS拥有4px垂直间距与居中序号、15px／23px两行正文；宽屏仍16px／24px。首页只提供原默认格言和可见／编辑状态，不复制排版或修改轮播数据逻辑，见[C298](../Design.md#首页格言正文与侧栏排版c298)。

## 习惯详情紧凑备注与日志视窗（C297）

HabitNoteField的只读变体拥有44px最小高及6px上下／12px左右内距，编辑Textarea保持；HabitCalendar.detail组合60px内部ScrollView和原日志节点，标题下距4px、日期正文14px／星期12px，page仍自然列表。同一组件拥有月份／习惯变化时滚动起点，详情两个宿主不复制布局或日志状态；全文、原十条／更多、业务计算与账号队列保持，见[C297](../Design.md#习惯详情备注缩小与单条日志视窗c297)。

## 习惯日历移除底部图例（C296）

共用HabitCalendar删除legend／month-rate节点与专用样式，统计页删除对应字体选择器；两个详情宿主及只读统计同源，不以页面隐藏或占位实现。日期状态／统计和日志仍由原组件拥有，不改业务层，见[C296](../Design.md#习惯日历移除底部图例与月天数c296)。

## 领域详情目标按钮留白（C295）

详情页用局部domain-goal-edit的4px右外距拥有两目标编辑按钮左移，共用ActionButton／EditSymbol、C277垂直居中和40px最小触控不变；不复制按钮样式或改变其他宿主，见[C295](../Design.md#领域详情目标编辑按钮略向左移c295)。

## 任务排序入口高亮（C294）

任务页向共用SortPopover的selected传入展开状态或已应用模式不同于初始custom的结果；getTodoSortMode只读判定原存档，控件色彩／图标／尺寸仍由原共享组件拥有。候选sortChoice不参与关闭后的高亮，不复制页面CSS或改变其他排序入口，见[C294](../Design.md#任务排序入口保持已应用高亮c294)。

## 专注来源紧凑宽度（C293）

Pomodoro继续复用ChoicePopover的panelWidth与既有定位，来源菜单宽度104px；局部focus-source-options的form-choice-content改为width:auto／居中，ChoiceButton仍拥有字体／内距／触控和选中反馈。原图标名称结构及来源回调不改，不新建菜单组件或复制定位，见[C293](../Design.md#专注事项来源浮窗左右留白统一c293)。

## 习惯时段五按钮（C292）

HabitEditor在原daily-editor-settings组合daily-time-period-field五列等宽网格及共用ChoiceButton，尺寸／字色／选中仍由基础按钮拥有；网格仅负责6px间距与整行宽度。原habitTimePeriods／habitTimePeriodLabels／habitTimePeriod及onChange同源，删除SingleChoiceField依赖和专用下拉，不复制页面节点，见[C292](../Design.md#习惯时段设置一行五按钮c292)。

## 工具栏恢复默认（C291）

PageToolbar.reset首位插槽与ToolbarResetButton统一40px／ResetSymbol及6px动作间距，七处复用；首页全部功能在MoreSection.actions复用page-toolbar-actions组合，无独立图标或尺寸样式。页面只提供恢复回调和禁用条件：任务applySort接受显式TodoSortMode且pending包含custom、习惯沿persistSort，其余沿既有会话条件／浏览模式。失败目标与真实持久化由原队列拥有，不在基础组件推断排序或清业务内容，见[C291](../Design.md#排序筛选左侧一键恢复默认c291)。

## 便签卡阅读按压反馈（C290）

便签页memo-note-open原生Button通过hoverClass='none'关闭默认点击底色，局部active透明／filter:none省去半透明与全局变亮区域；仅该内容入口例外，不修改共享ActionButton／ChoiceButton或键盘focus-visible。原卡片组合、40px最小触控和setViewed身份导航保持，无新增组件或存档，见[C290](../Design.md#便签卡点击不显示半透明区域c290)。

## 阅读内优先度独立浮层（C289）

ChoicePopover新增triggerId／renderLayer／layerClassName可选适配，缺省原行为；triggerId＋renderLayer=false只拥有按钮，既有anchorId实例在独立出口拥有测量、浮窗栈、隐藏键盘与最上层关闭。PrioritySelect透传这些参数及anchorId，MemoReader复用同一priorityProps在实体行和阅读同级出口组合，专用层250高于阅读240且低于图库260。无页面复制选择／定位或改其他宿主，见[C289](../Design.md#便签内容优先度浮窗脱离阅读滚动区c289)。

## 便签编辑返回阅读（C288）

便签页面save在原队列完成和owner／draft ID／volatile校验后清编辑草稿，并设置原viewed身份；readNote继续从最新state按ID查找，复用同一MemoReader。saveAndClose只调用同一保存器，失败不切换，不缓存旧草稿为阅读副本或新增导航存储，见[C288](../Design.md#编辑便签保存后返回内容c288)。

## 图标搜索关键词（C287）

iconLibrary拥有全部64项中英文keywords，findLibraryIcons沿原名称／分类／关键词／id的大小写不敏感子串过滤；所有IconLibrarySheet（含ShortcutIconPicker）宿主共用，无新增别名映射或页面检索。关键词不参与LibraryIcon渲染、选项文字、图片生成或业务存档，原显示与顺序保持，见[C287](../Design.md#图标补充中英文搜索关键词c287)。

## 便签背景显色（C286）

仅调整memoColors的六色surface，原memoColorStyle继续为列表／MemoFieldsLayout／EntryPreview提供共用背景变量，六色仍为不透明色值；页面不复制映射或整卡opacity。列表日期／标签文字沿原节点提亮，无布局、控件或数据变更，见[C286](../Design.md#便签背景显色增强c286)。

## 已有任务默认预览（C285）

MarkdownNoteEditor提供可选defaultPreview（缺省false），模式初始化及owner／recordId／format／默认值变化时从该值重置；TodoEditorFields透传，由任务宿主仅为已有任务开启。仍复用原Markdown渲染与图片预览／书写控件，不复制阅读窗或新增数据字段，见[C285](../Design.md#点击已有任务默认预览备注c285)。

## 日期窗口清除底栏（C284）

TodoScheduleSheet使用SheetActions.leading组合普通意图ResetSymbol／40px ActionButton与48px伸缩确认，共享底栏拥有8px间距、上下居中及安全区；移除原todo-schedule-footer重复尺寸与文字次按钮样式。创建／编辑同源，原clear、confirm与保存守卫保持，见[C284](../Design.md#待办日期清除改为左侧符号按钮c284)。

## 提醒设置分区（C283）

TodoScheduleSheet使用EditorFieldsLayout和FilterFieldHeading组合提醒时间／日期／实际结果，日期选项直接调用原setReminderChoice，无新日历、存储或重复计算器。快捷时刻预览只读调用relativeReminder，错误不阻断渲染；自定义时刻仍从独立同级ChoicePopover调用原completeTime及关闭守卫。删除日期子层及双下拉专用CSS，实际预览复用原已应用草稿值，见[C283](../Design.md#待办提醒设置分区与减少层级c283)。

## 自定义重复单位（C282）

TodoScheduleSheet在NumericInputRow中组合每／ScheduleNumberInput／SingleChoiceField，单位选框沿共享ChoicePopover／单选及子层关闭，不复制单位按钮网格或定位。回调继续用repeatWithAnchor且只更新原unit及interval，原校验和保存仍归宿主，见[C282](../Design.md#自定义重复单位使用选择框c282)。

## 日历年月导航（C281）

CalendarMonthNavigation统一拥有左侧年月选择及右侧‹／○／›、ChoicePopover／NumericInputRow／ScheduleNumberInput和useEditorCloseGuard；ScheduleCalendar与HabitCalendar只提供month／onMonthChange、currentMonth及minMonth／maxMonth、原操作名称和外距。移除原重复导航及习惯居中月份／条件文字回本月CSS。习惯三宿主及待办同源，日期格、业务选择及日志仍在原日历组件，浏览不写存档，见[C281](../Design.md#习惯日历统一年月导航c281)。

## 数字浮窗组合行（C280）

NumericInputRow由single-line-input导出，只组合children及className，拥有居中flex／8px间距／单位不压缩；SingleLineInput继续拥有原96×40px数字框及原生居中行。日程年月／时间／提醒／重复、格言秒数及本次分钟使用同一行，清理局部重复样式；原数据、校验及保存仍归各宿主。选项／普通文本浮窗和多字段编辑表单按各自结构保持，见[C280](../Design.md#数字设置浮窗统一居中c280)。

## 优先度浮窗对称留白（C279）

PriorityOptions共用选项CSS把旗帜与文字一组居中，保留12px图文间距，保证图标前和文字后留白相同。PrioritySelect各宿主直接同步，136px定位／40px选项／颜色及业务回调保持，页面不复制样式。见[C279](../Design.md#优先度浮窗左右留白对称c279)。

## 领域习惯纵向网格（C278）

领域详情用同一个HabitGrid组合全部HabitCard及末尾CardCreateButton，不再切四格数组；宿主为独立scrollY窗口，账号／领域键重置。HabitCard把原最小高度公式提升为共享--habit-card-min-height变量，卡片与视口读取同源值，其他卡片宿主原尺寸保持。行距仍沿--habit-grid-row-gap，网格隐式等高行确保添加卡与习惯卡一致；旧横向分页及吸附CSS删除。见[C278](../Design.md#领域每日习惯改为纵向滚动c278)。

## 领域记录自然高度（C276）

DomainRecordCard的共用CSS明确min-height:0覆盖全局button下限，保留原上下2px内距；DomainRecordContent的普通Text按pre-wrap／原行高及可用宽度自然撑高。领域最近记录和详情同步，不由页面复制高度样式；旧图片、正负栏滚动及原编辑回调不改。见[C276](../Design.md#领域记录按实际行数展示c276)。

## 习惯卡信息精简（C270）

HabitCard只组合图标打卡入口、名称／详情入口、HabitProgress及优先度角标，不再有metadata／recency附属行或Props；直接删除时段及最近打卡展示依赖和样式，全部宿主同源，不由页面隐藏或补空位。HabitEditor及分区／筛选仍读取原habitTimePeriod，状态层保留原历史／推荐／排序计算；卡片原触控和完成态保持。见[C270](../Design.md#习惯卡移除时段与最近打卡行c270)。

## 创建与编辑字段布局（C269）

直接子字段防压缩规则使用明确的view／text／button／input／textarea／scroll-view选择器，不用WXSS拒绝的通配符；新增其他根节点类型时在此共享规则补齐，不由页面复制。源码／产物选择器守卫及原生错误证据见[T30](development.md#wxss-通配符编译失败t30)。

EditorFieldsLayout拥有纵向flex、相邻字段gap和topSpace首行留白，8px来自app.css的--editor-field-gap；分段线内距复用--editor-section-inset:12px。TodoEditorFields、MemoFieldsLayout、ProgressEditorFields与HabitEditor实际组合此布局，嵌套ProgressRecordField／MarkdownNoteEditor关闭首行留白，正文与工具／图片仍沿同一gap。EntryPreview、MemoReader与原记录／领域／目标／快捷方式等编辑器复用，不增加草稿或业务状态。页面保留横向内距与滚动宿主，字段不重复声明上下margin，不依视口覆盖8px；标题栏／标签／筛选／底栏仍由原组件拥有。见[C269](../Design.md#创建与同类编辑字段间距统一c269)。

## 全部功能三组与最近入口（C268）

homeFeatureGroups拥有5／8／3三个分组，readingKeys仅控制文章分类／收藏／个人空间的归组，定义及身份仍来自同一目录；HomeFeatureList／选择替换直接复用，原18个兼容身份与16个可见入口保持。HomeFeatureOrder按新组投影旧keys、保持组内顺序且不写入，moveHomeFeature原泛化分组守卫继续适用。today-recent节点只在首页标题之后组合，16px下距归页面，不扩展共享MoreSection或另造最近操作状态，原业务保持。见[C268](../Design.md#全部功能分组与最近操作位置c268)。

## 功能界面装饰箭头（C267）

HomeFeatureList的navigation页面项用无文字View组合CSS斜线／箭头头部，形状／12×20px／灰蓝色由组件拥有，脱离Unicode字体／emoji转换；selection仍显示rank。名称flex:1、箭头flex:none，删除page-sections旧直接子view通用伸缩，页面不复制样式；装饰不拦截整行事件，原标签／排序及回调保持。见[C267](../Design.md#功能界面导航箭头稳定显示c267)。

## 食选功能移除与旧快捷卡兼容（C266）

homeFeatureCatalog仍是首页导航和HomeFeatureList选择／替换的唯一功能来源，现有18个兼容身份、16个显示入口；eat不在目录／类型中。home-shortcuts的retiredFoodShortcut只为识别未自定义旧默认，StoredShortcut在读取阶段容纳旧身份，返回HomeShortcuts前排除它；保留历史有效19序号上限及其他卡外观，不写入投影。食选页与独有模块删除，最近活动不再读取dining，保留归档键仅供旧数据兼容；饮食／选境共用组件及图标仍使用原实现。见[C266](../Design.md#移除今日食选c266)。

## 固定领域页与卡片视口（C265）

PageScroll的scrollY可选参数缺省true，false关闭外层ScrollView纵向滚动及吸附手势，保留原上下文和提示宿主。领域页组合固定domains-index与独立domain-entry-scroll，原首八／续接网格同属该视口，不复制卡片或数据；卡高沿原C176、短屏只缩小可视区。最近记录组件继续拥有C252正／负ScrollView，三个内容区互不联动；卡片视口用cards:owner独立键，避免与最近记录键冲突并在账号变化时重置。安全区归页框，续接6px与末尾4px由列表拥有，业务回调保持，见[C265](../Design.md#领域页固定与卡片独立滚动c265)。

## 单行输入文字内距（C264）

SingleLineField拥有12px左右内距，SingleLineInput原生文字行维持零内距、24px高度；提示词及实际文字同源，避免叠加内距。FilterSearch只组合输入和trailing清空符号，任务／习惯／便签不写padding；其他单行输入同步，与现有标签／普通备注框12px内距一致。原regular／compact高度及数字96×40px、居中行为保持，见[C264](../Design.md#筛选输入文字内距统一c264)。

## 习惯自动排序选项（C263）

习惯页只组合SortPopover／SortOptions的五项自动排序与SortDirection，删除独立自定义选项及分隔线，不新增共享组件或页面样式。窗口sortInitialChoice将缺省及旧custom投影为优先度降序，仅用于草稿初始化和未保存判定；真实列表沿orderedHabits，长按仍沿saveHabitOrder及原队列。入口高亮依据已应用自动排序，未确认草稿和手动顺序均不额外高亮。见[C263](../Design.md#习惯移除自定义排序选项c263)。

## 习惯默认时段（C262）

habit-metadata提供currentHabitTimePeriod，以设备本地小时和11／13／18边界返回原morning／noon／afternoon／night。习惯页在初始化、useDidShow及账号变化调用同一函数设置activePeriod，原分钟时钟只刷新统计，不覆盖手动选择。HabitListSection／CategoryRow及习惯时段推断／存储不变，没有新增会话持久化。见[C262](../Design.md#习惯时段按当前时间默认c262)。

## 习惯详情即时选择（C261）

两个宿主组合HabitDetailHeader的可选onChange／disabled，复用DomainChoiceField、IconLibrarySheet及PrioritySelect；首行只拥有选择窗口状态，仍保留标题／备注阅读组件。useHabitDetailEdit拥有同账号／习惯ID的即时保存及绝对目标重试，原setValue由宿主提供；patchHabitDetails仅合并所选字段，避免完整编辑对文本／其他习惯的对齐或时段补写。保存目标与错误、busy／锁定由两个宿主同源接入底栏及日历守卫。见[C261](../Design.md#习惯详情领域图标与优先度修改c261)。

## 便签阅读即时选择（C260）

MemoReader组合原MemoIconPreview／IconLibrarySheet及PrioritySelect，页面提供图标／优先度回调、busy／失败目标与重试，组件只持有选择窗口状态。MemoFieldsLayout的settings成为可选插槽，未提供时不渲染空设置区；阅读不再组合颜色名称，创建／编辑／EntryPreview六色选择保持。保存由便签页原队列按最新记录合并所选字段，保留原ID及账号隔离，不复制存储或完整编辑流程。IconLibrarySheet开放className供阅读宿主组合260层，原其他宿主不变；ChoicePopover的Escape监听通过ref读取最新关闭回调，不改变原弹层栈顺序。见[C260](../Design.md#便签内容图标与优先度修改c260)。

## 提示窗口（C257）

AppDialog拥有确认／删除／未保存提示的居中表面、原生正文ScrollView测量、固定标题／底栏、关闭层级和共享error区域。EditorHeading的prompt变体拥有固定18px标题，默认editor变体保持原规范；SheetActions／ActionButton继续拥有操作和尺寸，AppDialog只配置8px间距及居中窗口安全区。AppDialogHost拥有当前页面的确认队列和短反馈，危险请求显式传intent='danger'，页面不复制提示样式。任务、习惯、便签、领域和计时记录删除确认复用同一组件，业务宿主保留ID、账号、busy／pending及失败重试。详见[提示窗口规范](prompt-windows.md)。

## 便签阅读配色与置顶（C256）

memoColors的surface统一为低饱和深色，memoColorStyle沿原三项变量组合列表及各正文宿主，value强调色和45%边框派生保持。列表仅拥有正文／辅助文字色，移除is-pinned外观类及左侧内阴影；业务pinned仍提供符号／文字／排序，不增加外观状态或写入。见[C256](../Design.md#便签阅读底色与置顶外观c256)。

## 便签置顶行分隔线（C255）

MemoPinRow复用memo-editor-fields.css拥有1px／#3b4b56上边线、12px线下内距；MemoFieldsLayout的pin插槽和EntryPreview继续组合同一节点，编辑与阅读宿主不复制分隔节点或样式。原右对齐／40px置顶按钮、颜色区及业务回调保持。见[C255](../Design.md#便签置顶行上方分隔线c255)。

## 创建与习惯详情字段间距（C254）

app.css拥有--editor-field-gap:8px，ProgressEditorFields的正文上距／领域下距及双记录间距读取同一变量。TodoEditorFields仅在EntryComposer宿主中使用该变量设置日期行上下留白，EntryPreview任务／进展首行同源。HabitCalendar共享详情布局统一正文及内容分区间距，两个宿主不复制样式；短屏只保留原日历装饰与视口适配，不覆盖字段间距。见[C254](../Design.md#创建任务与习惯详情间距统一c254)。

## 标题与记录尾部文本（C253）

trimTextEnd统一清理整个文本尾部的Unicode空白，EntityTitleText／EditorHeading、DomainRecordContent（纯文本及Markdown）、HabitNoteField只读变体及各复用卡片／统计文本使用同一规则；编辑输入保留原值。旧文字投影不写存储、不改ID与排序；便签两个保存宿主在原提交目标上清理body，其他已有trim保存流程保持。EntryPreview同源清理显示，原草稿仍保留输入与计数；见[C253](../Design.md#标题与记录末尾空白清理c253)。

## 记录双栏独立滚动（C252）

DomainRecordColumns／Column的scrollable组合拥有同高双栏、各自ScrollView、边界隔离及4px末尾留白；默认不滚动调用保持。最近记录只提供原合计最新十条数据和编辑回调，领域详情只提供完整历史和原空白创建回调，共享正文／符号／颜色／图片及事件隔离保持。详情页面负责可用视口与卡片flex剩余空间，短屏只调整该场景布局，不复制记录或习惯控件。见[C252](../Design.md#领域详情固定与记录双栏独立滚动c252)。

## 专注来源菜单与浮窗方向（C251）

ChoicePopover拥有可选preferredSide及空间不足时的原方向回退，默认auto不改变已有调用意图；向上按layer／anchor坐标设置bottom并清除top，使真实面板底边锚定8px。Pomodoro只组合above／tight／156px、原ChoiceButton与form-choice图标名称结构，菜单布局拥有单列／4px行距及局部共享颜色变量，基础浮窗表面和按钮字号／触控不复制。见[C251](../Design.md#专注事项来源浮窗优化c251)。

## 番茄钟领域选择复用（C250）

Pomodoro在状态行下组合原DomainChoiceField，与ProgressEditorFields及HabitEditor共用SingleChoiceField、图标、满宽按钮及单选浮窗，不复制选择器样式。focus-domain-row仅拥有8px上距与不伸缩整行；番茄舞台按当前选中名称和领域来源重新测量，长名称换行由基础字段处理。页面从原domains状态层读取同账号有效数据，selection／session的可选domainId与原pomodoro队列保存，事项关联独立保留。见[C250](../Design.md#番茄钟所属领域c250)。

## 习惯详情领域与提醒文字框（C245）

HabitDetailHeader接收原domains，同源alignHabitDomain确定当前ID，将DomainChoiceField放在EntityTitleRow前。DomainChoiceField将readOnly传给SingleChoiceField，后者通过原choiceControlStyle、选项内容和form-choice结构显示无箭头静态框，原交互分支保持，类型区分只读与必需onChange的编辑。

HabitNoteField组合原tool-input框，编辑变体沿原Textarea属性／144rpx尺寸及回调，详情变体用只读View／Text、14px及自然换行，无省略或展开状态。HabitDetailNote只包装非空备注，不再复制首尾文字；领域两宿主复用Header／Note，业务仍在原状态层。见[C245](../Design.md#习惯详情顶部领域与完整备注框c245)。

## 节奏设置复用筛选副标题（C244）

Pomodoro节奏设置的五个字段直接组合已有FilterFieldHeading，由SectionTitle及filter-field-label-row拥有字体、颜色、最小行高和下距，移除focus-field-label页面样式。原SingleLineInput／SingleChoiceField与状态层保持；两个选项只修改transitionOptions显示文案，不新增值或计时逻辑。见[C244](../Design.md#节奏设置副标题与选项简化c244)。

## 首页功能目录与相邻移动（C243）

homeFeatureCatalog按C266拥有18个兼容身份，homeFeatureGroups按C268公开16个显示入口，三组为五项快捷操作／八项功能界面／三项阅读与空间，旧posts／domains仅保留存档身份。HomeFeatureList公开groups／sorting／onMove：导航组合同源条目与CardMoveActions，选择仍用ChoiceButton；字体、图标和字段由基础组件拥有，HomeShortcutEditor接收相同groups，页面不复制条目。MoreSection公开actions插槽，未传时原标题节点和间距保持。

card-order的moveAdjacentItem是领域卡与目录共用的不可变相邻交换算法；领域原personal-tool队列和reorderDomains仍拥有业务保存。目录HomeFeatureOrder／useHomeFeatureOrder负责稳定key校验、组内顺序与设备同步写入，失败锁定原绝对目标、重试后才应用，不调用领域业务存储。创建意图由home-creation-navigation一次性接收，习惯／领域来源就绪后调用原openEditor／definition.openCreate，不增加编辑或保存基础节点。见[C243](../Design.md#首页全部功能创建与排序c243)。

## 习惯详情实体行与单行阅读框（C241）

EntityIconPreview由entity-title-field拥有40px边框圆角底、26px图案、原可选背景图及无图标占位；MemoIconPreview仅作命名适配，MemoFieldsLayout的首行用EntityTitleRow，创建／编辑标题用EntityTitleInput，阅读继续EntityTitleText，手势快照也复用MemoIconPreview。删除重复的备忘录首行字体与图标框尺寸；习惯详情复用同一组件和原PriorityFlag色表，名称／领域6px仍由HabitDetailHeader拥有。

SingleLineInput导出SingleLineField，输入与只读备注组合相同44px基础边框，数字／compact原40px几何不变。HabitDetailNote以无内框的quiet按钮显示单行原文摘要、展开完整原文；HabitCalendar共享CSS拥有16px正文上距、实体行下24px和备注下12px，移除旧短屏覆盖。两宿主顶部单独组合EditorHeading，实体行进入原ScrollView，固定关闭和SheetActions不随阅读滚动；统计page不使用这套实体布局。原状态层与业务回调保持。见[C241](../Design.md#习惯详情独立首行与备注框c241)。

## 编辑底栏删除操作（C240）

SheetActions导出的SheetDeleteButton组合原ActionButton icon／compact／danger与DeleteSymbol，提供无文字40px入口；ariaLabel必传，onClick／disabled由宿主提供。leading统一与48px伸缩保存的8px间距、居中及原底部留白，无页面宽高或位移补丁。任务／习惯／便签／格言／领域记录共用，原确认与保存控制仍在业务层。见[C240](../Design.md#编辑删除符号与底栏统一c240)。

## 筛选副标题组件（C238）

按C259，EditorHeading拥有--editor-heading-horizontal-space:32rpx，标题原横向内距读取它；filter-popover.css对筛选中的filter-field-label-row补齐该值与原12px字段区内距之差，让副标题文字左起点一致。文章ChoicePopover组合filter-popover外观作用域，保留原行内结构及选择框fill；专注等非筛选复用者不受此规则影响。上下布局的输入／选项／底栏及原上下间距不变，页面不复制左内距，见[C259](../Design.md#筛选副标题左侧留白对齐c259)。

FilterFieldHeading统一标签与可选caption的标题行，文字用SectionTitle普通规格，字体／颜色由该基础组件拥有。filter-popover.css只拥有20px最小行高、8px横向间隔、6px下距；inRow表达已有左右布局，省去下距。FilterField组合共享标题行，任务／习惯／便签无页面字体覆盖；文章复用同一个标题组件，选择器通过原width='fill'参数占余宽，原页面只保留行布局。无业务状态或存储变化。见[C238](../Design.md#筛选副标题统一c238)。

## 卡片添加入口（C237）

CardCreateButton供领域列表添加卡与领域详情习惯占位共用，使用原AddSymbol及原生button，拥有整卡触控、加号居中、禁用和按压反馈。宿主沿原domain-entry-shell／daily-suggestion提供网格位置、表面与高度，--card-create-color可指定符号颜色；普通紧凑CreateButton规格保持。占位只在展示分页中组合，不修改习惯或领域存储，业务回调与守卫仍在页面状态层。见[C237](../Design.md#领域习惯创建占位卡c237)。

## 习惯分区边界与间距（C235）

HabitListSection统一固定标题／滚动视口，公开edgeFade展示参数及--habit-list-edge-color；自身拥有8px上下渐隐、末尾内距和滚动后顶缘状态。页面组合原标题／卡片、提供原滚动与排序回调，渐隐不拦截触摸，不新增存储。daily通过已有HabitGrid行距变量与CategoryRow类配置分区间距和时段底色，继续复用40px标题及等宽四格按钮，不复制基础节点。见[C235](../Design.md#习惯分区边界与间距c235)。

## 界面说明文案精简（C234）

ChoiceField不生成默认鼓励页脚，空选项caption条件渲染，不留下空行；MarkdownNoteEditor空预览只显示简短状态，IconLibrarySheet省去默认操作说明。ActivityAnalysis保留真实指标、数据发现与统计口径，删除点击提示与无记录时的追加鼓励。普通成功提示由原页面／保存层省去，错误、授权与同目标重试保持，不在AppDialog全局过滤文字。番茄钟自身移除caption节点／样式，共享保存组件及存储schema不变。见[C234](../Design.md#界面说明文案精简c234)。

## 便签置顶独立行（C233）

MemoFieldsLayout.pin使用导出的MemoPinRow，统一正文／图片后、颜色前的独立右对齐行；MemoEditorFields组合原ChoiceButton，EntryPreview组合静态节点，阅读继续使用原pin插槽。颜色区只组合MemoColorChoices，不新增业务状态或写入。主说明见[C233](../Design.md#便签置顶独立行c233)。

## 快捷方式选中高亮（C232）

HomeFeatureList的selection变体拥有未选暗色与已选高亮，使用共享ChoiceButton颜色变量，保留disabled选中项亮度；navigation变体不改。HomeShortcutEditor仍提供业务selected／disabled／rank：替换时保留的已配置功能与当前候选选中，重复项禁止选择。主说明见[C232](../Design.md#快捷方式选中高亮c232)。

## 彩色便签展示（C231）

memoColorStyle在原background／accent变量旁增加--memo-paper-border，从memoColors.value统一派生45%透明色；便签列表和MemoFieldsLayout内正文／EntryPreview读取同一变量，不复制六色映射。便签页只拥有卡片间距、圆角和辅助行的组合布局，业务状态及保存器保持。

memo-editor-fields.css仅对memo-note-pin／memo-reader-pin／memo-pin-setting声明共享--control-selected-text／border／background，静态is-active同源；其他ChoiceButton保持原选中语义。创建／编辑、阅读及滑动快照共用这些颜色，标题／底栏仍由C230组件拥有。主说明见[C231](../Design.md#彩色便签展示优化c231)。

## 独立窗口共享组件（C230）

EditorHeading拥有编辑领域同源标题字体／内距，PopoverHeading适配title／actions，类型栏用titleContent；EntityTitleRow／Input／Text统一实体大字下划线，保留优先度与长标题。SheetActions.leading统一底部左40px编辑图标、8px间距及48px主按钮，不复制页面底栏。

共享标题及实体名分别暴露--editor-heading-color／--entity-title-color，浅色留言宿主声明原habit-ink，默认暗色不变。HabitCalendar拥有大字及48px按钮所需的短屏补偿：图例5／3px、宽屏长摘要1px；≤680px正文上2px／备注下4px，日期六行40px与日志标题可见保持。

AppDialog提供应用内确认，AppDialogHost按页生命周期持有确认和消息；requestAppConfirmation／showAppMessage替代系统提示。useEditorCloseGuard按scope保护未提交修改，统一×／遮罩、无取消按钮、可不保存／保存，失败回原表单；沿原状态层、账号、图片、busy及重试队列，即时选项与自动保存保持。

## 横向分类栏固定全部（C229）

CategoryRow公开可选fixedLeading插槽，提供时输出page-category-bar／page-category-fixed-row外层、左侧page-category-fixed及右侧原page-category-scroll。固定槽位在ScrollView外，右侧容器负责剩余宽度和原横滑；没有插槽时保持原ScrollView结构，仅加page-category-bar通用类。结构、分类间距及宽度分配由page-toolbar.css拥有，调用方只移入原CategoryButton，不复制样式或使用sticky。

习惯领域、便签标签、文章分类、图标库分类及专注选择习惯分组组合该插槽，保留原条件与回调。静态／网格「全部」和无「全部」分类继续原组件结构；C221定位只测右侧按钮和视口，固定首项不计入selectionOffset，选「全部」回到右侧起点。共享组件不读取存档、不建立分类副本或接管账号／保存状态。主规则见[C229](../Design.md#横向分类栏固定全部c229)。

## 三页筛选间距与统一复用（C228）

FilterPopover组合ChoicePopover、PopoverHeading与FilterActions，统一18px标题、关闭符号及重置／确认底栏；原浮窗定位、内部滚动与安全区仍由已有组件拥有。FilterFields／FilterField／FilterOptionGrid拥有容器0／12／8px内距、字段组距8px、标签下距6px、三列网格6px和选项margin:0，Field提供可选caption插槽，未传时不生成节点；任务标签按C239不显示选择提示。习惯、任务、便签共同组合这些组件，页面只提供字段、条件与业务回调。

FilterSearch组合SingleLineInput的44px外框和24px原生文字行；SingleLineInput增加trailing插槽放清空符号，输入和焦点几何仍由基础组件保护。三页保留原搜索名称、关键词、清空与键盘确认，删除重复搜索／选项／布局样式，便签仅保留色点展示。原多选、数量、重置范围、C227高亮、账号和关闭仍来自宿主，不复制状态或存储；补充C193仅共用底栏的实现范围。

## 数字输入统一尺寸（C225）

SingleLineInput自动识别原生type='number'／'digit'，numeric变体固定外框96×40px；--numeric-input-width／height由single-line-input.css拥有，外框保护样式与既有内部24px行布局同源。ScheduleNumberInput及CustomChoiceRow继续组合该组件，营养输入迁入同一组件，不再由原生Input单独维护尺寸。文本输入保留原size／align及页面布局。

清理旧schedule-number-input.css、专注伸缩宽度、轮播和本次时长重复96px，CustomChoiceRow旧宽度只用于文本。时分小窗通过原panelWidth=300容纳两个统一数字框，营养容器读取同一宽度变量自动换行；数据和回调保持在原宿主，自动全选与保存守卫不迁移。

## 专注操作与自动选择分钟数（C223）

计时页组合原TomatoClock、事项输入、提示和独立操作组；布局由原core.css拥有，底部12px及图形／事项间距不在按钮内部复制。SingleLineInput透传原生focus和选区参数；本次时长草稿只增加会话selectAll标志，首次输入清除，键盘完成组合原saveDuration。预览Input对带选区的数字输入使用text／numeric适配原生可选择行为，其他输入保持原类型；无新增基础组件或业务存储。

## 习惯小标题与分类定位（C221）

CategoryRow公开size='compact'，通过--category-font-size读取共享--section-title-compact-font-size，不在页面复制字体值；自由与提醒仍组合SectionTitle compact。HabitListHeading继续拥有三行的整行宽度、40px高度及统一4px下间距，提醒页面只移除旧分隔线与内距。

CategoryRow的可选selectionOffset表示选中项前保留的分类格数，contentKey标识分类／账号上下文。共享组件测量滚动视口、当前偏移及按钮实际几何，按相邻按钮位置插值，长名称和首尾边界限位；按后续C229只测右侧滑动内容，固定「全部」不计入格数。异步测量和延迟写入在选择／账号变化或卸载时失效。手动滚动后先用实际偏移重新激活scrollLeft，再应用目标。习惯顶部及C258便签标签传1.5，便签从原tagFilters推导最后一个仍存在的已选标签，固定全部及标签各有ID，contentKey组合账号与真实标签列表；其他调用仍使用原scrollIntoView。预览ScrollView补齐原生scrollLeft适配，不在组件复制业务状态或新增存储。

## 便签六色显示（C220）

MemoFieldsLayout公开可选color参数，memoColorStyle共用原memoColors，提供--memo-paper-background与--memo-paper-accent。列表、共享字段容器和EntryPreview使用同一派生；memo-editor-fields.css拥有书写／预览／阅读正文的底色和边框，页面只组合列表卡片变量。原MarkdownRenderer及文字层级保持，不复制六色映射、增加业务状态或写入默认值。

## 弹窗末行按钮到底部留白（C219）

app.css声明--popup-actions-bottom-space:8px，SheetActions和PopoverActions共同读取。SheetActions的底部内距取max(共享间距,安全区)，native tabBar及ChoicePopover浮动上下文通过--popup-actions-safe-area:0px声明安全区已由边界拥有；不复制路由或添加一套业务状态。SheetActions同时清零直属按钮的上下margin。

原图标库、专注选择、格言、饮食、习惯完成提示、选境自定义及成长编辑／目标操作组合SheetActions；调用方只保留原横向／上方间距、背景及按钮外观。格言、饮食和选境父容器取消重复底部padding，浮动便签删除确认组合PopoverActions，便签阅读与专注设置清理旧底栏覆盖；不新增基础组件或改变原回调。

## 便签阅读置顶操作（C218）

MemoFieldsLayout新增可选pin插槽，拥有正文下方独立右对齐的一行；MemoReader组合原40px ChoiceButton／PinSymbol，仅符号与选中态。onPin／pinDisabled传递便签页的原pin(note)和交互守卫，数据仍由原usePersonalToolState读取／保存，不在阅读组件复制业务状态；创建、编辑及列表保持原布局。

## 弹窗单行底栏（C217）

SheetActions直接拥有无上边线的单行操作样式；PopoverActions的separator默认false，普通调用方无需覆盖。图标库及专注选择原独立footer取消边线，GrowthGarden仅编辑／目标的单行footer取消，带说明的管理footer保留。清理原无效border-top-color覆盖，不添加装饰节点或复制组件；原内距、间距、安全区及业务回调保持。

## 编辑窗口标题（C216）

EditorHeading拥有所有表单窗口标题的排版，Props title／actions／caption传入内容与操作，titleClassName／className只保留既有语义定位。共享CSS使用原习惯编辑的30rpx／600／1.4及18／32／6rpx内距；长标题换行与操作区不压缩，actions组合现有40pxActionButton。

习惯、任务、便签、快捷方式、领域定义／目标、记录、格言、饮食、成长及专注直接复用，不再各自维护标题样式。embedded公开变体及--editor-heading-inset适配已内嵌表单，caption保留原饮食说明；原父顶部留白取消，其他内容及安全区仍归原容器。领域旧只读HabitDetailHeader样式限定为非EditorHeading，创建类型栏继续由EntryComposer拥有，避免其他窗口受编辑样式覆盖。

## 领域详情明确领域创建入口（C213）

领域详情PageToolbar的create插槽组合CreateButton，统一原加号、尺寸和外观；createRecord与原记录栏空白入口共用。DomainQuickRecord仍只组合EntryComposer。共享创建器初始化收到明确initialDomainId时只修改未提交进展的领域，pendingSave仍优先原目标；不增加组件、存储或页面局部布局。

## 记录无栏标题与可选图片插入（C212）

领域详情与最近记录均通过DomainRecordColumn showHeading=false组合无标题双栏，省去标题节点及占位，不复制页面样式。MarkdownNoteEditor的showImageInsertion默认true，关闭时不渲染图片按钮且插入守卫同时关闭；ProgressEditorFields及DomainRecordEditor显式关闭，任务／便签维持默认。EntryPreview的进展普通文本快照同步不显示按钮，保留已有图片节点。共享输入、原图片预览／移除及状态层校验继续复用。

## 第二屏未分类卡投影（C211）

domain-display只提供uncategorizedDomain／domainDisplayState只读派生和明确写入时materializeUncategorizedDomain；原DomainState／版本及真实来源不变。领域页单一entryCard渲染普通／未分类，复用DomainProgressSummary及原卡片类，普通排序组合CardMoveActions，未分类无移动入口；续接列表现按C265由下半domain-entry-scroll拥有，PageScroll外层固定。

详情通过路由变体读投影并复用目标／习惯／记录组件；domainSource保存真实状态，prepareHabitEdit及原存储队列不读取虚拟关联。alignHabitDisplayDomain是只读归属变体，仅详情展示和完成统计使用，原alignHabitDomain负责业务保存，避免把临时ID写入其他习惯。旧未分类保留ID，只有显式目标写入才物化空卡，容量守卫复用原规则。

## 功能目录与快捷选择（C209）

homeFeatureCatalog统一17项稳定身份、名称、类型、默认颜色、tab与图库icon，home-shortcuts保留shortcutCatalog导出兼容既有消费者，shortcut-icons不再另存功能图标表。home-features仅重导出分组／类型，不复制数据；未使用的溢出合并与目录别名移除。

HomeFeatureList公开navigation／selection变体、optionState和onChoose，组合SectionTitle／ShortcutIcon／ActionButton或ChoiceButton，拥有共享两列网格、字号行高、24px图标、间距与等宽行。选择宿主传selected／disabled／rank／ariaLabel并处理草稿／确认，首页宿主处理导航；基础组件不读写存储。首页及编辑器移除原目录节点和重复CSS，彩色目录与大卡线稿仍由原LibraryIcon不同变体提供。

## 进展正负按钮配色（C207）

ProgressRecordField以is-positive／is-negative配置ChoiceButton已有--control-text／--control-selected-text／背景／选中边框变量，沿用控件基础结构、状态和触控尺寸；真实输入与EntryPreview共用。--domain-positive／--domain-negative由app.css共享拥有，移除domains页面重复文本色，按钮及DomainRecordColumn／Card保持同源，其他普通按钮不改变。

## 快捷编辑即时保存（C206）

HomeShortcutEditor单卡通过原onSave(value,false)回调请求同步保存，原首页宿主返回成功状态而不关闭或逐次弹成功提示；完整选择／替换仍使用原默认关闭保存。编辑器用ref同步最新输入与失败绝对目标，避免在React状态更新函数中执行存储副作用；失败重试组合原ResetSymbol／ActionButton，不复制存储、卡片或色点结构。单卡按内容高度和安全区布局，不渲染SheetActions；选择／替换继续同源SheetActions，所有业务写入仍由首页persistShortcuts拥有。

## 进展普通文本变体（C203）

MarkdownNoteEditor公开format='markdown'|'plain'，plain复用原Textarea、图片工具、字数、密度、聚焦及异步账号／记录守卫，隐藏模式切换并跳过Markdown渲染；默认markdown保留任务／便签表现。ProgressEditorFields与DomainRecordEditor传plain，EntryPreview只读组合同步模式，不复制输入行为。DomainRecordContent以同一format变体组合普通Text或RichText，普通Text由组件拥有pre-wrap／继承字号颜色及1.65行高；DomainRecordCard统一传plain，最近记录和详情同步，MemoReader仍用默认Markdown。保存与旧存档不因展示模式新增字段或迁移。

## 备忘录与快捷方式共用六色行（C202）

ColorChoiceRow通过options／value／onChange／disabled拥有等宽六色行、20px色点、40px选项、6px间距及原ChoiceButton选中反馈；className／buttonClassName／dotClassName保留调用方布局与色变量，readOnly变体用静态View组合预览而非另一个编辑器。HomeShortcutEditor与MemoColorChoices共同引用，基础样式不在两个表单重复。MemoColorChoices在MemoFieldsLayout模块封装memoColors来源，MemoEditorFields及EntryPreview共享，原存档与业务回调仍归宿主。阅读保留已保存颜色的只读摘要。

## 快捷方式任务式编辑与统一图标（C201）

新增EntityTitleRow／EntityTitleInput拥有任务式下划线、字号和高度，任务真实表单、EntryPreview只读标题及HomeShortcutEditor共用；通过children组合前置图标／右侧优先度，Props原样传入原生输入，className保留局部布局。快捷取消独立名称框与背景字段，图标入口用40px ActionButton，六色复用ChoiceButton、共享卡预览继续HomeShortcutCard。业务草稿与保存队列仍归原宿主，不新增表单存储。

ShortcutIcon只组合LibraryIcon colored／outline，默认功能映射由shortcut-icons拥有，所有64图标与图库搜索继续同源。normalizeShortcutIcon只读接受48个旧别名并返回合法library:键，实际保存才落盘；旧PNG／图集渲染与生成器删除，保留最小兼容映射，避免旧自定义配置丢失。

## 习惯自由与时段双列表（C200）

新增HabitListSection组合固定标题和独立ScrollView，通过heading／children插槽、scrollProps／scrollKey及className定制内容、滚动来源与只读预览；HabitListHeading统一自由、时段分类和提醒区40px标题行。自由及提醒用SectionTitle compact，四时段栏组合原CategoryRow／CategoryButton，不复制分类按钮结构或字体。页面负责当前时段会话状态、原筛选及排序，基础组件拥有两区共用的高度分配、标题间距和滚动容器。

HabitCard共用上下内距各加4px、最小高度加8px，以--habit-card-padding-block／--habit-card-min-height允许局部覆盖，主列表／提醒／领域详情保持同源。useHabitGridSort新增可选scrollIdForItem，测量、锁定及自动滚动均限源窗，scrollTopFor／onScrollFor按窗隔离；默认来源兼容原具体领域列表，原持久化及账号队列仍归状态层。拖动的上下文／源窗守卫防止跨窗或旧异步回调提交，隐藏时段不改序。

## 任务详情标签与操作分隔（C197）

任务表单样式的todo-editor-actions复用原1px／#3b4b56分隔规格，在标签下方专注操作组顶部保留边线与12px内距；删除按C240移至SheetActions.leading，不新增装饰节点，TodoEditorFields与SheetActions边界保持。

## 快捷方式共用彩色库与灰色线稿（C199）

LibraryIcon拥有colored／outline变体，同一LibraryIconId对应原彩色PNG及同SVG来源的512px灰色线稿图集。ShortcutIcon对library:前缀组合LibraryIcon，旧48值走原图集；ShortcutBackground及HomeShortcutCard继续复用同一预览结构。ShortcutIconPicker仅组合IconLibrarySheet，title／ariaLabel／optionPrefix／closeLabel配置局部文案，搜索、分类和选择布局由基础组件拥有，默认习惯／领域／便签调用保持原文字。

生成工具library-icon-outline及generate-library-outlines保留原形状与图层遮挡，透明线稿在构建期生成，本地Image渲染。数据层沿用原icon字段及共享合法性检查，业务队列仍由页面拥有；只打包当前使用的三份旧图集与一份新线稿图集，不复制另一套图标定义。

## 习惯时段独立设置行（C196）

HabitEditor将领域和时段通过Composition分置两个行容器，领域继续用DomainChoiceField fill，备注下方时段复用SingleChoiceField compact／content。仅共享编辑器负责顺序及设置行布局，习惯页和领域详情同步，原选项浮窗、禁用与onChange保持。

## 习惯详情编辑与标题排版（C195）

HabitDetailHeader继续组合原习惯内容、HabitDetailTitle与PriorityFlag色表，当前按C241通过item／className显示滚动区的独立实体行，图标框共用EntityIconPreview；关闭由顶部EditorHeading、编辑由底栏SheetActions.leading拥有。名称／领域6px、长摘要、HabitCalendar及原保存／补记队列保持，共享留白／高度按C241。

## 便签删除管理符号（C194）

便签功能栏将原ManageSymbol替换为已有DeleteSymbol，通过原ChoiceButton iconOnly／compact组合保留尺寸、选中和模式回调。符号不持有删除行为，managing及卡内删除确认由原页面拥有，沿用共享图形而不增加局部样式。

## 习惯筛选统一与日历归统计（C193）

新增FilterActions组合PopoverActions、ResetSymbol和compact ActionButton，拥有40px重置／6px间距／伸缩提交布局；通过resetLabel／applyLabel、onReset／onApply和className定制，习惯与便签同源，便签省去重复底栏样式。习惯继续组合SingleLineInput与ChoiceButton，ChoicePopover拥有独立层、标题、滚动正文和固定底栏；条件与数量由宿主读取原习惯，新增条件纳入原排序／滑动上下文。删除习惯独立周窗，统计继续组合HabitCalendar，详情编辑同组件和原队列，不增加副本。

## 习惯时段标题减小字号（C192）

SectionTitle增加size='standard' | 'compact'，默认沿用14px，compact使用共享--section-title-compact-font-size: 12px；字重、颜色与展开结构仍归基础组件。习惯时段分组显式选compact，其他调用保持默认，宿主不复制字体或缩小操作区。

## 横向分类栏统一粗体（C191）

CategoryButton继续组合ChoiceButton的category变体，独立--category-font-weight统一为700，与--category-font-size同由基础组件拥有，选中状态不改变字重。CategoryRow及页面／弹窗无需重复样式；普通变体字体保持。特定场景仍可在所属容器通过共享变量覆盖，不增加分类状态或缓存。

## 习惯自动时段与卡片加宽（C190）

habitTimePeriod统一拥有缺省时段推断与显式选择优先，HabitEditor及groupHabitsByTimePeriod继续同源；HabitCard按C270不再展示或推断时段，不建立自动分类缓存或修改存档。新增HabitGrid，通过children／className组合习惯页和领域详情，两列及4px列距归共享CSS，行距通过--habit-grid-row-gap局部覆盖；宿主只保留主列表拓宽、领域按C278独立纵向滚动及分组间距。共享卡片图文／触控结构保持。

## 便签筛选摘要重置符号（C189）

便签摘要栏直接组合现有ResetSymbol与compact图标ActionButton，统一图形和40px触控；局部只保留flex／宽度／margin布局，省去原文字按钮外观覆盖。原clearFilters数据回调保持，不新增组件状态或存储。

## 便签筛选多选与或逻辑（C188）

便签页将会话标签／颜色条件改为数组，继续组合共享ChoiceButton；选择、取消和全部由页面业务回调更新，基础组件拥有高亮／触控／外观。原同一filtered计算以some／includes支持组内任一匹配，分类栏、摘要、数量及滚动上下文同源，分类栏仍单标签替换。共享浮窗、重置符号和底栏无需复制样式或新增存储。

## 便签操作对齐与阅读编辑入口（C187）

PinSymbol加入manage-symbol，以原生View／CSS拥有完整20px图形占位，替代便签三个场景的memo-pin-mark与补偿位移。列表只组合共享ChoiceButton置顶与条件删除，统一40px／2px／居中操作组。MemoReader通过onEdit／editDisabled Props组合原EditSymbol和关闭按钮，不持有编辑草稿或业务写入；页面调用原edit(note)，保留账号及原ID恢复。共享MemoFieldsLayout与SheetActions保持。

## 便签筛选重置符号与位置（C186）

便签筛选直接组合已有ResetSymbol、compact图标ActionButton及PopoverActions，与待办共用图形、控件外观和6px间距；页面仅固定辅助按钮40px和主按钮伸缩，原clearFilters不变。不复制符号CSS、不增加新的状态或存储。

## 便签阅读复用创建样式（C185）

MemoFieldsLayout拥有便签字段容器和顺序，通过title／body／settings／tags插槽组合，readOnly变体允许展示长标题；MemoIconPreview共用原图标和空图标几何。MemoEditorFields保留原状态、输入及保存回调，仅组合同一布局；MemoReader组合只读Text、PriorityFlag、原DomainRecordContent与颜色／标签，共用Markdown正文框CSS，不用禁用输入模拟阅读。窗口沿用ChoicePopover，底栏组合SheetActions和large主按钮，不新增存储或编辑状态。

## 待办筛选重置符号与位置（C184）

ResetSymbol加入原manage-symbol共享符号模块，以20px、继承颜色的原生View／CSS几何绘制圆形回转箭头，不使用文字字形或新图片。待办筛选组合原PopoverActions、左侧compact图标ActionButton与右侧fill查看，重置40px、间距6px；组件拥有图形／按钮外观，页面仅配置伸缩布局及原筛选状态回调，不修改其他页重置动作。

## 创建清空按钮移至底栏（C183）

EntryComposer 将同一清空ActionButton从entry-heading组合到原SheetActions，三类共用底栏左40px辅助操作／右伸缩提交，间距8px、居中且保留安全区。entry-submit明确标记原提交动作，清空原回调与禁用条件不变；页面无需各自实现或覆盖。底栏布局改变不增加保存／清空数据来源或影响已有实体编辑。

## 标签输入内距与自动换行（C182）

TagTextInput 统一任务／便签与餐厅标签的多行文字、内距、原生autoHeight与外框再聚焦。外框拥有12px横向／10px纵向内距，内部Textarea保护零额外内距、14px文字／20px行高与继承字体，不沿用页面Input的固定高度或单行排版。TagChoiceRow仍组合原常用选项与完整栅格，新增contentKey承接原文本，仅复用ChoicePopover测量；完成移至共用PopoverActions固定底栏。原选择值、解析、校验及保存仍归调用方。

## 下一步行宽与按钮间距（C181）

TodoEditorFields 作为创建／编辑共用字段组件统一拥有下一步行和右侧操作组布局，不增加页面覆盖。每行组合圆点、伸缩输入与固定128px操作区，移动两按钮组宽84px，内外间距均4px，各操作复用compact ActionButton／MoveSymbol。单条保留同宽不可交互的移动区域，末尾仅显示同列加号，所有输入宽度相同；数据更新、连续输入与原守卫保持。

## 展开小窗口紧凑布局（C180）

ChoicePopover 统一拥有内容内距、测量、锚点与滚动边界；新增 bodySpacing='compact'／'tight'／'none'，分别用于普通选项、排序、由内部字段拥有内距的组合筛选。PopoverHeading 与 PopoverActions 在同一共享模块导出，页面只组合标题、关闭与原操作，操作栏可用 layout='end'／'fill' 和 separator 覆盖排列或分隔线。共享样式负责固定像素间距并清除原按钮外边距；排序、日程年月／时间／提醒／重复、任务／便签筛选及格言轮播不再各写一套标题／底栏间距。

时间与提醒时刻复用同一 timeFooter，将错误提示和完成按钮组合在同一行，正文只保留居中的小时／分钟，不保留单独的空错误行；提醒主窗口也在同一操作行左侧显示错误。提示出现不移动按钮，触控仍40px。大实体表单继续沿用 SheetActions 的安全区与48px提交规格。所有状态、校验、取消及业务回调继续由原调用者拥有。

## 领域满屏布局与外层续接（C176）

外层续接现按[C265](../Design.md#领域页固定与卡片独立滚动c265)改为下半卡片独立滚动，原卡片几何和首屏分配仍沿用；以下保留原布局说明。

领域列表由外层 PageScroll 顺序组合首屏 domains-index 与续接网格，首屏保持100vh可用高度，前八个真实领域两列四行；后续对象从同一原数组按顺序接入外层，不再挂领域卡内部 ScrollView，也不另存分页列表。页面仅拥有容器分配：手机卡高按实际可用高度约束在86–108px、宽屏94–108px，行距6px；顶部 DomainRecentRecords 以flex使用余下空间，替代96／64px矮固定高及458px网格封顶，空／长内容同高。记录组件仍拥有单一内部ScrollView和共享无标题双栏，不复制正文或滚动结构。

PageToolbar只组合原摘要、40px SortSymbol与记录进展，删除ManageSymbol及管理状态。原居中加号创建占位常显：少于八个真实领域时位于首屏剩余槽位，达到八个后位于外层续接末尾；排序时保留同一占位几何并禁用创建。点击仍调用同一DomainDefinitionEditor／useDomainDefinition.openCreate，MAX、账号、容量、volatile及同ID重试守卫不变。真实卡仍组合DomainProgressSummary与CardMoveActions，首末禁用按全量领域索引判断，跨首屏边界重排沿原绝对目标保存。

GoalSummary卡片短期展示变体集中拥有上7px／下2px内距，比旧上5px／下0px各增加2px；默认inline目标、圆点、分隔线与单行规则保持。页面不覆盖目标内部样式，不缩小40px图标或操作。首屏底部保留普通12px／短屏8px加safe-area；有内容的读取／保存反馈使用position:fixed的44px可滚动视口浮层，仅反馈出现时渲染，不以空白槽压缩首屏或移动卡片；滑到后续卡时同目标重试仍可达。记录数据、原ID编辑、详情全历史及保存守卫仍属于原业务层。规则见 [C176](../Design.md#领域满屏布局与外层续接c176)。

## 首页快捷方式统一排序与图标背景（C175）

CardCornerActions拥有卡片右／下边4px容器、2px间距及统一40px图标按钮外距。CardMoveActions以objectLabel、onMoveUp／onMoveDown、disabled／upDisabled／downDisabled和className组合上下移动；首页与领域直接引用同一组件，局部只传对象语义、首尾状态和业务回调，不复制排序节点或覆盖基础位置。HomeShortcutCard扩展onReplace和移动回调，管理组合左编辑／右替换、排序组合CardMoveActions；操作与导航为兄弟，管理／排序内容只读并阻止操作事件冒泡。

ShortcutIcon新增standard／background变体，默认保持原八色图集及目录调用。背景变体使用同一48源几何生成的细线透明图集；ShortcutBackground统一组合默认／选中icon、六色和大尺寸低透明装饰位置。ShortcutIconPicker复用ChoicePopover、ChoiceButton及标准缩略图，48项至少40px，选项仅回传编辑草稿；内部滚动及关闭最上层由共享窗口处理，不复制图标或接受任意素材路径。

HomeShortcutEditor通过initialKey／replacementKey区分单卡编辑与替换，两者缺省为完整功能增删目录。单卡组合预览、SingleLineInput、图标背景入口、六色与SheetActions；完整目录及替换仅功能栅格和同一底栏，不再引用下方外观字段。替换禁用其他已选功能，保存由原onSave交回完整设置，取消／外部关闭丢本次修改。

首页通过moveHomeShortcutBy逐次同步保存，不再挂useHomeShortcutSort拖动测量；页面拥有互斥模式及失败原绝对目标，失败只改变原工具栏符号动作，不增行挤首屏。replaceHomeShortcut保留rank／颜色／自定义名称和背景，默认名跟随新功能、隐式图标固定旧默认；旧background兼容及合法性在数据层。领域保留原reorderDomains及账号队列，展示组件不持久化业务。规则见 [C175](../Design.md#首页快捷方式统一排序与图标背景c175)。

新建默认卡及实际编辑／移动写入前固定当前有效icon，再正常化整份设置；读取旧缺省只作展示回退，不补写。该写入边界区分主动选回旧六项默认组合与真正未自定义的旧来源，避免正常化误升级用户新选择；同一个数据层继续负责原C147迁移。

## 领域顶部最近记录与八卡首屏（C174）

本节的共享记录变体及数据边界仍有效。后续C176替代矮固定高度、领域内滚动及空反馈槽，旧数值和布局仅记录历史；当前满屏与外层续接见上节，不再保留管理模式。

DomainRecentRecords继续投影原全部领域合计最新十条，并组合同一DomainRecordColumns／Column／Card；记录内容、Markdown紧凑变体、图片预览和点击隔离仍由共享组件拥有。DomainRecordColumns新增variant='default'／'compact'，默认保留原顶部线与间距，最近记录compact省去重复的顶部线及占位；DomainRecordColumn新增showHeading，默认true保持静态／create标题调用，最近记录传false移除整个标题节点与占位。详情使用默认变体和原创建标题／回调。最近记录不再组合领域metadata，但Card的metadata插槽保留给其他场景，不从业务对象移除领域／类型。

DomainRecentRecords拥有固定紧凑容器与单一内部ScrollView，公开className／style及--domain-recent-height表达场景高度；左负右正双栏、中央分隔、符号及正负颜色继续共享。页面只将其放在原PageToolbar之后、网格之前；主列表域卡由当前可用首屏分配两列四行，同一网格内部滚动可达第九张以后及管理创建占位。图标／计数／进展／目标基础样式继续由DomainProgressSummary拥有，局部高度通过约定变量或显式布局参数提供，不复制摘要节点、业务文字样式或压缩40px图标／触控下限。

当前页面将--domain-recent-height设为96px，视口高度不超过700px为64px；组件缺省100px，外框为border-box、上下6px／左右8px内距及1px边框，内部ScrollView占100%内容高度。DomainRecordColumns compact与showHeading=false组合只移除最近记录的标题层、重复顶部线和间距，保留共享正文触控与详情默认外观。

领域网格ScrollView使用flex剩余空间、height:0及max-height:458px，网格height:100%、grid-auto-rows:calc((100% - 18px) / 4)，行距6px／列距8px，卡壳border-box；布局展示四行，真实对象仍按原数组全量渲染并内部滚动。卡内上下内距普通8／28px、短屏4／24px，40px图标与两移动按钮不缩小。底部读取／保存反馈预留独立44px ScrollView及4px上距，提示出现不挤卡片；页面底部12px、短屏8px另加safe-area，反馈及模式变化保持同一操作边界。

首屏至少八个真实领域时默认完整八卡，少于八个不伪造对象；同视口浏览／管理／排序保持卡片边界及图文坐标，详情布局和全历史保持。业务选择、排序、原ID编辑、账号／容量／最新记录、隔离草稿、持久化及同目标重试仍在原业务层，不增加存储。直接调用处须覆盖最近记录无标题／无metadata与详情默认标题两种变体，以及四行布局、两个独立内部滚动区和非零安全区；规则见 [C174](../Design.md#领域顶部最近记录与八卡首屏c174)。

## 领域排序与详情编辑删除（C173）

领域主列表的浏览／排序状态由页面拥有，当前C176的PageToolbar仅通过sort／create插槽组合40px SortSymbol和原记录进展入口；管理符号和模式已移除。排序卡复用C175的CardMoveActions，真实卡继续引用DomainProgressSummary，浏览时可进入详情。只有排序隐藏原摘要节点并保留几何，页面仅负责操作区布局，不另复制卡片摘要、背景、字号或触控规格；创建占位按C176常显，排序时禁用但不移位。

DomainDefinitionEditor统一领域定义的创建／编辑表单、嵌套IconLibrarySheet及应用内删除确认，唯一业务Props为controller。列表从C176常显创建占位调用openCreate，详情从右上EditSymbol／删除符号调用openEdit／openDelete并传当前稳定领域ID；业务状态仍来自原domains／reminders，详情不复制一套表单或保存方法。表单复用SingleLineInput左对齐名称、ActionButton、SheetActions及SheetBackdrop，编辑／删除入口复用40px ActionButton icon，删除使用危险意图。

useDomainDefinition(domainTool, habitTool, options)接收页面已有usePersonalToolState的两个来源，不重复读取；options仅为locked／onSaved／onDeleted，返回DomainDefinitionController，包含currentEditor／currentDelete、iconOpen、busy／blocked／error及创建、编辑、删除、保存、关闭和字段回调。创建pendingId、编辑原ID和删除原目标由控制器保持，仍调用原saveDomain／deleteDomain及工具setValue串行保存，不新增业务存储。

改名时绑定原共享习惯ID与写领域的整个链统一处于busy，核对最新owner、ready及格式，任一来源volatile保留失败与输入。详情通过最上方PageToolbar组合左返回和右编辑／删除，原名称及已完成目标行保持；删除仅本机持久化后调用onDeleted再导航，volatile即使领域从内存列表移除也继续挂载原ID确认，允许同ID幂等重试。未分类编辑／删除保护、账号或页面变化关闭旧对象及取消不提交保持，排序继续由原reorderDomains保存同一绝对目标。直接调用处须覆盖列表创建、详情编辑／删除及失败同目标重试；规则见 [C173](../Design.md#领域排序与详情编辑删除c173)。

## 首页快捷方式背景与管理（C172）

历史实现：十纹理、拖动及完整目录下方外观字段已由C175替代；当前基础组件与公开场景见本文C175。以下保留旧组件结构和当时验证。

ShortcutBackground统一拥有十款固定纹理、装饰节点和六色主题，Props为background、可选color及className；背景与颜色独立，--shortcut-color由同一shortcut-color-*来源提供。首页大卡、编辑卡预览、背景选项和颜色点复用该组件／主题，不在页面或编辑器复制图案及色值，也不新增图集。

HomeShortcutCard组合ShortcutBackground和名称，接收item及可选onOpen／onEdit／disabled／rankVisible、className、rootProps。onOpen提供普通导航按钮，缺省为静态只读内容；onEdit组合右下40px共享EditSymbol，rankVisible仅用于排序等明确场景，普通大卡不显示编号。根View提供事件／属性组合，编辑与导航按钮为兄弟，避免嵌套；普通、管理和编辑预览的卡名、边界、字体与反馈由同一组件拥有。

HomeShortcutEditor通过initialKey表达单卡与完整目录两个场景，复用同一套名称／背景／颜色字段，不再复制每张卡的大表单或提供图标属性。名称使用compact左对齐SingleLineInput，十背景及六色使用ChoiceButton，预览使用HomeShortcutCard／ShortcutBackground；完整目录的添加／移除及当前项选择通过组合呈现。SheetActions统一取消／保存large／fill底栏，编辑器只拥有本次草稿，onSave交回完整正常化设置，取消／外部关闭丢本次输入。

单卡编辑窗口使用min(560px,可用高度减12px)，中部ScrollView占剩余空间；预览普通88px、视口高度不超过700px为64px，短屏只压缩局部预览及模块间距，保留40px背景缩略图／选择控件和48px底栏。编辑器统一清除继承的按钮外距，不改共享按钮内距或字号；按C32默认须同时看见名称、十个背景、六个颜色及保存／取消，完整增删目录的长内容仍明确内部滚动。

首页继续组合PageToolbar、SectionTitle、40px SortSymbol／ManageSymbol，管理加号预留独立槽位，卡内编辑传initialKey。useHomeShortcutSort继续负责实际边界测量、草稿拖动及边缘滚动；页面拥有模式及持久化，点击同排序符号才提交，切设置放弃未确认排序，写失败重试原目标。background合法键、固定默认、rank空号及旧icon兼容由原home-shortcuts数据层负责，展示组件不接受任意CSS、路线或素材路径，不实现云端同步。规则见 [C172](../Design.md#首页快捷方式背景与管理c172)。

## 进展双框与独立正负选择（C171）

ProgressEditorFields统一组合原DomainChoiceField和上下两个MarkdownNoteEditor，每框上方用同一行ChoiceButton显示左负／右正及选中高亮，默认上正下负，两框独立控制，切换只更新该框选择并保留内容／图片。首页、快捷方式、领域列表和详情继续调用EntryComposer，不复制字段节点、选择按钮或表单样式；横滑快照沿用无原生输入的只读组合。

共享ProgressRecordField拥有每框的选择行和容器，实时编辑及EntryPreview通过children组合各自正文。MarkdownNoteEditor新增density的regular／compact变体，只有进展双框启用compact；高度、内距和模块间距由共享CSS变量拥有，无输入快照引用同一组变量。其他调用默认regular，按钮仍按共享40px选择／48px提交规格，短屏保持原中部滚动及固定安全区。

EntryComposer的底部组合一个large／fill「保存记录」，原草稿／状态层按各框选择统一校验并原子保存有文字或图片的一／两条记录，允许同正／同负。展示组件通过Props接收草稿、账号、禁用、图片容量／忙碌及回调，不承担业务存档或队列。上框接原任务／备忘录标题互通、首页快捷输入和自动聚焦，下框及进展图片／领域独立保留。

原版本1本机创建草稿的pair及kinds描述上下两框及各自positive／negative选择，原positive／negative内容槽位不再限定保存符号；数据层兼容旧single／kind、固定双框及legacy，已提交pending的ID／符号／领域保持。展示组件只使用统一草稿视图和回调，不改正式domains记录schema、云端或账号／同目标保存边界；规则见 [C171](../Design.md#进展双框与独立正负选择c171)。

## 正负记录紧凑间距（C170）

createMarkdownRenderer和DomainRecordContent以独立compact变体拥有紧凑Markdown规则，默认false，仅DomainRecordCard传入true。compact只控制行高、块间距及空白处理，与inheritTypography的业务字号／颜色继承分别控制；便签和文章等其他阅读沿用默认样式。

紧凑正文的段落下距4px、根节点及段落行高1.65，其他块收紧margin／padding；normal空白处理省去生成HTML格式换行引入的空行，显式换行及代码预格式保留。domain-records.css拥有共享卡的2px上下内距，最小高度现按C276取消，两处页面不复制局部补丁。领域详情与领域页最近记录同用DomainRecordCard，数据选取、两栏、原字号与正负颜色、图片事件／原ID编辑及保存边界保持；C174只省去主列表标题／领域metadata，不改变紧凑正文或详情默认结构，普通文字展示沿C203。规则见 [C170](../Design.md#正负记录紧凑间距c170)。

## 领域卡短期目标圆点（C169）

DomainProgressSummary内部GoalSummary新增showBullet展示变体，默认false，仅showShortTermGoal卡片摘要传入true。共享组件及domain-progress.css拥有6px圆点和原4px间距，装饰aria-hidden，当前／已完成／未设置复用同一结构；inline长期／短期摘要保持默认无圆点。

页面继续传原领域与目标数据，后续C173仅排序隐藏整个原摘要节点并保留几何，不复制圆点或改变业务Props。C149选取、C152单行省略／分隔线、40px图标及同视口模式间原坐标保持，主卡高度以C176满屏布局为准，短期变体上下间距也由同一组件拥有；规则见 [C169](../Design.md#领域卡短期目标圆点c169)。

## 首页快捷创建记忆类型（C168）

EntryComposer在共享成功创建流程中记录最近成功类型，本机偏好按账号及预览命名空间隔离；确认本机持久化并核对原账号／保存上下文后更新。类型切换、取消、清空、失败及volatile不写偏好，既有实体编辑也不作为创建。各入口不复制成功类型记录逻辑，不把该偏好存入任务、便签或领域业务数据。

首页底部快捷输入的加号／键盘完成读取偏好作为初始类型，其他调用继续传入原initialMode和入口上下文；pendingSave的原类型和ID始终优先。默认进展的快捷文本通过原草稿合并进入后续C171上框，字段、草稿及队列保持。只有首页快捷输入采用此默认策略，共用表单的Props与业务保存边界不因其他入口改变；规则见 [C168](../Design.md#首页快捷创建记忆类型c168)。

## 任务表单移除标题图标（C167）

TodoEditorFields统一拥有任务标题行，共用EntryComposer任务创建和原任务编辑都复用无goal图标的结构，移除原图标专用样式且不留占位。EntryPreview任务只读快照同步标题结构，备忘录快照图标保持；页面无需各自隐藏图标或调整标题左距。

原标题输入、优先度及其他字段、ID、草稿和保存行为由原Props及状态层负责，本轮不改变接口或数据。任务表单是C28图标位置的局部例外，MemoEditorFields、HabitEditor及业务卡片继续采用所属组件的图标。规则见 [C167](../Design.md#任务表单移除标题图标c167)。

## 习惯时段与全部分类分组（C166）

HabitEditor的时段位置现按C196／C269置于备注下方独立行，沿原SingleChoiceField；HabitCard按C270移除时段及最近打卡整行和metadata／recency接口。timePeriod由原reminders及领域legacy数据／保存层校验，推断与分组按C190／C262，不因精简卡片补写、删除或复制数据。

SectionTitle新增onToggle／expanded／disabled／ariaLabel变体，组合ActionButton quiet／compact／fill、灰蓝14px／600文本和SelectChevron；普通调用不变。分组标题至少40px、默认展开，页面拥有折叠会话，账号切换清空；共享组件拥有文字、触控、箭头和事件边界，不复制另一套标题。状态横滑的预览只读，不提供折叠或业务写入动作。

习惯页先原过滤及orderedHabits排序，领域「全部」再按五个固定时段分组并省略空组。两列布局和分组容器由页面拥有，卡片基础样式仍共享，全部内容从原内部滚动区查看。useHabitGridSort的可选groupForId允许测量完整内容包装层并限制分组视图同组换位，源组IDs只替换原可见槽位；账号／分组上下文变化取消旧手势，原自定义排序、队列及同目标重试保持。其他平铺场景不传分组约束时沿用原行为。规则见 [C166](../Design.md#习惯时段与全部分类分组c166)。

## 习惯详情备注与统计留白（C165）

HabitCalendar的详情留白由共享habit-calendar.css在habit-calendar-editor容器内统一拥有，习惯页与领域详情复用同一份规则；不改变统计page变体。正文上内距普通／≤760px／≤680px为14／10／5px，四项统计上下内距为10／6／2px，最短档标题栏上下内距从3px收为0，以保持完整42格和日志标题默认可见。

沿用原备注下距、固定40px日期、图例8px、底部控件与安全区，长内容由原场景的ScrollView滚动。页面不增加局部间距覆盖，不改变Props、数据或保存行为，也不新增组件；长名称／备注与C164留言日志继续使用原共享节点。规则见 [C165](../Design.md#习惯详情备注与统计留白c165)。

## 月打卡日志常显留言与更多（C164）

habitMonthCalendar从原reminders投影HabitMonthCalendar.logs，只返回当月已打卡且有非空留言的日期；completed／rate／stats继续从全部有效打卡计算。HabitCalendar在page／detail两种布局共用普通SectionTitle、留言条数、全文日志行和全宽「更多」，不复制两套列表或保留日志展开状态。默认十条，每次增加十条，月份／习惯变化重置；detailAction保持Composition插槽，统计只读和详情日期操作继续通过原Props与回调定制。

日志结构、全文换行和基础间距由共享组件及habit-calendar.css拥有，各页面仅负责原容器滚动和底部操作；留言数据、120字及空白归一化、账号与持久化队列仍在原状态层。HabitDetailTitle／HabitDetailNote的长名称／备注展开独立保留。直接调用处包括习惯详情、领域详情与统计，需一起核对空留言、无留言打卡、长留言、十条递增及长内容滚动；规则见 [C164](../Design.md#月打卡日志常显留言与更多c164)。

## 基础组件与业务边界

| 组件 | 共享职责 | 场景定制 |
| --- | --- | --- |
| ActionButton／ChoiceButton | 按钮尺寸、外观、反馈和选中态 | appearance／variant、size、width、intent、context、回调 |
| SectionTitle | 同级分组标题字体及可收起标题的触控／箭头 | children／inRow／className；onToggle／expanded／disabled／ariaLabel变体 |
| PageToolbar／CategoryRow | 功能栏顺序与分类布局 | PageToolbar的leading／sort／filter／manage／create；CategoryRow的children／fixedLeading及定位参数 |
| ChoicePopover | 相邻定位、最大高度、滚动及外部关闭 | heading／footer／children、panelWidth、heightMode及业务回调 |
| SortPopover／SortOptions／SortDirection | 排序标题、选项、方向及操作的结构和间距 | 选项数据、当前值、回调、确认名称及内容插槽 |
| SingleLineInput／MarkdownNoteEditor | 输入、焦点、Markdown及图片交互 | 数据、回调及明确的字段选项 |
| ProgressEditorFields | 领域、两个Markdown框及各框独立正负选择的共用结构 | 草稿／onChange、来源状态、账号、禁用、图片容量／忙碌及上框聚焦 |
| DomainRecordContent／MemoReader | 已保存内容的Markdown阅读和图片预览；便签阅读及即时图标／优先度选择 | content／images、inheritTypography、compact、className；便签标题、关闭、修改／重试回调及交互守卫 |
| HabitCard／HabitCalendar／DomainProgressSummary | 同一对象的卡片、日历、摘要 | 对象数据、展示参数与业务回调；HabitCard按C270不显示时段与最近打卡行 |
| TodoTaskCard | 任务行、标记、两行标题、日程及完成状态外观 | task／now、checked／pressed、leading、rootProps、className／contentClassName及动作回调 |
| PomodoroHistory／PomodoroNotifications | 专注历史、删除确认及原微信提醒卡的结构、样式和操作组合 | 原state／owner、setValue／tasks／today或visible；复用原存档队列和通知接口 |
| DomainRecordColumns／Column／Card | 记录双栏、标题、正负记录卡和事件隔离 | 布局variant、标题变体／showHeading、metadata／children、原生属性、样式变量及回调 |

记录选取与排序、账号就绪、保存队列、持久化重试由原页面、适配层与lib负责。基础展示组件不另建业务数据缓存；领域最近记录的十条选取和详情历史范围仍由原业务层决定，HabitCalendar的十条递增仅为C164原留言集合的组件会话显示状态。

专注页按C161与待办／领域共用PageToolbarSummary；计数和最近名称由pomodoro-toolbar-summary从原专注历史投影，页面控制账号及来源就绪。设置使用PageToolbar的manage插槽与共享ManageSymbol，不复制摘要字体或按钮图形；原开始行只由页面预留不可交互空位。

专注第二页按 [C162](../Design.md#专注第二页内容迁入统计c162) 由统计的专注分类组合PomodoroHistory和PomodoroNotifications，继续传入原pomodoro状态及当前账号，不挂第二份存档或保存队列。History以Props接收原setValue、有效待办和本地日期，组合ChoicePopover／SheetActions完成应用内确认，原ID删除基于最新状态并检查本机volatile，失败保持同一目标重试。Notifications接收原state、owner及可见状态，复用共用提醒资格与反馈函数、原接口及逐轮订阅流程；读取和回调核对账号、轮次及异步请求，不启动或推进计时。日期／类型／十条分页、确认及提醒反馈仅为组件会话状态。

## Props、Variants与Composition

Props传递内容、状态和回调，默认值保留当前行为。Variants表达稳定且有语义的差异，使用明确枚举；互斥能力用类型约束。DomainRecordColumns布局variant默认为default，C174最近记录传compact；需要创建能力的DomainRecordColumn必须指定variant='create'、createLabel和onCreate，默认static显示标题。showHeading默认true，C174最近记录传false不渲染标题及占位，不为隐藏标题复制另一套记录栏。

Composition承载场景内容：DomainRecordColumns的children组合两栏，Column的children组合记录和空提示，Card的可选metadata插入场景信息；C174最近记录不传领域metadata，只组合原正文／图片。PageToolbar各动作插槽沿用同一模式。页面不再复制基础组件的节点结构。

TodoTaskCard按C159由同一组件和CSS拥有任务行及标记、标题、日期／时间、今天／逾期、已完成外观。leading接收共享标记节点：四象限组合原完成按钮，专注选择组合只读标记；checked和pressed可表示当前关联，不能在展示组件中写任务状态。rootProps转发原ID及拖动事件；页面保留编辑／完成／选择回调与账号守卫，选择正文阻止冒泡，左侧标记通过原根回调选择一次。选择列表仅覆盖容器、选中背景和标题可用宽度，不复制文字、日程或任务行间距。

ChoicePopover的heightMode默认measured；短设置窗可用content自然撑高，动态反馈放在footer操作下方，减少常驻空白且不短暂压缩正文。最大高度、正文滚动、测量定位及外部关闭继续共享；轮播设置按C156采用此模式。

ChoicePopover按C159将iconOnly且无其他trigger内容的纯箭头也纳入共享居中规则；有文字或图标加箭头的入口保留两端对齐。仍使用同一SelectChevron的展开旋转与占位。

DomainRecordCard转发原生Button属性，包括id、data属性、ariaLabel、disabled、style与onClick，并按C170组合compact的DomainRecordContent。内部先阻止记录点击冒泡，禁用时不调用业务回调；图片预览沿用DomainRecordContent的独立事件。页面回调继续复核最新账号、对象与保存状态。

DomainRecordContent按C158接受只含content／images的记录，inheritTypography默认true保留领域的业务字号和颜色，便签阅读显式false使用原Markdown文字层级；compact默认false，只在C170记录卡中启用，两种变体独立。className允许场景布局。MemoReader以Composition组合ChoicePopover和该阅读组件，窗口不拥有编辑草稿或存储行为；页面从当前账号原notes按ID取记录，并传入关闭及C260图标／优先度修改回调、保存守卫和重试。

## 局部样式与行为定制

className和style用于明确的场景布局或覆盖；优先使用组件公开的变体、插槽及CSS变量。记录组件提供--domain-record-font-size、--domain-record-column-padding、--domain-record-gap、--domain-record-padding，DomainRecentRecords提供--domain-recent-height，主题颜色沿用--domain-positive／--domain-negative等领域变量。快捷背景的--shortcut-color统一由shortcut-color-*设定，卡、预览与颜色点共享；页面只设置容器几何，不另复制六色。变量只设置在需要覆盖的实例或容器，不改动其他调用。

业务回调、创建标题变体、原生无障碍属性及内容插槽提供行为定制。保留组件规定的触控下限、焦点、禁用和事件边界；输入、按钮等已有组件继续采用各自公开的参数，不用页面选择器复制或绕开基础规格。需要新增共用规格时，在组件及本文登记。

## 样式归属与验收

基础样式与响应式规则随组件导入，页面只保留容器布局和插槽内容的样式。领域记录规则集中在components/domain-records.css，编辑器CSS仅负责编辑窗；主列表与详情均引用同一组件实现。C174主列表最近记录的固定容器及内部滚动由DomainRecentRecords拥有，页面提供顶部顺序及可用首屏四行网格；DomainProgressSummary继续统一拥有卡内名称／图标／摘要，不复制一套小卡节点或变更详情默认布局。

C172的十背景／六色集中在components/shortcut-background.css，卡名、卡片边界及右下编辑按钮集中在home-shortcut-card.css；首页仅负责网格、可滚动快捷区和模式，home-shortcut-editor.css仅负责字段／选项排列与弹层。普通、管理、排序和静态预览的共享卡及所有背景／颜色选择均须回归，第二页固定功能目录保持原ShortcutIcon调用，不恢复旧大卡图标和小文案。

HabitCard按C155由components/habit-card.css统一拥有最小高度、内距、触控下限与响应式文字规则；主网格、推荐及领域详情使用内容高度，页面不另设固定卡高或按视口拉伸卡片。C270移除C166的metadata时段与最近打卡行，SectionTitle拥有分区标题样式；页面保留两列、分组、间距、滚动及分页等容器布局，不强制八卡首屏。

SortPopover按C157由components/sort-options.css统一拥有标题、正文及页脚内距，便签／习惯／待办／文章同步引用。选项触控、间距和文字规范由SortOptions／SortDirection拥有，页面只提供选项和原排序状态，不复制窗口布局。

PomodoroHistory／PomodoroNotifications的历史行、筛选布局、确认内容、提醒卡及反馈样式分别由components/pomodoro-history.css和pomodoro-notifications.css拥有，统计页组合原ActivityAnalysis与这两个业务组件。按钮、浮窗及操作栏继续采用共享基础规格，不从番茄页面复制计时或设置样式；番茄页仅负责计时容器和固定40px首屏反馈槽。

修改基础组件后检查全部直接调用场景，包括默认与实际使用的变体、局部覆盖、空内容、长文本、禁用和交互边界；使用相关既有检查，覆盖窄屏、短屏和宽屏。沿用原类型、WXSS、启动及包体预算，不将某一场景通过表述为全部旧页面迁移完成。
