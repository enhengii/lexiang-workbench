<script setup lang="ts">
import { onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'
import MetricGrid from '@/components/content/MetricGrid.vue'
import MetricCard from '@/components/content/MetricCard.vue'
import SectionHeader from '@/components/content/SectionHeader.vue'

type SkillRow = {
  id: string; name: string; module: string; creator: string; users: number; calls: number
  success: number; failed: number; successRate: number | null; likes: number; dislikes: number
  feedbackCount: number; likeRate: number | null
}
defineProps<{ row: SkillRow; startDate: string; endDate: string }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
let trigger: HTMLElement | null = null
const n = (value: number) => value.toLocaleString('zh-CN')
const rate = (value: number | null) => value == null ? '—' : `${(value * 100).toFixed(1)}%`
function open() {
  if (!dialog.value || dialog.value.open) return
  trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialog.value.showModal()
}
function close(restoreFocus = true) {
  dialog.value?.close()
  if (restoreFocus && trigger?.isConnected && trigger.getClientRects().length) trigger.focus({ preventScroll: true })
  trigger = null
}
onMounted(open)
onActivated(open)
onDeactivated(() => { close(false); emit('close') })
onBeforeUnmount(() => close())
</script>

<template>
  <dialog ref="dialog" class="usage-detail" aria-label="Skill使用详情" @cancel.prevent="emit('close')">
    <header class="usage-detail-header">
      <div><h2>{{ row.name }}</h2><p>{{ startDate }} 至 {{ endDate }} · 全平台示例数据</p></div>
      <button type="button" class="btn btn-secondary" aria-label="关闭Skill使用详情" @click="emit('close')">关闭</button>
    </header>
    <div class="usage-detail-body">
      <dl class="usage-detail-meta">
        <div><dt>Skill ID</dt><dd class="usage-code">{{ row.id }}</dd></div>
        <div><dt>业务模块</dt><dd>{{ row.module }}</dd></div>
        <div><dt>创建人</dt><dd>{{ row.creator }}</dd></div>
      </dl>
      <MetricGrid :columns="3">
        <MetricCard label="使用人数" :value="n(row.users)" meta="周期去重" />
        <MetricCard label="调用次数" :value="n(row.calls)" meta="含成功与失败" />
        <MetricCard label="调用成功率" :value="rate(row.successRate)" :meta="row.calls ? '成功调用 / 总调用' : '无调用，不计算'" />
      </MetricGrid>
      <section class="usage-detail-section">
        <SectionHeader title="运行与反馈" description="反馈仅统计已收到的赞踩，不代表所有调用评价。" />
        <dl class="usage-detail-stats">
          <div><dt>成功调用</dt><dd>{{ n(row.success) }}</dd></div>
          <div><dt>失败调用</dt><dd>{{ n(row.failed) }}</dd></div>
          <div><dt>点赞 / 点踩</dt><dd>{{ n(row.likes) }} / {{ n(row.dislikes) }}</dd></div>
          <div><dt>反馈数</dt><dd>{{ n(row.feedbackCount) }}</dd></div>
          <div><dt>好评率</dt><dd>{{ rate(row.likeRate) }}</dd></div>
          <div><dt>好评率分母</dt><dd>点赞 + 点踩</dd></div>
        </dl>
      </section>
      <p class="usage-detail-note">当前仅提供聚合统计，不展示原始 Query、使用人名单或结果正文；示例数据未接入正式统计。</p>
    </div>
  </dialog>
</template>

<style scoped>
.usage-detail { container-type: inline-size; box-sizing: border-box; width: min(760px, calc(100vw - 32px)); max-width: calc(100vw - 32px); max-height: calc(100dvh - 48px); margin: auto; padding: 0; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); color: var(--color-text); overflow: auto; font-family: var(--font-body); font-size: var(--text-sm, 13px); }
.usage-detail::backdrop { background: var(--color-overlay, color-mix(in srgb, var(--color-text) 35%, transparent)); }
.usage-detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4, 16px); padding: var(--space-5, 20px); border-bottom: 1px solid var(--color-border-subtle); }
.usage-detail-header h2 { margin: 0; font-size: var(--text-md, 16px); line-height: 1.4; overflow-wrap: anywhere; }
.usage-detail-header p { margin: var(--space-2, 8px) 0 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-detail-header button { flex: none; }
.usage-detail-body { display: grid; gap: var(--space-4, 16px); min-width: 0; padding: var(--space-5, 20px); }
.usage-detail-meta, .usage-detail-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-4, 16px); margin: 0; }
.usage-detail-meta > div, .usage-detail-stats > div { min-width: 0; }
.usage-detail-meta dt, .usage-detail-stats dt { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-detail-meta dd, .usage-detail-stats dd { margin: var(--space-1, 4px) 0 0; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.usage-code { font-family: var(--font-code, ui-monospace, monospace); }
.usage-detail-section { display: grid; gap: var(--space-4, 16px); }
.usage-detail-note { margin: 0; padding-top: var(--space-3, 12px); border-top: 1px solid var(--color-border-subtle); color: var(--color-text-secondary); font-size: var(--text-xs, 12px); line-height: 1.6; }
@container (max-width: 719px) { .usage-detail-meta, .usage-detail-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container (max-width: 479px) { .usage-detail-meta, .usage-detail-stats { grid-template-columns: 1fr; } }
</style>
