<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import type { City, MapLevel } from '@/types'
import { useMapLibre, type UseMapLibreParams, type UseMapLibreCallbacks } from '@/composables/useMapLibre'
import { provinces, getCityByCode } from '@/data/cities'
import 'maplibre-gl/dist/maplibre-gl.css'

/**
 * BaseMap - 统一渲染 API 的三级地图组件（MapLibre GL JS）
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
const mapParams = computed<UseMapLibreParams>(() => ({
  level: props.level,
  regionCode: props.regionCode,
  litCities: props.litCities,
  cityVisitCount: props.cityVisitCount,
  residenceCityCode: props.residenceCityCode,
  readonly: props.readonly,
}))

const callbacks = computed<UseMapLibreCallbacks>(() => ({
  onCityClick: (city: City) => emit('cityClick', city),
  onRegionClick: (code: string, name: string) => {
    // 全国级点击省份时，GeoJSON 仅返回 region 名称，需反查省份 adcode
    if (props.level === 'country') {
      const matched = provinces.find((p) => p.name === code || p.name === name)
      if (matched) {
        emit('regionClick', matched.code, matched.name)
        return
      }
      emit('regionClick', code, name)
      return
    }
    emit('regionClick', code, name)
  },
}))

const {
  loading,
  mapAvailable,
  currentZoom,
  zoomIn,
  zoomOut,
  updateData,
  focusProvince,
  unfocus,
} = useMapLibre(containerRef, mapParams, callbacks)

// 暴露 unfocus 给父组件，用于"点击中国"时重新聚焦视角
defineExpose({ unfocus })

// 层级或区域编码变化 → 聚焦/取消聚焦
watch(
  () => [props.level, props.regionCode] as const,
  ([level, regionCode]) => {
    if (level === 'country') {
      unfocus()
    } else if (level === 'province' && regionCode) {
      focusProvince(regionCode)
    } else if (level === 'city' && regionCode) {
      const city = getCityByCode(regionCode)
      if (city) {
        focusProvince(city.provinceCode, {
          center: [city.longitude, city.latitude],
          zoom: 8,
        })
      }
    }
  },
)

// 仅数据变化 → 局部更新
watch(
  () => [props.litCities, props.cityVisitCount, props.residenceCityCode, props.readonly],
  () => {
    updateData()
  },
  { deep: true },
)
</script>

<template>
  <div class="base-map absolute inset-0 overflow-hidden">
    <!-- 地图容器：内联样式确保 100% 高度，避免 MapLibre canvas 干扰布局 -->
    <div ref="containerRef" class="absolute inset-0" style="width: 100%; height: 100%;" />

    <!-- 加载骨架屏遮罩 -->
    <div
      v-if="loading"
      class="absolute inset-0 z-10 flex items-center justify-center bg-zinc-50/80 backdrop-blur-sm"
    >
      <div class="flex flex-col items-center gap-3 text-primary">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span class="text-sm text-zinc-500">地图加载中…</span>
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

    <!-- 缩放控制按钮组（左下角，含比例百分比） -->
    <div
      v-if="!readonly"
      class="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-lg bg-white/80 p-1 shadow-sm ring-1 ring-zinc-200/60 backdrop-blur-md"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        class="size-7 rounded-md text-base text-zinc-600 hover:bg-zinc-100 hover:text-primary"
        title="缩小"
        @click="zoomOut"
      >
        −
      </Button>
      <span class="min-w-[3rem] text-center text-xs font-medium tabular-nums text-zinc-600">
        {{ Math.round(currentZoom * 100) }}%
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        class="size-7 rounded-md text-base text-zinc-600 hover:bg-zinc-100 hover:text-primary"
        title="放大"
        @click="zoomIn"
      >
        +
      </Button>
    </div>

    <!-- 图例 -->
    <div
      class="pointer-events-none absolute bottom-3 right-3 z-10 flex flex-col gap-1.5 rounded-lg bg-white/80 px-3.5 py-2.5 text-xs text-zinc-600 shadow-sm ring-1 ring-zinc-200/60 backdrop-blur-md"
    >
      <div class="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
        图例
      </div>
      <div class="flex items-center gap-2">
        <span
          class="inline-block h-2.5 w-2.5 rounded-full"
          style="background-color: #FFB380; box-shadow: 0 0 0 3px rgba(255, 179, 128, 0.15);"
        />
        <span>到达 1 次</span>
      </div>
      <div class="flex items-center gap-2">
        <span
          class="inline-block h-2.5 w-2.5 rounded-full"
          style="background-color: #FF6B35; box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.18);"
        />
        <span>到达 2-3 次</span>
      </div>
      <div class="flex items-center gap-2">
        <span
          class="inline-block h-2.5 w-2.5 rounded-full"
          style="background-color: #E05A20; box-shadow: 0 0 0 3px rgba(224, 90, 32, 0.2);"
        />
        <span>到达 4+ 次</span>
      </div>
      <div class="flex items-center gap-2">
        <span
          class="inline-block h-2.5 w-2.5 rounded-full"
          style="background-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);"
        />
        <span>居住地</span>
      </div>
    </div>
  </div>
</template>
