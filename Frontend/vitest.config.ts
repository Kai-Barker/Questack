import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Frontend tests run in jsdom, a browser DOM simulated in Node. HTTP calls
// are answered by MSW (tests/helpers/server.ts), so the real axios setup in
// src/services/api.ts is exercised without a backend.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:5173/' } },
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    // Each test starts with fresh mocks and real timers
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/types/**', 'src/**/*.d.ts'],
      reporter: ['text', 'html'],
    },
  },
});
