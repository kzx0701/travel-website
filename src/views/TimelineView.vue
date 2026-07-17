<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import EmptyState from '@/components/common/EmptyState.vue'
import TimelineItem from '@/components/business/TimelineItem.vue'
import MultiSelect from '@/components/business/MultiSelect.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from 'vue-sonner'
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
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
    .map((name) => ({ value: name, label: name }))
})

// 目的选项：从全部记录中提取去重
const purposeOptions = computed(() => {
  const set = new Set<string>()
  for (const r of visitRecordStore.records) {
    set.add(r.purpose)
  }
  return Array.from(set).map((name) => ({ value: name, label: name }))
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
    result = result.filter((r) => r.startDate >= start && r.startDate <= end)
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
    try {
      await visitRecordStore.loadAll()
    } catch (e) {
      toast.error('时间线数据加载失败，请刷新重试')
      console.error(e)
    }
  }
})
</script>

<template>
  <main class="h-full overflow-y-auto bg-muted/40">
    <div class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
      <!-- 页面标题 -->
      <div class="mb-6">
        <h1 class="font-serif text-2xl tracking-tight text-foreground">时间线</h1>
        <p class="mt-1 text-sm text-muted-foreground">按时间倒序回顾你的每一次到达</p>
      </div>

      <!-- 筛选区 -->
      <section class="mb-6 rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
        <div class="flex flex-wrap items-center gap-3">
          <MultiSelect
            v-model="selectedCities"
            :options="cityOptions"
            placeholder="按城市筛选"
            search-placeholder="搜索城市..."
            class="w-44"
          />
          <MultiSelect
            v-model="selectedPurposes"
            :options="purposeOptions"
            placeholder="按目的筛选"
            search-placeholder="搜索目的..."
            class="w-44"
          />
          <DatePicker v-model="dateRange" range class="w-72" />
          <Button
            v-if="hasActiveFilter"
            variant="outline"
            size="sm"
            class="h-8 text-xs"
            @click="clearFilters"
          >
            清除筛选
          </Button>
        </div>
      </section>

      <!-- 加载骨架屏 -->
      <div v-if="visitRecordStore.loading" class="space-y-4">
        <Skeleton v-for="i in 4" :key="i" class="h-16 rounded-lg" />
      </div>

      <!-- 空状态：无任何记录 -->
      <EmptyState
        v-else-if="!hasAnyRecords"
        icon="map"
        title="还没有到达记录"
        subtitle="前往地图点亮你的第一座城市吧"
      >
        <template #action>
          <Button as-child>
            <router-link to="/"> 去地图 </router-link>
          </Button>
        </template>
      </EmptyState>

      <!-- 空状态：筛选无结果 -->
      <EmptyState v-else-if="monthGroups.length === 0" icon="search" title="所选筛选条件下暂无记录">
        <template #action>
          <Button variant="outline" @click="clearFilters"> 清除筛选 </Button>
        </template>
      </EmptyState>

      <!-- 时间线分组 -->
      <div v-else class="space-y-8">
        <section v-for="group in monthGroups" :key="group.key">
          <!-- 月份标题 -->
          <h2 class="mb-3 inline-flex items-center gap-2 text-sm font-bold text-foreground">
            <span class="inline-block h-3 w-3 rounded-full bg-warm/20 ring-2 ring-warm/40" />
            {{ group.label }}
            <span class="text-xs font-normal text-muted-foreground">
              {{ group.records.length }} 条
            </span>
          </h2>

          <!-- 时间线（竖线 + 条目） -->
          <div class="relative space-y-3 pl-1">
            <span class="absolute bottom-3 left-[5px] top-3 w-px bg-muted" aria-hidden="true" />
            <TimelineItem v-for="record in group.records" :key="record.id" :record="record" />
          </div>
        </section>
      </div>
    </div>
  </main>
</template>
