<script setup lang="ts">
import { ref, computed } from 'vue'
import type { City, CitySortKey } from '@/types'
import { provinces } from '@/data/cities'
import { getVisitColor } from '@/utils/visitTier'
import type { CityFilter } from '@/stores/map'

/**
 * CityList - 已点亮城市列表
 *
 * 支持排序切换（最近到达/到达次数/拼音）与筛选（省份/目的/时间）。
 * 城市项左侧圆点按点亮强度三档着色，居住地冷蓝。
 */

const props = withDefaults(
  defineProps<{
    cities: City[]
    cityVisitCount: Record<string, number>
    residenceCityCode?: string
    sortKey: CitySortKey
    cityLastVisit?: Record<string, string>
  }>(),
  {
    residenceCityCode: '',
    cityLastVisit: () => ({}),
  },
)

const emit = defineEmits<{
  select: [city: City]
  add: [city: City]
  changeSort: [key: CitySortKey]
  changeFilter: [filter: CityFilter]
}>()

// ---- 排序 ----
const sortOptions: { key: CitySortKey; label: string }[] = [
  { key: 'recent', label: '最近到达' },
  { key: 'count', label: '到达次数' },
  { key: 'pinyin', label: '拼音' },
]

const sortedCities = computed(() => {
  const list = [...props.cities]
  switch (props.sortKey) {
    case 'recent':
      list.sort((a, b) => {
        const da = props.cityLastVisit[a.code] ?? ''
        const db = props.cityLastVisit[b.code] ?? ''
        return db.localeCompare(da)
      })
      break
    case 'count':
      list.sort(
        (a, b) =>
          (props.cityVisitCount[b.code] ?? 0) -
          (props.cityVisitCount[a.code] ?? 0),
      )
      break
    case 'pinyin':
      list.sort((a, b) => a.pinyin.localeCompare(b.pinyin))
      break
  }
  return list
})

function handleSortChange(key: CitySortKey): void {
  emit('changeSort', key)
}

// ---- 筛选 ----
const filterVisible = ref(false)
const filterProvince = ref('')
const filterPurpose = ref('')
const filterDateRange = ref<[string, string] | null>(null)

const hasActiveFilter = computed(
  () =>
    !!filterProvince.value ||
    !!filterPurpose.value ||
    !!filterDateRange.value,
)

function applyFilter(): void {
  const filter: CityFilter = {}
  if (filterProvince.value) filter.provinceCode = filterProvince.value
  if (filterPurpose.value) filter.purpose = filterPurpose.value
  if (filterDateRange.value) filter.dateRange = filterDateRange.value
  emit('changeFilter', filter)
  filterVisible.value = false
}

function resetFilter(): void {
  filterProvince.value = ''
  filterPurpose.value = ''
  filterDateRange.value = null
  emit('changeFilter', {})
}

// ---- 城市项 ----
function getDotColor(city: City): string {
  if (city.code === props.residenceCityCode) return '#3B82F6'
  return getVisitColor(props.cityVisitCount[city.code] ?? 0)
}

function isResidence(city: City): boolean {
  return city.code === props.residenceCityCode
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- 排序 + 筛选栏 -->
    <div class="flex items-center justify-between px-4 pb-2">
      <span class="text-xs font-semibold text-slate-400">城市列表</span>
      <div class="flex items-center gap-2">
        <el-select :model-value="sortKey" size="small" class="w-28" @change="handleSortChange">
          <el-option v-for="opt in sortOptions" :key="opt.key" :label="opt.label" :value="opt.key" />
        </el-select>

        <el-popover v-model:visible="filterVisible" placement="bottom-end" :width="280" trigger="click">
          <template #reference>
            <button
              type="button"
              class="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 transition-colors hover:bg-slate-50"
              :class="hasActiveFilter ? 'text-warm border-warm/40' : 'text-slate-400'"
              title="筛选"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18M7 12h10M11 18h2" />
              </svg>
            </button>
          </template>

          <div class="space-y-3 py-1">
            <div class="text-xs font-semibold text-slate-600">筛选城市</div>
            <div>
              <label class="mb-1 block text-xs text-slate-400">省份</label>
              <el-select v-model="filterProvince" size="small" clearable placeholder="全部省份" class="w-full">
                <el-option v-for="p in provinces" :key="p.code" :label="p.name" :value="p.code" />
              </el-select>
            </div>
            <div>
              <label class="mb-1 block text-xs text-slate-400">目的</label>
              <el-input v-model="filterPurpose" size="small" clearable placeholder="输入出行目的" />
            </div>
            <div>
              <label class="mb-1 block text-xs text-slate-400">时间范围</label>
              <el-date-picker v-model="filterDateRange" type="daterange" size="small"
                value-format="YYYY-MM-DD" range-separator="—" start-placeholder="开始"
                end-placeholder="结束" class="w-full" />
            </div>
            <div class="flex justify-between gap-2 pt-1">
              <button type="button"
                class="h-7 flex-1 rounded-md border border-slate-200 text-xs text-slate-500 transition-colors hover:bg-slate-50"
                @click="resetFilter">
                重置
              </button>
              <button
                type="button"
                class="h-7 flex-1 rounded-md bg-warm text-xs font-medium text-white transition-colors hover:bg-warm/90"
                @click="applyFilter"
              >
                应用
              </button>
            </div>
          </div>
        </el-popover>
      </div>
    </div>

    <!-- 城市列表 -->
    <div class="flex-1 overflow-y-auto px-2 pb-3">
      <!-- 空状态 -->
      <div v-if="sortedCities.length === 0"
        class="flex flex-col items-center justify-center px-6 py-12 text-center">
        <svg class="mb-3 h-10 w-10 text-slate-200" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <p class="text-sm text-slate-400">还没有点亮的城市，去地图上点亮吧</p>
      </div>

      <!-- 城市项 -->
      <div v-for="city in sortedCities" :key="city.code"
        class="group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-slate-50"
        :class="isResidence(city) ? 'bg-slate-50' : ''"
        @click="emit('select', city)">
        <!-- 圆点 -->
        <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: getDotColor(city) }" />

        <!-- 城市名 + 省份 -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1">
            <span class="truncate text-sm font-semibold text-slate-800">{{ city.name }}</span>
            <span v-if="isResidence(city)"
              class="shrink-0 rounded-full bg-cool/10 px-1.5 py-0.5 text-[10px] font-medium text-cool">
              居住地
            </span>
          </div>
          <div class="truncate text-xs text-slate-400">{{ city.provinceName }}</div>
        </div>

        <!-- 到达次数徽章 -->
        <span class="inline-flex h-5 shrink-0 items-center justify-center rounded px-1.5 text-xs font-semibold tabular-nums"
          :class="isResidence(city) ? 'bg-slate-100 text-slate-500' : 'bg-warm/10 text-warm'">
          {{ cityVisitCount[city.code] ?? 0 }}次
        </span>

        <!-- hover + 按钮 -->
        <button type="button"
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 opacity-0 transition-opacity hover:text-warm group-hover:opacity-100"
          title="添加记录" @click.stop="emit('add', city)">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8M12 8v8" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
