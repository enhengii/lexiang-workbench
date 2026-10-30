<template>
  <main class="enable-request-page">
    <section class="enable-request-card">
      <header class="enable-request-header">
        <div class="brand-lockup"><span class="brand-mark">L</span><b>联想乐享</b></div>
        <RouterLink :to="allowPocSimulation ? '/login?mode=scenarios' : '/login'">返回登录</RouterLink>
      </header>
      <div class="enable-request-heading">
        <h1>{{ externalRequest ? '账号已禁用' : '申请启用账号' }}</h1>
        <p>{{ externalRequest ? EXTERNAL_DISABLED_MESSAGE : '当前账号已禁用。提交申请后，需由系统管理员审批启用。' }}</p>
      </div>
      <p v-if="permissionLabEnabled && !labIdentity" role="status">{{ identityError || '正在验证账号状态…' }}</p>
      <AccountEnableRequestFlow
        v-if="!externalRequest && (!permissionLabEnabled || labIdentity)"
        :key="account + ':' + loginType"
        v-model="draft"
        v-model:step="step"
        class="enable-request-workspace"
        self-service
        :authorize="authorize"
        @back="router.push(allowPocSimulation ? '/login?mode=scenarios' : '/login')"
        @submitted="openStatusPage"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AccountEnableRequestFlow from '@/components/permissions/AccountEnableRequestFlow.vue'
import { pocSessionStorage } from '@/services/pocStorage'
import { allowPocSimulation, permissionLabEnabled } from '@/config/runtimeMode'
import { labApi, type LabIdentity } from '@/services/permissionLab'
import { disabledIdentityError, DISABLED_ACCOUNT_KEY, DISABLED_ACCOUNT_TYPE_KEY, EXTERNAL_DISABLED_MESSAGE, type EnableRequestDraft, type EnableSubmission } from '@/services/accountEnableRequest'

const route = useRoute()
const router = useRouter()
const account = computed(() => String(route.query.account || '').trim())
const loginType = computed(() => route.query.loginType === 'external' ? 'external' : 'internal')
const externalRequest = computed(() => loginType.value === 'external')
const step = ref(1)
const labIdentity = ref<LabIdentity | null>(null)
const identityError = ref('')
onMounted(async () => {
  document.documentElement.classList.add('account-enable-route')
  document.body.classList.add('account-enable-route')
  if (permissionLabEnabled) {
    try {
      const identity = await labApi<LabIdentity>('/identity')
      if (identity.username !== account.value || identity.personType !== 'internal' || identity.enabled) throw new Error('当前登录身份或账号状态不支持此申请，请返回登录页重试。')
      labIdentity.value = identity
      draft.value = { ...createDraft(), systemApprover: identity.systemApprover }
    } catch (error) { identityError.value = error instanceof Error ? error.message : '验证失败，请重新登录' }
  }
})
onBeforeUnmount(() => {
  document.documentElement.classList.remove('account-enable-route')
  document.body.classList.remove('account-enable-route')
})
const draft = ref<EnableRequestDraft>(createDraft())
function createDraft(): EnableRequestDraft {
  return {
    applicant: account.value, itcode: account.value,
    applicantPersonType: loginType.value, personType: loginType.value,
    targetItcode: account.value, targetUser: account.value,
    relatedAccount: '', reason: '', systemApprover: 'sunzh4'
  }
}
watch([account, loginType], () => { draft.value = createDraft(); step.value = 1 })
function authorize() {
  if (externalRequest.value) return EXTERNAL_DISABLED_MESSAGE
  if (permissionLabEnabled) return labIdentity.value?.username === account.value ? '' : '请返回登录页重新验证账号状态。'
  const identityError = disabledIdentityError(account.value, loginType.value, pocSessionStorage)
  if (identityError) return identityError
  if (draft.value.itcode !== account.value || draft.value.applicant !== account.value
    || draft.value.targetItcode !== account.value || draft.value.targetUser !== account.value
    || draft.value.personType !== loginType.value || draft.value.applicantPersonType !== loginType.value) {
    return '登录前仅允许为当前账号申请启用，请返回登录页重新验证。'
  }
  return ''
}
function openStatusPage({ request }: EnableSubmission) {
  // Remove the POC login proof only after the request has been saved successfully.
  pocSessionStorage.removeItem(DISABLED_ACCOUNT_KEY)
  pocSessionStorage.removeItem(DISABLED_ACCOUNT_TYPE_KEY)
  router.replace({ path: '/account-request/status', query: { ticket: request.id, ...(permissionLabEnabled ? {} : { token: request.token }) } })
}
</script>

<style scoped>
:global(html.account-enable-route),
:global(body.account-enable-route) { min-width: 0; overflow: hidden; }
:global(html.account-enable-route body.account-enable-route) { display: block; min-width: 0; overflow: hidden; }
:global(body.account-enable-route #app) { display: block; width: 100%; min-width: 0; }
.enable-request-page { box-sizing: border-box; width: 100%; min-width: 0; height: 100dvh; display: grid; grid-template-columns: minmax(0, 1fr); place-items: center; padding: 24px; background: var(--color-bg-subtle); color: var(--color-text); font-family: var(--font-body); }
.enable-request-card { display: flex; flex-direction: column; width: min(960px, 100%); max-height: calc(100dvh - 48px); overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow-md); }
.enable-request-header { display: flex; flex-shrink: 0; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--color-border-subtle); padding: 16px 24px; }
.brand-lockup { display: inline-flex; align-items: center; gap: 8px; }
.brand-mark { display: grid; width: 28px; height: 28px; place-items: center; border-radius: var(--radius-md); background: var(--color-danger); color: var(--color-on-primary); font-weight: 800; }
.enable-request-header a { color: var(--color-primary); text-decoration: none; font-size: 13px; }
.enable-request-heading { flex-shrink: 0; padding: 24px 24px 16px; }
.enable-request-heading h1 { margin: 0; font-size: 20px; line-height: 1.4; }
.enable-request-heading p { margin: 8px 0 0; font-size: 13px; color: var(--color-text-secondary); line-height: 1.6; }
.enable-request-workspace { padding: 0 24px 24px; }
@media (max-width: 560px) { .enable-request-page { padding: 12px; } .enable-request-card { max-height: calc(100dvh - 24px); } .enable-request-heading { padding: 16px; } .enable-request-workspace { padding: 0 16px 16px; } }
</style>
