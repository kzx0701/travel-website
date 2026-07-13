<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import MapBreadcrumb from './MapBreadcrumb.vue'
import RecordList from './RecordList.vue'
import RecordForm from './RecordForm.vue'
import { useMapStore } from '@/stores/map'
import { useVisitRecordStore } from '@/stores/visitRecord'
import { useResidenceStore } from '@/stores/residence'
import { usePurposeStore } from '@/stores/purpose'
import type { MapLevel, VisitRecord } from '@/types'
import type { VisitRecordInput } from '@/api/visitRecord'

/**
 * RightPanel - 右侧信息区
 *
 * 三态切换：
 * - default：面包屑 + 引导提示 + 常驻"添加记录"按钮
 * - detail：城市名 + 所属省份 + 到达次数 + RecordList + 添加按钮
 * - form：RecordForm（新增 / 编辑）
 */
const mapStore = useMapStore()
const visitRecordStore = useVisitRecordStore()
const residenceStore = useResidenceStore()
const purposeStore = usePurposeStore()
const router = useRouter()

/** 当前正在编辑的记录（form 模式编辑时使用） */
const editingRecord = ref<VisitRecord | null>(null)

/** 是否未设置居住地（用于默认态引导提示） */
const hasNoResidence = computed(
  () => !residenceStore.residence && !residenceStore.loading,
)

/** 当前选中城市是否为居住地（居住地不可点亮） */
const isResidenceCity = computed(
  () =>
    !!mapStore.selectedCity &&
    mapStore.selectedCity.code === residenceStore.residenceCityCode,
)

function handleGotoSettings(): void {
  router.push('/settings')
}

/** 当前选中城市的到达记录列表 */
const selectedCityRecords = computed(() => {
  const city = mapStore.selectedCity
  if (!city) return []
  return visitRecordStore.records.filter((r) => r.cityCode === city.code)
})

const selectedCityCount = computed(
  () =>
    visitRecordStore.cityVisitCount[mapStore.selectedCity?.code ?? ''] ?? 0,
)

/** 是否为该城市的第一条记录（决定按钮文案"点亮城市" vs "添加记录"） */
const isFirstRecord = computed(() => selectedCityRecords.value.length === 0)

/** 表单模式标题 */
const formTitle = computed(() =>
  editingRecord.value ? '编辑记录' : '添加到达记录',
)

function handleNavigate(level: MapLevel): void {
  mapStore.navigateBack(level)
}

// ---- 切换到 form 模式 ----
function switchToCreateMode(): void {
  editingRecord.value = null
  mapStore.rightPanelMode = 'form'
}

function switchToEditMode(record: VisitRecord): void {
  editingRecord.value = record
  mapStore.rightPanelMode = 'form'
}

// ---- default / detail 态的添加按钮 ----
function handleAddRecord(): void {
  if (!mapStore.selectedCity) {
    ElMessage.info('请先在地图上选择一个城市')
    return
  }
  if (isResidenceCity.value) {
    ElMessage.info('居住地所在城市无需点亮')
    return
  }
  switchToCreateMode()
}

function handleBackToDetail(): void {
  mapStore.rightPanelMode = 'detail'
  editingRecord.value = null
}

// ---- 表单提交 ----
async function handleFormSubmit(data: VisitRecordInput): Promise<void> {
  if (!mapStore.selectedCity) return
  // 在调用 store 之前捕获首次标记，避免 records 更新后失效
  const wasFirstRecord = isFirstRecord.value
  const isEditing = !!editingRecord.value
  try {
    if (isEditing && editingRecord.value) {
      await visitRecordStore.update(editingRecord.value.id, data)
      ElMessage.success('记录已更新')
    } else {
      await visitRecordStore.create(data)
      ElMessage.success(wasFirstRecord ? '已点亮城市' : '记录已添加')
    }
    // 切回详情态
    mapStore.rightPanelMode = 'detail'
    editingRecord.value = null
    // 刷新目的列表（用户新建分类时已即时更新，这里冗余一次保险）
    if (purposeStore.categories.length === 0) {
      await purposeStore.loadAll()
    }
  } catch (e) {
    ElMessage.error(isEditing ? '更新失败' : '添加失败')
    console.error(e)
  }
}

function handleFormCancel(): void {
  mapStore.rightPanelMode = 'detail'
  editingRecord.value = null
}

// ---- 列表删除 ----
async function handleRecordDelete(record: VisitRecord): Promise<void> {
  // 在删除前预判是否会变成该城市最后一条记录
  const cityCode = mapStore.selectedCity?.code ?? ''
  const wasLast =
    cityCode !== '' && (visitRecordStore.cityVisitCount[cityCode] ?? 0) <= 1
  try {
    await visitRecordStore.remove(record.id)
    ElMessage.success(
      wasLast ? '已删除记录，该城市已无到达记录，已取消点亮' : '已删除记录',
    )
  } catch (e) {
    ElMessage.error('删除失败')
    console.error(e)
  }
}

function handleRecordEdit(record: VisitRecord): void {
  switchToEditMode(record)
}
</script>

<template>
  <!-- 默认态 -->
  <div
    v-if="mapStore.rightPanelMode === 'default'"
    class="flex h-full flex-col"
  >
    <div class="border-b border-slate-100 px-4 py-2.5">
      <MapBreadcrumb
        :level="mapStore.currentLevel"
        :province-name="mapStore.breadcrumbNames.provinceName"
        :city-name="mapStore.breadcrumbNames.cityName"
        @navigate="handleNavigate"
      />
    </div>
    <div
      class="flex flex-1 flex-col items-center justify-center px-8 text-center"
    >
      <div
        class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warm/5"
      >
        <svg
          class="h-7 w-7 text-warm/60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74" />
          <path d="M14 11.24V7.5a2.5 2.5 0 0 0-5 0v3.74a4 4 0 1 0 5 0Z" />
        </svg>
      </div>
      <p class="text-sm font-medium text-slate-600">
        点击地图上的城市查看详情
      </p>
      <p class="mt-1 text-xs text-slate-400">或使用左侧搜索快速定位</p>
    </div>

    <!-- 常驻添加记录按钮 -->
    <div class="shrink-0 px-4 pb-3">
      <button
        type="button"
        class="flex w-full items-center justify-center gap-1.5 rounded-lg bg-warm py-2.5 text-sm font-semibold text-white transition-colors hover:bg-warm/90"
        @click="handleAddRecord"
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        添加到达记录
      </button>
      <p v-if="!mapStore.selectedCity" class="mt-1.5 text-center text-xs text-slate-400">
        请先选择城市
      </p>
    </div>

    <!-- 未设置居住地引导提示 -->
    <button
      v-if="hasNoResidence"
      type="button"
      class="mb-4 mx-4 flex w-auto items-center gap-3 rounded-lg border border-cool/20 bg-cool/5 px-4 py-3 text-left transition-colors hover:border-cool/40 hover:bg-cool/10"
      @click="handleGotoSettings"
    >
      <svg
        class="h-5 w-5 shrink-0 text-cool"
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
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-cool">未设置居住地</p>
        <p class="mt-0.5 text-xs text-cool/70">
          前往设置，居住地所在城市将不被点亮
        </p>
      </div>
      <svg
        class="h-4 w-4 shrink-0 text-cool/60"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  </div>

  <!-- 城市详情态 -->
  <div
    v-else-if="mapStore.rightPanelMode === 'detail' && mapStore.selectedCity"
    class="flex h-full flex-col"
  >
    <div class="shrink-0 border-b border-slate-100 px-5 py-4">
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-xl font-bold tracking-tight text-slate-800">
            {{ mapStore.selectedCity.name }}
          </h2>
          <p class="mt-0.5 text-xs text-slate-400">
            {{ mapStore.selectedCity.provinceName }}
          </p>
        </div>
        <span
          v-if="isResidenceCity"
          class="inline-flex h-7 items-center rounded-full bg-cool/10 px-3 text-sm font-bold text-cool"
        >
          居住地
        </span>
        <span
          v-else
          class="inline-flex h-7 items-center rounded-full bg-warm/10 px-3 text-sm font-bold text-warm tabular-nums"
        >
          {{ selectedCityCount }} 次
        </span>
      </div>

      <!-- 居住地提示（不可点亮） -->
      <div
        v-if="isResidenceCity"
        class="mt-3 rounded-lg bg-cool/5 px-3 py-2.5 text-xs text-cool"
      >
        这是你的居住地所在城市，无需点亮
      </div>

      <!-- 非居住地才显示添加按钮 -->
      <button
        v-else
        type="button"
        class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-warm py-2 text-sm font-medium text-white transition-colors hover:bg-warm/90"
        @click="switchToCreateMode"
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        添加到达记录
      </button>
    </div>

    <!-- 记录列表 -->
    <div class="flex-1 overflow-y-auto px-4 py-3">
      <RecordList
        :records="selectedCityRecords"
        :loading="visitRecordStore.loading"
        @edit="handleRecordEdit"
        @delete="handleRecordDelete"
      />
    </div>
  </div>

  <!-- 记录表单态 -->
  <div
    v-else-if="mapStore.rightPanelMode === 'form' && mapStore.selectedCity"
    class="flex h-full flex-col"
  >
    <RecordForm
      :key="editingRecord?.id ?? 'create'"
      :city="mapStore.selectedCity"
      :record="editingRecord ?? undefined"
      :is-first="isFirstRecord"
      @submit="handleFormSubmit"
      @cancel="handleFormCancel"
    />
  </div>

  <!-- 兜底：form 态但无选中城市，回退到默认态 -->
  <div v-else class="flex h-full flex-col">
    <div class="border-b border-slate-100 px-4 py-2.5">
      <span class="text-sm font-semibold text-slate-700">{{ formTitle }}</span>
    </div>
    <div
      class="flex flex-1 flex-col items-center justify-center px-8 text-center"
    >
      <p class="text-sm text-slate-400">请先选择城市</p>
      <button
        type="button"
        class="mt-3 rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50"
        @click="handleBackToDetail"
      >
        返回
      </button>
    </div>
  </div>
</template>
