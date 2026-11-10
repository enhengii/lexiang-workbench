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
  ? execFileSync('git', ['-C', root, 'show', `${sourceRef}:vue-app/${path}`], { encoding: 'utf8' })
  : readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const executable = text => stripTypeScriptTypes(text.replace(/^import .*\n/gm, '').replace(/^export /gm, ''))
const modules = [
  'src/services/pocIsolation.ts',
  'src/services/pocStorage.ts',
  'src/services/pocExternalLogin.ts',
  'src/services/permissionLab.ts',
  'src/services/accountEnableRequest.ts',
  'src/services/approvalMailReview.ts',
  'src/services/pocLoginChoices.ts'
].map(path => [path, executable(readSource(path))])
const setup = executable(readSource('src/views/LoginView.vue').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1])
const plain = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))

// Execute the real SFC setup, account choices, fixture resolver, scoped storage
// and Lab account rules. Only Vue lifecycle/reactivity and browser/backend/store
// boundaries are replaced. No server, cookie, credential or real API is used.
function mount({ query = {}, sandbox = false, enabled = true, lab = false,
  response = { status: 200, data: { success: true, username: 'server-confirmed-admin' } },
  networkFailure = false, permissions = ['dashboard:view'], local = new Map(), session = new Map() } = {}) {
  const navigations = [], fullNavigations = [], requests = [], trace = [], mounted = []
  const route = { path: '/login', query }
  const storage = map => ({
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
    clear: () => map.clear()
  })
  const store = {
    user: null, role: null, permissions: [], visibleMenus: [],
    async loadUserContext() {
      trace.push({ type: 'load-user-context', user: this.user })
      this.permissions = [...permissions]
      this.visibleMenus = permissions.length ? ['dashboard'] : []
      this.role = permissions.length ? '工作台用户' : null
    }
  }
  const router = {
    async push(target) { navigations.push(plain(target)); route.path = typeof target === 'string' ? target : target.path },
    async replace(target) {
      navigations.push(plain(target)); route.path = typeof target === 'string' ? target : target.path
      trace.push({ type: 'navigate', target: plain(target) })
    }
  }
  const context = vm.createContext({
    console, URLSearchParams,
    allowPocLogin: enabled && !lab, allowPocSimulation: enabled && !lab && sandbox,
    isPocSandbox: sandbox, permissionLabEnabled: lab,
    normalAppBase: '/admin-vue/', pocAppBase: '/admin-vue/poc/',
    appBase: sandbox ? '/admin-vue/poc/' : '/admin-vue/', localAdminPassword: '',
    window: { localStorage: storage(local), sessionStorage: storage(session), location: {
      origin: 'https://qa.invalid', assign: target => fullNavigations.push(target)
    } },
    ref: value => ({ value }), reactive: value => value,
    computed: getter => ({ get value() { return getter() } }),
    onMounted: callback => mounted.push(callback),
    useRouter: () => router, useRoute: () => route, useAppStore: () => store,
    async fetch(url, options = {}) {
      assert.equal(url, '/api/admin/login', 'The login component must retain the existing backend boundary')
      requests.push({ url, ...plain(options), data: options.body ? JSON.parse(options.body) : undefined })
      trace.push({ type: 'request', url })
      if (networkFailure) throw new Error('QA-only network failure')
      return { ok: response.status >= 200 && response.status < 300, status: response.status,
        async json() { return plain(response.data) } }
    }
  })
  for (const [path, code] of modules) vm.runInContext(code, context, { filename: path })
  vm.runInContext(setup, context, { filename: 'LoginView.vue setup' })
  const state = vm.runInContext('({ username, password, errorMsg, loginTab, selectPocAccount, doLogin, switchLoginTab, findPocLoginChoice })', context)
  return { ...state, requests, trace, navigations, fullNavigations, store, local, session,
    async ready() { await Promise.all(mounted.map(callback => callback())) } }
}

async function selectAdmin(page) {
  await page.ready()
  await page.selectPocAccount(page.findPocLoginChoice('admin'))
}
const loadEvents = page => page.trace.filter(event => event.type === 'load-user-context')

test('selecting admin keeps the internal card without navigation or authentication', async () => {
  const page = mount()
  await selectAdmin(page)
  assert.equal(page.loginTab.value, 'internal')
  assert.equal(page.username.value, 'admin')
  assert.equal(page.password.value, '', 'A release build never autofills the real administrator password')
  assert.equal(page.requests.length, 0)
  assert.equal(page.navigations.length, 0, 'Selecting admin must not open a second ADFS page')
  assert.equal(page.fullNavigations.length, 0)
  assert.equal(page.store.user, null)
  assert.deepEqual(page.store.permissions, [])
})

test('a selected-admin normal URL remains an internal card and never auto-submits', async () => {
  const page = mount({ query: { pocAccount: 'admin', loginType: 'internal', redirect: '/sales/workbench' } })
  await page.ready()
  assert.equal(page.loginTab.value, 'internal')
  assert.equal(page.username.value, 'admin')
  assert.equal(page.password.value, '')
  assert.equal(page.requests.length, 0)
  assert.equal(page.store.user, null)
})

test('empty administrator password cannot create a request, identity or permissions', async () => {
  const page = mount()
  await selectAdmin(page)
  await page.doLogin()
  assert.match(page.errorMsg.value, /用户名和密码/)
  assert.equal(page.requests.length, 0)
  assert.equal(page.store.user, null)
  assert.deepEqual(page.store.permissions, [])
  assert.equal(page.navigations.length, 0)
})

test('wrong internal administrator password stays rejected by the server', async () => {
  const page = mount({ response: { status: 401, data: { error: 'QA-only incorrect password' } } })
  page.username.value = 'admin'; page.password.value = 'qa-wrong-only'
  await page.doLogin()
  assert.equal(page.requests.length, 1)
  assert.deepEqual(page.requests[0].data, { username: 'admin', password: 'qa-wrong-only', loginType: 'adfs' })
  assert.equal(page.errorMsg.value, 'QA-only incorrect password')
  assert.equal(page.store.user, null)
  assert.deepEqual(page.store.permissions, [])
  assert.equal(loadEvents(page).length, 0)
  assert.equal(page.navigations.length, 0)
})

test('failed internal login transport never becomes a preview administrator', async () => {
  const page = mount({ networkFailure: true })
  page.username.value = 'admin'; page.password.value = 'qa-valid-only'
  await page.doLogin()
  assert.equal(page.requests.length, 1)
  assert.equal(page.requests[0].data.loginType, 'adfs')
  assert.match(page.errorMsg.value, /登录服务暂不可用/)
  assert.equal(page.store.user, null)
  assert.deepEqual(page.store.permissions, [])
  assert.equal(loadEvents(page).length, 0)
  assert.equal(page.navigations.length, 0)
})

test('successful internal server authentication restores context before the requested destination', async () => {
  const page = mount({ query: { redirect: '/sales/workbench' } })
  page.username.value = 'admin'; page.password.value = 'qa-valid-only'
  await page.doLogin()
  assert.equal(page.requests.length, 1)
  assert.deepEqual(page.requests[0].data, { username: 'admin', password: 'qa-valid-only', loginType: 'adfs' })
  assert.equal(page.store.user, 'server-confirmed-admin')
  assert.deepEqual(page.trace, [
    { type: 'request', url: '/api/admin/login' },
    { type: 'load-user-context', user: 'server-confirmed-admin' },
    { type: 'navigate', target: '/sales/workbench' }
  ])
  assert.equal(page.errorMsg.value, '')
})

test('internal disabled server response opens its enable request with internal identity proof', async () => {
  const page = mount({ response: { status: 423, data: { code: 'ACCOUNT_DISABLED', error: '账号已禁用' } } })
  page.username.value = 'internal-user'; page.password.value = 'qa-valid-only'
  await page.doLogin()
  assert.deepEqual(page.navigations, [{ path: '/account-enable-request', query: { account: 'internal-user', loginType: 'internal' } }])
  assert.equal(page.session.get('leaibot-disabled-login-account'), 'internal-user')
  assert.equal(page.session.get('leaibot-disabled-login-type'), 'internal')
  assert.equal(page.store.user, null)
  assert.equal(loadEvents(page).length, 0)
})

test('internal Lab first-access result enters application without granting a workbench identity', async () => {
  const page = mount({ lab: true, response: { status: 200, data: { success: true, username: 'noaccess', next: 'first-access' } } })
  page.username.value = 'noaccess'
  await page.doLogin()
  assert.equal(page.requests.length, 1, 'The existing local-only passwordless internal account must reach its isolated backend')
  assert.deepEqual(page.requests[0].data, { username: 'noaccess', password: '', loginType: 'adfs' })
  assert.deepEqual(page.navigations, [{ path: '/access-denied', query: { itcode: 'noaccess', userType: 'internal' } }])
  assert.equal(page.store.user, null)
  assert.equal(loadEvents(page).length, 0)
})

test('an internal authenticated account without permissions retains its internal application identity', async () => {
  const page = mount({ permissions: [], response: { status: 200, data: { success: true, username: 'internal-user' } } })
  page.username.value = 'internal-user'; page.password.value = 'qa-valid-only'
  await page.doLogin()
  assert.equal(loadEvents(page).length, 1)
  assert.deepEqual(page.navigations, [{ path: '/access-denied', query: { itcode: 'internal-user', userType: 'internal' } }])
  assert.deepEqual(page.store.permissions, [])
})

test('external disabled server response keeps its contact-owner message and never opens an enable request', async () => {
  const session = new Map([['leaibot-disabled-login-account', 'old-internal-user'], ['leaibot-disabled-login-type', 'internal']])
  const page = mount({ query: { loginType: 'external' }, session,
    response: { status: 423, data: { code: 'ACCOUNT_DISABLED', error: '账号已禁用' } } })
  page.username.value = 'external-user'; page.password.value = 'qa-valid-only'
  await page.doLogin()
  assert.deepEqual(page.requests[0].data, { username: 'external-user', password: 'qa-valid-only' })
  assert.match(page.errorMsg.value, /已被禁用.*联系.*业务接口人/)
  assert.deepEqual(page.navigations, [])
  assert.equal(page.session.has('leaibot-disabled-login-account'), false)
  assert.equal(page.session.has('leaibot-disabled-login-type'), false)
  assert.equal(page.store.user, null)
  assert.equal(loadEvents(page).length, 0)
})

test('admin chosen inside the POC returns to normal internal login without credentials or a synthetic identity', async () => {
  const local = new Map([['preview_user', 'normal-record-canary']])
  const page = mount({ sandbox: true, query: { mode: 'scenarios' }, local })
  await selectAdmin(page)
  assert.equal(page.fullNavigations.length, 1)
  const destination = new URL(page.fullNavigations[0], 'https://qa.invalid')
  assert.equal(destination.pathname, '/admin-vue/login')
  assert.equal(destination.searchParams.get('pocAccount'), 'admin')
  assert.equal(destination.searchParams.get('loginType'), 'internal')
  assert.equal(destination.searchParams.has('password'), false)
  assert.equal(page.requests.length, 0)
  assert.equal(page.store.user, null)
  assert.deepEqual(page.store.permissions, [])
  assert.equal(page.local.get('preview_user'), 'normal-record-canary')
})

test('manually typing admin in the POC cannot authenticate or restore a real administrator', async () => {
  const page = mount({ sandbox: true, query: { mode: 'scenarios' } })
  page.username.value = 'admin'; page.password.value = 'qa-valid-only'
  await page.doLogin()
  assert.match(page.errorMsg.value, /仅支持指定演示账号/)
  assert.equal(page.requests.length, 0)
  assert.equal(page.store.user, null)
  assert.deepEqual(page.store.permissions, [])
  assert.equal(page.navigations.length, 0)
})

test('manual internal first-access fixture stays in the POC application flow without server login', async () => {
  const page = mount({ sandbox: true, query: { mode: 'scenarios' } })
  page.username.value = 'noaccess'; page.password.value = 'Poc123456!'
  await page.doLogin()
  assert.deepEqual(page.navigations, [{ path: '/access-denied', query: { itcode: 'noaccess', userType: 'internal' } }])
  assert.equal(page.requests.length, 0)
  assert.equal(page.store.user, null)
})
