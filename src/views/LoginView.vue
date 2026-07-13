<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const form = reactive({
  email: '',
  password: '',
})

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

function handleSubmit() {
  formRef.value?.validate(async (valid) => {
    if (!valid) return
    try {
      await authStore.login(form.email, form.password)
      const redirect = (route.query.redirect as string) || '/'
      router.push(redirect)
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : '登录失败')
    }
  })
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1 class="auth-title">登录</h1>
      <p class="auth-subtitle">登录后开始记录你的旅行足迹</p>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleSubmit"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="form.email"
            type="email"
            placeholder="请输入邮箱"
            size="large"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password
            @keyup.enter="handleSubmit"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            class="auth-button"
            :loading="authStore.loading"
            @click="handleSubmit"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
      <p class="auth-footer">
        没有账号？<router-link to="/register">去注册</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  padding: 1.5rem;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  padding: 2.5rem 2rem;
}

.auth-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem;
}

.auth-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 1.5rem;
}

.auth-button {
  width: 100%;
  --el-button-bg-color: #ff6b35;
  --el-button-border-color: #ff6b35;
  --el-button-hover-bg-color: #ff8559;
  --el-button-hover-border-color: #ff8559;
  --el-button-active-bg-color: #e85a28;
  --el-button-active-border-color: #e85a28;
  --el-button-disabled-bg-color: #ffb39a;
  --el-button-disabled-border-color: #ffb39a;
}

.auth-footer {
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.5rem 0 0;
}

.auth-footer a {
  color: #ff6b35;
  text-decoration: none;
}

.auth-footer a:hover {
  text-decoration: underline;
}
</style>
