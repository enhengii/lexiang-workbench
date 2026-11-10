<template>
  <!--
    完整还原原版 .sidebar 结构与 class。
    collapsed 类对应原 sb.classList.toggle('collapsed')
  -->
  <div
    class="sidebar"
    id="sidebar"
    :class="{ collapsed: sidebarCollapsed, 'is-peeking': isPeeking, 'has-user-menu': userMenuVisible }"
    ref="sidebarEl"
  >
    <SidebarHeader
      :collapsed="sidebarCollapsed"
      @home="goPortalHome"
      @toggle="toggleSidebarManual"
    />

    <!-- ===== 导航菜单（对应原 renderSidebar() 生成的 HTML）===== -->
    <div class="sidebar-nav" id="sidebar-nav">
      <SidebarNavGroup
        v-for="(group, key) in filteredMenuTree"
        :key="key"
        :group="group"
        :group-key="key"
        :current-page-id="currentPageId"
        :active="isGroupActive(key)"
        :open="openGroups.has(key)"
        @toggle="toggleGroup"
        @navigate="navigateTo"
      />
      <div v-if="user" class="nav-group" data-group="sales">
        <div
          class="nav-item"
          :class="{ active: currentPageId === 'sales.workbench' }"
          :aria-current="currentPageId === 'sales.workbench' ? 'page' : undefined"
          data-tip="销售工作台"
          aria-label="销售工作台"
          role="button"
          tabindex="0"
          @click="navigateTo('/sales/workbench', 'sales.workbench')"
          @keydown.enter.prevent="navigateTo('/sales/workbench', 'sales.workbench')"
          @keydown.space.prevent="navigateTo('/sales/workbench', 'sales.workbench')"
        >
          <span class="ni" v-html="MENU_TREE.lead.icon"></span>
          <span>销售工作台</span>
        </div>
      </div>
    </div>

    <SidebarFooter
      :user="user"
      :role="role"
      :user-initial="userInitial"
      :user-menu-visible="userMenuVisible"
      :can-create-scenario-package="canCreateScenarioPackage"
      @toggle-user-menu="toggleUserMenu"
      @close-user-menu="closeUserMenu"
      @logout="doLogout"
      @open-skill-create="openSkillCreatePage"
      @open-scenario-package-create="openScenarioPackageCreatePage"
      @open-skill-manager="openSkillManagerPage"
      @open-permission-manager="openPermissionManagerPage"
      @open-usage-dashboard="openUsageDashboardPage"
      @open-poc-log="openPocAdjustmentLog"
    />
  </div>

  <Teleport to="body">
    <div
      v-if="pocLogVisible"
      id="poc-adjustment-log-modal"
      class="poc-log-modal open"
      @click.self="closePocAdjustmentLog"
    >
      <div class="poc-log-panel" role="dialog" aria-modal="true" aria-label="调整日志">
        <button type="button" class="poc-log-close" @click="closePocAdjustmentLog" aria-label="关闭">×</button>
        <div class="poc-log-head">
          <span>仅用于 POC 记录</span>
          <h3>调整日志</h3>
          <p>记录本轮工作台功能调整与验证状态，不作为正式审计、发布审批或生产变更依据。</p>
        </div>
        <div class="poc-log-list">
          <div v-for="item in pocLogRecords" :key="`${item.time}-${item.title}`" class="poc-log-item">
            <div class="poc-log-meta">
              <span>记录时间</span>
              <time>{{ item.time }}</time>
            </div>
            <div class="poc-log-content">
              <b>{{ item.title }}</b>
              <p>{{ item.detail }}</p>
              <small><span>改动点</span>{{ getPocChangePoint(item) }}</small>
              <div class="poc-log-releases">
                <strong>发布记录</strong>
                <div
                  v-for="release in getPocReleaseRows(item)"
                  :key="release.key"
                  class="poc-log-release-row"
                >
                  <a :href="release.href" target="_blank" rel="noreferrer">{{ release.label }}</a>
                  <em :class="{ pending: !release.published }">{{ release.state }}</em>
                  <p v-if="release.published">
                    <span>发布人 {{ release.publisher }}</span>
                    <time>时间 {{ release.releasedAt }}</time>
                    <code>版本 {{ release.version }}</code>
                  </p>
                  <p v-else>尚未发布到该环境</p>
                </div>
              </div>
              <div v-if="getPocDeployTargets(item).length" class="poc-log-targets">
                <span>部署范围</span>
                <a
                  v-for="target in getPocDeployTargets(item)"
                  :key="target.key"
                  :href="target.href"
                  target="_blank"
                  rel="noreferrer"
                >{{ target.label }}</a>
              </div>
              <div v-if="getPocTraceFields(item).length" class="poc-log-trace">
                <div v-for="field in getPocTraceFields(item)" :key="field.label">
                  <span>{{ field.label }}</span>
                  <p>{{ field.value }}</p>
                </div>
              </div>
            </div>
            <div class="poc-log-status">
              <span>状态</span>
              <em>{{ item.status }}</em>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAppStore, MENU_TREE } from '@/stores/app'
import { STORAGE_KEYS } from '@/constants/storageKeys'
import { pocLogServerRecords } from '@/data/pocLogServerRecords'
import { loadPocReleaseLedger } from '@/services/pocReleaseLedger'
import SidebarHeader from '@/components/sidebar/SidebarHeader.vue'
import SidebarNavGroup from '@/components/sidebar/SidebarNavGroup.vue'
import SidebarFooter from '@/components/sidebar/SidebarFooter.vue'
import { canAuthorScenarioPackage } from '@/domain/scenarioSkillPackages.js'

const router   = useRouter()
const route    = useRoute()
const appStore = useAppStore()

const { user, role, userInitial, sidebarCollapsed, filteredMenuTree } = storeToRefs(appStore)
const canCreateScenarioPackage = computed(() => Boolean(user.value)
  && canAuthorScenarioPackage({ id: user.value || '', permissions: appStore.permissions }))

// 当前 pageId（从路由 meta 读取，对应原 STATE.currentPage）
const currentPageId = computed(() => route.meta?.pageId || '')

// 已展开的分组集合（对应原 .nav-sub.open 状态）
const openGroups = ref(new Set())

// 用户菜单显隐
const userMenuVisible = ref(false)
const isPeeking = ref(false)
const pocLogVisible = ref(false)
const pocReleaseLedger = ref({ records: {} })

const basePocLogRecords = [
  {
    time: '2026-11-10',
    releaseKey: 'workbench-login-flow-20261110',
    title: '管理员免密直达完整工作台',
    changePoint: '管理员免密进入工作台首页，恢复完整菜单、顶部和 AI 助手，不再默认进入权限申请或显示顶部演示导航。',
    detail: '复用当前全部工作台页面与本地业务数据，支持刷新恢复及退出；首次访问、禁用账号和外部密码登录保持原流程。当前身份仍按确认模拟 ADFS，不创建真实后台管理员会话，正常后台认证及运行文件保持不变。',
    deployTargets: [],
    status: '已修复，待验证发布'
  },
  {
    time: '2026-11-09',
    releaseKey: 'workbench-sales-entry-20261109',
    title: '销售工作台独立入口',
    changePoint: '新增独立一级菜单“销售工作台”，可直接进入专属页面，保留其他菜单顺序和原有功能。',
    detail: '本轮仅接入独立菜单、登录后的页面路由与静态页签；销售页面如实展示“销售内容待接入”，未接入销售数据或业务操作。原有运营总览、积分、使用数据看板、权限及 AI 助手保持当前实现。',
    deployTargets: [],
    status: '入口接入，销售内容待提供'
  },
  {
    time: '2026-11-10',
    releaseKey: 'workbench-usage-dashboard-20261105',
    title: '工作台使用数据看板',
    changePoint: '活跃与覆盖统一为总授权用户、DAU、WAU、MAU四卡，分别展示登录与互动人数及占授权总用户的比例。Skill存量、所选周期新增与任务成功率归入上方使用及Skill指标，新增卡明确顶部起止日期。创建人分析移除未标注分组，同步调整调用汇总、排行、质量对比和导出；保留独立创建人列、明细下钻及当前筛选查看全部，切回分页保留原页码；刷新后保留所选视图。',
    detail: '保留使用概览和左下角个人入口，默认展示用户提供的11月5日日报快照。核心80天与Skill明细148行按原表导入，任务和Skill分别统计；创建人按IT Code汇总其Skill贡献，仅统计已有明确创建人归属的数据，支持时间、菜单、搜索、质量比较、创建人到Skill下钻及日统计导出。真实日报只有日期×Skill汇总，不生成逐次调用日志或跨日/跨Skill去重人数；原始日报和Skill分析保留缺失归属信息，成功率与好评率从原始计数计算。样例演示单独切换，提供调用级交互框架，不与日报混合。当前为文件快照，未接入邮件自动同步和实时统计权限；不含真实用户清单或输入输出正文。沿用现有外壳、共享样式和Agent，各环境发布状态以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-10-30',
    releaseKey: 'workbench-style-restore-20261030',
    title: '恢复既有样式，保留演示直达',
    changePoint: '撤销上一轮字号与文字颜色调整，恢复既有设计；保留 POC 默认入口直达功能。',
    detail: '字号、文字颜色和共享样式恢复到上一轮调整前。保留 POC 默认入口直接进入现有权限演示工作台，以及选择演示场景入口；正常登录、审批、角色和权限功能不变。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-10-29',
    releaseKey: 'workbench-scenario-guidance-20261029',
    title: '场景技能包角色与状态说明补全',
    changePoint: '编辑说明按内容状态、账号身份和实际可用操作展示，补齐已禁用等状态的不同角色提示。',
    detail: '区分首次草稿和驳回、已发布后的修订、待审核、已发布、已禁用、已暂停与待升级；说明创建者、提交人、参与编辑者、独立审核管理员及无编辑权限账号的操作边界。明确原创建者不变、参与修改者不能自审、禁用修订审核通过后仍保持禁用，说明与现有按钮共用权限判断。未调整业务权限或其他模块，发布情况分别以各环境实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-10-26',
    releaseKey: 'workbench-score-ai-notice-20261026',
    title: '打分模型与 AI 助手使用提示',
    changePoint: '领取优惠券支持商品编号或 FA＋商品分类，AI 助手增加首次使用提示及查看入口。',
    detail: '旧优惠券品类规则保留原记录并停用，按新条件重新配置后仍需手动启用；其他打分规则保持。首次打开或快捷调用 AI 助手时先展示使用提示，同意后继续原操作，取消不发送；同一页面内按账号记忆，刷新后重新提示。保留既有技能包应用、工作流确认、权限及审批流程，未调整其他模块。发布情况分别以各环境实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-10-26',
    releaseKey: 'workbench-permission-demo-pr29-20261026',
    title: '权限申请与独立演示更新',
    changePoint: '独立演示入口、申请进度和审批流程同步更新，保留正常管理员能力。',
    detail: 'PR #29 的演示身份与正常登录分开，浏览器演示记录独立保存；申请进度聚焦状态、单号、审批节点和刷新，审批人仍保留完整办理能力。启用表单自动带出人员类型，首次申请在完整审批和最终执行后可重新登录演示。保留无账号审批、组织必填、重复提交和跨页同步检查。演示只影响当前站点当前浏览器的模拟数据，不发送真实邮件、不修改后台账号权限；本机数据库实验不发布到线上。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-10-26',
    releaseKey: 'workbench-mail-approval-demo-20261026',
    title: '审批邮件演示开放',
    changePoint: 'NEW 与正式链接均可使用审批邮件演示和无账号领导审批，保留正常登录。',
    detail: '将审批演示与预览登录分开控制，NEW 与正式链接开放浏览器本地审批演示；保留有账号入口、无账号入口、组织必填、链接校验、跨页同步和重复提交保护。演示不发送真实邮件、不修改后端账号权限；正常登录保持，各环境的演示数据按原方式独立保存。既有积分页面及其他功能保留，发布情况分别以各环境记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-10-21',
    releaseKey: 'workbench-mail-approval-pr28-20261021',
    title: '领导邮件审批与详情简化',
    changePoint: '补充无账号领导独立审批演示，统一两个入口的审批内容和状态同步。',
    detail: '模拟邮件提供有账号审批和无账号审批两个入口；独立页保留申请信息、完整审批链路、组织确认及处理记录，隐藏完整权限范围及权限修改入口。两个入口移除重复进度面板，保留同意、驳回和最终执行；补充链接校验、跨页同步及重复提交保护。无账号入口仅限同站点同一浏览器的本地 POC，server 模式不开放，不代表真实邮件或后端匿名审批。发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-10-15',
    releaseKey: 'workbench-scenario-retry-20261015',
    title: '场景技能包试运行重试修复',
    changePoint: '补齐运营查询演示技能的固定版本样例，支持重新试运行及返回编排后继续。',
    detail: '修复“运营查询（更新失败示例）”可选入编排但缺少试运行样例的问题；与职场认证状态查询连接后，重试可生成完整模拟反馈并传给下游。保留整体工作流确认、权限、依赖和版本校验，以及草稿与待审核应用等已有功能；不调用真实业务接口，不改变当前界面样式。发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-10-15',
    releaseKey: 'workbench-ui1015-style-20261015',
    title: '1015 界面样式兼容更新',
    changePoint: '调整评价管理筛选与表格、账号启用表单布局，以及 AI 助手的过程卡和回答排版。',
    detail: '从 1015 UI 附件提取样式并合入当前版本；保留整体工作流执行要求、草稿及待审核技能包应用、个人赞踩反馈和现有审批流程。AI 助手调整仅作用于展示，原消息、任务操作和反馈记录保持。未改变菜单、权限、数据处理或业务接口；发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-10-14',
    releaseKey: 'workbench-skillhub-status-20261014',
    title: 'Skill Hub 状态与技能包应用测试',
    changePoint: '场景技能包取消降级运行，并增加应用入口；草稿、待审核可在 AI 助手中测试当前版本。',
    detail: '草稿、待审核直接应用当前内容，不替换成旧发布版本，也不改变审核或发布状态；已发布、待升级仍使用已审核固定版本。依赖不可用时统一暂停，实际节点缺少权限、确认或审批时整次阻断，正常条件分支仍可不执行。已禁用、已暂停时不可应用。整体确认仅对本次会话与范围有效，内容、版本、状态或权限变化后需重新发起。结果标明当前版本、已审核或本地精确版本样例，不调用真实业务接口。保留既有内容与审核记录；发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-10-14',
    releaseKey: 'workbench-workflow-execution-20261014',
    title: '场景技能包统一执行要求',
    changePoint: '执行要求移至第一步，对整个工作流生效；返回编排后进入下一步会重新试运行。',
    detail: '第二步移除逐节点确认配置，试运行统一模拟确认；修改场景或任务范围后需要重新确认。旧草稿保留原有确认要求，已审核版本继续独立保存。返回编排后的重试使用修正后的演示数据，配置、权限和依赖问题仍会阻断。试运行未调用真实业务接口；发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-10-10',
    releaseKey: 'workbench-review-management-20261010',
    title: '评价管理 POC 接入',
    changePoint: '新增评价管理一级菜单，包含评价总结、辅助生成两个二级菜单。',
    detail: '接入附件中的查询、分析、标注、处置及辅助生成演示，补齐列表日期筛选、分页和导出。演示数据仅在当前页面内存中使用，刷新后恢复初始状态；未接入真实评价、生成或处置服务。现有菜单、账号权限、积分管理及技能包功能保持。发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-10-10',
    releaseKey: 'workbench-skill-package-personal-feedback-20261010',
    title: '技能包个人赞踩反馈',
    changePoint: '技能包管理每张卡片增加赞、踩按钮，可切换选择或再次点击取消。',
    detail: '个人选择按当前账号保存在本机浏览器中，刷新及重新打开弹窗后恢复；不展示累计数量，不跨设备或站点同步。原有使用次数、启停、搜索与筛选保持；保存失败时提示重试并保留原选择。发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-10-10',
    releaseKey: 'workbench-skillhub-evaluate-label-20261010',
    title: 'Skill Hub 评估按钮命名统一',
    changePoint: 'Skill Hub 中原“测试”按钮统一显示为“评估”。',
    detail: '各状态下可用的评估入口统一命名，点击后继续打开原有 Skill 评估面板；操作权限、评分、应用入口和其他流程保持。发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-10-10',
    releaseKey: 'workbench-permission-review-pr27-20261010',
    title: '登录与账号申请流程优化',
    changePoint: '内部账号首次访问与停用后的申请入口更清晰；外部停用账号提示联系联想业务对接人，首次权限申请结果与账号启用进度展示统一。',
    detail: '账号启用进度支持查看审批状态、申请详情和处理记录；保留既有启用历史及重复申请修复，停用不清除原有权限。组织和用户表单按评审收敛字段，昨天的列表样式、场景技能包编排和页签内容保留。真实登录与后台审批接口沿用现有实现；发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-10-09',
    releaseKey: 'workbench-ui1009-compatible-20261009',
    title: '列表样式与场景编排体验优化',
    changePoint: '统一列表页签、指标卡和积分统计层次；场景包可在独立页签中创建，支持全屏编排、拖线和缩放，调整日志在窄屏下更易阅读。',
    detail: '基于最新主线兼容合入 1009 UI 调整。切换创建页签保留当前填写内容，取消、保存或提审后重置下一次创建；全屏退出恢复侧栏和助手布局，画布支持在目标卡片松开连线与按指针位置缩放。账号启用、首次访问、权限移除后的申请、审批历史和重复申请修复保持；场景包的权限、固定版本、试运行与独立审核规则保持。发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-10-08',
    releaseKey: 'workbench-scenario-package-edit-20261008',
    title: '场景技能包编辑与审核撤回',
    changePoint: '管理员可编辑已发布、已禁用技能包及其修订，创建者可维护本人内容，待审核可先撤回再编辑；页面补充编辑规则和不能编辑的原因。',
    detail: '列表、详情和编辑页统一按状态控制入口。管理员修订保留原创建者与已审核线上版本，保存草稿、试运行和重新提审记录实际操作人；本轮编辑者不能审核自己的修改。原创建者或本轮提交人可撤回待审核内容，撤回及重新提审不改变线上版本的启停状态。列表提供可展开的编辑规则，并直接显示当前记录不能编辑的原因；详情说明当前账号可执行的操作，权限行为不变。发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-09-21',
    releaseKey: 'workbench-skill-clarify-demo-20260921',
    title: 'Skill 需求澄清示例引导与执行动效',
    changePoint: '需求澄清展示分步处理、逐步回复与下一项补充提示，可停止并重试本轮。',
    detail: '普通创建澄清使用明确标注的本地示例回复，不调用模型或执行业务操作；过程按读取配置、梳理缺口、生成建议依次展示。发送防重复但允许继续输入，辅助提示不覆盖已输入内容，离开步骤或切换编辑对象会停止回填。遵循减少动态效果设置，能力更新扫描、草稿生成、评估及提审跳转保持原流程。发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-09-21',
    releaseKey: 'workbench-skill-submit-hub-20260921',
    title: 'Skill 提审后直达列表并置顶',
    changePoint: '创建 Skill 提交审核成功后直接进入 Skill Hub，刚提交的记录展示在首行。',
    detail: '列表显示本次提交的名称、中文名、描述、分类、创建人及待审批状态。已有草稿或驳回重提更新同一条记录并置顶；本次跳转清除旧筛选，避免隐藏新记录，并修复从刷新后的创建页首次进入列表时误清空提交的问题。原有评分、权限、能力更新及审核流程保持，失败提交留在原页。发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-09-17',
    releaseKey: 'workbench-skillhub-failure-demo-20260917',
    title: 'Skill Hub 更新失败示例补齐',
    changePoint: '新增独立的更新失败示例，可查看失败阶段、错误码、原因和重试建议，并演示重试恢复与忽略更新。',
    detail: '在 Skill Hub 搜索“更新失败示例”即可体验。重试复用当前任务并使用明确标注的本地演示结果生成更新草稿，线上版本保持不变；忽略后恢复普通流程，刷新可重新体验失败。示例不调用真实模型或查询业务数据，原有 Skill 保持原处理方式。发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-11-06',
    releaseKey: 'workbench-activity-points-20260916',
    title: '企业购活动积分配置',
    changePoint: '活动结束后延迟天数不得小于15天，保存草稿与启用均校验。企业统计、查询、详情与导出统一展示税号。明细增加查询按钮，填写条件后点击查询或按回车生效，支持重置。统一标记待自动发放、已发放、发放失败和计算异常，企业及账号分别展示各状态明细笔数。补齐发票类型和用户企业组必填多选，保存后可回看；与商品条件共同筛选参与订单，统计仅累计符合条件的订单。',
    detail: '新增发票类型（电子票、增值税发票）与企业组多选，均至少选一项；与商品条件取交集后累计，资格不符的订单展示原因。新增、编辑、配置详情保持所选条件，旧演示记录保留。明细活动选择支持名称与编号检索，候选展示状态和编号；输入仅筛选候选，明确选中才切换统计，取消保留当前活动，无结果给出提示。配置、明细及编辑表单统一控件尺寸、边框和交互状态。促销中心 → 积分管理保留活动积分配置、活动积分明细两个独立入口及原积分规则，配置与明细不互设跳转按钮。参与及排除商品编码均支持输入、检测和去重；FA 与产品组模式可选填排除编码，按商品编码选择模式不使用排除配置。明细支持企业、账号和订单统计、下钻及全量筛选导出。活动期间金额标为预计；活动结束后由系统按计划自动发放，延期同步顺延日期，成功、失败和异常按实际记录展示。演示操作不产生真实积分。发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-09-15',
    releaseKey: 'workbench-organization-management-20260915',
    title: '组织详情与成员管理入口恢复',
    changePoint: '恢复组织详情、编辑和移除入口，以及成员添加、编辑、跨组织转移和移除操作。',
    detail: '点击组织节点可查看详情并维护组织信息；编辑时不再显示上级组织，新增组织仍可选择上级。成员管理沿用已有必填、重复账号和转移校验，保留根组织及含下级组织的删除限制。原有权限申请、审批链、业务负责人、场景技能包与 AI 授权交互保持。发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-09-15',
    releaseKey: 'workbench-agent-task-auth-20260915',
    title: 'AI 助手任务与批量授权',
    changePoint: '授权卡同时提供授权和批量授权：可只批准当前操作，也可一次批准本次 Skill 全部待执行操作。',
    detail: '底部保留拒绝、授权、批量授权三个按钮，不提供逐项勾选或全选。授权仅执行当前待授权操作，其他操作继续等待；批量授权覆盖本次 Skill 已列明的全部待执行操作，拒绝停止剩余操作。状态在原卡更新，步骤详情默认收起，执行期间暂不可再次确认。授权仍绑定当前会话、Skill 执行和请求版本，新增或变化的步骤不能沿用旧批准；原有权限和审批要求保持。修正较早请求误处理最新请求的问题，切换会话、过期及历史恢复后不能使用旧确认。当前工作台提供标明示例数据的交互预览，不执行真实命令、导出文件或修改业务数据；真实执行需由对应服务端校验并接入。发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-09-15',
    releaseKey: 'workbench-ui0914-style-20260915',
    title: '工作台 0914 样式合并',
    changePoint: '统一页面标题、表单、卡片、弹窗及场景技能包展示布局。',
    detail: '以服务器最新源码为基础提取 0914 样式，并接入同版统一设计 Skill 与开发构建检查。统一标题、页签、表头、指标卡及状态样式；保留首次登录业务负责人、管理员创建编辑本人场景包、独立审批、权限及巡检能力。路由、数据、业务校验及共享运行文件保持当前版本。发布环境、人员、时间和版本分别以实际记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-09-14',
    releaseKey: 'scenario-admin-authoring-20260914',
    title: '场景技能包管理员创建能力恢复',
    changePoint: '恢复有创建权限的管理员创建场景技能包和编辑本人内容的入口，沿用场景定义、链路编排、试运行和提交审核四步。',
    detail: '创建与审核能力分别按已授予权限判断，审核权限不再抵消创建和跨菜单编排权限。管理员可保存、重新编辑和提交本人的场景技能包；待审核内容保持只读，本人创建或提交的内容仍由其他管理员审核。仅具备审核权限的账号不能创建，普通 PM 不因此获得审核能力；保留既有试运行、版本、引用权限、启停校验及 PM 示例归属。其他工作台功能保持原样。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-09-11 18:00',
    releaseKey: 'workbench-ui-0908-compatible-20260911',
    title: '工作台样式与场景技能包管理更新',
    changePoint: '统一内容区留白与列表间距，补齐场景包八种状态和对应操作。配置可保存草稿并稍后继续；补清版本升级步骤、依赖恢复与库存及天气节点的试运行样例。PM 创建和维护本人内容，admin 审核并管理启停；待审核时 PM 仅可查看详情。',
    detail: '参考 0908 样式规范，保留最新场景技能包、试运行、独立审批、创建人搜索、权限管理及 AI 巡检功能。移除场景包创建页重复留白，统一筛选与列表之间的间距；标题区在内容变窄时自然换行。空画布只保留拖入 Skill 的提示，去掉额外的试运行示例按钮和说明，正常节点试运行与返回修改流程保持不变。场景包按审核状态、提交人和管理权限展示操作；本人修改后重新试运行并提交其他管理员审核，旧的已审核版本在修订期间保持原运行状态，禁用不会因重新审批而自动解除。补齐草稿、待审核、已驳回、已发布、待升级、降级运行、已暂停、已禁用的初始示例；PM 可查看自己的提交与编辑状态，admin 可处理 PM 的待审核记录；管理员不再提供创建和编辑入口。角色按已有权限区分，审核权限优先为管理员，保留不得自审。仅修正可确认未经修改的旧角色示例，保留用户已修改记录与审核历史。降级和暂停分别对应已禁用的可选与核心 Skill 节点。未用旧示例覆盖现有业务代码，发布环境、人员、时间和版本分别以实际发布记录为准。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-09-09 13:15',
    releaseKey: 'skillhub-creator-search-20260909',
    title: 'Skill 管理按创建人搜索',
    changePoint: '筛选栏新增创建人搜索，可与名称、状态和分类组合查询。',
    detail: '按列表中的创建人账号模糊匹配，忽略大小写和首尾空格；切换统计卡片时同步清空创建人条件。筛选栏按内容宽度换行，展开 AI 助手时搜索操作保持可用。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-09-10',
    releaseKey: 'scenario-node-contract-20260909',
    title: '场景技能包编排与审核',
    changePoint: '试运行首轮展示成功与异常样例，返回编辑后第二轮使用完整样例，运行中和完成状态清晰可见。',
    detail: '场景技能包列表将详情、审批、驳回拆分为独立入口，详情只读查看，审批和驳回进入各自操作；驳回原因必填，只有有权限的其他管理员可处理待审核记录，保留试运行与依赖检查。普通添加并连线的节点直接参与成功与异常数据试运行：首个执行节点正常反馈，第二个执行节点未填写预期输出时返回不完整数据，展示缺失内容和具体修改建议。首次展示异常后，第二轮及后续试运行改用完整样例，不再要求补充特定字段才能结束演示错误；返回修改、返回编排、上一步或页签切换后均可正常重试。新建场景从首次正反样例重新开始。点击后显示正在运行，完成时明确提示可提交；异常反馈不会作为成功结果传给下游。空白编排仍可载入两个已连接的示例节点，同样按建议修改后重试。取消提交前主责任人的声明勾选，合格试运行后点击提交审核即可进入待审核，不再增加确认操作；提交时继续检查归属、权限、链路和最新试运行，审核由其他管理员完成。未自定义节点任务时，执行与提交快照沿用匹配固定版本的已发布 Skill 说明，编排输入仍保留浅灰提示；缺少可用说明时需填写任务。必需下游因缺少上游反馈提示先修复上游。错误原因和修改建议分开展示，返回编排定位节点并保留提示，修改后重跑通过才清除。旧版空任务成功报告需要重跑，不改历史记录。第三步仅展示运行结果，不重复显示节点任务、固定要求、判断条件、版本、预期输出或运行依据；实际输入只保留上游反馈，成功传递不重复展示相同内容。移除手工样例设置，新一轮仅使用可用的固定版本样例；旧手工样例报告保留但需重跑。需要模拟确认或测试条件分支时提供直接重试操作，不自动确认。提交与管理员审核仍保留完整记录。试运行删除重复标题说明、灰底提示块和测试任务输入框，顶部仅保留节点结果标题、紧凑模拟标识和运行操作。运行依据自动从已填场景和当前节点配置生成，随配置变化更新；已提交记录保持原始依据。场景包编排后进入以 Skill 节点为维度的试运行工作区：沿执行链路选择节点，核对本轮输入、执行状态、固定版本、样例来源、预期输出与本轮反馈；直接下游记录发送内容和接收内容，并区分传递成功、未传递与条件跳过。条件命中和模拟确认通过对应节点运行操作设置后重跑。传递成功不代表业务反馈正确，不提供微调或打分；历史记录保留查看，缺少当前传递证据时需要重跑。提交会校验上游来源、输入顺序、唯一性、完整性和传递内容一致性，不仅依赖节点状态。错误节点可返回编排页定位修改，节点旁保留上次提示；配置或测试输入变化后必须重新试运行，没有节点错误且结果仍对应当前配置时才可提交。重试阶段随请求和报告保存，权限、固定版本和执行确认等真实检查继续执行。下一步、步骤跳转和提交入口统一校验，试运行请求与记录随提交保留供管理员查看。当前预览使用明确标注的模拟样例，不调用真实业务接口，试运行不替代独立审核与运行权限校验。场景定义移除独立的触发方式和完成标准，场景描述写明适用的业务场景、用户需求、预期结果与使用边界，作为判断是否调用技能包的依据，并随提交、审核和发布完整保留。新增节点的任务与预期输出以浅灰输入提示展示，参考同版本已发布的 Skill 说明；用户填写后保存实际内容，清空后恢复提示。节点前后顺序通过画布端口拖拽连线设置，删除前序节点下拉框及断开按钮；选择连线后可删除并重新连接。固定版本与主责任人以普通文字展示，永久只读信息不再使用输入框。节点配置移除“本节点使用的输入”展示区及输入示例；试运行仍按连线传递输入并展示实际输入记录。节点任务、固定要求、预期输出及判断条件提供与当前 Skill 对应的常驻示例，固定版本保留说明，所属链路和执行确认提供选择说明。节点移除执行前审批选项，旧草稿再次编辑时同步取消该要求并重新试运行；提交后的独立管理员审核保持不变。分类库列表、编排画布和节点属性分别滚动，各区标题、搜索与画布工具以及页面底部操作保持可见；窄屏分行显示并保留区域内滚动。提交审核前与技能包详情都能核对各节点的完整配置；提交只进入待审核，创建人即使是管理员也不能自审。其他管理员审核通过后发布，驳回需填写理由，原创建人可修改重提。场景技能包管理内提供待审核筛选和审核操作，展示提交、审核和发布记录。执行准备检查会标明待提供输入、待上游执行和未激活的条件节点。保留拖拽编排、固定版本、选填执行确认和权限规则；准备检查不执行任务或生成实际结果。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-09-07 11:17',
    releaseKey: 'permission-design-0904-20260907',
    title: '权限管理设计更新',
    changePoint: '更新权限管理弹窗的按钮区、滚动反馈和菜单层级标识。',
    detail: '权限申请、角色管理、用户管理及相关配置弹窗统一底部操作布局；内容较短时不显示上浮阴影，内容溢出时保持操作可达，滚动到底后收起阴影。菜单管理明确显示目录和菜单层级。保留现有权限申请、审批、角色冲突校验及自定义表格授权能力。',
    deployTargets: [],
    status: '发布状态以环境记录为准'
  },
  {
    time: '2026-09-07 08:58',
    releaseKey: 'scenario-skill-package-compose-20260907',
    title: '场景技能包创建与链路编排',
    changePoint: '场景定义必填项预填可编辑示例，Skill 选择与链路设置合并为一个拖拽编排页面。',
    detail: '创建流程调整为四步。已有 Skill 按菜单分类展示，可搜索后拖入画布、自由移动节点，通过连线设置执行顺序；选中节点后设置核心链路、判断条件和确认审批要求。执行确认与审批均为选填，默认不勾选，可直接继续；执行权限仍按原规则校验。场景定义按统一规范使用居中单列表单，统一输入框、必填提示与右对齐操作区。场景定义与链路编排统一白底工作区，画布内保留浅灰点阵。执行要求的复选框与文字居中对齐，去除多余输入框阴影。支持断开连线、移除节点、缩放和整理布局，不再显示上移、下移按钮。链路连接完整后才可继续评估，固定依赖版本、权限校验及最终责任人确认保持原有规则。',
    deployTargets: ['new'],
    status: '已更新 new 预览'
  },
  {
    time: '2026-09-07 08:16',
    releaseKey: 'scenario-skill-package-quick-entry-20260907',
    title: '场景技能包外部创建入口',
    changePoint: '账号工作区新增“创建场景技能包”一级快捷入口，直接进入既有五步创建流程。',
    detail: '账号工作区将“创建 Skill”和“创建场景技能包”并列为创建入口；新入口复用 Skill Hub 静态页签并直达场景技能包创建态。保留 Skill Hub 内部创建入口、原四个账号入口、权限校验、固定版本、审批发布和运行规则，不新增菜单或独立页面。',
    deployTargets: ['new'],
    status: '已更新 new 预览'
  },
  {
    time: '2026-09-03 12:52',
    releaseKey: 'pageless-skill-context-20260903',
    title: 'Skill 创建支持无页面接口能力',
    changePoint: 'Skill 创建可选择“私人订制”，并匹配接口能力“私定 TOP 榜单”；不新增左侧菜单、页面或路由。',
    detail: '为只有接口、没有二级或三级页面支撑的场景补充能力上下文目录。用户在 Skill 创建中选择“私人订制”后，可主动勾选“私定 TOP 榜单”，上下文描述为“用户针对私定官方喷绘中TOP 甄选榜进行图片或顺序调整”；推荐项不会自动选中，现有页面能力、跨业务域选择、保存提审和右侧 Agent 行为保持不变。',
    deployTargets: ['new', 'formal'],
    status: '已合并正式'
  },
  {
    time: '2026-09-02 17:57',
    releaseKey: 'lead-dashboard-agreement-order-20260902',
    title: '线索看板与协议采购订单更新',
    changePoint: '线索看板调整激活指标、Leader 团队筛选和产品类型单选；协议采购订单补充主订单、订单号与采购单维度明文查看。',
    detail: '本次仅合入 0902 POC 中线索看板和协议采购订单两处差异；不采用压缩包中的旧路由、公共菜单、整站源码及构建产物，不修改线索池、线索池-政企、打分模型、协议采购单管理、商品视频管理、权限管理、Skill Hub、右侧 AI 助手或其他受保护运行文件。',
    deployTargets: ['new', 'formal'],
    status: '已合并正式'
  },
  {
    time: '2026-09-01 17:27',
    releaseKey: 'enterprise-customer-agreement-order-20260901',
    title: '企业客户管理与协议采购订单更新',
    changePoint: '更新企业客户管理筛选、导入结果和批量触达能力；升级协议采购订单的采购单、PO、SO 分层展示及明脱敏查看与导出。',
    detail: '本次仅合入 0901 POC 中企业客户管理和协议订单相关差异，并将菜单、页签、页面标题及导出文件统一命名为“协议采购订单”。保留现有线索池-政企、协议采购单管理、商品视频管理、Skill Hub、权限管理、右侧 AI 助手、公共路由及其他运行文件，不采用压缩包中的整站源码和公共构建产物。',
    deployTargets: ['new', 'formal'],
    status: '已合并正式'
  },
  {
    time: '2026-08-28 17:23',
    releaseKey: 'skill-create-tooltip-name-20260828',
    title: 'Skill 创建能力提示补充名称',
    changePoint: 'Skill 创建页左侧能力卡片的悬停与键盘聚焦提示新增能力名称，并保留原能力描述。',
    detail: '提示调整为名称和描述两行展示；不修改能力卡片布局、搜索筛选、选择移除、Skill 创建步骤、状态流转、权限、右侧 AI 助手或受保护 admin-runtime。',
    deployTargets: ['new', 'formal'],
    status: '已合并正式'
  },
  {
    time: '2026-08-28 16:44',
    releaseKey: 'skillhub-creator-column-20260828',
    title: 'Skill Hub 创建人字段',
    changePoint: 'Skill Hub 列表在“绑定平台”后新增“创建人”列，显示现有 Skill 负责人账号。',
    detail: '本次仅增加列表字段展示、空值兜底和相应表格宽度；不新增独立数据字段，不修改 Skill 生命周期状态、能力更新状态、操作按钮、筛选、权限、详情弹层、右侧 AI 助手或受保护 admin-runtime。',
    deployTargets: ['new', 'formal'],
    status: '已合并正式'
  },
  {
    time: '2026-08-26 15:47',
    releaseKey: 'marketing-product-video-20260826',
    title: '商品视频管理菜单与页面接入',
    changePoint: '在营销中心的广告管理业务范围新增“商品视频管理”入口，并接入独立的商品视频配置 POC 页面与 Mock 数据服务。',
    detail: '本次仅新增广告管理菜单组、商品视频管理菜单项、对应路由、页面和独立 Mock 服务；保留企业客户管理、订单管理、权限管理、Skill Hub、右侧 AI 助手、公共登录流程及现有菜单路由，不采用压缩包中的其他源码、公共样式或构建产物。',
    deployTargets: ['new', 'formal'],
    status: '已合并正式'
  },
  {
    time: '2026-08-26 14:31',
    releaseKey: 'permission-ui-0825-20260826',
    title: '权限管理 0825 样式与演示链路更新',
    changePoint: '按 0825 UI 包更新权限模块栏、菜单与数据源树形层级、审批链路展示和内容槽响应式布局。',
    detail: '更新范围限定在权限管理页面：左侧模块栏增加分组、搜索、当前项与待审批数量提示，并补充当前演示链路；菜单权限和数据源权限的树形目录强化层级与选中反馈；审批详情补充完整流转链路；桌面保持 220–300px 左栏与弹性工作区。未采用压缩包中的其他页面、路由、全局样式或编译产物，不修改 Skill Hub、右侧 AI 助手和受保护运行文件。',
    deployTargets: ['new'],
    status: '已更新 new 预览'
  },
  {
    time: '2026-08-26 12:24',
    releaseKey: 'portal-release-ledger-20260826',
    title: '调整日志双环境发布记录',
    changePoint: '每条改动分别展示 new 预览和正式环境的发布人、发布时间与版本；新增服务器发布台账，后续发布自动记录实际账号。',
    detail: '调整日志不再用单个发布人概括两个环境。每条改动固定显示 new 预览和正式环境两行，未发布环境明确标记“未发布”；两个环境可以由不同服务器账号在不同时间发布。历史数据只按可核实的服务器记录补录，无法确认的账号继续显示“历史未记录”。发布脚本采用文件锁和原子写入，同一份台账同步供两个链接读取，不修改现有自动合并脚本、权限管理、右侧 AI 助手或受保护运行文件。',
    deployTargets: ['new', 'formal'],
    status: '已合并正式'
  },
  {
    time: '2026-08-26 10:40',
    releaseKey: 'portal-log-fields-20260826',
    publisher: 'zhangrui（部署账号）',
    title: '调整日志主信息精简',
    changePoint: '移除日志主信息区的“改动人”，统一保留发布人、更新时间、改动点、部署范围和状态。',
    detail: '根据日志责任口径精简卡片字段，不再在每条记录左侧重复展示改动人；发布人继续表示实际执行 new 或正式环境部署的账号，历史代码作者和来源信息仅在已有追溯记录中保留。',
    deployTargets: ['new'],
    status: '已更新 new 预览'
  },
  {
    time: '2026-08-26 09:52',
    releaseKey: 'portal-log-traceability-20260826',
    operator: 'Codex（协作代理）',
    publisher: 'zhangrui（部署账号）',
    title: '调整日志逐项记录与发布人补全',
    changePoint: '一项改动独立记录；日志新增“发布人”；“主要功能点”改为更明确的“改动点”；无法追溯的历史发布人显示“历史未记录”。',
    detail: '修正调整日志把连续修改合并为一条而导致记录缺失的问题。每次功能、样式或交互修改均保留独立记录，并分别展示改动人、发布人、更新时间、具体改动点、部署范围和状态；发布账号只作为发布人展示，不再与代码改动人混用。',
    deployTargets: ['new'],
    status: '已更新 new 预览'
  },
  {
    time: '2026-08-26 09:34',
    releaseKey: 'portal-sidebar-default-expanded-20260826',
    operator: 'Codex（协作代理）',
    publisher: 'zhangrui（部署账号）',
    title: '左侧菜单默认展开',
    changePoint: '移除首次进入工作台时按窗口宽度自动收起菜单；保留用户手动收起记忆及后续响应式处理。',
    detail: '首次进入工作台时左侧菜单固定默认展开，不再因当前窗口宽度自动收起；用户手动展开或收起后的记忆、后续窗口缩放、右侧 AI 助手和业务页面逻辑保持不变。',
    deployTargets: ['new', 'formal'],
    releases: {
      new: { publisher: 'zhangrui', releasedAt: '2026-08-26 09:34:53', version: '19ab56da' },
      formal: { publisher: 'zhangrui', releasedAt: '2026-08-26 09:40:59', version: 'c57013a7' }
    },
    status: '已合并正式'
  },
  {
    time: '2026-08-26 09:12',
    releaseKey: 'portal-home-layout-20260826',
    operator: 'Codex（协作代理）',
    publisher: 'zhangrui（部署账号）',
    title: '首页内容比例校正',
    changePoint: '校正“常用入口”和“基础操作流程”的列宽比例；内容区变窄时切换单列，避免错位和横向溢出。',
    detail: '校正首页“常用入口”和“基础操作流程”两块内容的列宽比例，在左侧菜单展开或收起、右侧 AI 助手收起、默认宽度或放大时保持两块内容等宽；当中间内容区变窄时自动切换为单列，避免卡片错位、内容挤压和页面横向溢出。',
    deployTargets: ['new', 'formal'],
    releases: {
      new: { publisher: 'zhangrui', releasedAt: '2026-08-26 09:00:50', version: 'd9ec8e2a' },
      formal: { publisher: 'zhangrui', releasedAt: '2026-08-26 09:40:59', version: 'c57013a7' }
    },
    status: '已合并正式'
  },
  {
    time: '2026-08-25 10:08',
    operator: 'Codex（协作代理）',
    title: '0825 页面标题样式统一',
    scope: 'Skill Hub / Skill 创建 / 权限管理 / 权限清理邮件预览',
    detail: '按 0825 页面标题视觉规范新增共享标题组件，统一四个页面的 18px 标记、19px 主标题、12px 说明文字、标题与操作区对齐及首个业务区块间距；保留现有按钮文案、点击行为、Skill 状态流转、权限操作、Mock 数据、路由、导航和右侧 AI 助手逻辑，不引入压缩包中的线索池、订单页面重构或其他功能变化。',
    status: '已合并正式'
  },
  {
    time: '2026-08-22 09:25',
    operator: 'Codex（协作代理）',
    title: 'Skill Hub 能力上下文受控更新状态机',
    scope: 'Skill Hub / 六类生命周期 / 能力更新流程',
    detail: '依据 2026-08-21 能力上下文受控更新方案，将线上状态、工作流状态和能力更新状态拆分管理；初始 Mock 在草稿、待审批、已审批待发布、已发布和已禁用五类生命周期中提供“有更新”示例，同时为草稿、待审批、已审批待发布、已发布、已禁用和已驳回提供不叠加能力更新的纯状态样本；纯草稿操作固定为“详情、编辑”，草稿叠加能力上下文更新后不再显示“编辑”，改为“查看变化、更新、忽略更新、详情”，其他草稿更新阶段同样只继承“详情”基础操作；所有生命周期的普通“查看”操作统一命名为“详情”，操作码和详情弹窗行为不变；已驳回只保留主状态，不叠加能力更新状态和操作。列表状态区最多显示一个主状态和一个更新提示，操作列统一读取状态机操作码；“更新中”作为草稿、待审批、已审批待发布、已发布、已禁用和已驳回等当前生命周期的叠加状态展示，不再替换主状态；只有草稿、已驳回等仍可编辑阶段显示“继续更新”。更新中再次发现变化时显示“更新中（有新变化）”，并增加“更新、忽略更新”。所有显示“查看变化”的待决策更新都同时显示“更新、忽略更新”，不因负责人或生命周期隐藏；已发布 Skill 不管是否有更新、处于准备中、更新中或更新失败，都固定保留管理员“禁用”操作；已发布且有更新时同时保留“测试、应用”，其中测试打开评估验证，应用在右侧 Agent 运行 Skill；待决策更新不再叠加编辑、审批、发布或其他启停操作。更新版本提交审核后立即进入普通待审批操作矩阵，仅叠加“查看变化”用于追溯，不再显示“继续更新”；审批通过进入已审批待发布后同样不返回编辑，只有审批驳回后恢复“继续更新”。已审批待发布的基础状态和更新状态统一保留“详情、测试、应用”，发布管理员额外显示“发布”。评估是否通过只按综合评分与 0.80 门槛判断，负责人权限仅控制保存、提审等写入入口，不再改变评估通过结论；管理员在已发布和已禁用的稳定单状态中保留编辑、测试、应用及启停治理入口，待决策更新期间仍冻结这些入口，但可完成已经进入更新编辑中的受控更新草稿。更新草稿扫描完成且综合评分达到 0.80 后可进入提交审核；低分、仍有待决策变化、扫描生成中或扫描失败时继续阻断提审。补齐正在准备、更新失败、同任务重试、更新中继续编辑、撤回审核、审批驳回、发布以及更新中再次发现变化的处理；待审批选择更新会回到同一编辑版本草稿并重新扫描，连续变化按检测顺序排队，当前扫描失败时必须先在编辑页复用同一任务重试，不会被下一条变化覆盖。高风险忽略必须填写原因，普通增强变化原因选填，忽略仅关闭当前变化记录；忽略完成后，草稿、待审批、已审批待发布、已发布、已禁用和已驳回六类状态均严格恢复各自无更新时的基础操作矩阵。更新版本发布时保留原禁用状态；浏览器真正刷新 Skill Hub 时显式重建初始 Mock 并清理旧编辑会话，两个“已发布＋有更新”样本都会恢复初始状态，普通页面内返回仍保留刚完成的流程结果；公共导航、右侧 Agent、其他业务页面和受保护运行文件保持不变。',
    status: '已合并正式'
  },
  {
    time: '2026-08-21 10:13',
    operator: 'Codex（协作代理）',
    title: 'Skill 能力更新草稿状态收敛',
    scope: 'Skill Hub / 能力更新草稿',
    detail: '保存能力更新草稿并返回 Skill Hub 后，状态栏只保留“更新编辑中”，不再同时叠加“草稿”和“编辑版草稿”；普通 Skill 草稿、能力更新审批与驳回、线上版本和其他操作保持不变。Skill Hub 演示数据改为单次页面会话内生效，完整走完流程后刷新页面会恢复初始 Mock 状态，便于重复演示。',
    status: '已更新 new 预览'
  },
  {
    time: '2026-08-14 17:12',
    operator: 'Codex（协作代理）',
    title: 'Skill 能力变更同步人工闭环',
    scope: 'Skill Hub / 能力变化详情 / Skill 创建 / 评估审核',
    detail: '基于能力变更同步 PRD，使用独立 service 变化记录；Skill Hub 默认展示产品知识问答、券包权益推荐两条能力更新，可直接进入变化详情和后续更新流程，不再提供用户侧模拟入口。汇总区同时保留“能力更新”和“已禁用”卡片，两张卡片可分别筛选对应 Skill；已发布 Skill 的“禁用”和已禁用 Skill 的“启用”操作保持不变。更新页顶部仅保留已选能力受影响、可选新增、目标能力版本和检测时间概览；需求澄清区统一展示“已选择”和“本次变化”两层信息，其中变化区区分“已选能力受影响”与“可选新增”。新增能力默认不勾选，只有点击“加入上下文”后才计入已选，并同步显示“本次新增”和“已加入”。旧线上版本在新版本发布前持续可用；提审门槛统一为综合评分 0.80，0.782 阻断，AI 微调到 0.859 后开放提交。Skill Hub 的能力更新操作首次显示“更新”，只有形成并保存有效编辑草稿或提交更新版本后才显示“继续更新”；仅打开更新页后直接返回仍显示“更新”，列表和变化详情弹窗共用同一判断。能力变化摘要从页面标题下方的整条横幅下移到需求澄清“能力上下文”模块标题区，以紧凑可换行信息行保留受影响数、可选新增数、目标版本和检测时间；页面标题后直接进入 Skill Workspace，左侧能力卡定位能力上下文的行为保持不变。未接入真实扫描、邮件和权限服务，公共导航、右侧 Agent 与其他业务页面保持不变。',
    status: '已合并正式'
  },
  {
    time: '2026-08-14 10:11',
    operator: 'Codex（协作代理）',
    title: 'AI 助手逐条消息时间戳',
    scope: '右侧 AI 助手 / 当前会话 / 历史会话',
    detail: '为欢迎语、用户消息和 AI 回复统一增加年月日时分秒时间戳；时间戳紧贴所属消息气泡下方，用户消息按气泡右边缘对齐，AI 消息按气泡左边缘对齐并保持单行显示。结构化授权、报告和操作卡跟随所属消息共用一个时间，保留原有消息、历史会话、报告和输入流程。',
    status: '已更新 new 预览'
  },
  {
    time: '2026-08-13 14:34',
    operator: 'Codex（协作代理）',
    title: '0812 工作台样式规范更新',
    scope: '设计基线 / Skill 创建 / 订单管理 / 协议采购单管理',
    detail: '接入 portal-workbench-ui-0812 统一设计规范，保留 0803 历史版本；Skill 创建页统一页面标题与首个业务区块的间距；协议采购单列表和详情统一设计变量、KPI、筛选区、表格、状态标签及内容槽响应式样式。查询、筛选、分页、导出、详情路由、右侧 Agent、权限管理和其他业务页面保持原有逻辑。',
    status: '已合并正式'
  },
  {
    time: '2026-07-24 13:44',
    operator: 'Codex（协作代理）',
    title: 'Skill 创建评估页微调收口调整',
    scope: 'Skill 创建 / 评估验证 / 右侧 AI 助手 / 提交审核',
    detail: '调整 Skill 创建评估验证阶段的微调链路：左侧评估页不再承载 Skill 应用验证、运行 Skill 输入框、最终验收动作，以及“查看草稿 / 查看澄清 / 查看用例”等卡片内跳转按钮，避免在主流程内重复完成测试调用或跳转到非当前步骤；AI 微调入口仅负责唤起右侧 AI 助手，由右侧会话引导用户确认本轮微调结束，再将评分和提交审核状态同步回左侧。提交审核仍保留在 Skill 创建主流程内，后续真实 Skill 调用、结果卡片和展开报告继续通过右侧 AI 助手完成。',
    status: '已合并正式'
  },
  {
    time: '2026-07-22 17:02',
    operator: 'Codex（协作代理）',
    title: '企业客户管理业务链路更新',
    scope: '企业客户管理 / 线索看板 / 线索池 / 打分模型',
    detail: '基于 _0708_analysis 交付内容，在 GitLab 最新 Vue 源码上合并企业客户管理运行层：线索看板增加查询与重置生效快照并移除旧产品组隐藏筛选；线索池完善触达名称与描述、PC/SD/SS/SI 四类 SQL 金额及超限确认、列表/导出/详情同步；转商机按产品组名称联动编码和型号并校验保存；打分模型补齐日期至今、留资链接、商品目标和搜索关键词规则。同步修复账号工作区弹层被企业页筛选区压住的图层问题，弹层改为挂载到页面根层，在线索看板、线索池和其他业务页均能正确遮罩页面内容。保留当前权限管理、Agent、Skill 和壳层功能，专项回归覆盖三项菜单完整链路。',
    status: '已合并正式'
  },
  {
    time: '2026-07-21 12:59',
    operator: 'zhangrui（部署账号）',
    title: '调整日志字段与追溯口径完善',
    scope: '调整日志 / 改动人 / 更新时间 / 状态 / 主要功能点',
    detail: '调整日志卡片补齐改动人、更新时间、状态和主要改动功能点四类信息，并保留完整功能说明。服务器直连可确认本次 admin-vue 文件由 zhangrui 账号部署，故按“部署账号”记录；历史记录无法仅凭当前文件属主准确还原实际改动人，统一显示“历史未记录”，避免错误归属。',
    status: '已合并正式'
  },
  {
    time: '2026-07-21 12:16',
    operator: 'zhangrui（部署账号）',
    title: '0716 Vue 样式与设计规范应用',
    scope: 'Skill 创建 / 右侧 Agent / 权限管理 / 顶部页签 / 设计基线',
    detail: '对照 lexiang-new-0716 交付包，仅同步与当前 new Vue 源码一一匹配的区域：能力上下文改为可搜索、按业务域筛选、只看已选和卡片式能力目录；右侧 Agent 更新附件预览、处理过程与 Todo 展开收起样式；权限管理收紧模块间距和表单密度；顶部静态页签恢复点击后回到对应业务页内容。随后应用 portal-workbench-ui-0716 设计规范 Skill，完成版本、内容指纹、全局样式栈和封板组件保护校验，并按规范复核顶部、侧栏、Agent、输入区、页签、权限管理及 1280px 响应式布局。保留现有自然语言时间解析、认证查询结论与展开报告、GMV 717 万元参考口径、Skill 草稿及审核闭环等 new 后续新增功能，不覆盖未匹配业务数据和运行脚本。',
    status: '已合并正式'
  },
  {
    time: '2026-07-15 16:53',
    title: '职场认证菜单、查询时间与 Skill 数据闭环统一',
    scope: '在职员工管理 / 认证审核管理 / Skill 测试 / 右侧 Agent / 展开报告',
    detail: '按最新认证完成数据更新在职员工管理首屏：在职员工 2,144 人、已认证 1,718 人、认证率 80.13%、已驳回 307 人、本月新增 169 人，并同步企业邮箱、劳动合同、个人所得税和其他材料四类认证方式分布。认证审核管理同步认证失败 307、认证成功 1,718、待审核 119、已失效 0，按业务截图更新失败列表首屏的申请编号、用户、认证方式、企业和认证时间，并支持按申请编号、企业、岗位、认证方式和来源筛选；修改状态详情沿用当前行的真实演示数据。职场认证 Skill 查询新增自然语言时间解析，支持上周、本周、近 N 天、近 N 周、上月、本月及明确起止日期；查询结论、数据明细和展开报告统一使用解析后的时间区间与同一组认证、转化、GMV、画像和商品数据。近两周参考区间继续采用 GMV 717 万元口径，其他时间范围根据区间生成对应数据，不再返回通用口径说明或只等待用户确认。',
    status: '已合并正式'
  },
  {
    time: '2026-07-14 09:24',
    title: '0713 Skill 应用结果与数据报告样式覆盖',
    scope: 'Skill 创建 / 应用结果卡 / 展开报告 / 数据可视化',
    detail: '对照 lexiang-new-0713 交付包，仅覆盖与当前 new 功能结构一致的样式：应用结果卡调整为图标与内容双栏，核心结果和“展开报告”收敛到卡片底部并支持容器响应式；完整报告统一 KPI 浅色渐变、白色细边框卡片、图表色板、图例、网格线、柱形渐变与入场动效。已应用 portal-workbench-ui-0713 设计规范校正，补齐中间数据模块轻量 hover 和关键数字等宽排版；保留现有 Skill 草稿闭环、需求澄清、Agent 自然语言调用、权限及业务页面功能，不覆盖交付包中的旧功能脚本与未匹配附件交互。',
    status: '已合并正式'
  },
  {
    time: '2026-07-13 17:39',
    title: '认证分析 Skill 自然语言调用闭环',
    scope: 'Skill Hub / 右侧 Agent / presentation-employee-cert / 展开报告',
    detail: '新增“近两周认证数据、人群画像、购买转化、GMV 和爆款商品”自然语言意图识别，手动输入后直接调用 presentation-employee-cert，展示任务解析、Skill 调用、口径计算和结果生成过程。Agent 回答与展开报告共用同一组认证、画像、转化、GMV 和 Top10 商品数据，去除模拟、测试、验证等边界说明；Skill Hub 中该 Skill 的“测试”动作同步复用该自然语言查询。同时收紧页面导航判定，复合分析请求中的“查看 GMV”不再触发菜单跳转，仅明确打开、进入、跳转或切换页面以及短查看指令才执行导航，保证结果回到当前 Agent 会话。',
    status: '已合并正式'
  },
  {
    time: '2026-07-13 12:41',
    title: 'Skill 草稿保存与返回编辑闭环',
    scope: 'Skill 创建 / 保存草稿 / Skill Hub / 需求澄清',
    detail: '打通 Skill 创建与 Skill Hub 的草稿状态：草稿生成、评估验证和提交审核阶段保存草稿时，将基础配置、能力上下文、澄清对话、澄清结论和调优状态统一写入 Skill Hub；列表支持草稿状态筛选与查看，草稿操作改为“返回编辑”，点击后恢复已保存内容并直接进入需求澄清阶段继续完善。后续提交审核复用同一条 Skill 记录，由草稿更新为待审批，避免产生重复数据。',
    status: '已合并正式'
  },
  {
    time: '2026-07-12 18:46',
    title: 'Skill 数据报告、分析闭环与默认报告收敛',
    scope: 'Skill 创建 / 应用验证 / 展开报告 / 数据可视化 / Agent 默认报告',
    detail: '持续完善 Skill Hub 和 Skill 创建验证共用的数据报告链路：移除来源页面、生成方式、主题标签、报告目录和长文段落框架，改为 KPI、口径校验、分析摘要、每日认证趋势、用户画像、认证转化、Top10 商品和整齐明细表构成的数据看板。在工作日/周末差异、购买转化、岗位集中度和时段覆盖率四类突出数据下新增“数据发现 → 分析判断 → 建议动作 → 复验指标”页面内闭环，建议动作继续遵守 Skill 只读边界，不标记为已执行。去除首张 KPI 黑色强调卡，所有 KPI、状态、图表、峰值与低点统一回归 new 站点的白底、品牌蓝、状态绿、辅助紫和提示橙规范。右侧 Agent 初始化时不再一次展示全部演示报告，默认仅保留质量分析和运营总览两张报告卡；用户后续查询、测试 Skill 或生成报告产生的结果仍按任务正常追加。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 20:26',
    title: 'AI 回复 Markdown 表格结构化呈现',
    scope: '右侧 Agent / 回答正文 / 表格渲染',
    detail: '补齐 AI 助手消息渲染器对标准 Markdown 表格的识别：表头、分隔行和数据行会转换为真正的 HTML 表格，不再原样展示竖线与横线；统一使用工作台表格边框、表头底色、数字对齐、隔行和悬停状态，窄屏内容可在表格容器内横向滚动，同时保留普通段落、列表、行内代码和代码块的原有呈现。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 19:40',
    title: 'AI 助手处理状态与回答布局修复',
    scope: '右侧 Agent / 处理状态 / 回答正文',
    detail: '修复带处理过程状态的 AI 回答被全局横向消息布局拆成左右两列的问题：此类消息改为状态区在上、回答正文在下的单列结构，状态摘要和正文均使用 Agent 内容区完整宽度，避免正文被挤到右侧、长内容裁切或与底部输入区错位；普通问答、用户气泡和输入区交互保持不变。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 17:41',
    title: 'Skill 应用验证结果与认证转化报告',
    scope: 'Skill 创建 / 评估验证 / 结果卡片 / 展开报告',
    detail: '在评估验证末尾新增 Skill 应用验证：用户输入自然语言提示词后，按原话解析明确日期、最近 N 天或周、上周、本周和本月等时间口径；缺少时间、起止倒置或超过 92 天时按 Skill 契约阻断。运行后先返回结构化结果卡，点击“展开报告”复用工作台动态页签，原生展示数据真实性、认证与购买 KPI、每日趋势、7 个认证时段、认证方式、行业 Top10、岗位 9 大类、Top10 商品和行动建议，并保留数据来源、LenovoID 去重和 B4 排除声明。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 17:05',
    title: 'Skill 需求澄清改为输入驱动',
    scope: 'Skill 创建 / 需求澄清 / 右侧澄清结论',
    detail: 'Skill MD 仅作为后台框架和模型上下文，不再在澄清对话中直接摊开展示完整内容；需求澄清改为等待用户自然语言输入后，按命名、归属、场景、触发、输入、输出、边界、依赖和验收用例九要素识别已确认与待补充项。每轮输入后，左侧只展示本轮仍需闭合的问题，右侧澄清结论同步更新当前轮次、已确认、待确认和下一步，避免把用户已给信息反复追问。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 16:20',
    title: '职场认证与转化 Skill 草稿预填',
    scope: 'Skill 创建 / 基础配置 / 需求澄清 / 草稿结构',
    detail: '根据 portal-workbench-skill-draft-presentation-employee-cert-20260709.md 拆解完整 Skill 内容：基础配置预填 presentation-employee-cert 与“职场认证与转化综合简报”，左侧能力上下文默认关联职场员工概览、职场员工审核和 GMV 分析；需求澄清阶段按九要素展示初始引导和右侧澄清结论，已确认命名、归属、场景、触发、输入、输出、边界、依赖、用例，仅保留 SMB 授权粒度、明文导出权限点、岗位归类维护方等待确认事项；草稿生成区同步切换为 SKILL.md、modules/data-query.md、modules/analysis.md、modules/briefing.md、tests/acceptance.md 的模块化结构。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 15:09',
    title: 'AI 会话模型供应商文案脱敏',
    scope: '需求澄清 / 右侧 Agent / 处理过程状态流',
    detail: '将需求澄清和右侧 AI 助手里面向用户展示的具体模型供应商名统一改为“大模型”，保留底层服务端会话调用能力不变；失败兜底、工具调用状态和 POC 日志中的供应商名同步脱敏，避免在产品界面暴露具体模型来源。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 14:18',
    title: 'Skill 需求澄清第三组改为验收用例',
    scope: 'Skill 创建 / 需求澄清 / 九要素用例收敛',
    detail: '按 Skill 撰写九要素修正需求澄清第三组：不再以“测试评估与审批要求”组织问题，也不再把直线经理、业务审批人或系统审批作为九要素缺口追问；第三组统一改为“验收用例”，只围绕正常用例、异常输入、边界场景和兜底期望补齐，平台默认 AI 评估标准仍由系统自动纳入。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 09:58',
    title: '0709 设计规范 skill 应用',
    scope: '设计基线 / Tooltip / 面板收起图标 / 封板壳层守卫',
    detail: '应用 portal-workbench-ui-0709 设计规范 skill：设计基线锁从 0708 更新为 0709 实际内容指纹，guard 搜索路径补齐 0709 skill 目录；左侧侧栏和右侧 AI 助手收起按钮按 0709 图标规范使用 24x24 面板轮廓，内部竖向分隔线改为窄圆角矩形而非短线，保留按钮尺寸、位置、壳层宽度、Agent 宽度和业务页行为不变；全局 tooltip 继续使用 body 层 fixed 定位和视口夹紧规则。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 09:24',
    title: '0709 Vue 样式包重合覆盖',
    scope: '工作台壳层 / 全局 Tooltip / 左侧与右侧收起按钮',
    detail: '对照 lexiang-new-0709.zip 与当前 new Vue 源码，仅合入明确重合且不回退新增功能的壳层样式：新增全局 data-tooltip 提示层，左侧侧栏收起按钮和右侧 AI 助手收起按钮切换为 0709 线性面板图标，并补齐收起态图标方向规则。跳过会回退 Skill 创建九要素澄清、Skill Hub 提交审核闭环、四行输入框滚动和当前右侧 Agent 状态流的旧版源码差异；0709 包中的多附件能力属于新增交互，不在本次样式覆盖范围内。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 10:20',
    title: 'Skill 需求澄清九要素识别防重复追问',
    scope: 'Skill 创建 / 需求澄清 / 自然语言九要素收敛',
    detail: '需求澄清智能体按 Skill 撰写九要素识别用户自然语言：命名、归属、场景、触发、输入、输出、边界、依赖、用例。用户已经提供的要素会进入右侧“已确认”，主反馈只展示未提供的缺口；模型返回后前端再做二次过滤，避免继续追问已确认的能力定义、上下文、输入输出、边界、依赖或用例。已选子菜单和基础配置也会参与归属、命名、输入输出等判断，减少机械重复确认。',
    status: '已合并正式'
  },
  {
    time: '2026-07-09 15:35',
    title: 'Skill 创建提交审核闭环接入 Skill Hub',
    scope: 'Skill 创建 / 提交审核 / Skill Hub 状态流',
    detail: '提交审核不再只停留在创建页状态提示：点击提交后会把当前 Skill 的英文名、中文名、所属菜单、描述、评分和已选上下文写入 Skill Hub，同名 Skill 重新提交会更新原记录为待审批，避免重复行。Skill Hub 改为读取统一状态仓库，管理员审批、驳回、发布、启用和禁用都会回写同一条记录；提交页增加“查看 Skill Hub”入口，形成提交、待审批、审批/驳回、发布/启停的完整 POC 闭环。',
    status: '已合并正式'
  },
  {
    time: '2026-07-09 15:15',
    title: '需求澄清默认评估维度收敛',
    scope: 'Skill 创建 / 需求澄清 / 测试评估反馈',
    detail: '将理解准确性、工具调用正确性、输出完整性、权限合规性等通用 AI 评估标准调整为平台默认能力，不再在澄清反馈中向用户确认；兜底问题和大模型返回内容都会过滤这类基础 AI 能力追问，只保留业务特有的典型问法、异常输入、边界场景和审批链路确认。',
    status: '已合并正式'
  },
  {
    time: '2026-07-09 14:45',
    title: '右侧 Agent 对话流 0708 交互优化',
    scope: '右侧 AI 助手 / 对话状态 / 授权卡 / TODO / 全场景演示',
    detail: '应用 0708_Agent 对话流样式交互优化：右侧 Agent 消息自己的过程状态改为气泡外上方展示，不再混入普通回答气泡；状态卡默认只展示进行中、待确认或最近状态，已完成能力历史默认收起并可展开审计；新增打字机输出模式，结构卡片在正文完成后柔和入场；TODO List 改为回答后的独立气泡；授权批准或拒绝后，结论回填到原授权请求卡片内，不再追加多余说明气泡；新增“全场景串联演示”口令，用于走查过程状态、授权请求、报告卡片和 TODO 完成态。',
    status: '已合并正式'
  },
  {
    time: '2026-07-09 14:05',
    title: '0708 设计规范 skill 应用',
    scope: '设计基线 / 封板样式守卫 / Vue 源码规范',
    detail: '应用 portal-workbench-ui-0708 设计规范 skill：设计基线锁从 0707 更新为 0708，guard 搜索范围补齐 0708 skill 目录，并按解压包实际内容指纹锁定校验；继续遵守 Vue 源码优先和封板组件保护规则，不引入运行时 design-skill 全局 CSS，不用静态模板覆盖 Vue 页面，也不回退 Skill 创建、需求澄清、右侧 Agent 和权限管理中已确认的新功能。',
    status: '已合并正式'
  },
  {
    time: '2026-07-09 13:35',
    title: '0708 Vue 样式包重合覆盖',
    scope: '右侧 Agent / 会话状态卡 / 样式包对比',
    detail: '对照 lexiang-new-0708.zip 与当前 new Vue 源码，仅覆盖明确重合且不影响新增功能的会话状态卡视觉动效：状态卡进入动画、hover 位移和背景/边框过渡。0708 包中的 Skill 创建页仍是旧版能力上下文与需求澄清结构，会回退当前已确认的菜单子项上下文、动态澄清、已确认项过滤和四行输入框滚动，因此未覆盖；右侧 Agent 消息列表包内包含新的结构性交互，未做整文件替换；stores、常量和文档差异不属于本次样式覆盖范围。',
    status: '已合并正式'
  },
  {
    time: '2026-07-08 14:45',
    title: 'Skill 创建能力上下文改为菜单子项',
    scope: 'Skill 创建 / 能力上下文 / 大模型澄清对话',
    detail: 'Skill 创建左侧能力上下文改为读取当前工作台菜单树，展示全部菜单下的全部子菜单；基础配置中的所属菜单只用于默认选中和快速加入，不再过滤上下文列表。推荐能力改为基于已选上下文展示相关子菜单，并把已选子菜单写入草稿 skill.yaml。需求澄清页不再预置用户气泡、处理过程、AI 首问和澄清结论，只保留上下文说明、输入区和快捷填入按钮；用户现场输入后再由服务端大模型返回反馈，页面只固定澄清反馈文档块样式，具体内容严格基于用户输入和已选子菜单上下文生成，不再使用固定 mock 示例。需求澄清智能体目标收敛为支持 Skill 创建，问题分组围绕能力定义、输入输出与调用边界、测试评估与审批要求展开；每次用户补充后都会结合历史输入更新本轮反馈和右侧澄清结论，已确认项只沉淀在右侧“已确认”中，主对话文档仅保留待确认缺口，不再把“已收到/已确认”的内容与待确认问题混排；新增“作为一个独立 Skill 创建/不拆分/做一个 Skill”等表达识别，避免继续反问已提供的能力定义；底部输入框改为最多四行展示，超过四行后支持框内滚动。',
    status: '已合并正式'
  },
  {
    time: '2026-07-08 09:30',
    title: '0707 Vue 样式规范覆盖',
    scope: '工作台壳层 / 右侧 Agent / Skill 创建 / 权限管理 / 首页入口',
    detail: '按 lexiang-new-0707.zip 覆盖当前 Vue 源码中匹配的样式与演示层：左侧品牌区改为 0707 规范，顶部操作区按包内 TopbarActions 执行；右侧 Agent 增加 TODO、授权确认和多步骤状态卡展示；Skill 创建、Skill Hub、权限管理、首页和在职员工入口统一调整为“联想门户工作台/职场员工审核”口径。随后应用 portal-workbench-ui-0707 设计规范 skill：guard 已对齐 0707 指纹，本期按规范隐藏主题切换入口，并在启动时强制浅色、清理历史深色偏好，避免旧本地状态泄露到当前封板版本。保留既有正式合并日志状态，只更新本次预览记录。',
    status: '已合并正式'
  },
  {
    time: '2026-07-07 08:33',
    title: '0706 Vue 样式匹配覆盖与规范校验',
    scope: '右侧 Agent / 工作台壳层收起态 / 设计规范守卫',
    detail: '对照 lexiang-new-0706/vue-app 和 portal-workbench-ui-0706 设计规范，仅覆盖与当前 new Vue 源码匹配的样式差异：补齐右侧 Agent 收起时宽度归零、隐藏边框阴影、禁用点击和展开恢复交互。同步移除未登记的 ui-0702-design-skill.css 运行时引入，接入 0706 design-baseline guard，用于提示封板壳层、Agent composer、静态/动态页签和共享组件被误覆盖的风险。未回退已确认的夜间模式底层能力。',
    status: '已合并正式'
  },
  {
    time: '2026-07-06 08:52',
    title: '0703 Vue UI 样式覆盖',
    scope: 'Skill 创建 / 权限管理 / 小屏布局 / 工作台壳层样式',
    detail: '对照 lexiang-new-0703.zip，仅合并与当前 Vue 源码重合的样式结构；并按 portal-workbench-ui-0703 设计规范收敛 Skill 创建与权限管理：内容区独立滚动、底部操作行固定、步骤页签密度统一、图标改为线性 SVG、小屏按壳层压缩顺序处理。保留线上新增的大模型调用、运营总览口径兜底、夜间模式和账号入口卡片修复，不做功能回退。',
    status: '已合并正式'
  },
  {
    time: '2026-07-03 17:54',
    title: '账号入口弹层卡片样式修复',
    scope: '账号入口 / 创建 Skill / 工作区入口弹层',
    detail: '修正账号入口弹层中“创建 Skill”卡片被全局 primary 规则误染成整块蓝底的问题；卡片恢复为白色信息面板，仅保留左上角加号图标使用主色。',
    status: '已合并正式'
  },
  {
    time: '2026-07-03 15:48',
    title: '运营总览 AI 解读口径纠偏',
    scope: '运营总览 / AI 解读 / 右侧 Agent 演示结果',
    detail: '运营总览的 AI 解读改为走真实大模型会话接口，并把页面已展示的 DAU、WAU、MAU、GMV、关键经营链路、GMV 结构和趋势速览作为上下文传入；接口失败时不再生成本地 mock 分析内容，同时展示层过滤旧报告里的风控、策略命中等无关口径。',
    status: '已合并正式'
  },
  {
    time: '2026-07-03 11:45',
    title: '权限管理 Vue 源码链路补全',
    scope: '权限管理 / 权限申请 / 审批列表 / 角色与用户管理',
    detail: '把权限管理从占位入口补成 Vue 源码内的可操作 POC：包含权限申请五步链路、审批列表、角色管理、用户管理、组织管理、数据源管理、功能管理和删除备份，并保留 0702 设计规范覆盖。',
    status: '已合并正式'
  },
  {
    time: '2026-06-23 17:33',
    title: 'Skill 创建评估及格线调整',
    scope: 'Skill 创建 / 评估验证 / 提交审核门槛',
    detail: '评估验证综合评分及格线从 0.80 调整为 0.60；当前综合评分 0.782 直接显示评估通过并允许进入提交审核，AI 微调保留为可选优化动作。',
    status: '已合并正式'
  },
  {
    time: '2026-06-23 17:26',
    title: 'Skill 创建草稿生成布局调整',
    scope: 'Skill 创建 / 基础配置 / 需求澄清 / 草稿生成',
    detail: '基础配置、需求澄清阶段移除保存草稿按钮；草稿生成阶段改为深色左右分栏，左侧按 IDE 文件树展示目录、缩进层级、文件类型图标和选中态，右侧展示生成草稿内容。',
    status: '已合并正式'
  },
  {
    time: '2026-06-23 17:07',
    title: 'Skill Hub 列表与角色操作调整',
    scope: 'Skill Hub / 列表字段 / 操作列 / 管理员与 PM 角色',
    detail: 'Skill Hub 列表新增中文名列并移除标签列和标签筛选；操作列中“测试”改为“评估”，“应用”改为“测试”；管理员驳回后状态显示已驳回且不再展示发布、审批；PM 侧可看到编辑，被驳回的 Skill 可点击返回创建流程修改。',
    status: '已合并正式'
  },
  {
    time: '2026-06-23 14:22',
    title: '0624 UI Skill 规范归一',
    scope: '右侧 Agent / 底部输入区 / 快捷 chips / 样式覆盖层',
    detail: '按 portal-workbench-ui-0624 样式规范收敛右侧 Agent 底部输入区：chips 始终保持横向 pill 与左右箭头，不退化为下拉框；输入框默认 36px、最多 3 行内滚动；发送按钮统一为 32px 单图标控件。',
    status: '已合并正式'
  },
  {
    time: '2026-06-23 14:11',
    title: '右侧 Agent 快捷 chips 查询触发',
    scope: '右侧 Agent / 底部快捷 chips',
    detail: '底部 chips 从范围选择改为快捷查询按钮，默认不再显示选中态；点击 chip 后直接把对应自然语言问题发送给右侧 Agent 执行查询。',
    status: '已合并正式'
  },
  {
    time: '2026-06-23 13:20',
    title: '账号入口与 POC 调整日志',
    scope: '账号入口弹层 / 调整日志 / Vue 入口跳转',
    detail: '账号入口弹层改为 2x2 功能入口，新增调整日志查看；日志按功能点归纳展示，时间按北京时间取值；当前入口统一由 0702 Vue 项目承载。',
    status: '已合并正式'
  },
  {
    time: '2026-06-22 13:40',
    title: 'Skill Hub 应用入口调整',
    scope: 'Skill Hub 操作列',
    detail: '应用固定为蓝色测试入口，放在操作项最后，点击后在右侧 Agent 展示 output 结果。',
    status: '已合并正式'
  },
  {
    time: '2026-06-18 18:30',
    title: '业务侧技能包管理与顶部入口整理',
    scope: '技能包管理 / 顶部栏',
    detail: '技能包管理固定为启停管理面，不再展示申请、使用、查看进度等旧流程；筛选归并为全部、已开启、已关闭；顶部中间搜索入口移除，同时保留夜间模式按钮。',
    status: '已合并正式'
  },
  {
    time: '2026-06-18 17:40',
    title: 'Skill 创建命名与 AI 微调闭环',
    scope: 'Skill 创建 / 评估验证 / 右侧 Agent',
    detail: '基础配置中区分 Skill 名称（英文）和必填中文命名；评估验证出现低分项时提供 AI 微调，唤起右侧 Agent 更新草稿和评分，示例评分刷新到综合评分 0.859 后进入后续审核。',
    status: '已合并正式'
  },
  {
    time: '2026-06-18 14:42',
    title: '企业客户管理打分模型样式修复',
    scope: '企业客户管理 / 打分模型',
    detail: '根据 0617 wangxt8 样式包替换 workbench-lead.js，修复打分模型页面样式不生效的问题；后续遇到同类问题先检查模块版本，不再只叠加 CSS 覆盖。',
    status: '已合并正式'
  }
]

const POC_DEPLOY_TARGETS = {
  new: { key: 'new', label: 'new 预览', href: 'https://new.leaibot.cn/admin/' },
  formal: { key: 'formal', label: '正式环境', href: 'https://leaibot.cn/admin/' }
}

const pocLogRecords = [...basePocLogRecords, ...pocLogServerRecords]
  .sort((left, right) => right.time.localeCompare(left.time))

function getLegacyPocPublisher(record) {
  if (record.publisher) return record.publisher
  if (record.deployAccount) return record.deployAccount
  const operator = String(record.operator || '').replace(/（.*$/, '')
  if (['zhangrui', 'baiyu', 'guanfeng2', 'guanjf2', 'yejw2', 'zhouyue118'].includes(operator)) {
    return operator
  }
  return '历史未记录'
}

function getPocChangePoint(record) {
  return record.changePoint || record.scope || '历史未记录'
}

function getPocDeployTargets(record) {
  let targetKeys = Array.isArray(record.deployTargets) ? record.deployTargets : []
  if (!targetKeys.length && record.status?.includes('正式')) targetKeys = ['formal']
  if (!targetKeys.length && record.status?.includes('new')) targetKeys = ['new']
  return [...new Set(targetKeys)]
    .map(key => POC_DEPLOY_TARGETS[key])
    .filter(Boolean)
}

function getPocReleaseTargetKeys(record) {
  const declaredTargets = Array.isArray(record.deployTargets) ? record.deployTargets : []
  if (declaredTargets.length) return new Set(declaredTargets)

  const targetKeys = new Set()
  if (record.status?.includes('正式')) {
    targetKeys.add('new')
    targetKeys.add('formal')
  } else if (record.status?.includes('new')) {
    targetKeys.add('new')
  }
  return targetKeys
}

function getPocReleaseRows(record) {
  const releaseKey = record.releaseKey || record.title
  const runtimeReleases = pocReleaseLedger.value.records?.[releaseKey]?.releases || {}
  const explicitReleases = record.releases || {}
  const legacyTargets = getPocReleaseTargetKeys(record)

  return Object.values(POC_DEPLOY_TARGETS).map(target => {
    const evidence = runtimeReleases[target.key] || explicitReleases[target.key]
    if (evidence) {
      return {
        ...target,
        published: true,
        state: '已发布',
        publisher: evidence.publisher || '历史未记录',
        releasedAt: evidence.releasedAt || '历史时间未单独记录',
        version: evidence.version || '历史未记录'
      }
    }

    if (legacyTargets.has(target.key)) {
      return {
        ...target,
        published: true,
        state: '历史已发布',
        publisher: getLegacyPocPublisher(record),
        releasedAt: '历史时间未单独记录',
        version: '历史未记录'
      }
    }

    return {
      ...target,
      published: false,
      state: '未发布',
      publisher: '',
      releasedAt: '',
      version: ''
    }
  })
}

function getPocTraceFields(record) {
  return [
    { label: '代码作者', value: record.codeAuthor },
    { label: '来源与提交', value: record.sourceRef },
    { label: '追溯状态', value: record.traceStatus },
    { label: '覆盖影响', value: record.overwriteImpact }
  ].filter(field => field.value)
}

// 侧栏 DOM 引用（用于响应式折叠和 peek 事件）
const sidebarEl = ref(null)

// ---- peek 模式相关（对应原 _sidebarPeek / _sidebarPeekTimer）----
let _peek      = false
let _peekTimer = null
let _boundLeave = null
let _boundEnter = null

// ---- 判断分组是否有激活的子页 ----
function isGroupActive(groupKey) {
  const group = MENU_TREE[groupKey]
  return !!(group?.children && group.children[currentPageId.value])
}

// ---- 路由变化时自动展开当前分组 ----
watch(currentPageId, (pageId) => {
  for (const [key, group] of Object.entries(MENU_TREE)) {
    if (group.children?.[pageId]) {
      openGroups.value = new Set([...openGroups.value, key])
      break
    }
  }
}, { immediate: true })

// ===== toggleGroup —— 完整还原原版逻辑（含 peek 模式）=====
function toggleGroup(key) {
  const el = sidebarEl.value
  if (!el) return

  // 收起状态下：临时展开侧栏（peek 模式）
  if (sidebarCollapsed.value) {
    _peek = true
    isPeeking.value = true
    openOnlyGroup(key)

    // 清除旧监听
    if (_boundLeave) el.removeEventListener('mouseleave', _boundLeave)
    if (_boundEnter) el.removeEventListener('mouseenter', _boundEnter)

    // 鼠标离开后 1.5s 自动收回
    _boundLeave = () => {
      clearTimeout(_peekTimer)
      _peekTimer = setTimeout(() => {
        if (_peek) {
          closePeek()
        }
      }, 1500)
    }
    _boundEnter = () => { clearTimeout(_peekTimer) }

    el.addEventListener('mouseleave', _boundLeave)
    el.addEventListener('mouseenter', _boundEnter)
    return
  }

  // 正常状态：展开/收起分组（同时关闭其他分组）
  const willOpen = !openGroups.value.has(key)
  openGroups.value = willOpen ? new Set([key]) : new Set()
}

// ===== 页面导航 =====
function navigateTo(path, pageId) {
  closeUserMenu()
  closePeek()
  // 记录静态页签
  appStore.ensureStaticTab(pageId)
  appStore.setActiveStaticTab(pageId)
  router.push(path)
}

function goPortalHome() {
  navigateTo('/portal/home', 'portal.home')
}

// ===== 用户菜单 =====
function toggleUserMenu(e) {
  e?.stopPropagation()
  userMenuVisible.value = !userMenuVisible.value
  if (userMenuVisible.value && sidebarCollapsed.value) {
    _peek = true
    isPeeking.value = true
  }
}
function closeUserMenu() {
  userMenuVisible.value = false
}

// ===== 账号入口按钮（对应原 openSkillCreatePage / openSkillManagerFromUserMenu 等）=====
function openSkillCreatePage() {
  closeUserMenu()
  appStore.ensureStaticTab('agent.skillCreate')
  appStore.setActiveStaticTab('agent.skillCreate')
  router.push('/agent/skill-create')
}
function openScenarioPackageCreatePage() {
  if (!canCreateScenarioPackage.value) return
  closeUserMenu()
  appStore.ensureStaticTab('agent.scenarioPackageCreate')
  appStore.setActiveStaticTab('agent.scenarioPackageCreate')
  router.push('/agent/scenario-package-create')
}
function openSkillManagerPage() {
  closeUserMenu()
  appStore.ensureStaticTab('agent.skills')
  appStore.setActiveStaticTab('agent.skills')
  router.push('/agent/skills')
}
function openPermissionManagerPage() {
  closeUserMenu()
  appStore.ensureStaticTab('agent.permissions')
  appStore.setActiveStaticTab('agent.permissions')
  router.push('/agent/permissions')
}
function openUsageDashboardPage() {
  closeUserMenu()
  appStore.setActiveTempTab(null)
  appStore.ensureStaticTab('agent.usageDashboard')
  appStore.setActiveStaticTab('agent.usageDashboard')
  router.push('/agent/usage-dashboard')
}
async function refreshPocReleaseLedger() {
  pocReleaseLedger.value = await loadPocReleaseLedger()
}
function openPocAdjustmentLog() {
  closeUserMenu()
  pocLogVisible.value = true
  void refreshPocReleaseLedger()
}
function closePocAdjustmentLog() {
  pocLogVisible.value = false
}

// ===== 退出 =====
async function doLogout() {
  await appStore.logout()
  router.replace('/login')
}

// ===== 关闭 peek =====
function closePeek() {
  _peek = false
  isPeeking.value = false
  clearTimeout(_peekTimer)
}

function openOnlyGroup(key) {
  openGroups.value = new Set([key])
}

function toggleSidebarManual() {
  if (sidebarCollapsed.value && isPeeking.value) {
    closePeek()
    appStore.setSidebarCollapsed(false, { persist: true })
    return
  }
  closePeek()
  appStore.toggleSidebar()
}

// ===== 响应式折叠（对应原 window resize 监听）=====
const AUTO_COLLAPSE_WIDTH = 1320
const AUTO_EXPAND_WIDTH   = 1480
let _lastWidth = window.innerWidth
let _resizeTimer = null

function isSidebarManuallyCollapsed() {
  return localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === '1'
    || localStorage.getItem(STORAGE_KEYS.legacySidebarCollapsed) === '1'
}

function applyResponsiveSidebar(width, growing = false, shrink = false) {
  if (appStore.sidebarCollapseLocked) return
  if ((shrink || !growing) && !sidebarCollapsed.value && width <= AUTO_COLLAPSE_WIDTH) {
    appStore.setSidebarCollapsed(true, { persist: false })
  } else if ((growing || !shrink) && sidebarCollapsed.value && width >= AUTO_EXPAND_WIDTH) {
    // 只在非手动折叠时自动展开
    if (!isSidebarManuallyCollapsed()) {
      appStore.setSidebarCollapsed(false, { persist: false })
    }
  }
}

function _onResize() {
  clearTimeout(_resizeTimer)
  _resizeTimer = setTimeout(() => {
    const w       = window.innerWidth
    const growing = w > _lastWidth
    const shrink  = w < _lastWidth
    _lastWidth = w

    applyResponsiveSidebar(w, growing, shrink)
  }, 80)
}

function _onDocumentClick(e) {
  const el = sidebarEl.value
  if (!el || el.contains(e.target)) return
  closeUserMenu()
  closePeek()
}

function _onDocumentKeydown(e) {
  if (e.key !== 'Escape') return
  closePocAdjustmentLog()
  closeUserMenu()
  closePeek()
}

onMounted(() => {
  window.addEventListener('resize', _onResize)
  document.addEventListener('click', _onDocumentClick)
  document.addEventListener('keydown', _onDocumentKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', _onResize)
  document.removeEventListener('click', _onDocumentClick)
  document.removeEventListener('keydown', _onDocumentKeydown)
  clearTimeout(_resizeTimer)
  clearTimeout(_peekTimer)
})
</script>

<style scoped>
.poc-log-item {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-areas: 'meta status' 'content content';
  gap: var(--space-3, 12px) var(--space-4, 16px);
  padding: var(--space-4, 16px);
}
.poc-log-meta {
  grid-area: meta;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2, 8px);
}
.poc-log-content {
  grid-area: content;
}
.poc-log-item > div {
  min-width: 0;
  overflow-wrap: anywhere;
}
.poc-log-status {
  grid-area: status;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2, 8px);
}
.poc-log-status > em {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.5;
  font-weight: 500;
  border-radius: var(--radius-md);
}
@media (max-width: 719px) {
  .poc-log-item {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'meta' 'status' 'content';
  }
  .poc-log-status {
    justify-content: flex-start;
  }
  .poc-log-release-row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .poc-log-item .poc-log-release-row > p {
    grid-column: 1 / -1;
  }
}
</style>
