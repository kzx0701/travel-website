import type { VisitCountTier } from '@/types'

/**
 * 已点亮城市三档暖橙色（参考配色规范）
 * - low  浅暖橙：到达 1 次
 * - mid  主暖橙：到达 2-3 次
 * - high 深暖橙：到达 4 次及以上
 */
export const TIER_COLORS: Record<VisitCountTier, string> = {
  low: '#FFB380',
  mid: '#FF6B35',
  high: '#E05A20',
}

/**
 * 其他相关配色（与 tailwind.config.js 中的 colors 保持一致）
 */
export const MAP_COLORS = {
  /** 居住地城市标识色 - 冷蓝 */
  residence: '#3B82F6',
  /** 未点亮省份色块 - 带一点冷蓝的灰白，避免地图像水印一样消失 */
  unlit: '#F1F5F9',
  /** 地图画布背景 - 和页面白底拉开轻微层次 */
  background: '#F8FAFC',
  /** 省份边界色 - 提升对比度，让行政区轮廓更清晰 */
  borderColor: '#CBD5E1',
  /** 已点亮省份填充 - 柔和暖桃色 */
  litFill: '#FFD8BF',
  /** 省份微妙阴影色 - 中性冷调，营造深度感 */
  shadowColor: 'rgba(15, 23, 42, 0.075)',
  /** 聚焦省份高亮边框 - 低饱和暖铜色，避免大面积描边过刺眼 */
  focusBorder: '#B9825A',
  /** 悬停省份高亮填充 */
  hoverFill: '#EAF2FF',
} as const

/**
 * 根据到达次数返回强度档位
 * - 1 次 → low
 * - 2-3 次 → mid
 * - 4+ 次 → high
 *
 * @param count 到达次数（<=0 视为未点亮，返回 'low' 仅作兜底，调用方需自行判断是否点亮）
 */
export function getVisitTier(count: number): VisitCountTier {
  if (count >= 4) return 'high'
  if (count >= 2) return 'mid'
  return 'low'
}

/**
 * 根据强度档位返回对应暖橙色
 */
export function getTierColor(tier: VisitCountTier): string {
  return TIER_COLORS[tier]
}

/**
 * 根据到达次数直接返回对应颜色（getVisitTier + getTierColor 的便捷组合）
 */
export function getVisitColor(count: number): string {
  return getTierColor(getVisitTier(count))
}
