import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
  plugins: [
    // NestJS dependency injection reads decorator metadata, which only SWC emits here.
    swc.vite({ module: { type: 'es6' } }),
  ],
});
