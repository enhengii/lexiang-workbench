import { reactive, watch } from 'vue'
import {
  seedActivities,
  initialRecords,
  TODAY,
  validateActivity,
  validateEligibilityConditions,
  migrateActivityEligibility,
  invoiceTypeOptions,
  enterpriseGroupOptions,
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
    data.activities = data.activities.map(migrateActivityEligibility)
    // Preserve legacy qualifications and 1–14 day delays on read. Substitute only
    // in this validation copy; never rewrite stored settings or discard their ledger.
    if (
      data.activities.some((a) =>
        validateActivity({
          ...a,
          delay: Number.isInteger(a.delay) && a.delay >= 1 && a.delay < 15 ? 15 : a.delay,
          invoiceTypes: invoiceTypeOptions.map((option) => option.value),
          enterpriseGroupIds: enterpriseGroupOptions.map((option) => option.value)
        })
      )
    )
      throw new Error('invalid')
    if (
      data.records.some(
        (row) =>
          typeof row.key !== 'string' ||
          typeof row.orderId !== 'string' ||
          !Array.isArray(row.history) ||
          !['成功', '失败'].includes(row.status) ||
          !Number.isFinite(row.points)
      )
    )
      throw new Error('invalid')
    const configurationIssues: string[] = []
    if (data.activities.some((a) => validateEligibilityConditions(a)))
      configurationIssues.push('发票类型或企业组尚未配置完整')
    if (data.activities.some((a) => a.delay < 15))
      configurationIssues.push('活动结束后延迟天数不足15天')
    if (configurationIssues.length)
      storageNotice.message = `部分活动${configurationIssues.join('、')}，请补齐或调整后使用；已有发放记录已保留。`
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
