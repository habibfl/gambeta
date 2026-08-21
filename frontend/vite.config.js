import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Alias "@/..." -> "src/..." requis par shadcn/ui (voir jsconfig.json
  // pour la résolution côté éditeur/IntelliSense).
  resolve: {
    alias: {
      // import.meta.dirname (Node 20.11+) plutôt que __dirname : ce
      // dernier n'existe pas nativement en ESM et Vite 8 le signale
      // comme obsolète avec son nouveau chargeur de config "native".
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})