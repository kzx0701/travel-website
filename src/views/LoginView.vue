<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const schema = toTypedSchema(
  z.object({
    email: z
      .string({ required_error: '请输入邮箱' })
      .min(1, '请输入邮箱')
      .email('请输入正确的邮箱格式'),
    password: z
      .string({ required_error: '请输入密码' })
      .min(1, '请输入密码')
      .min(6, '密码至少 6 位'),
  }),
)

const { handleSubmit } = useForm({
  validationSchema: schema,
  initialValues: {
    email: '',
    password: '',
  },
})

const onSubmit = handleSubmit(async (values) => {
  try {
    await authStore.login(values.email, values.password)
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '登录失败')
  }
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1 class="auth-title">登录</h1>
      <p class="auth-subtitle">登录后开始记录你的旅行足迹</p>
      <form class="auth-form" @submit="onSubmit">
        <FormField v-slot="{ componentField }" name="email">
          <FormItem>
            <FormLabel>邮箱</FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder="请输入邮箱"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="password">
          <FormItem>
            <FormLabel>密码</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder="请输入密码"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <Button
          type="submit"
          class="w-full"
          :disabled="authStore.loading"
        >
          {{ authStore.loading ? '登录中…' : '登录' }}
        </Button>
      </form>
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

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth-footer {
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.5rem 0 0;
}

.auth-footer a {
  color: hsl(var(--primary));
  text-decoration: none;
}

.auth-footer a:hover {
  text-decoration: underline;
}
</style>
