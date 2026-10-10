import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/', '**/node_modules/', '**/.next/', '.idea/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'separate-type-imports' },
      ],
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@wisdum/*/src/*', '@wisdum/*/dist/*'],
              message: 'Import packages through their public API (the package root) only.',
            },
          ],
        },
      ],
    },
  },
  {
    // The console transport IS the logger implementation; everyone else must use @wisdum/logger.
    files: ['packages/logger/src/**'],
    rules: { 'no-console': 'off' },
  },
  {
    // The CLI's user interface is its terminal output.
    files: ['packages/cli/src/**'],
    rules: { 'no-console': 'off' },
  },
  {
    // Browser code has no log transport; the browser console is where client errors surface.
    files: ['apps/web/src/**'],
    rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] },
  },
  {
    // Operator tools are plain Node scripts that talk to the user through the terminal.
    files: ['tools/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        URL: 'readonly',
      },
    },
  },
);
