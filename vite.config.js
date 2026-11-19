import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  // En GitHub Pages el sitio vive en /Landing-Sotec/; en Vercel (sotecse.com) en la raíz.
  base: command === 'build' && !process.env.VERCEL ? '/Landing-Sotec/' : '/',
  plugins: [react()],
  // /tienda la sirve el proyecto de Vercel «tienda-sotec» (tienda-app/), ver vercel.json.
  // Evita heredar el postcss.config del proyecto padre (CV).
  css: { postcss: {} },
  server: { port: 5180, strictPort: true },
}));
