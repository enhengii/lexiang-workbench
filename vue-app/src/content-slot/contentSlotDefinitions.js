/**
 * Middle content slot registry.
 *
 * This file is the migration contract for the center workspace area:
 * - Shell components own left navigation, top navigation and Agent panel.
 * - Content slot pages own page-specific data, layout and interactions.
 * - Page teams can use this registry to decide which parts become shared
 *   components and which parts stay custom per module.
 */

export const CONTENT_SLOT_COMPONENT_TIERS = {
  fixedStyle: 'fixed-style',
  sharedComponent: 'shared-component',
  domainComponent: 'domain-component',
  customPage: 'custom-page'
}

export const CONTENT_SLOT_LAYOUTS = {
  portalWorkbench: 'portal-workbench',
  dashboardOverview: 'dashboard-overview',
  analysisDashboard: 'analysis-dashboard',
  tableWorkbench: 'table-workbench',
  reviewWorkbench: 'review-workbench',
  kanbanWorkbench: 'kanban-workbench',
  configWorkbench: 'config-workbench',
  detailWorkbench: 'detail-workbench',
  agentWorkbench: 'agent-workbench',
  reportWorkbench: 'report-workbench'
}

const commonContentStyles = {
  pageHeader: {
    tier: CONTENT_SLOT_COMPONENT_TIERS.fixedStyle,
    notes: 'Page title, subtitle, optional right actions and title-leading square marker keep the sealed project spacing and typography.'
  },
  sectionCard: {
    tier: CONTENT_SLOT_COMPONENT_TIERS.sharedComponent,
    notes: 'White surface, subtle border, 8px radius max, consistent inner spacing, optional card title rail.'
  },
  filters: {
    tier: CONTENT_SLOT_COMPONENT_TIERS.sharedComponent,
    notes: 'Search inputs, selects, segmented filters and refresh buttons use the same spacing contract.'
  },
  dataTable: {
    tier: CONTENT_SLOT_COMPONENT_TIERS.sharedComponent,
    notes: 'Header, selection column, status tags, pagination and row hover can be shared. Domain columns remain page-owned.'
  },
  tabs: {
    tier: CONTENT_SLOT_COMPONENT_TIERS.sharedComponent,
    notes: 'Content-internal tabs keep fixed spacing from the following block; active state uses primary underline.'
  },
  charts: {
    tier: CONTENT_SLOT_COMPONENT_TIERS.domainComponent,
    notes: 'Chart containers and empty states can be shared; chart option/data belongs to each domain.'
  },
  emptyState: {
    tier: CONTENT_SLOT_COMPONENT_TIERS.sharedComponent,
    notes: 'Use the same neutral empty placeholder for API-waiting data and no-result data.'
  }
}

export const CONTENT_SLOT_GROUPS = [
  {
    key: 'workbenchUsage',
    label: '工作台使用数据',
    ownership: 'Vue native page; fixed synthetic demonstration dataset',
    defaultLayout: CONTENT_SLOT_LAYOUTS.analysisDashboard,
    pages: [{
      pageId: 'agent.usageDashboard',
      label: '使用数据看板',
      path: '/agent/usage-dashboard',
      layout: CONTENT_SLOT_LAYOUTS.analysisDashboard,
      sourceRenderer: 'src/views/agent/UsageDashboardView.vue',
      fixedStyles: ['shared ContentPageHeader', 'one PageFlow', 'shared metric grid and content tabs'],
      sharedCandidates: ['ContentPageHeader', 'MetricGrid', 'MetricCard', 'SectionHeader', 'ContentTabs', 'DataTable', 'FeedbackState'],
      customAreas: ['date-window deduplication', 'assistant and Skill sample aggregation', 'page-local chart options'],
      interactions: ['enter from account menu', 'switch overview and Skill analysis', 'filter dates and Skill rows', 'inspect aggregate Skill details', 'export filtered synthetic statistics']
    }]
  },
  {
    key: 'points',
    label: '积分管理',
    ownership: 'Vue native page; isolated demonstration data',
    defaultLayout: CONTENT_SLOT_LAYOUTS.tableWorkbench,
    pages: [{
      pageId: 'points.activity',
      label: '活动积分配置',
      path: '/points/activity',
      layout: CONTENT_SLOT_LAYOUTS.tableWorkbench,
      sourceRenderer: 'src/views/points/ActivityPointsView.vue',
      fixedStyles: ['shared ContentPageHeader', 'single PageFlow', 'filter and list surface'],
      sharedCandidates: ['SectionHeader', 'data table', 'content tabs', 'status tag', 'pagination'],
      customAreas: ['activity tiers and product scope', 'enterprise aggregation and actual-issued top-up', 'simulated settlement'],
      interactions: ['filter and create activity', 'edit draft or future activity', 'extend ongoing activity', 'inspect enterprise and order results', 'simulate settlement and failed retry', 'export current detail']
    }]
  },
  {
    key: 'portal',
    label: '首页',
    ownership: 'Vue native page',
    pages: [
      {
        pageId: 'portal.home',
        label: '联想门户工作台',
        path: '/portal/home',
        layout: CONTENT_SLOT_LAYOUTS.portalWorkbench,
        sourceRenderer: 'src/views/PortalHomeView.vue',
        fixedStyles: ['hero command block', 'spotlight cards', 'entry list', 'operation flow'],
        sharedCandidates: ['page header marker', 'entry list rows', 'flow step rows'],
        customAreas: ['portal landing copy', 'primary workflow cards'],
        interactions: ['open Agent panel', 'open skill manager modal', 'navigate to create Skill', 'navigate to common entries']
      }
    ]
  },
  {
    key: 'dashboard',
    label: '乐享运营',
    ownership: 'Vue route pages; mixed native/transition internals',
    defaultLayout: CONTENT_SLOT_LAYOUTS.analysisDashboard,
    pages: [
      {
        pageId: 'dashboard.overview',
        label: '运营总览',
        path: '/dashboard/overview',
        layout: CONTENT_SLOT_LAYOUTS.dashboardOverview,
        sourceRenderer: 'src/views/dashboard/DashboardOverviewView.vue',
        fixedStyles: ['overview KPI row', 'summary cards', 'trend panels'],
        sharedCandidates: ['KPI card', 'metric card grid', 'chart panel', 'quick entry panel'],
        customAreas: ['运营指标口径', '总览数据组合'],
        interactions: ['refresh data', 'open related operation pages', 'Agent follows current page']
      },
      {
        pageId: 'pipeline.annotate',
        label: 'Query 分析',
        path: '/pipeline/annotate',
        layout: CONTENT_SLOT_LAYOUTS.tableWorkbench,
        sourceRenderer: 'src/views/dashboard/PipelineAnnotateView.vue',
        fixedStyles: ['filter toolbar', 'table area', 'pagination'],
        sharedCandidates: ['filter bar', 'data table', 'status tag', 'pagination'],
        customAreas: ['Query 指标字段', '标注相关动作'],
        interactions: ['filter query', 'table action', 'open hidden query detail']
      },
      {
        pageId: 'pipeline.quality',
        label: '质量分析',
        path: '/pipeline/quality',
        layout: CONTENT_SLOT_LAYOUTS.analysisDashboard,
        sourceRenderer: 'src/views/dashboard/PipelineQualityView.vue',
        fixedStyles: ['quality cards', 'analysis panels', 'AI report entry'],
        sharedCandidates: ['metric card', 'trend chart card', 'report action block'],
        customAreas: ['质量评分口径', '差评样本追踪'],
        interactions: ['refresh quality data', 'open quality report dynamic tab']
      },
      {
        pageId: 'ops.traffic',
        label: '流量分析',
        path: '/ops/traffic',
        layout: CONTENT_SLOT_LAYOUTS.analysisDashboard,
        sourceRenderer: 'src/views/dashboard/OpsTrafficView.vue',
        fixedStyles: ['traffic KPI cards', 'traffic chart panels'],
        sharedCandidates: ['KPI card', 'chart panel', 'period filter'],
        customAreas: ['入口质量指标', '流量渠道分析'],
        interactions: ['switch period', 'refresh charts', 'open dynamic report']
      },
      {
        pageId: 'ops.gmv',
        label: 'GMV 分析',
        path: '/ops/gmv',
        layout: CONTENT_SLOT_LAYOUTS.analysisDashboard,
        sourceRenderer: 'src/views/dashboard/OpsGmvView.vue',
        fixedStyles: ['GMV metric cards', 'contribution panels'],
        sharedCandidates: ['KPI card', 'contribution chart', 'comparison panel'],
        customAreas: ['GMV 业务口径', '客单价/购买分析'],
        interactions: ['switch scope', 'refresh charts', 'open dynamic report']
      }
    ]
  },
  {
    key: 'geo',
    label: 'GEO 看板',
    ownership: 'vue route wrapper + sealed runtime body',
    defaultLayout: CONTENT_SLOT_LAYOUTS.analysisDashboard,
    pages: [
      {
        pageId: 'dashboard.geo',
        label: '整体数据概览',
        path: '/geo/overview',
        layout: CONTENT_SLOT_LAYOUTS.dashboardOverview,
        sourceRenderer: 'src/views/geo/GeoOverviewView.vue',
        fixedStyles: ['GEO overview metric cards', 'scope tabs', 'chart panels'],
        sharedCandidates: ['metric card', 'scope tab', 'chart empty state'],
        customAreas: ['GEO 总览指标', 'AI 平台覆盖矩阵'],
        interactions: ['refresh GEO data', 'switch scope']
      },
      {
        pageId: 'dashboard.geoSource',
        label: '各平台信源分布',
        path: '/geo/source',
        layout: CONTENT_SLOT_LAYOUTS.analysisDashboard,
        sourceRenderer: 'src/views/geo/GeoSourceView.vue',
        fixedStyles: ['source distribution chart', 'source list panel'],
        sharedCandidates: ['chart panel', 'source item list', 'empty state'],
        customAreas: ['信源引用数据', '平台差异展示'],
        interactions: ['refresh source data', 'open source report']
      },
      {
        pageId: 'dashboard.geoIntent',
        label: '各平台意图分布',
        path: '/geo/intent',
        layout: CONTENT_SLOT_LAYOUTS.analysisDashboard,
        sourceRenderer: 'src/views/geo/GeoIntentView.vue',
        fixedStyles: ['intent chart', 'intent matrix'],
        sharedCandidates: ['chart panel', 'matrix table', 'empty state'],
        customAreas: ['意图分类模型', '平台意图口径'],
        interactions: ['refresh intent data', 'open intent report']
      },
      {
        pageId: 'dashboard.geoConversion',
        label: 'GEO 转化看板',
        path: '/geo/conversion',
        layout: CONTENT_SLOT_LAYOUTS.analysisDashboard,
        sourceRenderer: 'src/views/geo/GeoConversionView.vue',
        fixedStyles: ['conversion funnel', 'conversion metric panels'],
        sharedCandidates: ['funnel card', 'metric card', 'trend chart'],
        customAreas: ['转化链路口径', '归因数据'],
        interactions: ['switch conversion scope', 'refresh conversion data']
      },
      {
        pageId: 'dashboard.geoKnowledge',
        label: '手工上传知识',
        path: '/geo/knowledge',
        layout: CONTENT_SLOT_LAYOUTS.configWorkbench,
        sourceRenderer: 'src/views/geo/GeoKnowledgeView.vue',
        fixedStyles: ['upload panel', 'knowledge table', 'status tags'],
        sharedCandidates: ['upload card', 'data table', 'status tag'],
        customAreas: ['知识文件校验', '知识入库状态'],
        interactions: ['upload knowledge', 'filter records', 'view processing status']
      }
    ]
  },
  {
    key: 'employee',
    label: '在职员工管理',
    ownership: 'vue route wrapper + sealed runtime body',
    defaultLayout: CONTENT_SLOT_LAYOUTS.reviewWorkbench,
    pages: [
      {
        pageId: 'employee.overview',
        label: '职场员工概览',
        path: '/employee/overview',
        layout: CONTENT_SLOT_LAYOUTS.dashboardOverview,
        sourceRenderer: 'src/views/employee/EmployeeOverviewView.vue',
        fixedStyles: ['employee summary cards', 'certification distribution', 'recent records'],
        sharedCandidates: ['metric card', 'distribution chart', 'record list'],
        customAreas: ['员工认证口径', '组织维度'],
        interactions: ['navigate certification audit', 'refresh employee metrics']
      },
      {
        pageId: 'employee.certification',
        label: '职场员工审核',
        path: '/employee/cert',
        layout: CONTENT_SLOT_LAYOUTS.reviewWorkbench,
        sourceRenderer: 'src/views/employee/EmployeeCertView.vue',
        fixedStyles: ['status tabs', 'filter card', 'review table', 'detail review card'],
        sharedCandidates: ['status tabs', 'filter bar', 'review table', 'approval action bar'],
        customAreas: ['认证材料详情', '审核意见表单'],
        interactions: ['switch status tab', 'search applications', 'approve/reject application', 'paginate table']
      }
    ]
  },
  {
    key: 'lead',
    label: '企业客户管理',
    ownership: 'vue route wrapper + sealed runtime body',
    defaultLayout: CONTENT_SLOT_LAYOUTS.kanbanWorkbench,
    pages: [
      {
        pageId: 'lead.dashboard',
        label: '线索看板',
        path: '/lead/dashboard',
        layout: CONTENT_SLOT_LAYOUTS.kanbanWorkbench,
        sourceRenderer: 'src/views/lead/LeadDashboardView.vue',
        fixedStyles: ['lead KPI cards', 'funnel panels', 'kanban lists'],
        sharedCandidates: ['KPI card', 'funnel card', 'kanban card'],
        customAreas: ['线索阶段定义', '销售转化口径'],
        interactions: ['refresh lead dashboard', 'drill into lead detail']
      },
      {
        pageId: 'lead.pool',
        label: '线索池',
        path: '/lead/pool',
        layout: CONTENT_SLOT_LAYOUTS.tableWorkbench,
        sourceRenderer: 'src/views/lead/LeadPoolView.vue',
        fixedStyles: ['filter toolbar', 'lead table', 'allocation actions'],
        sharedCandidates: ['filter bar', 'data table', 'batch action bar'],
        customAreas: ['线索分配规则', '跟进状态动作'],
        interactions: ['filter leads', 'batch allocate', 'open lead detail']
      },
      {
        pageId: 'lead.governmentPool',
        label: '线索池-政企',
        path: '/lead/government-pool',
        layout: CONTENT_SLOT_LAYOUTS.tableWorkbench,
        sourceRenderer: 'src/views/lead/LeadGovernmentPoolView.vue',
        fixedStyles: ['filter toolbar', 'lead table', 'read-only actions'],
        sharedCandidates: ['filter bar', 'data table', 'export action bar'],
        customAreas: ['政企线索只读查询', 'REL关系字段'],
        interactions: ['filter leads', 'export leads', 'open lead detail']
      },
      {
        pageId: 'lead.score',
        label: '打分模型',
        path: '/lead/score',
        layout: CONTENT_SLOT_LAYOUTS.configWorkbench,
        sourceRenderer: 'src/views/lead/LeadScoreView.vue',
        fixedStyles: ['model config cards', 'score rule table', 'preview panel'],
        sharedCandidates: ['config card', 'editable table', 'preview panel'],
        customAreas: ['打分规则', '模型权重配置'],
        interactions: ['edit score rule', 'preview score result', 'save model config']
      }
    ]
  },
  {
    key: 'agent',
    label: 'AI 助手',
    ownership: 'Vue native page',
    defaultLayout: CONTENT_SLOT_LAYOUTS.agentWorkbench,
    pages: [
      {
        pageId: 'agent.skills',
        label: 'Skill Hub',
        path: '/agent/skills',
        layout: CONTENT_SLOT_LAYOUTS.agentWorkbench,
        sourceRenderer: 'src/views/agent/AgentSkillsView.vue',
        fixedStyles: ['Skill Hub summary', 'Skill / 场景技能包双页签', 'Skill table/cards', '场景技能包四步创建', 'approval modals'],
        sharedCandidates: ['status tabs', 'skill card', 'detail modal', 'confirm modal'],
        customAreas: ['Skill 状态机', '审批/发布流程', '跨菜单已发布 Skill 固定版本编排', '运行时权限校验策略'],
        interactions: ['filter Skill', '切换 Skill / 场景技能包', '四步创建场景技能包、拖入画布并连线编排链路', '评估固定版本并说明运行时权限校验策略', 'approve/reject', 'evaluate', 'publish', 'enable/disable']
      },
      {
        pageId: 'agent.skillCreate',
        label: 'Skill 创建',
        path: '/agent/skill-create',
        layout: CONTENT_SLOT_LAYOUTS.agentWorkbench,
        sourceRenderer: 'src/views/agent/AgentSkillCreateView.vue',
        fixedStyles: ['stepper', 'form panels', 'draft generation workspace', 'evaluation panel'],
        sharedCandidates: ['stepper', 'form section', 'code/draft viewer', 'evaluation card'],
        customAreas: ['Skill 配置表单', '草稿生成/评估流程'],
        interactions: ['complete steps', 'generate draft', 'evaluate', 'submit for review']
      },
      {
        pageId: 'agent.permissions',
        label: '权限管理',
        path: '/agent/permissions',
        layout: CONTENT_SLOT_LAYOUTS.configWorkbench,
        sourceRenderer: 'src/views/agent/AgentPermissionsView.vue',
        fixedStyles: ['permission matrix', 'role scope panels'],
        sharedCandidates: ['matrix table', 'scope selector'],
        customAreas: ['权限模型', '角色范围'],
        interactions: ['view permissions', 'future edit permissions']
      }
    ]
  },
  {
    key: 'hidden',
    label: '隐藏/详情流程页',
    ownership: 'sealed runtime renderer',
    defaultLayout: CONTENT_SLOT_LAYOUTS.detailWorkbench,
    pages: [
      { pageId: 'dashboard.query', label: 'Query 明细', path: '/hidden/dashboard/query', layout: CONTENT_SLOT_LAYOUTS.detailWorkbench },
      { pageId: 'dashboard.behavior', label: '用户行为', path: '/hidden/dashboard/behavior', layout: CONTENT_SLOT_LAYOUTS.detailWorkbench },
      { pageId: 'ops.queryBiz', label: 'Query 业务归因', path: '/hidden/ops/query-biz', layout: CONTENT_SLOT_LAYOUTS.detailWorkbench },
      { pageId: 'ops.keywords', label: '高频关键词', path: '/hidden/ops/keywords', layout: CONTENT_SLOT_LAYOUTS.detailWorkbench },
      { pageId: 'pipeline.task', label: '标注任务', path: '/hidden/pipeline/task', layout: CONTENT_SLOT_LAYOUTS.tableWorkbench },
      { pageId: 'pipeline.stats', label: '标注统计', path: '/hidden/pipeline/stats', layout: CONTENT_SLOT_LAYOUTS.analysisDashboard },
      { pageId: 'pipeline.filter', label: '数据过滤', path: '/hidden/pipeline/filter', layout: CONTENT_SLOT_LAYOUTS.configWorkbench },
      { pageId: 'pipeline.monitor', label: '任务监控', path: '/hidden/pipeline/monitor', layout: CONTENT_SLOT_LAYOUTS.analysisDashboard },
      { pageId: 'employee.list', label: '员工列表', path: '/hidden/employee/list', layout: CONTENT_SLOT_LAYOUTS.tableWorkbench },
      { pageId: 'employee.detail', label: '员工详情', path: '/hidden/employee/detail', layout: CONTENT_SLOT_LAYOUTS.detailWorkbench },
      { pageId: 'employee.cert-detail', label: '认证详情', path: '/hidden/employee/cert-detail', layout: CONTENT_SLOT_LAYOUTS.reviewWorkbench },
      { pageId: 'lead.detail', label: '线索详情', path: '/hidden/lead/detail', layout: CONTENT_SLOT_LAYOUTS.detailWorkbench },
      { pageId: 'report.overview', label: '报告总览', path: '/hidden/report/overview', layout: CONTENT_SLOT_LAYOUTS.reportWorkbench },
      { pageId: 'report.quality', label: '质量报告', path: '/hidden/report/quality', layout: CONTENT_SLOT_LAYOUTS.reportWorkbench },
      { pageId: 'report.detail', label: '报告详情', path: '/hidden/report/detail', layout: CONTENT_SLOT_LAYOUTS.reportWorkbench }
    ].map(page => ({
      ...page,
      fixedStyles: ['detail header', 'section card', 'context actions'],
      sharedCandidates: ['detail header', 'section card', 'status tag'],
      customAreas: ['domain detail fields', 'domain-specific action flow'],
      interactions: ['opened by internal navigation or dynamic tab', 'return to source page when applicable']
    }))
  },
  {
    key: 'dynamic',
    label: '动态页签',
    ownership: 'Vue native page',
    pages: [
      {
        pageId: 'temp.report',
        label: 'AI 动态报告页签',
        path: null,
        layout: CONTENT_SLOT_LAYOUTS.reportWorkbench,
        sourceRenderer: 'src/components/TempTabView.vue',
        fixedStyles: ['report header', 'summary cards', 'toc card', 'report sections', 'save/download/action buttons'],
        sharedCandidates: ['report shell', 'report section', 'tag chip', 'action button row'],
        customAreas: ['AI report markdown/content payload', 'source page metadata'],
        interactions: ['open from Agent card', 'save report', 'close temp tab', 'copy/compare future reports']
      }
    ]
  }
]

export const CONTENT_SLOT_COMMON_STYLES = commonContentStyles

export function getContentSlotDefinition(pageId) {
  for (const group of CONTENT_SLOT_GROUPS) {
    const page = group.pages?.find(item => item.pageId === pageId)
    if (page) return { ...page, groupKey: group.key, groupLabel: group.label, ownership: group.ownership }
  }
  return null
}

export function listContentSlotPages() {
  return CONTENT_SLOT_GROUPS.flatMap(group =>
    (group.pages || []).map(page => ({
      ...page,
      groupKey: group.key,
      groupLabel: group.label,
      ownership: group.ownership
    }))
  )
}
