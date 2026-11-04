import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import * as fixtures from '../src/services/pocExternalLogin.ts'

const withoutImports = text => text.replace(/^import .*\n/gm, '').replace(/^export /gm, '')
const choices = stripTypeScriptTypes(withoutImports(readFileSync(new URL('../src/services/pocLoginChoices.ts', import.meta.url), 'utf8')))
const routerSource = stripTypeScriptTypes(withoutImports(readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')).replace(/^default router\s*$/m, ''))

// Execute the actual router guard with routing/network boundaries replaced.
// No component is mounted and no real account/session data is available.
function loadGuard({ sandbox = true, enabled = true, user = null } = {}) {
  let guard, storeReads = 0, restores = 0
  const exits = []
  const store = { user, role: null, permissions: [], async loadUserContext() { restores += 1 } }
  const context = vm.createContext({
    ...fixtures, URLSearchParams,
    allowPocLogin: enabled, isPocSandbox: sandbox, normalAppBase: '/admin-vue/', pocAppBase: '/admin-vue/poc/', appBase: sandbox ? '/admin-vue/poc/' : '/admin-vue/', localAdminPassword: '',
    window: { location: { replace: target => exits.push(target), assign: target => exits.push(target) } },
    aiInspectRoutes: [], ACTIVITY_POINTS_MENU: { children: {} }, canUseActivityPoints: () => false, showWorkbenchToast() {},
    useAppStore() { storeReads += 1; return store },
    createWebHistory: base => base,
    createRouter: options => ({ ...options, beforeEach: callback => { guard = callback } })
  })
  vm.runInContext(choices, context)
  vm.runInContext(routerSource, context)
  return { guard, exits, store, stats: () => ({ storeReads, restores }) }
}

test('empty POC login entrances enter the existing isolated demo workbench directly', async () => {
  for (const path of ['/login', '/adfs-login']) {
    const page = loadGuard({ user: 'existing-session-canary' })
    const result = await page.guard({ path, query: {}, meta: { public: true } })
    assert.equal(result, '/agent/permissions')
    assert.equal(page.store.user, 'existing-session-canary')
    assert.deepEqual(page.stats(), { storeReads: 0, restores: 0 })
    assert.deepEqual(page.exits, [])
  }
})

test('invalid or hidden account queries use the fixed demo destination, never the redirect query', async () => {
  for (const pocAccount of ['', 'ordinary-user', 'internal-active', 'external-active', ['noaccess']]) {
    const page = loadGuard()
    assert.equal(await page.guard({ path: '/adfs-login', query: { pocAccount, redirect: '/agent/skills' }, meta: { public: true } }), '/agent/permissions')
    assert.deepEqual(page.stats(), { storeReads: 0, restores: 0 })
  }
})

test('explicit scenario-selection mode keeps the picker and manual scenario form accessible', async () => {
  for (const path of ['/login', '/adfs-login']) {
    const page = loadGuard()
    assert.equal(await page.guard({ path, query: { mode: 'scenarios' }, meta: { public: true } }), true)
  }
})

test('explicit known account scenarios retain their existing selected-account handling', async () => {
  for (const pocAccount of ['noaccess', 'internal-disabled', 'external-disabled', 'admin']) {
    const page = loadGuard()
    assert.equal(await page.guard({ path: '/adfs-login', query: { pocAccount }, meta: { public: true } }), true)
  }
})

test('disabled POC still exits to normal login instead of entering the demo', async () => {
  const page = loadGuard({ enabled: false })
  assert.equal(await page.guard({ path: '/login', query: {}, meta: { public: true } }), false)
  assert.deepEqual(page.exits, ['/admin-vue/login'])
  assert.deepEqual(page.stats(), { storeReads: 0, restores: 0 })
})

test('normal login pages and protected routes retain their existing authentication guard', async () => {
  for (const path of ['/login', '/adfs-login']) {
    const page = loadGuard({ sandbox: false })
    assert.equal(await page.guard({ path, query: {}, meta: { public: true } }), true)
    assert.deepEqual(page.stats(), { storeReads: 1, restores: 0 })
  }
  const page = loadGuard({ sandbox: false })
  const result = await page.guard({ path: '/agent/permissions', fullPath: '/agent/permissions', query: {}, meta: {} })
  assert.equal(result.path, '/login')
  assert.equal(result.query.redirect, '/agent/permissions')
  assert.deepEqual(page.stats(), { storeReads: 1, restores: 1 })
})
