<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'

/**
 * SkeletonLoader - 通用骨架屏加载组件
 *
 * 通过重复的脉冲块占位，平滑替换为真实内容避免闪烁。
 * 支持两种模式：
 *  - lines：渲染若干行占位条（默认 3 行）
 *  - card：渲染一张大卡片占位
 *  - 自定义插槽
 */
withDefaults(
  defineProps<{
    mode?: 'lines' | 'card'
    rows?: number
  }>(),
  {
    mode: 'lines',
    rows: 3,
  },
)
</script>

<template>
  <div class="skeleton-loader" aria-busy="true" aria-live="polite">
    <!-- 行模式：多行占位 -->
    <template v-if="mode === 'lines'">
      <div class="flex flex-col gap-2">
        <Skeleton
          v-for="i in rows"
          :key="i"
          class="h-3"
          :style="{ width: i === rows ? '60%' : '100%' }"
        />
      </div>
    </template>

    <!-- 卡片模式：单块占位 -->
    <template v-else-if="mode === 'card'">
      <Skeleton class="h-32 w-full rounded-xl" />
    </template>

    <!-- 自定义插槽 -->
    <slot v-else />
  </div>
</template>
