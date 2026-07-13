<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import TimelineItem from '@/components/business/TimelineItem.vue'
import { useVisitRecordStore } from '@/stores/visitRecord'
import type { VisitRecord } from '@/types'

/**
 * TimelineView - 时间线子页面
 *
 * 按城市/目的/时间范围筛选到达记录，按起始日期倒序，按月份分组展示。
 * 数据为空或筛选无结果时显示对应空状态，加载中显示骨架屏。
 */

const visitRecordStore = useVisitRecordStore()

// ---- 筛选 ----
const selectedCities = ref<string[]>([])
const selectedPurposes = ref<string[]>([])
const dateRange = ref<[string, string] | null>(null)

// 城市选项：从全部记录中提取去重（按 cityName）
const cityOptions = computed(() => {
  const set = new Set<string>()
  for (const r of visitRecordStore.records) {
    set.add(r.cityName)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
})

// 目的选项：从全部记录中提取去重
const purposeOptions = computed(() => {
  const set = new Set<string>()
  for (const r of visitRecordStore.records) {
    set.add(r.purpose)
  }
  return Array.from(set)
})

const hasActiveFilter = computed(
  () =>
    selectedCities.value.length > 0 ||
    selectedPurposes.value.length > 0 ||
    dateRange.value !== null,
)

function clearFilters(): void {
  selectedCities.value = []
  selectedPurposes.value = []
  dateRange.value = null
}

// ---- 过滤 + 排序 ----
const filteredRecords = computed<VisitRecord[]>(() => {
  let result = visitRecordStore.records
  if (selectedCities.value.length > 0) {
    const set = new Set(selectedCities.value)
    result = result.filter((r) => set.has(r.cityName))
  }
  if (selectedPurposes.value.length > 0) {
    const set = new Set(selectedPurposes.value)
    result = result.filter((r) => set.has(r.purpose))
  }
  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value
    result = result.filter(
      (r) => r.startDate >= start && r.startDate <= end,
    )
  }
  // 按起始日期倒序（日期范围按起始日期）
  return [...result].sort((a, b) => b.startDate.localeCompare(a.startDate))
})

// ---- 按月份分组 ----
interface MonthGroup {
  key: string // "YYYY-MM"
  label: string // "YYYY年M月"
  records: VisitRecord[]
}

const monthGroups = computed<MonthGroup[]>(() => {
  const map = new Map<string, VisitRecord[]>()
  for (const r of filteredRecords.value) {
    const [y, m] = r.startDate.split('-')
    const key = `${y}-${m}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  const groups: MonthGroup[] = []
  map.forEach((records, key) => {
    const [y, m] = key.split('-')
    groups.push({
      key,
      label: `${y}年${Number(m)}月`,
      records, // 已是倒序
    })
  })
  // 月份倒序
  return groups.sort((a, b) => b.key.localeCompare(a.key))
})

// ---- 状态标记 ----
const hasAnyRecords = computed(() => visitRecordStore.records.length > 0)

onMounted(async () => {
  // 按需加载：若未加载则拉取
  if (!visitRecordStore.loading && visitRecordStore.records.length === 0) {
    await visitRecordStore.loadAll()
  }
})
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-slate-50">
    <!-- 顶部导航 -->
    <AppNavbar />

    <!-- 内容区 -->
    <main class="flex-1 overflow-y-auto">
      <div class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
        <!-- 页面标题 -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold tracking-tight text-slate-800">
            时间线
          </h1>
          <p class="mt-1 text-sm text-slate-500">
            按时间倒序回顾你的每一次到达
          </p>
        </div>

        <!-- 筛选区 -->
        <section
          class="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
          <div class="flex flex-wrap items-center gap-3">
            <el-select
              v-model="selectedCities"
              multiple
              collapse-tags
              collapse-tags-tooltip
              clearable
              placeholder="按城市筛选"
              class="!w-44"
            >
              <el-option
                v-for="name in cityOptions"
                :key="name"
                :label="name"
                :value="name"
              />
            </el-select>
            <el-select
              v-model="selectedPurposes"
              multiple
              collapse-tags
              collapse-tags-tooltip
              clearable
              placeholder="按目的筛选"
              class="!w-44"
            >
              <el-option
                v-for="name in purposeOptions"
                :key="name"
                :label="name"
                :value="name"
              />
            </el-select>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="—"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              class="!w-72"
            />
            <button
              v-if="hasActiveFilter"
              type="button"
              class="inline-flex h-8 items-center rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50"
              @click="clearFilters"
            >
              清除筛选
            </button>
          </div>
        </section>

        <!-- 加载骨架屏 -->
        <div v-if="visitRecordStore.loading" class="space-y-4">
          <div
            v-for="i in 4"
            :key="i"
            class="h-16 animate-pulse rounded-lg bg-slate-100"
          />
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
          v-else-if="monthGroups.length === 0"
          icon="search"
          title="所选筛选条件下暂无记录"
        >
          <template #action>
            <button
              type="button"
              class="inline-flex h-9 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              @click="clearFilters"
            >
              清除筛选
            </button>
          </template>
        </EmptyState>

        <!-- 时间线分组 -->
        <div v-else class="space-y-8">
          <section v-for="group in monthGroups" :key="group.key">
            <!-- 月份标题 -->
            <h2
              class="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-700"
            >
              <span
                class="inline-block h-3 w-3 rounded-full bg-warm/20 ring-2 ring-warm/40"
              />
              {{ group.label }}
              <span class="text-xs font-normal text-slate-400">
                {{ group.records.length }} 条
              </span>
            </h2>

            <!-- 时间线（竖线 + 条目） -->
            <div class="relative space-y-3 pl-1">
              <span
                class="absolute bottom-3 left-[5px] top-3 w-px bg-slate-200"
                aria-hidden="true"
              />
              <TimelineItem
                v-for="record in group.records"
                :key="record.id"
                :record="record"
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>
