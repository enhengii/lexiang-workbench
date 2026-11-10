import localAdminPassword from 'virtual:local-poc-admin'
import { allowPocLogin, isPocSandbox, normalAppBase, pocAppBase } from '@/config/runtimeMode'
import { POC_EXTERNAL_PASSWORD, POC_LOGIN_ACCOUNTS, type PocLoginAccount } from './pocExternalLogin'

// UI choices are intentionally separate from the synthetic authentication fixtures.
export type PocLoginChoice = Pick<PocLoginAccount, 'username' | 'label' | 'loginType'>
const localAdmin: PocLoginChoice = { username: 'admin', label: '管理员 · 正常登录', loginType: 'internal' }
// Normal-login demonstrations share the administrator choice; keep auth fixtures intact.
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
  return choice.username === 'admin' ? (isPocSandbox ? '' : localAdminPassword || '') : POC_EXTERNAL_PASSWORD
}

/** Full navigation drops in-memory identities; cookies and real accounts are untouched. */
export function navigatePocChoice(account: PocLoginChoice) {
  if (!allowPocLogin) return false
  const normal = account.username === 'admin'
  if (normal === !isPocSandbox) return false
  const path = normal || account.loginType === 'external' ? 'login' : 'adfs-login'
  const query = new URLSearchParams({ pocAccount: account.username, loginType: account.loginType })
  window.location.assign((normal ? normalAppBase : pocAppBase) + path + '?' + query.toString())
  return true
}
