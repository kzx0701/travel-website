<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useTripStore } from '@/stores/trip'
import TripForm from './TripForm.vue'
import type { Trip } from '@/types'

/**
 * TripSelector - 行程选择器（用于 RecordForm）
 *
 * 下拉显示当前用户全部行程（名称 + 日期范围），含"不关联行程"选项。
 * 下拉底部"+ 新建行程"按钮 → 弹出 TripForm 创建 → 自动选中新建行程。
 *
 * Props:
 *  - modelValue?: string（trip_id，null/undefined 表示不关联）
 * Emits:
 *  - update:modelValue
 *  - change
 */
defineProps<{
  modelValue?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  change: [value: string | null]
}>()

const tripStore = useTripStore()

onMounted(async () => {
  if (tripStore.trips.length === 0) {
    try {
      await tripStore.loadAll()
    } catch (e) {
      // 行程加载失败不阻塞选择器使用
      console.error('行程加载失败', e)
    }
  }
})

function tripLabel(trip: Trip): string {
  const date = trip.endDate
    ? `${trip.startDate} — ${trip.endDate}`
    : trip.startDate
  return `${trip.name}（${date}）`
}

// "不关联行程" 选项使用空字符串作为哨兵值（el-option 不接受 null），
// 选中时映射回 null 对外 emit
const NONE_VALUE = ''

function handleChange(value: string | number | boolean): void {
  const v = value === NONE_VALUE ? null : String(value)
  emit('update:modelValue', v)
  emit('change', v)
}

// ---- 新建行程 ----
const createVisible = ref(false)
const creating = ref(false)

function openCreate(): void {
  createVisible.value = true
}

async function handleCreateSubmit(data: {
  name: string
  startDate: string
  endDate: string | null
}): Promise<void> {
  creating.value = true
  try {
    const trip = await tripStore.create({
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
    })
    // 自动选中新建行程
    emit('update:modelValue', trip.id)
    emit('change', trip.id)
    createVisible.value = false
    ElMessage.success('已新建行程')
  } catch (e) {
    ElMessage.error('新建行程失败')
    console.error(e)
  } finally {
    creating.value = false
  }
}

function handleCreateCancel(): void {
  // 仅关闭，无需额外处理
}
</script>

<template>
  <div class="trip-selector">
    <el-select
      :model-value="modelValue ?? NONE_VALUE"
      placeholder="选择已有行程或留空"
      class="w-full"
      :loading="tripStore.loading"
      @change="handleChange"
    >
      <!-- 不关联行程 -->
      <el-option label="不关联行程" :value="NONE_VALUE" />

      <el-option
        v-for="trip in tripStore.trips"
        :key="trip.id"
        :label="tripLabel(trip)"
        :value="trip.id"
      />

      <!-- 新建行程入口 -->
      <template #footer>
        <button
          type="button"
          class="flex w-full items-center justify-center gap-1 py-1.5 text-xs font-medium text-warm transition-colors hover:text-warm/80"
          @click="openCreate"
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
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建行程
        </button>
      </template>
    </el-select>

    <!-- 新建行程对话框 -->
    <TripForm
      :visible="createVisible"
      :loading="creating"
      @update:visible="(v) => (createVisible = v)"
      @submit="handleCreateSubmit"
      @cancel="handleCreateCancel"
    />
  </div>
</template>
