# 中间内容槽组件合同

本文件定义已批准组件在设计 Skill 中的可复用结构、设计 API、状态和响应式行为。它只约束中间内容槽；不定义 Sidebar、Topbar、静态页签、右侧 Agent 或 Composer。

## 使用规则

- 先读取 `content-slot-component-registry.json` 判断成熟度、复用范围和项目实现状态。
- 设计 API 描述组件应暴露的稳定能力，不等同于已经存在同名 Vue props。
- Skill 结构资产使用 `assets/content-slot-component-library.html` 与 `assets/content-template.css`；PM、UI、AI 和研发统一使用 `assets/vue-content-slot-components/` 的 Vue 组件基线。
- Skill 组件不是产品运行依赖。PM 原型可复制组合；研发新增需求先复用项目已有同合同组件，缺失时再将参考实现适配到任务范围内的目标仓库。
- `skill-library-implemented` 只表示设计组件已经写入 Skill。只有注册表同时满足 `projectImplementation: project-shared-vue` 与 `sharedVueComponent: true`，才能宣称项目组件化。

## 通用设计 API

| 字段 | 含义 |
|---|---|
| `tone` | 只接受合同列出的语义色，不接受任意色值 |
| `size` / `density` | 只接受登记枚举，不接受区间值 |
| `loading` / `disabled` | 布尔状态，必须同步交互和可访问语义 |
| `leading` / `trailing` | 通用前后区域；不得转换成业务专属布尔属性 |
| `default` | 主内容区域 |
| `actions` | 操作区域；组件负责布局，页面负责业务动作 |

## Wave 1｜稳定基础组件

### CS-C001 ActionButton

- 用途：触发页面级、区块级或行级动作。
- 结构：可选前置图标 → 单行标签 → 可选加载指示；icon-only 必须有可访问名称和 tooltip。
- 设计 API：`variant=primary|secondary|ghost|danger`；`size=sm|md|lg`；`loading`；`disabled`；`iconOnly`。
- 尺寸：`sm=28px`、`md=36px`、`lg=44px`；圆角固定 `8px`；标签固定 `13px`。
- 状态：default、hover、active、focus、loading、disabled。
- 锁定：一个操作区域最多一个 primary；加载时禁止重复点击；危险动作不得伪装成普通主按钮。
- 反例：页面自建颜色或圆角；用业务名布尔属性决定按钮样式；icon-only 没有名称。

### CS-C002 FormControl

- 用途：输入、选择或编辑筛选和表单值。
- 结构：Label → control → helper/error；普通录入表单显示Label，筛选区按 `filter-placeholder-contract.md` 在框内显示提示并保留隐藏Label。必填同时使用星号和文字语义。
- 设计 API：`kind=text|search|number|select|date|textarea`；`size=compact|default`；`invalid`；`disabled`；`readonly`；`required`；`labelLayout=stacked|placeholder`（FilterBar内默认placeholder，普通表单默认stacked）。
- 尺寸：普通场景 `36px`；仅明确保留的旧密集 TableToolbar 使用 `28px`，当前查询/筛选区统一 `36px`；圆角 `8px`。
- 状态：default、hover、focus、filled、invalid、disabled、readonly。
- 响应式：控件宽度跟随网格；字段标签不因操作区挤压而消失。
- 锁定：placeholder不能替代程序化label，筛选区按框内提示合同隐藏可见外部label；错误文案说明如何修正；焦点使用共享 focus ring。
- 反例：任意高度；以红框作为唯一错误提示；只在 hover 才显示字段名。

### CS-C003 StatusTag

- 用途：表达记录或任务的语义状态。
- 结构：语义圆点 → 状态文本；按内容自然宽度。
- 设计 API：`tone=success|warning|danger|info|primary|neutral`；可选 `ariaLabel`。
- 状态：六种语义 tone；不设置交互 hover。
- 锁定：`4px` 视觉圆角合同；同一业务状态全站同色同文案；不能只靠颜色表达。
- 反例：被 `td span` 等宽泛选择器撑满；同一“处理中”在不同页面使用不同颜色。

### CS-C005 ContentTabs

- 用途：切换同一数据任务的稳定视图。
- 结构：`tablist` → tab → 对应 `tabpanel`。
- 设计 API：`items`；`modelValue`；`disabledKeys`；可选 `count`。
- 状态：default、hover、focus、selected、disabled。
- 交互：方向键移动焦点；Enter/Space 激活；`aria-selected` 与 panel 同步。
- 响应式：内容槽变窄时横向滚动，不压缩文字；不换成壳层静态页签样式。
- 锁定：选中态为主色文字和底部 `2px` 指示线，不使用胶囊底。
- 反例：只有静态高亮没有内容切换；模仿 Topbar 静态页签。

### CS-C010 FeedbackState

- 用途：替换正常内容区域，表达加载、空、筛选为空、错误、无权限或过期。
- 结构：状态图形/进度 → 标题 → 解释 → 最多一个恢复动作。
- 设计 API：`state=loading|empty|filtered-empty|error|no-permission|stale`；`title`；`description`；可选 `action`。
- 状态文案：必须按具体状态区分；loading 不显示“暂无数据”，error 不伪造空数据。
- 可访问性：loading 使用 `aria-live=polite`；错误恢复结果可被读屏获知；装饰图形隐藏。
- 锁定：一个相关恢复动作；最小高度 `160px`；不替代非阻断式 FeedbackNotice。
- 反例：所有状态统一写“暂无数据”；错误时仍绘制假图表或假表格。

## Wave 2｜内容组合组件

### CS-B001 ContentPageHeader

- 用途：所有独立内容页左上角唯一的页面级标题组件，用于识别当前页面并承载页面级说明、状态和操作；不得用页面私有标题结构替代。
- 结构：Header → Heading（固定 icon + 唯一 `h1` 主标题行 + optional subtitle + optional meta）→ optional Actions。副标题从 Heading 左边线开始，不缩进到标题文字起点。
- 设计 API：必填 `title`；可选 `description`、`meta`、`status`；`actions` slot。组件负责标题语义、默认视觉和响应式，页面只提供内容与业务动作；组件自身 `margin-block:0`，到首业务块的 `16px` 由唯一 PageFlow owner 产生。
- 标题标记：固定 `18×18px`、`6px` 圆角、`1px` `--color-primary-border` 边框、`--color-primary-subtle` 背景、内嵌 `5px` surface；与标题间距 `8px`。它是统一项目装饰，不传达状态，使用 CSS 伪元素并从无障碍树隐藏。
- 排版：标题 `19px/1.35/700`；副标题 `12px/1.65`；icon 与标题 `8px`；标题与副标题 `3px`；到首业务区块固定 `16px`。
- 响应式：空间不足时 Actions 整组换到下一行左对齐；标题不被压成竖排。
- 锁定：每个独立中间内容槽页面左上角必须渲染且只能渲染一个 ContentPageHeader，其中页面名称是全页唯一的 `h1`；PageHeader 或 PageFlow 只能有一个间距所有者。详情、创建、设置、列表、看板、WIP、AI 动态报告均不得省略。
- 模块标题：页面内部允许按任务出现多个模块标题。卡片、KPI 分组、图表、表格、筛选、步骤区等使用 `SectionHeader` 和语义化 `h2`/`h3`，不复用 ContentPageHeader、不显示其固定项目前缀，也不创建第二个 `h1`。Modal 与 Drawer 使用自身标题语义。
- 共用实现：PM/AI 页面必须优先复用 Skill 中的 `ContentPageHeader.vue`；研发需求优先复用项目中已验证的映射组件，缺失时按此合同实现。在项目核验前继续保持 `sharedVueComponent:false`。
- 现有样式映射：目标项目已有且验证通过的共享组件及其已确认消费者优先于页面截图和 legacy `.page-title`。新消费者不得复制 DOM、重写 marker/字号/行高/间距或通过单页 CSS 修正；只有经确认的共享组件级变更才允许改变全部消费者。
- 反例：左上角缺少页面标题；用 `div.page-title` 代替页面 `h1`；给图表或卡片重复使用 ContentPageHeader；模块标题使用第二个 `h1`；复制私有页头 DOM；重复 margin 产生 `32px`；按钮挤压标题；把告警写进标题字符串。

### CS-B006 SectionHeader

- 用途：标识页面内部可重复的一级业务模块，例如“关键经营链路”“GMV 结构拆解”“核心趋势速览”；它不是页面标题，可在同页出现多次。
- 结构：SectionHeader → Heading（固定 marker + `h2` title + optional badge + optional description）→ optional Meta / Actions。
- 设计 API：必填 `title`；可选 `badge`、`description`、`meta`；`actions` slot；`headingLevel` 默认且通常固定为 `2`，只有真实语义嵌套时才允许 `3`。
- 标题标记：固定 `4×18px` 主色竖标，圆角 `4px`，外侧 `3px` 主色浅环；与标题间距 `8px`。它只表达模块层级，不允许按业务换色。
- 排版：标题 `16px/1.4/700`；可选描述 `12px/1.5`；badge 使用 StatusTag/轻量标签，不能改变标题行高。
- 右侧区域：口径、范围、时间、说明放 `meta`；“问 AI”、查看详情、筛选等放 `actions`。同一模块只保留任务需要的内容，不用空槽占位。
- 响应式：标题组是左侧锚点；内容不足时右侧 Meta/Actions 整组换到下一行并左对齐，标题和右侧文字均不得被压成竖排。
- 间距：SectionHeader 属于所在 SectionCard/ChartPanel/ListSurface 内部，由父容器 padding 定位；到模块 Body 固定 `16px`，不得自行产生页面级外边距。
- 状态与无障碍：标题保持可读；badge、meta 和操作不拼进标题字符串；装饰 marker 从无障碍树隐藏。
- 共用实现：PM/AI 页面优先复用 Skill 中的 `SectionHeader.vue`；研发按“项目已有映射优先、缺失再适配”的规则实施。当前 `skillVueComponent:true`、`sharedVueComponent:false`，两项状态不能互相替代。
- 反例：模块使用第二个 `h1`；复制 ContentPageHeader；每个模块自建不同竖线/圆点；用颜色区分业务域；右侧说明挤压标题；卡片内部每个小分组都重复重型 SectionHeader。

### SubsectionHeading｜轻量样式合同，暂不单独组件化

- 用途：Section 内部的局部分组，例如“分业务”“分平台”、图表内部分类或表格小分区。
- 语义与视觉：使用 `h3`，`14px/1.4/600`，主文字色；无竖标、无背景、无独立卡片。
- 组合：可带一行 `12px` 次要说明或简短数值，但不承载复杂操作组。
- 判断：只有当未来出现两个以上消费者且需要一致的右侧交互、状态或响应式 API 时，才评估升级为组件。
- 反例：为了视觉“统一”把每个局部标签都做成带竖线的 SectionHeader。

### CS-B002 MetricGrid / MetricCard

- 用途：展示一组可比较的摘要指标。
- 结构：MetricGrid → MetricCard（label → value/unit → meta/trend）。
- 设计 API：Grid `columns=auto|2|3|4`；Card `value`、`label`、可选 `unit`、`meta`、`trend`、`state`；交互型另用 `pressed` 与筛选合同。
- 状态：loading、value、zero、missing、stale、error；零值不得等同 missing。
- 尺寸：卡间距固定 `14px`；普通值 `24px`，唯一首要值才可 `30px`；等宽等高。
- 响应式：`>=1040` 四列，`720–1039` 两列，`<720` 一列；按内容槽宽度判断。
- 锁定：顶部 KPI 使用覆盖整张卡片的蓝、青、靛、紫四色极浅线性渐变并按顺序循环，渐变自然过渡至白色；不得叠加角落半圆、扇形、光斑或其他装饰伪元素。卡片内部二级统计使用白底；业务单位不得造成错位。
- 反例：`isGmv` 等业务开关；把 missing 显示为 0；每页自建 KPI class 方言；从旧页面保留 `.kpi-card::after` 等角落装饰，导致同一组件出现两套外观。

### CS-B003 SectionCard

- 用途：组织一个完整业务区块。
- 结构：Header（title/description + actions）→ Body → optional Footer。
- 设计 API：`size=compact|default`；`title`；可选 `description`；`actions`、`default`、`footer` slots。
- 尺寸：compact/data card 圆角 `8px`；large section 圆角 `12px`；默认 padding `20px`，compact `16px`。
- 状态：default、loading、empty、error、disabled；反馈状态进入 Body，不覆盖 Header 语义。
- 响应式：操作组不足时整组换行；同一 grid 行卡片等高顶对齐。
- 锁定：不允许无意义卡片套卡片；业务差异通过 slot/composition，不通过 Common 业务布尔属性。
- 反例：通用 Card 内包含 `isTraffic`；标题被右侧筛选器挤成多列竖排。

### CS-C007 FilterBar

- 用途：筛选一个明确数据集。
- 结构：Fields → optional advanced fields → condition summary → Query/Reset actions。
- 设计 API：`fields`/default slot；`expanded`；`dirty`；`loading`；`disabled`；事件 `query`、`reset`、`update`。
- 密度：当前查询/筛选区控件及查询/重置按钮统一 `36px`；28px仅保留明确独立的旧密集工具栏，不作为新增筛选页默认值；到 ListSurface 固定 `12px`。
- 状态：default、dirty、loading、disabled、validation-error、collapsed。
- 响应式：`>=1040` 四列，`720–1039` 两列，`<720` 一列；长日期范围可以跨两列。
- 业务合同：明确条件组合、清除行为和数据作用域；任一筛选变化使分页回到第 1 页。
- 反例：把页面主操作、行操作和筛选混成一行；收起高级筛选时清空值。

### CS-C006 ListSurface

- 用途：让 Tabs/TableToolbar、DataTable 与 Pagination 成为连续数据表面。
- 结构：optional Tabs → optional Toolbar → Data region → optional Pagination。
- 设计 API：`tabs`、`toolbar`、`default`、`pagination` slots；`state`。
- 状态：loading、data、empty、error、no-permission；非 data 状态由 FeedbackState 占据 Data region。
- 布局：内部相邻间距 `0`，使用 `1px` border 分层；圆角 `12px`；横向滚动只在 Data region。
- 锁定：操作列始终可达；Pagination 与数据属于同一表面；不通过 min-height 撑满视口。
- 反例：Tabs、表格、分页拆成三张卡；让整个页面横向滚动。

### CS-C008 DataTable

- 用途：扫描、比较并操作结构化记录。
- 结构：caption/accessible name → thead → tbody；可选 selection 与 actions columns。
- 设计 API：`columns`；`rows`；`rowKey`；`density=compact|default|comfy|two-line`；`loading`；排序/选择事件按需启用。
- 行高闭集：表头 `40px`；compact `40px`；default `48px`；comfy `56px`；two-line `64px`。
- 对齐：文本左对齐，数值右对齐，操作列右对齐；同一表不得混用行高。
- 状态：loading、data、empty、error、no-permission、partial-data。
- 响应式：表格容器内部滚动；冻结列必须有边界阴影且不遮挡操作。
- 反例：`40–44px` 区间值；页面级 overflow-x；宽泛 `td span` 破坏 StatusTag。

### CS-C009 Pagination

- 用途：在有界记录集合中导航，同时保留筛选和数量上下文。
- 结构：total/page-size summary → previous → page items → next。
- 设计 API：`page`；`pageSize`；`total`；`pageSizes`；`loading`；事件 `update:page`、`update:pageSize`。
- 状态：first-page、middle-page、last-page、disabled、loading。
- 可访问性：当前页使用 `aria-current=page`；上一页/下一页有完整名称；禁用态不可聚焦触发。
- 锁定：筛选、KPI、状态或时间范围变化统一回到第 1 页；无数据时不显示无意义页码。
- 反例：筛选后保留超出范围的页码；分页脱离 ListSurface 漂浮。

## Wave 3｜图表与时间

### CS-B004 ChartPanel

- 用途：为图表提供标题、数据范围、图例、绘图区和反馈状态。
- 结构：Header（title/description + scope/actions）→ Legend optional → Plot → FeedbackState overlay/replacement。
- 设计 API：`title`；可选 `description`、`scopeLabel`；`legend`、`actions`、`default` slots；`state`。
- 状态：loading、data、empty、error、stale；非 data 状态不得绘制假数据。
- 生命周期：挂载后初始化；数据/容器宽度变化后 resize；销毁时 dispose；Agent 开合和侧栏变化均触发容器测量。
- 响应式：Plot `min-width:0`；图例可换行；操作组空间不足时换行但不压缩标题。
- 锁定：使用统一图表 token；标题和数据口径始终可见；图表业务 option 留给消费者。
- 反例：把所有业务 option 塞进通用壳；仅监听 viewport resize；用彩虹默认色。

### CS-B005 TimeRangeFilter

- 用途：修改当前数据作用域的时间周期。
- 结构：可访问 Label → preset/segmented control 或 date range → optional timezone/meta。
- 设计 API：`mode=preset|date-range`；`value`；`options`；`min`；`max`；`timezone`；`loading`；`disabled`。
- 状态：default、hover、focus、selected、disabled、loading、invalid-range。
- 业务合同：消费者明确包含关系、时区、日期边界、最大跨度和未来日期规则；变化后相关分页回到第 1 页。
- 尺寸：默认控件 `36px`；图表 Header 空间不足时整组换行，不允许压扁标题。
- 锁定：可见或可访问 Label；选中项高对比；不能只因外观相同就复用不同时间语义。
- 反例：把“近 7 天”在不同页面解释成不同边界；无时区合同；时间改变但图表范围标签不更新。

## 组合关系

```text
ContentPageHeader
└─ PageFlow
   ├─ MetricGrid → MetricCard
   ├─ SectionCard → ChartPanel + TimeRangeFilter
   └─ FilterBar
      └─ ListSurface
         ├─ ContentTabs
         ├─ DataTable → StatusTag / ActionButton
         ├─ FeedbackState
         └─ Pagination
```

FormControl 与 ActionButton 是 FilterBar、SectionCard 和页面表单的基础依赖。FeedbackState 替换正常内容区；FeedbackNotice 只补充不阻断正常内容的上下文，两者不能互换。
