import { reactive, ref } from 'vue'
import {
  createLegacyRulesState, readLegacyRulesState, saveLegacyRule, endLegacyRule,
  type LegacyRuleContext, type LegacyRuleDraft
} from '@/services/pointsLegacyRules'

const STORAGE_KEY = 'portal.points-legacy-rules.demo.v1'
const state = reactive(createLegacyRulesState())
const storageNoticeRef = ref('')
let initialized = false

function load() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) Object.assign(state, readLegacyRulesState(raw))
  } catch {
    storageNoticeRef.value = '本地规则演示记录不可读取，已载入初始示例。'
  }
}

function persist(): { persisted: boolean } {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    storageNoticeRef.value = ''
    return { persisted: true }
  } catch {
    storageNoticeRef.value = '浏览器未能保存规则演示记录；本次页面已生效，刷新后可能丢失。'
    return { persisted: false }
  }
}

export function usePointsLegacyRulesDemo() {
  load()
  return {
    state,
    storageNoticeRef,
    saveRule(input: LegacyRuleDraft, context: LegacyRuleContext, existingId?: string) {
      Object.assign(state, saveLegacyRule(state, input, context, existingId))
      return persist()
    },
    endRule(id: string, context: LegacyRuleContext) {
      Object.assign(state, endLegacyRule(state, id, context))
      return persist()
    }
  }
}
