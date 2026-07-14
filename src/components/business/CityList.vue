<script setup lang="ts">
import { ref, computed } from 'vue'
import { Filter, MapPin, PlusCircle } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DatePicker } from '@/components/ui/date-picker'
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

const sortLabel = computed(
  () => sortOptions.find((o) => o.key === props.sortKey)?.label ?? '排序',
)

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

function handleSortChange(key: unknown): void {
  if (typeof key !== 'string') return
  emit('changeSort', key as CitySortKey)
}

// ---- 筛选 ----
// shadcn Select 不支持"不选"作为合法值；用 ALL 哨兵代表"全部省份"
const ALL_PROVINCE = '__all__'
const filterVisible = ref(false)
const filterProvince = ref<string>(ALL_PROVINCE)
const filterPurpose = ref('')
const filterDateRange = ref<[string, string] | null>(null)

const hasActiveFilter = computed(
  () =>
    filterProvince.value !== ALL_PROVINCE ||
    !!filterPurpose.value ||
    !!filterDateRange.value,
)

function applyFilter(): void {
  const filter: CityFilter = {}
  if (filterProvince.value && filterProvince.value !== ALL_PROVINCE)
    filter.provinceCode = filterProvince.value
  if (filterPurpose.value) filter.purpose = filterPurpose.value
  if (filterDateRange.value) filter.dateRange = filterDateRange.value
  emit('changeFilter', filter)
  filterVisible.value = false
}

function resetFilter(): void {
  filterProvince.value = ALL_PROVINCE
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
        <Select :model-value="sortKey" @update:model-value="handleSortChange">
          <SelectTrigger class="h-7 w-28 px-2 text-xs">
            <SelectValue>{{ sortLabel }}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="opt in sortOptions"
              :key="opt.key"
              :value="opt.key"
            >
              {{ opt.label }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Popover v-model:open="filterVisible">
          <PopoverTrigger as-child>
            <Button
              variant="outline"
              size="icon-sm"
              class="size-7"
              :class="hasActiveFilter ? 'text-primary border-ring' : 'text-muted-foreground'"
              title="筛选"
            >
              <Filter class="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-72 p-3" align="end">
            <div class="flex flex-col gap-3">
              <div class="text-xs font-semibold text-slate-600">筛选城市</div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs text-slate-400">省份</label>
                <Select v-model="filterProvince">
                  <SelectTrigger class="h-8 w-full text-xs">
                    <SelectValue placeholder="全部省份" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem :value="ALL_PROVINCE">全部省份</SelectItem>
                    <SelectItem
                      v-for="p in provinces"
                      :key="p.code"
                      :value="p.code"
                    >
                      {{ p.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs text-slate-400">目的</label>
                <Input
                  v-model="filterPurpose"
                  placeholder="输入出行目的"
                  class="h-8 text-xs"
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs text-slate-400">时间范围</label>
                <DatePicker
                  v-model="filterDateRange"
                  range
                  class="text-xs"
                />
              </div>
              <div class="flex justify-between gap-2 pt-1">
                <Button variant="outline" size="sm" class="h-7 flex-1 text-xs" @click="resetFilter">
                  重置
                </Button>
                <Button size="sm" class="h-7 flex-1 text-xs" @click="applyFilter">
                  应用
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>

    <!-- 城市列表 -->
    <div class="flex-1 overflow-y-auto px-2 pb-3">
      <!-- 空状态 -->
      <div v-if="sortedCities.length === 0"
        class="flex flex-col items-center justify-center px-6 py-12 text-center">
        <MapPin class="mb-3 h-10 w-10 text-muted-foreground/40" :stroke-width="1.5" />
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
              class="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
              居住地
            </span>
          </div>
          <div class="truncate text-xs text-slate-400">{{ city.provinceName }}</div>
        </div>

        <!-- 到达次数徽章 -->
        <span class="inline-flex h-5 shrink-0 items-center justify-center rounded px-1.5 text-xs font-semibold tabular-nums"
          :class="isResidence(city) ? 'bg-muted text-muted-foreground' : 'bg-secondary text-secondary-foreground'">
          {{ cityVisitCount[city.code] ?? 0 }}次
        </span>

        <!-- hover + 按钮 -->
        <Button
          variant="ghost"
          size="icon-sm"
          class="size-5 shrink-0 opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
          title="添加记录"
          @click.stop="emit('add', city)"
        >
          <PlusCircle class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
