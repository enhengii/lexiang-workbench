<script setup lang="ts">
import { computed, onDeactivated, ref, watch } from 'vue'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import ContentTabs from '@/components/content/ContentTabs.vue'
import MetricGrid from '@/components/content/MetricGrid.vue'
import MetricCard from '@/components/content/MetricCard.vue'
import SectionHeader from '@/components/content/SectionHeader.vue'
import FilterField from '@/components/content/FilterField.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import UsageTrendChart from './usage/UsageTrendChart.vue'
import UsageDimensionPanel from './usage/UsageDimensionPanel.vue'
import UsageAnalysisDetails from './usage/UsageAnalysisDetails.vue'
import UsageDailyReportPanel from './usage/UsageDailyReportPanel.vue'
import { USAGE_ANCHOR_DATE, getUsageReport, getUsageAnalysis, usageRowsToCsv, usageCreatorsToCsv } from '@/domain/usageDashboard.js'
import { USAGE_DAILY_START_DATE, USAGE_DAILY_END_DATE } from '@/domain/usageDailyReport.js'

const SAMPLE_START = '2026-08-07'
type UsageReport = ReturnType<typeof getUsageReport>
type SkillRow = UsageReport['skills'][number]
const tab = ref('overview')
const source = ref<'daily' | 'sample'>('daily')
const rangeStart = computed(() => source.value === 'daily' ? USAGE_DAILY_START_DATE : SAMPLE_START)
const rangeEnd = computed(() => source.value === 'daily' ? USAGE_DAILY_END_DATE : USAGE_ANCHOR_DATE)
const tabs = [{ key: 'overview', label: '使用概览' }, { key: 'skills', label: 'Skill 分析' }, { key: 'creators', label: '创建人分析' }]
const dateBefore = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() - days)
  return value.toISOString().slice(0, 10)
}
const startDate = ref(dateBefore(USAGE_DAILY_END_DATE, 6))
const endDate = ref(USAGE_DAILY_END_DATE)
const module = ref('all')
const search = ref('')
const trendMode = ref<'users' | 'calls'>('users')
const detailTarget = ref<{ dimension: 'skills' | 'creators'; id: string } | null>(null)
const exportNotice = ref('')
const presets = [{ days: 1, label: '最新一天' }, { days: 7, label: '近7天' }, { days: 30, label: '近30天' }]
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
const dateError = computed(() => {
  if (!validDate(startDate.value) || !validDate(endDate.value)) return '请填写完整的起始日期和截止日期。'
  if (startDate.value > endDate.value) return '起始日期不能晚于截止日期，请调整日期区间。'
  if (startDate.value < rangeStart.value || endDate.value > rangeEnd.value) return `${source.value === 'daily' ? '日报' : '样例'}数据范围为 ${rangeStart.value} 至 ${rangeEnd.value}，请在此范围内选择。`
  return ''
})
const result = computed<{ report: UsageReport | null; error: string }>(() => {
  if (dateError.value || source.value === 'daily') return { report: null, error: '' }
  try {
    return { report: getUsageReport({ startDate: startDate.value, endDate: endDate.value, module: module.value, search: search.value }), error: '' }
  } catch {
    return { report: null, error: '聚合数据暂时无法读取，请重新选择统计周期。' }
  }
})
const report = computed(() => result.value.report)
const analysisDimension = computed(() => tab.value === 'creators' ? 'creators' as const : 'skills' as const)
const analysis = computed(() => {
  if (dateError.value || source.value === 'daily') return null
  try {
    return getUsageAnalysis({ startDate: startDate.value, endDate: endDate.value, module: module.value, search: search.value, dimension: analysisDimension.value })
  } catch { return null }
})
const analysisRowsCount = computed(() => tab.value === 'creators' ? analysis.value?.creators.length || 0 : analysis.value?.skills.length || 0)
const ranking = computed(() => [...(report.value?.skills || [])].filter(row => row.calls > 0).sort((a, b) => b.calls - a.calls).slice(0, 5))
const n = (value: number) => value.toLocaleString('zh-CN')
const rate = (value: number | null) => value == null ? '—' : `${(value * 100).toFixed(1)}%`
const penetration = computed(() => report.value?.summary.totalUsers
  ? report.value.summary.aiUsers / report.value.summary.totalUsers : null)
const firstToken = computed(() => report.value?.summary.firstTokenSeconds == null ? '—' : `${report.value.summary.firstTokenSeconds.toFixed(2)} 秒`)

function selectPeriod(days: number) {
  startDate.value = dateBefore(rangeEnd.value, days - 1)
  endDate.value = rangeEnd.value
}
function isPreset(days: number) {
  return endDate.value === rangeEnd.value && startDate.value === dateBefore(rangeEnd.value, days - 1)
}
function showSkill(row: SkillRow) { detailTarget.value = { dimension: 'skills', id: row.id } }
function openDimensionDetail(id: string) { detailTarget.value = { dimension: analysisDimension.value, id } }
function rankWidth(calls: number) {
  const maximum = ranking.value[0]?.calls || 1
  return `${(calls / maximum) * 100}%`
}
function exportSample() {
  if (!analysis.value || dateError.value || tab.value === 'overview' || !analysisRowsCount.value) return
  try {
    const csv = tab.value === 'creators' ? usageCreatorsToCsv(analysis.value.creators) : usageRowsToCsv(analysis.value.skills)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `使用数据样例_${tab.value === 'creators' ? '创建人贡献' : 'Skill聚合'}_${startDate.value}_${endDate.value}.csv`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    exportNotice.value = `已导出当前筛选下的 ${analysisRowsCount.value} ${tab.value === 'creators' ? '位创建人贡献' : '个Skill'}聚合统计，不含原始Query或使用人名单。`
  } catch {
    exportNotice.value = '导出失败，请重试。'
  }
}
watch([startDate, endDate, module, search], () => { detailTarget.value = null; exportNotice.value = '' })
watch(tab, () => { detailTarget.value = null; exportNotice.value = ''; module.value = 'all'; search.value = '' })
watch(source, () => { selectPeriod(7); detailTarget.value = null; exportNotice.value = ''; module.value = 'all'; search.value = '' })
onDeactivated(() => { detailTarget.value = null })
</script>

<template>
  <div class="usage-dashboard" data-page="usage-dashboard">
    <div class="usage-page-flow">
      <ContentPageHeader title="使用数据看板" :description="source === 'daily' ? `全平台范围 · 邮件日报数据 · 截至${rangeEnd}` : '全平台范围 · 示例数据未接入正式统计'">
        <template v-if="source === 'sample' && tab !== 'overview'" #actions>
          <button type="button" class="btn btn-secondary" :disabled="!analysis || !analysisRowsCount" title="导出当前周期及筛选条件下的聚合统计" @click="exportSample">导出样例数据</button>
        </template>
      </ContentPageHeader>

      <section class="usage-period usage-surface" data-flow-role="filters" aria-label="统计周期">
        <div class="usage-quick-period" role="group" aria-label="数据来源"><span class="usage-filter-label">数据来源</span><button type="button" :class="{ selected: source === 'daily' }" :aria-pressed="source === 'daily'" @click="source = 'daily'">日报数据</button><button type="button" :class="{ selected: source === 'sample' }" :aria-pressed="source === 'sample'" @click="source = 'sample'">样例演示</button></div>
        <div class="usage-period-main">
          <div class="usage-quick-period" role="group" aria-label="快捷统计周期">
            <span class="usage-filter-label">统计周期</span>
            <button v-for="preset in presets" :key="preset.days" type="button" :class="{ selected: isPreset(preset.days) }" :aria-pressed="isPreset(preset.days)" @click="selectPeriod(preset.days)">{{ preset.label }}</button>
          </div>
          <div class="usage-date-range">
            <FilterField label="起始日期" layout="inset"><input v-model="startDate" type="date" :min="rangeStart" :max="rangeEnd" aria-label="起始日期" :aria-invalid="!!dateError" :aria-describedby="dateError ? 'usage-date-error' : undefined" /></FilterField>
            <span aria-hidden="true">至</span>
            <FilterField label="截止日期" layout="inset"><input v-model="endDate" type="date" :min="rangeStart" :max="rangeEnd" aria-label="截止日期" :aria-invalid="!!dateError" :aria-describedby="dateError ? 'usage-date-error' : undefined" /></FilterField>
          </div>
        </div>
        <p class="usage-period-hint">{{ source === 'daily' ? '日报快照' : '样例数据' }}截止 {{ rangeEnd }}，支持 {{ rangeStart }} 起的区间；快捷周期以数据截止日为准。</p>
      </section>

      <ContentTabs v-model="tab" :items="tabs" label="使用数据视图" data-flow-role="filters" />
      <p v-if="exportNotice" class="usage-export-notice" role="status" data-flow-role="notice">{{ exportNotice }}</p>
      <FeedbackState v-if="dateError" id="usage-date-error" state="error" title="请检查统计周期" :description="dateError" data-flow-role="notice">
        <template #action><button type="button" class="btn btn-secondary" @click="selectPeriod(7)">恢复近7天</button></template>
      </FeedbackState>
      <UsageDailyReportPanel v-else-if="source === 'daily'" :view="tab" :start-date="startDate" :end-date="endDate" />
      <FeedbackState v-else-if="result.error" state="error" title="读取失败" :description="result.error" data-flow-role="notice" />
      <FeedbackState v-else-if="!report || !report.trend.length" state="empty" title="所选周期暂无数据" description="请选择样例范围内的其他日期。" data-flow-role="notice" />

      <template v-else-if="tab === 'overview'">
        <MetricGrid data-flow-role="summary">
          <MetricCard label="访问用户数" :value="n(report.summary.loginUsers)" unit="人" meta="所选周期去重" />
          <MetricCard label="AI互动用户数" :value="n(report.summary.aiUsers)" unit="人" meta="所选周期去重" />
          <MetricCard label="Query数" :value="n(report.summary.queries)" unit="次" meta="用户向AI发送的请求" />
          <MetricCard label="Skill调用次数" :value="n(report.summary.calls)" unit="次" meta="含成功与失败调用" />
        </MetricGrid>

        <section class="usage-surface usage-section" data-flow-role="summary">
          <SectionHeader title="活跃与覆盖" :description="`截至 ${endDate} · DAU / WAU / MAU 分别按1 / 7 / 30个自然日去重`" />
          <div class="usage-coverage">
            <div class="usage-active-grid" role="table" aria-label="截止日用户活跃统计">
              <div class="usage-active-row usage-active-heading" role="row"><span role="columnheader">活跃类型</span><span role="columnheader">DAU</span><span role="columnheader">WAU</span><span role="columnheader">MAU</span></div>
              <div class="usage-active-row" role="row"><span role="rowheader">登录用户</span><b role="cell">{{ n(report.windows.login.dau) }}</b><b role="cell">{{ n(report.windows.login.wau) }}</b><b role="cell">{{ n(report.windows.login.mau) }}</b></div>
              <div class="usage-active-row" role="row"><span role="rowheader">AI互动用户</span><b role="cell">{{ n(report.windows.ai.dau) }}</b><b role="cell">{{ n(report.windows.ai.wau) }}</b><b role="cell">{{ n(report.windows.ai.mau) }}</b></div>
            </div>
            <dl class="usage-coverage-metrics">
              <div><dt>截止日授权用户总数</dt><dd>{{ n(report.summary.totalUsers) }}<small> 人</small></dd></div>
              <div><dt>AI授权渗透率</dt><dd>{{ rate(penetration) }}</dd><small>周期AI互动人数 / 授权总数</small></div>
            </dl>
          </div>
        </section>

        <section class="usage-surface usage-section" data-flow-role="main">
          <SectionHeader :title="trendMode === 'users' ? '用户活跃趋势' : 'Query与Skill调用趋势'" description="每日统计，不对跨日用户数直接求和。">
            <template #actions>
              <div class="usage-segmented" role="group" aria-label="趋势指标">
                <button type="button" :class="{ selected: trendMode === 'users' }" :aria-pressed="trendMode === 'users'" @click="trendMode = 'users'">用户活跃</button>
                <button type="button" :class="{ selected: trendMode === 'calls' }" :aria-pressed="trendMode === 'calls'" @click="trendMode = 'calls'">Query与调用</button>
              </div>
            </template>
          </SectionHeader>
          <UsageTrendChart :rows="report.trend" :mode="trendMode" />
        </section>

        <div class="usage-bottom-grid" data-flow-role="main">
          <section class="usage-surface usage-section">
            <SectionHeader title="Skill调用排行" description="按所选周期调用次数排序 · Top 5">
              <template #actions><button type="button" class="usage-text-button" @click="tab = 'skills'">查看全部</button></template>
            </SectionHeader>
            <ol v-if="ranking.length" class="usage-ranking">
              <li v-for="(row, index) in ranking" :key="row.id">
                <button type="button" class="usage-ranking-button" :aria-label="`查看${row.name}聚合详情`" @click="showSkill(row)">
                  <span class="usage-rank-index">{{ index + 1 }}</span>
                  <span class="usage-rank-content"><span class="usage-rank-label">{{ row.name }}</span><span class="usage-rank-track" aria-hidden="true"><i :style="{ width: rankWidth(row.calls) }"></i></span></span>
                  <span class="usage-rank-count">{{ n(row.calls) }}<small> 次</small></span>
                </button>
              </li>
            </ol>
            <FeedbackState v-else state="empty" title="暂无Skill调用" description="所选周期未产生调用记录。" />
          </section>
          <section class="usage-surface usage-section">
            <SectionHeader title="运行质量与Skill应用" description="当前统计周期 · 首字响应按Query统计" />
            <dl class="usage-quality-grid">
              <div><dt>调用成功率</dt><dd>{{ rate(report.summary.successRate) }}</dd></div>
              <div><dt>平均首字响应</dt><dd>{{ firstToken }}</dd></div>
              <div><dt>成功 / 失败调用</dt><dd>{{ n(report.summary.success) }} / {{ n(report.summary.failed) }}</dd></div>
              <div><dt>点赞 / 点踩</dt><dd>{{ n(report.summary.likes) }} / {{ n(report.summary.dislikes) }}</dd></div>
            </dl>
            <dl class="usage-supply-grid">
              <div><dt>截止日已上线Skill</dt><dd>{{ n(report.summary.publishedSkills) }}</dd></div>
              <div><dt>周期新增上线</dt><dd>{{ n(report.summary.newSkills) }}</dd></div>
              <div><dt>周期被调用</dt><dd>{{ n(report.summary.calledSkills) }}</dd></div>
            </dl>
          </section>
        </div>
      </template>

      <UsageDimensionPanel v-else-if="analysis" v-model:module="module" v-model:search="search" :key="analysisDimension" :analysis="analysis" :dimension="analysisDimension" data-flow-role="main" @open-detail="openDimensionDetail" />
      <FeedbackState v-else state="error" title="分析数据暂时无法读取" description="请调整筛选条件后重试。" data-flow-role="notice" />

      <details v-if="source === 'sample'" class="usage-definitions usage-surface" data-flow-role="notice">
        <summary>统计口径与样例说明</summary>
        <dl>
          <div><dt>统计范围</dt><dd>全平台示例数据，覆盖 {{ SAMPLE_START }} 至 {{ USAGE_ANCHOR_DATE }}。所有人数按账号去重；周期用户数不能由每日用户数相加得到。</dd></div>
          <div><dt>活跃与渗透</dt><dd>登录DAU为截止日访问人数；AI DAU为截止日主动发送Query的人数。WAU、MAU包含截止日及此前6、29个自然日，独立于所选周期起始日；历史样例不足完整窗口时按已有天数统计。AI授权渗透率为周期AI互动人数 / 截止日授权用户总数，正式授权分母待业务封板。</dd></div>
          <div><dt>Query与调用</dt><dd>AI互动及Query只统计全局助手，排除Skill创建中的需求澄清与AI微调对话。Skill按实际调用次数计数，一条Query可产生多次调用；成功率为成功调用 / 总调用，无调用时不计算。平均首字响应统计Query请求至首个响应的耗时。</dd></div>
          <div><dt>Skill与反馈</dt><dd>已上线为截止日存量，新增为周期内首次上线数量；被调用为周期内有调用的Skill数。好评率为点赞 /（点赞 + 点踩），无反馈时不计算。模块与搜索联动当前维度的看板、排行、表格与详情，不改变使用概览。</dd></div>
          <div><dt>创建人贡献</dt><dd>按创建人旗下Skill的使用贡献聚合，非创建人本人使用。使用人数在所选范围跨Skill去重，不能将分行人数直接相加；成功率、好评率分别用合计调用和合计反馈计算，不平均各Skill比率。</dd></div>
          <div><dt>质量与明细</dt><dd>运行成功≠业务解决，不生成综合质量评分。当前样例只含最终成功/失败记录；生产超时、取消、部分成功及重试口径待确认。明细只含样例调用ID、时间、状态、耗时、赞踩和失败原因，不含用户原始标识或输入输出正文。</dd></div>
        </dl>
      </details>
    </div>
    <UsageAnalysisDetails v-if="detailTarget" :dimension="detailTarget.dimension" :target-id="detailTarget.id" :scope-dimension="analysisDimension" :start-date="startDate" :end-date="endDate" :module="tab === 'overview' ? 'all' : module" :search="tab === 'overview' ? '' : search" @close="detailTarget = null" />
  </div>
</template>

<style scoped>
.usage-dashboard { width: 100%; min-width: 0; padding: 0; container-type: inline-size; color: var(--color-text); font-family: var(--font-body); font-size: var(--text-sm, 13px); line-height: 1.5; }
.usage-page-flow { display: grid; gap: var(--space-4, 16px); min-width: 0; }
.usage-page-flow > * { margin-block: 0; }
.usage-surface { min-width: 0; padding: var(--space-4, 16px); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-surface); }
.usage-section { display: grid; align-content: start; gap: var(--space-4, 16px); }
.usage-period { display: grid; gap: var(--space-2, 8px); }
.usage-period-main, .usage-quick-period { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2, 8px); }
.usage-period-main { justify-content: space-between; gap: var(--space-3, 12px); }
.usage-filter-label { margin-right: var(--space-1, 4px); font-weight: 500; }
.usage-quick-period button, .usage-segmented button { min-height: var(--control-height-sm, 32px); padding: var(--space-1, 4px) var(--space-3, 12px); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text-secondary); font: inherit; cursor: pointer; white-space: nowrap; }
.usage-quick-period button.selected, .usage-segmented button.selected { border-color: var(--color-primary-border); background: var(--color-primary-subtle); color: var(--color-primary); }
.usage-date-range { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: var(--space-2, 8px); min-width: 0; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); }
.usage-date-range:focus-within { border-color: var(--color-primary); box-shadow: var(--focus-ring); }
.usage-date-range > span { color: var(--color-text-tertiary); }
.usage-period-hint { margin: 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-export-notice { color: var(--color-primary); font-size: var(--text-sm, 13px); }
.usage-coverage { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: var(--space-6, 24px); align-items: center; }
.usage-active-grid { display: grid; gap: var(--space-2, 8px); min-width: 0; }
.usage-active-row { display: grid; grid-template-columns: minmax(0, 1.2fr) repeat(3, minmax(0, 1fr)); gap: var(--space-2, 8px); align-items: center; }
.usage-active-row > :not(:first-child) { text-align: right; font-variant-numeric: tabular-nums; }
.usage-active-heading { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-coverage-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4, 16px); margin: 0; padding-left: var(--space-6, 24px); border-left: 1px solid var(--color-border-subtle); }
.usage-coverage-metrics dt, .usage-quality-grid dt, .usage-supply-grid dt { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-coverage-metrics dd, .usage-quality-grid dd { margin: var(--space-1, 4px) 0 0; color: var(--color-text); font-size: var(--text-lg, 18px); font-weight: 600; font-variant-numeric: tabular-nums; }
.usage-coverage-metrics small { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); font-weight: 400; }
.usage-segmented { display: flex; gap: var(--space-1, 4px); }
.usage-bottom-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4, 16px); min-width: 0; }
.usage-ranking { display: grid; gap: var(--space-3, 12px); margin: 0; padding: 0; list-style: none; }
.usage-ranking-button { display: flex; align-items: center; width: 100%; gap: var(--space-3, 12px); padding: var(--space-1, 4px) 0; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-text); font: inherit; text-align: left; cursor: pointer; }
.usage-rank-index { flex: 0 0 var(--space-5, 20px); color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
.usage-rank-content { display: grid; flex: 1; gap: var(--space-2, 8px); min-width: 0; }
.usage-rank-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.usage-rank-track { display: block; height: var(--space-1, 4px); overflow: hidden; border-radius: var(--radius-full); background: var(--color-primary-subtle); }
.usage-rank-track i { display: block; height: 100%; background: var(--chart-1, var(--color-primary)); }
.usage-rank-count { flex: none; font-weight: 600; font-variant-numeric: tabular-nums; }
.usage-rank-count small { font-weight: 400; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-quality-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4, 16px); margin: 0; }
.usage-supply-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-3, 12px); margin: 0; padding-top: var(--space-4, 16px); border-top: 1px solid var(--color-border-subtle); }
.usage-supply-grid dd { margin: var(--space-1, 4px) 0 0; color: var(--color-primary); font-weight: 600; font-variant-numeric: tabular-nums; }
.usage-list-workspace { display: grid; gap: var(--space-3, 12px); min-width: 0; }
.usage-skill-filters { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto; align-items: end; gap: var(--space-3, 12px); }
.usage-reset { min-height: var(--control-height-md, 36px); }
.usage-table-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2, 8px); }
.usage-table-toolbar span { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-skill-name { color: var(--color-text); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.usage-skill-meta { margin-top: var(--space-1, 4px); color: var(--color-text-secondary); font-size: var(--text-xs, 12px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.usage-code { font-family: var(--font-code, ui-monospace, monospace); }
.usage-text-button { padding: var(--space-1, 4px) 0; border: 0; background: transparent; color: var(--color-primary); font: inherit; cursor: pointer; white-space: nowrap; }
.usage-text-button:hover { text-decoration: underline; }
.usage-dashboard button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.usage-definitions { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-definitions summary { color: var(--color-text-secondary); cursor: pointer; font-weight: 500; }
.usage-definitions dl { display: grid; gap: var(--space-3, 12px); margin: var(--space-4, 16px) 0 0; }
.usage-definitions dl > div { display: grid; grid-template-columns: var(--space-definition-label, 80px) minmax(0, 1fr); gap: var(--space-3, 12px); }
.usage-definitions dt { color: var(--color-text); font-weight: 500; }
.usage-definitions dd { margin: 0; line-height: 1.7; }
@container (max-width: 1039px) {
  .usage-coverage { grid-template-columns: 1fr; gap: var(--space-4, 16px); }
  .usage-coverage-metrics { border-left: 0; border-top: 1px solid var(--color-border-subtle); padding-left: 0; padding-top: var(--space-3, 12px); }
  .usage-bottom-grid { grid-template-columns: 1fr; }
}
@container (max-width: 719px) {
  .usage-period-main { align-items: stretch; flex-direction: column; }
  .usage-date-range { width: 100%; }
  .usage-skill-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .usage-skill-filters > :first-child { grid-column: 1 / -1; }
  .usage-segmented { flex-wrap: wrap; }
}
@container (max-width: 479px) {
  .usage-skill-filters { grid-template-columns: 1fr; }
  .usage-skill-filters > :first-child { grid-column: auto; }
  .usage-quick-period { gap: var(--space-1, 4px); }
  .usage-active-row { grid-template-columns: minmax(0, 1.3fr) repeat(3, minmax(0, 1fr)); gap: var(--space-1, 4px); }
  .usage-coverage-metrics, .usage-quality-grid { grid-template-columns: 1fr; }
  .usage-supply-grid { grid-template-columns: 1fr; }
  .usage-definitions dl > div { grid-template-columns: 1fr; gap: var(--space-1, 4px); }
}
</style>
