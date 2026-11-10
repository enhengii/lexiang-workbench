export const POC_EXTERNAL_PASSWORD = 'Poc123456!'
export const POC_ACCOUNT_REQUESTS_KEY = 'leaibot-account-request-status-rows'

export type PocLoginType = 'internal' | 'external'
export interface PocLoginAccount {
  readonly username: string
  readonly label: string
  readonly loginType: PocLoginType
  readonly disabled: boolean
  readonly accessReason: 'first-access' | 'active'
}

/** Public, synthetic POC fixtures only. Never add real accounts or their passwords here. */
export const POC_LOGIN_ACCOUNTS: readonly PocLoginAccount[] = [
  { username: 'noaccess', label: '内部人员 · 首次登录申请权限', loginType: 'internal', disabled: false, accessReason: 'first-access' },
  { username: 'internal-active', label: '内部人员 · 正常登录', loginType: 'internal', disabled: false, accessReason: 'active' },
  { username: 'internal-disabled', label: '内部人员 · 账号被禁用', loginType: 'internal', disabled: true, accessReason: 'active' },
  { username: 'external-active', label: '外部人员 · 正常登录', loginType: 'external', disabled: false, accessReason: 'active' },
  { username: 'external-disabled', label: '外部人员 · 账号被禁用', loginType: 'external', disabled: true, accessReason: 'active' }
]

export function findPocLoginAccount(username: unknown, previewEnabled: boolean) {
  if (!previewEnabled || typeof username !== 'string') return undefined
  return POC_LOGIN_ACCOUNTS.find((item) => item.username === username.trim().toLowerCase())
}

type PocLoginResult = 'invalid-password' | 'wrong-login-type' | 'disabled' | 'no-access' | 'active' | null

/** Only the explicitly enabled browser POC may use synthetic fixtures; never authenticate a server account. */
export function resolvePocExternalLogin(
  username: string,
  password: string,
  previewEnabled: boolean,
  readRequests: () => string | null
): PocLoginResult {
  return resolvePocLogin(username, password, 'external', previewEnabled, readRequests)
}

export function resolvePocLogin(
  username: string,
  password: string,
  loginType: PocLoginType,
  previewEnabled: boolean,
  readRequests: () => string | null,
  readFirstAccessApprovals: () => string | null = () => null
): PocLoginResult {
  const fixture = findPocLoginAccount(username, previewEnabled)
  if (!fixture) return null
  if (password !== POC_EXTERNAL_PASSWORD) return 'invalid-password'
  if (fixture.loginType !== loginType) return 'wrong-login-type'
  return resolvePocAccountState(fixture, readRequests, readFirstAccessApprovals)
}

/** Simulates an internal IdP result inside the isolated POC; never accepts credentials. */
export function resolvePocAdfsLogin(
  username: string,
  previewEnabled: boolean,
  readRequests: () => string | null,
  readFirstAccessApprovals: () => string | null = () => null
): PocLoginResult {
  const fixture = findPocLoginAccount(username, previewEnabled)
  if (!fixture) return null
  if (fixture.loginType !== 'internal') return 'wrong-login-type'
  return resolvePocAccountState(fixture, readRequests, readFirstAccessApprovals)
}

function resolvePocAccountState(
  fixture: PocLoginAccount,
  readRequests: () => string | null,
  readFirstAccessApprovals: () => string | null
): PocLoginResult {
  if (!fixture.disabled) {
    if (fixture.accessReason !== 'first-access') return 'active'
    const approvals: unknown = JSON.parse(readFirstAccessApprovals() || '[]')
    if (!Array.isArray(approvals)) throw new Error('Invalid POC first-access approval storage')
    // Only this fixture's executed first-access request changes its browser demo state.
    const completedFirstAccess = approvals.some((row) => row && typeof row === 'object'
      && row.source === 'first-access' && row.typeKey === 'change'
      && row.personType === 'internal' && row.applicantPersonType === 'internal'
      && typeof row.applicantItcode === 'string' && row.applicantItcode.trim().toLowerCase() === fixture.username
      && typeof row.targetItcode === 'string' && row.targetItcode.trim().toLowerCase() === fixture.username
      && row.statusKey === 'done' && row.nodeType === 'done'
      && Array.isArray(row.businessApprovalTasks) && row.businessApprovalTasks.length > 0
      && row.businessApprovalTasks.every((task: { status?: string } | null) => task?.status === 'approved')
      && Array.isArray(row.approvalLogs)
      && row.approvalLogs.some((log: { action?: string; operator?: string } | null) => log?.action === 'execute-success' && log.operator === 'system'))
    return completedFirstAccess ? 'active' : 'no-access'
  }

  const rows: unknown = JSON.parse(readRequests() || '[]')
  if (!Array.isArray(rows)) throw new Error('Invalid POC account request storage')
  // Only an executed approval changes the fixture's initial disabled state.
  // A newer pending/rejected request must not undo an already completed enable.
  const completedEnable = rows.find((row) => row && typeof row === 'object'
    && row.typeKey === 'enable'
    && row.statusKey === 'done' && row.nodeType === 'done'
    && typeof row.targetItcode === 'string'
    && row.targetItcode.toLowerCase() === fixture.username)
  return completedEnable ? 'active' : 'disabled'
}
