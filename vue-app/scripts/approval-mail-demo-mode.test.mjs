import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(path.join(root, 'src/config/runtimeMode.ts'), 'utf8')
const compiled = ts.transpileModule(source.replaceAll('import.meta.env', 'runtimeEnvironment'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText

const isolationExports = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'src/services/pocIsolation.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, { exports: isolationExports })

function runtime({ mode, dev = false, hostname, hasWindow = true, pathname = '/admin-vue/login', lab = 'false', pocLogin }) {
  const context = {
    exports: {},
    require: name => { assert.equal(name, '@/services/pocIsolation'); return isolationExports },
    runtimeEnvironment: { DEV: dev, BASE_URL: '/admin-vue/', VITE_PERMISSION_LAB: lab, ...(pocLogin === undefined ? {} : { VITE_POC_LOGIN_ENABLED: pocLogin }), ...(mode === undefined ? {} : { VITE_AUTH_MODE: mode }) }
  }
  if (hasWindow) context.window = { location: { hostname, pathname } }
  vm.runInNewContext(compiled, context)
  return context.exports
}

test('NEW enables approval mail demo without enabling preview authentication', () => {
  const state = runtime({ mode: 'server', hostname: 'new.leaibot.cn' })
  assert.equal(state.AUTH_MODE, 'server')
  assert.equal(state.allowPreviewAuth, false)
  assert.equal(state.allowApprovalMailDemo, true)
})

test('production defaults retain server authentication while allowing NEW approval demo', () => {
  const state = runtime({ hostname: 'new.leaibot.cn' })
  assert.equal(state.AUTH_MODE, 'server')
  assert.equal(state.allowPreviewAuth, false)
  assert.equal(state.allowApprovalMailDemo, true)
})

test('formal enables approval mail demo without enabling preview authentication', () => {
  const state = runtime({ mode: 'server', hostname: 'leaibot.cn' })
  assert.equal(state.AUTH_MODE, 'server')
  assert.equal(state.allowPreviewAuth, false)
  assert.equal(state.allowApprovalMailDemo, true)
})

test('formal production defaults retain server authentication while allowing approval demo', () => {
  const state = runtime({ hostname: 'leaibot.cn' })
  assert.equal(state.AUTH_MODE, 'server')
  assert.equal(state.allowPreviewAuth, false)
  assert.equal(state.allowApprovalMailDemo, true)
})

for (const hostname of ['localhost', '127.0.0.1', 'new.leaibot.cn.example.com', 'not-new.leaibot.cn', 'leaibot.cn.example.com', 'not-leaibot.cn', 'www.leaibot.cn']) {
  test(`server approval demo stays disabled on ${hostname}`, () => {
    const state = runtime({ mode: 'server', hostname })
    assert.equal(state.allowPreviewAuth, false)
    assert.equal(state.allowApprovalMailDemo, false)
  })
}

test('server execution without a browser fails closed', () => {
  const state = runtime({ mode: 'server', hasWindow: false })
  assert.equal(state.allowPreviewAuth, false)
  assert.equal(state.allowApprovalMailDemo, false)
})

test('explicit preview retains the existing local POC behavior', () => {
  const state = runtime({ mode: 'preview', hostname: 'localhost' })
  assert.equal(state.allowPreviewAuth, true)
  assert.equal(state.allowApprovalMailDemo, true)
})

test('development default preview remains unchanged', () => {
  const state = runtime({ dev: true, hostname: 'localhost' })
  assert.equal(state.AUTH_MODE, 'preview')
  assert.equal(state.allowPreviewAuth, true)
  assert.equal(state.allowApprovalMailDemo, true)
})

test('an explicit server mode still overrides the development preview default', () => {
  const state = runtime({ mode: 'server', dev: true, hostname: 'new.leaibot.cn' })
  assert.equal(state.AUTH_MODE, 'server')
  assert.equal(state.allowPreviewAuth, false)
  assert.equal(state.allowApprovalMailDemo, true)
})
for (const hostname of ['new.leaibot.cn', 'leaibot.cn']) {
  test(`normal server approval remains available with the demo picker disabled on ${hostname}`, () => {
    const state = runtime({ mode: 'server', hostname, pocLogin: 'false' })
    assert.equal(state.allowPocLogin, false)
    assert.equal(state.allowPocSimulation, false)
    assert.equal(state.allowApprovalMailDemo, true)
    assert.equal(state.allowPreviewAuth, false)
  })
}
test('production build cannot activate the database lab', () => {
  const state = runtime({ mode: 'server', hostname: 'localhost', lab: 'true' })
  assert.equal(state.permissionLabEnabled, false)
  assert.equal(state.allowApprovalMailDemo, false)
})
test('development lab supports isolated approval while retaining server authentication', () => {
  const state = runtime({ mode: 'preview', dev: true, hostname: 'localhost', lab: 'true' })
  assert.equal(state.permissionLabEnabled, true)
  assert.equal(state.AUTH_MODE, 'server')
  assert.equal(state.allowPreviewAuth, false)
  assert.equal(state.allowApprovalMailDemo, true)
})
test('POC sandbox supports isolated approval only when its login demo is enabled', () => {
  const state = runtime({ mode: 'server', dev: true, hostname: 'localhost', pathname: '/admin-vue/poc/login' })
  assert.equal(state.isPocSandbox, true)
  assert.equal(state.allowPocSimulation, true)
  assert.equal(state.allowApprovalMailDemo, true)
  assert.equal(state.allowPreviewAuth, false)
  const disabled = runtime({ mode: 'server', hostname: 'leaibot.cn', pathname: '/admin-vue/poc/login', pocLogin: 'false' })
  assert.equal(disabled.allowPocSimulation, false)
  assert.equal(disabled.allowApprovalMailDemo, false)
})
