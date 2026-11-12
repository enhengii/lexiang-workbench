#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const projectArgIndex = args.indexOf('--project')
const changedFileArgs = flagValues(args, '--changed-file')
const guardAll = args.includes('--guard-all')
const projectRoot = projectArgIndex >= 0
  ? resolve(args[projectArgIndex + 1] || '')
  : process.env.PORTAL_WORKBENCH_PROJECT_DIR
    ? resolve(process.env.PORTAL_WORKBENCH_PROJECT_DIR)
    : null

const errors = []
const notices = []
const expectedSkillName = 'portal-workbench-ui-1109'
const expectedSkillVersion = '2026-11-09'
const expectedSkillRelease = '1109'

const requiredTemplates = new Map([
  ['content-list-template.html', ['page-stack', 'field-grid--4', 'data-table']],
  ['content-summary-list-template.html', ['page-stack', 'page-flow--summary-list', 'data-page-flow', 'data-page-block="summary"', 'list-workspace', 'list-surface', 'data-list-part="tabs"', 'data-list-part="table"', 'data-list-part="pagination"', 'data-table']],
  ['content-long-filter-list-template.html', ['page-stack', 'field-grid--4', 'filter-details', 'data-table']],
  ['content-dashboard-template.html', ['page-stack', 'kpi-grid', 'dashboard-grid']],
  ['content-form-template.html', ['page-stack', 'form-shell', 'field-grid', 'sticky-actions']],
  ['content-task-import-template.html', ['page-stack', 'progress-steps', 'result-grid']],
  ['content-split-settings-template.html', ['page-stack', 'split-layout', 'settings-row']],
  ['content-config-list-template.html', ['page-stack', 'field-grid--4', 'data-table']],
  ['content-workflow-template.html', ['page-stack', 'workflow-shell', 'workflow-body']],
  ['content-report-detail-template.html', ['page-stack', 'report-layout', 'report-metrics']],
])

checkRequiredFiles()
checkPortability()
checkAssetInventory()
checkContentSlotComponentLibrary()
checkStaticTemplates()
checkContractDrift()
checkVisualAcceptance()
if (projectRoot) {
  checkProjectRoutes()
  checkProjectDesignGuard()
}
else notices.push('未提供 --project；已跳过当前 Vue 路由与视觉记录的交叉检查。')

for (const notice of notices) console.log(`[NOTICE] ${notice}`)
if (errors.length) {
  console.error(`[FAIL] ${expectedSkillName} consistency errors=${errors.length}`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`[OK] ${expectedSkillName} metadata, assets, templates, matrix and evidence are internally consistent.`)

function checkRequiredFiles() {
  for (const file of [
    'SKILL.md',
    'references/1009-confirmed-adjustments.md',
    'references/1009-release-review.json',
    'manifest.txt',
    'skill.meta.json',
    'references/asset-inventory.md',
    'references/brand-assets.md',
    'references/content-slot-component-library.md',
    'references/content-slot-component-contracts.md',
    'references/content-slot-component-registry.json',
    'references/page-spec-coverage-matrix.md',
    'references/page-visual-acceptance.json',
    'references/design-guard.md',
    'references/sealed-module-specs.md',
    'references/va-r2-pilot-plan.md',
    'assets/content-template.css',
    'assets/content-slot-component-library.html',
  ]) check(existsSync(join(skillRoot, file)), `缺少必需文件：${file}`)

  const skill = read('SKILL.md')
  const agent = read('agents/openai.yaml')
  const meta = parseJson('skill.meta.json')
  check(skill.includes(`name: ${expectedSkillName}`), `SKILL.md name 必须为 ${expectedSkillName}。`)
  check(skill.includes('references/unified-role-workflow.md') || skill.includes('`unified-role-workflow.md`'), 'SKILL.md 未路由统一角色工作流。')
  check(agent.includes(`$${expectedSkillName}`), `agents/openai.yaml 未调用 $${expectedSkillName}。`)
  if (meta) {
    check(meta.skillId === 'portal-workbench-ui', 'skill.meta.json skillId 必须保持 portal-workbench-ui。')
    check(meta.skillVersion === expectedSkillVersion, `skill.meta.json skillVersion 必须为 ${expectedSkillVersion}。`)
    check(meta.skillRelease === expectedSkillRelease, `skill.meta.json skillRelease 必须为 ${expectedSkillRelease}。`)
    check(meta.distributionPolicy === 'single-authoritative-skill', 'skill.meta.json 缺少单一权威源分发策略。')
    check(meta.compatibilityPolicy === 'portable-target-repository', 'skill.meta.json 缺少可移植目标仓库策略。')
    check(!Object.hasOwn(meta, 'fingerprint'), 'skill.meta.json 不得包含 Skill 指纹。')
    check(!Object.hasOwn(meta, 'sourceProjectPath'), 'skill.meta.json 不得包含本机项目绝对路径。')
  }
}

function checkContractDrift() {
  const tokens = read('references/design-tokens.md')
  const components = read('references/components.md')
  const contentContract = read('references/content-slot-design-contract.md')
  const pageTemplates = read('references/page-templates.md')
  const skill = read('SKILL.md')
  const baseCss = read('assets/base.css')
  const contentCss = read('assets/content-template.css')

  for (const [name, value] of [
    ['--radius-md', '8px'],
    ['--radius-lg', '12px'],
    ['--row-height-compact', '40px'],
    ['--row-height-default', '48px'],
    ['--space-kpi-gap', '14px'],
    ['--space-agent-message-top', '18px'],
    ['--space-agent-input-top', '10px'],
  ]) {
    check(tokens.includes(`| \`${name}\` | \`${value}\``), `design-tokens.md 缺少唯一 token 定义：${name}=${value}。`)
  }

  check(/--radius-md:\s*8px/.test(baseCss), 'assets/base.css 的 --radius-md 必须为 8px。')
  check(/--radius-md:\s*8px/.test(contentCss), 'assets/content-template.css 的 --radius-md 必须为 8px。')
  check(/--radius-lg:\s*12px/.test(contentCss), 'assets/content-template.css 的 --radius-lg 必须为 12px。')
  check(/--space-kpi-gap:\s*14px/.test(contentCss), 'assets/content-template.css 缺少 --space-kpi-gap:14px。')
  check(/--space-kpi-gap:\s*14px/.test(baseCss), 'assets/base.css 缺少 --space-kpi-gap:14px。')
  check(/gap:\s*var\(--space-kpi-gap\)/.test(baseCss), 'KPI 卡间距必须引用 --space-kpi-gap。')
  check(/padding:\s*var\(--space-agent-message-top\)/.test(baseCss), 'Agent 消息区顶部间距必须引用专项 token。')
  check(/padding:\s*var\(--space-agent-input-top\)/.test(baseCss), 'Agent 输入区顶部间距必须引用专项 token。')

  check(!/--radius-md`?\s*\(?6px\)?/i.test(components), 'components.md 仍把 --radius-md 定义为 6px。')
  check(!/40\s*[–-]\s*44px/.test(pageTemplates), 'page-templates.md 仍使用不可判定的 40–44px 表格行高。')
  check(!/`8\s*[–-]\s*12px`\s*radii/i.test(skill), 'SKILL.md 仍使用不可判定的 8–12px 圆角。')
  check(!/`13\s*[–-]\s*14px`\s*operational typography/i.test(skill), 'SKILL.md 仍使用不可判定的 13–14px 操作字号。')
  check(!/卡片圆角[^\n]*8\s*[–-]\s*12px/.test(contentContract), '内容槽合同仍允许卡片圆角在 8–12px 间任取。')
  check(!/多卡用栅格并排，卡间距 `--space-4`/.test(components), 'components.md 的 KPI 卡间距仍错误引用 --space-4。')
  check(contentContract.includes('KPI 不会把列表页自动改判为 T3'), '内容槽合同未明确 T2 + KPI 仍使用 SummaryList。')

  const numbered = [...components.matchAll(/^### (\d+)\. (?!\d)/gm)].map(match => match[1])
  const duplicates = numbered.filter((value, index) => numbered.indexOf(value) !== index)
  check(duplicates.length === 0, `components.md 存在重复一级组件编号：${[...new Set(duplicates)].join(', ')}。`)
  for (const field of ['用途', '数据形态', '可配项', '锁定项', '状态', '反例', '当前实现']) {
    check(components.includes(`| ${field} |`) || components.includes(`| ${field}`), `components.md 业务组件登记缺少字段：${field}。`)
  }
}

function checkPortability() {
  const forbidden = [
    ['macOS 用户目录', /\/Users\/[^/\s"'`]+/],
    ['Linux 用户目录', /\/home\/[^/\s"'`]+/],
    ['Windows 用户目录', /[A-Za-z]:\\Users\\[^\\\s"'`]+/],
    ['file URL', /file:\/\//],
    ['本地调试 URL', /https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/],
  ]
  const textFiles = walk(skillRoot).filter(file =>
    /\.(?:md|json|ya?ml|txt|html|css)$/i.test(file)
  )
  for (const file of textFiles) {
    const content = readFileSync(file, 'utf8')
    for (const [label, pattern] of forbidden) {
      check(!pattern.test(content), `${portable(relative(skillRoot, file))} 包含${label}，不符合可移植交付要求。`)
    }
  }
}

function checkAssetInventory() {
  const inventory = read('references/asset-inventory.md')
  const brand = read('references/brand-assets.md')
  const manifest = read('manifest.txt')
  const inventoryRefs = codeAssetPaths(inventory)
  const documentedRefs = new Set([...inventoryRefs, ...codeAssetPaths(brand)])
  const manifestRefs = new Set(
    manifest.split('\n')
      .map(line => line.match(/^\s*-\s+(assets\/\S+)\s*$/)?.[1])
      .filter(Boolean)
  )

  for (const ref of documentedRefs) check(existsSync(join(skillRoot, ref)), `文档引用的资产不存在：${ref}`)
  for (const ref of manifestRefs) {
    check(!ref.includes('*'), `manifest 必须逐文件登记资产，不能使用通配符：${ref}`)
    check(existsSync(join(skillRoot, ref)), `manifest 引用的资产不存在：${ref}`)
  }

  const actualAssets = walk(join(skillRoot, 'assets'))
    .map(file => portable(relative(skillRoot, file)))
    .filter(file => !file.endsWith('/.DS_Store'))
  for (const asset of actualAssets) {
    check(inventoryRefs.has(asset), `真实资产未登记到 asset-inventory.md：${asset}`)
    check(manifestRefs.has(asset), `真实资产未逐文件登记到 manifest.txt：${asset}`)
  }
  for (const ref of inventoryRefs) check(actualAssets.includes(ref), `asset-inventory.md 存在非真实映射：${ref}`)
}

function checkContentSlotComponentLibrary() {
  const contract = read('references/content-slot-component-library.md')
  const registry = parseJson('references/content-slot-component-registry.json')
  const preview = read('assets/content-slot-component-library.html')
  const skill = read('SKILL.md')
  if (!registry) return

  check(registry.schemaVersion === 3, '内容槽组件注册表 schemaVersion 必须为 3。')
  check(registry.scope === 'middle-content-slot-page-style-and-structure', '内容槽组件注册表不得扩张到工作台壳层。')
  check(registry.extractionDecision?.decisionId === 'content-slot-extraction-2026-08-12', '内容槽组件注册表缺少当前抽离决策批次。')
  check(registry.extractionDecision?.decision === 'approved-for-skill-vue-library', '当前组件决策必须明确授权 Skill Vue 参考组件库。')
  check(registry.extractionDecision?.currentEffect === 'Skill Vue reference library only; no UAT or product source change', '当前组件决策必须明确不修改 UAT 或产品源码。')
  check((registry.extractionDecision?.approvedCandidateGroups || []).length === 12, '当前抽离决策必须登记 12 个用户批准候选组。')
  check((registry.extractionDecision?.deferredCandidateGroups || []).length === 0, '当前抽离决策不得登记暂缓候选。')
  const exclusions = new Set(registry.excludes || [])
  for (const excluded of ['sidebar', 'topbar', 'static-tabs', 'ai-result-selector', 'right-agent', 'composer', 'sealed-shell']) {
    check(exclusions.has(excluded), `内容槽组件注册表缺少排除范围：${excluded}`)
  }

  const components = registry.components || []
  const expectedApprovedComponents = new Map([
    ['CS-B001', 2],
    ['CS-B002', 2],
    ['CS-B003', 2],
    ['CS-B004', 3],
    ['CS-B005', 3],
    ['CS-C001', 1],
    ['CS-C002', 1],
    ['CS-C003', 1],
    ['CS-C005', 1],
    ['CS-C006', 2],
    ['CS-C007', 2],
    ['CS-C008', 2],
    ['CS-C009', 2],
    ['CS-C010', 1],
  ])
  const expectedSkillOnlyComponents = new Set(['CS-B006'])
  const ids = new Set()
  const stageCounts = { A: 0, B: 0, C: 0 }
  for (const component of components) {
    check(/^CS-[ABC]\d{3}$/.test(component.id || ''), `内容槽组件 ID 不合法：${component.id || '缺失'}`)
    check(!ids.has(component.id), `内容槽组件 ID 重复：${component.id}`)
    ids.add(component.id)
    check(['A', 'B', 'C'].includes(component.stage), `${component.id} 使用未知成熟度：${component.stage || '缺失'}`)
    check(['Page-local', 'Domain', 'Common'].includes(component.reuseScope), `${component.id} 使用未知复用范围：${component.reuseScope || '缺失'}`)
    check(Boolean(component.task), `${component.id} 缺少用户任务。`)
    check(Array.isArray(component.states) && component.states.length > 0, `${component.id} 缺少适用状态。`)
    check(Boolean(component.projectImplementation), `${component.id} 缺少项目实现状态。`)
    check(['skill-template', 'project-page-local', 'project-legacy-wrapper', 'project-shared-vue', 'project-mixed-unverified'].includes(component.projectImplementation), `${component.id} 使用未知项目实现状态：${component.projectImplementation || '缺失'}`)
    check(typeof component.sharedVueComponent === 'boolean', `${component.id} 缺少 sharedVueComponent 真值。`)
    if (component.sharedVueComponent) {
      check(component.projectImplementation === 'project-shared-vue', `${component.id} 声称已有共享 Vue 组件，但实现状态不是 project-shared-vue。`)
    }
    if (component.stage in stageCounts) stageCounts[component.stage] += 1

    if (component.stage === 'A') {
      check(component.reuseScope === 'Page-local', `${component.id} 为 A 页面局部模式，复用范围必须保持 Page-local。`)
      check(!component.skillAssetMarker, `${component.id} 为 A 页面局部模式，不得伪装成共享结构资产。`)
      check(Boolean(component.promotionCondition), `${component.id} 缺少进入 B 的条件。`)
    }
    else {
      check(component.skillAssetMarker === component.id, `${component.id} 的结构资产标记必须等于组件 ID。`)
      check(preview.includes(`data-component-id="${component.id}"`), `组件预览缺少 ${component.id} 结构标记。`)
      check(Array.isArray(component.locked) && component.locked.length > 0, `${component.id} 缺少锁定项。`)
      check(Array.isArray(component.contractRefs) && component.contractRefs.length > 0, `${component.id} 缺少完整合同引用。`)
      check(Boolean(component.acceptanceStatus), `${component.id} 缺少验收状态。`)
    }
    if (component.extractionApproval === 'approved-for-planning') {
      check([1, 2, 3].includes(component.extractionWave), `${component.id} 已批准抽离但缺少合法实施波次。`)
      check(component.sharedVueComponent === false, `${component.id} 仅批准规划时不得提前宣称共享 Vue 已存在。`)
      check(expectedApprovedComponents.get(component.id) === component.extractionWave, `${component.id} 的抽离批准或实施波次与用户决策不一致。`)
      check(component.skillImplementation === 'skill-library-implemented', `${component.id} 已批准写入 Skill，但缺少 skill-library-implemented 状态。`)
    }
  }
  const approvedIds = new Set(components.filter(component => component.extractionApproval === 'approved-for-planning').map(component => component.id))
  check(approvedIds.size === expectedApprovedComponents.size, `批准抽离组件数量 ${approvedIds.size} 与预期 ${expectedApprovedComponents.size} 不一致。`)
  for (const id of expectedApprovedComponents.keys()) check(approvedIds.has(id), `用户批准的组件未登记抽离计划：${id}`)
  for (const stage of ['A', 'B', 'C']) check(stageCounts[stage] > 0, `内容槽组件注册表缺少 ${stage} 阶段条目。`)

  const skillLibrary = registry.skillLibraryImplementation || {}
  check(skillLibrary.decisionId === 'content-slot-skill-library-implementation-2026-08-12', '内容槽注册表缺少 Skill 组件库实施决策。')
  check(skillLibrary.status === 'implemented-in-design-skill', 'Skill 组件库状态必须为 implemented-in-design-skill。')
  check(skillLibrary.projectEffect === 'none; product shared Vue source and consumer migration not started', 'Skill 组件库实施必须明确未修改项目源码。')
  const implementedIds = new Set(skillLibrary.implementedComponentIds || [])
  check(implementedIds.size === expectedApprovedComponents.size + expectedSkillOnlyComponents.size, 'Skill 组件库实施清单必须包含 14 个原批准组件和 SectionHeader。')
  for (const id of expectedApprovedComponents.keys()) check(implementedIds.has(id), `Skill 组件库实施清单缺少：${id}`)
  for (const id of expectedSkillOnlyComponents) check(implementedIds.has(id), `Skill 组件库实施清单缺少新增模块标题组件：${id}`)

  const vueLibrary = registry.skillVueLibrary || {}
  check(vueLibrary.status === 'implemented', 'Skill Vue 参考组件库必须登记为 implemented。')
  check(vueLibrary.skillVueComponent === true, 'Skill Vue 参考组件库必须明确 skillVueComponent:true。')
  check(vueLibrary.productSharedVueComponent === false, 'Skill Vue 参考组件不得误报为产品共享组件。')
  check(vueLibrary.productSourceEffect === 'none', 'Skill Vue 参考组件库不得修改产品源码。')
  check(existsSync(join(skillRoot, vueLibrary.entry || '')), 'Skill Vue 参考组件库入口不存在。')
  check(existsSync(join(skillRoot, vueLibrary.styles || '')), 'Skill Vue 参考组件库样式不存在。')
  check(existsSync(join(skillRoot, vueLibrary.usage || '')), 'Skill Vue 参考组件库使用合同不存在。')
  const vueSources = vueLibrary.componentSources || {}
  for (const id of implementedIds) {
    check(Array.isArray(vueSources[id]) && vueSources[id].length > 0, `Skill Vue 参考组件库缺少 ${id} 源码映射。`)
    for (const source of vueSources[id] || []) {
      check(existsSync(join(skillRoot, vueLibrary.root || '', source)), `Skill Vue 组件源码不存在：${id} ${source}`)
    }
  }

  const componentContracts = read('references/content-slot-component-contracts.md')
  for (const id of expectedApprovedComponents.keys()) check(componentContracts.includes(id), `组件合同缺少批准组件：${id}`)
  for (const id of expectedSkillOnlyComponents) check(componentContracts.includes(id), `组件合同缺少新增模块标题组件：${id}`)
  for (const marker of ['设计 API', '响应式', '反例', 'sharedVueComponent: true']) {
    check(componentContracts.includes(marker), `组件合同缺少关键规则：${marker}`)
  }
  for (const marker of ['页面内部允许按任务出现多个模块标题', '`SectionHeader`', '`h2`/`h3`', '不创建第二个 `h1`']) {
    check(componentContracts.includes(marker), `ContentPageHeader 合同未区分页面标题与模块标题：${marker}`)
  }
  for (const marker of ['CS-B006 SectionHeader', '关键经营链路', 'GMV 结构拆解', '核心趋势速览', 'SubsectionHeading｜轻量样式合同']) {
    check(componentContracts.includes(marker), `模块标题合同缺少关键规则：${marker}`)
  }
  const sectionHeader = components.find(component => component.id === 'CS-B006')
  check(sectionHeader?.stage === 'B' && sectionHeader?.reuseScope === 'Common', 'SectionHeader 必须登记为 B + Common。')
  check(sectionHeader?.skillImplementation === 'skill-library-implemented', 'SectionHeader 尚未标记为 Skill 组件库已实现。')
  check(sectionHeader?.sharedVueComponent === false && sectionHeader?.projectImplementation === 'project-page-local', 'SectionHeader 不得提前宣称项目已有共享 Vue 组件。')
  check(preview.includes('data-component-id="CS-B006"'), '组件预览缺少 SectionHeader（CS-B006）。')

  check(/href=["']content-template\.css["']/.test(preview), '内容槽组件预览未引用共享 content-template.css。')
  check(preview.includes('data-component-library="middle-content-slot-only"'), '内容槽组件预览缺少中间内容槽范围标记。')
  for (const forbiddenClass of ['sidebar', 'topbar', 'ai-panel', 'composer']) {
    check(!new RegExp(`class=["'][^"']*\\b${forbiddenClass}\\b`, 'i').test(preview), `内容槽组件预览越界包含壳层 class：${forbiddenClass}`)
  }

  for (const marker of [
    'A 不是共享组件',
    'A/B/C 只表示成熟度',
    '设计成熟度和项目实现状态必须分开',
    'project-mixed-unverified` 明确不能作为完成状态',
    '使用现有 C 组件的默认能力',
    '完全无法合理承载时，在目标页面创建 A 模式并登记',
    'approved-for-planning',
  ]) check(contract.includes(marker), `内容槽组件合同缺少治理规则：${marker}`)
  const extractionPlan = read('references/content-slot-migration-plan.md')
  for (const marker of ['content-slot-extraction-2026-08-12', 'Wave 0', 'Wave 1', 'Wave 2', 'Wave 3', '不修改 UAT']) {
    check(extractionPlan.includes(marker), `内容槽迁移计划缺少当前抽离程序：${marker}`)
  }
  for (const ref of ['content-slot-component-library.md', 'content-slot-component-registry.json']) {
    check(skill.includes(ref), `SKILL.md 未路由内容槽组件库文件：${ref}`)
  }
}

function checkStaticTemplates() {
  const shell = read('assets/page-template.html')
  const shellMarkers = [
    '--template-sidebar: 168px',
    '--template-sidebar-collapsed: 58px',
    '--template-topbar: 56px',
    '--template-ai: 380px',
    '--template-ai-max: 492px',
    'class="temp-tab-switcher"',
    'id="ai-toggle-btn"',
    'id="ai-resize-handle"',
    'container-type: inline-size',
    'width <= 1320',
    'width >= 1480',
  ]
  for (const marker of shellMarkers) check(shell.includes(marker), `assets/page-template.html 缺少当前壳层标记：${marker}`)
  check(!shell.includes('0702 Vue Shell Template'), 'assets/page-template.html 仍标记为 0702 旧壳层。')
  check(!shell.includes('class="workspace-tabs"'), 'assets/page-template.html 仍使用第二行 AI 动态页签。')
  check(!shell.includes('切换浅色或深色模式'), 'assets/page-template.html 仍暴露当前发布已隐藏的主题切换。')
  check(!/<aside class="ai-panel open"/.test(shell), 'assets/page-template.html 不得默认展开 Agent。')
  check(/<aside class="ai-panel"[^>]*aria-hidden="true"[^>]*inert/.test(shell), 'assets/page-template.html 的默认收起 Agent 缺少 aria-hidden/inert。')

  const css = read('assets/content-template.css')
  check(/\.page-stack\s*\{[\s\S]*?container-type:\s*inline-size/.test(css), 'Container Query 容器必须挂在 .page-stack。')
  check(/\.page-stack\s*\{[\s\S]*?gap:\s*0\s*;/.test(css), 'PageHeader 间距必须与父级 page-stack gap 解耦。')
  check(/\.page-stack\s*>\s*\.page-header\s*\{[\s\S]*?margin-bottom:\s*16px\s*;/.test(css), 'PageHeader 到首个业务区块必须统一为 16px。')
  check(/\.page-title::before\s*\{[\s\S]*?width:\s*18px[\s\S]*?height:\s*18px[\s\S]*?border-radius:\s*6px/.test(css), 'ContentPageHeader 缺少固定 18×18px 项目标记。')
  check(/\.section-title-row::before\s*\{[\s\S]*?width:\s*4px[\s\S]*?height:\s*18px[\s\S]*?background:\s*var\(--color-primary\)/.test(css), 'SectionHeader 缺少固定 4×18px 主色竖标。')
  check(/\.section-title\s*\{[\s\S]*?font-size:\s*16px/.test(css), 'SectionHeader 标题必须为 16px。')
  check(/\.subsection-heading\s*\{[\s\S]*?font-size:\s*14px[\s\S]*?font-weight:\s*600/.test(css), 'SubsectionHeading 必须保持 14px/600 轻量层级。')
  check(/\.page-flow--summary-list[\s\S]*?gap:\s*16px\s*;/.test(css), 'SummaryList 的页面级间距必须为 16px。')
  check(/\.list-workspace\s*\{[\s\S]*?gap:\s*12px\s*;/.test(css), 'ListWorkspace 的 FilterBar 到 ListSurface 间距必须为 12px。')
  check(/\.list-surface\s*\{[\s\S]*?overflow:\s*hidden/.test(css), 'ListSurface 必须把 Tabs、Table 与 Pagination 组合为连续表面。')
  check(!/\.dashboard-flow\s+\.page-header\s*\+\s*\.kpi-grid[\s\S]*?margin-top:\s*-/.test(css), 'Dashboard 不得用负 margin 覆盖统一 PageHeader 间距。')
  for (const threshold of [1039, 899, 879, 959, 719]) {
    check(css.includes(`@container (max-width: ${threshold}px)`), `缺少静态模板 Container Query：${threshold}px`)
  }
  check(!/@container\s*\(max-width:\s*(?:920|620)px\)/.test(css), '仍存在 920/620px 通用 Container Query。')
  check(!/@media\s*\(max-width:\s*620px\)/.test(css), '仍存在 620px 通用 viewport media query。')

  const responsiveBlocks = splitContainerBlocks(css)
  requireSelectors(responsiveBlocks.get(1039), 1039, ['.field-grid--4', '.kpi-grid', '.result-grid', '.report-metrics', '.workflow-body'])
  requireSelectors(responsiveBlocks.get(899), 899, ['.form-shell .field-grid', '.form-shell .field--span-2'])
  requireSelectors(responsiveBlocks.get(879), 879, ['.dashboard-grid'])
  requireSelectors(responsiveBlocks.get(959), 959, ['.workflow-shell', '.report-layout', '.report-toc'])
  requireSelectors(responsiveBlocks.get(719), 719, ['.field-grid', '.field-grid--4', '.kpi-grid', '.result-grid', '.split-layout', '.progress-steps', '.workflow-body', '.report-metrics'])

  for (const [fileName, markers] of requiredTemplates) {
    const rel = `assets/${fileName}`
    const html = read(rel)
    check(/href=["']content-template\.css["']/.test(html), `${rel} 未引用共享 content-template.css。`)
    for (const marker of markers) check(html.includes(marker), `${rel} 缺少页型标记：${marker}`)
    const pageHeaders = html.match(/<header\s+class=["'][^"']*\bpage-header\b[^"']*["'][^>]*data-component-id=["']CS-B001["'][^>]*>/g) || []
    const pageTitles = html.match(/<h1\s+class=["'][^"']*\bpage-title\b[^"']*["'][^>]*>/g) || []
    check(pageHeaders.length === 1, `${rel} 必须恰好包含一个 ContentPageHeader（CS-B001），当前为 ${pageHeaders.length}。`)
    check(pageTitles.length === 1, `${rel} 必须恰好包含一个 h1.page-title，当前为 ${pageTitles.length}。`)
    const headerStart = html.indexOf('data-component-id="CS-B001"')
    const titleStart = html.indexOf('<h1 class="page-title"')
    const headerEnd = html.indexOf('</header>', headerStart)
    check(headerStart >= 0 && titleStart > headerStart && titleStart < headerEnd, `${rel} 的唯一 h1 必须位于 ContentPageHeader 内。`)
  }

  const aiResultTemplate = read('assets/content-report-detail-template.html')
  for (const marker of [
    'data-component-id="CS-B001"',
    'data-component-id="CS-B002"',
    'data-component-id="CS-B003"',
    'data-component-id="CS-B004"',
    'data-component-id="CS-B006"',
  ]) check(aiResultTemplate.includes(marker), `AI 结果页模板未复用内容槽组件：${marker}`)

  const workbenchInteractions = read('references/workbench-interactions.md')
  const pageTemplates = read('references/page-templates.md')
  const contentSlotContract = read('references/content-slot-design-contract.md')
  for (const marker of ['AI 结果是动态页签', '中间内容槽', 'T1–T7', 'V3', 'C → B → 组合 → Domain wrapper → A', 'isAiReport']) {
    check(workbenchInteractions.includes(marker), `AI 结果动态页签合同缺少关键规则：${marker}`)
  }
  for (const marker of ['T1–T7', 'V3', 'ContentPageHeader', 'SectionHeader', 'SectionCard', 'FeedbackState', 'isDynamicTab']) {
    check(pageTemplates.includes(marker), `AI 结果页型合同缺少组件复用规则：${marker}`)
  }
  for (const marker of ['AI 报告、链接和 HTML 预览结果页', '选择 T1–T7 主类型、叠加 V3', '复用内容槽组件库']) {
    check(contentSlotContract.includes(marker), `内容槽合同未明确覆盖 AI 结果页：${marker}`)
  }

  for (const rel of [
    'SKILL.md',
    'references/content-slot-design-contract.md',
    'references/layout-grid.md',
    'references/design-tokens.md',
    'references/components.md',
    'references/style-contract.md',
    'references/review-checklist.md',
  ]) {
    const content = read(rel)
    check(!/页头到\s*KPI\s*`?12px`?|页面标题到\s*KPI\s*grid\s*`?12px`?/i.test(content), `${rel} 仍保留旧的 12px 页头到 KPI 间距。`)
  }
}

function checkVisualAcceptance() {
  const matrix = read('references/page-spec-coverage-matrix.md')
  const visual = parseJson('references/page-visual-acceptance.json')
  if (!visual) return

  const serialized = JSON.stringify(visual)
  check(visual.schemaVersion === 2, 'page-visual-acceptance.json schemaVersion 必须为 2。')
  check(visual.baseline === 'lexiang-new-0914', '视觉状态登记 baseline 必须为 lexiang-new-0914。')
  check(visual.evidenceRole === 'current-status-registry', '视觉记录必须明确标记为当前状态登记。')
  check(visual.sourceProject === 'lexiang-new-0914', '当前视觉状态 sourceProject 必须为 lexiang-new-0914。')
  check(!serialized.includes('/Users/') && !serialized.includes('/home/'), '视觉状态登记不得包含机器绝对路径。')
  check(!serialized.includes('references/visual-evidence/'), '当前视觉状态登记不得引用 Skill 内历史截图目录。')
  check(Boolean(visual.updatedAt), '视觉状态登记缺少 updatedAt。')
  const reviewStatus = visual.review?.status
  check(['not-captured', 'in-review', 'reviewed'].includes(reviewStatus), `视觉总览使用未知 review.status：${reviewStatus || '缺失'}。`)
  const reviewItems = [...(visual.pages || []), ...(visual.dynamicPages || [])]
  const reviewedPages = reviewItems.filter(page => (page.captures || []).length > 0).length
  const reviewedCaptures = reviewItems.reduce((total, page) => total + (page.captures || []).length, 0)
  const reviewableItems = reviewItems.filter(page => page.visualStatus !== 'VA-BLOCKED')
  const completedReviewItems = reviewableItems.filter(page => ['VA-R2', 'VA-PASS', 'VA-FAIL'].includes(page.visualStatus)).length
  check(visual.review?.reviewedCaptures === reviewedCaptures, `review.reviewedCaptures=${visual.review?.reviewedCaptures} 与真实当前截图数 ${reviewedCaptures} 不一致。`)
  check(visual.review?.reviewedPages === reviewedPages, `review.reviewedPages=${visual.review?.reviewedPages} 与真实已截图页面数 ${reviewedPages} 不一致。`)
  if (reviewStatus === 'not-captured') {
    check(reviewedCaptures === 0 && reviewedPages === 0, 'not-captured 状态不得包含当前截图或已评审页面。')
  }
  if (reviewStatus === 'in-review') {
    check(reviewedCaptures > 0 && reviewedPages > 0, 'in-review 状态必须至少包含一个当前截图和一个页面。')
    check(Boolean(visual.review?.reviewedAt && visual.review?.method), 'in-review 状态缺少 reviewedAt 或 method。')
    check(completedReviewItems < reviewableItems.length, '全部可评审页面已完成 R2/结论时，不应继续保持 in-review。')
  }
  if (reviewStatus === 'reviewed') {
    check(Boolean(visual.review?.reviewedAt && visual.review?.method), 'reviewed 状态缺少 reviewedAt 或 method。')
    check(reviewableItems.length > 0 && completedReviewItems === reviewableItems.length, 'reviewed 只允许在全部非阻塞页面达到 VA-R2、VA-PASS 或 VA-FAIL 后使用。')
  }
  check(visual.historicalEvidence?.sourceProject === 'lexiang-new-0728', '历史证据必须保留真实来源 lexiang-new-0728。')
  check(Boolean(visual.historicalEvidence?.capturedAt && visual.historicalEvidence?.location && visual.historicalEvidence?.note), '历史证据缺少日期、逻辑位置或说明。')
  check(!existsSync(join(skillRoot, 'references/visual-evidence')), '当前 Skill 不得继续打包 references/visual-evidence。')

  const profileIds = new Set((visual.profiles || []).map(profile => profile.id))
  for (const required of ['wide', 'squeezed']) check(profileIds.has(required), `视觉证据缺少响应式组合：${required}`)

  const pageIds = new Set()
  const routes = new Set()
  const matrixSection = between(matrix, '## 3. 当前 0914 项目页面矩阵', '## 4. 当前页面与 Figma 04 / UAT 证据关系')

  for (const page of visual.pages || []) {
    check(!pageIds.has(`${page.pageId}:${page.route}`), `视觉记录 pageId/route 重复：${page.pageId} ${page.route}`)
    check(!routes.has(page.route), `视觉记录 route 重复：${page.route}`)
    pageIds.add(`${page.pageId}:${page.route}`)
    routes.add(page.route)
    check(['VA-0', 'VA-R1', 'VA-R2', 'VA-PASS', 'VA-FAIL'].includes(page.visualStatus), `${page.pageId} 使用未知视觉状态：${page.visualStatus}`)

    const matrixRow = matrixSection.split('\n').find(line => line.startsWith('|') && line.includes(`\`${page.route}\``))
    check(Boolean(matrixRow), `页面矩阵缺少当前 route：${page.route}`)
    if (matrixRow) check(matrixRow.includes(`[${page.visualStatus}]`), `${page.route} 的矩阵状态与视觉记录不一致。`)

    const captureProfiles = new Set()
    for (const capture of page.captures || []) {
      captureProfiles.add(capture.profileId)
      check(profileIds.has(capture.profileId), `${page.pageId} 使用未登记 profile：${capture.profileId}`)
      check(Boolean(capture.evidenceRef), `${page.pageId}/${capture.profileId} 缺少可移植 evidenceRef。`)
      check(!String(capture.evidenceRef || '').startsWith('/'), `${page.pageId}/${capture.profileId} evidenceRef 不得使用绝对路径。`)
    }

    if (page.visualStatus === 'VA-0') check((page.captures || []).length === 0, `${page.pageId} 为 VA-0，不得附带历史或伪造的当前证据。`)
    if (['VA-R2', 'VA-PASS', 'VA-FAIL'].includes(page.visualStatus)) {
      for (const profileId of profileIds) check(captureProfiles.has(profileId), `${page.pageId} 缺少 ${profileId} 当前证据。`)
    }
    if (['VA-R2', 'VA-PASS'].includes(page.visualStatus)) {
      for (const capture of page.captures || []) {
        const metrics = capture.metrics || {}
        check(capture.httpStatus === 200, `${page.pageId}/${capture.profileId} HTTP 非 200。`)
        check((metrics.pageContentOverflowX ?? 1) === 0, `${page.pageId}/${capture.profileId} 页面内容横向溢出。`)
        check((metrics.documentOverflowX ?? 1) === 0, `${page.pageId}/${capture.profileId} document 横向溢出。`)
        check(!metrics.isLogin && !metrics.isWip, `${page.pageId}/${capture.profileId} 未进入真实业务页。`)
        check((capture.pageErrors || []).length === 0, `${page.pageId}/${capture.profileId} 存在 page error。`)
      }
    }
    if (page.visualStatus === 'VA-FAIL') {
      check((page.findings || []).length > 0, `${page.pageId} 为 VA-FAIL 但没有 findings。`)
      const measurableFailure = (page.captures || []).some(capture =>
        capture.httpStatus !== 200 ||
        (capture.metrics?.pageContentOverflowX || 0) > 0 ||
        (capture.metrics?.documentOverflowX || 0) > 0 ||
        (capture.pageErrors || []).length > 0
      )
      check(measurableFailure, `${page.pageId} 为 VA-FAIL，但证据中没有可测量失败。`)
      notices.push(`${page.pageId} 保持 VA-FAIL：${(page.findings || []).join(' ')}`)
    }
  }

  for (const dynamic of visual.dynamicPages || []) {
    check(['VA-0', 'VA-R1', 'VA-R2', 'VA-PASS', 'VA-FAIL', 'VA-BLOCKED'].includes(dynamic.visualStatus), `${dynamic.pageId} 使用未知视觉状态：${dynamic.visualStatus}`)
    check(matrixSection.includes(`[${dynamic.visualStatus}]`), `页面矩阵缺少 ${dynamic.pageId} 的 ${dynamic.visualStatus}。`)
    if (dynamic.visualStatus === 'VA-BLOCKED') {
      check(Boolean(dynamic.blocker), `${dynamic.pageId} 缺少 blocker。`)
      notices.push(`${dynamic.pageId} 保持 VA-BLOCKED：${dynamic.blocker}`)
    }
    const captureProfiles = new Set()
    for (const capture of dynamic.captures || []) {
      captureProfiles.add(capture.profileId)
      check(profileIds.has(capture.profileId), `${dynamic.pageId} 使用未登记 profile：${capture.profileId}`)
      check(Boolean(capture.evidenceRef), `${dynamic.pageId}/${capture.profileId} 缺少可移植 evidenceRef。`)
      check(!String(capture.evidenceRef || '').startsWith('/'), `${dynamic.pageId}/${capture.profileId} evidenceRef 不得使用绝对路径。`)
      if (['VA-R2', 'VA-PASS'].includes(dynamic.visualStatus)) {
        const metrics = capture.metrics || {}
        check(capture.httpStatus === 200, `${dynamic.pageId}/${capture.profileId} HTTP 非 200。`)
        check((metrics.pageContentOverflowX ?? 1) === 0, `${dynamic.pageId}/${capture.profileId} 页面内容横向溢出。`)
        check((metrics.documentOverflowX ?? 1) === 0, `${dynamic.pageId}/${capture.profileId} document 横向溢出。`)
        check(!metrics.isLogin && !metrics.isWip, `${dynamic.pageId}/${capture.profileId} 未进入真实动态页。`)
        check((capture.pageErrors || []).length === 0, `${dynamic.pageId}/${capture.profileId} 存在 page error。`)
      }
    }
    if (dynamic.visualStatus === 'VA-0') check((dynamic.captures || []).length === 0, `${dynamic.pageId} 为 VA-0，不得附带历史或伪造的当前证据。`)
    if (['VA-R2', 'VA-PASS'].includes(dynamic.visualStatus)) {
      for (const profileId of profileIds) check(captureProfiles.has(profileId), `${dynamic.pageId} 缺少 ${profileId} 当前证据。`)
    }
  }
}

function checkProjectRoutes() {
  const routerFile = join(projectRoot, 'src/router/index.ts')
  const visual = parseJson('references/page-visual-acceptance.json')
  if (!visual) return
  check(existsSync(routerFile), `项目路由文件不存在：${routerFile}`)
  if (!existsSync(routerFile)) return

  let router = readFileSync(routerFile, 'utf8')
  // Include route modules explicitly imported by the main router.
  for (const match of [...router.matchAll(/from\s+['"](@\/[^'"]+\/routes)['"]/g)]) {
    const moduleFile = join(projectRoot, 'src', match[1].slice(2) + '.ts')
    check(existsSync(moduleFile), `路由模块不存在：${match[1]}`)
    if (existsSync(moduleFile)) router += '\n' + readFileSync(moduleFile, 'utf8')
  }
  const matrix = read('references/page-spec-coverage-matrix.md')
  const matrixSection = between(matrix, '## 3. 当前 0914 项目页面矩阵', '## 4. 当前页面与 Figma 04 / UAT 证据关系')
  const sourceRoutes = new Map()
  const routeRecordPattern = /\{\s*path:\s*'([^']+)'(?:[^{}]|\{[^{}]*\})*?meta:\s*\{[^{}]*pageId:\s*'([^']+)'[^{}]*\}(?:[^{}]|\{[^{}]*\})*?\}/g
  for (const match of router.matchAll(routeRecordPattern)) {
    const route = match[1].startsWith('/') ? match[1] : `/${match[1]}`
    check(!sourceRoutes.has(route), `项目 route 重复：${route}`)
    sourceRoutes.set(route, match[2])
  }
  const evidenceRoutes = new Map((visual.pages || []).map(page => [page.route, page.pageId]))
  check(sourceRoutes.size === evidenceRoutes.size, `项目 pageId 数量 ${sourceRoutes.size} 与视觉记录 ${evidenceRoutes.size} 不一致。`)
  for (const [route, pageId] of sourceRoutes) {
    check(evidenceRoutes.has(route), `项目 route 未登记视觉记录：${pageId} ${route}`)
    if (evidenceRoutes.has(route)) check(evidenceRoutes.get(route) === pageId, `${pageId} 路由漂移：项目 ${route}，视觉记录 ${evidenceRoutes.get(route)}`)
    const matrixRow = matrixSection.split('\n').find(line => line.startsWith('|') && line.includes(`\`${route}\``))
    check(Boolean(matrixRow), `新增页面未登记页面矩阵：${pageId} ${route}`)
    if (matrixRow) {
      const primaryTypeCell = matrixRow.split('|')[3] || ''
      const types = primaryTypeCell.match(/\bT[1-7]\b/g) || []
      const variants = primaryTypeCell.match(/\bV[1-5]\b/g) || []
      check(types.length === 1, `${pageId} 必须且只能登记一个 T1–T7 主页型，当前=${types.join('/') || '无'}。`)
      check(variants.length <= 1, `${pageId} 至多登记一个 V1–V5 变体，当前=${variants.join('/')}。`)
      check(/\bC9\b/.test(matrixRow), `${pageId} 未登记完整 C9 状态组。`)
    }
  }
  for (const [route, pageId] of evidenceRoutes) check(sourceRoutes.has(route), `视觉记录包含项目不存在的 route：${pageId} ${route}`)
}

function checkProjectDesignGuard() {
  const requested = changedFileArgs.map(file => resolveGuardFile(file)).filter(Boolean)
  const candidates = guardAll
    ? walk(join(projectRoot, 'src')).filter(file => /\.(?:vue|css|scss)$/i.test(file) && /[\\/](?:views|components)[\\/]/.test(file))
    : requested

  if (candidates.length === 0) {
    notices.push('未提供 --changed-file；增量设计 Guard 未扫描页面样式。新增/修改内容槽文件时必须逐个传入，或用 --guard-all 建立非阻塞存量清单。')
    return
  }

  const blocking = !guardAll
  let violationCount = 0
  for (const file of [...new Set(candidates)]) {
    const source = readFileSync(file, 'utf8')
    const styleBlocks = file.endsWith('.vue') ? extractVueStyles(source) : [{ text: source, offset: 0 }]
    for (const block of styleBlocks) {
      for (const match of block.text.matchAll(/(?:^|[;{}\n])\s*([\w-]+)\s*:\s*([^;{}]+)/g)) {
        const property = match[1].toLowerCase()
        const value = match[2].trim()
        if (property.startsWith('--')) continue
        const line = lineNumber(source, block.offset + (match.index || 0))
        const label = `${portable(relative(projectRoot, file))}:${line} ${property}:${value}`

        if (/^(?:color|background|background-color|border(?:-(?:top|right|bottom|left))?-color|fill|stroke|box-shadow|text-shadow)$/.test(property) && /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\s*\(/i.test(value)) {
          reportDesignViolation(`硬编码颜色；请使用语义 token：${label}`, blocking)
          violationCount += 1
        }

        if (/^(?:margin|margin-(?:top|right|bottom|left)|padding|padding-(?:top|right|bottom|left)|gap|row-gap|column-gap)$/.test(property) && !/\b(?:var|calc|clamp|min|max)\s*\(/.test(value)) {
          const pixels = [...value.matchAll(/(-?\d+(?:\.\d+)?)px\b/g)].map(item => Number(item[1]))
          if (pixels.some(pixel => ![0, 4, 8, 12, 16, 20, 24, 32, 40, 48].includes(pixel))) {
            reportDesignViolation(`非登记间距；请使用 4px 基准或命名专项 token：${label}`, blocking)
            violationCount += 1
          }
        }

        if (property === 'border-radius' && !/\bvar\s*\(/.test(value) && value !== '50%') {
          const pixels = [...value.matchAll(/(\d+(?:\.\d+)?)px\b/g)].map(item => Number(item[1]))
          if (pixels.some(pixel => ![4, 8, 12, 9999].includes(pixel))) {
            reportDesignViolation(`圆角不在 4/8/12/9999px 闭集：${label}`, blocking)
            violationCount += 1
          }
        }

        if (property === 'font-size' && !/\bvar\s*\(/.test(value)) {
          const pixels = [...value.matchAll(/(\d+(?:\.\d+)?)px\b/g)].map(item => Number(item[1]))
          if (pixels.some(pixel => ![12, 13, 14, 16, 18, 20, 24, 30].includes(pixel))) {
            reportDesignViolation(`字号不在设计阶梯：${label}`, blocking)
            violationCount += 1
          }
        }
      }
    }
  }

  const mode = blocking ? '增量阻断' : '存量审计'
  notices.push(`设计 Guard ${mode}：扫描 ${candidates.length} 个文件，发现 ${violationCount} 条${blocking ? '违规' : '历史差异'}。`)
}

function resolveGuardFile(file) {
  const target = isAbsolute(file) ? resolve(file) : resolve(projectRoot, file)
  if (target !== projectRoot && !target.startsWith(`${projectRoot}${sep}`)) {
    errors.push(`--changed-file 超出目标项目：${file}`)
    return null
  }
  if (!existsSync(target)) {
    errors.push(`--changed-file 不存在：${file}`)
    return null
  }
  if (!/\.(?:vue|css|scss)$/i.test(target)) {
    errors.push(`--changed-file 仅支持 Vue/CSS/SCSS：${file}`)
    return null
  }
  return target
}

function extractVueStyles(source) {
  return [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => ({
    text: match[1],
    offset: (match.index || 0) + match[0].indexOf(match[1]),
  }))
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split('\n').length
}

function reportDesignViolation(message, blocking) {
  if (blocking) errors.push(message)
  else notices.push(`设计 Guard 存量：${message}`)
}

function requireSelectors(block, threshold, selectors) {
  check(Boolean(block), `无法读取 ${threshold}px Container Query 内容。`)
  if (!block) return
  for (const selector of selectors) check(block.includes(selector), `${threshold}px Container Query 缺少专项降级：${selector}`)
}

function splitContainerBlocks(css) {
  const matches = [...css.matchAll(/@container\s*\(max-width:\s*(\d+)px\)/g)]
  const blocks = new Map()
  matches.forEach((match, index) => {
    const start = match.index
    const end = matches[index + 1]?.index ?? css.length
    blocks.set(Number(match[1]), css.slice(start, end))
  })
  return blocks
}

function codeAssetPaths(text) {
  return new Set([...text.matchAll(/`(assets\/[^`]+)`/g)].map(match => match[1]))
}

function parseJson(rel) {
  try {
    return JSON.parse(read(rel))
  } catch (error) {
    errors.push(`${rel} 不是合法 JSON：${error.message}`)
    return null
  }
}

function read(rel) {
  const file = join(skillRoot, rel)
  if (!existsSync(file)) return ''
  return readFileSync(file, 'utf8')
}

function walk(dir) {
  if (!existsSync(dir)) return []
  const result = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) result.push(...walk(full))
    else if (entry.isFile()) result.push(full)
  }
  return result
}

function between(text, start, end) {
  const from = text.indexOf(start)
  const to = text.indexOf(end, from + start.length)
  return from >= 0 ? text.slice(from, to >= 0 ? to : text.length) : ''
}

function portable(value) {
  return value.split('\\').join('/')
}

function flagValues(values, flag) {
  const result = []
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === flag && values[index + 1]) result.push(values[index + 1])
  }
  return result
}

function check(condition, message) {
  if (!condition) errors.push(message)
}
