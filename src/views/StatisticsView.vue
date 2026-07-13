<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import StatCard from '@/components/business/StatCard.vue'
import BaseMap from '@/components/business/BaseMap.vue'
import TripCard from '@/components/business/TripCard.vue'
import PurposePieChart from '@/components/business/PurposePieChart.vue'
import { useVisitRecordStore } from '@/stores/visitRecord'
import { useTripStore } from '@/stores/trip'
import { cityMap } from '@/data/cities'
import type { City, VisitRecord } from '@/types'

/**
 * StatisticsView - 统计子页面
 *
 * 时间范围筛选作用于统计卡片 / 目的分布饼图 / 地图缩略图 / 行程列表。
 * 数据为空或筛选无结果时显示对应空状态，加载中显示骨架屏。
 */

const visitRecordStore = useVisitRecordStore()
const tripStore = useTripStore()

// ---- 时间范围筛选 ----
type RangeType = 'all' | 'thisYear' | 'lastYear' | 'custom'
const rangeType = ref<RangeType>('all')
// 自定义范围：使用 value-format 后为 [string, string] | null
const customRange = ref<[string, string] | null>(null)

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 当前筛选对应的 [start, end] 边界，null 表示不筛选 */
const rangeBounds = computed<{ start: string; end: string } | null>(() => {
  if (rangeType.value === 'all') return null
  if (rangeType.value === 'thisYear') {
    const y = new Date().getFullYear()
    return { start: `${y}-01-01`, end: `${y}-12-31` }
  }
  if (rangeType.value === 'lastYear') {
    // 最近一年 = 自今天起向前推一年
    const ago = new Date()
    ago.setFullYear(ago.getFullYear() - 1)
    return { start: formatDate(ago), end: '9999-12-31' }
  }
  // custom
  if (customRange.value && customRange.value.length === 2) {
    return { start: customRange.value[0], end: customRange.value[1] }
  }
  return null
})

// ---- 派生数据 ----
const filteredRecords = computed<VisitRecord[]>(() => {
  const bounds = rangeBounds.value
  if (!bounds) return visitRecordStore.records
  return visitRecordStore.records.filter(
    (r) => r.startDate >= bounds.start && r.startDate <= bounds.end,
  )
})

const filteredStats = computed(() => {
  const citySet = new Set<string>()
  const provinceSet = new Set<string>()
  for (const r of filteredRecords.value) {
    citySet.add(r.cityCode)
    provinceSet.add(r.provinceCode)
  }
  return {
    litCityCount: citySet.size,
    coveredProvinceCount: provinceSet.size,
    totalTripCount: filteredRecords.value.length,
  }
})

const filteredLitCities = computed<City[]>(() => {
  const seen = new Set<string>()
  const result: City[] = []
  for (const r of filteredRecords.value) {
    if (seen.has(r.cityCode)) continue
    seen.add(r.cityCode)
    const city = cityMap[r.cityCode]
    if (city) result.push(city)
  }
  return result
})

const filteredCityVisitCount = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {}
  for (const r of filteredRecords.value) {
    map[r.cityCode] = (map[r.cityCode] ?? 0) + 1
  }
  return map
})

const filteredTrips = computed(() => {
  const bounds = rangeBounds.value
  if (!bounds) return tripStore.trips
  return tripStore.trips.filter(
    (t) => t.startDate >= bounds.start && t.startDate <= bounds.end,
  )
})

function recordsForTrip(tripId: string): VisitRecord[] {
  return visitRecordStore.records.filter((r) => r.tripId === tripId)
}

// ---- 状态标记 ----
const hasAnyRecords = computed(() => visitRecordStore.records.length > 0)
const hasFilteredData = computed(() => filteredRecords.value.length > 0)

onMounted(async () => {
  await Promise.all([visitRecordStore.loadAll(), tripStore.loadAll()])
})
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-slate-50">
    <!-- 顶部导航 -->
    <AppNavbar />

    <!-- 内容区 -->
    <main class="flex-1 overflow-y-auto">
      <div class="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <!-- 页面标题 -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold tracking-tight text-slate-800">
            统计
          </h1>
          <p class="mt-1 text-sm text-slate-500">
            查看你的足迹概览与出行目的分布
          </p>
        </div>

        <!-- 时间范围筛选 -->
        <section
          class="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
          <el-radio-group v-model="rangeType">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="thisYear">今年</el-radio-button>
            <el-radio-button value="lastYear">最近一年</el-radio-button>
            <el-radio-button value="custom">自定义</el-radio-button>
          </el-radio-group>
          <el-date-picker
            v-if="rangeType === 'custom'"
            v-model="customRange"
            type="daterange"
            range-separator="—"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            class="!w-72"
          />
        </section>

        <!-- 加载骨架屏 -->
        <div v-if="visitRecordStore.loading" class="space-y-6">
          <div class="grid grid-cols-3 gap-3">
            <div
              v-for="i in 3"
              :key="i"
              class="h-20 animate-pulse rounded-lg bg-slate-100"
            />
          </div>
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div class="h-80 animate-pulse rounded-xl bg-slate-100" />
            <div class="h-80 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>

        <!-- 空状态：无任何记录 -->
        <EmptyState
          v-else-if="!hasAnyRecords"
          icon="map"
          title="还没有到达记录"
          subtitle="前往地图点亮你的第一座城市吧"
        >
          <template #action>
            <router-link
              to="/"
              class="inline-flex h-9 items-center rounded-lg bg-warm px-4 text-sm font-semibold text-white transition-colors hover:bg-warm/90"
            >
              去地图
            </router-link>
          </template>
        </EmptyState>

        <!-- 空状态：筛选无结果 -->
        <EmptyState
          v-else-if="!hasFilteredData"
          icon="calendar"
          title="所选时间范围内暂无记录"
          subtitle="尝试切换其他时间范围"
        />

        <!-- 统计内容 -->
        <template v-else>
          <!-- 统计卡片行 -->
          <section class="mb-6 grid grid-cols-3 gap-3">
            <div
              class="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-4 shadow-sm"
            >
              <StatCard
                label="已点亮城"
                :value="filteredStats.litCityCount"
              />
            </div>
            <div
              class="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-4 shadow-sm"
            >
              <StatCard
                label="覆盖省份"
                :value="filteredStats.coveredProvinceCount"
              />
            </div>
            <div
              class="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-4 shadow-sm"
            >
              <StatCard
                label="总出行次"
                :value="filteredStats.totalTripCount"
              />
            </div>
          </section>

          <!-- 饼图 + 地图缩略 -->
          <section class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <!-- 目的分布饼图 -->
            <div
              class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div class="border-b border-slate-100 px-4 py-3">
                <h2 class="text-sm font-semibold text-slate-700">
                  出行目的分布
                </h2>
              </div>
              <div class="h-80 p-2">
                <PurposePieChart :records="filteredRecords" />
              </div>
            </div>

            <!-- 点亮地图缩略图 -->
            <div
              class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div class="border-b border-slate-100 px-4 py-3">
                <h2 class="text-sm font-semibold text-slate-700">
                  点亮地图
                </h2>
              </div>
              <div class="h-80">
                <BaseMap
                  level="country"
                  readonly
                  :lit-cities="filteredLitCities"
                  :city-visit-count="filteredCityVisitCount"
                />
              </div>
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
                v-if="filteredTrips.length === 0"
                class="py-8 text-center text-xs text-slate-400"
              >
                该时间范围内暂无行程
              </div>
              <div v-else class="space-y-2.5">
                <TripCard
                  v-for="trip in filteredTrips"
                  :key="trip.id"
                  :trip="trip"
                  :records="recordsForTrip(trip.id)"
                  readonly
                />
              </div>
            </div>
          </section>
        </template>
      </div>
    </main>
  </div>
</template>
