import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Ignores
  {
    ignores: [
      'node_modules/',
      '.next/',
      'out/',
      'scripts/',
      'lib/nppes/',
      'migrations/',
    ],
  },

  // TypeScript recommended
  ...tseslint.configs.recommended,

  // Prettier (turns off conflicting rules)
  prettier,

  // Project rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
    },
  },
);
