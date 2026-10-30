import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import * as fixtures from '../src/services/pocExternalLogin.ts'

// Run the actual SFC setup and fixture resolver. Only Vue lifecycle/reactivity,
// browser storage, router and the real-login network boundary are substituted.
const source = readFileSync(new URL('../src/views/AdfsLoginView.vue', import.meta.url), 'utf8')
const setup = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
const choicesSource = readFileSync(new URL('../src/services/pocLoginChoices.ts', import.meta.url), 'utf8')
const withoutImports = text => text.replace(/^import .*\n/gm, '').replace(/^export /gm, '')
const setupJs = stripTypeScriptTypes(withoutImports(setup))
const choiceJs = stripTypeScriptTypes(withoutImports(choicesSource))

function mount({ query = {}, sandbox = true, enabled = true, local = new Map(), navigationFailure = false } = {}) {
  const navigations = [], fullNavigations = [], requests = [], mounted = []
  const route = { query, path: '/adfs-login' }
  const storage = { getItem: key => local.get(key) ?? null, setItem: (key, value) => local.set(key, value), removeItem: key => local.delete(key) }
  const router = {
    async replace(target) {
      if (navigationFailure) return { type: 4 }
      navigations.push(target)
      route.path = typeof target === 'string' ? target : target.path
    },
    async push(target) { navigations.push(target) }
  }
  const context = vm.createContext({
    ...fixtures, console, URLSearchParams,
    allowPocLogin: enabled, allowPocSimulation: enabled && sandbox, isPocSandbox: sandbox,
    permissionLabEnabled: false, normalAppBase: '/admin-vue/', pocAppBase: '/admin-vue/poc/', localAdminPassword: '',
    window: { location: { assign: path => fullNavigations.push(path) } },
    ref: value => ({ value }), computed: getter => ({ get value() { return getter() } }), onMounted: callback => mounted.push(callback),
    useRoute: () => route, useRouter: () => router,
    useAppStore: () => ({ user: null, role: null, permissions: [], visibleMenus: [], async loadUserContext() { this.permissions = ['dashboard:view'] } }),
    isPasswordlessLabAccount: () => false, labHeaders: () => ({}),
    pocLocalStorage: storage, pocSessionStorage: storage, APPROVAL_MAIL_ROWS_KEY: 'approvals',
    async fetch(url, options) { requests.push({ url, ...options }); return { ok: true, async json() { return { username: 'real-user' } } } }
  })
  vm.runInContext(choiceJs, context)
  vm.runInContext(setupJs, context)
  const state = vm.runInContext('({ itcode, password, errorMsg, selectPocAccount, submitAdfsLogin, retry: typeof enterPocScenario === "function" ? enterPocScenario : undefined, back: typeof returnToPocSelection === "function" ? returnToPocSelection : undefined })', context)
  return { ...state, navigations, fullNavigations, requests, local, route, async ready() { await Promise.all(mounted.map(callback => callback())) } }
}

test('selected first-access scenario opens its result without a second submit', async () => {
  const page = mount({ query: { pocAccount: 'noaccess' } })
  await page.ready()
  assert.equal(page.navigations[0]?.path, '/access-denied')
  assert.equal(page.navigations[0]?.query.itcode, 'noaccess')
  assert.equal(page.requests.length, 0)
})

test('selected disabled internal scenario opens enable request without a second submit', async () => {
  const page = mount({ query: { pocAccount: 'internal-disabled' } })
  await page.ready()
  assert.equal(page.navigations[0]?.path, '/account-enable-request')
  assert.equal(page.navigations[0]?.query.account, 'internal-disabled')
  assert.equal(page.requests.length, 0)
})

test('choosing an internal scenario on the ADFS page also enters it immediately', async () => {
  const page = mount()
  await page.ready()
  await page.selectPocAccount(fixtures.POC_LOGIN_ACCOUNTS.find(account => account.username === 'noaccess'))
  assert.equal(page.navigations[0]?.path, '/access-denied')
  assert.equal(page.requests.length, 0)
})

test('automatic entry reuses completed enable state instead of replaying the initial disabled result', async () => {
  const local = new Map([[fixtures.POC_ACCOUNT_REQUESTS_KEY, JSON.stringify([{ typeKey: 'enable', targetItcode: 'internal-disabled', statusKey: 'done', nodeType: 'done' }])]])
  const page = mount({ query: { pocAccount: 'internal-disabled' }, local })
  await page.ready()
  assert.equal(page.navigations[0], '/agent/permissions')
  assert.equal(page.requests.length, 0)
})

test('empty, admin, external, unknown and hidden fixture query values never auto-submit', async () => {
  for (const pocAccount of [undefined, 'admin', 'external-disabled', 'external-active', 'ordinary-user', 'internal-active', ['noaccess']]) {
    const page = mount({ query: { pocAccount } })
    await page.ready()
    assert.equal(page.navigations.length, 0, String(pocAccount))
    assert.equal(page.requests.length, 0, String(pocAccount))
  }
})

test('automatic entry is disabled outside the opted-in isolated POC', async () => {
  for (const options of [{ enabled: false }, { sandbox: false }]) {
    const page = mount({ query: { pocAccount: 'noaccess' }, ...options })
    await page.ready()
    assert.equal(page.navigations.length, 0)
    assert.equal(page.requests.length, 0)
  }
})

test('manually entered demo credentials still require the correct password and login type', async () => {
  const page = mount()
  await page.ready()
  page.itcode.value = 'noaccess'
  page.password.value = 'wrong'
  await page.submitAdfsLogin()
  assert.match(page.errorMsg.value, /密码错误/)
  page.itcode.value = 'external-active'
  page.password.value = fixtures.POC_EXTERNAL_PASSWORD
  await page.submitAdfsLogin()
  assert.match(page.errorMsg.value, /外部用户/)
  assert.equal(page.requests.length, 0)
  assert.equal(page.navigations.length, 0)
})

test('corrupt demo storage exposes a recoverable error and never calls real login', async () => {
  const local = new Map([[fixtures.POC_ACCOUNT_REQUESTS_KEY, 'broken-json']])
  const page = mount({ query: { pocAccount: 'internal-disabled' }, local })
  await page.ready()
  assert.match(page.errorMsg.value, /读取失败/)
  assert.equal(page.navigations.length, 0)
  assert.equal(page.requests.length, 0)
  local.delete(fixtures.POC_ACCOUNT_REQUESTS_KEY)
  await page.retry()
  assert.equal(page.navigations[0]?.path, '/account-enable-request')
  assert.equal(page.errorMsg.value, '')
  assert.equal(page.requests.length, 0)
})

test('a cancelled automatic navigation produces a retryable error instead of an endless loading state', async () => {
  const page = mount({ query: { pocAccount: 'noaccess' }, navigationFailure: true })
  await page.ready()
  assert.match(page.errorMsg.value, /重试/)
  assert.equal(page.requests.length, 0)
})

test('returning from an automatic-entry error clears the selected query', async () => {
  const page = mount({ query: { pocAccount: 'internal-disabled', redirect: '/agent/skills' }, local: new Map([[fixtures.POC_ACCOUNT_REQUESTS_KEY, '{}']]) })
  await page.ready()
  await page.back()
  assert.equal(page.navigations.at(-1)?.path, '/login')
  assert.equal(page.navigations.at(-1)?.query.pocAccount, undefined)
})

test('the direct ADFS form keeps real credentials on the existing backend path', async () => {
  const page = mount({ sandbox: false })
  await page.ready()
  assert.equal(page.requests.length, 0)
  page.itcode.value = 'real-user'
  page.password.value = 'test-password'
  await page.submitAdfsLogin()
  assert.equal(page.requests.length, 1)
  assert.equal(page.requests[0].url, '/api/admin/login')
  assert.equal(JSON.parse(page.requests[0].body).loginType, 'adfs')
  assert.equal(page.navigations[0], '/')
})
