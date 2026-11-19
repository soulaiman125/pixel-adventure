import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
process.env.VITE_GAME_VERSION = version;

export default defineConfig({
  base: './',
  // Phaser's bundled engine accounts for most of the initial JavaScript chunk.
  build: { chunkSizeWarningLimit: 1600 },
});
