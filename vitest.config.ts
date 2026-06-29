import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Mirror the tsconfig "@/*" -> "./*" path alias so unit tests can import modules
// that use the project's `@/` convention (e.g. lib files importing other lib files).
const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: root }],
  },
});
