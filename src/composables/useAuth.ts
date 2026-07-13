import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'

/**
 * 认证组合函数：封装 auth store 的常用状态与方法
 */
export function useAuth() {
  const authStore = useAuthStore()
  const { user, loading, error, isAuthenticated } = storeToRefs(authStore)

  return {
    user,
    loading,
    error,
    isAuthenticated,
    init: authStore.init,
    register: authStore.register,
    login: authStore.login,
    logout: authStore.logout,
    refreshUser: authStore.refreshUser,
  }
}
