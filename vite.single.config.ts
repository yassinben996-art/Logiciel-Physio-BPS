// Build « fichier unique » : tout (JS, CSS, polices) est intégré dans un seul index.html,
// pour un hébergement comme page claude.ai (Artifact) ou un envoi par courriel.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: { outDir: 'dist-single', assetsInlineLimit: 100_000_000 },
});
