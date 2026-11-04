import test, { mock } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import * as points from '../src/services/activityPoints.ts'
import type { Activity, Order, RecordItem } from '../src/services/activityPoints.ts'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      ['./activityPoints', './activityPointsStatistics'].includes(specifier) &&
      /\/(activityPointsLedger|activityPointsStatistics)\.ts$/.test(context.parentURL || '')
    )
      return nextResolve(new URL(`${specifier}.ts`, context.parentURL).href, context)
    return nextResolve(specifier, context)
  }
})

// Only the hardcoded order generator is replaced; calculation and record selection stay real.
const orderFixtures = new Map<string, Order[]>()
mock.module('../src/services/activityPoints.ts', {
  namedExports: {
    ...points,
    ordersFor: (activity: Activity) => orderFixtures.get(activity.id) || points.ordersFor(activity)
  }
})

const loadLedger = () => import('../src/services/activityPointsLedger.ts')
const makeActivity = (id = 'ACT-LEDGER-A'): Activity => ({
  ...structuredClone(points.seedActivities[0]),
  id,
  name: `演示活动 ${id}`,
  end: '2026-09-12',
  tiers: [{ threshold: 1, multiplier: 5 }]
})
const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  ...points.ordersFor(points.seedActivities[0])[0],
  id: 'DEMO-ORDER-1',
  ...overrides
})
const makeRecord = (
  activity: Activity,
  order: Order,
  overrides: Partial<RecordItem> = {}
): RecordItem => ({
  key: `${activity.id}:${order.id}`,
  orderId: order.id,
  account: order.account,
  points: 600,
  status: '成功',
  time: '2026-11-04 10:00:00',
  transaction: 'DEMO-TRANSACTION-1',
  batch: 'DEMO-BATCH',
  attempts: 1,
  reason: '',
  history: ['演示成功记录'],
  ...overrides
})

await test('only actual successful awards become ledger entries', async () => {
  const { buildActivityPointsLedger } = await loadLedger()
  const activity = makeActivity()
  const orders = [makeOrder(), makeOrder({ id: 'DEMO-ORDER-2' }), makeOrder({ id: 'DEMO-ORDER-3' })]
  orderFixtures.set(activity.id, orders)
  const rows = buildActivityPointsLedger(
    [activity],
    [
      makeRecord(activity, orders[0]),
      makeRecord(activity, orders[1], { status: '失败', transaction: '' })
    ],
    '2026-11-05'
  )
  assert.equal(rows.length, 1)
  assert.deepEqual(
    [rows[0].orderId, rows[0].account, rows[0].points, rows[0].currency, rows[0].source],
    ['DEMO-ORDER-1', 'LID-DEMO-A01', 600, '企业积分', '活动积分']
  )
  assert.deepEqual([rows[0].channel, rows[0].ruleType], ['企业购渠道', '活动积分'])
})

await test('a later failure cannot replace the latest successful award', async () => {
  const { buildActivityPointsLedger } = await loadLedger()
  const activity = makeActivity()
  const order = makeOrder()
  orderFixtures.set(activity.id, [order])
  const rows = buildActivityPointsLedger(
    [activity],
    [
      makeRecord(activity, order, { time: '2026-11-03 10:00:00' }),
      makeRecord(activity, order, {
        points: 700,
        time: '2026-11-04 10:00:00',
        transaction: 'DEMO-SUCCESS-2'
      }),
      makeRecord(activity, order, {
        points: 750,
        time: '2026-11-04 10:00:00',
        transaction: 'DEMO-SUCCESS-3',
        attempts: 2
      }),
      makeRecord(activity, order, {
        status: '失败',
        time: '2026-11-05 10:00:00',
        points: 999,
        transaction: ''
      })
    ],
    '2026-11-05'
  )
  assert.equal(rows.length, 1)
  assert.deepEqual([rows[0].points, rows[0].transaction], [750, 'DEMO-SUCCESS-3'])
})

await test('successful actual values survive a later calculation or account mismatch', async () => {
  const { buildActivityPointsLedger } = await loadLedger()
  const activity = makeActivity()
  const order = makeOrder({ paidBase: null })
  orderFixtures.set(activity.id, [order])
  const rows = buildActivityPointsLedger(
    [activity],
    [makeRecord(activity, order, { points: 735, account: 'LID-DEMO-ACTUALLY-CREDITED' })],
    '2026-11-05'
  )
  assert.equal(rows.length, 1)
  assert.deepEqual([rows[0].points, rows[0].account], [735, 'LID-DEMO-ACTUALLY-CREDITED'])
})

await test('multiple activities stay separate and duplicate activity input does not repeat a ledger', async () => {
  const { buildActivityPointsLedger } = await loadLedger()
  const first = makeActivity('ACT-LEDGER-FIRST')
  const second = makeActivity('ACT-LEDGER-SECOND')
  const order = makeOrder()
  orderFixtures.set(first.id, [order])
  orderFixtures.set(second.id, [order])
  const rows = buildActivityPointsLedger(
    [first, second, first],
    [makeRecord(first, order), makeRecord(second, order, { points: 400 })],
    '2026-11-05'
  )
  assert.equal(rows.length, 2)
  assert.equal(new Set(rows.map((row) => row.key)).size, 2)
  assert.deepEqual(
    rows.map((row) => [row.activityId, row.points]),
    [
      ['ACT-LEDGER-FIRST', 600],
      ['ACT-LEDGER-SECOND', 400]
    ]
  )
})

await test('one multi-SKU award preserves net quantity and refund amount without duplicated points', async () => {
  const { buildActivityPointsLedger } = await loadLedger()
  const activity = makeActivity()
  const first = makeOrder({ returned: 2, refund: 10000 })
  const second = makeOrder({
    sku: 'DEMO-TC90',
    quantity: 4,
    receipt: 20000,
    returned: 1,
    refund: 5000,
    paidBase: 200,
    paidMember: 400
  })
  orderFixtures.set(activity.id, [first, second, first])
  const successful = makeRecord(activity, first, { points: 700 })
  const rows = buildActivityPointsLedger([activity], [successful, successful], '2026-11-05')
  assert.equal(rows.length, 1)
  assert.deepEqual([rows[0].points, rows[0].quantity, rows[0].amount], [700, 7, 35000])
  assert.ok(rows[0].sku.includes('DEMO-TP14'))
  assert.ok(rows[0].sku.includes('DEMO-TC90'))
})

await test('cutoff selects an actual operation at that time instead of a future success', async () => {
  const { buildActivityPointsLedger } = await loadLedger()
  const activity = makeActivity()
  const order = makeOrder()
  orderFixtures.set(activity.id, [order])
  const rows = buildActivityPointsLedger(
    [activity],
    [
      makeRecord(activity, order),
      makeRecord(activity, order, {
        points: 900,
        time: '2026-11-08 10:00:00',
        transaction: 'DEMO-FUTURE'
      })
    ],
    '2026-11-05'
  )
  assert.equal(rows.length, 1)
  assert.deepEqual([rows[0].points, rows[0].time], [600, '2026-11-04 10:00:00'])
})

await test('operation-date filtering does not use payment date', async () => {
  const { buildActivityPointsLedger, filterPointsLedger } = await loadLedger()
  const activity = makeActivity()
  const order = makeOrder({ date: '2026-09-07' })
  orderFixtures.set(activity.id, [order])
  const rows = buildActivityPointsLedger([activity], [makeRecord(activity, order)], '2026-11-05')
  assert.equal(filterPointsLedger(rows, { start: '2026-11-04', end: '2026-11-04' }).length, 1)
  assert.equal(filterPointsLedger(rows, { start: '2026-09-07', end: '2026-09-07' }).length, 0)
  assert.equal(filterPointsLedger(rows, { end: '2026-11-03' }).length, 0)
  assert.equal(filterPointsLedger(rows, { start: '2026-11-05', end: '2026-11-04' }).length, 0)
})

await test('account and exact activity/channel/rule filters compose', async () => {
  const { buildActivityPointsLedger, filterPointsLedger } = await loadLedger()
  const activity = makeActivity()
  const order = makeOrder()
  orderFixtures.set(activity.id, [order])
  const rows = buildActivityPointsLedger([activity], [makeRecord(activity, order)], '2026-11-05')
  assert.equal(
    filterPointsLedger(rows, {
      account: '  lid-demo-a01 ',
      activityId: activity.id,
      channel: '企业购渠道',
      ruleType: '活动积分'
    }).length,
    1
  )
  assert.equal(filterPointsLedger(rows, { account: 'unmatched' }).length, 0)
  assert.equal(filterPointsLedger(rows, { activityId: 'unmatched' }).length, 0)
  assert.equal(filterPointsLedger(rows, { channel: 'unmatched' }).length, 0)
  assert.equal(filterPointsLedger(rows, { ruleType: 'unmatched' }).length, 0)
})

await test('draft activities cannot create a ledger entry', async () => {
  const { buildActivityPointsLedger } = await loadLedger()
  const activity = { ...makeActivity(), draft: true }
  const order = makeOrder()
  orderFixtures.set(activity.id, [order])
  assert.deepEqual(
    buildActivityPointsLedger([activity], [makeRecord(activity, order)], '2026-11-05'),
    []
  )
})

await test('invalid or nonpositive successful amounts cannot create a false ledger', async () => {
  const { buildActivityPointsLedger } = await loadLedger()
  const activity = makeActivity()
  const amounts = [600, Number.NaN, Number.POSITIVE_INFINITY, -1, 0, '900' as unknown as number]
  const orders = amounts.map((_, index) => makeOrder({ id: `DEMO-INVALID-${index}` }))
  orderFixtures.set(activity.id, orders)
  const records = orders.map((order, index) =>
    makeRecord(activity, order, { points: amounts[index] })
  )
  const rows = buildActivityPointsLedger([activity], records, '2026-11-05')
  assert.deepEqual(
    rows.map((row) => [row.orderId, row.points]),
    [['DEMO-INVALID-0', 600]]
  )
})

await test('building a ledger leaves activity and successful-record inputs intact', async () => {
  const { buildActivityPointsLedger } = await loadLedger()
  const activity = makeActivity()
  const order = makeOrder()
  orderFixtures.set(activity.id, [order])
  const records = [makeRecord(activity, order)]
  const before = structuredClone({ activity, records })
  buildActivityPointsLedger([activity], records, '2026-11-05')
  assert.deepEqual({ activity, records }, before)
})
