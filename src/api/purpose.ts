import { supabase, getCurrentUserId } from './supabase'
import type { PurposeCategory } from '@/types'

// 数据库行类型
interface PurposeCategoryRow {
  id: string
  user_id: string | null
  name: string
  sort_order: number
  created_at: string
}

function mapRow(row: PurposeCategoryRow): PurposeCategory {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    sortOrder: row.sort_order,
    isSystem: row.user_id === null,
  }
}

/**
 * 列出全部出行目的分类（系统预设 + 当前用户自定义），按 sort_order 升序
 */
export async function listAll(): Promise<PurposeCategory[]> {
  const { data, error } = await supabase
    .from('purpose_categories')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as PurposeCategoryRow[]).map(mapRow)
}

/**
 * 仅列出系统预设分类（user_id IS NULL）
 */
export async function listSystem(): Promise<PurposeCategory[]> {
  const { data, error } = await supabase
    .from('purpose_categories')
    .select('*')
    .is('user_id', null)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as PurposeCategoryRow[]).map(mapRow)
}

/**
 * 仅列出当前用户自定义分类
 */
export async function listCustom(): Promise<PurposeCategory[]> {
  const { data, error } = await supabase
    .from('purpose_categories')
    .select('*')
    .not('user_id', 'is', null)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as PurposeCategoryRow[]).map(mapRow)
}

/**
 * 新建自定义分类
 * sort_order 取当前用户已有分类最大值 + 1（若无则 100，避开系统预设 1-6）
 */
export async function createCustom(name: string): Promise<PurposeCategory> {
  const userId = await getCurrentUserId()

  // 查询当前用户已有的最大 sort_order
  const { data: existing, error: qErr } = await supabase
    .from('purpose_categories')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1)
  if (qErr) throw new Error(qErr.message)

  const nextOrder =
    existing && existing.length > 0
      ? ((existing[0] as PurposeCategoryRow).sort_order ?? 0) + 1
      : 100

  const { data: row, error } = await supabase
    .from('purpose_categories')
    .insert({
      user_id: userId,
      name,
      sort_order: nextOrder,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapRow(row as PurposeCategoryRow)
}

/**
 * 删除自定义分类
 * 删除前会将所有使用该分类名的 visit_records.purpose 改为 '其他'
 */
export async function removeCustom(id: string): Promise<void> {
  // 1. 查询分类名
  const { data: cat, error: qErr } = await supabase
    .from('purpose_categories')
    .select('name, user_id')
    .eq('id', id)
    .maybeSingle()
  if (qErr) throw new Error(qErr.message)
  if (!cat) throw new Error('分类不存在')
  const row = cat as PurposeCategoryRow
  if (row.user_id === null) {
    throw new Error('系统预设分类不可删除')
  }

  // 2. 将关联 visit_records.purpose 改为 '其他'（RLS 限制只能改自己的记录）
  const { error: updErr } = await supabase
    .from('visit_records')
    .update({ purpose: '其他' })
    .eq('purpose', row.name)
  if (updErr) throw new Error(updErr.message)

  // 3. 删除分类
  const { error: delErr } = await supabase.from('purpose_categories').delete().eq('id', id)
  if (delErr) throw new Error(delErr.message)
}
