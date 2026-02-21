import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import securityPlugin from 'eslint-plugin-security';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unicornPlugin from 'eslint-plugin-unicorn';
import jestPlugin from 'eslint-plugin-jest';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/cdk.out/**',
      '**/build/**',
      'eslint.config.ts',
      '**/*.d.ts',
    ],
  },

  // TypeScript App + Infra
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: [
          './tsconfig.json',
          './tsconfig.test.json',
          './infra/tsconfig.json',
        ],
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
      import: importPlugin,
      unicorn: unicornPlugin,
      security: securityPlugin,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      ...(tseslint.configs?.recommended?.rules ?? {}),
      ...(securityPlugin.configs?.recommended?.rules ?? {}),

      // Imports
      'import/no-duplicates': 'warn',
      'import/no-cycle': ['warn', { maxDepth: Infinity }],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // Style
      semi: ['error', 'always'],
      camelcase: ['warn', { properties: 'never' }],
      'no-console': 'off', // allow in Lambda

      // Prettier
      'prettier/prettier': [
        'warn',
        {
          printWidth: 100,
          tabWidth: 2,
          useTabs: false,
          semi: true,
          singleQuote: true,
          trailingComma: 'es5',
          bracketSpacing: true,
          arrowParens: 'avoid',
        },
      ],

      // TypeScript strictness
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // Test overrides
  {
    files: ['**/*.test.ts', '**/__tests__/**/*.ts', 'tests/**/*.ts'],
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
    },
  },

  eslintConfigPrettier,
];
