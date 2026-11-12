<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string
  options?: Array<{ label: string; value: string }>
  label?: string
  disabled?: boolean
  loading?: boolean
}>(), { label: '时间范围', disabled: false, loading: false, options: () => [] })
const emit = defineEmits<{ 'update:modelValue': [value: string]; change: [value: string] }>()
const select = (value: string) => { emit('update:modelValue', value); emit('change', value) }
</script>

<template>
  <div class="cs-time-range" role="group" :aria-label="label">
    <button v-for="option in options" :key="option.value" type="button" :class="{ 'is-selected': option.value === modelValue }" :aria-pressed="option.value === modelValue" :disabled="disabled || loading" @click="select(option.value)">{{ option.label }}</button>
  </div>
</template>
