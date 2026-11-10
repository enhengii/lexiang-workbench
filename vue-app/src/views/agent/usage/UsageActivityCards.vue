<script setup lang="ts">
import MetricGrid from '@/components/content/MetricGrid.vue'
import MetricCard from '@/components/content/MetricCard.vue'

type ActivityWindow = { dau: number | null; wau: number | null; mau: number | null }
const props = defineProps<{
  totalUsers: number | null
  windows: { login: ActivityWindow; ai: ActivityWindow }
}>()
const periods = [
  { key: 'dau', label: 'DAU', meta: '当日去重' },
  { key: 'wau', label: 'WAU', meta: '近7个自然日去重' },
  { key: 'mau', label: 'MAU', meta: '近30个自然日去重' }
] as const
const userTypes = [{ key: 'login', label: '登录' }, { key: 'ai', label: '互动' }] as const
const count = (value: number | null) => value == null ? '—' : value.toLocaleString('zh-CN')
function coverage(value: number | null) {
  return value == null || props.totalUsers == null || props.totalUsers <= 0
    ? '—' : `${(value / props.totalUsers * 100).toFixed(1)}%`
}
</script>

<template>
  <div class="usage-activity-cards">
    <MetricGrid :columns="4">
      <MetricCard label="总用户（有权限的）" :value="count(totalUsers)" :unit="totalUsers == null ? '' : '人'" meta="截至同日已获得使用权限的用户" />
      <MetricCard v-for="period in periods" :key="period.key" :label="period.label" :meta="period.meta">
        <template #value>
          <dl class="usage-activity-values">
            <div v-for="user in userTypes" :key="user.key" class="usage-activity-row">
              <dt>{{ user.label }}</dt>
              <dd><strong>{{ count(windows[user.key][period.key]) }}<span v-if="windows[user.key][period.key] != null" class="usage-activity-unit">人</span></strong><span class="usage-activity-rate">{{ coverage(windows[user.key][period.key]) }}</span></dd>
            </div>
          </dl>
        </template>
      </MetricCard>
    </MetricGrid>
    <p class="usage-activity-note">占比 = 活跃人数 ÷ 授权总用户数；登录、互动分别去重，不相加。无授权总数或分母为零时，占比显示“—”。</p>
  </div>
</template>

<style scoped>
.usage-activity-cards { display: grid; gap: var(--space-3, 12px); min-width: 0; }
.usage-activity-values { display: grid; gap: var(--space-2, 8px); margin: 0; }
.usage-activity-row { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: baseline; gap: var(--space-2, 8px); }
.usage-activity-row dt { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); font-weight: 400; }
.usage-activity-row dd { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: var(--space-1, 4px) var(--space-2, 8px); min-width: 0; margin: 0; font-variant-numeric: tabular-nums; }
.usage-activity-row strong { font-size: var(--text-2xl, 24px); font-weight: 700; }
.usage-activity-unit { margin-left: var(--space-1, 4px); color: var(--color-text-secondary); font-size: var(--text-sm, 13px); font-weight: 400; }
.usage-activity-rate { color: var(--color-text-secondary); font-size: var(--text-sm, 13px); font-weight: 400; }
.usage-activity-note { margin: 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); line-height: 1.65; }
</style>
