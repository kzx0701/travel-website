<script setup lang="ts">
import { ref } from 'vue'
import AppNavbar from './AppNavbar.vue'

/**
 * MapLayout - 地图页主布局
 *
 * 桌面：顶部 56px navbar + 下方横向三栏（左 280px / 中 flex-1 / 右 320px）
 * 移动端：左右侧折叠为 el-drawer 抽屉，中地图全屏
 */

const leftDrawer = ref(false)
const rightDrawer = ref(false)
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-white">
    <!-- 顶部导航栏 -->
    <AppNavbar />

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
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 text-slate-600 shadow-sm ring-1 ring-slate-200 transition-colors hover:text-warm"
            title="城市列表"
            @click="leftDrawer = true"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </div>
        <div class="absolute right-3 top-3 z-20 lg:hidden">
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 text-slate-600 shadow-sm ring-1 ring-slate-200 transition-colors hover:text-warm"
            title="详情"
            @click="rightDrawer = true"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </button>
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
    <el-drawer
      v-model="leftDrawer"
      direction="ltr"
      size="300px"
      :with-header="false"
    >
      <div class="h-full overflow-y-auto">
        <slot name="left" />
      </div>
    </el-drawer>

    <!-- 移动端右侧抽屉 -->
    <el-drawer
      v-model="rightDrawer"
      direction="rtl"
      size="340px"
      :with-header="false"
    >
      <div class="h-full overflow-y-auto">
        <slot name="right" />
      </div>
    </el-drawer>
  </div>
</template>
