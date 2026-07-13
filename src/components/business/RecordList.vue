<script setup lang="ts">
import { computed } from 'vue'
import { ElMessageBox } from 'element-plus'
import type { VisitRecord } from '@/types'

/**
 * RecordList - 到达记录列表
 *
 * 按到达日期倒序展示记录（日期范围按起始日期排序）。
 * 每条记录显示：日期（范围显示起止）/ 目的标签 / 备注（淡灰小字）。
 * hover 显示编辑/删除图标按钮；删除前二次确认。
 *
 * Props:
 *  - records: 记录列表
 *  - loading?: 加载中
 * Emits:
 *  - edit(record)
 *  - delete(record)
 */
const props = withDefaults(
  defineProps<{
    records: VisitRecord[]
    loading?: boolean
  }>(),
  {
    loading: false,
  },
)

const emit = defineEmits<{
  edit: [record: VisitRecord]
  delete: [record: VisitRecord]
}>()

// 按起始日期降序
const sortedRecords = computed(() =>
  [...props.records].sort((a, b) => b.startDate.localeCompare(a.startDate)),
)

function handleEdit(record: VisitRecord): void {
  emit('edit', record)
}

async function handleDelete(record: VisitRecord): Promise<void> {
  try {
    await ElMessageBox.confirm(
      '确定要删除这条到达记录吗？删除后无法恢复。',
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
      },
    )
    emit('delete', record)
  } catch {
    // 用户取消，无需处理
  }
}
</script>

<template>
  <div class="record-list">
    <!-- 加载骨架屏 -->
    <div v-if="loading" class="space-y-2">
      <div
        v-for="i in 3"
        :key="i"
        class="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5"
      >
        <div class="flex items-center justify-between">
          <div class="h-3 w-20 animate-pulse rounded bg-slate-200" />
          <div class="h-3 w-10 animate-pulse rounded bg-warm/20" />
        </div>
        <div class="mt-2 h-2.5 w-32 animate-pulse rounded bg-slate-100" />
      </div>
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="sortedRecords.length === 0"
      class="flex flex-col items-center justify-center py-10 text-center"
    >
      <svg
        class="mb-3 h-10 w-10 text-slate-200"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <p class="text-sm text-slate-400">还没有到达记录，点击上方添加</p>
    </div>

    <!-- 记录列表 -->
    <div v-else class="space-y-2">
      <div
        v-for="record in sortedRecords"
        :key="record.id"
        class="group rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50"
      >
        <div class="flex items-start justify-between gap-2">
          <!-- 日期 -->
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-1 text-sm font-medium text-slate-700">
              <span>{{ record.startDate }}</span>
              <span v-if="record.endDate" class="text-slate-400">— {{ record.endDate }}</span>
            </div>
            <!-- 备注 -->
            <p
              v-if="record.note"
              class="mt-1 truncate text-xs text-slate-400"
              :title="record.note"
            >
              {{ record.note }}
            </p>
          </div>

          <div class="flex items-center gap-1.5">
            <!-- 目的标签 -->
            <span
              class="inline-flex shrink-0 items-center rounded-full bg-warm/5 px-2 py-0.5 text-xs text-warm"
            >
              {{ record.purpose }}
            </span>

            <!-- hover 操作 -->
            <div class="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-white hover:text-warm"
                title="编辑"
                @click="handleEdit(record)"
              >
                <svg
                  class="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-white hover:text-red-500"
                title="删除"
                @click="handleDelete(record)"
              >
                <svg
                  class="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
