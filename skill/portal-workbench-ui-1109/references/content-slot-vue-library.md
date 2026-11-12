# 中间内容槽 Vue 参考组件库

本库是 PM、UI、AI 与研发共用的中间内容槽组件基线。源码位于 `assets/vue-content-slot-components/`，用于原型生成、研发新增需求、项目实施和交接；不覆盖 Sidebar、Topbar、静态页签或右侧 Agent。

## 使用边界

- PM/UI 任务默认输出到用户指定的独立原型目录；研发实施任务输出到该任务明确纳入范围的目标项目。
- 用户要求在已识别项目中新增、修改或实现研发需求，即构成该范围内正常源码编辑授权；只做设计、评审或说明时不得编辑业务仓库。
- `skillVueComponent:true` 表示 Skill 内已有 Vue 参考源码；`sharedVueComponent:true` 只表示经核验的产品项目共享组件，二者不得混用。
- Skill 组件锁定视觉、结构、状态和响应式合同；业务数据请求、Pinia、路由、权限和 ECharts option 由原型页面或研发实现负责。

## 共用组件决策流程

1. 选择 T1–T7 页面类型和至多一个 V 变体。
2. 读取 `content-slot-component-registry.json`，按 C → B → 组合的顺序匹配。
3. PM 原型从本目录复用所需 `.vue` 文件和样式；研发先检查目标项目是否已有同合同组件，有则复用，无则将对应参考实现适配到项目共享组件层。
4. 页面只传业务数据、文案、事件和 slots，不复制组件内部 DOM/CSS；研发侧业务接线保留在 store、service、composable 或页面容器。
5. 无法承载时创建 page-local/scoped 的 A 模式并登记；不得自动写回共享库。
6. 输出组件映射表：直接复用、项目已有映射、组合复用、兼容扩展、Domain wrapper、A 候选，以及业务接线说明。

## 研发新增需求流程

1. 读取目标仓库真实组件、依赖、tokens 和消费者，不能只看 Skill 文件名推断项目已有组件。
2. 对需求逐项执行 `C → B → 组合 → Domain wrapper → A`；项目已有且符合合同的组件优先级高于复制 Skill 参考源码。
3. 项目缺少对应组件时，将 Skill 参考实现适配进项目共享组件目录，并使用项目 tokens、基础控件、图标和测试方式；不得把 Skill 目录作为线上运行依赖。
4. 新能力若能通过既有 props/slots 兼容承载，保持默认结果不变；业务专属差异使用 Domain wrapper，不给 Common 增加 `isGmv` 等开关。
5. 完全不能复用时，在目标项目建立 scoped 的 A 模式，并在交付记录中登记来源、任务、状态和晋升观察点。一次出现不得自动写入 Skill 共享库。
6. 组件源码、消费者迁移、状态、响应式、无障碍和工程检查通过后，才把该项目的 `projectImplementation` 与 `sharedVueComponent` 更新为真实完成状态。

## AI 结果页使用方式

- 将 AI 结果理解为动态页签对象，将 Topbar 选择器理解为入口，将选中后的报告、链接或 HTML 预览理解为中间内容槽页面。
- 结果页先选 T1–T7 主类型并叠加 V3，再按本库的共用组件决策流程实现；不得因为来源是 AI 就复制一套私有 page header、card、metric、chart、table 或 feedback 样式。
- 动态页签容器负责 `conversationId + messageId`、最多 10 个、切换、保存、关闭和返回静态页；本库组件只负责内容呈现、状态、响应式和可访问性。
- 结果专属数据通过 props、slots、组合或消费者容器接入。禁止给 Common 组件增加 `isAiReport`、`isDynamicTab` 等业务布尔属性。

## 目录合同

```text
assets/vue-content-slot-components/
├── index.ts
├── content-slot-components.css
└── components/*.vue
```

在原型入口导入：

```ts
import { ContentPageHeader, SectionCard, DataTable } from './content-slot-components'
import './content-slot-components/content-slot-components.css'
```

页面骨架必须让间距只有一个所有者。若目标 Shell 已提供 `20px 24px` 内容槽 padding，页面根不再添加 padding，并使用库内 flow class：

```vue
<section class="cs-page-flow">
  <ContentPageHeader title="页面标题" description="页面目标或数据口径" />
  <div class="cs-list-workspace">
    <FilterBar />
    <ListSurface />
  </div>
</section>
```

`cs-page-flow` 固定 `16px`，`cs-list-workspace` 固定 `12px`，并归零直接子项遗留 margin。研发侧优先复用目标项目已经验证的同合同 class/组件；不得把 Shell padding、页面 padding、PageHeader margin、Card margin 与这些 gap 重复叠加。`ContentPageHeader` 的 DOM 和视觉以目标项目现有共享映射为先，否则原样使用本库资产，不做页面级重绘。

该代码是无业务依赖的共用基线。PM 可直接用于独立原型；研发应映射到项目现有基础组件、图标、表单与表格方案，而不是把本目录当作独立生产依赖发布。

## PM新增筛选区（2026-11-09）

先读 [框内提示合同](filter-placeholder-contract.md)。FilterBar默认给FormControl传递框内提示布局；普通表单之外也可显式设置labelLayout。业务options的value保持原值，不拼接展示前缀。

```vue
<FilterBar :dirty="hasActiveFilters" @query="query" @reset="reset">
  <FormControl v-model="keyword" kind="search" label="商品名称" />
  <FormControl v-model="status" kind="select" label="状态" :options="[{ value: 'all', label: '全部' }, { value: 'active', label: '已启用' }]" />
  <FormControl v-model="start" kind="date" label="开始日期" />
  <FormControl v-model="end" kind="date" label="结束日期" />
</FilterBar>
<!-- 普通录入表单继续显示上置标题 -->
<FormControl v-model="name" label="活动名称" required />
```

若目标项目使用FilterField而非FormControl，复用项目的 `layout="placeholder"` 映射，不重写业务控件或更改默认表单样式。
