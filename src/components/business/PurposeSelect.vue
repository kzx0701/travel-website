<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { Plus, Check, ChevronsUpDown } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  CommandSeparator,
} from '@/components/ui/command'
import { usePurposeStore } from '@/stores/purpose'

/**
 * PurposeSelect - 出行目的选择器（Combobox 形态）
 *
 * Popover + Command 组合实现：
 *  - 系统预设 / 我的自定义分组
 *  - 顶部搜索过滤
 *  - 底部 "+ 新建分类" 项（preventDefault 后打开 Dialog）
 */

defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const purposeStore = usePurposeStore()
const open = ref(false)

onMounted(async () => {
  if (purposeStore.categories.length === 0) {
    try {
      await purposeStore.loadAll()
    } catch (e) {
      toast.error('出行目的加载失败')
      console.error(e)
    }
  }
})

const systemCategories = computed(() => purposeStore.systemCategories)
const customCategories = computed(() => purposeStore.customCategories)

// "新建分类" 哨兵值，避免与真实分类名冲突
const CREATE_SENTINEL = '__create_purpose__'

function selectValue(value: string): void {
  emit('update:modelValue', value)
  emit('change', value)
  open.value = false
}

// CommandItem 的 select 事件支持 preventDefault() 阻止选中
function handleCreateSelect(event: Event): void {
  event.preventDefault()
  open.value = false
  openCreate()
}

// ---- 新建自定义分类 ----
const newCategoryVisible = ref(false)
const newCategoryName = ref('')
const creating = ref(false)

function openCreate(): void {
  newCategoryVisible.value = true
  newCategoryName.value = ''
}

async function confirmCreate(): Promise<void> {
  const name = newCategoryName.value.trim()
  if (!name) {
    toast.warning('请输入分类名称')
    return
  }
  // 重名校验
  const exists = purposeStore.categories.some((c) => c.name === name)
  if (exists) {
    toast.warning('该分类已存在')
    return
  }
  creating.value = true
  try {
    const category = await purposeStore.createCustom(name)
    emit('update:modelValue', category.name)
    emit('change', category.name)
    newCategoryVisible.value = false
    newCategoryName.value = ''
    toast.success('已新建分类')
  } catch (e) {
    toast.error('新建失败')
    console.error(e)
  } finally {
    creating.value = false
  }
}

function cancelCreate(): void {
  newCategoryVisible.value = false
  newCategoryName.value = ''
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
        class="w-full justify-between font-normal"
        :class="!modelValue && 'text-muted-foreground'"
      >
        <span class="truncate">
          {{ modelValue || '请选择出行目的' }}
        </span>
        <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-[--reka-popper-anchor-width] p-0" align="start">
      <Command>
        <CommandInput placeholder="搜索分类..." />
        <CommandList>
          <CommandEmpty>无匹配分类</CommandEmpty>
          <CommandGroup
            v-if="systemCategories.length"
            heading="系统预设"
          >
            <CommandItem
              v-for="cat in systemCategories"
              :key="cat.id"
              :value="cat.name"
              @select="selectValue(cat.name)"
            >
              <Check
                class="h-4 w-4"
                :class="modelValue === cat.name ? 'opacity-100' : 'opacity-0'"
              />
              <span>{{ cat.name }}</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup
            v-if="customCategories.length"
            heading="我的自定义"
          >
            <CommandItem
              v-for="cat in customCategories"
              :key="cat.id"
              :value="cat.name"
              @select="selectValue(cat.name)"
            >
              <Check
                class="h-4 w-4"
                :class="modelValue === cat.name ? 'opacity-100' : 'opacity-0'"
              />
              <span>{{ cat.name }}</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup>
            <CommandItem
              :value="CREATE_SENTINEL"
              @select="handleCreateSelect"
            >
              <Plus class="h-4 w-4 text-primary" />
              <span class="text-primary">新建分类</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>

  <!-- 新建分类弹窗 -->
  <Dialog
    :open="newCategoryVisible"
    @update:open="(v) => (newCategoryVisible = v)"
  >
    <DialogContent class="max-w-[360px]">
      <DialogHeader>
        <DialogTitle>新建出行目的分类</DialogTitle>
        <DialogDescription class="sr-only">
          新建出行目的分类
        </DialogDescription>
      </DialogHeader>
      <Input
        v-model="newCategoryName"
        placeholder="如：摄影、徒步"
        maxlength="10"
        @keyup.enter="confirmCreate"
      />
      <DialogFooter>
        <Button variant="outline" size="sm" @click="cancelCreate">
          取消
        </Button>
        <Button
          size="sm"
          :disabled="creating"
          @click="confirmCreate"
        >
          {{ creating ? '创建中...' : '创建' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
