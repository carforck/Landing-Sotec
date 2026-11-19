import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  // En GitHub Pages el sitio vive en /Landing-Sotec/; en Vercel (sotecse.com) en la raíz.
  base: command === 'build' && !process.env.VERCEL ? '/Landing-Sotec/' : '/',
  plugins: [react()],
  // Dos páginas: la landing y «Tienda virtual · próximamente» (/tienda/).
  build: { rollupOptions: { input: { main: resolve(__dirname, 'index.html'), tienda: resolve(__dirname, 'tienda/index.html') } } },
  // Evita heredar el postcss.config del proyecto padre (CV).
  css: { postcss: {} },
  server: { port: 5180, strictPort: true },
}));
