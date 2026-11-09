<template>
  <div class="sidebar-footer">
    <div class="user-info" @click="$emit('toggle-user-menu', $event)">
      <div class="user-avatar">{{ userInitial }}</div>
      <div class="user-meta">
        <div class="user-name">{{ user }}</div>
        <div class="user-role">{{ role }}</div>
      </div>
      <span
        class="user-logout"
        title="退出登录"
        @click.stop="$emit('logout')"
      >退出</span>
    </div>

    <Teleport to="body">
      <div
        v-if="userMenuVisible"
        class="user-menu-popover account-hub-popover open"
        aria-label="账号工作区入口"
        @click.self="$emit('close-user-menu')"
      >
        <div class="account-hub-panel" @click.stop>
          <button type="button" class="account-hub-close" @click="$emit('close-user-menu')" aria-label="关闭">×</button>
          <button type="button" class="account-hub-card account-hub-card-create primary" @click="$emit('open-skill-create')">
            <span class="account-hub-icon account-hub-create-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg></span>
            <b>创建 Skill</b>
            <small>从业务场景定义新能力、参数、输入输出和审批规则。</small>
          </button>
          <button
            v-if="canCreateScenarioPackage"
            type="button"
            class="account-hub-card account-hub-card-create primary"
            @click="$emit('open-scenario-package-create')"
          >
            <span class="account-hub-icon account-hub-create-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="15" width="6" height="6" rx="1.5"/><path d="M6 9v6M9 6h6v6M12 16h8M16 12v8"/></svg></span>
            <b>创建场景技能包</b>
            <small>按业务场景组合、串联已发布 Skill，并完成权限与版本评估。</small>
          </button>
          <button type="button" class="account-hub-card account-hub-card-manage" @click="$emit('open-skill-manager')">
            <span class="account-hub-icon">◎</span>
            <b>Skill Hub</b>
            <small>查看已提交 Skill 状态，处理审批、发布、启用或禁用。</small>
          </button>
          <button type="button" class="account-hub-card account-hub-card-manage" @click="$emit('open-permission-manager')">
            <span class="account-hub-icon">◇</span>
            <b>权限管理</b>
            <small>管理菜单权限、Skill 权限、数据范围和审批边界。</small>
          </button>
          <button type="button" class="account-hub-card account-hub-card-manage" @click="$emit('open-usage-dashboard')">
            <span class="account-hub-icon account-hub-create-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16h16M8 15v-4M13 15V7M18 15V4"/></svg></span>
            <b>使用数据看板</b>
            <small>查看平台访问、AI 互动与 Skill 运行统计。</small>
          </button>
          <button type="button" class="account-hub-card account-hub-card-manage" @click="$emit('open-usage-creators')">
            <span class="account-hub-icon account-hub-create-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2"/></svg></span>
            <b>创建人分析</b>
            <small>按创建人查看旗下 Skill 的调用、质量与明细。</small>
          </button>
          <button type="button" class="account-hub-card account-hub-card-manage account-hub-card-log" @click="$emit('open-poc-log')">
            <span class="account-hub-icon">LOG</span>
            <b>调整日志</b>
            <small>查看功能调整记录。仅用于 POC 记录。</small>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
defineProps({
  canCreateScenarioPackage: {
    type: Boolean,
    default: false
  },
  user: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    default: ''
  },
  userInitial: {
    type: String,
    default: 'A'
  },
  userMenuVisible: {
    type: Boolean,
    default: false
  }
})

defineEmits([
  'toggle-user-menu',
  'close-user-menu',
  'logout',
  'open-skill-create',
  'open-scenario-package-create',
  'open-skill-manager',
  'open-permission-manager',
  'open-usage-dashboard',
  'open-usage-creators',
  'open-poc-log'
])
</script>

<style scoped>
.account-hub-create-icon { width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; }
.account-hub-create-icon svg { width: 18px; height: 18px; }
.account-hub-card-log { grid-column: 1 / -1; min-height: 0; padding: var(--space-4, 16px); }
</style>
