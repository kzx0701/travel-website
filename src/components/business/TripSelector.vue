<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { Plus, Check, ChevronsUpDown, CircleMinus } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useTripStore } from '@/stores/trip'
import TripForm from './TripForm.vue'
import type { Trip } from '@/types'

/**
 * TripSelector - 行程选择器（Combobox 形态）
 *
 * Popover + Command 组合实现：
 *  - "不关联行程" 选项（value = NONE_SENTINEL）
 *  - 行程列表（按 trip.id 为 value）
 *  - 底部 "+ 新建行程" 项（preventDefault 后打开 TripForm 创建）
 */

defineProps<{
  modelValue?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  change: [value: string | null]
}>()

const tripStore = useTripStore()
const open = ref(false)

onMounted(async () => {
  if (tripStore.trips.length === 0) {
    try {
      await tripStore.loadAll()
    } catch (e) {
      toast.error('行程加载失败')
      console.error(e)
    }
  }
})

function tripLabel(trip: Trip): string {
  const date = trip.endDate ? `${trip.startDate} — ${trip.endDate}` : trip.startDate
  return `${trip.name}（${date}）`
}

// 哨兵值
const NONE_SENTINEL = '__none_trip__'
const CREATE_SENTINEL = '__create_trip__'

function selectValue(value: string): void {
  const v = value === NONE_SENTINEL ? null : value
  emit('update:modelValue', v)
  emit('change', v)
  open.value = false
}

function handleCreateSelect(event: Event): void {
  event.preventDefault()
  open.value = false
  openCreate()
}

// ---- 新建行程 ----
const createVisible = ref(false)
const creating = ref(false)

function openCreate(): void {
  createVisible.value = true
}

async function handleCreateSubmit(data: {
  name: string
  startDate: string
  endDate: string | null
}): Promise<void> {
  creating.value = true
  try {
    const trip = await tripStore.create({
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
    })
    // 自动选中新建行程
    emit('update:modelValue', trip.id)
    emit('change', trip.id)
    createVisible.value = false
    toast.success('已新建行程')
  } catch (e) {
    toast.error('新建行程失败')
    console.error(e)
  } finally {
    creating.value = false
  }
}

function handleCreateCancel(): void {
  // 仅关闭，无需额外处理
}
</script>

<template>
  <div class="trip-selector">
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          :aria-expanded="open"
          class="w-full justify-between font-normal"
          :class="!modelValue && 'text-muted-foreground'"
        >
          <span class="truncate">
            <template v-if="!modelValue"> 不关联行程 </template>
            <template v-else>
              {{
                tripLabel(tripStore.trips.find((t) => t.id === modelValue) ?? tripStore.trips[0])
              }}
            </template>
          </span>
          <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-[--reka-popper-anchor-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索行程..." />
          <CommandList>
            <CommandEmpty>无匹配行程</CommandEmpty>
            <CommandGroup heading="选择行程">
              <CommandItem :value="NONE_SENTINEL" @select="selectValue(NONE_SENTINEL)">
                <CircleMinus class="h-4 w-4 text-muted-foreground" />
                <span class="text-muted-foreground">不关联行程</span>
                <Check v-if="!modelValue" class="ml-auto h-4 w-4" />
              </CommandItem>
              <CommandItem
                v-for="trip in tripStore.trips"
                :key="trip.id"
                :value="trip.id"
                @select="selectValue(trip.id)"
              >
                <Check
                  class="h-4 w-4"
                  :class="modelValue === trip.id ? 'opacity-100' : 'opacity-0'"
                />
                <span class="truncate">{{ tripLabel(trip) }}</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem :value="CREATE_SENTINEL" @select="handleCreateSelect">
                <Plus class="h-4 w-4 text-primary" />
                <span class="text-primary">新建行程</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>

    <!-- 新建行程对话框 -->
    <TripForm
      :visible="createVisible"
      :loading="creating"
      @update:visible="(v) => (createVisible = v)"
      @submit="handleCreateSubmit"
      @cancel="handleCreateCancel"
    />
  </div>
</template>
