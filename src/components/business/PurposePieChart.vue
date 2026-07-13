<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import * as echarts from 'echarts'
import type { VisitRecord } from '@/types'

/**
 * PurposePieChart - 出行目的分布饼图
 *
 * 按 purpose 分组统计传入的到达记录，渲染为环形饼图，暖橙色系配色。
 * 父组件负责保证仅在存在数据时渲染本组件。
 *
 * Props:
 *  - records: 到达记录列表（已按时间范围过滤）
 */
const props = defineProps<{
  records: VisitRecord[]
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const chart = shallowRef<echarts.ECharts | null>(null)
let resizeObserver: ResizeObserver | null = null

// 暖橙色系配色（由浅到深，循环使用）
const WARM_PALETTE = [
  '#FF6B35',
  '#FFB380',
  '#E05A20',
  '#FF8C5A',
  '#FFD4B8',
  '#C44820',
  '#FF9E70',
  '#D96A2E',
]

interface PieDataItem {
  name: string
  value: number
}

function buildData(): PieDataItem[] {
  const countMap = new Map<string, number>()
  for (const r of props.records) {
    countMap.set(r.purpose, (countMap.get(r.purpose) ?? 0) + 1)
  }
  return Array.from(countMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

function buildOption(): echarts.EChartsCoreOption {
  const data = buildData()
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 次 ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 8,
      top: 'center',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: '#64748B', fontSize: 12 },
    },
    color: WARM_PALETTE,
    series: [
      {
        name: '出行目的',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: '#FFFFFF',
          borderWidth: 2,
        },
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 13,
            fontWeight: 'bold',
            color: '#1F2937',
            formatter: '{b}\n{d}%',
          },
        },
        data,
      },
    ],
  }
}

function render(): void {
  if (!chart.value) return
  chart.value.setOption(buildOption(), { notMerge: true })
}

onMounted(() => {
  if (!containerRef.value) return
  chart.value = echarts.init(containerRef.value)
  render()
  resizeObserver = new ResizeObserver(() => chart.value?.resize())
  resizeObserver.observe(containerRef.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  chart.value?.dispose()
  chart.value = null
})

watch(
  () => props.records,
  () => render(),
  { deep: true },
)
</script>

<template>
  <div ref="containerRef" class="h-full w-full" />
</template>
