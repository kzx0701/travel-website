<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useResidenceStore } from '@/stores/residence'
import {
  provinces,
  getCitiesByProvince,
} from '@/data/cities'
import { getDistrictsByCity } from '@/data/districts'
import type { Residence } from '@/types'

/**
 * ResidenceSelector - 区县级居住地选择器
 *
 * 三级联动（省 → 市 → 区县），使用 el-cascader + checkStrictly：
 *  - 数据不全时允许只选到城市级，居住地所在城市即该城市
 *  - 保存按钮调用 residenceStore.save/update
 *  - 修改已有居住地需二次确认
 *
 * Props:  modelValue (Residence | null)
 * Emits:  update:modelValue, change(residence)
 */

interface Props {
  modelValue: Residence | null
}
const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [residence: Residence | null]
  change: [residence: Residence]
}>()

const residenceStore = useResidenceStore()

// ---- 级联选项构建 ----
interface CascaderOption {
  value: string
  label: string
  children?: CascaderOption[]
  [key: string]: unknown
}

const cascaderOptions = computed<CascaderOption[]>(() =>
  provinces.map((p) => ({
    value: p.code,
    label: p.name,
    children: getCitiesByProvince(p.code).map((c) => ({
      value: c.code,
      label: c.name,
      // 仅当该城市存在区县数据时挂载 children，否则允许选到城市级
      children: buildDistrictChildren(c.code),
    })),
  })),
)

function buildDistrictChildren(cityCode: string): CascaderOption[] | undefined {
  const list = getDistrictsByCity(cityCode)
  if (list.length === 0) return undefined
  return list.map((d) => ({ value: d.code, label: d.name }))
}

// ---- 草稿状态 ----
// 当前级联选中路径：[provinceCode, cityCode?, districtCode?]
const selectedPath = ref<string[]>([])

// 保存中状态
const saving = ref(false)

// 从 modelValue 同步草稿
function syncDraftFromModel(): void {
  const r = props.modelValue
  if (!r) {
    selectedPath.value = []
    return
  }
  const path = [r.provinceCode, r.cityCode]
  if (r.districtCode) path.push(r.districtCode)
  selectedPath.value = path
}

watch(
  () => props.modelValue,
  () => syncDraftFromModel(),
  { immediate: true },
)

// ---- 派生：当前选择信息 ----
const selectedProvinceCode = computed(() => selectedPath.value[0] ?? '')
const selectedCityCode = computed(() => selectedPath.value[1] ?? '')
const selectedDistrictCode = computed(() => selectedPath.value[2] ?? '')

const hasCityLevel = computed(() => !!selectedCityCode.value)

/** 草稿与已保存居住地是否不同（用于决定保存按钮可用性） */
const isDirty = computed(() => {
  const r = props.modelValue
  const draftCity = selectedCityCode.value
  const draftDistrict = selectedDistrictCode.value
  if (!r) return hasCityLevel.value
  return (
    r.cityCode !== draftCity ||
    r.districtCode !== draftDistrict ||
    r.provinceCode !== selectedProvinceCode.value
  )
})

/** 当前居住地展示文案 */
const currentResidenceLabel = computed(() => {
  const r = props.modelValue
  if (!r) return '未设置'
  const parts = [r.provinceName, r.cityName]
  if (r.districtName) parts.push(r.districtName)
  return parts.join(' / ')
})

// ---- 事件处理 ----
function handleCascaderChange(path: string[] | unknown): void {
  selectedPath.value = Array.isArray(path) ? (path as string[]) : []
}

/** 组装居住地输入数据 */
function buildResidenceInput() {
  const provinceCode = selectedProvinceCode.value
  const cityCode = selectedCityCode.value
  const districtCode = selectedDistrictCode.value

  const province = provinces.find((p) => p.code === provinceCode)
  const cityList = getCitiesByProvince(provinceCode)
  const city = cityList.find((c) => c.code === cityCode)
  const districtList = getDistrictsByCity(cityCode)
  const district = districtList.find((d) => d.code === districtCode)

  return {
    provinceCode,
    cityCode,
    districtCode: districtCode ?? '',
    provinceName: province?.name ?? '',
    cityName: city?.name ?? '',
    districtName: district?.name ?? '',
  }
}

async function handleSave(): Promise<void> {
  if (!hasCityLevel.value) {
    ElMessage.warning('请至少选择到城市级')
    return
  }
  if (!isDirty.value) {
    ElMessage.info('居住地未变更')
    return
  }

  const input = buildResidenceInput()
  const isModify = !!props.modelValue

  // 修改已有居住地需二次确认
  if (isModify) {
    const oldLabel = currentResidenceLabel.value
    const newParts = [input.provinceName, input.cityName]
    if (input.districtName) newParts.push(input.districtName)
    const newLabel = newParts.join(' / ')
    try {
      await ElMessageBox.confirm(
        `确认将居住地从「${oldLabel}」修改为「${newLabel}」？\n修改后旧居住地所在城市将恢复点亮，新居住地所在城市不再点亮。`,
        '修改居住地',
        {
          confirmButtonText: '确认修改',
          cancelButtonText: '取消',
          type: 'warning',
        },
      )
    } catch {
      return // 用户取消
    }
  }

  saving.value = true
  try {
    // 已存在 → update；首次设置 → save（upsert）
    const result = isModify
      ? await residenceStore.update(input)
      : await residenceStore.save(input)
    emit('update:modelValue', result)
    emit('change', result)
    ElMessage.success(isModify ? '居住地已更新' : '居住地已保存')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="residence-selector">
    <!-- 级联选择器 -->
    <el-cascader
      :model-value="selectedPath"
      :options="cascaderOptions"
      :props="{
        checkStrictly: true,
        emitPath: true,
        expandTrigger: 'hover' as const,
      }"
      placeholder="请选择省份 / 城市 / 区县"
      clearable
      class="w-full"
      popper-class="residence-cascader-popper"
      @change="handleCascaderChange"
    />

    <!-- 当前居住地展示 -->
    <div
      class="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5"
    >
      <svg
        class="h-4 w-4 shrink-0"
        :class="modelValue ? 'text-cool' : 'text-slate-400'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      <div class="min-w-0 flex-1">
        <p class="text-xs text-slate-400">当前居住地</p>
        <p
          class="truncate text-sm font-medium"
          :class="modelValue ? 'text-slate-800' : 'text-slate-400'"
        >
          {{ currentResidenceLabel }}
        </p>
      </div>
    </div>

    <!-- 操作区 -->
    <div class="mt-3 flex items-center justify-end gap-2">
      <button
        type="button"
        class="inline-flex h-9 items-center justify-center rounded-lg bg-warm px-5 text-sm font-medium text-white transition-colors hover:bg-warm/90 disabled:cursor-not-allowed disabled:bg-warm/40"
        :disabled="!hasCityLevel || !isDirty || saving"
        @click="handleSave"
      >
        {{ saving ? '保存中…' : '保存居住地' }}
      </button>
    </div>
  </div>
</template>
