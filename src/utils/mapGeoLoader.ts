import * as echarts from 'echarts/core'
import type { MapLevel } from '@/types'

/**
 * GeoJSON 类型（结构最小化声明，ECharts 仅使用 features）
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
 * Vite 静态扫描 src/data/geo/ 下的所有 .json 文件
 * 文件不存在时该 glob 为空对象，loader 返回 null 不会报错
 *
 * 期望的目录结构：
 *   src/data/geo/china.json                    全国地图
 *   src/data/geo/province/<省份adcode>.json    省级地图（如 440000.json = 广东省）
 *   src/data/geo/city/<城市adcode>.json        市级地图（如 440300.json = 深圳市）
 *
 * Vite 导入 JSON 时模块对象带 `default` 字段，故泛型声明为 { default: GeoJSON }
 */
const geoModules = import.meta.glob<{ default: GeoJSON }>('../data/geo/**/*.json')

/**
 * 已注册过的地图名集合（避免重复注册）
 */
const registeredMaps = new Set<string>()

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
 * 计算注册到 ECharts 的地图名
 * - country 级：'china'
 * - province 级：`province-${regionCode}`
 * - city 级：`city-${regionCode}`
 */
export function getMapName(level: MapLevel, regionCode?: string): string {
  if (level === 'country') return 'china'
  if (level === 'province') return `province-${regionCode}`
  return `city-${regionCode}`
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
    return mod.default
  } catch (err) {
    console.warn(`[mapGeoLoader] GeoJSON 加载失败: ${path}`, err)
    return null
  }
}

/**
 * 加载并注册地图到 ECharts 实例
 *
 * @returns 注册后的地图名；若 GeoJSON 不可用则返回 null（调用方可降级到无底图渲染）
 */
export async function registerMapForLevel(
  level: MapLevel,
  regionCode?: string,
): Promise<string | null> {
  const mapName = getMapName(level, regionCode)
  if (registeredMaps.has(mapName)) return mapName

  const geo = await loadGeoJson(level, regionCode)
  if (!geo) return null

  try {
    echarts.registerMap(mapName, geo as unknown as Parameters<typeof echarts.registerMap>[1])
    registeredMaps.add(mapName)
    return mapName
  } catch (err) {
    console.warn(`[mapGeoLoader] 地图注册失败: ${mapName}`, err)
    return null
  }
}

/**
 * 清除已注册地图缓存（仅在需要强制刷新地图数据时调用）
 */
export function clearRegisteredMaps(): void {
  registeredMaps.clear()
}
