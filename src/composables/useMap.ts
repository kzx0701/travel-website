import { computed, ref } from 'vue'
import type { City, MapLevel, Province } from '@/types'
import { cities, cityMap, getCityByCode, getProvinceByCode, provinceMap } from '@/data/cities'

/**
 * useMap - 地图状态管理 composable
 *
 * 封装三级地图（country / province / city）的当前层级、当前省份/城市、
 * 下钻与回退逻辑，以及当前应加载的地图配置。
 *
 * 使用方式：
 *   const { currentLevel, currentProvince, currentCity, drillDown, navigateBack, mapConfig } = useMap()
 */
export function useMap() {
  /** 当前地图层级 */
  const currentLevel = ref<MapLevel>('country')

  /** 当前省份（province/city 级时有值） */
  const currentProvince = ref<Province | null>(null)

  /** 当前城市（city 级时有值） */
  const currentCity = ref<City | null>(null)

  /**
   * 当前应加载的地图配置（供 BaseMap 的 level / regionCode 使用）
   */
  const mapConfig = computed(() => {
    if (currentLevel.value === 'country') {
      return { level: 'country' as MapLevel, regionCode: '' }
    }
    if (currentLevel.value === 'province') {
      return {
        level: 'province' as MapLevel,
        regionCode: currentProvince.value?.code ?? '',
      }
    }
    return {
      level: 'city' as MapLevel,
      regionCode: currentCity.value?.code ?? '',
    }
  })

  /**
   * 面包屑展示用的省份/城市名
   */
  const breadcrumbNames = computed(() => ({
    provinceName: currentProvince.value?.name ?? '',
    cityName: currentCity.value?.name ?? '',
  }))

  /**
   * 下钻到指定省份或城市
   * - 传入省份 adcode：从 country → province
   * - 传入城市 adcode：从 province → city（若当前在 country，则自动先设置省份）
   *
   * @param code 省份或城市的 6 位 adcode
   * @returns 是否下钻成功
   */
  function drillDown(code: string): boolean {
    // 尝试作为省份下钻
    const province = getProvinceByCode(code)
    if (province) {
      currentLevel.value = 'province'
      currentProvince.value = province
      currentCity.value = null
      return true
    }

    // 尝试作为城市下钻
    const city = getCityByCode(code)
    if (city) {
      const parentProvince = getProvinceByCode(city.provinceCode) ?? null
      currentLevel.value = 'city'
      currentProvince.value = parentProvince
      currentCity.value = city
      return true
    }

    console.warn(`[useMap] drillDown 失败，未知的行政区划编码: ${code}`)
    return false
  }

  /**
   * 通过省份名下钻（用于 GeoJSON region 点击交互，仅有名称无 adcode 的场景）
   */
  function drillDownByName(name: string): boolean {
    const province = Object.values(provinceMap).find((p) => p.name === name)
    if (province) return drillDown(province.code)

    const city = cities.find((c) => c.name === name)
    if (city) return drillDown(city.code)

    console.warn(`[useMap] drillDownByName 失败，未匹配到省/市: ${name}`)
    return false
  }

  /**
   * 回退到指定层级（默认回退一级）
   * @param targetLevel 目标层级；不传则回退一级
   */
  function navigateBack(targetLevel?: MapLevel): void {
    if (targetLevel) {
      currentLevel.value = targetLevel
      if (targetLevel === 'country') {
        currentProvince.value = null
        currentCity.value = null
      } else if (targetLevel === 'province') {
        currentCity.value = null
      }
      return
    }

    // 自动回退一级
    if (currentLevel.value === 'city') {
      currentLevel.value = 'province'
      currentCity.value = null
    } else if (currentLevel.value === 'province') {
      currentLevel.value = 'country'
      currentProvince.value = null
      currentCity.value = null
    }
  }

  /**
   * 重置到全国级
   */
  function resetToCountry(): void {
    currentLevel.value = 'country'
    currentProvince.value = null
    currentCity.value = null
  }

  return {
    currentLevel,
    currentProvince,
    currentCity,
    mapConfig,
    breadcrumbNames,
    drillDown,
    drillDownByName,
    navigateBack,
    resetToCountry,
    // 数据快捷访问
    cities,
    cityMap,
    provinceMap,
  }
}
