import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { apiPlugin } from './server/vitePlugin.js'

export default defineConfig({
  plugins: [react(), tailwindcss(), apiPlugin()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
})
