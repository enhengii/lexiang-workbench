<script setup lang="ts">
withDefaults(defineProps<{ size?: 'compact' | 'default'; disabled?: boolean }>(), { size: 'default', disabled: false })
</script>

<template>
  <section class="cs-section-card" :class="[`cs-section-card--${size}`, { 'is-disabled': disabled }]">
    <slot name="header" />
    <div class="cs-section-card__body"><slot /></div>
    <footer v-if="$slots.footer" class="cs-section-card__footer"><slot name="footer" /></footer>
  </section>
</template>
