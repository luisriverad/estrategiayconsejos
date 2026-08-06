import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // El bundle pesa ~950 kB porque incluye datos.json (las 276 páginas
    // transcritas). Es intencional: así la app funciona sin servidor ni red.
    // Si algún día molesta, mueve datos.json a /public y cárgalo con fetch().
    chunkSizeWarningLimit: 1200,
  },
})
