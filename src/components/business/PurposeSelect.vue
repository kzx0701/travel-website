<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { usePurposeStore } from '@/stores/purpose'

/**
 * PurposeSelect - 出行目的选择器
 *
 * 合并展示系统预设 + 用户自定义分类（el-option-group 分组）。
 * 支持在下拉底部点击 "+ 新建分类" 创建自定义分类并自动选中。
 *
 * Props:
 *  - modelValue: 当前选中的目的分类名（字符串）
 * Emits:
 *  - update:modelValue
 *  - change(name)
 */
defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const purposeStore = usePurposeStore()

onMounted(async () => {
  if (purposeStore.categories.length === 0) {
    try {
      await purposeStore.loadAll()
    } catch (e) {
      ElMessage.error('出行目的加载失败')
      console.error(e)
    }
  }
})

const systemCategories = computed(() => purposeStore.systemCategories)
const customCategories = computed(() => purposeStore.customCategories)

function handleChange(value: string | number | boolean | null): void {
  const v = String(value ?? '')
  emit('update:modelValue', v)
  emit('change', v)
}

// ---- 新建自定义分类 ----
const newCategoryVisible = ref(false)
const newCategoryName = ref('')
const creating = ref(false)

function openCreate(): void {
  newCategoryVisible.value = true
  newCategoryName.value = ''
}

async function confirmCreate(): Promise<void> {
  const name = newCategoryName.value.trim()
  if (!name) {
    ElMessage.warning('请输入分类名称')
    return
  }
  // 重名校验
  const exists = purposeStore.categories.some((c) => c.name === name)
  if (exists) {
    ElMessage.warning('该分类已存在')
    return
  }
  creating.value = true
  try {
    const category = await purposeStore.createCustom(name)
    emit('update:modelValue', category.name)
    emit('change', category.name)
    newCategoryVisible.value = false
    newCategoryName.value = ''
    ElMessage.success('已新建分类')
  } catch (e) {
    ElMessage.error('新建失败')
    console.error(e)
  } finally {
    creating.value = false
  }
}

function cancelCreate(): void {
  newCategoryVisible.value = false
  newCategoryName.value = ''
}
</script>

<template>
  <el-select
    :model-value="modelValue"
    placeholder="请选择出行目的"
    class="w-full"
    :loading="purposeStore.loading"
    @change="handleChange"
  >
    <!-- 系统预设分组 -->
    <el-option-group
      v-if="systemCategories.length"
      label="系统预设"
    >
      <el-option
        v-for="cat in systemCategories"
        :key="cat.id"
        :label="cat.name"
        :value="cat.name"
      />
    </el-option-group>

    <!-- 自定义分组 -->
    <el-option-group
      v-if="customCategories.length"
      label="我的自定义"
    >
      <el-option
        v-for="cat in customCategories"
        :key="cat.id"
        :label="cat.name"
        :value="cat.name"
      />
    </el-option-group>

    <!-- 新建分类入口 -->
    <template #footer>
      <button
        type="button"
        class="flex w-full items-center justify-center gap-1 py-1.5 text-xs font-medium text-warm transition-colors hover:text-warm/80"
        @click="openCreate"
      >
        <svg
          class="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        新建分类
      </button>
    </template>
  </el-select>

  <!-- 新建分类弹窗 -->
  <el-dialog
    v-model="newCategoryVisible"
    title="新建出行目的分类"
    width="360px"
    append-to-body
    :close-on-click-modal="false"
  >
    <el-input
      v-model="newCategoryName"
      placeholder="如：摄影、徒步"
      maxlength="10"
      show-word-limit
      @keyup.enter="confirmCreate"
    />
    <template #footer>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50"
          @click="cancelCreate"
        >
          取消
        </button>
        <button
          type="button"
          class="rounded-md bg-warm px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-warm/90 disabled:opacity-60"
          :disabled="creating"
          @click="confirmCreate"
        >
          {{ creating ? '创建中...' : '创建' }}
        </button>
      </div>
    </template>
  </el-dialog>
</template>
