import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'

// Vite accepts static JSON imports. Supply Node's equivalent import attribute
// here without adding unsupported syntax to the project's production parser.
// module.register is supported across Node 22, including before 22.15.
register(`data:text/javascript,${encodeURIComponent(`
  export async function resolve(specifier, context, nextResolve) {
    const result = await nextResolve(specifier, context)
    return result.url.endsWith('/usageDailyReportData.json')
      ? { ...result, importAttributes: { type: 'json' } } : result
  }
`)}`, import.meta.url)

test('daily-report API preserves source aggregates without inventing deduplicated users', async (t) => {
  let api
  try { api = await import('../src/domain/usageDailyReport.js') }
  catch (error) { assert.fail(`The real daily-report API must exist: ${error.message}`) }

  await t.test('keeps the supplied source provenance and both distinct coverage ranges', () => {
    assert.equal(api.USAGE_DAILY_SOURCE.sha256, '681df3d465f49298ea73e9493d0d3cc389a0c1a1c1b6c3f93a5abc2586bcf080')
    assert.deepEqual(api.USAGE_DAILY_SOURCE.counts, { overviewRows: 80, detailRows: 148, skills: 66, creators: 13, unknownCreatorRows: 18, missingModuleRows: 28 })
    assert.equal(api.USAGE_DAILY_START_DATE, '2026-08-18')
    assert.equal(api.USAGE_DAILY_END_DATE, '2026-11-05')
    assert.equal(api.USAGE_DAILY_DEFINITIONS.length, 35)
  })

  await t.test('sums additive metrics but uses the cutoff snapshot and original rolling counts', () => {
    const report = api.getDailyOverview()
    assert.equal(report.startDate, '2026-10-30')
    assert.equal(report.endDate, '2026-11-05')
    assert.deepEqual(report.windows, { login: { dau: 59, wau: 117, mau: 145 }, ai: { dau: 11, wau: 29, mau: 43 } })
    for (const [key, expected] of Object.entries({ queries: 206, tasks: 118, taskSuccess: 112, taskFailed: 6, calls: 141, success: 133, failed: 8, newSkills: 19, totalUsers: 255, totalSkills: 138 })) assert.equal(report.summary[key], expected, key)
    assert.equal(report.summary.asOfDate, '2026-11-05')
    assert.equal(report.summary.loginUsers, null)
    assert.equal(report.summary.aiUsers, null)
    assert.equal(report.summary.calledSkills, null)
    assert.equal(report.dailyRows.at(-1).loginWauRate, 0.4588)
    assert.equal(report.dailyRows.at(-1).aiWauRate, 0.1137)
    assert.equal(report.summary.taskSuccessRate, 112 / 118)
    assert.equal(report.summary.successRate, 133 / 141)
    assert.ok(Math.abs(report.summary.firstTokenSeconds - 6.933398058252426) < 1e-12)
    assert.equal(report.quality.firstTokenEstimated, true)
    assert.equal(report.quality.missingQueryCount, 0)
  })

  await t.test('retains all twenty source overview fields and true zero-query missing latency', () => {
    const report = api.getDailyOverview({ startDate: '2026-10-31', endDate: '2026-10-31' })
    assert.equal(report.dailyRows[0].queries, 0)
    assert.equal(report.dailyRows[0].firstTokenSeconds, null)
    assert.equal(report.summary.firstTokenSeconds, null)
    assert.equal(report.summary.successRate, null)
    assert.equal(report.summary.taskSuccessRate, null)
    assert.equal(report.quality.missingQueryCount, 0)
  })

  await t.test('does not turn a missing positive-query latency into zero or a complete weighted mean', () => {
    const { getDailyOverview } = api.createDailyReportApi({
      overviewRows: [
        { date: '2026-11-04', queries: 3, firstTokenSeconds: 2 },
        { date: '2026-11-05', queries: 2, firstTokenSeconds: null },
      ], detailRows: [],
    })
    const report = getDailyOverview({ startDate: '2026-11-04', endDate: '2026-11-05' })
    assert.equal(report.summary.firstTokenSeconds, null)
    assert.equal(report.quality.missingQueryCount, 2)
    assert.deepEqual(report.quality.missingLatencyDates, ['2026-11-05'])
  })

  await t.test('keeps unknown attribution on its original rows rather than borrowing another day', () => {
    const report = api.getDailyAnalysis({ startDate: '2026-10-08', endDate: '2026-11-05' })
    assert.equal(report.dailyRows.length, 148)
    assert.equal(report.summary.skillCount, 66)
    assert.equal(report.summary.creatorCount, 13)
    assert.equal(report.quality.unknownCreatorRows, 18)
    assert.equal(report.quality.missingModuleRows, 28)
    assert.ok(report.creators.every(row => row.id !== 'unattributed'))
    assert.equal(report.dailyRows.find(row => row.skillId === 'report-generator').creatorId, 'unattributed')
    assert.equal(report.dailyRows.find(row => row.skillId === 'report-generator').module, '未标注')
    assert.equal(report.summary.newSkills, null)
    assert.equal(report.summary.users, null)
    assert.deepEqual(report.calls, [])
    assert.ok(report.creators.every(row => row.users === null))
  })

  await t.test('aggregates success and feedback from counts, and never adds distinct users', () => {
    const report = api.getDailyAnalysis({ startDate: '2026-10-08', endDate: '2026-11-05' })
    assert.equal(report.summary.calls, 376)
    assert.equal(report.summary.success, 353)
    assert.equal(report.summary.failed, 23)
    assert.equal(report.summary.likes, 1)
    assert.equal(report.summary.dislikes, 0)
    assert.equal(report.summary.likeRate, 1)
    assert.equal(report.summary.successRate, 353 / 376)
    const lastDay = api.getDailyAnalysis({ startDate: '2026-11-05', endDate: '2026-11-05' })
    assert.equal(lastDay.summary.calls, 30)
    assert.ok(lastDay.skills.every(row => row.users >= 1))
    assert.ok(report.skills.filter(row => row.activeDays > 1).every(row => row.users === null))
    assert.ok(report.skills.filter(row => row.feedbackCount === 0).every(row => row.likeRate === null))
  })

  await t.test('combines date, module, creator, Skill and case-insensitive search on real daily rows', () => {
    const report = api.getDailyAnalysis({ startDate: '2026-10-08', endDate: '2026-10-08', module: 'CMSSaaS', creatorId: 'zhangcj21', skillId: 'form-data-query-export', search: ' FORM-DATA ' })
    assert.equal(report.dailyRows.length, 1)
    assert.equal(report.summary.calls, 5)
    assert.equal(report.skills[0].users, 1)
    assert.equal(report.creators[0].users, null)
    assert.equal(report.summary.creatorCount, 1)
    const none = api.getDailyAnalysis({ module: '不存在' })
    assert.equal(none.summary.calls, 0)
    assert.deepEqual(none.skills, [])
    assert.equal(none.summary.successRate, null)
  })

  await t.test('counts Skill identities in scope rather than daily rows and excludes unknown creators', () => {
    const report = api.getDailyAnalysis({ startDate: '2026-10-08', endDate: '2026-11-05', creatorId: 'unattributed' })
    assert.equal(report.dailyRows.length, 18)
    assert.equal(report.summary.creatorCount, 0)
    assert.ok(report.summary.skillCount < report.dailyRows.length)
    assert.ok(report.dailyRows.every(row => row.creatorKnown === false))
  })

  await t.test('searches creator identities without reducing their contribution to matching Skill names', () => {
    const scope = { startDate: '2026-10-08', endDate: '2026-11-05' }
    const creator = api.getDailyAnalysis({ ...scope, dimension: 'creators', search: ' ZHANGCJ21 ' })
    assert.equal(creator.dailyRows.length, 13)
    assert.equal(creator.summary.calls, 27)
    assert.equal(creator.summary.skillCount, 7)
    const scopedCreator = api.getDailyAnalysis({ startDate: '2026-10-21', endDate: '2026-10-28', module: '内容管理', dimension: 'creators', search: 'zhangcj21' })
    assert.equal(scopedCreator.dailyRows.length, 6)
    assert.equal(scopedCreator.summary.calls, 9)
    assert.equal(scopedCreator.summary.skillCount, 3)
    const wrongDimension = api.getDailyAnalysis({ ...scope, dimension: 'creators', search: 'form-data-query-export' })
    assert.deepEqual(wrongDimension.creators, [])
    assert.deepEqual(wrongDimension.dailyRows, [])
    const skills = api.getDailyAnalysis({ ...scope, dimension: 'skills', search: 'form-data-query-export' })
    assert.equal(skills.dailyRows.length, 3)
    assert.equal(skills.summary.calls, 13)
  })

  await t.test('excludes unattributed contributions consistently from creator tables, quality, totals and exports', () => {
    const scope = { startDate: '2026-10-08', endDate: '2026-11-05' }
    const skills = api.getDailyAnalysis(scope)
    const creators = api.getDailyAnalysis({ ...scope, dimension: 'creators' })
    const knownRows = skills.dailyRows.filter(row => row.creatorKnown && row.creatorId !== 'unattributed')
    assert.equal(skills.dailyRows.length, 148, 'Skill analysis keeps every original daily row')
    assert.equal(skills.summary.calls, 376, 'Skill totals remain unchanged')
    assert.deepEqual(creators.dailyRows, knownRows)
    assert.equal(creators.creators.length, 13)
    assert.equal(creators.summary.creatorCount, creators.creators.length)
    for (const key of ['calls', 'success', 'failed', 'likes', 'dislikes', 'feedbackCount']) {
      const expected = knownRows.reduce((sum, row) => sum + row[key], 0)
      assert.equal(creators.summary[key], expected, key)
      assert.equal(creators.creators.reduce((sum, row) => sum + row[key], 0), expected, `creator groups: ${key}`)
      assert.equal(creators.trend.reduce((sum, row) => sum + row[key], 0), expected, `daily trend: ${key}`)
    }
    assert.equal(creators.summary.successRate, creators.summary.success / creators.summary.calls)
    assert.ok(creators.creators.every(row => row.id !== 'unattributed' && row.name !== '未标注'))
    const creatorCsv = api.dailyCreatorRowsToCsv(creators.creators).split('\r\n').slice(1)
    assert.equal(creatorCsv.length, 13)
    assert.ok(creatorCsv.every(line => !/^(?:未标注|unattributed),/.test(line)))
    const unknown = api.getDailyAnalysis({ ...scope, dimension: 'creators', search: '未标注' })
    assert.deepEqual(unknown.dailyRows, [])
    assert.deepEqual(unknown.creators, [])
    assert.equal(unknown.summary.calls, 0)
    assert.equal(unknown.summary.successRate, null)
  })

  await t.test('keeps a known creator with a missing menu while excluding unknown and reserved creator identities', () => {
    const date = '2026-11-05'
    const daily = api.createDailyReportApi({ overviewRows: [{ date }], detailRows: [
      { date, skillId: 'known', creatorId: 'alice', creator: 'alice', calls: 5 },
      { date, skillId: 'missing', calls: 8 },
      { date, skillId: 'flagged-unknown', creatorId: 'not-confirmed', creator: '未标注', creatorKnown: false, calls: 3 },
      { date, skillId: 'reserved', creatorId: 'unattributed', creator: '未标注', creatorKnown: true, calls: 9 },
    ] })
    const scope = { startDate: date, endDate: date }
    const creators = daily.getDailyAnalysis({ ...scope, dimension: 'creators' })
    assert.deepEqual(creators.dailyRows.map(row => row.skillId), ['known'])
    assert.equal(creators.creators[0].id, 'alice')
    assert.equal(creators.creators[0].module, '未标注', 'Missing menu does not discard a known creator')
    assert.equal(creators.summary.calls, 5)
    assert.equal(daily.getDailyAnalysis(scope).dailyRows.length, 4, 'Raw Skill contributions are preserved')
    assert.deepEqual(daily.getDailyAnalysis({ ...scope, dimension: 'creators', creatorId: 'unattributed' }).dailyRows, [])
  })

  await t.test('reconciles every covered date, accepting zero-call dates without detail rows', () => {
    const report = api.getDailyOverview({ startDate: '2026-10-08', endDate: '2026-11-05' })
    assert.equal(report.reconciliation.length, 29)
    assert.ok(report.reconciliation.every(row => row.matches))
    assert.equal(report.reconciliation.find(row => row.date === '2026-10-11').detailCalls, 0)
    assert.equal(report.reconciliation.find(row => row.date === '2026-11-05').detailCalls, 30)
    const custom = api.createDailyReportApi({ overviewRows: [{ date: '2026-11-05', calls: 5, queries: 0 }], detailRows: [{ date: '2026-11-05', skillId: 'one', calls: 3 }] }).getDailyOverview({ startDate: '2026-11-05', endDate: '2026-11-05' })
    assert.equal(custom.reconciliation[0].delta, -2)
    assert.equal(custom.reconciliation[0].matches, false)
  })

  await t.test('rejects malformed, reversed and out-of-range windows without stale snapshots', () => {
    for (const [startDate, endDate] of [['2026-02-30', '2026-11-05'], ['2026-11-05', '2026-11-04'], ['2026-08-01', '2026-11-05'], ['2026-11-05', '2026-11-06']]) {
      const overview = api.getDailyOverview({ startDate, endDate })
      assert.deepEqual(overview.dailyRows, [])
      assert.equal(overview.summary.totalUsers, null)
      assert.equal(overview.summary.asOfDate, null)
      assert.ok(overview.quality.dateError)
    }
    const early = api.getDailyAnalysis({ startDate: '2026-08-18', endDate: '2026-08-18' })
    assert.deepEqual(early.dailyRows, [])
    assert.equal(early.summary.calls, null)
    assert.equal(early.summary.skillCount, null)
    assert.equal(early.quality.detailCoverageStart, '2026-10-08')
  })

  await t.test('exports aggregate and daily rows with empty unknown metrics and safe formula cells', () => {
    const daily = api.getDailyOverview({ startDate: '2026-11-05', endDate: '2026-11-05' })
    assert.ok(api.dailyOverviewToCsv(daily.dailyRows).includes('2026-11-05,59,117,145,11,29,43,255,45.88%,11.37%,36,24,20,4,138,2,8,30,25,5,3.67'))
    const report = api.getDailyAnalysis({ startDate: '2026-10-08', endDate: '2026-11-05' })
    const skillCsv = api.dailySkillRowsToCsv([{ ...report.skills[0], name: '=1+1', users: null }])
    assert.ok(skillCsv.includes("'=1+1"))
    assert.ok(!skillCsv.includes('null'))
    assert.equal(api.dailyCreatorRowsToCsv(report.creators).split('\r\n').length, report.creators.length + 1)
    assert.equal(api.dailyDetailRowsToCsv(report.dailyRows).split('\r\n').length, 149)
  })

  await t.test('returns detached objects so a view cannot modify later reports', () => {
    const report = api.getDailyOverview()
    report.dailyRows[0].queries = -1
    report.summary.totalUsers = -1
    assert.equal(api.getDailyOverview().dailyRows[0].queries, 36)
    assert.equal(api.getDailyOverview().summary.totalUsers, 255)
    const details = api.getDailyAnalysis()
    details.dailyRows[0].name = 'changed'
    assert.notEqual(api.getDailyAnalysis().dailyRows[0].name, 'changed')
  })
})
