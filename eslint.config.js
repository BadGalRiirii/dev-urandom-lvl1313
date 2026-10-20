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
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // These flag code the React Compiler can't optimise. The project doesn't use
      // the compiler and the patterns are deliberate (e.g. three.js objects mutated
      // in useFrame), so they're advice rather than failures.
      'react-hooks/immutability':                'warn',
      'react-hooks/refs':                        'warn',
      'react-hooks/set-state-in-effect':         'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
])
