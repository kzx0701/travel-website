<script setup lang="ts">
/**
 * EmptyState - 通用空状态
 *
 * 居中展示图标 + 标题 + 副标题，可选 action 插槽（按钮等）。
 * icon 预置三种：map（地标）/ calendar（日历）/ search（搜索）。
 */
withDefaults(
  defineProps<{
    icon?: 'map' | 'calendar' | 'search'
    title: string
    subtitle?: string
  }>(),
  {
    icon: 'map',
    subtitle: '',
  },
)
</script>

<template>
  <section
    class="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 px-6 py-20 text-center"
  >
    <!-- 图标 -->
    <svg
      v-if="icon === 'map'"
      class="mb-4 h-14 w-14 text-slate-200"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
    <svg
      v-else-if="icon === 'calendar'"
      class="mb-4 h-12 w-12 text-slate-200"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
    <svg
      v-else
      class="mb-4 h-12 w-12 text-slate-200"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>

    <p class="text-sm font-medium text-slate-500">{{ title }}</p>
    <p v-if="subtitle" class="mt-1 text-xs text-slate-400">
      {{ subtitle }}
    </p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </section>
</template>
