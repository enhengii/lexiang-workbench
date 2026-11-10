<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MetricGrid from '@/components/content/MetricGrid.vue'
import MetricCard from '@/components/content/MetricCard.vue'
import SectionHeader from '@/components/content/SectionHeader.vue'
import FilterField from '@/components/content/FilterField.vue'
import DataTable from '@/components/content/DataTable.vue'
import ListSurface from '@/components/content/ListSurface.vue'
import Pagination from '@/components/content/Pagination.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import UsageDailyDetails from './UsageDailyDetails.vue'
import UsageActivityCards from './UsageActivityCards.vue'
import UsageOverviewRankings from './UsageOverviewRankings.vue'
import { getDailyOverview, getDailyAnalysis, USAGE_DAILY_SOURCE, USAGE_DAILY_MODULES, dailyOverviewToCsv, dailySkillRowsToCsv, dailyCreatorRowsToCsv } from '@/domain/usageDailyReport.js'

const props = defineProps<{ view: string; startDate: string; endDate: string }>()
const emit = defineEmits<{ 'show-skills': [] }>()
const module = ref('all')
const search = ref('')
const page = ref(1)
const showAll = ref(false)
const notice = ref('')
const targetId = ref('')
const pageSize = 8
const creators = computed(() => props.view === 'creators')
const overview = computed(() => getDailyOverview({ startDate: props.startDate, endDate: props.endDate }))
const overviewAnalysis = computed(() => getDailyAnalysis({ startDate: props.startDate, endDate: props.endDate, dimension: 'skills' }))
const calledSkillCount = computed(() => overviewAnalysis.value.summary.skillCount == null ? null : overviewAnalysis.value.skills.filter(row => (row.calls ?? 0) > 0).length)
const analysis = computed(() => getDailyAnalysis({ startDate: props.startDate, endDate: props.endDate, module: module.value, search: search.value, dimension: creators.value ? 'creators' : 'skills' }))
const rows = computed(() => creators.value ? analysis.value.creators : analysis.value.skills)
const pageRows = computed(() => showAll.value ? rows.value : rows.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const n = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('zh-CN')
const rate = (value: number | null | undefined) => value == null ? '—' : `${(value * 100).toFixed(1)}%`
const numberColumn = (key: string, label: string) => ({ key, label, align: 'right' as const, width: '100px', format: (value: unknown) => n(typeof value === 'number' ? value : null) })
const columns = computed(() => [
  { key: 'name', label: creators.value ? '创建人 IT Code' : 'Skill', width: '240px' },
  ...(creators.value ? [numberColumn('skillCount', '有明细Skill')] : [{ key: 'creator', label: '创建人', width: '140px' }, { key: 'module', label: '菜单', width: '130px' }, numberColumn('users', '当日使用人数')]),
  numberColumn('calls', '调用次数'),
  { key: 'outcomes', label: '成功 / 失败', align: 'right' as const, width: '110px' },
  { key: 'successRate', label: '成功率', align: 'right' as const, width: '92px' },
  { key: 'feedback', label: '赞 / 踩', align: 'right' as const, width: '92px' },
  { key: 'likeRate', label: '好评率', align: 'right' as const, width: '92px' },
  { key: 'actions', label: '操作', width: '100px' }
])
function reset() { module.value = 'all'; search.value = '' }
function toggleAll() { showAll.value = !showAll.value }
function download() {
  const csv = props.view === 'overview' ? dailyOverviewToCsv(overview.value.dailyRows) : creators.value ? dailyCreatorRowsToCsv(analysis.value.creators) : dailySkillRowsToCsv(analysis.value.skills)
  const total = props.view === 'overview' ? overview.value.dailyRows.length : rows.value.length
  if (!total) return
  try {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url; link.download = `AIwork日报_${props.view}_${props.startDate}_${props.endDate}.csv`
    document.body.append(link); link.click(); link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    notice.value = `已导出当前筛选的全部 ${total} 条统计，来源为邮件日报快照。`
  } catch { notice.value = '导出失败，请重试。' }
}
watch(() => [props.startDate, props.endDate, props.view, module.value, search.value], () => { page.value = 1; targetId.value = ''; notice.value = '' })
watch(() => props.view, () => { reset(); showAll.value = false })
</script>

<template>
  <div class="daily-panel">
    <p class="daily-source-note" data-flow-role="notice">来源：{{ USAGE_DAILY_SOURCE.filename }} · 核心概览 {{ USAGE_DAILY_SOURCE.overviewRange.startDate }} 至 {{ USAGE_DAILY_SOURCE.overviewRange.endDate }}，Skill 明细 {{ USAGE_DAILY_SOURCE.detailRange.startDate }} 至 {{ USAGE_DAILY_SOURCE.detailRange.endDate }} · 当前为已导入快照</p>
    <template v-if="view === 'overview'">
      <MetricGrid :columns="5" data-flow-role="summary">
        <MetricCard label="Query数" :value="n(overview.summary.queries)" unit="次" :meta="`所选周期累计 · 平均首字等待 ${overview.summary.firstTokenSeconds == null ? '—' : `${overview.summary.firstTokenSeconds.toFixed(2)} 秒`}（Query加权估算）`" />
        <MetricCard label="任务执行次数" :value="n(overview.summary.tasks)" unit="次" meta="按任务 traceId 统计" />
        <MetricCard label="任务成功率" :value="rate(overview.summary.taskSuccessRate)" :meta="`${n(overview.summary.taskSuccess)} / ${n(overview.summary.tasks)} 次任务`" />
        <MetricCard label="Skill 存量" :value="n(overview.summary.totalSkills)" unit="个" :meta="overview.summary.asOfDate ? `截至 ${overview.summary.asOfDate}` : '所选周期暂无日报数据'" />
        <MetricCard label="周期新增 Skill" :value="n(overview.summary.newSkills)" unit="个" :meta="`${startDate} 至 ${endDate} 累计`" />
        <MetricCard label="Skill调用次数" :value="n(overview.summary.calls)" unit="次" meta="所选周期累计" />
        <MetricCard label="Skill调用成功率" :value="rate(overview.summary.successRate)" :meta="`${n(overview.summary.success)} / ${n(overview.summary.calls)} 次调用`" />
        <MetricCard label="创建人数" :value="n(overviewAnalysis.summary.creatorCount)" unit="位" meta="本周期明细中已有明确创建人归属" />
        <MetricCard label="被调用Skill数" :value="n(calledSkillCount)" unit="个" meta="本周期已有明细内去重 · 调用大于0" />
        <MetricCard label="反馈好评率" :value="rate(overviewAnalysis.summary.likeRate)" :meta="`已有明细 · 赞 ${n(overviewAnalysis.summary.likes)} / 踩 ${n(overviewAnalysis.summary.dislikes)}`" />
      </MetricGrid>
      <section class="daily-surface daily-section" data-flow-role="summary">
        <SectionHeader title="截止日活跃与覆盖" :description="overview.summary.asOfDate ? `截至 ${overview.summary.asOfDate} · 直接采用日报去重结果，周期人数不相加` : '所选周期暂无日报数据'" />
        <UsageActivityCards :total-users="overview.summary.totalUsers" :windows="overview.windows" />
        <p v-if="overview.summary.asOfDate && overview.summary.asOfDate !== endDate" class="daily-muted" data-flow-role="notice">所选截止日 {{ endDate }} 暂无日报，活跃人数与授权总用户均采用 {{ overview.summary.asOfDate }} 的记录。</p>
      </section>
      <p v-if="overviewAnalysis.quality.detailCoveragePartial" class="daily-source-note" data-flow-role="notice">所选周期包含未提供 Skill 明细的日期。创建人数、被调用Skill数、反馈与排行仅按 {{ overviewAnalysis.quality.detailCoverageStart }} 至 {{ overviewAnalysis.quality.detailCoverageEnd }} 内已有明细汇总；未覆盖日期不当作零调用。</p>
      <UsageOverviewRankings :rows="overviewAnalysis.skills" :scope-label="`${startDate} 至 ${endDate} · 仅按已提供的Skill明细排行`" @open-detail="targetId = $event" @view-all="emit('show-skills')" />
    </template>
    <template v-else>
      <section class="daily-filter daily-surface" data-flow-role="filters" :aria-label="creators ? '日报创建人筛选' : '日报Skill筛选'">
        <FilterField :label="creators ? '搜索创建人' : '搜索Skill'"><input v-model="search" type="search" :placeholder="creators ? '创建人 IT Code' : 'Skill名称 / ID / 创建人'" /></FilterField>
        <FilterField label="所属菜单"><select v-model="module"><option value="all">全部菜单</option><option v-for="item in USAGE_DAILY_MODULES" :key="item" :value="item">{{ item }}</option></select></FilterField>
        <button type="button" class="btn btn-secondary" @click="reset">重置</button>
      </section>
      <p v-if="analysis.quality.detailCoveragePartial" class="daily-source-note" data-flow-role="notice">所选周期包含未提供 Skill 明细的日期。以下仅汇总 {{ analysis.quality.detailCoverageStart }} 至 {{ analysis.quality.detailCoverageEnd }} 内已有明细，未覆盖日期不当作零调用。</p>
      <p class="daily-muted" data-flow-role="notice">{{ creators ? '创建人数据为其创建 Skill 的使用贡献，不是本人调用；仅统计已有明确创建人归属的数据。' : '使用人数仅在单天单个 Skill 可得；跨日无法去重时显示“—”。缺失归属按“未标注”保留。' }}运行成功率与用户反馈分开展示，不合成为质量评分。</p>
      <ListSurface data-flow-role="list-workspace"><template #toolbar><SectionHeader :title="creators ? '创建人聚合明细' : 'Skill聚合明细'" :description="`当前筛选 ${rows.length} 条 · 仅含日报中已有的明细`"><template #actions><button v-if="rows.length > pageSize || showAll" type="button" class="btn btn-secondary" :aria-pressed="showAll" @click="toggleAll">{{ showAll ? '分页显示' : `查看全部（${rows.length}）` }}</button><button type="button" class="btn btn-secondary" :disabled="!rows.length" @click="download">导出当前统计</button></template></SectionHeader></template>
        <DataTable v-if="rows.length" :columns="columns" :rows="pageRows" row-key="id" :caption="creators ? '创建人归属下Skill调用与质量统计' : 'Skill日统计按当前周期汇总'" density="two-line">
          <template #cell-name="{ row }"><div class="daily-name">{{ row.name }}</div><div class="daily-meta">{{ creators ? `当前范围涵盖 ${row.skillCount} 个Skill` : row.id }}</div></template>
          <template #cell-users="{ row }"><span :title="row.users == null ? '日报只有日去重人数，无法跨日去重' : '当天该Skill去重人数'">{{ n(row.users) }}</span></template>
          <template #cell-outcomes="{ row }">{{ n(row.success) }} / {{ n(row.failed) }}</template><template #cell-successRate="{ row }">{{ rate(row.successRate) }}</template><template #cell-feedback="{ row }">{{ n(row.likes) }} / {{ n(row.dislikes) }}</template><template #cell-likeRate="{ row }">{{ rate(row.likeRate) }}</template>
          <template #cell-actions="{ row }"><button type="button" class="daily-link" :aria-label="`查看${row.name}日报明细`" @click="targetId = row.id">查看明细</button></template>
        </DataTable>
        <FeedbackState v-else state="filtered-empty" title="没有匹配的日报明细" description="Skill明细从2026-10-08开始；请调整日期、菜单或搜索条件。"><template #action><button type="button" class="btn btn-secondary" @click="reset">清除筛选</button></template></FeedbackState>
        <template #pagination><div v-if="showAll" class="daily-toolbar"><p class="daily-muted" role="status">已显示当前筛选全部 {{ rows.length }} 条</p><button type="button" class="btn btn-secondary" @click="toggleAll">分页显示</button></div><Pagination v-else v-model:page="page" :page-size="pageSize" :total="rows.length" /></template>
      </ListSurface>
    </template>
    <p v-if="notice" role="status" class="daily-source-note" data-flow-role="notice">{{ notice }}</p>
    <details class="daily-surface daily-definitions" data-flow-role="notice"><summary>日报来源、口径与数据范围</summary>
      <button v-if="view === 'overview'" type="button" class="btn btn-secondary" :disabled="!overview.dailyRows.length" @click="download">导出核心日报统计</button>
      <p>当前为用户提供的邮件附件快照，尚未接入邮件自动同步。核心概览含80天数据；Skill明细覆盖29天、148条日统计、66个Skill，不是完整Skill资产清单。缺失名称用ID展示；Skill分析保留缺失菜单及创建人信息，创建人分析仅统计已有明确归属的数据。</p>
      <p>DAU / WAU / MAU、授权用户和Skill存量取截止日原表值；跨日人数和每日存量不能直接相加。创建人跨Skill去重人数无法由这份日报恢复。运行成功不等于业务已解决，好评率仅代表已收到的赞踩。</p>
      <p>任务按traceId去重，任务成功按日报定义为最终结果正确且任务内Skill调用成功；Skill成功率按成功调用/总调用。首字等待按每日均值和Query数加权估算，原均值已四舍五入；无问答时留空，不能当0秒。</p>
      <p>2026-10-08至11-05的Skill明细调用与核心概览逐日一致；没有明细的8天核心调用均为0。日报不含逐次调用日志、用户清单、输入输出或运行耗时，真实明细按“日期×Skill”展示。</p>
    </details>
    <UsageDailyDetails v-if="targetId" :key="`${view}-${targetId}`" :dimension="creators ? 'creators' : 'skills'" :target-id="targetId" :start-date="startDate" :end-date="endDate" :module="module" :search="search" @close="targetId = ''" />
  </div>
</template>

<style scoped>
.daily-panel { display: grid; gap: var(--space-4, 16px); min-width: 0; container-type: inline-size; }
.daily-surface { min-width: 0; padding: var(--space-4, 16px); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-surface); }
.daily-section { display: grid; align-content: start; gap: var(--space-4, 16px); }
.daily-source-note { margin: 0; padding: var(--space-3, 12px) var(--space-4, 16px); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); background: var(--color-bg-subtle); color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.daily-muted, .daily-meta { margin: 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); line-height: 1.65; overflow-wrap: anywhere; }
.daily-name { font-weight: 500; overflow-wrap: anywhere; }
.daily-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3, 12px); }
.daily-toolbar > button { flex: none; }
.daily-filter { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-3, 12px); }
.daily-filter > :first-child { flex: 1 1 240px; }
.daily-filter > :nth-child(2) { flex: 1 1 180px; }
.daily-filter input, .daily-filter select { box-sizing: border-box; width: 100%; min-width: 0; height: 28px; padding: 0 var(--space-2, 8px); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); font: inherit; }
.daily-link { padding: var(--space-1, 4px); border: 0; background: transparent; color: var(--color-primary); font: inherit; cursor: pointer; white-space: nowrap; }
.daily-definitions { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); line-height: 1.75; }
.daily-definitions summary { color: var(--color-text); cursor: pointer; font-weight: 500; }
.daily-definitions p { margin: var(--space-3, 12px) 0 0; }
.daily-panel button:focus-visible, .daily-panel input:focus-visible, .daily-panel select:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
</style>
