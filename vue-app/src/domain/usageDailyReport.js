import sourceData from './usageDailyReportData.json'

/**
 * Real daily aggregates imported from the supplied XLSX. No individual calls,
 * people, Query payloads, traces or durations are reconstructed from totals.
 * @typedef {{ date: string, loginDau: number|null, loginWau: number|null, loginMau: number|null, aiDau: number|null, aiWau: number|null, aiMau: number|null, totalUsers: number|null, loginWauRate: number|null, aiWauRate: number|null, queries: number|null, tasks: number|null, taskSuccess: number|null, taskFailed: number|null, totalSkills: number|null, newSkills: number|null, calledSkills: number|null, calls: number|null, success: number|null, failed: number|null, firstTokenSeconds: number|null, sourceRow?: number }} DailyOverviewRow
 * @typedef {{ date: string, skillId: string, name: string, module: string, creatorId: string, creator: string, nameKnown: boolean, moduleKnown: boolean, creatorKnown: boolean, users: number|null, calls: number|null, success: number|null, failed: number|null, feedbackCount: number|null, likes: number|null, dislikes: number|null, likeRate: number|null, dislikeRate: number|null, sourceRow?: number }} DailySkillRow
 * @typedef {{ startDate?: string, endDate?: string }} DailyRange
 * @typedef {{ module?: string, search?: string, dimension?: 'skills'|'creators', creatorId?: string, skillId?: string }} DailyFilters
 */

export const USAGE_DAILY_SOURCE = Object.freeze(structuredClone(sourceData.source))
export const USAGE_DAILY_START_DATE = sourceData.source.overviewRange.startDate
export const USAGE_DAILY_END_DATE = sourceData.source.overviewRange.endDate
export const USAGE_DAILY_MODULES = Object.freeze([...new Set(sourceData.detailRows.map(row => row.module))].sort())
export const USAGE_DAILY_DEFINITIONS = Object.freeze(sourceData.metricDefinitions.map(row => Object.freeze({ ...row })))

const OVERVIEW_NUMBERS = /** @type {const} */ (['loginDau', 'loginWau', 'loginMau', 'aiDau', 'aiWau', 'aiMau', 'totalUsers', 'loginWauRate', 'aiWauRate', 'queries', 'tasks', 'taskSuccess', 'taskFailed', 'totalSkills', 'newSkills', 'calledSkills', 'calls', 'success', 'failed', 'firstTokenSeconds'])
const DETAIL_NUMBERS = /** @type {const} */ (['users', 'calls', 'success', 'failed', 'feedbackCount', 'likes', 'dislikes', 'likeRate', 'dislikeRate'])
const DAY_MS = 86400000
/** @param {string} date @param {number} days */
const shiftDate = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
/** @param {unknown} value */
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
/** @param {number|null|undefined} top @param {number|null|undefined} bottom */
const ratio = (top, bottom) => top == null || bottom == null || bottom === 0 ? null : top / bottom
/** @template T @param {T[]} rows @param {keyof T} key */
function total(rows, key) {
  if (rows.some(row => row[key] == null)) return null
  return rows.reduce((sum, row) => sum + Number(row[key]), 0)
}
/** @param {string} from @param {string} to */
function dateList(from, to) {
  /** @type {string[]} */
  const dates = []
  for (let date = from; date <= to; date = shiftDate(date, 1)) dates.push(date)
  return dates
}

/**
 * Pure source adapter, also used to verify missing-data and reconciliation
 * behavior independently of this particular workbook snapshot.
 * @param {{ overviewRows: (Partial<DailyOverviewRow> & { date: string })[], detailRows: (Partial<DailySkillRow> & { date: string, skillId: string })[] }} dataset
 */
export function createDailyReportApi(dataset) {
  /** @type {DailyOverviewRow[]} */
  const overviewRows = dataset.overviewRows.map(row => ({ ...row, ...Object.fromEntries(OVERVIEW_NUMBERS.map(key => [key, row[key] ?? null])) }))
  /** @type {DailySkillRow[]} */
  const detailRows = dataset.detailRows.map(row => ({
    ...row, name: row.name || row.skillId, module: row.module || '未标注', creatorId: row.creatorId || 'unattributed', creator: row.creator || '未标注',
    nameKnown: row.nameKnown ?? !!row.name, moduleKnown: row.moduleKnown ?? !!row.module, creatorKnown: row.creatorKnown ?? !!row.creatorId,
    ...Object.fromEntries(DETAIL_NUMBERS.map(key => [key, row[key] ?? null])),
  }))
  overviewRows.sort((a, b) => a.date.localeCompare(b.date))
  detailRows.sort((a, b) => a.date.localeCompare(b.date))
  const minDate = overviewRows[0]?.date || USAGE_DAILY_START_DATE
  const maxDate = overviewRows.at(-1)?.date || USAGE_DAILY_END_DATE
  const detailStart = detailRows[0]?.date || null
  const detailEnd = detailRows.at(-1)?.date || null

  /** @param {DailyRange} options */
  function windowFor(options) {
    const endDate = options.endDate ?? maxDate
    const startDate = options.startDate ?? (validDate(endDate) ? shiftDate(endDate, -6) : '')
    const dateError = !validDate(startDate) || !validDate(endDate) ? '日期格式无效。'
      : startDate > endDate ? '起始日期不能晚于截止日期。'
        : startDate < minDate || endDate > maxDate ? '所选周期超出日报覆盖范围。' : ''
    return { startDate, endDate, dateError }
  }

  /** @param {ReturnType<typeof windowFor>} range @param {DailySkillRow[]} [rows] */
  function qualityFor(range, rows = []) {
    return {
      firstTokenEstimated: true,
      missingQueryCount: 0,
      missingLatencyDates: /** @type {string[]} */ ([]),
      missingDates: range.dateError ? [] : dateList(range.startDate, range.endDate).filter(date => !overviewRows.some(row => row.date === date)),
      detailCoverageStart: detailStart,
      detailCoverageEnd: detailEnd,
      detailCoveragePartial: !detailStart || !detailEnd || range.startDate < detailStart || range.endDate > detailEnd,
      unknownCreatorRows: rows.filter(row => !row.creatorKnown).length,
      missingModuleRows: rows.filter(row => !row.moduleKnown).length,
      dateError: range.dateError,
    }
  }

  /** @param {DailyRange} [options] */
  function getDailyOverview(options = {}) {
    const range = windowFor(options)
    const dailyRows = range.dateError ? [] : overviewRows.filter(row => row.date >= range.startDate && row.date <= range.endDate).map(row => ({ ...row }))
    const latest = dailyRows.at(-1) || null
    const quality = qualityFor(range, detailRows.filter(row => row.date >= range.startDate && row.date <= range.endDate))
    const queries = total(dailyRows, 'queries')
    const tasks = total(dailyRows, 'tasks')
    const taskSuccess = total(dailyRows, 'taskSuccess')
    const calls = total(dailyRows, 'calls')
    const success = total(dailyRows, 'success')
    const missingLatency = dailyRows.filter(row => (row.queries ?? 0) > 0 && row.firstTokenSeconds == null)
    quality.missingQueryCount = missingLatency.reduce((sum, row) => sum + (row.queries ?? 0), 0)
    quality.missingLatencyDates = missingLatency.map(row => row.date)
    const firstTokenSeconds = queries && !missingLatency.length && dailyRows.every(row => row.queries != null)
      ? dailyRows.reduce((sum, row) => sum + (row.firstTokenSeconds ?? 0) * (row.queries ?? 0), 0) / queries : null
    const summary = {
      queries, tasks, taskSuccess, taskFailed: total(dailyRows, 'taskFailed'), taskSuccessRate: ratio(taskSuccess, tasks),
      calls, success, failed: total(dailyRows, 'failed'), successRate: ratio(success, calls), newSkills: total(dailyRows, 'newSkills'),
      totalUsers: latest?.totalUsers ?? null, totalSkills: latest?.totalSkills ?? null, asOfDate: latest?.date ?? null,
      firstTokenSeconds, loginUsers: null, aiUsers: null, calledSkills: null,
    }
    const windows = {
      login: { dau: latest?.loginDau ?? null, wau: latest?.loginWau ?? null, mau: latest?.loginMau ?? null },
      ai: { dau: latest?.aiDau ?? null, wau: latest?.aiWau ?? null, mau: latest?.aiMau ?? null },
    }
    // Missing detail rows on a covered zero-call day correctly aggregate to zero.
    const reconciliation = dailyRows.filter(row => detailStart && detailEnd && row.date >= detailStart && row.date <= detailEnd).map(row => {
      const details = detailRows.filter(detail => detail.date === row.date)
      const detailCalls = total(details, 'calls')
      const detailSuccess = total(details, 'success')
      const detailFailed = total(details, 'failed')
      const delta = row.calls == null || detailCalls == null ? null : detailCalls - row.calls
      const successDelta = row.success == null || detailSuccess == null ? null : detailSuccess - row.success
      const failedDelta = row.failed == null || detailFailed == null ? null : detailFailed - row.failed
      return { date: row.date, overviewCalls: row.calls, detailCalls, delta, successDelta, failedDelta, matches: delta === 0 && (successDelta == null || successDelta === 0) && (failedDelta == null || failedDelta === 0) }
    })
    return { startDate: range.startDate, endDate: range.endDate, summary, windows, latest, dailyRows, quality, reconciliation }
  }

  /** @param {DailySkillRow[]} rows */
  function counters(rows) {
    const calls = total(rows, 'calls')
    const success = total(rows, 'success')
    const likes = total(rows, 'likes')
    const dislikes = total(rows, 'dislikes')
    return { calls, success, failed: total(rows, 'failed'), successRate: ratio(success, calls), likes, dislikes, feedbackCount: total(rows, 'feedbackCount'), likeRate: likes == null || dislikes == null ? null : ratio(likes, likes + dislikes) }
  }

  /** @param {DailySkillRow[]} rows @param {'skillId'|'creatorId'} key */
  function groupRows(rows, key) {
    /** @type {Map<string, DailySkillRow[]>} */
    const groups = new Map()
    for (const row of rows) groups.set(row[key], [...(groups.get(row[key]) || []), row])
    return [...groups.entries()].map(([id, group]) => {
      const dates = [...new Set(group.map(row => row.date))].sort()
      const modules = [...new Set(group.map(row => row.module))].sort()
      const creators = [...new Set(group.map(row => row.creator))].sort()
      const creatorIds = [...new Set(group.map(row => row.creatorId))].sort()
      return {
        id, name: key === 'skillId' ? group[0].name : group[0].creator,
        module: modules.join('、'), modules, creator: creators.join('、'), creatorIds,
        creatorId: creatorIds.length === 1 ? creatorIds[0] : '',
        creatorKnown: group.every(row => row.creatorKnown), moduleKnown: group.every(row => row.moduleKnown),
        users: key === 'skillId' && group.length === 1 ? group[0].users : null,
        ...counters(group), skillCount: new Set(group.map(row => row.skillId)).size,
        activeDays: dates.length, firstUsedAt: dates[0], lastUsedAt: dates.at(-1), newSkills: null,
      }
    }).sort((a, b) => (b.calls ?? 0) - (a.calls ?? 0) || a.id.localeCompare(b.id))
  }

  /** @param {DailyRange & DailyFilters} [options] */
  function getDailyAnalysis(options = {}) {
    const range = windowFor(options)
    const covered = !range.dateError && detailStart != null && detailEnd != null && range.startDate <= detailEnd && range.endDate >= detailStart
    const keyword = (options.search || '').trim().toLocaleLowerCase()
    const dailyRows = range.dateError ? [] : detailRows.filter(row => (
      row.date >= range.startDate && row.date <= range.endDate
      && (!options.module || options.module === 'all' || row.module === options.module)
      && (!options.creatorId || row.creatorId === options.creatorId)
      && (!options.skillId || row.skillId === options.skillId)
      && (options.dimension !== 'creators' || (row.creatorKnown && row.creatorId !== 'unattributed'))
      && (!keyword || (options.dimension === 'creators' ? [row.creator, row.creatorId] : [row.name, row.skillId, row.creator]).some(value => value.toLocaleLowerCase().includes(keyword)))
    )).map(row => ({ ...row }))
    const skills = groupRows(dailyRows, 'skillId')
    const creators = groupRows(dailyRows.filter(row => row.creatorKnown && row.creatorId !== 'unattributed'), 'creatorId')
    const counts = counters(dailyRows)
    const summary = {
      ...counts, calls: covered ? counts.calls : null, success: covered ? counts.success : null, failed: covered ? counts.failed : null,
      likes: covered ? counts.likes : null, dislikes: covered ? counts.dislikes : null, feedbackCount: covered ? counts.feedbackCount : null,
      skillCount: covered ? skills.length : null,
      creatorCount: covered ? creators.filter(row => row.id !== 'unattributed').length : null,
      users: null, newSkills: null,
    }
    const trendDates = range.dateError || !detailStart || !detailEnd ? [] : dateList(range.startDate > detailStart ? range.startDate : detailStart, range.endDate < detailEnd ? range.endDate : detailEnd)
    const trend = trendDates.map(date => {
      const rows = dailyRows.filter(row => row.date === date)
      return { date, ...counters(rows), skillCount: new Set(rows.map(row => row.skillId)).size, users: null }
    })
    return { startDate: range.startDate, endDate: range.endDate, dimension: options.dimension || 'skills', summary, trend, skills, creators, dailyRows, calls: [], quality: qualityFor(range, dailyRows) }
  }

  return { getDailyOverview, getDailyAnalysis }
}

const api = createDailyReportApi(sourceData)
export const getDailyOverview = api.getDailyOverview
export const getDailyAnalysis = api.getDailyAnalysis

/** @param {unknown} value */
function csvCell(value) {
  let text = value == null ? '' : String(value)
  if (/^(?:[\t\r\n]|[\s\uFEFF]*[=+\-@])/.test(text)) text = `'${text}`
  return /[,"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
/** @param {number|null|undefined} value */
const percent = value => value == null ? '' : `${(value * 100).toFixed(2)}%`
/** @param {string[]} header @param {unknown[][]} rows */
const csv = (header, rows) => `\uFEFF${[header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')}`

/** @param {ReadonlyArray<DailyOverviewRow>} rows */
export function dailyOverviewToCsv(rows) {
  const header = Object.values(sourceData.sourceHeaders['核心数据概览'])
  return csv(header, rows.map(row => [row.date, ...OVERVIEW_NUMBERS.map(key => key === 'loginWauRate' || key === 'aiWauRate' ? percent(row[key]) : row[key])]))
}
/** @param {ReturnType<typeof getDailyAnalysis>['skills']} rows */
export function dailySkillRowsToCsv(rows) {
  return csv(['Skill ID', 'Skill名称', '菜单', '创建人', '调用用户数（不可跨日去重）', '调用次数', '成功次数', '失败次数', '成功率', '评价次数', '点赞次数', '点踩次数', '点赞率', '有调用日期数'], rows.map(row => [row.id, row.name, row.module, row.creator, row.users, row.calls, row.success, row.failed, percent(row.successRate), row.feedbackCount, row.likes, row.dislikes, percent(row.likeRate), row.activeDays]))
}
/** @param {ReturnType<typeof getDailyAnalysis>['creators']} rows */
export function dailyCreatorRowsToCsv(rows) {
  return csv(['创建人', '菜单', '范围内有明细Skill数', '调用用户数（不可跨Skill去重）', '调用次数', '成功次数', '失败次数', '成功率', '评价次数', '点赞次数', '点踩次数', '点赞率'], rows.map(row => [row.name, row.module, row.skillCount, row.users, row.calls, row.success, row.failed, percent(row.successRate), row.feedbackCount, row.likes, row.dislikes, percent(row.likeRate)]))
}
/** @param {ReadonlyArray<DailySkillRow>} rows */
export function dailyDetailRowsToCsv(rows) {
  return csv(Object.values(sourceData.sourceHeaders['skill数据明细']), rows.map(row => [row.date, row.skillId, row.name, row.module, row.users, row.calls, row.success, row.failed, row.feedbackCount, row.likes, row.dislikes, percent(row.likeRate), percent(row.dislikeRate), row.creator]))
}
