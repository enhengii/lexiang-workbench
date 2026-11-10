<template>
  <!-- 复用原登录卡片与表单样式 -->
  <div id="login-screen">
    <div class="login-card">
      <div class="login-logo" style="margin-bottom:40px;">
        <div class="icon">L</div>
        <span>联想乐享</span>
      </div>
      <div class="login-title">登录</div>
      <div class="login-tabs" role="tablist" aria-label="登录方式">
        <button
          type="button"
          role="tab"
          :aria-selected="loginTab === 'internal'"
          :class="{ active: loginTab === 'internal' }"
          @click="switchLoginTab('internal')"
        >内部用户登录</button>
        <button
          type="button"
          role="tab"
          :aria-selected="loginTab === 'external'"
          :class="{ active: loginTab === 'external' }"
          @click="switchLoginTab('external')"
        >外部用户登录</button>
      </div>

      <div role="tabpanel">
        <div v-if="loginTab === 'external' || allowPocLogin" class="form-group">
          <label class="form-label" for="external-login-username">{{ loginTab === 'internal' ? '演示账号（可选）' : '用户名' }}</label>
          <PocLoginAccountPicker v-if="allowPocLogin" id="external-login-username" v-model="username" :placeholder="loginTab === 'internal' ? '默认进入管理员演示，或选择其他场景' : '请输入用户名或选择演示账号'" @select="selectPocAccount" @submit="doLogin" />
          <input
            v-else
            id="external-login-username"
            class="form-input"
            v-model="username"
            :placeholder="loginTab === 'internal' ? '请输入 ITCode' : '请输入用户名'"
            autofocus
            @keydown.enter="doLogin"
          />
        </div>
        <div v-if="loginTab === 'external' && !passwordlessLogin" class="form-group">
          <div class="login-field-head">
            <label class="form-label" for="external-login-password">密码</label>
          </div>
          <input
            id="external-login-password"
            class="form-input"
            v-model="password"
            type="password"
            placeholder="••••••"
            @keydown.enter="doLogin"
          />
        </div>
        <p v-else-if="loginTab === 'external'" class="form-label" role="status">本地演示账号，无需密码，点击登录工作台继续。</p>
        <p v-else class="form-label" role="status">内部用户免密进入工作台，无需在此输入密码。</p>
        <!-- 原 #login-error：有错误时才显示，保留原来的 display:block 效果 -->
        <div
          class="login-error"
          :style="{ display: errorMsg ? 'block' : '' }"
        >{{ errorMsg }}</div>
        <button class="btn btn-primary login-btn" @click="doLogin">{{ loginTab === 'internal' ? 'ADFS 登录' : '登录工作台' }}</button>
        <div class="login-register-entry">
          <span>还没有工作台账号？</span>
        </div>
      </div>
    </div>


    <div v-if="registerModalVisible" class="register-modal-layer" @click.self="closeRegisterModal">
      <div class="register-modal-panel" role="dialog" aria-modal="true" aria-labelledby="register-modal-title">
        <button type="button" class="register-modal-close" aria-label="关闭" @click="closeRegisterModal">×</button>
        <div class="register-modal-head">
          <div>
            <h2 id="register-modal-title">创建账户/注册</h2>
            <p>无账号用户可先提交账号创建申请，审批通过后开通门户工作台；具体权限需登录后再单独申请。</p>
          </div>
          <span>{{ registerSubmitted ? '已提交' : '免登录申请' }}</span>
        </div>

        <div class="register-steps" aria-label="创建账号申请步骤">
          <button
            v-for="(step, index) in registerSteps"
            :key="step.key"
            type="button"
            :class="{ active: registerStep === index, locked: index > maxRegisterStep }"
            :disabled="index > maxRegisterStep || registerSubmitted"
            @click="goRegisterStep(index)"
          >{{ step.label }}</button>
        </div>

        <div v-if="currentRegisterStepKey === 'info'" class="register-step-body">
          <h3>填写信息</h3>
          <p>请填写外部用户本人信息和内部关联人员，审批人会基于这些信息确认账号开通对象。</p>
          <div class="register-form-grid">
            <label>
              <span>用户名 <em>必填</em></span>
              <input v-model.trim="registerForm.accountName" :class="{ invalid: registerErrors.accountName }" placeholder="请输入要创建的登录用户名" @blur="validateRegisterInfo">
              <small v-if="registerErrors.accountName">{{ registerErrors.accountName }}</small>
            </label>
            <label>
              <span>姓名 <em>必填</em></span>
              <input v-model.trim="registerForm.applicant" :class="{ invalid: registerErrors.applicant }" placeholder="请输入外部用户姓名" @blur="validateRegisterInfo">
              <small v-if="registerErrors.applicant">{{ registerErrors.applicant }}</small>
            </label>
            <label>
              <span>密码 <em>必填</em></span>
              <input v-model="registerForm.accountPassword" type="password" autocomplete="new-password" :class="{ invalid: registerErrors.accountPassword }" placeholder="请设置登录密码" @blur="validateRegisterInfo">
              <small v-if="registerErrors.accountPassword">{{ registerErrors.accountPassword }}</small>
            </label>
            <label>
              <span>确认密码 <em>必填</em></span>
              <input v-model="registerForm.confirmPassword" type="password" autocomplete="new-password" :class="{ invalid: registerErrors.confirmPassword }" placeholder="请再次输入登录密码" @blur="validateRegisterInfo">
              <small v-if="registerErrors.confirmPassword">{{ registerErrors.confirmPassword }}</small>
            </label>
            <label>
              <span>手机号</span>
              <input v-model.trim="registerForm.mobile" placeholder="用于审批沟通或账号开通">
            </label>
            <label>
              <span>邮箱</span>
              <input v-model.trim="registerForm.email" placeholder="name@lenovo.com">
            </label>
            <label>
              <span>直线经理</span>
              <input v-model.trim="registerForm.applicantManager" placeholder="请输入经理 ITCode 或姓名">
            </label>
            <label class="full">
              <span>关联账号 / 关联人员 <em>必填</em></span>
              <input v-model.trim="registerForm.relatedAccount" :class="{ invalid: registerErrors.relatedAccount }" placeholder="请输入负责对接的内部员工 ITCode 或姓名" @blur="validateRegisterInfo">
              <small v-if="registerErrors.relatedAccount">{{ registerErrors.relatedAccount }}</small>
            </label>
            <label class="full">
              <span>申请原因 / 需求描述 <em>必填</em></span>
              <textarea v-model.trim="registerForm.reason" :class="{ invalid: registerErrors.reason }" rows="4" placeholder="请描述业务场景、需要开通的权限和使用周期。" @blur="validateRegisterInfo"></textarea>
              <small v-if="registerErrors.reason">{{ registerErrors.reason }}</small>
            </label>
          </div>
        </div>
        <div v-else class="register-step-body">
          <h3>提交审批</h3>
          <p>{{ registerSubmitted ? '申请已进入审批流程，请等待审批和账号开通通知。' : '提交后只发起账号创建审批，不携带任何角色、功能权限或数据权限。' }}</p>
          <div class="register-approval-route">
            <div v-for="node in approvalRoute" :key="node.label" :class="{ done: node.done }">
              <span>{{ node.step }}</span>
              <b>{{ node.label }}</b>
              <small>{{ node.owner }}</small>
            </div>
          </div>
          <div class="register-submit-summary">
            <b>{{ registerSubmitted ? '账号创建申请已提交' : '将提交的申请' }}</b>
            <p v-if="submittedRegisterRequest">{{ submittedRegisterRequest.id }} · {{ submittedRegisterRequest.status === '待我审批' ? '审核中' : submittedRegisterRequest.status }}</p>
            <p>{{ registerForm.accountName || '待创建用户名' }} · 仅创建账号 · 不申请初始权限</p>
          </div>
        </div>

        <div class="register-modal-actions">
          <button type="button" class="register-ghost-btn" :disabled="registerStep === 0 || registerSubmitted" @click="prevRegisterStep">上一步</button>
          <button v-if="registerStep < registerSteps.length - 1" type="button" class="register-primary-btn" @click="nextRegisterStep">下一步</button>
          <button v-else type="button" class="register-primary-btn" :disabled="registerSubmitted" @click="submitRegisterApplication">{{ registerSubmitted ? '已提交' : '提交审批' }}</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { allowPocLogin, allowPocSimulation, appBase, isPocSandbox } from '@/config/runtimeMode'
import { pocLocalStorage, pocSessionStorage } from '@/services/pocStorage'
import { POC_ACCOUNT_REQUESTS_KEY, resolvePocLogin } from '@/services/pocExternalLogin'
import { APPROVAL_MAIL_ROWS_KEY } from '@/services/approvalMailReview'
import { findPocLoginChoice, getPocLoginPassword, navigatePocChoice, type PocLoginChoice } from '@/services/pocLoginChoices'
import PocLoginAccountPicker from '@/components/auth/PocLoginAccountPicker.vue'
import { EXTERNAL_DISABLED_MESSAGE } from '@/services/accountEnableRequest'
import { permissionLabEnabled } from '@/config/runtimeMode'
import { isPasswordlessLabAccount, labHeaders } from '@/services/permissionLab'

const router   = useRouter()
const route    = useRoute()
const appStore = useAppStore()

const username = ref('')
const password = ref('')
const errorMsg = ref('')
const loginTab = ref<'internal' | 'external'>(route.query.loginType === 'external' ? 'external' : 'internal')
const passwordlessLogin = computed(() => isPasswordlessLabAccount(username.value, loginTab.value))
const initialPocAccount = findPocLoginChoice(route.query.pocAccount)
if (initialPocAccount) {
  try { navigatePocChoice(initialPocAccount) }
  catch { errorMsg.value = '无法保存登录状态，请允许浏览器会话存储后重试。' }
}
if (initialPocAccount) {
  loginTab.value = initialPocAccount.loginType
  username.value = initialPocAccount.username
  password.value = getPocLoginPassword(initialPocAccount)
}

function selectPocAccount(account: PocLoginChoice) {
  if (!allowPocLogin) return
  try { if (navigatePocChoice(account)) return }
  catch {
    errorMsg.value = '无法保存登录状态，请允许浏览器会话存储后重试。'
    return
  }
  errorMsg.value = ''
  loginTab.value = account.loginType
  if (account.loginType === 'internal') {
    router.push({ path: '/adfs-login', query: { pocAccount: account.username, redirect: String(route.query.redirect || '/') } })
    return
  }
  username.value = account.username
  password.value = getPocLoginPassword(account)
}

const registerModalVisible = ref(false)
const registerStep = ref(0)
const maxRegisterStep = ref(0)
const registerSubmitted = ref(false)
const submittedRegisterRequest = ref<any>(null)

const registerSteps = [
  { key: 'info', label: '1. 填写信息' },
  { key: 'approve', label: '2. 提交审批' }
]


const registerForm = reactive({
  accountName: '',
  applicant: '',
  accountPassword: '',
  confirmPassword: '',
  mobile: '',
  email: '',
  applicantManager: '',
  relatedAccount: '',
  reason: '',
  roleIds: [] as string[],
  copiedRoleIds: [] as string[],
  copiedFromItcode: '',
  copiedDataSourceMap: {} as Record<string, string>,
  dataScopeIds: [] as string[],
  manualDataScopeIds: [] as string[]
})

const registerErrors = reactive({
  accountName: '',
  applicant: '',
  accountPassword: '',
  confirmPassword: '',
  relatedAccount: '',
  reason: ''
})

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null
}

const currentRegisterStepKey = computed(() => registerSteps[registerStep.value]?.key || 'info')
const approvalRoute = computed(() => [
  { step: '1', label: '申请人提交', owner: registerForm.accountName || '待填写', done: true },
  { step: '2', label: '关联人确认', owner: registerForm.relatedAccount || '待填写', done: false },
  { step: '3', label: '申请人直线经理审批', owner: registerForm.applicantManager || '待带出', done: false },
  { step: '4', label: '被申请人直线经理审批', owner: registerForm.applicantManager || '待带出', done: false },
  { step: '5', label: '系统管理员审批', owner: 'sunzh4', done: false }
])

function switchLoginTab(tab: 'internal' | 'external') {
  loginTab.value = tab
  errorMsg.value = ''
  password.value = ''
}

function isDisabledLoginResponse(status: number, data: any) {
  return status === 423 || data?.code === 'ACCOUNT_DISABLED' || data?.error === '账号已禁用'
}

// 对应原 doLogin()
async function doLogin() {
  // Internal POC emulates the IdP redirect, never the password login API.
  if (loginTab.value === 'internal') {
    password.value = ''
    errorMsg.value = ''
    if (!allowPocLogin) {
      showLoginError('当前环境未启用 ADFS 演示。')
      return
    }
    const choice = findPocLoginChoice(username.value.trim() || 'admin')
    if (!choice || choice.loginType !== 'internal') {
      showLoginError('请选择内部演示账号；外部账号请使用外部用户登录。')
      return
    }
    selectPocAccount(choice)
    return
  }
  const u = username.value.trim()
  const p = passwordlessLogin.value ? '' : password.value
  const loginType = 'external' as const
  errorMsg.value = ''
  if (!u || (!passwordlessLogin.value && !p)) { showLoginError('请输入用户名和密码'); return }

  // Resolve POC fixtures before the network fallback; storage failures must not create an admin preview session.
  try {
    const pocResult = resolvePocLogin(u, p, loginType, allowPocSimulation,
      () => pocLocalStorage.getItem(POC_ACCOUNT_REQUESTS_KEY),
      () => pocLocalStorage.getItem(APPROVAL_MAIL_ROWS_KEY))
    if (pocResult) {
      if (pocResult === 'invalid-password') {
        showLoginError('用户名或密码错误')
        return
      }
      if (pocResult === 'wrong-login-type') {
        showLoginError('该演示账号属于内部用户，请切换内部用户登录。')
        return
      }
      pocLocalStorage.removeItem('preview_user')
      pocSessionStorage.removeItem('leaibot-disabled-login-account')
      pocSessionStorage.removeItem('leaibot-disabled-login-type')
      appStore.user = null
      appStore.role = null
      appStore.permissions = []
      appStore.visibleMenus = []
      const account = u.toLowerCase()
      if (pocResult === 'disabled') {
        showLoginError(EXTERNAL_DISABLED_MESSAGE)
      } else if (pocResult === 'active') {
        await router.replace('/agent/permissions')
      } else {
        await router.replace({ path: '/access-denied', query: { itcode: account, userType: loginType } })
      }
      return
    }
  } catch {
    showLoginError('演示账号状态读取失败，请检查浏览器存储后重试。')
    return
  }

  if (isPocSandbox) {
    showLoginError('该入口仅支持指定演示账号。真实账号请返回正常登录。')
    return
  }
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...labHeaders() },
      body: JSON.stringify({ username: u, password: p })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (isDisabledLoginResponse(res.status, data)) {
        pocSessionStorage.removeItem('leaibot-disabled-login-account')
        pocSessionStorage.removeItem('leaibot-disabled-login-type')
        showLoginError(EXTERNAL_DISABLED_MESSAGE)
        return
      }
      showLoginError(data.error || '登录失败')
      return
    }

    // 写入 store，然后跳转（等价于原来隐藏 login-screen、显示 sidebar + main）
    appStore.user = data.username || u
    await appStore.loadUserContext()
    if (!appStore.permissions.length) {
      await router.replace({ path: '/access-denied', query: { itcode: data.username || u, userType: loginType } })
      return
    }
    router.replace(String(route.query.redirect || (permissionLabEnabled ? '/agent/permissions?module=approval' : '/')))
  } catch {
    showLoginError('登录服务暂不可用，请稍后重试')
  }
}

// 对应原 showLoginError()
function showLoginError(msg: string) {
  errorMsg.value = msg
}

function openRegisterModal() {
  registerModalVisible.value = true
  registerStep.value = 0
  maxRegisterStep.value = 0
  registerSubmitted.value = false
  resetRegisterErrors()
}

function closeRegisterModal() {
  registerModalVisible.value = false
}

function resetRegisterErrors() {
  Object.keys(registerErrors).forEach((key) => {
    registerErrors[key as keyof typeof registerErrors] = ''
  })
}

function validateRegisterInfo() {
  registerErrors.accountName = registerForm.accountName ? '' : '请填写用户名。'
  registerErrors.applicant = registerForm.applicant ? '' : '请填写姓名。'
  registerErrors.accountPassword = registerForm.accountPassword ? '' : '请设置登录密码。'
  registerErrors.confirmPassword = registerForm.confirmPassword ? '' : '请再次确认登录密码。'
  if (registerForm.accountPassword && registerForm.confirmPassword && registerForm.accountPassword !== registerForm.confirmPassword) registerErrors.confirmPassword = '两次输入的密码不一致。'
  registerErrors.relatedAccount = registerForm.relatedAccount ? '' : '请填写内部关联人员。'
  registerErrors.reason = registerForm.reason ? '' : '请填写申请原因和业务场景。'
  return ![registerErrors.accountName, registerErrors.applicant, registerErrors.accountPassword, registerErrors.confirmPassword, registerErrors.relatedAccount, registerErrors.reason].some(Boolean)
}

function goRegisterStep(index: number) {
  if (index > maxRegisterStep.value || registerSubmitted.value) return
  registerStep.value = index
}

function nextRegisterStep() {
  if (currentRegisterStepKey.value === 'info' && !validateRegisterInfo()) return
  registerStep.value = Math.min(registerStep.value + 1, registerSteps.length - 1)
  maxRegisterStep.value = Math.max(maxRegisterStep.value, registerStep.value)
}

function prevRegisterStep() {
  registerStep.value = Math.max(registerStep.value - 1, 0)
}

function registerMailAddress(value: string, fallback = 'user') {
  const normalized = String(value || '').split('（')[0].trim() || fallback
  return normalized.includes('@') ? normalized : `${normalized}@lenovo.com`
}

function registerAppBaseUrl(path: string) {
  const base = appBase.replace(/\/$/, '')
  if (typeof window === 'undefined') return `${base}${path}`
  return `${window.location.origin}${base}${path}`
}

function registerStatusLink(request: any) {
  return `${registerAppBaseUrl('/account-request/status')}?ticket=${encodeURIComponent(request.id)}&token=${encodeURIComponent(request.token)}`
}

function registerApproverForRole(request: any, role = 'applicant-manager') {
  const map: Record<string, string> = {
    relation: request.relatedAccount || 'relation-owner',
    'applicant-manager': request.applicantManager || 'sunll1',
    'target-manager': request.targetManager || request.applicantManager || 'sunll1',
    'system-admin': request.systemApprover || 'sunzh4'
  }
  return map[role] || map['applicant-manager']
}

function registerApprovalActionLink(request: any, action = 'approve', role = 'applicant-manager') {
  const query = [
    `ticket=${encodeURIComponent(request.id)}`,
    `source=account-register`,
    `action=${encodeURIComponent(action)}`,
    `approver=${encodeURIComponent(registerApproverForRole(request, role))}`,
    `identity=${encodeURIComponent(role)}`,
    `token=${encodeURIComponent(request.token)}`
  ]
  return `${registerAppBaseUrl('/mail-approval/action')}?${query.join('&')}`
}
function registerApprovalListLink(request: any, action = '', role = 'applicant-manager') {
  const query = [
    'module=approval',
    `ticket=${encodeURIComponent(request.id)}`,
    `approver=${encodeURIComponent(registerApproverForRole(request, role))}`,
    'viewer=approver',
    `identity=${encodeURIComponent(role)}`
  ]
  if (action) query.push(`action=${encodeURIComponent(action)}`)
  return `${registerAppBaseUrl('/agent/permissions')}?${query.join('&')}`
}

function createRegisterRequest() {
  const now = new Date()
  const dateNo = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('')
  const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const id = `AP-${dateNo}-${String(Math.floor(Math.random() * 900) + 100)}`
  const token = Math.random().toString(36).slice(2, 10)
  return {
    id,
    token,
    type: '创建账号',
    applicant: registerForm.applicant,
    applicantItcode: registerForm.accountName,
    target: registerForm.applicant,
    targetItcode: registerForm.accountName,
    accountName: registerForm.accountName,
    passwordConfigured: true,
    applicantManager: registerForm.applicantManager || 'sunll1',
    targetManager: registerForm.applicantManager || 'sunll1',
    relatedAccount: registerForm.relatedAccount,
    systemApprover: 'sunzh4',
    email: registerForm.email || registerMailAddress(registerForm.accountName),
    mobile: registerForm.mobile,
    roleNames: '不申请初始角色',
    dataScopeNames: '不申请数据权限',
    reason: registerForm.reason,
    status: '待我审批',
    statusKey: 'pending',
    nodeType: 'relation',
    node: '关联人审批',
    approverItcode: registerForm.relatedAccount,
    handlers: [registerForm.relatedAccount].filter(Boolean),
    time,
    result: '',
    logs: [
      { node: '申请人提交', detail: '账号创建申请已受理，系统已生成审批流程和邮件通知。', time }
    ]
  }
}

function persistRegisterRequest(request: any) {
  if (typeof window === 'undefined') return
  try {
    const key = 'leaibot-account-request-status-rows'
    const existing = JSON.parse(pocLocalStorage.getItem(key) || '[]').filter((item: any) => item.id !== request.id)
    existing.unshift(request)
    // Shared approval history also determines POC account state; do not truncate it.
    pocLocalStorage.setItem(key, JSON.stringify(existing))
  } catch {}
}

function escapeRegisterMailHtml(value: any) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function createRegisterMailLogs(request: any) {
  const progressLink = registerStatusLink(request)
  const approvalLink = (role = 'applicant-manager') => registerApprovalListLink(request, '', role)
  const actions = (role = 'applicant-manager') => [
    { value: 'approve', label: '同意', link: registerApprovalActionLink(request, 'approve', role) },
    { value: 'reject', label: '驳回', link: registerApprovalActionLink(request, 'reject', role) }
  ]
  const mails = [
    {
      role: 'applicant',
      roleLabel: '申请人',
      toName: request.applicant,
      to: request.email,
      subject: `${request.id} 账号创建申请已受理`,
      content: '您提交的创建账号申请已受理，可点击表单号码进入申请进度查询页查看审核状态。',
      link: progressLink,
      linkLabel: '查看审核进度',
      actions: []
    },
    {
      role: 'applicant-manager',
      roleLabel: '申请人直线经理',
      toName: request.applicantManager,
      to: registerMailAddress(request.applicantManager, 'applicant-manager'),
      subject: `${request.id} 待审批：创建账号申请`,
      content: `${request.applicant}（用户名：${request.accountName || request.applicantItcode}）提交了外部账号创建申请，请确认申请是否合理，并进行审批。`,
      link: approvalLink('applicant-manager'),
      linkLabel: '进入审批列表',
      actions: actions('applicant-manager')
    }
  ]
  mails.splice(1, 0, {
    role: 'relation',
    roleLabel: '关联人',
    toName: request.relatedAccount || '关联人',
    to: registerMailAddress(request.relatedAccount, 'relation-owner'),
    subject: `${request.id} 关联关系确认通知`,
    content: `${request.applicant}（用户名：${request.accountName || request.applicantItcode}）的外部账号创建申请需要关联人确认。您可在审批列表中查看详情，请核对后进行处理。`,
    link: approvalLink('relation'),
    linkLabel: '进入审批列表',
    actions: actions('relation')
  })
  mails.push({
    role: 'target-manager',
    roleLabel: '被申请人直线经理',
    toName: request.targetManager || '被申请人直线经理',
    to: registerMailAddress(request.targetManager || request.applicantManager, 'target-manager'),
    subject: `${request.id} 待审批：创建账号申请`,
    content: `${request.applicant}（用户名：${request.accountName || request.applicantItcode}）的外部账号创建申请等待确认，请确认申请是否合理，并进行审批。`,
    link: approvalLink('target-manager'),
    linkLabel: '进入审批列表',
    actions: actions('target-manager')
  })
  mails.push({
    role: 'system-admin',
    roleLabel: '系统管理员',
    toName: request.systemApprover || '系统管理员',
    to: registerMailAddress(request.systemApprover, 'system-admin'),
    subject: `${request.id} 待审批：请确认账号开通`,
    content: `${request.applicant}（用户名：${request.accountName || request.applicantItcode}）的外部账号创建申请等待系统管理员确认，请确认是否允许系统创建账号。`,
    link: approvalLink('system-admin'),
    linkLabel: '进入审批列表',
    actions: actions('system-admin')
  })
  return mails
}

function registerMailMockContent(mail: any, request: any) {
  const actions = mail.actions.length
    ? `<div class="mail-actions">${mail.actions.map((action: any) => `<a class="${action.value === 'approve' ? 'agree' : 'reject'}" href="${escapeRegisterMailHtml(action.link)}">${escapeRegisterMailHtml(action.label)}</a>`).join('')}</div>`
    : ''
  return `<section class="mail-pane" data-mail-role="${escapeRegisterMailHtml(mail.role)}">
    <section class="mail-head"><span>${escapeRegisterMailHtml(mail.roleLabel)}邮件 mock</span><h1>${escapeRegisterMailHtml(mail.subject)}</h1></section>
    <section class="mail-meta"><div>收件人：${escapeRegisterMailHtml(mail.toName)} &lt;${escapeRegisterMailHtml(mail.to)}&gt;</div><div>申请单号：${escapeRegisterMailHtml(request.id)} · 申请类型：创建账号 · 当前节点：${escapeRegisterMailHtml(request.node)}</div></section>
    <section class="mail-body">
      <p>${escapeRegisterMailHtml(mail.content)}</p>
      <div class="mail-card"><div>表单号码：<a class="ticket" href="${escapeRegisterMailHtml(mail.link)}">${escapeRegisterMailHtml(request.id)}</a></div><div>用户名：${escapeRegisterMailHtml(request.accountName || request.applicantItcode)}</div><div>姓名：${escapeRegisterMailHtml(request.applicant)}</div><div>密码状态：已设置登录密码</div></div>
      <a class="progress-link" href="${escapeRegisterMailHtml(mail.link)}">${escapeRegisterMailHtml(mail.linkLabel)}</a>
      ${actions}
    </section>
    <section class="mail-foot">这是一封 POC mock 邮件，不会真实发送。申请人查看进度无需登录，审批人按钮会进入邮件审批确认页。</section>
  </section>`
}

function registerMailMockInboxHtml(request: any, mails: any[]) {
  const tabs = mails.map((mail, index) => `<button type="button" class="mail-tab${index === 0 ? ' active' : ''}" data-mail-role="${escapeRegisterMailHtml(mail.role)}">${escapeRegisterMailHtml(mail.roleLabel)}</button>`).join('')
  const panes = mails.map((mail, index) => {
    const pane = registerMailMockContent(mail, request)
    return index === 0 ? pane : pane.replace('class="mail-pane"', 'class="mail-pane hidden"')
  }).join('')
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>登录页创建账号邮件 mock - ${escapeRegisterMailHtml(request.id)}</title><style>
  body { margin: 0; background: #f3f5f8; color: #111827; font-family: Arial, "Microsoft YaHei", sans-serif; }
  .inbox-shell { max-width: 980px; margin: 28px auto; border: 1px solid #d8dee8; background: #fff; box-shadow: 0 16px 42px rgba(15, 23, 42, .12); }
  .inbox-title { border-bottom: 1px solid #e5e7eb; padding: 18px 28px; }
  .inbox-title h1 { margin: 0; color: #101828; font-size: 22px; line-height: 1.35; }
  .inbox-title p { margin: 8px 0 0; color: #667085; font-size: 13px; }
  .mail-tabs { display: flex; gap: 8px; border-bottom: 1px solid #e5e7eb; padding: 12px 18px; background: #f8fafc; overflow-x: auto; }
  .mail-tab { flex: 0 0 auto; min-height: 34px; border: 1px solid #d8e1ee; border-radius: 6px; padding: 0 14px; background: #fff; color: #455468; font-weight: 700; cursor: pointer; }
  .mail-tab.active { border-color: #316dff; background: #316dff; color: #fff; }
  .mail-pane.hidden { display: none; }
  .mail-head { border-bottom: 1px solid #e5e7eb; padding: 20px 28px; }
  .mail-head span { display: inline-block; margin-bottom: 10px; border: 1px solid #bcd3ff; border-radius: 999px; padding: 4px 10px; color: #316dff; font-size: 12px; font-weight: 700; }
  .mail-head h1 { margin: 0; color: #101828; font-size: 22px; line-height: 1.35; }
  .mail-meta { display: grid; gap: 6px; padding: 18px 28px; border-bottom: 1px solid #eef2f7; color: #667085; font-size: 13px; }
  .mail-body { padding: 28px; font-size: 16px; line-height: 1.8; }
  .ticket { color: #2380d9; font-weight: 800; text-decoration: underline; }
  .mail-card { margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #f8fafc; }
  .mail-actions { display: flex; gap: 12px; margin-top: 24px; }
  .mail-actions a, .progress-link { display: inline-flex; align-items: center; justify-content: center; min-height: 38px; border-radius: 6px; padding: 0 18px; font-weight: 700; text-decoration: none; }
  .progress-link { background: #316dff; color: #fff; }
  .agree { background: #18a058; color: #fff; }
  .reject { background: #fff1f1; color: #e53935; border: 1px solid #ffc9c9; }
  .mail-foot { padding: 18px 28px 26px; color: #667085; font-size: 13px; }
</style></head><body><main class="inbox-shell"><section class="inbox-title"><h1>${escapeRegisterMailHtml(request.id)} 邮件 mock 收件箱</h1><p>登录页创建账号申请提交后生成的邮件。申请人进公开进度页，审批人进后台审批列表，系统管理员完成最终确认。</p></section><nav class="mail-tabs" aria-label="邮件列表">${tabs}</nav>${panes}</main><script>document.querySelectorAll('.mail-tab').forEach((tab)=>{tab.addEventListener('click',()=>{const role=tab.dataset.mailRole;document.querySelectorAll('.mail-tab').forEach((item)=>item.classList.toggle('active',item===tab));document.querySelectorAll('.mail-pane').forEach((pane)=>pane.classList.toggle('hidden',pane.dataset.mailRole!==role));});});<\/script></body></html>`
}

function openRegisterMailMockInbox(request: any) {
  if (typeof window === 'undefined') return
  const mails = createRegisterMailLogs(request)
  const url = window.URL.createObjectURL(new Blob([registerMailMockInboxHtml(request, mails)], { type: 'text/html;charset=utf-8' }))
  window.open(url, 'login-register-mail-inbox-' + request.id)
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000)
}

function submitRegisterApplication() {
  if (!validateRegisterInfo()) {
    registerStep.value = 0
    maxRegisterStep.value = Math.max(maxRegisterStep.value, 0)
    return
  }
  const request = createRegisterRequest()
  persistRegisterRequest(request)
  submittedRegisterRequest.value = request
  openRegisterMailMockInbox(request)
  registerSubmitted.value = true
  registerStep.value = registerSteps.length - 1
  maxRegisterStep.value = registerSteps.length - 1
}
</script>

<style scoped>
:global(html:has(#login-screen)),
:global(body:has(#login-screen)) { min-width: 0; }
#login-screen { overflow: auto; padding: 16px; }
#login-screen .login-card { max-width: 100%; margin-block: auto; }
.login-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin: 22px 0 26px;
  border-bottom: 1px solid #d8e1ee;
}

.login-tabs button {
  min-height: 42px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #303846;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.login-tabs button.active {
  border-bottom-color: var(--primary, #316dff);
  color: var(--primary, #316dff);
}

.login-field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.forgot-password-btn {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--primary, #316dff);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.forgot-password-btn:hover {
  text-decoration: underline;
}

.forgot-password-btn:focus-visible {
  border-radius: 3px;
  outline: 2px solid var(--primary, #316dff);
  outline-offset: 2px;
}

.enable-account-entry {
  display: block;
  margin: 0 0 12px;
  text-align: left;
}

.login-register-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  color: var(--text-tertiary, #8a94a6);
  font-size: 13px;
}

.login-register-btn {
  border: 0;
  background: transparent;
  color: var(--primary, #316dff);
  font-weight: 700;
  cursor: pointer;
}

.login-register-btn:hover {
  text-decoration: underline;
}

.register-modal-layer {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(17, 24, 39, 0.34);
  backdrop-filter: blur(8px);
}

.register-modal-panel {
  position: relative;
  width: min(920px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  overflow: auto;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
}

.register-modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  color: #667085;
  cursor: pointer;
}

.register-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding-right: 42px;
}

.register-modal-head h2,
.register-step-body h3 {
  margin: 0;
  color: #111827;
}

.register-modal-head p,
.register-step-body > p {
  margin: 8px 0 0;
  color: #667085;
  line-height: 1.7;
}

.register-modal-head > span {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 6px 10px;
  background: #eef4ff;
  color: #316dff;
  font-size: 12px;
  font-weight: 700;
}

.register-steps {
  display: flex;
  gap: 6px;
  margin: 22px 0 20px;
  border: 1px solid #dfe7f3;
  border-radius: 10px;
  padding: 4px;
}

.register-steps button {
  flex: 1;
  min-height: 36px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #667085;
  font-weight: 700;
  cursor: pointer;
}

.register-steps button.active {
  background: #316dff;
  color: #fff;
}

.register-steps button.locked,
.register-steps button:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.register-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
  margin-top: 18px;
}

.register-form-grid label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: #344054;
  font-size: 13px;
  font-weight: 700;
}

.register-form-grid label.full {
  grid-column: 1 / -1;
}

.register-form-grid em {
  color: #ff4d4f;
  font-style: normal;
  font-size: 12px;
}

.register-form-grid input,
.register-form-grid select,
.register-form-grid textarea {
  width: 100%;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 10px 12px;
  color: #111827;
  font: inherit;
  font-weight: 500;
  outline: none;
}

.register-form-grid input.invalid,
.register-form-grid textarea.invalid {
  border-color: #ff4d4f;
  background: #fff7f7;
}

.register-form-grid small {
  color: #ff4d4f;
  font-weight: 600;
}

.register-scope-action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.register-source-stack {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.register-scope-empty,
.register-source-panel,
.register-extra-card {
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 14px;
  background: #fff;
}

.register-scope-empty {
  background: #f8fafc;
  color: #667085;
}

.register-scope-empty b,
.register-source-head b,
.register-role-card b,
.register-extra-card b {
  color: #111827;
  font-size: 14px;
}

.register-scope-empty p,
.register-scope-error,
.register-source-head small,
.register-role-card small,
.register-extra-card small {
  margin: 6px 0 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}

.register-scope-error {
  display: block;
  margin-top: 8px;
  color: #ef4444;
  font-weight: 700;
}

.register-source-head,
.register-role-card,
.register-bound-grid {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.register-role-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.register-role-card {
  border: 1px solid #e6edf7;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.register-role-card.copied {
  background: #f8fbff;
}

.register-card-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.register-link-btn {
  border: 0;
  background: transparent;
  color: #316dff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.register-link-btn.danger {
  color: #e53935;
}

.register-bound-grid {
  margin-top: 12px;
}

.register-bound-grid > div {
  flex: 1 1 0;
  min-width: 0;
}

.register-bound-grid span {
  color: #455468;
  font-size: 12px;
  font-weight: 800;
}

.register-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.register-chip-list em {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 5px 8px;
  background: #eef4ff;
  color: #316dff;
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
}

.register-chip-list button {
  border: 0;
  background: transparent;
  color: inherit;
  font-weight: 900;
  cursor: pointer;
}

.register-picker-panel,
.register-detail-panel {
  position: relative;
  width: min(860px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  overflow: auto;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
}

.register-small-panel {
  position: relative;
  width: min(460px, 100%);
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
}

.register-picker-panel h2,
.register-small-panel h2,
.register-detail-panel h2 {
  margin: 0;
  color: #111827;
}

.register-modal-note {
  margin: 8px 0 16px;
  color: #667085;
  line-height: 1.6;
}

.register-picker-list,
.register-data-tree,
.register-permission-tree {
  display: grid;
  gap: 10px;
}

.register-picker-list article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.register-picker-list article.active {
  border-color: #316dff;
  background: #f4f7ff;
}

.register-picker-list label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.register-picker-list b,
.register-picker-list small {
  display: block;
}

.register-picker-list small {
  margin-top: 5px;
  color: #667085;
  line-height: 1.5;
}

.register-single-field {
  display: grid;
  gap: 7px;
  color: #344054;
  font-size: 13px;
  font-weight: 800;
}

.register-single-field em {
  color: #ff4d4f;
  font-style: normal;
}

.register-single-field input {
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 10px 12px;
  font: inherit;
}

.register-single-field input.invalid {
  border-color: #ff4d4f;
  background: #fff7f7;
}

.register-single-field small {
  color: #ff4d4f;
}

.register-hints {
  margin-top: 10px;
  color: #667085;
  font-size: 12px;
}

.register-data-group {
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.register-data-group > b {
  display: block;
  margin-bottom: 10px;
  color: #111827;
}

.register-data-child {
  display: grid;
  gap: 8px;
  margin-top: 8px;
  padding-left: 10px;
}

.register-data-child > span {
  color: #455468;
  font-size: 12px;
  font-weight: 800;
}

.register-data-child label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #344054;
  font-size: 13px;
}

.register-detail-eyebrow {
  display: block;
  margin-bottom: 6px;
  color: #316dff;
  font-size: 12px;
  font-weight: 800;
}

.register-permission-tree details {
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
}

.register-permission-tree summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  color: #111827;
  font-weight: 800;
  cursor: pointer;
}

.register-permission-tree summary span {
  color: #667085;
  font-size: 12px;
}

.register-permission-branches {
  display: grid;
  gap: 8px;
  padding: 0 10px 10px 22px;
}

.register-permission-matrix {
  margin: 0 10px 10px;
  border: 1px solid #edf2f8;
  border-radius: 8px;
  overflow: hidden;
}

.register-permission-matrix .head,
.register-permission-matrix .row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.register-permission-matrix .head {
  background: #f8fafc;
  color: #667085;
  font-size: 12px;
  font-weight: 800;
}

.register-permission-matrix span,
.register-permission-matrix label {
  min-width: 0;
  padding: 9px 10px;
  border-right: 1px solid #edf2f8;
  color: #455468;
  font-size: 12px;
}

.register-permission-matrix span:last-child,
.register-permission-matrix label:last-child {
  border-right: 0;
}

.register-permission-matrix .row + .row {
  border-top: 1px solid #edf2f8;
}

.register-permission-matrix label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.register-modal-actions.flat {
  position: static;
  margin: 18px 0 0;
  padding: 14px 0 0;
}
.register-scope-section {
  margin-top: 18px;
}

.register-scope-section > b {
  display: block;
  margin-bottom: 10px;
  color: #111827;
}

.register-option-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.register-option-grid button {
  min-height: 92px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
  text-align: left;
  cursor: pointer;
}

.register-option-grid button.active {
  border-color: #316dff;
  background: #f4f7ff;
  box-shadow: inset 0 0 0 1px #316dff;
}

.register-option-grid span {
  display: block;
  color: #111827;
  font-weight: 800;
}

.register-option-grid small {
  display: block;
  margin-top: 8px;
  color: #667085;
  line-height: 1.5;
}

.register-approval-route {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.register-approval-route > div {
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.register-approval-route span {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #eef4ff;
  color: #316dff;
  font-weight: 800;
}

.register-approval-route b,
.register-approval-route small {
  display: block;
  margin-top: 8px;
}

.register-approval-route small {
  color: #667085;
}

.register-submit-summary {
  margin-top: 16px;
  border: 1px solid #b7ebc6;
  border-radius: 8px;
  padding: 14px 16px;
  background: #f0fff4;
  color: #166534;
}

.register-submit-summary b,
.register-submit-summary p {
  display: block;
  margin: 0;
}

.register-submit-summary p {
  margin-top: 6px;
}

.register-modal-actions {
  position: sticky;
  bottom: -24px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin: 22px -24px -24px;
  border-top: 1px solid #e6edf7;
  padding: 14px 24px;
  background: rgba(255, 255, 255, 0.96);
}

.register-primary-btn,
.register-ghost-btn {
  min-height: 36px;
  border-radius: 8px;
  padding: 0 16px;
  font-weight: 800;
  cursor: pointer;
}

.register-primary-btn {
  border: 1px solid #316dff;
  background: #316dff;
  color: #fff;
}

.register-ghost-btn {
  border: 1px solid #dfe7f3;
  background: #fff;
  color: #344054;
}

.register-primary-btn:disabled,
.register-ghost-btn:disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

@media (max-width: 760px) {
  .register-form-grid,
  .register-option-grid,
  .register-approval-route {
    grid-template-columns: 1fr;
  }

  .register-modal-panel {
    padding: 18px;
  }

  .register-modal-actions {
    margin: 18px -18px -18px;
    padding: 12px 18px;
  }
}
</style>
