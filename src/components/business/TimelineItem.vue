<script setup lang="ts">
import { computed } from 'vue'
import { formatRecordDate } from '@/utils'
import type { VisitRecord } from '@/types'

/**
 * TimelineItem - 时间线单条目
 *
 * 在父容器提供的竖线之上渲染一个圆点 + 卡片。
 * 卡片内容：城市名 / 日期（按精度格式化）/ 目的标签 / 备注。
 *
 * Props:
 *  - record: 单条到达记录
 */
const props = defineProps<{
  record: VisitRecord
}>()

const dateText = computed(() =>
  formatRecordDate(props.record.startDate, props.record.endDate, props.record.datePrecision),
)
</script>

<template>
  <div class="relative pl-6">
    <!-- 圆点（落在父容器竖线上） -->
    <span
      class="absolute left-0 top-3 h-2.5 w-2.5 -translate-x-[4px] rounded-full bg-warm ring-4 ring-warm/10"
    />

    <div
      class="rounded-lg border border-border bg-card px-3.5 py-2.5 shadow-sm transition-colors hover:border-border"
    >
      <!-- 头部：城市名 + 日期 -->
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-semibold text-foreground">
          {{ record.cityName }}
        </span>
        <span class="shrink-0 text-xs text-muted-foreground tabular-nums">
          {{ dateText }}
        </span>
      </div>

      <!-- 目的标签 + 备注 -->
      <div class="mt-1.5 flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center rounded-full bg-warm/5 px-2 py-0.5 text-xs text-warm">
          {{ record.purpose }}
        </span>
        <p
          v-if="record.note"
          class="min-w-0 flex-1 truncate text-xs text-muted-foreground"
          :title="record.note"
        >
          {{ record.note }}
        </p>
      </div>
    </div>
  </div>
</template>
