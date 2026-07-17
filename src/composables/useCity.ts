import { cities, cityMap, citiesByProvince } from '@/data/cities'
import type { City } from '@/types'

/**
 * 城市相关工具方法
 * 提供按编码、名称、省份查找城市的复用逻辑
 */
export function useCity() {
  /** 根据城市编码查找 */
  const findByCode = (code: string): City | undefined => cityMap[code]

  /** 根据城市名查找（精确匹配） */
  const findByName = (name: string): City | undefined => cities.find((c) => c.name === name)

  /** 根据省份编码获取该省下所有城市 */
  const findByProvince = (provinceCode: string): City[] => citiesByProvince[provinceCode] ?? []

  return { findByCode, findByName, findByProvince }
}
