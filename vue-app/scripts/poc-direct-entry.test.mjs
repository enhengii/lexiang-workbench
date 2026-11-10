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
  'src/services/pocIsolation.ts', 'src/services/pocStorage.ts',
  'src/services/pocExternalLogin.ts', 'src/services/approvalMailReview.ts'
].map(path => [path, executable(readSource(path))]).concat(optionalSessionModule,
  [['src/services/pocLoginChoices.ts', executable(readSource('src/services/pocLoginChoices.ts'))]])
const setup = executable(readSource('src/views/AdfsLoginView.vue').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1])
const plain = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
const requestKey = 'leaibot-poc-demo:leaibot-account-request-status-rows'
const approvalKey = 'leaibot-poc-demo:leaibot-approval-mail-mock-rows'

// Execute the actual ADFS proxy SFC, navigation helper, passwordless fixture
// resolver and scoped storage. Only framework, browser and network boundaries
// are replaced. An API call here is always recorded and rejected, never sent.
function mount({ query = {}, sandbox = true, enabled = true, local = new Map(), session = new Map(), navigationFailure = false, sessionWriteFailure = false } = {}) {
  const navigations = [], fullNavigations = [], requests = [], mounted = []
  const route = { query, path: '/adfs-login' }
  const storage = map => ({ getItem: key => map.get(key) ?? null,
    setItem: (key, value) => { if (map === session && sessionWriteFailure) throw new Error('QA-only session write failure'); map.set(key, String(value)) }, removeItem: key => map.delete(key), clear: () => map.clear() })
  const store = { user: null, role: null, permissions: [], visibleMenus: [], async loadUserContext() {
    requests.push({ type: 'unexpected-context-restore' }); throw new Error('The POC must not restore a real session')
  } }
  const router = {
    async replace(target) {
      if (navigationFailure) return { type: 4 }
      navigations.push(plain(target)); route.path = typeof target === 'string' ? target : target.path
    },
    async push(target) { navigations.push(plain(target)); route.path = typeof target === 'string' ? target : target.path }
  }
  const context = vm.createContext({
    console, URLSearchParams,
    allowPocLogin: enabled, allowPocSimulation: enabled && sandbox, isPocSandbox: sandbox, isPocWorkbench: false,
    permissionLabEnabled: false, normalAppBase: '/admin-vue/', pocAppBase: '/admin-vue/poc/', pocWorkbenchBase: '/admin-vue/poc/workbench/', localAdminPassword: '',
    window: { localStorage: storage(local), sessionStorage: storage(session), location: { assign: target => fullNavigations.push(target) } },
    ref: value => ({ value }), computed: getter => ({ get value() { return getter() } }), onMounted: callback => mounted.push(callback),
    useRoute: () => route, useRouter: () => router, useAppStore: () => store,
    isPasswordlessLabAccount: () => false, labHeaders: () => ({}),
    async fetch(url, options) { requests.push({ url, ...plain(options) }); throw new Error('The ADFS demonstration must never authenticate through a real API') }
  })
  for (const [path, code] of modules) vm.runInContext(code, context, { filename: path })
  vm.runInContext(setup, context, { filename: 'AdfsLoginView.vue setup' })
  const state = vm.runInContext('({ itcode, errorMsg, submitAdfsLogin, retry: enterPocScenario, back: returnToPocSelection, findPocLoginAccount, resolvePocLogin })', context)
  return { ...state, store, navigations, fullNavigations, requests, local, session, route,
    async ready() { await Promise.all(mounted.map(callback => callback())) } }
}

const completedEnable = { typeKey: 'enable', targetItcode: 'internal-disabled', statusKey: 'done', nodeType: 'done' }
const completedFirstAccess = {
  source: 'first-access', typeKey: 'change', personType: 'internal', applicantPersonType: 'internal',
  applicantItcode: 'noaccess', targetItcode: 'noaccess', statusKey: 'done', nodeType: 'done',
  businessApprovalTasks: [{ approver: 'qa-owner', status: 'approved' }],
  approvalLogs: [{ action: 'execute-success', operator: 'system' }]
}

function assertNoRealIdentity(page) {
  assert.equal(page.requests.length, 0)
  assert.equal(page.store.user, null)
  assert.deepEqual(plain(page.store.permissions), [])
}

test('selected first-access internal scenario enters its result without password or a second submit', async () => {
  const page = mount({ query: { pocAccount: 'noaccess' } })
  await page.ready()
  assert.deepEqual(page.navigations, [{ path: '/access-denied', query: { itcode: 'noaccess', userType: 'internal' } }])
  assertNoRealIdentity(page)
})

test('selected disabled internal scenario enters enable request without password or a second submit', async () => {
  const page = mount({ query: { pocAccount: 'internal-disabled' } })
  await page.ready()
  assert.deepEqual(page.navigations, [{ path: '/account-enable-request', query: { account: 'internal-disabled', loginType: 'internal' } }])
  assert.equal(page.session.get('leaibot-poc-demo:leaibot-disabled-login-account'), 'internal-disabled')
  assertNoRealIdentity(page)
})

test('legacy admin ADFS demonstration enters the full workbench and leaves real identity data unchanged', async () => {
  const local = new Map([['preview_user', 'normal-record-canary'], ['leaibot-poc-demo:preview_user', 'old-demo-canary']])
  const session = new Map([['normal-session-canary', 'unchanged']])
  const page = mount({ query: { pocAccount: 'admin' }, local, session })
  await page.ready()
  assert.deepEqual(page.navigations, [])
  assert.equal(page.fullNavigations.length, 1)
  assert.equal(new URL(page.fullNavigations[0], 'https://qa.invalid').pathname, '/admin-vue/poc/workbench/portal/home')
  assert.equal(page.local.get('preview_user'), 'normal-record-canary')
  assert.equal(page.local.get('leaibot-poc-demo:preview_user'), 'old-demo-canary')
  assert.equal(page.session.get('normal-session-canary'), 'unchanged')
  assertNoRealIdentity(page)
})

test('normal legacy admin URL enters the complete workspace without backend authentication', async () => {
  const page = mount({ sandbox: false, query: { pocAccount: 'admin', redirect: '/agent/skills' } })
  await page.ready()
  assert.equal(page.fullNavigations.length, 1)
  const destination = new URL(page.fullNavigations[0], 'https://qa.invalid')
  assert.equal(destination.pathname, '/admin-vue/poc/workbench/portal/home')
  assert.equal(destination.searchParams.get('password'), null)
  assert.deepEqual(page.navigations, [])
  assertNoRealIdentity(page)
})

test('legacy admin ADFS entry stays recoverable when its explicit full-workbench marker cannot be stored', async () => {
  const page = mount({ query: { pocAccount: 'admin' }, sessionWriteFailure: true })
  await page.ready()
  assert.match(page.errorMsg.value, /无法保存.*状态|会话存储/)
  assert.deepEqual(page.fullNavigations, [])
  assert.deepEqual(page.navigations, [])
  assert.equal(page.session.size, 0)
  assertNoRealIdentity(page)
})

test('admin remains outside the password-authentication fixture list even while its POC entrance works', async () => {
  const page = mount({ query: { pocAccount: 'admin' } })
  await page.ready()
  assert.equal(page.findPocLoginAccount('admin', true), undefined)
  assert.equal(page.resolvePocLogin('admin', 'Poc123456!', 'internal', true, () => null), null)
  assertNoRealIdentity(page)
})

test('newer pending or rejected enable requests cannot undo an executed internal enable', async () => {
  const raw = JSON.stringify([{ ...completedEnable, statusKey: 'pending', nodeType: 'system-admin' },
    { ...completedEnable, statusKey: 'rejected' }, completedEnable])
  const page = mount({ query: { pocAccount: 'internal-disabled' }, local: new Map([[requestKey, raw]]) })
  await page.ready()
  assert.deepEqual(page.navigations, ['/agent/permissions'])
  assert.equal(page.local.get(requestKey), raw)
  assertNoRealIdentity(page)
})

test('fully executed first-access approval opens the isolated workbench without another password', async () => {
  const raw = JSON.stringify([completedFirstAccess])
  const page = mount({ query: { pocAccount: 'noaccess' }, local: new Map([[approvalKey, raw]]) })
  await page.ready()
  assert.deepEqual(page.navigations, ['/agent/permissions'])
  assert.equal(page.local.get(approvalKey), raw)
  assertNoRealIdentity(page)
})

test('an unfinished first-access execution cannot grant access to the internal demonstration', async () => {
  const page = mount({ query: { pocAccount: 'noaccess' }, local: new Map([[approvalKey, JSON.stringify([
    { ...completedFirstAccess, approvalLogs: [{ action: 'business-approved', operator: 'qa-owner' }] }
  ])]]) })
  await page.ready()
  assert.equal(page.navigations[0]?.path, '/access-denied')
  assertNoRealIdentity(page)
})

test('the legacy scenario chooser returns to the shared internal card without authentication', async () => {
  const page = mount({ query: { mode: 'scenarios' } })
  await page.ready()
  assert.equal(page.navigations[0]?.path, '/login')
  assert.equal(page.navigations[0]?.query.mode, 'scenarios')
  assert.equal(page.navigations[0]?.query.loginType, 'internal')
  assertNoRealIdentity(page)
})

test('external, unknown, array and hidden fixture queries cannot auto-authenticate an internal identity', async () => {
  for (const pocAccount of ['external-disabled', 'external-active', 'ordinary-user', 'internal-active', ['noaccess']]) {
    const page = mount({ query: { pocAccount } })
    await page.ready()
    assert.ok(page.navigations.every(target => target.path === '/login'), String(pocAccount))
    assert.ok(!page.navigations.some(target => target === '/agent/permissions'), String(pocAccount))
    assertNoRealIdentity(page)
  }
})

test('disabled POC feature cannot enter internal result pages or authenticate through a real API', async () => {
  const page = mount({ enabled: false, query: { pocAccount: 'internal-disabled' } })
  await page.ready()
  assert.ok(page.navigations.every(target => target.path === '/login'))
  assert.ok(!page.navigations.some(target => target === '/agent/permissions'))
  assertNoRealIdentity(page)
})

test('corrupt internal enable storage stays recoverable and never falls back to real authentication', async () => {
  const local = new Map([[requestKey, 'broken-json']])
  const page = mount({ query: { pocAccount: 'internal-disabled' }, local })
  await page.ready()
  assert.match(page.errorMsg.value, /读取失败/)
  assert.equal(page.navigations.length, 0)
  assertNoRealIdentity(page)
  local.delete(requestKey)
  await page.retry()
  assert.equal(page.navigations[0]?.path, '/account-enable-request')
  assert.equal(page.errorMsg.value, '')
  assertNoRealIdentity(page)
})

test('cancelled automatic navigation reports a retryable error instead of endless loading', async () => {
  const page = mount({ query: { pocAccount: 'noaccess' }, navigationFailure: true })
  await page.ready()
  assert.match(page.errorMsg.value, /重试/)
  assertNoRealIdentity(page)
})

test('returning from an automatic-entry error clears the selected account query', async () => {
  const page = mount({ query: { pocAccount: 'internal-disabled', redirect: '/agent/skills' }, local: new Map([[requestKey, '{}']]) })
  await page.ready(); await page.back()
  assert.equal(page.navigations.at(-1)?.path, '/login')
  assert.equal(page.navigations.at(-1)?.query.pocAccount, undefined)
  assert.equal(page.navigations.at(-1)?.query.mode, 'scenarios')
  assertNoRealIdentity(page)
})

test('the passwordless internal resolver rejects an external identity without reading unrelated state', async () => {
  const page = mount({ query: { mode: 'scenarios' } })
  await page.ready()
  page.itcode.value = 'external-active'
  await page.submitAdfsLogin()
  assert.match(page.errorMsg.value, /外部用户/)
  assertNoRealIdentity(page)
})

test('the removed real ADFS form cannot authenticate a manually supplied ordinary identity', async () => {
  const page = mount({ sandbox: false })
  await page.ready()
  page.itcode.value = 'ordinary-user'
  await page.submitAdfsLogin()
  assert.match(page.errorMsg.value, /仅支持指定演示账号/)
  assertNoRealIdentity(page)
})
