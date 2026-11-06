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
import UsageTrendChart from './UsageTrendChart.vue'
import UsageDailyDetails from './UsageDailyDetails.vue'
import { getDailyOverview, getDailyAnalysis, USAGE_DAILY_SOURCE, USAGE_DAILY_MODULES, dailyOverviewToCsv, dailySkillRowsToCsv, dailyCreatorRowsToCsv } from '@/domain/usageDailyReport.js'

const props = defineProps<{ view: string; startDate: string; endDate: string }>()
const module = ref('all')
const search = ref('')
const page = ref(1)
const trendMode = ref<'users' | 'calls'>('calls')
const coreGroup = ref('usage')
const qualityKey = ref<'successRate' | 'likeRate'>('successRate')
const notice = ref('')
const targetId = ref('')
const pageSize = 8
const creators = computed(() => props.view === 'creators')
const overview = computed(() => getDailyOverview({ startDate: props.startDate, endDate: props.endDate }))
const analysis = computed(() => getDailyAnalysis({ startDate: props.startDate, endDate: props.endDate, module: module.value, search: search.value, dimension: creators.value ? 'creators' : 'skills' }))
const rows = computed(() => creators.value ? analysis.value.creators : analysis.value.skills)
const pageRows = computed(() => rows.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const coreRows = computed(() => [...overview.value.dailyRows].reverse().slice((page.value - 1) * pageSize, page.value * pageSize))
const top = computed(() => rows.value.filter(row => (row.calls ?? 0) > 0).slice(0, 5))
const qualityRows = computed(() => rows.value.filter(row => row[qualityKey.value] != null).sort((a, b) => (b[qualityKey.value] || 0) - (a[qualityKey.value] || 0) || (b.calls ?? 0) - (a.calls ?? 0)).slice(0, 5))
const trend = computed(() => overview.value.dailyRows.map(row => ({ date: row.date, loginUsers: row.loginDau, aiUsers: row.aiDau, queries: row.queries, calls: row.calls })))
const coreGroups = [{ key: 'usage', label: '用户与互动' }, { key: 'tasks', label: '任务与 Skill' }, { key: 'coverage', label: '覆盖与响应' }]
const n = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('zh-CN')
const rate = (value: number | null | undefined) => value == null ? '—' : `${(value * 100).toFixed(1)}%`
const numberColumn = (key: string, label: string) => ({ key, label, align: 'right' as const, width: '100px', format: (value: unknown) => n(typeof value === 'number' ? value : null) })
const coreColumns = computed(() => [
  { key: 'date', label: '日期', width: '120px' },
  ...(coreGroup.value === 'usage'
    ? [numberColumn('loginDau', '登录 DAU'), numberColumn('loginWau', '登录 WAU'), numberColumn('loginMau', '登录 MAU'), numberColumn('aiDau', '互动 DAU'), numberColumn('aiWau', '互动 WAU'), numberColumn('aiMau', '互动 MAU'), numberColumn('totalUsers', '授权用户'), numberColumn('queries', 'Query数')]
    : coreGroup.value === 'tasks'
      ? [numberColumn('tasks', '任务执行'), numberColumn('taskSuccess', '任务成功'), numberColumn('taskFailed', '任务失败'), numberColumn('totalSkills', 'Skill存量'), numberColumn('newSkills', '新增Skill'), numberColumn('calledSkills', '被调用Skill'), numberColumn('calls', 'Skill调用'), numberColumn('success', '成功调用'), numberColumn('failed', '失败调用')]
      : [numberColumn('totalUsers', '授权用户'), { key: 'loginWauRate', label: '登录周覆盖率', align: 'right' as const, format: (value: unknown) => rate(typeof value === 'number' ? value : null) }, { key: 'aiWauRate', label: '互动周覆盖率', align: 'right' as const, format: (value: unknown) => rate(typeof value === 'number' ? value : null) }, { key: 'firstTokenSeconds', label: '当日首字等待（秒）', align: 'right' as const, format: (value: unknown) => typeof value === 'number' ? value.toFixed(2) : '—' }])
])
const columns = computed(() => [
  { key: 'name', label: creators.value ? '创建人 IT Code' : 'Skill / 创建人', width: '240px' },
  ...(creators.value ? [numberColumn('skillCount', '有明细Skill')] : [{ key: 'module', label: '菜单', width: '130px' }, numberColumn('users', '当日使用人数')]),
  numberColumn('calls', '调用次数'),
  { key: 'outcomes', label: '成功 / 失败', align: 'right' as const, width: '110px' },
  { key: 'successRate', label: '成功率', align: 'right' as const, width: '92px' },
  { key: 'feedback', label: '赞 / 踩', align: 'right' as const, width: '92px' },
  { key: 'likeRate', label: '好评率', align: 'right' as const, width: '92px' },
  { key: 'actions', label: '操作', width: '100px' }
])
function reset() { module.value = 'all'; search.value = '' }
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
watch(() => props.view, reset)
watch(coreGroup, () => { page.value = 1 })
</script>

<template>
  <div class="daily-panel">
    <p class="daily-source-note" data-flow-role="notice">来源：{{ USAGE_DAILY_SOURCE.filename }} · 核心概览 {{ USAGE_DAILY_SOURCE.overviewRange.startDate }} 至 {{ USAGE_DAILY_SOURCE.overviewRange.endDate }}，Skill 明细 {{ USAGE_DAILY_SOURCE.detailRange.startDate }} 至 {{ USAGE_DAILY_SOURCE.detailRange.endDate }} · 当前为已导入快照</p>
    <template v-if="view === 'overview'">
      <MetricGrid data-flow-role="summary">
        <MetricCard label="Query数" :value="n(overview.summary.queries)" unit="次" meta="所选周期累计" />
        <MetricCard label="任务执行次数" :value="n(overview.summary.tasks)" unit="次" meta="按任务 traceId 统计" />
        <MetricCard label="Skill调用次数" :value="n(overview.summary.calls)" unit="次" meta="所选周期累计" />
        <MetricCard label="Skill调用成功率" :value="rate(overview.summary.successRate)" :meta="`${n(overview.summary.success)} / ${n(overview.summary.calls)} 次调用`" />
      </MetricGrid>
      <section class="daily-surface daily-section" data-flow-role="summary">
        <SectionHeader title="截止日活跃与覆盖" :description="`截至 ${overview.summary.asOfDate || endDate} · 直接采用日报去重结果，周期人数不相加`" />
        <div class="daily-active-wrap">
          <table class="daily-active"><caption class="daily-sr-only">日报截止日去重用户统计</caption><thead><tr><th>用户类型</th><th>DAU</th><th>WAU</th><th>MAU</th></tr></thead><tbody>
            <tr><th scope="row">登录用户</th><td>{{ n(overview.windows.login.dau) }}</td><td>{{ n(overview.windows.login.wau) }}</td><td>{{ n(overview.windows.login.mau) }}</td></tr>
            <tr><th scope="row">智能体互动用户</th><td>{{ n(overview.windows.ai.dau) }}</td><td>{{ n(overview.windows.ai.wau) }}</td><td>{{ n(overview.windows.ai.mau) }}</td></tr>
          </tbody></table>
          <dl class="daily-small-metrics"><div><dt>授权用户总数</dt><dd>{{ n(overview.summary.totalUsers) }}</dd></div><div><dt>Skill 存量</dt><dd>{{ n(overview.summary.totalSkills) }}</dd></div><div><dt>周期新增 Skill</dt><dd>{{ n(overview.summary.newSkills) }}</dd></div><div><dt>任务成功率</dt><dd>{{ rate(overview.summary.taskSuccessRate) }}</dd></div></dl>
        </div>
        <p class="daily-muted">平均首字等待：{{ overview.summary.firstTokenSeconds == null ? '—' : `${overview.summary.firstTokenSeconds.toFixed(2)} 秒` }}（按每日 Query 数加权估算）。任务与 Skill 调用分开计数，一个任务可调用多个 Skill。</p>
      </section>
      <section class="daily-surface daily-section" data-flow-role="main">
        <SectionHeader :title="trendMode === 'calls' ? 'Query 与 Skill 调用趋势' : '每日用户活跃趋势'" description="日报原始日统计；人数曲线为每日去重人数。"><template #actions><div class="daily-segmented" role="group" aria-label="日报趋势指标"><button type="button" :aria-pressed="trendMode === 'calls'" @click="trendMode = 'calls'">Query与调用</button><button type="button" :aria-pressed="trendMode === 'users'" @click="trendMode = 'users'">用户活跃</button></div></template></SectionHeader>
        <UsageTrendChart :rows="trend" :mode="trendMode" source-label="邮件日报数据" />
      </section>
      <ListSurface data-flow-role="list-workspace"><template #toolbar><div class="daily-toolbar"><SectionHeader title="核心数据日报明细" description="与原表一致的每日统计，导出包含完整指标。" /><button type="button" class="btn btn-secondary" :disabled="!overview.dailyRows.length" @click="download">导出日报统计</button></div><ContentTabs v-model="coreGroup" :items="coreGroups" label="核心日报指标组" /></template>
        <DataTable :columns="coreColumns" :rows="coreRows" row-key="date" caption="邮件日报核心数据日统计" density="compact" />
        <template #pagination><Pagination v-model:page="page" :page-size="pageSize" :total="overview.dailyRows.length" /></template>
      </ListSurface>
    </template>
    <template v-else>
      <section class="daily-filter daily-surface" data-flow-role="filters" :aria-label="creators ? '日报创建人筛选' : '日报Skill筛选'">
        <FilterField :label="creators ? '搜索创建人' : '搜索Skill'"><input v-model="search" type="search" :placeholder="creators ? '创建人 IT Code' : 'Skill名称 / ID / 创建人'" /></FilterField>
        <FilterField label="所属菜单"><select v-model="module"><option value="all">全部菜单</option><option v-for="item in USAGE_DAILY_MODULES" :key="item" :value="item">{{ item }}</option></select></FilterField>
        <button type="button" class="btn btn-secondary" @click="reset">重置</button>
      </section>
      <MetricGrid data-flow-role="summary">
        <MetricCard :label="creators ? '有明细的创建人' : '有明细的Skill'" :value="n(creators ? analysis.summary.creatorCount : analysis.summary.skillCount)" :meta="creators ? '按创建人IT Code归属；未标注单列' : '当前筛选范围；不代表全部上线Skill'" />
        <MetricCard label="调用次数" :value="n(analysis.summary.calls)" unit="次" meta="当前周期及筛选累计" />
        <MetricCard label="运行成功率" :value="rate(analysis.summary.successRate)" :meta="`${n(analysis.summary.success)} / ${n(analysis.summary.calls)} 次调用`" />
        <MetricCard label="反馈好评率" :value="rate(analysis.summary.likeRate)" :meta="`${n(analysis.summary.likes)} 个赞 / ${n(analysis.summary.feedbackCount)} 条评价`" />
      </MetricGrid>
      <p v-if="analysis.quality.detailCoveragePartial" class="daily-source-note" data-flow-role="notice">所选周期包含未提供 Skill 明细的日期。以下仅汇总 {{ analysis.quality.detailCoverageStart }} 至 {{ analysis.quality.detailCoverageEnd }} 内已有明细，未覆盖日期不当作零调用。</p>
      <p class="daily-muted" data-flow-role="notice">{{ creators ? '创建人数据为其创建 Skill 的使用贡献，不是本人调用。' : '使用人数仅在单天单个 Skill 可得；跨日无法去重时显示“—”。' }}运行成功率与用户反馈分开展示，不合成为质量评分。缺失归属按“未标注”保留。</p>
      <div class="daily-rank-grid" data-flow-role="main">
        <section class="daily-surface daily-section"><SectionHeader :title="creators ? '创建人调用贡献' : 'Skill调用排行'" description="当前筛选 · 按调用次数排序 · Top 5" />
          <ol v-if="top.length" class="daily-ranking"><li v-for="(row, i) in top" :key="row.id"><button type="button" :aria-label="`查看${row.name}日报明细`" @click="targetId = row.id"><span class="daily-rank-index">{{ i + 1 }}</span><span class="daily-rank-label">{{ row.name }}<span class="daily-track" aria-hidden="true"><i :style="{ width: `${(row.calls ?? 0) / (top[0]?.calls || 1) * 100}%` }"></i></span></span><b>{{ n(row.calls) }}<small> 次</small></b></button></li></ol>
          <FeedbackState v-else state="filtered-empty" title="没有匹配的日报明细" description="请调整日期、菜单或搜索条件。" />
        </section>
        <section class="daily-surface daily-section"><SectionHeader title="质量对比" description="比例旁展示分子与分母；没有评价时不计算好评率。" />
          <div class="daily-segmented" role="group" aria-label="日报质量指标"><button type="button" :aria-pressed="qualityKey === 'successRate'" @click="qualityKey = 'successRate'">运行成功率</button><button type="button" :aria-pressed="qualityKey === 'likeRate'" @click="qualityKey = 'likeRate'">反馈好评率</button></div>
          <ol v-if="qualityRows.length" class="daily-ranking"><li v-for="row in qualityRows" :key="row.id"><button type="button" :aria-label="`查看${row.name}质量明细`" @click="targetId = row.id"><span class="daily-rank-label">{{ row.name }}<small>{{ qualityKey === 'likeRate' ? `${n(row.likes)} / ${n(row.feedbackCount)} 条评价` : `${n(row.success)} / ${n(row.calls)} 次调用` }}</small><span class="daily-track" aria-hidden="true"><i :style="{ width: `${(row[qualityKey] || 0) * 100}%` }"></i></span></span><b>{{ rate(row[qualityKey]) }}</b></button></li></ol>
          <FeedbackState v-else state="empty" :title="qualityKey === 'likeRate' ? '暂无赞踩反馈' : '暂无调用记录'" description="分母为零时显示“—”，不计入排行。" />
        </section>
      </div>
      <ListSurface data-flow-role="list-workspace"><template #toolbar><div class="daily-toolbar"><SectionHeader :title="creators ? '创建人聚合明细' : 'Skill聚合明细'" :description="`当前筛选 ${rows.length} 条 · 仅含日报中已有的明细`" /><button type="button" class="btn btn-secondary" :disabled="!rows.length" @click="download">导出当前统计</button></div></template>
        <DataTable v-if="rows.length" :columns="columns" :rows="pageRows" row-key="id" :caption="creators ? '创建人归属下Skill调用与质量统计' : 'Skill日统计按当前周期汇总'" density="two-line">
          <template #cell-name="{ row }"><div class="daily-name">{{ row.name }}</div><div class="daily-meta">{{ creators ? (row.id === 'unattributed' ? '原日报未标注，保留此分组' : `当前范围涵盖 ${row.skillCount} 个Skill`) : `${row.id} · ${row.creator}` }}</div></template>
          <template #cell-users="{ row }"><span :title="row.users == null ? '日报只有日去重人数，无法跨日去重' : '当天该Skill去重人数'">{{ n(row.users) }}</span></template>
          <template #cell-outcomes="{ row }">{{ n(row.success) }} / {{ n(row.failed) }}</template><template #cell-successRate="{ row }">{{ rate(row.successRate) }}</template><template #cell-feedback="{ row }">{{ n(row.likes) }} / {{ n(row.dislikes) }}</template><template #cell-likeRate="{ row }">{{ rate(row.likeRate) }}</template>
          <template #cell-actions="{ row }"><button type="button" class="daily-link" :aria-label="`查看${row.name}日报明细`" @click="targetId = row.id">查看明细</button></template>
        </DataTable>
        <FeedbackState v-else state="filtered-empty" title="没有匹配的日报明细" description="Skill明细从2026-10-08开始；请调整日期、菜单或搜索条件。"><template #action><button type="button" class="btn btn-secondary" @click="reset">清除筛选</button></template></FeedbackState>
        <template #pagination><Pagination v-model:page="page" :page-size="pageSize" :total="rows.length" /></template>
      </ListSurface>
    </template>
    <p v-if="notice" role="status" class="daily-source-note" data-flow-role="notice">{{ notice }}</p>
    <details class="daily-surface daily-definitions" data-flow-role="notice"><summary>日报来源、口径与数据范围</summary>
      <p>当前为用户提供的邮件附件快照，尚未接入邮件自动同步。核心概览含80天数据；Skill明细覆盖29天、148条日统计、66个Skill，不是完整Skill资产清单。缺失名称用ID展示，菜单及创建人缺失按“未标注”保留。</p>
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
.daily-rank-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4, 16px); min-width: 0; }
.daily-ranking { display: grid; gap: var(--space-3, 12px); padding: 0; margin: 0; list-style: none; }
.daily-ranking button { display: flex; align-items: center; gap: var(--space-3, 12px); width: 100%; min-width: 0; padding: var(--space-2, 8px); border: 0; border-radius: var(--radius-md); background: transparent; color: var(--color-text); font: inherit; text-align: left; cursor: pointer; }
.daily-ranking button:hover { background: var(--color-bg-subtle); }
.daily-rank-index { color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
.daily-rank-label { display: grid; gap: var(--space-2, 8px); flex: 1; min-width: 0; overflow-wrap: anywhere; }
.daily-ranking small { display: inline; font-size: var(--text-xs, 12px); color: var(--color-text-secondary); font-weight: 400; }
.daily-ranking b { flex: none; font-variant-numeric: tabular-nums; }
.daily-track { height: 4px; width: 100%; border-radius: var(--radius-pill, 9999px); background: var(--color-bg-subtle); overflow: hidden; }
.daily-track i { display: block; height: 100%; background: var(--color-primary); border-radius: inherit; }
.daily-segmented { display: flex; flex-wrap: wrap; gap: var(--space-2, 8px); }
.daily-segmented button { padding: var(--space-1, 4px) var(--space-2, 8px); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text-secondary); font: inherit; cursor: pointer; }
.daily-segmented button[aria-pressed="true"] { color: var(--color-primary); border-color: var(--color-primary); background: var(--color-primary-subtle); }
.daily-link { padding: var(--space-1, 4px); border: 0; background: transparent; color: var(--color-primary); font: inherit; cursor: pointer; white-space: nowrap; }
.daily-active-wrap { display: grid; gap: var(--space-4, 16px); min-width: 0; }
.daily-active { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.daily-active th, .daily-active td { padding: var(--space-3, 12px) var(--space-2, 8px); border-bottom: 1px solid var(--color-border-subtle); text-align: right; }
.daily-active th { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); font-weight: 500; }
.daily-active th:first-child { text-align: left; }
.daily-small-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4, 16px); margin: 0; }
.daily-small-metrics dt { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.daily-small-metrics dd { margin: var(--space-1, 4px) 0 0; font-size: var(--text-lg, 18px); font-weight: 600; font-variant-numeric: tabular-nums; }
.daily-definitions { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); line-height: 1.75; }
.daily-definitions summary { color: var(--color-text); cursor: pointer; font-weight: 500; }
.daily-definitions p { margin: var(--space-3, 12px) 0 0; }
.daily-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.daily-panel button:focus-visible, .daily-panel input:focus-visible, .daily-panel select:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
@container (min-width: 880px) { .daily-rank-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .daily-active-wrap { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); } }
</style>
