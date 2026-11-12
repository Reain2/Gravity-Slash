/**
 * HandTrackingAdapter: kamera + MediaPipe Hand Landmarker.
 *
 * Aturan yang dijaga di sini (PRD bagian 6.1 & ARCHITECTURE bagian 6.2):
 *   - `numHands: 2`; tangan ketiga otomatis diabaikan oleh InputManager.
 *   - Hanya landmark 8 (ujung telunjuk) yang dipakai.
 *   - Sumbu X dimirror supaya gerakan terasa alami.
 *   - Posisi dihaluskan (EMA).
 *   - Deteksi berjalan di loop sendiri, terpisah dari loop render.
 *   - Frame kamera tidak pernah dikirim atau disimpan.
 *
 * Model dan wasm disajikan dari `public/` (NFR-07), bukan CDN.
 *
 * BUG-006: `start()` bersifat asinkron dan React StrictMode memasang efek dua
 * kali. Tanpa token pembatalan, adapter yang sudah dibuang tetap menyelesaikan
 * `getUserMedia` + pembuatan model, lalu menjalankan loop deteksinya sendiri:
 * dua aliran kamera hidup dan dua model berjalan bersamaan.
 *
 * BUG-008 (tersendat): `detectForVideo` memblokir thread pemanggilnya ~20 ms.
 * Kalau dijalankan di main thread, animasi orb dan respons iris tersendat.
 * Deteksi kini dijalankan di Web Worker (`handWorker.js`): main thread hanya
 * membayar `createImageBitmap` (~0,1 ms) lalu mengirim bitmap yang dialihkan.
 * Kalau Worker tidak tersedia atau gagal, adapter kembali ke jalur lama di main
 * thread supaya mode kamera tidak pernah mati total.
 */

import { CONFIG } from '../config/gameConfig.js';
import { createSmootherPool } from './smoothing.js';

export const INDEX_FINGER_TIP = 8;

export const CAMERA_STATUS = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  READY: 'ready',
  DENIED: 'denied',
  MISSING: 'missing',
  BUSY: 'busy',
  MODEL_FAILED: 'model-failed',
  FAILED: 'failed',
};

const DETECT_INTERVAL_MS = 1000 / CONFIG.hand.detectHz;
const VIDEO_READY_TIMEOUT_MS = 1200;

/** Indeks landmark MediaPipe yang dipakai untuk menilai kualitas satu tangan. */
const WRIST = 0;
const INDEX_FINGER_MCP = 5;
const MIDDLE_FINGER_MCP = 9;

/**
 * Ringkas satu tangan jadi pointer + tiga ukuran kualitas. Dipakai jalur
 * cadangan main thread; `handWorker.js` punya salinan yang sama karena worker
 * klasik tidak bisa meng-`import` modul ini.
 */
function describeHand(hand, score) {
  const tip = hand[INDEX_FINGER_TIP];
  if (!tip) return null;
  const wrist = hand[WRIST];
  const middle = hand[MIDDLE_FINGER_MCP];
  const knuckle = hand[INDEX_FINGER_MCP];
  if (!wrist || !middle || !knuckle) return { x: tip.x, y: tip.y, score };
  // Jarak 2D saja, sama seperti di handWorker.js: koordinat `z` MediaPipe
  // berisik dan membuat rasio kualitas berayun dari frame ke frame.
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

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** Worker hanya dipakai kalau API-nya benar-benar ada (mis. tidak di Node). */
function canUseWorker() {
  return typeof Worker === 'function' && typeof createImageBitmap === 'function';
}

/** Tunggu frame pertama kamera: model tidak bisa dijalankan pada video kosong. */
async function waitForVideoReady(element, timeoutMs) {
  const deadline = performance.now() + timeoutMs;
  while (element.readyState < 2 && performance.now() < deadline) {
    await nextFrame();
  }
  return element.readyState >= 2;
}

export function createHandTrackingAdapter({
  manager,
  wasmPath = '/wasm',
  modelPath = '/models/hand_landmarker.task',
  maxHands = CONFIG.hand.maxHands,
  smoothingAlpha = CONFIG.hand.smoothingAlpha,
  onStatus,
}) {
  /** Jalur cadangan main thread. `null` selama worker dipakai. */
  let landmarker = null;
  let landmarkerDelegate = '';

  /** Jalur utama: deteksi di thread terpisah. `null` saat jalur cadangan. */
  let worker = null;
  let workerDelegate = '';

  let stream = null;
  let video = null;
  let frameHandle = null;
  let lastDetection = 0;
  let lastLandmarkMs = 0;
  let running = false;
  /** Jeda antar deteksi saat ini (ms). Berubah mengikuti biaya inferensi. */
  let detectInterval = DETECT_INTERVAL_MS;
  /** Ada permintaan deteksi yang belum dijawab worker (backpressure). */
  let inFlight = false;
  /** Sedang menyalin frame ke ImageBitmap. */
  let capturing = false;
  /** Token pembatalan: dinaikkan setiap `stop()` supaya `start()` yang masih berjalan berhenti. */
  let generation = 0;
  let status = CAMERA_STATUS.IDLE;
  let message = '';
  let handCounter = 0;
  /** Jejak posisi tangan frame sebelumnya, untuk memberi id yang stabil. */
  let previousHands = [];
  /** id → waktu terakhir tangan itu benar-benar terlihat. */
  const seenAt = new Map();
  /** id → waktu terakhir kualitas deteksinya lolos penyaring. */
  const lastGoodAt = new Map();
  /** id → posisi + kecepatan terakhir (normalisasi/detik) untuk meramal jeda. */
  const motion = new Map();
  /** id tangan yang dipakai sebagai kursor utama (dikunci selama terlihat). */
  let primaryId = null;
  /** Posisi terakhir kursor utama; titik terdekat jadi penerus kalau id hilang. */
  let primaryAnchor = { x: 0.5, y: 0.5 };

  const smoothers = createSmootherPool(smoothingAlpha, CONFIG.hand.smoothingTauMs);

  function report(nextStatus, nextMessage = '') {
    status = nextStatus;
    message = nextMessage;
    if (typeof onStatus === 'function') onStatus(status, message);
  }

  /**
   * Sesuaikan laju deteksi dengan biaya inferensi yang dilaporkan. Turun cepat
   * saat inferensi mahal (supaya worker tidak jenuh), naik pelan saat kembali
   * murah (supaya laju tidak berayun). `detectHz` adalah batas atas, bukan paksa.
   */
  function adaptInterval(inferenceMs) {
    if (!Number.isFinite(inferenceMs) || inferenceMs <= 0) return;
    const target = Math.min(
      Math.max(inferenceMs / CONFIG.hand.inferenceBudget, DETECT_INTERVAL_MS),
      1000 / CONFIG.hand.minDetectHz
    );
    if (target > detectInterval) detectInterval = target;
    else if (target < detectInterval * 0.85) detectInterval = target;
  }

  function classifyCameraError(error) {
    const name = error?.name ?? '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return [CAMERA_STATUS.DENIED, 'Izin kamera ditolak.'];
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      return [CAMERA_STATUS.MISSING, 'Kamera tidak terdeteksi di perangkat ini.'];
    }
    if (name === 'NotReadableError' || name === 'AbortError') {
      return [CAMERA_STATUS.BUSY, 'Kamera sedang dipakai aplikasi lain.'];
    }
    return [CAMERA_STATUS.FAILED, error?.message ?? 'Kamera gagal dibuka.'];
  }

  function releaseCamera() {
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      stream = null;
    }
    if (video) {
      video.srcObject = null;
      video = null;
    }
  }

  function closeLandmarker() {
    if (!landmarker) return;
    try {
      landmarker.close();
    } catch {
      /* sudah tertutup */
    }
    landmarker = null;
    landmarkerDelegate = '';
  }

  /**
   * `terminate()` langsung menghentikan worker; model dan memori thread ikut
   * dilepas oleh browser, jadi tidak ada pesan `stop` yang perlu diantar.
   */
  function teardownWorker() {
    if (!worker) return;
    try {
      worker.terminate();
    } catch {
      /* sudah mati */
    }
    worker.removeEventListener('message', onWorkerMessage);
    worker.removeEventListener('error', onWorkerError);
    worker = null;
    workerDelegate = '';
    inFlight = false;
    capturing = false;
  }

  async function openCamera(token) {
    if (!navigator.mediaDevices?.getUserMedia) {
      report(CAMERA_STATUS.MISSING, 'Browser ini tidak mendukung akses kamera.');
      return false;
    }
    report(CAMERA_STATUS.REQUESTING);

    let opened;
    try {
      opened = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: CONFIG.hand.camera.width },
          height: { ideal: CONFIG.hand.camera.height },
          facingMode: 'user',
          // Backlight (jendela/lampu di belakang tangan) membuat auto-exposure
          // mengecilkan tangan jadi silhouette dan landmark melompat. Minta
          // eksposur & white balance mengikuti terus-menerus. Ditaruh di
          // `advanced` supaya perangkat yang tidak mendukungnya tetap membuka
          // kamera (constraint gagal di `advanced` diabaikan).
          advanced: [
            {
              exposureMode: 'continuous',
              whiteBalanceMode: 'continuous',
              focusMode: 'continuous',
            },
          ],
        },
        audio: false,
      });
    } catch (error) {
      if (token === generation) {
        const [nextStatus, nextMessage] = classifyCameraError(error);
        report(nextStatus, nextMessage);
      }
      return false;
    }

    // Dibuang saat izin masih diminta: tutup lagi, jangan tinggalkan kamera menyala.
    if (token !== generation) {
      for (const track of opened.getTracks()) track.stop();
      return false;
    }

    stream = opened;
    video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;
    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      /* autoplay bisa ditunda; loop deteksi tetap menunggu frame */
    }

    if (token !== generation) {
      releaseCamera();
      return false;
    }

    await waitForVideoReady(video, VIDEO_READY_TIMEOUT_MS);
    return true;
  }

  /** Jawaban `ready` dari worker; `null` berarti gagal atau kehabisan waktu. */
  let workerReady = null;

  function onWorkerMessage(event) {
    const data = event.data;

    if (data.type === 'ready') {
      if (workerReady) workerReady(data.delegate);
      return;
    }

    if (data.type === 'error') {
      if (data.where === 'init') {
        if (workerReady) workerReady(null);
      } else {
        report(CAMERA_STATUS.FAILED, data.message);
      }
      return;
    }

    if (data.type === 'result') {
      inFlight = false;
      // Jawaban dari start() yang sudah dibatalkan tidak boleh mengotori state.
      if (!running) return;
      adaptInterval(data.ms);
      ingestTips(data.tips ?? [], performance.now());
    }
  }

  function onWorkerError() {
    inFlight = false;
    capturing = false;
    report(CAMERA_STATUS.FAILED, 'Proses deteksi tangan berhenti tak terduga.');
  }

  /**
   * Coba jalur worker. `true` kalau siap; `false` kalau harus pakai jalur
   * cadangan main thread.
   */
  async function startWorker(token) {
    if (!canUseWorker()) return false;

    let instance;
    try {
      instance = new Worker(new URL('./handWorker.js', import.meta.url));
    } catch {
      return false;
    }

    worker = instance;
    worker.addEventListener('message', onWorkerMessage);
    worker.addEventListener('error', onWorkerError);

    const ready = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), CONFIG.hand.workerReadyTimeoutMs);
      workerReady = (delegate) => {
        clearTimeout(timer);
        resolve(delegate);
      };
      worker.postMessage({
        type: 'init',
        wasmPath,
        modelPath,
        maxHands,
        delegate: CONFIG.hand.delegate,
        confidence: CONFIG.hand.confidence,
      });
    });
    workerReady = null;

    if (token !== generation) {
      teardownWorker();
      return false;
    }
    if (!ready) {
      teardownWorker();
      return false;
    }

    workerDelegate = ready;
    return true;
  }

  /**
   * Ukur biaya satu deteksi. Panggilan pertama memuat shader dan selalu jauh
   * lebih mahal, jadi tidak dihitung. `Infinity` berarti model tidak jalan.
   */
  async function measureInference(candidate) {
    if (!video || video.readyState < 2) return Infinity;
    const frames = Math.max(2, CONFIG.hand.warmupFrames);
    let total = 0;
    let samples = 0;
    for (let index = 0; index < frames; index += 1) {
      const started = performance.now();
      try {
        candidate.detectForVideo(video, performance.now());
      } catch {
        return Infinity;
      }
      if (index > 0) {
        total += performance.now() - started;
        samples += 1;
      }
      await nextFrame();
    }
    return samples > 0 ? total / samples : Infinity;
  }

  /** Jalur cadangan: model di main thread, delegate dipilih dari pengukuran. */
  async function startMainThread(token) {
    let vision;
    let HandLandmarker;
    try {
      const mod = await import('@mediapipe/tasks-vision');
      vision = await mod.FilesetResolver.forVisionTasks(wasmPath);
      HandLandmarker = mod.HandLandmarker;
    } catch (error) {
      report(CAMERA_STATUS.MODEL_FAILED, `Wasm MediaPipe gagal dimuat: ${error?.message ?? error}`);
      return false;
    }
    if (token !== generation) return false;

    // GPU biasanya paling cepat, tetapi pada mesin tanpa akselerasi nyata jalur
    // itu bisa jauh lebih lambat tanpa melempar error apa pun. Ukur, baru pilih —
    // jangan percaya nama delegate.
    for (const delegate of ['GPU', 'CPU']) {
      let candidate;
      try {
        candidate = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: modelPath, delegate },
          runningMode: 'VIDEO',
          numHands: maxHands,
          ...CONFIG.hand.confidence,
        });
      } catch {
        continue;
      }

      if (token !== generation) {
        try {
          candidate.close();
        } catch {
          /* belum terpakai */
        }
        return false;
      }

      const costMs = await measureInference(candidate);
      if (token !== generation) {
        try {
          candidate.close();
        } catch {
          /* belum terpakai */
        }
        return false;
      }

      const acceptable = costMs <= CONFIG.hand.maxInferenceMs;
      if (acceptable || delegate === 'CPU') {
        landmarker = candidate;
        landmarkerDelegate = delegate;
        return true;
      }

      try {
        candidate.close();
      } catch {
        /* buang jalur yang terlalu lambat */
      }
    }

    report(CAMERA_STATUS.MODEL_FAILED, 'Model tangan tidak bisa dijalankan di perangkat ini.');
    return false;
  }

  /**
   * Beri id stabil: cocokkan deteksi baru dengan posisi **ramalan** tangan
   * sebelumnya (posisi + kecepatan), bukan dengan posisi terakhirnya.
   *
   * Pencocokan dilakukan global (semua pasangan diurutkan jaraknya), bukan
   * berurutan sesuai keluaran MediaPipe. Dua hal ini yang mencegah id "dicuri"
   * deteksi lain yang kebetulan lebih dekat ke posisi lama — misalnya lengan
   * atau objek serupa di sebelah tangan. Kalau id dicuri, kursor tertinggal di
   * situ dan terasa "mengunci yang di dekat tangan", bukan mengikuti tangan.
   */
  function assignIds(detected, now) {
    const pairs = [];
    detected.forEach((point, detectionIndex) => {
      previousHands.forEach((prev, previousIndex) => {
        let anchorX = prev.x;
        let anchorY = prev.y;
        const last = motion.get(prev.id);
        if (last) {
          const dt = Math.min(
            Math.max((now - last.t) / 1000, 0),
            CONFIG.hand.predictMaxSec
          );
          // Ramalan memakai posisi mentah terakhir: posisi terhaluskan selalu
          // tertinggal beberapa piksel dari tangan yang sedang cepat bergerak.
          anchorX = (last.rawX ?? prev.x) + last.vx * dt;
          anchorY = (last.rawY ?? prev.y) + last.vy * dt;
        }
        pairs.push({
          detectionIndex,
          previousIndex,
          distance: Math.hypot(anchorX - point.x, anchorY - point.y),
        });
      });
    });
    pairs.sort((a, b) => a.distance - b.distance);

    const takenDetection = new Set();
    const takenPrevious = new Set();
    const ids = new Array(detected.length).fill(null);
    for (const pair of pairs) {
      if (pair.distance >= CONFIG.hand.idMatchRadius) break;
      if (takenDetection.has(pair.detectionIndex) || takenPrevious.has(pair.previousIndex)) {
        continue;
      }
      takenDetection.add(pair.detectionIndex);
      takenPrevious.add(pair.previousIndex);
      ids[pair.detectionIndex] = previousHands[pair.previousIndex].id;
    }

    return detected.map((point, index) => {
      if (ids[index]) return { ...point, id: ids[index] };
      handCounter += 1;
      return { ...point, id: `hand-${handCounter}` };
    });
  }

  /** Apakah deteksi ini cukup meyakinkan untuk menjadi pointer? */
  function qualityPasses(tip) {
    // MediaPipe bisa memasang kerangka tangan di lengan bawah saat telapak
    // tidak terlihat. Ambang di bawah hanya membuang hasil yang jelas salah.
    if (Number.isFinite(tip.score) && tip.score < CONFIG.hand.minHandScore) return false;
    if (Number.isFinite(tip.palm) && tip.palm < CONFIG.hand.minPalmSize) return false;
    if (
      Number.isFinite(tip.reach) &&
      (tip.reach < CONFIG.hand.minIndexReach || tip.reach > CONFIG.hand.maxIndexReach)
    ) {
      return false;
    }
    return true;
  }

  /**
   * Satu-satunya tempat pointer tangan diperbarui, dipakai jalur worker maupun
   * jalur cadangan supaya keduanya berperilaku identik.
   *
   * Tiga hal yang menjaga bidik tetap terasa "menempel" saat tangan bergerak
   * cepat:
   *
   *   1. Penyaring kualitas memakai **histeresis**. Tangan yang sedang terlacak
   *      tidak langsung dibuang saat satu-dua frame gagal; kalau posisi barunya
   *      masih masuk akal (`graceMaxJump`) posisi itu tetap dipakai, kalau
   *      melompat jauh (kemungkinan lengan) posisi dibekukan.
   *   2. Saat MediaPipe benar-benar tidak mengembalikan tangan (gerakan cepat
   *      bikin blur), pointer **dilanjutkan** sebentar mengikuti kecepatan
   *      terakhir (`coastMaxMs`, diredam `coastDamping`) alih-alih membeku.
   *   3. Baru setelah itu pointer dihapus (`staleHoldMs`).
   *
   * Hasilnya: gerakan cepat tidak terasa "tidak terdeteksi", tetapi lengan
   * yang salah terdeteksi tetap tidak diikuti.
   */
  function ingestTips(tips, now) {
    const raw = tips
      .slice(0, maxHands)
      .map((tip) => {
        if (!tip || !Number.isFinite(tip.x) || !Number.isFinite(tip.y)) return null;
        // Mirror sumbu X agar gerakan terasa seperti bercermin.
        return { x: 1 - tip.x, y: tip.y, ok: qualityPasses(tip) };
      })
      .filter(Boolean);

    const assigned = assignIds(raw, now);
    previousHands = assigned;

    const liveIds = new Set();
    let accepted = 0;

    for (const hand of assigned) {
      if (hand.ok) {
        lastGoodAt.set(hand.id, now);
      } else {
        if (now - (lastGoodAt.get(hand.id) ?? -Infinity) > CONFIG.hand.qualityGraceMs) {
          // Kualitas buruk berkelanjutan: jangan pindahkan pointer ke posisi
          // lengan. Pointer akan dihapus pengawas `staleHoldMs` di bawah.
          continue;
        }
        // Masih dalam masa tenggang. Terima posisinya hanya kalau tidak
        // melompat jauh — blur gerakan cepat biasanya tetap dekat, sedangkan
        // kerangka lengan yang salah melompat jauh.
        const last = smoothers.peek(hand.id);
        if (!last || Math.hypot(hand.x - last.x, hand.y - last.y) > CONFIG.hand.graceMaxJump) {
          accepted += 1;
          liveIds.add(hand.id);
          seenAt.set(hand.id, now);
          continue;
        }
      }

      accepted += 1;
      liveIds.add(hand.id);
      seenAt.set(hand.id, now);

      // Kecepatan dihitung dari posisi **mentah** (bukan terhaluskan), supaya
      // ramalan id tidak tertinggal saat tangan bergerak cepat; posisi
      // terhaluskan tetap dipakai sebagai titik awal coasting.
      const previous = motion.get(hand.id);
      const frameDtSec = previous ? (now - previous.t) / 1000 : 0;
      const smoothed = smoothers.push(hand.id, hand.x, hand.y, frameDtSec);
      manager.setPointer(hand.id, smoothed.x, smoothed.y);

      let vx = 0;
      let vy = 0;
      if (previous) {
        const dt = frameDtSec;
        if (dt > 0) {
          vx = (hand.x - (previous.rawX ?? hand.x)) / dt;
          vy = (hand.y - (previous.rawY ?? hand.y)) / dt;
        }
      }
      motion.set(hand.id, {
        x: smoothed.x,
        y: smoothed.y,
        rawX: hand.x,
        rawY: hand.y,
        t: now,
        vx,
        vy,
      });
    }

    if (accepted > 0) lastLandmarkMs = now;

    // Kursor utama dikunci: sekali sebuah tangan menjadi kursor, id itu
    // dipertahankan selama tangannya masih terdeteksi. Deteksi lain (tangan
    // kedua, lengan, objek mirip) tidak boleh merebutnya. Kalau tangan utama
    // benar-benar hilang, penerusnya dipilih yang paling dekat dengan posisi
    // terakhirnya — bukan yang skornya paling tinggi — supaya perpindahan
    // terasa sebagai tangan yang sama.
    if (primaryId && !assigned.some((hand) => hand.id === primaryId && liveIds.has(hand.id))) {
      primaryId = null;
    }
    if (!primaryId) {
      let nearest = null;
      let nearestDistance = Infinity;
      for (const hand of assigned) {
        if (!liveIds.has(hand.id)) continue;
        const distance = Math.hypot(hand.x - primaryAnchor.x, hand.y - primaryAnchor.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = hand;
        }
      }
      primaryId = nearest?.id ?? null;
    }
    const primaryPoint = primaryId ? smoothers.peek(primaryId) : null;
    if (primaryPoint) primaryAnchor = primaryPoint;

    // Pointer tidak langsung dibuang. Selagi tangan belum terlihat lagi,
    // pointer dilanjutkan mengikuti kecepatan terakhir (diredam supaya tidak
    // meluncur sendiri saat tangan mendadak berhenti), lalu dihapus setelah
    // `staleHoldMs`. Ini yang membuat sapuan cepat tidak terasa putus.
    for (const id of manager.ids()) {
      if (liveIds.has(id)) continue;
      const since = now - (seenAt.get(id) ?? 0);
      if (since >= CONFIG.hand.staleHoldMs) {
        manager.removePointer(id);
        smoothers.drop(id);
        seenAt.delete(id);
        lastGoodAt.delete(id);
        motion.delete(id);
        continue;
      }

      const last = motion.get(id);
      if (!last) continue;
      const elapsed = Math.min(now - last.t, CONFIG.hand.coastMaxMs) / 1000;
      const x = last.x + last.vx * elapsed * CONFIG.hand.coastDamping;
      const y = last.y + last.vy * elapsed * CONFIG.hand.coastDamping;
      manager.setPointer(id, clamp01(x), clamp01(y));
    }
  }

  /** Salin frame ke ImageBitmap lalu kirim ke worker (dialihkan, tanpa salinan). */
  function sendFrameToWorker() {
    if (inFlight || capturing) return;
    capturing = true;
    createImageBitmap(video)
      .then((bitmap) => {
        capturing = false;
        if (!running || !worker) {
          bitmap.close();
          return;
        }
        inFlight = true;
        worker.postMessage({ type: 'detect', bitmap, ts: performance.now() }, [bitmap]);
      })
      .catch(() => {
        capturing = false;
      });
  }

  function detect(now) {
    if (!running) return;
    frameHandle = requestAnimationFrame(detect);

    if (!video || video.readyState < 2) return;

    // Tanpa tangan, deteksi diperlambat: tidak ada gunanya membakar CPU untuk
    // frame yang pasti kosong. Begitu ada landmark, laju adaptif dipakai lagi.
    const idle = now - lastLandmarkMs > CONFIG.hand.idleAfterMs;
    const interval = idle
      ? Math.max(detectInterval, 1000 / CONFIG.hand.idleDetectHz)
      : detectInterval;
    if (now - lastDetection < interval) return;

    lastDetection = now;

    if (worker) {
      sendFrameToWorker();
      return;
    }

    if (!landmarker) return;

    let result;
    const started = performance.now();
    try {
      result = landmarker.detectForVideo(video, now);
    } catch {
      return;
    }
    adaptInterval(performance.now() - started);

    const tips = (result?.landmarks ?? [])
      .slice(0, maxHands)
      .map((hand, index) =>
        describeHand(hand, result?.handednesses?.[index]?.[0]?.score ?? 1)
      )
      .filter(Boolean);

    ingestTips(tips, now);
  }

  return {
    mode: 'hand',

    async start() {
      if (running) return status;
      const token = generation + 1;
      generation = token;

      const cameraOk = await openCamera(token);
      if (token !== generation) return status;
      if (!cameraOk) return status;

      const workerOk = await startWorker(token);
      if (token !== generation) return status;

      const modelOk = workerOk || (await startMainThread(token));
      if (token !== generation) return status;
      if (!modelOk) {
        // Kamera sudah terbuka tapi model gagal: lepaskan lagi (NFR-07).
        releaseCamera();
        return status;
      }

      running = true;
      lastDetection = 0;
      lastLandmarkMs = 0;
      detectInterval = DETECT_INTERVAL_MS;
      report(CAMERA_STATUS.READY, '');
      frameHandle = requestAnimationFrame(detect);
      return status;
    },

    stopCamera() {
      releaseCamera();
    },

    stop() {
      generation += 1;
      running = false;
      if (frameHandle !== null) {
        cancelAnimationFrame(frameHandle);
        frameHandle = null;
      }
      teardownWorker();
      closeLandmarker();
      releaseCamera();
      previousHands = [];
      primaryId = null;
      primaryAnchor = { x: 0.5, y: 0.5 };
      seenAt.clear();
      lastGoodAt.clear();
      motion.clear();
      smoothers.clear();
      manager.clear();
      report(CAMERA_STATUS.IDLE, '');
    },

    destroy() {
      this.stop();
    },

    read(dtSec) {
      return manager.read(dtSec);
    },

    /** Tangan dianggap ada kalau ada landmark dalam jendela waktu singkat. */
    /**
     * Id tangan yang sedang dipakai sebagai kursor utama. Layar non-permainan
     * memakai ini, bukan `pointers[0]`, supaya bidik tidak berpindah tangan
     * saat MediaPipe mengembalikan dua deteksi sekaligus.
     */
    get primaryId() {
      return primaryId;
    },

    get handPresent() {
      return performance.now() - lastLandmarkMs < CONFIG.hand.presentWindowMs;
    },

    get videoElement() {
      return video;
    },

    get status() {
      return status;
    },

    get message() {
      return message;
    },

    /** Delegate yang benar-benar dipakai, dari worker atau jalur cadangan. */
    get delegate() {
      return workerDelegate || landmarkerDelegate;
    },

    /** Jalur yang sedang dipakai: 'worker' atau 'main-thread'. */
    get pipeline() {
      return worker ? 'worker' : landmarker ? 'main-thread' : 'none';
    },

    get isRunning() {
      return running;
    },
  };
}

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
