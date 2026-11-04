<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAppStore } from '@/stores/app'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import SectionHeader from '@/components/content/SectionHeader.vue'
import ListSurface from '@/components/content/ListSurface.vue'
import DataTable from '@/components/content/DataTable.vue'
import Pagination from '@/components/content/Pagination.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import StatusTag from '@/components/content/StatusTag.vue'
import PointsDialog from './PointsDialog.vue'
import PointsSelect from './PointsSelect.vue'
import { usePointsCatalogDemo } from './usePointsCatalogDemo'
import { usePointsLegacyRulesDemo } from './usePointsLegacyRulesDemo'
import { canUseActivityPoints } from '@/services/activityPointsAccess'
import { products, checkProductCodes } from '@/services/activityPoints'
import {
  createLegacyRuleDraft, isLegacyRuleEditable, legacyDemoGroups, legacyDemoMalls,
  type LegacyRuleMode, type LegacyRule, type LegacyRuleDraft, type LegacyRuleSnapshot
} from '@/services/pointsLegacyRules'

const props = defineProps<{ mode: LegacyRuleMode }>()
const app = useAppStore()
const { state, storageNoticeRef, saveRule, endRule } = usePointsLegacyRulesDemo()
const catalog = usePointsCatalogDemo()
const catalogStorageNotice = catalog.storageNotice
const title = computed(() => props.mode === 'deduction' ? '积分抵现规则' : '积分规则')
const canView = computed(() => canUseActivityPoints(app.user, app.role, app.permissions, 'view'))
const canConfigure = computed(() => canUseActivityPoints(app.user, app.role, app.permissions, 'configure'))
const notice = ref('')
const filter = ref({ currencyId: 'all', ruleType: 'all', status: 'all', name: '', id: '' })
const applied = ref({ ...filter.value })
const page = ref(1)
const editor = ref<LegacyRuleDraft | null>(null)
const editingId = ref('')
const editingRevision = ref(0)
const snapshotId = ref('')
const formError = ref('')
const codeInput = ref('')
const editorBaseline = ref('')
const discardConfirm = ref(false)
const historyId = ref('')
const historyRule = computed(() => state.rules.find((rule) => rule.id === historyId.value))
const endingId = ref('')
const endingRule = computed(() => state.rules.find((rule) => rule.id === endingId.value))
const endingRevision = ref(0)
const readOnly = computed(() => !!snapshotId.value)
const currencyOptions = computed(() => catalog.state.currencies
  .filter((currency) => currency.status === 'enabled')
  .map((currency) => ({ value: currency.id, label: `${currency.name}（演示）` })))
const allCurrencyOptions = computed(() => [
  { value: 'all', label: '全部' },
  ...catalog.state.currencies.map((currency) => ({ value: currency.id, label: `${currency.name}（演示）` }))
])
const typeOptions = [
  { value: 'default', label: '默认规则' }, { value: 'activity', label: '活动规则' }
]
const statusOptions = ['全部', '启用', '停用', '提前结束'].map((value, index) => ({ value: index ? value : 'all', label: value }))
const faOptions = [...new Set(products.map((product) => product.fa))].map((value) => ({ value, label: value }))
const groupOptions = [...new Set(products.map((product) => product.group))].map((value) => ({ value, label: value }))
const rules = computed(() => state.rules.filter((rule) => rule.mode === props.mode))
const filtered = computed(() => rules.value.filter((rule) =>
  (applied.value.currencyId === 'all' || rule.currencyId === applied.value.currencyId) &&
  (applied.value.ruleType === 'all' || rule.ruleType === applied.value.ruleType) &&
  (applied.value.status === 'all' || rule.status === applied.value.status) &&
  rule.name.toLocaleLowerCase().includes(applied.value.name.trim().toLocaleLowerCase()) &&
  rule.id.toLocaleLowerCase().includes(applied.value.id.trim().toLocaleLowerCase())
))
const rows = computed(() => filtered.value.slice((page.value - 1) * 10, page.value * 10))
const columns = computed(() => props.mode === 'deduction' ? [
  { key: 'ruleType', label: '规则类型' }, { key: 'name', label: '规则名' },
  { key: 'id', label: '规则编号' }, { key: 'period', label: '有效时间' },
  { key: 'status', label: '规则状态' }, { key: 'actions', label: '操作', align: 'right' as const }
] : [
  { key: 'ruleType', label: '规则类型' }, { key: 'id', label: '规则编号' },
  { key: 'name', label: '活动名称' }, { key: 'period', label: '有效时间' },
  { key: 'status', label: '规则状态' }, { key: 'actions', label: '操作', align: 'right' as const }
])
const auditColumns = [
  { key: 'action', label: '动作' }, { key: 'time', label: '操作时间' },
  { key: 'operator', label: '操作人' }, { key: 'actions', label: '操作', align: 'right' as const }
]
const originalEditor = computed(() => editor.value ? JSON.stringify({ draft: editor.value, codeInput: codeInput.value }) : '')
const codeCheck = computed(() => codeInput.value ? checkProductCodes(codeInput.value) : null)
const codeExamples = products.map((product) => product.code).join(',')
const currencyName = (id: string) => catalog.state.currencies.find((currency) => currency.id === id)?.name || '不可用演示币种'
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
function query() { applied.value = { ...filter.value }; page.value = 1 }
function clearFilters() {
  filter.value = { currencyId: 'all', ruleType: 'all', status: 'all', name: '', id: '' }
  query()
}
function context() {
  return { canConfigure: canConfigure.value, operator: '当前演示操作人', now: new Date().toISOString() }
}
function editable(rule: LegacyRule) { return canConfigure.value && isLegacyRuleEditable(rule, state.date) }
function openEditor(rule?: LegacyRule) {
  if (!canConfigure.value || props.mode !== 'deduction') return
  if (rule && !editable(rule)) { notice.value = '该规则已成为历史记录，仅支持查看。'; return }
  editor.value = rule ? copy(rule) : createLegacyRuleDraft(props.mode)
  codeInput.value = editor.value.codes.join(',')
  editingId.value = rule?.id || ''
  editingRevision.value = rule?.revision || 0
  snapshotId.value = ''
  formError.value = ''
  editorBaseline.value = originalEditor.value
}
function viewSnapshot(value: LegacyRuleSnapshot) {
  editor.value = copy(value)
  codeInput.value = value.codes.join(',')
  editingId.value = ''
  snapshotId.value = value.id
  formError.value = ''
}
function closeEditor(force = false) {
  if (!force && !readOnly.value && originalEditor.value !== editorBaseline.value) { discardConfirm.value = true; return }
  editor.value = null
  discardConfirm.value = false
  formError.value = ''
  snapshotId.value = ''
}
function setProductMode(value: 'codes' | 'filter') {
  if (!editor.value || editor.value.productMode === value) return
  editor.value.productMode = value
  editor.value.codes = []
  editor.value.fa = ''
  editor.value.group = ''
  codeInput.value = ''
  formError.value = ''
}
function setCapMode(value: 'limited' | 'unlimited') {
  if (!editor.value || editor.value.capMode === value) return
  editor.value.capMode = value
  editor.value.capPercent = null
  formError.value = ''
}
function save() {
  if (!editor.value || readOnly.value) return
  formError.value = ''
  if (!currencyOptions.value.some((currency) => currency.value === editor.value?.currencyId)) {
    formError.value = '请选择启用的演示虚拟币'; return
  }
  const draft = copy(editor.value)
  if (draft.productMode === 'codes') {
    const checked = checkProductCodes(codeInput.value)
    if (checked.error) { formError.value = checked.error; return }
    draft.codes = codeInput.value.split(',')
  }
  try {
    const result = saveRule(draft, { ...context(), expectedRevision: editingId.value ? editingRevision.value : undefined }, editingId.value || undefined)
    notice.value = result.persisted
      ? `${editingId.value ? '已修改' : '已添加'}演示规则，已保存到当前浏览器。`
      : `${editingId.value ? '规则修改' : '规则添加'}已在本次页面生效；未能保存到浏览器，刷新后可能丢失。`
    closeEditor(true)
  } catch (error) { formError.value = error instanceof Error ? error.message : '演示规则未能保存，请重试' }
}
function requestEnd(rule: LegacyRule) {
  if (!editable(rule)) return
  endingId.value = rule.id
  endingRevision.value = rule.revision
  notice.value = ''
}
function confirmEnd() {
  if (!endingRule.value) return
  try {
    const result = endRule(endingId.value, { ...context(), expectedRevision: endingRevision.value })
    endingId.value = ''
    notice.value = result.persisted
      ? '演示规则已提前结束，操作快照已保存到当前浏览器。'
      : '演示规则提前结束已在本次页面生效；未能保存到浏览器，刷新后可能丢失。'
  } catch (error) {
    endingId.value = ''
    notice.value = error instanceof Error ? error.message : '演示操作未完成，请重新查询'
  }
}
watch(() => props.mode, () => { clearFilters(); closeEditor(true); historyId.value = ''; endingId.value = '' })
watch(() => filtered.value.length, (total) => { page.value = Math.min(page.value, Math.max(1, Math.ceil(total / 10))) })
</script>

<template>
  <section class="points-page points-flow">
    <ContentPageHeader :title="title" :description="mode === 'deduction' ? '查看原有规则、操作记录与配置快照' : '筛选并查看积分获取规则'">
      <template #actions>
        <button v-if="canView && canConfigure" class="btn btn-primary" type="button" :disabled="mode === 'earning'" :title="mode === 'earning' ? '原页面新增表单暂不可用，尚未迁入' : undefined" @click="openEditor()">添加</button>
      </template>
    </ContentPageHeader>
    <FeedbackState v-if="!canView" state="no-permission" title="暂无积分规则查看权限" description="请联系管理员申请积分管理权限。" />
    <template v-else>
      <div class="points-demo-strip" role="note"><span><strong>本地演示</strong> · {{ mode === 'deduction' ? '商城、用户组、编号及数值均为合成示例；保存和提前结束仅影响当前浏览器，不写入真实商城，也不改变活动加磅计算。' : '当前展示已核对的筛选与列表结构，未读取真实积分规则数据。' }}</span></div>
      <div v-if="catalogStorageNotice || (storageNoticeRef && !notice)" class="points-notice points-warning" role="status">{{ catalogStorageNotice || storageNoticeRef }}</div>
      <div v-if="notice" class="points-notice" :class="{ 'points-warning': storageNoticeRef }" role="status">{{ notice }}</div>
      <div v-if="mode === 'earning'" class="points-notice" role="note">原页面新增表单暂不可用，尚未迁入。现有发放配置可前往 <RouterLink class="points-link" to="/points/activity">活动积分配置</RouterLink>。</div>
      <div class="points-list-workspace">
        <form class="points-filter points-filter-grid" aria-label="规则筛选" @submit.prevent="query">
          <PointsSelect v-if="mode === 'deduction'" v-model="filter.currencyId" label="虚拟币" :options="allCurrencyOptions" />
          <PointsSelect v-model="filter.ruleType" label="规则类型" :options="[{ value: 'all', label: '全部' }, ...typeOptions]" />
          <PointsSelect v-model="filter.status" label="规则状态" :options="statusOptions" />
          <label class="points-field"><span>活动名称</span><input v-model="filter.name" class="form-input" placeholder="请输入活动或规则名称" maxlength="100"></label>
          <label class="points-field"><span>规则编号</span><input v-model="filter.id" class="form-input" placeholder="请输入规则编号"></label>
          <div class="points-actions points-filter-actions"><button type="button" class="btn btn-secondary" @click="clearFilters">重置</button><button type="submit" class="btn btn-primary">查询</button></div>
        </form>
        <ListSurface :state="rows.length ? 'data' : 'empty'">
          <template #toolbar><div class="points-toolbar"><strong>{{ title }}</strong><span class="points-muted">共 {{ filtered.length }} 条演示规则</span></div></template>
          <DataTable :columns="columns" :rows="rows" row-key="id" :caption="title" density="two-line">
            <template #cell-ruleType="{ row }">{{ row.ruleType === 'default' ? '默认规则' : '活动规则' }}</template>
            <template #cell-name="{ row }"><span class="points-name">{{ row.name }}</span><span class="points-secondary">{{ currencyName(row.currencyId) }} · 演示</span></template>
            <template #cell-period="{ row }"><span class="points-numeric">{{ row.start }}</span><span class="points-secondary">至 {{ row.end || '长期' }}</span></template>
            <template #cell-status="{ row }"><StatusTag :tone="row.status === '启用' ? 'success' : row.status === '提前结束' ? 'warning' : 'neutral'">{{ row.status }}</StatusTag></template>
            <template #cell-actions="{ row }"><div class="points-actions legacy-rule-actions"><button class="points-link" type="button" @click="historyId = row.id">查看</button><template v-if="editable(row)"><button class="points-link" type="button" @click="openEditor(row)">修改</button><button class="points-link" type="button" @click="requestEnd(row)">提前结束</button></template></div></template>
          </DataTable>
          <FeedbackState v-if="!rows.length" :state="rules.length ? 'filtered-empty' : 'empty'" :title="rules.length ? '没有匹配的演示规则' : mode === 'earning' ? '暂无积分获取规则' : '暂无演示规则'" :description="mode === 'earning' ? '原页面列表为空；新增表单暂不可用，未创建演示发放规则。' : '可调整筛选条件后重新查询。'"><template v-if="rules.length" #action><button class="btn btn-secondary" type="button" @click="clearFilters">重置筛选</button></template></FeedbackState>
          <template #pagination><Pagination v-model:page="page" :page-size="10" :total="filtered.length" /></template>
        </ListSurface>
      </div>
    </template>

    <PointsDialog v-if="historyRule && canView" title="操作记录" :description="`${historyRule.name} · ${historyRule.id}`" wide @close="historyId = ''">
      <DataTable :columns="auditColumns" :rows="[...historyRule.history].reverse()" row-key="id" caption="规则操作记录">
        <template #cell-time="{ row }">{{ row.time.replace('T', ' ').replace(/(?:\.\d+)?Z$/, ' UTC') }}</template>
        <template #cell-actions="{ row }"><button class="points-link" type="button" @click="viewSnapshot(row.snapshot)">查看快照</button></template>
      </DataTable>
    </PointsDialog>

    <PointsDialog v-if="editor && canView" :title="readOnly ? '查看积分规则' : editingId ? '修改积分规则' : '添加积分规则'" :description="readOnly ? `${snapshotId} · 历史快照，只读` : '演示数值不代表真实业务政策，仅保存在当前浏览器。'" wide @close="closeEditor()">
      <form id="legacy-rule-form" class="points-form-flow" @submit.prevent="save">
        <div class="points-fields">
          <PointsSelect v-model="editor.mall" label="商城 *" :disabled="readOnly" :options="legacyDemoMalls.map((mall) => ({ value: mall.id, label: mall.name }))" />
          <PointsSelect v-model="editor.currencyId" label="虚拟币 *" :disabled="readOnly" :options="readOnly ? allCurrencyOptions.filter((item) => item.value !== 'all') : currencyOptions" />
          <PointsSelect v-model="editor.ruleType" label="规则类型 *" :disabled="readOnly" :options="typeOptions" />
          <label class="points-field"><span>规则名称 *</span><input v-model="editor.name" :readonly="readOnly" class="form-input" required maxlength="100" placeholder="请输入规则名称"></label>
          <label class="points-field"><span>规则有效时间 · 开始 *</span><input v-model="editor.start" :readonly="readOnly" class="form-input" type="date" required></label>
          <label class="points-field"><span>规则有效时间 · 结束 {{ editor.ruleType === 'activity' ? '*' : '（留空为长期）' }}</span><input v-model="editor.end" :readonly="readOnly" :required="editor.ruleType === 'activity'" :min="editor.start" class="form-input" type="date"></label>
        </div>
        <section class="points-section">
          <SectionHeader title="积分抵扣条件" :heading-level="3" />
          <fieldset class="points-options" :disabled="readOnly"><legend>用户组 *</legend><label v-for="group in legacyDemoGroups" :key="group.id" class="points-check"><input v-model="editor.userGroups" type="checkbox" :value="group.id">{{ group.name }}</label></fieldset>
          <label class="points-field"><span>积分抵现比例 *</span><div class="points-actions"><input v-model.number="editor.exchangePoints" :readonly="readOnly" class="form-input legacy-number" type="number" min="0.000001" step="any" required aria-label="每抵现1元所需积分"><span>积分可抵现 1 元（演示）</span></div></label>
          <fieldset class="points-options" :disabled="readOnly"><legend>抵现金额上限 *</legend><label class="points-check"><input type="radio" name="legacy-cap" :checked="editor.capMode === 'limited'" @change="setCapMode('limited')">限制</label><label class="points-check"><input type="radio" name="legacy-cap" :checked="editor.capMode === 'unlimited'" @change="setCapMode('unlimited')">不限制</label></fieldset>
          <label v-if="editor.capMode === 'limited'" class="points-field"><span>每笔订单最多抵扣订单金额的 *</span><div class="points-actions"><input v-model.number="editor.capPercent" :readonly="readOnly" class="form-input legacy-number" type="number" min="0" max="100" step="any" required aria-label="每笔订单抵扣百分比"><span>%（演示）</span></div></label>
          <fieldset class="points-options" :disabled="readOnly"><legend>积分抵现商品 *</legend><label class="points-check"><input type="radio" name="legacy-products" :checked="editor.productMode === 'codes'" @change="setProductMode('codes')">按产品 code</label><label class="points-check"><input type="radio" name="legacy-products" :checked="editor.productMode === 'filter'" @change="setProductMode('filter')">按产品组 + FA</label></fieldset>
          <label v-if="editor.productMode === 'codes'" class="points-field"><span>商品编码 *</span><textarea v-model="codeInput" :readonly="readOnly" class="form-input points-code-input" rows="3" required placeholder="最多不能超过1000个商品编码，用英文逗号分隔" /><span v-if="!readOnly" class="points-code-examples points-muted">仅支持演示编码：{{ codeExamples }}</span><span v-if="codeCheck?.error" class="points-code-feedback points-code-error">{{ codeCheck.error }}</span></label>
          <div v-else class="points-fields"><PointsSelect v-model="editor.group" label="产品组 *" :disabled="readOnly" :options="groupOptions" /><PointsSelect v-model="editor.fa" label="FA *" :disabled="readOnly" :options="faOptions" /><p class="points-muted points-field-full">仅使用现有合成商品库中的产品组与 FA，选择两项的交集。</p></div>
        </section>
        <div v-if="formError" class="points-notice points-danger" role="alert">{{ formError }}</div>
      </form>
      <template #actions><button class="btn btn-secondary" type="button" @click="closeEditor()">{{ readOnly ? '关闭' : '取消' }}</button><button v-if="!readOnly" class="btn btn-primary" type="submit" form="legacy-rule-form" :disabled="!canConfigure">保存</button></template>
    </PointsDialog>
    <PointsDialog v-if="discardConfirm" title="放弃未保存的修改？" description="关闭后不会保存当前规则表单。" @close="discardConfirm = false"><template #actions><button class="btn btn-secondary" type="button" @click="discardConfirm = false">继续编辑</button><button class="btn btn-primary" type="button" @click="closeEditor(true)">放弃修改</button></template></PointsDialog>
    <PointsDialog v-if="endingRule && canView" title="提前结束演示规则？" :description="`${endingRule.name}（${endingRule.id}）`" @close="endingId = ''"><p>该演示规则将仅允许查看，操作记录和历史快照会保留。此操作只影响当前浏览器，不改变真实商城规则。</p><template #actions><button class="btn btn-secondary" type="button" @click="endingId = ''">取消</button><button class="btn btn-primary" type="button" :disabled="!canConfigure" @click="confirmEnd">提前结束</button></template></PointsDialog>
  </section>
</template>

<style scoped src="./points.css"></style>
<style scoped>
.legacy-number {
  max-width: 160px;
}
.legacy-rule-actions {
  justify-content: flex-end;
}
</style>
