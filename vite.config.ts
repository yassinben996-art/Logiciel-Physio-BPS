/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relatif : le site fonctionne aussi bien à la racine (Netlify, Vercel)
// que dans un sous-dossier (GitHub Pages).
// '@q' : liste des questionnaires intégrés — vide dans la version publique.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: { '@q': fileURLToPath(new URL('./src/questionnaires/none.ts', import.meta.url)) } },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
