<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAppStore } from '@/stores/app'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import ListSurface from '@/components/content/ListSurface.vue'
import DataTable from '@/components/content/DataTable.vue'
import Pagination from '@/components/content/Pagination.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import { canUseActivityPoints } from '@/services/activityPointsAccess'
import { buildActivityPointsLedger } from '@/services/activityPointsLedger'
import { buildPointsAccounts, filterPointsAccounts } from '@/services/pointsAccounts'
import { number as n } from '@/services/activityPoints'
import { useActivityPointsDemo, exportPointsCsv } from './useActivityPointsDemo'

const app = useAppStore()
const { state, storageNotice } = useActivityPointsDemo()
const canView = computed(() => canUseActivityPoints(app.user, app.role, app.permissions))
const canExport = computed(() =>
  canUseActivityPoints(app.user, app.role, app.permissions, 'export')
)
const empty = () => ({ account: '', start: '', end: '' })
const draft = reactive(empty())
const applied = ref(empty())
const page = ref(1)
const error = ref('')
const notice = ref('')
const accounts = computed(() =>
  canView.value
    ? buildPointsAccounts(buildActivityPointsLedger(state.activities, state.records, state.date))
    : []
)
const rows = computed(() =>
  error.value ? [] : filterPointsAccounts(accounts.value, applied.value)
)
const paged = computed(() =>
  rows.value
    .slice((page.value - 1) * 10, page.value * 10)
    .map((row) => ({
      ...row,
      total: n(row.totalPoints),
      frozen: n(row.frozenPoints),
      available: n(row.availablePoints)
    }))
)
const columns = [
  { key: 'account', label: 'Lenovo ID' },
  { key: 'currency', label: '虚拟币' },
  { key: 'accountId', label: '账户' },
  { key: 'total', label: '积分总数', align: 'right' as const },
  { key: 'frozen', label: '冻结积分', align: 'right' as const },
  { key: 'available', label: '可用积分', align: 'right' as const },
  { key: 'createdAt', label: '创建时间' }
]
function query() {
  notice.value = ''
  error.value =
    draft.start && draft.end && draft.start > draft.end
      ? '创建开始日期不能晚于结束日期，请调整后查询。'
      : ''
  if (!error.value) applied.value = { ...draft, account: draft.account.trim() }
  page.value = 1
}
function reset() {
  Object.assign(draft, empty())
  applied.value = empty()
  error.value = ''
  notice.value = ''
  page.value = 1
}
function download() {
  if (!canView.value || !canExport.value || error.value || !rows.value.length) return
  exportPointsCsv(
    '账户查询-演示账户',
    ['Lenovo ID', '虚拟币', '账户', '积分总数', '冻结积分', '可用积分', '创建时间'],
    rows.value.map((row) => [
      row.account,
      row.currency,
      row.accountId,
      row.totalPoints,
      row.frozenPoints,
      row.availablePoints,
      row.createdAt
    ])
  )
  notice.value = `已导出当前筛选的全部 ${rows.value.length} 个演示账户。`
}
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
      title="账户查询"
      description="按 Lenovo ID、虚拟币和创建时间查询演示积分账户。"
    />
    <FeedbackState
      v-if="!canView"
      state="no-permission"
      title="暂无积分查看权限"
      description="请联系管理员开通活动积分查看权限。"
    />
    <template v-else>
      <div class="points-demo-strip" data-flow-role="notice">
        <strong>演示数据 · 不产生真实积分</strong>
        <span class="points-secondary">演示账户以首次活动积分入账时间作为创建时间，未模拟消费和冻结；预计、待发和失败记录不计入余额。</span>
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
            <label class="points-field">Lenovo ID<input
              v-model="draft.account"
              class="form-input"
              placeholder="选填，请输入完整 Lenovo ID"
            /></label>
            <label class="points-field">虚拟币<select class="form-input" aria-label="虚拟币">
              <option value="企业积分">企业积分</option>
            </select></label>
            <label class="points-field">创建开始时间<input
              v-model="draft.start"
              class="form-input"
              type="date"
              :aria-invalid="!!error"
              :aria-describedby="error ? 'accounts-date-error' : undefined"
            /></label>
            <label class="points-field">创建结束时间<input
              v-model="draft.end"
              class="form-input"
              type="date"
              :aria-invalid="!!error"
              :aria-describedby="error ? 'accounts-date-error' : undefined"
            /></label>
          </div>
          <p
            v-if="error"
            id="accounts-date-error"
            class="points-code-feedback points-code-error"
            role="alert"
          >
            {{ error }}
          </p>
          <div class="points-toolbar">
            <span class="points-muted">余额仅汇总演示活动的成功入账积分。</span>
            <div class="points-actions">
              <button class="btn btn-secondary" type="button" @click="reset">重置</button>
              <button
                class="btn btn-secondary"
                type="button"
                :disabled="!canExport || !!error || !rows.length"
                @click="download"
              >
                导出
              </button>
              <button class="btn btn-primary" type="submit">查询</button>
            </div>
          </div>
        </form>
        <ListSurface>
          <template #toolbar><div class="points-toolbar">
            <span>共 {{ rows.length }} 个演示账户</span>
          </div></template>
          <DataTable
            v-if="paged.length"
            :columns="columns"
            :rows="paged"
            row-key="key"
            caption="账户查询 · 演示积分账户"
          >
            <template #cell-accountId="{ row }"><RouterLink
              class="points-link"
              :to="{ path: '/points/account-details', query: { account: String(row.account) } }"
            >{{ row.accountId }}</RouterLink></template>
            <template #cell-total="{ value }"><span class="points-numeric">{{ value }}</span></template>
            <template #cell-frozen="{ value }"><span class="points-numeric">{{ value }}</span></template>
            <template #cell-available="{ value }"><span class="points-highlight points-numeric">{{ value }}</span></template>
          </DataTable>
          <FeedbackState
            v-else
            :state="error ? 'error' : 'filtered-empty'"
            :title="error ? '请调整查询日期' : '暂无符合条件的演示账户'"
            description="可调整 Lenovo ID 或创建时间；只有成功入账后才会生成演示账户。"
          />
          <template #pagination><Pagination v-model:page="page" :page-size="10" :total="rows.length"/></template>
        </ListSurface>
      </div>
    </template>
  </section>
</template>

<style scoped src="./points.css"></style>
