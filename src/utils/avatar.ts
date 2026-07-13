// DiceBear 头像 API
const DICEBEAR_BASE = 'https://api.dicebear.com/7.x'
// bottts 风格：机器人风卡通头像
const AVATAR_STYLE = 'bottts'

/**
 * 生成随机头像种子（16 位十六进制字符串）
 */
export function generateAvatarSeed(): string {
  const bytes = new Uint8Array(8)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 根据 seed 获取 DiceBear 头像 URL
 * @param seed 头像种子
 * @param size 头像尺寸（像素），默认 128
 */
export function getAvatarUrl(seed: string, size = 128): string {
  return `${DICEBEAR_BASE}/${AVATAR_STYLE}/svg?seed=${encodeURIComponent(seed)}&size=${size}`
}
