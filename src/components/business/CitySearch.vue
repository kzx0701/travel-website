<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Search } from '@lucide/vue'
import { useDebounce } from '@/composables/useDebounce'
import { searchCities } from '@/composables/useCitySearch'
import { Input } from '@/components/ui/input'
import type { City } from '@/types'

interface Props {
  placeholder?: string
  disabled?: boolean
}
withDefaults(defineProps<Props>(), {
  placeholder: '搜索城市...',
  disabled: false,
})
const emit = defineEmits<{ select: [city: City] }>()

const keyword = ref('')
const debouncedKeyword = useDebounce(keyword, 300)
const isOpen = ref(false)
const activeIndex = ref(-1)
const rootRef = ref<HTMLElement | null>(null)

const results = computed(() => searchCities(debouncedKeyword.value, 10))
const isSearching = computed(
  () => keyword.value.trim() !== debouncedKeyword.value.trim(),
)
const showDropdown = computed(
  () => isOpen.value && keyword.value.trim().length > 0,
)

watch(keyword, (val) => {
  isOpen.value = val.trim().length > 0
  activeIndex.value = -1
})
watch(results, () => {
  activeIndex.value = -1
})

const selectCity = (city: City) => {
  emit('select', city)
  keyword.value = ''
  isOpen.value = false
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!showDropdown.value) return
  if (e.key === 'Escape') {
    isOpen.value = false
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  } else if (e.key === 'Enter' && activeIndex.value >= 0) {
    e.preventDefault()
    selectCity(results.value[activeIndex.value])
  }
}

const handleClickOutside = (e: MouseEvent) => {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div ref="rootRef" class="relative w-full">
    <!-- 搜索输入框 -->
    <div class="relative">
      <Search
        class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none z-10"
      />
      <Input
        v-model="keyword"
        type="text"
        :placeholder="placeholder"
        :disabled="disabled"
        class="h-10 pl-9"
        @keydown="handleKeydown"
      />
    </div>

    <!-- 下拉面板 -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="showDropdown"
        class="absolute left-0 right-0 mt-1.5 rounded-xl border border-border bg-popover shadow-md overflow-hidden z-50"
      >
        <!-- 搜索中 -->
        <div v-if="isSearching" class="px-4 py-3 text-sm text-muted-foreground">
          搜索中...
        </div>
        <!-- 无结果 -->
        <div
          v-else-if="results.length === 0"
          class="px-4 py-3 text-sm text-muted-foreground text-center"
        >
          未找到城市
        </div>
        <!-- 结果列表 -->
        <ul v-else class="py-1 max-h-80 overflow-y-auto">
          <li
            v-for="(city, index) in results"
            :key="city.code"
            class="flex items-baseline justify-between px-3 py-2 cursor-pointer transition-colors"
            :class="index === activeIndex ? 'bg-accent' : 'hover:bg-accent'"
            @click="selectCity(city)"
            @mouseenter="activeIndex = index"
          >
            <span class="text-sm font-medium text-foreground">{{ city.name }}</span>
            <span class="text-xs text-muted-foreground ml-2">{{ city.provinceName }}</span>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>
