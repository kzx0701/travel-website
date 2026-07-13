import { supabase, getCurrentUserId } from './supabase'
import type { ProfileSettings, VisitRecord, Trip } from '@/types'

// 更新档案设置的输入字段
export interface ProfileSettingsUpdate {
  isPublic?: boolean
  // 传 null 表示清除 token，传字符串表示设置 token
  shareToken?: string | null
}

// 数据库行类型
interface ProfileSettingsRow {
  id: string
  user_id: string
  is_public: boolean
  share_token: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: ProfileSettingsRow): ProfileSettings {
  return {
    id: row.id,
    userId: row.user_id,
    isPublic: row.is_public,
    shareToken: row.share_token,
  }
}

/**
 * 获取当前用户的档案设置（每用户仅一条，无则返回 null）
 */
export async function get(): Promise<ProfileSettings | null> {
  const { data, error } = await supabase
    .from('profile_settings')
    .select('*')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapRow(data as ProfileSettingsRow) : null
}

/**
 * 更新档案设置（不存在则插入，按 user_id 唯一约束 upsert）
 */
export async function update(
  data: ProfileSettingsUpdate,
): Promise<ProfileSettings> {
  const userId = await getCurrentUserId()
  const update: Record<string, unknown> = { user_id: userId }
  if (data.isPublic !== undefined) update.is_public = data.isPublic
  if (data.shareToken !== undefined) update.share_token = data.shareToken

  const { data: row, error } = await supabase
    .from('profile_settings')
    .upsert(update, { onConflict: 'user_id' })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapRow(row as ProfileSettingsRow)
}

/**
 * 生成新的分享 token 并保存到档案设置
 * @returns 新生成的 token
 */
export async function regenerateToken(): Promise<string> {
  const userId = await getCurrentUserId()
  // 生成 32 字节随机十六进制字符串
  const token = generateToken()

  const { error } = await supabase
    .from('profile_settings')
    .upsert(
      { user_id: userId, share_token: token },
      { onConflict: 'user_id' },
    )
  if (error) throw new Error(error.message)
  return token
}

/**
 * 生成 64 位十六进制随机字符串
 * 浏览器环境使用 crypto.getRandomValues，Node 环境兜底 crypto.randomBytes
 */
function generateToken(): string {
  const bytes = new Uint8Array(32)
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    globalThis.crypto.getRandomValues(bytes)
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ============================================================================
// 公开主页（匿名通过 token 访问）
// ============================================================================

// 公开主页聚合数据
export interface PublicProfile {
  displayName: string
  avatarSeed: string
  visitRecords: VisitRecord[]
  trips: Trip[]
}

// RPC 返回的 profile 行
interface PublicProfileRpcRow {
  id: string
  display_name: string | null
  avatar_seed: string | null
}

// RPC 返回的 visit_records 行
interface VisitRecordRpcRow {
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

// RPC 返回的 trips 行
interface TripRpcRow {
  id: string
  user_id: string
  name: string
  start_date: string
  end_date: string | null
  created_at: string
  updated_at: string
}

function mapVisitRecordRow(row: VisitRecordRpcRow): VisitRecord {
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

function mapTripRow(row: TripRpcRow): Trip {
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

/**
 * 通过分享 token 拉取公开主页数据（匿名可访问）
 *
 * 依次调用三个 SECURITY DEFINER 函数（绕过 RLS，仅 is_public = true 且 token 匹配时返回数据）：
 *  - get_public_profile          → display_name / avatar_seed
 *  - get_public_visit_records    → 到达记录（按 start_date 倒序）
 *  - get_public_trips            → 行程（按 start_date 倒序）
 *
 * 行程的 recordCount / cityCount 在客户端由 visitRecords 派生。
 * token 无效或主页未公开时抛错。
 */
export async function getPublicProfile(token: string): Promise<PublicProfile> {
  const [profileRes, recordsRes, tripsRes] = await Promise.all([
    supabase.rpc('get_public_profile', { p_token: token }),
    supabase.rpc('get_public_visit_records', { p_token: token }),
    supabase.rpc('get_public_trips', { p_token: token }),
  ])

  if (profileRes.error) throw new Error(profileRes.error.message)
  if (recordsRes.error) throw new Error(recordsRes.error.message)
  if (tripsRes.error) throw new Error(tripsRes.error.message)

  const profileRows = (profileRes.data ?? []) as PublicProfileRpcRow[]
  if (profileRows.length === 0) {
    throw new Error('公开主页不存在或已关闭')
  }
  const profileRow = profileRows[0]

  const recordRows = (recordsRes.data ?? []) as VisitRecordRpcRow[]
  const tripRows = (tripsRes.data ?? []) as TripRpcRow[]

  // 派生每个行程的 recordCount / cityCount
  const tripsWithCounts: Trip[] = tripRows.map((t) => {
    const tripRecords = recordRows.filter((r) => r.trip_id === t.id)
    const citySet = new Set(tripRecords.map((r) => r.city_code))
    return {
      ...mapTripRow(t),
      recordCount: tripRecords.length,
      cityCount: citySet.size,
    }
  })

  return {
    displayName: profileRow.display_name ?? '旅行者',
    avatarSeed: profileRow.avatar_seed ?? '',
    visitRecords: recordRows.map(mapVisitRecordRow),
    trips: tripsWithCounts,
  }
}
