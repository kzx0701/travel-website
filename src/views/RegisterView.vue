<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
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
      confirmPassword: z.string({ required_error: '请再次输入密码' }).min(1, '请再次输入密码'),
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
  <main class="flex min-h-screen items-center justify-center bg-background p-6">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle>注册</CardTitle>
        <CardDescription>创建账号，开启你的旅行地图</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="space-y-4" @submit="onSubmit">
          <FormField v-slot="{ componentField }" name="email">
            <FormItem>
              <FormLabel>邮箱</FormLabel>
              <FormControl>
                <Input type="email" placeholder="请输入邮箱" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField v-slot="{ componentField }" name="password">
            <FormItem>
              <FormLabel>密码</FormLabel>
              <FormControl>
                <Input type="password" placeholder="请输入密码" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField v-slot="{ componentField }" name="confirmPassword">
            <FormItem>
              <FormLabel>确认密码</FormLabel>
              <FormControl>
                <Input type="password" placeholder="请再次输入密码" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <Button type="submit" class="w-full" :disabled="authStore.loading">
            {{ authStore.loading ? '注册中…' : '注册' }}
          </Button>
        </form>
      </CardContent>
      <CardFooter class="justify-center">
        <p class="text-sm text-muted-foreground">
          已有账号？
          <router-link
            class="font-medium text-primary underline-offset-4 hover:underline"
            to="/login"
          >
            去登录
          </router-link>
        </p>
      </CardFooter>
    </Card>
  </main>
</template>
