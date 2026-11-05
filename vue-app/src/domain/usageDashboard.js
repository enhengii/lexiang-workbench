/**
 * Fixed synthetic data for the usage-dashboard POC. This module never reads
 * accounts, production logs, network services or browser storage.
 *
 * @typedef {{ startDate?: string, endDate?: string, module?: string, search?: string }} UsageReportOptions
 * @typedef {{ id: string, name: string, module: string, creator: string, users: number, calls: number, success: number, failed: number, successRate: number|null, likes: number, dislikes: number, feedbackCount: number, likeRate: number|null }} UsageSkillRow
 * @typedef {{ totalUsers: number, loginUsers: number, aiUsers: number, queries: number, calls: number, success: number, failed: number, successRate: number|null, firstTokenSeconds: number|null, publishedSkills: number, newSkills: number, calledSkills: number, likes: number, dislikes: number }} UsageSummary
 * @typedef {{ date: string, loginUsers: number, aiUsers: number, queries: number, calls: number, success: number, failed: number }} UsageTrendRow
 * @typedef {{ dau: number, wau: number, mau: number }} UsageWindow
 * @typedef {{ startDate: string, endDate: string, summary: UsageSummary, trend: UsageTrendRow[], skills: UsageSkillRow[], filteredSkills: UsageSkillRow[], windows: { login: UsageWindow, ai: UsageWindow } }} UsageReport
 * @typedef {{ id: string, name: string, module: string, creator: string, publishedAt: string }} SampleSkill
 * @typedef {{ date: string, userId: string }} SampleVisit
 * @typedef {{ date: string, userId: string, firstTokenMs: number }} SampleQuery
 * @typedef {{ date: string, userId: string, skillId: string, succeeded: boolean, feedback: 'like'|'dislike'|null }} SampleCall
 */

export const USAGE_ANCHOR_DATE = '2026-11-04'

/** @type {ReadonlyArray<string>} */
export const USAGE_MODULES = Object.freeze(['企业客户管理', '订单管理', '会员管理', '商品管理', '营销运营'])

const DAY_MS = 24 * 60 * 60 * 1000
const SAMPLE_USER_COUNT = 50

/** @param {string} date @param {number} days @returns {string} */
const shiftDate = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)

// Ninety days ensure all of the latest thirty cutoffs have a full 30-day window.
const SAMPLE_START_DATE = shiftDate(USAGE_ANCHOR_DATE, -89)

/** @type {SampleSkill[]} */
const SAMPLE_SKILLS = [
  { id: 'sample.customer-query', name: '客户信息查询', module: '企业客户管理', creator: '样例创建者 A', publishedAt: shiftDate(USAGE_ANCHOR_DATE, -100) },
  { id: 'sample.order-status', name: '订单进度查询', module: '订单管理', creator: '样例创建者 B', publishedAt: shiftDate(USAGE_ANCHOR_DATE, -87) },
  { id: 'sample.member-benefits', name: '会员权益查询', module: '会员管理', creator: '样例创建者 C', publishedAt: shiftDate(USAGE_ANCHOR_DATE, -73) },
  { id: 'sample.product-query', name: '商品信息查询', module: '商品管理', creator: '样例创建者 D', publishedAt: shiftDate(USAGE_ANCHOR_DATE, -60) },
  { id: 'sample.campaign-query', name: '活动配置查询', module: '营销运营', creator: '样例创建者 E', publishedAt: shiftDate(USAGE_ANCHOR_DATE, -42) },
  { id: 'sample.customer-groups', name: '客户分组统计', module: '企业客户管理', creator: '样例创建者 F', publishedAt: shiftDate(USAGE_ANCHOR_DATE, -28) },
  { id: 'sample.order-summary', name: '订单明细汇总', module: '订单管理', creator: '样例创建者 G', publishedAt: shiftDate(USAGE_ANCHOR_DATE, -14) },
  { id: 'sample.member-levels', name: '会员等级分布', module: '会员管理', creator: '样例创建者 H', publishedAt: shiftDate(USAGE_ANCHOR_DATE, -6) },
  { id: 'sample.product-stock', name: '商品库存查询', module: '商品管理', creator: '样例创建者 I', publishedAt: shiftDate(USAGE_ANCHOR_DATE, -2) },
  { id: 'sample.operation-summary', name: '运营数据汇总', module: '营销运营', creator: '样例创建者 J', publishedAt: USAGE_ANCHOR_DATE },
]

/**
 * All aggregates derive from these same records. An AI Query is generated only
 * for a visitor; Skill calls are generated only for an AI Query and published
 * Skill. Sample calls have final success/failure states, without retry states.
 * @returns {{ visits: SampleVisit[], queries: SampleQuery[], calls: SampleCall[] }}
 */
function createSampleRecords() {
  /** @type {SampleVisit[]} */
  const visits = []
  /** @type {SampleQuery[]} */
  const queries = []
  /** @type {SampleCall[]} */
  const calls = []

  for (let dayIndex = 0; dayIndex < 90; dayIndex += 1) {
    const date = shiftDate(SAMPLE_START_DATE, dayIndex)
    const availableSkills = SAMPLE_SKILLS.filter((skill) => skill.publishedAt <= date)
    for (let userIndex = 0; userIndex < SAMPLE_USER_COUNT; userIndex += 1) {
      if ((userIndex * 11 + dayIndex * 7) % 23 >= 12 + dayIndex % 6) continue
      const userId = `sample-user-${String(userIndex + 1).padStart(2, '0')}`
      visits.push({ date, userId })
      if ((userIndex + dayIndex) % 5 >= 2 + dayIndex % 2) continue

      const queryCount = 1 + (userIndex + dayIndex) % 5
      for (let queryIndex = 0; queryIndex < queryCount; queryIndex += 1) {
        queries.push({
          date,
          userId,
          firstTokenMs: 850 + (userIndex * 191 + queryIndex * 113 + dayIndex * 79) % 3300,
        })
        // A Query may invoke zero, one or two Skills, so Query and call counts differ.
        const callCount = (userIndex + dayIndex + queryIndex) % 4 === 0
          ? 0
          : 1 + Number((userIndex + queryIndex + dayIndex) % 7 === 0)
        for (let callIndex = 0; callIndex < callCount; callIndex += 1) {
          const skill = availableSkills[(userIndex * 3 + dayIndex + queryIndex + callIndex) % availableSkills.length]
          const feedbackSeed = userIndex + dayIndex * 3 + queryIndex + callIndex
          calls.push({
            date,
            userId,
            skillId: skill.id,
            succeeded: feedbackSeed % 19 !== 0,
            feedback: feedbackSeed % 6 === 0 ? 'like' : feedbackSeed % 17 === 0 ? 'dislike' : null,
          })
        }
      }
    }
  }
  return { visits, queries, calls }
}

const SAMPLE_RECORDS = createSampleRecords()

/** @param {unknown} value @returns {boolean} */
function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
}

/** @param {{ userId: string }[]} records @returns {number} */
const uniqueUsers = (records) => new Set(records.map((record) => record.userId)).size

/** @param {number} numerator @param {number} denominator @returns {number|null} */
const ratio = (numerator, denominator) => denominator === 0 ? null : numerator / denominator

/** @param {string} startDate @param {string} endDate @returns {UsageReport} */
function emptyReport(startDate, endDate) {
  return {
    startDate,
    endDate,
    summary: {
      totalUsers: 0, loginUsers: 0, aiUsers: 0, queries: 0, calls: 0,
      success: 0, failed: 0, successRate: null, firstTokenSeconds: null,
      publishedSkills: 0, newSkills: 0, calledSkills: 0, likes: 0, dislikes: 0,
    },
    trend: [],
    skills: [],
    filteredSkills: [],
    windows: { login: { dau: 0, wau: 0, mau: 0 }, ai: { dau: 0, wau: 0, mau: 0 } },
  }
}

/** @param {SampleCall[]} calls @returns {UsageSkillRow[]} */
function aggregateSkills(calls) {
  return SAMPLE_SKILLS.flatMap((skill) => {
    const records = calls.filter((call) => call.skillId === skill.id)
    if (records.length === 0) return []
    const success = records.filter((call) => call.succeeded).length
    const likes = records.filter((call) => call.feedback === 'like').length
    const dislikes = records.filter((call) => call.feedback === 'dislike').length
    return [{
      id: skill.id,
      name: skill.name,
      module: skill.module,
      creator: skill.creator,
      users: uniqueUsers(records),
      calls: records.length,
      success,
      failed: records.length - success,
      successRate: ratio(success, records.length),
      likes,
      dislikes,
      feedbackCount: likes + dislikes,
      likeRate: ratio(likes, likes + dislikes),
    }]
  }).sort((left, right) => right.calls - left.calls || left.id.localeCompare(right.id))
}

/** @param {(SampleVisit|SampleQuery)[]} records @param {string} endDate @returns {UsageWindow} */
function rollingUsers(records, endDate) {
  /** @param {number} days @returns {number} */
  const count = (days) => {
    const from = shiftDate(endDate, 1 - days)
    return uniqueUsers(records.filter((record) => record.date >= from && record.date <= endDate))
  }
  return { dau: count(1), wau: count(7), mau: count(30) }
}

/**
 * Inclusive natural-day report. The default is the seven days ending at the
 * fixed anchor. With only endDate, the default start follows that cutoff.
 * Table filters do not change platform summaries, trend, windows or skills.
 * Ratios are fractions (0–1); missing denominators and latency return null.
 * Ranges outside the fixed sample history return an empty report, avoiding
 * partially populated reports that could suggest real data availability.
 * @param {UsageReportOptions} [options]
 * @returns {UsageReport}
 */
export function getUsageReport({ startDate, endDate, module = 'all', search = '' } = {}) {
  const to = endDate === undefined ? USAGE_ANCHOR_DATE : endDate
  const from = startDate === undefined ? isCalendarDate(to) ? shiftDate(to, -6) : '' : startDate
  const report = emptyReport(typeof from === 'string' ? from : '', typeof to === 'string' ? to : '')
  if (!isCalendarDate(from) || !isCalendarDate(to) || from > to || from < SAMPLE_START_DATE || to > USAGE_ANCHOR_DATE) {
    return report
  }

  /** @param {{ date: string }} record @returns {boolean} */
  const inPeriod = (record) => record.date >= from && record.date <= to
  const visits = SAMPLE_RECORDS.visits.filter(inPeriod)
  const queries = SAMPLE_RECORDS.queries.filter(inPeriod)
  const calls = SAMPLE_RECORDS.calls.filter(inPeriod)
  const skills = aggregateSkills(calls)
  const success = calls.filter((call) => call.succeeded).length
  const keyword = typeof search === 'string' ? search.trim().toLocaleLowerCase() : ''

  report.summary = {
    totalUsers: SAMPLE_USER_COUNT,
    loginUsers: uniqueUsers(visits),
    aiUsers: uniqueUsers(queries),
    queries: queries.length,
    calls: calls.length,
    success,
    failed: calls.length - success,
    successRate: ratio(success, calls.length),
    firstTokenSeconds: queries.length === 0 ? null : queries.reduce((total, query) => total + query.firstTokenMs, 0) / queries.length / 1000,
    publishedSkills: SAMPLE_SKILLS.filter((skill) => skill.publishedAt <= to).length,
    newSkills: SAMPLE_SKILLS.filter((skill) => skill.publishedAt >= from && skill.publishedAt <= to).length,
    calledSkills: skills.length,
    likes: calls.filter((call) => call.feedback === 'like').length,
    dislikes: calls.filter((call) => call.feedback === 'dislike').length,
  }

  for (let date = from; date <= to; date = shiftDate(date, 1)) {
    const dailyQueries = queries.filter((query) => query.date === date)
    const dailyCalls = calls.filter((call) => call.date === date)
    const dailySuccess = dailyCalls.filter((call) => call.succeeded).length
    report.trend.push({
      date,
      loginUsers: uniqueUsers(visits.filter((visit) => visit.date === date)),
      aiUsers: uniqueUsers(dailyQueries),
      queries: dailyQueries.length,
      calls: dailyCalls.length,
      success: dailySuccess,
      failed: dailyCalls.length - dailySuccess,
    })
  }

  report.skills = skills
  report.filteredSkills = skills.filter((skill) => (
    (module === 'all' || skill.module === module)
    && (!keyword || [skill.id, skill.name, skill.creator].some((value) => value.toLocaleLowerCase().includes(keyword)))
  )).map((skill) => ({ ...skill }))
  report.windows = {
    login: rollingUsers(SAMPLE_RECORDS.visits, to),
    ai: rollingUsers(SAMPLE_RECORDS.queries, to),
  }
  return report
}

/** @param {unknown} value @returns {string} */
function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value)
  // Prefix formula-like values before CSV escaping, including whitespace tricks.
  if (/^(?:[\t\r\n]|[\s\uFEFF]*[=+\-@])/.test(text)) text = `'${text}`
  return /[,"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * Export aggregate Skill rows only: no users, prompts, results or call payloads.
 * BOM supports Chinese column names in spreadsheet apps. Null ratios stay empty.
 * @param {ReadonlyArray<UsageSkillRow>} [rows]
 * @returns {string}
 */
export function usageRowsToCsv(rows = []) {
  const header = ['Skill ID', 'Skill名称', '所属模块', '创建人', '调用用户数', '调用次数', '成功次数', '失败次数', '成功率', '点赞次数', '点踩次数', '评价次数', '点赞率']
  /** @param {number|null} value @returns {string} */
  const percentage = (value) => value === null || value === undefined ? '' : `${(value * 100).toFixed(2)}%`
  const lines = rows.map((row) => [
    row.id, row.name, row.module, row.creator, row.users, row.calls,
    row.success, row.failed, percentage(row.successRate), row.likes,
    row.dislikes, row.feedbackCount, percentage(row.likeRate),
  ].map(csvCell).join(','))
  return `\uFEFF${[header.join(','), ...lines].join('\r\n')}`
}
