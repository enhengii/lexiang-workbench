<template>
  <div class="poc-demo-layout">
    <nav class="poc-demo-banner" aria-label="POC 演示导航">
      <span>POC 演示：仅使用模拟数据，不改变真实账号及权限。</span>
      <div class="poc-demo-actions">
        <RouterLink to="/login?mode=scenarios">选择演示场景</RouterLink>
        <RouterLink to="/agent/permissions?module=approval">演示审批工作台</RouterLink>
        <a :href="normalAppBase + 'login?loginType=external&pocAccount=admin'">返回正常登录</a>
      </div>
    </nav>
    <div class="poc-demo-content"><RouterView /></div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { normalAppBase } from '@/config/runtimeMode'
</script>

<style scoped>
.poc-demo-layout { display: flex; flex: 1; min-width: 0; width: 100%; flex-direction: column; height: 100dvh; background: var(--color-surface); }
.poc-demo-content { flex: 1; min-height: 0; min-width: 0; overflow: auto; }
.poc-demo-content :deep(#login-screen) { position: static; min-height: 100%; padding: var(--space-4, 16px); }
.poc-demo-content :deep(.permission-page-vue:not(.standalone-approval-page)) { padding: 20px 24px; }
.poc-demo-content :deep(.adfs-login-page) { min-height: 100%; }
.poc-demo-content :deep(.permission-page-vue.standalone-approval-page) { height: 100%; }
.poc-demo-banner {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2, 8px);
  padding: var(--space-3, 12px) var(--space-4, 16px);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-subtle);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}
.poc-demo-actions { display: flex; flex-wrap: wrap; gap: var(--space-4, 16px); }
.poc-demo-actions a { color: var(--color-primary); }
</style>
