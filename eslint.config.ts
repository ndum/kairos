import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import type { Linter } from 'eslint'
import { globalIgnores } from 'eslint/config'
import pluginVue from 'eslint-plugin-vue'

const layerRule = (forbidden: string[], reason: string): Linter.RulesRecord => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        { group: forbidden, message: `${reason} See docs/adr/0003-hexagonal-architecture.md.` },
      ],
    },
  ],
})

const frameworkImports = ['vue', 'vue-*', '@vue/*', 'pinia', '@vueuse/*']

export default defineConfigWithVueTs(
  {
    name: 'kairos/files',
    files: ['**/*.{ts,mts,vue}'],
  },

  globalIgnores(['dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**']),

  pluginVue.configs['flat/recommended'],
  vueTsConfigs.strictTypeChecked,

  {
    name: 'kairos/rules',
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },

  {
    name: 'kairos/architecture/domain',
    files: ['src/domain/**'],
    rules: layerRule(
      ['@/application/**', '@/infrastructure/**', '@/ui/**', ...frameworkImports],
      'The domain layer has no dependencies on other layers or frameworks.',
    ),
  },
  {
    name: 'kairos/architecture/application',
    files: ['src/application/**'],
    rules: layerRule(
      ['@/infrastructure/**', '@/ui/**', ...frameworkImports],
      'The application layer depends on the domain and its own ports only.',
    ),
  },
  {
    name: 'kairos/architecture/infrastructure',
    files: ['src/infrastructure/**'],
    rules: layerRule(
      ['@/ui/**', ...frameworkImports],
      'Adapters implement application ports and must not depend on the UI.',
    ),
  },

  skipFormatting,
)
