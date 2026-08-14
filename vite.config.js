import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // En desarrollo, redirige /api/* al backend Express local.
      // Así el frontend no necesita VITE_API_URL explícita en dev y evita
      // problemas de CORS cuando ambos corren en localhost con distinto puerto.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
