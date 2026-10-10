/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev/preview proxies. SPC and NWS currently send `Access-Control-Allow-Origin: *`,
// so the app fetches directly first and falls back to these same-origin paths if CORS fails.
const proxy = {
  '/proxy/spc': { target: 'https://www.spc.noaa.gov', changeOrigin: true, rewrite: (p: string) => p.replace(/^\/proxy\/spc/, '') },
  '/proxy/nws': { target: 'https://api.weather.gov', changeOrigin: true, rewrite: (p: string) => p.replace(/^\/proxy\/nws/, ''),
    headers: { 'User-Agent': 'StormChase-WHIRL-demo (local dev)' } },
};

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
  build: { chunkSizeWarningLimit: 1500 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
