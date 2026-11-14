import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // Phaser's bundled engine accounts for most of the initial JavaScript chunk.
  build: { chunkSizeWarningLimit: 1600 },
});
