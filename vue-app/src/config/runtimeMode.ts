import { pocLoginEnabled, runtimePaths } from '@/services/pocIsolation'

// Local integration only; never enable this database/test-service adapter in a release build.
export const permissionLabEnabled = import.meta.env.DEV && import.meta.env.VITE_PERMISSION_LAB === 'true'
export const AUTH_MODE = permissionLabEnabled ? 'server' : import.meta.env.VITE_AUTH_MODE || (import.meta.env.DEV ? 'preview' : 'server')

export const allowPreviewAuth = AUTH_MODE === 'preview'

// Opt in at build time for an online POC; never change server authentication mode.
export const allowPocLogin = !permissionLabEnabled && pocLoginEnabled(import.meta.env.VITE_POC_LOGIN_ENABLED, import.meta.env.DEV)
const paths = runtimePaths(import.meta.env.BASE_URL, typeof window === 'undefined' ? '' : window.location?.pathname || '')
export const normalAppBase = paths.normalBase
export const pocAppBase = paths.demoBase
export const pocWorkbenchBase = paths.workbenchBase
export const isPocWorkbench = paths.workbench
export const isPocSandbox = paths.sandbox
export const appBase = paths.routerBase
export const allowPocSimulation = allowPocLogin && isPocSandbox
export const allowPocMailReview = permissionLabEnabled || allowPreviewAuth || allowPocSimulation

// Approval mail uses browser-local POC data; enabling it never creates a login session.
export const allowApprovalMailDemo = allowPocMailReview || (
  !isPocSandbox && typeof window !== 'undefined' && ['new.leaibot.cn', 'leaibot.cn'].includes(window.location.hostname)
)
