<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, ChevronRight, MapPin } from '@lucide/vue'
import MapLayout from '@/components/layout/MapLayout.vue'
import CitySearch from '@/components/business/CitySearch.vue'
import CityList from '@/components/business/CityList.vue'
import StatCard from '@/components/business/StatCard.vue'
import BaseMap from '@/components/business/BaseMap.vue'
import MapBreadcrumb from '@/components/business/MapBreadcrumb.vue'
import RightPanel from '@/components/business/RightPanel.vue'
import TripCreateDialog from '@/components/business/TripCreateDialog.vue'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
import { useMapStore, type CityFilter } from '@/stores/map'
import { useVisitRecordStore } from '@/stores/visitRecord'
import { useResidenceStore } from '@/stores/residence'
import { useTripStore } from '@/stores/trip'
import type { City, CitySortKey, DatePrecision, MapLevel } from '@/types'

const mapStore = useMapStore()
const visitRecordStore = useVisitRecordStore()
const residenceStore = useResidenceStore()
const tripStore = useTripStore()
const router = useRouter()

/** 是否未设置居住地（用于左侧引导提示） */
const hasNoResidence = computed(() => !residenceStore.residence && !residenceStore.loading)

function handleGotoSettings(): void {
  router.push('/settings')
}

// 地图组件实例引用，用于直接调用 unfocus 重新聚焦
const baseMapRef = ref<InstanceType<typeof BaseMap> | null>(null)

// ---- 初始化加载 ----
onMounted(async () => {
  try {
    await Promise.all([visitRecordStore.loadAll(), residenceStore.load()])
  } catch (e) {
    toast.error('地图数据加载失败，请刷新重试')
    console.error(e)
  }
})

// ---- 派生数据 ----
const stats = computed(() => visitRecordStore.stats)
const residenceCityCode = computed(() => residenceStore.residenceCityCode)

/** 按筛选条件过滤后的已点亮城市 */
const filteredCities = computed<City[]>(() => {
  const filter: CityFilter = mapStore.cityFilter
  let result = visitRecordStore.litCities

  if (filter.provinceCode) {
    result = result.filter((c) => c.provinceCode === filter.provinceCode)
  }
  if (filter.purpose || filter.dateRange) {
    const validCodes = new Set<string>()
    for (const r of visitRecordStore.records) {
      if (filter.purpose && r.purpose !== filter.purpose) continue
      if (filter.dateRange) {
        const [start, end] = filter.dateRange
        if (r.startDate < start || r.startDate > end) continue
      }
      validCodes.add(r.cityCode)
    }
    result = result.filter((c) => validCodes.has(c.code))
  }
  return result
})

// ---- 事件处理 ----
function focusAndSelectCity(city: City): void {
  mapStore.drillDown(city.code)
  mapStore.selectCity(city)
}

function handleSearchSelect(city: City): void {
  // 搜索选中：下钻到该城市市级 + 选中城市 + 切到详情态
  focusAndSelectCity(city)
}

function handleCityClick(city: City): void {
  // 地图点击城市：下钻到城市级 + 选中并切到详情态
  focusAndSelectCity(city)
}

function handleCityListSelect(city: City): void {
  // 左侧列表点击城市名：下钻到城市级 + 选中并切到详情态
  focusAndSelectCity(city)
}

function handleCityListAdd(city: City): void {
  // 左侧列表 "+" 按钮：下钻到城市级 + 选中城市并切到表单态
  focusAndSelectCity(city)
  mapStore.rightPanelMode = 'form'
}

function handleRegionClick(code: string): void {
  // 点击省份切换：离开城市级，清除城市选中，右侧面板随之隐藏
  mapStore.clearSelection()
  mapStore.drillDown(code)
}

function handleBreadcrumbNavigate(level: MapLevel): void {
  // 离开城市级时清除城市选中，右侧面板随之隐藏
  if (level !== 'city') {
    mapStore.clearSelection()
  }
  // 记录调用前的层级：若已在 country 级点"中国"，navigateBack 不会改变 level，
  // BaseMap 的 watch 不会触发，需手动调用 unfocus 重新聚焦
  const wasCountry = mapStore.currentLevel === 'country'
  mapStore.navigateBack(level)
  if (level === 'country' && wasCountry) {
    baseMapRef.value?.unfocus()
  }
}

function handleSortChange(key: CitySortKey): void {
  mapStore.setSortKey(key)
}

function handleFilterChange(filter: CityFilter): void {
  mapStore.setFilter(filter)
}

// ---- 添加行程 ----
const tripDialogVisible = ref(false)
const tripCreating = ref(false)

/**
 * 创建行程并为涉及城市批量建立关联记录：
 *  1. tripStore.create 建行程
 *  2. 为每个城市 visitRecordStore.create 一条带 tripId 的到达记录
 *  3. 城市经 litCities computed 自动点亮，并关联到该行程
 */
async function handleTripSubmit(data: {
  name: string
  startDate: string
  endDate: string | null
  datePrecision: DatePrecision
  purpose: string
  cities: City[]
}): Promise<void> {
  tripCreating.value = true
  try {
    const trip = await tripStore.create({
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
    })
    const results = await Promise.allSettled(
      data.cities.map((city) =>
        visitRecordStore.create({
          cityCode: city.code,
          cityName: city.name,
          provinceCode: city.provinceCode,
          provinceName: city.provinceName,
          startDate: data.startDate,
          endDate: data.endDate,
          datePrecision: data.datePrecision,
          purpose: data.purpose,
          note: '',
          tripId: trip.id,
        }),
      ),
    )
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed === 0) {
      toast.success(`行程已创建，已点亮 ${data.cities.length} 个城市`)
    } else {
      toast.warning(
        `行程已创建，${data.cities.length - failed}/${data.cities.length} 个城市点亮成功`,
      )
    }
    tripDialogVisible.value = false
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '创建行程失败')
  } finally {
    tripCreating.value = false
  }
}
</script>

<template>
  <MapLayout>
    <!-- 左侧信息区 -->
    <template #left>
      <div class="flex h-full flex-col">
        <!-- 城市搜索 -->
        <div class="p-4 pb-3">
          <CitySearch @select="handleSearchSelect" />
        </div>

        <!-- 快捷统计 -->
        <div class="mx-4 mb-3 flex items-center rounded-lg border border-border/60 bg-card/60 p-3">
          <StatCard label="点亮国家" :value="stats.litCountryCount" />
          <Separator orientation="vertical" class="mx-1 h-8" />
          <StatCard label="点亮城市" :value="stats.litCityCount" />
          <Separator orientation="vertical" class="mx-1 h-8" />
          <StatCard label="出行次数" :value="stats.totalTripCount" />
        </div>

        <!-- 未设置居住地引导（迁自右侧面板默认态） -->
        <Button
          v-if="hasNoResidence"
          variant="outline"
          class="mx-4 mb-3 flex h-auto items-center gap-3 px-4 py-3 text-left"
          @click="handleGotoSettings"
        >
          <MapPin class="size-5 shrink-0 text-primary" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-primary">未设置居住地</p>
            <p class="mt-0.5 text-xs text-muted-foreground">前往设置，居住地所在城市将不被点亮</p>
          </div>
          <ChevronRight class="size-4 shrink-0 text-muted-foreground/60" />
        </Button>

        <!-- 城市列表 -->
        <div class="min-h-0 flex-1">
          <CityList
            :cities="filteredCities"
            :city-visit-count="visitRecordStore.cityVisitCount"
            :residence-city-code="residenceCityCode"
            :sort-key="mapStore.citySortKey"
            :city-last-visit="visitRecordStore.cityLastVisit"
            @select="handleCityListSelect"
            @add="handleCityListAdd"
            @change-sort="handleSortChange"
            @change-filter="handleFilterChange"
          />
        </div>

        <!-- 添加行程：跨城市的全局动作，放在左侧面板底部 -->
        <div class="shrink-0 border-t border-border/60 px-4 py-3">
          <Button class="w-full" @click="tripDialogVisible = true">
            <Plus class="size-4" />
            添加行程
          </Button>
        </div>

        <!-- 添加行程对话框（teleport 到 body） -->
        <TripCreateDialog
          v-model:visible="tripDialogVisible"
          :loading="tripCreating"
          @submit="handleTripSubmit"
        />
      </div>
    </template>

    <!-- 中地图区：地图占满，面包屑悬浮其上 -->
    <div class="relative flex-1 overflow-hidden">
      <!-- 地图 -->
      <BaseMap
        ref="baseMapRef"
        :level="mapStore.mapConfig.level"
        :region-code="mapStore.mapConfig.regionCode"
        :lit-cities="visitRecordStore.litCities"
        :city-visit-count="visitRecordStore.cityVisitCount"
        :residence-city-code="residenceCityCode"
        @city-click="handleCityClick"
        @region-click="handleRegionClick"
      />

      <!-- 面包屑：悬浮于地图左上角 -->
      <div
        class="pointer-events-auto absolute left-3 top-3 z-10 rounded-lg bg-background/90 px-3 py-1.5 shadow-sm ring-1 ring-border/60 backdrop-blur-md"
      >
        <MapBreadcrumb
          :level="mapStore.currentLevel"
          :province-name="mapStore.breadcrumbNames.provinceName"
          :city-name="mapStore.breadcrumbNames.cityName"
          @navigate="handleBreadcrumbNavigate"
        />
      </div>
    </div>

    <!-- 右侧信息区 -->
    <template #right>
      <RightPanel />
    </template>
  </MapLayout>
</template>
