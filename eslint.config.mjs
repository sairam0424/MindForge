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
      '.gemini/',
      // Donor/upstream repos (gitignored, never shipped) — not MindForge's lint posture.
      'ECC/',
      'awesome-claude-code-subagents/',
      '.serena/',
      // Dynamic-workflow scripts are a DSL body for the Claude Code Workflow
      // tool's own
      // loader (bare top-level `return`, ambient
      // `agent`/`phase`/`log`/`args`/`budget`
      // bindings) — not standalone Node/ESM modules. No standard sourceType
      // parses both
      // `export const meta` (needs 'module') and a top-level `return` (needs
      // 'commonjs')
      // at once, so this is a real, unavoidable grammar mismatch, not
      // laxness. Validity is
      // enforced instead by tests/workflow-registry.test.js (meta export,
      // tier, phases,
      // filename-matched name) and by actually executing them via the
      // Workflow tool.
      '.mindforge/dynamic-workflows/scripts/'
    ]
  }
];
