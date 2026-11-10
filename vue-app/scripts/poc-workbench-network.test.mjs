import test from 'node:test'
import assert from 'node:assert/strict'
import { createPocWorkbenchFetch, isPocWorkbenchApiLink } from '../src/services/pocWorkbenchNetwork.ts'

const origin = 'https://qa.invalid'
const base = '/admin-vue/'
test('full workbench reads only local static resources without auth or redirects', async () => {
  const calls = []
  const fetcher = createPocWorkbenchFetch(async (input, init) => {
    calls.push({ input, init }); return new Response('static')
  }, origin, base)
  for (const url of ['/admin-vue/admin-runtime/workbench-pages.js', '/admin-vue/assets/test.js', '/admin-vue/poc-release-ledger.json']) {
    assert.equal((await fetcher(url)).status, 200)
  }
  await fetcher(new Request(origin + '/admin-vue/admin-runtime/data.json', { headers: { Authorization: 'test-canary' } }))
  assert.equal(calls.length, 4)
  for (const { init } of calls) {
    assert.equal(init.credentials, 'omit')
    assert.equal(init.redirect, 'error')
    assert.equal(new Headers(init.headers).has('authorization'), false)
  }
})
test('full workbench never forwards business API requests or static writes', async () => {
  let calls = 0
  const fetcher = createPocWorkbenchFetch(async () => { calls++; throw new Error('must not forward') }, origin, base)
  for (const [url, method] of [
    ['/api/admin/login', 'POST'], ['/api/admin/me', 'GET'], ['/api/harness/chat', 'POST'],
    ['/api/export', 'GET'], ['/admin-vue/assets/file.js', 'DELETE'],
    ['https://other.invalid/api', 'GET'], ['/admin-vue/admin-runtime/%2F..%2Fapi', 'GET'],
    ['/admin-vue/admin-runtime/../../api/admin/me', 'GET']
  ]) {
    const response = await fetcher(url, { method })
    assert.equal(response.status, 403, url)
    assert.equal((await response.json()).code, 'POC_WORKBENCH_LOCAL_ONLY')
  }
  assert.equal(calls, 0)
})
test('API download link detection is precise and keeps local exports usable', () => {
  assert.equal(isPocWorkbenchApiLink('/api/pipeline/download', origin), true)
  assert.equal(isPocWorkbenchApiLink(origin + '/api/admin/me', origin), true)
  for (const url of ['/admin-vue/portal/home', '/admin-vue/assets/test.csv', 'blob:https://qa.invalid/test', 'https://other.invalid/']) {
    assert.equal(isPocWorkbenchApiLink(url, origin), false)
  }
})
