/// <reference types="vitest/config" />
// Version PERSONNELLE : fichier unique incluant les questionnaires de private/questionnaires.ts
// (exclu de git). Ne jamais publier ce build : il contient des questionnaires sous licence.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

const priv = fileURLToPath(new URL('./private/questionnaires.ts', import.meta.url));
if (!existsSync(priv)) throw new Error('private/questionnaires.ts introuvable : version personnelle impossible.');

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  resolve: { alias: { '@q': priv } },
  build: { outDir: 'dist-private', assetsInlineLimit: 100_000_000 },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['private/**/*.test.{ts,tsx}'],
  },
});
