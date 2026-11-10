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
const executable = text => stripTypeScriptTypes(text.replace(/^import .*\n/gm, '').replace(/^export /gm, ''))
const optionalSessionModule = (() => {
  try { return [['src/services/pocWorkbenchSession.ts', executable(readSource('src/services/pocWorkbenchSession.ts'))]] }
  catch (error) { if (sourceRef && error.status === 128) return []; throw error }
})()
const modules = [
  'src/services/pocIsolation.ts',
  'src/services/pocStorage.ts',
  'src/services/pocExternalLogin.ts',
  'src/services/permissionLab.ts',
  'src/services/accountEnableRequest.ts',
  'src/services/approvalMailReview.ts'
].map(path => [path, executable(readSource(path))]).concat(optionalSessionModule,
  [['src/services/pocLoginChoices.ts', executable(readSource('src/services/pocLoginChoices.ts'))]])
const setup = executable(readSource('src/views/LoginView.vue').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1])
const plain = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))

// Execute the real SFC setup, account choices, fixture resolver, scoped storage
// and Lab account rules. Only Vue lifecycle/reactivity and browser/backend/store
// boundaries are replaced. No server, cookie, credential or real API is used.
function mount({ query = {}, sandbox = false, enabled = true, lab = false,
  response = { status: 200, data: { success: true, username: 'server-confirmed-admin' } },
  networkFailure = false, permissions = ['dashboard:view'], local = new Map(), session = new Map(), sessionWriteFailure = false } = {}) {
  const navigations = [], fullNavigations = [], requests = [], trace = [], mounted = []
  const route = { path: '/login', query }
  const storage = map => ({
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => { if (map === session && sessionWriteFailure) throw new Error('QA-only session write failure'); map.set(key, String(value)) },
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
    isPocSandbox: sandbox, isPocWorkbench: false, permissionLabEnabled: lab,
    normalAppBase: '/admin-vue/', pocAppBase: '/admin-vue/poc/', pocWorkbenchBase: '/admin-vue/poc/workbench/',
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
  const sessionContract = vm.runInContext('({ key: typeof POC_WORKBENCH_SESSION_KEY === "undefined" ? undefined : POC_WORKBENCH_SESSION_KEY, has: typeof hasPocWorkbenchSession === "undefined" ? undefined : hasPocWorkbenchSession })', context)
  return { ...state, requests, trace, navigations, fullNavigations, store, local, session, sessionContract, isSandbox: sandbox,
    async ready() { await Promise.all(mounted.map(callback => callback())) } }
}

async function selectAdmin(page) {
  await page.ready()
  await page.selectPocAccount(page.findPocLoginChoice('admin'))
}
const loadEvents = page => page.trace.filter(event => event.type === 'load-user-context')

function assertInternalProxy(page, account) {
  if (page.isSandbox) {
    assert.equal(page.fullNavigations.length, 0, 'An isolated internal scenario must never leave for normal authentication')
    assert.equal(page.navigations.at(-1)?.path, '/adfs-login')
    assert.equal(page.navigations.at(-1)?.query.pocAccount, account)
  } else {
    assert.equal(page.fullNavigations.length, 1, 'Normal entry must cross into the isolated POC document')
    const destination = new URL(page.fullNavigations[0], 'https://qa.invalid')
    assert.equal(destination.pathname, '/admin-vue/poc/adfs-login')
    assert.equal(destination.searchParams.get('pocAccount'), account)
    assert.equal(destination.searchParams.get('password'), null)
    assert.deepEqual(page.navigations, [], 'The normal workbench route must not substitute for the isolated proxy')
  }
  assert.equal(page.requests.length, 0)
  assert.equal(page.store.user, null)
  assert.deepEqual(plain(page.store.permissions), [])
  assert.equal(loadEvents(page).length, 0)
}

function assertAdminWorkbench(page, expectedSessionSize = 1) {
  assert.equal(page.fullNavigations.length, 1, 'An administrator must enter the full workbench document')
  const destination = new URL(page.fullNavigations[0], 'https://qa.invalid')
  assert.equal(destination.pathname, '/admin-vue/poc/workbench/portal/home')
  assert.equal(destination.searchParams.get('password'), null)
  assert.deepEqual(page.navigations, [], 'Administrator entry must not stop at the approval-only proxy')
  assert.equal(page.requests.length, 0)
  assert.equal(page.store.user, null, 'The source document must not impersonate a real server identity')
  assert.deepEqual(plain(page.store.permissions), [])
  assert.equal(loadEvents(page).length, 0)
  assert.equal(typeof page.sessionContract.has, 'function')
  // Read the same bytes with the actual storage scope of the destination.
  const canonical = { getItem: key => page.session.get(key) ?? null }
  assert.equal(page.sessionContract.has(canonical), true, 'The full workbench must read the canonical explicit demo marker')
  assert.equal(page.session.size, expectedSessionSize, 'Entry writes one dedicated browser demo marker only')
}

test('default internal ADFS demonstration enters the complete administrator workbench without a password or API', async () => {
  const page = mount()
  await page.ready(); await page.doLogin()
  assertAdminWorkbench(page)
  assert.equal(page.password.value, '')
})

test('selecting administrator enters the complete workspace without authenticating a real admin', async () => {
  const page = mount()
  await selectAdmin(page)
  assertAdminWorkbench(page)
  assert.equal(page.password.value, '')
})

test('an administrator query in the normal document enters the full workspace instead of requesting a password', async () => {
  const page = mount({ query: { pocAccount: 'admin', loginType: 'internal', redirect: '/sales/workbench' } })
  await page.ready()
  assertAdminWorkbench(page)
  assert.equal(page.password.value, '')
})

test('administrator chosen inside the approval POC enters the complete workspace and preserves ordinary storage', async () => {
  const local = new Map([['preview_user', 'normal-record-canary']])
  const page = mount({ sandbox: true, query: { mode: 'scenarios' }, local })
  await selectAdmin(page)
  assertAdminWorkbench(page)
  assert.equal(page.local.get('preview_user'), 'normal-record-canary')
})

test('full-workbench entry preserves unrelated ordinary browser session data', async () => {
  const session = new Map([['normal-session-canary', 'unchanged']])
  const page = mount({ session })
  await selectAdmin(page)
  assertAdminWorkbench(page, 2)
  assert.equal(session.get('normal-session-canary'), 'unchanged')
})

test('administrator entry fails visibly without navigation or authentication when its browser session marker cannot be written', async () => {
  for (const initialQuery of [false, true]) {
    const page = mount({ sessionWriteFailure: true, query: initialQuery ? { pocAccount: 'admin' } : {} })
    await page.ready()
    if (!initialQuery) await page.doLogin()
    assert.match(page.errorMsg.value, /无法保存.*状态|会话存储/)
    assert.deepEqual(page.fullNavigations, [])
    assert.deepEqual(page.navigations, [])
    assert.equal(page.store.user, null)
    assert.equal(page.session.size, 0)
    assert.equal(page.requests.length, 0)
  }
})

test('first-access internal choice crosses into its isolated ADFS state proxy without password login', async () => {
  const page = mount()
  page.username.value = 'noaccess'
  await page.doLogin()
  assertInternalProxy(page, 'noaccess')
})

test('disabled internal choice in the POC uses its state proxy without password login', async () => {
  const page = mount({ sandbox: true, query: { mode: 'scenarios', redirect: '/agent/permissions' } })
  page.username.value = 'internal-disabled'
  await page.doLogin()
  assertInternalProxy(page, 'internal-disabled')
})

test('an unknown internal account cannot fall back to a real password authentication request', async () => {
  const page = mount()
  page.username.value = 'ordinary-user'
  page.password.value = 'must-not-be-used'
  await page.doLogin()
  assert.match(page.errorMsg.value, /请选择内部演示账号/)
  assert.equal(page.requests.length, 0)
  assert.equal(page.password.value, '')
  assert.equal(page.store.user, null)
  assert.deepEqual(page.navigations, [])
  assert.deepEqual(page.fullNavigations, [])
})

test('an external fixture typed in the internal card is rejected instead of being silently authenticated', async () => {
  const page = mount({ sandbox: true, query: { mode: 'scenarios' } })
  page.username.value = 'external-disabled'
  await page.doLogin()
  assert.match(page.errorMsg.value, /外部账号.*外部用户登录/)
  assert.equal(page.requests.length, 0)
  assert.deepEqual(page.navigations, [])
  assert.deepEqual(page.fullNavigations, [])
  assert.equal(page.store.user, null)
})

test('disabled POC feature cannot create a normal or simulated internal session', async () => {
  const page = mount({ enabled: false })
  await page.doLogin()
  assert.match(page.errorMsg.value, /未启用.*ADFS.*演示/)
  assert.equal(page.requests.length, 0)
  assert.deepEqual(page.navigations, [])
  assert.deepEqual(page.fullNavigations, [])
  assert.equal(page.store.user, null)
})

test('switching from external password login to internal ADFS clears the password without sending it', async () => {
  const page = mount({ query: { loginType: 'external' } })
  page.password.value = 'external-password-canary'
  page.switchLoginTab('internal')
  assert.equal(page.loginTab.value, 'internal')
  assert.equal(page.password.value, '')
  assert.equal(page.requests.length, 0)
})

test('external login still rejects an empty password before requesting authentication', async () => {
  const page = mount({ query: { loginType: 'external' } })
  page.username.value = 'external-user'
  await page.doLogin()
  assert.match(page.errorMsg.value, /用户名和密码/)
  assert.equal(page.requests.length, 0)
  assert.equal(page.store.user, null)
  assert.deepEqual(plain(page.store.permissions), [])
})

test('wrong external password remains rejected by the real authentication boundary', async () => {
  const page = mount({ query: { loginType: 'external' }, response: { status: 401, data: { error: 'QA-only incorrect password' } } })
  page.username.value = 'external-user'; page.password.value = 'qa-wrong-only'
  await page.doLogin()
  assert.equal(page.requests.length, 1)
  assert.deepEqual(page.requests[0].data, { username: 'external-user', password: 'qa-wrong-only' })
  assert.equal(page.errorMsg.value, 'QA-only incorrect password')
  assert.equal(page.store.user, null)
  assert.deepEqual(plain(page.store.permissions), [])
  assert.equal(loadEvents(page).length, 0)
  assert.equal(page.navigations.length, 0)
})

test('failed external login transport never becomes a preview administrator', async () => {
  const page = mount({ query: { loginType: 'external' }, networkFailure: true })
  page.username.value = 'external-user'; page.password.value = 'qa-valid-only'
  await page.doLogin()
  assert.equal(page.requests.length, 1)
  assert.deepEqual(page.requests[0].data, { username: 'external-user', password: 'qa-valid-only' })
  assert.match(page.errorMsg.value, /登录服务暂不可用/)
  assert.equal(page.store.user, null)
  assert.deepEqual(plain(page.store.permissions), [])
  assert.equal(loadEvents(page).length, 0)
  assert.equal(page.navigations.length, 0)
})

test('successful external server authentication restores context before the requested normal destination', async () => {
  const page = mount({ query: { loginType: 'external', redirect: '/sales/workbench' },
    response: { status: 200, data: { success: true, username: 'server-confirmed-external' } } })
  page.username.value = 'external-user'; page.password.value = 'qa-valid-only'
  await page.doLogin()
  assert.equal(page.requests.length, 1)
  assert.deepEqual(page.requests[0].data, { username: 'external-user', password: 'qa-valid-only' })
  assert.equal(page.store.user, 'server-confirmed-external')
  assert.deepEqual(page.trace, [
    { type: 'request', url: '/api/admin/login' },
    { type: 'load-user-context', user: 'server-confirmed-external' },
    { type: 'navigate', target: '/sales/workbench' }
  ])
  assert.equal(page.errorMsg.value, '')
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

test('typing real admin credentials in the external POC cannot create a real session', async () => {
  const page = mount({ sandbox: true, query: { mode: 'scenarios', loginType: 'external' } })
  page.username.value = 'admin'; page.password.value = 'qa-valid-only'
  await page.doLogin()
  assert.match(page.errorMsg.value, /仅支持指定演示账号/)
  assert.equal(page.requests.length, 0)
  assert.equal(page.store.user, null)
  assert.deepEqual(plain(page.store.permissions), [])
  assert.equal(page.navigations.length, 0)
})
