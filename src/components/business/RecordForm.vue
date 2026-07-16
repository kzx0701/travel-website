<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { toast } from 'vue-sonner'
import PurposeSelect from './PurposeSelect.vue'
import TripSelector from './TripSelector.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import type { City, VisitRecord, DatePrecision } from '@/types'
import type { VisitRecordInput } from '@/api/visitRecord'

/**
 * RecordForm - 到达记录表单
 *
 * 在右侧面板展开（不弹窗）。
 * - 新增模式：不传 record；提交按钮显示"点亮城市"（首次）或"添加记录"（非首次）
 * - 编辑模式：传 record；提交按钮显示"保存"
 *
 * 日期支持四种精度：
 *  - year：仅年份（久远记忆）
 *  - month：年月
 *  - day：完整日期
 *  - range：日期范围
 */

const props = defineProps<{
  city: City
  record?: VisitRecord
  isFirst?: boolean
}>()

const emit = defineEmits<{
  submit: [data: VisitRecordInput]
  cancel: []
}>()

// ---- 日期精度模式 ----
// year/month/day 对应 datePrecision；range 视为 day 精度但有结束日期
type DateMode = 'year' | 'month' | 'day' | 'range'
const dateMode = ref<DateMode>('day')

// ---- 各模式下的值 ----
const yearValue = ref<string>('') // 'YYYY'
const monthYearValue = ref<string>('') // 'YYYY'
const monthValue = ref<string>('') // '1-12'
const dayValue = ref<string>('') // 'YYYY-MM-DD'
const rangeValue = ref<[string, string] | null>(null)

// ---- 年份/月份选项 ----
const currentYear = new Date().getFullYear()
const yearOptions = computed(() => {
  const arr: number[] = []
  for (let y = currentYear; y >= 1980; y--) arr.push(y)
  return arr
})
const monthOptions = [
  { value: '1', label: '1 月' },
  { value: '2', label: '2 月' },
  { value: '3', label: '3 月' },
  { value: '4', label: '4 月' },
  { value: '5', label: '5 月' },
  { value: '6', label: '6 月' },
  { value: '7', label: '7 月' },
  { value: '8', label: '8 月' },
  { value: '9', label: '9 月' },
  { value: '10', label: '10 月' },
  { value: '11', label: '11 月' },
  { value: '12', label: '12 月' },
]

// ---- zod schema ----
// startDate 在表单内部由各模式维护，提交时统一规范化，schema 层面设为可选
const schema = toTypedSchema(
  z.object({
    startDate: z.string().optional(),
    endDate: z.string().nullable().optional(),
    purpose: z
      .string({ required_error: '请选择出行目的' })
      .min(1, '请选择出行目的'),
    note: z.string().max(50, '备注不超过 50 字').optional().or(z.literal('')),
    tripId: z.string().nullable().optional(),
  }),
)

const { handleSubmit, setFieldValue, setValues } = useForm({
  validationSchema: schema,
  initialValues: {
    startDate: '',
    endDate: null as string | null,
    purpose: '',
    note: '',
    tripId: null as string | null,
  },
})

// ---- 初始化（编辑模式） ----
function initFromRecord(): void {
  if (!props.record) return
  const precision = props.record.datePrecision ?? 'day'
  if (props.record.endDate) {
    // 有结束日期 → range 模式
    dateMode.value = 'range'
    rangeValue.value = [props.record.startDate, props.record.endDate]
    setValues({
      startDate: props.record.startDate,
      endDate: props.record.endDate,
      purpose: props.record.purpose,
      note: props.record.note ?? '',
      tripId: props.record.tripId ?? null,
    })
  } else if (precision === 'year') {
    dateMode.value = 'year'
    yearValue.value = props.record.startDate.slice(0, 4)
    setValues({
      startDate: props.record.startDate,
      endDate: null,
      purpose: props.record.purpose,
      note: props.record.note ?? '',
      tripId: props.record.tripId ?? null,
    })
  } else if (precision === 'month') {
    dateMode.value = 'month'
    monthYearValue.value = props.record.startDate.slice(0, 4)
    monthValue.value = String(Number(props.record.startDate.slice(5, 7)))
    setValues({
      startDate: props.record.startDate,
      endDate: null,
      purpose: props.record.purpose,
      note: props.record.note ?? '',
      tripId: props.record.tripId ?? null,
    })
  } else {
    dateMode.value = 'day'
    dayValue.value = props.record.startDate
    setValues({
      startDate: props.record.startDate,
      endDate: null,
      purpose: props.record.purpose,
      note: props.record.note ?? '',
      tripId: props.record.tripId ?? null,
    })
  }
}

watch(
  () => props.record,
  () => {
    initFromRecord()
  },
)

onMounted(() => {
  initFromRecord()
})

// ---- 各模式选择回调 ----
function handleYearChange(v: string): void {
  yearValue.value = v
  setFieldValue('startDate', `${v}-01-01`)
}

function handleMonthYearChange(v: string): void {
  monthYearValue.value = v
  syncMonthStartDate()
}

function handleMonthChange(v: string): void {
  monthValue.value = v
  syncMonthStartDate()
}

function syncMonthStartDate(): void {
  if (monthYearValue.value && monthValue.value) {
    const m = String(monthValue.value).padStart(2, '0')
    setFieldValue('startDate', `${monthYearValue.value}-${m}-01`)
  }
}

function handleDayChange(value: string | [string, string] | null): void {
  if (Array.isArray(value)) return
  dayValue.value = value ?? ''
  if (value) {
    setFieldValue('startDate', value)
    setFieldValue('endDate', null)
  }
}

function handleRangeChange(value: string | [string, string] | null): void {
  if (typeof value === 'string') return
  rangeValue.value = value
  if (value && value.length === 2) {
    setFieldValue('startDate', value[0])
    setFieldValue('endDate', value[1])
  } else {
    setFieldValue('startDate', '')
    setFieldValue('endDate', null)
  }
}

// ---- 提交 ----
const submitLabel = computed(() => {
  if (props.record) return '保存'
  return props.isFirst ? '点亮城市' : '添加记录'
})

const submitting = ref(false)

const onSubmit = handleSubmit(async (values) => {
  // 根据模式校验并规范化日期
  let startDate = values.startDate ?? ''
  let endDate: string | null = null
  let datePrecision: DatePrecision = 'day'

  if (dateMode.value === 'year') {
    if (!yearValue.value) {
      toast.warning('请选择年份')
      return
    }
    startDate = `${yearValue.value}-01-01`
    datePrecision = 'year'
  } else if (dateMode.value === 'month') {
    if (!monthYearValue.value || !monthValue.value) {
      toast.warning('请选择年月')
      return
    }
    const m = String(monthValue.value).padStart(2, '0')
    startDate = `${monthYearValue.value}-${m}-01`
    datePrecision = 'month'
  } else if (dateMode.value === 'day') {
    if (!dayValue.value) {
      toast.warning('请选择到达日期')
      return
    }
    startDate = dayValue.value
    datePrecision = 'day'
  } else if (dateMode.value === 'range') {
    if (!rangeValue.value || rangeValue.value.length !== 2) {
      toast.warning('请选择日期范围')
      return
    }
    startDate = rangeValue.value[0]
    endDate = rangeValue.value[1]
    datePrecision = 'day'
    if (endDate < startDate) {
      toast.warning('结束日期不能早于开始日期')
      return
    }
  }

  submitting.value = true
  try {
    const payload: VisitRecordInput = {
      cityCode: props.city.code,
      cityName: props.city.name,
      provinceCode: props.city.provinceCode,
      provinceName: props.city.provinceName,
      startDate,
      endDate,
      datePrecision,
      purpose: values.purpose,
      note: values.note ?? '',
      tripId: values.tripId ?? null,
    }
    emit('submit', payload)
  } finally {
    submitting.value = false
  }
})

function handleCancel(): void {
  emit('cancel')
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- 顶部信息 -->
    <div class="shrink-0 border-b border-slate-100 px-5 py-4">
      <div class="flex items-baseline justify-between">
        <div>
          <h2 class="text-lg font-bold tracking-tight text-slate-800">
            {{ record ? '编辑记录' : '添加到达记录' }}
          </h2>
          <p class="mt-0.5 text-xs text-slate-400">
            {{ city.name }} · {{ city.provinceName }}
          </p>
        </div>
      </div>
    </div>

    <!-- 表单主体 -->
    <div class="flex-1 overflow-y-auto px-5 py-4">
      <form class="record-form space-y-4" @submit="onSubmit">
        <!-- 日期精度切换 -->
        <FormField name="startDate">
          <FormItem>
            <FormLabel>到达时间</FormLabel>
            <RadioGroup
              :model-value="dateMode"
              class="mb-3 flex flex-wrap gap-x-4 gap-y-2"
              @update:model-value="(v) => (dateMode = v as DateMode)"
            >
              <div class="flex items-center gap-1.5">
                <RadioGroupItem id="dm-year" value="year" />
                <label for="dm-year" class="cursor-pointer text-sm text-slate-700">仅年份</label>
              </div>
              <div class="flex items-center gap-1.5">
                <RadioGroupItem id="dm-month" value="month" />
                <label for="dm-month" class="cursor-pointer text-sm text-slate-700">年月</label>
              </div>
              <div class="flex items-center gap-1.5">
                <RadioGroupItem id="dm-day" value="day" />
                <label for="dm-day" class="cursor-pointer text-sm text-slate-700">具体日期</label>
              </div>
              <div class="flex items-center gap-1.5">
                <RadioGroupItem id="dm-range" value="range" />
                <label for="dm-range" class="cursor-pointer text-sm text-slate-700">日期范围</label>
              </div>
            </RadioGroup>

            <!-- 仅年份 -->
            <FormControl v-if="dateMode === 'year'">
              <Select
                :model-value="yearValue"
                @update:model-value="handleYearChange"
              >
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="选择年份" />
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
            </FormControl>

            <!-- 年月 -->
            <FormControl v-else-if="dateMode === 'month'">
              <div class="flex gap-2">
                <Select
                  :model-value="monthYearValue"
                  @update:model-value="handleMonthYearChange"
                >
                  <SelectTrigger class="flex-1">
                    <SelectValue placeholder="选择年份" />
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
                <Select
                  :model-value="monthValue"
                  @update:model-value="handleMonthChange"
                >
                  <SelectTrigger class="w-28">
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
              </div>
            </FormControl>

            <!-- 具体日期 -->
            <FormControl v-else-if="dateMode === 'day'">
              <DatePicker
                :model-value="dayValue"
                placeholder="选择到达日期"
                class="w-full"
                @update:model-value="handleDayChange"
              />
            </FormControl>

            <!-- 日期范围 -->
            <FormControl v-else>
              <DatePicker
                :model-value="rangeValue"
                range
                class="w-full"
                @update:model-value="handleRangeChange"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- 出行目的 -->
        <FormField v-slot="{ componentField, value }" name="purpose">
          <FormItem>
            <FormLabel>出行目的</FormLabel>
            <FormControl>
              <PurposeSelect
                :model-value="(value as string) ?? ''"
                @update:model-value="componentField['onUpdate:modelValue']"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- 备注 -->
        <FormField v-slot="{ componentField }" name="note">
          <FormItem>
            <FormLabel>备注（可选）</FormLabel>
            <FormControl>
              <Input
                type="text"
                placeholder="一句话记录此次到达，最多 50 字"
                maxlength="50"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- 行程关联 -->
        <FormField v-slot="{ value }" name="tripId">
          <FormItem>
            <FormLabel>关联行程（可选）</FormLabel>
            <FormControl>
              <TripSelector
                :model-value="(value as string | null) ?? null"
                @update:model-value="(v: string | null) => setFieldValue('tripId', v)"
              />
            </FormControl>
            <p class="mt-1 text-xs text-slate-400">
              不关联行程的记录将独立存在
            </p>
            <FormMessage />
          </FormItem>
        </FormField>
      </form>
    </div>

    <!-- 底部操作 -->
    <div class="shrink-0 border-t border-slate-100 px-5 py-3">
      <div class="flex gap-2">
        <Button
          variant="outline"
          class="h-9 flex-1"
          @click="handleCancel"
        >
          取消
        </Button>
        <Button
          class="h-9 flex-[1.5]"
          :disabled="submitting"
          @click="onSubmit"
        >
          {{ submitting ? '提交中...' : submitLabel }}
        </Button>
      </div>
    </div>
  </div>
</template>
