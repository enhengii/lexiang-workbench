import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPointsAccounts, filterPointsAccounts } from '../src/services/pointsAccounts.ts'
import type { PointsLedgerRow } from '../src/services/activityPointsLedger.ts'

const award = (key: string, overrides: Partial<PointsLedgerRow> = {}): PointsLedgerRow => ({
  key,
  activityId: 'DEMO-ACT',
  activityName: '演示活动',
  enterpriseId: 'DEMO-ENT',
  enterprise: '演示企业',
  account: 'LID-DEMO-B01',
  orderId: `DEMO-${key}`,
  sku: 'DEMO-SKU',
  currency: '企业积分',
  channel: '企业购渠道',
  source: '活动积分',
  ruleType: '活动积分',
  points: 600,
  time: '2026-10-03 10:00:00',
  transaction: `DEMO-TX-${key}`,
  batch: 'DEMO-BATCH',
  quantity: 1,
  amount: 100,
  ...overrides
})

test('accounts sum actual ledger credits without counting duplicate awards twice', () => {
  const first = award('one')
  const rows = buildPointsAccounts([first, award('two', { points: 400 }), first])
  assert.equal(rows.length, 1)
  assert.deepEqual(
    [rows[0].totalPoints, rows[0].frozenPoints, rows[0].availablePoints],
    [1000, 0, 1000]
  )
  assert.match(rows[0].accountId, /^DEMO-ACCOUNT-/)
})

test('account creation uses the first operation and is stable across ledger order', () => {
  const earlier = award('early', { time: '2026-09-01 09:00:00', points: 250 })
  const later = award('later', { time: '2026-10-03 10:00:00' })
  const [first] = buildPointsAccounts([later, earlier])
  const [reversed] = buildPointsAccounts([earlier, later])
  assert.equal(first.createdAt, '2026-09-01 09:00:00')
  assert.equal(first.accountId, reversed.accountId)
  assert.equal(first.totalPoints, 850)
})

test('separate currencies and Lenovo IDs retain separate balances', () => {
  const rows = buildPointsAccounts([
    award('one'),
    award('two', { currency: '演示币' }),
    award('three', { account: 'LID-DEMO-B010', points: 70 })
  ])
  assert.equal(rows.length, 3)
  assert.equal(new Set(rows.map((row) => row.accountId)).size, 3)
  assert.deepEqual(
    rows.map((row) => row.totalPoints),
    [600, 600, 70]
  )
})

test('normalizing account case and surrounding spaces cannot split an account', () => {
  const rows = buildPointsAccounts([
    award('one'),
    award('two', { account: ' lid-demo-b01 ', points: 25 })
  ])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].totalPoints, 625)
})

test('missing and invalid positive credits never create a synthetic balance', () => {
  assert.deepEqual(buildPointsAccounts([]), [])
  const rows = buildPointsAccounts([
    award('nan', { points: Number.NaN }),
    award('infinite', { points: Infinity }),
    award('negative', { points: -5 }),
    award('zero', { points: 0 }),
    award('empty-account', { account: ' ' }),
    award('bad-time', { time: '' })
  ])
  assert.deepEqual(rows, [])
})

test('optional Lenovo ID filter matches the complete account rather than a substring', () => {
  const rows = buildPointsAccounts([award('one'), award('two', { account: 'LID-DEMO-B010' })])
  assert.equal(filterPointsAccounts(rows).length, 2)
  assert.equal(filterPointsAccounts(rows, { account: '  lid-demo-b01 ' }).length, 1)
  assert.equal(filterPointsAccounts(rows, { account: 'LID-DEMO-B0' }).length, 0)
})

test('creation date filtering uses the first successful operation with inclusive boundaries', () => {
  const rows = buildPointsAccounts([
    award('one', { time: '2026-09-01 09:00:00' }),
    award('two', { time: '2026-10-03 10:00:00' }),
    award('three', { account: 'LID-DEMO-B02', time: '2026-10-03 11:00:00' })
  ])
  assert.deepEqual(
    filterPointsAccounts(rows, { start: '2026-10-03', end: '2026-10-03' }).map(
      (row) => row.account
    ),
    ['LID-DEMO-B02']
  )
  assert.equal(filterPointsAccounts(rows, { end: '2026-09-01' }).length, 1)
  assert.equal(filterPointsAccounts(rows, { start: '2026-10-04', end: '2026-10-03' }).length, 0)
})

test('aggregation is pure and account IDs remain stable when credits change', () => {
  const ledger = [award('one')]
  const before = structuredClone(ledger)
  const [first] = buildPointsAccounts(ledger)
  const [updated] = buildPointsAccounts([...ledger, award('new', { points: 20 })])
  assert.deepEqual(ledger, before)
  assert.equal(updated.accountId, first.accountId)
  assert.equal(updated.availablePoints, 620)
})
