# 全项目页面—规范覆盖矩阵

本文件把“页面存在”转换为可执行的设计合同。设计、实现、迁移或走查任何内容槽页面时，先在本矩阵中定位页面，再读取对应基础页型、组件合同和专项规则。没有登记的页面不得直接套用相邻页面样式；先补登记，再设计。

## 目录

1. 范围与证据边界
2. 页型、组件、实现和状态编码
3. 当前 0914 项目页面矩阵
4. 当前页面与 Figma 04 / UAT 证据关系
5. Figma 04 / UAT 133 页索引
6. 新增页面与状态更新规则
7. 覆盖验收

## 1. 范围与证据边界

### 1.1 当前项目

当前实现范围以 `lexiang-new-0825` 的以下文件为准：

- `src/router/index.ts`：实际路由入口。
- `src/content-slot/contentSlotDefinitions.js`：内容槽页面登记、布局和组件候选。
- `references/content-slot-migration-plan.md`：Vue 迁移深度与兼容边界。

0904归档内容槽共登记 41 项：24 个可见或账号入口页面、16 个隐藏/详情兼容页、1 个 AI 动态报告页。新增 AI 商品域已随 `lexiang-new-0904` 归档。`/login` 属于认证壳层，通配 WIP 属于路由兜底，二者不计入普通业务内容槽，但仍需遵守品牌、控件、无障碍和响应式基础规则。

### 1.2 Figma 04 / UAT

Figma 04 是 133 个 UAT 页面快照的走查证据，检查依据是 Figma 01–03 与本 skill 已吸收的内容槽合同。它不是当前 0825 Vue 项目的路由清单，也不是正确样式源。

本次索引依据工作区的 `.audit/audit_data_133_deep.json`、`.audit/route_map_133.json` 和 `UAT全量迁移样式走查-20260722-rescan/content-slot/`。统计为：133 页、127 页有新截图、6 页因 UAT 无入口阻塞；70 页 P1、58 页 P2、5 页 P3。P1/P2/P3 表示当时 UAT 快照的整改优先级，不表示当前 Vue 页面已经通过验收。

## 2. 页型、组件、实现和状态编码

### 2.1 基础页型

| 编码 | 基础页型 | 选择条件 | 主要模板 |
|---|---|---|---|
| T1 | 标准列表 | 常用筛选不超过 3 个 | `content-list-template.html` |
| T2 | 长筛选列表 | 常用筛选 4 个以上或需要高级筛选 | `content-long-filter-list-template.html` |
| T3 | 数据看板 | KPI、趋势、分布、矩阵或明细支撑决策 | `content-dashboard-template.html` |
| T4 | 业务表单 | 新建、编辑、审批录入、单对象规则配置 | `content-form-template.html` |
| T5 | 任务 / 导入 | 上传、批处理、异步计算、生成和结果下载 | `content-task-import-template.html` |
| T6 | 分栏设置 | 局部对象导航与设置工作区联动 | `content-split-settings-template.html` |
| T7 | 配置列表 | 规则、模型、数据源、Skill 等对象管理 | `content-config-list-template.html` |

专项变体只能叠加在一个主基础页型上：V1 详情/审核、V2 多步流程、V3 AI 结果（动态页签内容视图）、V4 门户首页、V5 日志/技术内容。V2 参考 `content-workflow-template.html`；V3 参考 `content-report-detail-template.html`。V3 不能代替 T1–T7 主类型；报告、链接和 HTML 预览必须按实际任务选定一个主类型并复用内容槽组件库。

Figma 04 中标为 `list` 的历史快照统一登记为“列表族 T1/T2”。截图和旧台账无法稳定证明常用条件数量，实施时必须按“≤3 选 T1、≥4 或需要高级筛选选 T2”完成最终判定；这不是允许任选样式。

### 2.2 核心组件组

- C1：PageHeader、SectionCard、基础状态与焦点合同。
- C2：FilterBar、Input、Select、DatePicker、条件摘要。
- C3：TableToolbar、DataTable、SelectionBar、Pagination。
- C4：MetricCard、ChartPanel、矩阵/排行、数据口径和更新时间。
- C5：FormSection、字段校验、脏数据拦截、底部操作区。
- C6：Upload、参数区、Progress、TaskTable、ResultState、失败重试。
- C7：局部导航、设置工作区、分区保存、危险区。
- C8：ConfigCard/Table、StatusTag、启停/版本/发布动作。
- C9：Loading、Empty、Error、NoPermission、Disabled、Success、PartialSuccess、StaleData。

### 2.3 实现层级

- O1：Vue 原生页面或组件。
- O2：Vue 路由页面，但内部仍含 wrapper、`v-html`、HTML 字符串或迁移期 DOM helper。
- O3：`NativeWorkbenchPage` 隐藏/详情兼容运行时。
- O4：Vue AI 结果视图组件，内容由运行时 payload 生成。它是动态页签选中后渲染在中间内容槽中的页面，必须登记 T1–T7 + V3 并复用内容槽组件库；当前实现名 `TempTabView.vue` 属于历史代码标识，不代表第二排动态页签 UI。

### 2.4 允许例外

- E0：无例外；遵守基础页型和公共合同。
- E1：为保持当前封板视觉，暂时保留 wrapper/旧主体；不得借此新增旧式 DOM bridge。
- E2：指标口径、图表 option、表格业务列和领域计算保持页面自有。
- E3：审批、发布、权限、批量写入等高风险流程保留领域状态机，并补完整确认、失败和恢复。
- E4：封板的 Agent、Skill 创建、权限流程可用专项结构覆盖基础页型的局部顺序，但不能改壳层和公共控件合同。
- E5：隐藏兼容页在明确迁移前保留运行时；任何可见新页面不得使用该例外。
- E6：AI 结果正文、链接和 iframe payload 可变；T1–T7 + V3 页面壳、内容槽组件层级、状态和动态页签行为固定。E6 不允许建立 AI 专用 Common 组件方言。

例外不是默认许可。只有业务任务无法由基础合同合理承载、收益明确、全状态/键盘/响应式/回退已定义，并经用户或设计负责人确认后才能新增。

### 2.5 走查状态

- S1｜源码已登记：路由、实现归属和规范映射已核对；不等于完成本轮浏览器视觉走查。
- S2｜04 证据关联：存在同名或同业务 UAT 快照；状态后必须注明 P 编号、优先级和是否路由漂移。
- S3｜兼容待专项：隐藏/详情页已映射，但需在迁移或改动时补运行态视觉和交互走查。
- S4｜动态专项：运行时生成页面已映射，需按真实 payload 补短/长/空/失败数据验收。
- B｜阻塞：UAT 当前无入口，没有可验证新截图；不得写成“已通过”。

### 2.6 当前浏览器视觉验收状态

源码/历史状态与当前视觉状态分开记录，禁止用 S1–S4 代替浏览器验收：

- VA-0：没有当前浏览器证据。
- VA-R1：已有一组当前截图，但响应式组合未完成。
- VA-R2：宽屏 Agent 关闭与 `1280px` Agent 最大两组截图、测量和人工总览走查完成，且页面级横向溢出为 0；交互、数据边界和无障碍仍未全部验收。
- VA-PASS：截图、交互状态、响应式组合、关键数据边界、键盘/无障碍和工程命令均通过。
- VA-FAIL：当前证据存在可复现的视觉或测量失败，必须保留 finding 和截图，不得降级写成“待确认”。
- VA-BLOCKED：缺少真实入口、payload、权限或环境；必须写明 blocker 和补证条件。

机器可读记录见 `page-visual-acceptance.json`。VA-0 只登记当前待验收状态，不附旧截图；新证据产生后使用可移植的 `evidenceRef` 指向当次外部验收档案。每次复核必须更新 `updatedAt / review / captures / findings / remainingStates`；只有自动一致性检查通过后才能回写本矩阵状态。

## 3. 当前 0914 项目页面矩阵

功能以 PM 为主；同一 pageId 可复用多个明确路径，路径不得重复。C9 为要求，不代表已验证。

| 页面 | 路由 | 页型 | 组件组 | 实现 | 状态 | 说明 |
|---|---|---|---|---|---|---|
| 首页 / 联想门户工作台 | `/portal/home` | T3 + V4 | C1/C4/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 乐享运营 / 运营总览 | `/dashboard/overview` | T3 | C1/C4/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 乐享运营 / Query 分析 | `/pipeline/annotate` | T3 | C1/C4/C9 | O2 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 乐享运营 / 质量分析 | `/pipeline/quality` | T3 | C1/C4/C9 | O2 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 乐享运营 / 流量分析 | `/ops/traffic` | T3 | C1/C4/C9 | O2 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 乐享运营 / GMV 分析 | `/ops/gmv` | T3 | C1/C4/C9 | O2 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| GEO / 整体数据概览 | `/geo/overview` | T3 | C1/C4/C9 | O2 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| GEO / 各平台信源分布 | `/geo/source` | T3 | C1/C4/C9 | O2 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| GEO / 各平台意图分布 | `/geo/intent` | T3 | C1/C4/C9 | O2 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| GEO / GEO 转化看板 | `/geo/conversion` | T3 | C1/C4/C9 | O2 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| GEO / 手工上传知识 | `/geo/knowledge` | T5 | C1/C6/C9 | O2 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 在职员工 / 职场员工概览 | `/employee/overview` | T3 | C1/C4/C9 | O2 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 在职员工 / 职场员工审核 | `/employee/cert` | T2 + V1 | C1/C2/C3/C9 | O2 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 企业客户 / 线索看板 | `/lead/dashboard` | T3 | C1/C4/C9 | O2 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 企业客户 / 线索池 | `/lead/pool` | T2 | C1/C2/C3/C9 | O2 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 企业客户 / 线索池-政企 | `/lead/government-pool` | T2 + V1 | C1/C2/C3/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 企业客户 / 打分模型 | `/lead/score` | T7 | C1/C2/C3/C8/C9 | O2 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| `order.purchaseOrders` | `/order/purchase-orders` | T1 | C1/C2/C3/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 订单管理 / 协议采购单管理 | `/order/purchase-orders/:id` | T1 + V1 | C1/C2/C3/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 订单管理 / 协议产品订单管理 | `/order/agreement` | T1 + V1 | C1/C2/C3/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| `advertising.productVideo` | `/advertising/product-videos` | T2 | C1/C2/C3/C9 | O1 | [VA-R2] | PM 功能为准；未宣称完整状态验收 |
| Agent / Skill Hub | `/agent/skills` | T7 | C1/C2/C3/C8/C9 | O1 | [VA-R2] | 场景技能包列表 T7；`/agent/skills?tab=packages&mode=create` 使用 T4 + V2 四步创建；同一路由，不新增页面；PM 功能为准 |
| Agent / Skill 创建 | `/agent/skill-create` | T4 + V2 | C1/C5/C9 | O1 | [VA-R2] | PM 功能为准；未宣称完整状态验收 |
| Agent / 权限管理 | `/agent/permissions` | T6 + V2 | C1/C5/C7/C9 | O1 | [VA-R2] | PM 功能为准；未宣称完整状态验收 |
| 权限管理 / 邮件清理演示 | `/agent/permissions/admin-cleanup-email` | T5 | C1/C6/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| Query 明细 | `/hidden/dashboard/query` | T1 + V1 | C1/C2/C3/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 用户行为 | `/hidden/dashboard/behavior` | T3 + V1 | C1/C4/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| Query 业务归因 | `/hidden/ops/query-biz` | T3 + V1 | C1/C4/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 高频关键词 | `/hidden/ops/keywords` | T1 + V1 | C1/C2/C3/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 标注任务 | `/hidden/pipeline/task` | T5 | C1/C6/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 标注统计 | `/hidden/pipeline/stats` | T3 | C1/C4/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 数据过滤 | `/hidden/pipeline/filter` | T7 | C1/C2/C3/C8/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 任务监控 | `/hidden/pipeline/monitor` | T3 | C1/C4/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 员工列表 | `/hidden/employee/list` | T2 | C1/C2/C3/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 员工详情 | `/hidden/employee/detail` | T4 + V1 | C1/C5/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 认证详情 | `/hidden/employee/cert-detail` | T4 + V1 | C1/C5/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 线索详情 | `/hidden/lead/detail` | T4 + V1 | C1/C5/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 协议产品订单详情 | `/hidden/order/agreement-detail` | T4 + V1 | C1/C5/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 报告总览 | `/hidden/report/overview` | T3 + V3 | C1/C4/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 质量报告 | `/hidden/report/quality` | T3 + V3 | C1/C4/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| 报告详情 | `/hidden/report/detail` | T3 + V3 | C1/C4/C9 | O1 | [VA-0] | PM 功能为准；未宣称完整状态验收 |
| `aiinspect.overview` | `/aiinspect/overview` | T3 | C1/C4/C9 | O1 | [VA-R2] | PM 功能为准；未宣称完整状态验收 |
| `aiinspect.rules` | `/aiinspect/rules` | T7 | C1/C2/C3/C8/C9 | O1 | [VA-R2] | PM 功能为准；未宣称完整状态验收 |
| `aiinspect.issues` | `/aiinspect/issues` | T2 | C1/C2/C3/C9 | O1 | [VA-R2] | PM 功能为准；未宣称完整状态验收 |
| `aiinspect.notifications` | `/aiinspect/notifications` | T1 | C1/C2/C3/C9 | O1 | [VA-R2] | PM 功能为准；未宣称完整状态验收 |
| `aiinspect.logs` | `/aiinspect/logs` | T1 | C1/C2/C3/C9 | O1 | [VA-R2] | PM 功能为准；未宣称完整状态验收 |

动态结果视图：T3 + V3，C1/C4/C9，O4，[VA-0]。

场景包创建：`/agent/skills?tab=packages&mode=create`，T4 + V2；列表：`/agent/skills?tab=packages`，T7。两者复用 PM 的 Skill Hub 路由，C1/C2/C3/C5/C8/C9。


## 4. 当前页面与 Figma 04 / UAT 证据关系

只有 6 个当前业务页面能与 04 建立同名/同业务关系：P005、P006、P018–P021。P005 路由一致；P006 和 P018–P021 存在旧 UAT 路由漂移。关联只用于提取历史问题和验收关注点，不能证明当前 Vue 页面仍有相同问题，也不能用旧截图覆盖当前实现。

其余 127 个 04 页面属于更广的 UAT 后台业务范围；它们仍受本 skill 的页型和组件规范覆盖，但不是当前 0825 路由。新增或迁回这些页面时，应先以第 5 节定位历史证据，再按新需求登记到第 3 节，而不是直接复制 UAT 快照。

## 5. Figma 04 / UAT 133 页索引

页型含义见第 2 节。列表族在真实实现时必须落到 T1 或 T2。所有非阻塞条目均有对应的 `Pxxx` 内容槽走查图；详细编号、问题、整改建议、Figma card/snapshot node 和验收文案以审计源数据为准。

| 编号 | 页面 | UAT 路由 | 规范映射 | 走查状态 |
|---|---|---|---|---|
| P001 | 工作台配置 / 操作日志 | `/configuration/logs` | 列表族 T1/T2 | P2｜统一整改 |
| P002 | 工作台配置 / 导出数据列表 | `/configuration/export` | T5 任务/导入 | P2｜统一整改 |
| P003 | 工作台配置 / 数据审核 | `/configuration/approval` | 列表族 T1/T2 | P2｜统一整改 |
| P004 | 内容管理 / 固定QA | `/content/qa` | 列表族 T1/T2 | P2｜统一整改 |
| P005 | 在职员工管理 / 职场员工概览 | `/employee/overview` | T3 数据看板 | P3｜优化建议 |
| P006 | 在职员工管理 / 职场员工审核 | `/employee/audit` | 列表族 T1/T2 | P2｜统一整改 |
| P007 | CMSSass / 组件管理 | `/fecms/componentManage` | 列表族 T1/T2 | P2｜统一整改 |
| P008 | CMSSass / 站点管理 | `/fecms/sitelist` | 列表族 T1/T2 | P2｜统一整改 |
| P009 | CMSSass / 页面管理 | `/fecms/pagelist` | T6 分栏设置 | P1｜必须整改 |
| P010 | CMSSass / 导航管理 | `/fecms/navList` | T6 分栏设置 | P1｜必须整改 |
| P011 | CMSSass / 自定义表单 / 表单题库 | `/fecms/cmswebform/webformattributes` | 列表族 T1/T2 | P2｜统一整改 |
| P012 | CMSSass / 自定义表单 / 配置表单 | `/fecms/cmswebform/webformanagement` | T4 业务表单 | P1｜必须整改 |
| P013 | CMSSass / 自定义表单 / 表单数据 | `/fecms/cmswebform/reviewdata` | T5 任务/导入 | P2｜统一整改 |
| P014 | CMSSass / 资源管理 | `/fecms/resourceManagement` | T6 分栏设置 | P1｜必须整改 |
| P015 | CMSSass / 类目配置 | `/fecms/categoryPeiZhi` | T6 分栏设置 | P1｜必须整改 |
| P016 | CMSSass / CDN刷新日志 | `/fecms/refreshCdnLog` | 列表族 T1/T2 | P2｜统一整改 |
| P017 | CMSSass / SEO管理 | `/fecms/seoAdministration` | T5 任务/导入 | P2｜统一整改 |
| P018 | GEO 看板 / 整体数据概览 | `/geofe/overview` | T3 数据看板 | P3｜优化建议 |
| P019 | GEO 看板 / 各平台信源分布 | `/geofe/sites` | T3 数据看板 | P3｜优化建议 |
| P020 | GEO 看板 / 各平台意图分布 | `/geofe/questions` | T3 数据看板 | P3｜优化建议 |
| P021 | GEO 看板 / 转化看板 | `/geofe/transfer` | T3 数据看板 | P3｜优化建议 |
| P022 | 会员管理 / 会员用户管理 | `/member/memberMange` | 列表族 T1/T2 | B｜UAT 无入口 |
| P023 | 会员管理 / LenovoID 匹配 | `/member/lenovoIdMatch` | T5 任务/导入 | B｜UAT 无入口 |
| P024 | 会员管理 / 教育认证 / 门店认证数据 | `/member/educationCert/storeCertification` | 列表族 T1/T2 | B｜UAT 无入口 |
| P025 | 会员管理 / 教育认证 / 认证数据 | `/member/educationCert/informationList` | 列表族 T1/T2 | B｜UAT 无入口 |
| P026 | 会员管理 / 教育认证 / 认证列表 | `/member/educationCert/approveLists` | 列表族 T1/T2 | B｜UAT 无入口 |
| P027 | 会员管理 / 教育认证 / 导出记录 | `/member/educationCert/advertList` | T5 任务/导入 | B｜UAT 无入口 |
| P028 | 订单管理 / 批量处理 / 订单恢复任务列表 | `/order/batch/recoverOrder` | 列表族 T1/T2 | P2｜统一整改 |
| P029 | 订单管理 / 批量处理 / 发票修改任务列表 | `/order/batch/orderManageInvoiceList` | 列表族 T1/T2 | P2｜统一整改 |
| P030 | 订单管理 / 批量处理 / 收货地址修改任务列表 | `/order/batch/addressUpdate` | T5 任务/导入 | P2｜统一整改 |
| P031 | 订单管理 / 批量处理 / 延长订单有效期 | `/order/batch/extensionOrderValidity` | T7 配置列表 | P1｜必须整改 |
| P032 | 订单管理 / 批量处理 / 预售订单尾款结束时间 | `/order/batch/orderPayEndTime` | T7 配置列表 | P1｜必须整改 |
| P033 | 订单管理 / 批量处理 / 批量任务 | `/order/batch/ordersBatch` | 列表族 T1/T2 | P2｜统一整改 |
| P034 | 订单管理 / 批量处理 / 商品支付时效设置 | `/order/batch/shopPatSet` | T4 业务表单 | P1｜必须整改 |
| P035 | 订单管理 / 订单抛单管理 / 订单卡单列表 | `/order/release/OrderCardList` | 列表族 T1/T2 | P2｜统一整改 |
| P036 | 订单管理 / 订单抛单管理 / 抛单规则列表 | `/order/release/RuleList` | T7 配置列表 | P1｜必须整改 |
| P037 | 订单管理 / 订单优惠查询 | `/order/discountSearch` | 列表族 T1/T2 | P1｜必须整改 |
| P038 | 订单管理 / 订单改价管理 | `/order/PriceChangeList` | 列表族 T1/T2 | P2｜统一整改 |
| P039 | 订单管理 / 预售订单改价管理 | `/order/presellOrderList` | 列表族 T1/T2 | P2｜统一整改 |
| P040 | 订单管理 / 批量匹配仓库 | `/order/matchStore` | 列表族 T1/T2 | P2｜统一整改 |
| P041 | 订单管理 / 候补订单列表 | `/order/orderList` | 列表族 T1/T2 | P2｜统一整改 |
| P042 | 订单管理 / 退款管理 / Lenovo 商城返款导入列表 | `/order/refund/refundsimportlist` | T5 任务/导入 | P2｜统一整改 |
| P043 | 订单管理 / 退款管理 / Lenovo 商城返款列表 | `/order/refund/refundslist` | 列表族 T1/T2 | P2｜统一整改 |
| P044 | 订单管理 / MDB 列表管理 | `/order/MDBList` | 列表族 T1/T2 | P1｜必须整改 |
| P045 | 订单管理 / 撤单退货报表 | `/order/returnGoodsReport` | 列表族 T1/T2 | P1｜必须整改 |
| P046 | 订单管理 / 订单报表 | `/order/orderReport` | 列表族 T1/T2 | P1｜必须整改 |
| P047 | 订单管理 / 订单报表(商务专用) | `/order/orderReportBusiness` | T4 业务表单 | P1｜必须整改 |
| P048 | 订单管理 / 订单列表 | `/order/orderManage` | 列表族 T1/T2 | P1｜必须整改 |
| P049 | 订单管理 / 订单时效报表 | `/order/orderTimeliness` | T5 任务/导入 | P2｜统一整改 |
| P050 | 订单管理 / 换货报表 | `/order/exchangeGoodsReport` | 列表族 T1/T2 | P1｜必须整改 |
| P051 | 订单管理 / 退款报表 | `/order/refundReport` | 列表族 T1/T2 | P1｜必须整改 |
| P052 | 订单管理 / 撤单审核 | `/order/cancleOrder` | 列表族 T1/T2 | P1｜必须整改 |
| P053 | 订单管理 / 换货审核 | `/order/exchangeGoodsAudit` | 列表族 T1/T2 | P1｜必须整改 |
| P054 | 订单管理 / 退换货自动审核 | `/order/reverseAutoAudit` | T7 配置列表 | P2｜统一整改 |
| P055 | 订单管理 / 退货审核 | `/order/returnGoods` | 列表族 T1/T2 | P1｜必须整改 |
| P056 | 订单管理 / 退款审核 | `/order/refundAudit` | 列表族 T1/T2 | P1｜必须整改 |
| P057 | 订单管理 / 退货地址 | `/order/returnAddress` | 列表族 T1/T2 | P2｜统一整改 |
| P058 | 订单管理 / 退差价管理 / 批量申请 & 审核 | `/order/priceRefund/batchApplication` | 列表族 T1/T2 | P2｜统一整改 |
| P059 | 订单管理 / 退差价管理 / 商品价保周期设置 | `/order/priceRefund/priceGuaranteePeriod` | T7 配置列表 | P2｜统一整改 |
| P060 | 订单管理 / 退差价管理 / 审批人设置 | `/order/priceRefund/approver` | T7 配置列表 | P2｜统一整改 |
| P061 | 订单管理 / 退差价管理 / 退差价报表 | `/order/priceRefund/priceRefundReport` | 列表族 T1/T2 | P1｜必须整改 |
| P062 | 订单管理 / 退差价管理 / 退差价审核 | `/order/priceRefund/priceRefundAudit` | 列表族 T1/T2 | P1｜必须整改 |
| P063 | 订单管理 / 极速退款管理 / 极速退款设置 | `/order/fastRefund/fastRefundConfig` | T7 配置列表 | P2｜统一整改 |
| P064 | 订单管理 / 极速退款管理 / 白名单商品 | `/order/fastRefund/whiteList` | 列表族 T1/T2 | P2｜统一整改 |
| P065 | 订单管理 / CPS订单管理 | `/order/cpsOrderManage` | 列表族 T1/T2 | P1｜必须整改 |
| P066 | 订单管理 / 匹仓失败订单列表 | `/order/notMatchOrderList` | 列表族 T1/T2 | P1｜必须整改 |
| P067 | 商品管理 / 基础信息 / FA管理 | `/product/basic/fa` | T7 配置列表 | P2｜统一整改 |
| P068 | 商品管理 / 基础信息 / 产品组 | `/product/basic/productGroup` | T7 配置列表 | P2｜统一整改 |
| P069 | 商品管理 / 基础信息 / 产品品牌 | `/product/basic/brand` | T7 配置列表 | P2｜统一整改 |
| P070 | 商品管理 / 基础信息 / 产品分类 | `/product/basic/prodAssort` | T6 分栏设置 | P1｜必须整改 |
| P071 | 商品管理 / 基础信息 / DCG产品分类 | `/product/basic/dcgProdAssort` | T6 分栏设置 | P1｜必须整改 |
| P072 | 商品管理 / 基础信息 / 产品类型 | `/product/basic/productType` | T7 配置列表 | P2｜统一整改 |
| P073 | 商品管理 / 基础信息 / DCG类型管理 | `/product/basic/dcgType` | T7 配置列表 | P2｜统一整改 |
| P074 | 商品管理 / 基础信息 / 产品标签 | `/product/basic/tag` | T7 配置列表 | P2｜统一整改 |
| P075 | 商品管理 / 基础信息 / 物料维护 | `/product/basic/material` | 列表族 T1/T2 | P2｜统一整改 |
| P076 | 商品管理 / 基础信息 / 产品参数配置 | `/product/basic/parameter` | T6 分栏设置 | P2｜统一整改 |
| P077 | 商品管理 / 基础信息 / DCG产品配置参数管理 | `/product/basic/dcgTypeParam/product` | T6 分栏设置 | P2｜统一整改 |
| P078 | 商品管理 / 基础信息 / DCG分类配置参数管理 | `/product/basic/dcgTypeParam/category` | T6 分栏设置 | P2｜统一整改 |
| P079 | 商品管理 / 基础信息 / 规格配置 | `/product/basic/goodsSpecification` | T6 分栏设置 | P1｜必须整改 |
| P080 | 商品管理 / 商品管理 / Lenovo商品编辑 | `/product/goods/lenovoGoodsEditList` | 列表族 T1/T2 | P1｜必须整改 |
| P081 | 商品管理 / 商品管理 / Lenovo商品审核 | `/product/goods/lenovoGoodsListAuditList` | 列表族 T1/T2 | P1｜必须整改 |
| P082 | 商品管理 / 商品管理 / Lenovo商品列表 | `/product/goods/lenovoGoodsList` | 列表族 T1/T2 | P1｜必须整改 |
| P083 | 商品管理 / 商品管理 / Lenovo取消定时 | `/product/goods/cancelTiming` | 列表族 T1/T2 | P1｜必须整改 |
| P084 | 商品管理 / 商品管理 / EPP商品编辑 | `/product/goods/eppGoodsEditList` | 列表族 T1/T2 | P1｜必须整改 |
| P085 | 商品管理 / 商品管理 / Epp商品审核 | `/product/goods/eppGoodsListAuditList` | 列表族 T1/T2 | P1｜必须整改 |
| P086 | 商品管理 / 商品管理 / Epp商品列表 | `/product/goods/eppGoodsList` | 列表族 T1/T2 | P1｜必须整改 |
| P087 | 商品管理 / 商品管理 / EPP取消定时 | `/product/goods/eppCancelTiming` | 列表族 T1/T2 | P1｜必须整改 |
| P088 | 商品管理 / 产品管理 / Lenovo产品编辑列表 | `/product/productManage/lenovoProductEditList` | 列表族 T1/T2 | P1｜必须整改 |
| P089 | 商品管理 / 产品管理 / Lenovo产品审核列表 | `/product/productManage/lenovoProductAuditList` | 列表族 T1/T2 | P1｜必须整改 |
| P090 | 商品管理 / 产品管理 / Lenovo产品列表 | `/product/productManage/lenovoProductList` | 列表族 T1/T2 | P1｜必须整改 |
| P091 | 商品管理 / 产品管理 / EPP产品编辑列表 | `/product/productManage/eppProductEditList` | 列表族 T1/T2 | P1｜必须整改 |
| P092 | 商品管理 / 产品管理 / EPP产品审核列表 | `/product/productManage/eppProductAuditList` | 列表族 T1/T2 | P1｜必须整改 |
| P093 | 商品管理 / 产品管理 / EPP产品列表 | `/product/productManage/eppProductList` | 列表族 T1/T2 | P1｜必须整改 |
| P094 | 商品管理 / 产品管理 / DCG产品编辑列表 | `/product/productManage/dcgProductEditList` | 列表族 T1/T2 | P1｜必须整改 |
| P095 | 商品管理 / 产品管理 / DCG产品审核列表 | `/product/productManage/dcgProductAuditList` | 列表族 T1/T2 | P1｜必须整改 |
| P096 | 商品管理 / 产品管理 / DCG产品列表 | `/product/productManage/dcgProductList` | 列表族 T1/T2 | P1｜必须整改 |
| P097 | 商品管理 / 批量操作 / Lenovo 产品批量导入 | `/product/batch/batchExportList` | T5 任务/导入 | P2｜统一整改 |
| P098 | 商品管理 / 批量操作 / Lenovo产品导出明细 | `/product/batch/productsExportList` | T5 任务/导入 | P2｜统一整改 |
| P099 | 商品管理 / 批量操作 / Lenovo商品批量导入 | `/product/batch/goodsImportList` | T5 任务/导入 | P2｜统一整改 |
| P100 | 商品管理 / 批量操作 / Lenovo商品导出明细 | `/product/batch/goodsExportList` | T5 任务/导入 | P2｜统一整改 |
| P101 | 商品管理 / 批量操作 / 商品价格导出明细 | `/product/batch/innerQuotaExportList` | T5 任务/导入 | P2｜统一整改 |
| P102 | 商品管理 / 批量操作 / DCG 产品批量导入 | `/product/batch/dcgBatchImportList` | T5 任务/导入 | P2｜统一整改 |
| P103 | 商品管理 / 规格管理 / 商品规格关联 | `/product/specificationManage/goodsSpecificationContact` | 列表族 T1/T2 | P2｜统一整改 |
| P104 | 商品管理 / 规格管理 / 规格关联查询 | `/product/specificationManage/goodsSpecificationSearch` | 列表族 T1/T2 | P2｜统一整改 |
| P105 | 商品管理 / 价格管理 / 价格折扣编辑列表 | `/product/priceManage/priceDiscount` | 列表族 T1/T2 | P1｜必须整改 |
| P106 | 商品管理 / 价格管理 / 价格折扣审核列表 | `/product/priceManage/priceDiscountAudit` | 列表族 T1/T2 | P1｜必须整改 |
| P107 | 商品管理 / 价格管理 / 折扣列表-会员组维度 | `/product/priceManage/priceDiscountMemberDim` | 列表族 T1/T2 | P1｜必须整改 |
| P108 | 商品管理 / 价格管理 / 折扣列表-时间维度 | `/product/priceManage/priceDiscountTimeDim` | 列表族 T1/T2 | P1｜必须整改 |
| P109 | 商品管理 / 价格管理 / EPP内购额度 | `/product/priceManage/innerQuota` | T7 配置列表 | P2｜统一整改 |
| P110 | 商品管理 / 价格管理 / EPP外购额度 | `/product/priceManage/outerQuota` | T7 配置列表 | P2｜统一整改 |
| P111 | 商品管理 / 商详管理 / 联想发货&售后标签管理 | `/product/productDetailManage/deliveryAfterSale` | T7 配置列表 | P2｜统一整改 |
| P112 | 商品管理 / 商详管理 / 商品企业标签管理 | `/product/productDetailManage/businessList` | T7 配置列表 | P2｜统一整改 |
| P113 | 商品管理 / 搭配商品 / Lenovo组合升配 | `/product/goodsJoint/jointList/1` | T7 配置列表 | P2｜统一整改 |
| P114 | 商品管理 / 搭配商品 / EPP组合升配 | `/product/goodsJoint/jointList/3` | T7 配置列表 | P2｜统一整改 |
| P115 | 商品管理 / 搭配商品 / 服务价格配置 | `/product/goodsJoint/serviceItems` | T7 配置列表 | P2｜统一整改 |
| P116 | 商品管理 / 搭配商品 / 服务分类设置 | `/product/goodsJoint/serviceClassify` | T7 配置列表 | P2｜统一整改 |
| P117 | 商品管理 / 搭配商品 / 服务捆绑主品 | `/product/goodsJoint/bindList` | 列表族 T1/T2 | P1｜必须整改 |
| P118 | 商品管理 / 搭配商品 / 兑换商品列表 | `/product/goodsJoint/goodExchangeList` | 列表族 T1/T2 | P1｜必须整改 |
| P119 | 商品管理 / 搭配商品 / 0 元购商品列表 | `/product/goodsJoint/freeShopping` | 列表族 T1/T2 | P1｜必须整改 |
| P120 | 商品管理 / 搭配商品 / CTO产品分类 | `/product/goodsJoint/classfyDetailList` | 列表族 T1/T2 | P1｜必须整改 |
| P121 | 商品管理 / 搭配商品 / CTO商品列表 | `/product/goodsJoint/productList` | 列表族 T1/T2 | P1｜必须整改 |
| P122 | 促销中心 / 优惠券管理 / 优惠券列表 | `/campaign/coupon/couponList` | 列表族 T1/T2 | P1｜必须整改 |
| P123 | 促销中心 / 优惠券管理 / 优惠券分类列表 | `/campaign/coupon/couponCategoryList` | 列表族 T1/T2 | P1｜必须整改 |
| P124 | 促销中心 / 优惠券管理 / 用户优惠券 | `/campaign/coupon/userCoupon` | 列表族 T1/T2 | P1｜必须整改 |
| P125 | 每日签到 / 工作台 | `/signIn/workbench` | T3 数据看板 | P1｜必须整改 |
| P126 | 每日签到 / 数据看板 | `/signIn/dashboard` | T3 数据看板 | P1｜必须整改 |
| P127 | 每日签到 / 奖励配置 | `/signIn/reward` | T4 业务表单 | P1｜必须整改 |
| P128 | 每日签到 / 运势管理 | `/signIn/luck` | T3 数据看板 | P1｜必须整改 |
| P129 | 每日签到 / 库存管理 | `/signIn/inventory` | T3 数据看板 | P1｜必须整改 |
| P130 | 每日签到 / 日志 | `/signIn/log` | 列表族 T1/T2 | P1｜必须整改 |
| P131 | 用户中心 / 用户标签 / 用户标签列表 | `/userCenter/tag/page` | 列表族 T1/T2 | P1｜必须整改 |
| P132 | 用户中心 / 用户运营 / 活动列表 | `/userCenter/ops/aiOperationList` | 列表族 T1/T2 | P1｜必须整改 |
| P133 | 用户中心 / 用户运营 / 审批列表 | `/userCenter/ops/aiApproveList` | 列表族 T1/T2 | P2｜统一整改 |

## 6. 新增页面与状态更新规则

新增、改名、迁移或删除页面时，在同一变更中更新本矩阵；不得只改路由或菜单。

1. 写明业务域、页面名、稳定 `pageId`、路由、源码实现和 O 层级。
2. 只选择一个 T1–T7 主基础页型；需要详情、流程、报告、门户或日志结构时再叠加一个 V 变体。
3. 写明实际使用的 C 组件组、领域自有部分和完整 C9 状态；列表族必须最终判定 T1 或 T2。
4. 默认 E0。新增例外需记录原因、影响范围、确认人/确认结论和回退方案；不能复制其他页的例外代码作为理由。
5. 新页面先标 S1；只有截图、交互状态、响应式和关键数据边界完成走查后，才在交付记录中写“已通过”。
6. 关联 04 时记录 P 编号、名称/路由是否一致及历史优先级。修复当前页面后保留历史关联，不把 P1/P2 改写成 P3；另记当前复核结果。
7. 删除页面时从当前矩阵移除并确认路由、菜单、动态跳转和兼容入口均已处理；历史 UAT 索引保留，标注为历史证据而非当前范围。

## 7. 覆盖验收

一次“全项目页面—规范覆盖”只有同时满足以下条件才算完成：

- 当前路由中的每个业务内容页都能在第 3 节定位，且路由、实现层级与源码一致。
- 每页均有唯一主页型、组件组、专项变体、允许例外和真实走查状态。
- 04 的 133 个 P 编号无遗漏、无重复；阻塞项明确保留为 B。
- 当前页面与 04 的同名/同业务关联区分“同路由、路由漂移、无直接证据”。
- S1/S2/S3/S4 不被口头简化为“全部走查通过”；实际通过结论必须附浏览器截图、交互状态、响应式和数据边界证据。
- 新 PRD 或 POC 开始前先查矩阵；找不到页面或页型冲突时先更新矩阵并请求确认。
