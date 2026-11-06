<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ContentTabs from '@/components/content/ContentTabs.vue'
import MetricGrid from '@/components/content/MetricGrid.vue'
import MetricCard from '@/components/content/MetricCard.vue'
import SectionHeader from '@/components/content/SectionHeader.vue'
import FilterField from '@/components/content/FilterField.vue'
import DataTable from '@/components/content/DataTable.vue'
import ListSurface from '@/components/content/ListSurface.vue'
import Pagination from '@/components/content/Pagination.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import { USAGE_MODULES, getUsageAnalysis } from '@/domain/usageDashboard.js'

type Analysis = ReturnType<typeof getUsageAnalysis>
type DimensionRow = {
  id: string; name: string; creator?: string; module?: string; skillCount?: number; calledSkills?: number
  users: number; calls: number; success: number; failed: number; successRate: number | null
  likes: number; dislikes: number; feedbackCount: number; likeRate: number | null; avgDurationSeconds: number | null
}
const props = defineProps<{ analysis: Analysis; dimension: 'skills' | 'creators'; module: string; search: string }>()
const emit = defineEmits<{ 'update:module': [value: string]; 'update:search': [value: string]; 'open-detail': [id: string] }>()
const selectedModule = computed({ get: () => props.module, set: value => emit('update:module', value) })
const keyword = computed({ get: () => props.search, set: value => emit('update:search', value) })
const page = ref(1)
const pageSize = 8
const quality = ref('successRate')
const qualityTabs = [{ key: 'successRate', label: '运行成功率' }, { key: 'likeRate', label: '反馈好评率' }]
const creators = computed(() => props.dimension === 'creators')
const rows = computed<DimensionRow[]>(() => [...(creators.value ? props.analysis.creators : props.analysis.skills)].sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name, 'zh-CN')))
const pageRows = computed(() => rows.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const ranking = computed(() => rows.value.filter(row => row.calls > 0).slice(0, 5))
const qualityRanking = computed(() => rows.value.filter(row => qualityValue(row) != null).sort((a, b) => (qualityValue(b) || 0) - (qualityValue(a) || 0) || b.calls - a.calls).slice(0, 5))
const summary = computed(() => props.analysis.summary)
const n = (value: number | undefined) => value == null ? '—' : value.toLocaleString('zh-CN')
const rate = (value: number | null) => value == null ? '—' : `${(value * 100).toFixed(1)}%`
const duration = (value: number | null) => value == null ? '—' : `${value.toFixed(2)}秒`
const baseColumns = [
  { key: 'users', label: '使用人数', width: '92px', align: 'right' as const },
  { key: 'calls', label: '调用次数', width: '92px', align: 'right' as const },
  { key: 'outcomes', label: '成功 / 失败', width: '112px', align: 'right' as const },
  { key: 'successRate', label: '成功率', width: '92px', align: 'right' as const },
  { key: 'feedback', label: '赞 / 踩', width: '92px', align: 'right' as const },
  { key: 'likeRate', label: '好评率', width: '92px', align: 'right' as const },
  { key: 'avgDurationSeconds', label: '平均耗时', width: '104px', align: 'right' as const },
  { key: 'actions', label: '操作', width: '100px' }
]
const columns = computed(() => [
  { key: 'name', label: creators.value ? '创建人' : 'Skill / 创建人', width: creators.value ? '170px' : '220px' },
  ...(creators.value
    ? [{ key: 'skillCount', label: '旗下Skill', width: '92px', align: 'right' as const }, { key: 'calledSkills', label: '被用Skill', width: '92px', align: 'right' as const }]
    : [{ key: 'module', label: '业务模块', width: '120px' }]),
  ...baseColumns
])
function reset() { selectedModule.value = 'all'; keyword.value = '' }
function qualityValue(row: DimensionRow) { return quality.value === 'likeRate' ? row.likeRate : row.successRate }
function qualityCount(row: DimensionRow) { return quality.value === 'likeRate' ? `${n(row.likes)} / ${n(row.feedbackCount)} 条反馈` : `${n(row.success)} / ${n(row.calls)} 次调用` }
function callWidth(calls: number) { return `${calls / (ranking.value[0]?.calls || 1) * 100}%` }
watch(() => [props.module, props.search, props.dimension, props.analysis.startDate, props.analysis.endDate], () => { page.value = 1 })
</script>

<template>
  <section class="usage-dimension" :aria-label="creators ? '创建人分析' : 'Skill分析'">
    <div class="usage-dimension-filter usage-analysis-surface">
      <FilterField :label="creators ? '搜索创建人' : '搜索Skill'"><input v-model="keyword" type="search" :placeholder="creators ? '创建人名称 / ID' : '名称 / ID / 创建人'" /></FilterField>
      <FilterField label="业务模块"><select v-model="selectedModule"><option value="all">全部模块</option><option v-for="item in USAGE_MODULES" :key="item" :value="item">{{ item }}</option></select></FilterField>
      <button type="button" class="btn btn-secondary" @click="reset">重置</button>
    </div>
    <p class="usage-dimension-hint">{{ creators ? '按创建人旗下Skill的使用贡献聚合，非创建人本人使用；' : '' }}以下看板、排行及表格均随当前日期、模块与搜索联动。运行成功≠业务解决。</p>
    <MetricGrid data-flow-role="summary">
      <MetricCard :label="creators ? '创建人数' : 'Skill数'" :value="n(creators ? summary.creatorCount : summary.skillCount)" :meta="creators ? `旗下 ${n(summary.skillCount)} 个Skill` : `被调用 ${n(summary.calledSkills)} 个`" />
      <MetricCard label="调用次数" :value="n(summary.calls)" unit="次" :meta="`使用人数 ${n(summary.users)} 人 · 周期去重`" />
      <MetricCard label="运行成功率" :value="rate(summary.successRate)" :meta="`成功 ${n(summary.success)} / 总调用 ${n(summary.calls)}`" />
      <MetricCard label="反馈好评率" :value="rate(summary.likeRate)" :meta="`点赞 ${n(summary.likes)} / 赞踩反馈 ${n(summary.feedbackCount)}`" />
    </MetricGrid>
    <div class="usage-comparison-grid">
      <section class="usage-analysis-surface usage-analysis-section">
        <SectionHeader :title="creators ? '创建人调用贡献排行' : 'Skill调用排行'" description="当前筛选范围 · Top 5" />
        <ol v-if="ranking.length" class="usage-analysis-ranking">
          <li v-for="(row, index) in ranking" :key="row.id">
            <button type="button" class="usage-analysis-rank" :aria-label="`查看${row.name}详情`" @click="emit('open-detail', row.id)">
              <span class="usage-analysis-rank-index">{{ index + 1 }}</span>
              <span class="usage-analysis-rank-main"><span>{{ row.name }}</span><span class="usage-analysis-track" aria-hidden="true"><i :style="{ width: callWidth(row.calls) }"></i></span></span>
              <b>{{ n(row.calls) }}<small> 次</small></b>
            </button>
          </li>
        </ol>
        <FeedbackState v-else state="empty" title="暂无调用排行" description="当前筛选范围内没有调用记录；零调用对象仍保留在下方表格中。" />
      </section>
      <section class="usage-analysis-surface usage-analysis-section">
        <SectionHeader title="运行与反馈对比" description="分别呈现，不合成为质量评分。" />
        <ContentTabs v-model="quality" :items="qualityTabs" label="质量对比指标" />
        <ol v-if="qualityRanking.length" class="usage-analysis-ranking">
          <li v-for="row in qualityRanking" :key="row.id">
            <button type="button" class="usage-analysis-rank" :aria-label="`查看${row.name}详情`" @click="emit('open-detail', row.id)">
              <span class="usage-analysis-rank-main"><span class="usage-quality-title"><span>{{ row.name }}</span><small>{{ qualityCount(row) }}</small></span><span class="usage-analysis-track" aria-hidden="true"><i :style="{ width: `${(qualityValue(row) || 0) * 100}%` }"></i></span></span>
              <b>{{ rate(qualityValue(row)) }}</b>
            </button>
          </li>
        </ol>
        <FeedbackState v-else state="empty" :title="quality === 'likeRate' ? '暂无赞踩反馈' : '暂无运行记录'" description="分母为零时不计算比率，也不计入排行。" />
      </section>
    </div>
    <ListSurface>
      <template #toolbar><div class="usage-dimension-toolbar"><strong>{{ creators ? '创建人贡献明细' : 'Skill使用明细' }}</strong><span>{{ rows.length }} {{ creators ? '位创建人' : '个Skill' }} · 平均调用耗时 {{ duration(summary.avgDurationSeconds) }}</span></div></template>
      <DataTable v-if="rows.length" :columns="columns" :rows="pageRows" row-key="id" :caption="creators ? '创建人旗下Skill贡献聚合统计，示例数据' : 'Skill调用与质量聚合统计，示例数据'" density="two-line">
        <template #cell-name="{ row }"><div class="usage-analysis-name">{{ row.name }}</div><div class="usage-analysis-meta"><span class="usage-analysis-code">{{ row.id }}</span><span v-if="row.creator"> · {{ row.creator }}</span></div></template>
        <template #cell-skillCount="{ row }">{{ n(row.skillCount) }}</template>
        <template #cell-calledSkills="{ row }">{{ n(row.calledSkills) }}</template>
        <template #cell-users="{ row }">{{ n(row.users) }}</template>
        <template #cell-calls="{ row }">{{ n(row.calls) }}</template>
        <template #cell-outcomes="{ row }">{{ n(row.success) }} / {{ n(row.failed) }}</template>
        <template #cell-successRate="{ row }">{{ rate(row.successRate) }}</template>
        <template #cell-feedback="{ row }">{{ n(row.likes) }} / {{ n(row.dislikes) }}</template>
        <template #cell-likeRate="{ row }">{{ rate(row.likeRate) }}</template>
        <template #cell-avgDurationSeconds="{ row }">{{ duration(row.avgDurationSeconds) }}</template>
        <template #cell-actions="{ row }"><button type="button" class="usage-analysis-link" :aria-label="`查看${row.name}详情与调用明细`" @click="emit('open-detail', row.id)">查看详情</button></template>
      </DataTable>
      <FeedbackState v-else state="filtered-empty" :title="creators ? '没有匹配的创建人' : '没有匹配的Skill'" description="请调整业务模块或搜索条件。"><template #action><button type="button" class="btn btn-secondary" @click="reset">清除筛选</button></template></FeedbackState>
      <template #pagination><Pagination v-model:page="page" :page-size="pageSize" :total="rows.length" /></template>
    </ListSurface>
  </section>
</template>

<style scoped>
.usage-dimension { display: grid; gap: var(--space-4, 16px); min-width: 0; container-type: inline-size; }
.usage-analysis-surface { min-width: 0; padding: var(--space-4, 16px); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-surface); }
.usage-dimension-filter { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto; gap: var(--space-3, 12px); align-items: end; }
.usage-dimension-filter > button { min-height: var(--control-height-md, 36px); }
.usage-dimension-hint { margin: 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-comparison-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4, 16px); min-width: 0; }
.usage-analysis-section { display: grid; gap: var(--space-3, 12px); align-content: start; }
.usage-analysis-ranking { display: grid; gap: var(--space-3, 12px); margin: 0; padding: 0; list-style: none; }
.usage-analysis-rank { display: flex; align-items: center; width: 100%; gap: var(--space-3, 12px); padding: var(--space-1, 4px) 0; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-text); font: inherit; text-align: left; cursor: pointer; }
.usage-analysis-rank-index { flex: 0 0 var(--space-5, 20px); color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
.usage-analysis-rank-main { display: grid; flex: 1; gap: var(--space-2, 8px); min-width: 0; }
.usage-analysis-rank-main > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.usage-analysis-track { display: block; height: var(--space-1, 4px); overflow: hidden; border-radius: var(--radius-full); background: var(--color-primary-subtle); }
.usage-analysis-track i { display: block; height: 100%; background: var(--chart-1, var(--color-primary)); }
.usage-analysis-rank b { flex: none; font-variant-numeric: tabular-nums; }
.usage-analysis-rank small, .usage-dimension-toolbar span { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); font-weight: 400; }
.usage-quality-title { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-1, 4px) var(--space-2, 8px); }
.usage-quality-title > span { overflow: hidden; text-overflow: ellipsis; }
.usage-dimension-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2, 8px); }
.usage-analysis-name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.usage-analysis-meta { margin-top: var(--space-1, 4px); color: var(--color-text-secondary); font-size: var(--text-xs, 12px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.usage-analysis-code { font-family: var(--font-code, ui-monospace, monospace); }
.usage-analysis-link { padding: var(--space-1, 4px) 0; border: 0; background: transparent; color: var(--color-primary); font: inherit; cursor: pointer; white-space: nowrap; }
.usage-analysis-link:hover { text-decoration: underline; }
.usage-dimension button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
@container (max-width: 1039px) { .usage-comparison-grid { grid-template-columns: 1fr; } }
@container (max-width: 719px) { .usage-dimension-filter { grid-template-columns: repeat(2, minmax(0, 1fr)); } .usage-dimension-filter > :first-child { grid-column: 1 / -1; } }
@container (max-width: 479px) { .usage-dimension-filter { grid-template-columns: 1fr; } .usage-dimension-filter > :first-child { grid-column: auto; } }
</style>
