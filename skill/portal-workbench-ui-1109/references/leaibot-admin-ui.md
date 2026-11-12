# Leaibot Admin UI 历史吸收参考

本文件保留早期已确认视觉和交互的追溯证据，不再是默认当前入口。正常设计与实现先读取根 `SKILL.md`、`style-contract.md`、`content-slot-design-contract.md` 和任务对应专项；只有明确追溯历史或当前合同缺少证据时才读取本文件。历史日期段（包括 0729）不能覆盖当前 0825 Vue 源码和 0825 合同。

## 目录

1. Vue 架构吸收说明
2. Design Positioning 与 Visual DNA
3. Layout Rules
4. 历史 Implementation / Verified Refinements
5. 当前可复用 Page Composition 与 Component Rules
6. Interaction States、Responsive、Do / Do Not

## Vue Architecture Absorbed Evidence

The active design and implementation baseline is the 0825 Vue project; 0729 is retained only as inherited historical and non-regression evidence:

```text
<app-root>
```

The earlier static-version and 0729 visual and interaction language has been absorbed into this 0825 skill. New work should treat the 0825 Vue project as the current baseline:

- The workbench shell is implemented by Vue components, Pinia stores, Vue Router, composables, services, and typed adapters.
- Sidebar, topbar, static tabs, dynamic tabs, and the right AI assistant are no longer treated as static `workbench.html` DOM.
- The middle business pages remain in a transitional legacy content slot until explicitly migrated.
- `legacyWorkbenchRuntime` is the only intended bridge to old page renderers.
- New shell features must not add new global `window.*` APIs, global `innerHTML` rendering, or scattered DOM side effects.
- The production implementation must keep strict TypeScript and pass `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm smoke:shell`.
- Auth now has explicit runtime modes: development preview and production server auth. Designs should not assume automatic production demo fallback.

Design impact:

- All current shell visual rules must map to Vue components and typed state.
- Any new reusable UI pattern should be judged as a Vue component candidate only when it has real reuse or interaction risk.
- Business-page migration must classify high-reuse modules before extracting components; single-use page-specific blocks may stay local.

## Design Positioning

Design as a dense, data-first enterprise operations workbench. The product should feel quiet, precise, and ready for repeated daily use, not like a marketing landing page.

Primary user intent:
- Read operational metrics quickly.
- Compare trends, traffic, GMV, product, platform, and scenario breakdowns.
- Move between admin modules from a compact sidebar.
- Ask the right-side AI assistant for analysis without leaving the current page.

## Visual DNA

Use a Feishu-like Chinese enterprise SaaS style:
- White surfaces on a light gray app background.
- Fine borders instead of heavy elevation.
- Compact typography and generous enough spacing for scanability.
- Blue as the main action/data color, Lenovo red only as brand accent.
- Cards are functional containers, not decorative hero blocks.

Core tokens:
- Primary: `#3370ff`; hover `#245bdb`; primary wash `rgba(51,112,255,0.08)`.
- Brand red: `#e2001a`; use mainly for logo, alerts, logout danger, or severe states.
- Canvas background: `#f5f6f8`; nested/input surface: `#f1f3f5`; card/sidebar/topbar: `#ffffff`.
- Border: `#dde1e6`; light border: `#e7eaee`; hover border: `#cbd1d8`.
- Text: `#1f2329`; secondary `#646a73`; tertiary `#8f959e`.
- Status colors: green `#34c724`, orange `#ff7d00`, purple `#722ed1`.
- Radius: `8px` for controls and compact items, `12px` for major cards.
- Shadow: mostly none; use `0 1px 2px rgba(15,23,42,.035)` for base surfaces. Center data module hover is lightweight: primary-tint border, `0 1px 2px rgba(15,23,42,.035), 0 6px 14px rgba(15,23,42,.055)`, and `translateY(-1px)`.

Typography:
- Font stack: system Chinese UI, `-apple-system`, `PingFang SC`, `Helvetica Neue`, `Microsoft YaHei`, sans-serif.
- Body: `14px`.
- Page title: `18px`, weight `600`.
- Card title: `14px`, weight `600`.
- KPI value: `24px`, weight `700`.
- Table/input/sidebar text: `12-13px`.
- Supporting captions: `11-12px`, tertiary or secondary text.

## Layout Rules

Use a three-column admin shell:
- Left sidebar: `168px`; collapsed: `58px`.
- Topbar: `56px` high, with breadcrumb + static tabs left and AI action right. Current 0825 Vue portal workbench hides the global search and dark/light theme toggle by default. When the theme toggle is hidden, the runtime must force light mode and clear/ignore persisted dark-mode storage.
- Main content: flex column, gray background, scrollable content area.
- Page padding: `20px 24px`.
- Right AI panel: closed width `0`; open width `380px` by default, with a resize handle that can expand to about `492px`. The closed state must not keep a visible/offscreen interactive panel, border, or layout width.

When the AI panel is open, reduce visual density gracefully:
- KPI grid may become two columns.
- Avoid horizontal overflow; opening the AI panel must not create page-level horizontal scrolling.
- Keep the AI panel fixed and independent from the main content scroll.

Do not create landing-page heroes, decorative gradients, floating orb backgrounds, or oversized marketing sections. First screen must be the usable workbench.

## 2026-06-04 Implementation Addendum

The following rules are mandatory for the current Leaibot admin project and future HTML previews unless the user gives a different direction.

### Default Deliverable

- Output design requests as HTML preview pages by default.
- Keep both previewable HTML and editable code structure available for later iteration.
- When redesigning an existing Leaibot page, preserve every existing function point: navigation, filters, tabs, table actions, forms, chart containers, AI assistant shortcuts, and page switching.

### Global Alignment Contract

- Align all modules horizontally and vertically when they are meant to be compared in the same row.
- Let grid gap control row spacing; do not add `margin-top` to adjacent cards inside a grid.
- Direct children of 2/3/4-column grids must use `align-items: stretch`, `height: 100%`, `min-width: 0`, and consistent card header/content structure.
- In one row, table cards and chart cards must share the same top edge and final height. Their inner content areas should also share the same available height.
- Mixed data presentation in one row must be adaptive: a table, doughnut chart, bar chart, trend chart, or KPI tile should fill its card without stretching text, icons, or canvas graphics.
- Use responsive constraints such as `minmax(0, 1fr)`, stable header height, fixed control height, and chart `resize()` after layout changes.

### Spacing Rhythm

- Keep page-level modules separated by consistent section spacing; do not rely on accidental card margins.
- Section title to first card: `12px`.
- Grid card gap: `14px` in the Leaibot workbench.
- Top overview KPI row: keep `12px` from page header to the KPI grid, `14px` between KPI cards, and `16px` from the KPI grid to the next module.
- Card header height: `54px`; content starts immediately below the header with consistent `16px` horizontal padding.
- KPI/metric cards use consistent inner order: label, value, subtext.
- KPI cards in the same row must be equal width, equal height, and share one top edge. Use `repeat(4, minmax(0, 1fr))` on wide screens and `align-items: stretch`; switch to two columns only when constrained by the AI panel or viewport.
- Tabs and filters must reserve space, not squeeze: tab rail `48px`, tab button `40px`, filter controls `36px`, filter row gap `12px`.

### Visual Style Refinement

- Keep the overall style light and white, with primary blue as the main accent.
- Use simple auxiliary colors only to reduce monotony: green for positive/active, orange for warning or secondary category, purple for advanced/GMV/AI-related category, red only for brand/danger.
- Keep every center-content top primary metric block consistent across all current modules: fixed four very-light gradient surfaces in order (pale blue, pale cyan, pale indigo, pale purple), thin border, subtle shadow, and clear text hierarchy. This applies to operations, GEO, employee, lead/customer, data query, quality, report, and PRD pages. Lower chain steps, breakdown tiles, tables, chart containers, filters, pending placeholders, and large panels stay white.
- Do not use decorative semicircle blobs, corner dots, orb/bokeh backgrounds, repeated left-line accents, top accent bars, or repeated label dots on every color block. If many cards repeat the same accent structure, reduce the decoration.
- For top overview KPI rows, use the fixed four-color light-gradient information palette with clear typography and subtle dividers. Use semantic colors only for deltas, status text, tags, or charts, not as saturated card background washes.
- Avoid making all KPI cards the same saturated green, blue, or red panel. Saturated fills are reserved for rare highlighted status summaries, not normal dashboard comparisons.
- Prefer coordinated light-gradient metric cards and white content containers over saturated panels.
- Charts use the 0702 Operations Overview and Query Analysis palette: medium-low saturation, blue/green/purple-led, richer than the old muted set but still calm. Prefer a single sequential scale for ranked/level data, or the coordinated `--chart-*` categorical palette for categories. Do not mix saturated primary red/blue/green/yellow blocks in ordinary classification charts; reserve strong red for real warning, failure, or risk states.
- When updating the local preview, apply these rules to the shared center workspace and final override CSS, not to a single page selector. A fix that only changes “乐享运营” is incomplete. If demo modules contain inline gradients or inline chart colors, the final override layer and chart palette bridge must beat or map those inline values too.

### Icons, Buttons, and Typography Integrity

- Use one icon tone across the project: compact linear icons, `16-20px`, primary-wash background only when the icon is a heading marker or important tool icon.
- Every icon, logo, SVG, avatar, chart canvas, and bitmap must preserve its aspect ratio. Never stretch horizontally or vertically.
- Icon-only buttons must be square and provide title/tooltip or accessible label.
- Icon-only button tooltips must remain visible and must not be clipped by the topbar, AI panel header, composer, drawers, or other overflow containers. Topbar and AI header tooltips may open downward; composer/footer tooltips should open upward. Raise tooltip z-index above panels and popovers.
- Attachment and send controls in the AI composer are icon-only square buttons. Do not show text labels such as `附件` or `发送` inside the control when a familiar icon is available.
- Buttons use fixed heights: `28px` compact, `32/36px` normal Leaibot controls, `44px` prominent actions.
- Button text must not deform, scale, or wrap unexpectedly; use `white-space: nowrap`, stable padding, and overflow handling.
- UI text must use `letter-spacing: 0`; do not scale font size with viewport width.
- Long titles or labels should truncate or wrap by design; they must not overlap adjacent controls.

### Module Headers

- All card/module titles use one standardized header pattern: left title with heading icon, right optional note/action aligned to the top-right area.
- Header content must be vertically centered and keep clear spacing from the card content below.
- If a header includes tabs, pills, buttons, or notes, place them in the right side of the header or in a dedicated filter rail, never floating at arbitrary offsets.
- Module/card titles must stay top-left, horizontal, and non-compressed. When filters, buttons, tabs, or notes do not fit on the same row, wrap those controls to the next line instead of squeezing the title or letting Chinese text stack vertically.
- Section headers use left/right edge alignment: the title group anchors to the left edge, while notes, filters, `问 AI`, and action buttons align to the right edge of the same module. If there is not enough room, the whole action group wraps below without compressing or vertically stacking the title.
- Title markers, title text, status tags, and right-side actions must share a clear horizontal center/baseline. Vertical bars and dots are visual anchors, not independent decorative offsets.
- Page and module titles should not use emoji as functional icons. Replace decorative emoji with unified CSS/SVG/lucide-style icons.

### Tabs and Filters

- Tabs must consider spacing as a component: full-width rail, clear bottom border, active blue underline, and consistent gap.
- Count text inside tabs must not change button height or alignment.
- Search/filter rows use grid or flex with fixed control heights and clear gaps; search input should flex while select/button widths remain stable.
- Filter rows in card headers may wrap to a second line; title alignment remains the anchor.
- Page-level tabs use only text color and underline for selected state; never use filled tab blocks. Click handlers must toggle the standard `.active` class and corresponding panel visibility, then clear conflicting inline color or border styles.
- Filter chips, time-range pills, and segmented buttons are not page-level tabs. They use bordered pill styling with `8px` same-group gap, `12px` horizontal padding, stable `32/36px` height, primary fill + white text for selected state, and readable light/dark inactive states.
- GEO conversion date filters use the same pill/control rhythm: date inputs align to the period pills, `近7天 / 近30天` are separated pills, not a connected segmented control.
- On constrained desktop widths, allow horizontal scrolling or wrapping at component boundaries; do not compress controls until text becomes unreadable.

### Right AI Assistant Panel

- Default right AI assistant width is `380px`; resizing may expand it to about `492px`, but the lower bound should remain `380px`.
- The topbar AI assistant switch opens the panel. When the panel is open, hide this topbar switch and let the panel header become the active AI assistant surface.
- Closing the panel from its header must restore the topbar AI assistant switch, remove `body.ai-open`, persist the closed state, and return the panel to `0px` layout width.
- Panel header: avatar / online status + `AI 助手` title + current attention pill on the left; 4 icon-only actions on the right: 管理技能, 新开会话, 历史对话, 收起 AI 助手.
- Page shortcut tags belong near the input composer, not under the panel header. Place them above the input row so they support the next command directly.
- Shortcut/scope tags remain flat, compact, and scan-friendly: single-line pill row with horizontal scroll and `24px` round arrow controls in all widths and after AI panel collapse/expand/resize; do not degrade to a select for the current 0825 Vue workbench.
- Shortcut/scope tags have no default selected pill. They become active only after click / keyboard activation. Query tags send their query; function tags open the matching modal, drawer, or page entry.
- The input composer uses a grouped container: scope tags above, attachment + textarea + send button below. The tag row must not push messages into an unusable area.
- The textarea starts at `36px`, auto-grows until 3 lines (`75-76px`), then scrolls internally while keeping the caret at the last line. Empty input returns to the default height.
- The send button is one icon-only square control in both themes: `32x32px`, `10px` radius, one `15px` SVG. Do not combine an inline SVG with a pseudo-element icon.
- Header refresh/new-conversation, close, attachment, and send actions should use the same icon-only button treatment and tooltip behavior as the topbar.

## 2026-06-07 Verified UI Refinements

These refinements were implemented and verified in the local Leaibot workbench. Treat them as current project defaults.

### Light Surface Hierarchy

- Use a three-level light surface system instead of a pure-white page:
  1. Canvas: very light neutral gray `#F5F6F8`, optionally with a soft unified gradient.
  2. Primary surfaces: cards, sidebar, topbar, AI panel remain `#FFFFFF`.
  3. Nested surfaces: inputs, filter bars, table heads, AI input combo use `#F1F3F5` or `#EEF1F4`.
- The center workspace should keep the light style but may use a subtle background gradient:
  `radial-gradient(circle at 18% -8%, rgba(51,112,255,.055), transparent 34%)`,
  `radial-gradient(circle at 88% 2%, rgba(22,163,74,.035), transparent 28%)`,
  and `linear-gradient(180deg, #F8F9FB 0%, #F5F6F8 42%, #F1F3F6 100%)`.
- Cards float through contrast and a very light shadow, not heavy elevation. Base card shadow is around `0 1px 2px rgba(15,23,42,.035)`.
- Card hover must remain available but light: center data modules use primary-tint border plus `0 1px 2px rgba(15,23,42,.035), 0 6px 14px rgba(15,23,42,.055)` and `translateY(-1px)`.
- Bordered outline modules use the primary border on hover or selected states, with a subtle primary ring/shadow. Do not turn these modules into filled highlight blocks unless they are actual selected chips, filters, or primary actions.

### Top Metric Cards

- Top metric cards use the shared four very-light `135deg` information gradients: pale blue, pale cyan, pale indigo, and pale purple, with thin border, subtle shadow, and clear label/value/subtext hierarchy.
- Do not use saturated semantic gradient washes, repeated label dots, left accent lines, or top accent bars for KPI cards.
- Semantic colors may appear in delta text, status tags, chart legends, or rare inline markers only when they communicate state.
- The card should read as a calm light-gradient information card using the fixed four-color cycle. Avoid saturated panels and repeated decorative accents unless the page explicitly needs a strong summary state.
- Secondary metric groups inside a card and lower content modules stay white with subtle dividers; do not inherit the top metric gradient.

### Center Data Display

- The center workspace is the shared data display surface for the whole portal. Any update to KPI cards, nested metric tiles, chart cards, table cards, empty/pending data blocks, and grouped analysis panels must be applied globally.
- Do not scope these visual fixes to one business module. Use shared classes / final override layers that cover `.page-content` cards, panels, KPI tiles, chart containers, tables, and repeated nested metric blocks.
- Pending data cards such as “待接口提供数据” use the same flat white surface and subtle border as normal data cards; do not use tinted blue-gray fills or decorative washes to indicate placeholder state.
- Page header areas stay flat on the shared canvas; do not add per-page header gradients or colored wash bands.
- Filter rows should stay on one line whenever there is enough horizontal space. If controls exceed the content width, prefer horizontal overflow or compact control widths before forcing the primary action button onto a second line.
- Main tabs across modules use text color plus an active underline only. Do not use filled tab backgrounds for page-level tabs.
- This underline-only tab rule overrides outline selected styling for tabs; primary borders belong to bordered cards, outline modules, chips, filters, and secondary buttons.
- Title markers are semantic: vertical line for main sections and independent large panels; small dot for chart/table/list sub-blocks, legends, or category rows.

### Brand And Sidebar

- Expanded brand area shows only the red `联想乐享` full logo. Do not show a `工作台` pill/tag or any other secondary brand tag in the sidebar header.
- Confirmed 0707 brand header dimensions: expanded sidebar `168px`, header `56px`, full logo about `112x23px`, expanded collapse button `28x28px` with about `3px` spacing from the logo lockup. Collapsed sidebar remains `58px`, icon mark `36x36px`, and rail handle `24x24px`.
- Sidebar collapsed state shows a centered brand icon as an independent white rounded mark with thin border and light shadow.
- Sidebar expand/collapse control in collapsed state is a small round rail handle positioned on the right edge of the sidebar, not squeezed beside the logo. Use white background, subtle border, light shadow, and primary wash on hover.
- Navigation icon style remains unified linear icons. Parent directory order is: 乐享运营, GEO 看板, 在职员工管理, 企业客户管理.

### AI Assistant Panel

- Right AI panel remains `380px` by default. The panel interior uses a `16px` horizontal gutter.
- Header padding: `9px 16px`; message area: `18px 16px 16px`; input area: `10px 16px 12px`.
- Header title must not collide with four icon actions. Use avatar + title `AI 助手` + short subtitle such as `运营协助`; truncate if needed. Icon actions are compact square/rounded buttons with consistent hover.
- Empty welcome copy is regular weight, not bold. It may be informative but should feel like guidance, not a heading.
- Recommended question cards are compact, regular weight, around `58-61px` high, with small linear icons, normal text weight, and `10px` vertical spacing. Do not bold card title or subtitle.
- Bottom input composer is a grouped component: one rounded border container with scope tags on top and input row below, separated by a 0.5px divider. Keep left attachment, middle auto-growing textarea, and right primary square send button aligned.
- Empty send button is disabled/gray; non-empty send uses primary blue. Geometry is theme-independent. Enter sends, Shift+Enter creates a new line.
- Scope tags are single-line pills with horizontal scroll and left/right round arrow controls in desktop and constrained widths. Do not switch the current 0825 Vue implementation to select. No pill is selected by default; selected scope updates the placeholder such as `在「知识库」中查询...`.

### 2026-06-25 Workbench Interaction Refinements

- The 0825 Vue project is the active baseline. The 0729 project and earlier sealed interaction rules are retained here only as historical non-regression evidence already absorbed into the current Vue version; do not merge new work back into historical folders unless the user explicitly asks.
- Left sidebar auto-collapse threshold is `<=1320px`; auto-expand threshold is `>=1480px`. If a user manually expands after auto-collapse, keep it expanded until browser resize triggers a fresh rule check.
- Static tabs are opened from left navigation and are combined with breadcrumb. Dynamic tabs are opened from AI report cards, links, and HTML previews. They are separate surfaces and each type has a `10` tab limit.
- Dynamic tabs use a `48px` row and `36px` tab height, with compact titles and no visible “AI 结果” label.
- Agent responses support queueing: while answering, the user can type and send again; queued messages are shown above the composer and enter the conversation one by one after the current answer.
- Empty input during an Agent answer turns the send button into a stop button.
- Agent waiting state is not a message bubble. It is a transparent one-line status with an activity dot and three dots; no background, border, radius, or shadow.

### 2026-06-23 AI Composer and Responsive Shell Refinements

- Historical note: the historical local project, including the 0729 release, was the baseline for its earlier iteration. For current work, use the 0825 Vue project and this skill as the active baseline.
- Current portal workbench hides the topbar search field by default. Keep related DOM when legacy scripts still depend on it, but hide the wrapper and avoid showing an empty command input in the topbar.
- Below `1280px`, the application must not create page-level horizontal scrolling. Center content uses `min-width:0` and responsive grid fallback; AI uses a fixed right drawer at `380px`; below `760px`, the sidebar collapses and the AI drawer may occupy the full viewport width.
- Shell resize order is a product interaction contract, not a page-by-page accident: normal pages and Skill 创建 must first compress the middle content slot and internal grids, then let the left sidebar auto-collapse, then constrain the right Agent panel. Page internals must not clip before the sidebar collapse step.
- Complex two-column pages, especially Skill 创建 / 需求澄清, must avoid rigid inner minimums such as `grid-template-columns: 300px minmax(720px,1fr)` or `280px minmax(640px,1fr)` when the page sits inside the workbench shell. Use a flexible left column such as `clamp(220px, 26%, 300px)`, a right column `minmax(0,1fr)`, `min-width:0` on all grid/flex children, and a single-column fallback at constrained widths.
- AI bottom tags keep arrow + pill styling before and after panel collapse/expand. Arrows remain present and disabled at scroll edges instead of disappearing.
- AI composer auto-resize, no-default-tag-selection, functional tag click behavior, and single-icon send button are now part of the base component contract, not page-specific fixes.

### Chart and Table Pairing

- Chart containers need stable dimensions and must resize after CSS/layout changes.
- Chart colors must come from `--chart-*`, `--chart-seq-*`, or explicit semantic chart tokens such as `--chart-danger`; keep the same category/level mapped to the same color across all charts.
- Use Operations Overview and Query Analysis as the canonical chart visual baseline:
  - Core category palette: `#3f78c5`, `#58a86a`, `#7c5cff`, `#5b8def`, `#6ac69a`, `#9bbcff`, `#8da2bf`, `#d6a458`, `#aeb8c8`.
  - Extended adjacent tones are allowed when a chart needs more categories, but they must stay in the same blue/green/purple/gray-blue/low-amber family and keep comparable saturation and lightness.
  - Avoid default ECharts rainbow colors, pure red/green/orange/yellow blocks, and highly saturated category palettes.
  - Treat `#d94b4b` / `--chart-danger` as a semantic exception for risk, failure, alert, or negative anomaly only.
- The latest verified chart pages extend this baseline: Query Analysis and Operations Overview define ordinary business colors; Traffic and GMV use the same blue/green/purple/gray-blue/low-amber mapping; Quality Analysis must not turn negative quality charts into large red/orange visuals. Use blue, gray-blue, low-amber, green, and purple for the main chart marks; reserve low-saturation danger only for threshold dots, table values, rare anomaly markers, or hover emphasis. Do not use Lenovo red or saturated orange as chart main colors.
- ECharts, Chart.js, canvas-rendered charts, HTML progress bars, word clouds, mini trend cards, and inline legend dots all count as charts for palette governance.
- Chart containers may adapt to card width/height, but chart graphics must not deform. Do not use CSS `max-height` or forced `width/height: 100%` on chart canvas in a way that overrides the chart library's calculated canvas size.
- Chart legends should follow the verified Query/Quality adjustment: larger rectangular swatches, more horizontal spacing, and enough bottom padding so legends never crowd x-axis labels. Use approximately `18x8` swatches, `16px` item gap, `8px` top padding, and reserve about `54px` bottom grid space when the legend sits below the plot.
- First-enter chart motion is part of the 0702 operations-page baseline. Query Analysis, Operations Overview, Quality, Traffic, and GMV charts should all have subtle data-entry animation or SVG/DOM equivalent. Keep motion short, non-looping, and data-focused.

### 2026-07-02 乐享运营 Vue Migration Baseline

The 乐享运营 five-menu group is now the reference migration baseline for future middle content-slot work:

- 运营总览: native Vue template and the strongest reference for content-slot structure.
- Query 分析: Vue page with ECharts and remaining DOM helper seams.
- 质量分析: Vue route page with `v-html` and a quality runtime script; visually governed by current Vue project rules.
- 流量分析 / GMV 分析: Vue route pages with reactive data and ECharts, still using local HTML template strings.

Future modules must not disturb the verified 乐享运营 behavior, including chart colors, chart legend spacing, first-enter chart animation, right-AI answer bubbles, static/dynamic tabs, and responsive shell resize order.

The current sealed migration scope is complete for GEO 看板, 在职员工管理, 企业客户管理, and Agent pages. 搜索后台、风控管理 are deleted from the first sealed project; if they return later, add them from fresh requirements.
- Doughnut/pie charts should not appear tiny inside tall cards; size chart area to the available content region and keep legend readable.
- Doughnut/pie charts must remain circular. If the card is rectangular, adjust chart center, radius, legend placement, or inner chart area; never stretch the circle into an ellipse.
- Horizontal bar charts should fill the content area proportionally without clipping axis labels.
- Pie and doughnut charts should use coordinated category colors, with labels and legends using tertiary text; avoid one category overpowering the entire card unless the data truly dominates.
- Horizontal bars, TOP lists, and ranked distributions prefer one hue with subtle gradient or opacity changes. Use blue for traffic/query/total volume, green for service/conversion/positive business, purple for AI/member/advanced analysis, and low-amber only as a secondary supporting hue.
- Trend cards and mini line charts should use blue, green, or purple lines with a very light area fill derived from the same color. Keep line width around `1.5-2px`, point markers small, and fill opacity around `8%-18%`.
- Tables paired with charts should use fixed header height, stable row height, `table-layout: fixed` where needed, and ellipsis for long cell content.

## 2026-06-11 Verified UI Refinements

These refinements were implemented during the current portal workbench iteration. Treat them as current defaults when generating or reviewing any Leaibot page.

### Source Merge Contract

- When merging external or historical UI code, use the inspected target repository at `<app-root>` as the functional and architectural source of truth, then apply this skill's 0825 design contract.
- Global style files, token files, common CSS, preview overrides, and UI wrapper CSS must map into the current `src/assets/workbench*.css` stack or component-scoped styles. Do not replace the whole Vue app, `src/assets`, or `public/admin-runtime`.
- Do not overwrite current Vue feature code with historical static JS. Preserve route meta, page IDs, menu entries, permission logic, API calls, status transitions, Skill Hub actions, AI command behavior, and Pinia/composable ownership.
- New pages that do not exist in the redesigned project must match the same Leaibot visual system: light Feishu-like shell, compact cards, 0702 blue/green/purple-led chart palette, 36px default controls, 48px ordinary business table rows (40px only for explicit compact variants), white data containers, and right AI assistant.
- Current preview and runtime entry is the 0825 Vue app under `/admin-vue/`; design previews must map back to Vue components, route contracts, and the existing CSS stack.

### External POC / Historical Function Merge Contract

- The current merge target is always the 0825 Vue project. The 0729 and earlier project folders are read-only references unless the user explicitly asks to archive or compare them.
- Never replace the whole Vue app, `src/assets`, or `public/admin-runtime` from a POC. Compare file-by-file. New feature modules and newer data files may be copied, but older or shorter module files must be merged selectively to avoid deleting current behavior.
- Preserve local behavior when the POC removes or simplifies it: AI 页面巡检, portal home structure, local preview wrappers, responsive guard rules, retained theme tokens, and existing module renderers remain active unless explicitly replaced by a new requirement. The current release still forces light mode and hides the theme entry. Topbar global search is hidden by default; retain its DOM only where script compatibility requires it.
- New POC pages must be scoped with page-level wrappers or final override selectors. Do not let module-private CSS leak into old pages. Use the last override layer to normalize new selectors into Leaibot tokens.
- POC inline styles, hard-coded colors, emoji controls, filled page tabs, default browser selects, and one-off shadows must be normalized before delivery.
- Verification is part of the merge: run `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm smoke:shell`; preview `/admin-vue/`, open newly merged routes/pages, and inspect console errors.

### Portal Home

- `联想门户工作台` is an operational home page, not a landing page. It should immediately expose common entries and AI/Skill workflows.
- Current accepted navigation behavior: the left sidebar does not render a separate `首页` parent directory. Clicking the top-left Logo returns to the portal home, while breadcrumb can still read `首页 / 联想门户工作台`.
- Structure: compact page header, two primary actions (`管理技能包`, `创建 Skill`), four ability cards, common-entry list, and a four-step operating flow. The `今日工作流 / 核心域联动` panel is not shown in the current phase.
- Ability cards use white surfaces, subtle border, 8-12px radius, small primary-wash icon labels, and light hover. Avoid large hero sections, decorative images, and marketing composition.
- Common-entry buttons are full-width white/gray list rows with left business name and right description; they must call real page switch behavior.
- Portal-home visual polish should stay component-scoped. The command card should remain pure white; polish may add focus-visible rings and better entry/flow row scanning, but must not touch sealed shell surfaces or introduce a late global CSS override.
- Portal-home rows and cards must use `min-width:0`, stable row/card dimensions, designed truncation or wrapping for long Chinese text, and no page-level horizontal overflow at the `1280px` validation width with the right Agent panel open.

### Workspace Canvas

- The center content slot may use a very subtle continuous wash based on the main blue family: low-alpha blue/cyan radial light plus a left-to-right `105deg` blue/cyan/indigo layer, naturally fading into the neutral gray canvas. Do not use a fixed-height band, a 1px divider/highlight, or any abrupt color seam.
- Keep data modules and cards on white or light-neutral surfaces. The canvas wash must never become a decorative hero, saturated gradient, or page-specific color band.

### Account Hub And Skill Hub

- The sidebar user footer can open an account hub popover. The popover contains `创建 Skill`, `Skill Hub`, and `权限管理` cards. It must be styled as an operational launcher with white cards, subtle borders, and concise explanatory copy.
- `创建 Skill` is the primary PM entry. `Skill Hub` is the lifecycle management page. `权限管理` is a native Vue Agent page in the 0703 baseline and should navigate to `/agent/permissions`; do not keep it as a “敬请期待” placeholder.
- Skill Hub uses a data-management page structure: summary cards, search/status/category/tag filters, a dense table, row actions, detail modal, confirmation modal, and evaluation modal.
- Skill lifecycle status colors remain consistent across table, detail, confirmation, and toast surfaces. High-impact actions require confirmation and should describe the affected Skill, current status, version, and platform.
- Skill package cards use semantic icons per skill, not one repeated icon. Icons must stay in one linear SVG family, `18px` inside a `34px` primary-wash square, with title and status badge horizontally center-aligned in the card header.
- Current 历史旧版 Skill Hub also includes skill package enable/disable switches, batch application, business approver selection, system approver display, and `应用` / test-entry actions. These controls must stay compact and tokenized: switch `76x34`, form controls `36px`, selected packages use primary wash + primary border, approver dropdown uses white card + subtle shadow + primary focus ring.
- Batch application is an approval workflow, not a marketing card gallery. Required structure: selected package cards, business approver grouped dropdown, readonly system approver, reason/remark fields, and footer actions. High-risk or data-permission packages must make the approver path explicit.
- Skill package application/testing can seed the AI assistant, but it must not execute writes silently. The AI copy should ask for parameters, scope, risk level, and confirmation before any write-like action.

### Local Preview Mode

- Use the 0825 Vue app as the preview surface: run `pnpm dev` for local development and open `/admin-vue/`; use preview auth mode only where the current runtime contract allows it.
- The final CSS stack for preview and runtime is the current Vue `src/assets/workbench*.css` stack plus component-scoped styles. The last override layer may normalize module-private inline/legacy styling, but must not hide or remove current features.
- Legacy runtime assets under `public/admin-runtime` are only for middle business pages that remain in the legacy content slot; new shell work must not depend on static HTML entry assumptions.
- Chart colors across ECharts, Chart.js, inline progress bars, HTML mini charts, and demo panels must use the 0702 chart palette from `references/style-contract.md`: blue/green/purple first, gray-blue and low-amber as supporting tones, semantic danger only for real risk/failure/alert states.

### AI Assistant Panel Current Spec

- The right AI assistant header keeps 4 icon-only actions in order: 管理技能, 新开会话, 历史对话, 收起 AI 助手. The third action is history conversation, not a generic more menu.
- Header identity is avatar + online dot + `AI 助手` + light-blue attention pill. The pill text must sync to the active left navigation second-level title only, such as `正在关注:运营总览`; do not prepend the parent group and never hard-code one module.
- The attention pill updates on sidebar navigation, global search jumps, AI navigation jumps, and direct URL `page=` loading.
- Current accepted default state is an interactive document-flow welcome, not a metrics insight dashboard. Use the exact welcome copy: `你好！我是乐享 AI 助手。你可以在底部输入框里直接描述要完成的运营任务，例如查数据、生成报告、配置商品或查询知识库。涉及写入或发布时，我会先展示影响范围并等待确认。`
- Default recommended prompts are compact white cards around `58px` high with small linear icons, regular text weight, `10px` gap, and examples such as `工作台说明`、`生成报告`、`查询知识库`. Do not show `今日速览`、DAU/GMV metric cards、异常卡或最近对话 in the current default state.
- Agent structured execution states must cover TODO List, multiple simultaneous running steps, and authorization-required operation cards. They are assistant-bubble content blocks only; do not change the sealed header actions, composer, queue behavior, panel width, or shell resize order.
- Chat state starts with a centered context capsule: `已引用:运营总览 · 最近 1 天`.
- User messages align right with a blue gradient solid bubble. AI replies are white structured cards with conclusion first.
- The current default structured insight card is a single white surface without outer drop shadow or outer frame. Put the `已引用:页面 · 时间范围` capsule inside the card header area instead of floating outside.
- The bottleneck module uses one inner white panel with subtle border; do not add yellow/orange full-card backgrounds. Use orange only inside the key metric block: left side for label + 40-42px core number + baseline line, right side for the upstream/downstream supporting numbers.
- The explanatory paragraph uses the same body font rhythm as normal query text: approximately 13px body size, regular weight, with only truly critical phrases highlighted. Avoid oversized bold copy.
- Remove the old `登录 / 互动 / 下单` three-box mini module from the current AI insight card. The card should now read in this order: context capsule, bottleneck panel, explanation paragraph, action buttons, source chips/footer actions.
- The action row order is `展开报告` primary first, then `查看明细`, then `优化建议`. `展开报告` may include a small decorative leading icon; `优化建议` uses the same secondary button style as `查看明细`, without a leading icon.
- AI reply footer includes solid filled source chips such as `转化漏斗` / `转化基线` plus copy, like, and regenerate icons. Source chips use filled neutral backgrounds, not outline pills and not leading mini icons.
- Date/time and range pickers inside AI-adjacent workbench filters keep the system calendar glyph in default state; hover only strengthens visibility and must not introduce extra square backgrounds, white patches, or double-frame seams around the calendar indicator or range connector.
- Long AI outputs are promoted through a temporary report-tab interaction. When a reply contains long data, a report, a recap, or structured interpretation, the right AI panel should show a compact conclusion card only: linear document icon, report title, one-sentence summary, source/category chips, `保存`, and `展开查看`. Clicking `展开查看` opens a temporary tab below the breadcrumb and renders the complete report in the center workspace. These tabs are separate from left navigation, can be saved, closed, and opened multiple times for side-by-side comparison. The base page tab remains first so users can return to the current navigation page smoothly.
- External links produced by AI or generated report content must also be captured inside a workspace temp tab. The link tab shows the title, source page, raw URL in a code field, and a `复制链接` action; do not call `window.open` or navigate the whole workbench away.
- HTML previews produced by AI or page-building flows must open in a workspace temp tab with an iframe preview shell and download action. The preview shell uses the same report-page scale and tokenized border/radius. The current release renders the shell in forced light mode; if dark mode is explicitly restored later, the iframe may remain white while the surrounding shell follows dark tokens.

### Temporary Report Tabs And Report Page

- Report tabs live under the breadcrumb and above the center content slot. The base navigation tab remains first; AI-generated tabs keep only the short task title, such as `购买转化分析`.
- The tab title and the report page title/subtitle must use the same typography hierarchy as the normal content slot. Do not enlarge the report header beyond the live `page-title / page-desc` scale.
- Current accepted report-page header scale follows the live project content slot: title about `19px`, description `13px`, same weight and spacing rhythm as normal navigation pages.
- The report hero area may use a very light top wash based on the main primary family, but the transition must be continuous and natural. Do not show a visible hard divider band, separate white strip, or abrupt color seam across the content slot.

Reference data for the built-in demo insight: DAU `26.7万` `↑3.2%`, GMV `174.3万` `↑1.8%`, 登录率 `63.5%`, 转化 `0.7%` with baseline `1.1%`, 客单价 `¥3,032`, 消费业务占 `81.7%`.

### Linked Metric Filters

- When metric tiles control a list below, design them as filter controls rather than passive KPI cards. `认证方式分布` on the employee overview is the canonical example.
- Each tile is a button with `data-method` and `aria-pressed`; clicking a tile filters the table, clicking the active tile again clears the filter.
- Tile surface: white background, 8px radius, subtle border, 12-14px grid gap, and a slim method-color accent. Hover/focus uses the shared central-module hover border/shadow. Selected state uses primary border, pale primary background, and a compact `筛选中` badge.
- The section header should explain the behavior with a short hint such as `点击筛选下方员工列表`.
- The table title row shows the current filter, for example `当前筛选: 企业邮箱 · 598 条`, plus a `清除` action. Clearing restores the full list.

### Center Module Hover

- Center workspace data modules share one lightweight hover language: transition `border-color .14s ease, box-shadow .14s ease, background-color .14s ease, transform .14s ease`; hover border `rgba(51,112,255,.36)`; hover shadow `0 1px 2px rgba(15,23,42,.035), 0 6px 14px rgba(15,23,42,.055)`; transform `translateY(-1px)`.
- Apply this to cards, panels, KPI cards, chart cards, table containers, funnel/chain nodes, employee method tiles, placeholder cards, and repeated metric blocks inside `.page-content`.
- Do not apply the module hover to the AI side panel, buttons, tabs, table rows, inputs, or topbar/sidebar navigation.

## Page Composition

Default dashboard page order:
1. Header row: page title, data scope/update date, right-aligned time range pills and AI action.
2. KPI grid: 2x2 or 4-column metric cards.
3. Funnel or chain card: sequence of compact step cards with ratios.
4. Business/platform split cards with thin colored left accents.
5. Trend overview cards with simple bar visuals.
6. Bottom analytical row: chart card + table card.

Keep page sections full-width and unframed except for actual cards. Do not nest cards inside cards unless the inner item is a repeated metric tile or table row-like item.

## Component Rules

### Login

Use a minimal centered login form:
- Form width around `400px`, padding `48px 40px`.
- Logo row: red `36px` rounded square icon plus brand name.
- No decorative side illustration.
- Inputs: full width, `10px 12px`, `8px` radius, blue focus border and subtle focus ring.
- Primary login button: full width, `12px` vertical padding.

### Sidebar

Sidebar should feel compact and operational:
- White background, right border, grouped navigation.
- Top logo area height `56px`, aligned with the current sealed topbar and sidebar header.
- Parent nav items: `13px`, child nav items: `12px`.
- Active item: blue wash background and primary blue text.
- Hover item: app background gray.
- Collapsed state shows icons only and tooltip on hover.
- Expanded sidebar parent rows must display one directory per row. Do not wrap parent labels; use ellipsis when text is long.
- Parent directory chevrons use linear icons: collapsed points right, expanded points down. Do not use bitmap arrows or text glyphs such as `▶`.
- If two business domains are independent in the requirement, give them separate parent directories instead of nesting all pages under a vague catch-all group. For the current Leaibot project, `客户留言` and `线索管理` are separate sidebar directories.
- User footer stays pinned at bottom with avatar, name, role, and logout action.

### Topbar

Topbar is a utility strip:
- Breadcrumb left: `模块 / 页面`, compact and semibold on active text.
- Current release hides the global search input; retain underlying DOM only where runtime compatibility requires it.
- Current release hides the dark-mode action and forces light mode. If the feature is explicitly restored later, use the shared icon-only control contract.
- AI toggle is a small bordered button; active state uses blue wash and primary border.

### KPI Cards

KPI cards are clean primary information blocks:
- Shared coordinated very-light gradient background, light border, `12px` radius.
- Padding `16px 18px`; top overview KPI cards may use `18px 20px`.
- Label: `12-13px`, secondary text, no repeated same-color dot.
- Value: `24px` normally; top overview KPI rows may use `28px`, bold, tabular/monospace-friendly numbers.
- Subtext: `11-12px`, tertiary text, with green/red delta only when meaningful.
- Top overview KPI rows should avoid decorative accent lines. Keep the card content left-aligned, vertically centered, and separated by typography, spacing, subtle dividers, and the shared coordinated light-gradient palette.
- Hover may add a light shadow, but do not make every card float.

### Analytical Cards

Use simple, readable data visuals:
- Bar charts prefer a single sequential scale or the default 0702 chart blue/green/purple bars with direct labels above or nearby.
- Tables use 13px body text, 12px tertiary headers, and subtle row hover.
- Badges are small pills: green for good/online/high conversion, orange for warning/low conversion, gray for inactive.
- Split cards may use thin left accent borders in blue/orange/purple/gray.
- In dense Leaibot pages, avoid using the same left accent line on every card. Vary the treatment subtly with top accent, soft background tint, small label dot, or no accent.

### Filters And Tabs

Use compact segmented pills:
- Time filters: 最近1天, 最近7天, 最近14天, 最近30天, 自定义.
- Active pill: blue wash, blue border/text.
- In-card switches: small bordered pills such as 浏览 / 购买 / 转化率.
- Tabs: bottom border style with active blue underline.
- In tab-heavy admin pages such as 职场员工审核, keep tab rail, search/filter rail, table header, and pagination on a consistent spacing rhythm.

### AI Assistant Panel

The AI panel is a persistent co-pilot surface:
- Header: assistant avatar + online dot + title + short subtitle on the left; compact icon-only actions on the right.
- Shortcut/scope chips: small single-line rounded pills above the composer, with desktop horizontal scroll and arrow controls.
- Empty state: regular-weight welcome copy plus three compact recommendation cards; do not bold the copy or card text.
- Assistant messages: white or gray bubbles with border; user messages: primary blue.
- Input bar fixed at bottom with attachment icon, multi-line textarea, and blue icon-only send button; disabled send is gray.
- AI actions should reference current page context: time range, metrics, trends, business splits.

Use playful icons or emoji only where the existing AI assistant language already does so. For new product controls, prefer consistent icon assets or lucide-style symbols.

### Customer Message Tickets

For the non-working-hours customer message requirement:
- Use a separate `客户留言` sidebar directory with a `留言工单` page.
- Preserve the full service workflow: non-human-service-hours trigger, manual transfer keywords, agent/NLU escalation, editable unprocessed messages, progress query, queue routing, support owner, callback record, status update, and close.
- Page structure: page header, KPI status cards, trigger/process explanation, user-side message-card preview, ticket table, and right drawer for processing details.
- Ticket table must include source channel, queue, trigger reason, priority, status, owner, update time, and operations. Use status badges and a detail drawer, not wide inline detail panels.
- User-facing card previews should remain compact and functional, matching the admin UI tone; do not create a consumer marketing mockup inside the admin page.

### Lead Management

For enterprise lead management:
- Use the `企业客户管理` sidebar directory in the 历史旧版 project, with `线索看板`, `线索池`, and `打分模型` as children. If a historical branch still uses `线索管理`, keep the local branch naming and do not rename unrelated navigation without confirmation.
- Preserve these functions: role view switch, global filters, overall lead board, lead quality board, sales-team funnel, source table, lead pool, assignment, batch reach-out, export approval, lead feedback, convert-to-opportunity, lead detail, assignment detail, data maintenance, operation logs, and scoring model configuration.
- `线索看板` uses tabs: `整体看板`, `线索质量看板`, `销售团队漏斗`. Tabs must follow the standard rail spacing and underline active state.
- `线索池` starts with six overview KPI cards, then a filter/action rail, then a dense table. Row actions stay compact and must not stretch the row height unpredictably.
- Drawers are preferred for lead detail and assignment detail; modals are preferred for short forms such as assignment, feedback, opportunity conversion, data maintenance, and export approval.
- Funnel, bar, and table content must follow the chart/table pairing rules: stable dimensions, no canvas deformation, readable labels, and horizontal scrolling for wide source tables.
- `打分模型` is an ops-only configuration page. It uses four compact stat cards, a toolbar, and two dense rule tables for add/subtract rules. Rule editing can use a modal or drawer, but conditions must remain readable and table rows must stay `40-44px` high.
- Lead pages need a scoped wrapper such as `.lead-0615-page`; scoring pages additionally use `.lead-score-page`. All lead-specific styles must stay under that scope or in the final override layer.
- Lead page controls use normal product text: `导入线索`, `导出（脱敏）`, `导出（明文）`, `新建规则`, `删除`, `返回线索池`. Do not prefix these controls with emoji or standalone text arrows.
- Sensitive phone/export data is masked by default. 明文导出 must use an approval modal with approver and reason fields; the UI should make the approval status visible before download.

## Interaction States

Required states:
- Hover: gray wash for neutral controls, blue wash for primary-related controls.
- Focus: blue border plus subtle blue ring.
- Active nav/filter: blue wash, blue text, sometimes blue border.
- Disabled button: opacity `0.5`, default cursor.
- Popovers/dropdowns: white card, `8px` radius, `1px` border, `0 8px 24px rgba(0,0,0,0.12)`.
- Future dark mode, only when explicitly restored: swap semantic token values while keeping the same layout and hierarchy. It is not part of the current release acceptance.

## Responsive Behavior

Desktop is primary. Still handle narrower screens:
- Collapse sidebar before squeezing content too far.
- Close or dock AI panel on small screens.
- KPI grid: 4 columns on wide, 2 columns when constrained, 1 column on mobile.
- Tables should scroll horizontally rather than shrink text below readable size.
- Do not let Chinese labels overlap controls; wrap or truncate with tooltip where needed.

## Do

- Lead with operational data and current scope.
- Keep hierarchy compact: title, filters, data cards, charts, table.
- Use restrained cards with borders and light shadows only on interaction.
- Align numbers visually and keep units clear: 万, 亿, %, 人.
- Maintain page context in AI assistant copy and actions.
- Preserve Chinese enterprise admin tone: direct, precise, low-friction.

## Do Not

- Do not make a hero section, marketing splash, or decorative illustration page.
- Do not use large gradients, glassmorphism, bokeh/orb backgrounds, or oversized cards.
- Do not turn every section into a floating panel.
- Do not overuse brand red; it should not become the dashboard primary color.
- Do not hide key filters below the fold.
- Do not let the AI panel cover or obscure dashboard content.

## Example Prompt

Design a 联想乐享 admin dashboard page for GEO 转化看板. Use the Leaibot Admin UI Design skill: compact three-column workbench shell, blue primary actions, light-gradient metric cards on gray background, right-side AI assistant, time-range pills, KPI cards, business split cards, a simple trend chart, and a conversion table. Keep the interface dense, scan-friendly, and suitable for daily operations.
