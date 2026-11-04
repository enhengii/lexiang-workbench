<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import SectionHeader from '@/components/content/SectionHeader.vue'
import ContentTabs from '@/components/content/ContentTabs.vue'
import DataTable from '@/components/content/DataTable.vue'
import ListSurface from '@/components/content/ListSurface.vue'
import StatusTag from '@/components/content/StatusTag.vue'
import MetricGrid from '@/components/content/MetricGrid.vue'
import MetricCard from '@/components/content/MetricCard.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import PointsDialog from './PointsDialog.vue'
import {
  calculate,
  ordersFor,
  activityStatus,
  payoutDate,
  activeProducts,
  number as n,
  type Activity,
  type Calculated,
  type RecordItem
} from '@/services/activityPoints'
import { exportPointsCsv } from './useActivityPointsDemo'

const props = defineProps<{
  activity: Activity
  records: RecordItem[]
  date: string
  canConfigure: boolean
  canExtend: boolean
  canExport: boolean
  canSettle: boolean
  resultVersion: number
}>()
const emit = defineEmits<{
  back: []
  edit: []
  extend: []
  simulate: []
  retry: []
  settings: []
  notice: [message: string]
}>()
const tab = ref('企业统计')
const query = ref('')
const enterprise = ref('')
const account = ref('')
const orderId = ref('')
const tabs = [
  '企业统计',
  '账号明细',
  '订单明细',
  '发放记录',
  '排除与异常',
  '配置详情',
  '操作日志'
].map((key) => ({ key, label: key }))
const rows = computed(() => calculate(props.activity, ordersFor(props.activity), props.date))
const records = computed(() =>
  props.records.filter((row) => row.key.startsWith(`${props.activity.id}:`))
)
const status = computed(() => activityStatus(props.activity, props.date))
const orderPointsLabel = computed(() => status.value === '已结束' ? '应获得活动积分' : '预计活动积分')
const orderPoints = (row: Calculated) =>
  !row.eligible ? '不适用' : row.issue ? '待核对' : n(row.delta)
const orderStatus = (row: Calculated) =>
  !row.eligible ? '不参与' : row.issue ? '待核对' : status.value === '已结束' ? '可计算' : '累计中'
const sum = (data: Calculated[], key: 'target' | 'paid' | 'delta') =>
  data.filter((row) => row.eligible && !row.issue).reduce((total, row) => total + row[key], 0)
const eligible = computed(() => rows.value.filter((row) => row.eligible))
const visible = computed(() =>
  rows.value.filter(
    (row) =>
      (!enterprise.value || row.enterpriseId === enterprise.value) &&
      (!account.value || row.account === account.value) &&
      `${row.id} ${row.account} ${row.enterprise} ${row.enterpriseId} ${row.sku}`
        .toLowerCase()
        .includes(query.value.toLowerCase())
  )
)
const visibleRecords = computed(() =>
  records.value.filter((record) => visible.value.some((row) => row.id === record.orderId))
)
const order = computed(() => rows.value.find((row) => row.id === orderId.value))
const orderRecord = computed(() => records.value.find((row) => row.orderId === orderId.value))
const groups = computed(() =>
  [...new Set(eligible.value.map((row) => row.enterpriseId))]
    .map((id) => {
      const orders = eligible.value.filter((row) => row.enterpriseId === id)
      return {
        id,
        name: orders[0].enterprise,
        accounts: `${new Set(orders.map((row) => row.account)).size} 个账号`,
        quantity: `${n(orders[0].enterpriseQuantity)} 台`,
        amount: `¥ ${n(orders[0].enterpriseAmount)}`,
        multiplier: orders[0].multiplier ? `${orders[0].multiplier} 倍` : '未达档',
        points: n(sum(orders, 'delta')),
        status: orders.some((row) => row.issue) ? '待核对' : '可计算',
        secondary: id
      }
    })
    .filter(
      (row) =>
        (!enterprise.value || row.id === enterprise.value) &&
        `${row.name} ${row.id}`.toLowerCase().includes(query.value.toLowerCase())
    )
)
const accounts = computed(() =>
  [...new Set(visible.value.filter((row) => row.eligible).map((row) => row.account))].map((id) => {
    const orders = visible.value.filter((row) => row.account === id && row.eligible)
    return {
      id,
      name: id,
      secondary: orders[0].enterprise,
      count: orders.length,
      quantity: n(orders.reduce((total, row) => total + row.netQuantity, 0)),
      amount: `¥ ${n(orders.reduce((total, row) => total + row.netReceipt, 0))}`,
      target: n(sum(orders, 'target')),
      paid: orders.some((row) => row.paidBase === null || row.paidMember === null)
        ? '待核对'
        : n(sum(orders, 'paid')),
      points: orders.some((row) => row.issue) ? '待核对' : n(sum(orders, 'delta'))
    }
  })
)
const orderRows = computed(() =>
  visible.value.map((row) => ({
    id: row.id,
    name: row.id,
    secondary: row.account,
    product: row.sku,
    enterprise: row.enterprise,
    quantity: n(row.netQuantity),
    amount: `¥ ${n(row.netReceipt)}`,
    points: orderPoints(row),
    status: orderStatus(row),
    issue: row.issue
  }))
)
const payoutRows = computed(() =>
  visibleRecords.value.map((row) => ({
    id: row.orderId,
    name: row.orderId,
    secondary: row.account,
    points: n(row.points),
    posted: row.status === '成功' ? n(row.points) : '0',
    status: row.status,
    time: row.time,
    batch: row.batch,
    transaction: row.transaction || row.reason,
    attempts: row.attempts
  }))
)
const issueRows = computed(() =>
  visible.value
    .filter((row) => row.issue)
    .map((row) => ({
      id: row.id,
      name: row.id,
      secondary: row.account,
      enterprise: row.enterprise,
      status: row.eligible ? '计算异常' : '已排除',
      issue: row.issue,
      handling: row.eligible ? '暂停补发，待核对' : '不参与本次补发'
    }))
)
type Column = { key: string; label: string; align?: 'left' | 'right' }
const numeric = (key: string, label: string): Column => ({ key, label, align: 'right' })
const columns = computed<Column[]>(() => {
  if (tab.value === '企业统计')
    return [
      { key: 'name', label: '企业名称 / 标识' },
      { key: 'accounts', label: '下单账号' },
      numeric('quantity', '累计有效台数'),
      numeric('amount', '累计净收款'),
      numeric('multiplier', '命中档位'),
      numeric('points', '活动应补'),
      { key: 'status', label: '核对状态' },
      { key: 'actions', label: '操作' }
    ]
  if (tab.value === '账号明细')
    return [
      { key: 'name', label: 'Lenovo ID / 企业' },
      numeric('count', '有效订单'),
      numeric('quantity', '有效台数'),
      numeric('amount', '实际净收款'),
      numeric('target', '可计算应发'),
      numeric('paid', '实际已发'),
      numeric('points', '活动应补'),
      { key: 'actions', label: '操作' }
    ]
  if (tab.value === '发放记录')
    return [
      { key: 'name', label: '订单号 / 下单账号' },
      numeric('points', '应补积分'),
      numeric('posted', '实际入账'),
      { key: 'status', label: '状态' },
      { key: 'time', label: '处理时间' },
      { key: 'batch', label: '批次' },
      { key: 'transaction', label: '积分流水 / 原因' },
      numeric('attempts', '处理次数'),
      { key: 'actions', label: '操作' }
    ]
  if (tab.value === '排除与异常')
    return [
      { key: 'name', label: '订单号 / Lenovo ID' },
      { key: 'enterprise', label: '企业' },
      { key: 'status', label: '分类' },
      { key: 'issue', label: '原因' },
      { key: 'handling', label: '处理方式' },
      { key: 'actions', label: '操作' }
    ]
  return [
    { key: 'name', label: '订单号 / Lenovo ID' },
    { key: 'product', label: '商品' },
    { key: 'enterprise', label: '企业' },
    numeric('amount', '有效金额'),
    numeric('quantity', '有效台数'),
    numeric('points', orderPointsLabel.value),
    { key: 'status', label: '核对状态' },
    { key: 'actions', label: '操作' }
  ]
})
const tableRows = computed<Array<Record<string, unknown>>>(() =>
  tab.value === '企业统计'
    ? groups.value
    : tab.value === '账号明细'
      ? accounts.value
      : tab.value === '发放记录'
        ? payoutRows.value
        : tab.value === '排除与异常'
          ? issueRows.value
          : orderRows.value
)
function action(id: string) {
  if (tab.value === '企业统计') {
    enterprise.value = id
    account.value = ''
    tab.value = '账号明细'
  } else if (tab.value === '账号明细') {
    account.value = id
    tab.value = '订单明细'
  } else orderId.value = id
  query.value = ''
}
function resetFilters() {
  enterprise.value = ''
  account.value = ''
  query.value = ''
}
function tone(value: unknown): 'success' | 'warning' | 'danger' | 'neutral' {
  return ['成功', '可计算'].includes(String(value))
    ? 'success'
    : ['失败', '计算异常'].includes(String(value))
      ? 'danger'
      : value === '待核对'
        ? 'warning'
        : 'neutral'
}
function download() {
  if (!props.canExport) {
    emit('notice', '当前账号没有活动积分导出权限。')
    return
  }
  if (tab.value === '发放记录')
    exportPointsCsv(
      `${props.activity.name}-发放记录`,
      [
        '活动编号',
        '活动名称',
        '订单号',
        'Lenovo ID',
        '应补积分',
        '实际入账',
        '状态',
        '时间',
        '批次',
        '积分流水号',
        '处理次数',
        '失败原因',
        '处理历史'
      ],
      visibleRecords.value.map((row) => [
        props.activity.id,
        props.activity.name,
        row.orderId,
        row.account,
        row.points,
        row.status === '成功' ? row.points : 0,
        row.status,
        row.time,
        row.batch,
        row.transaction,
        row.attempts,
        row.reason,
        row.history.join('；')
      ])
    )
  else {
    const exportRows =
      tab.value === '排除与异常' ? visible.value.filter((row) => row.issue) : visible.value
    exportPointsCsv(
      `${props.activity.name}-订单明细`,
      [
        '活动编号',
        '活动名称',
        '来源',
        '企业标识',
        '企业名称',
        'Lenovo ID',
        '订单',
        '商品编码',
        '有效金额',
        '有效台数',
        orderPointsLabel.value,
        '核对状态',
        '原因'
      ],
      exportRows.map((row) => [
        props.activity.id,
        props.activity.name,
        '活动积分补发（演示）',
        row.enterpriseId,
        row.enterprise,
        row.account,
        row.id,
        row.sku,
        row.netReceipt,
        row.netQuantity,
        !row.eligible ? '不适用' : row.issue ? '待核对' : row.delta,
        orderStatus(row),
        row.issue
      ])
    )
  }
  emit('notice', '已导出当前筛选范围的演示明细。')
}
watch(tab, () => {
  query.value = ''
})
watch(
  () => props.resultVersion,
  () => {
    tab.value = '发放记录'
    resetFilters()
  }
)
</script>
<template>
  <div class="points-flow">
    <ContentPageHeader
      :title="activity.name"
      :description="`${activity.id} · ${activity.start} 至 ${activity.end} · 计划发放 ${payoutDate(activity)}`"
    >
      <template #status><StatusTag :tone="status === '进行中' ? 'success' : 'neutral'">{{
        status
      }}</StatusTag></template>
      <template #actions><button class="btn btn-secondary" @click="emit('back')">返回列表</button><button
        v-if="canExtend && status === '进行中'"
        class="btn btn-secondary"
        @click="emit('extend')"
      >
        活动延期</button><button
        v-if="canConfigure && ['草稿', '待开始'].includes(status)"
        class="btn btn-secondary"
        @click="emit('edit')"
      >
        编辑配置</button><button
        v-if="canSettle && !activity.draft"
        class="btn btn-primary"
        @click="emit('simulate')"
      >
        演示自动发放
      </button></template>
    </ContentPageHeader>
    <div class="points-demo-strip" data-flow-role="notice">
      <div>
        <strong>演示数据 · 不产生真实积分</strong><span class="points-secondary">当前演示日期 {{ date }}；{{
          status === '已结束' ? '结算统计' : '当前统计，预计积分不代表最终到账结果'
        }}。</span>
      </div>
      <button class="points-link" @click="emit('settings')">查看演示口径</button>
    </div>
    <MetricGrid data-flow-role="summary"><MetricCard
      label="参与企业 / 下单账号"
      :value="`${new Set(eligible.map((row) => row.enterpriseId)).size} / ${new Set(eligible.map((row) => row.account)).size}`"
    /><MetricCard
      label="应发总积分 / 实际已发"
      :value="n(sum(rows, 'target'))"
      :meta="`订单实际已发 ${n(sum(rows, 'paid'))} 分`"
    /><MetricCard
      :label="status === '已结束' ? '应发活动积分' : '预计活动积分'"
      :value="n(sum(rows, 'delta'))"
      primary
    /><MetricCard
      label="已发活动积分"
      :value="
        n(
          records
            .filter((row) => row.status === '成功')
            .reduce((total, row) => total + row.points, 0)
        )
      "
      :meta="`${records.filter((row) => row.status === '失败').length} 笔发放失败 · ${rows.filter((row) => row.eligible && row.issue).length} 笔计算异常`"
    /></MetricGrid>
    <p class="points-muted" data-flow-role="notice">
      活动期间按企业累计，结束后按订单核算，系统于 {{ payoutDate(activity) }} 自动发放至下单账号；异常单独核对，不自动扣减负差额。
    </p>
    <ListSurface data-flow-role="main">
      <template #tabs><ContentTabs v-model="tab" :items="tabs" label="活动详情" /></template>
      <template v-if="!['配置详情', '操作日志'].includes(tab)" #toolbar><div class="points-toolbar">
                                                                  <label class="points-field">搜索明细<input
                                                                    v-model="query"
                                                                    class="form-input"
                                                                    type="search"
                                                                    placeholder="企业、账号、订单或商品"
                                                                  /></label>
                                                                  <div class="points-actions">
                                                                    <button
                                                                      v-if="enterprise || account || query"
                                                                      class="btn btn-secondary"
                                                                      @click="resetFilters"
                                                                    >
                                                                      清除筛选</button><button
                                                                      v-if="canSettle && tab === '发放记录' && records.some((row) => row.status === '失败')"
                                                                      class="btn btn-secondary"
                                                                      @click="emit('retry')"
                                                                    >
                                                                      演示重试失败记录</button><button v-if="canExport" class="btn btn-secondary" @click="download">
                                                                      {{ tab === '发放记录' ? '导出筛选记录' : '导出筛选订单' }}
                                                                    </button>
                                                                  </div>
                                                                </div>
        <p v-if="enterprise || account" class="points-muted">
          当前范围：{{
            rows.find((row) => row.enterpriseId === enterprise)?.enterprise || '全部企业'
          }}{{ account ? ` / ${account}` : '' }}
        </p></template>
      <div v-if="!['配置详情', '操作日志'].includes(tab)" role="tabpanel" :aria-label="tab">
        <DataTable
          v-if="tableRows.length"
          :columns="columns"
          :rows="tableRows"
          row-key="id"
          :caption="tab"
          density="two-line"
        >
          <template #cell-name="{ row }"><button class="points-link points-name" @click="action(String(row.id))">
            {{ row.name }}</button><small class="points-secondary">{{ row.secondary }}</small></template>
          <template #cell-status="{ value }"><StatusTag :tone="tone(value)">{{ value }}</StatusTag></template>
          <template #cell-points="{ value }"><span class="points-highlight points-numeric">{{ value }}</span></template>
          <template #cell-actions="{ row }"><button class="points-link" @click="action(String(row.id))">
            {{ tab === '企业统计' ? '查看账号' : tab === '账号明细' ? '查看订单' : '查看详情' }}
          </button></template>
        </DataTable>
        <FeedbackState
          v-else
          state="filtered-empty"
          :title="tab === '发放记录' && !records.length ? '暂无发放记录' : '没有匹配的记录'"
          :description="
            tab === '发放记录' && !records.length
              ? `计划于 ${payoutDate(activity)} 统一处理，可通过演示结算体验后续流程。`
              : '请清除筛选条件，或切换其他视图。'
          "
        />
        <p v-if="tab === '排除与异常'" class="points-inner points-muted">
          演示排除订单不贡献企业累计；正式贡献口径待确认。缺失已发记录与负差额均暂停补发。
        </p>
        <p v-if="tab === '发放记录'" class="points-inner points-muted">
          同活动、同订单的成功记录不重复入账。状态未知时应先核对实际流水，不能直接重发。
        </p>
      </div>
      <div
        v-else-if="tab === '配置详情'"
        class="points-inner points-form-flow"
        role="tabpanel"
        aria-label="配置详情"
      >
        <section class="points-section">
          <SectionHeader title="基本信息" />
          <dl class="points-definition">
            <dt>活动名称</dt>
            <dd>{{ activity.name }}</dd>
            <dt>活动周期</dt>
            <dd>{{ activity.start }} 至 {{ activity.end }}</dd>
            <dt>积分渠道 / 主体</dt>
            <dd>企业购积分 / 企业维度跨账号累计</dd>
            <dt>累计方式</dt>
            <dd>{{ activity.mode === 'quantity' ? '满台数' : '满金额' }}</dd>
          </dl>
        </section>
        <section class="points-section">
          <SectionHeader title="商品与档位" />
          <dl class="points-definition">
            <dt>商品选择</dt>
            <dd>
              {{
                activity.productMode === 'codes'
                  ? '按商品编码'
                  : `FA ${activity.fa} ∩ 产品组 ${activity.group}`
              }}
            </dd>
            <dt>参与商品</dt>
            <dd class="points-tag-list">
              <span
                v-for="product in activeProducts(activity)"
                :key="product.code"
                class="points-tag"
              >{{ product.code }} · {{ product.name }}</span>
            </dd>
            <template v-if="activity.productMode === 'filter'">
              <dt>排除商品</dt>
              <dd>{{ activity.excluded.join('、') || '无' }}</dd>
            </template>
            <dt>企业档位</dt>
            <dd class="points-tag-list">
              <span v-for="tier in activity.tiers" :key="tier.threshold" class="points-tag">满 {{ n(tier.threshold) }} {{ activity.mode === 'quantity' ? '台' : '元' }}，享
                {{ tier.multiplier }} 倍</span>
            </dd>
          </dl>
        </section>
        <section class="points-section">
          <SectionHeader title="发放安排" />
          <dl class="points-definition">
            <dt>计划发放</dt>
            <dd>{{ payoutDate(activity) }} 10:00（演示）</dd>
            <dt>延迟安排</dt>
            <dd>
              结束后 {{ activity.delay }}
              {{ activity.calendar === 'natural' ? '个自然日' : '个周一至周五日，未含节假日调休' }}
            </dd>
            <dt>发放说明</dt>
            <dd>{{ activity.description || '活动积分补发' }}</dd>
            <dt>计算关系</dt>
            <dd>净收款 ÷ 100 × 企业最终倍数，舍去小数后，减订单实际已发积分。</dd>
          </dl>
        </section>
      </div>
      <div v-else class="points-inner" role="tabpanel" aria-label="操作日志">
        <ul v-if="activity.logs.length" class="points-log">
          <li v-for="(log, index) in activity.logs" :key="index">{{ log }}</li>
        </ul>
        <FeedbackState
          v-else
          state="empty"
          title="暂无操作日志"
          description="保存配置、延期和处理发放后将记录操作。"
        />
      </div>
    </ListSurface>
    <PointsDialog
      v-if="order"
      :title="tab === '发放记录' ? '发放记录详情' : '订单积分详情'"
      :description="`${order.id} · ${order.account}`"
      wide
      @close="orderId = ''"
    >
      <div class="points-form-flow">
        <div class="points-notice">
          <strong>{{ order.enterprise }}</strong><span class="points-secondary">{{ order.enterpriseId }} · {{ order.sku }}</span>
        </div>
        <p v-if="order.issue" class="points-notice points-warning">
          {{ order.issue }}，不生成补发入账。
        </p>
        <section class="points-section">
          <dl class="points-definition">
            <dt>有效金额</dt>
            <dd>¥ {{ n(order.netReceipt) }}</dd>
            <dt>有效台数</dt>
            <dd>{{ n(order.netQuantity) }} 台</dd>
            <dt>{{ orderPointsLabel }}</dt>
            <dd>{{ orderPoints(order) }}<template v-if="order.eligible && !order.issue"> 分</template></dd>
          </dl>
        </section>
        <section v-if="tab === '发放记录'" class="points-section">
          <SectionHeader title="发放追溯" />
          <dl v-if="orderRecord" class="points-definition">
            <dt>发放状态</dt>
            <dd>
              <StatusTag :tone="tone(orderRecord.status)">{{ orderRecord.status }}</StatusTag>
            </dd>
            <dt>实际入账</dt>
            <dd>
              {{ orderRecord.status === '成功' ? n(orderRecord.points) : 0 }} 分 →
              {{ orderRecord.account }}
            </dd>
            <dt>批次</dt>
            <dd>{{ orderRecord.batch }}</dd>
            <dt>积分流水 / 原因</dt>
            <dd>{{ orderRecord.transaction || orderRecord.reason }}</dd>
            <dt>处理历史</dt>
            <dd>
              <p v-for="(history, index) in orderRecord.history" :key="index">{{ history }}</p>
            </dd>
          </dl>
          <p v-else class="points-muted">暂无活动发放记录。系统计划于 {{ payoutDate(activity) }} 自动发放；“演示自动发放”仅模拟时间推进，不产生真实积分。</p>
        </section>
      </div>
    </PointsDialog>
  </div>
</template>
<style scoped src="./points.css"></style>
