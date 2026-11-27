import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import i18next from 'eslint-plugin-i18next';
import { importX } from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { createBoundaryConfigs } from './boundaries.mjs';

const TS_FILES = ['**/*.{ts,tsx,mts,cts}'];
const JS_FILES = ['**/*.{js,mjs,cjs}'];
const TEST_FILES = ['**/*.test.{ts,tsx}', '**/*.e2e.ts', '**/test/**'];
/** Folders where JSX is written: apps and the platform component packages. */
const UI_FILES = ['apps/*/src/**/*.tsx', 'packages/ui-*/src/**/*.tsx'];

/**
 * Shared ESLint flat config for the whole monorepo (docs/code-style.md section 5).
 * @param {{ rootDir: string }} options rootDir is the repo root (import.meta.dirname of the root config).
 */
export function createConfig({ rootDir }) {
  return defineConfig(
    {
      ignores: [
        '**/dist/**',
        '**/node_modules/**',
        '**/.turbo/**',
        '**/coverage/**',
        '**/*.gen.ts',
        '**/generated/**',
        'ui-mockup/**',
        'brands/**',
      ],
    },
    {
      files: JS_FILES,
      extends: [js.configs.recommended],
      languageOptions: { globals: globals.node },
    },
    {
      files: TS_FILES,
      extends: [
        js.configs.recommended,
        tseslint.configs.strictTypeChecked,
        tseslint.configs.stylisticTypeChecked,
      ],
      plugins: { 'import-x': importX },
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: rootDir,
        },
      },
      settings: {
        'import-x/resolver-next': [
          createTypeScriptImportResolver({
            project: ['apps/*/tsconfig.json', 'packages/*/tsconfig.json'],
            noWarnOnMultipleProjects: true,
          }),
        ],
      },
      rules: {
        // Mandatory rules (docs/code-style.md section 5).
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
        ],
        '@typescript-eslint/switch-exhaustiveness-check': [
          'error',
          { considerDefaultExhaustiveForUnions: true },
        ],
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/ban-ts-comment': [
          'error',
          { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true },
        ],
        'no-console': ['error', { allow: ['warn', 'error'] }],
        'import-x/no-cycle': 'error',
        'import-x/no-duplicates': 'error',
        'import-x/order': [
          'error',
          {
            groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'type'],
            pathGroups: [{ pattern: '@fnb/**', group: 'internal' }],
            pathGroupsExcludedImportTypes: ['builtin', 'type'],
            'newlines-between': 'always',
            alphabetize: { order: 'asc', caseInsensitive: true },
          },
        ],

        // Off on purpose: this rule fights the defensive `?.` / `??` style (code-style section 3).
        '@typescript-eslint/no-unnecessary-condition': 'off',
        // Numbers and booleans in template strings are fine.
        '@typescript-eslint/restrict-template-expressions': [
          'error',
          { allowNumber: true, allowBoolean: true },
        ],
        // NestJS modules are empty decorated classes.
        '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
        ],
      },
    },
    {
      files: UI_FILES,
      plugins: { 'react-hooks': reactHooks, i18next },
      languageOptions: { globals: globals.browser },
      rules: {
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'error',
        // Every user-visible string goes through i18n (plans/40-i18n-copy.md section 3).
        'i18next/no-literal-string': ['error', { framework: 'react', mode: 'jsx-text-only' }],
      },
    },
    {
      // Query hooks live in plain .ts files, outside UI_FILES.
      files: ['packages/api-client/src/**/*.{ts,tsx}'],
      plugins: { 'react-hooks': reactHooks },
      languageOptions: { globals: globals.browser },
      rules: {
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'error',
      },
    },
    // Import boundaries and token-only UI code (M0-14).
    ...createBoundaryConfigs({ rootDir, importX }),
    {
      files: TEST_FILES,
      rules: {
        'i18next/no-literal-string': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
      },
    },
    prettier,
  );
}
