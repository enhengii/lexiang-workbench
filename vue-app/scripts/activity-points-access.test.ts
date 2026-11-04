import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import type { RouteRecordRaw } from 'vue-router'
import {
  ACTIVITY_POINTS_MENU,
  canUseActivityPoints,
  isActivityPointsDemoPreview,
  withActivityPointsMenu
} from '../src/services/activityPointsAccess.ts'

test('积分菜单与操作拒绝未登录、普通无权限账号', () => {
  assert.equal(canUseActivityPoints(null, '平台管理员', ['*']), false)
  assert.equal(canUseActivityPoints('reader', '工作台用户', []), false)
  assert.equal(withActivityPointsMenu({}, 'reader', '工作台用户', []).promotion, undefined)
})
test('管理员具有积分权限，业务查看权限不自动授予修改或导出', () => {
  assert.equal(canUseActivityPoints('admin', '平台管理员', ['*'], 'configure'), true)
  assert.equal(canUseActivityPoints('reader', '工作台用户', ['points.activity.view']), true)
  for (const action of ['configure', 'extend', 'export', 'settle'] as const) {
    assert.equal(
      canUseActivityPoints('reader', '工作台用户', ['points.activity.view'], action),
      false
    )
  }
  assert.equal(
    canUseActivityPoints(
      'operator',
      '运营',
      ['points.activity.view', 'points.activity.extend'],
      'extend'
    ),
    true
  )
})
test('积分菜单添加不改变既有菜单和权限，只有操作权限不能绕过查看权限', () => {
  const old = { order: { icon: '', label: '订单管理', children: {} } }
  const next = withActivityPointsMenu(old, 'admin', '平台管理员', ['*'])
  assert.deepEqual(next.order, old.order)
  assert.equal(next.promotion.children['points.activity'].path, '/points/activity')
  assert.equal(next.promotion.children['points.activityDetails']?.path, '/points/activity-details')
  assert.equal(next.promotion.children['points.activityDetails']?.section, '积分管理')
  assert.equal(Object.hasOwn(next, 'points'), false)
  assert.equal(Object.hasOwn(old, 'promotion'), false)
  assert.equal(
    canUseActivityPoints('operator', '运营', ['points.activity.configure'], 'configure'),
    false
  )
})

test('积分入口合并和权限移除保留其他促销菜单且不修改原菜单', () => {
  const otherPage = { label: '优惠券管理', path: '/promotion/coupons' }
  const originalRules = { label: '积分规则', path: '/promotion/points/rules', section: '积分管理' }
  const old = {
    promotion: {
      icon: 'existing-icon',
      label: '促销中心',
      children: {
        'promotion.coupons': otherPage,
        'promotion.existingRule': originalRules,
        'points.activity': { label: '活动积分配置', path: '/points/activity', section: '积分管理' },
        'points.activityDetails': { label: '活动积分明细', path: '/points/activity-details', section: '积分管理' }
      }
    }
  }
  const before = structuredClone(old)
  const granted = withActivityPointsMenu(old, 'admin', '平台管理员', ['*'])
  assert.deepEqual(granted.promotion.children['promotion.coupons'], otherPage)
  assert.deepEqual(granted.promotion.children['promotion.existingRule'], originalRules)
  assert.equal(granted.promotion.icon, 'existing-icon')
  assert.equal(granted.promotion.children['points.activity'].path, '/points/activity')
  assert.equal(granted.promotion.children['points.activityDetails'].path, '/points/activity-details')
  const denied = withActivityPointsMenu(old, 'reader', '工作台用户', [])
  assert.deepEqual(denied.promotion.children, { 'promotion.coupons': otherPage, 'promotion.existingRule': originalRules })
  assert.deepEqual(old, before)
  const pointsOnly = withActivityPointsMenu({}, 'admin', '平台管理员', ['*'])
  assert.deepEqual(withActivityPointsMenu(pointsOnly, 'reader', '工作台用户', []), {})
})

test('new 预览已登录账号可体验纯模拟流程，但不授予正式权限', () => {
  const permissions = ['portal.home']
  for (const action of ['view', 'configure', 'extend', 'export', 'settle'] as const) {
    assert.equal(canUseActivityPoints('pm', '工作台用户', permissions, action, true), true)
    assert.equal(canUseActivityPoints('pm', '工作台用户', permissions, action, false), false)
    assert.equal(canUseActivityPoints(null, null, permissions, action, true), false)
  }
  assert.equal(
    withActivityPointsMenu({}, 'pm', '工作台用户', permissions, true).promotion.children[
      'points.activity'
    ].path,
    '/points/activity'
  )
  assert.deepEqual(permissions, ['portal.home'])
  assert.equal(
    withActivityPointsMenu({}, 'pm', '工作台用户', permissions, true).promotion.children[
      'points.activityDetails'
    ]?.path,
    '/points/activity-details'
  )
})

type RouteTarget = { path: string; fullPath: string; meta: { pageId?: string; public?: boolean } }
type RouteGuard = (to: RouteTarget) => Promise<unknown>

// Execute the real route definitions and guard without mounting browser history or lazy pages.
function activityRouteHarness(user: string | null, permissions: string[]) {
  let guard: RouteGuard | undefined
  let routes: RouteRecordRaw[] = []
  const store = { user, role: '工作台用户', permissions, loadUserContext: async () => undefined }
  const dependencies: Record<string, unknown> = {
    'vue-router': {
      createWebHistory: () => ({}),
      createRouter: (options: { routes: RouteRecordRaw[] }) => {
        routes = options.routes
        return { beforeEach: (handler: RouteGuard) => { guard = handler } }
      }
    },
    '@/stores/app': { useAppStore: () => store },
    '@/config/runtimeMode': {
      AUTH_MODE: 'server',
      allowPreviewAuth: false,
      allowPocLogin: false,
      isPocSandbox: false,
      appBase: '/admin-vue/',
      normalAppBase: '/admin-vue/'
    },
    '@/services/pocLoginChoices': { findPocLoginChoice: () => null },
    '@/views/aiinspect/routes': { aiInspectRoutes: [] },
    '@/services/activityPointsAccess': { canUseActivityPoints, ACTIVITY_POINTS_MENU },
    '@/services/toast': { showWorkbenchToast: () => undefined }
  }
  const source = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
    .replace('import.meta.env.BASE_URL', "'/admin-vue/'")
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  })
  runInNewContext(outputText, {
    exports: {},
    require: (name: string) => {
      if (!Object.hasOwn(dependencies, name)) throw new Error(`Unexpected router dependency: ${name}`)
      return dependencies[name]
    }
  })
  assert.ok(guard, 'router must register an access guard')
  return { guard, routes: routes.find((route) => route.path === '/')?.children || [] }
}

test('九个积分页面直达与菜单共用查看权限，导出权限不能代替查看权限', async () => {
  for (const permissions of [[], ['points.activity.export'], ['points.activity.view']]) {
    const { guard, routes } = activityRouteHarness('reader', permissions)
    const menu = withActivityPointsMenu({}, 'reader', '工作台用户', permissions, false)
    for (const [path, pageId] of [
      ['points/detail-export', 'points.detailExport'],
      ['points/account-details', 'points.accountDetails'],
      ['points/deduction-rules', 'points.deductionRules'],
      ['points/channels', 'points.channels'],
      ['points/accounts', 'points.accounts'],
      ['points/currencies', 'points.currencies'],
      ['points/rules', 'points.rules'],
      ['points/activity', 'points.activity'],
      ['points/activity-details', 'points.activityDetails']
    ]) {
      const route = routes.find((item) => item.path === path)
      assert.equal(route?.meta?.pageId, pageId, `${path} should register its own page`)
      const result = await guard({ path: `/${path}`, fullPath: `/${path}`, meta: { pageId } })
      const allowed = permissions.includes('points.activity.view')
      assert.equal(Boolean(menu.promotion?.children[pageId]), allowed)
      assert.equal(result === true, allowed, `${pageId} must enforce the same access as its menu`)
      if (!allowed) assert.equal((result as { path: string }).path, '/portal/home')
    }
  }
})

test('九个积分页面未登录直达保留登录后的目标地址', async () => {
  const { guard } = activityRouteHarness(null, ['*'])
  assert.equal(withActivityPointsMenu({}, null, '平台管理员', ['*'], true).promotion, undefined)
  for (const [path, pageId] of [
    ['/points/detail-export', 'points.detailExport'],
    ['/points/account-details', 'points.accountDetails'],
    ['/points/deduction-rules', 'points.deductionRules'],
    ['/points/channels', 'points.channels'],
    ['/points/accounts', 'points.accounts'],
    ['/points/currencies', 'points.currencies'],
    ['/points/rules', 'points.rules'],
    ['/points/activity', 'points.activity'],
    ['/points/activity-details', 'points.activityDetails']
  ]) {
    const result = await guard({ path, fullPath: path, meta: { pageId } }) as { path: string; query: { redirect: string } }
    assert.equal(result.path, '/login')
    assert.equal(result.query.redirect, path)
  }
})

test('演示访问仅限明确的 new 主机，不延伸到正式站或相似域名', () => {
  for (const [host, expected] of [
    ['new.leaibot.cn', true],
    ['leaibot.cn', false],
    ['new.leaibot.cn.example.com', false],
    ['localhost', false]
  ] as const) {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { hostname: host } }
    })
    try {
      assert.equal(isActivityPointsDemoPreview(), expected)
    } finally {
      Reflect.deleteProperty(globalThis, 'window')
    }
  }
  assert.equal(isActivityPointsDemoPreview(), false)
})
