/** Activity points extends the existing session; it never creates or grants roles. */
export type ActivityPointsAction = 'view' | 'configure' | 'extend' | 'export' | 'settle'

// This page currently operates only on synthetic local data. Preview access is
// not a role grant and must never authorize a real ledger or business API.
export function isActivityPointsDemoPreview(): boolean {
  return typeof window !== 'undefined' && window.location.hostname === 'new.leaibot.cn'
}

export interface PointsMenuGroup {
  icon: string
  label: string
  children: Record<string, { label: string; path: string; section?: string }>
}

export const ACTIVITY_POINTS_MENU: PointsMenuGroup = {
  icon: '<svg class="menu-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6.6"/><path d="m10 5 1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3L5.2 8.5 8.5 8z"/></svg>',
  label: '促销中心',
  children: {
    'points.detailExport': { label: '明细导出', path: '/points/detail-export', section: '积分管理' },
    'points.accountDetails': { label: '账户明细', path: '/points/account-details', section: '积分管理' },
    'points.deductionRules': { label: '积分抵现规则', path: '/points/deduction-rules', section: '积分管理' },
    'points.channels': { label: '渠道管理', path: '/points/channels', section: '积分管理' },
    'points.accounts': { label: '账户查询', path: '/points/accounts', section: '积分管理' },
    'points.currencies': { label: '虚拟币管理', path: '/points/currencies', section: '积分管理' },
    'points.rules': { label: '积分规则', path: '/points/rules', section: '积分管理' },
    'points.activity': { label: '活动积分配置', path: '/points/activity', section: '积分管理' },
    'points.activityDetails': { label: '活动积分明细', path: '/points/activity-details', section: '积分管理' }
  }
}

export function canUseActivityPoints(
  user: string | null,
  role: string | null,
  permissions: readonly string[],
  action: ActivityPointsAction = 'view',
  previewDemo = isActivityPointsDemoPreview()
): boolean {
  if (!user) return false
  if (previewDemo) return true
  if (role === '平台管理员' || permissions.includes('*')) return true
  if (!permissions.includes('points.activity.view')) return false
  return action === 'view' || permissions.includes(`points.activity.${action}`)
}

export function withActivityPointsMenu(
  existing: Record<string, PointsMenuGroup>,
  user: string | null,
  role: string | null,
  permissions: readonly string[],
  previewDemo = isActivityPointsDemoPreview()
): Record<string, PointsMenuGroup> {
  const result = { ...existing }
  const promotion = existing.promotion || ACTIVITY_POINTS_MENU
  const children = { ...promotion.children }
  const canView = canUseActivityPoints(user, role, permissions, 'view', previewDemo)
  for (const [pageId, page] of Object.entries(ACTIVITY_POINTS_MENU.children)) {
    if (canView) children[pageId] = page
    else delete children[pageId]
  }
  if (Object.keys(children).length) result.promotion = { ...promotion, children }
  else delete result.promotion
  return result
}
