# 共用间距约定

2026-11-07 手机网页：`web/shared-app/mobile-layout.css`统一拥有≤899px工作区、列表、卡片字号和弹窗适配，不在小程序页面补浏览器样式。顶部工具导航固定单行横滑，导航按钮44px且当前入口自动可见。手机便签单列，600px起两列；任务14px、便签标题16px／正文14px／元信息12px。空时段区域112px，实际列表仍独立滚动。自动保存编辑器读取真实浏览器可见高度，最高720px并留32px上方空间，不再把72%乘以已扣掉顶栏的工作区高度，避免横屏正文零高；24px正文边界与16px底部留白仍沿共用组件。桌面和微信原生几何不变。软键盘真实设备表现需另做真机验收。

手机习惯的时段／自由／提醒都是有界子列表，不分别预留整页FAB空间，局部将共用`--floating-create-clearance`设为0，仍保留CardGroupContent的16px内距；没有局部创建按钮的子列表不应重复叠加全屏避让。滚到底的验收需测实际末卡与子列表可视区域交集，不能仅检查scrollTop发生变化。

2026-11-07象限显示：四位置共用44px标签列、12px列gap、44px行高，来源列伸展到末尾箭头，长名省略但aria保留全文；容器保持16px水平边界，不加逐行方框。候选优先级／分类分组的折叠通过原ChoicePopover contentKey重新测量高度，不嵌套新滚动层。主队列工具区为40px移出和末尾40px唯一手柄，当前整行背景包含工具区。

2026-11-05：休息建议的网格内距由滚动内容View拥有，刷新按钮独立放在SheetActions，底部至少16px；网页固定窗口的max-height用真实100dvh，不能使用经过小程序构建转换的页面内容高度。习惯详情复用compact-editor的24px边界与680px上限，CalendarMonthView拥有日期格几何，页面不再各复制一套日历间距。网页≤899px宽且≤600px高时，习惯主列表与提醒并排独立滚动，避免固定提醒把主列表挤到零高度；不缩小操作触控区。

新增或调整界面优先复用现有容器，不为每个页面复制 padding。

- 卡片组：`CardGroupContent` 与 `card-group-heading` 共用 `--card-group-inset=16px`。容器可以没有边框或背景，但内部安全距离始终存在。ScrollView 内放容器，不向原生 ScrollView 加 padding，不用负边距扩宽列表。
- 分类、领域、显示队列等选项窗：复用 `entity-choice-body`，左右及底部16px，由内容的 padding 拥有；列表本身 margin 为0。这样 ChoicePopover 测量的高度包含底部留白，不会把最后一行贴到外框上。
- 任务、便签、记录等简洁编辑器：沿 `compact-editor.css` 的24px边界。标题、备注、附件和操作区保持一致，不在输入组件里再叠加一层缩进。
- 日期格：数字圆圈尺寸稳定，农历／节日与圆圈固定4px间隔；时间标签绝对定位，不挤动日期文字。
- 小型选择窗：定位只由 ChoicePopover 拥有；按钮触发优先向下、左侧对齐，空间不足自动翻转或限高。不要在页面中复制定位计算。

验收沿 `miniprogram/scripts/check-layout-spacing.cjs`：检查选项窗内容左右和底部16px，并在滚动到底时检查最后一组与外框至少15px（包含边线取整）。此断言同时用于小程序浏览器适配和网页生产镜像检查。`--controls-refinement` 四尺寸还验证卡组内距、日历间距和选中前后位置。视觉检查不能替代原生微信／真机验收。

2026-11-04 修复：EditorHeading／PopoverHeading 共用16px顶部内距与40px标题内容下限，标题仍居中；右侧操作区使用上下边界对齐，不用transform，避免嵌套ChoicePopover的fixed层被缩进标题按钮并裁切。无标题操作菜单保持原内距。分类勾号放在选项按钮内部，与名称共用选中背景及按钮右内距；领域选项沿同一选中色变量。

2026-11-04显示队列：主列表与末行“添加”共用entity-choice-options大框，当前行背景包含手柄区域，不改成逐项小框。四位置编辑列表用16px左右内距、0行间gap、每行至少40px，位置名600字重／正文色，选择入口相隔12px；四行同用来源真实旗帜色或分类LibraryIcon。队列滚动复用ChoicePopover已有ScrollView（bodyScroll仅提供ID／位置／回调），不嵌套新的滚动层。

2026-11-04领域最近记录：复用DomainRecentRecords拥有16px对称水平内距，内部DomainRecordColumn负责分割线两侧等距，空栏和实际记录同起点；不要为页面单独加偏移。网页专注反馈槽恒定40px，空、同步、失败状态都不改变番茄与按钮几何，长内容在槽内滚动并保留重试。

### 2026-11-07 网页手机尺寸归属

≤899px工具内容适配由web/shared-app/mobile-layout.css单一拥有，并在工具样式末尾接入；网站顶栏局部几何仍由site-header.module.css拥有，网页外壳可用高度由tool-workspace.css与shell.jsx宿主测量拥有。手机不再缩小--app-unit，保持.5px及既有40px控件；原生与桌面不受此断点影响。视口高度变量--browser-viewport-height只由网页视口resize事件更新，--app-page-height只由原ResizeObserver更新，避免内容反馈环。24px编辑内距、来源图标槽及ChoicePopover定位仍由原组件拥有，勿逐页复制覆盖。手机几何待Windows及真实软键盘QA。
