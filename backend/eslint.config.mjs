import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  prettierConfig,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { arguments: false } }],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      // Drizzle returns arrays, so checking [0] can be undefined at runtime
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // Template literals with numbers are fine
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowBoolean: true }],
      // Non-null assertions are sometimes necessary with Drizzle
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // Deprecated APIs will be updated in future versions
      '@typescript-eslint/no-deprecated': 'warn',
      // Async methods without await are fine for interface consistency
      '@typescript-eslint/require-await': 'off',
      // Spread on class instances is intentional for DTOs
      '@typescript-eslint/no-misused-spread': 'warn',
      // Unknown in catch is too strict
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
      // String() on strings is sometimes for clarity
      '@typescript-eslint/no-unnecessary-type-conversion': 'warn',
      // Throwing non-Error objects is sometimes intentional
      '@typescript-eslint/only-throw-error': 'warn',
      // Empty functions are sometimes needed for callbacks
      '@typescript-eslint/no-empty-function': 'warn',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.js', '*.mjs'],
  },
);
