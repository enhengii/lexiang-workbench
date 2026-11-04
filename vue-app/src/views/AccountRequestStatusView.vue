<template>
  <main class="account-status-page applicant-status-page">
    <section class="account-status-card">
      <div class="status-brand">
        <div class="status-logo">L</div>
        <span>联想乐享</span>
      </div>

      <div v-if="request && progress" class="status-content applicant-status-content">
        <ApplicationProgressSummary :title="progress.title" :status="progress.status" :tone="progress.tone" :steps="progress.steps">
          申请单号：<b>{{ request.id }}</b>。{{ progress.description }}
        </ApplicationProgressSummary>

        <div class="status-actions">
          <button type="button" class="btn btn-secondary" :disabled="loading" @click="refreshRequests">{{ loading ? '刷新中…' : '刷新状态' }}</button>
        </div>
      </div>

      <div v-else class="status-empty">
        <span class="status-eyebrow">{{ loading ? '正在查询' : '未找到申请' }}</span>
        <h1>{{ loading ? '正在查询申请进度' : '无法查询该申请进度' }}</h1>
        <p role="status">{{ loading ? '正在读取最新状态，请稍候…' : loadError || '请确认邮件中的申请单号和查询链接是否完整。该 POC 页面只展示当前浏览器本地生成的 mock 申请。' }}</p>
        <RouterLink :to="allowPocSimulation ? '/login?mode=scenarios' : '/login'">返回登录页</RouterLink>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { pocLocalStorage, pocStorageEventKey } from '@/services/pocStorage'
import { allowPocSimulation, permissionLabEnabled } from '@/config/runtimeMode'
import { labApi } from '@/services/permissionLab'
import ApplicationProgressSummary from '@/components/auth/ApplicationProgressSummary.vue'
import { applicationProgress, readApplicantProgress, APPLICANT_PROGRESS_KEY, PROGRESS_APPROVAL_ROWS_KEY } from '@/services/applicationProgress'

const STORAGE_KEY = 'leaibot-account-request-status-rows'
const route = useRoute()

const request = ref<any>(null)
const routeNodes = ref<string[]>()
const loadError = ref('')
const loading = ref(false)
let readVersion = 0
async function refreshRequests() {
  const version = ++readVersion
  loading.value = true
  loadError.value = ''
  try {
    const ticket = String(route.query.ticket || '')
    const token = String(route.query.token || '')
    let row = null
    let nodes: string[] | undefined
    if (permissionLabEnabled && route.query.source !== 'permissions') row = await labApi('/requests/' + encodeURIComponent(ticket))
    else if (route.query.source === 'permissions') {
      const result = readApplicantProgress(pocLocalStorage, ticket, token)
      row = result?.row || null
      nodes = result?.nodes
    } else if (ticket && token) {
      const rows = JSON.parse(pocLocalStorage.getItem(STORAGE_KEY) || '[]')
      if (!Array.isArray(rows)) throw new Error('申请记录格式异常，请重新进入申请进度。')
      row = rows.find((item: any) => item.id === ticket && item.token === token) || null
    }
    if (version !== readVersion) return
    request.value = row
    routeNodes.value = nodes
  } catch (error) {
    if (version !== readVersion) return
    request.value = null
    loadError.value = error instanceof Error ? error.message : '查询失败，请刷新重试'
  } finally {
    if (version === readVersion) loading.value = false
  }
}
function handleStorage(event: StorageEvent) {
  const key = pocStorageEventKey(event.key)
  if ([STORAGE_KEY, APPLICANT_PROGRESS_KEY, PROGRESS_APPROVAL_ROWS_KEY, null].includes(key)) refreshRequests()
}
onMounted(() => {
  refreshRequests()
  document.documentElement.classList.add('account-status-route')
  document.body.classList.add('account-status-route')
  window.addEventListener('storage', handleStorage)
  window.addEventListener('focus', refreshRequests)
})
onUnmounted(() => {
  readVersion++
  document.documentElement.classList.remove('account-status-route')
  document.body.classList.remove('account-status-route')
  window.removeEventListener('storage', handleStorage)
  window.removeEventListener('focus', refreshRequests)
})
watch(() => route.fullPath, () => { request.value = null; refreshRequests() })
const progress = computed(() => request.value ? applicationProgress(request.value, routeNodes.value) : null)
</script>

<style scoped>
:global(html.account-status-route),
:global(html.account-status-route body.account-status-route) { min-width: 0; overflow: hidden; }
:global(body.account-status-route) { display: block; }
:global(body.account-status-route #app) { display: block; width: 100%; min-width: 0; }
.account-status-page {
  width: 100%;
  height: 100vh;
  overflow: auto;
  min-height: 100vh;
  padding: 48px 24px;
  background: #f3f6fb;
  color: #172033;
  font-family: Arial, "Microsoft YaHei", sans-serif;
}

.account-status-card {
  width: min(960px, 100%);
  margin: 0 auto;
  border: 1px solid #dfe7f2;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.10);
  overflow: hidden;
}

.status-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #e6edf5;
  padding: 18px 28px;
  font-size: 16px;
  font-weight: 800;
}

.status-logo {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #e2231a;
  color: #fff;
}

.status-content,
.status-empty {
  padding: 30px 34px 36px;
}

.status-eyebrow {
  display: inline-flex;
  margin-bottom: 10px;
  color: #316dff;
  font-size: 13px;
  font-weight: 800;
}

.status-empty h1 {
  margin: 0;
  color: #101828;
  font-size: 28px;
  line-height: 1.3;
}

.status-empty p {
  margin: 10px 0 0;
  color: #5f6b7a;
  font-size: 14px;
  line-height: 1.7;
}


.status-empty a {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  margin-top: 20px;
  border-radius: 6px;
  padding: 0 16px;
  background: #316dff;
  color: #fff;
  font-weight: 800;
  text-decoration: none;
}

/* All applicant-facing request types share the first-access result layout. */
.applicant-status-page { box-sizing: border-box; padding: var(--space-8, 32px) var(--space-5, 20px); }
.applicant-status-page .account-status-card { width: min(980px, 100%); }
.applicant-status-page .status-brand { padding: var(--space-4, 16px) var(--space-7, 28px); font-size: var(--text-base, 14px); }
.applicant-status-content { box-sizing: border-box; width: min(860px, 100%); margin: 0 auto; padding: var(--space-14, 56px) var(--space-9, 36px); }
.status-actions { display: flex; flex-wrap: wrap; gap: var(--space-3, 12px); justify-content: flex-end; margin-top: var(--space-6, 24px); border-top: 1px solid var(--color-border-subtle); padding-top: var(--space-5, 20px); }

@media (max-width: 760px) {
  .applicant-status-page { padding: 0; }
  .applicant-status-page .account-status-card { border: 0; border-radius: 0; box-shadow: none; }
  .applicant-status-page .status-brand, .applicant-status-content { padding-inline: var(--space-5, 20px); }
}

@media (max-width: 720px) {
  .account-status-page {
    padding: 20px 12px;
  }

  .status-content,
  .status-empty {
    padding: 22px 18px 26px;
  }

}
</style>
