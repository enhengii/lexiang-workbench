import { allowPocLogin, isPocSandbox, isPocWorkbench, pocAppBase, pocWorkbenchBase } from '@/config/runtimeMode'
import { POC_EXTERNAL_PASSWORD, POC_LOGIN_ACCOUNTS, type PocLoginAccount } from './pocExternalLogin'
import { POC_WORKBENCH_SESSION_KEY, POC_WORKBENCH_SESSION_VALUE } from './pocWorkbenchSession'

// UI choices are intentionally separate from the synthetic authentication fixtures.
export type PocLoginChoice = Pick<PocLoginAccount, 'username' | 'label' | 'loginType'>
const localAdmin: PocLoginChoice = { username: 'admin', label: '管理员 · 正常登录', loginType: 'internal' }
// The administrator opens the complete workbench UI; it is never a real auth fixture.
const scenarioChoices = POC_LOGIN_ACCOUNTS.filter((account) => account.disabled || account.accessReason === 'first-access')
export const POC_LOGIN_CHOICES: readonly PocLoginChoice[] = allowPocLogin
  ? [...scenarioChoices, localAdmin]
  : []

export function findPocLoginChoice(username: unknown): PocLoginChoice | undefined {
  return typeof username === 'string'
    ? POC_LOGIN_CHOICES.find((item) => item.username === username.trim().toLowerCase())
    : undefined
}

export function getPocLoginPassword(account: PocLoginChoice): string {
  const choice = findPocLoginChoice(account.username)
  if (!choice) return ''
  return choice.loginType === 'external' ? POC_EXTERNAL_PASSWORD : ''
}

/** Full navigation drops in-memory identities; cookies and real accounts are untouched. */
export function navigatePocChoice(account: PocLoginChoice) {
  if (!allowPocLogin) return false
  if (account.username === 'admin') {
    if (isPocWorkbench) return false
    try {
      window.sessionStorage.setItem(POC_WORKBENCH_SESSION_KEY, POC_WORKBENCH_SESSION_VALUE)
    } catch {
      throw new Error('无法保存登录状态，请允许浏览器会话存储后重试。')
    }
    window.location.assign(pocWorkbenchBase + 'portal/home')
    return true
  }
  if (isPocSandbox) return false
  const path = account.loginType === 'external' ? 'login' : 'adfs-login'
  const query = new URLSearchParams({ pocAccount: account.username, loginType: account.loginType })
  window.location.assign(pocAppBase + path + '?' + query.toString())
  return true
}
