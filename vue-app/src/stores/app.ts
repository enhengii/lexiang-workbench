/**
 * 全局应用状态 —— 由封板工作台 STATE 迁移到 Pinia 的壳层状态与核心函数
 *
 * STATE 字段对应：
 *   STATE.user             → user (ref)
 *   STATE.role             → role (ref)
 *   STATE.permissions      → permissions (ref)
 *   STATE.visibleMenus     → visibleMenus (ref)
 *   STATE.currentPage      → 由 vue-router route.meta.pageId 接管（不再存 store）
 *   STATE.staticTabs       → staticTabs (ref)
 *   STATE.activeStaticTabId→ activeStaticTabId (ref)
 *   STATE.tempTabs         → tempTabs (ref)
 *   STATE.activeTempTabId  → activeTempTabId (ref)
 *   STATE.aiOpen           → useAIStore().open
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { STORAGE_KEYS, clearBooleanStorage, readBooleanStorage, writeBooleanStorage } from '@/constants/storageKeys'
import { syncThemeMode } from '@/composables/useThemeMode'
import { showWorkbenchToast } from '@/services/toast'
import { isPocSandbox, permissionLabEnabled } from '@/config/runtimeMode'
import { labHeaders } from '@/services/permissionLab'
import { AI_INSPECT_MENU, withAiInspectMenu } from '@/services/aiInspectAccess'
import { ACTIVITY_POINTS_MENU, withActivityPointsMenu } from '@/services/activityPointsAccess'

type MenuGroupKey = 'dashboard' | 'geo' | 'employee' | 'lead' | 'order' | 'advertising' | 'aiinspect' | 'promotion' | 'reviews'
export type PageId = string

interface MenuItem {
  label: string
  path: string
  section?: string
}

interface MenuGroup {
  icon: string
  label: string
  children: Record<PageId, MenuItem>
}

export interface StaticTab {
  id: PageId
  title: string
  groupLabel: string
}

export interface SkillApplicationMetric {
  label: string
  value: string
  note: string
  tone?: 'blue' | 'green' | 'orange' | 'neutral'
}

export interface SkillApplicationInsight {
  title: string
  evidence: string[]
  action?: boolean
}

export interface SkillApplicationBreakdown {
  label: string
  value: number
  share: string
  note?: string
}

export interface SkillApplicationReportData {
  skillName: string
  skillCnName: string
  prompt: string
  parsedTimeText: string
  dateStart: string
  dateEnd: string
  dayCount: number
  generatedAt: string
  truth: {
    rawRecords: number
    duplicateRecords: number
    duplicateUsers: number
    uniqueUsers: number
  }
  metrics: SkillApplicationMetric[]
  insights: SkillApplicationInsight[]
  dailyTrend: Array<{ label: string; date: string; value: number }>
  timeBuckets: SkillApplicationBreakdown[]
  methods: SkillApplicationBreakdown[]
  industries: SkillApplicationBreakdown[]
  roles: SkillApplicationBreakdown[]
  products: SkillApplicationBreakdown[]
  actions: string[]
  sources: string[]
  notes: string[]
}

export interface TempTab {
  id: string
  conversationId?: string
  messageId?: string
  title: string
  sourcePage: PageId
  sourcePageLabel: string
  groupLabel: string
  content: string
  summary: string
  chips: string[]
  externalUrl: string
  previewHtml: string
  reportData?: SkillApplicationReportData
  createdAt: string
  saved: boolean
}

type TempTabPayload = Partial<TempTab> & { id?: string }

// ===== MENU_TREE —— 当前第一版封板项目可见菜单 =====
const menuIcon = (paths: string) =>
  `<svg class="menu-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">${paths}</svg>`

export const MENU_TREE: Record<MenuGroupKey, MenuGroup> = {
  dashboard: {
    icon: menuIcon('<rect x="3" y="4" width="14" height="12" rx="2.2"/><path d="M6.2 12.6 8.7 10l2 1.7 3.2-4.2"/><path d="M6 16.8h8"/>'),
    label: '乐享运营',
    children: {
      'dashboard.overview': { label: '运营总览',  path: '/dashboard/overview' },
      'pipeline.annotate':  { label: 'Query 分析', path: '/pipeline/annotate' },
      'pipeline.quality':   { label: '质量分析',  path: '/pipeline/quality' },
      'ops.traffic':        { label: '流量分析',  path: '/ops/traffic' },
      'ops.gmv':            { label: 'GMV 分析',  path: '/ops/gmv' }
    }
  },
  geo: {
    icon: menuIcon('<rect x="3.2" y="4" width="13.6" height="12" rx="2.2"/><path d="M6 7.2h3.4M6 10h2.2M6 12.8h3.4"/><path d="M12.4 7.2h1.6M12.4 10h1.6M12.4 12.8h1.6"/>'),
    label: 'GEO 看板',
    children: {
      'dashboard.geo':           { label: '整体数据概览',   path: '/geo/overview' },
      'dashboard.geoSource':     { label: '各平台信源分布', path: '/geo/source' },
      'dashboard.geoIntent':     { label: '各平台意图分布', path: '/geo/intent' },
      'dashboard.geoConversion': { label: 'GEO 转化看板',   path: '/geo/conversion' },
      'dashboard.geoKnowledge':  { label: '手工上传知识',   path: '/geo/knowledge' }
    }
  },
  employee: {
    icon: menuIcon('<path d="M7.4 8.4a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4Z"/><path d="M2.8 16.4c.4-2.6 2.1-4.1 4.6-4.1 2.4 0 4.1 1.5 4.5 4.1"/><path d="M13.1 8.1a2.2 2.2 0 1 0 0-4.4"/><path d="M13.6 12.2c1.8.3 3 1.7 3.3 3.8"/>'),
    label: '在职员工管理',
    children: {
      'employee.overview':      { label: '职场员工概览', path: '/employee/overview' },
      'employee.certification': { label: '职场员工审核', path: '/employee/cert' }
    }
  },
  lead: {
    icon: menuIcon('<path d="M4 5.2h8.2M4 9.8h5.8M4 14.4h5"/><path d="M12.2 13.6h4.6M14.8 11l2.6 2.6-2.6 2.6"/>'),
    label: '企业客户管理',
    children: {
      'lead.dashboard': { label: '线索看板', path: '/lead/dashboard' },
      'lead.pool':      { label: '线索池',   path: '/lead/pool' },
      'lead.governmentPool': { label: '线索池-政企', path: '/lead/government-pool' },
      'lead.score':     { label: '打分模型', path: '/lead/score' }
    }
  },
  order: {
    icon: menuIcon('<rect x="3.4" y="4" width="13.2" height="12.4" rx="2.2"/><path d="M6.4 7.4h7.2M6.4 10h7.2M6.4 12.6h4.4"/>'),
    label: '订单管理',
    children: {
      'order.purchaseOrders': { label: '协议采购单管理', path: '/order/purchase-orders' },
      'order.agreement': { label: '协议采购订单', path: '/order/agreement' }
    }
  },
  advertising: {
    icon: menuIcon('<rect x="3.2" y="4" width="13.6" height="12" rx="2.2"/><path d="M6 12.8 8.5 10l2.1 1.8 3.3-4.3"/>'),
    label: '广告管理',
    children: {
      'advertising.productVideo': { label: '商品视频管理', path: '/advertising/product-videos' }
    }
  },
  aiinspect: AI_INSPECT_MENU,
  promotion: ACTIVITY_POINTS_MENU,
  reviews: {
    icon: menuIcon('<rect x="3.2" y="3.5" width="13.6" height="13" rx="2.2"/><path d="M6 7h8M6 10h5M6 13h3"/><path d="m12 12 1.3 1.3 2.2-2.6"/>'),
    label: '评价管理',
    children: {
      'reviews.summary': { label: '评价总结', path: '/reviews/summary' },
      'reviews.assist': { label: '辅助生成', path: '/reviews/assist' }
    }
  }
}

// pageId → path 快速查表
export function pageIdToPath(pageId: PageId) {
  const specials = {
    'sales.workbench':   '/sales/workbench',
    'portal.home':       '/portal/home',
    'agent.skills':      '/agent/skills',
    'agent.skillCreate': '/agent/skill-create',
    'agent.scenarioPackageCreate': '/agent/scenario-package-create',
    'agent.permissions': '/agent/permissions',
    'agent.usageDashboard': '/agent/usage-dashboard',
    'dashboard.query': '/hidden/dashboard/query',
    'dashboard.behavior': '/hidden/dashboard/behavior',
    'ops.queryBiz': '/hidden/ops/query-biz',
    'ops.keywords': '/hidden/ops/keywords',
    'pipeline.task': '/hidden/pipeline/task',
    'pipeline.stats': '/hidden/pipeline/stats',
    'pipeline.filter': '/hidden/pipeline/filter',
    'pipeline.monitor': '/hidden/pipeline/monitor',
    'employee.list': '/hidden/employee/list',
    'employee.detail': '/hidden/employee/detail',
    'employee.cert-detail': '/hidden/employee/cert-detail',
    'lead.detail': '/hidden/lead/detail',
    'order.agreement.detail': '/hidden/order/agreement-detail',
    'report.overview': '/hidden/report/overview',
    'report.quality': '/hidden/report/quality',
    'report.detail': '/hidden/report/detail'
  }
  if (specials[pageId as keyof typeof specials]) return specials[pageId as keyof typeof specials]
  for (const g of Object.values(MENU_TREE)) {
    if (g.children?.[pageId]) return g.children[pageId].path
  }
  return null
}

// 对应原 getPageLabel()
export function getPageLabel(pageId: PageId) {
  const map = {
    'sales.workbench': '销售工作台',
    'agent.skills': 'Skill Hub',
    'agent.skillCreate': 'Skill 创建',
    'agent.scenarioPackageCreate': '场景技能包创建',
    'agent.permissions': '权限管理',
    'agent.usageDashboard': '使用数据看板',
    'portal.home': '联想门户工作台',
    'dashboard.query': 'Query 明细',
    'dashboard.behavior': '用户行为',
    'ops.queryBiz': 'Query 业务归因',
    'ops.keywords': '高频关键词',
    'pipeline.task': '标注任务',
    'pipeline.stats': '标注统计',
    'pipeline.filter': '数据过滤',
    'pipeline.monitor': '任务监控',
    'employee.list': '员工列表',
    'employee.detail': '员工详情',
    'employee.cert-detail': '认证详情',
    'lead.detail': '线索详情',
    'order.agreement.detail': '协议采购订单详情',
    'report.overview': '报告总览',
    'report.quality': '质量报告',
    'report.detail': '报告详情'
  }
  if (map[pageId as keyof typeof map]) return map[pageId as keyof typeof map]
  for (const g of Object.values(MENU_TREE)) {
    if (g.children?.[pageId]) return g.children[pageId].label
  }
  return pageId.split('.')[1] || ''
}

// 对应原 workspaceStaticGroupLabel()
export function getGroupLabel(pageId: PageId) {
  const groupLabelMap: Record<string, string> = { agent: 'AI 助手', portal: '首页', sales: '销售工作台' }
  for (const g of Object.values(MENU_TREE)) {
    if (g.children?.[pageId]) return [g.label, g.children[pageId].section].filter(Boolean).join(' / ')
  }
  return groupLabelMap[pageId.split('.')[0]] || pageId.split('.')[0]
}

// 对应原 findPageGroup()
export function findPageGroup(pageId: PageId) {
  for (const g of Object.values(MENU_TREE)) {
    if (g.children?.[pageId]) return g
  }
  return null
}

const WORKSPACE_STATIC_TAB_LIMIT = 10
const WORKSPACE_TEMP_TAB_LIMIT   = 10
const WORKSPACE_SAVED_TABS_KEY   = STORAGE_KEYS.workspaceSavedTabs
const FORCE_LIGHT_THEME_RELEASE = true

export const useAppStore = defineStore('app', () => {
  // ---- 用户状态（对应 STATE.user / role / permissions / visibleMenus）----
  const user        = ref<string | null>(null)
  const role        = ref<string | null>(null)
  const permissions = ref<string[]>([])
  const visibleMenus = ref<MenuGroupKey[]>([])

  // ---- 页签（对应 STATE.staticTabs / activeStaticTabId / tempTabs / activeTempTabId）----
  const staticTabs      = ref<StaticTab[]>([])   // [{ id, title, groupLabel }]
  const activeStaticTabId = ref('portal.home')
  const tempTabs        = ref<TempTab[]>([])   // AI 报告临时页签
  const activeTempTabId = ref<string | null>(null)

  // ---- 侧栏折叠状态（从 localStorage 读取，对应原 restoreSidebarState）----
  const sidebarCollapseLocked = ref(false)
  const sidebarCollapsed = ref(readBooleanStorage(
    STORAGE_KEYS.sidebarCollapsed,
    STORAGE_KEYS.legacySidebarCollapsed
  ))

  // ---- 深色模式 ----
  const darkMode = ref(FORCE_LIGHT_THEME_RELEASE
    ? false
    : readBooleanStorage(STORAGE_KEYS.darkMode, STORAGE_KEYS.legacyDarkMode)
  )

  // ---- 用户名首字母 ----
  const userInitial = computed(() => (user.value || 'A')[0].toUpperCase())

  // ---- 过滤后的菜单树（对应原 STATE.visibleMenus 过滤 MENU_TREE）----
  const filteredMenuTree = computed(() => {
    const existingMenus = withActivityPointsMenu(withAiInspectMenu(Object.fromEntries(
      Object.entries(MENU_TREE).filter(([key]) => key !== 'reviews' && visibleMenus.value.includes(key as MenuGroupKey))
    ), user.value, role.value, permissions.value), user.value, role.value, permissions.value)
    return visibleMenus.value.includes('reviews')
      ? { ...existingMenus, reviews: MENU_TREE.reviews }
      : existingMenus
  })

  // ===== 对应原 loadUserContext() =====
  async function loadUserContext() {
    // The isolated demo never reads a real session or its menu permissions.
    if (isPocSandbox) return
    // 先确认登录状态
    try {
      const meRes = await fetch('/api/admin/me')
      if (meRes.ok) {
        const meData = await meRes.json()
        user.value = meData.admin?.username || (permissionLabEnabled ? meData.username : null) || user.value || null
      } else {
        // 未登录 → 清空用户，让 router guard 跳转 /login
        user.value = null
        return
      }
    } catch {
      user.value = null
      return
    }

    // 拉取菜单权限
    try {
      const res = await fetch('/api/harness/menu')
      if (res.ok) {
        const data = await res.json()
        let menus: string[] = data.menus || []
        const perms: string[] = data.permissions || []
        permissions.value = perms

        // 兼容：dashboard 权限自动补 geo
        if (menus.includes('dashboard') && !menus.includes('geo')) menus.push('geo')
        // 员工管理等默认可见
        ;(permissionLabEnabled ? [] : ['employee', 'lead', 'order', 'advertising', 'reviews']).forEach(k => {
          if (!menus.includes(k)) menus.push(k)
        })
        // 只保留 MENU_TREE 中存在的 key
        visibleMenus.value = menus.filter((k): k is MenuGroupKey => k in MENU_TREE)

        // 角色映射
        if (perms.includes('*'))                              role.value = '平台管理员'
        else if (perms.some(p => p.startsWith('ai:')))       role.value = 'AI 运维'
        else if (perms.some(p => p.startsWith('ecommerce:'))) role.value = '运营'
        else                                                  role.value = '工作台用户'
      } else {
        _fallbackMenus()
      }
    } catch {
      _fallbackMenus()
    }
  }

  function _fallbackMenus() {
    if (permissionLabEnabled) {
      user.value = null
      visibleMenus.value = []
      permissions.value = []
      role.value = null
      return
    }
    visibleMenus.value = Object.keys(MENU_TREE) as MenuGroupKey[]
    permissions.value  = ['*']
    role.value         = '平台管理员'
  }

  function usePreviewSession(username = 'demo') {
    user.value = username
    _fallbackMenus()
  }

  // ===== 登出（对应原 doLogout）=====
  async function logout() {
    if (!isPocSandbox) {
      try { await fetch('/api/admin/logout', { method: 'POST', headers: { 'Content-Type': 'application/json', ...labHeaders() }, body: '{}' }) } catch {}
      localStorage.removeItem('preview_user')
    }
    user.value        = null
    role.value        = null
    permissions.value = []
    visibleMenus.value = []
    staticTabs.value  = []
    tempTabs.value    = []
  }

  // ===== 侧栏折叠（对应 toggleSidebarCollapse / restoreSidebarState）=====
  function toggleSidebar() {
    setSidebarCollapsed(!sidebarCollapsed.value, { persist: true })
  }
  function setSidebarCollapsed(val: boolean, options: { persist?: boolean } = {}) {
    const { persist = true } = options
    sidebarCollapsed.value = !!val
    if (persist) writeBooleanStorage(STORAGE_KEYS.sidebarCollapsed, val)
  }

  // ===== 深色模式 =====
  function applyDarkMode(value = darkMode.value) {
    const nextMode = FORCE_LIGHT_THEME_RELEASE ? false : !!value
    darkMode.value = nextMode
    if (FORCE_LIGHT_THEME_RELEASE) {
      clearBooleanStorage(STORAGE_KEYS.darkMode, STORAGE_KEYS.legacyDarkMode)
    } else {
      writeBooleanStorage(STORAGE_KEYS.darkMode, nextMode)
    }
    syncThemeMode(nextMode)
  }
  function toggleDarkMode() {
    if (FORCE_LIGHT_THEME_RELEASE) {
      applyDarkMode(false)
      return
    }
    applyDarkMode(!darkMode.value)
  }

  // ===== 静态页签（对应 workspaceEnsureStaticTab / workspaceCloseStaticTab）=====
  function ensureStaticTab(pageId: PageId) {
    if (!pageId) return
    const title      = getPageLabel(pageId) || '当前页面'
    const groupLabel = getGroupLabel(pageId)
    const existing   = staticTabs.value.find(t => t.id === pageId)
    if (existing) {
      existing.title      = title
      existing.groupLabel = groupLabel
      return
    }
    staticTabs.value.push({ id: pageId, title, groupLabel })
    // 超限时移除最早的非活跃 tab
    while (staticTabs.value.length > WORKSPACE_STATIC_TAB_LIMIT) {
      const idx = staticTabs.value.findIndex(t => t.id !== activeStaticTabId.value)
      if (idx === -1) break
      const removed = staticTabs.value[idx]
      staticTabs.value.splice(idx, 1)
      notify(`静态页签最多打开 ${WORKSPACE_STATIC_TAB_LIMIT} 个，已自动关闭「${removed?.title || '旧页签'}」`)
    }
  }

  function closeStaticTab(pageId: PageId) {
    const idx = staticTabs.value.findIndex(t => t.id === pageId)
    if (idx === -1) return null
    const wasActive = activeStaticTabId.value === pageId
    staticTabs.value.splice(idx, 1)
    // 如果关的是当前活跃页签，切到相邻
    if (wasActive) {
      return staticTabs.value[Math.max(0, idx - 1)]?.id || staticTabs.value[0]?.id || 'portal.home'
    }
    return null
  }

  function setActiveStaticTab(pageId: PageId) {
    activeStaticTabId.value = pageId
    ensureStaticTab(pageId)
  }

  // ===== 动态报告页签（对应 workspaceOpenTempTab / workspaceCloseTempTab）=====
  function openTempTab(payload: TempTabPayload) {
    if (!payload) return null
    const id  = payload.id || `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const sourcePageLabel = payload.sourcePageLabel || ''
    const title = sourcePageLabel === '运营总览' && /风控|策略命中|DPL|限购/i.test(payload.title || '')
      ? '运营总览 · 经营指标解读'
      : (payload.title || '数据解读报告')
    const chips = sourcePageLabel === '运营总览'
      ? (payload.chips || []).filter(chip => !/风控|策略命中|DPL|限购/i.test(chip))
      : (payload.chips || [])
    const tab = {
      id,
      conversationId: payload.conversationId || '',
      messageId:      payload.messageId || '',
      title:          title.slice(0, 42),
      sourcePage:     payload.sourcePage     || '',
      sourcePageLabel,
      groupLabel:     payload.groupLabel     || 'AI 报告',
      content:        payload.content        || '',
      summary:        payload.summary        || '',
      chips,
      externalUrl:    payload.externalUrl    || '',
      previewHtml:    payload.previewHtml    || '',
      reportData:     payload.reportData,
      createdAt:      payload.createdAt      || new Date().toISOString(),
      saved:          !!payload.saved
    }
    const existingIdx = tempTabs.value.findIndex(t => t.id === id)
    if (existingIdx >= 0) tempTabs.value.splice(existingIdx, 1, tab)
    else tempTabs.value.push(tab)
    activeTempTabId.value = id
    // 超限
    while (tempTabs.value.length > WORKSPACE_TEMP_TAB_LIMIT) {
      const idx = tempTabs.value.findIndex(t => t.id !== id)
      if (idx === -1) break
      const removed = tempTabs.value[idx]
      tempTabs.value.splice(idx, 1)
      notify(`动态页签最多打开 ${WORKSPACE_TEMP_TAB_LIMIT} 个，已自动关闭「${removed?.title || '旧报告'}」`)
    }
    return tab
  }

  function restoreSavedTempTabs() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(WORKSPACE_SAVED_TABS_KEY)
          || localStorage.getItem(STORAGE_KEYS.legacyWorkspaceSavedTabs)
          || '[]'
      )
      if (!Array.isArray(saved) || !saved.length) return
      saved.slice(0, WORKSPACE_TEMP_TAB_LIMIT).reverse().forEach(item => {
        openTempTab({ ...item, saved: true })
      })
      activeTempTabId.value = null
    } catch {}
  }

  function saveTempTab(id: string) {
    const tab = tempTabs.value.find(item => item.id === id)
    if (!tab) return null
    tab.saved = true
    try {
      const saved: TempTab[] = JSON.parse(localStorage.getItem(WORKSPACE_SAVED_TABS_KEY) || '[]')
      const next = [tab, ...saved.filter(item => item.id !== id)].slice(0, 30)
      localStorage.setItem(WORKSPACE_SAVED_TABS_KEY, JSON.stringify(next))
    } catch {}
    return tab
  }

  function copyTempTabUrl(id: string) {
    const tab = tempTabs.value.find(item => item.id === id)
    if (!tab) return
    const url = tab.externalUrl || `${location.origin}${location.pathname}#report=${encodeURIComponent(id)}`
    navigator.clipboard?.writeText(url)
      .then(() => notify('链接已复制'))
      .catch(() => notify('当前浏览器不支持自动复制'))
  }

  function closeTempTab(id: string) {
    const closingTab = tempTabs.value.find(t => t.id === id)
    const wasActive = activeTempTabId.value === id
    tempTabs.value  = tempTabs.value.filter(t => t.id !== id)
    if (wasActive) {
      const nextTab = [...tempTabs.value].reverse().find(tab =>
        tab.conversationId === closingTab?.conversationId
      )
      activeTempTabId.value = nextTab?.id || null
    }
    return wasActive
  }

  function setActiveTempTab(id: string) {
    activeTempTabId.value = id
  }

  // ===== toast 提示（对应 workspaceNotify）=====
  function notify(message: string) {
    showWorkbenchToast(message)
  }

  return {
    // state
    user, role, permissions, visibleMenus,
    staticTabs, activeStaticTabId, tempTabs, activeTempTabId,
    sidebarCollapsed, sidebarCollapseLocked, darkMode,
    // computed
    userInitial, filteredMenuTree,
    // actions
    loadUserContext, logout,
    usePreviewSession,
    toggleSidebar, setSidebarCollapsed,
    toggleDarkMode, applyDarkMode,
    ensureStaticTab, closeStaticTab, setActiveStaticTab,
    openTempTab, closeTempTab, setActiveTempTab,
    restoreSavedTempTabs, saveTempTab, copyTempTabUrl,
    notify
  }
})
