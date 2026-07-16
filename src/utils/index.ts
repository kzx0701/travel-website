// 工具函数集合
import type { DatePrecision } from '@/types'

/**
 * 根据日期精度格式化日期显示文本
 * - year：'YYYY' → 'YYYY 年'
 * - month：'YYYY-MM-DD' → 'YYYY 年 M 月'
 * - day：'YYYY-MM-DD' → 'YYYY-MM-DD'（范围则 'YYYY-MM-DD — YYYY-MM-DD'）
 */
export function formatRecordDate(
  startDate: string,
  endDate: string | null | undefined,
  precision: DatePrecision | undefined,
): string {
  if (precision === 'year') {
    return `${startDate.slice(0, 4)} 年`
  }
  if (precision === 'month') {
    const y = startDate.slice(0, 4)
    const m = Number(startDate.slice(5, 7))
    return `${y} 年 ${m} 月`
  }
  // day 或 range
  if (endDate) {
    return `${startDate} — ${endDate}`
  }
  return startDate
}
