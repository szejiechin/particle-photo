import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';

function excludeLegacyCameraAssets(): Plugin {
  let outDir = '';
  return {
    name: 'exclude-legacy-camera-assets',
    configResolved(config) { outDir = config.build.outDir; },
    async closeBundle() {
      await Promise.all([
        rm(path.resolve(outDir, 'mediapipe'), { recursive: true, force: true }),
        rm(path.resolve(outDir, 'models/gesture_recognizer.task'), { force: true }),
      ]);
    },
  };
}

export default defineConfig({
  plugins: [react(), excludeLegacyCameraAssets()],
  worker: { format: 'es' },
  build: { sourcemap: true },
});
