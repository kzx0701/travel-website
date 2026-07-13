<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import PurposeSelect from './PurposeSelect.vue'
import TripSelector from './TripSelector.vue'
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

// ---- 表单数据 ----
const singleDate = ref<string>('')

interface FormState {
  startDate: string
  endDate: string | null
  purpose: string
  note: string
  tripId: string | null
}

const form = reactive<FormState>({
  startDate: '',
  endDate: null,
  purpose: '',
  note: '',
  tripId: null,
})

const dateRange = ref<[string, string] | null>(null)

const formRef = ref<FormInstance | null>(null)
const submitting = ref(false)

// ---- 初始化 ----
function syncFromDateMode(): void {
  if (dateMode.value === 'single') {
    if (singleDate.value) {
      form.startDate = singleDate.value
      form.endDate = null
    }
  } else {
    if (dateRange.value && dateRange.value.length === 2) {
      form.startDate = dateRange.value[0]
      form.endDate = dateRange.value[1]
    }
  }
}

function initFromRecord(): void {
  if (!props.record) return
  if (props.record.endDate) {
    dateMode.value = 'range'
    dateRange.value = [props.record.startDate, props.record.endDate]
    form.startDate = props.record.startDate
    form.endDate = props.record.endDate
  } else {
    dateMode.value = 'single'
    singleDate.value = props.record.startDate
    form.startDate = props.record.startDate
    form.endDate = null
  }
  form.purpose = props.record.purpose
  form.note = props.record.note ?? ''
  form.tripId = props.record.tripId ?? null
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

// ---- 校验规则 ----
const rules = computed<FormRules<FormState>>(() => ({
  purpose: [{ required: true, message: '请选择出行目的', trigger: 'change' }],
}))

function handleSingleDateChange(value: string | null): void {
  if (value) {
    form.startDate = value
    form.endDate = null
  }
}

function handleDateRangeChange(
  value: [string, string] | null,
): void {
  if (value && value.length === 2) {
    form.startDate = value[0]
    form.endDate = value[1]
  } else {
    form.startDate = ''
    form.endDate = null
  }
}

// ---- 提交 ----
const submitLabel = computed(() => {
  if (props.record) return '保存'
  return props.isFirst ? '点亮城市' : '添加记录'
})

async function handleSubmit(): Promise<void> {
  // 日期必填校验
  if (!form.startDate) {
    ElMessage.warning('请选择到达日期')
    return
  }
  // 目的必选校验
  if (!form.purpose) {
    ElMessage.warning('请选择出行目的')
    return
  }
  // 范围日期校验：结束日期不早于开始日期
  if (dateMode.value === 'range' && form.endDate && form.endDate < form.startDate) {
    ElMessage.warning('结束日期不能早于开始日期')
    return
  }
  // 表单内部规则校验
  syncFromDateMode()
  if (formRef.value) {
    try {
      await formRef.value.validate()
    } catch {
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
      startDate: form.startDate,
      endDate: dateMode.value === 'range' ? form.endDate : null,
      purpose: form.purpose,
      note: form.note,
      tripId: form.tripId,
    }
    emit('submit', payload)
  } finally {
    submitting.value = false
  }
}

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
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="record-form"
      >
        <!-- 日期类型切换 -->
        <el-form-item label="到达日期" required>
          <el-radio-group v-model="dateMode" class="mb-2">
            <el-radio value="single">单日期</el-radio>
            <el-radio value="range">日期范围</el-radio>
          </el-radio-group>
          <el-date-picker
            v-if="dateMode === 'single'"
            :model-value="singleDate"
            type="date"
            placeholder="选择到达日期"
            value-format="YYYY-MM-DD"
            class="w-full"
            @update:model-value="handleSingleDateChange"
          />
          <el-date-picker
            v-else
            :model-value="dateRange"
            type="daterange"
            range-separator="—"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            class="w-full"
            @update:model-value="handleDateRangeChange"
          />
        </el-form-item>

        <!-- 出行目的 -->
        <el-form-item label="出行目的" prop="purpose" required>
          <PurposeSelect v-model="form.purpose" />
        </el-form-item>

        <!-- 备注 -->
        <el-form-item label="备注（可选）">
          <el-input
            v-model="form.note"
            type="text"
            placeholder="一句话记录此次到达，最多 50 字"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>

        <!-- 行程关联 -->
        <el-form-item label="关联行程（可选）">
          <TripSelector v-model="form.tripId" />
          <p class="mt-1 text-xs text-slate-400">
            不关联行程的记录将独立存在
          </p>
        </el-form-item>
      </el-form>
    </div>

    <!-- 底部操作 -->
    <div class="shrink-0 border-t border-slate-100 px-5 py-3">
      <div class="flex gap-2">
        <button
          type="button"
          class="h-9 flex-1 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          @click="handleCancel"
        >
          取消
        </button>
        <button
          type="button"
          class="h-9 flex-[1.5] rounded-lg bg-warm text-sm font-semibold text-white transition-colors hover:bg-warm/90 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="submitting"
          @click="handleSubmit"
        >
          {{ submitting ? '提交中...' : submitLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
