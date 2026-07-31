import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Escucha en todas las interfaces de red (no solo localhost), para poder
    // abrir la app desde el celular u otra compu en la misma red Wi-Fi con
    // solo correr `npm run dev` — sin necesitar el flag --host.
    host: true
  }
})
