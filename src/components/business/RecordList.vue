<script setup lang="ts">
import { computed, ref } from 'vue'
import { Calendar, Pencil, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import type { VisitRecord } from '@/types'

/**
 * RecordList - 到达记录列表
 *
 * 按到达日期倒序展示记录（日期范围按起始日期排序）。
 * 每条记录显示：日期（范围显示起止）/ 目的标签 / 备注（淡灰小字）。
 * hover 显示编辑/删除图标按钮；删除前二次确认（声明式 AlertDialog）。
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

// ---- 删除确认（声明式 ConfirmDialog） ----
const confirmVisible = ref(false)
const pendingDelete = ref<VisitRecord | null>(null)

function handleDelete(record: VisitRecord): void {
  pendingDelete.value = record
  confirmVisible.value = true
}

function handleConfirmDelete(): void {
  if (pendingDelete.value) {
    emit('delete', pendingDelete.value)
    pendingDelete.value = null
  }
}

function handleCancelDelete(): void {
  pendingDelete.value = null
}
</script>

<template>
  <div class="record-list">
    <!-- 加载骨架屏 -->
    <div v-if="loading" class="space-y-2">
      <div
        v-for="i in 3"
        :key="i"
        class="rounded-xl border border-border/40 bg-card/50 px-3 py-2.5"
      >
        <div class="flex items-center justify-between">
          <Skeleton class="h-3 w-20" />
          <Skeleton class="h-3 w-10" />
        </div>
        <Skeleton class="mt-2 h-2.5 w-32" />
      </div>
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="sortedRecords.length === 0"
      class="flex flex-col items-center justify-center py-10 text-center"
    >
      <Calendar class="mb-3 size-10 text-muted-foreground/40" :stroke-width="1.5" />
      <p class="text-sm text-muted-foreground">还没有到达记录，点击上方添加</p>
    </div>

    <!-- 记录列表 -->
    <div v-else class="space-y-2">
      <div
        v-for="record in sortedRecords"
        :key="record.id"
        class="group relative overflow-hidden rounded-xl border border-border/40 bg-card/50 px-3 py-2.5 transition-colors hover:border-border hover:bg-card"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <!-- 日期：单行，空间不足时整行换行而非单个日期折行 -->
            <div class="text-sm font-medium text-foreground">
              <span class="inline-flex flex-wrap items-center gap-1">
                <span class="tabular-nums whitespace-nowrap">{{ record.startDate }}</span>
                <template v-if="record.endDate">
                  <span class="text-muted-foreground">—</span>
                  <span class="tabular-nums whitespace-nowrap">{{ record.endDate }}</span>
                </template>
              </span>
            </div>
            <!-- 备注 -->
            <p
              v-if="record.note"
              class="mt-1 truncate text-xs text-muted-foreground"
              :title="record.note"
            >
              {{ record.note }}
            </p>
          </div>

          <!-- hover 操作 -->
          <div class="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon-xs"
              class="hover:bg-background hover:text-primary"
              title="编辑"
              @click="handleEdit(record)"
            >
              <Pencil class="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              class="hover:bg-background hover:text-destructive"
              title="删除"
              @click="handleDelete(record)"
            >
              <Trash2 class="size-3.5" />
            </Button>
          </div>
        </div>

        <!-- 底部：目的标签独立一行 -->
        <div class="mt-1.5 flex items-center gap-1.5">
          <span
            class="inline-flex shrink-0 items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
          >
            {{ record.purpose }}
          </span>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      v-model:visible="confirmVisible"
      title="删除确认"
      description="确定要删除这条到达记录吗？删除后无法恢复。"
      confirm-text="删除"
      cancel-text="取消"
      danger
      @confirm="handleConfirmDelete"
      @cancel="handleCancelDelete"
    />
  </div>
</template>
