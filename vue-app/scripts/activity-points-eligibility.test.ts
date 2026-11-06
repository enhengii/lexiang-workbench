import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import * as points from '../src/services/activityPoints.ts'
import type { Activity, Order } from '../src/services/activityPoints.ts'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './activityPoints' || specifier === '@/services/activityPoints')
      return nextResolve(new URL('../src/services/activityPoints.ts', import.meta.url).href, context)
    if (specifier === './activityPointsStatistics')
      return nextResolve(new URL('../src/services/activityPointsStatistics.ts', import.meta.url).href, context)
    return nextResolve(specifier, context)
  }
})
const { buildActivityStatistics, summarizeStatistics } = await import('../src/services/activityPointsStatistics.ts')
const activity = () => ({
  ...structuredClone(points.seedActivities[0]),
  invoiceTypes: ['ELECTRONIC'],
  enterpriseGroupIds: ['DEMO-GROUP-023']
})
const orderPair = (a = activity()): Order[] => points.ordersFor(a).slice(0, 2).map(order => ({
  ...order, invoiceType: 'ELECTRONIC', enterpriseGroupIds: ['DEMO-GROUP-023']
}))

await test('发票与企业组均为必选，拒绝未知选项，支持多选', () => {
  assert.equal(points.validateActivity(activity()), '')
  assert.match(points.validateActivity({ ...activity(), invoiceTypes: [] }), /发票/)
  assert.match(points.validateActivity({ ...activity(), enterpriseGroupIds: [] }), /企业组/)
  assert.match(points.validateActivity({ ...activity(), invoiceTypes: ['UNKNOWN'] }), /发票/)
  assert.match(points.validateActivity({ ...activity(), enterpriseGroupIds: ['UNKNOWN'] }), /企业组/)
  assert.equal(points.validateActivity({ ...activity(), invoiceTypes: ['ELECTRONIC', 'VAT'], enterpriseGroupIds: ['DEMO-GROUP-001', 'DEMO-GROUP-023'] }), '')
})

await test('发票不符的订单不贡献企业累计，也不能因同企业达档获得积分', () => {
  const a = activity(), orders = orderPair(a)
  orders[1].invoiceType = 'VAT'
  const rows = points.calculate(a, orders)
  assert.equal(rows[1].eligible, false)
  assert.match(rows[1].issue, /发票/)
  assert.equal(rows[0].enterpriseQuantity, 6)
  assert.equal(rows[0].delta, 0)
  assert.equal(rows[1].delta, 0)
  orders[0].quantity = 10
  const reached = points.calculate(a, orders)
  assert.equal(reached[0].multiplier, 5)
  assert.equal(reached[1].multiplier, 0)
})

await test('企业组以所属任一组命中所选任一组，企业身份仍按enterpriseId累计', () => {
  const a = { ...activity(), enterpriseGroupIds: ['DEMO-GROUP-001', 'DEMO-GROUP-023'] }
  const orders = orderPair(a)
  orders[0].enterpriseGroupIds = ['DEMO-GROUP-002', 'DEMO-GROUP-001']
  orders[1].enterpriseGroupIds = ['DEMO-GROUP-023']
  const rows = points.calculate(a, orders)
  assert(rows.every(row => row.eligible))
  assert.deepEqual(rows.map(row => row.enterpriseQuantity), [10, 10])
  assert.deepEqual(rows.map(row => row.delta), [600, 400])
  orders[1].enterpriseGroupIds = ['DEMO-GROUP-003']
  const excluded = points.calculate(a, orders)
  assert.equal(excluded[1].eligible, false)
  assert.match(excluded[1].issue, /企业组/)
  assert.equal(excluded[0].enterpriseQuantity, 6)
})

await test('发票、用户企业组和商品取交集，金额与台数使用相同有效订单范围', () => {
  const a = { ...activity(), mode: 'amount' as const, tiers: [{ threshold: 50000, multiplier: 5 }] }
  const orders = orderPair(a)
  const passing = points.calculate(a, orders)
  assert.equal(passing[0].enterpriseAmount, 50000)
  for (const excluded of [
    { ...orders[1], invoiceType: 'VAT' },
    { ...orders[1], enterpriseGroupIds: ['DEMO-GROUP-001'] },
    { ...orders[1], sku: 'DEMO-CTO' }
  ]) {
    const rows = points.calculate(a, [orders[0], excluded])
    assert.equal(rows[1].eligible, false)
    assert.equal(rows[0].enterpriseAmount, 30000)
    assert.equal(rows[0].enterpriseQuantity, 6)
    assert.equal(rows[0].delta, 0)
  }
})

await test('发票或企业组资料缺失不能隐含参与，明细显示明确原因且汇总不计入', () => {
  const a = activity(), template = orderPair(a)[0]
  for (const missing of [
    { ...template, invoiceType: undefined },
    { ...template, enterpriseGroupIds: undefined },
    { ...template, invoiceType: 'UNKNOWN' },
    { ...template, enterpriseGroupIds: ['UNKNOWN'] }
  ]) {
    const rows = buildActivityStatistics(a, [missing], [], a.end)
    assert.equal(rows[0].eligible, false)
    assert.equal(rows[0].status, '计算异常')
    assert.equal(rows[0].calculationError, true)
    assert.match(rows[0].reason, /缺少.*发票|缺少.*企业组|发票.*无效|企业组.*无效/)
    assert.equal(summarizeStatistics(rows).quantity, 0)
    assert.equal(rows[0].pendingPoints, 0)
  }
})

await test('已计算行不能绕过后来变更的条件，发放前重新核对有效累计', () => {
  const a = activity(), orders = orderPair(a)
  orders[1].invoiceType = 'VAT'
  const broad = { ...a, invoiceTypes: ['ELECTRONIC', 'VAT'] }
  const before = points.calculate(broad, orders)
  assert.equal(before[0].delta, 600)
  assert.deepEqual(points.settle(a, before, [], points.payoutDate(a)), [])
  assert.throws(() => points.settle({ ...a, invoiceTypes: [] }, before, [], points.payoutDate(a)), /发票/)
})

await test('演示选项与默认数据完整且既有示例金额不变', () => {
  assert.equal(points.invoiceTypeOptions.length, 2)
  assert.equal(points.enterpriseGroupOptions.length, 24)
  assert.equal(new Set(points.enterpriseGroupOptions.map(option => option.value)).size, 24)
  assert(points.enterpriseGroupOptions.every(option => option.value.startsWith('DEMO-GROUP-')))
  for (const a of points.seedActivities) {
    assert.equal(points.validateActivity(a), '')
    assert(points.ordersFor(a).every(order => order.invoiceType && order.enterpriseGroupIds?.length))
  }
  const rows = points.calculate(points.seedActivities[0], points.ordersFor(points.seedActivities[0]))
  assert.deepEqual(rows.slice(0, 6).map(row => row.delta), [600, 400, 2966, 6806, 3575, 15000])
  assert.equal(points.initialRecords().filter(record => record.status === '成功').reduce((sum, record) => sum + record.points, 0), 22541)
})

await test('旧缓存仅为已知示例补缺失条件，自定义活动需要补齐且已发记录保留', async () => {
  const legacy = structuredClone(points.seedActivities[2]) as Partial<Activity>
  delete legacy.invoiceTypes
  delete legacy.enterpriseGroupIds
  const custom = { ...legacy, id: 'CUSTOM-OLD-001', name: '旧自定义活动' }
  const records = points.initialRecords()
  const saved = { version: 1, activities: [legacy, custom], records, date: points.TODAY }
  const memory = new Map([['portal.activity-points.demo.v1', JSON.stringify(saved)]])
  globalThis.localStorage = {
    getItem: (key: string) => memory.get(key) || null,
    setItem: (key: string, value: string) => { memory.set(key, value) },
    removeItem: (key: string) => { memory.delete(key) }, clear: () => memory.clear(),
    key: (index: number) => [...memory.keys()][index] || null, get length() { return memory.size }
  } as Storage
  const { useActivityPointsDemo } = await import('../src/views/points/useActivityPointsDemo.ts')
  const { state, storageNotice } = useActivityPointsDemo()
  assert.equal(state.activities.length, 2)
  assert.equal(points.validateActivity(state.activities[0]), '')
  assert.deepEqual([...state.activities[1].invoiceTypes], [])
  assert.deepEqual([...state.activities[1].enterpriseGroupIds], [])
  assert.match(points.validateActivity(state.activities[1]), /发票/)
  assert.match(storageNotice.message, /补齐|补充/)
  assert.deepEqual(JSON.parse(JSON.stringify(state.records)), records)
  const rows = points.calculate(state.activities[1], points.ordersFor(state.activities[1]))
  assert(rows.every(row => !row.eligible && row.calculationError))
  assert(buildActivityStatistics(state.activities[1], points.ordersFor(state.activities[1]), [], points.TODAY).every(row => row.status === '计算异常'))
  assert.throws(() => points.settle(state.activities[1], rows, records, points.payoutDate(state.activities[1])), /发票/)
})

await test('新配置的空选择不被迁移为全选', () => {
  const intentionallyEmpty = { ...activity(), invoiceTypes: [], enterpriseGroupIds: [] }
  const migrated = points.migrateActivityEligibility(intentionallyEmpty)
  assert.deepEqual(migrated.invoiceTypes, [])
  assert.deepEqual(migrated.enterpriseGroupIds, [])
})

await test('条件缺失或缩小后保留真实已发流水，明细要求核对而不是抹掉积分', async () => {
  const { buildActivityPointsLedger } = await import('../src/services/activityPointsLedger.ts')
  const a = structuredClone(points.seedActivities[2])
  const records = points.initialRecords()
  const expectedPosted = records.filter(record => record.status === '成功').reduce((sum, record) => sum + record.points, 0)
  for (const changed of [
    { ...a, invoiceTypes: [] },
    { ...a, invoiceTypes: ['VAT'], enterpriseGroupIds: ['DEMO-GROUP-023'] }
  ]) {
    const rows = buildActivityStatistics(changed, points.ordersFor(changed), records, points.TODAY)
    assert.equal(rows.reduce((sum, row) => sum + row.postedPoints, 0), expectedPosted)
    assert(rows.some(row => row.status === '计算异常' && row.postedPoints > 0))
    const ledger = buildActivityPointsLedger([changed], records, points.TODAY)
    assert.equal(ledger.reduce((sum, row) => sum + row.points, 0), expectedPosted)
    assert.equal(ledger.length, 5)
  }
})

await test('异常配置和资料的未知值被拒绝，资格检查不因脏字段崩溃', () => {
  const malformed = [null, 123, 'ELECTRONIC', {}, ['UNKNOWN']]
  for (const value of malformed) {
    assert.match(points.validateEligibilityConditions({ ...activity(), invoiceTypes: value as string[] }), /发票/)
    assert.match(points.validateEligibilityConditions({ ...activity(), enterpriseGroupIds: value as string[] }), /企业组/)
  }
  const a = activity(), template = orderPair(a)[0]
  for (const enterpriseGroupIds of [null, 'DEMO-GROUP-023', {}]) {
    const row = points.calculate(a, [{ ...template, enterpriseGroupIds: enterpriseGroupIds as string[] }])[0]
    assert.equal(row.eligible, false)
    assert.match(row.issue, /企业组/)
  }
})


await test('明确不匹配和已知无所属企业组为不参与，不混为资料缺失异常', () => {
  const a = activity(), template = orderPair(a)[0]
  for (const excluded of [
    { ...template, invoiceType: 'VAT' },
    { ...template, enterpriseGroupIds: ['DEMO-GROUP-001'] },
    { ...template, enterpriseGroupIds: [] }
  ]) {
    const rows = buildActivityStatistics(a, [excluded], [], a.end)
    assert.equal(rows[0].status, '不参与')
    assert.equal(rows[0].eligible, false)
    assert.equal(rows[0].calculationError, false)
    assert.equal(summarizeStatistics(rows).excludedCount, 1)
    assert.equal(summarizeStatistics(rows).exceptionCount, 0)
  }
})
