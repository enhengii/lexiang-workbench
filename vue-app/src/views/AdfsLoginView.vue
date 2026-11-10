<template>
  <main class="adfs-login-page">
    <section class="adfs-visual" aria-hidden="true">
      <div class="adfs-line line-a"></div>
      <div class="adfs-line line-b"></div>
      <div class="adfs-line line-c"></div>
      <div class="adfs-circle circle-a"></div>
      <div class="adfs-circle circle-b"></div>
      <div class="adfs-circle circle-c"></div>
    </section>

    <section class="adfs-panel" aria-label="Lenovo ADFS 登录">
      <div v-if="directPocAccount" class="adfs-direct-entry" :aria-busy="pocEntryBusy">
        <p v-if="!errorMsg" role="status">正在进入演示场景…</p>
        <p v-else class="adfs-error" role="alert">{{ errorMsg }}</p>
        <div class="adfs-direct-actions">
          <button v-if="errorMsg" class="btn btn-primary" type="button" :disabled="pocEntryBusy" @click="enterPocScenario">重试</button>
          <button class="btn btn-secondary" type="button" :disabled="pocEntryBusy" @click="returnToPocSelection">返回选择</button>
        </div>
      </div>
      <p v-else class="adfs-direct-entry" role="status">正在返回登录…</p>
      <footer>© 2026 Lenovo</footer>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { allowPocLogin, allowPocSimulation, isPocSandbox } from '@/config/runtimeMode'
import { pocLocalStorage, pocSessionStorage } from '@/services/pocStorage'
import { POC_ACCOUNT_REQUESTS_KEY, POC_EXTERNAL_PASSWORD, findPocLoginAccount, resolvePocLogin } from '@/services/pocExternalLogin'
import { findPocLoginChoice, navigatePocChoice } from '@/services/pocLoginChoices'
import { APPROVAL_MAIL_ROWS_KEY } from '@/services/approvalMailReview'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const itcode = ref('')
const password = ref('')
const errorMsg = ref('')
const disabledAccount = ref('')
const initialPocAccount = findPocLoginAccount(route.query.pocAccount, allowPocLogin)
const initialPocChoice = findPocLoginChoice(route.query.pocAccount)
const directPocAccount = ref(allowPocSimulation && initialPocAccount?.loginType === 'internal' && initialPocChoice?.loginType === 'internal' ? initialPocChoice.username : '')
const pocEntryBusy = ref(false)
const leavingForAnotherApp = initialPocChoice ? navigatePocChoice(initialPocChoice) : false
if (initialPocAccount?.loginType === 'internal') {
  itcode.value = initialPocAccount.username
  password.value = POC_EXTERNAL_PASSWORD
}

async function enterPocScenario() {
  const choice = findPocLoginChoice(directPocAccount.value)
  const fixture = findPocLoginAccount(directPocAccount.value, allowPocSimulation)
  if (!allowPocSimulation || fixture?.loginType !== 'internal' || choice?.loginType !== 'internal' || pocEntryBusy.value) return
  pocEntryBusy.value = true
  itcode.value = choice.username
  password.value = POC_EXTERNAL_PASSWORD
  try {
    await submitAdfsLogin()
    if (!errorMsg.value && route.path === '/adfs-login') errorMsg.value = '未能进入演示场景，请重试或返回选择。'
  } finally {
    pocEntryBusy.value = false
  }
}

function returnToPocSelection() {
  return router.replace({ path: '/login', query: { mode: 'scenarios', redirect: String(route.query.redirect || '/') } })
}

onMounted(async () => {
  if (leavingForAnotherApp) return
  if (directPocAccount.value) return enterPocScenario()
  if (isPocSandbox) {
    await router.replace({ path: '/login', query: { ...route.query, mode: 'scenarios', loginType: initialPocChoice?.loginType || 'internal' } })
    return
  }
  await router.replace({ path: '/login', query: { ...route.query, loginType: 'internal' } })
})

async function openEnableRequest() {
  if (!disabledAccount.value) return
  await router.replace({ path: '/account-enable-request', query: { account: disabledAccount.value, loginType: 'internal' } })
}

async function submitAdfsLogin() {
  const account = itcode.value.trim()
  errorMsg.value = ''
  disabledAccount.value = ''
  if (!account || !password.value) {
    errorMsg.value = '请输入 ITCode 和 Password。'
    return
  }

  try {
    const result = resolvePocLogin(account, password.value, 'internal', allowPocSimulation,
      () => pocLocalStorage.getItem(POC_ACCOUNT_REQUESTS_KEY),
      () => pocLocalStorage.getItem(APPROVAL_MAIL_ROWS_KEY))
    if (result) {
      if (result === 'invalid-password' || result === 'wrong-login-type') {
        errorMsg.value = result === 'invalid-password' ? '用户名或密码错误' : '该演示账号属于外部用户，请切换外部用户登录。'
        return
      }
      pocLocalStorage.removeItem('preview_user')
      pocSessionStorage.removeItem('leaibot-disabled-login-account')
      pocSessionStorage.removeItem('leaibot-disabled-login-type')
      appStore.user = null
      appStore.role = null
      appStore.permissions = []
      appStore.visibleMenus = []
      if (result === 'disabled') {
        disabledAccount.value = account.toLowerCase()
        pocSessionStorage.setItem('leaibot-disabled-login-account', disabledAccount.value)
        pocSessionStorage.setItem('leaibot-disabled-login-type', 'internal')
        await openEnableRequest()
      } else if (result === 'active') {
        await router.replace('/agent/permissions')
      } else {
        await router.replace({ path: '/access-denied', query: { itcode: account.toLowerCase(), userType: 'internal' } })
      }
      return
    }
  } catch {
    errorMsg.value = '演示账号状态读取失败，请检查浏览器存储后重试。'
    return
  }

  errorMsg.value = '该入口仅支持指定演示账号。请返回登录页面完成身份验证。'
}
</script>

<style scoped>
.adfs-login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 458px;
  background: #fff;
  color: #111827;
  font-family: Arial, Helvetica, sans-serif;
}

.adfs-visual {
  position: relative;
  overflow: hidden;
  background: #4697de;
}

.adfs-visual::before,
.adfs-visual::after {
  content: '';
  position: absolute;
  inset: -18% auto auto -8%;
  width: 46%;
  height: 130%;
  background: rgba(255, 255, 255, 0.12);
  transform: rotate(-18deg);
}

.adfs-visual::after {
  inset: auto -10% -18% auto;
  width: 38%;
  height: 120%;
  background: rgba(8, 97, 180, 0.16);
}

.adfs-line {
  position: absolute;
  height: 2px;
  background: rgba(150, 230, 255, 0.72);
  transform-origin: left center;
}

.line-a { top: 36%; left: 0; width: 58%; transform: rotate(-30deg); }
.line-b { top: 3%; left: 29%; width: 44%; transform: rotate(-35deg); }
.line-c { bottom: 20%; left: 42%; width: 78%; transform: rotate(-13deg); }

.adfs-circle {
  position: absolute;
  border-radius: 999px;
  border: 3px solid rgba(117, 223, 255, 0.42);
  background: rgba(255, 255, 255, 0.08);
}

.circle-a { left: 8%; bottom: 11%; width: 148px; height: 148px; }
.circle-b { left: 15%; bottom: -6%; width: 228px; height: 228px; }
.circle-c { left: 2%; bottom: 4%; width: 76px; height: 76px; }

.adfs-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 66px 66px 34px;
  background: #fff;
}

.adfs-direct-entry {
  font-size: var(--text-base, 14px);
  line-height: 1.65;
}

.adfs-direct-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2, 8px);
  margin-top: var(--space-4, 16px);
}

.adfs-error {
  margin: 0 0 8px;
  color: #d92d20;
  font-size: 14px;
}

.adfs-panel footer {
  color: #6b7280;
  font-size: 16px;
}

@media (max-width: 900px) {
  .adfs-login-page {
    grid-template-columns: 1fr;
  }

  .adfs-visual {
    min-height: 180px;
  }

  .adfs-panel {
    padding: 36px 24px 28px;
  }

}
</style>
