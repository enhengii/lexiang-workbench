<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import SectionHeader from '@/components/content/SectionHeader.vue'
import DataTable from '@/components/content/DataTable.vue'
import ListSurface from '@/components/content/ListSurface.vue'
import Pagination from '@/components/content/Pagination.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import StatusTag from '@/components/content/StatusTag.vue'
import PointsDialog from './PointsDialog.vue'
import { usePointsCatalogDemo } from './usePointsCatalogDemo'
import { useActivityPointsDemo } from './useActivityPointsDemo'
import { canUseActivityPoints } from '@/services/activityPointsAccess'
import { buildActivityPointsLedger } from '@/services/activityPointsLedger'
import { number as n } from '@/services/activityPoints'
import {
  maskDemoToken,
  PointsCatalogValidationError,
  type CatalogFieldErrors,
  type CatalogStatus,
  type CurrencyExpiryRule
} from '@/services/pointsCatalog'

const props = defineProps<{ mode: 'currency' | 'channel' }>()
const app = useAppStore()
const { state, storageNotice, saveCurrency, saveChannel } = usePointsCatalogDemo()
const { state: activity, storageNotice: activityStorageNotice } = useActivityPointsDemo()
const canView = computed(() => canUseActivityPoints(app.user, app.role, app.permissions, 'view'))
const canConfigure = computed(
  () => canView.value && canUseActivityPoints(app.user, app.role, app.permissions, 'configure')
)
const title = computed(() => (props.mode === 'currency' ? '虚拟币管理' : '渠道管理'))
const emptyFilters = () => ({ name: '', status: '' })
const draft = reactive(emptyFilters())
const applied = ref(emptyFilters())
const page = ref(1)
const notice = ref('')
const errors = ref<CatalogFieldErrors>({})
const editor = ref<{ id?: string } | null>(null)
const emptyForm = () => ({
  name: '',
  description: '',
  expiryRule: 'never' as CurrencyExpiryRule,
  validity: '' as string | number | null,
  rate: '' as string | number,
  status: 'enabled' as CatalogStatus,
  currencyId: state.currencies[0]?.id || '',
  dailyLimit: '' as string | number,
  totalLimit: '' as string | number
})
const form = reactive(emptyForm())
const revealedTokens = ref<string[]>([])
const issuedTotal = computed(() =>
  canView.value
    ? buildActivityPointsLedger(activity.activities, activity.records, activity.date).reduce(
        (sum, row) => sum + row.points,
        0
      )
    : 0
)
const currencyRows = computed(() =>
  state.currencies.map((row) => ({
    ...row,
    expiry:
      row.expiryRule === 'year' ? '按年过期' : row.expiryRule === 'month' ? '按月过期' : '不过期',
    validityLabel:
      row.expiryRule === 'never'
        ? '—'
        : `${row.validity} ${row.expiryRule === 'year' ? '年' : '月'}`,
    rateLabel: `${row.rate} 元可获得 1 积分`,
    issued: row.id === 'DEMO-POINTS' ? issuedTotal.value : 0
  }))
)
const channelRows = computed(() =>
  state.channels.map((row) => ({
    ...row,
    currency:
      state.currencies.find((currency) => currency.id === row.currencyId)?.name || '虚拟币不可用',
    dailyLimitLabel: row.dailyLimit === 0 ? '0（不限制）' : n(row.dailyLimit),
    totalLimitLabel: row.totalLimit === 0 ? '0（不限制）' : n(row.totalLimit),
    issued: row.id === 'DEMO-CHANNEL-ENTERPRISE' ? issuedTotal.value : 0
  }))
)
const rows = computed(() => {
  if (!canView.value) return []
  const items = props.mode === 'currency' ? currencyRows.value : channelRows.value
  return items.filter(
    (row) =>
      row.name.toLocaleLowerCase().includes(applied.value.name.toLocaleLowerCase()) &&
      (!applied.value.status || row.status === applied.value.status)
  )
})
const paged = computed(() => rows.value.slice((page.value - 1) * 10, page.value * 10))
const columns = computed(() =>
  props.mode === 'currency'
    ? [
        { key: 'id', label: '虚拟币ID' },
        { key: 'name', label: '虚拟币名称' },
        { key: 'validityLabel', label: '有效期' },
        { key: 'expiry', label: '过期规则' },
        { key: 'rateLabel', label: '兑率' },
        { key: 'status', label: '状态' },
        { key: 'operator', label: '操作人' },
        { key: 'updated', label: '操作时间' },
        { key: 'issued', label: '已发放总数', align: 'right' as const },
        { key: 'actions', label: '操作', align: 'right' as const }
      ]
    : [
        { key: 'currency', label: '虚拟币' },
        { key: 'name', label: '渠道名称' },
        { key: 'token', label: '渠道token' },
        { key: 'dailyLimitLabel', label: '用户日发放限制', align: 'right' as const },
        { key: 'totalLimitLabel', label: '渠道总发放限制', align: 'right' as const },
        { key: 'status', label: '状态' },
        { key: 'operator', label: '操作人' },
        { key: 'updated', label: '操作时间' },
        { key: 'issued', label: '已发放总数', align: 'right' as const },
        { key: 'actions', label: '操作', align: 'right' as const }
      ]
)
function requireConfigure() {
  if (canConfigure.value) return true
  notice.value = '当前账号没有配置权限，请联系管理员授权。'
  return false
}
function query() {
  if (!canView.value) return
  applied.value = { ...draft, name: draft.name.trim() }
  page.value = 1
}
function reset() {
  Object.assign(draft, emptyFilters())
  applied.value = emptyFilters()
  page.value = 1
}
function openEditor(id?: string) {
  if (!requireConfigure()) return
  errors.value = {}
  notice.value = ''
  Object.assign(form, emptyForm())
  if (id) {
    const current =
      props.mode === 'currency'
        ? state.currencies.find((row) => row.id === id)
        : state.channels.find((row) => row.id === id)
    if (!current) {
      notice.value = '该配置已不可用，请重新查询。'
      return
    }
    Object.assign(form, current)
  }
  editor.value = { id }
}
function closeEditor() {
  editor.value = null
  errors.value = {}
}
function save() {
  if (!requireConfigure() || !editor.value) return
  errors.value = {}
  try {
    if (props.mode === 'currency') saveCurrency(form, editor.value.id)
    else saveChannel(form, editor.value.id)
    closeEditor()
    reset()
    notice.value = storageNotice.value
      ? `${title.value}演示配置仅在当前页面生效；未能保存至浏览器，刷新后可能丢失。不产生真实积分。`
      : `${title.value}演示配置已保存至当前浏览器，不产生真实积分。`
  } catch (error) {
    errors.value =
      error instanceof PointsCatalogValidationError
        ? error.fieldErrors
        : { form: '本次保存未完成，请检查配置后重试。' }
  }
}
function toggleToken(id: string) {
  if (!canView.value) return
  revealedTokens.value = revealedTokens.value.includes(id)
    ? revealedTokens.value.filter((item) => item !== id)
    : [...revealedTokens.value, id]
}
function tokenDisplay(id: string) {
  if (!canView.value) return ''
  const channel = state.channels.find((row) => row.id === id)
  if (!channel) return ''
  return revealedTokens.value.includes(id) ? channel.token : maskDemoToken(channel.token)
}
watch(
  () => form.expiryRule,
  (value) => {
    if (value === 'never') form.validity = null
  }
)
watch(
  () => rows.value.length,
  (length) => {
    page.value = Math.min(page.value, Math.max(1, Math.ceil(length / 10)))
  }
)
watch(
  () => props.mode,
  () => {
    reset()
    closeEditor()
    notice.value = ''
    revealedTokens.value = []
  }
)
watch(canConfigure, (allowed) => {
  if (!allowed) closeEditor()
})
watch(canView, (allowed) => {
  if (!allowed) revealedTokens.value = []
})
</script>

<template>
  <section class="points-page points-flow">
    <ContentPageHeader
      :title="title"
      description="维护虚拟币与渠道的演示配置，查看关联活动积分的成功发放总数。"
    >
      <template v-if="canView" #actions>
        <button class="btn btn-primary" :disabled="!canConfigure" @click="openEditor()">
          添加
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
        <strong>演示配置 · 不产生真实积分</strong>
        <span class="points-secondary">配置仅在当前浏览器保存；活动计算仍按活动页规则执行，本页兑率、限制及启停不会改变活动计算或历史流水。</span>
      </div>
      <p class="points-muted" data-flow-role="notice">
        企业积分、企业购渠道均为合成示例；100 元 / 1
        积分取自现有活动基础积分算法，不过期为演示假设。渠道 token 仅使用 DEMO 标识。
      </p>
      <p
        v-if="storageNotice || activityStorageNotice.message"
        class="points-notice points-warning"
        role="status"
        data-flow-role="notice"
      >
        {{ storageNotice || activityStorageNotice.message }}
      </p>
      <p v-if="notice" class="points-notice" role="status" data-flow-role="notice">{{ notice }}</p>
      <div class="points-list-workspace" data-flow-role="list-workspace">
        <form class="points-filter" @submit.prevent="query">
          <div class="points-filter-grid">
            <label class="points-field">{{ mode === 'currency' ? '虚拟币名称' : '渠道名称'
            }}<input v-model="draft.name" class="form-input" placeholder="请输入名称"/></label>
            <label class="points-field">状态<select v-model="draft.status" class="form-input">
              <option value="">全部</option>
              <option value="enabled">启用</option>
              <option value="disabled">停用</option>
            </select></label>
            <div class="points-actions points-filter-actions">
              <button class="btn btn-secondary" type="button" @click="reset">重置</button><button class="btn btn-primary" type="submit">查询</button>
            </div>
          </div>
        </form>
        <ListSurface>
          <template #toolbar><SectionHeader
            :title="`${title}列表`"
            description="已发放总数仅统计关联活动成功入账的演示积分；新建配置暂无发放记录。"
          /></template>
          <DataTable
            v-if="paged.length"
            :columns="columns"
            :rows="paged"
            row-key="id"
            :caption="`${title}演示配置`"
            density="two-line"
          >
            <template #cell-name="{ row }"><span class="points-name">{{ row.name }}</span><small v-if="row.description" class="points-secondary">{{
              row.description
            }}</small></template>
            <template #cell-status="{ value }"><StatusTag :tone="value === 'enabled' ? 'success' : 'neutral'">{{
              value === 'enabled' ? '启用' : '停用'
            }}</StatusTag></template>
            <template #cell-token="{ row }"><span class="points-numeric">{{ tokenDisplay(String(row.id)) }}</span><button
              class="points-link"
              :aria-label="`${revealedTokens.includes(String(row.id)) ? '隐藏' : '显示'}${row.name}演示token`"
              :aria-pressed="revealedTokens.includes(String(row.id))"
              @click="toggleToken(String(row.id))"
            >
              {{ revealedTokens.includes(String(row.id)) ? '隐藏' : '显示' }}
            </button></template>
            <template #cell-issued="{ value }"><span class="points-numeric">{{ n(Number(value)) }}</span></template>
            <template #cell-actions="{ row }"><button
              class="btn btn-secondary"
              :disabled="!canConfigure"
              @click="openEditor(String(row.id))"
            >
              修改
            </button></template>
          </DataTable>
          <FeedbackState
            v-else
            state="filtered-empty"
            title="暂无符合条件的配置"
            description="请调整名称或状态后查询。"
          ><template #action><button class="btn btn-secondary" @click="reset">重置筛选</button></template></FeedbackState>
          <template #pagination><Pagination v-model:page="page" :page-size="10" :total="rows.length"/></template>
        </ListSurface>
      </div>
    </template>
    <PointsDialog
      v-if="editor && canConfigure"
      :title="`${editor.id ? '修改' : '添加'}${mode === 'currency' ? '虚拟币' : '渠道'}`"
      description="仅保存合成演示配置，不调用真实积分服务。"
      @close="closeEditor"
    >
      <form id="points-catalog-form" class="points-fields" novalidate @submit.prevent="save">
        <label class="points-field points-field-full">{{ mode === 'currency' ? '虚拟币名称' : '渠道名称' }}（必填）<input
          v-model="form.name"
          class="form-input"
          required
          :aria-invalid="!!errors.name"
          :aria-describedby="errors.name ? 'catalog-name-error' : undefined"
        /><small
          v-if="errors.name"
          id="catalog-name-error"
          class="points-code-feedback points-code-error"
          role="alert"
        >{{ errors.name }}</small></label>
        <label class="points-field points-field-full">{{ mode === 'currency' ? '简介' : '渠道简介'
        }}<textarea
          v-model="form.description"
          class="form-input points-code-input"
          rows="3"
          :aria-invalid="!!errors.description"
          :aria-describedby="errors.description ? 'catalog-description-error' : undefined"
        /><small
          v-if="errors.description"
          id="catalog-description-error"
          class="points-code-feedback points-code-error"
          role="alert"
        >{{ errors.description }}</small></label>
        <template v-if="mode === 'currency'">
          <label class="points-field">过期规则<select
            v-model="form.expiryRule"
            class="form-input"
            :aria-invalid="!!errors.expiryRule"
            :aria-describedby="errors.expiryRule ? 'catalog-expiry-error' : undefined"
          >
            <option value="year">按年过期</option>
            <option value="month">按月过期</option>
            <option value="never">不过期</option></select><small
            v-if="errors.expiryRule"
            id="catalog-expiry-error"
            class="points-code-feedback points-code-error"
            role="alert"
          >{{ errors.expiryRule }}</small></label>
          <label v-if="form.expiryRule !== 'never'" class="points-field">有效期（必填）<input
            v-model="form.validity"
            class="form-input"
            type="number"
            min="0"
            step="1"
            required
            :aria-invalid="!!errors.validity"
            aria-describedby="catalog-validity-help catalog-validity-error"
          /><small id="catalog-validity-help" class="points-muted">只能是大于等于 0 的整数（{{ form.expiryRule === 'year' ? '年' : '月' }}）</small><small
            v-if="errors.validity"
            id="catalog-validity-error"
            class="points-code-feedback points-code-error"
            role="alert"
          >{{ errors.validity }}</small></label>
          <label class="points-field points-field-full">兑率（必填）<span class="points-actions"><input
            v-model="form.rate"
            class="form-input catalog-rate"
            type="number"
            min="0"
            step="any"
            required
            :aria-invalid="!!errors.rate"
            aria-describedby="catalog-rate-help catalog-rate-error"
          /><span>元可获得</span><input
            class="form-input catalog-one"
            value="1"
            disabled
            aria-label="固定获得积分数量"
          /><span>积分</span></span><small id="catalog-rate-help" class="points-muted">兑率仅在购买商品时发放积分计算、退款扣除积分余额不足需抵扣现金时使用。本页仅演示配置保存，未接入上述流程。</small><small
            v-if="errors.rate"
            id="catalog-rate-error"
            class="points-code-feedback points-code-error"
            role="alert"
          >{{ errors.rate }}</small></label>
        </template>
        <template v-else>
          <label class="points-field points-field-full">虚拟币<select
            v-model="form.currencyId"
            class="form-input"
            required
            :aria-invalid="!!errors.currencyId"
            :aria-describedby="errors.currencyId ? 'catalog-currency-error' : undefined"
          >
            <option v-for="item in state.currencies" :key="item.id" :value="item.id">
              {{ item.name }}{{ item.status === 'disabled' ? '（停用）' : '' }}
            </option></select><small
            v-if="errors.currencyId"
            id="catalog-currency-error"
            class="points-code-feedback points-code-error"
            role="alert"
          >{{ errors.currencyId }}</small></label>
          <label class="points-field">用户日发放限制（必填）<input
            v-model="form.dailyLimit"
            class="form-input"
            type="number"
            min="0"
            step="1"
            required
            :aria-invalid="!!errors.dailyLimit"
            aria-describedby="catalog-daily-help catalog-daily-error"
          /><small id="catalog-daily-help" class="points-muted">0 为不限制</small><small
            v-if="errors.dailyLimit"
            id="catalog-daily-error"
            class="points-code-feedback points-code-error"
            role="alert"
          >{{ errors.dailyLimit }}</small></label>
          <label class="points-field">渠道总发放限制（必填）<input
            v-model="form.totalLimit"
            class="form-input"
            type="number"
            min="0"
            step="1"
            required
            :aria-invalid="!!errors.totalLimit"
            aria-describedby="catalog-total-help catalog-total-error"
          /><small id="catalog-total-help" class="points-muted">0 为不限制</small><small
            v-if="errors.totalLimit"
            id="catalog-total-error"
            class="points-code-feedback points-code-error"
            role="alert"
          >{{ errors.totalLimit }}</small></label>
        </template>
        <label class="points-field points-field-full">状态<select
          v-model="form.status"
          class="form-input"
          :aria-invalid="!!errors.status"
          :aria-describedby="errors.status ? 'catalog-status-error' : undefined"
        >
          <option value="enabled">启用</option>
          <option value="disabled">停用</option></select><small
          v-if="errors.status"
          id="catalog-status-error"
          class="points-code-feedback points-code-error"
          role="alert"
        >{{ errors.status }}</small></label>
        <p
          v-if="errors.form"
          class="points-code-feedback points-code-error points-field-full"
          role="alert"
        >
          {{ errors.form }}
        </p>
      </form>
      <template #actions><button class="btn btn-secondary" @click="closeEditor">取消</button><button
        class="btn btn-primary"
        form="points-catalog-form"
        type="submit"
        :disabled="!canConfigure"
      >
        保存
      </button></template>
    </PointsDialog>
  </section>
</template>

<style scoped src="./points.css"></style>
<style scoped>
.points-field .catalog-rate {
  width: min(100%, 160px);
}
.points-field .catalog-one {
  width: 48px;
}
</style>
