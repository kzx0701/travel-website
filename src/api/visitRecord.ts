import { supabase, getCurrentUserId } from './supabase'
import type { VisitRecord } from '@/types'

// 新建记录的输入字段
export interface VisitRecordInput {
  cityCode: string
  cityName: string
  provinceCode: string
  provinceName: string
  startDate: string
  endDate?: string | null
  purpose: string
  note?: string
  tripId?: string | null
}

// 更新记录的输入字段（全部可选）
export interface VisitRecordUpdate {
  cityCode?: string
  cityName?: string
  provinceCode?: string
  provinceName?: string
  startDate?: string
  endDate?: string | null
  purpose?: string
  note?: string
  tripId?: string | null
}

// 数据库行类型
interface VisitRecordRow {
  id: string
  user_id: string
  city_code: string
  city_name: string
  province_code: string
  province_name: string
  start_date: string
  end_date: string | null
  purpose: string
  note: string | null
  trip_id: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: VisitRecordRow): VisitRecord {
  return {
    id: row.id,
    userId: row.user_id,
    cityCode: row.city_code,
    cityName: row.city_name,
    provinceCode: row.province_code,
    provinceName: row.province_name,
    startDate: row.start_date,
    endDate: row.end_date,
    purpose: row.purpose,
    note: row.note ?? '',
    tripId: row.trip_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * 列出当前用户全部到达记录
 */
export async function listByUser(): Promise<VisitRecord[]> {
  const { data, error } = await supabase
    .from('visit_records')
    .select('*')
    .order('start_date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as VisitRecordRow[]).map(mapRow)
}

/**
 * 列出当前用户在某城市的全部到达记录
 */
export async function listByCity(cityCode: string): Promise<VisitRecord[]> {
  const { data, error } = await supabase
    .from('visit_records')
    .select('*')
    .eq('city_code', cityCode)
    .order('start_date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as VisitRecordRow[]).map(mapRow)
}

/**
 * 新建到达记录
 */
export async function create(data: VisitRecordInput): Promise<VisitRecord> {
  const userId = await getCurrentUserId()
  const { data: row, error } = await supabase
    .from('visit_records')
    .insert({
      user_id: userId,
      city_code: data.cityCode,
      city_name: data.cityName,
      province_code: data.provinceCode,
      province_name: data.provinceName,
      start_date: data.startDate,
      end_date: data.endDate ?? null,
      purpose: data.purpose,
      note: data.note ?? null,
      trip_id: data.tripId ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapRow(row as VisitRecordRow)
}

/**
 * 更新到达记录
 */
export async function update(
  id: string,
  data: VisitRecordUpdate,
): Promise<VisitRecord> {
  const update: Record<string, unknown> = {}
  if (data.cityCode !== undefined) update.city_code = data.cityCode
  if (data.cityName !== undefined) update.city_name = data.cityName
  if (data.provinceCode !== undefined) update.province_code = data.provinceCode
  if (data.provinceName !== undefined) update.province_name = data.provinceName
  if (data.startDate !== undefined) update.start_date = data.startDate
  if (data.endDate !== undefined) update.end_date = data.endDate
  if (data.purpose !== undefined) update.purpose = data.purpose
  if (data.note !== undefined) update.note = data.note
  if (data.tripId !== undefined) update.trip_id = data.tripId

  const { data: row, error } = await supabase
    .from('visit_records')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapRow(row as VisitRecordRow)
}

/**
 * 删除到达记录
 */
export async function remove(id: string): Promise<void> {
  const { error } = await supabase.from('visit_records').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * 统计当前用户在某城市的到达次数
 */
export async function countByCity(cityCode: string): Promise<number> {
  const { count, error } = await supabase
    .from('visit_records')
    .select('*', { count: 'exact', head: true })
    .eq('city_code', cityCode)
  if (error) throw new Error(error.message)
  return count ?? 0
}
