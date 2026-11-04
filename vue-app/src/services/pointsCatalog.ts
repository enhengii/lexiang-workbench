export type CatalogStatus = 'enabled' | 'disabled'
export type CurrencyExpiryRule = 'year' | 'month' | 'never'
export type CurrencyInput = {
  name: string
  description: string
  expiryRule: CurrencyExpiryRule
  validity: string | number | null
  rate: string | number
  status: CatalogStatus
}
export type ChannelInput = {
  name: string
  description: string
  currencyId: string
  dailyLimit: string | number
  totalLimit: string | number
  status: CatalogStatus
}
type CurrencyValue = Omit<CurrencyInput, 'validity' | 'rate'> & {
  validity: number | null
  rate: number
}
type ChannelValue = Omit<ChannelInput, 'dailyLimit' | 'totalLimit'> & {
  dailyLimit: number
  totalLimit: number
}
type CatalogIdentity = { id: string; operator: string; updated: string }
export type Currency = CurrencyValue & CatalogIdentity
export type Channel = ChannelValue & CatalogIdentity & { token: string }
export type PointsCatalogState = { version: 1; currencies: Currency[]; channels: Channel[] }
export type CatalogFieldErrors = Record<string, string>
export type CatalogValidation<T> =
  { valid: true; value: T } | { valid: false; fieldErrors: CatalogFieldErrors }

export class PointsCatalogValidationError extends Error {
  fieldErrors: CatalogFieldErrors
  constructor(fieldErrors: CatalogFieldErrors) {
    super(Object.values(fieldErrors)[0] || '请检查配置内容。')
    this.name = 'PointsCatalogValidationError'
    this.fieldErrors = fieldErrors
  }
}

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const numeric = (value: unknown) =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim()
      ? Number(value)
      : NaN
const nonnegativeInteger = (value: number) => Number.isInteger(value) && value >= 0
const statusValid = (value: unknown): value is CatalogStatus =>
  value === 'enabled' || value === 'disabled'

export function validateCurrencyInput(input: unknown): CatalogValidation<CurrencyValue> {
  const data = object(input)
  const fieldErrors: CatalogFieldErrors = {}
  const name = text(data.name)
  const expiryRule = data.expiryRule
  const validity = expiryRule === 'never' ? null : numeric(data.validity)
  const rate = numeric(data.rate)
  if (!name) fieldErrors.name = '请输入虚拟币名称。'
  if (data.description !== undefined && typeof data.description !== 'string')
    fieldErrors.description = '请输入有效的简介。'
  if (expiryRule !== 'year' && expiryRule !== 'month' && expiryRule !== 'never')
    fieldErrors.expiryRule = '请选择过期规则。'
  else if (expiryRule !== 'never' && !nonnegativeInteger(validity as number))
    fieldErrors.validity = '有效期只能是大于等于 0 的整数。'
  if (!Number.isFinite(rate) || rate <= 0) fieldErrors.rate = '兑率必须是大于 0 的有效数字。'
  if (!statusValid(data.status)) fieldErrors.status = '请选择启用或停用。'
  if (Object.keys(fieldErrors).length) return { valid: false, fieldErrors }
  return {
    valid: true,
    value: {
      name,
      description: text(data.description),
      expiryRule: expiryRule as CurrencyExpiryRule,
      validity,
      rate,
      status: data.status as CatalogStatus
    }
  }
}

export function validateChannelInput(
  input: unknown,
  currencies: readonly Currency[]
): CatalogValidation<ChannelValue> {
  const data = object(input)
  const fieldErrors: CatalogFieldErrors = {}
  const name = text(data.name)
  const currencyId = text(data.currencyId)
  const dailyLimit = numeric(data.dailyLimit)
  const totalLimit = numeric(data.totalLimit)
  if (!name) fieldErrors.name = '请输入渠道名称。'
  if (data.description !== undefined && typeof data.description !== 'string')
    fieldErrors.description = '请输入有效的渠道简介。'
  if (!currencies.some((currency) => currency.id === currencyId))
    fieldErrors.currencyId = '请选择现有虚拟币。'
  if (!nonnegativeInteger(dailyLimit))
    fieldErrors.dailyLimit = '用户日发放限制只能是大于等于 0 的整数。'
  if (!nonnegativeInteger(totalLimit))
    fieldErrors.totalLimit = '渠道总发放限制只能是大于等于 0 的整数。'
  if (!statusValid(data.status)) fieldErrors.status = '请选择启用或停用。'
  if (Object.keys(fieldErrors).length) return { valid: false, fieldErrors }
  return {
    valid: true,
    value: {
      name,
      description: text(data.description),
      currencyId,
      dailyLimit,
      totalLimit,
      status: data.status as CatalogStatus
    }
  }
}

export function freshPointsCatalog(): PointsCatalogState {
  return {
    version: 1,
    currencies: [
      {
        id: 'DEMO-POINTS',
        name: '企业积分',
        description: '合成示例；100 元 / 1 积分取自现有活动基础积分算法，不过期为演示假设。',
        expiryRule: 'never',
        validity: null,
        rate: 100,
        status: 'enabled',
        operator: '演示操作员',
        updated: '2026-10-21 09:00:00'
      }
    ],
    channels: [
      {
        id: 'DEMO-CHANNEL-ENTERPRISE',
        name: '企业购渠道',
        description: '合成示例；关联成功发放的活动积分演示流水。',
        currencyId: 'DEMO-POINTS',
        token: 'DEMO-CHANNEL-ENTERPRISE-TOKEN',
        dailyLimit: 0,
        totalLimit: 0,
        status: 'enabled',
        operator: '演示操作员',
        updated: '2026-10-21 09:00:00'
      }
    ]
  }
}

export function maskDemoToken(token: string): string {
  return `DEMO-••••-${token.slice(-4)}`
}

export function parsePointsCatalogSnapshot(raw: string): PointsCatalogState {
  const data = object(JSON.parse(raw))
  const invalid = () => new Error('本地演示配置格式无效。')
  if (data.version !== 1 || !Array.isArray(data.currencies) || !Array.isArray(data.channels))
    throw invalid()
  const ids = new Set<string>()
  const identity = (value: unknown): CatalogIdentity => {
    const item = object(value)
    if (
      typeof item.id !== 'string' ||
      !/^DEMO-[A-Za-z0-9-]+$/.test(item.id) ||
      ids.has(item.id) ||
      !text(item.operator) ||
      !text(item.updated)
    )
      throw invalid()
    ids.add(item.id)
    return { id: item.id, operator: text(item.operator), updated: text(item.updated) }
  }
  const currencies = data.currencies.map((value: unknown) => {
    const item = object(value)
    const result = validateCurrencyInput(item)
    if (
      !result.valid ||
      typeof item.rate !== 'number' ||
      (item.expiryRule === 'never' ? item.validity !== null : typeof item.validity !== 'number')
    )
      throw invalid()
    return { ...result.value, ...identity(item) }
  })
  const channels = data.channels.map((value: unknown) => {
    const item = object(value)
    const result = validateChannelInput(item, currencies)
    if (
      !result.valid ||
      typeof item.dailyLimit !== 'number' ||
      typeof item.totalLimit !== 'number' ||
      typeof item.token !== 'string' ||
      !/^DEMO-[A-Za-z0-9-]+$/.test(item.token)
    )
      throw invalid()
    return { ...result.value, ...identity(item), token: item.token }
  })
  return { version: 1, currencies, channels }
}
