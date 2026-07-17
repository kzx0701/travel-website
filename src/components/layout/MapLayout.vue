<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { BookOpen, Menu, Maximize2, Minimize2 } from '@lucide/vue'
import { useMapStore } from '@/stores/map'

/**
 * MapLayout - 地图页主布局
 *
 * 桌面：地图全宽，左右面板为悬浮 Card（可切换沉浸式模式）
 * 移动端：地图全屏，左右侧折叠为 Sheet 抽屉
 * AppNavbar 由 App.vue 全局提供，不在此组件内
 */

const mapStore = useMapStore()
const leftDrawer = ref(false)
const rightDrawer = ref(false)

/** 沉浸式模式：隐藏左右悬浮面板，地图占满全屏 */
const immersive = ref(false)

function toggleImmersive() {
  immersive.value = !immersive.value
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-white">
    <!-- 主体：地图全宽 + 悬浮面板 -->
    <div class="relative flex flex-1 overflow-hidden">
      <!-- 中地图区：全宽，面板悬浮其上 -->
      <main class="relative flex flex-1 flex-col overflow-hidden bg-zinc-50/60">
        <!-- 移动端左右抽屉触发按钮 -->
        <div class="absolute left-3 top-3 z-20 flex gap-2 lg:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            class="rounded-lg bg-white/90 text-zinc-600 shadow-sm ring-1 ring-zinc-200/60 hover:bg-white/90 hover:text-primary"
            title="城市列表"
            @click="leftDrawer = true"
          >
            <Menu class="h-5 w-5" />
          </Button>
        </div>
        <div v-if="mapStore.selectedCity" class="absolute right-3 top-3 z-20 lg:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            class="rounded-lg bg-white/90 text-zinc-600 shadow-sm ring-1 ring-zinc-200/60 hover:bg-white/90 hover:text-primary"
            title="详情"
            @click="rightDrawer = true"
          >
            <BookOpen class="h-5 w-5" />
          </Button>
        </div>

        <slot />

        <!-- 沉浸式切换按钮（桌面端，右上角） -->
        <Button
          variant="ghost"
          size="icon-sm"
          class="absolute right-3 top-3 z-20 hidden rounded-lg bg-white/80 text-zinc-600 shadow-sm ring-1 ring-zinc-200/60 backdrop-blur-md hover:bg-white/90 hover:text-primary lg:flex"
          :title="immersive ? '退出沉浸模式' : '进入沉浸模式'"
          @click="toggleImmersive"
        >
          <Minimize2 v-if="immersive" class="h-4 w-4" />
          <Maximize2 v-else class="h-4 w-4" />
        </Button>
      </main>

      <!-- 左侧悬浮面板（桌面端，非沉浸式时显示，垂直居中） -->
      <Transition name="panel-left">
        <Card
          v-if="!immersive"
          class="absolute left-3 top-1/2 z-10 hidden h-[85%] w-[320px] -translate-y-1/2 overflow-hidden rounded-xl border-zinc-200/60 bg-white/95 shadow-lg backdrop-blur-md lg:flex lg:flex-col"
        >
          <slot name="left" />
        </Card>
      </Transition>

      <!-- 右侧悬浮面板（桌面端，选中城市且非沉浸式时显示，垂直居中） -->
      <Transition name="panel-right">
        <Card
          v-if="!immersive && mapStore.selectedCity"
          class="absolute right-3 top-1/2 z-10 hidden h-[85%] w-[320px] -translate-y-1/2 overflow-hidden rounded-xl border-zinc-200/60 bg-white/95 shadow-lg backdrop-blur-md lg:flex lg:flex-col"
        >
          <slot name="right" />
        </Card>
      </Transition>
    </div>

    <!-- 移动端左侧抽屉 -->
    <Sheet v-model:open="leftDrawer">
      <SheetContent side="left" class="w-[340px] p-0 sm:max-w-[340px]">
        <SheetTitle class="sr-only">城市列表</SheetTitle>
        <div class="h-full overflow-y-auto">
          <slot name="left" />
        </div>
      </SheetContent>
    </Sheet>

    <!-- 移动端右侧抽屉 -->
    <Sheet v-model:open="rightDrawer">
      <SheetContent side="right" class="w-[340px] p-0 sm:max-w-[340px]">
        <SheetTitle class="sr-only">详情</SheetTitle>
        <div class="h-full overflow-y-auto">
          <slot name="right" />
        </div>
      </SheetContent>
    </Sheet>
  </div>
</template>

<style>
/* 左侧面板滑入滑出 */
.panel-left-enter-active,
.panel-left-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
}
.panel-left-enter-from,
.panel-left-leave-to {
  transform: translateX(-110%);
  opacity: 0;
}

/* 右侧面板滑入滑出 */
.panel-right-enter-active,
.panel-right-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
}
.panel-right-enter-from,
.panel-right-leave-to {
  transform: translateX(110%);
  opacity: 0;
}
</style>
