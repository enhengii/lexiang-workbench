<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import ContentTabs from '@/components/content/ContentTabs.vue'
import DataTable from '@/components/content/DataTable.vue'
import ListSurface from '@/components/content/ListSurface.vue'
import MetricGrid from '@/components/content/MetricGrid.vue'
import MetricCard from '@/components/content/MetricCard.vue'
import Pagination from '@/components/content/Pagination.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import StatusTag from '@/components/content/StatusTag.vue'
import PointsDialog from './PointsDialog.vue'
import PointsSelect from './PointsSelect.vue'
import { useActivityPointsDemo, exportPointsCsv } from './useActivityPointsDemo'
import { canUseActivityPoints } from '@/services/activityPointsAccess'
import { activityStatus, payoutDate, ordersFor, number as n } from '@/services/activityPoints'
import {
  buildActivityStatistics,
  filterStatistics,
  summarizeStatistics,
  groupStatistics,
  statisticsStatuses,
  type StatisticsFilters,
  type StatisticsRow,
  type StatisticsGroup
} from '@/services/activityPointsStatistics'

const app = useAppStore()
const route = useRoute()
const { state, storageNotice } = useActivityPointsDemo()
const canView = computed(() => canUseActivityPoints(app.user, app.role, app.permissions))
const canExport = computed(() =>
  canUseActivityPoints(app.user, app.role, app.permissions, 'export')
)
const initialActivity = () =>
  state.activities.find((a) => !a.draft && a.start <= state.date)?.id ||
  state.activities[0]?.id ||
  ''
const activityId = ref(initialActivity())
const activityOptions = computed(() => state.activities.map((item) => ({
  value: item.id,
  label: `${item.name}（${activityStatus(item, state.date)}）`,
  description: item.id,
  keywords: item.id
})))
const statusOptions = [
  { value: '', label: '全部状态' },
  ...statisticsStatuses.map((status) => ({ value: status, label: status }))
]
const activity = computed(() => state.activities.find((a) => a.id === activityId.value))
const accumulating = computed(() => !!activity.value && state.date <= activity.value.end)
const activityPointsLabel = computed(() => accumulating.value ? '预计活动积分' : '应发活动积分')
const orderPointsLabel = computed(() => accumulating.value ? '预计活动积分' : '应获得活动积分')
const pendingPointsLabel = computed(() => accumulating.value ? '预计待发积分' : '待自动发放积分')
const plannedDate = computed(() => activity.value ? payoutDate(activity.value) : '—')
const emptyFilters = (): StatisticsFilters => ({
  enterprise: '',
  account: '',
  orderId: '',
  sku: '',
  start: '',
  end: '',
  status: ''
})
const filters = reactive<StatisticsFilters>(emptyFilters())
const drillEnterprise = ref('')
const drillAccount = ref('')
const advanced = ref(false)
const tab = ref('订单明细')
const tabs = ['企业统计', '账号明细', '订单明细'].map((key) => ({ key, label: key }))
const page = ref(1)
const detailKey = ref('')
const notice = ref('')
const dateError = computed(() =>
  filters.start && filters.end && filters.start > filters.end ? '付款开始日期不能晚于结束日期' : ''
)
const allRows = computed(() =>
  activity.value && canView.value
    ? buildActivityStatistics(activity.value, ordersFor(activity.value), state.records, state.date)
    : []
)
const rows = computed(() =>
  dateError.value
    ? []
    : filterStatistics(allRows.value, {
        ...filters,
        exactEnterprise: drillEnterprise.value,
        exactAccount: drillAccount.value
      })
)
const summary = computed(() => summarizeStatistics(rows.value))
const groups = computed(() =>
  groupStatistics(rows.value, tab.value === '企业统计' ? 'enterprise' : 'account')
)
const detail = computed(() => allRows.value.find((row) => row.key === detailKey.value))
const p = (value: number | null) => (value == null ? '待核对' : n(value))
const money = (value: number) =>
  `¥ ${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const orderPoints = (row: StatisticsRow) =>
  !row.eligible ? '不适用' : row.issue ? '待核对' : p(row.requiredPoints)
const tierLabel = (group: StatisticsGroup) =>
  group.multiplier ? `${group.multiplier} 倍` : '未达档'
const tableRows = computed<Array<Record<string, unknown>>>(() =>
  tab.value === '订单明细'
    ? rows.value.map((row) => ({
        key: row.key,
        name: row.id,
        secondary: row.account,
        enterprise: row.enterprise,
        product: row.sku,
        date: row.date,
        quantity: n(row.netQuantity),
        amount: money(row.netReceipt),
        required: orderPoints(row),
        status: row.status,
        reason: row.reason
      }))
    : groups.value.map((group) => ({
        key: group.id,
        name: tab.value === '企业统计' ? group.enterprise : group.account,
        secondary: tab.value === '企业统计' ? group.enterpriseId : group.enterprise,
        count: `${group.summary.orderCount} 单 / ${group.summary.accountCount} 个账号`,
        quantity: n(group.summary.quantity),
        amount: money(group.summary.amount),
        multiplier: tierLabel(group),
        tierContext: `${n(group.enterpriseQuantity)} 台 / ${money(group.enterpriseAmount)}`,
        target: n(group.summary.target),
        paid: `${n(group.summary.actualPaid)}${group.summary.missingPaidCount ? '（部分）' : ''}`,
        required: n(group.summary.required),
        posted: n(group.summary.posted),
        pending: n(group.summary.pending),
        failed: n(group.summary.failed),
        exceptions: group.summary.exceptionCount
      }))
)
const paged = computed(() => tableRows.value.slice((page.value - 1) * 10, page.value * 10))
type Column = { key: string; label: string; align?: 'left' | 'right' }
const numeric = (key: string, label: string): Column => ({ key, label, align: 'right' })
const columns = computed<Column[]>(() =>
  tab.value === '订单明细'
    ? [
        { key: 'name', label: '订单号 / Lenovo ID' },
        { key: 'enterprise', label: '企业' },
        { key: 'product', label: '商品编码' },
        { key: 'date', label: '付款日期' },
        numeric('amount', '有效金额'),
        numeric('quantity', '有效台数'),
        numeric('required', orderPointsLabel.value),
        { key: 'status', label: '发放状态' },
        { key: 'actions', label: '操作' }
      ]
    : [
        { key: 'name', label: tab.value === '企业统计' ? '企业名称 / 标识' : 'Lenovo ID / 企业' },
        { key: 'count', label: '订单 / 账号' },
        numeric('quantity', '有效台数'),
        numeric('amount', '实际收款金额'),
        numeric('multiplier', '企业活动档位'),
        numeric('target', '可计算应发'),
        numeric('paid', '实际已发（其他）'),
        numeric('required', activityPointsLabel.value),
        numeric('posted', '已发活动积分'),
        numeric('pending', pendingPointsLabel.value),
        numeric('failed', '失败积分'),
        numeric('exceptions', '计算异常'),
        { key: 'actions', label: '操作' }
      ]
)
function resetFilters() {
  Object.assign(filters, emptyFilters())
  drillEnterprise.value = ''
  drillAccount.value = ''
  page.value = 1
  notice.value = ''
}
function openRow(key: unknown) {
  if (tab.value === '订单明细') {
    detailKey.value = String(key)
    return
  }
  const group = groups.value.find((item) => item.id === key)
  if (!group) return
  drillEnterprise.value = group.enterpriseId
  drillAccount.value = tab.value === '账号明细' ? group.account : ''
  tab.value = tab.value === '企业统计' ? '账号明细' : '订单明细'
}
function clearDrill() {
  if (drillAccount.value) {
    drillAccount.value = ''
    tab.value = '账号明细'
  } else {
    drillEnterprise.value = ''
    tab.value = '企业统计'
  }
}
function exportDetails() {
  if (!canExport.value) {
    notice.value = '当前账号没有明细导出权限。'
    return
  }
  if (!activity.value || dateError.value || !rows.value.length) return
  exportPointsCsv(
    `${activity.value.name}-活动积分明细`,
    [
      '活动编号',
      '活动名称',
      '企业标识',
      '企业名称',
      '订单号',
      '商品编码',
      'Lenovo ID',
      '有效金额',
      '有效台数',
      orderPointsLabel.value,
      '发放状态',
      '异常或排除原因',
      '付款日期',
      '备注',
      '邮件审批时间',
      '发票类型',
      '处理时间',
      '发放批次',
      '积分流水号',
      '计划自动发放日期',
      '统计截止日期'
    ],
    rows.value.map((row) => [
      row.activityId,
      row.activityName,
      row.enterpriseId,
      row.enterprise,
      row.id,
      row.sku,
      row.account,
      row.netReceipt,
      row.netQuantity,
      !row.eligible ? '不适用' : row.issue ? '待核对' : (row.requiredPoints ?? '待核对'),
      row.status,
      row.reason,
      row.date,
      activity.value?.description || '',
      '未记录',
      '未记录',
      row.record?.time || '',
      row.record?.batch || '',
      row.record?.transaction || '',
      plannedDate.value,
      state.date
    ])
  )
  notice.value = `已导出当前筛选的全部 ${rows.value.length} 条订单明细，可用 Excel 打开。`
}
watch(
  () => route.query.activity,
  (value) => {
    if (typeof value === 'string' && state.activities.some((a) => a.id === value))
      activityId.value = value
  },
  { immediate: true }
)
watch(activityId, () => {
  resetFilters()
  detailKey.value = ''
})
watch(tab, (value) => {
  if (value === '企业统计') {
    drillEnterprise.value = ''
    drillAccount.value = ''
  } else if (value === '账号明细') drillAccount.value = ''
})
watch(
  [filters, drillEnterprise, drillAccount, tab],
  () => {
    page.value = 1
    notice.value = ''
  },
  { deep: true }
)
watch(
  () => tableRows.value.length,
  () => {
    page.value = Math.min(page.value, Math.max(1, Math.ceil(tableRows.value.length / 10)))
  }
)
</script>

<template>
  <section class="points-page" data-page="points.activityDetails">
    <div class="points-flow" data-composition="summary-list">
      <ContentPageHeader
        title="活动积分明细"
        description="活动期间累计积分，结束后由系统按计划自动发放。"
      >
        <template #actions>
          <button
            v-if="canExport"
            class="btn btn-primary"
            :disabled="!rows.length || !!dateError"
            @click="exportDetails"
          >
            导出明细
          </button>
        </template>
      </ContentPageHeader>
      <FeedbackState
        v-if="!canView"
        state="no-permission"
        title="暂无活动积分查看权限"
        description="请联系管理员开通积分查看权限。"
      />
      <template v-else>
        <div class="points-demo-strip">
          <div>
            <strong>演示数据 · 不产生真实积分</strong><span class="points-secondary">统计截至 {{ state.date }}，与活动配置共享本浏览器内的演示记录。</span>
            <span v-if="activity" class="points-secondary">计划自动发放：{{ plannedDate }}。{{ accumulating ? '当前为预计积分，最终以活动结束后的结算结果为准。' : '系统按计划统一发放至原下单账号。' }}</span>
          </div>
          <span class="points-muted">单活动统计 · 筛选不改变企业档位</span>
        </div>
        <p v-if="storageNotice.message" class="points-notice points-warning" role="status">
          {{ storageNotice.message }}
        </p>
        <div class="points-list-workspace" data-flow-role="list-workspace">
          <div class="points-filter">
            <div class="points-filter-grid">
              <PointsSelect
                v-model="activityId"
                label="活动"
                :options="activityOptions"
                searchable
                placeholder="输入活动名称或编号检索"
              />
              <label class="points-field">企业名称 / 标识<input
                v-model="filters.enterprise"
                class="form-input"
                type="search"
                placeholder="输入企业名称或标识"
              /></label>
              <label class="points-field">Lenovo ID<input
                v-model="filters.account"
                class="form-input"
                type="search"
                placeholder="输入下单账号"
              /></label>
              <label class="points-field">订单号<input
                v-model="filters.orderId"
                class="form-input"
                type="search"
                placeholder="输入订单号"
              /></label>
              <template v-if="advanced">
                <label class="points-field">商品编码<input
                  v-model="filters.sku"
                  class="form-input"
                  type="search"
                  placeholder="输入商品编码"
                /></label>
                <label class="points-field">付款开始日期<input v-model="filters.start" class="form-input" type="date"/></label>
                <label class="points-field">付款结束日期<input v-model="filters.end" class="form-input" type="date"/></label>
                <PointsSelect
                  :model-value="filters.status || ''"
                  label="发放状态"
                  :options="statusOptions"
                  @update:model-value="filters.status = $event"
                />
              </template>
              <div class="points-actions points-filter-actions">
                <span class="points-muted">条件变更后实时筛选</span>
                <button class="points-link" :aria-expanded="advanced" @click="advanced = !advanced">
                  {{ advanced ? '收起筛选' : '更多筛选' }}
                </button>
                <button class="btn btn-secondary" @click="resetFilters">重置筛选</button>
              </div>
            </div>
            <p v-if="dateError" class="points-code-error" role="alert">{{ dateError }}</p>
          </div>
          <MetricGrid data-flow-role="summary">
            <MetricCard
              :label="activityPointsLabel"
              :value="n(summary.required)"
              unit="分"
              primary
              :meta="accumulating ? '按当前累计档位预估' : '按结算结果自动发放'"
            />
            <MetricCard
              label="已发活动积分"
              :value="n(summary.posted)"
              unit="分"
              meta="按成功积分流水统计"
            />
            <MetricCard
              :label="pendingPointsLabel"
              :value="n(summary.pending)"
              unit="分"
              :meta="accumulating ? '活动结束后统一核算' : '系统按计划发放，失败与异常单列'"
            />
            <MetricCard
              label="发放失败"
              :value="n(summary.failed)"
              unit="分"
              :meta="`${summary.exceptionCount} 条计算异常 · ${summary.excludedCount} 条不参与`"
            />
          </MetricGrid>
          <p v-if="notice" class="points-notice" role="status">{{ notice }}</p>
          <ListSurface>
            <template #tabs><ContentTabs v-model="tab" :items="tabs" label="积分统计层级"/></template>
            <template #toolbar>
              <div class="points-summary">
                <div class="points-toolbar">
                  <div class="points-summary-metrics" aria-label="当前筛选统计">
                    <span class="points-summary-title">当前统计</span>
                    <span><strong>{{ summary.enterpriseCount }}</strong> 家企业</span>
                    <span><strong>{{ summary.accountCount }}</strong> 个账号</span>
                    <span><strong>{{ summary.orderCount }}</strong> 个订单</span>
                    <span>有效台数 <strong>{{ n(summary.quantity) }}</strong> 台</span>
                    <span>有效实收 <strong>{{ money(summary.amount) }}</strong></span>
                  </div>
                  <button
                    v-if="drillEnterprise || drillAccount"
                    class="points-link"
                    @click="clearDrill"
                  >{{ drillAccount ? '返回账号列表' : '返回企业列表' }}</button>
                </div>
                <p v-if="drillEnterprise" class="points-summary-note">
                  下钻范围：{{ allRows.find((row) => row.enterpriseId === drillEnterprise)?.enterprise }}{{ drillAccount ? ` / ${drillAccount}` : '' }}
                </p>
                <div>
                  <p class="points-summary-metrics">
                    <span>可计算应发 <strong>{{ n(summary.target) }}</strong> 分</span>
                    <span>实际已发（其他已知）<strong>{{ n(summary.actualPaid) }}</strong> 分</span>
                  </p>
                  <p class="points-summary-note">汇总包含筛选后的全部记录；企业档位按活动完整范围计算。</p>
                </div>
                <div v-if="summary.missingPaidCount" class="points-summary-alert" role="status">
                  <strong>{{ summary.missingPaidCount }} 条订单积分记录待核对</strong>
                  <span>实际已发记录缺失，已发合计仅含已知部分；异常订单暂停自动发放。</span>
                </div>
              </div>
            </template>
            <div role="tabpanel" :aria-label="tab">
              <DataTable
                v-if="paged.length"
                :columns="columns"
                :rows="paged"
                row-key="key"
                :caption="`活动积分明细 — ${tab}`"
                density="two-line"
              >
                <template #cell-name="{ row }"><button class="points-link points-name" @click="openRow(row.key)">
                  {{ row.name }}</button><small class="points-secondary">{{ row.secondary }}</small></template>
                <template #cell-multiplier="{ row }"><span class="points-numeric">{{ row.multiplier }}</span><small v-if="row.tierContext" class="points-secondary">活动累计 {{ row.tierContext }}</small></template>
                <template #cell-status="{ row }"><StatusTag
                  :tone="
                    row.status === '已发放'
                      ? 'success'
                      : row.status === '发放失败'
                        ? 'danger'
                        : row.status === '计算异常'
                          ? 'warning'
                          : 'neutral'
                  "
                >{{ row.status }}</StatusTag><small v-if="row.reason" class="points-secondary">{{
                  row.reason
                }}</small></template>
                <template #cell-actions="{ row }"><button class="points-link" @click="openRow(row.key)">
                  {{
                    tab === '企业统计' ? '查看账号' : tab === '账号明细' ? '查看订单' : '查看详情'
                  }}
                </button></template>
              </DataTable>
              <FeedbackState
                v-else
                :state="dateError ? 'error' : 'filtered-empty'"
                :title="dateError || '暂无符合条件的积分明细'"
                description="请调整活动或筛选条件。待开始活动尚无统计期内订单。"
              ><template #action><button class="btn btn-secondary" @click="resetFilters">
                重置筛选
              </button></template></FeedbackState>
            </div>
            <template #pagination><Pagination v-model:page="page" :page-size="10" :total="tableRows.length"/></template>
          </ListSurface>
        </div>
      </template>
    </div>
    <PointsDialog
      v-if="detail && canView"
      title="订单积分详情"
      :description="`${detail.activityName} · ${detail.id}`"
      wide
      @close="detailKey = ''"
    >
      <div class="points-form-flow">
        <StatusTag
          :tone="
            detail.status === '计算异常' || detail.status === '发放失败' ? 'warning' : 'primary'
          "
        >{{ detail.status }}</StatusTag>
        <p v-if="detail.reason" class="points-notice points-warning">{{ detail.reason }}</p>
        <dl class="points-definition">
          <dt>企业 / 标识</dt>
          <dd>{{ detail.enterprise }} / {{ detail.enterpriseId }}</dd>
          <dt>Lenovo ID</dt>
          <dd>{{ detail.account }}</dd>
          <dt>订单号 / 商品编码</dt>
          <dd>{{ detail.id }} / {{ detail.sku }}</dd>
          <dt>有效金额</dt>
          <dd>{{ money(detail.netReceipt) }}</dd>
          <dt>有效台数</dt>
          <dd>{{ n(detail.netQuantity) }} 台</dd>
          <dt>{{ orderPointsLabel }}</dt>
          <dd>{{ orderPoints(detail) }}<template v-if="detail.eligible && !detail.issue && detail.requiredPoints != null"> 分</template></dd>
        </dl>
      </div>
      <template #actions><button class="btn btn-secondary" @click="detailKey = ''">关闭</button></template>
    </PointsDialog>
  </section>
</template>
<style scoped src="./points.css"></style>
