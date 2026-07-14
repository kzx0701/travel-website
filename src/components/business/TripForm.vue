<script setup lang="ts">
import { computed, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DatePicker } from '@/components/ui/date-picker'
import type { Trip } from '@/types'

/**
 * TripForm - 行程创建/编辑表单（对话框形式）
 *
 * 用于：
 *  - TripSelector 中的"新建行程"
 *  - TripCard 编辑行程（由父组件打开）
 *
 * 组件本身只负责校验与 emit submit；真正的 API 调用由父组件处理。
 * 父组件通过 loading 控制"提交中"状态。
 *
 * Props:
 *  - trip?: 编辑模式下的初始行程（不传为新建模式）
 *  - visible: 对话框可见性
 *  - loading?: 父组件提交中（控制按钮禁用 + 文案）
 * Emits:
 *  - submit({ name, startDate, endDate })
 *  - cancel()
 *  - update:visible
 */
const props = withDefaults(
  defineProps<{
    trip?: Trip
    visible: boolean
    loading?: boolean
  }>(),
  {
    loading: false,
  },
)

const emit = defineEmits<{
  submit: [data: { name: string; startDate: string; endDate: string | null }]
  cancel: []
  'update:visible': [value: boolean]
}>()

const isEdit = computed(() => !!props.trip)
const title = computed(() => (isEdit.value ? '编辑行程' : '新建行程'))

// ---- zod schema ----
const schema = toTypedSchema(
  z.object({
    name: z
      .string({ required_error: '请输入行程名称' })
      .min(1, '请输入行程名称')
      .max(100, '名称不超过 100 字'),
    dateRange: z
      .array(z.string())
      .length(2, '请选择行程日期范围')
      .or(z.null()),
  }),
)

const { handleSubmit, setFieldValue, setValues, resetForm } = useForm({
  validationSchema: schema,
  initialValues: {
    name: '',
    dateRange: null as [string, string] | null,
  },
})

// 打开对话框时初始化表单
watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (props.trip) {
        if (props.trip.startDate && props.trip.endDate) {
          setValues({
            name: props.trip.name,
            dateRange: [props.trip.startDate, props.trip.endDate],
          })
        } else {
          // 行程必有日期范围，兜底用 startDate 占位
          setValues({
            name: props.trip.name,
            dateRange: [
              props.trip.startDate,
              props.trip.endDate ?? props.trip.startDate,
            ],
          })
        }
      } else {
        resetForm({
          values: {
            name: '',
            dateRange: null,
          },
        })
      }
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

const onSubmit = handleSubmit((values) => {
  const range = values.dateRange
  if (!range || range.length !== 2 || !range[0] || !range[1]) {
    toast.warning('请选择行程日期范围')
    return
  }
  emit('submit', {
    name: values.name.trim(),
    startDate: range[0],
    endDate: range[1],
  })
})

// DatePicker range 模式回传 [string, string] | null（包装器 emit 类型为 string | [string, string] | null）
function handleDateRangeChange(
  value: string | [string, string] | null,
): void {
  if (typeof value === 'string') return
  setFieldValue('dateRange', value)
}
</script>

<template>
  <Dialog
    :open="visible"
    @update:open="(v) => emit('update:visible', v)"
  >
    <DialogContent class="max-w-[420px]">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription class="sr-only">
          {{ title }}
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit="onSubmit">
        <FormField v-slot="{ componentField }" name="name">
          <FormItem>
            <FormLabel>行程名称</FormLabel>
            <FormControl>
              <Input
                placeholder="如：2024 春节江浙行"
                maxlength="100"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ value }" name="dateRange">
          <FormItem>
            <FormLabel>日期范围</FormLabel>
            <FormControl>
              <DatePicker
                :model-value="(value as [string, string] | null) ?? null"
                range
                class="w-full"
                @update:model-value="handleDateRangeChange"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </form>

      <DialogFooter>
        <Button
          variant="outline"
          size="sm"
          :disabled="loading"
          @click="handleCancel"
        >
          取消
        </Button>
        <Button
          size="sm"
          :disabled="loading"
          @click="onSubmit"
        >
          {{ loading ? '提交中...' : isEdit ? '保存' : '创建' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
