import { ordersFor, type Activity, type RecordItem } from './activityPoints'
import { buildActivityStatistics, type StatisticsRow } from './activityPointsStatistics'

export type PointsLedgerRow = {
  key: string
  activityId: string
  activityName: string
  enterpriseId: string
  enterprise: string
  account: string
  orderId: string
  sku: string
  currency: string
  channel: string
  source: string
  ruleType: string
  points: number
  time: string
  transaction: string
  batch: string
  quantity: number
  amount: number
}

export function buildActivityPointsLedger(
  activities: Activity[],
  records: RecordItem[],
  cutoff: string
): PointsLedgerRow[] {
  const cutoffDay = cutoff.slice(0, 10)
  const availableRecords = records.filter((record) => {
    const day = record.time.slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(day) && day <= cutoffDay
  })
  const ledger = new Map<string, PointsLedgerRow>()
  const uniqueActivities = new Map(activities.map((activity) => [activity.id, activity]))
  for (const activity of uniqueActivities.values()) {
    if (activity.draft) continue
    // Calculate each activity independently; cross-activity statistics intentionally reject overlap.
    const statistics = buildActivityStatistics(
      activity,
      ordersFor(activity),
      availableRecords,
      cutoffDay
    )
    const awards = new Map<string, { record: RecordItem; rows: StatisticsRow[] }>()
    for (const row of statistics) {
      const record = row.record
      if (
        !record ||
        record.status !== '成功' ||
        !Number.isFinite(record.points) ||
        record.points <= 0
      )
        continue
      const key = [activity.id, record.orderId, record.transaction]
        .map(encodeURIComponent)
        .join('/')
      const award = awards.get(key) || { record, rows: [] }
      award.rows.push(row)
      awards.set(key, award)
    }
    for (const [key, { record, rows }] of awards) {
      const first = rows[0]
      // Actual successful operations remain authoritative even if later order calculations differ.
      ledger.set(key, {
        key,
        activityId: activity.id,
        activityName: activity.name,
        enterpriseId: first.enterpriseId,
        enterprise: first.enterprise,
        account: record.account,
        orderId: record.orderId,
        sku: [...new Set(rows.map((row) => row.sku))].join(', '),
        currency: '企业积分',
        channel: '企业购渠道',
        source: '活动积分',
        ruleType: '活动积分',
        points: record.points,
        time: record.time,
        transaction: record.transaction,
        batch: record.batch,
        quantity: rows.reduce((total, row) => total + row.netQuantity, 0),
        amount: Math.round(rows.reduce((total, row) => total + row.netReceipt, 0) * 100) / 100
      })
    }
  }
  return [...ledger.values()]
}

export function filterPointsLedger(
  rows: PointsLedgerRow[],
  filters: {
    account?: string
    activityId?: string
    channel?: string
    ruleType?: string
    start?: string
    end?: string
  } = {}
): PointsLedgerRow[] {
  if (filters.start && filters.end && filters.start > filters.end) return []
  const account = filters.account?.trim().toLowerCase()
  return rows.filter((row) => {
    const day = row.time.slice(0, 10)
    return (
      (!account || row.account.toLowerCase().includes(account)) &&
      (!filters.activityId || row.activityId === filters.activityId) &&
      (!filters.channel || row.channel === filters.channel) &&
      (!filters.ruleType || row.ruleType === filters.ruleType) &&
      (!filters.start || day >= filters.start) &&
      (!filters.end || day <= filters.end)
    )
  })
}
