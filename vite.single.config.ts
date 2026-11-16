// Build « fichier unique » public : tout (JS, CSS, polices) dans un seul index.html.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  resolve: { alias: { '@q': fileURLToPath(new URL('./src/questionnaires/public.ts', import.meta.url)) } },
  build: { outDir: 'dist-single', assetsInlineLimit: 100_000_000 },
});
