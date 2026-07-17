import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as profileSettingsApi from '@/api/profileSettings'
import type { ProfileSettings } from '@/types'

/**
 * profileSettings store - 个人主页公开设置状态管理
 *
 * 每用户仅一条 profile_settings 记录，维护 is_public 与 share_token。
 * 用于设置页的可见性开关与分享链接管理，以及个人主页的公开状态展示。
 */
export const useProfileSettingsStore = defineStore('profileSettings', () => {
  const settings = ref<ProfileSettings | null>(null)
  const loading = ref(false)

  /** 加载当前用户的档案设置（无则 settings 为 null） */
  async function load(): Promise<void> {
    loading.value = true
    try {
      settings.value = await profileSettingsApi.get()
    } finally {
      loading.value = false
    }
  }

  /** 更新档案设置（不存在则插入），返回更新后的设置 */
  async function update(data: profileSettingsApi.ProfileSettingsUpdate): Promise<ProfileSettings> {
    settings.value = await profileSettingsApi.update(data)
    return settings.value
  }

  /** 生成新的分享 token 并同步本地状态，返回新 token */
  async function regenerateToken(): Promise<string> {
    const token = await profileSettingsApi.regenerateToken()
    if (settings.value) {
      settings.value = { ...settings.value, shareToken: token }
    } else {
      // 尚未加载时构造最小本地对象，避免 UI 空指针
      settings.value = {
        id: '',
        userId: '',
        isPublic: false,
        shareToken: token,
      }
    }
    return token
  }

  return {
    settings,
    loading,
    load,
    update,
    regenerateToken,
  }
})
