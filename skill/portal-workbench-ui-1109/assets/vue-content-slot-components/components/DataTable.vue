<script setup lang="ts" generic="Row extends Record<string, unknown>">
type Column = { key: string; label: string; align?: 'left' | 'right'; width?: string; format?: (value: unknown, row: Row) => string }
withDefaults(defineProps<{
  columns: Column[]
  rows: Row[]
  rowKey: keyof Row
  caption: string
  density?: 'compact' | 'default' | 'comfy' | 'two-line'
  loading?: boolean
}>(), { density: 'default', loading: false })
</script>

<template>
  <div class="cs-data-table-wrap">
    <table class="cs-data-table" :class="`cs-data-table--${density}`">
      <caption class="cs-sr-only">{{ caption }}</caption>
      <thead><tr><th v-for="column in columns" :key="column.key" :style="{ width: column.width, textAlign: column.align || 'left' }" scope="col">{{ column.label }}</th></tr></thead>
      <tbody>
        <tr v-if="loading"><td :colspan="columns.length">加载中</td></tr>
        <tr v-for="row in rows" v-else :key="String(row[rowKey])">
          <td v-for="column in columns" :key="column.key" :style="{ textAlign: column.align || 'left' }">
            <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">{{ column.format ? column.format(row[column.key], row) : row[column.key] }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
