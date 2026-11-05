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
