export type Tier = { threshold: number; multiplier: number }
export type Activity = {
  id: string
  name: string
  start: string
  end: string
  mode: 'quantity' | 'amount'
  tiers: Tier[]
  draft: boolean
  invoiceTypes: string[]
  enterpriseGroupIds: string[]
  productMode: 'codes' | 'filter'
  codes: string[]
  fa: string
  group: string
  excluded: string[]
  delay: number
  calendar: 'natural' | 'weekday'
  description: string
  updated: string
  logs: string[]
}
export type Order = {
  id: string
  enterprise: string
  enterpriseId: string
  account: string
  sku: string
  quantity: number
  returned: number
  receipt: number
  refund: number
  paidBase: number | null
  paidMember: number | null
  date: string
  signed: boolean
  invoiceType?: string
  enterpriseGroupIds?: string[]
  exclusion?: string
}
export type RecordItem = {
  key: string
  orderId: string
  account: string
  points: number
  status: '成功' | '失败'
  time: string
  batch: string
  transaction: string
  attempts: number
  reason: string
  history: string[]
}
// Fixed demo date: this does not drive real settlement jobs.
export const TODAY = '2026-09-16'
export const invoiceTypeOptions = [
  { value: 'ELECTRONIC', label: '电子票' },
  { value: 'VAT', label: '增值税发票' }
]
// Labels mirror the existing rule form. These IDs are local demo identifiers, not production IDs.
export const enterpriseGroupOptions = [
  { value: 'DEMO-GROUP-001', label: '高新企业组' },
  { value: 'DEMO-GROUP-002', label: '伊利组' },
  { value: 'DEMO-GROUP-003', label: '商会组' },
  { value: 'DEMO-GROUP-004', label: 'Think 嗨购权益用户' },
  { value: 'DEMO-GROUP-005', label: 'thinkplus尊享会员组' },
  { value: 'DEMO-GROUP-006', label: '中国移动尊享会员组' },
  { value: 'DEMO-GROUP-007', label: '中国移动大市场活动组' },
  { value: 'DEMO-GROUP-008', label: '中国移动历史会员组' },
  { value: 'DEMO-GROUP-009', label: 'SMB中国移动尊享会员组' },
  { value: 'DEMO-GROUP-010', label: '大客户组' },
  { value: 'DEMO-GROUP-011', label: '钻石plus组' },
  { value: 'DEMO-GROUP-012', label: '留资组' },
  { value: 'DEMO-GROUP-013', label: '资产管理默认组' },
  { value: 'DEMO-GROUP-014', label: '企业组' },
  { value: 'DEMO-GROUP-015', label: 'SMB中国移动组' },
  { value: 'DEMO-GROUP-016', label: '钻石组' },
  { value: 'DEMO-GROUP-017', label: '铂金组' },
  { value: 'DEMO-GROUP-018', label: '奇迹创坛' },
  { value: 'DEMO-GROUP-019', label: '记者组' },
  { value: 'DEMO-GROUP-020', label: '测试回归组-请勿使用' },
  { value: 'DEMO-GROUP-021', label: '联想员工组' },
  { value: 'DEMO-GROUP-022', label: '企业普通组' },
  { value: 'DEMO-GROUP-023', label: '企业采购组-默认' },
  { value: 'DEMO-GROUP-024', label: '企业采购组' }
]
export const products = [
  { code: 'DEMO-TP14', name: 'ThinkPad T14 商用笔记本', fa: 'ThinkPad', group: '笔记本' },
  { code: 'DEMO-TC90', name: 'ThinkCentre M90 商用台式机', fa: 'ThinkCentre', group: '台式机' },
  { code: 'DEMO-TB16', name: 'ThinkBook 16 商用笔记本', fa: 'ThinkBook', group: '笔记本' },
  { code: 'DEMO-CTO', name: '定制配置设备（CTO）', fa: 'ThinkPad', group: '笔记本' }
]
export type ProductCodeCheck = { codes: string[]; duplicateCount: number; error: string }
export function checkProductCodes(input: string): ProductCodeCheck {
  const invalid = (error: string): ProductCodeCheck => ({ codes: [], duplicateCount: 0, error })
  if (!input) return invalid('请输入至少一个商品编码')
  if (/\s/.test(input)) return invalid('商品编码不能含空格或换行，请用英文逗号分隔')
  if (/[，、；;|]/.test(input)) return invalid('请使用英文逗号分隔商品编码')
  const entries = input.split(',')
  if (entries.some((entry) => !entry)) return invalid('商品编码不能为空，请删除多余的逗号')
  if (entries.length > 1000) return invalid('最多输入 1000 个商品编码，请减少后重新检测')
  const codes = [...new Set(entries)]
  const unknown = codes.filter((code) => !products.some((product) => product.code === code))
  if (unknown.length) {
    const example = unknown.slice(0, 5).join('、')
    return invalid(
      `当前演示商品库未找到：${example}${unknown.length > 5 ? `等 ${unknown.length} 个编码` : ''}。请使用下方演示编码`
    )
  }
  return { codes, duplicateCount: entries.length - codes.length, error: '' }
}
export function checkExcludedProductCodes(input: string): ProductCodeCheck {
  return input === '' ? { codes: [], duplicateCount: 0, error: '' } : checkProductCodes(input)
}
const common = {
  invoiceTypes: invoiceTypeOptions.map((option) => option.value),
  enterpriseGroupIds: enterpriseGroupOptions.map((option) => option.value),
  productMode: 'codes' as const,
  codes: ['DEMO-TP14', 'DEMO-TC90', 'DEMO-TB16'],
  fa: '全部',
  group: '全部',
  excluded: ['DEMO-CTO'],
  delay: 20,
  calendar: 'natural' as const,
  description: '活动积分补发',
  updated: TODAY,
  logs: ['2026-09-07 · 运营管理员 · 创建演示活动']
}
export const seedActivities: Activity[] = [
  {
    ...common,
    id: 'ACT202609001',
    name: '秋季采购积分加磅',
    start: '2026-09-07',
    end: '2026-10-15',
    mode: 'quantity',
    tiers: [
      { threshold: 10, multiplier: 5 },
      { threshold: 50, multiplier: 7 },
      { threshold: 100, multiplier: 10 }
    ],
    draft: false
  },
  {
    ...common,
    id: 'ACT202611001',
    name: '双11企业采购回馈',
    start: '2026-10-21',
    end: '2026-11-11',
    mode: 'quantity',
    tiers: [
      { threshold: 10, multiplier: 10 },
      { threshold: 20, multiplier: 15 },
      { threshold: 50, multiplier: 20 }
    ],
    draft: false
  },
  {
    ...common,
    id: 'ACT202608001',
    name: '8月采购加磅',
    start: '2026-08-01',
    end: '2026-08-20',
    mode: 'quantity',
    tiers: [
      { threshold: 10, multiplier: 5 },
      { threshold: 50, multiplier: 7 },
      { threshold: 100, multiplier: 10 }
    ],
    draft: false
  },
  {
    ...common,
    id: 'ACT202610002',
    name: '季度满额积分礼',
    start: '2026-10-01',
    end: '2026-10-31',
    mode: 'amount',
    tiers: [
      { threshold: 50000, multiplier: 5 },
      { threshold: 200000, multiplier: 7 }
    ],
    draft: true
  }
]
type EligibilityConditions = Pick<Activity, 'invoiceTypes' | 'enterpriseGroupIds'>
export function validateEligibilityConditions(a: Partial<EligibilityConditions>) {
  if (!Array.isArray(a.invoiceTypes) || !a.invoiceTypes.length)
    return '请至少选择一种发票类型'
  if (a.invoiceTypes.some((value) => !invoiceTypeOptions.some((option) => option.value === value)))
    return '发票类型无效，请重新选择'
  if (!Array.isArray(a.enterpriseGroupIds) || !a.enterpriseGroupIds.length)
    return '请至少选择一个企业组'
  if (
    a.enterpriseGroupIds.some(
      (value) => !enterpriseGroupOptions.some((option) => option.value === value)
    )
  )
    return '企业组无效，请重新选择'
  return ''
}
export function migrateActivityEligibility(
  a: Omit<Activity, keyof EligibilityConditions> & Partial<EligibilityConditions>
): Activity {
  const seed = seedActivities.find((item) => item.id === a.id)
  const restore = (value: string[] | undefined, fallback: string[] | undefined) =>
    Array.isArray(value) ? [...new Set(value)] : value === undefined ? [...(fallback || [])] : []
  return {
    ...a,
    invoiceTypes: restore(a.invoiceTypes, seed?.invoiceTypes),
    enterpriseGroupIds: restore(a.enterpriseGroupIds, seed?.enterpriseGroupIds)
  }
}
export function activityStatus(a: Activity, date = TODAY) {
  return a.draft ? '草稿' : date < a.start ? '待开始' : date <= a.end ? '进行中' : '已结束'
}
export function payoutDate(a: Pick<Activity, 'end' | 'delay' | 'calendar'>) {
  const d = new Date(a.end + 'T00:00:00Z')
  let n = 0
  while (n < a.delay) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (a.calendar === 'natural' || ![0, 6].includes(d.getUTCDay())) n++
  }
  return d.toISOString().slice(0, 10)
}
export function activeProducts(a: Activity) {
  return products.filter(
    (p) =>
      a.productMode === 'codes'
        ? a.codes.includes(p.code)
        : (a.fa === '全部' || p.fa === a.fa) &&
          (a.group === '全部' || p.group === a.group) &&
          !a.excluded.includes(p.code)
  )
}
function validDate(s: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  )
}
export function validateActivity(a: Activity) {
  if (!a.name.trim()) return '请填写活动名称'
  if (!validDate(a.start) || !validDate(a.end) || a.start >= a.end)
    return '请填写有效日期，活动开始日期必须早于结束日期'
  const eligibilityError = validateEligibilityConditions(a)
  if (eligibilityError) return eligibilityError
  if (a.productMode === 'codes') {
    const { error } = checkProductCodes(a.codes.join(','))
    if (error) return error
  } else {
    if (a.excluded.some((code) => !code || code.includes(',')))
      return '排除商品编码格式无效，请重新输入并检测'
    const { error } = checkExcludedProductCodes(a.excluded.join(','))
    if (error) return error
  }
  if (!activeProducts(a).length) return '请至少选择一个参与商品'
  if (!Number.isInteger(a.delay) || a.delay < 1 || a.delay > 90) return '发放延迟请输入 1–90 的整数'
  if (!a.tiers.length) return '请至少配置一个档位'
  for (let i = 0; i < a.tiers.length; i++) {
    const t = a.tiers[i],
      p = a.tiers[i - 1]
    if (
      !Number.isFinite(t.threshold) ||
      t.threshold <= 0 ||
      !Number.isInteger(t.multiplier) ||
      t.multiplier <= 0
    )
      return '门槛必须大于 0，倍数必须为正整数'
    if (a.mode === 'quantity' && !Number.isInteger(t.threshold)) return '台数门槛必须为正整数'
    if (
      a.mode === 'amount' &&
      Math.abs(t.threshold * 100 - Math.round(t.threshold * 100)) > 0.00001
    )
      return '金额门槛最多保留两位小数'
    if (p && (t.threshold <= p.threshold || t.multiplier <= p.multiplier))
      return '请按递增顺序配置门槛及倍数，不可重复'
  }
  return ''
}
export function extendActivity(a: Activity, end: string, reason: string, date = TODAY): Activity {
  if (activityStatus(a, date) !== '进行中') throw new Error('仅允许在活动进行中延期')
  if (!validDate(end) || end <= a.end)
    throw new Error('请填写有效日期，新结束日期必须晚于原结束日期')
  if (!reason.trim()) throw new Error('请填写延期原因')
  const next = { ...a, end, updated: date }
  return {
    ...next,
    logs: [
      `${date} · 运营管理员 · 延期 ${a.end} → ${end}；计划发放 ${payoutDate(a)} → ${payoutDate(next)}；原因：${reason.trim()}`,
      ...a.logs
    ]
  }
}
// All identities and orders below are constructed demo data. Monetary examples reproduce the supplied calculation cases.
export function ordersFor(a: Activity): Order[] {
  const start = new Date(a.start + 'T00:00:00Z')
  const day = (offset: number) => {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + offset)
    return d.toISOString().slice(0, 10)
  }
  const make = (
    n: number,
    enterprise: string,
    enterpriseId: string,
    account: string,
    quantity: number,
    receipt: number,
    paid: number,
    extras: Partial<Order> = {}
  ): Order => ({
    id: `D-${a.id.slice(-6)}-${String(n).padStart(3, '0')}`,
    enterprise,
    enterpriseId,
    account,
    quantity,
    receipt,
    paidBase: Math.floor(receipt / 100),
    paidMember: paid - Math.floor(receipt / 100),
    returned: 0,
    refund: 0,
    sku: n % 2 ? 'DEMO-TP14' : 'DEMO-TC90',
    date: day(n === 1 ? 0 : Math.min(n - 1, 4)),
    signed: true,
    invoiceType: n % 2 ? 'ELECTRONIC' : 'VAT',
    enterpriseGroupIds:
      enterpriseId === 'ENT-DEMO-001'
        ? ['DEMO-GROUP-023']
        : enterpriseId === 'ENT-DEMO-002'
          ? ['DEMO-GROUP-010', 'DEMO-GROUP-024']
          : ['DEMO-GROUP-022'],
    ...extras
  })
  return [
    make(1, '远帆智能科技有限公司', 'ENT-DEMO-001', 'LID-DEMO-A01', 6, 30000, 900),
    make(2, '远帆智能科技有限公司', 'ENT-DEMO-001', 'LID-DEMO-A02', 4, 20000, 600),
    make(3, '澄星实业有限公司', 'ENT-DEMO-002', 'LID-DEMO-B01', 10, 59328, 2966),
    make(4, '澄星实业有限公司', 'ENT-DEMO-002', 'LID-DEMO-B02', 20, 136116, 6805),
    make(5, '澄星实业有限公司', 'ENT-DEMO-002', 'LID-DEMO-B01', 10, 64990, 2924),
    make(6, '澄星实业有限公司', 'ENT-DEMO-002', 'LID-DEMO-B03', 60, 300000, 15000),
    make(7, '青禾设计有限公司', 'ENT-DEMO-003', 'LID-DEMO-C01', 8, 40000, 1200),
    make(8, '远帆智能科技有限公司', 'ENT-DEMO-001', 'LID-DEMO-A03', 10, 50000, 1500, {
      exclusion: '账号命中现有黑名单'
    }),
    make(9, '远帆智能科技有限公司', 'ENT-DEMO-001', 'LID-DEMO-A01', 5, 25000, 750, {
      sku: 'DEMO-CTO',
      exclusion: 'CTO 商品不参与'
    }),
    make(10, '若水服务有限公司', 'ENT-DEMO-004', 'LID-DEMO-D01', 12, 60000, 0, {
      paidBase: null,
      paidMember: null
    }),
    make(11, '合序制造有限公司', 'ENT-DEMO-005', 'LID-DEMO-E01', 10, 10000, 1200),
    make(12, '远帆智能科技有限公司', 'ENT-DEMO-001', 'LID-DEMO-A01', 2, 10000, 300, {
      returned: 2,
      refund: 10000
    })
  ]
}
export type Calculated = Order & {
  netQuantity: number
  netReceipt: number
  multiplier: number
  target: number
  paid: number
  delta: number
  eligible: boolean
  calculationError: boolean
  issue: string
  enterpriseQuantity: number
  enterpriseAmount: number
}
export function calculate(a: Activity, orders: Order[], cutoff = '9999-12-31'): Calculated[] {
  const codes = new Set(activeProducts(a).map((x) => x.code))
  const configurationError = validateEligibilityConditions(a)
  const prepared = orders.map((o) => {
    let issue = configurationError ? `活动参与条件待补齐：${configurationError}` : o.exclusion || ''
    let calculationError = !!configurationError
    if (!issue && !o.invoiceType) {
      issue = '缺少订单发票类型'
      calculationError = true
    }
    if (!issue && !invoiceTypeOptions.some((option) => option.value === o.invoiceType)) {
      issue = '订单发票类型无效，请核对订单资料'
      calculationError = true
    }
    if (!issue && !a.invoiceTypes.includes(o.invoiceType!)) issue = '发票类型不符合活动条件'
    if (!issue && !Array.isArray(o.enterpriseGroupIds)) {
      issue = '缺少或无法读取下单用户企业组信息'
      calculationError = true
    }
    if (
      !issue &&
      o.enterpriseGroupIds!.some(
        (group) => !enterpriseGroupOptions.some((option) => option.value === group)
      )
    ) {
      issue = '下单用户企业组信息无效，请核对用户资料'
      calculationError = true
    }
    if (!issue && !o.enterpriseGroupIds!.length) issue = '下单用户未归属任何企业组'
    if (!issue && !o.enterpriseGroupIds!.some((group) => a.enterpriseGroupIds.includes(group)))
      issue = '下单用户企业组不符合活动条件'
    if (!issue && !codes.has(o.sku)) issue = '不在活动商品范围'
    if (!issue && (o.date < a.start || o.date > a.end || o.date > cutoff))
      issue = '不在统计时间范围'
    if (!issue && !o.signed) issue = '尚未签收'
    const netQuantity = o.quantity - o.returned,
      netReceipt = Math.round((o.receipt - o.refund) * 100) / 100
    if (!issue && (!o.enterpriseId || !o.enterprise)) issue = '企业归属无法匹配'
    if (
      !issue &&
      (![o.quantity, o.returned, o.receipt, o.refund].every(Number.isFinite) ||
        netQuantity < 0 ||
        netReceipt < 0)
    )
      issue = '订单数量或金额异常'
    if (!issue && (netQuantity === 0 || netReceipt === 0)) issue = '已全额退货退款'
    return { ...o, netQuantity, netReceipt, issue, eligible: !issue, calculationError }
  })
  const totals = new Map<string, { quantity: number; amount: number }>()
  for (const o of prepared) {
    if (o.eligible) {
      const t = totals.get(o.enterpriseId) || { quantity: 0, amount: 0 }
      t.quantity += o.netQuantity
      t.amount = Math.round((t.amount + o.netReceipt) * 100) / 100
      totals.set(o.enterpriseId, t)
    }
  }
  return prepared.map((o) => {
    const t = totals.get(o.enterpriseId) || { quantity: 0, amount: 0 }
    const metric = a.mode === 'quantity' ? t.quantity : t.amount
    const tier = [...a.tiers]
      .sort((x, y) => y.threshold - x.threshold)
      .find((x) => metric >= x.threshold)
    const multiplier = o.eligible ? tier?.multiplier || 0 : 0
    const paid = (o.paidBase ?? 0) + (o.paidMember ?? 0)
    // Convert net receipts to cents before multiplication to avoid binary floating rounding at integer boundaries.
    const target = multiplier
      ? Math.floor((Math.round(o.netReceipt * 100) * multiplier) / 10000)
      : paid
    let issue = o.issue
    if (o.eligible && (o.paidBase === null || o.paidMember === null))
      issue = '缺少订单实际已发积分记录'
    const delta = multiplier ? target - paid : 0
    if (!issue && delta < 0) issue = '应补差额为负，待业务核对'
    return {
      ...o,
      multiplier,
      target,
      paid,
      delta,
      issue,
      calculationError: o.calculationError || (o.eligible && !!issue),
      enterpriseQuantity: t.quantity,
      enterpriseAmount: t.amount
    }
  })
}
export function settle(
  a: Activity,
  rows: Calculated[],
  records: RecordItem[],
  date: string,
  failOrderId?: string
): RecordItem[] {
  const configurationError = validateActivity(a)
  if (configurationError) throw new Error(configurationError)
  if (a.draft || date < payoutDate(a)) throw new Error('尚未到计划发放日期')
  const next = records.map((r) => ({ ...r }))
  // Re-evaluate the same source orders so stale rows cannot bypass changed eligibility or totals.
  for (const r of calculate(a, rows, date)) {
    if (!r.eligible || r.issue || r.delta <= 0) continue
    const key = `${a.id}:${r.id}`,
      index = next.findIndex((x) => x.key === key),
      old = next[index]
    if (old?.status === '成功') continue
    const failed = r.id === failOrderId
    const item: RecordItem = {
      key,
      orderId: r.id,
      account: r.account,
      points: r.delta,
      status: failed ? '失败' : '成功',
      time: date + ' 10:00:00',
      batch: `BATCH-${a.id}`,
      transaction: failed ? '' : `DEMO-TXN-${a.id}-${r.id}`,
      attempts: (old?.attempts || 0) + 1,
      reason: failed ? '模拟账户服务暂时不可用，未入账' : '',
      history: [
        ...(old?.history || []),
        `${date} 10:00:00 · 第 ${(old?.attempts || 0) + 1} 次 · ${failed ? '失败：模拟账户服务暂时不可用，未入账' : `成功：向 ${r.account} 补发 ${r.delta} 分`}`
      ]
    }
    if (index < 0) next.push(item)
    else next[index] = item
  }
  return next
}
export function initialRecords() {
  const a = seedActivities[2]
  const rows = calculate(a, ordersFor(a))
  return settle(a, rows, [], payoutDate(a), rows[3].id)
}
export const number = (v: number) => v.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
