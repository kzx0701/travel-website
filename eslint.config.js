import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },
  {
    name: 'app/files-to-ignore',
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      '**/tmp/**',
      '**/travel-map-prototype/**',
      '**/node_modules/**',
      'src/auto-imports.d.ts',
      'src/components.d.ts',
    ],
  },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    // shadcn-vue UI 组件按约定使用单词命名（Button、Skeleton 等），不受多词命名约束
    name: 'app/shadcn-ui-overrides',
    files: ['src/components/ui/**/*.{ts,tsx,vue}'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    name: 'app/custom-rules',
    rules: {
      // 单文件行数上限提示（警告级，含 .vue 文件）
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  skipFormatting,
)
