# 联想门户工作台样式合同

本文件只用于提高现有项目样式应用准确度。它不是新的通用设计系统，也不替代根目录 `SKILL.md`。

## 目录

1. 真实源码锚点
2. 布局与 Vue 架构样式
3. 工作台交互
4. 颜色、排版与组件
5. 禁止风格与差异处理
6. 外部 POC 和 Agent Composer

需要完整设计规范时读取根目录 `SKILL.md` 和下列专项文件：

- `references/vue-architecture-contract.md`
- `references/design-tokens.md`
- `references/components.md`
- `references/page-templates.md`
- `references/workbench-interactions.md`

需要 HTML POC 模板、基础 CSS、字体或 Logo 时使用根目录 `assets/`。

## 真实源码锚点

优先从目标 Vue 项目的 `<app-root>` 提取当前有效样式、组件结构与交互：

```text
<app-root>/src
<app-root>/src/assets/workbench.css
<app-root>/src/assets/workbench-original-lock.css
<app-root>/src/assets/workbench-prd-modules.css
<app-root>/src/assets/workbench-ui-polish.css
<app-root>/src/assets/workbench-preview-overrides.css
```

Unregistered `src/assets/ui-*-design-skill.css` and `*design-skill*.css` files must not be imported in the target runtime. If a PM POC introduces one, reject direct global import and extract only page-private intent into Vue scoped styles or existing component contracts. A future approved shared CSS file must be explicitly allowlisted in the target project's configuration with selector impact documented.

0825 Vue 项目是当前视觉、样式、交互和架构的执行基线。0729 及更早项目是历史来源，相关视觉与交互规则已吸收到本 skill；只有在需要追溯历史或补齐缺失规则时才回看。历史旧版本文件只能作为对照，不得覆盖当前 0825 Vue 版规则。关键变量和结构如下：

```css
:root {
  --primary: #3370ff;
  --primary-light: rgba(51,112,255,0.08);
  --primary-hover: #245bdb;
  --red: #e2001a;
  --bg: #f5f6f7;
  --sidebar-bg: #fff;
  --card-bg: #fff;
  --border: #dee0e3;
  --border-light: #e5e6eb;
  --text: #1f2329;
  --text-secondary: #646a73;
  --text-tertiary: #8f959e;
  --shadow: 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --radius: 8px;
  --radius-lg: 12px;
}
```

优先复用这些变量，不要硬编码同义新色。需要补充新色时，先判断是否已有语义变量或同类组件可复用。

## 布局合同

- 页面是工作台，不是 landing page。
- 默认结构为 Vue Shell：左侧导航、顶部栏、中间内容槽、右侧 AI 助手。
- 截图和 `assets/page-template.html` 只校准线上壳层、信息密度、控件尺寸和 AI 助手形态；模板中间内容槽必须保持空白，中间业务内容按具体需求选择 Dashboard / List / Detail / Form / Settings 等页型重新组织。
- 左侧导航现行紧凑宽度以真实 CSS 为准：展开 `168px`，收起 `58px`。历史 `240px` 侧栏只作为旧 demo 参考，不用于新增页面。
- 导航会随新增需求持续扩展；新增模块应追加到现有分组结构中，保持 168px 宽度、32-34px 行高、active 子菜单样式和收起态行为，不要为单个新需求重做导航视觉。
- 顶部栏以当前 0825 Vue 项目真实 CSS 为准，当前工作台统一为 `56px`。如果某历史页面仍使用旧 `48px` / `52px`，优先对齐当前 0825 Vue 工作台壳层。
- 中间内容区使用 `padding: 20px 24px` 或同模块现有节奏，避免随意加大为营销页留白。
- 所有内容槽页型共享同一 PageHeader 结构与节奏：固定 `18×18px` icon + `19px/1.35/700` 主标题 + `12px/1.65` 副标题；icon 与标题 `8px`，标题行与副标题 `3px`，PageHeader 到第一个业务区块固定 `16px`。专项页面不得通过根容器 `gap` 与 PageHeader `margin-bottom` 叠加出额外高度。
- 当前确认版中间内容槽可使用极浅连续渐变：从内容槽左上到右上，以 `#3370ff` 推导的蓝/青/靛低透明色（约 `1%-3%`）自然过渡到浅灰画布；不要做固定高度色带、1px 分割线、装饰光斑、硬断层或整页营销背景。
- 静态页签与面包屑合并显示；AI 报告、HTML 预览和链接信息通过 Topbar 右侧单一 AI 结果选择器进入内容槽。静态页与 AI 结果互不抢 active 状态，未激活报告时选择器保持中性默认态。
- 数据密集型内容槽默认流式撑满；只有阅读/表单型内容使用受控最大宽度。KPI 栅格和筛选区换行规则优先参考当前页面实际实现与内容槽合同。
- 右侧 AI 面板宽度以真实 CSS 和当前页面 JS 交互为准；当前确认版默认 `380px`，可拖拽扩宽到约 `492px`。
- 0825 Vue 版中，壳层尺寸、页签、AI 面板和主题同步必须以 Vue 组件 / Pinia / composable 的实现为准；不要回退到 `workbench.html` 的全局 DOM 结构。

## 0825 Vue 架构样式合同

- Vue 组件继续输出当前 0825 Vue 项目的 class/token 合同，不新建独立视觉体系。
- 新壳层交互不得写入 `public/admin-runtime`。
- 新 shell 样式优先落在对应 Vue 组件的 `<style lang="scss" scoped>` 中；只有 token、reset、基础通用 class、跨组件布局合同和 legacy 过渡样式继续留在 `src/assets/workbench*.css`。
- 不要把组件私有样式继续堆到集中式全局 CSS，也不要通过 legacy 脚本动态拼样式。
- `NativeWorkbenchPage` / `legacyWorkbenchRuntime` 只服务隐藏详情页、范围外隐藏模块，以及已确认的“Vue wrapper + 原生样式承载”过渡页；设计新的壳层模式时不得依赖它。
- 生产实现必须保持 `pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm smoke:shell` 通过。

## 当前工作台交互合同

完整规则见 `references/workbench-interactions.md`。该文件承载当前 0825 Vue skill 的工作台交互合同；实现和评审时必须按下列摘要先检查：

- 左侧导航自动收起阈值 `<=1320px`，自动展开阈值 `>=1480px`；用户手动展开后保持展开，直到浏览器 resize 后才重新判断。
- 内容槽保底参考 `1280px`；AI 打开时不再因为内容槽被挤压而频繁收起左导航。
- 静态页签最多 `10` 个，超出时按打开顺序自动关闭最早页签；active 页签必须滚入可视区域。
- 当前 Agent 会话的 AI 结果最多 `10` 个；Topbar 选择器高 `36px`，未激活时完整显示 `AI 结果报告`，激活后显示精简标题并高亮。下拉不得混入其他会话或未被当前消息引用的报告。
- AI 回答中允许继续输入并发送排队；空输入时发送按钮切换为停止按钮。
- AI 等待回答态必须是透明状态行，不是 assistant 气泡；保留一行文案、状态点和三点动效。

## 颜色合同

- 主操作、选中导航、链接、AI 轻强调：`--primary` / `#3370ff`。
- 主色 hover：`--primary-hover` / `#245bdb`。
- 主色浅底：`--primary-light` / `rgba(51,112,255,0.08)`。
- 联想红：`--red` / `#e2001a`，只用于品牌标识、危险提示或少量强调。
- 画布：`--bg` / `#f5f6f7`。
- 卡片：`--card-bg` / `#fff`。
- 主文字：`--text` / `#1f2329`。
- 次要文字：`--text-secondary` / `#646a73`。
- 辅助文字：`--text-tertiary` / `#8f959e`。
- 边框：`--border` / `#dee0e3`，轻边框：`--border-light` / `#e5e6eb`。

不要引入高饱和紫蓝渐变、大面积红色、彩虹图表色、深蓝黑控制台主题或纯白无层级背景。

### 项目级图表色彩合同

运营总览和 Query 分析是 0825 Vue 项目的基础图表样式底本。后续项目内所有 ECharts、Chart.js、canvas 图表、SVG 图表、HTML 进度条、迷你趋势线、图例色点都应使用同一套图表色彩逻辑。

图表色调应比普通 UI 主色更沉稳，整体保持中低饱和、偏业务运营感。可以比当前 Query 分析更丰富，但新增颜色必须从下列蓝、绿、紫、灰蓝和低饱和辅助色延展，不要直接使用高亮纯红、纯绿、纯橙或默认彩虹色。

```css
:root {
  --chart-blue: #3f78c5;
  --chart-blue-2: #5b8def;
  --chart-blue-3: #9bbcff;
  --chart-green: #58a86a;
  --chart-green-2: #6ac69a;
  --chart-purple: #7c5cff;
  --chart-purple-2: #a996ff;
  --chart-slate: #8da2bf;
  --chart-amber: #d6a458;
  --chart-neutral: #aeb8c8;
  --chart-danger: #d94b4b;
}
```

- 默认分类顺序：蓝 `--chart-blue`、绿 `--chart-green`、紫 `--chart-purple`、中蓝 `--chart-blue-2`、柔绿 `--chart-green-2`、浅蓝 `--chart-blue-3`、灰蓝 `--chart-slate`、低饱和琥珀 `--chart-amber`、中性灰 `--chart-neutral`。
- 排名、TOP、单指标柱状图优先使用同一色相的单色或轻渐变：蓝用于流量/查询/总量，绿用于成交/服务/正向业务，紫用于 AI/会员/高级分析，琥珀仅作次级补充。
- 环图、饼图、堆叠分类图可使用分类顺序，但必须保持相邻色之间有足够区分；同一业务分类在不同图中要保持同一颜色。
- 趋势线不超过 3 条时优先蓝、绿、紫；超过 3 条再引入中蓝、柔绿、浅蓝、灰蓝。
- 红色和高饱和橙色只用于失败、风险、告警、负向异常的点状标记、表格数值、状态标签或阈值提示，不用于大面积柱、环图扇区、趋势主线和面积填充。
- 图表面积填充、柱状图渐变、迷你趋势背景可以用对应色的 `8%-18%` 透明度；不要使用大面积高饱和实色块。
- 图表首次进入应保持轻量动态反馈：ECharts 使用 `animation: true`、约 `720ms` 入场、`cubicOut` 缓动，并按数据项做短延迟；SVG/DOM 图表使用卡片淡入、柱/线轻微绘制或上移淡入。动效只帮助理解数据进入，不做夸张弹跳或长时间循环。
- 图例是图表的一部分，不能贴着坐标轴或挤在底部。推荐 ECharts 图例基准：`itemWidth:18`、`itemHeight:8`、`itemGap:16`、`padding:[8,0,0,0]`、`bottom:6`、文字 `10px/14px`；有底部图例的折线、堆叠柱、环图应把 grid bottom 提高到约 `54px`，环图中心可略上移到 `44%`。
- 图表卡高度需要和同排表格/卡片对齐。右侧单图对应左侧长表时，图表容器可以增高到匹配左侧卡片高度，图形在容器内保持舒展但不拉伸 canvas。

Current 0702 chart examples are binding references:

- Query 分析：普通分类环图使用 `blue -> green -> purple -> blue-2 -> green-2 -> slate -> blue-3` 的顺序，TOP 横条使用同一蓝色系，不使用彩虹色或高饱和红橙。
- 运营总览：GMV 拆解和趋势卡使用蓝、绿、紫与低透明面积填充；进度条和迷你趋势线保持低饱和、轻网格。
- 流量分析：端口、业务、媒体等普通分类使用蓝、绿、紫、灰蓝、低饱和琥珀；端口或媒体分类不得使用 danger 红。
- GMV 分析：消费固定蓝，SMB 固定低饱和琥珀，政企固定紫；官网/非官网固定蓝与灰蓝。该映射跨 GMV 趋势、环图、表格色点保持一致。
- 质量分析：点踩、低满意、失败、异常虽然属于语义负向，但图表主视觉仍优先使用蓝、灰蓝、低饱和琥珀、绿、紫等项目图表色；`--chart-danger` 只允许用于阈值点、表格数值、少量异常标记或 hover 强调。禁止使用 Lenovo 品牌红 `#e2001a`、高饱和橙 `#ff7d00`，也不要让红/橙成为大面积柱、趋势面积或主要扇区。

## 排版合同

- 字体族沿用项目：`'Source Han Sans CN', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif`。
- 页面正文默认 `14px`。
- 表格、筛选和按钮使用 `--text-sm`（13px）；状态标签与辅助信息使用 `--text-xs`（12px）。
- 新增页面标题使用 `ContentPageHeader` 专项 `19px` 主标题与 `12px` 副标题，卡片标题使用 `--text-md`（16px）；不得用通用标题 class 替代共享页头组件。
- 普通 KPI 数字使用 `--text-2xl`（24px），页面首要 KPI 才使用 `--text-3xl`（30px），不要扩大成营销海报视觉。
- 字距保持 `0`，不要使用负字距或随视口缩放字号。
- ID、Key、日志、JSON、token、调用量等技术内容使用等宽字体。

## 组件合同

### 按钮

- 复用 `.btn`、`.btn-primary`、`.btn-secondary`、`.btn-danger`、`.btn-sm` 的结构。
- 常规按钮保持紧凑，不要做超大 CTA。
- 按钮文本不换行；图标和文字间距使用 `--space-1`（4px）。
- 主要按钮只用于当前区域的主动作。

### 卡片

- 卡片使用白底、细边框、`8px` 或 `12px` 圆角、轻阴影 hover。
- 页面区块不要层层套卡片。需要嵌套信息时使用浅灰底、分隔线或紧凑表格。
- KPI 顶部信息卡可以有极浅主色衍生背景，下方表格、筛选、图表容器保持白底。

### 表格和筛选

- 表格字号 `13px`，表头 `12px`；普通业务列表默认 48px，只有明确的高密度单行表使用 40px compact 变体。
- 表头使用弱文字色和底部分割线，不做大面积深色表头。
- 筛选区控件高度使用 `--control-height-md`（36px），边框、圆角、focus 与 `.form-input` 保持一致。
- 宽屏筛选尽量单行；窄屏用整齐 grid 换行，不让按钮或日期范围被挤成两行。

### 状态标签

- 状态标签使用浅底 + 实色文字。
- 状态标签按内容自适应宽度并保持单行；不得被表格内 `span`、`div` 等宽泛选择器拉伸为整列宽度或继承副文本外边距。
- 红色只表示危险、失败、离线、删除，不用于普通分类。
- 同一种状态在全站保持同一颜色。

### AI 助手

- AI 面板必须作为工作台右侧辅助区，不做成全屏聊天应用。
- 面板背景、边框、头部、快捷问题、输入区跟随当前 CSS。
- 打开、关闭、拖拽等行为必须保留现有交互；主题底层能力可保留，但当前发布强制浅色且不展示切换入口。
- AI 正在生成前的等待态是透明状态行，不是气泡。
- AI 正式答案必须有统一外层气泡，包括纯文本、报告结论、任务结论和带继续执行按钮的回答；不要让答案正文直接裸露在面板背景上。
- 报告卡、授权卡和行动按钮是回答气泡内的二级内容；不得通过 `.ai-structured-msg` 或类似选择器把答案气泡透明化、去边框或清空 padding。TODO 是唯一明确例外：它位于答案之后，以无气泡、无卡片背景的独立直接列表呈现。

## 禁止混入的风格

- Ant Design 默认大间距后台。
- shadcn 默认圆角卡片堆叠。
- 营销官网 hero、宣传大标题、价值主张卡片。
- 玻璃拟态、霓虹渐变、装饰光斑、大面积深色科技风。
- 仅靠 inline style 实现状态，导致 class 和全局样式失效。
- 单页独立 CSS 与 `workbench.css` 明显冲突。
- 使用历史 demo 的 `240px` 侧栏、旧 chat 渐变头像作为新增页面标准。

## 样式差异处理

如果发现根目录 `SKILL.md`、reference、历史 HTML 和当前 CSS 不一致：

1. 不要临时发明新视觉规则。
2. 先按当前真实页面和 `workbench.css` 落地。
3. 在最终说明中简短记录采用了哪个来源。
4. 若用户要求沉淀规范，再单独修改根目录 `SKILL.md`、对应 reference 或 `assets/base.css`。

## 外部 POC / 历史功能合入差异处理

- POC 文件夹通常不是完整 0825 Vue 项目。合入前必须先比较文件清单、架构边界和文件大小；较短的 POC 文件不能直接覆盖当前 Vue 项目文件。
- 新增功能脚本可以接入，但本地已有全局能力必须保留：AI 页面巡检、门户首页、右侧 AI 助手默认态、响应式 guard、本地 preview mock、静态页签、Topbar AI 结果选择器与中间结果视图、AI 队列发送、停止回答和等待状态行。当前 0825 Vue 顶部全局搜索默认隐藏；如脚本依赖搜索 DOM，隐藏 wrapper 而不是删除节点。
- 新增页面样式优先复用当前 `src/assets/workbench*.css` token/class，或在 Vue 组件内使用页面 wrapper / scoped CSS；不要把 POC 私有样式直接提升为全局规则。
- 发现 POC 的硬编码颜色、emoji 按钮、filled tabs、独立阴影、默认下拉样式时，必须用本地 token 和组件规范替换。
- 合入后必须验证新增页面能打开，当前 Vue 入口仍存在，控制台无项目 error。

## 当前 AI Composer 差异处理

- 底部快捷标签默认不选中第一项；选中只来自用户点击或键盘激活。
- 标签 rail 始终使用横向 pill + 左右圆形箭头，不在窄屏退化为 select。
- 输入框默认 `36px`，到 3 行后固定并内部滚动；发送按钮为单个 `32px` 方形 icon-only 控件。
- 浅色默认态保留单一圆角组合件，但将层级拆为“外层/标签 rail 浅灰 `--color-surface-subtle` + 可编辑输入行白色 `--color-surface`”；placeholder 使用 `--color-text-tertiary`，附件按钮使用次级文字色。默认 textarea 不得呈现禁用灰底。
- 聚焦反馈由外层组合件统一显示 `--color-primary-border` 和 `--focus-ring`，不要给 textarea 再套独立边框；空输入时只有发送按钮使用 disabled 灰态。
- Agent 回答中输入框不禁用；再次发送进入队列，队列在输入框上方独立展示。
- 输入为空且 Agent 正在回答时，发送按钮进入停止态；停止当前回答后继续处理下一条排队消息。
- 等待态不使用气泡样式；不得恢复 assistant 气泡的白底、边框、圆角或阴影。
