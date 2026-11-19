import { defineConfig } from 'vitest/config';

// Hits the real public CEP services; run with `pnpm test:live`.
export default defineConfig({
  test: {
    include: ['live/**/*.live.test.ts'],
    testTimeout: 30_000,
    retry: 2,
    fileParallelism: false,
  },
});
