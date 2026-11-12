import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Komponen latar (ogl) dipisah agar tidak masuk bundel awal.
    //
    // `motion` SENGAJA tidak dipisah ke chunk sendiri: aturan `manualChunks`
    // untuk motion membuat rolldown menambatkan chunk itu sebagai import STATIS
    // entry (dan `<link rel="modulepreload">` di index.html), sehingga 46 kB gzip
    // `motion` — yang hanya dipakai Blur Text di layar Game Over — ikut diunduh
    // sebelum paint pertama. Tanpa aturan ini, `motion` tinggal di chunk dinamis
    // BlurText. Diukur di build produksi dengan throttle ala Lighthouse.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/ogl')) return 'vendor-ogl';
          if (id.includes('node_modules/@mediapipe')) return 'vendor-mediapipe';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
