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
);
