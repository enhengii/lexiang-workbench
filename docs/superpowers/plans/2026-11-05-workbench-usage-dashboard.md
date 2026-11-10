# 工作台使用数据看板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在NEW提供可浏览、可筛选并明确标注样例的工作台使用数据看板。

**Architecture:** 纯数据模块负责合成记录及聚合；Vue页面组合现有内容组件；个人入口通过现有路由、store和静态页签进入。页面局部图表不修改公共组件。

**Tech Stack:** Vue 3、Pinia、Vue Router、ECharts、Node内置测试。

## Global Constraints

- 使用数据均为固定合成样例，不接真实统计、调用、权限或结果导出接口。
- 复用0914共享内容组件，保留全局Agent、既有样式及protected admin-runtime。
- 只部署NEW，不修改正式或远端main。

## Task 1: 样例数据与聚合

- [ ] 在 `vue-app/scripts/usage-dashboard.test.mjs` 覆盖周期去重、窗口、对账、筛选、空数据、零分母与CSV转义；先运行确认缺失能力导致失败。
- [ ] 在 `vue-app/src/domain/usageDashboard.js` 提供 `getUsageReport` 和 `usageRowsToCsv`；所有指标共享确定性记录。
- [ ] 运行 `node --test scripts/usage-dashboard.test.mjs`，确保通过。

## Task 2: 页面与入口

- [ ] 新建 `UsageDashboardView.vue` 和必要局部图表，完成使用概览、Skill分析、日期筛选、聚合详情和CSV下载。
- [ ] 在 `SidebarFooter.vue`、`WorkbenchSidebar.vue`、router、app store、内容槽合同和页面扩展登记接入同一pageId。
- [ ] 添加一条 `workbench-usage-dashboard-20261105` POC记录。

## Task 3: 验证与NEW发布

- [ ] 运行设计guard、lint、typecheck、build及smoke:shell；检查仅目标文件差异。
- [ ] 本地浏览器覆盖主要交互、空态、Agent开合及1280px响应式；保留截图与结果。
- [ ] 保存功能提交到服务器普通preview分支；在独立工作区构建，核对NEW原入口和runtime哈希，再增量发布及登记new状态。
- [ ] 公网复验入口和路由，核对正式入口未变及runtime完整，保存发布证据。
