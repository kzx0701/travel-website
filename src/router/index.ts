import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    name: 'map',
    component: () => import('@/views/MapView.vue'),
    meta: { requiresAuth: true, showNavbar: true },
  },
  {
    path: '/statistics',
    name: 'statistics',
    component: () => import('@/views/StatisticsView.vue'),
    meta: { requiresAuth: true, showNavbar: true },
  },
  {
    path: '/timeline',
    name: 'timeline',
    component: () => import('@/views/TimelineView.vue'),
    meta: { requiresAuth: true, showNavbar: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { requiresAuth: true, showNavbar: true },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true, showNavbar: true },
  },
  {
    // 公开主页：通过 share_token 匿名访问，无需登录
    path: '/p/:token',
    name: 'publicProfile',
    component: () => import('@/views/PublicProfileView.vue'),
    meta: { requiresAuth: false },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 确保 init 只执行一次
let initPromise: Promise<void> | null = null

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!initPromise) {
    initPromise = auth.init()
  }
  await initPromise

  // 未登录访问受保护页面 → 跳转登录页并带 redirect
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // 已登录访问登录/注册页 → 跳转首页
  if ((to.name === 'login' || to.name === 'register') && auth.isAuthenticated) {
    return { path: '/' }
  }

  return true
})

export default router
