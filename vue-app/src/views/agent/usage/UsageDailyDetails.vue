<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import MetricGrid from '@/components/content/MetricGrid.vue'
import MetricCard from '@/components/content/MetricCard.vue'
import SectionHeader from '@/components/content/SectionHeader.vue'
import FilterField from '@/components/content/FilterField.vue'
import DataTable from '@/components/content/DataTable.vue'
import ListSurface from '@/components/content/ListSurface.vue'
import Pagination from '@/components/content/Pagination.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import UsageTrendChart from './UsageTrendChart.vue'
import { getDailyAnalysis, dailyDetailRowsToCsv } from '@/domain/usageDailyReport.js'

const props = defineProps<{ dimension: 'skills' | 'creators'; targetId: string; startDate: string; endDate: string; module: string; search: string }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const skillId = ref(props.dimension === 'skills' ? props.targetId : '')
const trendMode = ref<'count' | 'quality'>('count')
const recordFilter = ref('all')
const page = ref(1)
const notice = ref('')
let trigger: HTMLElement | null = null
const pageSize = 8
const analysis = computed(() => getDailyAnalysis({
  startDate: props.startDate, endDate: props.endDate, module: props.module, search: props.search,
  dimension: props.dimension, creatorId: props.dimension === 'creators' ? props.targetId : undefined, skillId: skillId.value || undefined
}))
const creator = computed(() => analysis.value.creators.find(row => row.id === props.targetId))
const skill = computed(() => analysis.value.skills.find(row => row.id === skillId.value))
const title = computed(() => skill.value?.name || creator.value?.name || '日报明细')
const rows = computed(() => analysis.value.dailyRows.filter(row => recordFilter.value === 'failed' ? (row.failed ?? 0) > 0 : recordFilter.value === 'feedback' ? (row.feedbackCount ?? 0) > 0 : true).sort((a, b) => b.date.localeCompare(a.date) || (b.calls ?? 0) - (a.calls ?? 0)).map(row => ({ ...row, rowId: `${row.date}-${row.skillId}` })))
const pageRows = computed(() => rows.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const n = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('zh-CN')
const rate = (value: number | null | undefined) => value == null ? '—' : `${(value * 100).toFixed(1)}%`
const skillColumns = [
  { key: 'name', label: '旗下Skill', width: '220px' }, { key: 'module', label: '菜单', width: '120px' },
  { key: 'calls', label: '调用次数', align: 'right' as const, width: '92px' }, { key: 'successRate', label: '成功率', align: 'right' as const, width: '92px' },
  { key: 'likeRate', label: '好评率', align: 'right' as const, width: '92px' }, { key: 'actions', label: '操作', width: '100px' }
]
const dailyColumns = [
  { key: 'date', label: '日期', width: '112px' }, { key: 'name', label: 'Skill', width: '220px' },
  { key: 'creator', label: '创建人', width: '120px' }, { key: 'users', label: '当日去重人数', align: 'right' as const, width: '112px' },
  { key: 'calls', label: '调用次数', align: 'right' as const, width: '92px' }, { key: 'outcomes', label: '成功 / 失败', align: 'right' as const, width: '112px' },
  { key: 'feedback', label: '赞 / 踩', align: 'right' as const, width: '92px' }, { key: 'likeRate', label: '好评率', align: 'right' as const, width: '92px' }
]
async function selectSkill(id: string) { skillId.value = id; await nextTick(); closeButton.value?.focus({ preventScroll: true }) }
async function back() { skillId.value = ''; await nextTick(); closeButton.value?.focus({ preventScroll: true }) }
function download() {
  if (!rows.value.length) return
  try {
    const url = URL.createObjectURL(new Blob([dailyDetailRowsToCsv(rows.value)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url; link.download = `AIwork日报明细_${props.startDate}_${props.endDate}.csv`
    document.body.append(link); link.click(); link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    notice.value = `已导出当前筛选的全部 ${rows.value.length} 条日期×Skill明细。`
  } catch { notice.value = '导出失败，请重试。' }
}
function close(restore = true) {
  dialog.value?.close()
  if (restore && trigger?.isConnected && trigger.getClientRects().length) trigger.focus({ preventScroll: true })
  trigger = null
}
watch([skillId, recordFilter], () => { page.value = 1; notice.value = '' })
onMounted(() => { trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null; dialog.value?.showModal() })
onDeactivated(() => { close(false); emit('close') })
onBeforeUnmount(() => close())
</script>

<template>
  <dialog ref="dialog" class="daily-detail" :aria-label="`${title}日报明细`" @cancel.prevent="emit('close')">
    <header class="daily-detail-header"><div><h2>{{ title }}</h2><p>{{ startDate }} 至 {{ endDate }} · 邮件日报数据 · 日×Skill汇总</p></div><button ref="closeButton" type="button" class="btn btn-secondary" aria-label="关闭日报明细" @click="emit('close')">关闭</button></header>
    <div class="daily-detail-body">
      <button v-if="dimension === 'creators' && skillId" type="button" class="daily-detail-back" @click="back">返回创建人明细</button>
      <p class="daily-detail-note">{{ skillId ? `Skill ID：${skillId}` : `创建人 IT Code：${targetId === 'unattributed' ? '未标注' : targetId}` }}。{{ dimension === 'creators' ? '当前数据仅统计本创建人归属下的Skill。' : '' }}来源文件不含逐次调用，以下为原始日统计。</p>
      <MetricGrid :columns="4"><MetricCard label="调用次数" :value="n(analysis.summary.calls)" meta="当前范围累计" /><MetricCard label="运行成功率" :value="rate(analysis.summary.successRate)" :meta="`${n(analysis.summary.success)} / ${n(analysis.summary.calls)} 次调用`" /><MetricCard label="反馈好评率" :value="rate(analysis.summary.likeRate)" :meta="`${n(analysis.summary.likes)} / ${n(analysis.summary.feedbackCount)} 条评价`" /><MetricCard label="有明细的Skill" :value="n(analysis.summary.skillCount)" meta="不是完整创建或上线数量" /></MetricGrid>
      <section class="daily-detail-section"><SectionHeader title="每日调用与质量趋势" description="人数无法跨Skill去重；无反馈日不计算好评率。"><template #actions><div class="daily-detail-segmented" role="group" aria-label="日报明细趋势指标"><button type="button" :aria-pressed="trendMode === 'count'" @click="trendMode = 'count'">调用次数</button><button type="button" :aria-pressed="trendMode === 'quality'" @click="trendMode = 'quality'">成功率与好评率</button></div></template></SectionHeader><UsageTrendChart :rows="analysis.trend" :mode="trendMode" source-label="邮件日报数据" /></section>
      <section v-if="dimension === 'creators' && !skillId" class="daily-detail-section"><SectionHeader title="创建人名下 Skill 明细" description="仅展示本周期日报出现的Skill，支持继续下钻。" /><DataTable :columns="skillColumns" :rows="analysis.skills" row-key="id" caption="创建人名下Skill日报聚合" density="two-line"><template #cell-name="{ row }"><strong>{{ row.name }}</strong><small class="daily-detail-meta">{{ row.id }}</small></template><template #cell-successRate="{ row }">{{ rate(row.successRate) }}</template><template #cell-likeRate="{ row }">{{ rate(row.likeRate) }}</template><template #cell-actions="{ row }"><button type="button" class="daily-detail-link" :aria-label="`下钻${row.name}日报明细`" @click="selectSkill(row.id)">Skill明细</button></template></DataTable></section>
      <section class="daily-detail-section"><SectionHeader title="每日 Skill 明细" description="每行保留原日报日期、Skill、创建人和日去重人数。" />
        <div class="daily-detail-filters"><FilterField label="记录筛选"><select v-model="recordFilter"><option value="all">全部日统计</option><option value="failed">有失败调用</option><option value="feedback">有赞踩反馈</option></select></FilterField><button type="button" class="btn btn-secondary" :disabled="!rows.length" @click="download">导出当前明细</button></div>
        <ListSurface><template #toolbar><span class="daily-detail-note">共 {{ rows.length }} 条日×Skill统计 · 当前筛选全部行导出</span></template><DataTable v-if="rows.length" :columns="dailyColumns" :rows="pageRows" row-key="rowId" caption="邮件日报原始日期乘Skill明细" density="two-line"><template #cell-name="{ row }"><strong>{{ row.name }}</strong><small class="daily-detail-meta">{{ row.skillId }}</small></template><template #cell-outcomes="{ row }">{{ n(row.success) }} / {{ n(row.failed) }}</template><template #cell-feedback="{ row }">{{ n(row.likes) }} / {{ n(row.dislikes) }}</template><template #cell-likeRate="{ row }">{{ rate(row.likeRate) }}</template></DataTable><FeedbackState v-else state="filtered-empty" title="没有匹配的日统计" description="可切回全部日统计查看当前范围。"><template #action><button type="button" class="btn btn-secondary" @click="recordFilter = 'all'">显示全部</button></template></FeedbackState><template #pagination><Pagination v-model:page="page" :page-size="pageSize" :total="rows.length" /></template></ListSurface>
      </section>
      <p v-if="notice" class="daily-detail-note" role="status">{{ notice }}</p>
      <p class="daily-detail-boundary">成功率为成功调用 / 总调用；好评率为点赞 /（点赞 + 点踩）。真实日报未提供可跨日或跨Skill去重的用户标识、单次运行耗时、原始输入输出；本页不补造这些数据。</p>
    </div>
  </dialog>
</template>

<style scoped>
.daily-detail { container-type: inline-size; box-sizing: border-box; width: min(1040px, calc(100vw - 32px)); max-width: calc(100vw - 32px); max-height: calc(100dvh - 48px); margin: auto; padding: 0; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); color: var(--color-text); overflow: auto; font-family: var(--font-body); font-size: var(--text-sm, 13px); }
.daily-detail::backdrop { background: var(--color-overlay, color-mix(in srgb, var(--color-text) 35%, transparent)); }
.daily-detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4, 16px); padding: var(--space-5, 20px); border-bottom: 1px solid var(--color-border-subtle); }
.daily-detail-header h2 { margin: 0; font-size: var(--text-md, 16px); line-height: 1.4; overflow-wrap: anywhere; }
.daily-detail-header p { margin: var(--space-2, 8px) 0 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.daily-detail-header > button { flex: none; }
.daily-detail-body { display: grid; gap: var(--space-4, 16px); min-width: 0; padding: var(--space-5, 20px); }
.daily-detail-section { display: grid; gap: var(--space-4, 16px); min-width: 0; }
.daily-detail-note, .daily-detail-boundary { margin: 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); line-height: 1.7; overflow-wrap: anywhere; }
.daily-detail-boundary { border-top: 1px solid var(--color-border-subtle); padding-top: var(--space-3, 12px); }
.daily-detail-meta { display: block; margin-top: var(--space-1, 4px); color: var(--color-text-secondary); font-size: var(--text-xs, 12px); overflow-wrap: anywhere; }
.daily-detail-filters { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--space-3, 12px); }
.daily-detail-filters select { height: 28px; min-width: 180px; padding: 0 var(--space-2, 8px); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); font: inherit; }
.daily-detail-back, .daily-detail-link { justify-self: start; padding: var(--space-1, 4px); border: 0; background: transparent; color: var(--color-primary); font: inherit; cursor: pointer; }
.daily-detail-segmented { display: flex; flex-wrap: wrap; gap: var(--space-2, 8px); }
.daily-detail-segmented button { padding: var(--space-1, 4px) var(--space-2, 8px); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text-secondary); font: inherit; cursor: pointer; }
.daily-detail-segmented button[aria-pressed="true"] { color: var(--color-primary); border-color: var(--color-primary); background: var(--color-primary-subtle); }
.daily-detail button:focus-visible, .daily-detail select:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
</style>
