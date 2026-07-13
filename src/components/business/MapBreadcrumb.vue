<script setup lang="ts">
import { computed } from 'vue'
import type { MapLevel } from '@/types'

/**
 * MapBreadcrumb - 地图层级面包屑
 *
 * 显示：中国 / XX省 / XX市，可点击回上级，当前级加粗
 *
 * Props:
 *  - level: 当前层级（决定哪一级加粗）
 *  - provinceName: 当前省份名（省级/市级时显示）
 *  - cityName: 当前城市名（市级时显示）
 *
 * Emits:
 *  - navigate(level): 点击某一级时触发，回退到该层级
 */
const props = defineProps<{
  level: MapLevel
  provinceName?: string
  cityName?: string
}>()

const emit = defineEmits<{
  navigate: [level: MapLevel]
}>()

interface Crumb {
  label: string
  level: MapLevel | null
  active: boolean
}

const crumbs = computed<Crumb[]>(() => {
  const list: Crumb[] = [
    { label: '中国', level: 'country', active: props.level === 'country' },
  ]
  if (props.provinceName) {
    list.push({
      label: props.provinceName,
      level: 'province',
      active: props.level === 'province',
    })
  }
  if (props.cityName) {
    list.push({
      label: props.cityName,
      level: 'city',
      active: props.level === 'city',
    })
  }
  return list
})

function handleNavigate(crumb: Crumb): void {
  if (crumb.active || !crumb.level) return
  emit('navigate', crumb.level)
}
</script>

<template>
  <nav class="map-breadcrumb flex items-center gap-1 text-sm" aria-label="地图层级">
    <template v-for="(crumb, idx) in crumbs" :key="crumb.level ?? 'current'">
      <!-- 分隔符 -->
      <span v-if="idx > 0" class="text-gray-400">/</span>

      <!-- 当前级：加粗不可点 -->
      <span
        v-if="crumb.active"
        class="font-semibold text-gray-900"
        aria-current="page"
      >
        {{ crumb.label }}
      </span>

      <!-- 上级：可点击回退 -->
      <button
        v-else
        type="button"
        class="cursor-pointer rounded px-1 text-gray-500 transition-colors hover:text-warm"
        @click="handleNavigate(crumb)"
      >
        {{ crumb.label }}
      </button>
    </template>
  </nav>
</template>
