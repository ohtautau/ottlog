# 共用间距约定

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
