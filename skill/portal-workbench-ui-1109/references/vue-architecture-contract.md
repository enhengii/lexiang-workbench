# Current Vue Architecture Contract

This file defines the architecture and design constraints for the current 0825 Vue project, preserving the confirmed 0729 non-regression boundary and archived 0728 content evidence while adding the conversation-scoped AI result report contract. Earlier project and static-version rules are historical inputs already absorbed into this skill, not the active project baseline.

## Contents

1. Active project and engineering baseline
2. Source of truth and shell map
3. Shell, auth and content-slot migration rules
4. Styling and component extraction
5. Verification and design review

## Active Project

```text
<app-root>
```

The current baseline is:

```text
0825 Vue project + inherited 0729 non-regression boundary + archived 0728 visible-page evidence + conversation-scoped AI result selector + native Agent pages + sealed right Agent and Composer contracts
```

The shell and current visible left-nav pages are treated as Vue architecture.

## Required Engineering Baseline

The Vue app must keep:

- Vue 3.
- Vite.
- Pinia.
- Vue Router.
- TypeScript strict mode.
- `strict: true`.
- `noImplicitAny: true`.
- Base path `/admin-vue/`.
- Verification scripts:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm smoke:shell`

Do not weaken TypeScript or remove smoke checks to pass a change.

## Source Of Truth

Use this order:

1. Current 0825 Vue project code.
2. `src/assets/workbench.css`, `workbench-original-lock.css`, `workbench-prd-modules.css`, `workbench-ui-polish.css`, `workbench-preview-overrides.css`.
3. Current Vue shell components and stores.
4. This skill's current visual and interaction references.
5. Historical static project files only when explicitly needed for traceability.

## Current Vue Shell Map

```text
src/main.ts
src/router/index.ts
src/components/AppLayout.vue
src/components/shell/sidebar/WorkbenchSidebar.vue
src/components/shell/topbar/WorkbenchTopbar.vue
src/components/topbar/DynamicTabs.vue
src/components/shell/agent/WorkbenchAgentPanel.vue
src/components/agent/AgentMessageList.vue
src/components/agent/AgentComposer.vue
src/components/agent/AgentConversationStates.vue
src/components/WorkspaceTabs.vue
src/components/TempTabView.vue
src/stores/app.ts
src/stores/ai.ts
src/composables/
src/services/
src/utils/
src/config/runtimeMode.ts
src/adapters/legacyWorkbench/nativeWorkbenchRuntime.ts
src/views/NativeWorkbenchPage.vue
src/views/agent/AgentSkillsView.vue
src/views/agent/AgentSkillCreateView.vue
src/views/agent/AgentPermissionsView.vue
```

Compatibility wrappers such as `AppSidebar.vue`, `AppTopbar.vue`, and `AppAIPanel.vue` may exist, but new shell logic should prefer the `components/shell/` implementation.

## Shell Rules

The shell is already Vue architecture. Do not reintroduce static HTML shell assumptions.

- Routing belongs in `src/router/index.ts`.
- Shell state belongs in Pinia stores.
- UI side effects belong in composables/services.
- Theme sync belongs in a theme composable.
- Toast belongs in a service.
- Download helpers belong in utils.
- Body classes belong in composables.
- Page title, active page, tabs, and AI context should derive from route/store state.
- AI report artifacts must carry `conversationId` and assistant `messageId`; Topbar filtering uses the current AI conversation messages as the source of truth and must clear the active result when the conversation changes.
- Component-specific styles belong with the matching Vue component, not in a growing centralized style file.

## Auth Mode

Auth is explicit:

```text
VITE_AUTH_MODE=preview
VITE_AUTH_MODE=server
```

Default:

- development: `preview`
- production: `server`

Production must not silently enter demo mode when backend auth fails.

## Content Slot Migration Status

The middle content slot is being migrated by page group.

Current status:

- Shell componentization is complete for the confirmed baseline: sidebar, topbar/static tabs, dynamic tabs, right AI assistant, routing, Pinia state, and shared shell composables/services are Vue-owned.
- The middle content slot is Vue route/page-layer complete, but not fully componentized internally.
- Business pages intentionally remain at mixed implementation depths: Vue-native pages, Vue route wrappers around exact legacy visual bodies, and transition pages that still use local `v-html` or legacy runtime helpers.
- Future PM work may add new pages or optimize existing pages, but it must not assume every content-slot block has already been extracted into reusable Vue components.

Vue route content pages:

```text
src/views/PortalHomeView.vue
src/views/dashboard/DashboardOverviewView.vue
src/views/dashboard/PipelineAnnotateView.vue
src/views/dashboard/PipelineQualityView.vue
src/views/dashboard/OpsTrafficView.vue
src/views/dashboard/OpsGmvView.vue
src/views/agent/AgentSkillsView.vue
src/views/agent/AgentSkillCreateView.vue
src/views/agent/AgentPermissionsView.vue
src/views/geo/GeoOverviewView.vue
src/views/geo/GeoSourceView.vue
src/views/geo/GeoIntentView.vue
src/views/geo/GeoConversionView.vue
src/views/geo/GeoKnowledgeView.vue
src/views/employee/EmployeeOverviewView.vue
src/views/employee/EmployeeCertView.vue
src/views/lead/LeadDashboardView.vue
src/views/lead/LeadPoolView.vue
src/views/lead/LeadScoreView.vue
```

Status detail:

- `DashboardOverviewView.vue`: Vue-native template/page baseline.
- `PipelineAnnotateView.vue`: Vue route page with ECharts and some migration-era DOM helpers.
- `PipelineQualityView.vue`: Vue route wrapper with `v-html` content and `public/admin-runtime/workbench-quality.js`; no longer routed by `NativeWorkbenchPage`, but still transition-level internally.
- `OpsTrafficView.vue` / `OpsGmvView.vue`: Vue route pages with reactive state and ECharts, still using local `v-html` string templates as a transition structure.
- Agent pages are native Vue pages and must not be moved back into legacy runtime.
- GEO 看板、在职员工管理、企业客户管理 currently use independent Vue SFC wrappers with exact legacy visual bodies via `renderNativeWorkbenchPage(pageId)` and `runNativeWorkbenchPageInit(pageId)`.

Search backend and risk management are deleted from the first sealed project. Do not keep old business routes, placeholders, or legacy compatibility entries for them. Hidden/detail compatibility pages may still use legacy runtime.

They may render through:

```text
src/views/NativeWorkbenchPage.vue
src/adapters/legacyWorkbench/nativeWorkbenchRuntime.ts
public/admin-runtime/
```

Rules:

- Do not add new shell-level `window.*` bridges outside the adapter.
- Do not add new global `innerHTML` rendering paths outside `NativeWorkbenchPage` or the established Vue route wrapper migration pattern.
- Do not put new Vue shell behavior into `public/admin-runtime`.
- New shell features must not depend on legacy scripts.
- Legacy APIs are compatibility surfaces for exact-style Vue wrappers, hidden/detail pages, and out-of-scope routes.
- Migrated content-slot pages should own their state in Vue refs/computed/store calls, not in global DOM mutation.
- Cross-page edit/review handoff should use route query, Pinia, or session-scoped draft data. DOM field patching after navigation is only a temporary compatibility bridge and should not be the source of truth.
- Once a page route points to a Vue component, do not route it back through `NativeWorkbenchPage` unless the user explicitly asks for a rollback.
- When migrating a new page group, preserve shell areas and previously migrated page behavior. Do not change left navigation, topbar, Agent panel, or the already migrated 乐享运营 pages unless the task explicitly asks.
- Follow the migration order and page inventory in `references/content-slot-migration-plan.md`.

## Styling In Vue

Vue components must keep the current 0825 Vue class/token contract:

```vue
<button class="btn btn-primary">...</button>
<div class="card">...</div>
<input class="form-input" />
```

Component style ownership:

- Put new or migrated component-specific styles in the matching `.vue` file with `<style lang="scss" scoped>`.
- Keep `src/assets/workbench*.css` for design tokens, reset/base styles, shared class contracts, cross-shell layout rules, and legacy content-slot transition styles.
- Do not keep appending private shell-component styles to centralized global CSS.
- Do not move broad token definitions or base classes into scoped blocks.
- Migrate styles component by component: shell, sidebar, topbar, AI panel, static/dynamic tabs first; middle business pages only when their Vue migration starts.
- During middle-page migration, keep existing class names and IDs when they anchor CSS or tests, then move behavior into Vue event handlers and reactive state.
- The 0703 project includes `sass` for `<style lang="scss" scoped>` support; all required verification commands must still pass after style changes.

Do not replace the current 0825 visual system with third-party defaults.

Allowed:

- Reusing existing CSS classes.
- Adding narrowly scoped classes that compose with existing tokens.
- Adding a new base/business component when it reduces repeated high-risk UI.

Not allowed:

- New one-off design language.
- Inline style as the only selected/active/error state.
- Component libraries that output unmatched default styling.
- Hardcoded colors when a token exists.

## Component Extraction For Future Business Pages

When business pages are later migrated, decide extraction by reuse and risk.

Extract shared components when a module is:

- Used by 2+ business domains.
- Repeated inside a page with the same interaction.
- State-heavy: loading, empty, error, selected, disabled, permission, batch.
- Connected to AI report tabs, export, confirmation, detail drawer, or external link tabs.
- Styling-critical across the product.

Keep local when a module is:

- Single-use.
- Strongly tied to one page's business rule.
- Product-unstable.
- More complex after extraction.
- Mostly static page-specific copy or layout.

Recommended shared components:

```text
KpiCard
MetricGrid
FilterBar
DataTable
PaginationBar
StatusPill
ActionToolbar
ConfirmModal
DetailDrawer
EmptyState
ReportWorkspace
ExternalLinkTabTrigger
```

## Required Verification

For Vue project code changes:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:shell
```

For shell interaction changes, also preview these routes:

```text
/admin-vue/portal/home
/admin-vue/dashboard/overview
/admin-vue/lead/dashboard
```

For 乐享运营 regression after migration-related work, also preview:

```text
/admin-vue/dashboard/overview
/admin-vue/pipeline/annotate
/admin-vue/pipeline/quality
/admin-vue/ops/traffic
/admin-vue/ops/gmv
```

Check:

- Vue app mounts.
- Sidebar is visible.
- Topbar/static tabs are visible.
- AI panel is visible.
- The Topbar AI result selector still activates the dynamic report view in the middle content slot; no second-row tab strip is rendered.
- No project console errors.

## Design Review Checklist

Before approving a design or implementation:

- Does it preserve the current 0825 visual density and token usage?
- Does it map cleanly to Vue components/stores/composables?
- Does it avoid new global DOM bridges?
- Does it avoid weakening TS strictness?
- Does it keep middle business pages out of scope unless explicitly requested?
- Does it pass the required verification scripts?
