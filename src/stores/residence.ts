import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as residenceApi from '@/api/residence'
import type { Residence } from '@/types'

/**
 * residence store - 居住地状态管理
 *
 * 每用户仅一条居住地记录，区县级。居住地所在城市不可点亮，以冷蓝色标识。
 */
export const useResidenceStore = defineStore('residence', () => {
  const residence = ref<Residence | null>(null)
  const loading = ref(false)

  /** 居住地所在城市编码（用于地图标识与点亮拦截） */
  const residenceCityCode = computed(() => residence.value?.cityCode ?? '')

  /** 加载当前用户居住地 */
  async function load(): Promise<void> {
    loading.value = true
    try {
      residence.value = await residenceApi.getResidence()
    } finally {
      loading.value = false
    }
  }

  /** 保存居住地（不存在则插入，存在则更新） */
  async function save(
    data: residenceApi.ResidenceInput,
  ): Promise<Residence> {
    residence.value = await residenceApi.saveResidence(data)
    return residence.value
  }

  /** 更新居住地（仅更新提供的字段，必须已存在） */
  async function update(
    data: Partial<residenceApi.ResidenceInput>,
  ): Promise<Residence> {
    residence.value = await residenceApi.updateResidence(data)
    return residence.value
  }

  return {
    residence,
    loading,
    residenceCityCode,
    load,
    save,
    update,
  }
})
