<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessageBox } from 'element-plus'
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

/**
 * 删除行程：三选项确认
 * - 确认按钮（保留记录）→ deleteRecords: false
 * - 取消按钮（同步删除记录）→ deleteRecords: true
 * - 关闭（X/Esc）→ 用户取消，不 emit
 */
function handleDelete(): void {
  ElMessageBox.confirm(
    `确定要删除行程「${props.trip.name}」吗？\n关联的 ${recordCount.value} 条到达记录可保留（解绑行程）或同步删除。`,
    '删除行程',
    {
      distinguishCancelAndClose: true,
      confirmButtonText: '保留记录',
      cancelButtonText: '同步删除记录',
      cancelButtonClass: 'el-button--danger',
      type: 'warning',
    },
  )
    .then(() => {
      // confirm = 保留记录
      emit('delete', props.trip, { deleteRecords: false })
    })
    .catch((action: string) => {
      if (action === 'cancel') {
        // cancel = 同步删除记录
        emit('delete', props.trip, { deleteRecords: true })
      }
      // action === 'close' 表示用户关闭，不做处理
    })
}
</script>

<template>
  <div
    class="trip-card rounded-lg border border-slate-100 bg-white transition-colors hover:border-slate-200"
  >
    <!-- 卡片头部 -->
    <div class="px-4 py-3">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <h3 class="truncate text-sm font-semibold text-slate-800">
            {{ trip.name }}
          </h3>
          <p class="mt-0.5 text-xs text-slate-400">
            {{ dateRangeText }}
          </p>
        </div>

        <!-- 操作按钮 -->
        <div class="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            class="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-50 hover:text-warm"
            :title="expanded ? '收起' : '展开'"
            @click="toggleExpand"
          >
            <svg
              class="h-3.5 w-3.5 transition-transform"
              :class="expanded ? 'rotate-180' : ''"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button
            v-if="!readonly"
            type="button"
            class="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-50 hover:text-warm"
            title="编辑"
            @click="handleEdit"
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
            v-if="!readonly"
            type="button"
            class="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-50 hover:text-red-500"
            title="删除"
            @click="handleDelete"
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

      <!-- 统计徽章 -->
      <div class="mt-2 flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1 rounded-full bg-warm/5 px-2 py-0.5 text-xs text-warm"
        >
          <svg
            class="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {{ cityCount }} 城
        </span>
        <span
          class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
        >
          <svg
            class="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {{ recordCount }} 条记录
        </span>
      </div>
    </div>

    <!-- 展开区域：关联记录列表 -->
    <div
      v-if="expanded"
      class="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5"
    >
      <div v-if="sortedRecords.length === 0" class="py-3 text-center text-xs text-slate-400">
        暂无关联记录
      </div>
      <div v-else class="space-y-1.5">
        <div
          v-for="record in sortedRecords"
          :key="record.id"
          class="flex items-center justify-between gap-2 rounded-md bg-white px-2.5 py-1.5"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-1.5">
              <span class="truncate text-xs font-medium text-slate-700">
                {{ record.cityName }}
              </span>
              <span class="shrink-0 text-[11px] text-slate-400">
                {{ record.startDate }}<template v-if="record.endDate"> — {{ record.endDate }}</template>
              </span>
            </div>
            <p v-if="record.note" class="mt-0.5 truncate text-[11px] text-slate-400" :title="record.note">
              {{ record.note }}
            </p>
          </div>
          <span class="shrink-0 rounded-full bg-warm/5 px-1.5 py-0.5 text-[11px] text-warm">
            {{ record.purpose }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
