<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronDown, LogOut, MapPin, Settings, UserRound } from '@lucide/vue'
import logoDark from '@/assets/images/logo_dark.png'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
 * 左：Logo + 标题 ｜ 中：页面切换 tabs ｜ 右：用户名/邮箱 + 下拉菜单（设置 / 退出）
 */

const route = useRoute()
const router = useRouter()
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
]

const activeTab = computed(() => route.name as string)

const user = computed(() => authStore.user)
const avatarUrl = computed(() =>
  user.value?.avatarSeed ? getAvatarUrl(user.value.avatarSeed, 64) : '',
)
const residenceLabel = computed(() => residenceStore.residence?.cityName ?? '')

function handleGotoSettings(): void {
  router.push('/settings')
}

function handleGotoProfile(): void {
  router.push('/profile')
}

async function handleLogout(): Promise<void> {
  await authStore.logout()
}
</script>

<template>
  <header
    class="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-3 sm:px-6"
  >
    <!-- 左：Logo + 标题 -->
    <div class="flex shrink-0 items-center gap-2">
      <img :src="logoDark" alt="足记" class="h-7 w-7 object-contain" />
      <span class="hidden text-base font-semibold tracking-tight text-foreground sm:inline">
        足记
      </span>
    </div>

    <!-- 中：页面切换 tabs -->
    <nav
      class="flex flex-1 items-center justify-center overflow-x-auto sm:flex-none sm:overflow-visible"
      aria-label="主导航"
    >
      <Tabs :model-value="activeTab">
        <TabsList>
          <TabsTrigger
            v-for="tab in tabs"
            :key="tab.name"
            :value="tab.name"
            class="h-7 shrink-0"
            @click="router.push(tab.to)"
          >
            {{ tab.label }}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </nav>

    <!-- 右：用户信息 -->
    <div class="flex items-center gap-3">
      <div v-if="user" class="hidden text-right lg:block">
        <p class="text-sm font-medium text-foreground">
          {{ user.displayName ?? '旅行者' }}
        </p>
        <p class="text-xs text-muted-foreground">
          {{ user.email }}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button type="button" variant="ghost" class="h-10 rounded-full px-2">
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              alt="头像"
              class="h-8 w-8 rounded-full bg-muted ring-1 ring-border"
            />
            <div
              v-else
              class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground ring-1 ring-border"
            >
              {{
                user?.displayName?.charAt(0)?.toUpperCase() ??
                user?.email?.charAt(0)?.toUpperCase() ??
                '?'
              }}
            </div>
            <span
              v-if="residenceLabel"
              class="hidden items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground md:inline-flex"
            >
              {{ residenceLabel }}
            </span>
            <ChevronDown class="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuLabel
            v-if="residenceLabel"
            class="flex items-center gap-1.5 text-xs font-normal text-muted-foreground"
          >
            <MapPin class="h-3 w-3" />
            居住地：{{ residenceLabel }}
          </DropdownMenuLabel>
          <DropdownMenuSeparator v-if="residenceLabel" />
          <DropdownMenuItem class="cursor-pointer" @select="handleGotoProfile">
            <UserRound class="h-4 w-4" />
            个人主页
          </DropdownMenuItem>
          <DropdownMenuItem class="cursor-pointer" @select="handleGotoSettings">
            <Settings class="h-4 w-4" />
            设置
          </DropdownMenuItem>
          <DropdownMenuItem
            class="cursor-pointer text-destructive focus:text-destructive"
            @select="handleLogout"
          >
            <LogOut class="h-4 w-4" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>
