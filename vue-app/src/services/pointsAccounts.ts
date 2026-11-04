import type { PointsLedgerRow } from './activityPointsLedger'

/** Synthetic read-only account derived exclusively from successful activity ledger credits. */
export type PointsAccountRow = {
  /** Stable grouping key for normalized Lenovo ID and currency. */
  key: string
  account: string
  currency: string
  /** Stable DEMO identifier; this is not a real account identifier. */
  accountId: string
  totalPoints: number
  /** Consumption and freezing are not simulated, so frozen points are always zero. */
  frozenPoints: number
  availablePoints: number
  /** First successful operation in the ledger, not the real account creation date. */
  createdAt: string
}

export function buildPointsAccounts(ledger: PointsLedgerRow[]): PointsAccountRow[] {
  const accounts = new Map<string, PointsAccountRow>()
  const seen = new Set<string>()
  for (const row of ledger) {
    const account = row.account.trim()
    if (
      seen.has(row.key) ||
      !account ||
      !Number.isFinite(row.points) ||
      row.points <= 0 ||
      !/^\d{4}-\d{2}-\d{2}/.test(row.time)
    )
      continue
    seen.add(row.key)
    const normalized = account.toLowerCase()
    const key = JSON.stringify([normalized, row.currency])
    const existing = accounts.get(key)
    if (existing) {
      existing.totalPoints += row.points
      existing.availablePoints = existing.totalPoints
      if (row.time < existing.createdAt) existing.createdAt = row.time
    } else {
      accounts.set(key, {
        key,
        account,
        currency: row.currency,
        accountId: `DEMO-ACCOUNT-${encodeURIComponent(normalized)}:${encodeURIComponent(row.currency)}`,
        totalPoints: row.points,
        frozenPoints: 0,
        availablePoints: row.points,
        createdAt: row.time
      })
    }
  }
  return [...accounts.values()]
}

export function filterPointsAccounts(
  rows: PointsAccountRow[],
  filters: { account?: string; start?: string; end?: string } = {}
): PointsAccountRow[] {
  if (filters.start && filters.end && filters.start > filters.end) return []
  const account = filters.account?.trim().toLowerCase()
  return rows.filter((row) => {
    const day = row.createdAt.slice(0, 10)
    return (
      (!account || row.account.toLowerCase() === account) &&
      (!filters.start || day >= filters.start) &&
      (!filters.end || day <= filters.end)
    )
  })
}
