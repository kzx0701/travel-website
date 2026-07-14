import { onBeforeUnmount, onMounted, ref, shallowRef, type Ref } from 'vue'
import * as echarts from 'echarts'
import type { City, MapLevel } from '@/types'
import { registerMapForLevel, getMapName } from '@/utils/mapGeoLoader'
import {
  MAP_COLORS,
  TIER_COLORS,
  getVisitColor,
  getVisitTier,
} from '@/utils/visitTier'

/**
 * BaseMap 组件的输入参数
 */
export interface UseMapChartParams {
  level: MapLevel
  regionCode?: string
  litCities: City[]
  cityVisitCount: Record<string, number>
  residenceCityCode?: string
  readonly?: boolean
}

/**
 * 地图点位数据项（scatter series 用）
 */
interface ScatterDataItem {
  name: string
  value: [number, number] // [longitude, latitude]
  cityCode: string
  provinceName: string
  visitCount: number
  isResidence: boolean
  isLit: boolean
  itemStyle: {
    color: string
    borderColor?: string
    borderWidth?: number
  }
  symbolSize: number
}

/**
 * 全国级各省色块数据项
 */
interface ProvinceRegionItem {
  name: string
  value: number
  provinceCode: string
}

/**
 * 事件回调签名
 */
export interface UseMapChartCallbacks {
  onCityClick?: (city: City) => void
  onRegionClick?: (code: string, name: string) => void
}

/**
 * ECharts 实例与渲染逻辑封装
 * 负责：实例生命周期、地图注册、option 构建、交互事件、缩放控制
 */
export function useMapChart(
  containerRef: Ref<HTMLElement | null>,
  params: Ref<UseMapChartParams>,
  callbacks: Ref<UseMapChartCallbacks>,
) {
  const chart = shallowRef<echarts.ECharts | null>(null)
  const loading = ref(false)
  const mapAvailable = ref(true)
  const currentZoom = ref(1)

  let resizeObserver: ResizeObserver | null = null

  /**
   * 构建 scatter 点位数据
   */
  function buildScatterData(): ScatterDataItem[] {
    const { litCities, cityVisitCount, residenceCityCode } = params.value
    const litCodeSet = new Set(litCities.map((c) => c.code))

    // 已点亮 + 居住地（居住地可能在 litCities 中也可能不在）
    const items: ScatterDataItem[] = []

    litCities.forEach((city) => {
      const isResidence = city.code === residenceCityCode
      const visitCount = cityVisitCount[city.code] ?? 1
      items.push({
        name: city.name,
        value: [city.longitude, city.latitude],
        cityCode: city.code,
        provinceName: city.provinceName,
        visitCount,
        isResidence,
        isLit: true,
        itemStyle: {
          color: isResidence ? MAP_COLORS.residence : getVisitColor(visitCount),
          borderColor: '#FFFFFF',
          borderWidth: 1.5,
        },
        symbolSize: isResidence ? 14 : getSymbolSize(visitCount),
      })
    })

    // 居住地若不在 litCities 中也单独绘制
    if (residenceCityCode && !litCodeSet.has(residenceCityCode)) {
      // 居住地数据需调用方提供坐标，此处通过 litCities 已覆盖
      // 若调用方未传居住地 city 数据则跳过
    }

    return items
  }

  /**
   * 根据到达次数计算点位大小
   */
  function getSymbolSize(visitCount: number): number {
    const tier = getVisitTier(visitCount)
    if (tier === 'high') return 12
    if (tier === 'mid') return 10
    return 8
  }

  /**
   * 构建全国级各省色块数据（按已点亮城市数加权）
   */
  function buildProvinceRegions(): ProvinceRegionItem[] {
    const { litCities } = params.value
    const countByProvince = new Map<string, number>()
    litCities.forEach((c) => {
      countByProvince.set(c.provinceCode, (countByProvince.get(c.provinceCode) ?? 0) + 1)
    })
    // name 用省份名（与 GeoJSON properties.name 匹配，去掉"省/市/自治区"后缀以提升匹配率）
    const provinceNameMap = new Map<string, { name: string; code: string }>()
    // 直接复用 litCities 中 provinceName
    litCities.forEach((c) => {
      if (!provinceNameMap.has(c.provinceCode)) {
        provinceNameMap.set(c.provinceCode, { name: c.provinceName, code: c.provinceCode })
      }
    })
    const items: ProvinceRegionItem[] = []
    provinceNameMap.forEach(({ name, code }) => {
      items.push({
        name,
        value: countByProvince.get(code) ?? 0,
        provinceCode: code,
      })
    })
    return items
  }

  /**
   * 构建 ECharts option
   * mapName 为 null 时降级为无底图的纯点位渲染（使用 cartesian2d 坐标系）
   */
  function buildOption(mapName: string | null): echarts.EChartsCoreOption {
    const { level, readonly: isReadonly } = params.value
    const scatterData = buildScatterData()
    const isCountryLevel = level === 'country'
    const hasMap = !!mapName

    const tooltipFormatter = (p: unknown) => {
      const evt = p as { name?: string; data?: ScatterDataItem }
      if (evt.data && typeof evt.data === 'object' && 'cityCode' in evt.data) {
        const d = evt.data as ScatterDataItem
        if (d.isResidence) return `${d.name}<br/>居住地`
        return `${d.name}<br/>到达 ${d.visitCount} 次`
      }
      return evt.name ?? ''
    }

    // 无地图降级：用 cartesian2d 坐标系渲染纯点位
    if (!hasMap) {
      return {
        backgroundColor: MAP_COLORS.background,
        tooltip: { trigger: 'item', formatter: tooltipFormatter },
        xAxis: { show: false, min: 70, max: 140 },
        yAxis: { show: false, min: 15, max: 55 },
        grid: { left: 0, right: 0, top: 0, bottom: 0 },
        series: [
          {
            name: 'cities',
            type: 'scatter',
            coordinateSystem: 'cartesian2d',
            data: scatterData.map((d) => ({
              name: d.name,
              value: [d.value[0], d.value[1]],
              cityCode: d.cityCode,
              provinceName: d.provinceName,
              visitCount: d.visitCount,
              isResidence: d.isResidence,
              isLit: d.isLit,
              itemStyle: d.itemStyle,
              symbolSize: d.symbolSize,
            })),
            zlevel: 2,
          },
        ],
      }
    }

    const option: echarts.EChartsCoreOption = {
      backgroundColor: MAP_COLORS.background,
      tooltip: {
        trigger: 'item',
        formatter: tooltipFormatter,
      },
      geo: {
        map: mapName ?? '',
        roam: isReadonly ? false : true,
        zoom: 1,
        scaleLimit: { min: 0.8, max: 8 },
        // 地图区域样式
        itemStyle: {
          areaColor: MAP_COLORS.unlit,
          borderColor: '#FFFFFF',
          borderWidth: 0.8,
        },
        emphasis: {
          itemStyle: {
            areaColor: '#FFE4D2',
            borderColor: '#FF6B35',
            borderWidth: 1.2,
          },
          label: { show: false },
        },
        select: { disabled: true },
        // 全国级点击省份下钻；省/市级点击不通过 geo 触发
        ...(isCountryLevel
          ? {
              regions: buildProvinceRegions().map((r) => ({
                name: r.name,
                itemStyle: {
                  areaColor: r.value > 0 ? '#FFD4B8' : MAP_COLORS.unlit,
                  borderColor: '#FFFFFF',
                },
              })),
            }
          : {}),
      },
      series: [
        // 全国级用 effectScatter 高亮居住地，普通 scatter 显示其他城市
        {
          name: 'cities',
          type: 'scatter',
          coordinateSystem: 'geo',
          data: scatterData.filter((d) => !d.isResidence),
          symbol:
            'path://M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z',
          symbolKeepAspect: true,
          label: {
            show: false,
          },
          emphasis: {
            scale: 1.4,
            label: {
              show: true,
              formatter: (p: unknown) => (p as { data?: ScatterDataItem }).data?.name ?? '',
              position: 'top',
              color: '#1F2937',
              fontSize: 12,
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: [3, 6],
              borderRadius: 4,
            },
          },
          zlevel: 2,
        },
        {
          name: 'residence',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: scatterData.filter((d) => d.isResidence),
          symbolSize: 14,
          rippleEffect: { brushType: 'stroke', scale: 3, period: 4 },
          showEffectOn: 'render',
          label: {
            show: true,
            formatter: (p: unknown) => (p as { data?: ScatterDataItem }).data?.name ?? '',
            position: 'top',
            color: '#3B82F6',
            fontSize: 12,
            fontWeight: 700,
            backgroundColor: 'rgba(255,255,255,0.9)',
            padding: [3, 6],
            borderRadius: 4,
          },
          itemStyle: {
            color: MAP_COLORS.residence,
            borderColor: '#FFFFFF',
            borderWidth: 2,
            shadowColor: 'rgba(59,130,246,0.5)',
            shadowBlur: 10,
          },
          zlevel: 3,
        },
      ],
    }

    return option
  }

  /**
   * 渲染地图（注册 GeoJSON + setOption）
   * GeoJSON 缺失时降级为无底图的纯点位渲染
   */
  async function renderChart(): Promise<void> {
    if (!chart.value) return
    loading.value = true
    try {
      const { level, regionCode } = params.value
      const mapName = await registerMapForLevel(level, regionCode)
      mapAvailable.value = !!mapName
      const option = buildOption(mapName)
      // notMerge: true 完全替换，避免 geo/cartesian2d 降级切换时配置残留
      chart.value.setOption(option, { notMerge: true })
      // 缓存 zoom 用于按钮控制
      const opt = chart.value.getOption() as { geo?: Array<{ zoom?: number }> }
      const zoom = opt?.geo?.[0]?.zoom
      if (typeof zoom === 'number') currentZoom.value = zoom
    } catch (err) {
      console.warn('[useMapChart] 渲染失败', err)
      mapAvailable.value = false
    } finally {
      loading.value = false
    }
  }

  /**
   * 仅更新数据（不重新注册地图，适用于 litCities 等变化）
   * GeoJSON 缺失时与 renderChart 保持一致，使用降级渲染
   */
  function updateData(): void {
    if (!chart.value) return
    const mapName = mapAvailable.value
      ? getMapName(params.value.level, params.value.regionCode)
      : null
    const option = buildOption(mapName)
    chart.value.setOption(option, { notMerge: true })
  }

  /**
   * 绑定交互事件
   */
  function bindEvents(): void {
    if (!chart.value) return
    // 点击城市点位（普通点亮城市）
    chart.value.on('click', 'series.cities', (evt: unknown) => {
      const e = evt as { data?: ScatterDataItem }
      if (e.data && callbacks.value.onCityClick) {
        const city: City = {
          code: e.data.cityCode,
          name: e.data.name,
          provinceCode: '',
          provinceName: e.data.provinceName,
          longitude: e.data.value[0],
          latitude: e.data.value[1],
          pinyin: '',
        }
        callbacks.value.onCityClick(city)
      }
    })
    // 点击居住地城市点位
    chart.value.on('click', 'series.residence', (evt: unknown) => {
      const e = evt as { data?: ScatterDataItem }
      if (e.data && callbacks.value.onCityClick) {
        const city: City = {
          code: e.data.cityCode,
          name: e.data.name,
          provinceCode: '',
          provinceName: e.data.provinceName,
          longitude: e.data.value[0],
          latitude: e.data.value[1],
          pinyin: '',
        }
        callbacks.value.onCityClick(city)
      }
    })
    // 全国级点击省份下钻（geo region 点击）
    chart.value.on('click', 'geo', (evt: unknown) => {
      const e = evt as { name?: string }
      if (params.value.level !== 'country') return
      if (params.value.readonly) return
      if (e.name && callbacks.value.onRegionClick) {
        // GeoJSON region 名称需调用方自行解析为省份 adcode
        callbacks.value.onRegionClick(e.name, e.name)
      }
    })
    // 同步缩放比例
    chart.value.on('georoam', () => {
      const opt = chart.value?.getOption()
      const zoom = (opt as { geo?: Array<{ zoom?: number }> })?.geo?.[0]?.zoom
      if (typeof zoom === 'number') currentZoom.value = zoom
    })
  }

  /**
   * 缩放控制
   */
  function zoomIn(): void {
    if (!chart.value) return
    currentZoom.value = Math.min(currentZoom.value * 1.3, 8)
    chart.value.setOption({
      geo: { zoom: currentZoom.value },
    })
  }

  function zoomOut(): void {
    if (!chart.value) return
    currentZoom.value = Math.max(currentZoom.value / 1.3, 0.8)
    chart.value.setOption({
      geo: { zoom: currentZoom.value },
    })
  }

  function resize(): void {
    chart.value?.resize()
  }

  /**
   * 初始化 ECharts 实例
   */
  function initChart(): void {
    if (!containerRef.value) return
    chart.value = echarts.init(containerRef.value)
    bindEvents()
    resizeObserver = new ResizeObserver(() => {
      chart.value?.resize()
    })
    resizeObserver.observe(containerRef.value)
  }

  /**
   * 销毁实例
   */
  function disposeChart(): void {
    resizeObserver?.disconnect()
    resizeObserver = null
    chart.value?.dispose()
    chart.value = null
  }

  onMounted(() => {
    initChart()
    renderChart()
  })

  onBeforeUnmount(() => {
    disposeChart()
  })

  return {
    chart,
    loading,
    mapAvailable,
    currentZoom,
    renderChart,
    updateData,
    zoomIn,
    zoomOut,
    resize,
  }
}

// 暴露常量便于组件访问
export { MAP_COLORS, TIER_COLORS }
