import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Integration tests (`*.int.test.ts`) share one test database, so files run one after another.
    fileParallelism: false,
    // Recreates the test database and applies the migrations once per run (M1-05).
    globalSetup: ['./src/test/global-setup.ts'],
    // Points each worker at the test database and the test Redis before any module loads.
    setupFiles: ['./src/test/setup-env.ts'],
    hookTimeout: 30_000,
  },
  plugins: [
    // NestJS dependency injection reads decorator metadata, which only SWC emits here.
    swc.vite({ module: { type: 'es6' } }),
  ],
});
