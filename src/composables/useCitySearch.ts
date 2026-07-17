import { cities } from '@/data/cities'
import type { City } from '@/types'

/**
 * 城市搜索匹配逻辑
 * 支持按城市名（中文）或拼音模糊匹配，不区分大小写
 *
 * @param keyword 搜索关键字（城市名或拼音）
 * @param limit 返回结果数量上限，默认 10
 * @returns 匹配的城市列表
 */
export function searchCities(keyword: string, limit = 10): City[] {
  const trimmed = keyword.trim()
  if (!trimmed) return []

  const kw = trimmed.toLowerCase()
  return cities
    .filter((c) => c.name.includes(trimmed) || c.pinyin.toLowerCase().includes(kw))
    .slice(0, limit)
}
