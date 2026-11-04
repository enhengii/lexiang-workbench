import { checkProductCodes, products } from './activityPoints'

export type LegacyRuleMode = 'deduction' | 'earning'
export type LegacyRuleStatus = '启用' | '停用' | '提前结束'
export type LegacyRuleDraft = {
  mode: LegacyRuleMode
  mall: string
  currencyId: string
  ruleType: 'default' | 'activity'
  name: string
  start: string
  end: string
  userGroups: string[]
  exchangePoints: number
  capMode: 'limited' | 'unlimited'
  capPercent: number | null
  productMode: 'codes' | 'filter'
  codes: string[]
  fa: string
  group: string
}
export type LegacyRuleSnapshot = LegacyRuleDraft & {
  id: string
  status: LegacyRuleStatus
  revision: number
}
export type LegacyRuleAudit = {
  id: string
  action: '创建' | '修改' | '提前结束'
  time: string
  operator: string
  snapshot: LegacyRuleSnapshot
}
export type LegacyRule = LegacyRuleSnapshot & { history: LegacyRuleAudit[] }
export type LegacyRulesState = { version: 1; date: string; rules: LegacyRule[] }
export type LegacyRuleContext = {
  canConfigure: boolean
  operator: string
  now: string
  expectedRevision?: number
}
export const legacyDemoGroups = [
  { id: 'DEMO-GROUP-A', name: '演示用户组 A' },
  { id: 'DEMO-GROUP-B', name: '演示用户组 B' }
]
export const legacyDemoMalls = [{ id: 'DEMO-MALL', name: '演示企业商城' }]
const statuses: readonly string[] = ['启用', '停用', '提前结束']
const actions: readonly string[] = ['创建', '修改', '提前结束']
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const isDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string')

export function createLegacyRuleDraft(mode: LegacyRuleMode): LegacyRuleDraft {
  return {
    mode, mall: 'DEMO-MALL', currencyId: 'DEMO-POINTS', ruleType: 'default', name: '',
    start: '2026-10-21', end: '', userGroups: [], exchangePoints: 100,
    capMode: 'limited', capPercent: 10, productMode: 'codes', codes: [], fa: '', group: ''
  }
}

export function validateLegacyRule(value: unknown): string {
  if (!value || typeof value !== 'object') return '规则数据无效'
  const rule = value as LegacyRuleDraft
  if (rule.mode !== 'deduction') return '积分获取规则尚未完成原页面核对'
  if (!legacyDemoMalls.some((mall) => mall.id === rule.mall)) return '请选择演示商城'
  if (typeof rule.currencyId !== 'string' || !/^DEMO-[A-Za-z0-9-]+$/.test(rule.currencyId))
    return '请选择演示虚拟币'
  if (!['default', 'activity'].includes(rule.ruleType)) return '请选择规则类型'
  if (typeof rule.name !== 'string' || !rule.name.trim() || rule.name.trim().length > 100)
    return '请输入 100 字以内的规则名称'
  if (!isDate(rule.start) || (rule.end !== '' && !isDate(rule.end))) return '请填写有效的规则有效时间'
  if (rule.ruleType === 'activity' && !rule.end) return '活动规则必须填写结束日期'
  if (rule.end && rule.start > rule.end) return '开始日期不能晚于结束日期'
  if (!strings(rule.userGroups) || !rule.userGroups.length || rule.userGroups.some(
    (id) => !legacyDemoGroups.some((group) => group.id === id)
  )) return '请至少选择一个演示用户组'
  if (!Number.isFinite(rule.exchangePoints) || rule.exchangePoints <= 0)
    return '积分抵现比例必须为正数'
  if (!['limited', 'unlimited'].includes(rule.capMode)) return '请选择抵现金额上限'
  if (rule.capMode === 'limited' && (
    typeof rule.capPercent !== 'number' || !Number.isFinite(rule.capPercent) ||
    rule.capPercent < 0 || rule.capPercent > 100
  )) return '每笔订单抵扣上限须在 0–100% 之间'
  if (!['codes', 'filter'].includes(rule.productMode)) return '请选择积分抵现商品范围'
  if (rule.productMode === 'codes') {
    if (!strings(rule.codes)) return '商品编码数据无效'
    const error = checkProductCodes(rule.codes.join(',')).error
    if (error) return error
  } else if (!products.some((product) => product.fa === rule.fa && product.group === rule.group))
    return '请选择具有演示商品的产品组与 FA'
  return ''
}

export function normalizeLegacyRule(rule: LegacyRuleDraft): LegacyRuleDraft {
  return {
    mode: rule.mode, mall: rule.mall, currencyId: rule.currencyId,
    ruleType: rule.ruleType, name: rule.name.trim(), start: rule.start, end: rule.end,
    userGroups: [...new Set(rule.userGroups)], exchangePoints: rule.exchangePoints,
    capMode: rule.capMode, productMode: rule.productMode,
    capPercent: rule.capMode === 'limited' ? rule.capPercent : null,
    codes: rule.productMode === 'codes' ? [...new Set(rule.codes)] : [],
    fa: rule.productMode === 'filter' ? rule.fa : '',
    group: rule.productMode === 'filter' ? rule.group : ''
  }
}

export function isLegacyRuleEditable(rule: LegacyRuleSnapshot, date: string): boolean {
  return rule.status === '启用' && (!rule.end || rule.end >= date)
}

function assertContext(context: LegacyRuleContext) {
  if (!context.canConfigure) throw new Error('当前账号没有规则配置权限')
  if (!context.operator.trim() || !Number.isFinite(Date.parse(context.now)))
    throw new Error('操作人或操作时间无效')
}
function snapshot(rule: LegacyRule): LegacyRuleSnapshot {
  const { history: _history, ...value } = rule
  return copy(value)
}
function appendAudit(rule: LegacyRule, action: LegacyRuleAudit['action'], context: LegacyRuleContext) {
  rule.history.push({
    id: `${rule.id}-AUDIT-${rule.revision}`, action, time: context.now,
    operator: context.operator, snapshot: snapshot(rule)
  })
}

export function saveLegacyRule(
  state: LegacyRulesState, input: LegacyRuleDraft, context: LegacyRuleContext, existingId?: string
): LegacyRulesState {
  assertContext(context)
  // Validate raw input first: deduplication must not bypass the 1000-code limit.
  const error = validateLegacyRule(input)
  if (error) throw new Error(error)
  const result = copy(state)
  const current = existingId ? result.rules.find((rule) => rule.id === existingId) : undefined
  if (existingId && !current) throw new Error('该规则已不存在，请重新查询')
  if (current && (!isLegacyRuleEditable(current, state.date) || current.mode !== input.mode))
    throw new Error('该规则已成为历史记录，仅支持查看')
  if (current && context.expectedRevision !== undefined && current.revision !== context.expectedRevision)
    throw new Error('规则已变化，请关闭后重新打开编辑')
  const value = normalizeLegacyRule(input)
  if (current) {
    const id = current.id
    const revision = current.revision + 1
    Object.assign(current, value, { id, revision })
    appendAudit(current, '修改', context)
  } else {
    const stem = `DEMO-RULE-${input.mode === 'deduction' ? 'D' : 'E'}-${Date.parse(context.now)}`
    let id = stem
    for (let index = 2; result.rules.some((rule) => rule.id === id); index++) id = `${stem}-${index}`
    const rule: LegacyRule = { ...value, id, status: '启用', revision: 1, history: [] }
    appendAudit(rule, '创建', context)
    result.rules.unshift(rule)
  }
  return result
}

export function endLegacyRule(state: LegacyRulesState, id: string, context: LegacyRuleContext): LegacyRulesState {
  assertContext(context)
  const result = copy(state)
  const rule = result.rules.find((entry) => entry.id === id)
  if (!rule || !isLegacyRuleEditable(rule, state.date)) throw new Error('该规则已成为历史记录，仅支持查看')
  if (context.expectedRevision !== undefined && rule.revision !== context.expectedRevision)
    throw new Error('规则已变化，请重新查询后操作')
  rule.status = '提前结束'
  rule.revision += 1
  appendAudit(rule, '提前结束', context)
  return result
}

export function createLegacyRulesState(): LegacyRulesState {
  const draft: LegacyRuleDraft = {
    ...createLegacyRuleDraft('deduction'), name: '演示积分抵现规则',
    userGroups: ['DEMO-GROUP-A'], codes: ['DEMO-TP14', 'DEMO-TB16']
  }
  const active: LegacyRule = {
    ...draft, id: 'DEMO-RULE-D-001', status: '启用', revision: 1, history: []
  }
  const historical: LegacyRule = {
    ...copy(draft), id: 'DEMO-RULE-D-000', name: '演示历史抵现规则',
    start: '2026-09-01', end: '2026-09-30', status: '停用', revision: 1, history: []
  }
  appendAudit(active, '创建', { canConfigure: true, operator: '演示运营人员', now: '2026-10-21T09:00:00+08:00' })
  appendAudit(historical, '创建', { canConfigure: true, operator: '演示运营人员', now: '2026-09-01T09:00:00+08:00' })
  return { version: 1, date: '2026-10-21', rules: [active, historical] }
}

export function readLegacyRulesState(raw: string): LegacyRulesState {
  const value = JSON.parse(raw) as LegacyRulesState
  if (!value || value.version !== 1 || !isDate(value.date) || !Array.isArray(value.rules))
    throw new Error('本地规则记录格式无效')
  const ids = new Set<string>()
  for (const rule of value.rules) {
    if (!rule || validateLegacyRule(rule) || typeof rule.id !== 'string' ||
      !/^DEMO-RULE-[DE]-[A-Za-z0-9-]+$/.test(rule.id) || ids.has(rule.id) ||
      !statuses.includes(rule.status) || !Number.isInteger(rule.revision) || rule.revision < 1 ||
      !Array.isArray(rule.history) || !rule.history.length) throw new Error('本地规则记录无效')
    ids.add(rule.id)
    const auditIds = new Set<string>()
    for (const audit of rule.history) {
      if (!audit || typeof audit.id !== 'string' || auditIds.has(audit.id) ||
        !actions.includes(audit.action) || !Number.isFinite(Date.parse(audit.time)) ||
        typeof audit.operator !== 'string' || !audit.operator.trim() ||
        !audit.snapshot || validateLegacyRule(audit.snapshot) || audit.snapshot.id !== rule.id ||
        !statuses.includes(audit.snapshot.status) || !Number.isInteger(audit.snapshot.revision) ||
        audit.snapshot.revision < 1 || audit.snapshot.revision > rule.revision)
        throw new Error('本地操作快照无效')
      auditIds.add(audit.id)
    }
  }
  return copy(value)
}
