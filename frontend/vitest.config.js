import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js'],
    // El proyecto usa ESM (type: "module"), no se necesita transform
  },
})
