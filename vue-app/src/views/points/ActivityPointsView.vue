<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import ContentTabs from '@/components/content/ContentTabs.vue'
import DataTable from '@/components/content/DataTable.vue'
import ListSurface from '@/components/content/ListSurface.vue'
import StatusTag from '@/components/content/StatusTag.vue'
import MetricGrid from '@/components/content/MetricGrid.vue'
import MetricCard from '@/components/content/MetricCard.vue'
import Pagination from '@/components/content/Pagination.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import ActivityPointsEditor from './ActivityPointsEditor.vue'
import ActivityPointsDetail from './ActivityPointsDetail.vue'
import PointsDialog from './PointsDialog.vue'
import PointsSelect from './PointsSelect.vue'
import { useActivityPointsDemo } from './useActivityPointsDemo'
import { canUseActivityPoints, type ActivityPointsAction } from '@/services/activityPointsAccess'
import {
  activityStatus,
  payoutDate,
  activeProducts,
  seedActivities,
  extendActivity,
  settle,
  calculate,
  ordersFor,
  number as n,
  validateActivity,
  type Activity
} from '@/services/activityPoints'

const app = useAppStore()
const { state, storageNotice, reset } = useActivityPointsDemo()
const can = (action: ActivityPointsAction) =>
  canUseActivityPoints(app.user, app.role, app.permissions, action)
const notice = ref('')
const selectedId = ref('')
const selected = computed(() =>
  state.activities.find((activity) => activity.id === selectedId.value)
)
const statusFilter = ref('全部活动')
const query = ref('')
const mode = ref('all')
const start = ref('')
const end = ref('')
const page = ref(1)
const editor = ref<Activity | null>(null)
const extensionId = ref('')
const extension = computed(() =>
  state.activities.find((activity) => activity.id === extensionId.value)
)
const newEnd = ref('')
const reason = ref('')
const error = ref('')
const simulation = ref(false)
const simulateFailure = ref(true)
const retryConfirm = ref(false)
const settings = ref(false)
const resetConfirm = ref(false)
const resultVersion = ref(0)
const statusItems = computed(() =>
  ['全部活动', '进行中', '待开始', '已结束', '草稿'].map((key) => ({
    key,
    label: key,
    count:
      key === '全部活动'
        ? state.activities.length
        : state.activities.filter((activity) => activityStatus(activity, state.date) === key).length
  }))
)
const dateError = computed(() =>
  start.value && end.value && start.value > end.value ? '筛选开始日期不能晚于结束日期' : ''
)
const filtered = computed(() =>
  dateError.value
    ? []
    : state.activities.filter(
        (activity) =>
          (statusFilter.value === '全部活动' ||
            activityStatus(activity, state.date) === statusFilter.value) &&
          `${activity.id} ${activity.name}`.toLowerCase().includes(query.value.toLowerCase()) &&
          (mode.value === 'all' || mode.value === activity.mode) &&
          (!start.value || activity.end >= start.value) &&
          (!end.value || activity.start <= end.value)
      )
)
const paged = computed(() => filtered.value.slice((page.value - 1) * 10, page.value * 10))
const extensionPayout = computed(() => {
  try {
    return extension.value && newEnd.value
      ? payoutDate({ ...extension.value, end: newEnd.value })
      : '待填写'
  } catch {
    return '待填写有效日期'
  }
})
const settlementDate = computed(() =>
  selected.value
    ? state.date > payoutDate(selected.value)
      ? state.date
      : payoutDate(selected.value)
    : state.date
)
const settlementRows = computed(() =>
  selected.value
    ? calculate(selected.value, ordersFor(selected.value), settlementDate.value).filter(
        (row) =>
          row.eligible &&
          !row.issue &&
          row.delta > 0 &&
          !state.records.some(
            (record) => record.key === `${selected.value?.id}:${row.id}` && record.status === '成功'
          )
      )
    : []
)
const failureCount = computed(() =>
  selected.value
    ? state.records.filter(
        (record) => record.key.startsWith(`${selected.value?.id}:`) && record.status === '失败'
      ).length
    : 0
)
const columns = [
  { key: 'name', label: '活动名称 / 编号' },
  { key: 'period', label: '活动周期' },
  { key: 'mode', label: '累计方式 / 商品' },
  { key: 'tiers', label: '档位 / 最终倍数' },
  { key: 'payout', label: '计划发放日期' },
  { key: 'status', label: '活动 / 发放状态' },
  { key: 'actions', label: '操作' }
]
function requirePermission(action: ActivityPointsAction) {
  if (can(action)) return true
  notice.value = '当前账号没有此操作权限，请联系管理员授权。'
  return false
}
function issuance(activity: Activity) {
  if (activity.draft) return '尚未启用'
  const items = state.records.filter((record) => record.key.startsWith(`${activity.id}:`))
  if (items.some((record) => record.status === '失败'))
    return items.some((record) => record.status === '成功') ? '部分失败' : '发放失败'
  if (items.length) return '已有发放记录'
  if (state.date < activity.start) return '待开始累计'
  return state.date <= activity.end ? '累计中' : '待自动发放'
}
function openActivity(id: string) {
  selectedId.value = id
  notice.value = ''
}
function resetFilters() {
  statusFilter.value = '全部活动'
  query.value = ''
  mode.value = 'all'
  start.value = ''
  end.value = ''
  page.value = 1
}
function edit(activity?: Activity) {
  if (!requirePermission('configure')) return
  if (activity && !['草稿', '待开始'].includes(activityStatus(activity, state.date))) {
    notice.value = '活动已开始，仅允许通过延期调整结束日期。'
    return
  }
  const future = new Date(`${state.date}T00:00:00Z`)
  future.setUTCDate(future.getUTCDate() + 30)
  editor.value = activity
    ? (JSON.parse(JSON.stringify(activity)) as Activity)
    : {
        ...structuredClone(seedActivities[3]),
        id: `ACT${Date.now()}`,
        name: '',
        invoiceTypes: [],
        enterpriseGroupIds: [],
        start: state.date,
        end: future.toISOString().slice(0, 10),
        draft: true,
        logs: [],
        updated: state.date
      }
}
function save(activity: Activity) {
  if (!requirePermission('configure')) return
  const current = state.activities.find((item) => item.id === activity.id)
  if (current && !['草稿', '待开始'].includes(activityStatus(current, state.date))) {
    notice.value = '活动状态已变化，请关闭编辑后刷新当前视图。'
    return
  }
  const invalid = validateActivity(activity)
  if (invalid) {
    notice.value = invalid
    return
  }
  if (current && !current.draft && activity.draft) {
    notice.value = '已启用活动不能撤回草稿。'
    return
  }
  const index = state.activities.findIndex((item) => item.id === activity.id)
  const value = JSON.parse(JSON.stringify(activity)) as Activity
  if (index >= 0) state.activities.splice(index, 1, value)
  else state.activities.unshift(value)
  editor.value = null
  notice.value = activity.draft
    ? '演示活动已保存为草稿。'
    : '演示活动已启用，可继续查看企业统计和发放流程。'
}
function startExtension(activity: Activity) {
  if (!requirePermission('extend')) return
  extensionId.value = activity.id
  newEnd.value = activity.end
  reason.value = ''
  error.value = ''
}
function confirmExtension() {
  if (!requirePermission('extend') || !extension.value) return
  try {
    const value = extendActivity(extension.value, newEnd.value, reason.value, state.date)
    state.activities.splice(
      state.activities.findIndex((item) => item.id === value.id),
      1,
      value
    )
    extensionId.value = ''
    notice.value = `延期已生效：结束日期 ${value.end}，原发放计划失效，新计划为 ${payoutDate(value)}。`
  } catch (e) {
    error.value = e instanceof Error ? e.message : '延期未完成，请检查日期与原因。'
  }
}
function simulate() {
  if (!requirePermission('settle') || !selected.value || selected.value.draft) return
  try {
    const date = settlementDate.value
    const rows = calculate(selected.value, ordersFor(selected.value), date)
    const failId = simulateFailure.value ? settlementRows.value[0]?.id : undefined
    state.records = settle(selected.value, rows, state.records, date, failId)
    selected.value.logs.unshift(`${date} · 演示定时任务 · 按计划生成结算记录（不产生真实积分）`)
    state.date = date
    simulation.value = false
    resultVersion.value++
    notice.value = '已完成模拟结算；可核对成功、失败及异常，成功订单不会重复发放。'
  } catch (e) {
    error.value = e instanceof Error ? e.message : '模拟结算未完成'
  }
}
function retry() {
  if (!requirePermission('settle') || !selected.value) return
  try {
    const failedIds = new Set(
      state.records
        .filter(
          (record) => record.key.startsWith(`${selected.value?.id}:`) && record.status === '失败'
        )
        .map((record) => record.orderId)
    )
    const rows = calculate(selected.value, ordersFor(selected.value), state.date).filter((row) =>
      failedIds.has(row.id)
    )
    state.records = settle(selected.value, rows, state.records, state.date)
    selected.value.logs.unshift(
      `${state.date} · 演示运营员 · 仅重试 ${failedIds.size} 笔失败记录，成功流水保持不变`
    )
    retryConfirm.value = false
    resultVersion.value++
    notice.value = '失败记录已重新处理；已成功的积分未重复发放。'
  } catch (e) {
    error.value = e instanceof Error ? e.message : '重试未完成'
  }
}
function restore() {
  if (!requirePermission('configure')) return
  reset()
  selectedId.value = ''
  resetFilters()
  settings.value = false
  resetConfirm.value = false
  notice.value = '已恢复初始演示活动、日期与发放记录。'
}
function clearNotice() {
  notice.value = ''
  storageNotice.message = ''
}
function openSimulation() {
  if (!requirePermission('settle')) return
  error.value = ''
  simulateFailure.value = true
  simulation.value = true
}
function openRetry() {
  if (!requirePermission('settle')) return
  error.value = ''
  retryConfirm.value = true
}
function closeSettings() {
  settings.value = false
  resetConfirm.value = false
}
watch([statusFilter, query, mode, start, end], () => {
  page.value = 1
})
watch(
  () => filtered.value.length,
  () => {
    page.value = Math.min(page.value, Math.max(1, Math.ceil(filtered.value.length / 10)))
  }
)
</script>
<template>
  <section class="points-page" data-page-id="points.activity">
    <FeedbackState
      v-if="!can('view')"
      state="no-permission"
      title="暂无活动积分查看权限"
      description="请联系管理员开通活动积分权限后使用。"
    />
    <template v-else>
      <div v-if="notice || storageNotice.message" class="points-notice points-toast" role="status">
        <div class="points-toolbar">
          <span>{{ notice || storageNotice.message }}</span><button
            class="points-link"
            aria-label="关闭操作提示"
            @click="clearNotice"
          >
            关闭
          </button>
        </div>
      </div>
      <ActivityPointsDetail
        v-if="selected"
        :key="selected.id"
        :activity="selected"
        :records="state.records"
        :date="state.date"
        :can-configure="can('configure')"
        :can-extend="can('extend')"
        :can-export="can('export')"
        :can-settle="can('settle')"
        :result-version="resultVersion"
        @back="selectedId = ''"
        @edit="edit(selected)"
        @extend="startExtension(selected)"
        @simulate="openSimulation"
        @retry="openRetry"
        @settings="settings = true"
        @notice="notice = $event"
      />
      <div v-else class="points-flow">
        <ContentPageHeader
          title="活动积分配置"
          description="配置企业采购活动，按企业累计，活动结束后自动发放积分。"
        ><template #actions><button class="btn btn-secondary" @click="settings = true">配置说明</button><button v-if="can('configure')" class="btn btn-primary" @click="edit()">
          新增活动
        </button></template></ContentPageHeader>
        <div class="points-demo-strip" data-flow-role="notice">
          <div>
            <strong>演示数据 · 不产生真实积分</strong><span class="points-secondary">当前演示日期 {{ state.date }}；配置与发放记录仅保存在本浏览器。</span>
          </div>
          <button class="points-link" @click="settings = true">查看演示口径</button>
        </div>
        <MetricGrid data-flow-role="summary"><MetricCard label="全部活动" :value="state.activities.length" /><MetricCard
          label="进行中"
          :value="
            state.activities.filter(
              (activity) => activityStatus(activity, state.date) === '进行中'
            ).length
          "
          primary
        /><MetricCard
          label="待开始"
          :value="
            state.activities.filter(
              (activity) => activityStatus(activity, state.date) === '待开始'
            ).length
          "
        /><MetricCard
          label="待自动发放活动"
          :value="
            state.activities.filter((activity) =>
              issuance(activity) === '待自动发放'
            ).length
          "
        /></MetricGrid>
        <div class="points-list-workspace" data-flow-role="list-workspace">
          <div class="points-filter">
            <div class="points-filter-grid">
              <label class="points-field">活动名称 / 编号<input
                v-model="query"
                class="form-input"
                type="search"
                placeholder="输入名称或编号"
              /></label>
              <PointsSelect
                v-model="mode"
                label="累计方式"
                :options="[{ value: 'all', label: '全部累计方式' }, { value: 'quantity', label: '满台数' }, { value: 'amount', label: '满金额' }]"
              />
              <label class="points-field">活动查询开始日期<input v-model="start" class="form-input" type="date" /></label><label class="points-field">活动查询结束日期<input v-model="end" class="form-input" type="date"/></label>
              <div class="points-actions points-filter-actions">
                <span class="points-muted">条件变更后实时筛选</span><button class="btn btn-secondary" @click="resetFilters">重置筛选</button>
              </div>
            </div>
            <p v-if="dateError" class="points-notice points-danger" role="alert">{{ dateError }}</p>
          </div>
          <ListSurface><template #tabs><ContentTabs v-model="statusFilter" :items="statusItems" label="活动状态"/></template>
            <div role="tabpanel" :aria-label="statusFilter">
              <DataTable
                v-if="paged.length"
                :columns="columns"
                :rows="paged"
                row-key="id"
                caption="活动积分配置列表"
                density="two-line"
              >
                <template #cell-name="{ row }"><button class="points-link points-name" @click="openActivity(row.id)">
                  {{ row.name }}</button><small class="points-secondary">{{ row.id }}</small><small class="points-secondary">更新于 {{ row.updated }}</small></template>
                <template #cell-period="{ row }"><span class="points-numeric">{{ row.start }}</span><small class="points-secondary">至 {{ row.end }}</small></template>
                <template #cell-mode="{ row }">{{ row.mode === 'quantity' ? '满台数' : '满金额'
                }}<small class="points-secondary">{{ activeProducts(row).length }} 个参与商品</small></template>
                <template #cell-tiers="{ row }"><span v-for="tier in row.tiers" :key="tier.threshold" class="points-secondary">满 {{ n(tier.threshold) }} {{ row.mode === 'quantity' ? '台' : '元' }} /
                  {{ tier.multiplier }} 倍</span></template>
                <template #cell-payout="{ row }"><span class="points-numeric">{{ payoutDate(row) }}</span><small class="points-secondary">结束后 {{ row.delay }}
                  {{ row.calendar === 'natural' ? '自然日' : '周一至周五日' }}</small></template>
                <template #cell-status="{ row }"><StatusTag
                  :tone="
                    activityStatus(row, state.date) === '进行中'
                      ? 'success'
                      : activityStatus(row, state.date) === '待开始'
                        ? 'primary'
                        : 'neutral'
                  "
                >{{ activityStatus(row, state.date) }}</StatusTag><small class="points-secondary">{{ issuance(row) }}</small></template>
                <template #cell-actions="{ row }"><div class="points-actions">
                  <button class="points-link" @click="openActivity(row.id)">查看</button><button
                    v-if="can('extend') && activityStatus(row, state.date) === '进行中'"
                    class="points-link"
                    @click="startExtension(row)"
                  >
                    延期</button><button
                    v-if="
                      can('configure') &&
                        ['草稿', '待开始'].includes(activityStatus(row, state.date))
                    "
                    class="points-link"
                    @click="edit(row)"
                  >
                    编辑
                  </button>
                </div></template> </DataTable><FeedbackState
                v-else
                state="filtered-empty"
                title="没有匹配的活动"
                description="请调整名称、日期或状态条件，或重置筛选。"
              />
            </div>
            <template #pagination><Pagination v-model:page="page" :total="filtered.length" :page-size="10" /><span
              v-if="!filtered.length"
              class="points-muted"
            >共 0 条活动</span></template></ListSurface>
        </div>
      </div>
      <ActivityPointsEditor
        v-if="editor"
        :key="editor.id"
        :initial="editor"
        :date="state.date"
        @close="editor = null"
        @save="save"
      />
      <PointsDialog
        v-if="extension"
        title="活动延期"
        description="延长完整活动周期，计划发放时间同步顺延。"
        @close="extensionId = ''"
      ><div class="points-section">
         <dl class="points-definition">
           <dt>活动</dt>
           <dd>{{ extension.name }}</dd>
           <dt>原结束日期</dt>
           <dd>{{ extension.end }}</dd>
           <dt>原计划发放</dt>
           <dd>{{ payoutDate(extension) }}</dd>
         </dl>
         <label class="points-field">新结束日期（必填）<input
           v-model="newEnd"
           class="form-input"
           type="date"
           :min="extension.end"
           required
         /></label>
         <div class="points-notice">
           新计划发放：<strong>{{ extensionPayout }}</strong>
         </div>
         <label class="points-field">延期原因（必填）<input
           v-model="reason"
           class="form-input"
           maxlength="200"
           placeholder="说明延期原因"
           required
         /></label>
         <p class="points-muted">
           确认后旧发放计划失效，商品与档位保持不变，延期期间符合条件订单继续累计。
         </p>
         <p v-if="error" class="points-notice points-danger" role="alert">{{ error }}</p>
       </div>
        <template #actions><button class="btn btn-secondary" @click="extensionId = ''">取消</button><button class="btn btn-primary" @click="confirmExtension">确认延期</button></template></PointsDialog>
      <PointsDialog
        v-if="simulation && selected"
        title="演示自动发放"
        description="模拟时间推进至计划发放日，所有处理仅作用于演示数据。"
        @close="simulation = false"
      ><div class="points-section">
         <div class="points-notice">
           <strong>{{ settlementDate }} 10:00</strong>
           <p>
             预计处理 {{ settlementRows.length }} 笔未成功订单，应补
             {{
               n(settlementRows.reduce((total, row) => total + row.delta, 0))
             }}
             分；异常和排除记录不入账。
           </p>
         </div>
         <label class="points-check"><input
           v-model="simulateFailure"
           type="checkbox"
         />模拟一笔发放失败，用于体验重试</label>
         <p class="points-muted">
           正式系统到期统一处理，不新增逐批人工审批前置。成功记录重复运行不会再次发放。
         </p>
         <p v-if="error" class="points-notice points-danger" role="alert">{{ error }}</p>
       </div>
        <template #actions><button class="btn btn-secondary" @click="simulation = false">取消</button><button class="btn btn-primary" @click="simulate">开始演示</button></template></PointsDialog>
      <PointsDialog
        v-if="retryConfirm"
        title="演示重试失败记录"
        :description="`仅重新处理 ${failureCount} 笔失败记录，已成功积分流水保持不变。`"
        @close="retryConfirm = false"
      ><p class="points-muted">
         演示重试将模拟账户服务恢复；缺失数据、负差额等计算异常仍暂停补发。
       </p>
        <p v-if="error" class="points-notice points-danger" role="alert">{{ error }}</p>
        <template #actions><button class="btn btn-secondary" @click="retryConfirm = false">取消</button><button class="btn btn-primary" @click="retry">
          演示重试 {{ failureCount }} 笔记录
        </button></template></PointsDialog>
      <PointsDialog
        v-if="settings"
        title="演示说明与待确认口径"
        description="企业、账号与订单均为演示数据；不连接真实积分账户。"
        wide
        @close="closeSettings"
      ><div class="points-form-flow">
         <div class="points-notice">
           <strong>建议体验顺序</strong>
           <p>
             秋季活动 → 远帆智能 → 两个下单账号 → 订单计算；再体验延期、结算与失败重试。澄星实业含
             6,806 分和 3,575 分核算样例。
           </p>
         </div>
         <dl class="points-definition">
           <dt>企业归属</dt>
           <dd>使用示例企业映射；正式匹配标识与归属时点待确认。</dd>
           <dt>达档方式</dt>
           <dd>单一累计方式、含门槛、最高档、不叠加，均按产品建议演示。</dd>
           <dt>订单与退款</dt>
           <dd>
             按支付日期纳入、已签收及净收款计算，单商品订单、结算前退款快照；正式时间与多商品分摊待确认。
           </dd>
           <dt>发放时间</dt>
           <dd>
             示例为结束后 20 自然日 10:00，可修改；周一至周五不等于含法定节假日调休的正式业务日历。
           </dd>
           <dt>实际已发</dt>
           <dd>
             读取订单实际基础与会员积分；净收款除以 100
             后保留小数，乘最终倍数再取整补差，不用账户余额替代。
           </dd>
           <dt>资格与排除</dt>
           <dd>演示被排除订单不贡献累计；黑名单、CTO、发票、经销商条件与贡献口径待确认。</dd>
           <dt>异常与重发</dt>
           <dd>
             负差额、缺失已发记录暂停补发，成功记录不重发；多活动叠加、发放后追扣不在本次演示范围。
           </dd>
           <dt>保存范围</dt>
           <dd>演示配置与发放记录保存在本浏览器，切换菜单或刷新不会丢失；可恢复初始示例。</dd>
         </dl>
         <div v-if="resetConfirm" class="points-notice points-warning">
           <p>恢复后将清除本浏览器中的活动编辑与模拟流水。</p>
           <div class="points-actions">
             <button class="btn btn-secondary" @click="resetConfirm = false">保留当前数据</button><button class="btn btn-danger" @click="restore">确认恢复示例</button>
           </div>
         </div>
       </div>
        <template #actions><button v-if="can('configure')" class="btn btn-secondary" @click="resetConfirm = true">
          恢复示例</button><button
          class="btn btn-primary"
          @click="closeSettings"
        >
          知道了
        </button></template></PointsDialog>
    </template>
  </section>
</template>
<style scoped src="./points.css"></style>
<style scoped>
.points-toast {
  margin-bottom: var(--space-4, 16px);
}
</style>
