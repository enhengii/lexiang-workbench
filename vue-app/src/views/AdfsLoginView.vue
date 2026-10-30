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
      <form v-else class="adfs-form" @submit.prevent="submitAdfsLogin">
        <h1>Lenovo Corporation</h1>
        <p>{{ passwordlessLogin ? '本地演示账号，无需密码，点击 Submit 继续。' : 'Please login with your ITCode / Password and OTP code (if required).' }}</p>

        <div class="adfs-row">
          <label for="adfs-login-itcode">ITCode</label>
          <PocLoginAccountPicker v-if="allowPocLogin" id="adfs-login-itcode" v-model="itcode" placeholder="输入或选择演示账号" @select="selectPocAccount" @submit="submitAdfsLogin" />
          <input v-else id="adfs-login-itcode" v-model.trim="itcode" autofocus autocomplete="username" />
        </div>
        <label v-if="!passwordlessLogin" class="adfs-row">
          <span>Password</span>
          <input v-model="password" type="password" autocomplete="current-password" />
        </label>
        <label v-if="!passwordlessLogin" class="adfs-row">
          <span>OTP Code</span>
          <input v-model.trim="otpCode" inputmode="numeric" autocomplete="one-time-code" />
        </label>

        <p v-if="!passwordlessLogin" class="adfs-register">If this is the first time you are using Lenovo OTP, please <button type="button">register</button>.</p>

        <label class="adfs-remember">
          <input v-model="rememberMe" type="checkbox" />
          <span>使我保持登录状态</span>
        </label>
        <div v-if="errorMsg" class="adfs-error">{{ errorMsg }}</div>
        <button class="adfs-submit" type="submit">Submit</button>
      </form>
      <footer>© 2026 Lenovo</footer>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { allowPocLogin, allowPocSimulation, isPocSandbox, permissionLabEnabled } from '@/config/runtimeMode'
import { isPasswordlessLabAccount, labHeaders } from '@/services/permissionLab'
import { pocLocalStorage, pocSessionStorage } from '@/services/pocStorage'
import PocLoginAccountPicker from '@/components/auth/PocLoginAccountPicker.vue'
import { POC_ACCOUNT_REQUESTS_KEY, POC_EXTERNAL_PASSWORD, findPocLoginAccount, resolvePocLogin } from '@/services/pocExternalLogin'
import { findPocLoginChoice, navigatePocChoice, type PocLoginChoice } from '@/services/pocLoginChoices'
import { APPROVAL_MAIL_ROWS_KEY } from '@/services/approvalMailReview'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const itcode = ref('')
const password = ref('')
const passwordlessLogin = computed(() => isPasswordlessLabAccount(itcode.value, 'internal'))
const otpCode = ref('')
const rememberMe = ref(false)
const errorMsg = ref('')
const disabledAccount = ref('')
const initialPocAccount = findPocLoginAccount(route.query.pocAccount, allowPocLogin)
const initialPocChoice = findPocLoginChoice(route.query.pocAccount)
const directPocAccount = ref(allowPocSimulation && initialPocChoice?.loginType === 'internal' ? initialPocChoice.username : '')
const pocEntryBusy = ref(false)
if (initialPocAccount) navigatePocChoice(initialPocAccount)
if (initialPocAccount?.loginType === 'internal') {
  itcode.value = initialPocAccount.username
  password.value = POC_EXTERNAL_PASSWORD
}

async function selectPocAccount(account: PocLoginChoice) {
  if (!allowPocLogin || navigatePocChoice(account)) return
  errorMsg.value = ''
  disabledAccount.value = ''
  if (account.loginType === 'external') {
    router.push({ path: '/login', query: { loginType: 'external', pocAccount: account.username, redirect: String(route.query.redirect || '/') } })
    return
  }
  itcode.value = account.username
  password.value = POC_EXTERNAL_PASSWORD
  otpCode.value = ''
  if (allowPocSimulation && findPocLoginChoice(account.username)?.loginType === 'internal') {
    directPocAccount.value = account.username
    await enterPocScenario()
  }
}

async function enterPocScenario() {
  const choice = findPocLoginChoice(directPocAccount.value)
  if (!allowPocSimulation || choice?.loginType !== 'internal' || pocEntryBusy.value) return
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
  return router.replace({ path: '/login', query: { redirect: String(route.query.redirect || '/') } })
}

onMounted(enterPocScenario)

function isDisabledLoginResponse(status: number, data: any) {
  return status === 423 || data?.code === 'ACCOUNT_DISABLED' || data?.error === '账号已禁用'
}

async function openEnableRequest() {
  if (!disabledAccount.value) return
  await router.replace({ path: '/account-enable-request', query: { account: disabledAccount.value, loginType: 'internal' } })
}

async function submitAdfsLogin() {
  const account = itcode.value.trim()
  errorMsg.value = ''
  disabledAccount.value = ''
  if (!account || (!passwordlessLogin.value && !password.value)) {
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

  if (isPocSandbox) {
    errorMsg.value = '该入口仅支持指定演示账号。真实账号请返回正常登录。'
    return
  }
  try {
    disabledAccount.value = ''
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...labHeaders() },
      body: JSON.stringify({ username: account, password: passwordlessLogin.value ? '' : password.value, otpCode: otpCode.value, rememberMe: rememberMe.value, loginType: 'adfs' })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (isDisabledLoginResponse(res.status, data)) {
        disabledAccount.value = account
        pocSessionStorage.setItem('leaibot-disabled-login-account', account)
        pocSessionStorage.setItem('leaibot-disabled-login-type', 'internal')
        await openEnableRequest()
        return
      }
      errorMsg.value = data.error || '登录失败'
      return
    }
    if (permissionLabEnabled && data.next === 'first-access') {
      appStore.user = null
      await router.replace({ path: '/access-denied', query: { itcode: data.username, userType: 'internal' } })
      return
    }
    appStore.user = data.username || account
    await appStore.loadUserContext()
    if (!appStore.permissions.length) {
      await router.replace({ path: '/access-denied', query: { itcode: data.username || account, userType: 'internal' } })
      return
    }
    await router.replace(String(route.query.redirect || (permissionLabEnabled ? '/agent/permissions?module=approval' : '/')))
  } catch {
    errorMsg.value = '登录服务暂不可用，请稍后重试'
  }
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

.adfs-form h1 {
  margin: 0 0 86px;
  font-size: 34px;
  font-weight: 400;
  letter-spacing: 0;
}

.adfs-form > p:not(.adfs-register) {
  margin: 0 0 34px;
  font-size: 17px;
  line-height: 1.35;
}

.adfs-row {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  align-items: center;
  gap: 24px;
  margin-bottom: 28px;
  font-size: 18px;
}

.adfs-row input,
.adfs-row :deep(.poc-account-input) {
  width: 100%;
  height: 39px;
  border: 1px solid #9b9b9b;
  padding: 5px 8px;
  background: #fff;
  color: #111827;
  font-size: 16px;
}

.adfs-row input:focus,
.adfs-row :deep(.poc-account-input:focus) {
  outline: 2px solid #111827;
  outline-offset: -2px;
  background: #eaf2ff;
}

.adfs-register {
  margin: 0 0 42px;
  font-size: 18px;
  line-height: 1.35;
}

.adfs-register button {
  border: 0;
  padding: 0;
  background: transparent;
  color: #1683f5;
  font: inherit;
  cursor: pointer;
}

.adfs-remember {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 16px;
}

.adfs-remember input {
  width: 16px;
  height: 16px;
}

.adfs-error {
  margin: 0 0 8px;
  color: #d92d20;
  font-size: 14px;
}

.adfs-enable-entry {
  justify-self: start;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--color-primary);
  font: inherit;
  cursor: pointer;
}
.adfs-enable-entry:hover { text-decoration: underline; }
.adfs-enable-entry:focus-visible { outline: none; border-radius: var(--radius-sm); box-shadow: var(--focus-ring); }

.adfs-submit {
  min-width: 104px;
  min-height: 48px;
  border: 0;
  border-radius: 3px;
  background: #0787e5;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
}

.adfs-submit:hover {
  background: #0678cc;
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

  .adfs-form h1 {
    margin-bottom: 36px;
    font-size: 28px;
  }

  .adfs-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>
