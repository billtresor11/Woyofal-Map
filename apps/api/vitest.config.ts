import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Une base dédiée aux tests : ils ne touchent jamais aux données de travail.
    globalSetup: ['./src/test/prepare-db.ts'],
    fileParallelism: false,
  },
});
