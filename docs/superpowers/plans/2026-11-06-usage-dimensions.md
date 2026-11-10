# Skill 与创建人维度看板 Implementation Plan

> **For agentic workers:** Use subagent-driven-development for independent data, UI, and release preparation tasks; root integrates and reviews.

**Goal:** 在 NEW 现有使用看板中完成 Skill 与创建人两个维度的看板、聚合明细和调用下钻。

**Architecture:** 原样例记录为唯一统计源。数据层提供按对象范围筛选与加权聚合；页面组合现有共享控件；同一个详情模态承载创建人与 Skill 的上下文切换。

**Tech Stack:** Vue 3、TypeScript strict、Vite、现有 ECharts 和 Node test。

## Global Constraints

- 只发布 NEW；保留 formal、权限管理、admin-runtime、共享样式及原始 WIP。
- 明确样例数据，创建人按其 Skill 归属汇总，零分母为 null。
- 继续使用 `/admin-vue/agent/usage-dashboard` 与个人账号入口。
- 各任务不提交他人文件，根 agent 统一审查并精确提交。

### Task 1: 同源数据与导出

**Files:** `vue-app/src/domain/usageDashboard.js`、`vue-app/scripts/usage-dashboard.test.mjs`。

- [x] 先添加失败测试：跨 Skill 去重、加权聚合、对象/模块过滤、上线零调用、明细对账、日期边界、CSV 及返回对象隔离。
- [x] 添加 `getUsageAnalysis({startDate,endDate,module,search,dimension,creatorId,skillId})`，返回 summary/trend/skills/creators/calls，原报表 API 兼容。
- [x] 分配稳定创建人 ID、给既有调用补安全 metadata，新增 `usageCreatorsToCsv` 与 `usageCallsToCsv`，不改变旧调用数。
- [x] 验证域测试通过，明确字段及无反馈/无调用语义。

### Task 2: 两维度分析与下钻

**Files:** `vue-app/src/views/agent/UsageDashboardView.vue` 与 `vue-app/src/views/agent/usage/` 中 page-local 组件。

- [x] 保留概览和公共日期，添加创建人 tab，Skill/创建人面板各自保留筛选状态。
- [x] 组合指标卡、排行、质量比较、聚合列表和全部筛选行导出。
- [x] 同一详情模态支持汇总、趋势、调用明细及创建人名下 Skill，状态/反馈过滤与分页；创建人到 Skill 可返回。
- [x] 使用既有 tokens、无障碍交互和容器响应式，不增加全局覆盖。

### Task 3: 登记与定向验收

用户追加日报后新增独立数据模块 `vue-app/src/domain/usageDailyReport.js`、`usageDailyReportData.json`、对应测试与只读标准库导入脚本；新增私有 `UsageDailyReportPanel.vue` 及日报详情组件。主页面默认日报，显式切换样例，三个页签保持一致。按真实数据可得性保留日×Skill粒度、不可去重人数及缺失标注；统计加权与来源对账先写失败测试再实现。根 agent 负责真实模式页面集成，避免与样例 UI 并发编辑。

**Files:** `vue-app/design-page-extensions.json`、`vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue`、本计划与设计文档。

- [x] 同一 POC 功能行更新范围，不新增重复记录；页面登记扩充子模式。
- [x] 合并审查数据与 UI 语义，运行规定工程检查和新增文件设计检查。
- [x] 浏览器核对两维度、筛选、两级明细、CSV触发、零结果、关闭焦点与默认桌面布局；截图及结果保存到独立交付目录。
- [ ] Agent展开组合：本轮未继续操作既有AI使用提示；未将样式检查或历史运行证据当作本轮实际交互验收。

### Task 4: NEW 增量发布

**Files:** 独立交付目录 `交付记录/2026-11-06-使用数据看板维度扩展/` 中发布脚本和证据。

- [ ] 刷新 NEW 现场和上次资源清单，对照候选父提交与精确文件范围。
- [ ] 推 preview 候选分支，独立服务器工作区构建，使用锁和基线 SHA 防止覆盖并行发布。
- [ ] 增量发布 NEW 并记录实际发布账号、北京时间和版本。
- [ ] 核对公网资源、NEW 台账与正式/runtime 保护证据，保存交付结果，停止临时本地服务。
