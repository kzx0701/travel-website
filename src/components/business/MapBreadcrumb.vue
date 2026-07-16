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
  if (!crumb.level) return
  // "中国"（country 级）即使当前已激活也可点击，用于重新聚焦视角
  if (crumb.active && crumb.level !== 'country') return
  emit('navigate', crumb.level)
}
</script>

<template>
  <nav class="map-breadcrumb flex items-center gap-1 text-sm" aria-label="地图层级">
    <template v-for="(crumb, idx) in crumbs" :key="crumb.level ?? 'current'">
      <!-- 分隔符 -->
      <span v-if="idx > 0" class="text-gray-400">/</span>

      <!-- 当前级且非 country：加粗不可点 -->
      <span
        v-if="crumb.active && crumb.level !== 'country'"
        class="font-semibold text-gray-900"
        aria-current="page"
      >
        {{ crumb.label }}
      </span>

      <!-- 可点击：上级回退，或 country 级（即使激活也可点击以重新聚焦） -->
      <button
        v-else
        type="button"
        class="cursor-pointer rounded px-1 transition-colors hover:text-primary"
        :class="crumb.active ? 'font-semibold text-gray-900' : 'text-gray-500'"
        @click="handleNavigate(crumb)"
      >
        {{ crumb.label }}
      </button>
    </template>
  </nav>
</template>
