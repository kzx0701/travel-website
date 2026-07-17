<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { MapPin } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useResidenceStore } from '@/stores/residence'
import { provinces, getCitiesByProvince } from '@/data/cities'
import { getDistrictsByCity } from '@/data/districts'
import type { Residence } from '@/types'

/**
 * ResidenceSelector - 区县级居住地选择器
 *
 * 三级联动（省 → 市 → 区县），用三个级联的 shadcn Select 实现：
 *  - 省份变化时城市清空重载，城市变化时区县清空重载
 *  - 区县数据缺失时区县 Select 禁用，居住地记为城市级（checkStrictly）
 *  - 保存按钮调用 residenceStore.save/update
 *  - 修改已有居住地需二次确认（声明式 ConfirmDialog）
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

// ---- 区县"不限"哨兵：选择后居住地记为城市级 ----
const NO_DISTRICT = '__none__'

// ---- 草稿状态：省 / 市 / 区 三级编码 ----
const selectedProvinceCode = ref('')
const selectedCityCode = ref('')
const selectedDistrictCode = ref('')

// 保存中状态
const saving = ref(false)

// 从 modelValue 同步草稿
function syncDraftFromModel(): void {
  const r = props.modelValue
  if (!r) {
    selectedProvinceCode.value = ''
    selectedCityCode.value = ''
    selectedDistrictCode.value = ''
    return
  }
  selectedProvinceCode.value = r.provinceCode
  selectedCityCode.value = r.cityCode
  selectedDistrictCode.value = r.districtCode ?? ''
}

watch(
  () => props.modelValue,
  () => syncDraftFromModel(),
  { immediate: true },
)

// ---- 派生：级联选项 ----
const cityOptions = computed(() => getCitiesByProvince(selectedProvinceCode.value))

const districtOptions = computed(() => getDistrictsByCity(selectedCityCode.value))

// 城市是否存在区县数据（无数据时禁用区县 Select，居住地记为城市级）
const hasDistricts = computed(() => districtOptions.value.length > 0)

// 区县 Select 占位文案：无区县数据时提示"暂无区县数据"
const districtPlaceholder = computed(() => {
  if (selectedCityCode.value && !hasDistricts.value) return '暂无区县数据'
  return '选择区县（可选）'
})

const hasCityLevel = computed(() => !!selectedCityCode.value)

/** 草稿与已保存居住地是否不同（用于决定保存按钮可用性） */
const isDirty = computed(() => {
  const r = props.modelValue
  if (!r) return hasCityLevel.value
  return (
    r.provinceCode !== selectedProvinceCode.value ||
    r.cityCode !== selectedCityCode.value ||
    (r.districtCode ?? '') !== selectedDistrictCode.value
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
function handleProvinceChange(code: unknown): void {
  const v = typeof code === 'string' ? code : ''
  selectedProvinceCode.value = v
  // 省份变化：清空城市与区县
  selectedCityCode.value = ''
  selectedDistrictCode.value = ''
}

function handleCityChange(code: unknown): void {
  const v = typeof code === 'string' ? code : ''
  selectedCityCode.value = v
  // 城市变化：清空区县
  selectedDistrictCode.value = ''
}

function handleDistrictChange(code: unknown): void {
  const v = typeof code === 'string' ? code : ''
  // "不限"哨兵映射回空字符串（居住地记为城市级）
  selectedDistrictCode.value = v === NO_DISTRICT ? '' : v
}

/** 组装居住地输入数据 */
function buildResidenceInput() {
  const provinceCode = selectedProvinceCode.value
  const cityCode = selectedCityCode.value
  const districtCode = selectedDistrictCode.value

  const province = provinces.find((p) => p.code === provinceCode)
  const city = cityOptions.value.find((c) => c.code === cityCode)
  const district = districtOptions.value.find((d) => d.code === districtCode)

  return {
    provinceCode,
    cityCode,
    districtCode: districtCode ?? '',
    provinceName: province?.name ?? '',
    cityName: city?.name ?? '',
    districtName: district?.name ?? '',
  }
}

// ---- 修改居住地二次确认（声明式 ConfirmDialog） ----
const confirmVisible = ref(false)
const pendingInput = ref<ReturnType<typeof buildResidenceInput> | null>(null)
const confirmDescription = ref('')

async function performSave(input: ReturnType<typeof buildResidenceInput>): Promise<void> {
  saving.value = true
  try {
    const isModify = !!props.modelValue
    // 已存在 → update；首次设置 → save（upsert）
    const result = isModify ? await residenceStore.update(input) : await residenceStore.save(input)
    emit('update:modelValue', result)
    emit('change', result)
    toast.success(isModify ? '居住地已更新' : '居住地已保存')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleSave(): Promise<void> {
  if (!hasCityLevel.value) {
    toast.warning('请至少选择到城市级')
    return
  }
  if (!isDirty.value) {
    toast('居住地未变更')
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
    pendingInput.value = input
    confirmDescription.value = `确认将居住地从「${oldLabel}」修改为「${newLabel}」？\n修改后旧居住地所在城市将恢复点亮，新居住地所在城市不再点亮。`
    confirmVisible.value = true
    return
  }

  await performSave(input)
}

function handleConfirmModify(): void {
  if (pendingInput.value) {
    void performSave(pendingInput.value)
    pendingInput.value = null
  }
}

function handleCancelModify(): void {
  pendingInput.value = null
}
</script>

<template>
  <div class="residence-selector">
    <!-- 当前居住地展示 -->
    <div class="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2.5">
      <MapPin
        class="h-4 w-4 shrink-0"
        :class="modelValue ? 'text-primary' : 'text-muted-foreground'"
      />
      <div class="min-w-0 flex-1">
        <p class="text-xs text-muted-foreground">当前居住地</p>
        <p
          class="truncate text-sm font-medium"
          :class="modelValue ? 'text-foreground' : 'text-muted-foreground'"
        >
          {{ currentResidenceLabel }}
        </p>
      </div>
    </div>

    <!-- 三级级联选择器：省 → 市 → 区县 -->
    <div class="mt-4 flex flex-col gap-2 sm:flex-row">
      <!-- 省份 -->
      <Select
        :model-value="selectedProvinceCode || undefined"
        @update:model-value="handleProvinceChange"
      >
        <SelectTrigger class="w-full sm:flex-1">
          <SelectValue placeholder="选择省份" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>省份</SelectLabel>
            <SelectItem v-for="p in provinces" :key="p.code" :value="p.code">
              {{ p.name }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      <!-- 城市 -->
      <Select
        :model-value="selectedCityCode || undefined"
        :disabled="!selectedProvinceCode"
        @update:model-value="handleCityChange"
      >
        <SelectTrigger class="w-full sm:flex-1">
          <SelectValue placeholder="选择城市" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>城市</SelectLabel>
            <SelectItem v-for="c in cityOptions" :key="c.code" :value="c.code">
              {{ c.name }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      <!-- 区县（可选；无数据时禁用，居住地记为城市级） -->
      <Select
        :model-value="selectedDistrictCode || undefined"
        :disabled="!selectedCityCode || !hasDistricts"
        @update:model-value="handleDistrictChange"
      >
        <SelectTrigger class="w-full sm:flex-1">
          <SelectValue :placeholder="districtPlaceholder" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>区县</SelectLabel>
            <SelectItem :value="NO_DISTRICT">不限区县</SelectItem>
            <SelectItem v-for="d in districtOptions" :key="d.code" :value="d.code">
              {{ d.name }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <!-- 操作区 -->
    <div class="mt-3 flex items-center justify-end gap-2">
      <Button :disabled="!hasCityLevel || !isDirty || saving" @click="handleSave">
        {{ saving ? '保存中…' : '保存居住地' }}
      </Button>
    </div>

    <!-- 修改居住地二次确认 -->
    <ConfirmDialog
      v-model:visible="confirmVisible"
      title="修改居住地"
      :description="confirmDescription"
      confirm-text="确认修改"
      cancel-text="取消"
      @confirm="handleConfirmModify"
      @cancel="handleCancelModify"
    />
  </div>
</template>
