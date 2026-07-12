import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.ts', 'electron/**/*.ts', 'shared/**/*.ts']
    }
  },
  resolve: {
    alias: {
      '@': resolve('src'),
      '@shared': resolve('shared')
    }
  }
})
