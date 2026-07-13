import { supabase, getCurrentUserId } from './supabase'
import type { Trip } from '@/types'

// 新建行程的输入字段
export interface TripInput {
  name: string
  startDate: string
  endDate?: string | null
}

// 更新行程的输入字段
export interface TripUpdate {
  name?: string
  startDate?: string
  endDate?: string | null
}

// 删除行程时的选项
export interface RemoveTripOptions {
  // true: 同时删除该行程下的全部到达记录
  // false: 仅删除行程，关联记录的 trip_id 置空（DB ON DELETE SET NULL）
  deleteRecords: boolean
}

// 数据库行类型
interface TripRow {
  id: string
  user_id: string
  name: string
  start_date: string
  end_date: string | null
  created_at: string
  updated_at: string
}

// listByUser 嵌套查询返回的行类型
interface TripRowWithRecords extends TripRow {
  visit_records?: { id: string; city_code: string }[]
}

function mapRow(row: TripRow): Trip {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapRowWithCounts(row: TripRowWithRecords): Trip {
  const records = row.visit_records ?? []
  const citySet = new Set(records.map((r) => r.city_code))
  return {
    ...mapRow(row),
    recordCount: records.length,
    cityCount: citySet.size,
  }
}

/**
 * 列出当前用户全部行程（含 recordCount / cityCount 聚合）
 */
export async function listByUser(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*, visit_records(id, city_code)')
    .order('start_date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as TripRowWithRecords[]).map(mapRowWithCounts)
}

/**
 * 根据 id 获取单个行程
 */
export async function getById(id: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapRow(data as TripRow) : null
}

/**
 * 新建行程
 */
export async function create(data: TripInput): Promise<Trip> {
  const userId = await getCurrentUserId()
  const { data: row, error } = await supabase
    .from('trips')
    .insert({
      user_id: userId,
      name: data.name,
      start_date: data.startDate,
      end_date: data.endDate ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapRow(row as TripRow)
}

/**
 * 更新行程
 */
export async function update(id: string, data: TripUpdate): Promise<Trip> {
  const update: Record<string, unknown> = {}
  if (data.name !== undefined) update.name = data.name
  if (data.startDate !== undefined) update.start_date = data.startDate
  if (data.endDate !== undefined) update.end_date = data.endDate

  const { data: row, error } = await supabase
    .from('trips')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapRow(row as TripRow)
}

/**
 * 删除行程
 * @param id 行程 id
 * @param option.deleteRecords true 时一并删除关联到达记录；false 时仅解绑（trip_id 置空）
 */
export async function remove(
  id: string,
  option: RemoveTripOptions,
): Promise<void> {
  if (option.deleteRecords) {
    // 先删除关联的到达记录（RLS 会限制只能删自己的）
    const { error: recErr } = await supabase
      .from('visit_records')
      .delete()
      .eq('trip_id', id)
    if (recErr) throw new Error(recErr.message)
  }
  // 删除行程本身；DB 中 visit_records.trip_id ON DELETE SET NULL 会自动解绑
  const { error } = await supabase.from('trips').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
