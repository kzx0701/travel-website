import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as visitRecordApi from '@/api/visitRecord'
import type { VisitRecord, City } from '@/types'
import { cityMap } from '@/data/cities'

/**
 * visitRecord store - 到达记录状态管理
 *
 * 维护当前用户全部到达记录，派生已点亮城市列表、城市到达次数、统计概览。
 */
export const useVisitRecordStore = defineStore('visitRecord', () => {
  const records = ref<VisitRecord[]>([])
  const loading = ref(false)

  /** 城市 → 到达次数 */
  const cityVisitCount = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const r of records.value) {
      map[r.cityCode] = (map[r.cityCode] ?? 0) + 1
    }
    return map
  })

  /** 城市 → 最近到达日期（用于"最近到达"排序） */
  const cityLastVisit = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const r of records.value) {
      const existing = map[r.cityCode]
      if (!existing || r.startDate > existing) {
        map[r.cityCode] = r.startDate
      }
    }
    return map
  })

  /** 已点亮城市列表（含完整 City 信息） */
  const litCities = computed<City[]>(() => {
    const seen = new Set<string>()
    const result: City[] = []
    for (const r of records.value) {
      if (seen.has(r.cityCode)) continue
      seen.add(r.cityCode)
      const city = cityMap[r.cityCode]
      if (city) result.push(city)
    }
    return result
  })

  /** 统计概览：点亮国家数 / 点亮城市数 / 总出行次数 */
  const stats = computed(() => {
    const citySet = new Set<string>()
    const countrySet = new Set<string>()
    for (const r of records.value) {
      citySet.add(r.cityCode)
      // 当前数据均为中国城市，按省份归属推断国家
      countrySet.add('中国')
    }
    return {
      litCountryCount: countrySet.size,
      litCityCount: citySet.size,
      totalTripCount: records.value.length,
    }
  })

  /** 加载当前用户全部到达记录 */
  async function loadAll(): Promise<void> {
    loading.value = true
    try {
      records.value = await visitRecordApi.listByUser()
    } finally {
      loading.value = false
    }
  }

  /** 加载某城市的全部到达记录（不影响全局 records） */
  async function loadByCity(cityCode: string): Promise<VisitRecord[]> {
    return visitRecordApi.listByCity(cityCode)
  }

  /** 新建到达记录 */
  async function create(
    data: visitRecordApi.VisitRecordInput,
  ): Promise<VisitRecord> {
    const record = await visitRecordApi.create(data)
    records.value = [record, ...records.value]
    return record
  }

  /** 更新到达记录 */
  async function update(
    id: string,
    data: visitRecordApi.VisitRecordUpdate,
  ): Promise<VisitRecord> {
    const record = await visitRecordApi.update(id, data)
    const idx = records.value.findIndex((r) => r.id === id)
    if (idx >= 0) records.value[idx] = record
    return record
  }

  /** 删除到达记录 */
  async function remove(id: string): Promise<void> {
    await visitRecordApi.remove(id)
    records.value = records.value.filter((r) => r.id !== id)
  }

  return {
    records,
    loading,
    cityVisitCount,
    cityLastVisit,
    litCities,
    stats,
    loadAll,
    loadByCity,
    create,
    update,
    remove,
  }
})
