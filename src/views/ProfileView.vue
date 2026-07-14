<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import EmptyState from '@/components/common/EmptyState.vue'
import StatCard from '@/components/business/StatCard.vue'
import BaseMap from '@/components/business/BaseMap.vue'
import TripCard from '@/components/business/TripCard.vue'
import TripForm from '@/components/business/TripForm.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth'
import { useVisitRecordStore } from '@/stores/visitRecord'
import { useTripStore } from '@/stores/trip'
import { useResidenceStore } from '@/stores/residence'
import { useProfileSettingsStore } from '@/stores/profileSettings'
import { getAvatarUrl } from '@/utils/avatar'
import { ChevronRight } from '@lucide/vue'
import type { City, Trip, VisitRecord } from '@/types'

/**
 * ProfileView - 个人主页（登录用户视角）
 *
 * - 顶部用户卡片：头像（大）+ 显示名 + 邮箱 + 统计概览
 * - 点亮地图只读展示（BaseMap readonly country 级）
 * - 行程列表（TripCard 可编辑/删除，按时间倒序，展开显示关联记录）
 * - 公开/私密切换入口（跳转设置页管理）
 */

const authStore = useAuthStore()
const visitRecordStore = useVisitRecordStore()
const tripStore = useTripStore()
const residenceStore = useResidenceStore()
const profileSettingsStore = useProfileSettingsStore()

const user = computed(() => authStore.user)
const avatarUrl = computed(() =>
  user.value?.avatarSeed ? getAvatarUrl(user.value.avatarSeed, 128) : '',
)

const stats = computed(() => visitRecordStore.stats)
const litCities = computed<City[]>(() => visitRecordStore.litCities)
const cityVisitCount = computed(() => visitRecordStore.cityVisitCount)
const residenceCityCode = computed(
  () => residenceStore.residence?.cityCode ?? '',
)

const isPublic = computed(
  () => profileSettingsStore.settings?.isPublic ?? false,
)

const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      visitRecordStore.loadAll(),
      tripStore.loadAll(),
      profileSettingsStore.settings
        ? Promise.resolve()
        : profileSettingsStore.load().catch(() => {}),
      residenceStore.residence
        ? Promise.resolve()
        : residenceStore.load().catch(() => {}),
    ])
  } finally {
    loading.value = false
  }
})

/** 某行程的关联记录（按起始日期倒序） */
function recordsForTrip(tripId: string): VisitRecord[] {
  return visitRecordStore.records.filter((r) => r.tripId === tripId)
}

const hasRecords = computed(() => visitRecordStore.records.length > 0)

// ---- 行程编辑/删除 ----
const editVisible = ref(false)
const editingTrip = ref<Trip | undefined>(undefined)
const editSaving = ref(false)

function handleTripEdit(trip: Trip): void {
  editingTrip.value = trip
  editVisible.value = true
}

async function handleTripEditSubmit(data: {
  name: string
  startDate: string
  endDate: string | null
}): Promise<void> {
  if (!editingTrip.value) return
  editSaving.value = true
  try {
    await tripStore.update(editingTrip.value.id, {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
    })
    toast.success('行程已更新')
    editVisible.value = false
    editingTrip.value = undefined
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '更新失败')
  } finally {
    editSaving.value = false
  }
}

async function handleTripDelete(
  trip: Trip,
  option: { deleteRecords: boolean },
): Promise<void> {
  try {
    await tripStore.remove(trip.id, option)
    toast.success(
      option.deleteRecords ? '行程及关联记录已删除' : '行程已删除（记录已保留）',
    )
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '删除失败')
  }
}
</script>

<template>
  <div class="h-full overflow-hidden bg-slate-50">
    <!-- 内容区 -->
    <main class="h-full overflow-y-auto">
      <div class="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <!-- 页面标题 + 可见性入口 -->
        <div class="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 class="font-serif text-2xl tracking-tight text-slate-800">
              个人主页
            </h1>
            <p class="mt-1 text-sm text-slate-500">
              你的足迹概览与公开主页管理
            </p>
          </div>
          <Button as-child variant="outline" class="shrink-0">
            <router-link to="/settings">
              <span
                class="inline-block h-2 w-2 rounded-full"
                :class="isPublic ? 'bg-green-500' : 'bg-slate-300'"
              />
              {{ isPublic ? '公开中' : '私密' }}
              <ChevronRight class="h-3.5 w-3.5 text-muted-foreground" />
            </router-link>
          </Button>
        </div>

        <!-- 加载骨架屏 -->
        <div v-if="loading" class="space-y-6">
          <Skeleton class="h-32 rounded-xl" />
          <Skeleton class="h-80 rounded-xl" />
          <Skeleton class="h-40 rounded-xl" />
        </div>

        <template v-else>
          <!-- 用户卡片 -->
          <section
            class="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div class="flex flex-col items-center gap-4 px-6 py-6 sm:flex-row sm:items-center">
              <!-- 头像（大） -->
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
                {{ user?.email?.charAt(0)?.toUpperCase() ?? '?' }}
              </div>

              <!-- 显示名 + 邮箱 -->
              <div class="min-w-0 flex-1 text-center sm:text-left">
                <h2 class="truncate text-xl font-bold text-slate-800">
                  {{ user?.displayName ?? '旅行者' }}
                </h2>
                <p class="mt-1 truncate text-sm text-slate-400">
                  {{ user?.email ?? '—' }}
                </p>
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

          <!-- 空状态：无任何记录 -->
          <EmptyState
            v-if="!hasRecords"
            icon="map"
            title="还没有到达记录"
            subtitle="前往地图点亮你的第一座城市吧"
          >
            <template #action>
              <Button as-child>
                <router-link to="/">
                  去地图
                </router-link>
              </Button>
            </template>
          </EmptyState>

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
                  :residence-city-code="residenceCityCode"
                />
              </div>
            </section>

            <!-- 行程列表 -->
            <section
              class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div class="border-b border-slate-100 px-4 py-3">
                <h2 class="text-sm font-semibold text-slate-700">我的行程</h2>
              </div>
              <div class="px-4 py-4">
                <div
                  v-if="tripStore.trips.length === 0"
                  class="py-8 text-center text-xs text-slate-400"
                >
                  暂无行程
                </div>
                <div v-else class="space-y-2.5">
                  <TripCard
                    v-for="trip in tripStore.trips"
                    :key="trip.id"
                    :trip="trip"
                    :records="recordsForTrip(trip.id)"
                    @edit="handleTripEdit"
                    @delete="handleTripDelete"
                  />
                </div>
              </div>
            </section>
          </template>
        </template>
      </div>
    </main>

    <!-- 行程编辑对话框 -->
    <TripForm
      :trip="editingTrip"
      :visible="editVisible"
      :loading="editSaving"
      @update:visible="(v) => (editVisible = v)"
      @submit="handleTripEditSubmit"
    />
  </div>
</template>
