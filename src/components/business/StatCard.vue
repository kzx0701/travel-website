<script setup lang="ts">
/**
 * StatCard - 紧凑统计卡片
 *
 * 用于左侧快捷统计：点亮国家数 / 点亮城市数 / 出行次数
 * 样式参考 shadcn --preset b37uZfrW7：上标签小字 + 下数值大字
 */
withDefaults(
  defineProps<{
    label: string
    value: number | string
    icon?: string
  }>(),
  {
    icon: '',
  },
)
</script>

<template>
  <div class="flex flex-1 flex-col items-center justify-center text-center">
    <div class="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
      {{ label }}
    </div>
    <div class="mt-0.5 flex items-center gap-1">
      <span
        v-if="icon"
        class="text-xs leading-none text-primary"
        v-html="icon"
      />
      <span class="text-base font-semibold tracking-tight text-zinc-800 tabular-nums">
        {{ value }}
      </span>
    </div>
  </div>
</template>
