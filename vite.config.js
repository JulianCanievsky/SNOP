import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Las páginas se cargan por separado (React.lazy en App.jsx), pero el CSS
    // va en un solo archivo: las hojas por página son globales y algunas reglas
    // se comparten entre pantallas. Separarlo cambiaría estilos según el orden
    // de navegación. Revisar cuando todo esté en CSS Modules (B5).
    cssCodeSplit: false,
  },
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
