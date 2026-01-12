import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  css: {
    postcss: {
      plugins: [], // Empty plugins array to bypass Tailwind v4 plugin
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    typecheck: {
      tsconfig: './tests/tsconfig.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '**/*.d.ts', '**/*.config.*', '**/mockData.ts'],
    },
    css: false, // Disable CSS processing in tests
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
