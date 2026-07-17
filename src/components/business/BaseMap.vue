<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import type { City, MapLevel } from '@/types'
import {
  useMapLibre,
  type UseMapLibreParams,
  type UseMapLibreCallbacks,
} from '@/composables/useMapLibre'
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

const { loading, mapAvailable, currentZoom, zoomIn, zoomOut, updateData, focusProvince, unfocus } =
  useMapLibre(containerRef, mapParams, callbacks)

// 暴露 unfocus 给父组件，用于"点击中国"时重新聚焦视角
defineExpose({ unfocus })

// 层级或区域编码变化 → 聚焦/取消聚焦 + 更新选中省份样式
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
    // 同步更新省份填充数据，让选中省份的 selected 样式及时生效
    updateData()
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
    <div
      ref="containerRef"
      class="absolute inset-0 map-canvas"
      :class="{ 'map-entering': !loading }"
      style="width: 100%; height: 100%"
    />

    <!-- 加载遮罩：脉冲地球 + 渐变文字，Transition 淡出 -->
    <Transition name="loading-fade">
      <div
        v-if="loading"
        class="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-md"
      >
        <div class="flex flex-col items-center gap-5">
          <!-- 脉冲地球 -->
          <div class="map-loader-globe">
            <div class="map-loader-ring" />
            <div class="map-loader-ring" />
            <div class="map-loader-core" />
          </div>
          <!-- 渐变文字 -->
          <span class="map-loader-text text-sm">正在加载地图</span>
        </div>
      </div>
    </Transition>

    <!-- GeoJSON 缺失提示（降级提示，不阻塞渲染） -->
    <div
      v-if="!loading && !mapAvailable"
      class="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-md bg-card/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm ring-1 ring-border"
    >
      未检测到 GeoJSON 文件，当前为降级渲染模式。请参考
      <code class="font-mono text-foreground">src/data/README_DATA.md</code> 下载地图数据。
    </div>

    <!-- 缩放控制按钮组（左下角，含比例百分比） -->
    <Transition name="ui-fade">
      <div
        v-if="!readonly && !loading"
        class="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-lg bg-background/90 p-1 shadow-sm ring-1 ring-border/60 backdrop-blur-md"
      >
        <Button
          variant="ghost"
          size="icon-sm"
          class="size-7 rounded-md text-base text-muted-foreground hover:bg-accent hover:text-primary"
          title="缩小"
          @click="zoomOut"
        >
          −
        </Button>
        <span
          class="min-w-[3rem] text-center text-xs font-medium tabular-nums text-muted-foreground"
        >
          {{ Math.round(currentZoom * 100) }}%
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          class="size-7 rounded-md text-base text-muted-foreground hover:bg-accent hover:text-primary"
          title="放大"
          @click="zoomIn"
        >
          +
        </Button>
      </div>
    </Transition>

    <!-- 图例 -->
    <Transition name="ui-fade">
      <div
        v-if="!loading"
        class="pointer-events-none absolute bottom-3 right-3 z-10 flex flex-col gap-1.5 rounded-lg bg-background/90 px-3.5 py-2.5 text-xs text-muted-foreground shadow-sm ring-1 ring-border/60 backdrop-blur-md"
      >
        <div class="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          图例
        </div>
        <div class="flex items-center gap-2">
          <span
            class="inline-block h-2.5 w-2.5 rounded-full"
            style="background-color: #ffb380; box-shadow: 0 0 0 3px rgba(255, 179, 128, 0.15)"
          />
          <span>到达 1 次</span>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="inline-block h-2.5 w-2.5 rounded-full"
            style="background-color: #ff6b35; box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.18)"
          />
          <span>到达 2-3 次</span>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="inline-block h-2.5 w-2.5 rounded-full"
            style="background-color: #e05a20; box-shadow: 0 0 0 3px rgba(224, 90, 32, 0.2)"
          />
          <span>到达 4+ 次</span>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="inline-block h-2.5 w-2.5 rounded-full"
            style="background-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18)"
          />
          <span>居住地</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ============================ 地图出场动画 ============================ */
/* 初始隐藏（loading 期间），loading 结束后通过 .map-entering 触发过渡到清晰 */
.map-canvas {
  opacity: 0;
  filter: blur(12px);
  transform: scale(0.96);
  transition:
    opacity 900ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 900ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 900ms cubic-bezier(0.22, 1, 0.36, 1);
}
.map-canvas.map-entering {
  opacity: 1;
  filter: blur(0);
  transform: scale(1);
}

/* ============================ Loading 遮罩淡出 ============================ */
.loading-fade-leave-active {
  transition: opacity 500ms ease;
}
.loading-fade-leave-to {
  opacity: 0;
}

/* ============================ UI 元素淡入 ============================ */
.ui-fade-enter-active {
  transition: opacity 600ms ease 300ms;
}
.ui-fade-enter-from {
  opacity: 0;
}

/* ============================ 脉冲地球 Loader ============================ */
.map-loader-globe {
  position: relative;
  width: 56px;
  height: 56px;
}
/* 双层光环：模拟地球轮廓 + 大气层 */
.map-loader-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid hsl(var(--muted-foreground));
  opacity: 0;
  animation: map-loader-pulse 2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
.map-loader-ring:nth-child(2) {
  animation-delay: 1s;
}
.map-loader-core {
  position: absolute;
  inset: 14px;
  border-radius: 50%;
  background: hsl(var(--muted));
  box-shadow: 0 0 0 1px hsl(var(--border));
}
@keyframes map-loader-pulse {
  0% {
    transform: scale(0.6);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

/* ============================ 渐变文字 ============================ */
.map-loader-text {
  color: hsl(var(--muted-foreground));
  letter-spacing: 0;
  animation: map-loader-text-fade 1.8s ease-in-out infinite;
}
@keyframes map-loader-text-fade {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .map-canvas,
  .loading-fade-leave-active,
  .ui-fade-enter-active,
  .map-loader-ring,
  .map-loader-text {
    animation: none;
    transition: opacity 200ms ease;
    transform: none;
    filter: none;
  }
}
</style>
