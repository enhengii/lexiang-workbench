<template>
  <div v-if="tempTabs.length" ref="rootEl" class="temp-tab-switcher" aria-label="AI 报告结果">
    <button
      ref="historyTriggerEl"
      type="button"
      class="temp-tab-history-trigger"
      :class="{ active: !!currentTab, 'is-default': !currentTab }"
      aria-haspopup="menu"
      :aria-label="`${triggerFullTitle}，共${tempTabs.length}个报告`"
      :aria-expanded="historyOpen ? 'true' : 'false'"
      aria-controls="temp-tab-history-menu"
      :title="triggerFullTitle"
      @click="toggleHistory"
    >
      <span class="temp-tab-trigger-title">{{ triggerDisplayTitle }}</span>
      <span class="temp-tab-history-count">{{ tempTabs.length }}</span>
      <svg class="temp-tab-chevron" :class="{ open: historyOpen }" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m4.5 6.5 3.5 3 3.5-3" />
      </svg>
    </button>

    <Teleport to="body">
      <Transition name="temp-history-fade">
        <div
          v-if="historyOpen"
          id="temp-tab-history-menu"
          ref="historyMenuEl"
          class="temp-tab-history-menu"
          :style="historyMenuStyle"
          role="menu"
          aria-label="历史 AI 结果"
          @keydown="handleMenuKeydown"
        >
          <div class="temp-tab-history-header">
            <div>
              <strong>历史结果</strong>
              <span>共 {{ tempTabs.length }} 个</span>
            </div>
            <span class="temp-tab-history-hint">选择后在内容区打开</span>
          </div>

          <div class="temp-tab-history-list">
            <div
              v-for="tab in orderedTabs"
              :key="tab.id"
              class="temp-tab-history-item"
              :class="{ active: tab.id === activeTempTabId }"
            >
              <button
                type="button"
                class="temp-tab-history-main"
                role="menuitem"
                :aria-current="tab.id === activeTempTabId ? 'page' : undefined"
                @click="activateHistoryTab(tab.id)"
              >
                <span class="temp-tab-history-dot" aria-hidden="true"></span>
                <span class="temp-tab-history-copy">
                  <span class="temp-tab-history-title" :title="fullReportTitle(tab)">{{ reportDisplayTitle(tab) }}</span>
                  <span class="temp-tab-history-meta">
                    {{ tab.sourcePageLabel || 'AI 报告' }}
                    <template v-if="tab.saved"> · 已保存</template>
                  </span>
                </span>
                <span v-if="tab.id === activeTempTabId" class="temp-tab-history-active">当前</span>
              </button>
              <button
                type="button"
                class="temp-tab-history-close"
                :aria-label="`关闭${fullReportTitle(tab)}`"
                title="关闭结果"
                @click="closeHistoryTab(tab.id)"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                  <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  tempTabs: {
    type: Array,
    default: () => []
  },
  activeTempTabId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['activate', 'close'])

const rootEl = ref(null)
const historyTriggerEl = ref(null)
const historyMenuEl = ref(null)
const historyOpen = ref(false)
const historyMenuStyle = ref({})

const currentTab = computed(() => {
  if (!props.activeTempTabId) return null
  return props.tempTabs.find(tab => tab.id === props.activeTempTabId) || null
})

const orderedTabs = computed(() => {
  const activeId = props.activeTempTabId
  return [...props.tempTabs].sort((left, right) => {
    if (left.id === activeId) return -1
    if (right.id === activeId) return 1
    return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
  })
})

function toggleHistory() {
  if (historyOpen.value) {
    closeHistory()
    return
  }
  historyOpen.value = true
  nextTick(() => {
    updateHistoryMenuPosition()
    historyMenuEl.value?.querySelector('.temp-tab-history-main')?.focus()
  })
}

function closeHistory({ restoreFocus = false } = {}) {
  historyOpen.value = false
  if (restoreFocus) nextTick(() => historyTriggerEl.value?.focus())
}

function activateHistoryTab(id) {
  emit('activate', id)
  closeHistory({ restoreFocus: true })
}

function closeHistoryTab(id) {
  emit('close', id)
  nextTick(() => {
    if (!props.tempTabs.length) closeHistory({ restoreFocus: true })
    else updateHistoryMenuPosition()
  })
}

function updateHistoryMenuPosition() {
  const trigger = historyTriggerEl.value
  const menu = historyMenuEl.value
  if (!trigger || !menu) return

  const margin = 12
  const gap = 8
  const triggerRect = trigger.getBoundingClientRect()
  const width = Math.min(320, window.innerWidth - margin * 2)
  const height = menu.offsetHeight
  const left = Math.min(
    Math.max(margin, triggerRect.right - width),
    window.innerWidth - width - margin
  )
  const below = triggerRect.bottom + gap
  const top = below + height <= window.innerHeight - margin
    ? below
    : Math.max(margin, triggerRect.top - height - gap)

  historyMenuStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.round(width)}px`
  }
}

function handleDocumentPointerDown(event) {
  if (!historyOpen.value) return
  const target = event.target
  if (rootEl.value?.contains(target) || historyMenuEl.value?.contains(target)) return
  closeHistory()
}

function handleDocumentKeydown(event) {
  if (event.key === 'Escape' && historyOpen.value) {
    event.preventDefault()
    closeHistory({ restoreFocus: true })
  }
}

function handleMenuKeydown(event) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const items = [...(historyMenuEl.value?.querySelectorAll('.temp-tab-history-main') || [])]
  if (!items.length) return
  const currentIndex = items.indexOf(document.activeElement)
  let nextIndex = currentIndex
  if (event.key === 'Home') nextIndex = 0
  if (event.key === 'End') nextIndex = items.length - 1
  if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1 + items.length) % items.length
  if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length
  items[nextIndex]?.focus()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
  window.addEventListener('resize', updateHistoryMenuPosition)
  window.addEventListener('scroll', updateHistoryMenuPosition, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
  window.removeEventListener('resize', updateHistoryMenuPosition)
  window.removeEventListener('scroll', updateHistoryMenuPosition, true)
})

watch(() => props.tempTabs.length, length => {
  if (!length) closeHistory()
  else if (historyOpen.value) nextTick(updateHistoryMenuPosition)
})

const REPORT_TITLE_LIMIT = 10
const DEFAULT_TRIGGER_TITLE = 'AI 结果报告'

function fullReportTitle(tab) {
  if (!tab) return '报告结果'
  return String(tab.title || '数据解读报告')
    .replace(/^AI\s*报告\s*[·:：-]\s*/i, '')
    .replace(/\s*#\d+\s*$/g, '')
    .replace(/\s*·\s*/g, '·')
    .trim()
}

function reportDisplayTitle(tab) {
  const title = fullReportTitle(tab)
  const characters = Array.from(title)
  return characters.length > REPORT_TITLE_LIMIT
    ? `${characters.slice(0, REPORT_TITLE_LIMIT).join('')}…`
    : title
}

const triggerFullTitle = computed(() => currentTab.value
  ? fullReportTitle(currentTab.value)
  : DEFAULT_TRIGGER_TITLE
)

const triggerDisplayTitle = computed(() => currentTab.value
  ? reportDisplayTitle(currentTab.value)
  : DEFAULT_TRIGGER_TITLE
)
</script>

<style lang="scss" scoped>
.temp-tab-switcher {
  position: relative;
  z-index: 12;
  flex: 0 0 auto;
  min-width: max-content;
  display: flex;
  align-items: center;
  margin-left: 8px;
}

.temp-tab-history-trigger,
.temp-tab-history-main,
.temp-tab-history-close {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.temp-tab-history-dot {
  flex: 0 0 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: .78;
}

.temp-tab-trigger-title {
  min-width: 0;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
}

.temp-tab-history-trigger {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-width: 0;
  flex: 0 0 auto;
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  border: 1px solid rgba(99, 112, 241, .20);
  border-radius: 10px;
  background: linear-gradient(135deg, #fff 0%, #f8faff 58%, #f6f3ff 100%);
  box-shadow: 0 4px 14px rgba(61, 78, 160, .07), inset 0 1px 0 rgba(255, 255, 255, .9);
  color: var(--color-text-secondary, #646a73);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.temp-tab-history-trigger.is-default {
  min-width: 116px;
}

.temp-tab-history-trigger.is-default .temp-tab-trigger-title {
  max-width: none;
  overflow: visible;
  text-overflow: clip;
}

.temp-tab-history-trigger::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0 auto 0 0;
  width: 3px;
  background: linear-gradient(180deg, #68a5ff 0%, #806cff 52%, #c06cff 100%);
  opacity: .72;
}

.temp-tab-history-trigger::after {
  content: '';
  position: absolute;
  z-index: -1;
  width: 48px;
  height: 48px;
  right: 26px;
  top: -34px;
  border-radius: 50%;
  background: rgba(111, 92, 255, .14);
  filter: blur(12px);
  pointer-events: none;
}

.temp-tab-history-trigger:hover,
.temp-tab-history-trigger[aria-expanded="true"] {
  border-color: rgba(99, 112, 241, .36);
  background: linear-gradient(135deg, #fff 0%, #f4f7ff 58%, #f3efff 100%);
  box-shadow: 0 6px 18px rgba(61, 78, 160, .11), inset 0 1px 0 rgba(255, 255, 255, .95);
  color: var(--color-text, #1f2329);
}

.temp-tab-history-trigger.active,
.temp-tab-history-trigger.active:hover,
.temp-tab-history-trigger.active[aria-expanded="true"] {
  border-color: var(--color-primary-border, #adc6ff);
  background: linear-gradient(135deg, rgba(51, 112, 255, .12) 0%, rgba(91, 99, 255, .10) 58%, rgba(143, 91, 255, .10) 100%);
  box-shadow: 0 6px 18px rgba(51, 88, 190, .14), inset 0 1px 0 rgba(255, 255, 255, .72);
  color: var(--color-primary, #3370ff);
}

.temp-tab-history-count {
  min-width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border-radius: 9px;
  border: 1px solid rgba(99, 112, 241, .10);
  background: rgba(255, 255, 255, .68);
  color: var(--color-text-secondary, #646a73);
  font-size: 10px;
  line-height: 18px;
}

.temp-tab-chevron {
  transition: transform .16s ease;
}

.temp-tab-chevron.open {
  transform: rotate(180deg);
}

.temp-tab-history-trigger:focus-visible,
.temp-tab-history-main:focus-visible,
.temp-tab-history-close:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring, 0 0 0 3px rgba(51, 112, 255, .18));
}

@media (max-width: 1380px) {
  .temp-tab-trigger-title {
    max-width: 104px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .temp-tab-chevron {
    transition: none;
  }
}
</style>

<style lang="scss" scoped>
.temp-tab-history-menu {
  position: fixed;
  z-index: 1200;
  max-height: min(420px, calc(100vh - 24px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--color-border-light, #e5e6eb);
  border-radius: 12px;
  background: var(--color-bg-elevated, #fff);
  box-shadow: 0 12px 32px rgba(31, 35, 41, .14), 0 2px 8px rgba(31, 35, 41, .08);
  color: var(--color-text, #1f2329);
}

.temp-tab-history-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 14px 11px;
  border-bottom: 1px solid var(--color-border-light, #e5e6eb);
}

.temp-tab-history-header > div {
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.temp-tab-history-header strong {
  font-size: 13px;
  font-weight: 650;
}

.temp-tab-history-header span,
.temp-tab-history-hint {
  color: var(--color-text-tertiary, #8f959e);
  font-size: 11px;
}

.temp-tab-history-list {
  min-height: 0;
  padding: 6px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(143, 149, 158, .35) transparent;
}

.temp-tab-history-item {
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 54px;
  border-radius: 8px;
  color: var(--color-text-secondary, #646a73);
}

.temp-tab-history-item:hover,
.temp-tab-history-item.active {
  background: var(--color-primary-subtle, #eef4ff);
  color: var(--color-primary, #3370ff);
}

.temp-tab-history-main {
  min-width: 0;
  flex: 1 1 auto;
  min-height: 54px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 6px 7px 10px;
  text-align: left;
}

.temp-tab-history-copy {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.temp-tab-history-title,
.temp-tab-history-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.temp-tab-history-title {
  color: var(--color-text, #1f2329);
  font-size: 13px;
  font-weight: 600;
}

.temp-tab-history-meta {
  color: var(--color-text-tertiary, #8f959e);
  font-size: 11px;
}

.temp-tab-history-active {
  flex: 0 0 auto;
  padding: 2px 7px;
  border-radius: 9px;
  background: rgba(51, 112, 255, .12);
  color: var(--color-primary, #3370ff);
  font-size: 10px;
  font-weight: 600;
}

.temp-tab-history-close {
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 6px;
  border-radius: 7px;
  color: var(--color-text-tertiary, #8f959e);
}

.temp-tab-history-close:hover {
  background: rgba(51, 112, 255, .12);
  color: var(--color-primary, #3370ff);
}

.temp-tab-history-main:focus-visible,
.temp-tab-history-close:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring, 0 0 0 3px rgba(51, 112, 255, .18));
}

.temp-history-fade-enter-active,
.temp-history-fade-leave-active {
  transition: opacity .14s ease, transform .14s ease;
  transform-origin: top right;
}

.temp-history-fade-enter-from,
.temp-history-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(.985);
}

@media (prefers-reduced-motion: reduce) {
  .temp-history-fade-enter-active,
  .temp-history-fade-leave-active {
    transition: none;
  }
}
</style>
