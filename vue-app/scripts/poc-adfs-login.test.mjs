import test from 'node:test'
import assert from 'node:assert/strict'
import { resolvePocAdfsLogin, resolvePocLogin, POC_EXTERNAL_PASSWORD } from '../src/services/pocExternalLogin.ts'

const empty = () => null
test('ADFS simulation is opt-in and never authenticates real or administrator accounts', () => {
  for (const account of ['noaccess', 'internal-disabled', 'internal-active', 'admin', 'ordinary-user']) {
    assert.equal(resolvePocAdfsLogin(account, false, empty), null)
  }
  assert.equal(resolvePocAdfsLogin('admin', true, empty), null)
  assert.equal(resolvePocAdfsLogin('ordinary-user', true, empty), null)
})
test('internal synthetic ADFS needs no password and preserves first access and disabled results', () => {
  assert.equal(resolvePocAdfsLogin('noaccess', true, empty), 'no-access')
  assert.equal(resolvePocAdfsLogin('internal-disabled', true, empty), 'disabled')
  assert.equal(resolvePocAdfsLogin('internal-active', true, empty), 'active')
  assert.equal(resolvePocAdfsLogin('external-disabled', true, empty), 'wrong-login-type')
})
test('ADFS simulation preserves executed enables and never trusts malformed records', () => {
  const done = { typeKey: 'enable', targetItcode: 'internal-disabled', statusKey: 'done', nodeType: 'done' }
  const pending = { ...done, statusKey: 'pending', nodeType: 'business' }
  assert.equal(resolvePocAdfsLogin('internal-disabled', true, () => JSON.stringify([pending, done])), 'active')
  assert.equal(resolvePocAdfsLogin('internal-disabled', true, () => JSON.stringify([pending])), 'disabled')
  for (const raw of ['{broken', '{}']) assert.throws(() => resolvePocAdfsLogin('internal-disabled', true, () => raw))
})
test('the external simulation still requires its own password and login type', () => {
  assert.equal(resolvePocLogin('external-active', '', 'external', true, empty), 'invalid-password')
  assert.equal(resolvePocLogin('external-active', POC_EXTERNAL_PASSWORD, 'external', true, empty), 'active')
  assert.equal(resolvePocLogin('internal-active', POC_EXTERNAL_PASSWORD, 'external', true, empty), 'wrong-login-type')
})
