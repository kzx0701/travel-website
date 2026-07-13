<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import ResidenceSelector from '@/components/business/ResidenceSelector.vue'
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
 * 2. 账号信息：邮箱 / 显示名（可编辑）/ 头像预览（DiceBear）/ 退出登录
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
    residenceStore.load()
  }
  // 出行目的分类
  if (purposeStore.categories.length === 0) {
    try {
      await purposeStore.loadAll()
    } catch (e) {
      ElMessage.error('出行目的加载失败')
      console.error(e)
    }
  }
  // 档案设置（可见性 / 分享 token）
  if (!profileSettingsStore.settings) {
    try {
      await profileSettingsStore.load()
    } catch (e) {
      ElMessage.error('档案设置加载失败')
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

// 首次拿到用户信息后同步显示名草稿
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
    ElMessage.warning('显示名不能为空')
    return
  }
  if (!isDisplayNameDirty.value) return
  displayNameSaving.value = true
  try {
    await authStore.updateDisplayName(name)
    ElMessage.success('显示名已更新')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    displayNameSaving.value = false
  }
}

async function handleLogout(): Promise<void> {
  try {
    await authStore.logout()
  } catch (e) {
    ElMessage.error('退出失败')
    console.error(e)
  }
}

// ---- 出行目的分类管理 ----
async function handleDeletePurpose(cat: PurposeCategory): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定删除自定义分类「${cat.name}」吗？\n使用该分类的到达记录将自动转为"其他"。`,
      '删除分类',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return // 用户取消
  }
  try {
    await purposeStore.removeCustom(cat.id)
    // 刷新到达记录以同步 purpose 字段变更
    await visitRecordStore.loadAll()
    ElMessage.success('已删除分类')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

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
    ElMessage.warning('请输入分类名称')
    return
  }
  if (purposeStore.categories.some((c) => c.name === name)) {
    ElMessage.warning('该分类已存在')
    return
  }
  newPurposeSaving.value = true
  try {
    await purposeStore.createCustom(name)
    newPurposeVisible.value = false
    ElMessage.success('已新建分类')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '新建失败')
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

const isPublic = computed(
  () => profileSettingsStore.settings?.isPublic ?? false,
)
const shareToken = computed(
  () => profileSettingsStore.settings?.shareToken ?? '',
)
const shareUrl = computed(() =>
  shareToken.value
    ? `${window.location.origin}/p/${shareToken.value}`
    : '',
)

async function handleVisibilityChange(
  val: string | number | boolean,
): Promise<void> {
  const next = Boolean(val)
  visibilitySaving.value = true
  try {
    await profileSettingsStore.update({ isPublic: next })
    ElMessage.success(next ? '已开启公开访问' : '已关闭公开访问')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '更新失败')
  } finally {
    visibilitySaving.value = false
  }
}

async function handleGenerateToken(): Promise<void> {
  // 已有 token 时需二次确认（重新生成会使旧链接失效）
  if (shareToken.value) {
    try {
      await ElMessageBox.confirm(
        '生成新的分享链接后，旧链接将立即失效。确认继续？',
        '重新生成分享链接',
        {
          confirmButtonText: '确认生成',
          cancelButtonText: '取消',
          type: 'warning',
        },
      )
    } catch {
      return
    }
  }
  tokenSaving.value = true
  try {
    await profileSettingsStore.regenerateToken()
    ElMessage.success('分享链接已生成')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '生成失败')
  } finally {
    tokenSaving.value = false
  }
}

async function handleCopyLink(): Promise<void> {
  if (!shareUrl.value) return
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    ElMessage.success('链接已复制')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-slate-50">
    <!-- 顶部导航 -->
    <AppNavbar />

    <!-- 内容区 -->
    <main class="flex-1 overflow-y-auto">
      <div class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
        <!-- 页面标题 -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold tracking-tight text-slate-800">
            设置
          </h1>
          <p class="mt-1 text-sm text-slate-500">
            管理你的居住地、账号与偏好
          </p>
        </div>

        <!-- ============ 1. 居住地设置 ============ -->
        <section
          class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div class="border-b border-slate-100 px-6 py-4">
            <div class="flex items-center gap-2">
              <svg
                class="h-5 w-5 text-cool"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <h2 class="text-base font-semibold text-slate-800">
                居住地设置
              </h2>
            </div>
            <p class="mt-1.5 text-xs leading-relaxed text-slate-500">
              居住地精确到区县级。居住地所在城市不会被点亮，以冷蓝色标识。
              修改居住地后，旧居住地所在城市将恢复点亮。
            </p>
          </div>

          <div class="px-6 py-5">
            <!-- 加载骨架屏 -->
            <div v-if="residenceStore.loading" class="space-y-3">
              <div class="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
              <div class="h-16 w-full animate-pulse rounded-lg bg-slate-100" />
              <div class="flex justify-end">
                <div
                  class="h-9 w-28 animate-pulse rounded-lg bg-slate-100"
                />
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
        <section
          class="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div class="border-b border-slate-100 px-6 py-4">
            <div class="flex items-center gap-2">
              <svg
                class="h-5 w-5 text-warm"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <h2 class="text-base font-semibold text-slate-800">账号信息</h2>
            </div>
          </div>

          <div class="space-y-5 px-6 py-5">
            <!-- 头像 + 邮箱 -->
            <div class="flex items-center gap-4">
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                alt="头像"
                class="h-16 w-16 rounded-full bg-slate-100 ring-1 ring-slate-200"
              />
              <div
                v-else
                class="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 ring-1 ring-slate-200"
              >
                {{ user?.email?.charAt(0)?.toUpperCase() ?? '?' }}
              </div>
              <div class="min-w-0">
                <p class="text-xs text-slate-400">邮箱</p>
                <p class="truncate text-sm font-medium text-slate-700">
                  {{ user?.email ?? '—' }}
                </p>
                <p class="mt-0.5 text-[11px] text-slate-400">
                  头像由 DiceBear 根据种子自动生成
                </p>
              </div>
            </div>

            <!-- 显示名编辑 -->
            <div>
              <label class="mb-1.5 block text-xs font-medium text-slate-500">
                显示名
              </label>
              <div class="flex gap-2">
                <el-input
                  v-model="displayNameDraft"
                  placeholder="请输入显示名"
                  maxlength="20"
                  class="flex-1"
                  @keyup.enter="handleSaveDisplayName"
                />
                <button
                  type="button"
                  class="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-warm px-4 text-sm font-medium text-white transition-colors hover:bg-warm/90 disabled:cursor-not-allowed disabled:bg-warm/40"
                  :disabled="!isDisplayNameDirty || displayNameSaving"
                  @click="handleSaveDisplayName"
                >
                  {{ displayNameSaving ? '保存中…' : '保存' }}
                </button>
              </div>
            </div>

            <!-- 退出登录 -->
            <div class="border-t border-slate-100 pt-4">
              <button
                type="button"
                class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                @click="handleLogout"
              >
                <svg
                  class="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                退出登录
              </button>
            </div>
          </div>
        </section>

        <!-- ============ 3. 偏好设置 ============ -->
        <section
          class="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div class="border-b border-slate-100 px-6 py-4">
            <div class="flex items-center gap-2">
              <svg
                class="h-5 w-5 text-warm"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"
                />
              </svg>
              <h2 class="text-base font-semibold text-slate-800">偏好设置</h2>
            </div>
          </div>

          <div class="divide-y divide-slate-100">
            <!-- 3.1 出行目的分类管理 -->
            <div class="px-6 py-5">
              <div class="mb-3 flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-700">出行目的分类</p>
                  <p class="mt-0.5 text-xs text-slate-400">
                    系统预设不可删除，自定义分类删除后关联记录转为"其他"
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-warm/5 px-3 text-xs font-medium text-warm transition-colors hover:bg-warm/10"
                  @click="openNewPurpose"
                >
                  <svg
                    class="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  新建分类
                </button>
              </div>

              <!-- 加载骨架屏 -->
              <div v-if="purposeStore.loading" class="space-y-1.5">
                <div
                  v-for="i in 4"
                  :key="i"
                  class="h-10 w-full animate-pulse rounded-lg bg-slate-100"
                />
              </div>

              <!-- 分类列表 -->
              <div v-else class="space-y-1.5">
                <div
                  v-for="cat in purposeStore.categories"
                  :key="cat.id"
                  class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-slate-700">{{ cat.name }}</span>
                    <span
                      v-if="cat.isSystem"
                      class="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500"
                    >
                      系统
                    </span>
                    <span
                      v-else
                      class="rounded-full bg-warm/10 px-1.5 py-0.5 text-[10px] font-medium text-warm"
                    >
                      自定义
                    </span>
                  </div>
                  <button
                    v-if="!cat.isSystem"
                    type="button"
                    class="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="删除"
                    @click="handleDeletePurpose(cat)"
                  >
                    <svg
                      class="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path
                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
                      />
                      <path
                        d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- 3.2 个人主页可见性 -->
            <div class="px-6 py-5">
              <div class="mb-3">
                <p class="text-sm font-medium text-slate-700">
                  个人主页可见性
                </p>
                <p class="mt-0.5 text-xs text-slate-400">
                  开启后，他人可通过分享链接查看你的点亮地图、统计与行程
                </p>
              </div>

              <!-- 公开开关 -->
              <div class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block h-2 w-2 rounded-full"
                    :class="isPublic ? 'bg-green-500' : 'bg-slate-300'"
                  />
                  <span class="text-sm text-slate-700">
                    {{ isPublic ? '公开' : '私密' }}
                  </span>
                </div>
                <el-switch
                  :model-value="isPublic"
                  :loading="visibilitySaving"
                  @change="handleVisibilityChange"
                />
              </div>

              <!-- 分享链接（仅公开时显示） -->
              <div v-if="isPublic" class="mt-3">
                <div v-if="shareToken" class="space-y-2">
                  <label class="block text-xs font-medium text-slate-500">
                    分享链接
                  </label>
                  <div class="flex gap-2">
                    <input
                      :value="shareUrl"
                      type="text"
                      readonly
                      class="h-9 min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-600"
                      @focus="($event.target as HTMLInputElement).select()"
                    />
                    <button
                      type="button"
                      class="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                      @click="handleCopyLink"
                    >
                      <svg
                        class="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      复制
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                      :disabled="tokenSaving"
                      @click="handleGenerateToken"
                    >
                      {{ tokenSaving ? '生成中…' : '重新生成' }}
                    </button>
                  </div>
                </div>

                <!-- 尚未生成 token -->
                <div v-else class="flex items-center justify-between rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 py-3">
                  <p class="text-xs text-slate-400">
                    尚未生成分享链接
                  </p>
                  <button
                    type="button"
                    class="inline-flex h-8 items-center rounded-md bg-warm px-3 text-xs font-medium text-white transition-colors hover:bg-warm/90 disabled:opacity-50"
                    :disabled="tokenSaving"
                    @click="handleGenerateToken"
                  >
                    {{ tokenSaving ? '生成中…' : '生成分享链接' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- 新建分类弹窗 -->
    <el-dialog
      v-model="newPurposeVisible"
      title="新建出行目的分类"
      width="360px"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-input
        v-model="newPurposeName"
        placeholder="如：摄影、徒步"
        maxlength="10"
        show-word-limit
        @keyup.enter="confirmNewPurpose"
      />
      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50"
            @click="cancelNewPurpose"
          >
            取消
          </button>
          <button
            type="button"
            class="rounded-md bg-warm px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-warm/90 disabled:opacity-60"
            :disabled="newPurposeSaving"
            @click="confirmNewPurpose"
          >
            {{ newPurposeSaving ? '创建中...' : '创建' }}
          </button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
