import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 单例客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * 获取当前登录用户 id（用于插入数据时填充 user_id）
 * RLS 已保证查询/更新/删除时的用户隔离，但 INSERT 仍需显式提供 user_id
 */
export async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw new Error(`获取用户失败: ${error.message}`)
  if (!user) throw new Error('未登录')
  return user.id
}
