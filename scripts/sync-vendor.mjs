/**
 * Salin bundel tasks-vision ke `public/vendor/` supaya bisa dimuat dengan
 * `importScripts` dari dalam Web Worker klasik (`src/input/handWorker.js`).
 *
 * Kenapa harus disalin ke `public/`: Vite menulis ulang setiap `import()` di
 * berkas yang ia proses, termasuk di dalam worker, sehingga pemuat wasm
 * MediaPipe gagal di mode pengembangan. `importScripts` tidak disentuh Vite,
 * jadi bundel harus disajikan apa adanya — dan berkas di `public/` tidak
 * diproses. Skrip ini menjaga salinannya tetap sama dengan versi di
 * `node_modules`, supaya tidak ada penyimpangan versi.
 *
 * Dijalankan otomatis lewat `predev`, `prebuild`, dan `postinstall`.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules/@mediapipe/tasks-vision/vision_bundle.js');
const targetDir = join(root, 'public/vendor');
const target = join(targetDir, 'vision_bundle.js');

let sourceCode;
try {
  sourceCode = readFileSync(source, 'utf8');
} catch {
  console.error(`[sync-vendor] Tidak menemukan ${source}. Jalankan npm install dulu.`);
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });

// Lewati penulisan kalau isinya sama: menyentuh berkas memicu reload dev server.
let current = null;
try {
  current = readFileSync(target, 'utf8');
} catch {
  /* belum ada */
}

if (current === sourceCode) {
  console.log('[sync-vendor] public/vendor/vision_bundle.js sudah terbaru.');
} else {
  writeFileSync(target, sourceCode);
  console.log('[sync-vendor] public/vendor/vision_bundle.js diperbarui.');
}
