<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
const showAll = ref(false)
const pageSize = 8
const creators = computed(() => props.dimension === 'creators')
const rows = computed<DimensionRow[]>(() => [...(creators.value ? props.analysis.creators : props.analysis.skills)].sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name, 'zh-CN')))
const pageRows = computed(() => showAll.value ? rows.value : rows.value.slice((page.value - 1) * pageSize, page.value * pageSize))
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
  { key: 'name', label: creators.value ? '创建人' : 'Skill', width: creators.value ? '170px' : '220px' },
  ...(creators.value
    ? [{ key: 'skillCount', label: '旗下Skill', width: '92px', align: 'right' as const }, { key: 'calledSkills', label: '被用Skill', width: '92px', align: 'right' as const }]
    : [{ key: 'creator', label: '创建人', width: '140px' }, { key: 'module', label: '业务模块', width: '120px' }]),
  ...baseColumns
])
function reset() { selectedModule.value = 'all'; keyword.value = '' }
function toggleAll() { showAll.value = !showAll.value }
watch(() => [props.module, props.search, props.dimension, props.analysis.startDate, props.analysis.endDate], () => { page.value = 1 })
</script>

<template>
  <section class="usage-dimension" :aria-label="creators ? '创建人分析' : 'Skill分析'">
    <div class="usage-dimension-filter usage-analysis-surface">
      <FilterField :label="creators ? '搜索创建人' : '搜索Skill'"><input v-model="keyword" type="search" :placeholder="creators ? '创建人名称 / ID' : '名称 / ID / 创建人'" /></FilterField>
      <FilterField label="业务模块"><select v-model="selectedModule"><option value="all">全部模块</option><option v-for="item in USAGE_MODULES" :key="item" :value="item">{{ item }}</option></select></FilterField>
      <button type="button" class="btn btn-secondary" @click="reset">重置</button>
    </div>
    <p class="usage-dimension-hint">{{ creators ? '按创建人旗下Skill的使用贡献聚合，非创建人本人使用；' : '' }}明细、导出与详情均随当前日期、模块与搜索联动。使用人数按账号跨Skill去重，不能直接相加。运行成功≠业务解决。</p>
    <ListSurface>
      <template #toolbar><div class="usage-dimension-toolbar"><strong>{{ creators ? '创建人贡献明细' : 'Skill使用明细' }}</strong><div class="usage-dimension-toolbar"><span>{{ rows.length }} {{ creators ? '位创建人' : '个Skill' }}</span><button v-if="rows.length > pageSize || showAll" type="button" class="btn btn-secondary" :aria-pressed="showAll" @click="toggleAll">{{ showAll ? '分页显示' : `查看全部（${rows.length}）` }}</button></div></div></template>
      <DataTable v-if="rows.length" :columns="columns" :rows="pageRows" row-key="id" :caption="creators ? '创建人旗下Skill贡献聚合统计，示例数据' : 'Skill调用与质量聚合统计，示例数据'" density="two-line">
        <template #cell-name="{ row }"><div class="usage-analysis-name">{{ row.name }}</div><div class="usage-analysis-meta"><span class="usage-analysis-code">{{ row.id }}</span></div></template>
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
      <template #pagination><div v-if="showAll" class="usage-dimension-toolbar"><p class="usage-dimension-hint" role="status">已显示当前筛选全部 {{ rows.length }} 条</p><button type="button" class="btn btn-secondary" @click="toggleAll">分页显示</button></div><Pagination v-else v-model:page="page" :page-size="pageSize" :total="rows.length" /></template>
    </ListSurface>
  </section>
</template>

<style scoped>
.usage-dimension { display: grid; gap: var(--space-4, 16px); min-width: 0; container-type: inline-size; }
.usage-analysis-surface { min-width: 0; padding: var(--space-4, 16px); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-surface); }
.usage-dimension-filter { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto; gap: var(--space-3, 12px); align-items: end; }
.usage-dimension-filter > button { min-height: var(--control-height-md, 36px); }
.usage-dimension-hint { margin: 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-dimension-toolbar span { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); font-weight: 400; }
.usage-dimension-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2, 8px); }
.usage-analysis-name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.usage-analysis-meta { margin-top: var(--space-1, 4px); color: var(--color-text-secondary); font-size: var(--text-xs, 12px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.usage-analysis-code { font-family: var(--font-code, ui-monospace, monospace); }
.usage-analysis-link { padding: var(--space-1, 4px) 0; border: 0; background: transparent; color: var(--color-primary); font: inherit; cursor: pointer; white-space: nowrap; }
.usage-analysis-link:hover { text-decoration: underline; }
.usage-dimension button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
@container (max-width: 719px) { .usage-dimension-filter { grid-template-columns: repeat(2, minmax(0, 1fr)); } .usage-dimension-filter > :first-child { grid-column: 1 / -1; } }
@container (max-width: 479px) { .usage-dimension-filter { grid-template-columns: 1fr; } .usage-dimension-filter > :first-child { grid-column: auto; } }
</style>
