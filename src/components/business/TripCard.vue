<script setup lang="ts">
import { ref, computed } from 'vue'
import { Calendar, ChevronDown, MapPin, Pencil, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Trip, VisitRecord } from '@/types'

/**
 * TripCard - 行程卡片组件
 *
 * 用于个人主页/统计页的行程列表展示。
 * - 卡片头部：行程名 + 日期范围 + 城市数 + 记录数 + 操作按钮（展开/编辑/删除）
 * - 展开后显示关联记录列表（城市/日期/目的），records 由父组件传入
 * - 删除时弹出三选项确认（保留记录/同步删除记录/取消）
 *
 * Props:
 *  - trip: 行程（含 recordCount/cityCount 聚合）
 *  - records?: 关联记录列表（可选，用于展开详情）
 *  - readonly?: 只读模式，隐藏编辑/删除按钮（用于统计页等查看场景）
 * Emits:
 *  - expand(trip)
 *  - edit(trip)
 *  - delete(trip, option)
 */
const props = withDefaults(
  defineProps<{
    trip: Trip
    records?: VisitRecord[]
    readonly?: boolean
  }>(),
  {
    records: () => [],
    readonly: false,
  },
)

const emit = defineEmits<{
  expand: [trip: Trip]
  edit: [trip: Trip]
  delete: [trip: Trip, option: { deleteRecords: boolean }]
}>()

const expanded = ref(false)

const dateRangeText = computed(() => {
  if (props.trip.endDate) {
    return `${props.trip.startDate} — ${props.trip.endDate}`
  }
  return props.trip.startDate
})

const recordCount = computed(() => props.trip.recordCount ?? 0)
const cityCount = computed(() => props.trip.cityCount ?? 0)

// 展开时按起始日期倒序展示关联记录
const sortedRecords = computed(() =>
  [...props.records].sort((a, b) => b.startDate.localeCompare(a.startDate)),
)

function toggleExpand(): void {
  expanded.value = !expanded.value
  if (expanded.value) emit('expand', props.trip)
}

function handleEdit(): void {
  emit('edit', props.trip)
}

// ---- 删除行程：三选项确认（声明式 AlertDialog） ----
const deleteVisible = ref(false)

const deleteDescription = computed(
  () =>
    `确定要删除行程「${props.trip.name}」吗？\n关联的 ${recordCount.value} 条到达记录可保留（解绑行程）或同步删除。`,
)

function handleDelete(): void {
  deleteVisible.value = true
}

function handleKeepRecords(): void {
  // AlertDialogAction 会自动关闭对话框
  emit('delete', props.trip, { deleteRecords: false })
}

function handleSyncDelete(): void {
  emit('delete', props.trip, { deleteRecords: true })
}
</script>

<template>
  <div
    class="trip-card rounded-lg border border-border bg-card transition-colors hover:border-border"
  >
    <!-- 卡片头部 -->
    <div class="px-4 py-3">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <h3 class="truncate text-sm font-semibold text-foreground">
            {{ trip.name }}
          </h3>
          <p class="mt-0.5 text-xs text-muted-foreground">
            {{ dateRangeText }}
          </p>
        </div>

        <!-- 操作按钮 -->
        <div class="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            class="size-6 hover:bg-muted hover:text-primary"
            :title="expanded ? '收起' : '展开'"
            @click="toggleExpand"
          >
            <ChevronDown
              class="h-3.5 w-3.5 transition-transform"
              :class="expanded ? 'rotate-180' : ''"
            />
          </Button>
          <Button
            v-if="!readonly"
            variant="ghost"
            size="icon-sm"
            class="size-6 hover:bg-muted hover:text-primary"
            title="编辑"
            @click="handleEdit"
          >
            <Pencil class="h-3.5 w-3.5" />
          </Button>
          <Button
            v-if="!readonly"
            variant="ghost"
            size="icon-sm"
            class="size-6 hover:bg-muted hover:text-destructive"
            title="删除"
            @click="handleDelete"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <!-- 统计徽章 -->
      <div class="mt-2 flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
        >
          <MapPin class="h-3 w-3" />
          {{ cityCount }} 城
        </span>
        <span
          class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
        >
          <Calendar class="h-3 w-3" />
          {{ recordCount }} 条记录
        </span>
      </div>
    </div>

    <!-- 展开区域：关联记录列表 -->
    <div v-if="expanded" class="border-t border-border bg-muted/50 px-4 py-2.5">
      <div v-if="sortedRecords.length === 0" class="py-3 text-center text-xs text-muted-foreground">
        暂无关联记录
      </div>
      <div v-else class="space-y-1.5">
        <div
          v-for="record in sortedRecords"
          :key="record.id"
          class="flex items-center justify-between gap-2 rounded-md bg-card px-2.5 py-1.5"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-1.5">
              <span class="truncate text-xs font-medium text-foreground">
                {{ record.cityName }}
              </span>
              <span class="shrink-0 text-[11px] text-muted-foreground">
                {{ record.startDate
                }}<template v-if="record.endDate"> — {{ record.endDate }}</template>
              </span>
            </div>
            <p
              v-if="record.note"
              class="mt-0.5 truncate text-[11px] text-muted-foreground"
              :title="record.note"
            >
              {{ record.note }}
            </p>
          </div>
          <span
            class="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground"
          >
            {{ record.purpose }}
          </span>
        </div>
      </div>
    </div>

    <!-- 删除行程三选一确认 -->
    <AlertDialog :open="deleteVisible" @update:open="(v) => (deleteVisible = v)">
      <AlertDialogContent class="max-w-[420px]">
        <AlertDialogHeader>
          <AlertDialogTitle>删除行程</AlertDialogTitle>
          <AlertDialogDescription class="whitespace-pre-line leading-relaxed">
            {{ deleteDescription }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter class="sm:flex-col-reverse sm:gap-2">
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction @click="handleKeepRecords"> 保留记录 </AlertDialogAction>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="handleSyncDelete"
          >
            同步删除记录
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
