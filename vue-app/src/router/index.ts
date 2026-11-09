import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { allowPocLogin, appBase, isPocSandbox, normalAppBase } from '@/config/runtimeMode'
import { findPocLoginChoice } from '@/services/pocLoginChoices'
import { aiInspectRoutes } from '@/views/aiinspect/routes'
import { ACTIVITY_POINTS_MENU, canUseActivityPoints } from '@/services/activityPointsAccess'
import { showWorkbenchToast } from '@/services/toast'

// 布局
const AppLayout = () => import('@/components/AppLayout.vue')

// 页面组件（懒加载，首屏不打包进去）
const PortalHome      = () => import('@/views/PortalHomeView.vue')
const SalesWorkbench = () => import('@/views/sales/SalesWorkbenchView.vue')
const NativeWorkbenchPage = () => import('@/views/NativeWorkbenchPage.vue')
const WIPView           = () => import('@/views/WIPView.vue')  // 开发中占位页
const DashboardOverview = () => import('@/views/dashboard/DashboardOverviewView.vue')
const PipelineAnnotate = () => import('@/views/dashboard/PipelineAnnotateView.vue')
const PipelineQuality = () => import('@/views/dashboard/PipelineQualityView.vue')
const OpsTraffic = () => import('@/views/dashboard/OpsTrafficView.vue')
const OpsGmv = () => import('@/views/dashboard/OpsGmvView.vue')
const GeoOverview = () => import('@/views/geo/GeoOverviewView.vue')
const GeoSource = () => import('@/views/geo/GeoSourceView.vue')
const GeoIntent = () => import('@/views/geo/GeoIntentView.vue')
const GeoConversion = () => import('@/views/geo/GeoConversionView.vue')
const GeoKnowledge = () => import('@/views/geo/GeoKnowledgeView.vue')
const EmployeeOverview = () => import('@/views/employee/EmployeeOverviewView.vue')
const EmployeeCert = () => import('@/views/employee/EmployeeCertView.vue')
const LeadDashboard = () => import('@/views/lead/LeadDashboardView.vue')
const LeadPool = () => import('@/views/lead/LeadPoolView.vue')
const LeadGovernmentPool = () => import('@/views/lead/LeadGovernmentPoolView.vue')
const LeadScore = () => import('@/views/lead/LeadScoreView.vue')
const OrderPurchaseOrders = () => import('@/views/order/OrderPurchaseOrdersView.vue')
const AgreementOrder = () => import('@/views/order/AgreementOrderView.vue')
const ProductVideoConfig = () => import('@/views/advertising/ProductVideoConfigView.vue')
const ActivityPoints = () => import('@/views/points/ActivityPointsView.vue')
const ActivityPointsStatistics = () => import('@/views/points/ActivityPointsStatisticsView.vue')
const PointsLedger = () => import('@/views/points/PointsLedgerView.vue')
const PointsCatalog = () => import('@/views/points/PointsCatalogView.vue')
const PointsLegacyRules = () => import('@/views/points/PointsLegacyRulesView.vue')
const PointsAccounts = () => import('@/views/points/PointsAccountsView.vue')
const ReviewSummaryEvaluation = () => import('@/views/reviews/ReviewSummaryEvaluationView.vue')
const ReviewAssist = () => import('@/views/reviews/ReviewAssistView.vue')
const AgentSkills = () => import('@/views/agent/AgentSkillsView.vue')
const AgentSkillCreate = () => import('@/views/agent/AgentSkillCreateView.vue')
const AgentPermissions = () => import('@/views/agent/AgentPermissionsView.vue')
const UsageDashboard = () => import('@/views/agent/UsageDashboardView.vue')
const AdminCleanupEmailMock = () => import('@/views/agent/AdminCleanupEmailMockView.vue')
const AccountEnableRequest = () => import('@/views/AccountEnableRequestView.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/adfs-login',
    component: () => import('@/views/AdfsLoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/access-denied',
    component: () => import('@/views/AccessDeniedView.vue'),
    meta: { public: true }
  },
  {
    path: '/account-request/status',
    component: () => import('@/views/AccountRequestStatusView.vue'),
    meta: { public: true }
  },
  {
    path: '/account-enable-request',
    component: AccountEnableRequest,
    meta: { public: true }
  },
  {
    path: '/mail-approval/action',
    component: () => import('@/views/MailApprovalActionView.vue'),
    meta: { public: true }
  },
  {
    path: '/mail-approval/review',
    component: () => import('@/views/MailApprovalReviewView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: AppLayout,
    // 所有业务路由都需要登录（在 beforeEach 中统一拦截）
    children: [
      { path: '',              redirect: '/portal/home' },
      { path: 'portal/home',  component: PortalHome, meta: { pageId: 'portal.home' } },
      { path: 'sales/workbench', component: SalesWorkbench, meta: { pageId: 'sales.workbench' } },

      // 乐享运营
      { path: 'dashboard/overview',   component: DashboardOverview, meta: { pageId: 'dashboard.overview',  group: 'dashboard' } },
      { path: 'pipeline/annotate',    component: PipelineAnnotate, meta: { pageId: 'pipeline.annotate',   group: 'dashboard' } },
      { path: 'pipeline/quality',     component: PipelineQuality, meta: { pageId: 'pipeline.quality',    group: 'dashboard' } },
      { path: 'ops/traffic',          component: OpsTraffic, meta: { pageId: 'ops.traffic',         group: 'dashboard' } },
      { path: 'ops/gmv',              component: OpsGmv, meta: { pageId: 'ops.gmv',             group: 'dashboard' } },

      // GEO 看板
      { path: 'geo/overview',         component: GeoOverview, meta: { pageId: 'dashboard.geo',       group: 'geo' } },
      { path: 'geo/source',           component: GeoSource, meta: { pageId: 'dashboard.geoSource', group: 'geo' } },
      { path: 'geo/intent',           component: GeoIntent, meta: { pageId: 'dashboard.geoIntent', group: 'geo' } },
      { path: 'geo/conversion',       component: GeoConversion, meta: { pageId: 'dashboard.geoConversion', group: 'geo' } },
      { path: 'geo/knowledge',        component: GeoKnowledge, meta: { pageId: 'dashboard.geoKnowledge', group: 'geo' } },

      // 在职员工
      { path: 'employee/overview',    component: EmployeeOverview, meta: { pageId: 'employee.overview',   group: 'employee' } },
      { path: 'employee/cert',        component: EmployeeCert, meta: { pageId: 'employee.certification', group: 'employee' } },

      // 企业客户
      { path: 'lead/dashboard',       component: LeadDashboard, meta: { pageId: 'lead.dashboard', group: 'lead' } },
      { path: 'lead/pool',            component: LeadPool, meta: { pageId: 'lead.pool',      group: 'lead' } },
      { path: 'lead/government-pool', component: LeadGovernmentPool, meta: { pageId: 'lead.governmentPool', group: 'lead' } },
      { path: 'lead/score',           component: LeadScore, meta: { pageId: 'lead.score',     group: 'lead' } },

      // 订单管理
      { path: 'order/purchase-orders',     component: OrderPurchaseOrders, meta: { pageId: 'order.purchaseOrders', group: 'order' } },
      { path: 'order/purchase-orders/:id', component: OrderPurchaseOrders, meta: { pageId: 'order.purchaseOrders', group: 'order' } },
      { path: 'order/agreement',            component: AgreementOrder, meta: { pageId: 'order.agreement', group: 'order' } },

      // 营销中心 / 广告管理
      { path: 'advertising/product-videos', component: ProductVideoConfig, meta: { pageId: 'advertising.productVideo', group: 'advertising' } },

      ...aiInspectRoutes,

      // 促销中心 / 积分管理：保留现有积分页面直链与权限标识。
      { path: 'points/detail-export', component: PointsLedger, props: { mode: 'export' }, meta: { pageId: 'points.detailExport', group: 'promotion' } },
      { path: 'points/account-details', component: PointsLedger, props: { mode: 'account' }, meta: { pageId: 'points.accountDetails', group: 'promotion' } },
      { path: 'points/deduction-rules', component: PointsLegacyRules, props: { mode: 'deduction' }, meta: { pageId: 'points.deductionRules', group: 'promotion' } },
      { path: 'points/channels', component: PointsCatalog, props: { mode: 'channel' }, meta: { pageId: 'points.channels', group: 'promotion' } },
      { path: 'points/accounts', component: PointsAccounts, meta: { pageId: 'points.accounts', group: 'promotion' } },
      { path: 'points/currencies', component: PointsCatalog, props: { mode: 'currency' }, meta: { pageId: 'points.currencies', group: 'promotion' } },
      { path: 'points/rules', component: PointsLegacyRules, props: { mode: 'earning' }, meta: { pageId: 'points.rules', group: 'promotion' } },
      { path: 'points/activity', component: ActivityPoints, meta: { pageId: 'points.activity', group: 'promotion' } },
      { path: 'points/activity-details', component: ActivityPointsStatistics, meta: { pageId: 'points.activityDetails', group: 'promotion' } },

      // 评价管理 POC：沿用统一登录守卫，页面数据独立于现有业务模块。
      { path: 'reviews/summary', component: ReviewSummaryEvaluation, meta: { pageId: 'reviews.summary', group: 'reviews' } },
      { path: 'reviews/assist', component: ReviewAssist, meta: { pageId: 'reviews.assist', group: 'reviews' } },

      // Agent 入口（从用户菜单进入，不在侧栏显示）
      { path: 'agent/skills',         component: AgentSkills, meta: { pageId: 'agent.skills' } },
      { path: 'agent/scenario-package-create', component: AgentSkills, meta: { pageId: 'agent.scenarioPackageCreate' } },
      { path: 'agent/skill-create',   component: AgentSkillCreate, meta: { pageId: 'agent.skillCreate' } },
      { path: 'agent/permissions',    component: AgentPermissions, meta: { pageId: 'agent.permissions' } },
      { path: 'agent/usage-dashboard', component: UsageDashboard, meta: { pageId: 'agent.usageDashboard' } },
      { path: 'agent/permissions/admin-cleanup-email', component: AdminCleanupEmailMock, meta: { pageId: 'agent.permissions' } },

      // 封板项目中的隐藏/详情/二级流程页：不进左导航，但需要支持 switchPage 内部跳转
      { path: 'hidden/dashboard/query',      component: NativeWorkbenchPage, meta: { pageId: 'dashboard.query' } },
      { path: 'hidden/dashboard/behavior',   component: NativeWorkbenchPage, meta: { pageId: 'dashboard.behavior' } },
      { path: 'hidden/ops/query-biz',        component: NativeWorkbenchPage, meta: { pageId: 'ops.queryBiz' } },
      { path: 'hidden/ops/keywords',         component: NativeWorkbenchPage, meta: { pageId: 'ops.keywords' } },
      { path: 'hidden/pipeline/task',        component: NativeWorkbenchPage, meta: { pageId: 'pipeline.task' } },
      { path: 'hidden/pipeline/stats',       component: NativeWorkbenchPage, meta: { pageId: 'pipeline.stats' } },
      { path: 'hidden/pipeline/filter',      component: NativeWorkbenchPage, meta: { pageId: 'pipeline.filter' } },
      { path: 'hidden/pipeline/monitor',     component: NativeWorkbenchPage, meta: { pageId: 'pipeline.monitor' } },
      { path: 'hidden/employee/list',        component: NativeWorkbenchPage, meta: { pageId: 'employee.list' } },
      { path: 'hidden/employee/detail',      component: NativeWorkbenchPage, meta: { pageId: 'employee.detail' } },
      { path: 'hidden/employee/cert-detail', component: NativeWorkbenchPage, meta: { pageId: 'employee.cert-detail' } },
      { path: 'hidden/lead/detail',          component: NativeWorkbenchPage, meta: { pageId: 'lead.detail' } },
      { path: 'hidden/order/agreement-detail', component: NativeWorkbenchPage, meta: { pageId: 'order.agreement.detail' } },
      { path: 'hidden/report/overview',      component: NativeWorkbenchPage, meta: { pageId: 'report.overview' } },
      { path: 'hidden/report/quality',       component: NativeWorkbenchPage, meta: { pageId: 'report.quality' } },
      { path: 'hidden/report/detail',        component: NativeWorkbenchPage, meta: { pageId: 'report.detail' } },

      // 兜底
      { path: ':pathMatch(.*)*',      component: WIPView }
    ]
  }
]

// A separate route tree prevents demo identities from entering the real workbench.
const demoRoutes: RouteRecordRaw[] = [{
  path: '/',
  component: () => import('@/views/PocDemoLayout.vue'),
  children: [
    ...routes.filter(route => route.meta?.public),
    { path: '/agent/permissions', component: AgentPermissions, meta: { public: true } },
    { path: '/:pathMatch(.*)*', redirect: '/login' }
  ]
}]

const router = createRouter({
  history: createWebHistory(appBase),
  routes: isPocSandbox ? demoRoutes : routes
})

// 全局导航守卫：未登录跳转 /login
router.beforeEach(async (to) => {
  if (isPocSandbox) {
    if (!allowPocLogin) {
      window.location.replace(normalAppBase + 'login')
      return false
    }
    if ((to.path === '/login' || to.path === '/adfs-login')
      && to.query.mode !== 'scenarios' && !findPocLoginChoice(to.query.pocAccount)) return '/agent/permissions'
    return true
  }
  const appStore = useAppStore()

  if (to.path === '/login' || to.path === '/adfs-login') {
    if (appStore.user) return '/portal/home'
    return true
  }

  if (to.meta.public) return true

  if (!appStore.user) {
    // 尝试静默恢复会话（对应原页面刷新时的自动登录恢复）
    try {
      await appStore.loadUserContext()
    } catch {
      appStore.user = null
    }
    if (!appStore.user) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }
  }
  if (Object.prototype.hasOwnProperty.call(ACTIVITY_POINTS_MENU.children, String(to.meta.pageId)) && !canUseActivityPoints(appStore.user, appStore.role, appStore.permissions)) {
    showWorkbenchToast('当前账号没有积分查看权限，请联系管理员开通。')
    return { path: '/portal/home' }
  }
  return true
})

export default router
