<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import type { City, MapLevel } from '@/types'
import { useMapChart, type UseMapChartCallbacks } from '@/composables/useMapChart'
import { provinces } from '@/data/cities'

/**
 * BaseMap - 统一渲染 API 的三级地图组件
 *
 * Props:
 *  - level: 当前地图层级
 *  - regionCode: 省份或城市编码（country 级为空）
 *  - litCities: 已点亮城市列表（含经纬度）
 *  - cityVisitCount: 城市编码 → 到达次数
 *  - residenceCityCode: 居住地城市编码
 *  - readonly: 只读模式，不响应点击
 *
 * Emits:
 *  - cityClick(city)
 *  - regionClick(code, name)  // 下钻触发
 */
const props = withDefaults(
  defineProps<{
    level: MapLevel
    regionCode?: string
    litCities?: City[]
    cityVisitCount?: Record<string, number>
    residenceCityCode?: string
    readonly?: boolean
  }>(),
  {
    regionCode: '',
    litCities: () => [],
    cityVisitCount: () => ({}),
    residenceCityCode: '',
    readonly: false,
  },
)

const emit = defineEmits<{
  cityClick: [city: City]
  regionClick: [code: string, name: string]
}>()

const containerRef = ref<HTMLDivElement | null>(null)

// 组装 composable 入参
const chartParams = computed(() => ({
  level: props.level,
  regionCode: props.regionCode,
  litCities: props.litCities,
  cityVisitCount: props.cityVisitCount,
  residenceCityCode: props.residenceCityCode,
  readonly: props.readonly,
}))

const callbacks = computed<UseMapChartCallbacks>(() => ({
  onCityClick: (city: City) => emit('cityClick', city),
  onRegionClick: (code: string, name: string) => {
    // 全国级点击省份时，GeoJSON 仅返回 region 名称，需反查省份 adcode
    if (props.level === 'country') {
      const matched = provinces.find((p) => p.name === code || p.name === name)
      if (matched) {
        emit('regionClick', matched.code, matched.name)
        return
      }
      // 名称匹配失败时回传原 name（调用方可降级处理）
      emit('regionClick', code, name)
      return
    }
    emit('regionClick', code, name)
  },
}))

const {
  loading,
  mapAvailable,
  zoomIn,
  zoomOut,
  renderChart,
  updateData,
} = useMapChart(containerRef, chartParams, callbacks)

// 层级或区域编码变化 → 重新注册并渲染地图
watch(
  () => [props.level, props.regionCode],
  () => {
    renderChart()
  },
)

// 仅数据变化 → 局部更新（避免重新注册地图）
watch(
  () => [props.litCities, props.cityVisitCount, props.residenceCityCode, props.readonly],
  () => {
    updateData()
  },
  { deep: true },
)
</script>

<template>
  <div class="base-map relative h-full w-full overflow-hidden bg-white">
    <!-- 地图容器 -->
    <div ref="containerRef" class="absolute inset-0" />

    <!-- 加载骨架屏遮罩 -->
    <div
      v-if="loading"
      class="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm"
    >
      <div class="flex flex-col items-center gap-3 text-primary">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span class="text-sm text-gray-500">地图加载中…</span>
      </div>
    </div>

    <!-- GeoJSON 缺失提示（降级提示，不阻塞渲染） -->
    <div
      v-if="!loading && !mapAvailable"
      class="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-md bg-amber-50/95 px-3 py-1.5 text-xs text-amber-700 shadow-sm ring-1 ring-amber-200"
    >
      未检测到 GeoJSON 文件，当前为降级渲染模式。请参考
      <code class="font-mono text-amber-800">src/data/README_DATA.md</code> 下载地图数据。
    </div>

    <!-- 缩放控制按钮组 -->
    <div
      v-if="!readonly"
      class="absolute right-3 top-3 z-10 flex flex-col gap-1.5 rounded-md bg-white/90 p-0.5 shadow-sm ring-1 ring-gray-200"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        class="size-8 rounded text-lg text-gray-600 hover:text-primary"
        title="放大"
        @click="zoomIn"
      >
        +
      </Button>
      <div class="mx-1 h-px bg-gray-200" />
      <Button
        variant="ghost"
        size="icon-sm"
        class="size-8 rounded text-lg text-gray-600 hover:text-primary"
        title="缩小"
        @click="zoomOut"
      >
        −
      </Button>
    </div>

    <!-- 图例 -->
    <div
      class="pointer-events-none absolute bottom-3 right-3 z-10 flex flex-col gap-1 rounded-md bg-white/90 px-3 py-2 text-xs text-gray-600 shadow-sm ring-1 ring-gray-200"
    >
      <div class="flex items-center gap-2">
        <span class="inline-block h-3 w-3 rounded-full" style="background-color: #FFB380" />
        <span>到达 1 次</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="inline-block h-3 w-3 rounded-full" style="background-color: #FF6B35" />
        <span>到达 2-3 次</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="inline-block h-3 w-3 rounded-full" style="background-color: #E05A20" />
        <span>到达 4+ 次</span>
      </div>
      <div class="flex items-center gap-2">
        <span
          class="inline-block h-3 w-3 rounded-full"
          style="background-color: #3B82F6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3)"
        />
        <span>居住地</span>
      </div>
    </div>
  </div>
</template>
