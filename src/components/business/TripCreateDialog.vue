<script setup lang="ts">
import type { DateRange } from 'reka-ui'
import { ref, computed, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { toast } from 'vue-sonner'
import { Plus, Check, X, ChevronsUpDown, MapPin, CalendarRange } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PurposeSelect from './PurposeSelect.vue'
import { cities as allCities } from '@/data/cities'
import type { City, DatePrecision } from '@/types'

/**
 * TripCreateDialog - 添加行程对话框
 *
 * 创建一个行程，并选择若干涉及城市：
 *  - 提交时父组件先 tripStore.create 创建行程
 *  - 再为每个城市 visitRecordStore.create 一条带 tripId 的到达记录
 *  - 城市经 litCities computed 自动点亮，并关联到该行程
 *
 * 字段：行程名称 + 日期（时间点/时间范围）+ 出行目的 + 涉及城市（多选）
 * 时间点：年月日三个下拉，仅年份必填，月/日可选 → 对应 datePrecision year/month/day
 * 时间范围：shadcn RangeCalendar（Popover 触发，双月并排）→ datePrecision day，startDate + endDate
 * Props: visible, loading
 * Emits: submit({ name, startDate, endDate, datePrecision, purpose, cities }), cancel, update:visible
 */

const props = withDefaults(
  defineProps<{
    visible: boolean
    loading?: boolean
  }>(),
  {
    loading: false,
  },
)

const emit = defineEmits<{
  submit: [
    data: {
      name: string
      startDate: string
      endDate: string | null
      datePrecision: DatePrecision
      purpose: string
      cities: City[]
    },
  ]
  cancel: []
  'update:visible': [value: boolean]
}>()

// ---- 日期模式：时间点 vs 时间范围 ----
type DateMode = 'point' | 'range'
const dateMode = ref<DateMode>('point')

// ---- 时间点模式：年/月/日（仅年份必填） ----
const pointYear = ref<string>('') // 'YYYY'
const pointMonth = ref<string>('') // '1-12' 或空
const pointDay = ref<string>('') // '1-31' 或空

// ---- 时间范围模式 ----
// DateRange = { start?: DateValue; end?: DateValue }，来自 reka-ui
// 初始为 null，用户在 RangeCalendar 中选择后由 v-model 写入
const rangeValue = ref<DateRange | null>(null)
// RangeCalendar Popover 开关
const rangePopoverOpen = ref(false)

// 触发器显示文本
const rangeDisplayText = computed(() => {
  const r = rangeValue.value
  if (!r || (!r.start && !r.end)) return '选择日期范围'
  const s = r.start ? formatDisplay(r.start.toString()) : ''
  const e = r.end ? formatDisplay(r.end.toString()) : ''
  if (s && e) return `${s} ~ ${e}`
  if (s) return `${s} ~`
  return `~ ${e}`
})

function formatDisplay(iso: string): string {
  // 'YYYY-MM-DD' → 'YYYY/MM/DD'，避免与时间点模式格式冲突
  return iso.replace(/-/g, '/')
}

const currentYear = new Date().getFullYear()
const yearOptions = computed(() => {
  const arr: number[] = []
  for (let y = currentYear; y >= 1980; y--) arr.push(y)
  return arr
})
const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} 月`,
}))

// 根据已选年份/月份计算当月天数
const dayOptions = computed(() => {
  if (!pointYear.value) return []
  const y = Number(pointYear.value)
  const m = pointMonth.value ? Number(pointMonth.value) : null
  // 未选月份时按 31 天兜底（实际提交时月份可选）
  const daysInMonth = m ? new Date(y, m, 0).getDate() : 31
  return Array.from({ length: daysInMonth }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1} 日`,
  }))
})

// 月份变化时若已选日超出范围则清空
watch(pointMonth, () => {
  if (pointDay.value) {
    const max = dayOptions.value.length
    if (Number(pointDay.value) > max) pointDay.value = ''
  }
})

// ---- zod schema ----
const schema = toTypedSchema(
  z.object({
    name: z
      .string({ required_error: '请输入行程名称' })
      .min(1, '请输入行程名称')
      .max(100, '名称不超过 100 字'),
    purpose: z.string({ required_error: '请选择出行目的' }).min(1, '请选择出行目的'),
  }),
)

const { values, resetForm, setFieldValue, validate } = useForm({
  validationSchema: schema,
  initialValues: {
    name: '',
    purpose: '',
  },
})

// ---- 涉及城市多选（独立管理，提交时统一校验） ----
const selectedCities = ref<City[]>([])
const cityPopoverOpen = ref(false)
const cityKeyword = ref('')
const dateError = ref('')

const cityResults = computed<City[]>(() => {
  const kw = cityKeyword.value.trim().toLowerCase()
  const selectedCodes = new Set(selectedCities.value.map((c) => c.code))
  const pool = kw
    ? allCities.filter((c) => c.name.includes(kw) || c.pinyin.toLowerCase().includes(kw))
    : allCities
  // 过滤已选，限制 50 条避免渲染过多
  return pool.filter((c) => !selectedCodes.has(c.code)).slice(0, 50)
})

function addCity(city: City, event: Event): void {
  // 阻止 Command 默认选中值与关闭 popover，实现多选
  event.preventDefault()
  if (!selectedCities.value.some((c) => c.code === city.code)) {
    selectedCities.value.push(city)
  }
  cityKeyword.value = ''
}

function removeCity(code: string): void {
  selectedCities.value = selectedCities.value.filter((c) => c.code !== code)
}

// 打开时重置表单
watch(
  () => props.visible,
  (val) => {
    if (val) {
      resetForm({
        values: {
          name: '',
          purpose: '',
        },
      })
      dateMode.value = 'point'
      pointYear.value = ''
      pointMonth.value = ''
      pointDay.value = ''
      rangeValue.value = null
      rangePopoverOpen.value = false
      dateError.value = ''
      selectedCities.value = []
      cityKeyword.value = ''
      cityPopoverOpen.value = false
    }
  },
)

function close(): void {
  emit('update:visible', false)
}

function handleCancel(): void {
  emit('cancel')
  close()
}

/**
 * 规范化日期并返回 { startDate, endDate, datePrecision }
 * 时间点：仅年份必填，月/日可选 → year/month/day 精度
 * 时间范围：startDate + endDate，精度 day
 */
function normalizeDate(): {
  startDate: string
  endDate: string | null
  datePrecision: DatePrecision
} | null {
  if (dateMode.value === 'point') {
    if (!pointYear.value) {
      dateError.value = '请选择年份'
      return null
    }
    const y = pointYear.value
    if (pointMonth.value && pointDay.value) {
      const m = String(pointMonth.value).padStart(2, '0')
      const d = String(pointDay.value).padStart(2, '0')
      dateError.value = ''
      return { startDate: `${y}-${m}-${d}`, endDate: null, datePrecision: 'day' }
    }
    if (pointMonth.value) {
      const m = String(pointMonth.value).padStart(2, '0')
      dateError.value = ''
      return { startDate: `${y}-${m}-01`, endDate: null, datePrecision: 'month' }
    }
    dateError.value = ''
    return { startDate: `${y}-01-01`, endDate: null, datePrecision: 'year' }
  }
  // range：DateRange = { start?: DateValue; end?: DateValue }
  const r = rangeValue.value
  if (!r || !r.start || !r.end) {
    dateError.value = '请选择完整的日期范围'
    return null
  }
  const start = r.start.toString() // 'YYYY-MM-DD'
  const end = r.end.toString()
  if (end < start) {
    dateError.value = '结束日期不能早于开始日期'
    return null
  }
  dateError.value = ''
  return { startDate: start, endDate: end, datePrecision: 'day' }
}

async function onSubmit(event?: Event): Promise<void> {
  event?.preventDefault()
  const normalized = normalizeDate()
  const result = await validate()

  if (!result.valid) return
  if (!normalized) return
  if (selectedCities.value.length === 0) {
    toast.warning('请至少选择一个涉及城市')
    return
  }
  const name = values.name?.trim() ?? ''
  const purpose = values.purpose ?? ''

  emit('submit', {
    name,
    startDate: normalized.startDate,
    endDate: normalized.endDate,
    datePrecision: normalized.datePrecision,
    purpose,
    cities: [...selectedCities.value],
  })
}

watch([dateMode, pointYear, pointMonth, pointDay, rangeValue], () => {
  if (!dateError.value) return
  normalizeDate()
})
</script>

<template>
  <Dialog :open="visible" @update:open="(v) => emit('update:visible', v)">
    <DialogContent class="max-w-[640px]">
      <DialogHeader>
        <DialogTitle>添加行程</DialogTitle>
        <DialogDescription>
          选择行程涉及的城市，提交后将自动点亮并关联到该行程。
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit="onSubmit">
        <!-- 行程名称 -->
        <FormField
          v-slot="{ componentField }"
          name="name"
          :validate-on-blur="false"
          :validate-on-change="false"
          :validate-on-input="false"
          :validate-on-model-update="false"
        >
          <FormItem>
            <FormLabel>行程名称</FormLabel>
            <FormControl>
              <Input placeholder="如：2024 春节江浙行" maxlength="100" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- 日期（时间点 / 时间范围） -->
        <div class="space-y-2">
          <label class="text-sm font-medium leading-none">日期</label>
          <Tabs
            :model-value="dateMode"
            @update:model-value="(v) => (dateMode = v as DateMode)"
            class="w-full"
          >
            <TabsList class="grid w-full grid-cols-2">
              <TabsTrigger value="point">时间点</TabsTrigger>
              <TabsTrigger value="range">时间范围</TabsTrigger>
            </TabsList>
          </Tabs>

          <!-- 时间点：年/月/日三个下拉同行，仅年份必填 -->
          <div class="min-h-10 space-y-2">
            <template v-if="dateMode === 'point'">
              <div class="flex gap-2">
                <Select v-model="pointYear">
                  <SelectTrigger class="flex-1">
                    <SelectValue placeholder="年份" />
                  </SelectTrigger>
                  <SelectContent class="max-h-60">
                    <SelectItem
                      v-for="y in yearOptions"
                      :key="y"
                      :value="String(y)"
                      class="cursor-pointer transition-colors hover:bg-accent"
                    >
                      {{ y }} 年
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select v-model="pointMonth">
                  <SelectTrigger class="w-24">
                    <SelectValue placeholder="月份" />
                  </SelectTrigger>
                  <SelectContent class="max-h-60">
                    <SelectItem
                      v-for="m in monthOptions"
                      :key="m.value"
                      :value="m.value"
                      class="cursor-pointer transition-colors hover:bg-accent"
                    >
                      {{ m.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select v-model="pointDay" :disabled="!pointYear">
                  <SelectTrigger class="w-24">
                    <SelectValue placeholder="日期" />
                  </SelectTrigger>
                  <SelectContent class="max-h-60">
                    <SelectItem
                      v-for="d in dayOptions"
                      :key="d.value"
                      :value="d.value"
                      class="cursor-pointer transition-colors hover:bg-accent"
                    >
                      {{ d.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </template>

            <!-- 时间范围：shadcn RangeCalendar（双月并排，Popover 触发） -->
            <template v-else>
              <Popover v-model:open="rangePopoverOpen">
                <PopoverTrigger as-child>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    :aria-expanded="rangePopoverOpen"
                    class="w-full justify-between font-normal"
                  >
                    <span class="flex items-center gap-1.5">
                      <CalendarRange class="size-4" />
                      <span
                        :class="
                          rangeValue && (rangeValue.start || rangeValue.end)
                            ? 'text-foreground whitespace-nowrap'
                            : 'text-muted-foreground'
                        "
                      >
                        {{ rangeDisplayText }}
                      </span>
                    </span>
                    <ChevronsUpDown class="size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-auto p-0" align="start">
                  <RangeCalendar
                    :model-value="rangeValue as any"
                    :number-of-months="2"
                    locale="zh-CN"
                    :week-starts-on="1"
                    weekday-format="narrow"
                    class="rounded-md border-0 shadow-sm"
                    @update:model-value="(v: DateRange) => (rangeValue = v)"
                  />
                </PopoverContent>
              </Popover>
            </template>
          </div>
          <p v-if="dateError" class="text-sm font-medium text-destructive">
            {{ dateError }}
          </p>
        </div>

        <!-- 出行目的 -->
        <FormField
          v-slot="{ value }"
          name="purpose"
          :validate-on-blur="false"
          :validate-on-change="false"
          :validate-on-input="false"
          :validate-on-model-update="false"
        >
          <FormItem>
            <FormLabel>出行目的</FormLabel>
            <FormControl>
              <PurposeSelect
                :model-value="(value as string) ?? ''"
                @update:model-value="(v: string) => setFieldValue('purpose', v)"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- 涉及城市（多选，手动管理不走 vee-validate） -->
        <div class="space-y-2">
          <label
            class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            涉及城市
          </label>
          <!-- 已选城市标签 -->
          <div v-if="selectedCities.length" class="flex flex-wrap gap-1.5">
            <Badge
              v-for="city in selectedCities"
              :key="city.code"
              variant="secondary"
              class="gap-1 pr-1"
            >
              {{ city.name }}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="size-4 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="移除"
                @click="removeCity(city.code)"
              >
                <X class="size-3" />
              </Button>
            </Badge>
          </div>

          <Popover v-model:open="cityPopoverOpen">
            <PopoverTrigger as-child>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                :aria-expanded="cityPopoverOpen"
                class="w-full justify-between font-normal"
              >
                <span class="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin class="size-4" />
                  {{ selectedCities.length ? '继续添加城市' : '搜索并选择城市' }}
                </span>
                <ChevronsUpDown class="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-[--reka-popper-anchor-width] p-0" align="start">
              <Command>
                <CommandInput v-model="cityKeyword" placeholder="搜索城市名或拼音..." />
                <CommandList>
                  <CommandEmpty>未找到城市</CommandEmpty>
                  <CommandGroup heading="城市">
                    <CommandItem
                      v-for="city in cityResults"
                      :key="city.code"
                      :value="`${city.name} ${city.pinyin}`"
                      class="cursor-pointer transition-colors hover:bg-accent"
                      @select="addCity(city, $event)"
                    >
                      <Check class="size-4 opacity-0" />
                      <span class="font-medium">{{ city.name }}</span>
                      <span class="ml-auto text-xs text-muted-foreground">
                        {{ city.provinceName }}
                      </span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p class="text-xs text-muted-foreground">
            已选 {{ selectedCities.length }} 个城市，提交后将自动点亮
          </p>
        </div>
      </form>

      <DialogFooter>
        <Button variant="outline" size="sm" :disabled="loading" @click="handleCancel">
          取消
        </Button>
        <Button size="sm" :disabled="loading" @click="onSubmit">
          <Plus class="size-4" />
          {{ loading ? '创建中...' : '创建行程' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
