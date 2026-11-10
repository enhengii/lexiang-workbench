<script setup lang="ts">
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
</script>

<template>
  <div class="sales-workbench-page">
    <ContentPageHeader title="销售工作台" description="销售业务的独立入口。" />
    <section class="card" aria-label="销售内容接入状态">
      <FeedbackState
        state="empty"
        title="销售内容待接入"
        description="当前仅开放工作台入口，销售页面内容尚未接入。"
      />
    </section>
  </div>
</template>

<style scoped>
.sales-workbench-page {
  display: grid;
  gap: var(--space-4, 16px);
  min-width: 0;
}

.sales-workbench-page > .card {
  margin: 0;
}
</style>
