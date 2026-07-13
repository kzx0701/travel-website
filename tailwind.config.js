/** @type {import('tailwindcss').Config} */
export default {
  content: ['src/**/*.{vue,ts}'],
  // 关闭 preflight 避免与 Element Plus 基础样式冲突
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        // 已点亮城市主色 - 暖橙
        warm: '#FF6B35',
        // 居住地城市标识色 - 冷蓝
        cool: '#3B82F6',
        // 未点亮城市/省份色块 - 淡灰
        ash: '#E2E8F0',
        // 页面背景 - 纯白
        pure: '#FFFFFF',
      },
    },
  },
  plugins: [],
}
