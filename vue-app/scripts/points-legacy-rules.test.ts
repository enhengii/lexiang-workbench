import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './activityPoints' && context.parentURL?.endsWith('/pointsLegacyRules.ts'))
      return nextResolve(new URL('./activityPoints.ts', context.parentURL).href, context)
    return nextResolve(specifier, context)
  }
})
const {
  createLegacyRulesState,
  createLegacyRuleDraft,
  validateLegacyRule,
  normalizeLegacyRule,
  saveLegacyRule,
  endLegacyRule,
  isLegacyRuleEditable,
  readLegacyRulesState
} = await import('../src/services/pointsLegacyRules.ts')

const context = { canConfigure: true, operator: '演示操作人', now: '2026-10-21T10:00:00+08:00' }
const valid = () => ({
  ...createLegacyRuleDraft('deduction'), name: '演示新增抵现规则', start: '2026-10-21',
  currencyId: 'DEMO-POINTS', userGroups: ['DEMO-GROUP-A'],
  exchangePoints: 100, capMode: 'limited' as const, capPercent: 10,
  productMode: 'codes' as const, codes: ['DEMO-TP14']
})

await test('抵现规则必填项、日期顺序与数值在服务边界阻止非法保存', () => {
  assert.equal(validateLegacyRule(valid()), '')
  for (const change of [
    { name: '' }, { mall: '' }, { currencyId: '' }, { userGroups: [] },
    { start: '2026-02-30' }, { start: '2026-11-01', end: '2026-10-21' },
    { ruleType: 'activity', end: '' }, { exchangePoints: 0 },
    { exchangePoints: Number.NaN }, { capPercent: -1 }, { capPercent: 101 },
    { productMode: 'filter', fa: '', group: '' }, { codes: ['REAL-UNKNOWN'] },
    { codes: Array(1001).fill('DEMO-TP14') }, { userGroups: ['REAL-GROUP'] }
  ]) {
    const draft = { ...valid(), ...change } as ReturnType<typeof valid>
    assert.notEqual(validateLegacyRule(draft), '', JSON.stringify(change))
    assert.throws(() => saveLegacyRule(createLegacyRulesState(), draft, context))
  }
  assert.equal(validateLegacyRule({ ...valid(), capPercent: 0 }), '')
  assert.equal(validateLegacyRule({ ...valid(), capPercent: 100 }), '')
})

await test('保存清除隐藏条件，默认规则允许长期，1000个编码先验数量再去重', () => {
  const normalized = normalizeLegacyRule({
    ...valid(), capMode: 'unlimited', capPercent: 60,
    productMode: 'filter', fa: 'ThinkPad', group: '笔记本', codes: ['REAL-UNKNOWN']
  })
  assert.equal(normalized.capPercent, null)
  assert.deepEqual(normalized.codes, [])
  assert.equal(validateLegacyRule(normalized), '')
  const codes = normalizeLegacyRule({ ...valid(), fa: 'ThinkPad', group: '笔记本', codes: ['DEMO-TP14', 'DEMO-TP14'] })
  assert.deepEqual(codes.codes, ['DEMO-TP14'])
  assert.equal(codes.fa, '')
  assert.equal(codes.group, '')
  assert.equal(validateLegacyRule({ ...valid(), end: '' }), '')
  assert.equal(validateLegacyRule({ ...valid(), codes: Array(1000).fill('DEMO-TP14') }), '')
})

await test('新增与修改使用独立不可变快照，ID不可被编辑器替换', () => {
  const original = createLegacyRulesState()
  const added = saveLegacyRule(original, valid(), context)
  assert.equal(original.rules.length, 2)
  assert.equal(added.rules.length, 3)
  const created = added.rules[0]
  assert.match(created.id, /^DEMO-RULE-/)
  assert.equal(created.history[0].action, '创建')
  const updated = saveLegacyRule(added, { ...valid(), name: '演示修改名称', exchangePoints: 200 }, {
    ...context, expectedRevision: created.revision
  }, created.id)
  assert.equal(updated.rules[0].id, created.id)
  assert.equal(updated.rules[0].revision, 2)
  assert.equal(updated.rules[0].history.length, 2)
  assert.equal(updated.rules[0].history[0].snapshot.name, '演示新增抵现规则')
  assert.equal(updated.rules[0].history[0].snapshot.exchangePoints, 100)
  assert.equal(updated.rules[0].history[1].snapshot.exchangePoints, 200)
  updated.rules[0].codes.push('DEMO-TB16')
  assert.deepEqual(updated.rules[0].history[1].snapshot.codes, ['DEMO-TP14'])
  assert.equal(added.rules[0].name, '演示新增抵现规则')
  const forged = saveLegacyRule(added, {
    ...created, id: 'DEMO-RULE-IMPOSTOR', status: '提前结束', history: []
  }, { ...context, expectedRevision: created.revision }, created.id)
  assert.equal(forged.rules[0].id, created.id)
  assert.equal(forged.rules[0].status, '启用')
  assert.equal(forged.rules[0].history.length, 2)
  assert.equal(forged.rules[0].history[0].snapshot.name, '演示新增抵现规则')
})

await test('权限、历史状态、版本冲突与重复提前结束由服务拒绝', () => {
  const state = createLegacyRulesState()
  const active = state.rules[0]
  const history = state.rules[1]
  assert.equal(isLegacyRuleEditable(active, state.date), true)
  assert.equal(isLegacyRuleEditable(history, state.date), false)
  assert.throws(() => saveLegacyRule(state, valid(), { ...context, canConfigure: false }))
  assert.throws(() => endLegacyRule(state, active.id, { ...context, canConfigure: false }))
  assert.throws(() => saveLegacyRule(state, valid(), context, history.id))
  assert.throws(() => saveLegacyRule(state, valid(), { ...context, expectedRevision: 0 }, active.id))
  const ended = endLegacyRule(state, active.id, { ...context, expectedRevision: active.revision })
  assert.equal(ended.rules[0].status, '提前结束')
  assert.equal(ended.rules[0].history.at(-1)?.action, '提前结束')
  assert.equal(ended.rules[0].history.at(-1)?.snapshot.status, '提前结束')
  assert.equal(state.rules[0].status, '启用')
  assert.throws(() => endLegacyRule(ended, active.id, context))
})

await test('本地记录加载验证对象、快照、唯一ID和状态，不接受损坏数据', () => {
  const state = createLegacyRulesState()
  assert.deepEqual(readLegacyRulesState(JSON.stringify(state)), state)
  for (const value of [
    '{bad', '{}', JSON.stringify({ ...state, version: 2 }),
    JSON.stringify({ ...state, rules: [state.rules[0], state.rules[0]] }),
    JSON.stringify({ ...state, rules: [{ ...state.rules[0], status: '未知状态' }] }),
    JSON.stringify({ ...state, rules: [{ ...state.rules[0], history: [] }] }),
    JSON.stringify({ ...state, rules: [{ ...state.rules[0], history: [{ ...state.rules[0].history[0], snapshot: { ...state.rules[0].history[0].snapshot, exchangePoints: -1 } }] }] })
  ]) assert.throws(() => readLegacyRulesState(value))
})
