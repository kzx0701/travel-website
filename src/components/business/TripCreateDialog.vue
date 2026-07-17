<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { toast } from 'vue-sonner'
import { Plus, Check, X, ChevronsUpDown, MapPin } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import PurposeSelect from './PurposeSelect.vue'
import { cities as allCities } from '@/data/cities'
import type { City } from '@/types'

/**
 * TripCreateDialog - 添加行程对话框
 *
 * 创建一个行程，并选择若干涉及城市：
 *  - 提交时父组件先 tripStore.create 创建行程
 *  - 再为每个城市 visitRecordStore.create 一条带 tripId 的到达记录
 *  - 城市经 litCities computed 自动点亮，并关联到该行程
 *
 * 字段：行程名称 + 日期范围 + 出行目的 + 涉及城市（多选）
 * Props: visible, loading
 * Emits: submit({ name, startDate, endDate, purpose, cities }), cancel, update:visible
 */

const props = withDefaults(
  defineProps<{
    visible: boolean
    loading?: boolean
  }>(),
  {
    loading: false,
  },
)

const emit = defineEmits<{
  submit: [
    data: {
      name: string
      startDate: string
      endDate: string | null
      purpose: string
      cities: City[]
    },
  ]
  cancel: []
  'update:visible': [value: boolean]
}>()

// ---- zod schema ----
const schema = toTypedSchema(
  z.object({
    name: z
      .string({ required_error: '请输入行程名称' })
      .min(1, '请输入行程名称')
      .max(100, '名称不超过 100 字'),
    dateRange: z
      .array(z.string())
      .length(2, '请选择行程日期范围')
      .or(z.null()),
    purpose: z
      .string({ required_error: '请选择出行目的' })
      .min(1, '请选择出行目的'),
  }),
)

const { handleSubmit, setFieldValue, resetForm } = useForm({
  validationSchema: schema,
  initialValues: {
    name: '',
    dateRange: null as [string, string] | null,
    purpose: '',
  },
})

// ---- 涉及城市多选（独立管理，提交时统一校验） ----
const selectedCities = ref<City[]>([])
const cityPopoverOpen = ref(false)
const cityKeyword = ref('')

const cityResults = computed<City[]>(() => {
  const kw = cityKeyword.value.trim().toLowerCase()
  const selectedCodes = new Set(selectedCities.value.map((c) => c.code))
  const pool = kw
    ? allCities.filter(
        (c) => c.name.includes(kw) || c.pinyin.toLowerCase().includes(kw),
      )
    : allCities
  // 过滤已选，限制 50 条避免渲染过多
  return pool.filter((c) => !selectedCodes.has(c.code)).slice(0, 50)
})

function addCity(city: City, event: Event): void {
  // 阻止 Command 默认选中值与关闭 popover，实现多选
  event.preventDefault()
  if (!selectedCities.value.some((c) => c.code === city.code)) {
    selectedCities.value.push(city)
  }
  cityKeyword.value = ''
}

function removeCity(code: string): void {
  selectedCities.value = selectedCities.value.filter((c) => c.code !== code)
}

// 打开时重置表单
watch(
  () => props.visible,
  (val) => {
    if (val) {
      resetForm({
        values: {
          name: '',
          dateRange: null,
          purpose: '',
        },
      })
      selectedCities.value = []
      cityKeyword.value = ''
      cityPopoverOpen.value = false
    }
  },
)

function close(): void {
  emit('update:visible', false)
}

function handleCancel(): void {
  emit('cancel')
  close()
}

// DatePicker range 模式回传 [string, string] | null
function handleDateRangeChange(
  value: string | [string, string] | null,
): void {
  if (typeof value === 'string') return
  setFieldValue('dateRange', value)
}

const onSubmit = handleSubmit((values) => {
  const range = values.dateRange
  if (!range || range.length !== 2 || !range[0] || !range[1]) {
    toast.warning('请选择行程日期范围')
    return
  }
  if (selectedCities.value.length === 0) {
    toast.warning('请至少选择一个涉及城市')
    return
  }
  emit('submit', {
    name: values.name.trim(),
    startDate: range[0],
    endDate: range[1],
    purpose: values.purpose,
    cities: [...selectedCities.value],
  })
})
</script>

<template>
  <Dialog
    :open="visible"
    @update:open="(v) => emit('update:visible', v)"
  >
    <DialogContent class="max-w-[480px]">
      <DialogHeader>
        <DialogTitle>添加行程</DialogTitle>
        <DialogDescription>
          选择行程涉及的城市，提交后将自动点亮并关联到该行程。
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit="onSubmit">
        <!-- 行程名称 -->
        <FormField v-slot="{ componentField }" name="name">
          <FormItem>
            <FormLabel>行程名称</FormLabel>
            <FormControl>
              <Input
                placeholder="如：2024 春节江浙行"
                maxlength="100"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- 日期范围 -->
        <FormField v-slot="{ value }" name="dateRange">
          <FormItem>
            <FormLabel>日期范围</FormLabel>
            <FormControl>
              <DatePicker
                :model-value="(value as [string, string] | null) ?? null"
                range
                class="w-full"
                @update:model-value="handleDateRangeChange"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- 出行目的 -->
        <FormField v-slot="{ value }" name="purpose">
          <FormItem>
            <FormLabel>出行目的</FormLabel>
            <FormControl>
              <PurposeSelect
                :model-value="(value as string) ?? ''"
                @update:model-value="(v: string) => setFieldValue('purpose', v)"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- 涉及城市（多选，手动管理不走 vee-validate） -->
        <div class="space-y-2">
          <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            涉及城市
          </label>
          <!-- 已选城市标签 -->
          <div
            v-if="selectedCities.length"
            class="flex flex-wrap gap-1.5"
          >
            <Badge
              v-for="city in selectedCities"
              :key="city.code"
              variant="secondary"
              class="gap-1 pr-1"
            >
              {{ city.name }}
              <button
                type="button"
                class="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="移除"
                @click="removeCity(city.code)"
              >
                <X class="size-3" />
              </button>
            </Badge>
          </div>

          <Popover v-model:open="cityPopoverOpen">
            <PopoverTrigger as-child>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                :aria-expanded="cityPopoverOpen"
                class="w-full justify-between font-normal"
              >
                <span class="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin class="size-4" />
                  {{ selectedCities.length ? '继续添加城市' : '搜索并选择城市' }}
                </span>
                <ChevronsUpDown class="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-[--reka-popper-anchor-width] p-0" align="start">
              <Command>
                <CommandInput
                  v-model="cityKeyword"
                  placeholder="搜索城市名或拼音..."
                />
                <CommandList>
                  <CommandEmpty>未找到城市</CommandEmpty>
                  <CommandGroup heading="城市">
                    <CommandItem
                      v-for="city in cityResults"
                      :key="city.code"
                      :value="`${city.name} ${city.pinyin}`"
                      class="cursor-pointer transition-colors hover:bg-accent"
                      @select="addCity(city, $event)"
                    >
                      <Check class="size-4 opacity-0" />
                      <span class="font-medium">{{ city.name }}</span>
                      <span class="ml-auto text-xs text-muted-foreground">
                        {{ city.provinceName }}
                      </span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p class="text-xs text-muted-foreground">
            已选 {{ selectedCities.length }} 个城市，提交后将自动点亮
          </p>
        </div>
      </form>

      <DialogFooter>
        <Button
          variant="outline"
          size="sm"
          :disabled="loading"
          @click="handleCancel"
        >
          取消
        </Button>
        <Button
          size="sm"
          :disabled="loading"
          @click="onSubmit"
        >
          <Plus class="size-4" />
          {{ loading ? '创建中...' : '创建行程' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
