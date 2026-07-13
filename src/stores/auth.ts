import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/api/supabase'
import { generateAvatarSeed } from '@/utils/avatar'
import router from '@/router'
import type { User } from '@/types'

// profiles 表行结构
interface ProfileRow {
  id: string
  email: string
  display_name: string
  avatar_seed: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => user.value !== null)

  /** 将 supabase auth user + profile 行映射为应用层 User */
  function mapUser(
    authUser: { id: string; email?: string },
    profile: ProfileRow | null,
  ): User {
    return {
      id: authUser.id,
      email: authUser.email ?? '',
      displayName: profile?.display_name,
      avatarSeed: profile?.avatar_seed,
    }
  }

  /** 拉取当前用户 profile */
  async function fetchProfile(userId: string): Promise<ProfileRow | null> {
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (err) throw new Error(err.message)
    return data as ProfileRow | null
  }

  /** 初始化：恢复会话 + 监听 auth 状态变化 */
  async function init() {
    loading.value = true
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        user.value = mapUser(session.user, profile)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          const profile = await fetchProfile(session.user.id)
          user.value = mapUser(session.user, profile)
        } catch (e) {
          error.value = e instanceof Error ? e.message : String(e)
        }
      } else {
        user.value = null
      }
    })
  }

  /** 注册：signUp 后自动登录并创建 profile */
  async function register(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (signUpError) throw signUpError

      // 自动登录（不强制邮箱确认）
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError

      if (data.user) {
        // 创建 profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email,
            display_name: email.split('@')[0] ?? email,
            avatar_seed: generateAvatarSeed(),
          })
        if (profileError) throw profileError

        const profile = await fetchProfile(data.user.id)
        user.value = mapUser(data.user, profile)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 登录 */
  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError

      if (data.user) {
        const profile = await fetchProfile(data.user.id)
        user.value = mapUser(data.user, profile)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 退出登录 */
  async function logout() {
    loading.value = true
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      user.value = null
      router.push('/login')
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 从 supabase.auth.getUser 刷新用户信息 */
  async function refreshUser() {
    try {
      const {
        data: { user: authUser },
        error: getUserError,
      } = await supabase.auth.getUser()
      if (getUserError) throw getUserError
      if (authUser) {
        const profile = await fetchProfile(authUser.id)
        user.value = mapUser(authUser, profile)
      } else {
        user.value = null
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      throw e
    }
  }

  /** 更新显示名（profiles.display_name），同步本地 user 状态 */
  async function updateDisplayName(name: string): Promise<void> {
    if (!user.value) throw new Error('未登录')
    const { error: err } = await supabase
      .from('profiles')
      .update({ display_name: name })
      .eq('id', user.value.id)
    if (err) throw new Error(err.message)
    user.value = { ...user.value, displayName: name }
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    init,
    register,
    login,
    logout,
    refreshUser,
    updateDisplayName,
  }
})
