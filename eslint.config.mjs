import js from '@eslint/js';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'warn',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single']
    }
  },
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      'coverage/',
      '.gemini/'
    ]
  }
];
