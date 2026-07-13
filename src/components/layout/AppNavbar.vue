<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useResidenceStore } from '@/stores/residence'
import { getAvatarUrl } from '@/utils/avatar'

/**
 * AppNavbar - 顶部导航栏
 *
 * 高 56px，纯白背景，底部淡灰边框。
 * 左：Logo + 标题 ｜ 中：页面切换 tabs ｜ 右：用户信息 + 下拉退出
 */

const route = useRoute()
const authStore = useAuthStore()
const residenceStore = useResidenceStore()

interface TabItem {
  name: string
  label: string
  to: string
}

const tabs: TabItem[] = [
  { name: 'map', label: '地图', to: '/' },
  { name: 'statistics', label: '统计', to: '/statistics' },
  { name: 'timeline', label: '时间线', to: '/timeline' },
  { name: 'profile', label: '个人主页', to: '/profile' },
  { name: 'settings', label: '设置', to: '/settings' },
]

const activeTab = computed(() => route.name as string)

const user = computed(() => authStore.user)
const avatarUrl = computed(() =>
  user.value?.avatarSeed
    ? getAvatarUrl(user.value.avatarSeed, 64)
    : '',
)
const residenceLabel = computed(
  () => residenceStore.residence?.cityName ?? '',
)

async function handleLogout(): Promise<void> {
  await authStore.logout()
}
</script>

<template>
  <header
    class="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 sm:px-6"
  >
    <!-- 左：Logo + 标题 -->
    <div class="flex shrink-0 items-center gap-2">
      <span class="flex h-7 w-7 items-center justify-center">
        <svg
          class="h-6 w-6 text-warm"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </span>
      <span class="hidden text-base font-bold tracking-tight text-slate-800 sm:inline">
        足迹地图
      </span>
    </div>

    <!-- 中：页面切换 tabs（移动端可横向滚动） -->
    <nav
      class="flex flex-1 items-center justify-center gap-1 overflow-x-auto sm:flex-none sm:overflow-visible"
      aria-label="主导航"
    >
      <router-link
        v-for="tab in tabs"
        :key="tab.name"
        :to="tab.to"
        class="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-md px-2.5 text-sm font-semibold transition-colors sm:px-4"
        :class="
          activeTab === tab.name
            ? 'bg-warm text-white'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
        "
      >
        {{ tab.label }}
      </router-link>
    </nav>

    <!-- 右：用户信息 -->
    <div class="flex items-center gap-3">
      <span v-if="user" class="hidden text-xs text-slate-400 lg:inline">
        {{ user.email }}
      </span>
      <el-dropdown trigger="click" placement="bottom-end">
        <div class="flex cursor-pointer items-center gap-2">
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            alt="头像"
            class="h-8 w-8 rounded-full bg-slate-100 ring-1 ring-slate-200"
          />
          <div
            v-else
            class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 ring-1 ring-slate-200"
          >
            {{ user?.email?.charAt(0)?.toUpperCase() ?? '?' }}
          </div>
          <span
            v-if="residenceLabel"
            class="hidden items-center gap-1 rounded-full bg-cool/10 px-2 py-0.5 text-xs font-medium text-cool md:inline-flex"
          >
            {{ residenceLabel }}
          </span>
          <svg
            class="h-4 w-4 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item disabled>
              <span class="text-xs text-slate-400">
                {{ user?.email }}
              </span>
            </el-dropdown-item>
            <el-dropdown-item v-if="residenceLabel" disabled>
              <span class="text-xs text-slate-400">
                居住地：{{ residenceLabel }}
              </span>
            </el-dropdown-item>
            <el-dropdown-item divided @click="handleLogout">
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>
