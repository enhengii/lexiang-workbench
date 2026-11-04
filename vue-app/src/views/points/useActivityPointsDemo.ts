import { reactive, watch } from 'vue'
import {
  seedActivities,
  initialRecords,
  TODAY,
  validateActivity,
  type Activity,
  type RecordItem
} from '@/services/activityPoints'

const STORAGE_KEY = 'portal.activity-points.demo.v1'
type DemoState = { version: 1; activities: Activity[]; records: RecordItem[]; date: string }
const fresh = (): DemoState => ({
  version: 1,
  activities: structuredClone(seedActivities),
  records: initialRecords(),
  date: TODAY
})
const storageNotice = reactive({ message: '' })
function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fresh()
    const data = JSON.parse(raw) as DemoState
    if (
      data.version !== 1 ||
      !Array.isArray(data.activities) ||
      !Array.isArray(data.records) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.date)
    )
      throw new Error('invalid')
    if (data.activities.some((a) => validateActivity(a))) throw new Error('invalid')
    if (
      data.records.some(
        (row) =>
          typeof row.key !== 'string' ||
          typeof row.orderId !== 'string' ||
          typeof row.account !== 'string' ||
          typeof row.time !== 'string' ||
          typeof row.transaction !== 'string' ||
          typeof row.batch !== 'string' ||
          !Array.isArray(row.history) ||
          !['成功', '失败'].includes(row.status) ||
          !Number.isFinite(row.points)
      )
    )
      throw new Error('invalid')
    return data
  } catch {
    storageNotice.message = '本地演示记录不可读取，已载入初始示例。'
    return fresh()
  }
}
const state = reactive<DemoState>(load())
watch(
  state,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      storageNotice.message = '浏览器未能保存演示记录；本次页面内操作仍可继续。'
    }
  },
  { deep: true }
)

export function useActivityPointsDemo() {
  return { state, storageNotice, reset: () => Object.assign(state, fresh()) }
}

export function exportPointsCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>
) {
  const quote = (value: string | number) => {
    let text = String(value)
    if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = `'${text}`
    return `"${text.replace(/"/g, '""')}"`
  }
  const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(quote).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
