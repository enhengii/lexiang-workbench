<script setup lang="ts">
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import type { ECharts, EChartsOption } from 'echarts'
import FeedbackState from '@/components/content/FeedbackState.vue'

type TrendRow = { date: string; loginUsers: number; aiUsers: number; queries: number; calls: number }
const props = defineProps<{ rows: TrendRow[]; mode: 'users' | 'calls' }>()
const host = ref<HTMLElement | null>(null)
const failed = ref(false)
const label = computed(() => `${props.mode === 'users' ? '每日访问与AI互动用户数' : '每日Query与Skill调用次数'}，${props.rows[0]?.date || ''}至${props.rows[props.rows.length - 1]?.date || ''}，示例数据`)
let chart: ECharts | null = null
let observer: ResizeObserver | null = null
let active = false
let disposed = false
let generation = 0

function render() {
  if (!active || !chart || !host.value) return
  const styles = getComputedStyle(host.value)
  const token = (name: string) => styles.getPropertyValue(name).trim()
  const color = token('--color-primary') || styles.color
  const muted = token('--color-text-secondary') || styles.color
  const unit = Number.parseFloat(token('--space-4')) || 16
  const names = props.mode === 'users' ? ['访问用户', 'AI互动用户'] : ['Query数', 'Skill调用']
  const values = props.mode === 'users'
    ? [props.rows.map(row => row.loginUsers), props.rows.map(row => row.aiUsers)]
    : [props.rows.map(row => row.queries), props.rows.map(row => row.calls)]
  const option: EChartsOption = {
    animationDuration: 200,
    color: [token('--chart-1') || color, token('--chart-2') || token('--color-info') || color],
    textStyle: { fontFamily: styles.fontFamily, fontSize: Number.parseFloat(styles.fontSize), color: muted },
    tooltip: { trigger: 'axis', confine: true },
    legend: { top: 0, right: 0, itemWidth: unit, itemHeight: unit / 2, textStyle: { color: muted } },
    grid: { left: unit / 2, right: unit, top: unit * 2.5, bottom: unit / 2, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.rows.map(row => row.date),
      axisLine: { lineStyle: { color: token('--color-border') || muted } },
      axisTick: { show: false },
      axisLabel: { color: muted, hideOverlap: true, formatter: (value: string) => value.slice(5) }
    },
    yAxis: {
      type: 'value', minInterval: 1,
      axisLabel: { color: muted },
      splitLine: { lineStyle: { color: token('--color-border-subtle') || muted, type: 'dashed' } }
    },
    series: names.map((name, index) => ({ name, type: 'line', data: values[index], smooth: false, showSymbol: props.rows.length <= 7, symbolSize: 5, lineStyle: { width: 2 } }))
  }
  chart.setOption(option, { notMerge: true })
}

async function activate() {
  if (active || disposed) return
  active = true
  const current = ++generation
  await nextTick()
  try {
    if (!chart) {
      const runtime = await import('echarts')
      if (!active || disposed || current !== generation || !host.value) return
      chart = runtime.init(host.value)
    }
    if (!active || disposed || current !== generation || !host.value) return
    failed.value = false
    render()
    chart.resize()
    observer ??= new ResizeObserver(() => { if (active) chart?.resize() })
    observer.observe(host.value)
  } catch {
    if (active && !disposed && current === generation) failed.value = true
  }
}
function deactivate() {
  active = false
  generation += 1
  observer?.disconnect()
}
function retry() {
  deactivate()
  chart?.dispose()
  chart = null
  failed.value = false
  void activate()
}
watch(() => [props.rows, props.mode], render, { deep: true })
onMounted(activate)
onActivated(activate)
onDeactivated(deactivate)
onBeforeUnmount(() => {
  disposed = true
  deactivate()
  chart?.dispose()
  chart = null
  observer = null
})
</script>

<template>
  <div class="usage-trend">
    <div ref="host" class="usage-trend-host" role="img" :aria-label="label" :aria-hidden="failed || undefined"></div>
    <FeedbackState v-if="failed" class="usage-chart-error" state="error" title="趋势图加载失败" description="可重试加载，其他聚合指标仍可查看。">
      <template #action><button type="button" class="btn btn-secondary" @click="retry">重试</button></template>
    </FeedbackState>
  </div>
</template>

<style scoped>
.usage-trend { position: relative; width: 100%; min-width: 0; height: calc(var(--space-6, 24px) * 12); color: var(--color-text-secondary); font-family: var(--font-body); font-size: var(--text-xs, 12px); }
.usage-trend-host { width: 100%; height: 100%; min-width: 0; }
.usage-chart-error { position: absolute; inset: 0; background: var(--color-surface); }
</style>
