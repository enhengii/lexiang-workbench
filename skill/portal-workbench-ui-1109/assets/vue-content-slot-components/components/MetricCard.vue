<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  value?: string | number
  unit?: string
  meta?: string
  trend?: string
  state?: 'loading' | 'value' | 'zero' | 'missing' | 'stale' | 'error'
  primary?: boolean
}>(), { state: 'value', primary: false })
</script>

<template>
  <article class="cs-metric-card" :class="[{ 'is-primary': primary, 'is-stale': state === 'stale' }]" :aria-busy="state === 'loading' || undefined">
    <span class="cs-metric-card__label">{{ label }}</span>
    <div class="cs-metric-card__value">
      <template v-if="state === 'loading'">加载中</template>
      <template v-else-if="state === 'missing'">—</template>
      <template v-else-if="state === 'error'">读取失败</template>
      <template v-else>{{ value }}<small v-if="unit">{{ unit }}</small></template>
    </div>
    <div v-if="meta || trend" class="cs-metric-card__meta"><span>{{ meta }}</span><span>{{ trend }}</span></div>
  </article>
</template>
