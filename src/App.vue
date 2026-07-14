<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { Toaster } from '@/components/ui/sonner'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import { computed } from 'vue'

const route = useRoute()
const showNavbar = computed(() => route.meta.showNavbar === true)
</script>

<template>
  <!-- 需要 navbar 的页面：AppNavbar 在 Transition 外，不参与过渡动画 -->
  <div v-if="showNavbar" class="flex h-screen flex-col overflow-hidden">
    <AppNavbar />
    <div class="relative flex-1 overflow-hidden">
      <RouterView v-slot="{ Component }">
        <Transition name="route">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </div>
  </div>

  <!-- 不需要 navbar 的页面（登录/注册/公开主页） -->
  <RouterView v-else />

  <Toaster rich-colors close-button theme="light" position="top-right" />
</template>

<style>
/* 路由切换：新旧组件同时淡入淡出，无空隙不闪烁 */
.route-enter-active,
.route-leave-active {
  transition: opacity 0.18s ease;
}

/* 离开组件脱离文档流，避免与新组件抢占布局 */
.route-leave-active {
  position: absolute;
  inset: 0;
}

.route-enter-from,
.route-leave-to {
  opacity: 0;
}
</style>
