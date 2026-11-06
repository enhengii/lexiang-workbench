import {
  calculate,
  type Activity,
  type Calculated,
  type Order,
  type RecordItem
} from './activityPoints'

export const statisticsStatuses = [
  '累计中',
  '待自动发放',
  '已发放',
  '发放失败',
  '计算异常',
  '不参与',
  '无需发放'
] as const
export type StatisticsStatus = (typeof statisticsStatuses)[number]
export type StatisticsRow = Calculated & {
  key: string
  activityId: string
  activityName: string
  enterpriseMultiplier: number
  basePointsExact: number
  targetPointsExact: number | null
  actualPaid: number | null
  requiredPoints: number | null
  postedPoints: number
  pendingPoints: number
  failedPoints: number
  status: StatisticsStatus
  reason: string
  record?: RecordItem
}
export type StatisticsFilters = {
  enterprise?: string
  account?: string
  orderId?: string
  sku?: string
  start?: string
  end?: string
  status?: string
  exactEnterprise?: string
  exactAccount?: string
}
export type StatisticsSummary = {
  matchedRowCount: number
  enterpriseCount: number
  accountCount: number
  orderCount: number
  quantity: number
  amount: number
  target: number
  actualPaid: number
  required: number
  posted: number
  pending: number
  failed: number
  exceptionCount: number
  excludedCount: number
  missingPaidCount: number
  computableCount: number
}
export type StatisticsGroup = {
  id: string
  enterpriseId: string
  enterprise: string
  account: string
  rows: StatisticsRow[]
  summary: StatisticsSummary
  enterpriseQuantity: number
  enterpriseAmount: number
  multiplier: number
}

const compositeKey = (parts: string[]) => parts.map(encodeURIComponent).join('/')
const orderKey = (activityId: string, order: Order) =>
  compositeKey([activityId, order.id, order.sku, order.account])
const money = (value: number) => Math.round(value * 100) / 100
const uniqueRows = (rows: StatisticsRow[]) => [
  ...new Map(rows.map((row) => [row.key, row])).values()
]

function latestRecords(activityId: string, records: RecordItem[]) {
  const picked = new Map<string, RecordItem>()
  for (const record of records) {
    if (record.key !== `${activityId}:${record.orderId}`) continue
    const previous = picked.get(record.key)
    const rank = record.status === '成功' ? 1 : 0
    const previousRank = previous?.status === '成功' ? 1 : 0
    if (
      !previous ||
      rank > previousRank ||
      (rank === previousRank &&
        (record.time > previous.time ||
          (record.time === previous.time && record.attempts >= previous.attempts)))
    )
      picked.set(record.key, record)
  }
  return picked
}

function markException(row: StatisticsRow, reason: string) {
  row.status = '计算异常'
  row.calculationError = true
  row.reason = row.issue ? `${row.issue}；${reason}` : reason
  row.issue = row.reason
  row.pendingPoints = 0
  row.failedPoints = 0
}

export function buildActivityStatistics(
  activity: Activity,
  orders: Order[],
  records: RecordItem[],
  cutoff: string
): StatisticsRow[] {
  if (activity.draft) return []
  // Deduplicate the source before calculating enterprise tiers; query filters are applied later.
  const uniqueOrders = [
    ...new Map(orders.map((order) => [orderKey(activity.id, order), order])).values()
  ]
  const rows: StatisticsRow[] = calculate(activity, uniqueOrders, cutoff)
    .filter((row) => row.date <= cutoff)
    .map((row) => {
      const actualPaid =
        row.paidBase === null ||
        row.paidMember === null ||
        !Number.isFinite(row.paidBase) ||
        !Number.isFinite(row.paidMember)
          ? null
          : row.paidBase + row.paidMember
      const issue = row.issue || (actualPaid === null ? '缺少订单实际已发积分记录' : '')
      const participating = row.eligible
      const metric = activity.mode === 'quantity' ? row.enterpriseQuantity : row.enterpriseAmount
      const enterpriseMultiplier =
        [...activity.tiers]
          .sort((left, right) => right.threshold - left.threshold)
          .find((tier) => metric >= tier.threshold)?.multiplier || 0
      const requiredPoints = participating && actualPaid !== null ? row.delta : null
      const status: StatisticsStatus = row.calculationError
        ? '计算异常'
        : !participating
          ? '不参与'
          : issue
            ? '计算异常'
            : cutoff <= activity.end
              ? '累计中'
              : row.delta > 0
                ? '待自动发放'
                : '无需发放'
      return {
        ...row,
        eligible: participating,
        issue,
        key: orderKey(activity.id, row),
        activityId: activity.id,
        activityName: activity.name,
        enterpriseMultiplier,
        basePointsExact: row.netReceipt / 100,
        targetPointsExact: participating
          ? row.multiplier
            ? (Math.round(row.netReceipt * 100) * row.multiplier) / 10000
            : actualPaid
          : null,
        actualPaid,
        requiredPoints,
        postedPoints: 0,
        pendingPoints: participating && !issue ? Math.max(requiredPoints || 0, 0) : 0,
        failedPoints: 0,
        status,
        reason:
          issue ||
          (cutoff <= activity.end
            ? row.multiplier === 0
              ? '当前尚未达档，活动期间继续累计'
              : ''
            : row.multiplier === 0
              ? '企业未达活动档位'
              : row.delta === 0
                ? '无需发放'
                : '')
      }
    })
  const selectedRecords = latestRecords(activity.id, records)
  const orderRows = new Map<string, StatisticsRow[]>()
  for (const row of rows) {
    const key = `${activity.id}:${row.id}`
    const items = orderRows.get(key) || []
    items.push(row)
    orderRows.set(key, items)
  }
  for (const [key, items] of orderRows) {
    const record = selectedRecords.get(key)
    if (!record) continue
    for (const row of items) row.record = record
    const expected = items.reduce(
      (total, row) =>
        total +
        (row.status !== '计算异常' && row.requiredPoints !== null && row.requiredPoints > 0
          ? row.requiredPoints
          : 0),
      0
    )
    const accountMismatch = items.some((row) => row.account !== record.account)
    if (record.status === '成功') {
      if (
        accountMismatch ||
        items.some((row) => row.status === '计算异常') ||
        record.points !== expected
      ) {
        // An unmatched ledger amount stays whole on one row; it must never be counted per SKU.
        items[0].postedPoints = record.points
        for (const row of items)
          markException(
            row,
            accountMismatch
              ? '发放账号与下单账号不一致，请核对发放记录'
              : '已补积分与当前应补不一致，请核对发放记录'
          )
      } else {
        // An order-level success is allocated to its computable SKU rows, summing to one ledger amount.
        for (const row of items) {
          row.postedPoints = row.requiredPoints || 0
          row.pendingPoints = 0
          if (row.eligible) row.status = '已发放'
        }
      }
    } else {
      for (const row of items) {
        if (accountMismatch) markException(row, '发放账号与下单账号不一致，请核对发放记录')
        else if (row.eligible && !row.issue && (row.requiredPoints || 0) > 0) {
          row.status = '发放失败'
          row.pendingPoints = 0
          row.failedPoints = row.requiredPoints || 0
          row.reason = record.reason || '发放失败，尚未入账'
        }
      }
    }
  }
  return rows
}

export function filterStatistics(
  rows: StatisticsRow[],
  filters: StatisticsFilters = {}
): StatisticsRow[] {
  if (filters.start && filters.end && filters.start > filters.end) return []
  const includes = (value: string, query?: string) =>
    !query?.trim() || value.toLowerCase().includes(query.trim().toLowerCase())
  return rows.filter(
    (row) =>
      includes(`${row.enterprise} ${row.enterpriseId}`, filters.enterprise) &&
      includes(row.account, filters.account) &&
      includes(row.id, filters.orderId) &&
      includes(row.sku, filters.sku) &&
      (!filters.exactEnterprise || row.enterpriseId === filters.exactEnterprise) &&
      (!filters.exactAccount || row.account === filters.exactAccount) &&
      (!filters.start || row.date >= filters.start) &&
      (!filters.end || row.date <= filters.end) &&
      (!filters.status ||
        ['全部', '全部状态'].includes(filters.status) ||
        row.status === filters.status)
  )
}

export function summarizeStatistics(rows: StatisticsRow[]): StatisticsSummary {
  const matched = uniqueRows(rows)
  if (new Set(matched.map((row) => row.activityId)).size > 1)
    throw new Error('请按单个活动统计，避免重复累计重叠订单')
  const eligible = matched.filter((row) => row.eligible)
  const computable = eligible.filter(
    (row) => row.requiredPoints !== null && row.status !== '计算异常'
  )
  return {
    matchedRowCount: matched.length,
    enterpriseCount: new Set(matched.map((row) => row.enterpriseId).filter(Boolean)).size,
    accountCount: new Set(matched.map((row) => row.account).filter(Boolean)).size,
    orderCount: new Set(matched.map((row) => row.id)).size,
    quantity: eligible.reduce((total, row) => total + row.netQuantity, 0),
    amount: money(eligible.reduce((total, row) => total + row.netReceipt, 0)),
    target: computable.reduce((total, row) => total + row.target, 0),
    actualPaid: eligible.reduce((total, row) => total + (row.actualPaid || 0), 0),
    required: computable.reduce((total, row) => total + (row.requiredPoints || 0), 0),
    posted: matched.reduce((total, row) => total + row.postedPoints, 0),
    pending: matched.reduce((total, row) => total + row.pendingPoints, 0),
    failed: matched.reduce((total, row) => total + row.failedPoints, 0),
    exceptionCount: matched.filter((row) => row.status === '计算异常').length,
    excludedCount: matched.filter((row) => row.status === '不参与').length,
    missingPaidCount: matched.filter((row) => row.actualPaid === null).length,
    computableCount: computable.length
  }
}

export function groupStatistics(
  rows: StatisticsRow[],
  dimension: 'enterprise' | 'account'
): StatisticsGroup[] {
  const groups = new Map<string, StatisticsRow[]>()
  for (const row of uniqueRows(rows)) {
    const id =
      dimension === 'enterprise' ? row.enterpriseId : compositeKey([row.enterpriseId, row.account])
    const items = groups.get(id) || []
    items.push(row)
    groups.set(id, items)
  }
  return [...groups].map(([id, items]) => ({
    id,
    enterpriseId: items[0].enterpriseId,
    enterprise: items[0].enterprise,
    account: dimension === 'account' ? items[0].account : '',
    rows: items,
    summary: summarizeStatistics(items),
    enterpriseQuantity: items[0].enterpriseQuantity,
    enterpriseAmount: items[0].enterpriseAmount,
    multiplier: items[0].enterpriseMultiplier
  }))
}
