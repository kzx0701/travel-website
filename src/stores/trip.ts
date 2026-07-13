import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as tripApi from '@/api/trip'
import { useVisitRecordStore } from './visitRecord'
import type { Trip } from '@/types'

/**
 * trip store - 行程状态管理
 *
 * 维护当前用户全部行程列表，供记录表单的下拉选择与个人主页行程卡片展示。
 */
export const useTripStore = defineStore('trip', () => {
  const trips = ref<Trip[]>([])
  const loading = ref(false)

  /** 加载当前用户全部行程（含 recordCount / cityCount 聚合） */
  async function loadAll(): Promise<void> {
    loading.value = true
    try {
      trips.value = await tripApi.listByUser()
    } finally {
      loading.value = false
    }
  }

  /** 根据 id 从本地缓存读取行程 */
  function getById(id: string): Trip | undefined {
    return trips.value.find((t) => t.id === id)
  }

  /** 新建行程并加入本地列表 */
  async function create(data: {
    name: string
    startDate: string
    endDate?: string | null
  }): Promise<Trip> {
    const trip = await tripApi.create(data)
    // 新建行程尚无关联记录，聚合字段为 0
    trips.value = [
      { ...trip, recordCount: 0, cityCount: 0 },
      ...trips.value,
    ]
    return trip
  }

  /** 更新行程并同步本地列表 */
  async function update(
    id: string,
    data: { name?: string; startDate?: string; endDate?: string | null },
  ): Promise<Trip> {
    const trip = await tripApi.update(id, data)
    const idx = trips.value.findIndex((t) => t.id === id)
    if (idx >= 0) {
      // 保留聚合字段
      trips.value[idx] = {
        ...trips.value[idx],
        ...trip,
      }
    }
    return trip
  }

  /**
   * 删除行程
   * @param id 行程 id
   * @param option.deleteRecords true 一并删除关联记录；false 仅解绑（trip_id 置空）
   */
  async function remove(
    id: string,
    option: { deleteRecords: boolean },
  ): Promise<void> {
    await tripApi.remove(id, option)
    trips.value = trips.value.filter((t) => t.id !== id)
    // 关联记录要么被删除（deleteRecords=true），要么 trip_id 被置空（false），
    // 两种情况下本地 visitRecordStore 都需要刷新以保持一致。
    const visitRecordStore = useVisitRecordStore()
    try {
      await visitRecordStore.loadAll()
    } catch (e) {
      // 刷新失败不影响行程删除结果，仅记录日志
      console.error('刷新到达记录失败', e)
    }
  }

  return {
    trips,
    loading,
    loadAll,
    getById,
    create,
    update,
    remove,
  }
})
