<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SectionHeader from '@/components/content/SectionHeader.vue'
import FilterField from '@/components/content/FilterField.vue'
import DataTable from '@/components/content/DataTable.vue'
import ListSurface from '@/components/content/ListSurface.vue'
import Pagination from '@/components/content/Pagination.vue'
import StatusTag from '@/components/content/StatusTag.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import { usageCallsToCsv } from '@/domain/usageDashboard.js'

type UsageCall = {
  id: string
  occurredAt: string
  date: string
  skillId: string
  skillName: string
  creatorId: string
  creatorName: string
  module: string
  status: 'success' | 'failed'
  feedback: 'like' | 'dislike' | null
  durationSeconds: number
  failureReason: string
}
type StatusFilter = 'all' | UsageCall['status']
type FeedbackFilter = 'all' | 'like' | 'dislike' | 'none'

const props = defineProps<{ calls: UsageCall[]; exportName: string }>()
const status = ref<StatusFilter>('all')
const feedback = ref<FeedbackFilter>('all')
const page = ref(1)
const pageSize = 5
const exportState = ref<'idle' | 'success' | 'error'>('idle')
const exportedCount = ref(0)
const numberFormat = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })
const columns = [
  { key: 'id', label: '样例调用 ID', width: '152px' },
  { key: 'occurredAt', label: '调用时间（北京时间）', width: '176px' },
  { key: 'skillName', label: 'Skill', width: '184px' },
  { key: 'status', label: '运行状态', width: '96px' },
  { key: 'durationSeconds', label: '耗时（秒）', width: '104px', align: 'right' as const },
  { key: 'feedback', label: '赞踩反馈', width: '96px' },
  { key: 'failureReason', label: '失败原因', width: '184px' }
]
const hasFilters = computed(() => status.value !== 'all' || feedback.value !== 'all')
const filteredCalls = computed(() => props.calls.filter(call =>
  (status.value === 'all' || call.status === status.value) &&
  (feedback.value === 'all' || (feedback.value === 'none' ? call.feedback === null : call.feedback === feedback.value))
))
const pageCalls = computed(() => filteredCalls.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const successCount = computed(() => filteredCalls.value.filter(call => call.status === 'success').length)
const failedCount = computed(() => filteredCalls.value.length - successCount.value)

function resetExportState() {
  exportState.value = 'idle'
  exportedCount.value = 0
}

function clearFilters() {
  status.value = 'all'
  feedback.value = 'all'
  page.value = 1
  resetExportState()
}

watch([status, feedback], () => {
  page.value = 1
  resetExportState()
}, { flush: 'sync' })
watch(() => props.calls, clearFilters, { deep: true, flush: 'sync' })
watch(() => props.exportName, resetExportState)

function exportCalls() {
  if (!filteredCalls.value.length) return
  resetExportState()
  let downloadUrl: string | undefined
  let link: HTMLAnchorElement | undefined
  try {
    const csv = usageCallsToCsv(filteredCalls.value)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    downloadUrl = URL.createObjectURL(blob)
    const safeName = props.exportName.trim().replace(/\.csv$/i, '').replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '-').slice(0, 72) || '使用数据'
    link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${safeName}-调用明细.csv`
    document.body.appendChild(link)
    link.click()
    exportedCount.value = filteredCalls.value.length
    exportState.value = 'success'
  } catch {
    exportState.value = 'error'
  } finally {
    link?.remove()
    const urlToRevoke = downloadUrl
    if (urlToRevoke) setTimeout(() => URL.revokeObjectURL(urlToRevoke), 0)
  }
}

function feedbackLabel(value: UsageCall['feedback']) {
  return value === 'like' ? '点赞' : value === 'dislike' ? '点踩' : '未反馈'
}
</script>

<template>
  <section class="usage-calls" aria-label="样例调用明细">
    <SectionHeader title="调用明细" :heading-level="3" description="仅展示样例调用记录，不包含使用人标识、输入或结果正文。">
      <template #actions>
        <button type="button" class="btn btn-secondary" :disabled="!filteredCalls.length" @click="exportCalls">导出当前筛选</button>
      </template>
    </SectionHeader>
    <ListSurface :state="filteredCalls.length ? 'data' : 'empty'">
      <template #toolbar>
        <div class="usage-calls-filters">
          <FilterField label="运行状态">
            <select v-model="status">
              <option value="all">全部状态</option>
              <option value="success">成功</option>
              <option value="failed">失败</option>
            </select>
          </FilterField>
          <FilterField label="赞踩反馈">
            <select v-model="feedback">
              <option value="all">全部反馈</option>
              <option value="like">点赞</option>
              <option value="dislike">点踩</option>
              <option value="none">未反馈</option>
            </select>
          </FilterField>
          <button type="button" class="btn btn-secondary" :disabled="!hasFilters" @click="clearFilters">清除筛选</button>
        </div>
        <p class="usage-calls-count">当前筛选 {{ numberFormat.format(filteredCalls.length) }} 次调用：成功 {{ numberFormat.format(successCount) }} 次，失败 {{ numberFormat.format(failedCount) }} 次。每页显示 {{ pageSize }} 条。</p>
      </template>
      <DataTable v-if="filteredCalls.length" :columns="columns" :rows="pageCalls" row-key="id" caption="当前筛选下的样例调用明细，时间为北京时间" density="two-line">
        <template #cell-id="{ row }"><span class="usage-calls-code">{{ row.id }}</span></template>
        <template #cell-occurredAt="{ row }"><time class="usage-calls-time" :datetime="`${row.occurredAt.replace(' ', 'T')}+08:00`">{{ row.occurredAt }}</time></template>
        <template #cell-skillName="{ row }">
          <div class="usage-calls-skill">{{ row.skillName }}</div>
          <span class="usage-calls-skill-id">{{ row.skillId }}</span>
        </template>
        <template #cell-status="{ row }"><StatusTag :tone="row.status === 'success' ? 'success' : 'danger'">{{ row.status === 'success' ? '成功' : '失败' }}</StatusTag></template>
        <template #cell-durationSeconds="{ row }"><span class="usage-calls-number">{{ numberFormat.format(row.durationSeconds) }}</span></template>
        <template #cell-feedback="{ row }">{{ feedbackLabel(row.feedback) }}</template>
        <template #cell-failureReason="{ row }"><span class="usage-calls-reason">{{ row.status === 'failed' ? row.failureReason || '未记录' : '—' }}</span></template>
      </DataTable>
      <FeedbackState v-else :state="hasFilters ? 'filtered-empty' : 'empty'" :title="hasFilters ? '没有符合条件的样例调用' : '当前范围没有样例调用'" :description="hasFilters ? '可清除运行状态与赞踩反馈筛选后查看。' : '可关闭详情，调整日期或数据范围后查看。'">
        <template v-if="hasFilters" #action><button type="button" class="btn btn-secondary" @click="clearFilters">清除筛选</button></template>
      </FeedbackState>
      <template v-if="filteredCalls.length" #pagination><Pagination v-model:page="page" :page-size="pageSize" :total="filteredCalls.length" /></template>
    </ListSurface>
    <p class="usage-calls-note">成功与失败按每条样例调用的最终运行状态计数；运行成功不代表业务结果质量。导出包含当前筛选下的全部 {{ numberFormat.format(filteredCalls.length) }} 条记录。</p>
    <p v-if="exportState === 'success'" class="usage-calls-note" role="status">已发起 {{ numberFormat.format(exportedCount) }} 条样例调用的 CSV 下载，请在浏览器下载记录中查看。</p>
    <p v-else-if="exportState === 'error'" class="usage-calls-export-error" role="alert">导出未完成，请重试。</p>
  </section>
</template>

<style scoped>
.usage-calls { container-type: inline-size; display: grid; gap: var(--space-4, 16px); min-width: 0; max-width: 100%; }
.usage-calls-filters { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; align-items: end; gap: var(--space-3, 12px); min-width: 0; }
.usage-calls-filters button { justify-self: start; }
.usage-calls-count { margin: var(--space-3, 12px) 0 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); line-height: 1.6; }
.usage-calls-code, .usage-calls-skill-id { font-family: var(--font-code, ui-monospace, monospace); overflow-wrap: anywhere; }
.usage-calls-skill { overflow-wrap: anywhere; }
.usage-calls-skill-id { display: block; margin-top: var(--space-1, 4px); color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-calls-time { white-space: nowrap; font-variant-numeric: tabular-nums; }
.usage-calls-number { font-variant-numeric: tabular-nums; }
.usage-calls-reason { overflow-wrap: anywhere; }
.usage-calls-note, .usage-calls-export-error { margin: 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); line-height: 1.6; }
.usage-calls-export-error { color: var(--color-danger); }
@container (max-width: 719px) { .usage-calls-filters { grid-template-columns: minmax(0, 1fr); } }
</style>
