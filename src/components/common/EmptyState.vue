<script setup lang="ts">
import { computed } from 'vue'
import { Calendar, MapPin, Search } from '@lucide/vue'

/**
 * EmptyState - 通用空状态
 *
 * 居中展示图标 + 标题 + 副标题，可选 action 插槽（按钮等）。
 * icon 预置三种：map（地标）/ calendar（日历）/ search（搜索）。
 */
const props = withDefaults(
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

const iconSize = computed(() => (props.icon === 'map' ? 56 : 48))
</script>

<template>
  <section
    class="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 px-6 py-20 text-center"
  >
    <!-- 图标 -->
    <MapPin
      v-if="icon === 'map'"
      :size="iconSize"
      :stroke-width="1.5"
      class="mb-4 text-muted-foreground/40"
    />
    <Calendar
      v-else-if="icon === 'calendar'"
      :size="iconSize"
      :stroke-width="1.5"
      class="mb-4 text-muted-foreground/40"
    />
    <Search
      v-else
      :size="iconSize"
      :stroke-width="1.5"
      class="mb-4 text-muted-foreground/40"
    />

    <p class="text-sm font-medium text-slate-500">{{ title }}</p>
    <p v-if="subtitle" class="mt-1 text-xs text-slate-400">
      {{ subtitle }}
    </p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </section>
</template>
