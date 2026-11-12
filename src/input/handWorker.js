/**
 * handWorker — deteksi tangan MediaPipe di thread terpisah.
 *
 * Kenapa worker terpisah: `detectForVideo` memblokir thread pemanggilnya
 * selama ~20 ms. Kalau dijalankan di main thread dengan target 24–30 Hz, sekitar
 * setengah dari setiap detik habis untuk inferensi dan animasi jadi tersendat.
 * Di thread ini biayanya tidak terasa sama sekali di main thread.
 *
 * Kenapa worker klasik (bukan `type: 'module'`): Vite menulis ulang setiap
 * `import()` di berkas yang ia proses, termasuk yang dinamis, sehingga
 * pemuat wasm MediaPipe di `public/` gagal dimuat di mode pengembangan.
 * `importScripts` adalah pemanggilan biasa yang tidak disentuh Vite, jadi jalur
 * ini bekerja sama di dev dan build.
 *
 * Worker ini hanya berbicara ujung telunjuk + tiga angka kualitas (skor
 * handedness, panjang telapak, rasio jangkauan telunjuk): seluruh 21 titik tidak
 * perlu menyeberangi batas thread setiap frame, tetapi main thread tetap bisa
 * menolak deteksi yang sebenarnya lengan.
 */
/* global importScripts */

const WRIST = 0;
const INDEX_FINGER_MCP = 5;
const MIDDLE_FINGER_MCP = 9;
const INDEX_FINGER_TIP = 8;

importScripts('/vendor/vision_bundle.js');

const { FilesetResolver, HandLandmarker } = self.Vision;

let landmarker = null;
let maxHands = 2;

/**
 * Ringkas satu tangan jadi pointer + kualitas. `palm` = panjang telapak
 * (pergelangan → pangkal jari tengah), `reach` = jarak ujung telunjuk dari
 * pergelangan dibagi jarak MCP telunjuk dari pergelangan. Indeks yang terentang
 * memberi `reach` ≈ 2, indeks menggenggam ≈ 1.
 */
function describeHand(hand, score) {
  const tip = hand[INDEX_FINGER_TIP];
  if (!tip) return null;
  const wrist = hand[WRIST];
  const middle = hand[MIDDLE_FINGER_MCP];
  const knuckle = hand[INDEX_FINGER_MCP];
  if (!wrist || !middle || !knuckle) return { x: tip.x, y: tip.y, score };
  // Jarak 2D saja: `z` MediaPipe berisik, dan memasukkannya membuat rasio
  // melompat-lompat sehingga penyaring menolak frame sehat sesekali.
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const palm = distance(wrist, middle);
  const knuckleDistance = distance(wrist, knuckle);
  return {
    x: tip.x,
    y: tip.y,
    score,
    palm,
    reach: knuckleDistance > 1e-6 ? distance(wrist, tip) / knuckleDistance : 0,
  };
}

async function init(msg) {
  const vision = await FilesetResolver.forVisionTasks(msg.wasmPath);

  // GPU lalu CPU; kalau salah satu gagal dibuat, coba berikutnya.
  const candidates = msg.delegate === 'GPU' ? ['GPU', 'CPU'] : ['CPU'];
  for (const delegate of candidates) {
    try {
      landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: msg.modelPath, delegate },
        runningMode: 'VIDEO',
        numHands: msg.maxHands,
        // Ambang keyakinan ikut dari main thread (CONFIG.hand.confidence),
        // supaya jalur worker dan jalur cadangan berperilaku identik.
        ...msg.confidence,
      });
      maxHands = msg.maxHands;
      self.postMessage({ type: 'ready', delegate });
      return;
    } catch {
      /* coba delegate berikutnya */
    }
  }

  self.postMessage({ type: 'error', where: 'init', message: 'Model tangan tidak bisa dibuat.' });
}

self.onmessage = async (event) => {
  const msg = event.data;

  if (msg.type === 'init') {
    try {
      await init(msg);
    } catch (error) {
      self.postMessage({ type: 'error', where: 'init', message: String(error?.message ?? error) });
    }
    return;
  }

  if (msg.type === 'detect') {
    let tips = [];
    let ms = 0;
    try {
      const started = performance.now();
      const result = landmarker.detectForVideo(msg.bitmap, msg.ts);
      ms = performance.now() - started;
      tips = (result?.landmarks ?? [])
        .slice(0, maxHands)
        .map((hand, index) =>
          describeHand(hand, result?.handednesses?.[index]?.[0]?.score ?? 1)
        )
        .filter(Boolean);
    } catch (error) {
      self.postMessage({ type: 'error', where: 'detect', message: String(error?.message ?? error) });
    } finally {
      // Bitmap ditransfer ke sini; wajib ditutup supaya memori tidak menumpuk.
      msg.bitmap.close();
    }
    self.postMessage({ type: 'result', ts: msg.ts, tips, ms });
    return;
  }

  if (msg.type === 'stop') {
    try {
      landmarker?.close();
    } catch {
      /* sudah tertutup */
    }
    landmarker = null;
    self.close();
  }
};
