import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createServer, preview } from 'vite'

const require = createRequire(import.meta.url)
let playwright
for (const candidate of [process.env.PLAYWRIGHT_MODULE_PATH, 'playwright', path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean)) {
  try { playwright = require(candidate); break } catch {}
}
if (!playwright) throw new Error('Playwright required')
const root = fileURLToPath(new URL('../', import.meta.url))
const enabled = process.env.POC_QA_DISABLED !== 'true'
process.env.VITE_AUTH_MODE = 'server'
process.env.VITE_POC_LOGIN_ENABLED = String(enabled)
const built = process.env.POC_QA_OUT_DIR
const server = built
  ? await preview({ root, build: { outDir: built }, preview: { host: '127.0.0.1', port: 0 } })
  : await createServer({ root, server: { host: '127.0.0.1', port: 0 } })
if (!built) await server.listen()
const port = server.httpServer.address().port
const origin = `http://127.0.0.1:${port}`
const normal = origin + '/admin-vue'
const demo = normal + '/poc'
const out = path.join(os.tmpdir(), 'poc-isolation-qa' + (built ? '-build' : ''))
await fs.mkdir(out, { recursive: true })
const browser = await playwright.chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
context.setDefaultTimeout(15000)
const api = [], errors = []
let authenticated = false, failLogin = false
context.on('page', tab => tab.on('pageerror', error => errors.push(error.message)))
await context.route('**/api/**', async route => {
  const request = route.request(), pathname = new URL(request.url()).pathname
  api.push({ path: pathname, method: request.method(), body: request.postData() })
  if (pathname === '/api/admin/login') {
    if (failLogin) return route.abort('connectionrefused')
    const credentials = request.postDataJSON()
    authenticated = credentials.username === 'admin' && credentials.password === 'QA-only-password'
    return route.fulfill({ status: authenticated ? 200 : 401, json: authenticated ? { username: 'admin' } : { error: 'QA 密码错误' } })
  }
  if (pathname === '/api/admin/me') return route.fulfill({ status: authenticated ? 200 : 401, json: authenticated ? { admin: { username: 'admin' } } : { error: 'not logged in' } })
  if (pathname === '/api/harness/menu') return route.fulfill({ json: { menus: ['dashboard'], permissions: ['*'] } })
  return route.fulfill({ json: {} })
})
const page = await context.newPage()
const prefix = 'leaibot-poc-demo:'
const requestKey = prefix + 'leaibot-account-request-status-rows'
try {
  await page.goto(normal + '/login')
  if (!enabled) {
    assert.equal(await page.getByRole('combobox').count(), 0)
    await page.goto(demo + '/adfs-login?pocAccount=noaccess')
    await page.waitForURL(normal + '/login')
    await page.goto(normal + '/login?loginType=external&pocAccount=external-disabled')
    assert.equal(await page.getByLabel('用户名', { exact: true }).inputValue(), '')
    await page.getByLabel('用户名', { exact: true }).fill('external-disabled')
    await page.locator('input[type=password]').fill('Poc123456!')
    await page.getByRole('button', { name: '登录工作台', exact: true }).click()
    await page.getByText('QA 密码错误', { exact: true }).waitFor()
    assert.equal(api.at(-1).path, '/api/admin/login', 'A demo-shaped username does not bypass real authentication when disabled')
    console.log('Disabled feature: no selector/autofill, direct demo URL denied, ordinary login still uses the backend')
  } else {
    await page.getByRole('combobox').click()
    assert.equal(await page.getByRole('option').count(), 4)
    await page.getByRole('option', { name: '管理员 · 正常登录 admin' }).click()
    assert.equal(await page.locator('input[type=password]').inputValue(), '', 'Server build never autofills a real admin password')
    assert.equal(api.length, 0, 'Selecting admin must not log in')
    await page.locator('input[type=password]').fill('wrong')
    await page.getByRole('button', { name: '登录工作台', exact: true }).click()
    await page.getByText('QA 密码错误', { exact: true }).waitFor()
    failLogin = true
    await page.getByRole('button', { name: '登录工作台', exact: true }).click()
    await page.getByText('登录服务暂不可用，请稍后重试', { exact: true }).waitFor()
    failLogin = false
    await page.goto(normal + '/login?loginType=external&redirect=/agent/permissions')
    await page.getByRole('combobox').fill('admin')
    await page.locator('input[type=password]').fill('QA-only-password')
    await page.getByRole('button', { name: '登录工作台', exact: true }).click()
    await page.waitForURL(normal + '/agent/permissions')
    assert.ok(api.some(row => row.path === '/api/admin/me'))
    assert.ok(api.some(row => row.path === '/api/harness/menu'))
    console.log('Real login contract: selection, rejection, network failure and success passed with intercepted test backend')

    // A real-session-shaped cookie is present throughout the demo. No real credentials are used.
    await context.addCookies([{ name: 'connect.sid', value: 'QA-session-canary', url: origin }])
    await page.goto(normal + '/login')
    await page.evaluate(() => {
      localStorage.setItem('leaibot-first-access-applications', '[{"id":"ordinary-first-access"}]')
      localStorage.setItem('leaibot-account-request-status-rows', '[{"id":"ordinary-enable"}]')
      localStorage.setItem('leaibot-approval-mail-mock-rows', '[{"id":"ordinary-mail"}]')
      localStorage.setItem('preview_user', 'must-not-become-admin')
      sessionStorage.setItem('leaibot-disabled-login-account', 'ordinary-account')
    })
    const original = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }))
    const cookies = await context.cookies()
    const beforeDemoApi = api.length
    for (const entrance of ['/login', '/adfs-login']) {
      await page.goto(demo + entrance)
      await page.waitForURL(demo + '/agent/permissions')
      assert.equal(await page.locator('.adfs-form, #login-screen').count(), 0, 'Default POC entrance skips login forms')
      assert.equal(api.length, beforeDemoApi, 'Default POC entry never authenticates a real account')
    }
    await page.getByRole('link', { name: '选择演示场景', exact: true }).click()
    await page.waitForURL(demo + '/login?mode=scenarios')
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: '内部人员 · 首次登录申请权限 noaccess' }).click()
    await page.waitForURL(demo + '/access-denied?**')
    assert.equal(api.length, beforeDemoApi, 'Selecting an internal scenario enters its POC result without authenticating')
    assert.equal(await page.locator('.adfs-form').count(), 0, 'The internal scenario has no second login form')
    await page.getByRole('heading', { name: '当前账号暂无工作台权限，请申请访问权限。', exact: true }).waitFor()
    await page.getByRole('combobox', { name: '业务负责人', exact: true }).selectOption('zhangjq4')
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    await page.getByRole('checkbox', { name: 'leaibot-cn', exact: true }).check()
    await page.getByRole('button', { name: '添加角色', exact: true }).click()
    await page.locator('.role-picker-modal').getByRole('checkbox').first().check()
    await page.locator('.role-picker-modal').getByRole('button', { name: '确认', exact: true }).click()
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    await page.getByRole('button', { name: '提交申请', exact: true }).click()
    await page.getByRole('heading', { name: '权限申请已进入审批', exact: true }).waitFor()
    assert.equal(await page.evaluate(prefix => JSON.parse(localStorage.getItem(prefix + 'leaibot-first-access-applications')).length, prefix), 1)
    const firstAccess = await page.evaluate(prefix => JSON.parse(localStorage.getItem(prefix + 'leaibot-first-access-applications'))[0], prefix)
    const approvalKey = prefix + 'leaibot-approval-mail-mock-rows'
    await page.goto(demo + '/agent/permissions?module=approval&ticket=' + firstAccess.id + '&approver=sunll1&viewer=approver&identity=applicant-manager')
    await page.getByRole('button', { name: '审批', exact: true }).click()
    await page.getByRole('button', { name: '同意', exact: true }).click()
    await page.getByRole('button', { name: '提交审批', exact: true }).click()
    await page.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key)).find(row => row.id === id)?.nodeType === 'business', { key: approvalKey, id: firstAccess.id })
    // A completed manager approval is still insufficient to resolve first access.
    await page.goto(demo + '/adfs-login?pocAccount=noaccess')
    await page.waitForURL(demo + '/access-denied?**')
    await page.getByRole('heading', { name: '权限申请已进入审批', exact: true }).waitFor()
    await page.goto(demo + '/agent/permissions?module=approval&ticket=' + firstAccess.id + '&approver=zhangjq4&viewer=approver&identity=business-owner:zhangjq4')
    await page.getByRole('button', { name: '审批', exact: true }).click()
    await page.getByRole('button', { name: '同意', exact: true }).click()
    await page.locator('.approval-business-form button').first().click()
    await page.getByRole('button', { name: '提交审批', exact: true }).click()
    await page.waitForFunction(({ key, id }) => {
      const row = JSON.parse(localStorage.getItem(key)).find(item => item.id === id)
      return row?.statusKey === 'done' && row.nodeType === 'done'
        && row.approvalLogs.some(log => log.action === 'execute-success' && log.operator === 'system')
    }, { key: approvalKey, id: firstAccess.id })
    await page.goto(demo + '/adfs-login?pocAccount=noaccess')
    await page.waitForURL(demo + '/agent/permissions')
    assert.equal(api.length, beforeDemoApi, 'Executed first-access relogin stays inside the POC without backend authentication')

    await page.getByRole('link', { name: '选择演示场景', exact: true }).click()
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: '内部人员 · 账号被禁用 internal-disabled' }).click()
    await page.waitForURL(demo + '/account-enable-request?**')
    await page.locator('.account-enable-flow textarea').fill('隔离演示：申请启用')
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    await page.getByRole('button', { name: '提交申请', exact: true }).click()
    await page.waitForURL(demo + '/account-request/status?**')
    const request = await page.evaluate(key => JSON.parse(localStorage.getItem(key))[0], requestKey)
    await page.goto(demo + '/agent/permissions?module=approval&ticket=' + request.id + '&approver=sunzh4&viewer=approver&identity=system-admin')
    await page.getByRole('button', { name: '审批', exact: true }).click()
    await page.getByRole('button', { name: '同意', exact: true }).click()
    await page.getByRole('button', { name: '提交审批', exact: true }).click()
    await page.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key)).find(row => row.id === id)?.statusKey === 'done', { key: requestKey, id: request.id })
    await page.goto(demo + '/adfs-login?pocAccount=internal-disabled')
    await page.waitForURL(demo + '/agent/permissions')

    await page.goto(demo + '/login?loginType=external&pocAccount=external-disabled')
    await page.getByRole('button', { name: '登录工作台', exact: true }).click()
    await page.getByText('当前账号已被禁用，请联系对应的联想业务接口人申请启用。', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: '申请启用账号', exact: true }).count(), 0)
    await page.getByRole('combobox').fill('admin')
    await page.locator('input[type=password]').fill('not-a-real-secret')
    await page.getByRole('button', { name: '登录工作台', exact: true }).click()
    await page.getByText('该入口仅支持指定演示账号。真实账号请返回正常登录。', { exact: true }).waitFor()
    assert.equal(api.length, beforeDemoApi, 'Demo must not call any backend, including with an existing admin cookie')
    assert.deepEqual(await context.cookies(), cookies, 'Demo must not clear/replace the real session')
    const after = await page.evaluate(prefix => ({ local: Object.fromEntries(Object.entries(localStorage).filter(([key]) => !key.startsWith(prefix))), session: Object.fromEntries(Object.entries(sessionStorage).filter(([key]) => !key.startsWith(prefix))) }), prefix)
    assert.deepEqual(after, original, 'Normal local/session records are unchanged')
    console.log('First access final execution/relogin, enable approval/relogin, external-disabled and session/data isolation passed')

    // Hand-typed credentials retain their original password and login-type checks.
    await page.goto(demo + '/login?mode=scenarios')
    await page.getByRole('combobox').fill('noaccess')
    await page.locator('input[type=password]').fill('wrong')
    await page.getByRole('button', { name: '登录工作台', exact: true }).click()
    await page.getByText('用户名或密码错误', { exact: true }).waitFor()
    await page.getByRole('combobox').fill('external-active')
    await page.locator('input[type=password]').fill('Poc123456!')
    await page.getByRole('button', { name: '登录工作台', exact: true }).click()
    await page.getByText('该演示账号属于外部用户，请切换外部用户登录。', { exact: true }).waitFor()
    await page.evaluate(key => localStorage.setItem(key, 'broken-json'), requestKey)
    await page.goto(demo + '/adfs-login?pocAccount=internal-disabled')
    await page.getByText('演示账号状态读取失败，请检查浏览器存储后重试。', { exact: true }).waitFor()
    assert.equal(await page.locator('.adfs-form').count(), 0, 'A failed automatic entry does not restore the redundant form')
    await page.getByRole('button', { name: '返回选择', exact: true }).waitFor()
    await page.evaluate(key => localStorage.removeItem(key), requestKey)
    await page.getByRole('button', { name: '重试', exact: true }).click()
    await page.waitForURL(demo + '/account-enable-request?**')
    assert.equal(api.length, beforeDemoApi, 'Demo error paths never fall back to real APIs')

    await page.goto(demo + '/login?loginType=external&mode=scenarios')
    const combo = page.getByRole('combobox')
    await combo.focus()
    await combo.press('ArrowUp')
    await combo.press('ArrowUp')
    await combo.press('Enter')
    assert.equal(await combo.inputValue(), 'external-disabled')
    assert.equal(await combo.getAttribute('aria-expanded'), 'false')
    await combo.click()
    await combo.press('Tab')
    assert.equal(await combo.getAttribute('aria-expanded'), 'false')
    await combo.click()
    await page.locator('.login-title').click()
    assert.equal(await combo.getAttribute('aria-expanded'), 'false')

    for (const [width, height] of [[1440, 900], [1280, 720], [390, 844]]) {
      await page.setViewportSize({ width, height })
      await page.goto(demo + '/login?mode=scenarios')
      await page.getByRole('combobox').click()
      assert.equal(await page.getByRole('option').count(), 4)
      const geometry = await page.locator('.poc-account-popup').boundingBox()
      assert.ok(geometry.x >= 0 && geometry.x + geometry.width <= width + 1)
      assert.ok(geometry.y >= 0 && geometry.y + geometry.height <= height + 1, 'Options stay in viewport')
      const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(el => ({ tag: el.tagName, class: el.className, width: el.getBoundingClientRect().width, minWidth: getComputedStyle(el).minWidth })))
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), JSON.stringify({ width, overflow }))
      await page.screenshot({ path: path.join(out, 'login-' + width + '.png'), fullPage: true })
      await page.getByRole('combobox').press('Escape')
      assert.equal(await page.getByRole('option').count(), 0)
    }
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.getByRole('link', { name: '返回正常登录', exact: true }).click()
    await page.waitForURL(normal + '/login?**')
    assert.equal(await page.locator('input[type=password]').inputValue(), '')
    // A stale legacy preview marker never unlocks the actual workbench.
    authenticated = false
    await page.goto(normal + '/agent/permissions')
    await page.waitForURL(normal + '/login?**')
    assert.deepEqual(errors, [])
    console.log('Responsive picker, keyboard, return-to-normal and legacy preview rejection passed. Screenshots: ' + out)
  }
} catch (error) {
  await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true })
  console.error('Failed at', page.url())
  throw error
} finally {
  await browser.close()
  if (built) await new Promise(resolve => server.httpServer.close(resolve))
  else await server.close()
}
