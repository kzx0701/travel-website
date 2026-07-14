import avatarPng from '@/assets/images/avatar.png'

/**
 * 生成随机头像种子（16 位十六进制字符串）
 * 保留用于 DB trigger 兼容，头像已改为统一默认图
 */
export function generateAvatarSeed(): string {
  const bytes = new Uint8Array(8)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 返回默认头像 URL（本地静态资源）
 * @param _seed 保留参数兼容旧调用，不再使用
 * @param _size 保留参数兼容旧调用，不再使用
 */
export function getAvatarUrl(_seed?: string, _size?: number): string {
  return avatarPng
}
