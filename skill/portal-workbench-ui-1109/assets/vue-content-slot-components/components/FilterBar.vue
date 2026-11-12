<script setup lang="ts">
import { provide } from 'vue'
provide('cs-filter-label-layout', 'placeholder')
withDefaults(defineProps<{ loading?: boolean; disabled?: boolean; expanded?: boolean; dirty?: boolean }>(), { loading: false, disabled: false, expanded: true, dirty: false })
defineEmits<{ query: []; reset: [] }>()
</script>

<template>
  <form class="cs-filter-bar" :aria-busy="loading || undefined" @submit.prevent="$emit('query')">
    <fieldset class="cs-filter-bar__fields" :disabled="disabled || loading"><slot /></fieldset>
    <div class="cs-filter-bar__actions">
      <slot name="summary" />
      <button class="cs-action-button cs-action-button--secondary cs-action-button--md" type="button" :disabled="disabled || loading || !dirty" @click="$emit('reset')">重置</button>
      <button class="cs-action-button cs-action-button--primary cs-action-button--md" type="submit" :disabled="disabled || loading">查询</button>
    </div>
  </form>
</template>
