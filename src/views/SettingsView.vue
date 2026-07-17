<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Copy, LogOut, MapPin, Plus, Settings as SettingsIcon, Trash2, User } from '@lucide/vue'
import ResidenceSelector from '@/components/business/ResidenceSelector.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useResidenceStore } from '@/stores/residence'
import { useAuthStore } from '@/stores/auth'
import { usePurposeStore } from '@/stores/purpose'
import { useProfileSettingsStore } from '@/stores/profileSettings'
import { useVisitRecordStore } from '@/stores/visitRecord'
import { getAvatarUrl } from '@/utils/avatar'
import type { Residence, PurposeCategory } from '@/types'

/**
 * SettingsView - 设置页
 *
 * Task 13：三分区设置
 * 1. 居住地设置：ResidenceSelector（区县级）
 * 2. 账号信息：邮箱 / 用户名（可编辑）/ 头像预览（DiceBear）
 * 3. 偏好设置：出行目的分类管理 + 个人主页可见性（公开开关 / 分享链接）
 *
 * AppNavbar + 居中内容区，卡片式分区，加载骨架屏。
 */

const residenceStore = useResidenceStore()
const authStore = useAuthStore()
const purposeStore = usePurposeStore()
const profileSettingsStore = useProfileSettingsStore()
const visitRecordStore = useVisitRecordStore()

onMounted(async () => {
  // 居住地（若尚未加载则拉取）
  if (!residenceStore.residence && !residenceStore.loading) {
    try {
      await residenceStore.load()
    } catch (e) {
      toast.error('居住地加载失败')
      console.error(e)
    }
  }
  // 出行目的分类
  if (purposeStore.categories.length === 0) {
    try {
      await purposeStore.loadAll()
    } catch (e) {
      toast.error('出行目的加载失败')
      console.error(e)
    }
  }
  // 档案设置（可见性 / 分享 token）
  if (!profileSettingsStore.settings) {
    try {
      await profileSettingsStore.load()
    } catch (e) {
      toast.error('档案设置加载失败')
      console.error(e)
    }
  }
})

function handleResidenceChange(residence: Residence): void {
  void residence
}

// ---- 账号信息 ----
const user = computed(() => authStore.user)
const avatarUrl = computed(() =>
  user.value?.avatarSeed ? getAvatarUrl(user.value.avatarSeed, 128) : '',
)

const displayNameDraft = ref('')
const displayNameSaving = ref(false)
const displayNameInitialized = ref(false)

// 首次拿到用户信息后同步用户名草稿
watch(
  user,
  (u) => {
    if (u && !displayNameInitialized.value) {
      displayNameDraft.value = u.displayName ?? ''
      displayNameInitialized.value = true
    }
  },
  { immediate: true },
)

const isDisplayNameDirty = computed(
  () => displayNameDraft.value.trim() !== (user.value?.displayName ?? ''),
)

async function handleSaveDisplayName(): Promise<void> {
  const name = displayNameDraft.value.trim()
  if (!name) {
    toast.warning('用户名不能为空')
    return
  }
  if (!isDisplayNameDirty.value) return
  displayNameSaving.value = true
  try {
    await authStore.updateDisplayName(name)
    toast.success('用户名已更新')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    displayNameSaving.value = false
  }
}

// 退出登录二次确认（声明式 ConfirmDialog）
const logoutVisible = ref(false)

function handleLogout(): void {
  logoutVisible.value = true
}

async function confirmLogout(): Promise<void> {
  try {
    await authStore.logout()
    toast.success('已退出登录')
  } catch (e) {
    toast.error('退出失败')
    console.error(e)
  }
}

// ---- 出行目的分类管理 ----
// 删除分类二次确认（声明式 ConfirmDialog）
const deletePurposeVisible = ref(false)
const pendingDeletePurpose = ref<PurposeCategory | null>(null)

function handleDeletePurpose(cat: PurposeCategory): void {
  pendingDeletePurpose.value = cat
  deletePurposeVisible.value = true
}

async function confirmDeletePurpose(): Promise<void> {
  const cat = pendingDeletePurpose.value
  if (!cat) return
  try {
    await purposeStore.removeCustom(cat.id)
    // 刷新到达记录以同步 purpose 字段变更
    await visitRecordStore.loadAll()
    toast.success('已删除分类')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '删除失败')
  } finally {
    pendingDeletePurpose.value = null
  }
}

function cancelDeletePurpose(): void {
  pendingDeletePurpose.value = null
}

const deletePurposeDescription = computed(() =>
  pendingDeletePurpose.value
    ? `确定删除自定义分类「${pendingDeletePurpose.value.name}」吗？\n使用该分类的到达记录将自动转为"其他"。`
    : '',
)

// 新建自定义分类
const newPurposeVisible = ref(false)
const newPurposeName = ref('')
const newPurposeSaving = ref(false)

function openNewPurpose(): void {
  newPurposeVisible.value = true
  newPurposeName.value = ''
}

async function confirmNewPurpose(): Promise<void> {
  const name = newPurposeName.value.trim()
  if (!name) {
    toast.warning('请输入分类名称')
    return
  }
  if (purposeStore.categories.some((c) => c.name === name)) {
    toast.warning('该分类已存在')
    return
  }
  newPurposeSaving.value = true
  try {
    await purposeStore.createCustom(name)
    newPurposeVisible.value = false
    toast.success('已新建分类')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '新建失败')
  } finally {
    newPurposeSaving.value = false
  }
}

function cancelNewPurpose(): void {
  newPurposeVisible.value = false
  newPurposeName.value = ''
}

// ---- 个人主页可见性 ----
const visibilitySaving = ref(false)
const tokenSaving = ref(false)

const isPublic = computed(() => profileSettingsStore.settings?.isPublic ?? false)
const shareToken = computed(() => profileSettingsStore.settings?.shareToken ?? '')
const shareUrl = computed(() =>
  shareToken.value ? `${window.location.origin}/p/${shareToken.value}` : '',
)

async function handleVisibilityChange(val: boolean): Promise<void> {
  const next = val
  visibilitySaving.value = true
  try {
    await profileSettingsStore.update({ isPublic: next })
    toast.success(next ? '已开启公开访问' : '已关闭公开访问')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '更新失败')
  } finally {
    visibilitySaving.value = false
  }
}

// 重新生成 token 二次确认（声明式 ConfirmDialog）
const regenerateTokenVisible = ref(false)

function handleGenerateToken(): void {
  // 已有 token 时需二次确认（重新生成会使旧链接失效）
  if (shareToken.value) {
    regenerateTokenVisible.value = true
    return
  }
  void doRegenerateToken()
}

async function doRegenerateToken(): Promise<void> {
  tokenSaving.value = true
  try {
    await profileSettingsStore.regenerateToken()
    toast.success('分享链接已生成')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '生成失败')
  } finally {
    tokenSaving.value = false
  }
}

function confirmRegenerateToken(): void {
  void doRegenerateToken()
}

async function handleCopyLink(): Promise<void> {
  if (!shareUrl.value) return
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    toast.success('链接已复制')
  } catch {
    toast.error('复制失败，请手动复制')
  }
}
</script>

<template>
  <div class="h-full overflow-hidden bg-muted/40">
    <!-- 内容区 -->
    <main class="h-full overflow-y-auto">
      <div class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
        <!-- 页面标题 -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold tracking-tight text-foreground">设置</h1>
          <p class="mt-1 text-sm text-muted-foreground">管理你的居住地、账号与偏好</p>
        </div>

        <!-- ============ 1. 居住地设置 ============ -->
        <section class="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div class="border-b border-border px-6 py-4">
            <div class="flex items-center gap-2">
              <MapPin class="h-5 w-5 text-muted-foreground" />
              <h2 class="text-base font-semibold text-foreground">居住地设置</h2>
            </div>
            <p class="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              居住地精确到区县级。居住地所在城市不会被点亮，以冷蓝色标识。
              修改居住地后，旧居住地所在城市将恢复点亮。
            </p>
          </div>

          <div class="px-6 py-5">
            <!-- 加载骨架屏 -->
            <div v-if="residenceStore.loading" class="flex flex-col gap-3">
              <Skeleton class="h-10 w-full rounded-lg" />
              <Skeleton class="h-16 w-full rounded-lg" />
              <div class="flex justify-end">
                <Skeleton class="h-9 w-28 rounded-lg" />
              </div>
            </div>

            <ResidenceSelector
              v-else
              :model-value="residenceStore.residence"
              @change="handleResidenceChange"
            />
          </div>
        </section>

        <!-- ============ 2. 账号信息 ============ -->
        <section class="mt-5 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div class="border-b border-border px-6 py-4">
            <div class="flex items-center gap-2">
              <User class="h-5 w-5 text-primary" />
              <h2 class="text-base font-semibold text-foreground">账号信息</h2>
            </div>
          </div>

          <div class="space-y-5 px-6 py-5">
            <!-- 头像 + 邮箱 -->
            <div class="flex items-center gap-4">
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                alt="头像"
                class="h-16 w-16 rounded-full bg-muted ring-1 ring-border"
              />
              <div
                v-else
                class="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground ring-1 ring-border"
              >
                {{ user?.email?.charAt(0)?.toUpperCase() ?? '?' }}
              </div>
              <div class="min-w-0">
                <p class="text-xs text-muted-foreground">邮箱</p>
                <p class="truncate text-sm font-medium text-foreground">
                  {{ user?.email ?? '—' }}
                </p>
              </div>
            </div>

            <!-- 用户名编辑 -->
            <div>
              <label class="mb-1.5 block text-xs font-medium text-muted-foreground"> 用户名 </label>
              <div class="flex gap-2">
                <Input
                  v-model="displayNameDraft"
                  placeholder="请输入用户名"
                  maxlength="20"
                  class="flex-1"
                  @keyup.enter="handleSaveDisplayName"
                />
                <Button
                  class="shrink-0"
                  :disabled="!isDisplayNameDirty || displayNameSaving"
                  @click="handleSaveDisplayName"
                >
                  {{ displayNameSaving ? '保存中…' : '保存' }}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <!-- ============ 3. 偏好设置 ============ -->
        <section class="mt-5 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div class="border-b border-border px-6 py-4">
            <div class="flex items-center gap-2">
              <SettingsIcon class="h-5 w-5 text-primary" />
              <h2 class="text-base font-semibold text-foreground">偏好设置</h2>
            </div>
          </div>

          <div class="divide-y divide-border">
            <!-- 3.1 出行目的分类管理 -->
            <div class="px-6 py-5">
              <div class="mb-3 flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-foreground">出行目的分类</p>
                  <p class="mt-0.5 text-xs text-muted-foreground">
                    系统预设不可删除，自定义分类删除后关联记录转为"其他"
                  </p>
                </div>
                <Button variant="outline" size="sm" class="shrink-0 h-8" @click="openNewPurpose">
                  <Plus class="h-3.5 w-3.5" />
                  新建分类
                </Button>
              </div>

              <!-- 加载骨架屏 -->
              <div v-if="purposeStore.loading" class="flex flex-col gap-1.5">
                <Skeleton v-for="i in 4" :key="i" class="h-10 w-full rounded-lg" />
              </div>

              <!-- 分类列表 -->
              <div v-else class="space-y-1.5">
                <div
                  v-for="cat in purposeStore.categories"
                  :key="cat.id"
                  class="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-foreground">{{ cat.name }}</span>
                    <span
                      v-if="cat.isSystem"
                      class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      系统
                    </span>
                    <span
                      v-else
                      class="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
                    >
                      自定义
                    </span>
                  </div>
                  <Button
                    v-if="!cat.isSystem"
                    variant="ghost"
                    size="icon-sm"
                    class="size-6 hover:bg-destructive/10 hover:text-destructive"
                    title="删除"
                    @click="handleDeletePurpose(cat)"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <!-- 3.2 个人主页可见性 -->
            <div class="px-6 py-5">
              <div class="mb-3">
                <p class="text-sm font-medium text-foreground">个人主页可见性</p>
                <p class="mt-0.5 text-xs text-muted-foreground">
                  开启后，他人可通过分享链接查看你的点亮地图、统计与行程
                </p>
              </div>

              <!-- 公开开关 -->
              <div class="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5">
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block h-2 w-2 rounded-full"
                    :class="isPublic ? 'bg-green-500' : 'bg-muted-foreground/30'"
                  />
                  <span class="text-sm text-foreground">
                    {{ isPublic ? '公开' : '私密' }}
                  </span>
                </div>
                <Switch
                  :model-value="isPublic"
                  :disabled="visibilitySaving"
                  @update:model-value="handleVisibilityChange"
                />
              </div>

              <!-- 分享链接（仅公开时显示） -->
              <div v-if="isPublic" class="mt-3">
                <div v-if="shareToken" class="space-y-2">
                  <label class="block text-xs font-medium text-muted-foreground"> 分享链接 </label>
                  <div class="flex gap-2">
                    <Input
                      :value="shareUrl"
                      type="text"
                      readonly
                      class="h-9 min-w-0 flex-1 truncate bg-muted/40 text-xs text-muted-foreground"
                      @focus="($event.target as HTMLInputElement).select()"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      class="shrink-0 h-9"
                      @click="handleCopyLink"
                    >
                      <Copy class="h-3.5 w-3.5" />
                      复制
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="shrink-0 h-9"
                      :disabled="tokenSaving"
                      @click="handleGenerateToken"
                    >
                      {{ tokenSaving ? '生成中…' : '重新生成' }}
                    </Button>
                  </div>
                </div>

                <!-- 尚未生成 token -->
                <div
                  v-else
                  class="flex items-center justify-between rounded-lg border border-dashed bg-muted/50 px-3 py-3"
                >
                  <p class="text-xs text-muted-foreground">尚未生成分享链接</p>
                  <Button
                    size="sm"
                    class="h-8"
                    :disabled="tokenSaving"
                    @click="handleGenerateToken"
                  >
                    {{ tokenSaving ? '生成中…' : '生成分享链接' }}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ============ 退出登录 ============ -->
        <div class="mt-8 pb-4">
          <Button variant="destructive" class="w-full" @click="handleLogout">
            <LogOut class="h-4 w-4" />
            退出登录
          </Button>
        </div>
      </div>
    </main>

    <!-- 新建分类弹窗 -->
    <Dialog :open="newPurposeVisible" @update:open="(v) => (newPurposeVisible = v)">
      <DialogContent class="max-w-[360px]">
        <DialogHeader>
          <DialogTitle>新建出行目的分类</DialogTitle>
          <DialogDescription class="sr-only"> 新建出行目的分类 </DialogDescription>
        </DialogHeader>
        <Input
          v-model="newPurposeName"
          placeholder="如：摄影、徒步"
          maxlength="10"
          @keyup.enter="confirmNewPurpose"
        />
        <DialogFooter>
          <Button variant="outline" size="sm" @click="cancelNewPurpose"> 取消 </Button>
          <Button size="sm" :disabled="newPurposeSaving" @click="confirmNewPurpose">
            {{ newPurposeSaving ? '创建中...' : '创建' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 删除分类二次确认 -->
    <ConfirmDialog
      v-model:visible="deletePurposeVisible"
      title="删除分类"
      :description="deletePurposeDescription"
      confirm-text="确认删除"
      cancel-text="取消"
      danger
      @confirm="confirmDeletePurpose"
      @cancel="cancelDeletePurpose"
    />

    <!-- 重新生成分享链接二次确认 -->
    <ConfirmDialog
      v-model:visible="regenerateTokenVisible"
      title="重新生成分享链接"
      description="生成新的分享链接后，旧链接将立即失效。确认继续？"
      confirm-text="确认生成"
      cancel-text="取消"
      @confirm="confirmRegenerateToken"
    />

    <!-- 退出登录二次确认 -->
    <ConfirmDialog
      v-model:visible="logoutVisible"
      title="退出登录"
      description="确定要退出当前账号吗？退出后需要重新登录。"
      confirm-text="确认退出"
      cancel-text="取消"
      danger
      @confirm="confirmLogout"
    />
  </div>
</template>
