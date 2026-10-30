import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))
const base = process.env.PERMISSION_QA_BASE_URL || 'http://127.0.0.1:5174/admin-vue'
const output = path.join(os.tmpdir(), 'permission-review-1009-qa')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const errors = []
const measurements = []
const disabledMessage = '当前账号已被禁用，请联系对应的联想业务接口人申请启用。'
async function setup(width = 1440, height = 900) {
  const context = await browser.newContext({ viewport: { width, height } })
  context.setDefaultTimeout(10000)
  await context.route('**/api/admin/me', route => route.fulfill({ status: 401, body: '{}' }))
  context.on('page', tab => tab.on('pageerror', error => errors.push(error.message)))
  return { context, page: await context.newPage() }
}
async function capture(page, name) {
  const geometry = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }))
  assert.ok(geometry.overflow <= 1, name + ': ' + JSON.stringify(geometry))
  measurements.push({ name, ...geometry })
  await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true })
}
try {
  for (const [width, height] of [[1440, 900], [1280, 720], [390, 844]]) {
    const { context, page } = await setup(width, height)
    await page.goto(base + '/login?loginType=external')
    await page.getByRole('combobox').fill('external-disabled')
    await page.locator('input[type=password]').fill('wrong')
    await page.getByRole('button', { name: '登录工作台', exact: true }).click()
    await page.getByText('用户名或密码错误', { exact: true }).waitFor()
    await page.locator('input[type=password]').fill('Poc123456!')
    await page.getByRole('button', { name: '登录工作台', exact: true }).click()
    await page.getByText(disabledMessage, { exact: true }).waitFor()
    for (const name of ['申请启用账号', '忘记密码', '创建账号']) assert.equal(await page.getByRole('button', { name, exact: true }).count(), 0)
    assert.equal(await page.evaluate(() => sessionStorage.getItem('leaibot-disabled-login-account')), null)
    await capture(page, 'external-disabled-' + width)
    await page.goto(base + '/account-enable-request?account=external-disabled&loginType=external')
    await page.getByText(disabledMessage, { exact: true }).waitFor()
    assert.equal(await page.locator('.account-enable-flow').count(), 0)
    await capture(page, 'external-direct-enable-' + width)
    await page.goto(base + '/access-denied?itcode=external-noaccess&userType=external')
    await page.getByText('请联系对应的联想业务接口人处理。', { exact: true }).waitFor()
    assert.equal(await page.locator('form').count(), 0)
    assert.equal(await page.getByRole('button', { name: '提交申请', exact: true }).count(), 0)
    assert.equal(await page.evaluate(() => localStorage.getItem('leaibot-first-access-applications')), null)
    await capture(page, 'external-direct-permission-' + width)

    // Backend disabled response must have the same behavior as the synthetic fixture.
    await page.route('**/api/admin/login', route => route.fulfill({ status: 423, contentType: 'application/json', body: JSON.stringify({ code: 'ACCOUNT_DISABLED' }) }))
    await page.goto(base + '/login?loginType=external')
    await page.getByRole('combobox').fill('qa-server-disabled')
    await page.locator('input[type=password]').fill('qa-not-a-real-password')
    await page.getByRole('button', { name: '登录工作台', exact: true }).click()
    await page.getByText(disabledMessage, { exact: true }).waitFor()
    await page.goto(base + '/adfs-login')
    await page.getByRole('combobox').fill('qa-server-internal-disabled')
    await page.locator('input[type=password]').fill('qa-not-a-real-password')
    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    await page.waitForURL('**/account-enable-request?**')
    assert.equal(await page.getByLabel('被申请人 ITCode', { exact: true }).inputValue(), 'qa-server-internal-disabled')
    await capture(page, 'internal-auto-enable-' + width)
    await context.close()
  }

  const { context, page } = await setup()
  await page.goto(base + '/adfs-login?pocAccount=noaccess')
  await page.waitForURL('**/access-denied?**')
  await page.getByRole('heading', { name: '当前账号暂无工作台权限，请申请访问权限。', exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: '组织管理', exact: true }).count(), 0)
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await page.getByText('请选择一位业务负责人。', { exact: true }).waitFor()
  await page.getByRole('combobox', { name: '业务负责人', exact: true }).selectOption('zhangjq4')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await page.getByRole('checkbox', { name: 'leaibot-cn', exact: true }).check()
  await page.getByRole('button', { name: '添加角色', exact: true }).click()
  const roleDialog = page.getByRole('dialog', { name: '添加角色', exact: true })
  await roleDialog.locator('.role-picker-check input').first().check()
  await roleDialog.getByRole('button', { name: '确认', exact: true }).click()
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  assert.match(await page.locator('.approval-flow').innerText(), /申请人直线经理/)
  await page.getByRole('button', { name: '提交申请', exact: true }).click()
  await page.getByRole('heading', { name: '权限申请已进入审批', exact: true }).waitFor()
  const rows = await page.evaluate(() => JSON.parse(localStorage.getItem('leaibot-first-access-applications')))
  assert.equal(rows.length, 1)
  assert.equal(rows[0].personType, 'internal')
  assert.equal(rows[0].businessApprover, 'zhangjq4')
  await capture(page, 'internal-first-application')

  await page.goto(base + '/agent/permissions?module=orgs')
  await page.locator('.current-card').getByRole('button', { name: '详情', exact: true }).click()
  const org = page.locator('.org-detail-modal')
  await org.waitFor()
  assert.doesNotMatch(await org.innerText(), /AI-PLATFORM|创建人|Code/)
  await org.getByRole('button', { name: '编辑信息', exact: true }).click()
  const editor = page.locator('.org-editor-modal')
  await editor.waitFor()
  assert.doesNotMatch(await editor.innerText(), /创建人|Code/)
  await capture(page, 'organization-edit')
  await editor.getByRole('button', { name: '保存', exact: true }).click()
  await editor.waitFor({ state: 'detached' })
  await org.getByRole('button', { name: '添加成员', exact: true }).waitFor()
  await page.goto(base + '/agent/permissions?module=users')
  await page.getByRole('button', { name: '新增用户', exact: true }).click()
  const user = page.locator('.user-editor-modal')
  await user.waitFor()
  assert.doesNotMatch(await user.innerText(), /有效期|有效时间/)
  await user.getByText('内部人员', { exact: true }).waitFor()
  await user.getByText('外部人员', { exact: true }).waitFor()
  await capture(page, 'user-create-fields')
  await context.close()
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ result: 'passed', measurements, screenshots: output, errors }, null, 2))
} finally { await browser.close() }
