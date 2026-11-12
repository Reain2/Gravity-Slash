import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * HandTrackingAdapter tidak bisa diuji di browser sungguhan tanpa kamera dan
 * tangan asli, jadi MediaPipe dan `getUserMedia` ditiru di sini. Tes ini menjaga
 * rantai yang paling mudah rusak tanpa terlihat: landmark 8 → mirror sumbu X →
 * penghalusan → pointer yang benar-benar bisa mengiris orb.
 */
const { detectForVideo, createFromOptions, forVisionTasks } = vi.hoisted(() => ({
  detectForVideo: vi.fn(),
  createFromOptions: vi.fn(),
  forVisionTasks: vi.fn(),
}));

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: (...args) => forVisionTasks(...args) },
  HandLandmarker: { createFromOptions: (...args) => createFromOptions(...args) },
}));

const { CONFIG } = await import('../config/gameConfig.js');
const { CAMERA_STATUS, createHandTrackingAdapter } = await import('./HandTrackingAdapter.js');
const { createInputManager } = await import('./InputManager.js');
const { findSlicedOrb } = await import('../engine/collision.js');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Deteksi dijalankan oleh requestAnimationFrame; di sini ia dipompa manual. */
let pending = [];
let rafId = 0;

/** Satu putaran rAF. `gapMs` menentukan apakah jeda antar deteksi sudah lewat. */
async function frames(count = 1, gapMs = 45) {
  for (let index = 0; index < count; index += 1) {
    const batch = pending;
    pending = [];
    const now = performance.now();
    for (const callback of batch) callback(now);
    await sleep(gapMs);
  }
}

async function advanceUntil(predicate, ticks = 200) {
  for (let index = 0; index < ticks; index += 1) {
    if (predicate()) return true;
    await frames(1);
  }
  return predicate();
}

/**
 * 21 landmark palsu dengan geometri tangan yang masuk akal. Hanya indeks 0
 * (pergelangan), 5 (MCP telunjuk), 8 (ujung telunjuk), dan 9 (MCP tengah) yang
 * dibaca adapter, tetapi titik lain ikut diisi supaya bentuknya mirip keluaran
 * MediaPipe. `reach` bawaan ≈ 2 (telunjuk terentang), `palm` 0,1.
 */
function handAt(tipX, tipY, { palm = 0.1, reach = 2 } = {}) {
  const landmarks = Array.from({ length: 21 }, () => ({ x: tipX, y: tipY, z: 0 }));
  const wrist = { x: tipX, y: tipY + 0.3, z: 0 };
  landmarks[0] = wrist;
  landmarks[5] = { x: tipX, y: wrist.y - 0.3 / reach, z: 0 };
  landmarks[8] = { x: tipX, y: tipY, z: 0 };
  landmarks[9] = { x: wrist.x, y: wrist.y - palm, z: 0 };
  return landmarks;
}

async function startAdapter(manager) {
  const adapter = createHandTrackingAdapter({ manager });
  const started = adapter.start();
  await advanceUntil(() => adapter.isRunning);
  const status = await started;
  return { adapter, status };
}

let manager;
let adapter;

beforeEach(() => {
  pending = [];
  rafId = 0;
  // `navigator` hanya-baca di Node 21+, jadi harus lewat stubGlobal.
  vi.stubGlobal('requestAnimationFrame', (callback) => {
    pending.push(callback);
    rafId += 1;
    return rafId;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: async () => ({ getTracks: () => [{ stop: () => {} }] }),
    },
  });
  vi.stubGlobal('document', {
    createElement: () => ({
      playsInline: false,
      muted: false,
      autoplay: false,
      srcObject: null,
      readyState: 4,
      play: async () => {},
    }),
  });

  forVisionTasks.mockResolvedValue({});
  createFromOptions.mockImplementation(async () => ({ detectForVideo, close: () => {} }));
  detectForVideo.mockReturnValue({ landmarks: [] });

  manager = createInputManager({ maxPointers: CONFIG.maxPointers });
});

afterEach(() => {
  if (adapter) adapter.stop();
  adapter = null;
  manager = null;
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('HandTrackingAdapter', () => {
  it('mulai tanpa kamera kalau izin ditolak', async () => {
    globalThis.navigator.mediaDevices.getUserMedia = async () => {
      const error = new Error('denied');
      error.name = 'NotAllowedError';
      throw error;
    };
    const instance = createHandTrackingAdapter({ manager });
    adapter = instance;

    expect(await instance.start()).toBe(CAMERA_STATUS.DENIED);
    expect(instance.isRunning).toBe(false);
    expect(instance.message).toBe('Izin kamera ditolak.');
  });

  it('meminta resolusi kamera dari CONFIG dan menyalurkan ambang keyakinan', async () => {
    let constraints = null;
    globalThis.navigator.mediaDevices.getUserMedia = async (next) => {
      constraints = next;
      return { getTracks: () => [{ stop: () => {} }] };
    };
    const options = [];
    createFromOptions.mockImplementation(async (_vision, next) => {
      options.push(next);
      return { detectForVideo, close: () => {} };
    });

    const started = await startAdapter(manager);
    adapter = started.adapter;

    // Resolusi tidak boleh ditulis di adapter: sumbernya `CONFIG.hand.camera`.
    expect(constraints.video.width.ideal).toBe(CONFIG.hand.camera.width);
    expect(constraints.video.height.ideal).toBe(CONFIG.hand.camera.height);
    expect(constraints.audio).toBe(false);
    // Backlight: eksposur harus mengikuti terus-menerus, bukan terkunci.
    expect(constraints.video.advanced?.[0]?.exposureMode).toBe('continuous');

    // Ambang keyakinan MediaPipe (bawaan 0,5 terlalu ketat untuk tangan jauh).
    expect(options[0]).toMatchObject(CONFIG.hand.confidence);
    expect(options[0].numHands).toBe(CONFIG.hand.maxHands);
  });

  it('memilih delegate pertama yang biayanya wajar, bukan selalu GPU', async () => {
    const delegates = [];
    createFromOptions.mockImplementation(async (_vision, options) => {
      delegates.push(options.baseOptions.delegate);
      return { detectForVideo, close: () => {} };
    });

    const instance = createHandTrackingAdapter({ manager });
    adapter = instance;
    const started = instance.start();
    await advanceUntil(() => instance.isRunning);
    await started;

    expect(delegates).toEqual(['GPU']);
    expect(instance.delegate).toBe('GPU');
  });

  it('menjatuhkan jalur GPU yang terlalu lambat lalu pindah ke CPU', async () => {
    const delegates = [];
    let calls = 0;
    createFromOptions.mockImplementation(async (_vision, options) => {
      delegates.push(options.baseOptions.delegate);
      const isGpu = options.baseOptions.delegate === 'GPU';
      return {
        detectForVideo: () => {
          calls += 1;
          // GPU: tiap panggilan memblokir main thread jauh di atas batas.
          if (isGpu) busyWait(CONFIG.hand.maxInferenceMs + 20);
        },
        close: () => {},
      };
    });

    const instance = createHandTrackingAdapter({ manager });
    adapter = instance;
    const started = instance.start();
    await advanceUntil(() => instance.isRunning, 400);
    await started;

    expect(delegates).toEqual(['GPU', 'CPU']);
    expect(instance.delegate).toBe('CPU');
    expect(calls).toBeGreaterThan(0);
  });

  it('landmark 8 jadi pointer yang bisa mengiris orb', async () => {
    detectForVideo.mockReturnValue({ landmarks: [handAt(0.8, 0.4)] });
    const started = await startAdapter(manager);
    adapter = started.adapter;
    expect(started.status).toBe(CAMERA_STATUS.READY);

    // Belum ada deteksi berisi tangan: belum ada pointer, tangan dianggap hilang.
    expect(manager.count).toBe(0);
    expect(adapter.handPresent).toBe(false);

    await frames(2);
    expect(adapter.handPresent).toBe(true);
    expect(manager.count).toBe(1);

    // Sumbu X dimirror: ujung telunjuk di 0.8 terasa di 0.2 bagi pemain.
    const id = manager.ids()[0];
    const first = manager.read(0.05).find((point) => point.id === id);
    expect(first.x).toBeCloseTo(0.2, 5);
    expect(first.y).toBeCloseTo(0.4, 5);

    // Orb tepat di jalur yang akan disapu telunjuk. Gerakan dibuat bertahap
    // supaya tetap dianggap tangan yang sama: `assignIds` melepas id kalau
    // lompatannya lebih dari 0.25 satuan.
    const orb = { id: 'o1', x: 0.45, y: 0.4, radius: 0.06, sliced: false };
    let sliced = null;

    for (const tipX of [0.7, 0.62, 0.54, 0.46]) {
      detectForVideo.mockReturnValue({ landmarks: [handAt(tipX, 0.4)] });
      await frames(2);
      const point = manager.read(0.033).find((entry) => entry.id === id);
      if (point && findSlicedOrb(point, [orb], CONFIG.slash.minSpeed)) {
        sliced = orb;
        break;
      }
    }

    expect(sliced).toBe(orb);
  });

  it('menolak lengan yang salah dideteksi sebagai tangan', async () => {
    const started = await startAdapter(manager);
    adapter = started.adapter;

    const rejected = [
      // Skor handedness rendah: model tidak yakin ini benar-benar tangan.
      { hand: handAt(0.5, 0.4), handednesses: [[{ score: 0.1 }]] },
      // Telapak terlalu kecil: kemungkinan bayangan/lengan jauh.
      { hand: handAt(0.5, 0.4, { palm: 0.005 }) },
      // Telunjuk menggenggam (reach ≈ 1), bukan menunjuk.
      { hand: handAt(0.5, 0.4, { reach: 1 }) },
      // Jangkauan tidak wajar: kerangka tangan mulur di sepanjang lengan.
      { hand: handAt(0.5, 0.4, { reach: 4 }) },
    ];

    for (const sample of rejected) {
      detectForVideo.mockReturnValue({
        landmarks: [sample.hand],
        handednesses: sample.handednesses,
      });
      await frames(2);
      expect(manager.count).toBe(0);
    }

    // Kontrol: geometri tangan yang sehat tetap diterima.
    detectForVideo.mockReturnValue({ landmarks: [handAt(0.5, 0.4)] });
    await frames(2);
    expect(manager.count).toBe(1);
  });

  it('kedipan kualitas tidak menghilangkan bidik, kualitas buruk lama menghapusnya', async () => {
    detectForVideo.mockReturnValue({ landmarks: [handAt(0.5, 0.4)] });
    const started = await startAdapter(manager);
    adapter = started.adapter;
    await frames(2);

    const id = manager.ids()[0];
    const before = manager.read(0).find((point) => point.id === id);

    // Satu frame dengan kualitas buruk (telunjuk menggenggam): pointer tetap,
    // posisinya dibekukan di tempat terakhir yang baik — tidak melompat.
    detectForVideo.mockReturnValue({ landmarks: [handAt(0.5, 0.4, { reach: 1 })] });
    await frames(1);
    expect(manager.count).toBe(1);
    const held = manager.read(0).find((point) => point.id === id);
    expect(held.x).toBeCloseTo(before.x, 6);
    expect(held.y).toBeCloseTo(before.y, 6);

    // Kualitas buruk berlanjut melewati `qualityGraceMs` + `staleHoldMs`:
    // sekarang pointer dihapus (lengan tidak diikuti).
    await sleep(CONFIG.hand.qualityGraceMs + CONFIG.hand.staleHoldMs + 80);
    await frames(2);
    expect(manager.count).toBe(0);
  });

  it('lompatan sampel saat menyapu cepat tetap dianggap tangan yang sama', async () => {
    detectForVideo.mockReturnValue({ landmarks: [handAt(0.8, 0.4)] });
    const started = await startAdapter(manager);
    adapter = started.adapter;
    await frames(2);

    const id = manager.ids()[0];
    // Lompatan 0,45 satuan (di atas ambang lama 0,25) tidak boleh membuat id
    // baru: id baru berarti penghalusan dan kecepatan tereset.
    detectForVideo.mockReturnValue({ landmarks: [handAt(0.35, 0.4)] });
    await frames(2);
    expect(manager.ids()).toEqual([id]);
    expect(manager.count).toBe(1);
  });

  it('sapuan cepat tidak putus: pointer dilanjutkan saat deteksi kosong sebentar', async () => {
    detectForVideo.mockReturnValue({ landmarks: [handAt(0.5, 0.4)] });
    const started = await startAdapter(manager);
    adapter = started.adapter;
    await frames(2);

    const id = manager.ids()[0];
    // Ujung telunjuk bergerak ke kanan (x mentah turun → pointer x naik).
    detectForVideo.mockReturnValue({ landmarks: [handAt(0.45, 0.4)] });
    await frames(1);
    detectForVideo.mockReturnValue({ landmarks: [handAt(0.4, 0.4)] });
    await frames(1);
    const moving = manager.read(0).find((point) => point.id === id);

    // MediaPipe tidak mengembalikan tangan (blur): pointer tidak membeku,
    // tetapi dilanjutkan mengikuti kecepatan terakhir.
    detectForVideo.mockReturnValue({ landmarks: [] });
    await frames(1);
    expect(manager.count).toBe(1);
    const coasted = manager.read(0).find((point) => point.id === id);
    expect(coasted.x).toBeGreaterThan(moving.x);

    // Setelah `staleHoldMs` tanpa deteksi, pointer tetap dibuang.
    await sleep(CONFIG.hand.staleHoldMs + 60);
    await frames(1);
    expect(manager.count).toBe(0);
  });

  it('deteksi mirip di posisi lama tidak mencuri id tangan yang bergerak', async () => {
    detectForVideo.mockReturnValue({ landmarks: [handAt(0.6, 0.4)] });
    const started = await startAdapter(manager);
    adapter = started.adapter;
    await frames(2);
    const id = manager.ids()[0];

    // Tangan bergerak cepat: tiap sampel melompat 0,1 satuan.
    for (const tipX of [0.5, 0.4]) {
      detectForVideo.mockReturnValue({ landmarks: [handAt(tipX, 0.4)] });
      await frames(1);
    }

    // MediaPipe mengembalikan deteksi "mirip" di posisi lama lebih dulu, lalu
    // tangan asli yang sudah bergerak. Id harus mengikuti tangan asli.
    detectForVideo.mockReturnValue({
      landmarks: [handAt(0.4, 0.4), handAt(0.3, 0.4)],
    });
    await frames(1);

    expect(adapter.primaryId).toBe(id);
  });

  it('kursor utama tidak berpindah tangan selama tangan itu masih terdeteksi', async () => {
    detectForVideo.mockReturnValue({
      landmarks: [handAt(0.3, 0.4), handAt(0.8, 0.4)],
    });
    const started = await startAdapter(manager);
    adapter = started.adapter;
    await frames(2);
    const primary = adapter.primaryId;
    expect(primary).toBeTruthy();

    // Tangan kedua bergerak mendekat ke tangan utama; kursor tetap milik yang
    // pertama, supaya bidik tidak berpindah ke deteksi tetangga.
    detectForVideo.mockReturnValue({
      landmarks: [handAt(0.3, 0.4), handAt(0.55, 0.4)],
    });
    await frames(2);

    expect(adapter.primaryId).toBe(primary);
  });

  it('satu deteksi yang meleset tidak langsung menghapus jejak', async () => {

    detectForVideo.mockReturnValue({ landmarks: [handAt(0.5, 0.5)] });
    const started = await startAdapter(manager);
    adapter = started.adapter;
    await frames(2);
    expect(manager.count).toBe(1);

    // Tangan tidak terlihat pada satu frame: pointer masih ditahan.
    detectForVideo.mockReturnValue({ landmarks: [] });
    await frames(1);
    expect(manager.count).toBe(1);
    expect(adapter.handPresent).toBe(true);

    // Hilang lebih lama dari `staleHoldMs`: baru sekarang pointer dibuang.
    await sleep(CONFIG.hand.staleHoldMs + 40);
    await frames(1);
    expect(manager.count).toBe(0);
  });

  it('stop() yang dipanggil saat start() masih berjalan tidak meninggalkan kamera hidup', async () => {
    let stopped = 0;
    globalThis.navigator.mediaDevices.getUserMedia = async () => {
      // Kamera baru tersedia setelah stop() dipanggil, seperti StrictMode.
      await sleep(5);
      return { getTracks: () => [{ stop: () => { stopped += 1; } }] };
    };

    const instance = createHandTrackingAdapter({ manager });
    adapter = instance;
    const started = instance.start();
    instance.stop();

    expect(await started).toBe(CAMERA_STATUS.IDLE);
    await advanceUntil(() => stopped > 0, 40);
    expect(stopped).toBe(1);
    expect(instance.isRunning).toBe(false);
    expect(createFromOptions).not.toHaveBeenCalled();
  });
});

/**
 * Worker palsu untuk menguji jalur utama (deteksi di thread terpisah) tanpa
 * browser: menjawab `init`, membalas `detect` dengan tips yang bisa diubah, dan
 * mencatat setiap pesan yang dikirim.
 */
function installFakeWorker({ delegate = 'CPU', failInit = false, autoReply = true } = {}) {
  const listeners = new Map();
  const sent = [];
  let tips = [];
  let terminateCount = 0;

  function emit(type, event) {
    for (const fn of [...(listeners.get(type) ?? [])]) fn(event);
  }

  class FakeWorker {
    constructor() {
      this.terminated = false;
    }
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    }
    removeEventListener(type, fn) {
      const list = listeners.get(type) ?? [];
      const index = list.indexOf(fn);
      if (index >= 0) list.splice(index, 1);
    }
    postMessage(message) {
      sent.push(message);
      if (message.type === 'init') {
        queueMicrotask(() => {
          if (failInit) {
            emit('message', { data: { type: 'error', where: 'init', message: 'gagal' } });
          } else {
            emit('message', { data: { type: 'ready', delegate } });
          }
        });
      } else if (message.type === 'detect' && autoReply) {
        queueMicrotask(() => {
          if (this.terminated) return;
          emit('message', { data: { type: 'result', ts: message.ts, tips } });
        });
      }
    }
    terminate() {
      this.terminated = true;
      terminateCount += 1;
    }
  }

  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('createImageBitmap', async () => ({ close() {} }));

  return {
    sent,
    setTips(next) {
      tips = next;
    },
    detectCount: () => sent.filter((message) => message.type === 'detect').length,
    get terminateCount() {
      return terminateCount;
    },
  };
}

describe('HandTrackingAdapter — jalur worker', () => {
  let fake;

  beforeEach(() => {
    fake = installFakeWorker();
  });

  it('memakai worker dan tidak menyentuh main thread untuk inferensi', async () => {
    const instance = createHandTrackingAdapter({ manager });
    adapter = instance;
    const started = instance.start();
    await advanceUntil(() => instance.isRunning);
    await started;

    expect(instance.pipeline).toBe('worker');
    expect(instance.delegate).toBe('CPU');
    // Model jalur cadangan tidak pernah dibuat: inferensi tidak di main thread.
    expect(createFromOptions).not.toHaveBeenCalled();
    expect(fake.sent.some((message) => message.type === 'init')).toBe(true);
  });

  it('mengirim ambang keyakinan ke worker lewat pesan init', async () => {
    const instance = createHandTrackingAdapter({ manager });
    adapter = instance;
    const started = instance.start();
    await advanceUntil(() => instance.isRunning);
    await started;

    const init = fake.sent.find((message) => message.type === 'init');
    expect(init.confidence).toEqual(CONFIG.hand.confidence);
    expect(init.maxHands).toBe(CONFIG.hand.maxHands);
  });

  it('tips dari worker menjadi pointer yang bisa mengiris orb', async () => {
    const instance = createHandTrackingAdapter({ manager });
    adapter = instance;
    const started = instance.start();
    await advanceUntil(() => instance.isRunning);
    await started;

    // Sumbu X dimirror: 0.8 dari MediaPipe terasa di 0.2 bagi pemain.
    fake.setTips([{ x: 0.8, y: 0.4 }]);
    await frames(2);
    expect(instance.handPresent).toBe(true);
    expect(manager.count).toBe(1);

    const id = manager.ids()[0];
    const first = manager.read(0.05).find((point) => point.id === id);
    expect(first.x).toBeCloseTo(0.2, 5);
    expect(first.y).toBeCloseTo(0.4, 5);

    const orb = { id: 'o1', x: 0.45, y: 0.4, radius: 0.06, sliced: false };
    let sliced = null;
    for (const tipX of [0.7, 0.62, 0.54, 0.46]) {
      fake.setTips([{ x: tipX, y: 0.4 }]);
      await frames(2);
      const point = manager.read(0.033).find((entry) => entry.id === id);
      if (point && findSlicedOrb(point, [orb], CONFIG.slash.minSpeed)) {
        sliced = orb;
        break;
      }
    }

    expect(sliced).toBe(orb);
  });

  it('kembali ke main thread kalau worker gagal disiapkan', async () => {
    fake = installFakeWorker({ failInit: true });
    const instance = createHandTrackingAdapter({ manager });
    adapter = instance;
    const started = instance.start();
    await advanceUntil(() => instance.isRunning, 400);
    await started;

    expect(instance.pipeline).toBe('main-thread');
    expect(createFromOptions).toHaveBeenCalled();
    expect(fake.terminateCount).toBe(1);
  });

  it('tidak menumpuk frame selagi worker belum menjawab', async () => {
    fake = installFakeWorker({ autoReply: false });
    const instance = createHandTrackingAdapter({ manager });
    adapter = instance;
    const started = instance.start();
    await advanceUntil(() => instance.isRunning);
    await started;

    // Enam putaran frame; hanya satu bitmap boleh dikirim karena yang pertama
    // belum dijawab. Tanpa backpressure, bitmap akan menumpuk di worker.
    await frames(6, 45);
    expect(fake.detectCount()).toBe(1);
  });
});

/** Memblokir main thread selama `ms`, untuk meniru inferensi yang lambat. */
function busyWait(ms) {
  const until = performance.now() + ms;
  while (performance.now() < until) {
    /* sengaja sibuk */
  }
}
