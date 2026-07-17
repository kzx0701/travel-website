<script setup lang="ts">
import { Button, type ButtonVariants } from '@/components/ui/button'

withDefaults(
  defineProps<{
    variant?: ButtonVariants['variant']
    size?: ButtonVariants['size']
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  {
    variant: 'default',
    size: 'default',
    type: 'button',
    disabled: false,
  },
)
</script>

<template>
  <Button :variant="variant" :size="size" :type="type" :disabled="disabled">
    <slot />
  </Button>
</template>
