<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import StatCard from '@/components/business/StatCard.vue'
import BaseMap from '@/components/business/BaseMap.vue'
import TripCard from '@/components/business/TripCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getPublicProfile, type PublicProfile } from '@/api/profileSettings'
import { getAvatarUrl } from '@/utils/avatar'
import { cityMap } from '@/data/cities'
import { MapPin } from '@lucide/vue'
import type { City, VisitRecord } from '@/types'

/**
 * PublicProfileView - 公开主页（匿名访问）
 *
 * Task 14：通过 /p/:token 匿名访问，无需登录。
 * - 通过 share_token 调用 SECURITY DEFINER 函数拉取公开数据
 * - 只读展示：用户卡片 + 点亮地图 + 统计 + 行程列表
 * - token 无效或主页未公开时显示错误状态
 *
 * 不使用 AppNavbar（无登录态），采用极简头部 + 注册引导。
 */

const route = useRoute()
const token = computed(() => String(route.params.token ?? ''))

const profile = ref<PublicProfile | null>(null)
const loading = ref(true)
const errorMsg = ref('')

const avatarUrl = computed(() =>
  profile.value?.avatarSeed
    ? getAvatarUrl(profile.value.avatarSeed, 128)
    : '',
)

// ---- 客户端派生：统计 / 点亮城市 / 城市到达次数 ----
const stats = computed(() => {
  const records = profile.value?.visitRecords ?? []
  const citySet = new Set<string>()
  const provinceSet = new Set<string>()
  for (const r of records) {
    citySet.add(r.cityCode)
    provinceSet.add(r.provinceCode)
  }
  return {
    litCityCount: citySet.size,
    coveredProvinceCount: provinceSet.size,
    totalTripCount: records.length,
  }
})

const litCities = computed<City[]>(() => {
  const records = profile.value?.visitRecords ?? []
  const seen = new Set<string>()
  const result: City[] = []
  for (const r of records) {
    if (seen.has(r.cityCode)) continue
    seen.add(r.cityCode)
    const city = cityMap[r.cityCode]
    if (city) result.push(city)
  }
  return result
})

const cityVisitCount = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {}
  for (const r of profile.value?.visitRecords ?? []) {
    map[r.cityCode] = (map[r.cityCode] ?? 0) + 1
  }
  return map
})

const hasRecords = computed(
  () => (profile.value?.visitRecords.length ?? 0) > 0,
)

function recordsForTrip(tripId: string): VisitRecord[] {
  return (profile.value?.visitRecords ?? []).filter(
    (r) => r.tripId === tripId,
  )
}

onMounted(async () => {
  loading.value = true
  try {
    profile.value = await getPublicProfile(token.value)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-slate-50">
    <!-- 极简头部（无登录态，不使用 AppNavbar） -->
    <header
      class="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6"
    >
      <router-link
        to="/login"
        class="flex items-center gap-2"
      >
        <MapPin class="h-6 w-6 text-warm" />
        <span class="text-base font-bold tracking-tight text-slate-800">
          足迹地图
        </span>
      </router-link>
      <Button as-child size="sm">
        <router-link to="/register">
          创建我的足迹
        </router-link>
      </Button>
    </header>

    <!-- 内容区 -->
    <main class="flex-1 overflow-y-auto">
      <div class="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <!-- 加载中 -->
        <div v-if="loading" class="space-y-6">
          <Skeleton class="h-32 rounded-xl" />
          <Skeleton class="h-80 rounded-xl" />
          <Skeleton class="h-40 rounded-xl" />
        </div>

        <!-- 错误状态 -->
        <EmptyState
          v-else-if="errorMsg"
          icon="search"
          title="主页不可访问"
          :subtitle="errorMsg + '。可能链接已失效或对方关闭了公开访问。'"
        >
          <template #action>
            <Button as-child>
              <router-link to="/login">
                返回首页
              </router-link>
            </Button>
          </template>
        </EmptyState>

        <!-- 公开主页内容 -->
        <template v-else-if="profile">
          <!-- 用户卡片 -->
          <section
            class="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div
              class="flex flex-col items-center gap-4 px-6 py-6 sm:flex-row sm:items-center"
            >
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                alt="头像"
                class="h-20 w-20 rounded-full bg-slate-100 ring-2 ring-slate-100"
              />
              <div
                v-else
                class="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-500 ring-2 ring-slate-100"
              >
                {{ profile.displayName.charAt(0).toUpperCase() }}
              </div>

              <div class="min-w-0 flex-1 text-center sm:text-left">
                <h2 class="truncate font-serif text-xl text-slate-800">
                  {{ profile.displayName }}
                </h2>
                <p class="mt-1 text-xs text-slate-400">的足迹地图</p>
              </div>

              <!-- 统计概览 -->
              <div class="grid w-full grid-cols-3 gap-2 sm:w-auto sm:gap-3">
                <StatCard
                  label="已点亮城"
                  :value="stats.litCityCount"
                />
                <StatCard
                  label="覆盖省份"
                  :value="stats.coveredProvinceCount"
                />
                <StatCard
                  label="总出行次"
                  :value="stats.totalTripCount"
                />
              </div>
            </div>
          </section>

          <!-- 空状态 -->
          <EmptyState
            v-if="!hasRecords"
            icon="map"
            title="还没有到达记录"
            subtitle="这位旅行者尚未点亮任何城市"
          />

          <template v-else>
            <!-- 点亮地图只读 -->
            <section
              class="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div class="border-b border-slate-100 px-4 py-3">
                <h2 class="text-sm font-semibold text-slate-700">
                  点亮地图
                </h2>
              </div>
              <div class="h-96">
                <BaseMap
                  level="country"
                  readonly
                  :lit-cities="litCities"
                  :city-visit-count="cityVisitCount"
                />
              </div>
            </section>

            <!-- 行程列表 -->
            <section
              class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div class="border-b border-slate-100 px-4 py-3">
                <h2 class="text-sm font-semibold text-slate-700">
                  行程列表
                </h2>
              </div>
              <div class="px-4 py-4">
                <div
                  v-if="profile.trips.length === 0"
                  class="py-8 text-center text-xs text-slate-400"
                >
                  暂无行程
                </div>
                <div v-else class="space-y-2.5">
                  <TripCard
                    v-for="trip in profile.trips"
                    :key="trip.id"
                    :trip="trip"
                    :records="recordsForTrip(trip.id)"
                    readonly
                  />
                </div>
              </div>
            </section>
          </template>
        </template>
      </div>
    </main>
  </div>
</template>
