import assert from 'node:assert/strict'
import test from 'node:test'

const DAY_MS = 24 * 60 * 60 * 1000
const shiftDate = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0)
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} should equal ${expected}`)

test('usage dashboard computes an internally consistent synthetic report', async (t) => {
  let api
  try {
    api = await import('../src/domain/usageDashboard.js')
  } catch (error) {
    assert.fail(`The usage dashboard data API must exist: ${error.message}`)
  }
  const { USAGE_ANCHOR_DATE, USAGE_MODULES, getUsageReport, usageRowsToCsv } = api

  await t.test('defaults to seven inclusive calendar days with the fixed fifty-user sample', () => {
    const report = getUsageReport()
    assert.equal(USAGE_ANCHOR_DATE, '2026-11-04')
    assert.equal(report.startDate, '2026-10-29')
    assert.equal(report.endDate, USAGE_ANCHOR_DATE)
    assert.equal(report.trend.length, 7)
    assert.equal(report.summary.totalUsers, 50)
    assert.ok(USAGE_MODULES.length > 0)
    assert.ok(USAGE_MODULES.every((module) => typeof module === 'string'))
    assert.ok(report.summary.publishedSkills >= 8 && report.summary.publishedSkills <= 12)
  })

  await t.test('includes both date boundaries and reconciles daily additive metrics', () => {
    const report = getUsageReport({ startDate: '2026-11-02', endDate: '2026-11-04' })
    assert.deepEqual(report.trend.map(({ date }) => date), ['2026-11-02', '2026-11-03', '2026-11-04'])
    for (const key of ['queries', 'calls', 'success', 'failed']) {
      assert.equal(report.summary[key], sum(report.trend, key))
    }
    const firstDay = getUsageReport({ startDate: '2026-11-02', endDate: '2026-11-02' })
    assert.equal(firstDay.trend.length, 1)
    assert.equal(firstDay.summary.queries, report.trend[0].queries)
    assert.equal(getUsageReport({ endDate: '2026-11-03' }).startDate, '2026-10-28')
  })

  await t.test('deduplicates people across days and keeps AI users within visiting users', () => {
    const report = getUsageReport()
    assert.ok(report.summary.loginUsers < sum(report.trend, 'loginUsers'))
    assert.ok(report.summary.aiUsers < sum(report.trend, 'aiUsers'))
    assert.ok(report.summary.loginUsers <= 50)
    assert.ok(report.summary.aiUsers <= report.summary.loginUsers)
    for (const day of report.trend) {
      assert.ok(day.aiUsers <= day.loginUsers)
      assert.ok(day.queries >= day.aiUsers)
    }
    assert.ok(report.skills.some((skill) => skill.users < skill.calls))
    assert.ok(sum(report.skills, 'users') > report.summary.aiUsers, 'cross-Skill users overlap and cannot be added')
  })

  await t.test('provides complete rolling windows for every cutoff in the latest thirty days', () => {
    for (let offset = 0; offset < 30; offset += 1) {
      const endDate = shiftDate(USAGE_ANCHOR_DATE, -offset)
      const day = getUsageReport({ startDate: endDate, endDate })
      const week = getUsageReport({ startDate: shiftDate(endDate, -6), endDate })
      const month = getUsageReport({ startDate: shiftDate(endDate, -29), endDate })
      for (const [windowKey, summaryKey] of [['login', 'loginUsers'], ['ai', 'aiUsers']]) {
        assert.equal(day.windows[windowKey].dau, day.summary[summaryKey])
        assert.equal(day.windows[windowKey].wau, week.summary[summaryKey])
        assert.equal(day.windows[windowKey].mau, month.summary[summaryKey])
        assert.ok(day.windows[windowKey].dau <= day.windows[windowKey].wau)
        assert.ok(day.windows[windowKey].wau <= day.windows[windowKey].mau)
      }
      assert.equal(month.trend.length, 30)
    }
  })

  await t.test('weights first-token latency by Query counts rather than averaging daily averages', () => {
    const report = getUsageReport()
    const daily = report.trend.map(({ date }) => getUsageReport({ startDate: date, endDate: date }).summary)
    const weighted = daily.reduce((total, day) => total + day.firstTokenSeconds * day.queries, 0) / report.summary.queries
    closeTo(report.summary.firstTokenSeconds, weighted)
    const unweighted = daily.reduce((total, day) => total + day.firstTokenSeconds, 0) / daily.length
    assert.ok(Math.abs(weighted - unweighted) > 1e-6, 'the sample must expose an incorrect unweighted average')
  })

  await t.test('reconciles Skill aggregates, terminal states and feedback denominators', () => {
    const report = getUsageReport()
    assert.equal(report.summary.calledSkills, report.skills.length)
    for (const key of ['calls', 'success', 'failed', 'likes', 'dislikes']) {
      assert.equal(report.summary[key], sum(report.skills, key))
    }
    assert.equal(report.summary.calls, report.summary.success + report.summary.failed)
    closeTo(report.summary.successRate, report.summary.success / report.summary.calls)
    for (const skill of report.skills) {
      assert.equal(skill.calls, skill.success + skill.failed)
      assert.equal(skill.feedbackCount, skill.likes + skill.dislikes)
      assert.ok(skill.users <= report.summary.aiUsers)
      closeTo(skill.successRate, skill.success / skill.calls)
      if (skill.feedbackCount === 0) assert.equal(skill.likeRate, null)
      else closeTo(skill.likeRate, skill.likes / skill.feedbackCount)
    }
  })

  await t.test('counts new publications within the inclusive period', () => {
    const report = getUsageReport({ startDate: '2026-10-06', endDate: USAGE_ANCHOR_DATE })
    assert.ok(report.summary.newSkills > 0)
    let dailyNew = 0
    for (const { date } of report.trend) {
      const day = getUsageReport({ startDate: date, endDate: date })
      const previous = getUsageReport({ startDate: shiftDate(date, -1), endDate: shiftDate(date, -1) })
      dailyNew += day.summary.newSkills
      assert.equal(day.summary.publishedSkills - previous.summary.publishedSkills, day.summary.newSkills)
    }
    assert.equal(report.summary.newSkills, dailyNew)
  })

  await t.test('filters only the Skill table, searching identifiers, names and creators', () => {
    const baseline = getUsageReport()
    const skill = baseline.skills[0]
    for (const search of [skill.id.toUpperCase(), skill.name, skill.creator]) {
      const report = getUsageReport({ module: skill.module, search: `  ${search}  ` })
      assert.deepEqual(report.summary, baseline.summary)
      assert.deepEqual(report.trend, baseline.trend)
      assert.deepEqual(report.windows, baseline.windows)
      assert.deepEqual(report.skills, baseline.skills)
      assert.ok(report.filteredSkills.some(({ id }) => id === skill.id))
      assert.ok(report.filteredSkills.every((row) => row.module === skill.module))
    }
    const none = getUsageReport({ module: '不存在的模块', search: '不存在的Skill' })
    assert.equal(none.filteredSkills.length, 0)
    assert.deepEqual(none.summary, baseline.summary)
  })

  await t.test('returns a stable empty report for invalid, reversed or unavailable dates', () => {
    for (const [startDate, endDate] of [
      ['2026-02-30', USAGE_ANCHOR_DATE],
      ['2026-2-01', USAGE_ANCHOR_DATE],
      ['not-a-date', USAGE_ANCHOR_DATE],
      ['2026-11-05', '2026-11-04'],
      ['2026-11-05', '2026-11-06'],
      ['2025-01-01', '2025-01-02'],
      ['2026-01-01', '2026-11-04'],
    ]) {
      const report = getUsageReport({ startDate, endDate })
      assert.deepEqual(report.trend, [])
      assert.deepEqual(report.skills, [])
      assert.deepEqual(report.filteredSkills, [])
      for (const [key, value] of Object.entries(report.summary)) {
        assert.equal(value, ['successRate', 'firstTokenSeconds'].includes(key) ? null : 0, key)
      }
      assert.deepEqual(report.windows, { login: { dau: 0, wau: 0, mau: 0 }, ai: { dau: 0, wau: 0, mau: 0 } })
    }
  })

  await t.test('does not leak returned object mutations into future reports', () => {
    const baseline = getUsageReport()
    const snapshot = structuredClone(baseline)
    baseline.summary.calls = -1
    baseline.skills[0].name = 'changed'
    baseline.trend.pop()
    baseline.windows.login.dau = -1
    assert.deepEqual(getUsageReport(), snapshot)
  })

  await t.test('exports Chinese aggregate columns without adding people or result payloads', () => {
    const csv = usageRowsToCsv(getUsageReport().filteredSkills)
    assert.ok(csv.startsWith('\uFEFFSkill ID,Skill名称,所属模块,创建人,调用用户数,调用次数,成功次数,失败次数,成功率,点赞次数,点踩次数,评价次数,点赞率\r\n'))
    assert.ok(!csv.includes('调用结果'))
    assert.ok(!csv.includes('用户ID'))
    assert.equal(usageRowsToCsv([]).split('\r\n').length, 1)
  })

  await t.test('escapes CSV punctuation, keeps missing ratios empty and neutralizes spreadsheet formulas', () => {
    const base = {
      id: 'sample', name: '带,逗号和"引号"\n换行', module: '商品管理', creator: '样例创建者',
      users: 0, calls: 0, success: 0, failed: 0, successRate: null,
      likes: 0, dislikes: 0, feedbackCount: 0, likeRate: null,
    }
    const csv = usageRowsToCsv([base])
    assert.ok(csv.includes('"带,逗号和""引号""\n换行"'))
    assert.ok(csv.endsWith(',0,0,0,0,,0,0,0,'))
    for (const name of ['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', '  =1+1', '\t=1+1', '\r=1+1']) {
      const exported = usageRowsToCsv([{ ...base, name }])
      assert.ok(exported.includes(`'${name}`), `formula-like cell must be neutralized: ${JSON.stringify(name)}`)
    }
  })
})

test('usage analysis keeps Skill and creator quality views in one filtered scope', async (t) => {
  const api = await import('../src/domain/usageDashboard.js')
  assert.equal(typeof api.getUsageAnalysis, 'function', 'the dimension analysis API must exist')
  const { getUsageAnalysis, getUsageReport, usageRowsToCsv, usageCreatorsToCsv, usageCallsToCsv } = api

  await t.test('preserves the existing sample call and Query counts while sharing their source', () => {
    const legacy = getUsageReport()
    assert.deepEqual(
      ['queries', 'calls', 'success', 'failed', 'likes', 'dislikes'].map((key) => legacy.summary[key]),
      [217, 180, 172, 8, 22, 10],
    )
    const report = getUsageAnalysis()
    assert.equal(report.startDate, legacy.startDate)
    assert.equal(report.endDate, legacy.endDate)
    for (const key of ['calls', 'success', 'failed', 'likes', 'dislikes', 'newSkills', 'calledSkills']) {
      assert.equal(report.summary[key], legacy.summary[key])
    }
    assert.equal(report.summary.skillCount, 10)
    assert.equal(report.summary.creatorCount, 5)
    assert.equal(report.skills.length, 10)
    assert.equal(report.creators.length, 5)
    assert.ok(report.creators.every((creator) => creator.skillCount === 2))
  })

  await t.test('aggregates quality from calls instead of averaging Skill percentages or durations', () => {
    const report = getUsageAnalysis()
    assert.equal(report.summary.calls, report.calls.length)
    assert.equal(report.summary.success, report.calls.filter((call) => call.status === 'success').length)
    assert.equal(report.summary.failed, report.calls.filter((call) => call.status === 'failed').length)
    assert.equal(report.summary.likes, report.calls.filter((call) => call.feedback === 'like').length)
    assert.equal(report.summary.dislikes, report.calls.filter((call) => call.feedback === 'dislike').length)
    assert.equal(report.summary.feedbackCount, report.summary.likes + report.summary.dislikes)
    closeTo(report.summary.successRate, 172 / 180)
    closeTo(report.summary.likeRate, 22 / 32)
    closeTo(report.summary.avgDurationSeconds, sum(report.calls, 'durationSeconds') / report.calls.length)
    for (const creator of report.creators) {
      const calls = report.calls.filter((call) => call.creatorId === creator.id)
      closeTo(creator.avgDurationSeconds, sum(calls, 'durationSeconds') / calls.length)
      closeTo(creator.successRate, calls.filter((call) => call.status === 'success').length / calls.length)
      const feedback = calls.filter((call) => call.feedback !== null)
      if (feedback.length) closeTo(creator.likeRate, feedback.filter((call) => call.feedback === 'like').length / feedback.length)
    }
    const unweightedSuccess = sum(report.skills, 'successRate') / report.skills.length
    assert.ok(Math.abs(unweightedSuccess - report.summary.successRate) > 1e-6, 'unequal volumes must expose an unweighted success-rate bug')
    const unweightedDuration = sum(report.skills, 'avgDurationSeconds') / report.skills.length
    assert.ok(Math.abs(unweightedDuration - report.summary.avgDurationSeconds) > 1e-6, 'unequal volumes must expose an unweighted duration bug')
  })

  await t.test('deduplicates users across Skills and creators instead of adding row user counts', () => {
    const report = getUsageAnalysis()
    assert.ok(report.summary.users > 0 && report.summary.users <= 50)
    assert.ok(report.summary.users < sum(report.skills, 'users'))
    assert.ok(report.summary.users < sum(report.creators, 'users'))
    assert.ok(report.creators.some((creator) => creator.users < sum(report.skills.filter((skill) => skill.creatorId === creator.id), 'users')))
    for (const creator of report.creators) {
      const scoped = getUsageAnalysis({ creatorId: creator.id })
      assert.equal(scoped.summary.users, creator.users)
      assert.equal(scoped.summary.calls, creator.calls)
      assert.equal(scoped.summary.skillCount, creator.skillCount)
      for (const skill of scoped.skills) {
        const single = getUsageAnalysis({ creatorId: creator.id, skillId: skill.id })
        assert.equal(single.summary.users, skill.users)
        assert.equal(single.summary.calls, skill.calls)
      }
    }
  })

  await t.test('keeps already-published zero-call Skills and their creator, with null denominators', () => {
    const report = getUsageAnalysis({ startDate: '2026-11-03', endDate: '2026-11-03', creatorId: 'sample.creator-a' })
    assert.equal(report.summary.skillCount, 2)
    assert.equal(report.summary.creatorCount, 1)
    assert.equal(report.summary.calledSkills, 0)
    assert.equal(report.summary.calls, 0)
    assert.equal(report.summary.users, 0)
    assert.equal(report.skills.length, 2)
    assert.equal(report.creators.length, 1)
    assert.deepEqual(report.calls, [])
    for (const row of [report.summary, ...report.skills, ...report.creators]) {
      assert.equal(row.successRate, null)
      assert.equal(row.likeRate, null)
      assert.equal(row.avgDurationSeconds, null)
    }
    assert.deepEqual(report.trend, [{ date: '2026-11-03', users: 0, calls: 0, success: 0, failed: 0, likes: 0, dislikes: 0, successRate: null, likeRate: null }])
    const unreviewed = getUsageAnalysis({ startDate: '2026-11-03', endDate: '2026-11-03', skillId: 'sample.order-status' })
    assert.equal(unreviewed.summary.calls, 5)
    assert.equal(unreviewed.summary.feedbackCount, 0)
    assert.equal(unreviewed.summary.likeRate, null)
    assert.ok(unreviewed.summary.successRate !== null)
  })

  await t.test('uses the cutoff catalog, inclusive publication dates and complete daily trends', () => {
    const report = getUsageAnalysis({ startDate: '2026-11-02', endDate: '2026-11-03' })
    assert.equal(report.summary.skillCount, 9)
    assert.equal(report.summary.newSkills, 1)
    assert.ok(!report.skills.some((skill) => skill.id === 'sample.operation-summary'))
    assert.ok(report.skills.every((skill) => skill.publishedAt <= '2026-11-03'))
    assert.deepEqual(report.trend.map(({ date }) => date), ['2026-11-02', '2026-11-03'])
    for (const key of ['calls', 'success', 'failed', 'likes', 'dislikes']) {
      assert.equal(sum(report.trend, key), report.summary[key])
      assert.equal(sum(report.skills, key), report.summary[key])
      assert.equal(sum(report.creators, key), report.summary[key])
    }
    assert.ok(report.calls.every((call) => call.date >= '2026-11-02' && call.date <= '2026-11-03'))
    const publication = getUsageAnalysis({ startDate: '2026-11-04', endDate: '2026-11-04', skillId: 'sample.operation-summary' })
    assert.equal(publication.summary.newSkills, 1)
    assert.equal(publication.summary.skillCount, 1)
    assert.equal(getUsageAnalysis({ endDate: '2026-11-03' }).startDate, '2026-10-28')
  })

  await t.test('applies catalog filters to every analysis region while leaving the legacy report global', () => {
    const baseline = getUsageReport()
    const report = getUsageAnalysis({ module: '企业客户管理', creatorId: 'sample.creator-a', skillId: 'sample.customer-query' })
    assert.equal(report.summary.skillCount, 1)
    assert.equal(report.summary.creatorCount, 1)
    assert.ok(report.calls.length > 0)
    assert.ok(report.skills.every((skill) => skill.id === 'sample.customer-query'))
    assert.ok(report.calls.every((call) => call.skillId === 'sample.customer-query' && call.creatorId === 'sample.creator-a' && call.module === '企业客户管理'))
    assert.equal(sum(report.trend, 'calls'), report.summary.calls)
    assert.deepEqual(getUsageReport(), baseline)
    const wrongOwner = getUsageAnalysis({ creatorId: 'sample.creator-b', skillId: 'sample.customer-query' })
    assert.equal(wrongOwner.summary.skillCount, 0)
    assert.equal(wrongOwner.summary.calls, 0)
    assert.equal(wrongOwner.trend.length, 7, 'a valid empty scope keeps the selected calendar days')
  })

  await t.test('searches the active dimension and preserves scope when drilling down', () => {
    for (const search of ['客户信息查询', 'SAMPLE.CUSTOMER-QUERY']) {
      const skills = getUsageAnalysis({ dimension: 'skills', search: ` ${search} ` })
      assert.equal(skills.summary.skillCount, 1)
      assert.equal(skills.skills[0].id, 'sample.customer-query')
    }
    for (const search of ['样例创建者 A', 'SAMPLE.CREATOR-A']) {
      const creator = getUsageAnalysis({ dimension: 'creators', search })
      assert.equal(creator.summary.creatorCount, 1)
      assert.equal(creator.summary.skillCount, 2)
      assert.equal(creator.creators[0].id, 'sample.creator-a')
    }
    assert.equal(getUsageAnalysis({ dimension: 'creators', search: '客户信息查询' }).summary.skillCount, 0)
    const byName = getUsageAnalysis({ dimension: 'skills', search: '样例创建者 A' })
    assert.equal(byName.summary.skillCount, 2)
    const detail = getUsageAnalysis({ dimension: 'creators', search: '样例创建者 A', creatorId: 'sample.creator-a', skillId: 'sample.product-query' })
    assert.equal(detail.summary.skillCount, 1)
    assert.ok(detail.calls.every((call) => call.skillId === 'sample.product-query'))
  })

  await t.test('returns only safe, stable sample call details in Beijing calendar time', () => {
    const report = getUsageAnalysis()
    const expectedKeys = ['creatorId', 'creatorName', 'date', 'durationSeconds', 'failureReason', 'feedback', 'id', 'module', 'occurredAt', 'skillId', 'skillName', 'status']
    assert.equal(new Set(report.calls.map((call) => call.id)).size, report.calls.length)
    for (const call of report.calls) {
      assert.deepEqual(Object.keys(call).sort(), expectedKeys)
      assert.match(call.occurredAt, /^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/)
      assert.equal(call.occurredAt.slice(0, 10), call.date)
      assert.ok(call.durationSeconds > 0)
      assert.ok(['success', 'failed'].includes(call.status))
      assert.ok(['like', 'dislike', null].includes(call.feedback))
      if (call.status === 'failed') assert.match(call.failureReason, /样例/)
      else assert.equal(call.failureReason, '')
      const skill = report.skills.find(({ id }) => id === call.skillId)
      assert.equal(call.creatorId, skill.creatorId)
      assert.equal(call.creatorName, skill.creator)
    }
    const skillId = report.calls[0].skillId
    assert.deepEqual(getUsageAnalysis({ skillId }).calls, report.calls.filter((call) => call.skillId === skillId))
  })

  await t.test('keeps invalid ranges empty and returned objects isolated from future reports', () => {
    for (const [startDate, endDate] of [['2026-02-30', '2026-11-04'], ['2026-11-04', '2026-11-03'], ['2026-11-05', '2026-11-05']]) {
      const report = getUsageAnalysis({ startDate, endDate })
      assert.deepEqual(report.skills, [])
      assert.deepEqual(report.creators, [])
      assert.deepEqual(report.calls, [])
      assert.deepEqual(report.trend, [])
      assert.equal(report.summary.calls, 0)
      assert.equal(report.summary.successRate, null)
      assert.equal(report.summary.likeRate, null)
      assert.equal(report.summary.avgDurationSeconds, null)
    }
    const report = getUsageAnalysis()
    const snapshot = structuredClone(report)
    report.summary.calls = -1
    report.skills[0].creatorId = 'changed'
    report.creators[0].name = 'changed'
    report.calls[0].failureReason = 'changed'
    report.trend.pop()
    assert.deepEqual(getUsageAnalysis(), snapshot)
  })

  await t.test('exports precisely the passed filtered creator and safe-call rows', () => {
    const report = getUsageAnalysis({ creatorId: 'sample.creator-a', skillId: 'sample.customer-query' })
    const creators = usageCreatorsToCsv(report.creators)
    const calls = usageCallsToCsv(report.calls)
    assert.ok(creators.startsWith('\uFEFF创建人ID,创建人,'))
    assert.ok(calls.startsWith('\uFEFF调用ID,调用时间（北京时间）,'))
    assert.equal(creators.split('\r\n').length, report.creators.length + 1)
    assert.equal(calls.split('\r\n').length, report.calls.length + 1)
    assert.ok(creators.includes('sample.creator-a'))
    assert.ok(!creators.includes('sample.creator-b'))
    assert.ok(!calls.includes('sample.order-status'))
    assert.ok(!calls.includes('userId'))
    assert.ok(!calls.includes('prompt'))
    assert.equal(usageCreatorsToCsv([]).split('\r\n').length, 1)
    assert.equal(usageCallsToCsv([]).split('\r\n').length, 1)
    assert.ok(usageRowsToCsv(report.skills).includes('客户信息查询'))
  })

  await t.test('protects the new CSV text fields against formulas and escapes punctuation', () => {
    const report = getUsageAnalysis()
    for (const value of ['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', '  =1+1', '\t=1+1']) {
      assert.ok(usageCreatorsToCsv([{ ...report.creators[0], name: value }]).includes(`'${value}`))
      assert.ok(usageCallsToCsv([{ ...report.calls[0], failureReason: value }]).includes(`'${value}`))
    }
    assert.ok(usageCreatorsToCsv([{ ...report.creators[0], name: '创建者,"A"\nB' }]).includes('"创建者,""A""\nB"'))
    const zero = getUsageAnalysis({ startDate: '2026-11-03', endDate: '2026-11-03', creatorId: 'sample.creator-a' }).creators[0]
    const cells = usageCreatorsToCsv([zero]).split('\r\n')[1].split(',')
    assert.equal(cells[9], '')
    assert.equal(cells[13], '')
    assert.equal(cells[14], '')
  })
})
