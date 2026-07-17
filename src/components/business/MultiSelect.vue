<script setup lang="ts">
import { ref, computed } from 'vue'
import type { HTMLAttributes } from 'vue'
import { Check, ChevronsUpDown } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

/**
 * MultiSelect - 多选筛选器（Combobox 形态）
 *
 * 基于 Popover + Command 自实现，用于筛选场景：
 *  - 触发按钮显示已选数量 / 占位符
 *  - 选项可勾选 / 取消勾选
 *  - 顶部搜索过滤（由 Command 提供）
 *
 * Props:
 *  - modelValue: string[] 已选值数组
 *  - options: { value, label }[]
 *  - placeholder: 占位文案
 *  - class: 触发器根节点额外 class
 *
 * Emits:
 *  - update:modelValue
 */

interface Option {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    options: Option[]
    placeholder?: string
    searchPlaceholder?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    placeholder: '请选择',
    searchPlaceholder: '搜索...',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const open = ref(false)

const selectedSet = computed(() => new Set(props.modelValue))

const selectedLabels = computed(() =>
  props.modelValue.map((v) => props.options.find((o) => o.value === v)?.label ?? v).slice(0, 2),
)

const overflowCount = computed(() =>
  Math.max(0, props.modelValue.length - selectedLabels.value.length),
)

function toggle(value: string): void {
  const set = new Set(props.modelValue)
  if (set.has(value)) {
    set.delete(value)
  } else {
    set.add(value)
  }
  emit('update:modelValue', Array.from(set))
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        :class="
          cn(
            'justify-between font-normal',
            modelValue.length === 0 && 'text-muted-foreground',
            props.class,
          )
        "
      >
        <span v-if="modelValue.length === 0" class="truncate">
          {{ placeholder }}
        </span>
        <span v-else class="flex flex-1 items-center gap-1 overflow-hidden">
          <Badge
            v-for="label in selectedLabels"
            :key="label"
            variant="secondary"
            class="max-w-[6rem] truncate font-normal"
          >
            {{ label }}
          </Badge>
          <span v-if="overflowCount > 0" class="text-xs text-muted-foreground">
            +{{ overflowCount }}
          </span>
        </span>
        <ChevronsUpDown class="size-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-[--reka-popper-anchor-width] p-0" align="start">
      <Command>
        <CommandInput :placeholder="searchPlaceholder" />
        <CommandList>
          <CommandEmpty>无匹配项</CommandEmpty>
          <CommandGroup>
            <CommandItem
              v-for="opt in options"
              :key="opt.value"
              :value="opt.label"
              @select="toggle(opt.value)"
            >
              <div
                class="flex size-4 items-center justify-center rounded-sm border border-primary"
                :class="
                  selectedSet.has(opt.value) ? 'bg-primary text-primary-foreground' : 'opacity-100'
                "
              >
                <Check v-if="selectedSet.has(opt.value)" class="size-3" />
              </div>
              <span class="truncate">{{ opt.label }}</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
