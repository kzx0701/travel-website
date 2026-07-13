import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useMap } from '@/composables/useMap'
import type { City, CitySortKey } from '@/types'

/** 城市列表筛选条件 */
export interface CityFilter {
  provinceCode?: string
  purpose?: string
  dateRange?: [string, string]
}

/** 右侧面板模式 */
export type RightPanelMode = 'default' | 'detail' | 'form'

/**
 * map store - 地图页全局状态
 *
 * 组合 useMap 的三级下钻状态 + 右侧面板状态 + 城市列表排序/筛选状态。
 * 组件应通过此 store 访问地图状态，不要直接调用 useMap（会创建独立状态）。
 */
export const useMapStore = defineStore('map', () => {
  // ---- 三级下钻状态（来自 useMap，单例） ----
  const {
    currentLevel,
    currentProvince,
    currentCity,
    mapConfig,
    breadcrumbNames,
    drillDown,
    drillDownByName,
    navigateBack,
    resetToCountry,
  } = useMap()

  // ---- 右侧面板状态 ----
  /** 当前选中的城市（右侧详情展示） */
  const selectedCity = ref<City | null>(null)
  /** 右侧面板模式 */
  const rightPanelMode = ref<RightPanelMode>('default')

  // ---- 城市列表排序/筛选 ----
  const citySortKey = ref<CitySortKey>('recent')
  const cityFilter = ref<CityFilter>({})

  // ---- Actions ----

  /** 选中城市，右侧切换到详情态 */
  function selectCity(city: City): void {
    selectedCity.value = city
    rightPanelMode.value = 'detail'
  }

  /** 清除选中，右侧回到默认态 */
  function clearSelection(): void {
    selectedCity.value = null
    rightPanelMode.value = 'default'
  }

  /** 设置排序方式 */
  function setSortKey(key: CitySortKey): void {
    citySortKey.value = key
  }

  /** 设置筛选条件（整体替换） */
  function setFilter(filter: CityFilter): void {
    cityFilter.value = filter
  }

  return {
    // 三级下钻
    currentLevel,
    currentProvince,
    currentCity,
    mapConfig,
    breadcrumbNames,
    drillDown,
    drillDownByName,
    navigateBack,
    resetToCountry,
    // 右侧面板
    selectedCity,
    rightPanelMode,
    // 排序/筛选
    citySortKey,
    cityFilter,
    // actions
    selectCity,
    clearSelection,
    setSortKey,
    setFilter,
  }
})
