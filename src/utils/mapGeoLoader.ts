import type { MapLevel } from '@/types'

/**
 * GeoJSON 类型（结构最小化声明）
 */
export interface GeoJSONFeature {
  type: 'Feature'
  properties: Record<string, unknown>
  geometry: {
    type: string
    coordinates: unknown
  }
}

export interface GeoJSON {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

/**
 * 省份边界框（经纬度范围）
 */
export interface ProvinceBBox {
  minLng: number
  maxLng: number
  minLat: number
  maxLat: number
}

/**
 * 省份名称 → 边界框的缓存（从 china.json 解析）
 */
const provinceBBoxes = new Map<string, ProvinceBBox>()

/**
 * Vite 静态扫描 src/data/geo/ 下的所有 .json 文件
 * 文件不存在时该 glob 为空对象，loader 返回 null 不会报错
 *
 * 期望的目录结构：
 *   src/data/geo/world/                       世界国家边界（随仓库提交）
 *   src/data/geo/china.json                    全国地图
 *   src/data/geo/province/<省份adcode>.json    省级地图（如 440000.json = 广东省）
 *   src/data/geo/city/<城市adcode>.json        市级地图（如 440300.json = 深圳市）
 *
 * Vite 导入 JSON 时模块对象带 `default` 字段，故泛型声明为 { default: GeoJSON }
 */
const geoModules = import.meta.glob<{ default: GeoJSON }>('../data/geo/**/*.json')

/**
 * 根据 level + regionCode 计算应加载的 GeoJSON 文件路径（相对 src/utils/）
 */
function getGeoPath(level: MapLevel, regionCode?: string): string | null {
  if (level === 'country') {
    return '../data/geo/china.json'
  }
  if (!regionCode) return null
  if (level === 'province') {
    return `../data/geo/province/${regionCode}.json`
  }
  return `../data/geo/city/${regionCode}.json`
}

/**
 * 异步加载 GeoJSON 文件
 * 文件不存在或加载失败时返回 null（调用方需自行降级处理）
 */
export async function loadGeoJson(
  level: MapLevel,
  regionCode?: string,
): Promise<GeoJSON | null> {
  const path = getGeoPath(level, regionCode)
  if (!path) return null

  const loader = geoModules[path]
  if (!loader) {
    console.warn(
      `[mapGeoLoader] GeoJSON 文件未找到: ${path}。` +
        `请参考 src/data/README_DATA.md 下载并放置 GeoJSON 文件。`,
    )
    return null
  }

  try {
    const mod = await loader()
    const geo = mod.default

    // 全国地图加载后解析省份边界框（供自适应缩放计算用）
    if (level === 'country' && provinceBBoxes.size === 0) {
      parseProvinceBBoxes(geo)
    }

    return geo
  } catch (err) {
    console.warn(`[mapGeoLoader] GeoJSON 加载失败: ${path}`, err)
    return null
  }
}

/**
 * 清除省份边界框缓存（仅在需要强制刷新时调用）
 */
export function clearProvinceBBoxes(): void {
  provinceBBoxes.clear()
}

/**
 * 从 GeoJSON feature 中提取边界框（经纬度范围）
 * 支持 Polygon 和 MultiPolygon 类型
 */
function extractBBox(feature: GeoJSONFeature): ProvinceBBox | null {
  const coords = feature.geometry.coordinates
  if (!coords) return null

  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity

  function processRing(ring: number[][]) {
    for (const point of ring) {
      const [lng, lat] = point
      if (typeof lng !== 'number' || typeof lat !== 'number') continue
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }
  }

  if (feature.geometry.type === 'Polygon') {
    for (const ring of coords as number[][][]) {
      processRing(ring)
    }
  } else if (feature.geometry.type === 'MultiPolygon') {
    for (const polygon of coords as number[][][][]) {
      for (const ring of polygon) {
        processRing(ring)
      }
    }
  }

  if (minLng === Infinity) return null
  return { minLng, maxLng, minLat, maxLat }
}

/**
 * 从 china.json 中解析所有省份的边界框并缓存
 */
function parseProvinceBBoxes(geo: GeoJSON): void {
  for (const feature of geo.features) {
    const name = feature.properties?.name as string | undefined
    if (!name) continue
    const bbox = extractBBox(feature)
    if (bbox) {
      provinceBBoxes.set(name, bbox)
    }
  }
}

/**
 * 获取省份边界框（从 china.json 解析）
 * @param provinceName 省份名称（如 '广东省'）
 * @returns 边界框，未找到时返回 null
 */
export function getProvinceBBox(provinceName: string): ProvinceBBox | null {
  return provinceBBoxes.get(provinceName) ?? null
}
