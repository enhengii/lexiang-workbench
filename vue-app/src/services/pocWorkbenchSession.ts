// Browser UI state only; this is never a backend credential or authentication token.
export const POC_WORKBENCH_SESSION_KEY = 'leaibot-poc-demo:workbench-admin-session'
export const POC_WORKBENCH_SESSION_VALUE = 'adfs-admin-workbench-v1'

export function hasPocWorkbenchSession(storage: Pick<Storage, 'getItem'>): boolean {
  try {
    return storage.getItem(POC_WORKBENCH_SESSION_KEY) === POC_WORKBENCH_SESSION_VALUE
  } catch {
    return false
  }
}
