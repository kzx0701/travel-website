<script setup lang="ts">
import { computed, onMounted } from 'vue'
import MapLayout from '@/components/layout/MapLayout.vue'
import CitySearch from '@/components/business/CitySearch.vue'
import CityList from '@/components/business/CityList.vue'
import StatCard from '@/components/business/StatCard.vue'
import BaseMap from '@/components/business/BaseMap.vue'
import MapBreadcrumb from '@/components/business/MapBreadcrumb.vue'
import RightPanel from '@/components/business/RightPanel.vue'
import { useMapStore, type CityFilter } from '@/stores/map'
import { useVisitRecordStore } from '@/stores/visitRecord'
import { useResidenceStore } from '@/stores/residence'
import type { City, CitySortKey, MapLevel } from '@/types'

const mapStore = useMapStore()
const visitRecordStore = useVisitRecordStore()
const residenceStore = useResidenceStore()

// ---- 初始化加载 ----
onMounted(async () => {
  await Promise.all([
    visitRecordStore.loadAll(),
    residenceStore.load(),
  ])
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
function handleSearchSelect(city: City): void {
  // 搜索选中：下钻到该城市市级 + 选中城市 + 切到详情态
  mapStore.drillDown(city.code)
  mapStore.selectCity(city)
}

function handleCityClick(city: City): void {
  // 地图点击城市：选中并切到详情态
  mapStore.selectCity(city)
}

function handleCityListSelect(city: City): void {
  // 左侧列表点击城市名：选中并切到详情态
  mapStore.selectCity(city)
}

function handleCityListAdd(city: City): void {
  // 左侧列表 "+" 按钮：选中城市并切到表单态
  mapStore.selectCity(city)
  mapStore.rightPanelMode = 'form'
}

function handleRegionClick(code: string): void {
  mapStore.drillDown(code)
}

function handleBreadcrumbNavigate(level: MapLevel): void {
  mapStore.navigateBack(level)
}

function handleSortChange(key: CitySortKey): void {
  mapStore.setSortKey(key)
}

function handleFilterChange(filter: CityFilter): void {
  mapStore.setFilter(filter)
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
        <div class="flex gap-2 px-4 pb-3">
          <StatCard label="已点亮城" :value="stats.litCityCount" />
          <StatCard label="覆盖省" :value="stats.coveredProvinceCount" />
          <StatCard label="出行次" :value="stats.totalTripCount" />
        </div>

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
      </div>
    </template>

    <!-- 中地图区 -->
    <div class="flex h-full flex-col">
      <!-- 面包屑 -->
      <div class="shrink-0 border-b border-slate-100 px-4 py-2.5">
        <MapBreadcrumb
          :level="mapStore.currentLevel"
          :province-name="mapStore.breadcrumbNames.provinceName"
          :city-name="mapStore.breadcrumbNames.cityName"
          @navigate="handleBreadcrumbNavigate"
        />
      </div>

      <!-- 地图 -->
      <div class="min-h-0 flex-1">
        <BaseMap
          :level="mapStore.mapConfig.level"
          :region-code="mapStore.mapConfig.regionCode"
          :lit-cities="visitRecordStore.litCities"
          :city-visit-count="visitRecordStore.cityVisitCount"
          :residence-city-code="residenceCityCode"
          @city-click="handleCityClick"
          @region-click="handleRegionClick"
        />
      </div>
    </div>

    <!-- 右侧信息区 -->
    <template #right>
      <RightPanel />
    </template>
  </MapLayout>
</template>
