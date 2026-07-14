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
import { DatePicker } from '@/components/ui/date-picker'
import type { City, VisitRecord } from '@/types'
import type { VisitRecordInput } from '@/api/visitRecord'

/**
 * RecordForm - 到达记录表单
 *
 * 在右侧面板展开（不弹窗）。
 * - 新增模式：不传 record；提交按钮显示"点亮城市"（首次）或"添加记录"（非首次）
 * - 编辑模式：传 record；提交按钮显示"保存"
 *
 * Props:
 *  - city: 目标城市
 *  - record?: 编辑模式下的初始记录
 *  - isFirst: 是否为该城市的第一条记录（用于按钮文案）
 * Emits:
 *  - submit(data)
 *  - cancel()
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

// ---- 日期类型 ----
type DateMode = 'single' | 'range'
const dateMode = ref<DateMode>('single')

// ---- 日期值 ----
const singleDate = ref<string>('')
const dateRange = ref<[string, string] | null>(null)

// ---- zod schema ----
// 备注:可选,但若填写不超过 50 字
const schema = toTypedSchema(
  z.object({
    startDate: z
      .string({ required_error: '请选择到达日期' })
      .min(1, '请选择到达日期'),
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

// ---- 初始化 ----
function initFromRecord(): void {
  if (!props.record) return
  if (props.record.endDate) {
    dateMode.value = 'range'
    dateRange.value = [props.record.startDate, props.record.endDate]
    setValues({
      startDate: props.record.startDate,
      endDate: props.record.endDate,
      purpose: props.record.purpose,
      note: props.record.note ?? '',
      tripId: props.record.tripId ?? null,
    })
  } else {
    dateMode.value = 'single'
    singleDate.value = props.record.startDate
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

// ---- 日期选择回调 ----
// DatePicker 包装器的 update:modelValue 类型为 string | [string, string] | null
// 单日期模式下回传 string | null；范围模式下回传 [string, string] | null
function handleSingleDateChange(
  value: string | [string, string] | null,
): void {
  // 单日期模式下不会回传数组，做类型守卫兜底
  if (Array.isArray(value)) return
  singleDate.value = value ?? ''
  if (value) {
    setFieldValue('startDate', value)
    setFieldValue('endDate', null)
  }
}

function handleDateRangeChange(
  value: string | [string, string] | null,
): void {
  // 范围模式下不会回传字符串
  if (typeof value === 'string') return
  dateRange.value = value
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
  // 范围日期校验：结束日期不早于开始日期
  if (
    dateMode.value === 'range' &&
    values.endDate &&
    values.endDate < values.startDate
  ) {
    toast.warning('结束日期不能早于开始日期')
    return
  }
  submitting.value = true
  try {
    const payload: VisitRecordInput = {
      cityCode: props.city.code,
      cityName: props.city.name,
      provinceCode: props.city.provinceCode,
      provinceName: props.city.provinceName,
      startDate: values.startDate,
      endDate: dateMode.value === 'range' ? values.endDate ?? null : null,
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
        <!-- 日期类型切换 -->
        <FormField name="startDate">
          <FormItem>
            <FormLabel>到达日期</FormLabel>
            <RadioGroup
              :model-value="dateMode"
              class="mb-2 flex gap-4"
              @update:model-value="(v) => (dateMode = v as DateMode)"
            >
              <div class="flex items-center gap-2">
                <RadioGroupItem id="date-mode-single" value="single" />
                <label for="date-mode-single" class="cursor-pointer text-sm text-slate-700">单日期</label>
              </div>
              <div class="flex items-center gap-2">
                <RadioGroupItem id="date-mode-range" value="range" />
                <label for="date-mode-range" class="cursor-pointer text-sm text-slate-700">日期范围</label>
              </div>
            </RadioGroup>
            <FormControl>
              <DatePicker
                v-if="dateMode === 'single'"
                :model-value="singleDate"
                placeholder="选择到达日期"
                class="w-full"
                @update:model-value="handleSingleDateChange"
              />
              <DatePicker
                v-else
                :model-value="dateRange"
                range
                class="w-full"
                @update:model-value="handleDateRangeChange"
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
