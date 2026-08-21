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
  },
  {
    // Fichiers générés par `shadcn add`, pas écrits à la main : on ne les
    // modifie pas pour satisfaire notre config ESLint (ça compliquerait
    // les futures mises à jour via `shadcn diff`/`update`), on assouplit
    // juste les deux règles qui ne s'appliquent pas à leur style généré.
    files: ['src/components/ui/**/*.jsx'],
    rules: {
      'no-unused-vars': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
])
