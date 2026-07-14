<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { ChevronRight, MapPin, Plus } from '@lucide/vue'
import MapBreadcrumb from './MapBreadcrumb.vue'
import RecordList from './RecordList.vue'
import RecordForm from './RecordForm.vue'
import { Button } from '@/components/ui/button'
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
    toast('请先在地图上选择一个城市')
    return
  }
  if (isResidenceCity.value) {
    toast('居住地所在城市无需点亮')
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
      toast.success('记录已更新')
    } else {
      await visitRecordStore.create(data)
      toast.success(wasFirstRecord ? '已点亮城市' : '记录已添加')
    }
    // 切回详情态
    mapStore.rightPanelMode = 'detail'
    editingRecord.value = null
    // 刷新目的列表（用户新建分类时已即时更新，这里冗余一次保险）
    if (purposeStore.categories.length === 0) {
      await purposeStore.loadAll()
    }
  } catch (e) {
    toast.error(isEditing ? '更新失败' : '添加失败')
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
    toast.success(
      wasLast ? '已删除记录，该城市已无到达记录，已取消点亮' : '已删除记录',
    )
  } catch (e) {
    toast.error('删除失败')
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
        class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted"
      >
        <MapPin class="h-7 w-7 text-muted-foreground/60" />
      </div>
      <p class="text-sm font-medium text-slate-600">
        点击地图上的城市查看详情
      </p>
      <p class="mt-1 text-xs text-slate-400">或使用左侧搜索快速定位</p>
    </div>

    <!-- 常驻添加记录按钮 -->
    <div class="shrink-0 px-4 pb-3">
      <Button class="w-full" @click="handleAddRecord">
        <Plus class="h-4 w-4" />
        添加到达记录
      </Button>
      <p v-if="!mapStore.selectedCity" class="mt-1.5 text-center text-xs text-slate-400">
        请先选择城市
      </p>
    </div>

    <!-- 未设置居住地引导提示 -->
    <Button
      v-if="hasNoResidence"
      variant="outline"
      class="mb-4 mx-4 flex h-auto items-center gap-3 px-4 py-3 text-left"
      @click="handleGotoSettings"
    >
      <MapPin class="h-5 w-5 shrink-0 text-primary" />
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-primary">未设置居住地</p>
        <p class="mt-0.5 text-xs text-muted-foreground">
          前往设置，居住地所在城市将不被点亮
        </p>
      </div>
      <ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </Button>
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
          class="inline-flex h-7 items-center rounded-full bg-secondary px-3 text-sm font-bold text-secondary-foreground"
        >
          居住地
        </span>
        <span
          v-else
          class="inline-flex h-7 items-center rounded-full bg-secondary px-3 text-sm font-bold text-secondary-foreground tabular-nums"
        >
          {{ selectedCityCount }} 次
        </span>
      </div>

      <!-- 居住地提示（不可点亮） -->
      <div
        v-if="isResidenceCity"
        class="mt-3 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground"
      >
        这是你的居住地所在城市，无需点亮
      </div>

      <!-- 非居住地才显示添加按钮 -->
      <Button
        v-else
        class="mt-3 w-full"
        @click="switchToCreateMode"
      >
        <Plus class="h-4 w-4" />
        添加到达记录
      </Button>
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
      <Button
        variant="outline"
        size="sm"
        class="mt-3"
        @click="handleBackToDetail"
      >
        返回
      </Button>
    </div>
  </div>
</template>
