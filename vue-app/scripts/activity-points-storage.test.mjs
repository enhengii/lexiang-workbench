import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { seedActivities, initialRecords, TODAY } from '../src/services/activityPoints.ts'

const vueStub = `data:text/javascript,${encodeURIComponent(`
  export const reactive = value => value
  export function watch(value, callback, options) {
    if (options?.immediate) callback(value)
  }
`)}`
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'vue' && context.parentURL?.includes('/useActivityPointsDemo.ts'))
      return nextResolve(vueStub, context)
    if (specifier === '@/services/activityPoints')
      return nextResolve(new URL('../src/services/activityPoints.ts', import.meta.url).href, context)
    if (
      ['./activityPoints', './activityPointsStatistics'].includes(specifier) &&
      /\/(activityPointsLedger|activityPointsStatistics)\.ts$/.test(context.parentURL || '')
    )
      return nextResolve(new URL(`${specifier}.ts`, context.parentURL).href, context)
    return nextResolve(specifier, context)
  }
})

const { buildActivityPointsLedger } = await import('../src/services/activityPointsLedger.ts')
const { buildPointsAccounts } = await import('../src/services/pointsAccounts.ts')
const storageKey = 'portal.activity-points.demo.v1'
const snapshot = () => ({
  version: 1,
  activities: structuredClone(seedActivities),
  records: initialRecords(),
  date: TODAY
})
let sequence = 0

// Load the real module afresh; only Vue's browser subscription primitives are replaced.
async function loadStored(raw) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const values = new Map([[storageKey, raw]])
  const writes = []
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { writes.push(['set', key]); values.set(key, value) },
      removeItem: key => { writes.push(['remove', key]); values.delete(key) },
      clear: () => { writes.push(['clear']); values.clear() }
    }
  })
  try {
    const url = new URL('../src/views/points/useActivityPointsDemo.ts', import.meta.url)
    url.searchParams.set('storageTest', String(++sequence))
    const { useActivityPointsDemo } = await import(url.href)
    return { ...useActivityPointsDemo(), values, writes }
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
}

for (const [name, corrupt] of [
  ['missing time', record => { delete record.time }],
  ['non-string account', record => { record.account = 123 }],
  ['missing transaction', record => { delete record.transaction }],
  ['non-string batch', record => { record.batch = 123 }]
]) {
  test(`incomplete saved points record (${name}) falls back before ledger/account rendering`, async () => {
    const saved = snapshot()
    corrupt(saved.records[0])
    const raw = JSON.stringify(saved)
    const loaded = await loadStored(raw)
    assert.ok(loaded.storageNotice.message, 'invalid records must show the existing fallback notice')
    assert.deepEqual(loaded.state.records, initialRecords())
    assert.doesNotThrow(() => buildPointsAccounts(buildActivityPointsLedger(
      loaded.state.activities, loaded.state.records, loaded.state.date
    )))
    assert.equal(loaded.values.get(storageKey), raw)
    assert.deepEqual(loaded.writes, [], 'loading must preserve the original saved data')
  })
}

test('complete saved points records retain their actual credited account and values', async () => {
  const saved = snapshot()
  Object.assign(saved.records[0], {
    account: 'LID-SAVED-ACCOUNT', points: 12345,
    time: '2026-09-16 10:23:00', transaction: 'SAVED-TX-001', batch: 'SAVED-BATCH-001'
  })
  const raw = JSON.stringify(saved)
  const loaded = await loadStored(raw)
  assert.equal(loaded.storageNotice.message, '')
  assert.deepEqual(loaded.state, saved)
  assert.equal(loaded.state.records[0].account, 'LID-SAVED-ACCOUNT')
  assert.equal(loaded.state.records[0].points, 12345)
  assert.equal(loaded.values.get(storageKey), raw)
  assert.deepEqual(loaded.writes, [])
})

test('invalid JSON falls back without overwriting or removing the original storage', async () => {
  const raw = '{incomplete original points data'
  const loaded = await loadStored(raw)
  assert.ok(loaded.storageNotice.message)
  assert.deepEqual(loaded.state.records, initialRecords())
  assert.equal(loaded.values.get(storageKey), raw)
  assert.deepEqual(loaded.writes, [])
})
