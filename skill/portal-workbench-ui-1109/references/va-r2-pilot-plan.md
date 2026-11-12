# VA-R2 代表页试跑合同

当前 0825 视觉登记仍为 VA-0。本计划只定义首批证据闭环，不预先升级任何页面状态。

| 代表页 | 页型 | 路由 | 选择原因 |
|---|---|---|---|
| 乐享运营 / 运营总览 | T3 数据看板 | `/dashboard/overview` | 验证 PageHeader、KPI、图表、数据口径与 Agent 挤压 |
| 企业客户 / 线索池 | T2 长筛选列表 | `/lead/pool` | 验证 FilterBar、Table、操作列、分页和窄内容槽滚动 |
| Agent / Skill 创建 | T4 + V2 多步流程 | `/agent/skill-create` | 验证专项流程、固定底部操作、表单状态和 E3/E4 边界 |

每页只有同时满足以下条件才能从 VA-0 升到 VA-R2：

1. `wide` 与 `squeezed` 两个 profile 都来自当前 0825 可运行实现，HTTP 200，非登录页、非 WIP。
2. 每个 capture 都记录 viewport、sidebar、agent、contentInnerWidth、页面和 document 横向溢出指标。
3. 页面错误为空；页面级与 document 级 `scrollWidth - clientWidth` 均为 0。
4. 截图人工复核 PageHeader 节奏、页型结构、字号、圆角、间距、表格/表单可达性和封板表面。
5. 至少验证与该页有关的初始、加载、空、错误、无权限、禁用、提交中、成功、部分成功、数据过期状态；无法触发的状态记录真实 blocker，不能伪造。
6. 将截图引用、指标和 findings 写入 `page-visual-acceptance.json`，同步页面矩阵状态，再运行一致性检查。

视觉总览随证据演进：无当前截图时使用 `not-captured`；部分页面开始补证时使用 `in-review`；只有全部非阻塞页面至少达到 VA-R2 或已有明确 VA-FAIL 结论后才能使用 `reviewed`。`reviewedPages` 与 `reviewedCaptures` 必须等于登记中的真实数量。

VA-R2 只代表两组响应式视觉证据和规定指标完成，不等于真实数据、全部交互或无障碍 VA-PASS。
