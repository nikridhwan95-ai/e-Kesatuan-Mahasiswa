// Konfigurasi ESLint (flat config) — jalankan dengan: npm run lint:eslint
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'dev'] },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // 'warn' buat sementara; dinaikkan ke 'error' selepas semua
      // kebergantungan useEffect diperbetulkan (lihat pelan Fasa 8).
      'react-hooks/exhaustive-deps': 'warn',
      // Peraturan tambahan react-hooks v7 — ditangani semasa fasa
      // penstrukturan semula komponen; 'warn' sehingga itu.
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      // Kod sedia ada masih ada beberapa 'any' yang sengaja; diketatkan
      // secara berperingkat.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
);
