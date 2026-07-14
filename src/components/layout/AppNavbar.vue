<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronDown, LogOut, MapPin } from '@lucide/vue'
import logoDark from '@/assets/images/logo_dark.png'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
      <img
        :src="logoDark"
        alt="足记"
        class="h-7 w-7 object-contain"
      />
      <span class="hidden text-base font-bold tracking-tight text-slate-800 sm:inline">
        足记
      </span>
    </div>

    <!-- 中：页面切换 tabs（移动端可横向滚动，shadcn Tabs 风格） -->
    <nav
      class="flex flex-1 items-center justify-center overflow-x-auto sm:flex-none sm:overflow-visible"
      aria-label="主导航"
    >
      <div
        class="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-muted/60 p-1 text-muted-foreground"
      >
        <router-link
          v-for="tab in tabs"
          :key="tab.name"
          :to="tab.to"
          class="inline-flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-all"
          :class="
            activeTab === tab.name
              ? 'bg-background text-foreground shadow-sm'
              : 'hover:text-foreground'
          "
        >
          {{ tab.label }}
        </router-link>
      </div>
    </nav>

    <!-- 右：用户信息 -->
    <div class="flex items-center gap-3">
      <span v-if="user" class="hidden text-xs text-slate-400 lg:inline">
        {{ user.email }}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            class="flex cursor-pointer items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
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
            <ChevronDown class="h-4 w-4 text-slate-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuLabel class="text-xs font-normal text-slate-400">
            {{ user?.email }}
          </DropdownMenuLabel>
          <DropdownMenuLabel
            v-if="residenceLabel"
            class="flex items-center gap-1.5 text-xs font-normal text-slate-400"
          >
            <MapPin class="h-3 w-3" />
            居住地：{{ residenceLabel }}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="cursor-pointer text-destructive focus:text-destructive" @select="handleLogout">
            <LogOut class="h-4 w-4" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>
