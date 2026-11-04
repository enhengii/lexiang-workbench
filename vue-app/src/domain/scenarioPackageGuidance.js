import {
  evaluatePackageHealth,
  evaluateRuntimeAccess,
  evaluateScenarioPackageReview,
  getScenarioRuntimePackage,
  resolveScenarioChain,
  scenarioPackageActions,
  scenarioPackageRole,
  scenarioPublishedSnapshot
} from './scenarioSkillPackages.js'

const contentDescriptions = {
  firstDraft: '当前内容是首次发布前的草稿，尚无已审核线上版本。',
  firstRejected: '当前内容是首次发布被驳回的内容，尚无已审核线上版本。',
  revisionDraft: '当前内容是已发布版本的修订草稿，尚未替换已审核线上版本。',
  revisionRejected: '当前修订已被驳回，尚未替换已审核线上版本。',
  firstReview: '当前内容待首次发布审核，期间不能直接编辑。',
  revisionReview: '当前修订待审核，期间不能直接编辑，也尚未替换已审核线上版本。',
  published: '当前内容是已发布的已审核版本。',
  disabled: '此技能包已禁用，编辑只会形成修订。',
  unknown: '当前内容状态无法确认，请重新打开详情核对。'
}

const independentReview = '创建者、提交人和本轮编辑者均不能自审，须由其他管理员审核'
const otherOperations = '应用、审核和启停分别按当前账号权限及页面可用操作判断。'

const unverifiedRecordDescriptions = {
  draft: '当前内容为草稿，关联的历史版本记录待核对。',
  rejected: '当前内容已被驳回，关联的历史版本记录待核对。',
  review: '当前内容待审核，期间不能直接编辑；关联的历史版本记录待核对。',
  published: '当前记录标记为已发布，审核与发布记录待核对。',
  disabled: '此技能包已禁用，审核与发布记录待核对。'
}

// Presentation check only: never controls actions or runtime access. Reuse the domain's
// normalized snapshot and audit validation; caller permission/health failures are not record errors.
function publishedRecordNeedsCheck(packageItem, actor) {
  const snapshot = scenarioPublishedSnapshot(packageItem)
  if (!snapshot || ![snapshot.id, snapshot.ownerId, snapshot.version].every(value => typeof value === 'string' && value.trim())
    || !Array.isArray(snapshot.auditEvents) || snapshot.auditEvents.some(event => !event || typeof event !== 'object')
    || !Array.isArray(snapshot.steps) || snapshot.steps.length === 0 || !resolveScenarioChain(snapshot.steps).ok) return true
  const access = evaluateRuntimeAccess(snapshot, actor)
  return access.explanations.some(reason => /^技能包(?:缺少.*审计证据|的审批审计来自本人)/.test(reason))
}

function onlineDescription(packageItem, hasPublishedVersion, recordNeedsCheck) {
  if (!hasPublishedVersion) return ''
  if (recordNeedsCheck) {
    return '关联版本缺少完整且匹配的审核或发布记录，暂不能确认线上状态和可用性；请先核对记录。'
  }
  const runtime = getScenarioRuntimePackage(packageItem)
  if (runtime.status === 'disabled') {
    return '已审核线上版本保持禁用；修订审核通过仍禁用，须由具备启用权限的管理员另行启用，启用后也须通过依赖和调用权限检查。'
  }
  const health = evaluatePackageHealth(runtime.steps || [])
  if (health.status === 'paused') {
    return '已审核线上版本因依赖不可用而暂停；恢复依赖后仍需重新检查，编辑或审核通过不代表自动恢复可用。'
  }
  if (health.status === 'upgrade_required') {
    return '已审核线上版本待升级，仍固定原版本且可能正常使用；升级需重新评估、试运行及审核，实际应用仍需另行校验。'
  }
  return '审核前，已审核线上版本保持启用，当前依赖正常；实际应用仍需另行校验。'
}

/**
 * Explain existing policy decisions without granting or denying any action.
 * The view supplies its store decisions so the copy and buttons use the same record.
 * @param {import('./scenarioSkillPackages.js').ScenarioPackageDraft} packageItem
 * @param {import('./scenarioSkillPackages.js').ScenarioActor} actor
 * @param {{ actions?: string[], reviewDecision?: { ok: boolean, reasons: string[] } }} decisions
 * @returns {{ summary: string, detail: string }}
 */
export function scenarioPackageEditGuidance(packageItem, actor, decisions = {}) {
  const actions = decisions.actions ?? scenarioPackageActions(packageItem, actor)
  const reviewDecision = decisions.reviewDecision ?? evaluateScenarioPackageReview(packageItem, actor)
  const actorId = typeof actor?.id === 'string' ? actor.id.trim() : ''
  const isOwner = Boolean(actorId && actor.id === packageItem.ownerId)
  const isSubmitter = Boolean(actorId && actor.id === packageItem.submittedBy)
  const isEditor = Boolean(actorId && packageItem.revisionEditors?.includes(actorId))
  const isAdmin = Boolean(actorId && scenarioPackageRole(actor) === 'admin')
  const hasPublishedVersion = Boolean(packageItem.publishedSnapshot) || ['published', 'disabled'].includes(packageItem.status)
  const recordNeedsCheck = hasPublishedVersion && publishedRecordNeedsCheck(packageItem, actor)
  const isRejected = packageItem.status === 'rejected'
  const stateDescription = recordNeedsCheck
    ? unverifiedRecordDescriptions[packageItem.status] || contentDescriptions.unknown
    : packageItem.status === 'review'
    ? contentDescriptions[hasPublishedVersion ? 'revisionReview' : 'firstReview']
    : packageItem.status === 'draft' || isRejected
      ? contentDescriptions[hasPublishedVersion ? (isRejected ? 'revisionRejected' : 'revisionDraft') : (isRejected ? 'firstRejected' : 'firstDraft')]
      : contentDescriptions[packageItem.status] || contentDescriptions.unknown
  const online = onlineDescription(packageItem, hasPublishedVersion, recordNeedsCheck)
  const result = (summary, identity, nextStep) => ({
    summary,
    detail: [stateDescription, identity, nextStep, online].filter(Boolean).join('')
  })

  if (actions.includes('edit')) {
    const identity = isOwner
      ? `你是创建者${isAdmin ? '，同时具备管理员维护权限' : ''}`
      : '你是非创建者的管理员'
    const editableContent = hasPublishedVersion ? '该技能包的修订' : isRejected ? '首次被驳回的内容' : '首次草稿'
    return result(
      hasPublishedVersion ? '可编辑修订' : isRejected ? '可修改后重新提审' : '可编辑首次草稿',
      `${identity}，当前账号可编辑${editableContent}${hasPublishedVersion ? '，原创建者不变' : ''}。`,
      `${isRejected ? '请按驳回意见修改；' : ''}保存后，${hasPublishedVersion || isRejected ? '重新' : ''}试运行和提审仍需通过依赖、引用与执行权限等检查；${independentReview}。`
    )
  }

  if (!actorId) {
    return result('当前账号身份未确认', '当前账号身份未确认，无法取得编辑、撤回或审核权限。', '请重新登录后核对可用操作。')
  }

  if (packageItem.status === 'review') {
    // Read the review result instead of inferring a permission failure from missing buttons.
    const invalidSubmission = reviewDecision.reasons.includes('缺少有效的提交审核记录')
    const selfReview = reviewDecision.reasons.some(reason => reason.startsWith('不能审核本人创建、编辑或提交'))
    if (actions.includes('withdraw')) {
      const identity = isOwner ? '你是创建者' : `你是${isAdmin ? '非创建者的管理员，也是' : ''}本轮提交人`
      return result(
        '待审核暂不可编辑，可先撤回',
        `${identity}，可先撤回审核。`,
        `${invalidSubmission ? '提交审核记录无效，当前不能审核；' : ''}撤回后回到草稿，继续编辑和提审仍需具备该内容的编辑权限；${independentReview}。`
      )
    }
    if (actions.includes('approve') && actions.includes('reject')) {
      return result(
        '待审核暂不可编辑，可审核',
        '你是未参与本轮修改的独立管理员，当前账号可审批或驳回；审批时仍会校验当前内容及依赖。',
        '如需修改，应先由具备相应权限的创建者或本轮提交人撤回，不能直接编辑待审核内容。'
      )
    }
    const identity = isOwner ? '你是创建者'
      : isSubmitter ? `你是${isAdmin ? '非创建者的管理员，也是' : ''}本轮提交人`
        : isAdmin ? '你是非创建者的管理员'
          : isEditor ? '你参与了本轮编辑' : '你不是创建者或本轮提交人'
    if (invalidSubmission) {
      return result(
        '提交记录异常，暂不能审核',
        `${identity}，提交审核记录无效，暂不能审批或驳回。`,
        `请先核对提交记录，由具备相应权限的创建者或本轮提交人撤回后重新提审；${independentReview}。`
      )
    }
    if (isAdmin && selfReview) {
      return result(
        '参与本轮内容，不能自审',
        `${identity}，${isEditor ? '参与了本轮编辑，不能审核自己的修改' : '不能审核本人创建或提交的内容'}。`,
        '当前内容应由其他管理员审核；如需修改，须由具备相应权限的创建者或本轮提交人撤回。'
      )
    }
    return result(
      '待审核暂不可编辑，无撤回或审核权限',
      `${identity}，但当前账号没有撤回或审核权限。`,
      `请恢复相应权限，或由有权限的创建者、本轮提交人或独立管理员处理；${independentReview}。`
    )
  }

  if (!hasPublishedVersion && ['draft', 'rejected'].includes(packageItem.status)) {
    return result(
      isOwner ? '创建者当前缺少编辑权限' : '未发布内容，仅创建者可编辑',
      isOwner
        ? '你是创建者，但当前账号缺少此内容所需的编辑权限；首次发布前需具备创建及跨菜单编排权限。'
        : `你${isAdmin ? '是非创建者的管理员' : '不是创建者'}，此技能包尚未发布，需由具备创建及跨菜单编排权限的创建者维护。`,
      otherOperations
    )
  }
  return result(
    '当前账号无编辑权限',
    isOwner
      ? '你是创建者，但当前账号没有编辑权限；请恢复创建及跨菜单编排权限，或由具备维护权限的管理员处理。'
      : isAdmin
        ? '你是非创建者的管理员，但当前账号没有编辑权限；请核对已审核版本记录后再尝试。'
        : '你不是创建者，当前账号没有编辑权限；可由具备维护权限的创建者或管理员处理。',
    otherOperations
  )
}
