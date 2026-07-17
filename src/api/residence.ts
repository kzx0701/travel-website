import { supabase, getCurrentUserId } from './supabase'
import type { Residence } from '@/types'

// 居住地输入字段（不含 id / userId / 时间戳，由后端生成）
export interface ResidenceInput {
  provinceCode: string
  cityCode: string
  districtCode: string
  provinceName: string
  cityName: string
  districtName: string
}

// 数据库行类型（snake_case）
interface ResidenceRow {
  id: string
  user_id: string
  province_code: string
  city_code: string
  district_code: string
  province_name: string
  city_name: string
  district_name: string
  created_at: string
  updated_at: string
}

function mapRow(row: ResidenceRow): Residence {
  return {
    id: row.id,
    userId: row.user_id,
    provinceCode: row.province_code,
    cityCode: row.city_code,
    districtCode: row.district_code,
    provinceName: row.province_name,
    cityName: row.city_name,
    districtName: row.district_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * 获取当前用户居住地（每用户仅一条，无则返回 null）
 */
export async function getResidence(): Promise<Residence | null> {
  const { data, error } = await supabase.from('residences').select('*').maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapRow(data as ResidenceRow) : null
}

/**
 * 保存居住地（不存在则插入，存在则更新，按 user_id 唯一约束冲突覆盖）
 */
export async function saveResidence(data: ResidenceInput): Promise<Residence> {
  const userId = await getCurrentUserId()
  const { data: row, error } = await supabase
    .from('residences')
    .upsert(
      {
        user_id: userId,
        province_code: data.provinceCode,
        city_code: data.cityCode,
        district_code: data.districtCode,
        province_name: data.provinceName,
        city_name: data.cityName,
        district_name: data.districtName,
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapRow(row as ResidenceRow)
}

/**
 * 更新居住地（仅更新提供的字段，必须已存在）
 */
export async function updateResidence(data: Partial<ResidenceInput>): Promise<Residence> {
  const userId = await getCurrentUserId()
  const update: Record<string, string> = {}
  if (data.provinceCode !== undefined) update.province_code = data.provinceCode
  if (data.cityCode !== undefined) update.city_code = data.cityCode
  if (data.districtCode !== undefined) update.district_code = data.districtCode
  if (data.provinceName !== undefined) update.province_name = data.provinceName
  if (data.cityName !== undefined) update.city_name = data.cityName
  if (data.districtName !== undefined) update.district_name = data.districtName

  const { data: row, error } = await supabase
    .from('residences')
    .update(update)
    .eq('user_id', userId)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapRow(row as ResidenceRow)
}
