<script setup lang="ts">
const props = defineProps<{
  items: Array<{ key: string; label: string; count?: number; disabled?: boolean }>
  modelValue: string
  label?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [key: string] }>()
function navigate(event: KeyboardEvent, index: number) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const enabled = props.items.map((item, i) => ({ item, i })).filter(({ item }) => !item.disabled)
  if (!enabled.length) return
  const position = enabled.findIndex(({ i }) => i === index)
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? enabled.length - 1
        : (position + (event.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length
  emit('update:modelValue', enabled[next].item.key)
  const parent = (event.target as HTMLElement).parentElement
  parent?.querySelectorAll<HTMLButtonElement>('button')[enabled[next].i]?.focus()
}
</script>
<template>
  <div class="cs-content-tabs" role="tablist" :aria-label="label || '内容视图'">
    <button
      v-for="(item, index) in items"
      :key="item.key"
      class="cs-content-tabs__tab"
      type="button"
      role="tab"
      :aria-selected="item.key === modelValue"
      :tabindex="item.key === modelValue ? 0 : -1"
      :disabled="item.disabled"
      :class="{ 'is-selected': item.key === modelValue }"
      @click="emit('update:modelValue', item.key)"
      @keydown="navigate($event, index)"
    >
      {{ item.label }}<span v-if="item.count != null">（{{ item.count }}）</span>
    </button>
  </div>
</template>
<style scoped>
.cs-content-tabs {
  display: flex;
  gap: var(--space-5, 20px);
  min-width: 0;
  overflow-x: auto;
}
.cs-content-tabs button {
  display: inline-flex;
  align-items: baseline;
  flex: none;
  padding: var(--space-3, 12px) 0;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-secondary, var(--cs-text-secondary));
  font: inherit;
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;
  cursor: pointer;
}
.cs-content-tabs button.is-selected {
  border-bottom-color: var(--color-primary, var(--cs-primary));
  color: var(--color-primary, var(--cs-primary));
  font-weight: 600;
}
.cs-content-tabs button span {
  font: inherit;
  font-variant-numeric: tabular-nums;
}
.cs-content-tabs button:not(:disabled):hover {
  color: var(--color-primary, var(--cs-primary));
}
.cs-content-tabs button:focus-visible {
  outline: 2px solid var(--color-primary, var(--cs-primary));
  outline-offset: -2px;
}
.cs-content-tabs button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
