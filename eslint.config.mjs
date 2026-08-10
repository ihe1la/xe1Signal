import { defineConfig, globalIgnores } from 'eslint/config';
import nextPlugin from '@next/eslint-plugin-next';
import nextParser from 'eslint-config-next/parser';

export default defineConfig([
  {
    name: 'next',
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    languageOptions: {
      parser: nextParser,
      parserOptions: {
        requireConfigFile: false,
        sourceType: 'module',
        allowImportExportEverywhere: true,
        babelOptions: {
          presets: ['next/babel'],
          caller: { supportsTopLevelAwait: true },
        },
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      '@next/next/no-html-link-for-pages': 'warn',
    },
  },
  globalIgnores(['**/.next/**', 'out/**', 'build/**', '**/node_modules/**', 'coverage/**', 'test-results/**', 'next-env.d.ts']),
]);
