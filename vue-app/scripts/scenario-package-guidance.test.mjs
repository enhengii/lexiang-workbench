import assert from 'node:assert/strict'
import test from 'node:test'
import * as domain from '../src/domain/scenarioSkillPackages.js'
import { scenarioPackageEditGuidance as guidance } from '../src/domain/scenarioPackageGuidance.js'

const at = '2026-10-29T03:00:00.000Z'
const owner = { id: 'owner', permissions: ['scenario-package:create', 'scenario-package:compose:cross-menu'] }
const admin = { id: 'admin', permissions: ['scenario-package:review'] }
const viewer = { id: 'other', permissions: [] }
const ownerAdmin = { id: owner.id, permissions: admin.permissions }
const step = { id: 'one', skillId: 'skill-one', name: '节点一', menu: 'one', pinnedVersion: 'v1', currentPublishedVersion: 'v1', required: true, dependencyState: 'available', permissions: {} }
const first = (status = 'draft') => ({ id: 'package-one', name: '场景包', description: '说明', targetAudience: '运营', ownerId: owner.id, status, version: 'v1.0.0', steps: [structuredClone(step)], auditEvents: [] })
function published(status = 'published', dependency = 'available') {
  const item = { ...first(status), onlineStatus: status, submittedBy: owner.id, submittedAt: at,
    revisionEditors: [owner.id], auditEvents: [
      { type: 'submitted', actorId: owner.id, at },
      { type: 'approved', actorId: 'independent-reviewer', at },
      { type: 'published', actorId: 'independent-reviewer', at }
    ] }
  item.steps[0].dependencyState = dependency
  item.publishedSnapshot = structuredClone(item)
  return item
}
function revision(status = 'draft', onlineStatus = 'published', dependency = 'available') {
  return { ...published(onlineStatus, dependency), status, version: 'v1.0.1' }
}
function pending(item = first(), submittedBy = owner.id, editors = [owner.id]) {
  return { ...item, status: 'review', submittedAt: at, submittedBy, revisionEditors: editors,
    auditEvents: [...item.auditEvents, { type: 'submitted', actorId: submittedBy, at }] }
}

test('first drafts and rejections explain their distinct state and creator identity', () => {
  assert.match(guidance(first(), owner).detail, /首次.*草稿/)
  assert.match(guidance(first('rejected'), owner).detail, /首次.*驳回/)
  assert.match(guidance(first(), owner).detail, /你是创建者/)
  assert.match(guidance(first('rejected'), owner).detail, /驳回意见/)
})

test('non-creator administrators cannot maintain first publication content and are not called view-only', () => {
  for (const status of ['draft', 'rejected']) {
    const item = first(status)
    assert.equal(domain.scenarioPackageActions(item, admin).includes('edit'), false)
    assert.match(guidance(item, admin).detail, /非创建者的管理员/)
    assert.match(guidance(item, admin).detail, /创建及跨菜单编排权限的创建者/)
    assert.doesNotMatch(guidance(item, admin).detail, /只能查看|仅可查看/)
  }
})

test('a creator who only has review permission cannot edit an unpublished first draft', () => {
  assert.equal(domain.scenarioPackageActions(first(), ownerAdmin).includes('edit'), false)
  assert.match(guidance(first(), ownerAdmin).detail, /创建者.*缺少.*编辑权限/)
  assert.match(guidance(first(), ownerAdmin).detail, /首次.*创建及跨菜单编排权限/)
})

test('review-only administrators including the owner may maintain published and disabled revisions', () => {
  for (const actor of [admin, ownerAdmin]) {
    for (const item of [published(), published('disabled'), revision(), revision('rejected')]) {
      assert.ok(domain.scenarioPackageActions(item, actor).includes('edit'))
      const text = guidance(item, actor).detail
      assert.match(text, actor.id === owner.id ? /你是创建者.*管理员/ : /非创建者的管理员/)
      assert.match(text, /原创建者不变/)
      assert.match(text, /试运行.*提审.*仍需.*检查/)
      assert.doesNotMatch(text, /需具备创建及跨菜单编排权限后/)
    }
  }
})

test('revision drafts and rejections distinguish the working copy from the reviewed online version', () => {
  assert.match(guidance(revision(), owner).detail, /修订草稿/)
  assert.match(guidance(revision('rejected'), owner).detail, /修订.*驳回/)
  for (const status of ['draft', 'rejected']) {
    assert.match(guidance(revision(status), owner).detail, /尚未替换已审核线上版本/)
  }
})

test('disabled revisions remain disabled even after approval and require separate enable checks', () => {
  for (const item of [published('disabled'), revision('draft', 'disabled'), pending(revision('draft', 'disabled'))]) {
    for (const actor of [owner, admin, viewer]) {
      assert.match(guidance(item, actor).detail, /修订审核通过仍禁用/)
      assert.match(guidance(item, actor).detail, /须由具备启用权限的管理员另行启用/)
      assert.match(guidance(item, actor).detail, /启用.*检查/)
    }
  }
})

test('published dependency states are explicit without promising runtime access', () => {
  assert.match(guidance(published(), owner).detail, /已发布/)
  assert.match(guidance(published(), owner).detail, /依赖正常/)
  const paused = guidance(published('published', 'unavailable'), admin).detail
  assert.match(paused, /暂停/)
  assert.match(paused, /恢复依赖.*重新检查/)
  const upgrade = guidance(published('published', 'update_available'), viewer).detail
  assert.match(upgrade, /待升级.*原版本.*可能正常使用/)
  assert.match(upgrade, /升级.*试运行.*审核/)
})

test('online dependency guidance uses the reviewed snapshot rather than a different working-copy health', () => {
  const item = revision('draft', 'published', 'unavailable')
  item.steps = [{ ...step, dependencyState: 'available' }]
  assert.match(guidance(item, owner).detail, /已审核线上版本.*暂停/)
  const inverse = revision()
  inverse.steps[0].dependencyState = 'unavailable'
  assert.match(guidance(inverse, owner).detail, /已审核线上版本.*依赖正常/)
})

test('creators and actual submitters can withdraw but subsequent editing is rechecked', () => {
  const item = pending(revision(), admin.id, [owner.id, admin.id])
  for (const actor of [owner, admin]) {
    assert.ok(domain.scenarioPackageActions(item, actor).includes('withdraw'))
    const text = guidance(item, actor).detail
    assert.match(text, /可先撤回审核/)
    assert.match(text, actor === owner ? /创建者/ : /本轮提交人/)
    assert.match(text, /继续编辑和提审仍需具备.*编辑权限/)
    assert.match(text, /创建者、提交人和本轮编辑者均不能自审/)
  }
})

test('independent reviewers and participating administrators receive distinct review guidance', () => {
  const clean = pending()
  assert.match(guidance(clean, admin).detail, /独立管理员.*可审批或驳回/)
  assert.match(guidance(clean, admin).detail, /不能直接编辑/)
  const edited = pending(revision(), owner.id, [owner.id, admin.id])
  assert.equal(domain.evaluateScenarioPackageReview(edited, admin).ok, false)
  assert.match(guidance(edited, admin).detail, /参与了本轮编辑.*不能审核自己的修改/)
  assert.doesNotMatch(guidance(edited, admin).detail, /当前账号可审批或驳回|可先撤回审核/)
})

test('lost permissions retain creator, submitter and contributor identity without offering review or withdrawal', () => {
  const item = pending(revision(), admin.id, ['contributor', admin.id])
  for (const id of [owner.id, admin.id, 'contributor']) {
    const actor = { id, permissions: [] }
    assert.deepEqual(domain.scenarioPackageActions(item, actor), ['view'])
    const text = guidance(item, actor).detail
    assert.match(text, id === owner.id ? /创建者/ : id === admin.id ? /本轮提交人/ : /本轮编辑/)
    assert.match(text, /当前账号没有撤回或审核权限/)
    assert.doesNotMatch(text, /可先撤回审核|当前账号可审批或驳回/)
  }
})

test('invalid submission evidence is distinguished from a missing review permission', () => {
  for (const patch of [{ auditEvents: [] }, { submittedAt: '' }, { submittedBy: '' }, { ownerId: '' }]) {
    const item = { ...pending(), ...patch }
    assert.ok(domain.evaluateScenarioPackageReview(item, admin).reasons.includes('缺少有效的提交审核记录'))
    const text = guidance(item, admin).detail
    assert.match(text, /提交审核记录无效/)
    assert.doesNotMatch(text, /没有.*审核权限|缺少.*审核权限|当前账号可审批或驳回/)
  }
  const withdrawable = { ...pending(), auditEvents: [] }
  assert.ok(domain.scenarioPackageActions(withdrawable, owner).includes('withdraw'))
  assert.match(guidance(withdrawable, owner).detail, /可先撤回审核/)
  assert.match(guidance(withdrawable, owner).detail, /提交审核记录无效/)
})

test('missing account identity is explained without claiming administrator or author actions', () => {
  const actor = { id: '', permissions: ['*'] }
  for (const item of [first(), published(), pending()]) {
    assert.deepEqual(domain.scenarioPackageActions(item, actor), ['view'])
    assert.match(guidance(item, actor).detail, /账号身份未确认/)
    assert.doesNotMatch(guidance(item, actor).detail, /当前账号可编辑|可先撤回审核|可审批或驳回/)
  }
})

test('provided store decisions take precedence over a stale displayed review record', () => {
  const displayed = pending()
  const current = { ...displayed, auditEvents: [] }
  assert.equal(domain.evaluateScenarioPackageReview(displayed, admin).ok, true)
  const result = guidance(displayed, admin, {
    actions: domain.scenarioPackageActions(current, admin),
    reviewDecision: domain.evaluateScenarioPackageReview(current, admin)
  })
  assert.match(result.detail, /提交审核记录无效/)
  assert.doesNotMatch(result.detail, /当前账号可审批或驳回/)
})

test('partial authoring grants and a role label never produce editing promises', () => {
  for (const permissions of [['scenario-package:create'], ['scenario-package:compose:cross-menu'], []]) {
    const actor = { id: owner.id, role: 'admin', permissions }
    for (const item of [first(), first('rejected'), published(), revision()]) {
      assert.equal(domain.scenarioPackageActions(item, actor).includes('edit'), false)
      assert.match(guidance(item, actor).detail, /创建者.*(?:缺少.*编辑权限|没有编辑权限)/)
      assert.doesNotMatch(guidance(item, actor).detail, /当前账号可编辑/)
    }
  }
})

test('a forged published snapshot does not give an administrator revision editing permission', () => {
  const item = revision()
  item.publishedSnapshot.auditEvents = []
  assert.equal(domain.scenarioPackageActions(item, admin).includes('edit'), false)
  assert.match(guidance(item, admin).detail, /没有编辑权限/)
  assert.match(guidance(item, admin).detail, /已审核版本记录/)
})

test('mismatched or unreviewed published records never claim a healthy reviewed online version', () => {
  const mutations = [
    item => { item.publishedSnapshot.id = 'another-package' },
    item => { item.publishedSnapshot.ownerId = 'another-owner' },
    item => { item.publishedSnapshot.version = '' },
    item => { item.publishedSnapshot.version = 123 },
    item => { item.publishedSnapshot.auditEvents = [] },
    item => { item.publishedSnapshot.auditEvents = null },
    item => { item.publishedSnapshot.auditEvents = item.publishedSnapshot.auditEvents.filter(event => event.type !== 'published') },
    item => { item.publishedSnapshot.auditEvents.push({ type: 'approved', actorId: owner.id, at }) },
    item => { item.publishedSnapshot.revisionEditors.push('independent-reviewer') },
    item => { item.publishedSnapshot.auditEvents.push({ type: 'approved', actorId: '', at }) },
    item => { item.publishedSnapshot.steps.push(structuredClone(item.publishedSnapshot.steps[0])); item.publishedSnapshot.auditEvents = [] }
  ]
  for (const mutate of mutations) {
    for (const status of ['published', 'disabled', 'draft', 'rejected', 'review']) {
      const item = ['published', 'disabled'].includes(status) ? published(status) : status === 'review' ? pending(revision()) : revision(status)
      mutate(item)
      const before = structuredClone(item)
      for (const actor of [owner, admin, viewer]) {
        const result = guidance(item, actor)
        assert.match(result.detail, /记录待核对/)
        assert.match(result.detail, /暂不能确认.*可用性/)
        assert.doesNotMatch(result.detail, /当前内容是已发布的已审核版本|已审核线上版本保持启用|已审核线上版本保持禁用|依赖正常|可能正常使用/)
        assert.ok(result.detail.split('。').filter(Boolean).length <= 4)
      }
      assert.deepEqual(item, before)
    }
  }
})

test('valid legacy records remain verifiable without an embedded snapshot or use permission', () => {
  const item = published()
  delete item.publishedSnapshot
  for (const actor of [owner, admin, viewer]) {
    assert.match(guidance(item, actor).detail, /已审核线上版本保持启用.*依赖正常/)
    assert.doesNotMatch(guidance(item, actor).detail, /记录待核对/)
  }
})

test('all supported state and role combinations stay concise and do not mutate records or permission results', () => {
  const items = [first(), first('rejected'), pending(), published(), published('disabled'), revision(), revision('rejected'), pending(revision())]
  for (const item of items) {
    for (const actor of [owner, ownerAdmin, admin, viewer, { ...owner, permissions: [] }]) {
      const before = structuredClone(item)
      const beforeActions = domain.scenarioPackageActions(item, actor)
      const result = guidance(item, actor)
      assert.equal(typeof result.summary, 'string')
      assert.ok(result.detail.split('。').filter(Boolean).length <= 4, result.detail)
      assert.doesNotMatch(result.detail, /只能查看|仅可查看/)
      assert.deepEqual(item, before)
      assert.deepEqual(domain.scenarioPackageActions(item, actor), beforeActions)
    }
  }
})
