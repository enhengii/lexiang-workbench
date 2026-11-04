<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import DataTable from '@/components/content/DataTable.vue'
import ListSurface from '@/components/content/ListSurface.vue'
import Pagination from '@/components/content/Pagination.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import PointsDialog from './PointsDialog.vue'
import { useActivityPointsDemo, exportPointsCsv } from './useActivityPointsDemo'
import { canUseActivityPoints } from '@/services/activityPointsAccess'
import { number as n } from '@/services/activityPoints'
import { buildActivityPointsLedger, filterPointsLedger } from '@/services/activityPointsLedger'

const props = defineProps<{ mode: 'export' | 'account' }>()
const app = useAppStore()
const route = useRoute()
const { state, storageNotice } = useActivityPointsDemo()
const title = computed(() => (props.mode === 'export' ? '明细导出' : '账户明细'))
const canView = computed(() => canUseActivityPoints(app.user, app.role, app.permissions))
const canExport = computed(() =>
  canUseActivityPoints(app.user, app.role, app.permissions, 'export')
)
const empty = () => ({ account: '', activityId: '', channel: '', ruleType: '', start: '', end: '' })
const draft = reactive(empty())
const applied = ref(empty())
const page = ref(1)
const advanced = ref(false)
const notice = ref('')
const error = ref('')
const selectedKey = ref('')
const ledger = computed(() =>
  canView.value ? buildActivityPointsLedger(state.activities, state.records, state.date) : []
)
const rows = computed(() => {
  if (error.value) return []
  if (props.mode === 'account') {
    const account = applied.value.account.trim().toLowerCase()
    return account ? ledger.value.filter((row) => row.account.trim().toLowerCase() === account) : []
  }
  return filterPointsLedger(ledger.value, applied.value)
})
const paged = computed(() =>
  rows.value
    .slice((page.value - 1) * 10, page.value * 10)
    .map((row) => ({ ...row, change: `+${n(row.points)}` }))
)
const selected = computed(() => ledger.value.find((row) => row.key === selectedKey.value))
const totalPoints = computed(() => rows.value.reduce((total, row) => total + row.points, 0))
const advancedCount = computed(
  () => [applied.value.activityId, applied.value.start, applied.value.end].filter(Boolean).length
)
const columns = [
  { key: 'account', label: 'Lenovo ID' },
  { key: 'currency', label: '虚拟币' },
  { key: 'channel', label: '积分渠道' },
  { key: 'change', label: '积分加减', align: 'right' as const },
  { key: 'time', label: '操作时间' },
  { key: 'source', label: '积分来源' },
  { key: 'ruleType', label: '规则类型' },
  { key: 'transaction', label: '编号' },
  { key: 'activityName', label: '关联活动' },
  { key: 'orderId', label: '订单号' },
  { key: 'actions', label: '操作' }
]
function query() {
  selectedKey.value = ''
  notice.value = ''
  error.value =
    props.mode === 'account' && !draft.account.trim()
      ? '请输入 Lenovo ID 后查询。'
      : props.mode === 'export' && draft.start && draft.end && draft.start > draft.end
        ? '操作开始日期不能晚于结束日期，请调整后查询。'
        : ''
  if (!error.value) applied.value = { ...draft, account: draft.account.trim() }
  page.value = 1
}
function reset() {
  Object.assign(draft, empty())
  applied.value = empty()
  page.value = 1
  error.value = ''
  notice.value = ''
  selectedKey.value = ''
  advanced.value = false
}
function download() {
  if (!canView.value || !canExport.value || error.value || !rows.value.length) return
  exportPointsCsv(
    `${title.value}-活动积分`,
    [
      'Lenovo ID',
      '虚拟币',
      '积分渠道',
      '积分加减',
      '操作时间',
      '积分来源',
      '规则类型',
      '编号',
      '活动编号',
      '活动名称',
      '订单号',
      '企业标识',
      '企业名称',
      '商品编码',
      '有效金额',
      '有效台数',
      '发放批次'
    ],
    rows.value.map((row) => [
      row.account,
      row.currency,
      row.channel,
      row.points,
      row.time,
      row.source,
      row.ruleType,
      row.transaction,
      row.activityId,
      row.activityName,
      row.orderId,
      row.enterpriseId,
      row.enterprise,
      row.sku,
      row.amount,
      row.quantity,
      row.batch
    ])
  )
  notice.value = `已导出当前筛选的全部 ${rows.value.length} 条实际入账流水。`
}
watch(
  [() => props.mode, () => route.query.account],
  ([mode, account]) => {
    reset()
    if (mode === 'account' && typeof account === 'string' && account.trim()) {
      draft.account = account.trim()
      query()
    }
  },
  { immediate: true }
)
watch(
  () => rows.value.length,
  () => {
    page.value = Math.min(page.value, Math.max(1, Math.ceil(rows.value.length / 10)))
  }
)
</script>

<template>
  <section class="points-page points-flow">
    <ContentPageHeader
      :title="title"
      :description="
        mode === 'account'
          ? '输入完整 Lenovo ID 查询该账户的活动积分入账流水。'
          : '查询活动积分入账流水，按账号、渠道和操作时间筛选。'
      "
    >
      <template v-if="mode === 'export' && canView" #actions>
        <button
          class="btn btn-primary"
          :disabled="!canExport || !!error || !rows.length"
          @click="download"
        >
          导出当前筛选结果
        </button>
      </template>
    </ContentPageHeader>
    <FeedbackState
      v-if="!canView"
      state="no-permission"
      title="暂无积分查看权限"
      description="请联系管理员开通活动积分查看权限。"
    />
    <template v-else>
      <div class="points-demo-strip" data-flow-role="notice">
        <strong>演示数据 · 不产生真实积分</strong>
        <span class="points-secondary">仅展示成功发放的活动积分；预计、待发与失败记录不计入到账流水。</span>
      </div>
      <p
        v-if="storageNotice.message"
        class="points-notice points-warning"
        role="status"
        data-flow-role="notice"
      >
        {{ storageNotice.message }}
      </p>
      <p v-if="notice" class="points-notice" role="status" data-flow-role="notice">{{ notice }}</p>
      <div class="points-list-workspace" data-flow-role="list-workspace">
        <form class="points-filter" @submit.prevent="query">
          <div class="points-filter-grid">
            <label v-if="mode === 'account'" class="points-field">
              <span><span class="points-code-error" aria-hidden="true">*</span> Lenovo ID（必填）</span>
              <input
                v-model="draft.account"
                class="form-input"
                placeholder="请输入完整 Lenovo ID"
                aria-required="true"
                :aria-invalid="!!error"
                :aria-describedby="error ? 'ledger-query-error' : undefined"
              />
            </label>
            <label class="points-field">虚拟币<select class="form-input" aria-label="虚拟币">
              <option value="企业积分">企业积分</option>
            </select></label>
            <template v-if="mode === 'export'">
              <label class="points-field">积分渠道<select v-model="draft.channel" class="form-input">
                <option value="">全部渠道</option>
                <option value="企业购渠道">企业购渠道</option>
              </select></label>
              <label class="points-field">规则类型<select v-model="draft.ruleType" class="form-input">
                <option value="">全部类型</option>
                <option value="活动积分">活动积分</option>
              </select></label>
              <label class="points-field">Lenovo ID<input
                v-model="draft.account"
                class="form-input"
                placeholder="例如 LID-DEMO-B01"
              /></label>
              <template v-if="advanced">
                <label class="points-field">关联活动<select v-model="draft.activityId" class="form-input">
                  <option value="">全部活动</option>
                  <option
                    v-for="item in state.activities.filter((item) => !item.draft)"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.name }}
                  </option>
                </select></label>
                <label class="points-field">操作开始日期<input
                  v-model="draft.start"
                  class="form-input"
                  type="date"
                  :aria-invalid="!!error"
                  :aria-describedby="error ? 'ledger-date-error' : undefined"
                /></label>
                <label class="points-field">操作结束日期<input
                  v-model="draft.end"
                  class="form-input"
                  type="date"
                  :aria-invalid="!!error"
                  :aria-describedby="error ? 'ledger-date-error' : undefined"
                /></label>
              </template>
            </template>
          </div>
          <p
            v-if="error"
            :id="mode === 'account' ? 'ledger-query-error' : 'ledger-date-error'"
            class="points-code-feedback points-code-error"
            role="alert"
          >
            {{ error }}
          </p>
          <div class="points-toolbar">
            <button
              v-if="mode === 'export'"
              class="points-link"
              type="button"
              :aria-expanded="advanced"
              @click="advanced = !advanced"
            >
              {{
                advanced
                  ? '收起高级筛选'
                  : `高级筛选${advancedCount ? `（已应用 ${advancedCount} 项）` : ''}`
              }}
            </button>
            <div class="points-actions">
              <button class="btn btn-secondary" type="button" @click="reset">重置</button><button class="btn btn-primary" type="submit">查询</button>
            </div>
          </div>
        </form>
        <ListSurface>
          <template #toolbar><div class="points-toolbar">
            <span>已到账活动积分 <strong class="points-numeric">{{ n(totalPoints) }}</strong> 分 ·
              {{ rows.length }} 条流水</span><RouterLink class="points-link" to="/points/activity-details">查看活动积分明细</RouterLink>
          </div></template>
          <DataTable
            v-if="paged.length"
            :columns="columns"
            :rows="paged"
            row-key="key"
            :caption="`${title} · 活动积分流水`"
            density="two-line"
          >
            <template #cell-account="{ row }"><button class="points-link" @click="selectedKey = String(row.key)">
              {{ row.account }}</button><small class="points-secondary">{{ row.enterprise }}</small></template>
            <template #cell-change="{ value }"><span class="points-highlight points-numeric">{{ value }}</span></template>
            <template #cell-actions="{ row }"><button class="points-link" @click="selectedKey = String(row.key)">
              查看明细
            </button></template>
          </DataTable>
          <FeedbackState
            v-else
            :state="error ? 'error' : 'filtered-empty'"
            :title="
              mode === 'account' && (!applied.account || !!error)
                ? '请输入 Lenovo ID 后查询'
                : error
                  ? '请调整查询日期'
                  : '暂无符合条件的已到账积分'
            "
            :description="
              mode === 'account'
                ? '请填写完整 Lenovo ID；待发和失败记录不计入账户入账流水。'
                : '可调整筛选条件；待发或失败记录请在活动积分明细中查看。'
            "
          ><template #action><button class="btn btn-secondary" @click="reset">重置筛选</button></template></FeedbackState>
          <template #pagination><Pagination v-model:page="page" :page-size="10" :total="rows.length"/></template>
        </ListSurface>
      </div>
    </template>
    <PointsDialog
      v-if="selected && canView"
      title="积分流水明细"
      :description="`${selected.activityName} · ${selected.orderId}`"
      @close="selectedKey = ''"
    >
      <dl class="points-definition">
        <dt>Lenovo ID</dt>
        <dd>{{ selected.account }}</dd>
        <dt>企业</dt>
        <dd>{{ selected.enterprise }}</dd>
        <dt>积分来源</dt>
        <dd>{{ selected.source }} · {{ selected.activityName }}</dd>
        <dt>有效金额</dt>
        <dd>¥ {{ n(selected.amount) }}</dd>
        <dt>有效台数</dt>
        <dd>{{ n(selected.quantity) }} 台</dd>
        <dt>实际入账积分</dt>
        <dd>{{ n(selected.points) }} 分</dd>
        <dt>操作时间</dt>
        <dd>{{ selected.time }}</dd>
        <dt>编号</dt>
        <dd>{{ selected.transaction || '未记录' }}</dd>
      </dl>
      <template #actions><button class="btn btn-secondary" @click="selectedKey = ''">关闭</button></template>
    </PointsDialog>
  </section>
</template>

<style scoped src="./points.css"></style>
