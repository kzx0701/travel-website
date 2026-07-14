<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * ConfirmDialog - 通用确认对话框（声明式，基于 shadcn AlertDialog）
 *
 * 用于删除/修改等危险操作的二次确认。AlertDialog 强制用户点击按钮，
 * 不支持点击遮罩或按 Esc 关闭，避免误操作。
 *
 * v-model:visible  控制显隐
 * title             标题
 * description       正文（支持 \n 换行）
 * confirmText       确认按钮文案（默认"确认"）
 * cancelText        取消按钮文案（默认"取消"）
 * danger            是否为危险操作（确认按钮 destructive 样式）
 *
 * Emits:
 *  - update:visible
 *  - confirm   用户点击确认按钮
 *  - cancel    用户点击取消按钮
 */
withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    description?: string
    confirmText?: string
    cancelText?: string
    danger?: boolean
  }>(),
  {
    title: '确认操作',
    description: '',
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

function handleConfirm(): void {
  emit('confirm')
}

function handleCancel(): void {
  emit('cancel')
}

function handleUpdateOpen(val: boolean): void {
  emit('update:visible', val)
}
</script>

<template>
  <AlertDialog :open="visible" @update:open="handleUpdateOpen">
    <AlertDialogContent class="max-w-[420px]">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription class="whitespace-pre-line leading-relaxed">
          {{ description }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="handleCancel">
          {{ cancelText }}
        </AlertDialogCancel>
        <AlertDialogAction
          :class="danger ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
