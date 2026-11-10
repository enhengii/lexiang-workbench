<script setup lang="ts">
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import MetricGrid from '@/components/content/MetricGrid.vue'
import MetricCard from '@/components/content/MetricCard.vue'
import SectionHeader from '@/components/content/SectionHeader.vue'
import DataTable from '@/components/content/DataTable.vue'
import ListSurface from '@/components/content/ListSurface.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import UsageTrendChart from './UsageTrendChart.vue'
import UsageCallDetails from './UsageCallDetails.vue'
import { getUsageAnalysis } from '@/domain/usageDashboard.js'

const props = defineProps<{
  dimension: 'skills' | 'creators'; targetId: string; scopeDimension: 'skills' | 'creators'
  startDate: string; endDate: string; module: string; search: string
}>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const selectedSkillId = ref(props.dimension === 'skills' ? props.targetId : '')
const trendMode = ref<'volume' | 'quality'>('volume')
let trigger: HTMLElement | null = null
const creatorId = computed(() => props.dimension === 'creators' ? props.targetId : undefined)
const analysis = computed(() => {
  try {
    return getUsageAnalysis({
      startDate: props.startDate, endDate: props.endDate, module: props.module, search: props.search,
      dimension: props.scopeDimension, creatorId: creatorId.value, skillId: selectedSkillId.value || undefined
    })
  } catch { return null }
})
const selectedSkill = computed(() => analysis.value?.skills.find(row => row.id === selectedSkillId.value))
const selectedCreator = computed(() => analysis.value?.creators.find(row => row.id === creatorId.value))
const title = computed(() => selectedSkill.value?.name || selectedCreator.value?.name || '使用详情')
const isSkill = computed(() => !!selectedSkillId.value)
const n = (value: number) => value.toLocaleString('zh-CN')
const rate = (value: number | null) => value == null ? '—' : `${(value * 100).toFixed(1)}%`
const duration = (value: number | null) => value == null ? '—' : `${value.toFixed(2)} 秒`
const skillColumns = [
  { key: 'name', label: '旗下Skill', width: '220px' },
  { key: 'module', label: '业务模块', width: '120px' },
  { key: 'users', label: '使用人数', width: '92px', align: 'right' as const },
  { key: 'calls', label: '调用次数', width: '92px', align: 'right' as const },
  { key: 'successRate', label: '成功率', width: '92px', align: 'right' as const },
  { key: 'feedback', label: '赞 / 踩', width: '92px', align: 'right' as const },
  { key: 'likeRate', label: '好评率', width: '92px', align: 'right' as const },
  { key: 'actions', label: '操作', width: '100px' }
]
function open() {
  if (!dialog.value || dialog.value.open) return
  trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialog.value.showModal()
}
function close(restoreFocus = true) {
  dialog.value?.close()
  if (restoreFocus && trigger?.isConnected && trigger.getClientRects().length) trigger.focus({ preventScroll: true })
  trigger = null
}
async function changeSubject(skillId: string) {
  selectedSkillId.value = skillId
  trendMode.value = 'volume'
  await nextTick()
  dialog.value?.scrollTo({ top: 0, behavior: 'auto' })
  closeButton.value?.focus({ preventScroll: true })
}
watch(() => [props.targetId, props.dimension], () => { selectedSkillId.value = props.dimension === 'skills' ? props.targetId : ''; trendMode.value = 'volume' })
onMounted(open)
onActivated(open)
onDeactivated(() => { close(false); emit('close') })
onBeforeUnmount(() => close())
</script>

<template>
  <dialog ref="dialog" class="usage-analysis-detail" :aria-label="`${isSkill ? 'Skill' : '创建人'}使用详情`" @cancel.prevent="emit('close')">
    <header class="usage-analysis-detail-header">
      <div class="usage-analysis-detail-heading">
        <button v-if="creatorId && isSkill" type="button" class="usage-detail-link usage-detail-back" @click="changeSubject('')">← 返回创建人：{{ selectedCreator?.name }}</button>
        <h2>{{ title }}</h2>
        <p>{{ startDate }} 至 {{ endDate }} · 当前筛选范围 · 示例数据</p>
      </div>
      <button ref="closeButton" type="button" class="btn btn-secondary" aria-label="关闭使用详情" @click="emit('close')">关闭</button>
    </header>
    <div class="usage-analysis-detail-body">
      <FeedbackState v-if="!analysis" state="error" title="详情暂时无法读取" description="请关闭后重试。" />
      <FeedbackState v-else-if="!analysis.skills.length && !analysis.creators.length" state="empty" title="当前筛选范围没有此对象" description="请返回看板调整日期或筛选条件。" />
      <template v-else>
        <dl class="usage-detail-identity">
          <template v-if="selectedSkill">
            <div><dt>Skill ID</dt><dd class="usage-detail-code">{{ selectedSkill.id }}</dd></div>
            <div><dt>业务模块 / 创建人</dt><dd>{{ selectedSkill.module }} / {{ selectedSkill.creator }}</dd></div>
            <div><dt>首次上线</dt><dd>{{ selectedSkill.publishedAt }}</dd></div>
          </template>
          <template v-else-if="selectedCreator">
            <div><dt>创建人ID</dt><dd class="usage-detail-code">{{ selectedCreator.id }}</dd></div>
            <div><dt>旗下 / 被用Skill</dt><dd>{{ n(analysis.summary.skillCount) }} / {{ n(analysis.summary.calledSkills) }}</dd></div>
            <div><dt>统计含义</dt><dd>旗下Skill的使用贡献，非本人使用</dd></div>
          </template>
        </dl>
        <MetricGrid>
          <MetricCard label="调用次数" :value="n(analysis.summary.calls)" :meta="`成功 ${n(analysis.summary.success)} / 失败 ${n(analysis.summary.failed)}`" />
          <MetricCard label="使用人数" :value="n(analysis.summary.users)" meta="所选周期跨Skill去重" />
          <MetricCard label="运行成功率" :value="rate(analysis.summary.successRate)" :meta="`成功 / 总调用 ${n(analysis.summary.calls)}`" />
          <MetricCard label="反馈好评率" :value="rate(analysis.summary.likeRate)" :meta="`点赞 ${n(analysis.summary.likes)} / 反馈 ${n(analysis.summary.feedbackCount)}`" />
        </MetricGrid>
        <p class="usage-detail-quality-note">平均调用耗时 {{ duration(analysis.summary.avgDurationSeconds) }} · 赞 / 踩 {{ n(analysis.summary.likes) }} / {{ n(analysis.summary.dislikes) }}。运行成功≠业务解决，赞踩只反映已收到的反馈。</p>
        <section class="usage-detail-section">
          <SectionHeader title="每日调用与质量趋势" description="每日人数去重；无调用或反馈时，对应比率不计算。">
            <template #actions><div class="usage-detail-segmented" role="group" aria-label="详情趋势指标"><button type="button" :class="{ selected: trendMode === 'volume' }" :aria-pressed="trendMode === 'volume'" @click="trendMode = 'volume'">调用与人数</button><button type="button" :class="{ selected: trendMode === 'quality' }" :aria-pressed="trendMode === 'quality'" @click="trendMode = 'quality'">成功率与好评率</button></div></template>
          </SectionHeader>
          <UsageTrendChart :rows="analysis.trend" :mode="trendMode" />
        </section>
        <section v-if="!isSkill" class="usage-detail-section">
          <SectionHeader title="旗下Skill贡献" description="同一使用者可调用多个Skill，分行人数不能直接相加。" />
          <ListSurface>
            <DataTable :columns="skillColumns" :rows="analysis.skills" row-key="id" caption="当前创建人旗下Skill的聚合贡献，示例数据" density="two-line">
              <template #cell-name="{ row }"><div class="usage-detail-skill-name">{{ row.name }}</div><div class="usage-detail-skill-id usage-detail-code">{{ row.id }}</div></template>
              <template #cell-users="{ row }">{{ n(row.users) }}</template>
              <template #cell-calls="{ row }">{{ n(row.calls) }}</template>
              <template #cell-successRate="{ row }">{{ rate(row.successRate) }}</template>
              <template #cell-feedback="{ row }">{{ n(row.likes) }} / {{ n(row.dislikes) }}</template>
              <template #cell-likeRate="{ row }">{{ rate(row.likeRate) }}</template>
              <template #cell-actions="{ row }"><button type="button" class="usage-detail-link" :aria-label="`在当前详情查看${row.name}`" @click="changeSubject(row.id)">Skill详情</button></template>
            </DataTable>
          </ListSurface>
        </section>
        <UsageCallDetails :calls="analysis.calls" :export-name="`${title}_${startDate}_${endDate}`" />
        <p class="usage-detail-boundary">仅展示安全的样例调用记录，不含用户原始标识、输入或结果正文。当前仅有最终成功/失败状态；生产超时、取消、部分成功与重试口径待确认。</p>
      </template>
    </div>
  </dialog>
</template>

<style scoped>
.usage-analysis-detail { container-type: inline-size; box-sizing: border-box; width: min(1120px, calc(100vw - 32px)); max-width: calc(100vw - 32px); max-height: calc(100dvh - 48px); margin: auto; padding: 0; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); color: var(--color-text); overflow: auto; font-family: var(--font-body); font-size: var(--text-sm, 13px); line-height: 1.5; }
.usage-analysis-detail::backdrop { background: var(--color-overlay, color-mix(in srgb, var(--color-text) 35%, transparent)); }
.usage-analysis-detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4, 16px); padding: var(--space-5, 20px); border-bottom: 1px solid var(--color-border-subtle); }
.usage-analysis-detail-heading { display: grid; gap: var(--space-2, 8px); min-width: 0; }
.usage-analysis-detail-header h2 { margin: 0; font-size: var(--text-md, 16px); line-height: 1.4; overflow-wrap: anywhere; }
.usage-analysis-detail-header p { margin: 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-analysis-detail-header > button { flex: none; }
.usage-analysis-detail-body { display: grid; gap: var(--space-4, 16px); min-width: 0; padding: var(--space-5, 20px); }
.usage-detail-identity { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-4, 16px); margin: 0; }
.usage-detail-identity > div { min-width: 0; }
.usage-detail-identity dt { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-detail-identity dd { margin: var(--space-1, 4px) 0 0; overflow-wrap: anywhere; }
.usage-detail-code { font-family: var(--font-code, ui-monospace, monospace); }
.usage-detail-quality-note, .usage-detail-boundary { margin: 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-detail-section { display: grid; gap: var(--space-4, 16px); min-width: 0; }
.usage-detail-link { width: fit-content; padding: var(--space-1, 4px) 0; border: 0; background: transparent; color: var(--color-primary); font: inherit; cursor: pointer; white-space: nowrap; }
.usage-detail-back { max-width: 100%; text-align: left; white-space: normal; }
.usage-detail-segmented { display: flex; flex-wrap: wrap; gap: var(--space-1, 4px); }
.usage-detail-segmented button { min-height: var(--control-height-sm, 32px); padding: var(--space-1, 4px) var(--space-3, 12px); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text-secondary); font: inherit; cursor: pointer; }
.usage-detail-segmented button.selected { border-color: var(--color-primary-border); background: var(--color-primary-subtle); color: var(--color-primary); }
.usage-analysis-detail button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.usage-detail-skill-name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.usage-detail-skill-id { margin-top: var(--space-1, 4px); color: var(--color-text-secondary); font-size: var(--text-xs, 12px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.usage-detail-boundary { padding-top: var(--space-3, 12px); border-top: 1px solid var(--color-border-subtle); }
@container (max-width: 719px) { .usage-detail-identity { grid-template-columns: 1fr; } }
</style>
