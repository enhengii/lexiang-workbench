# Content Slot Migration Plan

This is the current migration plan for the 0825 Vue portal workbench middle content slot. UI/UX decisions for the general content slot also follow `content-slot-design-contract.md`.

## Contents

1. Baseline and current Vue routes
2. Current release scope and group inventory
3. Per-page migration procedure
4. Component extraction and regression
5. Required commands
6. Approved component extraction program

## Baseline

Active project:

```text
<app-root>
```

Shell areas are sealed Vue architecture:

- Left navigation.
- Topbar, breadcrumb, static tabs, dynamic tabs.
- Right Agent panel, composer, queue, history, report cards.

Do not change shell behavior while migrating business pages unless the user explicitly asks.

## Completed / Current Vue Route Pages

These pages are routed to Vue components and must not be moved back to `NativeWorkbenchPage`:

| Group | Page | Route | Component | Current Level |
|---|---|---|---|---|
| 首页 | 联想门户工作台 | `/portal/home` | `src/views/PortalHomeView.vue` | Vue native |
| 乐享运营 | 运营总览 | `/dashboard/overview` | `src/views/dashboard/DashboardOverviewView.vue` | Vue native baseline |
| 乐享运营 | Query 分析 | `/pipeline/annotate` | `src/views/dashboard/PipelineAnnotateView.vue` | Vue route, ECharts, some DOM helpers |
| 乐享运营 | 质量分析 | `/pipeline/quality` | `src/views/dashboard/PipelineQualityView.vue` | Vue route wrapper, `v-html`, `workbench-quality.js` |
| 乐享运营 | 流量分析 | `/ops/traffic` | `src/views/dashboard/OpsTrafficView.vue` | Vue route, reactive data, ECharts, local HTML string |
| 乐享运营 | GMV 分析 | `/ops/gmv` | `src/views/dashboard/OpsGmvView.vue` | Vue route, reactive data, ECharts, local HTML string |
| GEO 看板 | 整体数据概览 | `/geo/overview` | `src/views/geo/GeoOverviewView.vue` | Vue route wrapper, exact legacy visual body |
| GEO 看板 | 各平台信源分布 | `/geo/source` | `src/views/geo/GeoSourceView.vue` | Vue route wrapper, exact legacy visual body |
| GEO 看板 | 各平台意图分布 | `/geo/intent` | `src/views/geo/GeoIntentView.vue` | Vue route wrapper, exact legacy visual body |
| GEO 看板 | GEO 转化看板 | `/geo/conversion` | `src/views/geo/GeoConversionView.vue` | Vue route wrapper, exact legacy visual body |
| GEO 看板 | 手工上传知识 | `/geo/knowledge` | `src/views/geo/GeoKnowledgeView.vue` | Vue route wrapper, exact legacy visual body |
| 在职员工管理 | 职场员工概览 | `/employee/overview` | `src/views/employee/EmployeeOverviewView.vue` | Vue route wrapper, exact legacy visual body |
| 在职员工管理 | 职场员工审核 | `/employee/cert` | `src/views/employee/EmployeeCertView.vue` | Vue route wrapper, exact legacy visual body |
| 企业客户管理 | 线索看板 | `/lead/dashboard` | `src/views/lead/LeadDashboardView.vue` | Vue route wrapper, exact legacy visual body |
| 企业客户管理 | 线索池 | `/lead/pool` | `src/views/lead/LeadPoolView.vue` | Vue route wrapper, exact legacy visual body |
| 企业客户管理 | 打分模型 | `/lead/score` | `src/views/lead/LeadScoreView.vue` | Vue route wrapper, exact legacy visual body |
| Agent | Skill Hub | `/agent/skills` | `src/views/agent/AgentSkillsView.vue` | Vue native |
| Agent | 创建 Skill | `/agent/skill-create` | `src/views/agent/AgentSkillCreateView.vue` | Vue native |
| Agent | 权限管理 | `/agent/permissions` | `src/views/agent/AgentPermissionsView.vue` | Vue native, 0703 PM POC addition |

The migration bar for future pages is not “perfectly componentized on first pass”; it is:

1. Route points to a Vue component.
2. Page behavior, visual style, chart palette, states, and responsive shell rules are preserved.
3. Global legacy bridges do not expand.
4. Reusable components are extracted only when reuse/risk is real.

0703 Agent page note:

- 权限管理 is now part of the active Vue route/page-layer baseline.
- It should be updated as Vue source only, not by replacing the app with external POC files.
- Its workflow shell must match Skill 创建: tabbed steps, scrollable content body, fixed bottom action row, and the same middle-slot resize/crop order.

## Current Release Scope

Current visible left-nav groups are complete at the Vue route/page layer:

1. 乐享运营
2. GEO 看板
3. 在职员工管理
4. 企业客户管理

Search backend and risk management have been deleted from the first sealed project. Do not keep left-nav entries, business routes, placeholders, or migration plans for them. If they return later, add them from fresh requirements.

Hidden/detail pages remain legacy compatibility routes unless they are explicitly scheduled for a separate migration pass.

## Group Inventory

### GEO 看板

Current visible routes use independent Vue SFC wrappers:

- `/geo/overview` -> `dashboard.geo` -> `src/views/geo/GeoOverviewView.vue`
- `/geo/source` -> `dashboard.geoSource` -> `src/views/geo/GeoSourceView.vue`
- `/geo/intent` -> `dashboard.geoIntent` -> `src/views/geo/GeoIntentView.vue`
- `/geo/conversion` -> `dashboard.geoConversion` -> `src/views/geo/GeoConversionView.vue`
- `/geo/knowledge` -> `dashboard.geoKnowledge` -> `src/views/geo/GeoKnowledgeView.vue`

Likely components:

- GEO metric cards.
- Platform matrix / source distribution chart panels.
- Intent and conversion chart panels.
- Knowledge upload/status table.
- Report / saved-state action cards.

### 在职员工管理

Current visible routes use independent Vue SFC wrappers:

- `/employee/overview` -> `employee.overview` -> `src/views/employee/EmployeeOverviewView.vue`
- `/employee/cert` -> `employee.certification` -> `src/views/employee/EmployeeCertView.vue`

Hidden related routes:

- `/hidden/employee/list`
- `/hidden/employee/detail`
- `/hidden/employee/cert-detail`

Likely components:

- Employee filter bar.
- Employee table.
- Certification review table.
- Employee detail card / drawer.
- Approval action bar.

### 企业客户管理

Current visible routes use independent Vue SFC wrappers:

- `/lead/dashboard` -> `lead.dashboard` -> `src/views/lead/LeadDashboardView.vue`
- `/lead/pool` -> `lead.pool` -> `src/views/lead/LeadPoolView.vue`
- `/lead/score` -> `lead.score` -> `src/views/lead/LeadScoreView.vue`

Hidden related route:

- `/hidden/lead/detail`

Likely components:

- Lead KPI/funnel cards.
- Lead pool table.
- Assignment and follow-up actions.
- Scoring rule editor.
- Lead detail drawer/page.

## Per-Page Migration Procedure

For each page:

1. Read the current legacy renderer and runtime behavior for that `pageId`.
2. Register or update the route in `src/router/index.ts` to a Vue component only after the Vue page exists.
3. Preserve visible behavior, labels, filters, actions, tables, charts, empty/loading/error states, and Agent entry points.
4. Keep existing class names where they anchor shared CSS or visual contracts.
5. Move page state to Vue refs/computed/store state.
6. Move event handlers to Vue methods. Use temporary local DOM helpers only when replacing them would risk a visual/behavior regression.
7. Use ECharts through module import where possible; do not add new global chart bridges.
8. Preserve chart standards:
   - project chart palette;
   - legend swatches around `18x8`;
   - `16px` legend item gap;
   - enough bottom grid space for legends;
   - first-enter chart animation.
9. Preserve AI standards:
   - waiting state is transparent;
   - final assistant answers always have a bubble;
   - report cards open dynamic tabs.
10. Run required verification.

## Component Extraction Rule

Extract shared components when the same structure appears across at least two business groups or carries risky interaction:

- `PageHeader`
- `MetricCard` / `MetricGrid`
- `FilterBar`
- `ChartPanel`
- `DataTable`
- `StatusPill`
- `ActionToolbar`
- `ConfirmModal`
- `DetailDrawer`
- `EmptyState`
- `ReportWorkspace`

Keep local when the block is page-specific, unstable, or simpler inline.

## Approved Component Extraction Program

Decision `content-slot-extraction-2026-08-12` approves all 12 reviewed middle-content candidate groups. The Skill-bundled Vue library is the shared component baseline for PM, UI, AI and development work. This decision alone means 不修改 UAT 或产品源码; a development request with an identified target project starts the engineering mapping described below. The registry maps the 12 review groups to 14 separately governed contracts because `DataTable / ListSurface` and `ChartPanel + TimeRangeFilter` are independent.

The Wave 0–3 program below is the later engineering migration plan. It starts only when the user explicitly authorizes a named product repository. Using the Skill to generate a PM page or prototype does not start this migration.

### Style resolution

1. Treat UAT as the source for current business content, interaction, data shape and accepted behavior.
2. Compare all real consumers before selecting the shared visual result; do not copy one page dialect as the default.
3. Resolve conflicts through current Skill tokens and component contracts.
4. Present current dialects, proposed unified result and affected pages for confirmation before implementation.
5. Preserve page-specific needs through props, slots, composition or Domain wrappers; never add business switches to Common components.

### Wave 0 — evidence and freeze

- Freeze new additions to late global override files for the selected components.
- Build the consumer matrix: route, current class dialect, data shape, events, states, responsive behavior and source ownership.
- Capture wide and squeezed evidence for the pilot pages before changes.
- Record the exact current-project source baseline and rollback point.

### Wave 1 — stable primitives

- `ActionButton`
- `FormControl`
- `StatusTag`
- `ContentTabs`
- `FeedbackState`

Implement the smallest stable API first. Do not migrate business-specific blocks in this wave.

### Wave 2 — content compositions

- `ContentPageHeader`
- `SectionCard`
- `MetricGrid / MetricCard`
- `FilterBar`
- `ListSurface`
- `DataTable`
- `Pagination`

Pilot on `/dashboard/overview`, `/ops/traffic` and `/ops/gmv`. Keep behavior and data unchanged while replacing class dialects incrementally. A page remains on its existing implementation until its replacement passes the same-route comparison.

### Wave 3 — chart and time contract

- `ChartPanel`
- `TimeRangeFilter`

Define data scope, timezone/date boundary, ECharts lifecycle, resize on content-width changes, loading/empty/error/stale behavior and filter-to-page reset before migration.

### Expansion order

After the pilot passes, expand by implementation risk:

1. Vue-native content pages.
2. Vue pages with local HTML strings or DOM helpers.
3. Legacy runtime wrappers: GEO, employee and lead domains.
4. Hidden/detail compatibility routes only when separately scheduled.

Do not migrate a legacy wrapper merely to consume one component. Bundle that change with an approved page migration or use a temporary compatibility adapter with an explicit removal condition.

### Product engineering completion gate

A component is implemented only when all of the following are true:

- Shared Vue source exists and uses registered tokens.
- All planned consumers are listed and migrated or explicitly deferred.
- Applicable initial/loading/empty/error/no-permission/disabled/success/stale states pass.
- Wide and squeezed evidence has zero page-root horizontal overflow.
- Keyboard, focus, labels and semantic state announcements pass.
- No new global override or business-specific Common prop was introduced.
- Lint, typecheck, build, smoke and relevant browser regression pass.
- Registry truthfully changes to `project-shared-vue` only after the above evidence exists.

## Baseline Regression Requirement

After every migrated directory or page group, do not only verify the newly migrated pages. Also verify that the already confirmed baseline has not regressed.

The baseline includes every previously confirmed project capability and decision, not only the examples below:

- Sealed Vue shell boundaries: sidebar, topbar, static tabs, dynamic tabs, right Agent panel.
- Componentization decisions: existing shared components, page-local boundaries, route/page ownership, and no accidental move back to legacy runtime.
- Existing migrated pages: portal home, 乐享运营 5 pages, Agent/Skill pages.
- Existing business behavior: filters, tables, chart interactions, AI report openings, dynamic tabs, hidden/detail navigation where applicable.
- Existing visual contracts: tokens, card density, KPI surfaces, table style, chart palette, chart legend spacing, first-enter chart animation, icon rules, typography.
- Existing Agent contracts: waiting state transparent, final assistant answer bubble, queue/stop behavior, activity-state cards, report cards.
- Existing responsive shell behavior: middle content compresses first, sidebar auto-collapse next, Agent constraints last; no page-internal overflow regression.
- Existing verification commands and browser checks.

Regression routes:

```text
/admin-vue/portal/home
/admin-vue/dashboard/overview
/admin-vue/pipeline/annotate
/admin-vue/pipeline/quality
/admin-vue/ops/traffic
/admin-vue/ops/gmv
```

Also verify every newly migrated route. If the migrated group touches a shared component, shell class, global CSS, chart helper, Agent behavior, route config, store, or reusable data module, broaden regression to all pages that consume that shared surface.

## Required Commands

Run from:

```text
<app-root>
```

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:shell
```

Use browser verification for chart-heavy pages and for responsive shell changes.
