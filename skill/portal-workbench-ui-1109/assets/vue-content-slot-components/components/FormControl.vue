<script setup lang="ts">
import { computed, inject } from 'vue'
const filterLayout = inject<'stacked' | 'placeholder'>('cs-filter-label-layout', 'stacked')
const props = withDefaults(defineProps<{
  modelValue?: string | number
  label: string
  labelLayout?: 'stacked' | 'placeholder'
  kind?: 'text' | 'search' | 'number' | 'select' | 'date' | 'textarea'
  size?: 'compact' | 'default'
  placeholder?: string
  helper?: string
  error?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  options?: Array<{ label: string; value: string | number }>
}>(), { kind: 'text', size: 'default', disabled: false, readonly: false, required: false, options: () => [] })
const layout = computed(() => props.labelLayout ?? filterLayout)
const displayOption = (option: { label: string; value: string | number }) =>
  layout.value === 'placeholder' ? `${props.label} - ${option.value === 'all' ? '全部' : option.label}` : option.label
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const update = (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value)
</script>

<template>
  <label class="cs-form-control" :class="[`cs-form-control--${layout === 'placeholder' ? 'default' : size}`, { 'is-invalid': error, 'cs-form-control--placeholder': layout === 'placeholder' }]">
    <span class="cs-form-control__label">{{ label }}<span v-if="required" aria-hidden="true"> *</span></span>
    <textarea v-if="kind === 'textarea'" class="cs-form-control__input" :value="modelValue" :placeholder="placeholder || (layout === 'placeholder' ? label : undefined)" :disabled="disabled" :readonly="readonly" :required="required" :aria-invalid="!!error" @input="update" />
    <select v-else-if="kind === 'select'" class="cs-form-control__input" :value="modelValue" :disabled="disabled" :required="required" :aria-invalid="!!error" @change="update">
      <option v-for="option in options" :key="String(option.value)" :value="option.value">{{ displayOption(option) }}</option>
    </select>
    <span v-else-if="kind === 'date' && layout === 'placeholder'" class="cs-form-control__date" :class="{ 'is-empty': !modelValue }">
      <input class="cs-form-control__input" type="date" :value="modelValue" :aria-label="label" :disabled="disabled" :readonly="readonly" :required="required" :aria-invalid="!!error" @input="update" />
      <span v-if="!modelValue" class="cs-form-control__date-placeholder" aria-hidden="true">{{ placeholder || label }}</span>
    </span>
    <input v-else class="cs-form-control__input" :type="kind" :value="modelValue" :placeholder="placeholder || (layout === 'placeholder' ? label : undefined)" :disabled="disabled" :readonly="readonly" :required="required" :aria-invalid="!!error" @input="update" />
    <span v-if="error || helper" class="cs-form-control__help" :class="{ 'is-error': error }">{{ error || helper }}</span>
  </label>
</template>
