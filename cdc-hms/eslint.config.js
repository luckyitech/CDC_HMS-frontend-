import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Ignore PascalCase/UPPER names (components/constants), unused function args
      // (callback signatures), and caught errors. Genuine unused locals still error.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', args: 'none', caughtErrors: 'none' }],
      // DX-only Vite HMR hint. The codebase deliberately co-locates hooks/constants with
      // their providers; disabling removes noise with zero runtime effect.
      'react-refresh/only-export-components': 'off',
      // Opinionated React-19 perf rule (react-hooks plugin v7). Every flagged effect here
      // (mount-load, reset-on-open) is correct and pervasive; refactoring working clinical
      // effects to satisfy a perf hint carries more risk than the rule prevents. Revisit as
      // a dedicated, separately-tested pass rather than during a merge.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
