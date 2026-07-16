// ============================================================================
// 用户与档案
// ============================================================================

// 用户信息
export interface User {
  id: string
  email: string
  displayName?: string
  avatarSeed?: string
}

// 用户档案设置（公开分享）
export interface ProfileSettings {
  id: string
  userId: string
  isPublic: boolean
  shareToken?: string | null
}

// ============================================================================
// 地理数据
// ============================================================================

// 省
export interface Province {
  code: string
  name: string
  pinyin: string
}

// 市
export interface City {
  code: string
  name: string
  provinceCode: string
  provinceName: string
  longitude: number
  latitude: number
  pinyin: string
}

// 区/县
export interface District {
  code: string
  name: string
  cityCode: string
  cityName: string
}

// ============================================================================
// 业务实体
// ============================================================================

// 日期精度：year=仅年份，month=年月，day=完整日期
export type DatePrecision = 'year' | 'month' | 'day'

// 到达记录
export interface VisitRecord {
  id: string
  userId: string
  cityCode: string
  cityName: string
  provinceCode: string
  provinceName: string
  startDate: string
  endDate?: string | null
  datePrecision: DatePrecision
  purpose: string
  note: string
  tripId?: string | null
  createdAt: string
  updatedAt: string
}

// 行程
export interface Trip {
  id: string
  userId: string
  name: string
  startDate: string
  endDate?: string | null
  createdAt: string
  updatedAt: string
  // 聚合字段（可选，用于列表展示）
  recordCount?: number
  cityCount?: number
}

// 居住地（每用户仅一条）
export interface Residence {
  id: string
  userId: string
  provinceCode: string
  cityCode: string
  districtCode: string
  provinceName: string
  cityName: string
  districtName: string
  createdAt: string
  updatedAt: string
}

// 出行目的分类
export interface PurposeCategory {
  id: string
  userId?: string | null
  name: string
  sortOrder: number
  isSystem: boolean
}

// 兼容旧名（Task 1 占位）
export type Purpose = PurposeCategory

// ============================================================================
// 枚举与联合类型
// ============================================================================

// 地图层级
export type MapLevel = 'country' | 'province' | 'city'

// 城市排序方式
export type CitySortKey = 'recent' | 'count' | 'pinyin'

// 到达次数强度档位：1 次浅、2-3 次中、4+ 次深
export type VisitCountTier = 'low' | 'mid' | 'high'
