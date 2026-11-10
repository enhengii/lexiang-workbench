<script setup lang="ts">
import { computed } from 'vue'
import SectionHeader from '@/components/content/SectionHeader.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'

type RankingRow = { id: string; name: string; calls: number | null; likes: number | null; dislikes: number | null }
const props = defineProps<{ rows: RankingRow[]; scopeLabel: string }>()
const emit = defineEmits<{ 'open-detail': [id: string]; 'view-all': [] }>()
const metrics = [
  { key: 'calls', title: 'Skill调用排行', unit: '次', empty: '暂无Skill调用', description: '按调用次数降序 · Top 5' },
  { key: 'likes', title: '点赞排行', unit: '赞', empty: '暂无点赞数据', description: '按点赞次数降序 · Top 5' },
  { key: 'dislikes', title: '点踩排行', unit: '踩', empty: '暂无点踩数据', description: '按点踩次数降序 · Top 5' }
] as const
const count = (row: RankingRow, key: typeof metrics[number]['key']) => row[key] ?? 0
const rankings = computed(() => metrics.map(metric => ({
  ...metric,
  rows: props.rows.filter(row => row[metric.key] != null && count(row, metric.key) > 0)
    .sort((a, b) => count(b, metric.key) - count(a, metric.key) || a.id.localeCompare(b.id)).slice(0, 5)
})))
const n = (value: number) => value.toLocaleString('zh-CN')
</script>

<template>
  <div class="usage-overview-rankings" data-flow-role="main">
    <div class="usage-rank-toolbar"><p>{{ scopeLabel }}</p><button type="button" class="btn btn-secondary" @click="emit('view-all')">查看Skill明细</button></div>
    <div class="usage-rank-grid">
      <section v-for="ranking in rankings" :key="ranking.key" class="usage-rank-surface">
        <SectionHeader :title="ranking.title" :description="ranking.description" />
        <ol v-if="ranking.rows.length" class="usage-rank-list">
          <li v-for="(row, index) in ranking.rows" :key="row.id">
            <button type="button" class="usage-rank-row" :aria-label="`查看${row.name}${ranking.title}明细`" @click="emit('open-detail', row.id)">
              <span class="usage-rank-position">{{ index + 1 }}</span>
              <span class="usage-rank-main"><span :title="row.name">{{ row.name }}</span><span class="usage-rank-track" aria-hidden="true"><i :style="{ width: `${count(row, ranking.key) / (count(ranking.rows[0], ranking.key) || 1) * 100}%` }"></i></span></span>
              <strong>{{ n(count(row, ranking.key)) }}<small> {{ ranking.unit }}</small></strong>
            </button>
          </li>
        </ol>
        <FeedbackState v-else state="empty" :title="ranking.empty" description="仅对所选范围内已提供且大于零的次数排行。" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.usage-overview-rankings { display: grid; gap: var(--space-3, 12px); min-width: 0; }
.usage-rank-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2, 8px); }
.usage-rank-toolbar p { margin: 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-rank-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-4, 16px); min-width: 0; }
.usage-rank-surface { display: grid; align-content: start; gap: var(--space-4, 16px); min-width: 0; padding: var(--space-4, 16px); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-surface); }
.usage-rank-list { display: grid; gap: var(--space-3, 12px); padding: 0; margin: 0; list-style: none; }
.usage-rank-row { display: flex; align-items: center; gap: var(--space-2, 8px); width: 100%; min-width: 0; padding: var(--space-1, 4px) 0; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-text); font: inherit; text-align: left; cursor: pointer; }
.usage-rank-row:hover { background: var(--color-bg-subtle); }
.usage-rank-position { flex: none; color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
.usage-rank-main { display: grid; flex: 1; gap: var(--space-2, 8px); min-width: 0; }
.usage-rank-main > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.usage-rank-track { display: block; height: var(--space-1, 4px); overflow: hidden; border-radius: var(--radius-pill, 9999px); background: var(--color-primary-subtle); }
.usage-rank-track i { display: block; height: 100%; border-radius: inherit; background: var(--chart-1, var(--color-primary)); }
.usage-rank-row strong { flex: none; font-weight: 600; font-variant-numeric: tabular-nums; }
.usage-rank-row small { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); font-weight: 400; }
.usage-rank-row:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
@container (max-width: 1039px) { .usage-rank-grid { grid-template-columns: 1fr; } }
</style>
