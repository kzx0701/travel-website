<script setup lang="ts">
/**
 * ConfirmDialog - 通用确认对话框（声明式）
 *
 * 用于删除/修改等危险操作的二次确认。
 * 项目中命令式场景统一使用 ElMessageBox（文案与按钮风格见 useConfirm），
 * 本组件适用于需要在模板中声明确认弹窗的场景。
 *
 * v-model:visible  控制显隐
 * title             标题
 * message           正文（支持 \n 换行）
 * confirmText       确认按钮文案（默认"确认"）
 * cancelText        取消按钮文案（默认"取消"）
 * danger            是否为危险操作（确认按钮红色）
 */
withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    message?: string
    confirmText?: string
    cancelText?: string
    danger?: boolean
  }>(),
  {
    title: '确认操作',
    message: '',
    confirmText: '确认',
    cancelText: '取消',
    danger: false,
  },
)

const emit = defineEmits<{
  'update:visible': [val: boolean]
  confirm: []
  cancel: []
}>()

function handleClose(): void {
  emit('update:visible', false)
  emit('cancel')
}

function handleConfirm(): void {
  emit('update:visible', false)
  emit('confirm')
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="380px"
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="(v: boolean) => emit('update:visible', v)"
    @close="handleClose"
  >
    <p class="whitespace-pre-line text-sm leading-relaxed text-slate-600">
      {{ message }}
    </p>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md border border-slate-200 px-4 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50"
          @click="handleClose"
        >
          {{ cancelText }}
        </button>
        <button
          type="button"
          class="rounded-md px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-60"
          :class="danger ? 'bg-red-500 hover:bg-red-600' : 'bg-warm hover:bg-warm/90'"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </button>
      </div>
    </template>
  </el-dialog>
</template>
