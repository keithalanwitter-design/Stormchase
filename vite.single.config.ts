import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
export default defineConfig({
  plugins: [react(), viteSingleFile(), { name: 'swap-worker', enforce: 'pre', resolveId(id, imp) { if (imp && /maplibreSetup(\.ts)?$/.test(id) && !id.includes('single')) return path.resolve('src/lib/maplibreSetup.single.ts'); } }],
  build: { outDir: '/tmp/single', emptyOutDir: true },
});
