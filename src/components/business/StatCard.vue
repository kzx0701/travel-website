<script setup lang="ts">
/**
 * StatCard - 紧凑统计卡片
 *
 * 用于左侧快捷统计：已点亮城市数 / 覆盖省份数 / 总出行次数
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
  <div
    class="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-center"
  >
    <div class="flex items-center gap-1">
      <span
        v-if="icon"
        class="text-xs leading-none text-warm"
        v-html="icon"
      />
      <span
        class="text-lg font-bold tracking-tight text-slate-800 tabular-nums"
      >
        {{ value }}
      </span>
    </div>
    <div class="mt-0.5 text-xs text-slate-400">{{ label }}</div>
  </div>
</template>
