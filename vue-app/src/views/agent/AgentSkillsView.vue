<template>
  <ScenarioSkillPackageCreateView
    v-if="isPackageCreate"
    :key="editingPackage ? `${editingPackage.id}-${editingPackageActorId}` : `new-package-${newPackageSessionOwner}-${packageCreateSession}`"
    :draft="editingPackage"
    @cancel="closePackageCreate"
    @saved="handlePackageSaved"
    @submitted="handlePackageSubmitted"
  />

  <div
    v-else
    class="skill-hub-page"
    data-page-flow="skill-hub"
    role="region"
    aria-label="Skill Hub"
    :aria-hidden="packageDetailItem ? 'true' : undefined"
    :inert="packageDetailItem ? true : undefined"
  >
    <ContentPageHeader title="Skill Hub" :description="pageDesc">
      <template #actions>
        <div class="agent-skill-page-actions">
          <button v-if="activeHubTab !== 'packages' || canCreatePackage" ref="activeCreateButton" class="btn btn-primary" type="button" @click="openActiveCreate">
            {{ activeHubTab === 'packages' ? '创建场景技能包' : '创建 Skill' }}
          </button>
          <button class="btn btn-secondary" type="button" @click="goPortalHome">返回工作台</button>
        </div>
      </template>
    </ContentPageHeader>

    <nav class="skill-hub-view-tabs" role="tablist" aria-label="Skill Hub 视图">
      <button
        v-for="tab in hubTabs"
        :id="`skill-hub-tab-${tab.id}`"
        :key="tab.id"
        :ref="element => setHubTabRef(tab.id, element)"
        type="button"
        role="tab"
        :aria-controls="`skill-hub-panel-${tab.id}`"
        :aria-selected="activeHubTab === tab.id"
        :tabindex="activeHubTab === tab.id ? 0 : -1"
        :class="{ 'is-active': activeHubTab === tab.id }"
        @click="selectHubTab(tab.id, true)"
        @keydown="handleHubTabKeydown($event, tab.id)"
      >{{ tab.label }}</button>
    </nav>

    <section
      v-show="activeHubTab === 'skills'"
      id="skill-hub-panel-skills"
      class="skill-hub-view-panel"
      role="tabpanel"
      aria-labelledby="skill-hub-tab-skills"
      :aria-hidden="activeHubTab !== 'skills' ? 'true' : 'false'"
      :inert="activeHubTab !== 'skills' ? true : undefined"
    >
      <div class="skill-hub-summary" aria-label="Skill Hub 重点指标">
        <button
          v-for="item in summaryItems"
          :key="item.key"
          type="button"
          class="skill-hub-stat is-filterable"
          :class="[item.tone, { 'is-active': summaryFilter === item.filter }]"
          :aria-pressed="summaryFilter === item.filter"
          @click="setSummaryFilter(item.filter)"
        >
          <div class="skill-hub-stat-head">
            <span>{{ item.label }}</span>
            <i>{{ item.code }}</i>
          </div>
          <strong>{{ item.value }}</strong>
          <em>{{ item.desc }}</em>
        </button>
      </div>

      <div class="skill-hub-list-workspace" data-page-block="list-workspace">
        <div class="skill-hub-toolbar">
          <input v-model="keyword" aria-label="搜索 Skill" placeholder="搜索技能名称、中文名或描述">
          <input v-model="creatorKeyword" type="search" aria-label="搜索创建人" placeholder="搜索创建人">
          <select v-model="statusFilter" aria-label="Skill 状态">
            <option value="all">状态</option>
            <option v-for="status in statusOptions" :key="status" :value="status">{{ skillHubStatusLabel(status) }}</option>
          </select>
          <select v-model="categoryFilter" aria-label="Skill 分类">
            <option value="all">分类</option>
            <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
          </select>
          <div class="skill-hub-filter-actions">
            <label class="skill-hub-update-toggle">
              <span>只看有更新</span>
              <input v-model="onlyCapabilityUpdates" type="checkbox">
              <i aria-hidden="true"></i>
            </label>
            <button class="btn btn-primary" type="button">搜索</button>
          </div>
        </div>

        <div class="skill-hub-table-card">
          <table class="skill-hub-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>中文名</th>
                <th>绑定平台</th>
                <th>创建人</th>
                <th>描述</th>
                <th>版本</th>
                <th>上线版本</th>
                <th>状态</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in filteredItems"
                :key="item.name"
                class="skill-hub-row"
                :data-status="item.workflowStatus"
                :data-category="item.category"
              >
                <td>
                  <div class="skill-hub-name">
                    <span class="skill-hub-doc-icon">▤</span>
                    <strong>{{ item.name }}</strong>
                  </div>
                </td>
                <td><div class="skill-hub-cn">{{ item.cnName || '-' }}</div></td>
                <td>{{ item.platform }}</td>
                <td class="skill-hub-creator">{{ item.owner || '-' }}</td>
                <td>
                  <div class="skill-hub-desc">{{ item.desc }}</div>
                  <div v-if="shouldShowCapabilityChangeSummary(item.capabilityUpdate)" class="skill-hub-change-summary">
                    <b>{{ decisionCapabilityUpdate(item)?.summary }}</b>
                    <span>{{ decisionCapabilityUpdate(item)?.detectedAt }} 检测</span>
                  </div>
                </td>
                <td>
                  <span class="skill-hub-version">{{ item.editVersion || item.version }}</span>
                  <small v-if="item.editVersion" class="skill-hub-edit-version">编辑版本</small>
                </td>
                <td><span class="skill-hub-online" :class="{ empty: item.onlineStatus === 'unpublished' }">{{ item.online }}</span></td>
                <td>
                  <div class="skill-hub-status-stack">
                    <span class="skill-hub-status" :class="`status-${rowPresentation(item).mainStatus}`">{{ rowPresentation(item).mainStatusLabel }}</span>
                    <span v-if="rowPresentation(item).updateStatusLabel" class="skill-hub-update-status" :class="`is-${rowPresentation(item).updateStatus}`">
                      {{ rowPresentation(item).updateStatusLabel }}
                    </span>
                  </div>
                </td>
                <td>{{ item.updated }}</td>
                <td>
                  <div class="skill-hub-actions">
                    <button
                      v-for="action in allowedActionsFor(item)"
                      :key="action.code"
                      class="skill-hub-action"
                      :class="actionTone(action.code)"
                      type="button"
                      :disabled="!action.enabled"
                      @click="handleAction(item, action.code)"
                    >
                      {{ actionLabel(action.code) }}
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredItems.length">
                <td colspan="10" class="skill-hub-detail-empty">当前筛选下暂无 Skill</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section
      v-show="activeHubTab === 'packages'"
      id="skill-hub-panel-packages"
      class="skill-hub-view-panel scenario-package-list"
      role="tabpanel"
      aria-labelledby="skill-hub-tab-packages"
      :aria-hidden="activeHubTab !== 'packages' ? 'true' : 'false'"
      :inert="activeHubTab !== 'packages' ? true : undefined"
    >
      <div class="scenario-package-summary skill-hub-summary" aria-label="场景技能包重点指标">
        <button
          v-for="item in packageSummaryItems"
          :key="item.key"
          type="button"
          class="scenario-package-stat skill-hub-stat is-filterable"
          :class="[{ 'is-active': packageSummaryFilter === item.filter }, item.tone]"
          :aria-pressed="packageSummaryFilter === item.filter"
          @click="setPackageSummaryFilter(item.filter)"
        >
          <div class="skill-hub-stat-head"><span>{{ item.label }}</span><i>{{ item.code }}</i></div>
          <strong>{{ item.value }}</strong>
          <em>{{ item.desc }}</em>
        </button>
      </div>

      <div class="scenario-package-list-workspace" data-flow-role="list-workspace">
        <details class="scenario-package-edit-rules">
          <summary>编辑规则</summary>
          <ul>
            <li>未发布的草稿、驳回内容：由具备创建及跨菜单编排权限的创建者编辑。</li>
            <li>已发布、已禁用及其草稿或驳回修订：具备相应权限的创建者或管理员可编辑，原创建者不变；新版审核前，线上版本保持原状态。</li>
            <li>待审核内容不可直接编辑；具备相应权限的创建者或本轮提交人可先撤回。</li>
            <li>修改后需重新试运行并提审；创建者、提交人及本轮编辑者均不能自审。</li>
          </ul>
        </details>
        <div class="scenario-package-toolbar skill-hub-toolbar">
          <input v-model="packageKeyword" type="search" aria-label="搜索场景技能包" placeholder="搜索名称、场景描述或主责任人">
          <select v-model="packageStatusFilter" aria-label="场景技能包状态" @change="packageSummaryFilter = 'all'">
            <option value="all">全部状态</option>
            <option value="draft">草稿</option>
            <option value="review">待审核</option>
            <option value="rejected">已驳回</option>
            <option value="published">已发布</option>
            <option value="upgrade_required">待升级</option>
            <option value="paused">已暂停</option>
            <option value="disabled">已禁用</option>
          </select>
          <button class="btn btn-secondary" type="button" @click="resetPackageFilters">重置</button>
        </div>

        <div class="scenario-package-table-surface">
          <div class="scenario-package-table-region" role="region" aria-label="场景技能包列表" tabindex="0">
            <table class="scenario-package-table">
              <thead>
                <tr>
                  <th>名称 / 场景描述</th>
                  <th>主责任人</th>
                  <th>涉及菜单</th>
                  <th>Skill 链路</th>
                  <th>技能包版本</th>
                  <th>状态</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="packageItem in filteredScenarioPackages"
                  :key="packageItem.id"
                  :ref="element => setPackageRowRef(packageItem.id, element)"
                  class="scenario-package-row"
                  :class="{ 'is-new': highlightedPackageId === packageItem.id }"
                  :data-package-id="packageItem.id"
                  tabindex="-1"
                >
                  <td>
                    <strong>{{ packageItem.name }}</strong>
                    <small>{{ packageItem.description }}</small>
                  </td>
                  <td>{{ packageItem.ownerId }}</td>
                  <td>
                    <span>{{ packageMenus(packageItem).length }} 个</span>
                    <small>{{ packageMenus(packageItem).join('、') }}</small>
                  </td>
                  <td>
                    <span>{{ packageItem.steps.length }} 个 Skill</span>
                    <small>{{ packageItem.steps.map(step => step.name).join(' → ') }}</small>
                  </td>
                  <td><code>{{ packageItem.version }}</code></td>
                  <td>
                    <span class="scenario-package-status" :class="`is-${packageStatusKey(packageItem)}`">{{ packageStatusLabel(packageItem) }}</span>
                    <small>{{ packageHealthHint(packageItem) }}</small>
                  </td>
                  <td>{{ formatPackageUpdatedAt(packageItem.updatedAt) }}</td>
                  <td>
                    <div class="scenario-package-actions">
                      <button class="skill-hub-action" type="button" @click="openPackageDetail(packageItem, $event)">详情</button>
                      <span
                        class="scenario-package-application-hint"
                        :title="packageApplicationHint(packageItem)"
                        :tabindex="packageApplication(packageItem).ok ? undefined : 0"
                        :aria-label="packageApplication(packageItem).ok ? undefined : `应用不可用：${packageApplicationHint(packageItem)}`"
                      >
                        <button class="skill-hub-action" type="button" :data-package-apply="packageItem.id" :disabled="!packageApplication(packageItem).ok || packageReviewBusy" :title="packageApplicationHint(packageItem)" @click="applyPackage(packageItem)">应用</button>
                      </span>
                      <button v-if="hasPackageAction(packageItem, 'edit')" class="skill-hub-action" type="button" @click="editPackage(packageItem)">编辑</button>
                      <button v-if="hasPackageAction(packageItem, 'withdraw')" class="skill-hub-action" type="button" @click="openPackageDetail(packageItem, $event, 'withdraw')">撤回</button>
                      <template v-if="canReviewPackage(packageItem)">
                        <button class="skill-hub-action" type="button" @click="openPackageDetail(packageItem, $event, 'approve')">审批</button>
                        <button class="skill-hub-action" type="button" @click="openPackageDetail(packageItem, $event, 'reject')">驳回</button>
                      </template>
                      <button v-if="hasPackageAction(packageItem, 'disable')" class="skill-hub-action" type="button" @click="openPackageDetail(packageItem, $event, 'disable')">禁用</button>
                      <button v-if="hasPackageAction(packageItem, 'enable')" class="skill-hub-action" type="button" @click="openPackageDetail(packageItem, $event, 'enable')">启用</button>
                    </div>
                    <p v-if="!hasPackageAction(packageItem, 'edit')" class="scenario-package-edit-hint">{{ packageEditGuidance(packageItem).summary }}</p>
                  </td>
                </tr>
                <tr v-if="!filteredScenarioPackages.length">
                  <td colspan="8" class="skill-hub-detail-empty">
                    {{ packageKeyword || packageStatusFilter !== 'all' || packageSummaryFilter !== 'all' ? '当前筛选下暂无场景技能包' : '还没有场景技能包，点击“创建场景技能包”开始' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

  </div>

  <Teleport to="body">
    <div
      v-if="confirmState"
      class="skill-hub-confirm-modal open"
      @click.self="closeConfirm"
    >
      <div class="skill-hub-confirm-panel" role="dialog" :aria-label="confirmMeta.title">
        <div class="skill-hub-confirm-head">
          <h3>{{ confirmMeta.title }}</h3>
          <button type="button" class="skill-hub-confirm-close" aria-label="关闭" @click="closeConfirm">×</button>
        </div>
        <div class="skill-hub-confirm-body">
          <p>{{ confirmMeta.desc }}</p>
          <div class="skill-hub-confirm-info">
            <span>Skill</span><b>{{ confirmState.item.name }}</b>
            <span>当前状态</span><b>{{ rowPresentation(confirmState.item).mainStatusLabel }}</b>
            <span>当前版本</span><b>{{ confirmState.item.version }}</b>
            <span>绑定平台</span><b>{{ confirmState.item.platform }}</b>
          </div>
          <label v-if="confirmMeta.acceptsReason" class="skill-hub-confirm-reason">
            <span>处理说明（{{ confirmRequiresReason ? '必填' : '选填' }}）</span>
            <textarea v-model="confirmReason" rows="3" placeholder="记录本次处理原因，便于后续追溯" @input="confirmError = ''"></textarea>
            <small v-if="confirmError" class="skill-hub-confirm-error">{{ confirmError }}</small>
          </label>
        </div>
        <div class="skill-hub-confirm-foot">
          <button class="btn btn-secondary" type="button" @click="closeConfirm">取消</button>
          <button class="btn" :class="confirmMeta.tone === 'danger' ? 'btn-danger' : 'btn-primary'" type="button" @click="confirmAction">{{ confirmMeta.confirmText }}</button>
        </div>
      </div>
    </div>

    <div
      v-if="detailItem"
      class="skill-hub-detail-modal open"
      @click.self="detailItem = null"
    >
      <div class="skill-hub-detail-panel" role="dialog" aria-modal="true" aria-label="Skill 详情">
        <div class="skill-hub-detail-head">
          <h3>Skill 详情</h3>
          <button type="button" class="skill-hub-detail-close" aria-label="关闭" @click="detailItem = null">×</button>
        </div>
        <div class="skill-hub-detail-body">
          <table class="skill-hub-detail-table">
            <tbody>
              <tr>
                <th>ID</th><td>{{ detailId(detailItem) }}</td>
                <th>Skill 名称</th><td>{{ detailItem.name }}</td>
              </tr>
              <tr>
                <th>当前版本</th><td>{{ detailItem.version }}</td>
                <th>状态</th><td><em class="skill-hub-status" :class="`status-${rowPresentation(detailItem).mainStatus}`">{{ rowPresentation(detailItem).mainStatusLabel }}</em></td>
              </tr>
              <tr>
                <th>作者</th><td>{{ detailItem.owner }}</td>
                <th>提交人</th><td>{{ detailItem.owner }}</td>
              </tr>
              <tr>
                <th>绑定平台</th><td>{{ detailItem.platform }}</td>
                <th>所属菜单</th><td>{{ skillCategoryLabel(detailItem) }}</td>
              </tr>
              <tr>
                <th>描述</th><td colspan="3">{{ detailItem.desc }}</td>
              </tr>
              <tr>
                <th>审核人</th><td>{{ detailItem.reviewer || '-' }}</td>
                <th>审核时间</th><td>{{ detailItem.reviewTime || '-' }}</td>
              </tr>
              <tr>
                <th>审核备注</th><td colspan="3">{{ detailItem.reviewNote || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="skill-hub-detail-foot">
          <button class="btn btn-secondary" type="button" @click="detailItem = null">关闭</button>
          <button v-if="allowedActionsFor(detailItem).some(action => action.code === 'approve')" class="btn btn-primary" type="button" @click="openConfirm(detailItem, 'approve')">审批通过</button>
        </div>
      </div>
    </div>

    <div
      v-if="packageDetailItem"
      class="skill-hub-detail-modal open"
      @click.self="closePackageDetail"
      @keydown="handlePackageDetailKeydown"
    >
      <div
        ref="packageDetailPanel"
        class="skill-hub-detail-panel scenario-package-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scenario-package-detail-title"
        tabindex="-1"
      >
        <div class="skill-hub-detail-head">
          <div>
            <h3 id="scenario-package-detail-title">{{ packageModeTitle }}{{ packageDetailItem.name }}</h3>
            <p>{{ packageDetailItem.description }}</p>
          </div>
          <button ref="packageDetailClose" type="button" class="skill-hub-detail-close" aria-label="关闭场景技能包详情" @click="closePackageDetail">×</button>
        </div>
        <div class="skill-hub-detail-body scenario-package-detail-body">
          <p v-if="packageActionStale" class="scenario-package-review-error" role="alert">技能包已更新，请关闭后重新查看并操作。</p>
          <dl class="scenario-package-detail-summary">
            <div><dt>目标人群</dt><dd>{{ packageDetailItem.targetAudience }}</dd></div>
            <div><dt>主责任人</dt><dd>{{ packageDetailItem.ownerId }}</dd></div>
            <div>
              <dt>执行要求</dt>
              <dd v-if="typeof packageDetailItem.requiresConfirmation !== 'boolean' && scenarioRequiresConfirmation(packageDetailItem)">原发布版本含节点确认要求，修订后统一配置</dd>
              <dd v-else>{{ scenarioRequiresConfirmation(packageDetailItem) ? '整个工作流执行前需要统一确认' : '无需人工确认，执行时仍需校验权限' }}</dd>
            </div>
            <div><dt>技能包版本</dt><dd><code>{{ packageDetailItem.version }}</code></dd></div>
            <div><dt>状态</dt><dd>{{ packageStatusLabel(packageDetailItem) }}</dd></div>
            <div v-if="packageDetailItem.publishedSnapshot"><dt>已审核版本</dt><dd><code>{{ packageDetailItem.publishedSnapshot.version }}</code> · {{ packageDetailItem.onlineStatus === 'disabled' ? '已禁用' : '已发布' }}</dd></div>
            <div v-if="packageDetailItem.submittedAt"><dt>提交时间</dt><dd>{{ formatPackageUpdatedAt(packageDetailItem.submittedAt) }}</dd></div>
            <div v-if="packageDetailItem.reviewedBy"><dt>审核人</dt><dd>{{ packageDetailItem.reviewedBy }}</dd></div>
            <div v-if="packageDetailItem.reviewedAt"><dt>审核时间</dt><dd>{{ formatPackageUpdatedAt(packageDetailItem.reviewedAt) }}</dd></div>
            <div v-if="packageDetailItem.reviewNote"><dt>审核意见</dt><dd>{{ packageDetailItem.reviewNote }}</dd></div>
          </dl>

          <section class="scenario-package-detail-section scenario-package-edit-guidance">
            <h4>当前账号编辑说明</h4>
            <p>{{ packageEditGuidance(packageDetailItem).detail }}</p>
          </section>

          <section class="scenario-package-detail-section">
            <h4>固定版本链路</h4>
            <ol class="scenario-package-detail-steps">
              <li v-for="(step, index) in packageDetailItem.steps" :key="step.id">
                <span class="scenario-package-detail-index">{{ index + 1 }}</span>
                <div>
                  <strong>{{ step.name }}</strong>
                  <p>
                    <span>{{ step.kind === 'required' ? '必需步骤' : '条件步骤' }}</span>
                    <span>固定版本 {{ step.pinnedVersion }}</span>
                    <span>来源菜单 {{ step.menu }}</span>
                  </p>
                  <small v-if="step.kind === 'conditional'">条件文本：{{ step.condition }}</small>
                  <small v-if="step.currentPublishedVersion !== step.pinnedVersion">当前发布版本 {{ step.currentPublishedVersion }}，技能包仍使用固定版本</small>
                </div>
              </li>
            </ol>
          </section>

          <ScenarioTestReportSummary :report="packageDetailItem.testReport || null" :stale="packageTestIsStale" />

          <ScenarioNodeContractSummary :steps="packageDetailItem.steps" />

          <details v-if="packageRunPlan" class="scenario-package-detail-section scenario-package-run-readiness">
            <summary>执行准备检查</summary>
            <p>当前仅检查已保存的配置，尚未执行任务。条件步骤在运行时按实际条件决定是否执行。</p>
            <p>{{ packageRunPlan.status === 'blocked' ? '当前暂不能执行，请处理以下问题。' : '当前账号的已激活步骤通过权限检查，运行输入和上游结果仍需在执行时提供。' }}</p>
            <ul v-if="packageRunPlan.explanations.length">
              <li v-for="reason in packageRunPlan.explanations" :key="reason">{{ reason }}</li>
            </ul>
            <ul v-if="packageRunPlan.steps.length">
              <li v-for="step in packageRunPlan.steps" :key="step.id">
                <strong>{{ step.name }}</strong>
                <p v-for="(source, index) in step.inputSources" :key="`${source.kind}-${source.nodeId || index}`">
                  {{ source.name }}：{{ source.status === 'skipped' ? '本次未激活，不产生输出' : source.status === 'pending' ? '等待上游执行结果' : source.status === 'provided' ? '已提供' : '待运行时提供' }}
                </p>
              </li>
            </ul>
          </details>

          <aside class="scenario-package-governance">
            <strong>权限治理声明</strong>
            <p>技能包永不提权。最终调用方必须对实际激活的菜单、Skill、数据和操作重新通过服务端权限校验；任一激活步骤缺权时，在产生副作用前阻断整个工作流。</p>
          </aside>

          <section class="scenario-package-detail-section">
            <h4>依赖状态说明</h4>
            <p>{{ packageDependencyExplanation(packageDetailItem) }}</p>
          </section>

          <section class="scenario-package-detail-section">
            <h4>审计事件</h4>
            <ol v-if="packageDetailItem.auditEvents?.length" class="scenario-package-audit-list">
              <li v-for="(event, index) in packageDetailItem.auditEvents" :key="`${event.type}-${event.at}-${index}`">
                <strong>{{ packageAuditLabel(event.type) }}</strong>
                <span>{{ event.actorId }} · {{ formatPackageUpdatedAt(event.at) }}</span>
                <p v-if="event.note">{{ event.note }}</p>
              </li>
            </ol>
            <p v-else>暂无审计事件。</p>
          </section>
          <section v-if="(packageReviewMode === 'approve' || packageReviewMode === 'reject') && packageDetailItem.status === 'review'" class="scenario-package-detail-section scenario-package-review-section">
            <h4>{{ packageReviewMode === 'reject' ? '驳回原因' : '管理员审批' }}</h4>
            <template v-if="packageReviewDecision.ok">
              <p>{{ packageReviewMode === 'reject' ? '请说明需要修改的内容，创建人可修改后重新提交。' : packageDetailItem.onlineStatus === 'disabled' ? '审批通过后更新已审核版本，技能包仍保持禁用。' : '审批通过后将发布当前固定版本链路。' }}</p>
              <label class="scenario-package-review-field">
                <span>{{ packageReviewMode === 'reject' ? '驳回原因（必填）' : '审批意见（选填）' }}</span>
                <textarea ref="packageReviewInput" v-model="packageReviewNote" rows="3" :required="packageReviewMode === 'reject'" :placeholder="packageReviewMode === 'reject' ? '例如：请补充条件步骤的触发范围和预期输出。' : '可填写本次审批的补充说明。'" :aria-invalid="packageReviewError ? 'true' : undefined" :aria-describedby="packageReviewError ? 'scenario-review-error' : undefined"></textarea>
              </label>
            </template>
            <p v-else>{{ packageReviewDecision.reasons.join('；') }}</p>
            <p v-if="packageReviewError" id="scenario-review-error" class="scenario-package-review-error" role="alert">{{ packageReviewError }}</p>
          </section>
          <section v-if="packageManagementMode" class="scenario-package-detail-section scenario-package-review-section">
            <h4>{{ packageManagementLabels[packageManagementMode] }}</h4>
            <p>{{ packageManagementDescriptions[packageManagementMode] }}</p>
            <p v-if="!hasPackageAction(packageDetailItem, packageManagementMode)" class="scenario-package-review-error" role="alert">状态或操作权限已变更，请关闭后重新查看。</p>
            <p v-if="packageReviewError" class="scenario-package-review-error" role="alert">{{ packageReviewError }}</p>
          </section>
        </div>
        <div class="skill-hub-detail-foot">
          <button class="btn btn-secondary" type="button" @click="closePackageDetail">关闭</button>
          <span
            v-if="packageReviewMode === 'detail'"
            class="scenario-package-application-hint"
            :title="packageApplicationHint(packageDetailItem)"
            :tabindex="packageApplication(packageDetailItem).ok ? undefined : 0"
            :aria-label="packageApplication(packageDetailItem).ok ? undefined : `应用不可用：${packageApplicationHint(packageDetailItem)}`"
          >
            <button class="btn btn-secondary" type="button" :data-package-apply="packageDetailItem.id" :disabled="!packageApplication(packageDetailItem).ok || packageReviewBusy" :title="packageApplicationHint(packageDetailItem)" @click="applyPackage(packageDetailItem)">应用</button>
          </span>
          <button v-if="packageReviewMode === 'detail' && hasPackageAction(packageDetailItem, 'edit')" class="btn btn-primary" type="button" @click="editPackage(packageDetailItem)">编辑</button>
          <button v-if="packageReviewMode === 'detail' && hasPackageAction(packageDetailItem, 'withdraw')" class="btn btn-primary" type="button" @click="openPackageDetail(packageDetailItem, $event, 'withdraw')">撤回审核</button>
          <template v-if="!packageActionStale && packageReviewDecision.ok && (packageReviewMode === 'approve' || packageReviewMode === 'reject')">
            <button v-if="packageReviewMode === 'reject'" class="btn btn-primary" type="button" :disabled="packageReviewBusy" @click="reviewPackage('reject')">确认驳回</button>
            <button v-else class="btn btn-primary" type="button" :disabled="packageReviewBusy" @click="reviewPackage('approve')">{{ packageDetailItem.onlineStatus === 'disabled' ? '审批通过' : '审批通过并发布' }}</button>
          </template>
          <button v-if="!packageActionStale && packageManagementMode && hasPackageAction(packageDetailItem, packageManagementMode)" class="btn btn-primary" type="button" :disabled="packageReviewBusy" @click="managePackage(packageManagementMode)">{{ packageManagementLabels[packageManagementMode] }}</button>
        </div>
      </div>
    </div>

    <div
      v-if="evalItem"
      class="skill-hub-eval-modal open"
      @click.self="evalItem = null"
    >
      <div class="skill-hub-eval-panel ready" role="dialog" aria-label="Skill 评估">
        <div class="skill-hub-eval-head">
          <div>
            <h3>Skill 评估</h3>
            <p>{{ evalItem.cnName || evalItem.name }} · 静态评估 + 测试用例 + 风险检查</p>
          </div>
          <button type="button" class="skill-hub-detail-close" aria-label="关闭" @click="evalItem = null">×</button>
        </div>
        <div class="skill-hub-eval-body">
          <div class="skill-score-grid">
            <div class="skill-score-card"><span>静态评分</span><b>0.872</b><i style="--score:87.2%"></i></div>
            <div class="skill-score-card"><span>结果评分</span><b>0.804</b><i style="--score:80.4%"></i></div>
            <div class="skill-score-card"><span>过程评分</span><b>0.742</b><i style="--score:74.2%"></i></div>
            <div class="skill-score-card featured"><span>综合评分</span><b>0.782</b><i style="--score:78.2%"></i><em>未达门槛 0.80</em></div>
          </div>
          <div class="skill-eval-gate warn">
            <b>评估未通过</b>
            <span>综合评分 0.782，未达到 0.80 提交审核门槛，请返回编辑并完成 AI 微调。</span>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="capabilityChangeItem"
      class="skill-hub-detail-modal open"
      @click.self="capabilityChangeItem = null"
    >
      <div class="skill-hub-detail-panel skill-capability-change-panel" role="dialog" aria-modal="true" aria-label="能力变化详情">
        <div class="skill-hub-detail-head">
          <div>
            <h3>能力变化详情</h3>
            <p>{{ capabilityChangeItem.cnName }} · {{ capabilityChangeItem.name }}</p>
          </div>
          <button type="button" class="skill-hub-detail-close" aria-label="关闭" @click="capabilityChangeItem = null">×</button>
        </div>
        <div v-if="capabilityDetailUpdate" class="skill-hub-detail-body">
          <div class="skill-capability-overview">
            <div><span>菜单 / 上下文</span><b>{{ capabilityDetailUpdate.menuPath }}</b><small>{{ capabilityDetailUpdate.contextId }}</small></div>
            <div><span>能力版本</span><b>{{ capabilityDetailUpdate.currentCapabilityVersion }} → {{ capabilityDetailUpdate.targetCapabilityVersion }}</b><small>当前 Skill {{ capabilityChangeItem.online }} · 编辑 {{ capabilityChangeItem.editVersion || '尚未创建' }}</small></div>
            <div><span>检测时间</span><b>{{ capabilityDetailUpdate.detectedAt }}</b><small>Asia/Shanghai</small></div>
            <div><span>通知状态</span><b>{{ capabilityDetailUpdate.notificationState }}</b><small>暂未连接真实通知服务</small></div>
          </div>
          <div v-if="capabilityChangeItem.capabilityUpdate?.status === 'failed'" class="skill-capability-error" role="alert">
            <b>更新任务执行失败</b>
            <span>任务 {{ capabilityChangeItem.capabilityUpdate.task?.id || '-' }}</span>
            <span v-if="capabilityChangeItem.capabilityUpdate.task?.phase">失败阶段：{{ capabilityChangeItem.capabilityUpdate.task.phase }}</span>
            <span v-if="capabilityChangeItem.capabilityUpdate.task?.errorCode">错误码：{{ capabilityChangeItem.capabilityUpdate.task.errorCode }}</span>
            <span>失败原因：{{ capabilityChangeItem.capabilityUpdate.task?.error || '更新生成失败' }}</span>
            <small>重试建议：{{ capabilityChangeItem.capabilityUpdate.task?.retryAdvice || '可返回列表重试更新，重试将复用当前任务和变化记录。' }}</small>
          </div>
          <div class="skill-capability-report">
            <SafeCapabilityMarkdown :markdown="capabilityDetailUpdate.reportMarkdown" />
          </div>
          <details class="skill-capability-technical">
            <summary>查看技术明细</summary>
            <SafeCapabilityMarkdown :markdown="technicalMarkdown(capabilityChangeItem)" />
          </details>
          <details v-if="capabilityDetailUpdate.history?.length" class="skill-capability-history">
            <summary>历史能力快照（{{ capabilityDetailUpdate.history.length }}）</summary>
            <article v-for="record in capabilityDetailUpdate.history" :key="record.recordId">
              <div>
                <b>{{ record.currentCapabilityVersion }} → {{ record.targetCapabilityVersion }}</b>
                <span>{{ record.detectedAt }} · {{ record.recordId }}</span>
              </div>
              <p>{{ record.summary }}</p>
              <small>包含 {{ record.changes?.length || 0 }} 项变化明细</small>
            </article>
          </details>
        </div>
        <div class="skill-hub-detail-foot">
          <button class="btn btn-secondary" type="button" @click="capabilityChangeItem = null">关闭</button>
          <button
            v-for="action in capabilityDetailActions"
            :key="action.code"
            class="btn"
            :class="action.code === 'start_update' || action.code === 'retry_update' || action.code === 'continue_update' ? 'btn-primary' : 'btn-secondary'"
            type="button"
            :disabled="!action.enabled"
            @click="handleAction(capabilityChangeItem, action.code)"
          >
            {{ actionLabel(action.code) }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { MENU_TREE, useAppStore } from '@/stores/app'
import { useAIStore } from '@/stores/ai'
import {
  skillHubStatusLabel,
  useSkillHubStore,
  type SkillHubActionCode,
  type SkillHubAllowedAction,
  type SkillHubItem,
  type SkillStatus
} from '@/stores/skillHub'
import SafeCapabilityMarkdown from '@/components/agent/SafeCapabilityMarkdown.vue'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import ScenarioSkillPackageCreateView from '@/views/agent/ScenarioSkillPackageCreateView.vue'
import ScenarioNodeContractSummary from '@/views/agent/ScenarioNodeContractSummary.vue'
import ScenarioTestReportSummary from '@/views/agent/ScenarioTestReportSummary.vue'
import { isScenarioSimulationCurrent } from '@/domain/scenarioPackageTesting.js'
import { scenarioPackageEditGuidance } from '@/domain/scenarioPackageGuidance.js'
import { canAuthorScenarioPackage, scenarioPackageRole, scenarioRequiresConfirmation } from '@/domain/scenarioSkillPackages.js'
import {
  useScenarioSkillPackagesStore,
  type ScenarioPackageAction,
  type ScenarioSkillPackage,
  type ScenarioSkillPackageDraft
} from '@/stores/scenarioSkillPackages'
import {
  capabilityDecisionUpdate,
  shouldShowCapabilityChangeSummary,
  skillHubRowPresentation
} from '@/services/skillCapabilityChanges'

type HubTabId = 'skills' | 'packages'
type PackageListFilter = 'all' | 'draft' | 'review' | 'rejected' | 'published' | 'upgrade_required' | 'paused' | 'disabled'
type PackageManagementMode = 'disable' | 'enable' | 'withdraw'
type PackageDetailMode = 'detail' | 'approve' | 'reject' | PackageManagementMode

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const aiStore = useAIStore()
const skillHubStore = useSkillHubStore()
const scenarioStore = useScenarioSkillPackagesStore()
const { permissions, user } = storeToRefs(appStore)
const { items } = storeToRefs(skillHubStore)
const { packages } = storeToRefs(scenarioStore)

const hubTabs: Array<{ id: HubTabId; label: string }> = [
  { id: 'skills', label: 'Skill' },
  { id: 'packages', label: '场景技能包' }
]
const hubTabElements = new Map<HubTabId, HTMLButtonElement>()
const packageRowElements = new Map<string, HTMLElement>()
const activeHubTab = computed<HubTabId>(() => route.query.tab === 'packages' || route.query.tab === 'review' ? 'packages' : 'skills')
const packageRole = computed(() => scenarioPackageRole({ id: user.value || '', permissions: permissions.value }))
const canCreatePackage = computed(() => Boolean(user.value)
  && canAuthorScenarioPackage({ id: user.value || '', permissions: permissions.value }))
const dedicatedPackageCreate = route.path === '/agent/scenario-package-create'
const packageCreateSession = ref(0)
const packageCreateRoute = computed(() => dedicatedPackageCreate || route.path === '/agent/skills' && activeHubTab.value === 'packages' && route.query.mode === 'create')
const packageEditId = computed(() => dedicatedPackageCreate ? '' : packageCreateRoute.value && typeof route.query.edit === 'string' ? route.query.edit : '')
const editingPackage = ref<ScenarioSkillPackageDraft>()
const editingPackageActorId = ref('')
const newPackageSessionOwner = ref('')
watch([packageCreateRoute, packageEditId, user, permissions], ([creating, id, ownerId]) => {
  if (!creating || !ownerId) {
    editingPackage.value = undefined
    editingPackageActorId.value = ''
    newPackageSessionOwner.value = ''
    return
  }
  if (newPackageSessionOwner.value !== ownerId) newPackageSessionOwner.value = ''
  if (!id) {
    editingPackage.value = undefined
    editingPackageActorId.value = ''
    if (canCreatePackage.value) newPackageSessionOwner.value = ownerId
    return
  }
  newPackageSessionOwner.value = ''
  // Keep the opened copy when storage or permissions change; the editor locks stale writes.
  if (editingPackage.value?.id === id && editingPackageActorId.value === ownerId) return
  editingPackage.value = scenarioStore.editableDraft(id, { id: ownerId, permissions: permissions.value }) || undefined
  editingPackageActorId.value = editingPackage.value ? ownerId : ''
}, { immediate: true, flush: 'sync' })
const isPackageCreate = computed(() => packageCreateRoute.value && (packageEditId.value
  ? Boolean(editingPackage.value) : Boolean(user.value && newPackageSessionOwner.value === user.value)))

const keyword = ref('')
const creatorKeyword = ref('')
const statusFilter = ref<'all' | SkillStatus>('all')
const categoryFilter = ref('all')
type SummaryFilter = 'all' | 'own' | 'review' | 'published' | 'updates' | 'disabled'
const summaryFilter = ref<SummaryFilter>('all')
const onlyCapabilityUpdates = computed({
  get: () => summaryFilter.value === 'updates',
  set: (checked: boolean) => {
    summaryFilter.value = checked ? 'updates' : 'all'
    if (checked) statusFilter.value = 'all'
  }
})
const detailItem = ref<SkillHubItem | null>(null)
const evalItem = ref<SkillHubItem | null>(null)
const capabilityChangeItem = ref<SkillHubItem | null>(null)
const confirmState = ref<{ item: SkillHubItem; action: SkillHubActionCode } | null>(null)
const confirmReason = ref('')
const confirmError = ref('')
const packageKeyword = ref('')
const packageStatusFilter = ref<PackageListFilter>('all')
const packageSummaryFilter = ref<PackageListFilter>('all')
const packageReviewNote = ref('')
const packageReviewError = ref('')
const packageReviewBusy = ref(false)
const packageReviewMode = ref<PackageDetailMode>('detail')
const packageManagementLabels = { disable: '确认禁用', enable: '确认启用', withdraw: '确认撤回' }
const packageManagementDescriptions = {
  withdraw: '撤回后回到草稿，可继续编辑并重新提交审核；当前已发布或已禁用的线上版本保持原状态。',
  disable: '禁用后，当前已审核版本将停止被调用。正在编辑或审核的内容会保留，后续审批通过也不会自动启用。',
  enable: '启用后恢复当前已审核版本的调用；运行时仍检查依赖和调用权限。正在编辑或审核的内容不会提前生效。'
}
const packageManagementMode = computed<PackageManagementMode | null>(() =>
  ['disable', 'enable', 'withdraw'].includes(packageReviewMode.value) ? packageReviewMode.value as PackageManagementMode : null
)
const packageModeTitle = computed(() => ({
  detail: '', approve: '审批场景技能包 · ', reject: '驳回场景技能包 · ',
  disable: '禁用场景技能包 · ', enable: '启用场景技能包 · ', withdraw: '撤回场景技能包 · '
})[packageReviewMode.value])
const packageReviewInput = ref<HTMLTextAreaElement | null>(null)
const packageDetailId = ref('')
const packageOpenedUpdatedAt = ref('')
const packageDetailItem = computed(() => packageDetailId.value
  ? scenarioStore.findPackage(packageDetailId.value) || null
  : null)
const packageActionStale = computed(() => packageReviewMode.value !== 'detail'
  && packageDetailItem.value?.updatedAt !== packageOpenedUpdatedAt.value)
const packageActor = computed(() => ({ id: user.value || '', permissions: permissions.value }))
const packageApplications = computed(() => new Map(packages.value.map(item => [
  item.id, scenarioStore.applicationEligibility(item.id, packageActor.value)
])))
const packageTestIsStale = computed(() => {
  const item = packageDetailItem.value
  return !!item?.testReport && !isScenarioSimulationCurrent(
    item.testReport, item, scenarioStore.selectableSkills, item.testRequest || item.testReport.request
  )
})
const packageReviewDecision = computed(() => packageDetailItem.value?.status === 'review'
  ? scenarioStore.reviewDecision(packageDetailItem.value.id, packageActor.value)
  : { ok: false, reasons: [] as string[] })
const packageRunPlan = computed(() => packageDetailItem.value
  ? scenarioStore.prepareRunPlan(packageDetailItem.value.id, { id: user.value || '', permissions: permissions.value })
  : null)
const packageDetailClose = ref<HTMLButtonElement | null>(null)
const packageDetailPanel = ref<HTMLElement | null>(null)
const activeCreateButton = ref<HTMLButtonElement | null>(null)
const highlightedPackageId = ref('')
let packageDetailTrigger: HTMLButtonElement | null = null
let isViewActive = false
let packageDocumentKeydownAttached = false
const packageDialogFocusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

const role = computed(() => permissions.value.includes('*') ? 'admin' : 'pm')
const actor = computed(() => ({ role: role.value, user: user.value || 'admin' }) as const)
const pageDesc = computed(() => {
  if (activeHubTab.value === 'packages') {
    return packageRole.value === 'admin'
      ? canCreatePackage.value
        ? '创建和维护本人的场景技能包，编辑已发布技能包及其修订，审核他人的提交并管理启停。'
        : '编辑已发布技能包及其修订，审核他人提交，管理已审核版本的启停与依赖状态。'
      : packageRole.value === 'pm'
        ? '创建和维护本人的场景技能包，编排、试运行后提交管理员审核。'
        : '查看场景技能包的配置、审核状态与依赖情况。'
  }
  return role.value === 'admin'
    ? '管理员可查看草稿，并审批、驳回、发布、启用或禁用 Skill；草稿可返回需求澄清继续编辑。'
    : 'PM 查看自己保存或提交的 Skill；草稿和被驳回的 Skill 可返回创建流程继续修改。'
})

const firstLevelCategories = Object.values(MENU_TREE).map(group => group.label)

function skillCategoryLabel(item: SkillHubItem) {
  const rawCategory = item.category || ''
  if (firstLevelCategories.includes(rawCategory)) return rawCategory

  const text = `${rawCategory} ${item.cnName || ''} ${item.name || ''} ${item.desc || ''} ${(item.tags || []).join(' ')}`
  if (/职场|员工|认证|审核|在职/.test(text)) return '在职员工管理'
  if (/GEO|信源|意图|引用/.test(text)) return 'GEO 看板'
  if (/线索|客户|商机|打分/.test(text)) return '企业客户管理'
  if (/订单|采购单/.test(text) && firstLevelCategories.includes('订单管理')) return '订单管理'
  return '乐享运营'
}

const categories = computed(() => firstLevelCategories)
const statusOptions: SkillStatus[] = ['draft', 'review', 'approved', 'published', 'disabled', 'rejected']

function matchesSummaryFilter(item: SkillHubItem, filter: SummaryFilter) {
  if (filter === 'all') return true
  if (filter === 'own') return item.owner === (user.value || 'admin')
  if (filter === 'review') return item.workflowStatus === 'review'
  if (filter === 'published') return item.onlineStatus === 'published'
  if (filter === 'updates') return hasCapabilityUpdate(item)
  return item.onlineStatus === 'disabled'
}

const filteredItems = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  const creator = creatorKeyword.value.trim().toLowerCase()
  return items.value.filter(item => {
    const matchKeyword = !q || [item.name, item.cnName, item.desc].some(text => text.toLowerCase().includes(q))
    const matchCreator = !creator || (item.owner || '').toLowerCase().includes(creator)
    const matchStatus = statusFilter.value === 'all' || item.workflowStatus === statusFilter.value
    const matchCategory = categoryFilter.value === 'all' || skillCategoryLabel(item) === categoryFilter.value
    const matchSummary = matchesSummaryFilter(item, summaryFilter.value)
    return matchKeyword && matchCreator && matchStatus && matchCategory && matchSummary
  })
})

const summaryItems = computed(() => {
  const ownCount = items.value.filter(item => matchesSummaryFilter(item, 'own')).length
  const reviewCount = items.value.filter(item => matchesSummaryFilter(item, 'review')).length
  const publishedCount = items.value.filter(item => matchesSummaryFilter(item, 'published')).length
  const disabledCount = items.value.filter(item => matchesSummaryFilter(item, 'disabled')).length
  const capabilityCount = items.value.filter(item => matchesSummaryFilter(item, 'updates')).length
  return [
    { key: 'all', label: '全部 Skill', code: 'ALL', value: items.value.length, desc: `按 ${categories.value.length} 个一级菜单归类`, tone: 'stat--primary', filter: 'all' as const },
    { key: 'own', label: '我的 Skill', code: 'ME', value: ownCount, desc: role.value === 'admin' ? '含当前账号草稿与已提交' : '含草稿与已提交记录', tone: 'stat--info', filter: 'own' as const },
    { key: 'review', label: '待审批', code: 'TODO', value: reviewCount, desc: '需管理员审核处理', tone: 'stat--warning', filter: 'review' as const },
    { key: 'published', label: '已发布', code: 'LIVE', value: publishedCount, desc: '线上可被工作台调用', tone: 'stat--success', filter: 'published' as const },
    { key: 'updates', label: '能力更新', code: 'NEW', value: capabilityCount, desc: `${capabilityCount} 个 Skill 待确认影响`, tone: 'stat--primary', filter: 'updates' as const },
    { key: 'disabled', label: '已禁用', code: 'OFF', value: disabledCount, desc: '暂停参与任务匹配', tone: 'stat--muted', filter: 'disabled' as const }
  ]
})

function packageHealthStatus(status: ScenarioSkillPackage['health']['status']) {
  return status === 'degraded' ? 'paused' : status
}

function packageStatusKey(packageItem: ScenarioSkillPackage): Exclude<PackageListFilter, 'all'> | 'draft' {
  if (packageItem.status === 'review' || packageItem.status === 'rejected') return packageItem.status
  if (packageItem.status === 'draft') return 'draft'
  if (packageItem.status === 'disabled') return 'disabled'
  const healthStatus = packageHealthStatus(packageItem.health.status)
  return healthStatus === 'healthy' ? 'published' : healthStatus
}

function packageStatusLabel(packageItem: ScenarioSkillPackage) {
  const labels = {
    draft: '草稿',
    review: '待审核',
    rejected: '已驳回',
    published: '已发布',
    upgrade_required: '待升级',
    paused: '已暂停',
    disabled: '已禁用'
  } as const
  return labels[packageStatusKey(packageItem)]
}

function packageMenus(packageItem: ScenarioSkillPackage) {
  return [...new Set(packageItem.steps.map(step => step.menu))]
}

function packageDependencyExplanation(packageItem: ScenarioSkillPackage) {
  if (packageItem.health.status === 'degraded') return '存在不可用依赖，整个技能包已暂停。请恢复依赖后再运行。'
  return packageItem.health.explanations.join('；') || (packageItem.health.status === 'paused'
    ? '存在不可用依赖，整个技能包已暂停。请恢复依赖后再运行。'
    : '当前固定依赖均可用。任一依赖不可用时暂停整个技能包；正常未满足条件的步骤仍可跳过。')
}

function packageHealthHint(packageItem: ScenarioSkillPackage) {
  const onlineHealth = packageItem.publishedSnapshot?.health || packageItem.health
  const onlineState = packageItem.onlineStatus === 'disabled' ? '保持禁用'
    : packageHealthStatus(onlineHealth.status) === 'paused' ? '因依赖异常暂停'
      : '保持已发布'
  const onlineHint = packageItem.publishedSnapshot
    ? `；已审核版本 ${packageItem.publishedSnapshot.version} ${onlineState}`
    : ''
  if (packageItem.status === 'draft') return `${packageItem.publishedSnapshot ? '创建者或管理员可编辑修订' : '创建者可编辑'}，试运行后提交审核${onlineHint}`
  if (packageItem.status === 'review') return `等待管理员审核${onlineHint || '，尚未发布'}`
  if (packageItem.status === 'rejected') return `${packageItem.reviewNote || '按审核意见修改后重新提交'}${onlineHint}`
  if (packageItem.status === 'disabled') return '已审核版本暂停调用，启用后恢复'
  if (packageItem.health.status === 'upgrade_required') {
    return packageItem.health.explanations[0] || '存在新版 Skill，继续使用当前固定版本'
  }
  if (packageItem.health.status === 'degraded') return '存在不可用依赖，技能包已暂停'
  if (packageItem.health.status === 'paused') return packageItem.health.explanations[0] || '存在不可用依赖，技能包已暂停'
  return '固定版本依赖均可用'
}

const listedScenarioPackages = computed(() => packages.value)

function matchesPackageStatus(packageItem: ScenarioSkillPackage, filter: PackageListFilter) {
  if (filter === 'all') return true
  if (['draft', 'review', 'rejected'].includes(filter)) return packageItem.status === filter
  const onlineStatus = packageItem.onlineStatus || packageItem.status
  if (filter === 'published' || filter === 'disabled') return onlineStatus === filter
  return onlineStatus === 'published' && packageHealthStatus((packageItem.publishedSnapshot?.health || packageItem.health).status) === filter
}

const filteredScenarioPackages = computed(() => {
  const query = packageKeyword.value.trim().toLowerCase()
  const selectedFilter = packageSummaryFilter.value !== 'all'
    ? packageSummaryFilter.value
    : packageStatusFilter.value
  return listedScenarioPackages.value.filter(packageItem => {
    const matchesKeyword = !query || [
      packageItem.name,
      packageItem.description,
      packageItem.ownerId
    ].some(value => value.toLowerCase().includes(query))
    const matchesStatus = matchesPackageStatus(packageItem, selectedFilter)
    return matchesKeyword && matchesStatus
  })
})

const packageSummaryItems = computed(() => {
  const count = (filter: Exclude<PackageListFilter, 'all'>) => (
    listedScenarioPackages.value.filter(packageItem => matchesPackageStatus(packageItem, filter)).length
  )
  return [
    { key: 'all', label: '全部技能包', code: 'ALL', value: listedScenarioPackages.value.length, desc: '跨菜单固定版本链路', tone: 'stat--primary', filter: 'all' as const },
    { key: 'review', label: '待审核', code: 'TODO', value: count('review'), desc: '等待管理员审核', tone: 'stat--warning', filter: 'review' as const },
    { key: 'published', label: '已发布', code: 'LIVE', value: count('published'), desc: '已有已审核发布版本', tone: 'stat--success', filter: 'published' as const },
    { key: 'upgrade', label: '待升级', code: 'NEW', value: count('upgrade_required'), desc: '有新版，仍使用固定版本', tone: 'stat--primary', filter: 'upgrade_required' as const },
    { key: 'paused', label: '已暂停', code: 'STOP', value: count('paused'), desc: '存在不可用依赖', tone: 'stat--muted', filter: 'paused' as const }
  ]
})

function setSummaryFilter(filter: SummaryFilter) {
  summaryFilter.value = summaryFilter.value === filter ? 'all' : filter
  keyword.value = ''
  creatorKeyword.value = ''
  statusFilter.value = 'all'
  categoryFilter.value = 'all'
}

function setPackageSummaryFilter(filter: PackageListFilter) {
  packageSummaryFilter.value = packageSummaryFilter.value === filter ? 'all' : filter
  packageStatusFilter.value = 'all'
  packageKeyword.value = ''
}

function resetPackageFilters() {
  packageKeyword.value = ''
  packageStatusFilter.value = 'all'
  packageSummaryFilter.value = 'all'
}

type ConfirmMeta = {
  title: string
  desc: string
  confirmText: string
  tone: string
  acceptsReason?: boolean
}

const confirmMeta = computed<ConfirmMeta>(() => {
  const action = confirmState.value?.action
  const options: Partial<Record<SkillHubActionCode, ConfirmMeta>> = {
    publish: { title: '确认发布 Skill', desc: '发布后候选版本将成为线上版本；原 Skill 为禁用状态时仍保持禁用。', confirmText: '确认发布', tone: 'success' },
    disable: { title: '确认禁用 Skill', desc: '禁用后该 Skill 将暂不可用，已配置的调用入口会停止响应。', confirmText: '确认禁用', tone: 'danger' },
    enable: { title: '确认启用 Skill', desc: '启用后该 Skill 将恢复线上可用状态。', confirmText: '确认启用', tone: 'success' },
    approve: { title: '确认审批通过', desc: '审批通过后候选版本可进入发布，当前线上版本不会改变。', confirmText: '审批通过', tone: 'success' },
    reject: { title: '确认驳回 Skill', desc: '驳回只影响候选版本，负责人可继续修改后重新提交。', confirmText: '确认驳回', tone: 'danger' },
    delete: { title: '确认删除草稿', desc: '删除后当前草稿将从列表移除，本次操作不可撤销。', confirmText: '确认删除', tone: 'danger' },
    ignore_update: { title: '确认忽略更新', desc: '忽略更新只作用于当前变化记录，候选版本仍基于旧能力上下文；后续检测到新版本时会重新提示。', confirmText: '确认忽略', tone: 'normal', acceptsReason: true }
  }
  return (action && options[action]) || { title: '确认操作', desc: '该操作会改变 Skill 当前状态，请确认后继续。', confirmText: '确认', tone: 'normal' }
})

const confirmRequiresReason = computed(() => {
  if (confirmState.value?.action !== 'ignore_update') return false
  return (decisionCapabilityUpdate(confirmState.value.item)?.changes || [])
    .some((change: { kind?: string }) => change.kind === 'breaking' || change.kind === 'permission')
})

const capabilityDetailUpdate = computed(() => capabilityChangeItem.value
  ? decisionCapabilityUpdate(capabilityChangeItem.value)
  : undefined)

const capabilityDetailActions = computed<SkillHubAllowedAction[]>(() => {
  if (!capabilityChangeItem.value) return []
  const codes: SkillHubActionCode[] = ['start_update', 'ignore_update', 'continue_update', 'retry_update']
  return allowedActionsFor(capabilityChangeItem.value).filter(action => codes.includes(action.code))
})

function rowPresentation(item: SkillHubItem) {
  return skillHubRowPresentation(item)
}

function decisionCapabilityUpdate(item: SkillHubItem) {
  return capabilityDecisionUpdate(item)
}

function allowedActionsFor(item: SkillHubItem) {
  return skillHubStore.allowedActionsFor(item, actor.value)
}

function actionTone(action: SkillHubActionCode) {
  if (action === 'test') return 'test'
  if (action === 'delete' || action === 'reject') return 'danger'
  if (action === 'approve' || action === 'publish' || action === 'enable') return 'success'
  if (action === 'submit_review' || action === 'retry_update') return 'warning'
  return 'normal'
}

function actionLabel(action: SkillHubActionCode) {
  return ({
    view_change: '查看变化',
    start_update: '更新',
    ignore_update: '忽略更新',
    continue_update: '继续更新',
    view_update_error: '查看失败原因',
    retry_update: '重试更新',
    edit: '编辑',
    view: '详情',
    evaluate: '评估',
    test: '应用',
    submit_review: '提交审核',
    withdraw_review: '撤回',
    approve: '审批',
    reject: '驳回',
    publish: '发布',
    enable: '启用',
    disable: '禁用',
    delete: '删除'
  })[action]
}

function handleAction(item: SkillHubItem, action: SkillHubActionCode) {
  if (action === 'test') return testSkill(item)
  if (action === 'view_change' || action === 'view_update_error') {
    capabilityChangeItem.value = item
    return
  }
  if (action === 'start_update' || action === 'continue_update' || action === 'retry_update') {
    openCapabilityUpdate(item)
    return
  }
  if (action === 'ignore_update') {
    openConfirm(item, action)
    return
  }
  if (action === 'evaluate') {
    evalItem.value = item
    return
  }
  if (action === 'view') {
    detailItem.value = item
    return
  }
  if (action === 'edit') {
    openSkillCreateForItem(item, item.workflowStatus === 'rejected')
    return
  }
  if (action === 'submit_review') {
    updateStatus(item, 'review')
    return
  }
  if (action === 'withdraw_review') {
    if (item.capabilityUpdate?.status === 'processing') updateCapabilityStatus(item, 'draft')
    else updateStatus(item, 'draft')
    return
  }
  if (['publish', 'enable', 'disable', 'approve', 'reject', 'delete'].includes(action)) {
    openConfirm(item, action)
    return
  }
}

function hasCapabilityUpdate(item: SkillHubItem) {
  return ['available', 'preparing', 'processing_with_available', 'failed'].includes(item.capabilityUpdate?.status || 'none')
}

function technicalMarkdown(item: SkillHubItem) {
  return (decisionCapabilityUpdate(item)?.technicalDetails || []).join('\n\n')
}

function openCapabilityUpdate(item: SkillHubItem) {
  const updated = skillHubStore.startCapabilityUpdate(item.name)
  if (!updated) return
  capabilityChangeItem.value = null
  sessionStorage.setItem('leai.skillCreateDraft', JSON.stringify({ item: updated, capabilityUpdate: true }))
  void router.push({
    path: '/agent/skill-create',
    query: { skill: updated.name, edit: 'draft', capabilityUpdate: '1' }
  })
  toast(`${updated.cnName || updated.name}：已进入能力更新草稿，线上版本继续生效`)
}

function openConfirm(item: SkillHubItem, action: SkillHubActionCode) {
  confirmReason.value = ''
  confirmError.value = ''
  confirmState.value = { item, action }
}

function closeConfirm() {
  confirmState.value = null
  confirmReason.value = ''
  confirmError.value = ''
}

function confirmAction() {
  if (!confirmState.value) return
  const { item, action } = confirmState.value
  if (action === 'ignore_update' && confirmRequiresReason.value && !confirmReason.value.trim()) {
    confirmError.value = '破坏性或权限变化必须填写处理说明'
    return
  }
  try {
    if (action === 'approve') {
      if (item.capabilityUpdate?.status === 'processing') updateCapabilityStatus(item, 'approved')
      else updateStatus(item, 'approved')
    } else if (action === 'reject') {
      if (item.capabilityUpdate?.status === 'processing') updateCapabilityStatus(item, 'rejected')
      else updateStatus(item, 'rejected')
    } else if (action === 'publish') {
      if (item.capabilityUpdate?.status === 'processing') updateCapabilityStatus(item, 'published')
      else updateStatus(item, 'published')
    } else if (action === 'enable') updateStatus(item, 'published')
    else if (action === 'disable') updateStatus(item, 'disabled')
    else if (action === 'delete') {
      skillHubStore.removeSkill(item.name)
      toast(`${item.name}：草稿已删除`)
    } else if (action === 'ignore_update') {
      skillHubStore.ignoreCapabilityUpdate(item.name, user.value || 'admin', confirmReason.value.trim())
      capabilityChangeItem.value = null
      toast(`${item.name}：已忽略更新`)
    }
  } catch (error) {
    confirmError.value = error instanceof Error ? error.message : '操作失败，请检查后重试'
    return
  }
  closeConfirm()
}

function updateStatus(item: SkillHubItem, status: SkillStatus) {
  skillHubStore.updateStatus(item, status, user.value || 'admin')
  toast(`${item.name}：状态已更新为${item.statusText}`)
}

function updateCapabilityStatus(item: SkillHubItem, status: 'draft' | 'approved' | 'rejected' | 'published') {
  skillHubStore.updateCapabilityEditStatus(item, status, user.value || 'admin')
  const label = status === 'published' ? '更新版本已发布' : status === 'draft' ? '更新已撤回到草稿' : `编辑版${skillHubStatusLabel(status)}`
  toast(`${item.name}：${label}`)
}

function testSkill(item: SkillHubItem) {
  const query = item.name === 'presentation-employee-cert'
    ? '总结近两周的认证数据情况，人群画像，并查看认证用户的购买转化、GMV、爆款商品。'
    : `请用自然语言测试 Skill「${item.name}」，说明适用场景、风险边界和输出结果。`
  aiStore.toggleOpen(true)
  aiStore.quickSend(query, 'agent.skills')
  toast(`${item.name}：已在右侧 Agent 展示调用结果`)
}

function detailId(item: SkillHubItem) {
  return String(14 + Math.max(items.value.indexOf(item), 0))
}

function setHubTabRef(tab: HubTabId, element: unknown) {
  if (element instanceof HTMLButtonElement) hubTabElements.set(tab, element)
  else hubTabElements.delete(tab)
}

function setPackageRowRef(id: string, element: unknown) {
  if (element instanceof HTMLElement) packageRowElements.set(id, element)
  else packageRowElements.delete(id)
}

async function selectHubTab(tab: HubTabId, focus = false) {
  if (tab === 'packages') {
    await router.replace({ path: '/agent/skills', query: { tab } })
  } else {
    await router.replace({ path: '/agent/skills', query: {} })
  }
  if (focus) await nextTick(() => hubTabElements.get(tab)?.focus())
}

function handleHubTabKeydown(event: KeyboardEvent, tab: HubTabId) {
  const currentIndex = hubTabs.findIndex(item => item.id === tab)
  let targetIndex: number | null = null
  if (event.key === 'ArrowLeft') targetIndex = (currentIndex - 1 + hubTabs.length) % hubTabs.length
  else if (event.key === 'ArrowRight') targetIndex = (currentIndex + 1) % hubTabs.length
  else if (event.key === 'Home') targetIndex = 0
  else if (event.key === 'End') targetIndex = hubTabs.length - 1
  if (targetIndex === null) return
  event.preventDefault()
  const target = hubTabs[targetIndex]
  if (target) void selectHubTab(target.id, true)
}

function canReviewPackage(packageItem: ScenarioSkillPackage) {
  return hasPackageAction(packageItem, 'approve') && hasPackageAction(packageItem, 'reject')
}

function hasPackageAction(packageItem: ScenarioSkillPackage, action: ScenarioPackageAction) {
  return scenarioStore.actionsFor(packageItem.id, packageActor.value).includes(action)
}

function packageApplication(packageItem: ScenarioSkillPackage) {
  return packageApplications.value.get(packageItem.id)
    || scenarioStore.applicationEligibility(packageItem.id, packageActor.value)
}

function packageApplicationHint(packageItem: ScenarioSkillPackage) {
  const eligibility = packageApplication(packageItem)
  if (!eligibility.ok) return eligibility.reasons.join('；') || '当前技能包不可应用。'
  const isCurrentRevision = eligibility.versionSource === 'current_revision'
  const versionLabel = isCurrentRevision
    ? `测试当前${eligibility.packageStatus === 'draft' ? '草稿' : '待审核'}版本 ${eligibility.version}`
    : `应用已审核固定版本 ${eligibility.version}`
  return `在 AI 助手中${versionLabel}，进行本地样例测试${isCurrentRevision ? '，不会发布' : ''}${eligibility.requiresConfirmation ? '；执行前需确认' : ''}`
}

function applyPackage(packageItem: ScenarioSkillPackage) {
  if (packageReviewBusy.value) return
  const eligibility = scenarioStore.applicationEligibility(packageItem.id, packageActor.value)
  if (!eligibility.ok) {
    toast(eligibility.reasons.join('；') || '当前技能包不可应用。')
    return
  }
  const result = aiStore.applyScenarioPackage(packageItem.id)
  if (!result.ok) {
    toast(result.reason || '应用测试未开始，请检查当前状态后重试。')
    return
  }
  clearPackageDetailWithoutFocus()
}

function packageEditGuidance(packageItem: ScenarioSkillPackage) {
  return scenarioPackageEditGuidance(packageItem, packageActor.value, {
    actions: scenarioStore.actionsFor(packageItem.id, packageActor.value),
    reviewDecision: scenarioStore.reviewDecision(packageItem.id, packageActor.value)
  })
}

function openPackageDetail(packageItem: ScenarioSkillPackage, event?: MouseEvent, mode: PackageDetailMode = 'detail') {
  if (packageReviewBusy.value || (mode !== 'detail' && !hasPackageAction(packageItem, mode))) return
  packageDetailTrigger = typeof HTMLButtonElement !== 'undefined' && event?.currentTarget instanceof HTMLButtonElement ? event.currentTarget : null
  packageReviewMode.value = mode
  packageReviewNote.value = ''
  packageReviewError.value = ''
  packageDetailId.value = packageItem.id
  packageOpenedUpdatedAt.value = packageItem.updatedAt
  syncPackageDocumentKeydown()
  void nextTick(() => packageDetailClose.value?.focus())
}

function packageDialogFocusableElements() {
  return packageDetailPanel.value
    ? [...packageDetailPanel.value.querySelectorAll<HTMLElement>(packageDialogFocusableSelector)]
    : []
}

function closePackageDetail() {
  packageDetailId.value = ''
  packageReviewMode.value = 'detail'
  syncPackageDocumentKeydown()
  void nextTick(() => {
    if (isViewActive) {
      if (packageDetailTrigger?.isConnected) packageDetailTrigger.focus()
      else hubTabElements.get(activeHubTab.value)?.focus()
    }
    packageDetailTrigger = null
  })
}

function clearPackageDetailWithoutFocus() {
  packageDetailId.value = ''
  packageReviewMode.value = 'detail'
  packageDetailTrigger = null
  syncPackageDocumentKeydown()
}

function packageAuditLabel(type: string) {
  return ({ submitted: '提交审核', approved: '审核通过', rejected: '审核驳回', published: '发布完成', withdrawn: '撤回审核', disabled: '禁用', enabled: '启用' } as Record<string, string>)[type] || type
}

async function reviewPackage(action: 'approve' | 'reject') {
  const item = packageDetailItem.value
  if (!item || packageActionStale.value || packageReviewBusy.value || packageReviewMode.value !== action) return
  packageReviewError.value = ''
  packageReviewBusy.value = true
  try {
    const note = packageReviewNote.value.trim()
    if (action === 'reject') {
      if (!note) throw new Error('请填写驳回原因，说明需要修改的内容。')
      scenarioStore.rejectPackage(item.id, packageActor.value, note, packageOpenedUpdatedAt.value)
      toast(`${item.name}：已驳回，等待创建人修改后重新提交`)
    } else {
      const approved = scenarioStore.approvePackage(item.id, packageActor.value, note, packageOpenedUpdatedAt.value)
      toast(`${item.name}：${approved.onlineStatus === 'disabled' ? '审核通过，保持禁用' : '审核通过并已发布'}`)
    }
    packageReviewNote.value = ''
    packageReviewMode.value = 'detail'
    await nextTick()
    packageDetailClose.value?.focus()
  } catch (error) {
    packageReviewError.value = error instanceof Error ? error.message : '审核操作失败，请重试。'
    await nextTick()
    packageReviewInput.value?.focus()
  } finally {
    packageReviewBusy.value = false
  }
}

async function editPackage(item: ScenarioSkillPackage) {
  if (!hasPackageAction(item, 'edit') || packageReviewBusy.value) return
  const draft = scenarioStore.editableDraft(item.id, { id: user.value || '', permissions: permissions.value })
  if (!draft) return
  editingPackage.value = draft
  editingPackageActorId.value = user.value || ''
  clearPackageDetailWithoutFocus()
  await router.replace({ path: '/agent/skills', query: { tab: 'packages', mode: 'create', edit: item.id } })
  await focusPackageCreator()
}

async function managePackage(action: PackageManagementMode) {
  const item = packageDetailItem.value
  if (!item || packageActionStale.value || packageReviewBusy.value || packageReviewMode.value !== action) return
  packageReviewBusy.value = true
  packageReviewError.value = ''
  try {
    const result = action === 'withdraw'
      ? scenarioStore.withdrawPackage(item.id, packageActor.value, packageOpenedUpdatedAt.value)
      : action === 'disable' ? scenarioStore.disablePackage(item.id, packageActor.value)
        : scenarioStore.enablePackage(item.id, packageActor.value)
    if (!result.ok) throw new Error(result.reasons.join('；'))
    toast(`${item.name}：${{ disable: '已禁用', enable: '已启用已审核版本', withdraw: '已撤回审核，可继续编辑' }[action]}`)
    packageReviewMode.value = 'detail'
    await nextTick()
    packageDetailClose.value?.focus()
  } catch (error) {
    packageReviewError.value = error instanceof Error ? error.message : '操作失败，请重试。'
  } finally {
    packageReviewBusy.value = false
  }
}

function handlePackageDetailKeydown(event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const focusableElements = packageDialogFocusableElements()
  const first = focusableElements[0]
  const last = focusableElements[focusableElements.length - 1]
  const panel = packageDetailPanel.value
  if (!first || !last || !panel) {
    event.preventDefault()
    panel?.focus()
    return
  }

  const activeElement = document.activeElement
  if (event.shiftKey && (activeElement === first || !panel.contains(activeElement))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (activeElement === last || !panel.contains(activeElement))) {
    event.preventDefault()
    first.focus()
  }
}

function handlePackageDocumentKeydown(event: KeyboardEvent) {
  if (!packageDetailItem.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closePackageDetail()
  }
}

function addPackageDocumentKeydown() {
  if (packageDocumentKeydownAttached) return
  document.addEventListener('keydown', handlePackageDocumentKeydown)
  packageDocumentKeydownAttached = true
}

function removePackageDocumentKeydown() {
  if (!packageDocumentKeydownAttached) return
  document.removeEventListener('keydown', handlePackageDocumentKeydown)
  packageDocumentKeydownAttached = false
}

function syncPackageDocumentKeydown() {
  if (isViewActive && Boolean(packageDetailItem.value)) addPackageDocumentKeydown()
  else removePackageDocumentKeydown()
}

function formatPackageUpdatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || '-'
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

function openSkillCreateForItem(item: SkillHubItem, rejected = false) {
  sessionStorage.setItem('leai.skillCreateDraft', JSON.stringify({ item, rejected }))
  const isDraft = item.workflowStatus === 'draft'
  void router.push({
    path: '/agent/skill-create',
    query: {
      skill: item.name,
      rejected: rejected ? '1' : undefined,
      edit: isDraft ? 'draft' : undefined
    }
  })
  toast(rejected
    ? `${item.cnName || item.name}：已进入创建流程，请修改后重新提交`
    : isDraft
      ? `${item.cnName || item.name}：已恢复草稿并进入需求澄清`
      : `${item.cnName || item.name}：已进入编辑流程`)
}

function openSkillCreate() {
  sessionStorage.removeItem('leai.skillCreateDraft')
  router.push('/agent/skill-create')
}

async function focusPackageCreator() {
  await nextTick()
  document
    .querySelector<HTMLElement>('.scenario-package-create input:not([disabled]):not([readonly])')
    ?.focus()
}

async function openPackageCreate() {
  if (!canCreatePackage.value) return
  await router.push('/agent/scenario-package-create')
  await focusPackageCreator()
}

function openActiveCreate() {
  if (activeHubTab.value === 'packages') openPackageCreate()
  else if (activeHubTab.value === 'skills') openSkillCreate()
}

async function resetPackageCreateSession() {
  if (!dedicatedPackageCreate) return
  // Rebuild while the Teleport header target is still in the document, before KeepAlive deactivates this view.
  packageCreateSession.value += 1
  await nextTick()
}

async function closePackageCreate() {
  await resetPackageCreateSession()
  await router.replace({ path: '/agent/skills', query: {
    tab: 'packages', ...(dedicatedPackageCreate ? { packageCreateCancelled: '1' } : {})
  } })
  await nextTick()
  activeCreateButton.value?.focus()
}

async function handlePackageSubmitted(packageItem: ScenarioSkillPackage) {
  resetPackageFilters()
  packageStatusFilter.value = 'review'
  highlightedPackageId.value = packageItem.id
  await resetPackageCreateSession()
  await router.replace({ path: '/agent/skills', query: {
    tab: 'packages', ...(dedicatedPackageCreate ? { submittedPackage: packageItem.id } : {})
  } })
  await nextTick()
  packageRowElements.get(packageItem.id)?.scrollIntoView({ block: 'nearest' })
  packageRowElements.get(packageItem.id)?.focus()
  toast(`${packageItem.name}：已提交审核，等待管理员处理`)
}

async function handlePackageSaved(packageItem: ScenarioSkillPackage) {
  resetPackageFilters()
  packageStatusFilter.value = 'draft'
  highlightedPackageId.value = packageItem.id
  await resetPackageCreateSession()
  await router.replace({ path: '/agent/skills', query: {
    tab: 'packages', ...(dedicatedPackageCreate ? { savedPackage: packageItem.id } : {})
  } })
  await nextTick()
  packageRowElements.get(packageItem.id)?.scrollIntoView({ block: 'nearest' })
  packageRowElements.get(packageItem.id)?.focus()
  toast(`${packageItem.name}：草稿已保存，可稍后继续编辑`)
}

function goPortalHome() {
  router.push('/portal/home')
}

function toast(message: string) {
  appStore.notify(message)
}

// The dedicated creator and list are separate KeepAlive instances.
watch(() => [route.path, route.query.savedPackage, route.query.submittedPackage, route.query.packageCreateCancelled] as const, async ([path, saved, submitted, cancelled]) => {
  if (dedicatedPackageCreate || path !== '/agent/skills') return
  const id = typeof submitted === 'string' ? submitted : typeof saved === 'string' ? saved : ''
  if (id ? !scenarioStore.findPackage(id) : cancelled !== '1') return
  if (id) {
    resetPackageFilters()
    packageStatusFilter.value = typeof submitted === 'string' ? 'review' : 'draft'
    highlightedPackageId.value = id
  }
  const query = { ...route.query }
  delete query.savedPackage
  delete query.submittedPackage
  delete query.packageCreateCancelled
  await router.replace({ path, query })
  await nextTick()
  if (id) {
    packageRowElements.get(id)?.scrollIntoView({ block: 'nearest' })
    packageRowElements.get(id)?.focus()
  } else {
    activeCreateButton.value?.focus()
  }
}, { immediate: true })

watch(() => [route.path, route.query.submittedSkill] as const, ([path, name]) => {
  if (path !== '/agent/skills' || typeof name !== 'string' || !skillHubStore.findSkill(name)) return
  keyword.value = ''
  creatorKeyword.value = ''
  statusFilter.value = 'all'
  categoryFilter.value = 'all'
  summaryFilter.value = 'all'
  detailItem.value = null
  evalItem.value = null
  capabilityChangeItem.value = null
  confirmState.value = null
  const query = { ...route.query }
  delete query.submittedSkill
  void router.replace({ path, query })
}, { immediate: true })

watch(() => [route.path, route.query.tab] as const, ([path, tab]) => {
  if (path !== '/agent/skills' || tab !== 'review') return
  resetPackageFilters()
  packageStatusFilter.value = 'review'
  void router.replace({ path: '/agent/skills', query: { tab: 'packages' } })
}, { immediate: true })

watch(isPackageCreate, (creating, wasCreating) => {
  if (creating && !wasCreating && isViewActive) void focusPackageCreator()
})

onMounted(() => {
  const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
  if (navigation && navigation.type === 'reload') {
    sessionStorage.removeItem('leai.skillCreateDraft')
  }
  const pageId = dedicatedPackageCreate ? 'agent.scenarioPackageCreate' : 'agent.skills'
  appStore.ensureStaticTab(pageId)
  appStore.setActiveStaticTab(pageId)
  document.title = '联想门户工作台'
})

onActivated(() => {
  isViewActive = true
  syncPackageDocumentKeydown()
  if (isPackageCreate.value) void focusPackageCreator()
})

onDeactivated(() => {
  isViewActive = false
  clearPackageDetailWithoutFocus()
})

onBeforeRouteLeave(() => {
  clearPackageDetailWithoutFocus()
})

onBeforeUnmount(() => {
  isViewActive = false
  packageDetailTrigger = null
  removePackageDocumentKeydown()
})
</script>

<style scoped>
.skill-hub-page[data-page-flow="skill-hub"] {
  gap: 16px;
}

.skill-hub-view-panel > .skill-hub-summary {
  margin-block: 0;
}

.skill-hub-page[data-page-flow="skill-hub"] {
  --scenario-package-summary-gap: 14px;
  min-width: 0;
  container-type: inline-size;
}

.skill-hub-view-tabs {
  display: flex;
  min-height: 48px;
  max-width: 100%;
  gap: var(--space-6, 24px);
  padding-inline: var(--space-4, 16px);
  background: var(--color-surface);
  overflow-x: auto;
  border-radius: var(--radius-lg);
  border-bottom: 1px solid var(--color-border-subtle);
}

.skill-hub-view-tabs button {
  position: relative;
  flex: none;
  min-height: 48px;
  padding: 0 var(--space-2, 8px);
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font: inherit;
  font-size: var(--text-base, 14px);
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;
  cursor: pointer;
}

.skill-hub-view-tabs button::after {
  position: absolute;
  right: var(--space-2, 8px);
  bottom: 0;
  left: var(--space-2, 8px);
  height: 2px;
  background: transparent;
  content: '';
}

.skill-hub-view-tabs button:hover {
  color: var(--color-primary);
}

.skill-hub-view-tabs button.is-active {
  color: var(--color-primary);
  font-weight: 600;
}

.skill-hub-view-tabs button.is-active::after {
  background: var(--color-primary);
}

.skill-hub-view-tabs button:focus-visible,
.scenario-package-stat:focus-visible,
.scenario-package-toolbar input:focus,
.scenario-package-toolbar select:focus,
.scenario-package-table-region:focus-visible,
.scenario-package-row:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.skill-hub-view-panel,
.scenario-package-list {
  display: grid;
  min-width: 0;
  gap: 16px;
}

.skill-hub-page .skill-hub-toolbar {
  grid-template-columns: minmax(240px, 1.5fr) minmax(200px, 1fr) repeat(2, minmax(160px, .8fr)) auto;
}

.skill-hub-filter-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  white-space: nowrap;
}

.skill-hub-page .scenario-package-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--scenario-package-summary-gap);
}

.skill-hub-list-workspace,
.scenario-package-list-workspace {
  display: grid;
  min-width: 0;
  gap: 12px;
}

.skill-hub-list-workspace > * {
  margin-block: 0;
}

.skill-hub-page .scenario-package-toolbar {
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) auto;
}

.scenario-package-table-surface,
.scenario-package-table-region {
  min-width: 0;
}

.scenario-package-table-surface {
  overflow: hidden;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.scenario-package-table-region {
  overflow-x: auto;
}

.scenario-package-table {
  width: 100%;
  min-width: 1040px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 14px;
}

.scenario-package-table th,
.scenario-package-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border-subtle);
  text-align: left;
  vertical-align: middle;
}

.scenario-package-table th {
  height: 40px;
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.scenario-package-table th:first-child { width: 23%; }
.scenario-package-table th:nth-child(2) { width: 9%; }
.scenario-package-table th:nth-child(3) { width: 13%; }
.scenario-package-table th:nth-child(4) { width: 17%; }
.scenario-package-table th:nth-child(5) { width: 10%; }
.scenario-package-table th:nth-child(6) { width: 14%; }
.scenario-package-table th:nth-child(7) { width: 10%; }
.scenario-package-table th:last-child { width: 216px; }
.scenario-package-actions { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.scenario-package-application-hint { display: inline-flex; border-radius: var(--radius-md); }
.scenario-package-application-hint:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.scenario-package-application-hint > button:disabled { opacity: .5; cursor: not-allowed; }

.scenario-package-edit-hint {
  margin: 4px 0 0;
  padding-inline: calc(var(--space-2, 8px) + 1px);
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.6;
  white-space: normal;
  overflow-wrap: anywhere;
}

.scenario-package-edit-rules {
  padding: 12px 16px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: 14px;
}

.scenario-package-edit-rules summary {
  width: fit-content;
  color: var(--color-primary);
  font-weight: 500;
  cursor: pointer;
}

.scenario-package-edit-rules summary:focus-visible {
  border-radius: var(--radius-sm);
  outline: none;
  box-shadow: var(--focus-ring);
}

.scenario-package-edit-rules ul {
  display: grid;
  gap: 8px;
  margin: 12px 0 0;
  padding-left: 20px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.scenario-package-table tbody tr:last-child td {
  border-bottom: 0;
}

.scenario-package-table tbody tr:hover,
.scenario-package-table tbody tr.is-new {
  background: var(--color-primary-subtle);
}

.scenario-package-table td strong,
.scenario-package-table td small {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scenario-package-table td strong {
  color: var(--color-text);
  font-weight: 600;
}

.scenario-package-table td small {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.scenario-package-table code,
.scenario-package-detail-panel code {
  font-family: var(--font-mono);
  font-size: 13px;
}

.scenario-package-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.scenario-package-status::before {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  content: '';
}

.scenario-package-status.is-published { color: var(--color-success); }
.scenario-package-status.is-review { color: var(--color-warning); }
.scenario-package-status.is-rejected { color: var(--color-danger); }
.scenario-package-status.is-upgrade_required { color: var(--color-warning); }
.scenario-package-status.is-paused,
.scenario-package-status.is-disabled { color: var(--color-danger); }

.scenario-package-review-section { display: grid; gap: 12px; }
.scenario-package-review-section h4 { margin: 0; }
.scenario-package-review-field { display: grid; gap: 8px; min-width: 0; font-size: 14px; }
.scenario-package-review-field textarea { box-sizing: border-box; width: 100%; min-height: 88px; padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); font: inherit; line-height: 1.6; resize: vertical; }
.scenario-package-review-field textarea:focus { outline: none; box-shadow: var(--focus-ring); }
.scenario-package-review-error { color: var(--color-danger); font-size: 13px; }

.scenario-package-detail-panel {
  width: min(760px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
}

.scenario-package-detail-body {
  display: grid;
  gap: 20px;
  overflow-y: auto;
}

.scenario-package-detail-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 20px;
  margin: 0;
}

.scenario-package-detail-summary div {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 8px;
  font-size: 14px;
}

.scenario-package-detail-summary dt {
  color: var(--color-text-secondary);
}

.scenario-package-detail-summary dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--color-text);
}

.scenario-package-detail-section h4,
.scenario-package-detail-section p,
.scenario-package-governance p {
  margin: 0;
}

.scenario-package-detail-section h4 {
  margin-bottom: 12px;
  font-size: 14px;
}

.scenario-package-run-readiness {
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.scenario-package-run-readiness summary {
  color: var(--color-text);
  font-weight: 500;
  cursor: pointer;
}

.scenario-package-run-readiness summary:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.scenario-package-run-readiness li + li {
  margin-top: 8px;
}

.scenario-package-run-readiness ul {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.scenario-package-run-readiness li p {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.scenario-package-detail-section > p,
.scenario-package-governance p {
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.scenario-package-detail-steps,
.scenario-package-audit-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.scenario-package-detail-steps li {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.scenario-package-detail-index {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 50%;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 700;
}

.scenario-package-detail-steps p {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.scenario-package-detail-steps small {
  display: block;
  margin-top: 8px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.scenario-package-governance {
  padding: 12px 16px;
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-md);
  background: var(--color-warning-subtle);
}

.scenario-package-governance strong {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
}

.scenario-package-audit-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-subtle);
  font-size: 13px;
}

.scenario-package-audit-list span {
  color: var(--color-text-secondary);
}

@media (max-width: 1400px) {
  .skill-hub-page .scenario-package-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@container (max-width: 1199px) {
  .skill-hub-page .scenario-package-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .skill-hub-page .skill-hub-toolbar:not(.scenario-package-toolbar) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .skill-hub-filter-actions {
    grid-column: 1 / -1;
  }
}

@container (max-width: 1039px) {
  .skill-hub-page .skill-hub-toolbar:not(.scenario-package-toolbar),
  .skill-hub-page .scenario-package-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container (max-width: 719px) {
  .skill-hub-page :deep(.content-page-header__heading) {
    flex-basis: auto;
  }

  .skill-hub-page .skill-hub-toolbar,
  .skill-hub-page .scenario-package-summary,
  .skill-hub-page .scenario-package-toolbar,
  .scenario-package-detail-summary {
    grid-template-columns: minmax(0, 1fr);
  }

  .scenario-package-audit-list li {
    align-items: flex-start;
    flex-direction: column;
  }
}

.skill-hub-detail-panel.scenario-package-detail-panel,
.skill-hub-detail-panel.skill-capability-change-panel { width: min(720px, calc(100vw - 48px)); max-height: calc(100vh - 48px); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); }
.skill-hub-detail-panel:is(.scenario-package-detail-panel, .skill-capability-change-panel) .skill-hub-detail-head { flex: 0 0 auto; justify-content: flex-start; align-items: flex-start; padding: 20px 24px; text-align: left; border-bottom: 1px solid var(--color-border-subtle); }
.skill-hub-detail-panel:is(.scenario-package-detail-panel, .skill-capability-change-panel) .skill-hub-detail-head h3 { font-size: 18px; font-weight: 600; line-height: 1.5; color: var(--color-text); }
.skill-hub-detail-panel:is(.scenario-package-detail-panel, .skill-capability-change-panel) .skill-hub-detail-head p { margin: 8px 0 0; font-size: 14px; line-height: 1.6; color: var(--color-text-secondary); }
.skill-hub-detail-panel:is(.scenario-package-detail-panel, .skill-capability-change-panel) .skill-hub-detail-close { top: 16px; right: 16px; width: 32px; height: 32px; border: 0; border-radius: var(--radius-md); }
.skill-hub-detail-panel:is(.scenario-package-detail-panel, .skill-capability-change-panel) .skill-hub-detail-body { flex: 1 1 auto; min-height: 0; padding: 20px 24px; }
.skill-hub-detail-panel:is(.scenario-package-detail-panel, .skill-capability-change-panel) .skill-hub-detail-foot { flex: 0 0 auto; padding: 16px 24px; border-top: 1px solid var(--color-border-subtle); }
.skill-hub-detail-panel:is(.scenario-package-detail-panel, .skill-capability-change-panel) .skill-hub-detail-head > div { padding-right: 32px; min-width: 0; }
</style>
