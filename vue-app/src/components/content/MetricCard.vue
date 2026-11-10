<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value?: string | number
    unit?: string
    meta?: string
    trend?: string
    state?: 'loading' | 'value' | 'zero' | 'missing' | 'stale' | 'error'
    primary?: boolean
  }>(),
  { state: 'value', primary: false, value: undefined, unit: '', meta: '', trend: '' }
)
</script>

<template>
  <article
    class="cs-metric-card"
    :class="[{ 'is-primary': primary, 'is-stale': state === 'stale' }]"
    :aria-busy="state === 'loading' || undefined"
  >
    <span class="cs-metric-card__label">{{ label }}</span>
    <div class="cs-metric-card__value">
      <template v-if="state === 'loading'">加载中</template>
      <template v-else-if="state === 'missing'">—</template>
      <template v-else-if="state === 'error'">读取失败</template>
      <template v-else><slot name="value">{{ value }}<small v-if="unit">{{ unit }}</small></slot></template>
    </div>
    <div v-if="meta || trend" class="cs-metric-card__meta">
      <span>{{ meta }}</span><span>{{ trend }}</span>
    </div>
  </article>
</template>

<style scoped>
.cs-metric-card {
  min-width: 0;
  padding: var(--space-4, 16px);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.cs-metric-card__label,
.cs-metric-card__meta {
  color: var(--color-text-secondary);
  font-size: var(--text-xs, 12px);
}
.cs-metric-card__value {
  margin-top: var(--space-2, 8px);
  font-size: var(--text-2xl, 24px);
  font-weight: 700;
  line-height: 1.25;
  color: var(--color-text);
}
.cs-metric-card.is-primary .cs-metric-card__value {
  color: var(--color-primary);
}
.cs-metric-card__value small {
  margin-left: var(--space-1, 4px);
  font-size: var(--text-sm, 13px);
}
.cs-metric-card__meta {
  display: flex;
  gap: var(--space-2, 8px);
  margin-top: var(--space-2, 8px);
}
.cs-metric-card.is-stale {
  opacity: 0.7;
}
</style>
