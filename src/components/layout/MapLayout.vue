<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { BookOpen, Menu } from '@lucide/vue'

/**
 * MapLayout - 地图页主布局
 *
 * 桌面：横向三栏（左 280px / 中 flex-1 / 右 320px）
 * 移动端：左右侧折叠为 Sheet 抽屉，中地图全屏
 * AppNavbar 由 App.vue 全局提供，不在此组件内
 */

const leftDrawer = ref(false)
const rightDrawer = ref(false)
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-white">
    <!-- 主体三栏 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 左侧信息区（桌面） -->
      <aside
        class="hidden w-[280px] shrink-0 flex-col overflow-y-auto border-r border-slate-200 lg:flex"
      >
        <slot name="left" />
      </aside>

      <!-- 中地图区 -->
      <main class="relative flex-1 overflow-hidden">
        <!-- 移动端左右抽屉触发按钮 -->
        <div class="absolute left-3 top-3 z-20 flex gap-2 lg:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            class="rounded-lg bg-white/90 text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-white/90 hover:text-primary"
            title="城市列表"
            @click="leftDrawer = true"
          >
            <Menu class="h-5 w-5" />
          </Button>
        </div>
        <div class="absolute right-3 top-3 z-20 lg:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            class="rounded-lg bg-white/90 text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-white/90 hover:text-primary"
            title="详情"
            @click="rightDrawer = true"
          >
            <BookOpen class="h-5 w-5" />
          </Button>
        </div>

        <slot />
      </main>

      <!-- 右侧信息区（桌面） -->
      <aside
        class="hidden w-[320px] shrink-0 flex-col overflow-y-auto border-l border-slate-200 lg:flex"
      >
        <slot name="right" />
      </aside>
    </div>

    <!-- 移动端左侧抽屉 -->
    <Sheet v-model:open="leftDrawer">
      <SheetContent side="left" class="w-[300px] p-0 sm:max-w-[300px]">
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
