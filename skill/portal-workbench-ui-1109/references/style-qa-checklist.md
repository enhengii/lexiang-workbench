# 联想门户工作台样式准确度自检清单

交付前逐项检查。只要有一项失败，先修正再交付。

## 目录

1. 来源检查
2. 布局检查
3. Token 检查
4. 组件与状态检查
5. 验证与交付检查

## 来源检查

- 已读取当前页面源码或目标页面附近的实现。
- 已读取当前 0825 Vue 项目源码、`src/assets/workbench*.css`、目标组件 / store / composable / adapter 中相关 token、组件样式和交互逻辑。
- 已读取根目录 `SKILL.md` 和本次相关 reference。
- 页面或路由任务已读取 `page-spec-coverage-matrix.md`；响应式任务已读取 `responsive-layout-contract.md`。
- 如涉及左导航、静态页签、Topbar AI 结果选择器、中间 AI 结果视图、AI 输入队列、等待态或报告展开，已读取当前交互合同 `references/workbench-interactions.md`。
- 没有用记忆中的旧样式替代当前源码。
- 新增或迁移 Vue 组件时，组件专属样式已放入对应 `.vue` 文件的 `<style lang="scss" scoped>`；全局 CSS 只保留 token、基础通用 class、共享壳层合同和 legacy 过渡样式。
- 如果本次是外部 POC / 历史功能合入，已确认只更新当前 0825 Vue 项目，没有修改 0729 及其他历史版本目录。
- 如果本次是外部 POC / 历史功能合入，已做文件级对比，没有整包覆盖当前 `vue-app`、`src/assets` 或 `public/admin-runtime`。
- 如果本次是 PM 新 POC / 新需求，必须以上一个已确认项目版本为底座；项目目录名可随迭代更新，不得把 `0703` 这类日期命名当成永久固定底座。最终实现必须落到 Vue 源码，不引入独立 HTML/JS，不整包覆盖当前项目。
- `portal-workbench-ui-0908` 是本归档中 PM、UI 与研发共用的唯一规范，用于约束新增需求，或明确提出的既有功能优化/修改需求的设计和实现一致性。允许改动已确认项目的功能、设计、交互、样式、布局、路由或壳层规则，但必须明确标注为有意变更，并说明范围和影响。
- PM 使用设计 skill 输出新 POC / 新需求时，AI 已先分析并经确认：本次新增了什么、本次优化或修改了什么已有功能、哪些已确认内容会被影响、哪些页面/功能/交互/样式/架构不应改动、是否存在需要明确标注的有意变更。未经确认不得直接开始改源码。
- PM POC 合入只允许改新增或明确变更范围；未被用户点名的封版壳层、共享组件、已确认页面样式不得被顺手重写。
- 不得在现有样式栈之后新增全局 CSS import 或晚于壳层 override 的全局覆盖；如确需新增，必须列出影响 selector、原因和回归结果。
- 不得重新创建、复制或 import 未登记的 `src/assets/ui-*-design-skill.css` 或任何 `*design-skill*.css`；这类文件不能作为“套用设计 skill”的运行时捷径。若未来需要共享 CSS 对照文件，必须在目标项目的显式允许清单中登记文件名、说明影响 selector，并通过已确认样式回归。
- 如项目提供 `pnpm guard:design-skill`，先运行该检查；guard 只检查全局 CSS、封板组件和规则冲突，不得依赖项目/Skill 指纹、目录名或个人本机路径。warning 不直接等于失败，但继续新增需求前必须确认污染风险。
- 封板组件保护区未被影响：顶部、左侧栏与收起按钮、左上品牌区、右侧 Agent、Agent composer、账号入口、静态页签、Topbar AI 结果选择器与中间结果视图、共享按钮/卡片/表格/表单控件，除非用户明确要求修改，否则 DOM、selector、尺寸、间距、颜色、状态和响应式行为都不得改变。当前 0707 左上品牌区封板为：展开态只显示红色 `联想乐享` 完整 logo，不显示 `工作台` 胶囊；完整 logo 约 `112x23px`，展开按钮 `28x28px` 且与 logo lockup 约 `3px` 间距；收起态 icon mark `36x36px`、rail handle `24x24px`。
- 每次 PM POC 合入必须回归已确认样式面：顶部、左侧收起按钮、右侧 Agent header、Agent composer、账号入口、静态页签、Topbar AI 结果选择器与中间结果视图，以及被 POC 触及的共享按钮/卡片/表格。
- 最终交付前目录结构必须与 PM 源码包保持一致；`pnpm build` 过程中生成的项目根级 `public/admin-vue` 只作为临时验证产物，归档或返给 PM 前必须删除，除非用户明确要求同时交付部署产物。不要删除 `vue-app/public`。

## 布局检查

- 页面仍是联想门户工作台三栏/工作台结构，不像通用模板或营销页。
- 左侧导航宽度、收起态、导航间距与当前项目一致。
- 顶部栏高度、面包屑、右侧操作区与当前项目一致。
- 左侧导航自动收起阈值、自动展开阈值和手动展开保持规则符合当前 0825 Vue 交互：`<=1320px` 收起、`>=1480px` 展开、手动展开后直到 resize 前不自动打回；窄屏初始加载也要执行同一判断，`1280px` 验收时侧栏应为 `58px` 且页面横向溢出为 `0`。
- 缩屏裁切顺序一致：普通导航页、AI 结果视图、Skill 创建 / 需求澄清页、权限管理页都先压缩中间内容槽，再收起导航，最后才约束右侧 Agent 区；页面内部不得先裁掉内容槽。开始裁 Agent 区后，中间内容槽宽度和结构应保持稳定。
- 复杂页面的 grid/flex 子项已设置 `min-width:0`，主工作区使用 `minmax(0,1fr)` 或等价弹性写法，没有 `minmax(640px/720px,1fr)` 这类导致中间槽提前溢出的刚性列宽。
- 内容槽列数由真实 `contentInnerWidth` 决定：筛选 `>=1040px` 四列、`720–1039px` 两列、`<720px` 一列；没有把 `1320/1480px` 壳层阈值复制成页面断点。
- 大屏内容槽仍 `width:100%` 流式伸缩，四列使用 `minmax(0,1fr)`；不存在 `920/620px` 平行通用断点，专项页型只使用 `responsive-layout-contract.md` 登记的局部阈值。
- 当前页面 VA 状态必须能在 `page-visual-acceptance.json` 找到对应登记：VA-0 不得附旧截图或伪造当前证据；VA-R1 及以上必须记录 profile、测量、剩余状态和可移植 `evidenceRef`；VA-FAIL / VA-BLOCKED 不得为了全绿而删除。
- 视觉复核后运行 `scripts/check-consistency.mjs`，确认矩阵状态、项目路由和证据登记一致；历史截图不得重新打包进当前 Skill。
- Container Query 位于页面 padding 内层且自身无水平 padding；实测 `contentInnerWidth` 与查询容器 content box 对齐，断点未因外层 padding 提前触发。
- 已检查 `.page-content` 与路由页面根的 computed padding：标准 `20px 24px` 只出现一次；若 Shell 已拥有该 padding，页面根为 `padding:0`。PageHeader、首业务块与已确认现有页面共享同一内容起始线，没有额外 `24px` 内缩或 `20px` 顶部空带。
- 静态页签与面包屑合并；静态页签超宽时 active 标签可滚入可视区域。
- 静态页签与 AI 结果管理分离；Topbar 只保留单一 AI 结果选择器，不存在第二排动态页签。选择器默认文案、结果数、精简标题、当前态和下拉列表符合当前 0825 Vue 规则。
- 右侧 AI 助手没有被重做成独立聊天产品。
- 页面内容没有过度留白，信息密度符合后台工具。
- 所有页型的 PageHeader 到第一个业务区块实测为 `16px`；看板 KPI、Skill 创建、表单和列表没有各自覆盖该距离，也不存在 PageHeader `margin-bottom`、父容器 `gap`、首区块 `margin-top` 中两项或三项叠加。
- 每个独立中间内容槽页面左上角恰好有一个共享 `ContentPageHeader`，其页面名称是全页唯一 `h1`；固定项目前缀、标题排版与右侧操作没有被页面私有结构覆盖。模块标题使用 `SectionHeader` 与 `h2`/`h3`；Modal、Drawer 和嵌套 Card 不误用页面标题组件。
- 已在相同 `contentInnerWidth` 下与一个已确认现有消费者比对 ContentPageHeader：固定 `18×18px` icon、icon/主标题行、`19px/1.35/700` 主标题、`12px/1.65` 副标题、`8px` icon/标题间距、`3px` 标题/副标题间距和操作对齐一致；副标题从组件左边线开始，不存在 legacy `.page-title` 复制或 page-scoped 标题覆盖。
- 页面内一级模块统一使用 SectionHeader 的 `4×18px` 主色竖标和 16px `h2`；badge、meta、actions 对齐且可整体换行。模块内小分组使用 14px `h3` 且不重复竖标。
- 新增内容槽页面存在唯一 PageFlow；检查相邻块的 `getBoundingClientRect()`，记录 `from/to/expected/actual`。任何未解释的 `>24px` 空带、低于矩阵值的塌陷或超过 `1px` 的误差均不得通过。
- 带摘要列表使用 `SummaryList`/`ListWorkspace`；FilterBar 到 ListSurface 为 `12px`，ListSurface 内 Tabs/Toolbar、Table、Pagination 之间不出现画布背景带。
- PageFlow/ListWorkspace 直接子项的遗留 `margin-block` 已归零；实测 `12px` 不包含额外 `.card { margin-bottom:* }`，没有形成 `28px` 等叠加间距。
- 标准列表组件按内容自然高度渲染，没有为了填满屏幕而设置固定/计算高度、`min-height:100%` 或 `flex:1`。
- 筛选区、KPI、表格、图表的边界对齐。

## Token 检查

- 主色使用 `#3370ff` 或 `--primary`。
- 背景、卡片、边框、文字颜色来自现有变量。
- 没有新增一套同义颜色变量。
- 没有大面积高饱和渐变、深色科技风或红色分类背景。
- 当前页面保持强制浅色，没有历史深色状态残留；同时使用语义 token，避免阻断未来主题能力。
- 新增/修改的 Vue/CSS/SCSS 文件逐个传给 `check-consistency.mjs --changed-file`；硬编码颜色、非登记间距、闭集外圆角和字号直接失败。
- `--guard-all` 只用于存量审计并输出 NOTICE，不能把历史差异一次性变成发布阻塞，也不能作为视觉通过证据。

## 组件检查

- 按钮复用现有 `.btn` 系列语法或保持同样尺寸、圆角、状态。
- 卡片为白底、细边框、轻阴影 hover，没有卡片套卡片。
- 表格字号、表头、行 hover、分页、行内操作与当前项目一致。
- Tabs 使用稳定 `.active` class 和主色选中态。
- 状态标签为浅底 + 实色文字，颜色语义一致。
- 表格副文本使用专用语义 class；状态标签保持内容宽度，没有被宽泛单元格后代选择器拉伸或继承副文本间距。
- 表单控件高度、圆角、focus 外环一致。

## 交互和状态检查

- hover、active、disabled、focus、loading、error 至少有可识别表现。
- AI 开关、面板关闭、快捷问题、输入区等已有交互没有丢失；点击面板头部“收起 AI 助手”后，`body.ai-open` 移除、右侧面板宽度回到 `0px`，且页面无横向滚动。
- 顶部样式必须与 0703 基线一致：`.topbar`、`.static-tabs`、`.topbar-right`、`#ai-toggle-btn`、`.ai-panel-header`、`.ai-icon-action`、`.sidebar-collapse-btn` 的实际计算样式不得被 PM POC 的新增 CSS 覆盖成另一套视觉。
- Agent 收起 / 展开必须稳定：打开态宽度约 `380px`，收起态宽度和 flex-basis 都为 `0`，隐藏面板 `pointer-events:none`，再次点击顶部 AI 入口后恢复打开态；过程中页面 `scrollWidth === clientWidth`。
- AI 页面巡检、门户首页和本地 preview mock 没有被 POC 合入误删；当前 0825 Vue 顶部全局搜索默认隐藏，但依赖 DOM 没有被误删。
- AI 底部标签默认无选中项；点击后才高亮，查询标签会发送 query，功能标签会打开对应弹窗/页面。
- AI 底部标签在收起、展开、窄屏和 resize 后仍是横向 pill + 左右圆形箭头，不退化为 select。
- AI 输入框默认 36px，输入增多时最多增长到 3 行并内部滚动；发送按钮只有一个 icon，几何尺寸不随主题能力变化。
- AI 底部 composer 必须是一个整体输入组合件：标签 rail 与输入行共用同一圆角容器，只允许轻量内部分割；不得拆成两个独立描边盒、普通线框 textarea、或多层边框堆叠。截图级反例是“标签行一块、输入框一块、hint 又形成一层”的表单化样式。
- Composer 浅色默认态中，外层/标签 rail 为浅灰 `--color-surface-subtle`，可编辑输入行为白色 `--color-surface`，placeholder 为三级文字色；不得让默认 textarea 看起来像 disabled。聚焦时外层出现主色描边和 focus ring，空输入只灰化发送按钮，Agent 回答中 textarea 仍可编辑。
- 如果本次改动触及右侧 Agent、全局 CSS、壳层布局或 PM POC 合入，必须实测 Agent 打开/收起、标签横向滚动、textarea 输入增高、空输入禁用发送、回答中停止/排队状态；Agent 打开时页面级 `scrollWidth` 不得大于 `clientWidth`。
- 日期范围、筛选按钮、顶部操作按钮不换行、不溢出。
- 文字在按钮、标签、卡片、表格单元格中不截断关键业务信息。
- API Key / Token 等敏感内容默认掩码。
- AI 长报告、外链和 HTML 预览都通过 Topbar AI 结果选择器激活并在中间内容槽打开，没有新窗口跳转或第二排页签。
- 静态页签和当前会话 AI 结果各自最多 10 个；超过上限时按打开顺序关闭最早的同类对象并给轻提示。
- Agent 回答中输入框保持可输入；再次发送进入队列，队列在输入框上方独立展示。
- 输入为空且 Agent 正在回答时，发送按钮切换为停止按钮；停止后能继续处理下一条排队消息。
- AI 等待态不是 assistant 气泡；背景、边框、圆角、阴影均已清空，只保留一行文字、状态点和三点动效。
- AI 会话状态体系已覆盖 `thinking`、`tool_call`、`tool_result`、`follow_up`、`confirm`、`streaming`、`error`；状态卡片不混同普通 assistant 气泡，图标为统一线性 SVG，不能用字符符号兜底。
- 工具调用、工具结果、追问、待确认、失败/兜底状态在右侧 AI 助手和 Skill 创建 / 需求澄清中都有可见 UI。
- AI 队列和停止态可稳定验证：回答中再次发送出现独立排队列表；单条停止显示 `回答已停止` 或等价状态；队列清空后没有 `running` / `pending` 残留。
- 历史会话删除有行内二次确认或撤销机制；空历史态包含标题、原因和下一步，不只是一句弱提示。
- Skill 创建 / 需求澄清底部顺序正确：辅助标签在输入框上面，输入框在流程按钮上面。
- Skill 创建 / 需求澄清输入行中附件按钮、textarea、发送按钮高度对齐，当前基准为 `38px`。
- Skill 创建 / 需求澄清的 `上一步` / `下一步` 独立成流程按钮行，下一步为主按钮，不换行、不被标签或输入框挤压。
- Skill 创建 / 需求澄清主展示区优先占用剩余高度，对话区和澄清结论区内部滚动，底部控件不遮挡内容。
- Skill 创建全部 5 个步骤和权限管理步骤页都采用“内容 body 独立滚动 + 底部操作栏固定”的模型；底部主次操作组统一靠右，滚动内容时按钮位置不变。
- 普通弹窗必须同时验收短内容和长内容：当 `scrollHeight <= clientHeight` 时，Footer 在普通文档流中且没有上浮阴影；当 `scrollHeight > clientHeight` 时才允许吸底，仍有下方内容时显示轻阴影，滚动到底后阴影消失并保留细分隔线。
- 切换弹窗 Tab、展开校验错误、加载异步内容和改变视口高度后，溢出与 Footer 状态会重新计算；不得残留永久 sticky class、用固定最小高度制造滚动，或让 Footer 遮挡最后一项内容。
- 权限管理内容页与 Skill 创建保持同一内容槽密度、字号、卡片边界、背景渐变和窄屏裁切行为；不能引入独立 POC 样式体系。
- 权限管理和 Skill 创建 step tabs 使用直接数字文本，不混用圆形数字 badge。
- 权限管理桌面结构与 Skill 创建保持一致的 `220–300px` 左栏 + 弹性右栏，`1280px` 下仍为左右结构、列间距 `16px`、页面横向溢出为 `0`；模块总数、分组数量、组间分隔和当前项均可识别。
- 权限模块切换一次点击即更新当前项视觉与 `aria-current="page"`，不存在第二次点击才高亮或内容与选中态不同步。

## 防跑偏检查

- 看起来不像 Ant Design 默认后台。
- 看起来不像 shadcn 默认卡片页。
- 看起来不像营销 landing page。
- 看起来不像历史 `240px` 侧栏旧 demo。
- 看起来不像新建的独立 AI 聊天产品。
- 没有为了美化而改业务导航、字段、接口、功能入口。
- 新增功能按钮没有使用 emoji 前缀；导入、导出、新建、删除、返回等操作使用标准文案或统一图标。
- 新增模块样式有页面级作用域或最终 override 约束，没有把 POC 私有 CSS 泄露到旧页面。

## 最终说明

交付说明中只记录与任务相关的样式改动、采用的样式来源和未验证项。不要把单次页面修正描述成项目全局规范变更。

## 2026-11-09 筛选区验收

- [ ] 按 `filter-placeholder-contract.md`：无上置字段标题，框内提示明确，下拉选值保留字段名，日期起止可区分；高级条件同样执行。
- [ ] 实测36px/13px/8px，不被继承全局CSS覆盖；业务表单标签、权限管理暂不迁移边界及共享组件默认消费者不变。
