import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { stripTypeScriptTypes } from 'node:module'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = fileURLToPath(new URL('../../', import.meta.url))
const sourceRef = process.env.LOGIN_ENTRY_SOURCE_REF
if (sourceRef) assert.match(sourceRef, /^[a-f0-9]{40}$/, 'An immutable full source commit is required')
const readSource = path => sourceRef
  ? execFileSync('git', ['-C', root, 'show', `${sourceRef}:vue-app/${path}`], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
  : readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const executable = text => stripTypeScriptTypes(text.replace(/^import .*\n/gm, '').replace(/^export default .*$/gm, '').replace(/^export /gm, ''))
const isolation = executable(readSource('src/services/pocIsolation.ts'))
const optionalSessionModule = (() => {
  try { return [['src/services/pocWorkbenchSession.ts', executable(readSource('src/services/pocWorkbenchSession.ts'))]] }
  catch (error) { if (sourceRef && error.status === 128) return []; throw error }
})()
const plain = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
const pureContext = vm.createContext({})
vm.runInContext(isolation, pureContext)
const { POC_STORAGE_PREFIX, pocLoginEnabled, runtimePaths, scopedDemoStorage } = vm.runInContext('({ POC_STORAGE_PREFIX, pocLoginEnabled, runtimePaths, scopedDemoStorage })', pureContext)
const actualModules = [
  ['src/services/pocIsolation.ts', isolation],
  ['src/services/pocStorage.ts', executable(readSource('src/services/pocStorage.ts'))],
  ...optionalSessionModule,
  ...['src/constants/storageKeys.ts', 'src/services/permissionLab.ts', 'src/services/aiInspectAccess.ts',
    'src/services/activityPointsAccess.ts', 'src/services/pocExternalLogin.ts', 'src/services/pocLoginChoices.ts',
    'src/stores/app.ts', 'src/router/index.ts'].map(path => [path, executable(readSource(path))])
]

// Execute the real Pinia store and router guard. Vue/Pinia/browser/network are
// boundaries; routes, menu filters, session resolver and restore logic are real.
function mount({ pathname = '/admin-vue/poc/workbench/portal/home', enabled = true,
  marker = false, session = new Map(), local = new Map(), serverUser = null } = {}) {
  const paths = runtimePaths('/admin-vue/', pathname)
  const requests = [], fullNavigations = [], notices = []
  let guard, configuredRoutes
  const storage = map => ({ getItem: key => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) })
  const sessionStorage = storage(session), localStorage = storage(local)
  const context = vm.createContext({
    console, URLSearchParams, structuredClone,
    allowPocLogin: enabled, allowPocSimulation: enabled && paths.sandbox,
    isPocSandbox: paths.sandbox, isPocWorkbench: Boolean(paths.workbench),
    permissionLabEnabled: false, allowPreviewAuth: false,
    normalAppBase: paths.normalBase, pocAppBase: paths.demoBase,
    pocWorkbenchBase: paths.workbenchBase || '/admin-vue/poc/workbench/', appBase: paths.routerBase,
    window: { sessionStorage, localStorage, location: { pathname, origin: 'https://qa.invalid', hostname: 'qa.invalid',
      assign: value => fullNavigations.push(value), replace: value => fullNavigations.push(value) } },
    localStorage, sessionStorage,
    ref: value => ({ value }), computed: getter => ({ get value() { return getter() } }),
    defineStore: (_id, factory) => {
      let instance
      return () => instance ||= new Proxy(factory(), {
        get(target, key) { const value = target[key]; return value && typeof value === 'object' && 'value' in value ? value.value : value },
        set(target, key, value) { const current = target[key]; if (current && typeof current === 'object' && 'value' in current) current.value = value; else target[key] = value; return true }
      })
    },
    syncThemeMode() {}, showWorkbenchToast: message => notices.push(message), aiInspectRoutes: [],
    createWebHistory: base => ({ base }),
    createRouter: options => { configuredRoutes = options.routes; return { beforeEach: callback => { guard = callback } } },
    async fetch(url, options = {}) {
      requests.push({ url, ...plain(options) })
      return { ok: Boolean(serverUser), status: serverUser ? 200 : 401,
        async json() { return url === '/api/admin/me' ? { admin: serverUser ? { username: serverUser } : null }
          : { menus: ['dashboard'], permissions: ['dashboard:view'] } } }
    }
  })
  for (const [path, code] of actualModules) vm.runInContext(code, context, { filename: path })
  const state = vm.runInContext('({ store: useAppStore(), key: typeof POC_WORKBENCH_SESSION_KEY === "undefined" ? undefined : POC_WORKBENCH_SESSION_KEY, value: typeof POC_WORKBENCH_SESSION_VALUE === "undefined" ? undefined : POC_WORKBENCH_SESSION_VALUE, hasSession: typeof hasPocWorkbenchSession === "undefined" ? undefined : hasPocWorkbenchSession, navigatePocChoice, findPocLoginChoice })', context)
  if (marker) {
    if (state.key && state.value) {
      sessionStorage.setItem(state.key, state.value)
    } else session.set('baseline-full-workbench-marker', 'admin-demo')
  }
  return { ...state, paths, requests, fullNavigations, notices, session, sessionStorage, local, routes: configuredRoutes,
    async visit(path = '/portal/home', pageId = 'portal.home') {
      return guard({ path, fullPath: path, query: {}, meta: { pageId } })
    } }
}

test('Production demo is an explicit opt-in, independent of real auth', () => {
  assert.equal(pocLoginEnabled(undefined, false), false)
  assert.equal(pocLoginEnabled(undefined, true), true)
  assert.equal(pocLoginEnabled('true', false), true)
  for (const value of ['false', '', '1', 'TRUE', 'preview']) assert.equal(pocLoginEnabled(value, true), false)
})

test('Only exact POC and full-workbench bases enter their respective contexts', () => {
  for (const path of ['/admin-vue/poc/', '/admin-vue/poc/login', '/admin-vue/poc']) {
    const result = runtimePaths('/admin-vue/', path)
    assert.equal(result.sandbox, true)
    assert.equal(result.routerBase, '/admin-vue/poc/')
    assert.equal(Boolean(result.workbench), false)
  }
  for (const path of ['/admin-vue/poc/workbench/', '/admin-vue/poc/workbench/portal/home', '/admin-vue/poc/workbench']) {
    const result = runtimePaths('/admin-vue/', path)
    assert.equal(result.sandbox, true)
    assert.equal(result.workbench, true)
    assert.equal(result.workbenchBase, '/admin-vue/poc/workbench/')
    assert.equal(result.routerBase, result.workbenchBase)
  }
  for (const path of ['/admin-vue/login', '/admin-vue/poc-other/login', '/poc/login']) assert.equal(runtimePaths('/admin-vue/', path).sandbox, false)
  for (const path of ['/admin-vue/poc/workbench-other/portal/home', '/admin-vue/poc/workbenchish']) assert.equal(Boolean(runtimePaths('/admin-vue/', path).workbench), false)
})

test('Existing approval demo storage cannot read, overwrite or remove normal records', () => {
  const data = new Map([['approval', 'normal-record'], ['preview_user', 'legacy-user']])
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
  const demo = scopedDemoStorage(() => storage, true)
  assert.equal(demo.getItem('approval'), null)
  demo.setItem('approval', 'demo-record')
  assert.equal(data.get('approval'), 'normal-record')
  assert.equal(data.get(POC_STORAGE_PREFIX + 'approval'), 'demo-record')
  demo.removeItem('preview_user')
  assert.equal(data.get('preview_user'), 'legacy-user')
  assert.equal(scopedDemoStorage(() => storage, false).getItem('approval'), 'normal-record')
})

test('Storage errors remain visible instead of granting a session', () => {
  const demo = scopedDemoStorage(() => { throw new Error('blocked') }, true)
  assert.throws(() => demo.getItem('x'), /blocked/)
  assert.throws(() => demo.setItem('x', 'y'), /blocked/)
})

test('The dedicated full-workbench session accepts only its exact browser marker', () => {
  const page = mount()
  assert.equal(typeof page.key, 'string')
  assert.equal(typeof page.value, 'string')
  assert.equal(typeof page.hasSession, 'function')
  assert.equal(page.hasSession(page.sessionStorage), false)
  for (const value of ['admin', 'true', '1', 'server-admin', JSON.stringify({ admin: true })]) {
    if (value === page.value) continue
    page.sessionStorage.setItem(page.key, value)
    assert.equal(page.hasSession(page.sessionStorage), false)
  }
  page.sessionStorage.setItem(page.key, page.value)
  assert.equal(page.hasSession(page.sessionStorage), true)
})

test('normal administrator selection and the destination guard share one canonical browser marker across documents', async () => {
  const session = new Map([['normal-session-canary', 'unchanged']])
  const entry = mount({ pathname: '/admin-vue/login', session })
  entry.navigatePocChoice(entry.findPocLoginChoice('admin'))
  assert.equal(entry.fullNavigations.length, 1)
  const destination = new URL(entry.fullNavigations[0], 'https://qa.invalid')
  assert.equal(destination.pathname, '/admin-vue/poc/workbench/portal/home')
  assert.equal(entry.store.user, null)
  const workbench = mount({ pathname: destination.pathname, session })
  await workbench.visit()
  assert.equal(workbench.store.user, 'admin')
  assert.equal(workbench.requests.length, 0)
  assert.equal(workbench.session.size, 2)
  assert.equal(workbench.session.get('normal-session-canary'), 'unchanged')
})

test('Full-workbench routes reuse AppLayout and every existing business and Agent entry without the approval-only shell', () => {
  const page = mount({ marker: true })
  const workspace = page.routes.find(route => route.path === '/' && route.children?.some(child => child.meta?.pageId === 'portal.home'))
  assert.ok(workspace, 'The full workspace must contain the original portal route tree')
  assert.equal(workspace.component.name, 'AppLayout')
  const pageIds = new Set(workspace.children.map(route => route.meta?.pageId))
  for (const pageId of ['portal.home', 'sales.workbench', 'dashboard.overview', 'dashboard.geo', 'employee.overview',
    'lead.dashboard', 'order.purchaseOrders', 'advertising.productVideo', 'points.accounts', 'points.activity',
    'reviews.summary', 'agent.skills', 'agent.skillCreate', 'agent.scenarioPackageCreate', 'agent.permissions', 'agent.usageDashboard']) {
    assert.ok(pageIds.has(pageId), pageId)
  }
  assert.ok(!page.routes.some(route => route.component?.name === 'PocDemoLayout'))
})

test('A valid full-workbench browser marker restores all administrator menus on fresh navigation without authentication requests', async () => {
  const page = mount({ marker: true })
  const result = await page.visit()
  assert.ok(result === undefined || result === true)
  assert.equal(page.store.user, 'admin')
  assert.equal(page.store.role, '平台管理员')
  assert.deepEqual(plain(page.store.permissions), ['*'])
  assert.deepEqual(Object.keys(page.store.filteredMenuTree), ['dashboard', 'geo', 'employee', 'lead', 'order', 'advertising', 'aiinspect', 'promotion', 'reviews'])
  assert.equal(page.requests.length, 0)
  assert.equal(page.paths.routerBase, '/admin-vue/poc/workbench/')
})

test('Full-workbench refresh restores the explicit demo marker but never legacy preview_user', async () => {
  const initial = mount({ marker: true })
  const reloaded = mount({ session: initial.session, local: new Map([['preview_user', 'real-admin-canary']]) })
  await reloaded.visit('/agent/skills', 'agent.skills')
  assert.equal(reloaded.store.user, 'admin')
  assert.equal(reloaded.requests.length, 0)
  const invalid = mount({ local: new Map([['preview_user', 'admin']]) })
  await invalid.visit()
  assert.equal(invalid.store.user, null)
  assert.equal(invalid.requests.length, 0)
})

test('The normal authenticated workspace ignores the full-workbench marker and legacy preview_user', async () => {
  const demo = mount({ marker: true })
  const normal = mount({ pathname: '/admin-vue/portal/home', session: demo.session, local: new Map([['preview_user', 'admin']]) })
  const result = await normal.visit()
  assert.equal(normal.store.user, null)
  assert.equal(result.path, '/login')
  assert.deepEqual(normal.requests.map(request => request.url), ['/api/admin/me'])
})

test('Direct usePreviewSession cannot replace a real user outside the explicitly enabled full-workbench context', () => {
  for (const options of [{ pathname: '/admin-vue/portal/home', marker: true }, { pathname: '/admin-vue/poc/agent/permissions', marker: true }, { enabled: false, marker: true }, { marker: false }]) {
    const page = mount(options)
    page.store.user = 'existing-external-canary'
    page.store.permissions = ['existing:read']
    page.store.usePreviewSession('admin')
    assert.equal(page.store.user, 'existing-external-canary', JSON.stringify(options))
    assert.deepEqual(plain(page.store.permissions), ['existing:read'])
    assert.equal(page.requests.length, 0)
  }
})

test('A disabled POC flag rejects a full-workbench marker and does not call server authentication', async () => {
  const page = mount({ enabled: false, marker: true })
  await page.visit()
  assert.equal(page.store.user, null)
  assert.equal(page.requests.length, 0)
  assert.ok(page.fullNavigations.some(target => target.startsWith('/admin-vue/login')))
})

test('The existing standalone approval POC does not acquire a full-workbench identity or routes', async () => {
  const page = mount({ pathname: '/admin-vue/poc/agent/permissions', marker: true })
  await page.visit('/agent/permissions', 'agent.permissions')
  assert.equal(page.store.user, null)
  assert.equal(page.requests.length, 0)
  assert.ok(!page.routes.some(route => route.children?.some(child => child.meta?.pageId === 'sales.workbench')))
})

test('Full-workbench logout clears only its demo marker and in-memory identity without logging out a real backend session', async () => {
  const session = new Map([['normal-session-canary', 'unchanged']])
  const local = new Map([['preview_user', 'ordinary-record-canary']])
  const page = mount({ marker: true, session, local })
  await page.visit()
  await page.store.logout()
  assert.equal(page.store.user, null)
  assert.deepEqual(plain(page.store.permissions), [])
  assert.equal(typeof page.hasSession, 'function')
  assert.equal(page.hasSession(page.sessionStorage), false)
  assert.equal(page.session.get('normal-session-canary'), 'unchanged')
  assert.equal(page.local.get('preview_user'), 'ordinary-record-canary')
  assert.equal(page.requests.length, 0)
})
