import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function source(path) {
  try {
    return await readFile(new URL(path, import.meta.url), 'utf8')
  } catch {
    return ''
  }
}

function functionSource(sourceText, name) {
  const signatures = [`function ${name}(`, `async function ${name}(`]
  const start = signatures
    .map(signature => sourceText.indexOf(signature))
    .filter(index => index >= 0)
    .sort((left, right) => left - right)[0] ?? -1
  assert.notEqual(start, -1, `missing ${name}`)

  const followingStarts = [
    sourceText.indexOf('\nfunction ', start + 1),
    sourceText.indexOf('\nasync function ', start + 1),
    sourceText.indexOf('\nonMounted(', start + 1),
    sourceText.indexOf('\nonBeforeUnmount(', start + 1)
  ].filter(index => index >= 0)
  const end = followingStarts.length ? Math.min(...followingStarts) : sourceText.length
  return sourceText.slice(start, end)
}

function lifecycleSource(sourceText, name) {
  const start = sourceText.indexOf(`${name}(() => {`)
  assert.notEqual(start, -1, `missing ${name}`)
  const end = sourceText.indexOf('\n})', start)
  assert.notEqual(end, -1, `unterminated ${name}`)
  return sourceText.slice(start, end + 3)
}

test('login keeps the confirmed internal and external account lifecycle', async () => {
  const [router, login] = await Promise.all([
    source('../src/router/index.ts'),
    source('../src/views/LoginView.vue')
  ])

  for (const path of ['/adfs-login', '/access-denied', '/account-request/status', '/mail-approval/action']) {
    assert.match(router, new RegExp(path.replaceAll('/', '\\\/')))
  }
  assert.match(router, /admin-cleanup-email/)
  assert.match(login, /内部用户登录/)
  assert.match(login, /外部用户登录/)
  assert.match(login, /loginType: 'adfs'/)
  assert.doesNotMatch(login, /goAdfsLogin|内网ADFS登录/)
  assert.doesNotMatch(login, /忘记密码|<ExternalPasswordRecoveryModal|@click="openEnableRequest"/)
  assert.match(login, /EXTERNAL_DISABLED_MESSAGE/)
  assert.match(login, /创建账户\/注册/)
})

test('report actions download instead of persisting local save state', async () => {
  const [messages, report, aiStore] = await Promise.all([
    source('../src/components/agent/AgentMessageList.vue'),
    source('../src/components/TempTabView.vue'),
    source('../src/stores/ai.ts')
  ])

  assert.match(messages, /下载/)
  assert.doesNotMatch(messages, /save-report|已保存' : '保存'/)
  assert.doesNotMatch(report, /saveTab|已保存' : '保存'/)
  assert.doesNotMatch(aiStore, /报告可保存|可展开、可保存|保存状态/)
})

test('AI authorization offers distinct current-operation and whole-Skill approval entries', async () => {
  const [messages, taskCard, aiStore] = await Promise.all([
    source('../src/components/agent/AgentMessageList.vue'),
    source('../src/components/agent/AgentTaskCard.vue'),
    source('../src/stores/ai.ts')
  ])

  assert.doesNotMatch(messages, /namespace:/)
  assert.doesNotMatch(messages, /ai-auth-command/)
  assert.match(messages, /授权内容/)
  assert.match(taskCard, /授权范围/)
  assert.match(taskCard, /影响说明/)
  assert.match(taskCard, />授权<\/button>/)
  assert.match(taskCard, />批量授权<\/button>/)
  assert.match(taskCard, />拒绝<\/button>/)
  assert.match(taskCard, /@click="decide\('approve'\)"/)
  assert.match(taskCard, /@click="decide\('approve', 'batch'\)"/)
  assert.match(taskCard, /scope: 'skill-execution'/)
  assert.doesNotMatch(taskCard, /type="checkbox"|授权选中项|单独授权此项|全选/)
  assert.match(messages, /auth_task_decide/)
  assert.match(aiStore, /batchApproveLabel/)
  assert.match(aiStore, /_createReadableAuthRequest/)
  assert.match(aiStore, /_tryQueryableSkillAuthorization/)
})

test('AI replies hide seed debug content and retain answer feedback', async () => {
  const [messages, aiStore] = await Promise.all([
    source('../src/components/agent/AgentMessageList.vue'),
    source('../src/stores/ai.ts')
  ])

  assert.match(messages, /stripSeedDebugBlocks/)
  assert.match(messages, /ai-reply-feedback/)
  assert.match(messages, /有帮助/)
  assert.match(messages, /没帮助/)
  assert.match(aiStore, /_stripSeedDebugBlocks/)
})

test('natural-language Skill creation opens the create workspace directly', async () => {
  const aiStore = await source('../src/stores/ai.ts')

  assert.match(aiStore, /function _isSkillCreateIntent/)
  assert.match(aiStore, /_isSkillCreateIntent\(text\)/)
  assert.match(aiStore, /router\?\.push\('\/agent\/skill-create'\)/)
  assert.doesNotMatch(aiStore, /技能管理\|创建\\s\*skill\|创建技能/)
})

test('account workspace opens scenario package creation directly and preserves its existing entries', async () => {
  const [footer, sidebar] = await Promise.all([
    source('../src/components/sidebar/SidebarFooter.vue'),
    source('../src/components/shell/sidebar/WorkbenchSidebar.vue')
  ])

  for (const label of ['创建 Skill', '创建场景技能包', 'Skill Hub', '权限管理', '调整日志']) {
    assert.match(footer, new RegExp(label))
  }
  assert.match(footer, /@click="\$emit\('open-scenario-package-create'\)"/)
  assert.match(footer, /'open-scenario-package-create'/)
  assert.match(sidebar, /@open-scenario-package-create="openScenarioPackageCreatePage"/)

  const navigation = functionSource(sidebar, 'openScenarioPackageCreatePage')
  assert.match(navigation, /closeUserMenu\(\)/)
  assert.match(navigation, /ensureStaticTab\('agent\.scenarioPackageCreate'\)/)
  assert.match(navigation, /setActiveStaticTab\('agent\.scenarioPackageCreate'\)/)
  assert.match(navigation, /router\.push\('\/agent\/scenario-package-create'\)/)
})

test('account workspace separates creation and management rows responsively', async () => {
  const [footer, css] = await Promise.all([
    source('../src/components/sidebar/SidebarFooter.vue'),
    source('../src/assets/workbench.css')
  ])

  const accountStylesStart = css.indexOf('/* Account hub cards */')
  const agentOpenStylesStart = css.indexOf('html[data-product="leaibot"] body.ai-open .account-hub-popover', accountStylesStart)
  const agentOpenStylesEnd = css.indexOf('.account-hub-close', agentOpenStylesStart)
  const mediumStylesStart = css.indexOf('@media (max-width:1100px)', accountStylesStart)
  const mediumStylesEnd = css.indexOf('@media (max-width:1500px)', mediumStylesStart)
  const narrowStylesStart = css.indexOf('@media (max-width:680px)', mediumStylesEnd)
  const narrowStylesEnd = css.indexOf('/* ===== Portal 0615 adjustments ===== */', narrowStylesStart)
  const agentOpenStyles = css.slice(agentOpenStylesStart, agentOpenStylesEnd)
  const mediumStyles = css.slice(mediumStylesStart, mediumStylesEnd)
  const narrowStyles = css.slice(narrowStylesStart, narrowStylesEnd)

  assert.equal((footer.match(/account-hub-card-create/g) ?? []).length, 2)
  assert.equal((footer.match(/account-hub-card-manage/g) ?? []).length, 4)
  assert.match(footer, /@click="\$emit\('open-usage-dashboard'\)"[\s\S]*?<b>使用数据看板<\/b>/)
  assert.doesNotMatch(footer, /open-usage-creators/)
  assert.match(footer, /account-hub-card-log/)
  assert.match(footer, /<button type="button" class="account-hub-card account-hub-card-create primary"[^>]*>\s*<span[^>]*aria-hidden="true"[^>]*><svg[\s\S]*?<\/svg><\/span>\s*<b>创建 Skill<\/b>/)
  assert.match(footer, /<button type="button" class="account-hub-card account-hub-card-manage account-hub-card-log"[^>]*>[\s\S]*?<b>调整日志<\/b>/)
  assert.match(css, /\.account-hub-panel\s*\{[^}]*grid-template-columns:\s*repeat\(6,\s*minmax\(0,1fr\)\)/s)
  assert.match(css, /\.account-hub-card-create\s*\{[^}]*grid-column:\s*span 3/s)
  assert.match(css, /\.account-hub-card-manage\s*\{[^}]*grid-column:\s*span 2/s)
  assert.match(agentOpenStyles, /body\.ai-open \.account-hub-panel\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,1fr\)\)/s)
  assert.match(agentOpenStyles, /body\.ai-open \.account-hub-card-create,\s*html\[data-product="leaibot"\] body\.ai-open \.account-hub-card-manage\s*\{\s*grid-column:\s*auto/s)
  assert.match(agentOpenStyles, /body\.ai-open \.account-hub-card-log\s*\{\s*grid-column:\s*1 \/ -1/s)
  assert.match(mediumStyles, /\.account-hub-panel\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,1fr\)\)/s)
  assert.match(mediumStyles, /\.account-hub-card-create,\s*\.account-hub-card-manage\s*\{\s*grid-column:\s*auto/s)
  assert.match(mediumStyles, /\.account-hub-card-log\s*\{\s*grid-column:\s*1 \/ -1/s)
  assert.match(narrowStyles, /\.account-hub-panel,\s*html\[data-product="leaibot"\] body\.ai-open \.account-hub-panel\s*\{[^}]*grid-template-columns:\s*1fr/s)
  assert.match(narrowStyles, /html\[data-product="leaibot"\] body\.ai-open \.account-hub-popover\s*\{[^}]*inset:\s*0;[^}]*right:\s*0;[^}]*align-items:\s*flex-start;[^}]*padding:\s*72px 16px 24px/s)
  assert.match(narrowStyles, /\.account-hub-card-log,\s*html\[data-product="leaibot"\] body\.ai-open \.account-hub-card-log\s*\{[^}]*grid-column:\s*auto/s)
})

test('POC log records the scenario package quick entry as one new-only change', async () => {
  const sidebar = await source('../src/components/shell/sidebar/WorkbenchSidebar.vue')
  const start = sidebar.indexOf("releaseKey: 'scenario-skill-package-quick-entry-20260907'")
  const end = sidebar.indexOf('\n  },', start)
  const record = sidebar.slice(start, end)

  assert.notEqual(start, -1)
  assert.match(record, /title: '场景技能包外部创建入口'/)
  assert.match(record, /deployTargets: \['new'\]/)
  assert.match(record, /status: '已更新 new 预览'/)
  assert.doesNotMatch(record, /formal/)
})

test('Skill creation capability tooltip shows name above description', async () => {
  const view = await source('../src/views/agent/AgentSkillCreateView.vue')

  assert.match(view, /<strong>\{\{ contextSubtitleTooltip\.name \}\}<\/strong>\s*<span>\{\{ contextSubtitleTooltip\.text \}\}<\/span>/)
  assert.match(view, /name: item\.name,\s*text: item\.subtitle,/)
})

test('Skill evaluation supports independent case tuning and reevaluation', async () => {
  const view = await source('../src/views/agent/AgentSkillCreateView.vue')

  assert.match(view, /evalBaselineCases/)
  assert.match(view, /startCaseAiTune/)
  assert.match(view, /tunedCaseKeys/)
  assert.match(view, /kind: 'case'/)
  assert.match(view, /正在重新评估/)
})

test('Skill Hub classifies skills by first-level workbench menu', async () => {
  const [view, store] = await Promise.all([
    source('../src/views/agent/AgentSkillsView.vue'),
    source('../src/stores/skillHub.ts')
  ])

  assert.match(view, /MENU_TREE/)
  assert.match(view, /skillCategoryLabel/)
  assert.match(view, /一级菜单归类/)
  assert.doesNotMatch(store, /category: '数据查询'|category: '商品运营'|category: '知识问答'|category: '权益推荐'/)
})

test('Skill Hub lists the existing owner as creator', async () => {
  const view = await source('../src/views/agent/AgentSkillsView.vue')

  assert.match(view, /<th>绑定平台<\/th>\s*<th>创建人<\/th>\s*<th>描述<\/th>/)
  assert.match(view, /<td class="skill-hub-creator">\{\{ item\.owner \|\| '-' \}\}<\/td>/)
  assert.match(view, /<td colspan="10" class="skill-hub-detail-empty">/)
})

test('Skill Hub keeps the six Skill summaries while adding accessible package query tabs', async () => {
  const view = await source('../src/views/agent/AgentSkillsView.vue')

  for (const label of ['全部 Skill', '我的 Skill', '待审批', '已发布', '能力更新', '已禁用']) {
    assert.match(view, new RegExp(label))
  }
  assert.match(view, /role="tablist"[^>]*aria-label="Skill Hub 视图"/)
  assert.match(view, /\{ id: 'skills', label: 'Skill' \}/)
  assert.match(view, /\{ id: 'packages', label: '场景技能包' \}/)
  assert.match(view, /v-for="tab in hubTabs"[\s\S]*role="tab"/)
  assert.match(view, /:aria-selected="activeHubTab === tab\.id"/)
  assert.match(view, /:tabindex="activeHubTab === tab\.id \? 0 : -1"/)
  assert.match(view, /@keydown="handleHubTabKeydown\(\$event, tab\.id\)"/)
  for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) {
    assert.match(view, new RegExp(key))
  }
  assert.match(view, /useRoute\(\)/)
  assert.match(view, /route\.query\.tab === 'packages'/)
  assert.match(view, /router\.replace\(/)
  assert.match(view, /router\.push\('\/agent\/skill-create'\)/)
})

test('Skill Hub package view has independent filters, compact rows, details, and create return flow', async () => {
  const view = await source('../src/views/agent/AgentSkillsView.vue')

  assert.match(view, /import ScenarioSkillPackageCreateView from/)
  assert.match(view, /<ScenarioSkillPackageCreateView/)
  assert.match(view, /@cancel="closePackageCreate"/)
  assert.match(view, /@submitted="handlePackageSubmitted"/)
  assert.match(view, /:draft="editingPackage"/)
  assert.doesNotMatch(view, /@published=|handlePackagePublished/)
  assert.match(view, /packageKeyword/)
  assert.match(view, /packageStatusFilter/)
  assert.match(view, /filteredScenarioPackages/)
  for (const label of ['全部技能包', '已发布', '待升级', '已暂停']) {
    assert.match(view, new RegExp(label))
  }
  for (const heading of ['名称 / 场景描述', '主责任人', '涉及菜单', 'Skill 链路', '技能包版本', '状态', '更新时间', '操作']) {
    assert.match(view, new RegExp(`<th>${heading.replace('/', '\\/')}</th>`))
  }
  for (const status of ['待审核', '已驳回', '已发布', '待升级', '已暂停', '已禁用']) {
    assert.match(view, new RegExp(status))
  }
  assert.match(view, /packageItem\.version/)
  assert.match(view, /packageItem\.updatedAt/)
  assert.match(view, /packageItem\.steps\.length/)
  assert.match(view, /固定版本\s*\{\{ step\.pinnedVersion \}\}/)
  assert.match(view, /条件文本/)
  assert.match(view, /来源菜单/)
  assert.match(view, /技能包永不提权/)
  assert.match(view, /packageDependencyExplanation\(packageDetailItem\)/)
  assert.match(view, /packageDetailItem\.auditEvents/)
  assert.match(view, /const packageDetailId = ref\(''\)/)
  assert.match(view, /const packageDetailItem = computed\(\(\) =>[\s\S]{0,180}scenarioStore\.findPackage\(packageDetailId\.value\)/)
  assert.doesNotMatch(view, /packageDetailItem\.value = packageItem/)
  assert.match(view, /aria-modal="true"/)
  assert.match(view, /event\.key === 'Escape'/)
  assert.match(view, /packageDetailTrigger\?\.isConnected\) packageDetailTrigger\.focus\(\)/)
  assert.match(functionSource(view, 'openPackageCreate'), /router\.push\('\/agent\/scenario-package-create'\)/)
  assert.match(view, /query:\s*\{\s*tab:\s*'packages'\s*\}/s)
  assert.doesNotMatch(view, /scenarioStore\.resetToInitialMock\(\)/, 'page reload must preserve saved scenario packages')
})

test('submitting a package resets stale filters and selects pending review before revealing and focusing its row', async () => {
  const view = await source('../src/views/agent/AgentSkillsView.vue')
  const resetFilters = functionSource(view, 'resetPackageFilters')
  const submit = functionSource(view, 'handlePackageSubmitted')

  for (const reset of [
    "packageKeyword.value = ''",
    "packageStatusFilter.value = 'all'",
    "packageSummaryFilter.value = 'all'"
  ]) {
    assert.match(resetFilters, new RegExp(reset.replaceAll('.', '\\.')))
  }

  const resetIndex = submit.indexOf('resetPackageFilters()')
  const reviewFilterIndex = submit.indexOf("packageStatusFilter.value = 'review'")
  const routeIndex = submit.indexOf('await router.replace')
  const renderIndex = submit.indexOf('await nextTick()')
  const rowIndex = submit.indexOf('packageRowElements.get(packageItem.id)')
  const scrollIndex = submit.indexOf('scrollIntoView', rowIndex)
  const focusIndex = submit.indexOf('.focus()', rowIndex)
  assert.ok(resetIndex >= 0 && resetIndex < reviewFilterIndex && reviewFilterIndex < routeIndex, 'stale filters reset and pending review is selected before returning to the package table')
  assert.ok(routeIndex < renderIndex && renderIndex < rowIndex, 'row lookup waits for the pending-review table render')
  assert.ok(rowIndex < scrollIndex && scrollIndex < focusIndex, 'submitted row is scrolled into view and then focused')
  assert.match(submit, /已提交审核，等待管理员处理/)
})

test('package details own a complete modal keyboard lifecycle without changing the Skill modal', async () => {
  const view = await source('../src/views/agent/AgentSkillsView.vue')
  const dialogKeys = functionSource(view, 'handlePackageDetailKeydown')
  const documentKeys = functionSource(view, 'handlePackageDocumentKeydown')
  const closeDialog = functionSource(view, 'closePackageDetail')

  assert.match(view, /ref="packageDetailPanel"[^>]*role="dialog"[^>]*aria-modal="true"/)
  assert.match(view, /:inert="packageDetailItem \? true : undefined"/)
  assert.match(view, /:aria-hidden="packageDetailItem \? 'true' : undefined"/)
  assert.match(dialogKeys, /event\.key !== 'Tab'/)
  assert.match(dialogKeys, /event\.shiftKey/)
  assert.match(dialogKeys, /first\.focus\(\)/)
  assert.match(dialogKeys, /last\.focus\(\)/)
  assert.match(documentKeys, /!packageDetailItem\.value/)
  assert.match(documentKeys, /event\.key === 'Escape'/)
  assert.match(documentKeys, /closePackageDetail\(\)/)
  assert.match(view, /document\.addEventListener\('keydown', handlePackageDocumentKeydown\)/)
  assert.match(view, /document\.removeEventListener\('keydown', handlePackageDocumentKeydown\)/)
  assert.match(view, /nextTick\(\(\) => packageDetailClose\.value\?\.focus\(\)\)/)
  assert.match(closeDialog, /if \(packageDetailTrigger\?\.isConnected\) packageDetailTrigger\.focus\(\)/)
  assert.match(closeDialog, /else hubTabElements\.get\(activeHubTab\.value\)\?\.focus\(\)/)
  assert.match(view, /@click\.self="closePackageDetail"/)
  assert.match(view, /aria-label="关闭场景技能包详情"[^>]*@click="closePackageDetail"/)

  const legacySkillModal = view.match(/v-if="detailItem"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/)?.[0] ?? ''
  assert.doesNotMatch(legacySkillModal, /handlePackageDetail|packageDetailPanel/)
})

test('package detail document keys exist only while its cached view and dialog are active', async () => {
  const view = await source('../src/views/agent/AgentSkillsView.vue')
  const addKeys = functionSource(view, 'addPackageDocumentKeydown')
  const removeKeys = functionSource(view, 'removePackageDocumentKeydown')
  const syncKeys = functionSource(view, 'syncPackageDocumentKeydown')
  const openDialog = functionSource(view, 'openPackageDetail')
  const closeDialog = functionSource(view, 'closePackageDetail')
  const deactivateDialog = functionSource(view, 'clearPackageDetailWithoutFocus')
  const mounted = lifecycleSource(view, 'onMounted')
  const activated = lifecycleSource(view, 'onActivated')
  const deactivated = lifecycleSource(view, 'onDeactivated')
  const unmounted = lifecycleSource(view, 'onBeforeUnmount')

  assert.match(addKeys, /if \(packageDocumentKeydownAttached\) return/)
  assert.match(addKeys, /document\.addEventListener\('keydown', handlePackageDocumentKeydown\)[\s\S]*packageDocumentKeydownAttached = true/)
  assert.match(removeKeys, /if \(!packageDocumentKeydownAttached\) return/)
  assert.match(removeKeys, /document\.removeEventListener\('keydown', handlePackageDocumentKeydown\)[\s\S]*packageDocumentKeydownAttached = false/)
  assert.match(syncKeys, /isViewActive && Boolean\(packageDetailItem\.value\)/)
  assert.match(syncKeys, /addPackageDocumentKeydown\(\)/)
  assert.match(syncKeys, /removePackageDocumentKeydown\(\)/)
  assert.match(openDialog, /packageDetailId\.value = packageItem\.id[\s\S]*syncPackageDocumentKeydown\(\)/)
  assert.match(closeDialog, /packageDetailId\.value = ''[\s\S]*syncPackageDocumentKeydown\(\)/)
  assert.match(closeDialog, /if \(isViewActive\) \{\s*if \(packageDetailTrigger\?\.isConnected\) packageDetailTrigger\.focus\(\)\s*else hubTabElements\.get\(activeHubTab\.value\)\?\.focus\(\)\s*\}/)
  assert.match(deactivateDialog, /packageDetailId\.value = ''/)
  assert.match(deactivateDialog, /packageDetailTrigger = null/)
  assert.match(deactivateDialog, /syncPackageDocumentKeydown\(\)/)
  assert.doesNotMatch(deactivateDialog, /\.focus\(/)
  assert.doesNotMatch(mounted, /document\.addEventListener/)
  assert.match(activated, /isViewActive = true[\s\S]*syncPackageDocumentKeydown\(\)/)
  assert.match(deactivated, /isViewActive = false[\s\S]*clearPackageDetailWithoutFocus\(\)/)
  assert.match(unmounted, /isViewActive = false[\s\S]*removePackageDocumentKeydown\(\)/)
  assert.match(view, /onBeforeRouteLeave\(\(\) => \{[\s\S]*clearPackageDetailWithoutFocus\(\)[\s\S]*\}\)/)
})

test('a cached Skill Hub focuses package creation only when reactivated in create mode', async () => {
  const view = await source('../src/views/agent/AgentSkillsView.vue')
  const activated = lifecycleSource(view, 'onActivated')
  const mounted = lifecycleSource(view, 'onMounted')

  assert.match(view, /import \{[^}]*onActivated[^}]*onDeactivated[^}]*\} from 'vue'/)
  assert.match(activated, /if \(isPackageCreate\.value\) void focusPackageCreator\(\)/)
  assert.doesNotMatch(activated, /focusPackageCreator\(\)[\s\S]*if \(isPackageCreate\.value\)/)
  assert.doesNotMatch(mounted, /focusPackageCreator\(\)/)
})

test('an active cached Skill Hub focuses package creation when only its query enters create mode', async () => {
  const view = await source('../src/views/agent/AgentSkillsView.vue')
  const watchStart = view.indexOf('watch(isPackageCreate')
  const watchEnd = view.indexOf('\nonMounted(', watchStart)
  const createModeWatch = view.slice(watchStart, watchEnd)

  assert.match(view, /import \{[^}]*watch[^}]*\} from 'vue'/)
  assert.notEqual(watchStart, -1)
  assert.match(createModeWatch, /\(creating,\s*wasCreating\)/)
  assert.match(createModeWatch, /creating && !wasCreating && isViewActive/)
  assert.match(createModeWatch, /void focusPackageCreator\(\)/)
})

test('package create and tab panels hand focus off while keeping both controlled panels mounted', async () => {
  const view = await source('../src/views/agent/AgentSkillsView.vue')
  const openCreate = functionSource(view, 'openPackageCreate')
  const closeCreate = functionSource(view, 'closePackageCreate')
  const submit = functionSource(view, 'handlePackageSubmitted')

  assert.match(view, /ref="activeCreateButton"[^>]*@click="openActiveCreate"/)
  assert.match(openCreate, /await router\.push\('\/agent\/scenario-package-create'\)/)
  assert.match(openCreate, /await focusPackageCreator\(\)/)
  assert.match(closeCreate, /await router\.replace/)
  assert.match(closeCreate, /await nextTick\(\)/)
  assert.match(closeCreate, /activeCreateButton\.value\?\.focus\(\)/)
  assert.match(submit, /packageRowElements\.get\(packageItem\.id\)[\s\S]*?\.focus\(\)/)

  assert.match(view, /<section\s+v-show="activeHubTab === 'skills'"[\s\S]*?id="skill-hub-panel-skills"[\s\S]*?:inert="activeHubTab !== 'skills' \? true : undefined"/)
  assert.match(view, /<section\s+v-show="activeHubTab === 'packages'"[\s\S]*?id="skill-hub-panel-packages"[\s\S]*?:inert="activeHubTab !== 'packages' \? true : undefined"/)
  assert.doesNotMatch(view, /skill-hub-panel-review|\{ id: 'review', label:/)
  assert.doesNotMatch(view, /<section\s+v-(?:if|else)[^>]*id="skill-hub-panel-(?:skills|packages)"/)
  assert.match(view, /\.skill-hub-view-panel\s*>\s*\.skill-hub-summary\s*\{\s*margin-block:\s*0;/)
  assert.doesNotMatch(view, /\.skill-hub-page\[data-page-flow="skill-hub"\]\s*>\s*\.skill-hub-summary/)
})

test('specialized permission and login checks remain part of the project contract', async () => {
  const packageJson = await source('../package.json')
  for (const script of ['test:application-info', 'test:permission-scope', 'test:user-management', 'test:login-password-recovery:browser']) {
    assert.match(packageJson, new RegExp(script.replace(':', '\\:')))
  }
})

test('approved pages share the presentation-only content header', async () => {
  const [header, ...views] = await Promise.all([
    source('../src/components/content/ContentPageHeader.vue'),
    source('../src/views/agent/AgentSkillsView.vue'),
    source('../src/views/agent/AgentSkillCreateView.vue'),
    source('../src/views/agent/AgentPermissionsView.vue'),
    source('../src/views/agent/AdminCleanupEmailMockView.vue')
  ])

  assert.match(header, /<h1 class="content-page-header__title">/)
  assert.match(header, /<slot name="actions"/)
  assert.doesNotMatch(header, /useRouter|useRoute|use[A-Z]\w*Store/)

  for (const view of views) {
    assert.match(view, /<ContentPageHeader/)
    assert.match(view, /import ContentPageHeader from '@\/components\/content\/ContentPageHeader\.vue'/)
  }
  assert.doesNotMatch(views[3], /<h1>/)
})

test('portal home balances its work cards against the actual content slot', async () => {
  const view = await source('../src/views/PortalHomeView.vue')

  assert.match(view, /container-type:\s*inline-size/)
  assert.match(
    view,
    /\.portal-home-v2\s+\.portal-home-workgrid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s
  )
  assert.match(
    view,
    /@container\s*\(max-width:\s*1180px\)[\s\S]*\.portal-home-spotlight\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
  )
  assert.match(
    view,
    /@container\s*\(max-width:\s*720px\)[\s\S]*\.portal-home-workgrid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/
  )
})

test('sidebar starts expanded and only applies responsive collapse after a real resize', async () => {
  const sidebar = await source('../src/components/shell/sidebar/WorkbenchSidebar.vue')

  assert.match(sidebar, /window\.addEventListener\('resize',\s*_onResize\)/)
  assert.doesNotMatch(
    sidebar,
    /onMounted\(\(\)\s*=>\s*\{\s*applyResponsiveSidebar\(window\.innerWidth\)/s
  )
})

test('adjustment log renders independent preview and formal release evidence', async () => {
  const sidebar = await source('../src/components/shell/sidebar/WorkbenchSidebar.vue')
  const ledgerService = await source('../src/services/pocReleaseLedger.ts')
  const serverRecords = await source('../src/data/pocLogServerRecords.ts')

  assert.doesNotMatch(sidebar, /<span>改动人<\/span>/)
  assert.doesNotMatch(sidebar, /getPocOperator\(item\)/)
  assert.doesNotMatch(sidebar, /getPocPublisher\(item\)/)
  assert.match(sidebar, /<small><span>改动点<\/span>/)
  assert.match(sidebar, /class="poc-log-releases"/)
  assert.match(sidebar, /getPocReleaseRows\(item\)/)
  assert.match(sidebar, /new 预览/)
  assert.match(sidebar, /正式环境/)
  assert.match(sidebar, /release\.publisher/)
  assert.match(sidebar, /release\.releasedAt/)
  assert.match(sidebar, /release\.version/)
  assert.match(sidebar, /loadPocReleaseLedger/)
  assert.match(ledgerService, /poc-release-ledger\.json/)
  assert.match(serverRecords, /["']publisher["']:\s*["']guanfeng2["']/)
  assert.match(serverRecords, /["']publisher["']:\s*["']yejw2["']/)
  assert.match(serverRecords, /["']publisher["']:\s*["']baiyu["']/)
  assert.match(sidebar, /title: '首页内容比例校正'/)
  assert.match(sidebar, /title: '左侧菜单默认展开'/)
  assert.doesNotMatch(sidebar, /title: '首页响应式比例校正'/)
  const releaseLogStart = sidebar.indexOf("releaseKey: 'portal-release-ledger-20260826'")
  const releaseLogEnd = sidebar.indexOf('\n  },', releaseLogStart)
  const releaseLog = sidebar.slice(releaseLogStart, releaseLogEnd)
  assert.match(releaseLog, /deployTargets: \['new', 'formal'\]/)
  assert.match(releaseLog, /status: '已合并正式'/)

  const enterpriseReleaseStart = sidebar.indexOf("releaseKey: 'enterprise-customer-agreement-order-20260901'")
  const enterpriseReleaseEnd = sidebar.indexOf('\n  },', enterpriseReleaseStart)
  const enterpriseRelease = sidebar.slice(enterpriseReleaseStart, enterpriseReleaseEnd)
  assert.match(enterpriseRelease, /deployTargets: \['new', 'formal'\]/)
  assert.match(enterpriseRelease, /status: '已合并正式'/)

  const latestReleaseStart = sidebar.indexOf("releaseKey: 'lead-dashboard-agreement-order-20260902'")
  const latestReleaseEnd = sidebar.indexOf('\n  },', latestReleaseStart)
  const latestRelease = sidebar.slice(latestReleaseStart, latestReleaseEnd)
  assert.notEqual(latestReleaseStart, -1)
  assert.match(latestRelease, /deployTargets: \['new', 'formal'\]/)
  assert.match(latestRelease, /status: '已合并正式'/)
})

test('Skill Hub contract keeps scenario packages on the existing route', async () => {
  const [contentSlots, pageMatrix] = await Promise.all([
    source('../src/content-slot/contentSlotDefinitions.js'),
    source('../../skill/portal-workbench-ui-0914/references/page-spec-coverage-matrix.md')
  ])
  const skillHubStart = contentSlots.indexOf("pageId: 'agent.skills'")
  const skillHubEnd = contentSlots.indexOf("pageId: 'agent.skillCreate'", skillHubStart)
  const skillHubContract = contentSlots.slice(skillHubStart, skillHubEnd)
  const matrixRow = pageMatrix.match(/^\| Agent \/ Skill Hub \|.*$/m)?.[0] ?? ''

  assert.notEqual(skillHubStart, -1, 'agent.skills content slot must exist')
  assert.match(skillHubContract, /Skill \/ 场景技能包双页签/)
  assert.match(skillHubContract, /场景技能包四步创建/)
  assert.match(skillHubContract, /跨菜单已发布 Skill 固定版本编排/)
  assert.match(skillHubContract, /运行时权限校验策略/)
  assert.doesNotMatch(skillHubContract, /运行时权限评估|评估固定版本与运行时权限/)
  assert.match(pageMatrix, /## 3\. 当前 0914 项目页面矩阵/)
  assert.equal((pageMatrix.match(/^\| Agent \/ Skill Hub \|/gm) ?? []).length, 1)
  assert.doesNotMatch(pageMatrix, /^\| Agent \/ 场景技能包 \|/m)
  assert.match(matrixRow, /`\/agent\/skills\?tab=packages&mode=create`/)
  assert.match(matrixRow, /T7/)
  assert.match(matrixRow, /T4/)
  assert.match(matrixRow, /V2/)
  assert.match(matrixRow, /同一路由，不新增页面/)
})

test('scenario package release state is not hardcoded before the release ledger records it', async () => {
  const sidebar = await source('../src/components/shell/sidebar/WorkbenchSidebar.vue')

  assert.doesNotMatch(sidebar, /scenario-skill-packages-20260904/)
  assert.doesNotMatch(sidebar, /Skill Hub 场景技能包[\s\S]{0,500}已更新 new 预览/)
  assert.match(sidebar, /loadPocReleaseLedger/)
})

test('scenario package design names every machine permission and runtime evidence field', async () => {
  const design = await source('../../docs/superpowers/specs/2026-09-04-scenario-skill-packages-design.md')

  for (const permission of [
    'scenario-package:create',
    'scenario-package:compose:cross-menu',
    'skill:<skillId>:metadata:read',
    'skill:<skillId>:reference',
    'scenario-package:<packageId>:use'
  ]) {
    assert.match(design, new RegExp(permission.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(design, /requiresConfirmation/)
  assert.match(design, /requiresApproval/)
  assert.match(design, /confirmedStepIds/)
  assert.match(design, /approvedStepIds/)
})

test('permission workspace follows the supplied 0825 rail and approval-route design', async () => {
  const [view, demoRoute, sectionHeader] = await Promise.all([
    source('../src/views/agent/AgentPermissionsView.vue'),
    source('../src/utils/permissionDemoRoute.js'),
    source('../src/components/content/SectionHeader.vue')
  ])

  assert.match(view, /moduleSearchKeyword/)
  assert.match(view, /filteredModuleGroups/)
  assert.match(view, /aria-current=/)
  assert.match(view, /group\.items\.length/)
  assert.match(view, /<SectionHeader/)
  assert.equal(view.match(/<SectionHeader/g)?.length, 8)
  assert.match(view, /createPermissionDemoRouteItems/)
  assert.match(view, /activeApprovalFullRouteSteps/)
  assert.match(view, /grid-template-columns:\s*clamp\(220px,\s*26%,\s*300px\)/)
  assert.match(view, /container-type:\s*inline-size/)
  assert.match(view, /@container\s*\(max-width:\s*1039px\)/)
  assert.doesNotMatch(view, /@container\s*\(max-width:\s*(?:920|600)px\)/)
  assert.match(sectionHeader, /content-section-header__heading::before/)
  assert.match(sectionHeader, /width:\s*4px/)
  assert.match(sectionHeader, /height:\s*18px/)
  assert.match(sectionHeader, /font-size:\s*16px/)
  assert.match(sectionHeader, /@container\s*\(max-width:\s*719px\)/)
  assert.match(demoRoute, /export function createPermissionDemoRouteItems/)
})

test('scenario Skill packages use the four-step submission workspace with a required trial and independent review', async () => {
  const [view, store] = await Promise.all([
    source('../src/views/agent/ScenarioSkillPackageCreateView.vue'),
    source('../src/stores/scenarioSkillPackages.ts')
  ])

  assert.notEqual(view, '', 'ScenarioSkillPackageCreateView.vue must exist')
  assert.match(view, /<ContentPageHeader/)
  assert.match(view, /import ContentPageHeader from '@\/components\/content\/ContentPageHeader\.vue'/)
  for (const label of [
    '1. 场景定义',
    '2. Skill 链路编排',
    '3. 试运行',
    '4. 提交审核'
  ]) {
    assert.match(view, new RegExp(label.replace('.', '\\.')))
  }
  assert.match(view, /role="tablist"/)
  assert.match(view, /role="tab"/)
  assert.match(view, /:aria-selected=/)
  assert.match(view, /:aria-current="[^\"]*'step'[^\"]*"/)
  assert.match(view, /:tabindex="[^\"]*\? 0 : -1[^\"]*"/)
  assert.match(view, /@keydown="handleTabKeydown\(/)
  for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) {
    assert.match(view, new RegExp(key))
  }
  assert.match(view, /focusTab\(/)
  assert.match(view, /focusSection\(/)
  assert.match(view, /onlineStatus === 'published'/)
  assert.match(view, /pinnedVersion/)
  assert.match(view, /<ScenarioSkillPackageComposer v-model="chain" :skills="publishedSkills"/ )
  for (const section of ['跨菜单编排权限', '依赖版本快照', '链路完整性', '运行时权限']) {
    assert.match(view, new RegExp(section))
  }
  assert.match(view, /scenarioStore\.submitDraft\(/)
  assert.match(view, /baseUpdatedAt: draftBaseUpdatedAt/)
  assert.match(view, /scenarioStore\.evaluateDraft\(/)
  assert.doesNotMatch(view, /packages\.value\.(?:push|unshift|splice)\(/)
  assert.equal(view.match(/@click="submitPackage"/g)?.length, 1)
  assert.match(view, /submitting \? '正在提交…' : draft \? '重新提交审核' : '提交审核'/)
  assert.match(view, /:disabled="submitting \|\| savingDraft \|\| trialRunning \|\| !trialGate\.ok \|\| !canEditDraft \|\| !submissionEvaluation\.ok \|\| dependencyBlocked"/)
  assert.match(view, /submitted: \[item: ScenarioSkillPackage\]/)
  assert.match(view, /emit\('submitted', submitted\)/)
  assert.match(view, /提交后由其他管理员审核，审核通过后发布/)
  assert.doesNotMatch(view, /ownerConfirmed|scenario-package-owner-confirm|请由主责任人勾选提交声明/)
  assert.doesNotMatch(view, /scenarioStore\.(?:publishDraft|approvePackage)\(|emit\('published'|published: \[|管理员审批发布|审批并发布|自审批|自审|approve:self/)
  assert.doesNotMatch(view, /:disabled="[^\"]*canSelfApprove/)
  assert.match(view, /最终调用方仍需具备实际的菜单、Skill、数据和操作权限/)
  assert.match(view, /请至少选择两个不同的已发布 Skill/)
  assert.match(view, /请至少选择来自两个一级菜单的 Skill/)
  assert.match(view, /请至少设置一个必需步骤/)
  for (const field of ['description', 'targetAudience']) {
    assert.match(view, new RegExp(`${field}: form\\.value\\.${field}\\.trim\\(\\)`))
    assert.match(store, new RegExp(`${field}: string`))
  }
  assert.match(view, /liveEligibilityReasons/)
  assert.match(view, /返回链路编排/)
})
