import { ref, type Ref, onMounted, onUnmounted, nextTick } from 'vue'
import maplibregl, { type Map, type MapMouseEvent, type GeoJSONSource } from 'maplibre-gl'
import type { City, MapLevel } from '@/types'
import { provinces, getCityByCode, getProvinceByCode, getProvinceCenter } from '@/data/cities'
import { loadGeoJson, getProvinceBBox, type GeoJSON, type GeoJSONFeature } from '@/utils/mapGeoLoader'

// ============================================================================
// 类型定义
// ============================================================================

interface UseMapLibreParams {
  level: MapLevel
  regionCode: string
  litCities: City[]
  cityVisitCount: Record<string, number>
  residenceCityCode: string
  readonly: boolean
}

interface UseMapLibreCallbacks {
  onCityClick?: (city: City) => void
  onRegionClick?: (code: string, name: string) => void
}

// ============================================================================
// 配色常量（与原 useMapChart 保持一致）
// ============================================================================

const COLOR = {
  // 浅色系：海洋浅蓝灰，陆地浅灰白，描边浅灰，与项目冷灰白风格一致
  ocean: '#e0f2fe',
  landDefault: '#f1f5f9',
  landBorder: '#cbd5e1',
  provinceBorder: '#94a3b8',
  cityBorder: '#cbd5e1',
  visitLow: 'rgba(255, 179, 128, 0.45)',
  visitMid: 'rgba(255, 137, 64, 0.55)',
  visitHigh: 'rgba(234, 88, 12, 0.65)',
  visitLowStroke: 'rgba(255, 149, 90, 0.85)',
  visitMidStroke: 'rgba(234, 101, 37, 0.9)',
  visitHighStroke: 'rgba(194, 65, 12, 0.95)',
  selected: 'rgba(59, 130, 246, 0.25)',
  selectedStroke: 'rgba(37, 99, 235, 0.95)',
  residence: 'rgba(59, 130, 246, 0.15)',
  residenceStroke: 'rgba(59, 130, 246, 0.7)',
  litProvince: 'rgba(255, 137, 64, 0.18)',
  unlitProvince: 'rgba(148, 163, 184, 0.10)',
  dotVisit: '#FF6B35',
  dotResidence: '#3B82F6',
} as const

// zoom 阈值
const ZOOM = {
  globe: 2,
  china: 3,
  province: 5.5,
  city: 8,
} as const

// ============================================================================
// 世界国家 GeoJSON（静态导入，随仓库提交）
// ============================================================================

import worldGeo from '@/data/geo/world/ne_110m_admin_0_countries.json'

// ============================================================================
// 辅助函数
// ============================================================================

/** 根据 visitCount 获取填充色 */
function getVisitFill(visitCount: number): string {
  if (visitCount >= 4) return COLOR.visitHigh
  if (visitCount >= 2) return COLOR.visitMid
  return COLOR.visitLow
}

/** 根据 visitCount 获取描边色 */
function getVisitStroke(visitCount: number): string {
  if (visitCount >= 4) return COLOR.visitHighStroke
  if (visitCount >= 2) return COLOR.visitMidStroke
  return COLOR.visitLowStroke
}

/** 从 GeoJSON feature 中提取 adcode（DataV 格式 properties.adcode） */
function getFeatureAdcode(feature: GeoJSONFeature): string | null {
  const adcode = feature.properties?.adcode ?? feature.properties?.id
  if (adcode !== undefined && adcode !== null) {
    return String(adcode)
  }
  return null
}

/** 从 GeoJSON feature 中提取名称 */
function getFeatureName(feature: GeoJSONFeature): string | null {
  const name = feature.properties?.name ?? feature.properties?.NAME
  return name ? String(name) : null
}

/** 提取 feature 边界框 */
function extractBBox(feature: GeoJSONFeature): {
  minLng: number; maxLng: number; minLat: number; maxLat: number
} | null {
  const coords = feature.geometry.coordinates
  if (!coords) return null
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
  function processRing(ring: number[][]) {
    for (const [lng, lat] of ring) {
      if (typeof lng !== 'number' || typeof lat !== 'number') continue
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }
  }
  if (feature.geometry.type === 'Polygon') {
    for (const ring of coords as number[][][]) processRing(ring)
  } else if (feature.geometry.type === 'MultiPolygon') {
    for (const polygon of coords as number[][][][]) {
      for (const ring of polygon) processRing(ring)
    }
  }
  if (minLng === Infinity) return null
  return { minLng, maxLng, minLat, maxLat }
}

// ============================================================================
// composable 主函数
// ============================================================================

export function useMapLibre(
  containerRef: Ref<HTMLElement | null>,
  params: Ref<UseMapLibreParams>,
  callbacks: Ref<UseMapLibreCallbacks>,
) {
  const loading = ref(true)
  const mapAvailable = ref(true)
  const currentZoom = ref(1)
  const flying = ref(false)

  let map: Map | null = null
  let resizeObserver: ResizeObserver | null = null

  // 当前加载的省份 code
  let currentProvinceCode: string | null = null

  // 跟踪 lit cities / residence / selected 的变化
  let litCityCodes: string[] = []
  let cityVisitCountMap: Record<string, number> = {}
  let residenceCode = ''
  let selectedCityCode = ''

  // ============================ 初始化 ============================

  function initMap(): void {
    if (!containerRef.value) {
      console.error('[useMapLibre] containerRef 为空，地图无法初始化')
      loading.value = false
      return
    }

    // 从父级获取真实高度并固定到 container，防止 MapLibre canvas 注入后高度塌缩
    const parent = containerRef.value.parentElement
    if (parent) {
      const parentRect = parent.getBoundingClientRect()
      if (parentRect.height > 0) {
        containerRef.value.style.height = `${parentRect.height}px`
        containerRef.value.style.width = `${parentRect.width}px`
      }
    }

    try {
      const styleSpec = buildBaseStyle()

      map = new maplibregl.Map({
        container: containerRef.value,
        style: styleSpec,
        center: [104, 35],
        zoom: ZOOM.globe,
        minZoom: 0,
        maxZoom: 12,
        // 启用鼠标右键/ctrl+拖拽旋转 3D 地球
        dragRotate: true,
        pitchWithRotate: false,
        attributionControl: false,
      })

      map.on('error', (e: { error?: Error; type?: string }) => {
        console.error('[useMapLibre] MapLibre error:', e.error ?? e)
      })

      map.on('load', () => {
        loading.value = false
        setupLayers()
        setupEvents()
        updateData()
        // 自适应中间可见区域，让地球填充左右面板之间的空间
        fitGlobeToView()
        map?.resize()
      })

      map.on('zoom', () => {
        currentZoom.value = map?.getZoom() ?? 1
      })
    } catch (err) {
      console.error('[useMapLibre] 地图初始化失败:', err)
      loading.value = false
      mapAvailable.value = false
    }

    setTimeout(() => {
      if (loading.value) {
        console.warn('[useMapLibre] load 事件 5 秒未触发，强制关闭 loading')
        loading.value = false
      }
    }, 5000)
  }

  /** 构建基础 style（世界国家 + 占位 source） */
  function buildBaseStyle(): maplibregl.StyleSpecification {
    return {
      version: 8,
      name: 'travel-map-globe',
      // 3D 球状投影
      projection: { type: 'globe' },
      // 天空/大气层：浅色系，仅使用不依赖 3D terrain 的属性
      sky: {
        'sky-color': '#dbeafe',
        'horizon-color': '#e0f2fe',
        'sky-horizon-blend': 0.5,
        // 关闭大气层光晕，避免地球边缘出现白色轮廓（双层视觉）
        'atmosphere-blend': 0,
      },
      sources: {
        'world-countries': {
          type: 'geojson',
          data: worldGeo as unknown as GeoJSON.FeatureCollection,
        },
        // 占位空 source，后续 addSource 填充
        'china-provinces': { type: 'geojson', data: emptyFeatureCollection() },
        'province-cities': { type: 'geojson', data: emptyFeatureCollection() },
        'city-centers': { type: 'geojson', data: emptyFeatureCollection() },
      },
      layers: [
        // 海洋背景（globe 模式下作为地球底色）
        {
          id: 'ocean-background',
          type: 'background',
          paint: { 'background-color': COLOR.ocean },
        },
        // 世界国家填充
        {
          id: 'world-fill',
          type: 'fill',
          source: 'world-countries',
          paint: {
            'fill-color': COLOR.landDefault,
            'fill-opacity': ['interpolate', ['linear'], ['zoom'],
              0, 1, ZOOM.china - 0.5, 1, ZOOM.china + 1, 0],
          },
        },
        // 世界国家边界
        {
          id: 'world-border',
          type: 'line',
          source: 'world-countries',
          paint: {
            'line-color': COLOR.landBorder,
            'line-width': 0.5,
            'line-opacity': ['interpolate', ['linear'], ['zoom'],
              0, 0.6, ZOOM.china - 0.5, 0.6, ZOOM.china + 1, 0],
          },
        },
        // 中国省份填充
        {
          id: 'province-fill',
          type: 'fill',
          source: 'china-provinces',
          paint: {
            'fill-color': ['match', ['get', 'lit'],
              1, COLOR.litProvince,
              COLOR.unlitProvince],
            'fill-opacity': ['interpolate', ['linear'], ['zoom'],
              ZOOM.china - 1, 0, ZOOM.china + 0.5, 1],
          },
        },
        // 中国省份边界
        {
          id: 'province-border',
          type: 'line',
          source: 'china-provinces',
          paint: {
            'line-color': COLOR.provinceBorder,
            'line-width': ['interpolate', ['linear'], ['zoom'],
              ZOOM.china, 0.5, ZOOM.province, 1],
            'line-opacity': ['interpolate', ['linear'], ['zoom'],
              ZOOM.china - 1, 0, ZOOM.china + 0.5, 1, ZOOM.city, 0.3],
          },
        },
        // 城市区域填充（省级视图，数据驱动）
        {
          id: 'city-fill',
          type: 'fill',
          source: 'province-cities',
          paint: {
            'fill-color': ['case',
              ['==', ['get', 'cityCode'], ''], 'rgba(0,0,0,0)',
              ['==', ['get', 'isSelected'], 1], COLOR.selected,
              ['==', ['get', 'isResidence'], 1], COLOR.residence,
              ['==', ['get', 'isLit'], 1], ['get', 'fillColor'],
              'rgba(248, 250, 252, 0)',
            ],
            'fill-opacity': ['interpolate', ['linear'], ['zoom'],
              ZOOM.province - 1.5, 0, ZOOM.province + 0.5, 1],
          },
        },
        // 城市边界
        {
          id: 'city-border',
          type: 'line',
          source: 'province-cities',
          paint: {
            'line-color': ['case',
              ['==', ['get', 'isSelected'], 1], COLOR.selectedStroke,
              ['==', ['get', 'isResidence'], 1], COLOR.residenceStroke,
              ['==', ['get', 'isLit'], 1], ['get', 'strokeColor'],
              COLOR.cityBorder,
            ],
            'line-width': ['case',
              ['==', ['get', 'isSelected'], 1], 2.2,
              ['==', ['get', 'isLit'], 1], 1.4,
              ['==', ['get', 'isResidence'], 1], 1.4,
              0.8,
            ],
            'line-opacity': ['interpolate', ['linear'], ['zoom'],
              ZOOM.province - 1.5, 0, ZOOM.province + 0.5, 1],
          },
        },
        // 城市圆点（全国视图）
        {
          id: 'city-dots',
          type: 'circle',
          source: 'city-centers',
          paint: {
            'circle-color': ['match', ['get', 'isResidence'],
              1, COLOR.dotResidence,
              COLOR.dotVisit],
            'circle-radius': ['interpolate', ['linear'], ['get', 'visitCount'],
              1, 5, 3, 7, 4, 9],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1.5,
            'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'],
              0, 0.8, ZOOM.province, 0.8, ZOOM.province + 1, 0],
            'circle-opacity': ['interpolate', ['linear'], ['zoom'],
              0, 1, ZOOM.province - 0.5, 1, ZOOM.province + 1, 0],
            'circle-blur': 0.2,
          },
        },
        // 城市圆点光晕
        {
          id: 'city-dots-halo',
          type: 'circle',
          source: 'city-centers',
          paint: {
            'circle-color': ['match', ['get', 'isResidence'],
              1, COLOR.dotResidence,
              COLOR.dotVisit],
            'circle-radius': ['interpolate', ['linear'], ['get', 'visitCount'],
              1, 10, 3, 13, 4, 16],
            'circle-opacity': ['interpolate', ['linear'], ['zoom'],
              0, 0.25, ZOOM.province - 0.5, 0.25, ZOOM.province + 1, 0],
            'circle-blur': 0.8,
          },
        },
      ],
    }
  }

  function emptyFeatureCollection(): GeoJSON.FeatureCollection {
    return { type: 'FeatureCollection', features: [] }
  }

  // ============================ 图层设置 ============================

  /** 加载完成后：加载中国 GeoJSON，设置交互 */
  async function setupLayers(): Promise<void> {
    if (!map) return

    // 加载中国省份 GeoJSON
    const chinaGeo = await loadGeoJson('country')
    if (chinaGeo && map) {
      const source = map.getSource('china-provinces') as GeoJSONSource | undefined
      if (source) {
        source.setData(chinaGeo as unknown as GeoJSON.FeatureCollection)
      }
      mapAvailable.value = true
    } else {
      mapAvailable.value = false
    }
  }

  /** 绑定地图交互事件 */
  function setupEvents(): void {
    if (!map) return

    // 点击中国省份（全国视图下）
    map.on('click', 'province-fill', (e: MapMouseEvent) => {
      if (params.value.readonly || flying.value) return
      if (params.value.level !== 'country') return
      const feature = (e as unknown as { features?: Array<{ properties: Record<string, unknown> }> }).features?.[0]
      if (!feature) return
      const name = feature.properties?.name as string | undefined
      if (!name) return
      const matched = provinces.find((p) => p.name === name)
      if (matched && callbacks.value.onRegionClick) {
        callbacks.value.onRegionClick(matched.code, matched.name)
      }
    })

    // 点击城市区域（省份视图下）
    map.on('click', 'city-fill', (e: MapMouseEvent) => {
      if (params.value.readonly || flying.value) return
      if (params.value.level !== 'province') return
      const feature = (e as unknown as { features?: Array<{ properties: Record<string, unknown> }> }).features?.[0]
      if (!feature) return
      const cityCode = feature.properties?.cityCode as string | undefined
      if (!cityCode) return
      const city = getCityByCode(cityCode)
      if (city && callbacks.value.onCityClick) {
        callbacks.value.onCityClick(city)
      }
    })

    // 鼠标样式
    map.on('mouseenter', 'province-fill', () => {
      if (!params.value.readonly && params.value.level === 'country') {
        map!.getCanvas().style.cursor = 'pointer'
      }
    })
    map.on('mouseleave', 'province-fill', () => {
      map!.getCanvas().style.cursor = ''
    })
    map.on('mouseenter', 'city-fill', () => {
      if (!params.value.readonly && params.value.level === 'province') {
        map!.getCanvas().style.cursor = 'pointer'
      }
    })
    map.on('mouseleave', 'city-fill', () => {
      map!.getCanvas().style.cursor = ''
    })

    // flyTo 结束
    map.on('moveend', () => {
      flying.value = false
    })
  }

  // ============================ 数据更新 ============================

  /** 更新所有数据驱动样式（点亮状态变化时调用） */
  function updateData(): void {
    if (!map) return
    const p = params.value
    litCityCodes = p.litCities.map((c) => c.code)
    cityVisitCountMap = p.cityVisitCount
    residenceCode = p.residenceCityCode
    selectedCityCode = p.level === 'city' ? p.regionCode : ''

    // 更新中国省份填充（标记有点亮城市的省份）
    updateProvinceFillData()
    // 更新城市圆点
    updateCityDotsData()
    // 更新城市区域填充（如果当前在省份视图）
    if (currentProvinceCode) {
      updateCityFillData(currentProvinceCode)
    }
  }

  /** 更新省份填充数据（标记有点亮城市的省份为 lit=1） */
  function updateProvinceFillData(): void {
    if (!map) return
    const source = map.getSource('china-provinces') as GeoJSONSource | undefined
    if (!source) return

    // 获取当前 source 中的 features，更新 lit 属性
    const litProvinceNames = new Set<string>()
    for (const city of params.value.litCities) {
      const prov = getProvinceByCode(city.provinceCode)
      if (prov) litProvinceNames.add(prov.name)
    }

    // 重新加载 china GeoJSON 并附加 lit 属性
    loadGeoJson('country').then((chinaGeo) => {
      if (!chinaGeo || !map) return
      const features = chinaGeo.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          lit: litProvinceNames.has(getFeatureName(f) ?? '') ? 1 : 0,
        },
      }))
      source.setData({ type: 'FeatureCollection', features } as unknown as GeoJSON.FeatureCollection)
    })
  }

  /** 更新城市圆点数据 */
  function updateCityDotsData(): void {
    if (!map) return
    const source = map.getSource('city-centers') as GeoJSONSource | undefined
    if (!source) return

    const features = params.value.litCities.map((city) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [city.longitude, city.latitude] as [number, number],
      },
      properties: {
        cityCode: city.code,
        cityName: city.name,
        visitCount: cityVisitCountMap[city.code] ?? 1,
        isResidence: city.code === residenceCode ? 1 : 0,
      },
    }))

    source.setData({
      type: 'FeatureCollection',
      features,
    } as unknown as GeoJSON.FeatureCollection)
  }

  /** 加载并更新省级城市区域数据 */
  async function updateCityFillData(provinceCode: string): Promise<void> {
    if (!map) return

    const geo = await loadGeoJson('province', provinceCode)
    if (!geo || !map) return

    const features = geo.features.map((f) => {
      const adcode = getFeatureAdcode(f)
      const isLit = adcode ? litCityCodes.includes(adcode) : false
      const visitCount = adcode ? (cityVisitCountMap[adcode] ?? 0) : 0
      const isSelected = adcode === selectedCityCode ? 1 : 0
      const isResidence = adcode === residenceCode ? 1 : 0

      return {
        ...f,
        properties: {
          ...f.properties,
          cityCode: adcode ?? '',
          cityName: getFeatureName(f) ?? '',
          isLit: isLit ? 1 : 0,
          visitCount,
          isSelected,
          isResidence,
          fillColor: getVisitFill(visitCount),
          strokeColor: getVisitStroke(visitCount),
        },
      }
    })

    const source = map.getSource('province-cities') as GeoJSONSource | undefined
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features,
      } as unknown as GeoJSON.FeatureCollection)
    }
  }

  // ============================ 聚焦/取消聚焦 ============================

  /** 聚焦省份 */
  async function focusProvince(
    code: string,
    opts?: { center?: [number, number]; zoom?: number },
  ): Promise<void> {
    if (!map) return

    const province = getProvinceByCode(code)
    if (!province) return

    // 加载省级城市区域数据
    if (currentProvinceCode !== code) {
      currentProvinceCode = code
      await updateCityFillData(code)
    }

    flying.value = true

    // 如果指定了 center/zoom（如城市级下钻），直接 flyTo
    if (opts?.center) {
      map.flyTo({
        center: opts.center,
        zoom: opts.zoom ?? ZOOM.province,
        duration: 1500,
        curve: 1.42,
        essential: true,
      })
      return
    }

    // 否则用 fitBounds 精确聚焦省份边界
    const bbox = getProvinceBBox(province.name)
    if (bbox) {
      map.fitBounds(
        [[bbox.minLng, bbox.minLat], [bbox.maxLng, bbox.maxLat]],
        { duration: 1500, padding: 80 },
      )
    } else {
      // bbox 不可用时回退到 flyTo 省份中心
      const center = getProvinceCenter(code) ?? [104, 35]
      map.flyTo({
        center,
        zoom: ZOOM.province,
        duration: 1500,
        curve: 1.42,
        essential: true,
      })
    }
  }

  /** 取消聚焦，回到全国。无论地球如何旋转，都重置为正面水平俯视视角并聚焦中国 */
  function unfocus(): void {
    if (!map) return
    currentProvinceCode = null
    flying.value = true
    map.flyTo({
      center: [104, 35],
      zoom: ZOOM.china,
      // 重置旋转与倾斜，确保从任意 3D 视角回归正面朝向中国的标准视图
      bearing: 0,
      pitch: 0,
      duration: 2000,
      curve: 1.42,
      essential: true,
    })
  }

  /** 飞到全球地球仪视角 */
  function flyToGlobe(): void {
    if (!map) return
    flying.value = true
    map.flyTo({
      center: [104, 35],
      zoom: ZOOM.globe,
      duration: 2000,
      curve: 1.42,
      essential: true,
    })
  }

  // ============================ 视图自适应 ============================

  /**
   * 根据容器尺寸自适应地球大小，让地球填充中间可见区域。
   * 桌面端需扣除左右悬浮面板（280px / 320px）的遮挡，让地球在面板之间居中且不被遮挡。
   */
  function fitGlobeToView(): void {
    if (!map || !containerRef.value) return
    const width = containerRef.value.clientWidth
    const height = containerRef.value.clientHeight
    // 桌面端（lg: 1024px）有左右悬浮面板遮挡中间区域
    const isDesktop = width >= 1024
    const leftPad = isDesktop ? 300 : 0   // 左面板 280px + left-3 间距
    const rightPad = isDesktop ? 340 : 0  // 右面板 320px + right-3 间距
    const visibleWidth = Math.max(width - leftPad - rightPad, 300)
    // 地球直径应接近可见区域较小边，让地球填充中间区域
    const targetSize = Math.min(visibleWidth, height)
    // 经验公式：targetSize 600px → zoom 2，每翻倍 zoom +1
    const zoom = 2 + Math.log2(targetSize / 600)
    const finalZoom = Math.max(1.5, Math.min(2.8, zoom))
    map.setZoom(finalZoom, { animate: false })
  }

  // ============================ 缩放控制 ============================

  function zoomIn(): void {
    map?.zoomIn({ duration: 300 })
  }

  function zoomOut(): void {
    map?.zoomOut({ duration: 300 })
  }

  function resize(): void {
    map?.resize()
  }

  // ============================ 生命周期 ============================

  onMounted(async () => {
    // 等待 DOM 布局稳定，确保容器有真实高度再初始化地图
    await nextTick()
    // 容器高度可能因 Transition/flex 布局延迟而为 0，重试直到有高度
    let retries = 0
    while (containerRef.value && containerRef.value.clientHeight === 0 && retries < 20) {
      await new Promise((r) => setTimeout(r, 50))
      retries++
    }
    initMap()
    resizeObserver = new ResizeObserver(() => map?.resize())
    if (containerRef.value) {
      resizeObserver.observe(containerRef.value)
    }
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
    map?.remove()
    map = null
  })

  return {
    loading,
    mapAvailable,
    currentZoom,
    flying,
    updateData,
    focusProvince,
    unfocus,
    flyToGlobe,
    zoomIn,
    zoomOut,
    resize,
  }
}
