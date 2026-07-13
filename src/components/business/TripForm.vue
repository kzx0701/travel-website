<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
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

interface FormState {
  name: string
  dateRange: [string, string] | null
}

const form = reactive<FormState>({
  name: '',
  dateRange: null,
})

const formRef = ref<FormInstance | null>(null)

const rules: FormRules<FormState> = {
  name: [
    { required: true, message: '请输入行程名称', trigger: 'blur' },
    { max: 100, message: '名称不超过 100 字', trigger: 'blur' },
  ],
  dateRange: [
    {
      required: true,
      validator: (_rule, value, callback) => {
        if (!value || value.length !== 2 || !value[0] || !value[1]) {
          callback(new Error('请选择行程日期范围'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
}

// 打开对话框时初始化表单
watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (props.trip) {
        form.name = props.trip.name
        if (props.trip.startDate && props.trip.endDate) {
          form.dateRange = [props.trip.startDate, props.trip.endDate]
        } else {
          // 行程必有日期范围，兜底用 startDate 占位
          form.dateRange = [
            props.trip.startDate,
            props.trip.endDate ?? props.trip.startDate,
          ]
        }
      } else {
        form.name = ''
        form.dateRange = null
      }
      formRef.value?.clearValidate()
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

async function handleSubmit(): Promise<void> {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (!form.dateRange || form.dateRange.length !== 2) {
    ElMessage.warning('请选择行程日期范围')
    return
  }
  emit('submit', {
    name: form.name.trim(),
    startDate: form.dateRange[0],
    endDate: form.dateRange[1],
  })
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="420px"
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="(v: boolean) => emit('update:visible', v)"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="trip-form"
    >
      <el-form-item label="行程名称" prop="name" required>
        <el-input
          v-model="form.name"
          placeholder="如：2024 春节江浙行"
          maxlength="100"
          show-word-limit
          clearable
        />
      </el-form-item>

      <el-form-item label="日期范围" prop="dateRange" required>
        <el-date-picker
          v-model="form.dateRange"
          type="daterange"
          range-separator="—"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          class="w-full"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="loading"
          @click="handleCancel"
        >
          取消
        </button>
        <button
          type="button"
          class="rounded-md bg-warm px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-warm/90 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="loading"
          @click="handleSubmit"
        >
          {{ loading ? '提交中...' : isEdit ? '保存' : '创建' }}
        </button>
      </div>
    </template>
  </el-dialog>
</template>
