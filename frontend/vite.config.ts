import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../build_frontend',
    emptyOutDir: true,
  },
  server: {
    port: 7000,
  },
});
