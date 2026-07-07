import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Day 3 백엔드(FastAPI) 개발 연동용
      '/api': 'http://localhost:8010',
    },
  },
})
