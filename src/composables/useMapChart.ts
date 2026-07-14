import { onBeforeUnmount, onMounted, ref, shallowRef, type Ref } from 'vue'
import * as echarts from 'echarts'
import type { City, MapLevel } from '@/types'
import { provinces, getProvinceCenter, getCityByCode } from '@/data/cities'
import { registerMapForLevel, getProvinceBBox } from '@/utils/mapGeoLoader'
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
  const flying = ref(false)
  const focusedProvinceCode = ref<string | null>(null)
  let flyTimer: ReturnType<typeof setTimeout> | null = null
  // regions 渐变动画定时器（分帧逐步调整 opacity 实现柔和过渡）
  let regionsAnimTimer: ReturnType<typeof setInterval> | null = null
  // 非聚焦省份的暗化目标值（1 = 正常，DIM_OPACITY = 完全暗化）
  const DIM_OPACITY = 0.25
  // regions 渐变动画时长
  const REGIONS_FADE_DURATION = 350

  let resizeObserver: ResizeObserver | null = null

  /**
   * 清理 regions 渐变动画
   */
  function clearRegionsAnim(): void {
    if (regionsAnimTimer) {
      clearInterval(regionsAnimTimer)
      regionsAnimTimer = null
    }
  }

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
   * 构建 geo.regions（所有省份，带聚焦感知样式）
   * @param dimOpacity 非聚焦省份的 opacity（1 = 正常，DIM_OPACITY = 完全暗化）
   *                   用于渐变动画中插值，默认 DIM_OPACITY
   */
  function buildGeoRegions(dimOpacity: number = DIM_OPACITY) {
    const { litCities } = params.value
    const countByProvince = new Map<string, number>()
    litCities.forEach((c) => {
      countByProvince.set(c.provinceCode, (countByProvince.get(c.provinceCode) ?? 0) + 1)
    })

    const focusedCode = focusedProvinceCode.value
    const focusedName = focusedCode
      ? provinces.find((p) => p.code === focusedCode)?.name
      : null

    return provinces.map((p) => {
      const visitCount = countByProvince.get(p.code) ?? 0
      const isFocused = focusedName === p.name

      // 有聚焦省份且当前不是聚焦省份 → 暗化
      if (focusedName && !isFocused) {
        return {
          name: p.name,
          itemStyle: {
            areaColor: MAP_COLORS.unlit,
            opacity: dimOpacity,
            borderColor: MAP_COLORS.borderColor,
            borderWidth: 0.5,
          },
        }
      }
      // 聚焦省份 → 高亮边框 + 柔和发光
      if (isFocused) {
        return {
          name: p.name,
          itemStyle: {
            areaColor: visitCount > 0 ? MAP_COLORS.litFill : MAP_COLORS.unlit,
            borderColor: MAP_COLORS.focusBorder,
            borderWidth: 1.5,
            shadowColor: 'rgba(255, 107, 53, 0.25)',
            shadowBlur: 12,
            opacity: 1,
          },
        }
      }
      // 无聚焦 → 正常样式（已点亮省份用暖色，未点亮用暖灰白）
      return {
        name: p.name,
        itemStyle: {
          areaColor: visitCount > 0 ? MAP_COLORS.litFill : MAP_COLORS.unlit,
          borderColor: MAP_COLORS.borderColor,
          borderWidth: 0.8,
          shadowColor: MAP_COLORS.shadowColor,
          shadowBlur: 6,
          opacity: 1,
        },
      }
    })
  }

  /**
   * 计算省份聚焦的自适应 center 和 zoom
   * 利用 GeoJSON 边界框 + ECharts convertToPixel 测量省份在 zoom=1 时的像素尺寸，
   * 根据容器大小计算最佳缩放，使省份在面板中最大化完整展示并居中
   *
   * @param provinceCode 省份编码
   * @returns { center, zoom } 或 null（计算失败时）
   */
  function calculateAdaptiveFocus(provinceCode: string): {
    center: [number, number]
    zoom: number
  } | null {
    if (!chart.value || !containerRef.value) return null

    const province = provinces.find((p) => p.code === provinceCode)
    if (!province) return null

    const bbox = getProvinceBBox(province.name)
    if (!bbox) return null

    const container = containerRef.value
    const containerW = container.clientWidth
    const containerH = container.clientHeight
    if (containerW < 10 || containerH < 10) return null

    // 获取当前 zoom（convertToPixel 基于当前状态，需归一化到 zoom=1）
    const opt = chart.value.getOption() as { geo?: Array<{ zoom?: number }> }
    const currentZoom = opt?.geo?.[0]?.zoom ?? 1

    // 将省份 bbox 四角转为像素坐标
    const topLeft = chart.value.convertToPixel('geo', [
      bbox.minLng,
      bbox.maxLat,
    ])
    const bottomRight = chart.value.convertToPixel('geo', [
      bbox.maxLng,
      bbox.minLat,
    ])

    if (!topLeft || !bottomRight) return null

    // 归一化到 zoom=1 时的像素尺寸
    const provincePixelW = Math.abs(bottomRight[0] - topLeft[0]) / currentZoom
    const provincePixelH = Math.abs(bottomRight[1] - topLeft[1]) / currentZoom

    if (provincePixelW < 1 || provincePixelH < 1) return null

    // 目标：省份占容器的 85%（留出边距，确保完整显示 + 周围暗化省份可见）
    const FILL_RATIO = 0.85
    const zoomX = (containerW * FILL_RATIO) / provincePixelW
    const zoomY = (containerH * FILL_RATIO) / provincePixelH

    // 取较小值确保省份完整显示，并限制在 scaleLimit 范围内
    let zoom = Math.min(zoomX, zoomY)
    zoom = Math.max(zoom, 1.5) // 最小 1.5 避免太远
    zoom = Math.min(zoom, 8) // 与 scaleLimit.max 对齐

    // 地理中心（bbox 的中心点，而非城市平均坐标）
    const center: [number, number] = [
      (bbox.minLng + bbox.maxLng) / 2,
      (bbox.minLat + bbox.maxLat) / 2,
    ]

    return { center, zoom }
  }

  /**
   * 构建 ECharts option
   * mapName 为 null 时降级为无底图的纯点位渲染（使用 cartesian2d 坐标系）
   */
  function buildOption(mapName: string | null): echarts.EChartsCoreOption {
    const { readonly: isReadonly } = params.value
    const scatterData = buildScatterData()
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
        animation: true,
        animationDuration: 600,
        animationEasing: 'cubicOut',
        animationDurationUpdate: 300,
      }
    }

    const option: echarts.EChartsCoreOption = {
      backgroundColor: MAP_COLORS.background,
      tooltip: {
        trigger: 'item',
        formatter: tooltipFormatter,
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: 'rgba(228, 228, 231, 0.8)',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: {
          color: '#18181b',
          fontSize: 12,
          fontFamily: 'Geist, ui-sans-serif, sans-serif',
        },
        extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px -2px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04); backdrop-filter: blur(8px);',
      },
      geo: {
        map: mapName ?? '',
        roam: isReadonly ? false : true,
        zoom: 1,
        scaleLimit: { min: 0.8, max: 8 },
        // 居中并撑满容器，保持地图宽高比
        layoutCenter: ['50%', '55%'],
        layoutSize: '95%',
        // 地图区域默认样式
        itemStyle: {
          areaColor: MAP_COLORS.unlit,
          borderColor: MAP_COLORS.borderColor,
          borderWidth: 0.8,
          shadowColor: MAP_COLORS.shadowColor,
          shadowBlur: 6,
        },
        emphasis: {
          itemStyle: {
            areaColor: MAP_COLORS.hoverFill,
            borderColor: MAP_COLORS.focusBorder,
            borderWidth: 1.2,
            shadowColor: 'rgba(255, 107, 53, 0.15)',
            shadowBlur: 10,
          },
          label: { show: false },
        },
        select: { disabled: true },
        regions: buildGeoRegions(),
      },
      series: [
        // 已点亮城市：scatter + 柔和发光
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
          itemStyle: {
            shadowColor: 'rgba(255, 107, 53, 0.4)',
            shadowBlur: 6,
          },
          emphasis: {
            scale: 1.4,
            label: {
              show: true,
              formatter: (p: unknown) => (p as { data?: ScatterDataItem }).data?.name ?? '',
              position: 'top',
              color: '#18181b',
              fontSize: 12,
              fontFamily: 'Geist, ui-sans-serif, sans-serif',
              fontWeight: 500,
              backgroundColor: 'rgba(255,255,255,0.96)',
              padding: [4, 8],
              borderRadius: 6,
              borderColor: 'rgba(228, 228, 231, 0.6)',
              borderWidth: 1,
            },
          },
          zlevel: 2,
        },
        // 居住地：effectScatter + 精致涟漪
        {
          name: 'residence',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: scatterData.filter((d) => d.isResidence),
          symbolSize: 12,
          rippleEffect: { brushType: 'stroke', scale: 2.5, period: 5 },
          showEffectOn: 'render',
          label: {
            show: true,
            formatter: (p: unknown) => (p as { data?: ScatterDataItem }).data?.name ?? '',
            position: 'top',
            color: '#3B82F6',
            fontSize: 12,
            fontFamily: 'Geist, ui-sans-serif, sans-serif',
            fontWeight: 600,
            backgroundColor: 'rgba(255,255,255,0.96)',
            padding: [4, 8],
            borderRadius: 6,
            borderColor: 'rgba(191, 219, 254, 0.6)',
            borderWidth: 1,
          },
          itemStyle: {
            color: MAP_COLORS.residence,
            borderColor: '#FFFFFF',
            borderWidth: 2,
            shadowColor: 'rgba(59, 130, 246, 0.4)',
            shadowBlur: 8,
          },
          zlevel: 3,
        },
      ],
      // 入场动画 + 切换过渡
      animation: true,
      animationDuration: 800,
      animationEasing: 'cubicOut',
      animationDurationUpdate: 1000,
      animationEasingUpdate: 'cubicIn',
    }

    return option
  }

  /**
   * 渲染地图（始终加载全国地图，省市级通过 zoom + regions 聚焦实现）
   * GeoJSON 缺失时降级为无底图的纯点位渲染
   */
  async function renderChart(): Promise<void> {
    if (!chart.value) return
    loading.value = true
    try {
      // 始终加载全国地图
      const mapName = await registerMapForLevel('country')
      mapAvailable.value = !!mapName

      // 根据当前 level 恢复聚焦状态（组件重新挂载时）
      const { level, regionCode } = params.value
      if (level === 'province' && regionCode) {
        focusedProvinceCode.value = regionCode
      } else if (level === 'city' && regionCode) {
        const city = getCityByCode(regionCode)
        if (city) focusedProvinceCode.value = city.provinceCode
      } else {
        focusedProvinceCode.value = null
      }

      const option = buildOption(mapName)
      chart.value.setOption(option, { notMerge: true })

      // 恢复聚焦位置的缩放
      if (mapName && focusedProvinceCode.value) {
        let center: [number, number] | null = null
        let zoom = 4

        if (level === 'city' && regionCode) {
          // 市级：用城市坐标 + 固定 zoom
          const city = getCityByCode(regionCode)
          if (city) {
            center = [city.longitude, city.latitude]
            zoom = 6
          }
        }

        if (!center) {
          // 省级：用自适应计算（基于省份边界框 + 容器尺寸）
          const adaptive = calculateAdaptiveFocus(focusedProvinceCode.value)
          if (adaptive) {
            center = adaptive.center
            zoom = adaptive.zoom
          } else {
            center = getProvinceCenter(focusedProvinceCode.value)
          }
        }

        if (center) {
          chart.value.setOption({ geo: { center, zoom } }, { notMerge: false })
        }
      }
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
    // 仅更新 series 数据，不触碰 geo 的 center/zoom/layoutCenter/regions
    const scatterData = buildScatterData()
    chart.value.setOption({
      series: [
        { data: scatterData.filter((d) => !d.isResidence) },
        { data: scatterData.filter((d) => d.isResidence) },
      ],
    }, { notMerge: false })
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
    // 全国级点击省份 → 触发回调（由 BaseMap watch 调用 focusProvince 实现放大+暗化）
    chart.value.on('click', 'geo', (evt: unknown) => {
      const e = evt as { name?: string }
      if (params.value.level !== 'country') return
      if (params.value.readonly) return
      if (flying.value) return
      if (!e.name) return
      callbacks.value.onRegionClick?.(e.name, e.name)
    })
    // 同步缩放比例
    chart.value.on('georoam', () => {
      const opt = chart.value?.getOption()
      const zoom = (opt as { geo?: Array<{ zoom?: number }> })?.geo?.[0]?.zoom
      if (typeof zoom === 'number') currentZoom.value = zoom
    })
  }

  /**
   * 渐变动画过渡 geo.regions 的暗化程度
   * 通过分帧逐步调整非聚焦省份的 opacity，实现柔和的明暗过渡
   * @param fromDim 起始暗化 opacity（1 = 正常，DIM_OPACITY = 完全暗化）
   * @param toDim 目标暗化 opacity
   * @param duration 过渡时长 ms
   */
  function animateRegionsDim(
    fromDim: number,
    toDim: number,
    duration: number,
  ): void {
    if (!chart.value) return
    clearRegionsAnim()
    const start = performance.now()
    // easeOutCubic：先快后慢，符合视觉柔和感
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)

    regionsAnimTimer = setInterval(() => {
      if (!chart.value) {
        clearRegionsAnim()
        return
      }
      const elapsed = performance.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = ease(progress)
      const currentDim = fromDim + (toDim - fromDim) * eased

      chart.value.setOption(
        {
          geo: {
            regions: buildGeoRegions(currentDim),
          },
        },
        { notMerge: false },
      )

      if (progress >= 1) {
        clearRegionsAnim()
      }
    }, 16)
  }

  /**
   * 聚焦省份：先平滑放大（仅 center/zoom 动画），动画结束后渐变应用聚焦样式
   * 放大过程中不触碰 regions，保证过渡丝滑无闪烁
   * 放大到位后用 350ms 渐变暗化其他省份，避免生硬切换
   *
   * 省级聚焦：自适应计算 center/zoom（基于省份边界框 + 容器尺寸）
   * 市级聚焦：使用调用方传入的 center/zoom（城市坐标 + 固定 zoom）
   */
  function focusProvince(
    provinceCode: string,
    options?: { center?: [number, number]; zoom?: number },
  ): void {
    if (!chart.value) return
    focusedProvinceCode.value = provinceCode

    // 省级聚焦（无 options）→ 自适应计算；市级聚焦（有 options）→ 使用传入值
    let center: [number, number] | null
    let targetZoom: number

    if (options?.center && options?.zoom) {
      center = options.center
      targetZoom = options.zoom
    } else {
      const adaptive = calculateAdaptiveFocus(provinceCode)
      if (adaptive) {
        center = adaptive.center
        targetZoom = adaptive.zoom
      } else {
        // 自适应计算失败（如 GeoJSON 未加载），回退到城市平均中心 + 固定 zoom
        center = options?.center ?? getProvinceCenter(provinceCode)
        targetZoom = options?.zoom ?? 4
      }
    }

    flying.value = true
    if (flyTimer) clearTimeout(flyTimer)
    clearRegionsAnim()

    // 阶段一：仅动画 center/zoom，不更新 regions
    if (center) {
      chart.value.setOption(
        {
          geo: {
            center,
            zoom: targetZoom,
          },
        },
        { notMerge: false },
      )
    }

    // 阶段二：放大动画结束后，渐变暗化其他省份（从 1.0 → DIM_OPACITY）
    flyTimer = setTimeout(() => {
      flying.value = false
      animateRegionsDim(1, DIM_OPACITY, REGIONS_FADE_DURATION)
    }, 1000)
  }

  /**
   * 取消聚焦：渐变恢复省份样式 + 同时缩小回全国视图（并行，更流畅）
   */
  function unfocus(): void {
    if (!chart.value) return
    focusedProvinceCode.value = null

    flying.value = true
    if (flyTimer) clearTimeout(flyTimer)
    clearRegionsAnim()

    // 渐变恢复 regions（350ms）与缩小动画（1000ms）并行
    // 前 350ms regions 逐渐恢复亮色，同时地图开始缩小，视觉连贯
    animateRegionsDim(DIM_OPACITY, 1, REGIONS_FADE_DURATION)

    chart.value.setOption(
      {
        geo: {
          center: [104.5, 36],
          zoom: 1,
        },
      },
      { notMerge: false },
    )

    flyTimer = setTimeout(() => {
      flying.value = false
    }, 1000)
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
    // 容器尺寸变化时：先 resize 实例，若当前有聚焦省份则重新计算自适应缩放
    resizeObserver = new ResizeObserver(() => {
      chart.value?.resize()
      if (focusedProvinceCode.value && !flying.value) {
        const adaptive = calculateAdaptiveFocus(focusedProvinceCode.value)
        if (adaptive && chart.value) {
          chart.value.setOption(
            { geo: { center: adaptive.center, zoom: adaptive.zoom } },
            { notMerge: false },
          )
        }
      }
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
    if (flyTimer) clearTimeout(flyTimer)
    clearRegionsAnim()
    disposeChart()
  })

  return {
    chart,
    loading,
    mapAvailable,
    currentZoom,
    flying,
    renderChart,
    updateData,
    zoomIn,
    zoomOut,
    resize,
    focusProvince,
    unfocus,
  }
}

// 暴露常量便于组件访问
export { MAP_COLORS, TIER_COLORS }
