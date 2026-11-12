<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{ page: number; pageSize: number; total: number; loading?: boolean }>(), { loading: false })
const emit = defineEmits<{ 'update:page': [page: number] }>()
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
</script>

<template>
  <nav v-if="total > 0" class="cs-pagination" aria-label="分页">
    <span>共 {{ total }} 条</span>
    <button type="button" :disabled="loading || page <= 1" aria-label="上一页" @click="emit('update:page', page - 1)">上一页</button>
    <span aria-current="page">第 {{ page }} / {{ pageCount }} 页</span>
    <button type="button" :disabled="loading || page >= pageCount" aria-label="下一页" @click="emit('update:page', page + 1)">下一页</button>
  </nav>
</template>
