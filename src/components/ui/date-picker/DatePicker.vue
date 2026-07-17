<script setup lang="ts">
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { zhCN } from 'date-fns/locale'
import '@vuepic/vue-datepicker/dist/main.css'
import { cn } from '@/lib/utils'

/**
 * DatePicker - 基于 @vuepic/vue-datepicker 的 shadcn 风格封装。
 *
 * Props:
 *  - modelValue: string | [string, string] | null
 *      range=false 时为 'YYYY-MM-DD' 字符串；
 *      range=true  时为 [start, end] 元组；
 *      null 表示未选择。
 *  - range: 是否选择范围
 *  - placeholder / startPlaceholder / endPlaceholder
 *  - clearable / disabled
 *  - class: 触发器根节点额外 class
 *
 * Emits:
 *  - update:modelValue
 */

type ModelValue = string | [string, string] | null

const props = withDefaults(
  defineProps<{
    modelValue: ModelValue
    range?: boolean
    placeholder?: string
    startPlaceholder?: string
    endPlaceholder?: string
    clearable?: boolean
    disabled?: boolean
    format?: string
    class?: string
    // 是否 teleport 弹出层到 body；在 reka-ui Dialog 内使用时需传 false，
    // 否则日历脱离 Dialog DOM 子树被 focus trap 拦截导致点击无效
    teleport?: boolean
  }>(),
  {
    range: false,
    placeholder: '选择日期',
    startPlaceholder: '开始日期',
    endPlaceholder: '结束日期',
    clearable: true,
    disabled: false,
    format: 'yyyy-MM-dd',
    teleport: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: ModelValue]
}>()

const inner = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v as ModelValue),
})
</script>

<template>
  <VueDatePicker
    v-model="inner"
    :range="range"
    model-type="yyyy-MM-dd"
    :format="format"
    :placeholder="placeholder"
    :start-placeholder="startPlaceholder"
    :end-placeholder="endPlaceholder"
    :clearable="clearable"
    :disabled="disabled"
    :enable-time-picker="false"
    :auto-apply="true"
    :locale="zhCN"
    :teleport="teleport"
    :multi-calendars="range ? 2 : false"
    :multi-calendars-solo="range"
    :partial-range="false"
    :class="cn('date-picker', props.class)"
  />
</template>
