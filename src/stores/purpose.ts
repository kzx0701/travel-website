import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as purposeApi from '@/api/purpose'
import type { PurposeCategory } from '@/types'

/**
 * purpose store - 出行目的分类状态管理
 *
 * 维护系统预设 + 当前用户自定义分类列表，供 PurposeSelect 等组件使用。
 */
export const usePurposeStore = defineStore('purpose', () => {
  const categories = ref<PurposeCategory[]>([])
  const loading = ref(false)

  /** 系统预设分类 */
  const systemCategories = computed(() =>
    categories.value.filter((c) => c.isSystem),
  )

  /** 当前用户自定义分类 */
  const customCategories = computed(() =>
    categories.value.filter((c) => !c.isSystem),
  )

  /** 加载全部分类（系统 + 自定义） */
  async function loadAll(): Promise<void> {
    loading.value = true
    try {
      categories.value = await purposeApi.listAll()
    } finally {
      loading.value = false
    }
  }

  /** 新建自定义分类并加入列表 */
  async function createCustom(name: string): Promise<PurposeCategory> {
    const category = await purposeApi.createCustom(name)
    categories.value = [...categories.value, category].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    )
    return category
  }

  /**
   * 删除自定义分类
   * 后端会同时将使用该分类名的 visit_records.purpose 转为 "其他"，
   * 删除完成后本地同步刷新到达记录（由调用方负责）。
   */
  async function removeCustom(id: string): Promise<void> {
    await purposeApi.removeCustom(id)
    categories.value = categories.value.filter((c) => c.id !== id)
  }

  return {
    categories,
    loading,
    systemCategories,
    customCategories,
    loadAll,
    createCustom,
    removeCustom,
  }
})
