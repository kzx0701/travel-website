<script setup lang="ts">
import { useRouter } from 'vue-router'
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
const authStore = useAuthStore()

const schema = toTypedSchema(
  z
    .object({
      email: z
        .string({ required_error: '请输入邮箱' })
        .min(1, '请输入邮箱')
        .email('请输入正确的邮箱格式'),
      password: z
        .string({ required_error: '请输入密码' })
        .min(1, '请输入密码')
        .min(6, '密码至少 6 位'),
      confirmPassword: z
        .string({ required_error: '请再次输入密码' })
        .min(1, '请再次输入密码'),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ['confirmPassword'],
      message: '两次输入的密码不一致',
    }),
)

const { handleSubmit } = useForm({
  validationSchema: schema,
  initialValues: {
    email: '',
    password: '',
    confirmPassword: '',
  },
})

const onSubmit = handleSubmit(async (values) => {
  try {
    await authStore.register(values.email, values.password)
    toast.success('注册成功')
    router.push('/')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '注册失败')
  }
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1 class="auth-title">注册</h1>
      <p class="auth-subtitle">创建账号，开启你的旅行地图</p>
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
                placeholder="至少 6 位"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="confirmPassword">
          <FormItem>
            <FormLabel>确认密码</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder="请再次输入密码"
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
          {{ authStore.loading ? '注册中…' : '注册' }}
        </Button>
      </form>
      <p class="auth-footer">
        已有账号？<router-link to="/login">去登录</router-link>
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
