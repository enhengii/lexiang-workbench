import { reactive, ref } from 'vue'
import {
  freshPointsCatalog,
  parsePointsCatalogSnapshot,
  PointsCatalogValidationError,
  validateChannelInput,
  validateCurrencyInput,
  type Channel,
  type ChannelInput,
  type Currency,
  type CurrencyInput,
  type PointsCatalogState
} from '@/services/pointsCatalog'

const STORAGE_KEY = 'portal.points-catalog.demo.v1'
const storageNotice = ref('')
function load(): PointsCatalogState {
  try {
    if (typeof localStorage === 'undefined') return freshPointsCatalog()
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? parsePointsCatalogSnapshot(raw) : freshPointsCatalog()
  } catch {
    storageNotice.value = '本地演示配置不可读取，已载入初始示例。'
    return freshPointsCatalog()
  }
}
const state = reactive<PointsCatalogState>(load())
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    storageNotice.value = ''
  } catch {
    storageNotice.value = '浏览器未能保存演示配置；本次修改仅在当前页面生效，刷新后可能丢失。'
  }
}

let sequence = 0
function nextId(kind: 'CURRENCY' | 'CHANNEL'): string {
  let id: string
  do {
    id = `DEMO-${kind}-${Date.now().toString(36).toUpperCase()}-${++sequence}`
  } while ([...state.currencies, ...state.channels].some((row) => row.id === id))
  return id
}
const timestamp = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' })

function saveCurrency(input: CurrencyInput, id?: string): Currency {
  const result = validateCurrencyInput(input)
  if (!result.valid) throw new PointsCatalogValidationError(result.fieldErrors)
  const current = id ? state.currencies.find((row) => row.id === id) : undefined
  if (id && !current)
    throw new PointsCatalogValidationError({ form: '该虚拟币已不可用，请关闭后重新打开。' })
  const record: Currency = {
    ...result.value,
    id: current?.id || nextId('CURRENCY'),
    operator: '演示操作员',
    updated: timestamp()
  }
  if (current) state.currencies.splice(state.currencies.indexOf(current), 1, record)
  else state.currencies.unshift(record)
  persist()
  return record
}

function saveChannel(input: ChannelInput, id?: string): Channel {
  const result = validateChannelInput(input, state.currencies)
  if (!result.valid) throw new PointsCatalogValidationError(result.fieldErrors)
  const current = id ? state.channels.find((row) => row.id === id) : undefined
  if (id && !current)
    throw new PointsCatalogValidationError({ form: '该渠道已不可用，请关闭后重新打开。' })
  const channelId = current?.id || nextId('CHANNEL')
  const record: Channel = {
    ...result.value,
    id: channelId,
    token: current?.token || `DEMO-TOKEN-${channelId.slice(5)}`,
    operator: '演示操作员',
    updated: timestamp()
  }
  if (current) state.channels.splice(state.channels.indexOf(current), 1, record)
  else state.channels.unshift(record)
  persist()
  return record
}

/** Synthetic configuration only. Catalog settings never rewrite activity rules or awards. */
export function usePointsCatalogDemo() {
  return { state, storageNotice, saveCurrency, saveChannel }
}
