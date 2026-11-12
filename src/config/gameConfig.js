/**
 * Semua angka game ada di file ini (AGENTS.md bagian 6).
 * Jangan menulis angka ajaib di tempat lain.
 *
 * Satuan fisika memakai RUANG TERNORMALISASI 0..1 (ARCHITECTURE.md 6.5),
 * bukan piksel. Konversi ke piksel hanya terjadi di renderer.
 */

export const CONFIG = {
  lives: { start: 3, max: 3 },

  score: {
    correct: 10,
    wrongPenalty: 5,
    comboEvery: 3,
    maxMultiplier: 5,
  },

  // Tekanan utama permainan (PRD 5.3)
  timer: { perQuestionSec: 10, minSec: 5 },

  // Hitung mundur sebelum soal pertama (PRD 5.3)
  countdown: { sec: 5 },

  // Campuran volume efek suara (revisi pemilik produk, 7 Nov 2026: jawaban
  // salah dan bom terlalu keras, slash dan heal terlalu pelan). Nilai > 1 sah
  // untuk berkas yang direkam pelan seperti heal.
  audio: {
    sfx: { slash: 1.4, correct: 1, wrong: 0.4, bomb: 0.4, heal: 1.8, gameOver: 1 },
  },

  // Fitur Foto / selfie (PRD 14).
  photo: {
    // Kanvas hasil persegi (ramah selfie). Preview dan hasil sama-sama 1080 px.
    size: 1080,
    // Hitung mundur sebelum jepret otomatis.
    countdownSec: 3,
    // Panjang maksimum stiker teks yang boleh diketik pemain.
    stickerMaxLength: 20,
  },

  spawn: {
    orbsPerWave: [3, 4],
    bombChance: 0.2,
    maxBombsPerWave: 2,
    healChance: 0.08,
    healCooldownWaves: 5,
    // Jarak minimum antar orb dalam satu gelombang, dalam satuan diameter orb.
    minSeparation: 1.5,
  },

  physics: {
    // vy0 + gravitasi disetel agar satu gelombang butuh ~11 detik untuk keluar
    // layar. WAJIB lebih lama dari timer soal (lihat test
    // `fallDurationSec(level) > questionTimeMs(level)`), supaya orb jawaban
    // benar tidak lolos layar sebelum pemain sempat menjawab.
    vy0: 0.1,
    gravity: 0.004,
    startY: -0.16,
    despawnY: 1.18,
    orbRadius: 0.045,
    spinMax: 0.6,
  },

  slash: {
    // Kecepatan minimum (satuan ternormalisasi per detik) agar sebuah gerakan
    // dianggap mengiris. Dipakai bersama gameplay dan layar idle.
    minSpeed: 0.7,
    trailLength: 12,
    trailMaxAgeMs: 120,
  },

  difficulty: {
    stepEveryCorrect: 5,
    maxLevel: 5,
    timerStepSec: 1,
    // Pengali gravitasi & kecepatan awal per level di atas 1.
    fallSpeedStep: 0.12,
    // Jarak antar orb dalam satu gelombang.
    gapMultiplier: 1.15,
  },

  hand: {
    maxHands: 2,
    // Resolusi yang diminta dari kamera. Nilainya "ideal", bukan paksa: kamera
    // boleh memberi resolusi lain. Tangan pada jarak 1–1,5 m hanya menempati
    // porsi kecil frame; frame 1280×720 menyimpan lebih banyak detail tangan
    // sebelum MediaPipe mengecilkannya ke ukuran input tetap, sehingga deteksi
    // jauh lebih jarang hilang dan landmark lebih tenang (gerakan lebih mulus).
    camera: { width: 1280, height: 720 },
    // Ambang keyakinan MediaPipe. Bawaan 0,5 terlalu ketat untuk tangan yang
    // jauh dan membuat deteksi bolong-bolong; 0,3 jauh lebih jarang hilang
    // tanpa menambah salah deteksi yang berarti.
    confidence: {
      minHandDetectionConfidence: 0.3,
      minHandPresenceConfidence: 0.3,
      minTrackingConfidence: 0.3,
    },
    // Toleransi sebelum auto-pause saat tangan hilang (R-38: cegah kedip).
    lostGraceMs: 450,
    // Lama menahan tangan di depan kamera di layar idle untuk mengonfirmasi
    // mode tangan (permintaan pemilik produk, 7 Nov 2026). Cukup lama agar
    // tidak terpicu lambaian tak sengaja, cukup pendek agar tidak membosankan.
    confirmHoldMs: 3000,
    // Deteksi berjalan di Web Worker (handWorker.js), jadi biayanya tidak lagi
    // membebani main thread. Dinaikkan dari 30 ke 45 Hz pada revisi pemilik
    // produk (4 Nov 2026) karena latensi pointer terasa: pada 30 Hz ada jeda
    // ~33 ms antar sampel, dan itu yang membuat gerakan tangan terasa
    // "ketinggalan". Jalur cadangan main thread tetap dijaga backpressure.
    //
    // 45 Hz hanyalah batas atas. Adapter menurunkan laju sendiri kalau satu
    // inferensi lebih mahal dari `inferenceBudget` × jarak antar deteksi: di
    // mesin lambat, memaksa 45 Hz membuat worker jenuh, frame kamera menumpuk,
    // dan gerakan justru tersendat. Turun ke 30 Hz terasa lebih halus daripada
    // 45 Hz yang bolong-bolong.
    detectHz: 45,
    // Porsi maksimum satu slot deteksi yang boleh dipakai inferensi (0–1).
    // Dinaikkan 0,6 → 0,85 (7 Nov 2026): ambang lama menurunkan laju ke ~30 Hz
    // di mesin yang sebenarnya masih sanggup, dan gerakan jadi tersendat.
    inferenceBudget: 0.85,
    // Lantai laju adaptif. Di bawah 24 Hz pointer terasa meloncat-loncat.
    minDetectHz: 24,
    // Saat tidak ada tangan, deteksi diperlambat supaya CPU/baterai tidak
    // terbakar dan kamera tidak menghangatkan perangkat tanpa guna.
    idleDetectHz: 15,
    // Berapa lama tanpa tangan sebelum laju idle dipakai (menghindari turun-naik
    // laju saat tangan berkedip keluar-masuk frame).
    idleAfterMs: 1000,
    // Penyaring deteksi palsu. MediaPipe bisa "menemukan tangan" pada lengan
    // bawah saat telapak tidak terlihat; landmark 8 lalu mendarat di lengan.
    // Ambangnya sengaja longgar (hanya membuang hasil yang jelas salah) dan
    // dilindungi `qualityGraceMs`: satu-dua frame buruk tidak boleh membuat
    // pointer hilang, karena itu terasa seperti "meloncat".
    minHandScore: 0.25,
    minPalmSize: 0.012,
    minIndexReach: 1.15,
    maxIndexReach: 3.6,
    // Tangan yang sudah terlacak ditahan selama ini setelah kualitasnya
    // menurun. Cukup untuk menjembatani kedipan deteksi, cukup pendek untuk
    // tetap menolak lengan yang benar-benar salah terdeteksi.
    qualityGraceMs: 350,
    // Selama masa tenggang, posisi hasil deteksi meragukan hanya dipakai kalau
    // tidak melompat lebih jauh dari ini (normalisasi layar). Blur gerakan
    // cepat masih dekat; kerangka lengan yang salah melompat jauh.
    graceMaxJump: 0.15,
    // Saat deteksi benar-benar kosong (mis. blur saat menyapu cepat), pointer
    // dilanjutkan mengikuti kecepatan terakhir selama ini, diredam
    // `coastDamping` supaya tidak meluncur sendiri saat tangan berhenti.
    // Dinaikkan 120 → 200 ms (8 Nov 2026) untuk feed yang lebih lambat dan
    // berkedip (OBS Virtual Camera 30 fps + auto-exposure yang berayun).
    coastMaxMs: 200,
    coastDamping: 0.5,
    // Jarak maksimum untuk menganggap deteksi sekarang sebagai tangan yang
    // sama. Dinaikkan 0,25 → 0,5 karena sapuan cepat bisa melompat lebih jauh
    // dari 0,25 antar sampel, dan id baru berarti penghalusan + kecepatan
    // tereset (terasa seperti deteksi putus).
    idMatchRadius: 0.5,
    // Batas waktu ramalan posisi saat mencocokkan id (detik). Deteksi baru
    // dibandingkan dengan posisi tangan *yang diperkirakan sekarang*, bukan
    // posisi terakhirnya; tanpa batas ini tangan yang sempat hilang lama bisa
    // "ditarik" kembali ke tempat lamanya.
    predictMaxSec: 0.2,
    // Emisi pointer sintetis untuk Crosshair. Tanpa ambang ini adapter
    // menyuntik `pointermove` 60×/detik walau tangan diam, sehingga crosshair
    // tidak pernah "tenang" dan kanvas terus digambar ulang. Detak 100 ms
    // menjaga hover-tahan tetap hidup (pengawas useHoldTarget 250 ms).
    // Ambang dibuat kecil supaya gerakan lambat tetap terasa mengalir.
    emitMinMovePx: 0.75,
    emitHeartbeatMs: 60,
    // Bobot penghalusan posisi (EMA, lihat smoothing.js). Semakin tinggi,
    // semakin cepat pointer mengejar posisi mentah dan semakin kecil lag-nya,
    // tetapi getaran tangan lebih terasa. Dinaikkan dari 0,45 ke 0,6 untuk
    // prioritas "respons cepat" (pilihan pemilik produk, 4 Nov 2026).
    smoothingAlpha: 0.6,
    // Konstanta waktu penghalusan (ms) saat ada `dt`. Ini yang menentukan
    // kehalusan sebenarnya: bobot EMA dihitung dari waktu, bukan jumlah sampel,
    // jadi 30 fps (OBS Virtual Camera) dan 45 fps terasa sama halus. Naikkan
    // kalau masih bergetar; turunkan kalau terasa tertinggal dari tangan.
    smoothingTauMs: 40,
    // Delegate untuk jalur worker. CPU (XNNPACK) dipilih karena pengukuran
    // menunjukkan jalur GPU tidak lebih cepat dan bisa jauh lebih lambat di
    // mesin tanpa akselerasi nyata; karena sudah di thread terpisah, CPU selalu
    // cukup (≈20 ms per 33 ms slot).
    delegate: 'CPU',
    // Batas tunggu kesiapan worker sebelum menyerah ke jalur cadangan.
    workerReadyTimeoutMs: 8000,
    // Tangan dianggap masih ada selama jendela ini. Harus beberapa kali lebih
    // besar dari jarak antar deteksi supaya satu frame yang meleset tidak
    // memicu auto-pause.
    presentWindowMs: 280,
    // Pointer tidak langsung dibuang saat sekali deteksi tidak menemukan
    // tangan: jejak iris ikut terhapus dan iris terasa "hilang". Tunggu dulu.
    // 140 → 200 → 320 ms (8 Nov 2026). Feed lewat OBS Virtual Camera berjalan
    // 30 fps dan exposure-nya berayun, jadi celah deteksi lebih panjang; pointer
    // tidak "lengket" karena selama menunggu ia dilanjutkan (`coastMaxMs`).
    staleHoldMs: 320,
    // Berapa panggilan deteksi dipakai mengukur kecepatan delegate saat model
    // dimuat. Panggilan pertama memuat shader, jadi tidak dihitung.
    warmupFrames: 4,
    // Batas biaya satu deteksi (ms). Jalur GPU yang lebih lambat dari ini
    // dianggap tidak terakselerasi (mis. WebGL perangkat lunak) dan dibuang.
    maxInferenceMs: 45,
  },

  maxPointers: 2,
};

/** Lama jatuh dari startY sampai despawnY, dalam detik. Dipakai saat tuning. */
export function fallDurationSec(level = 1) {
  const { vy0, gravity, startY, despawnY } = CONFIG.physics;
  const scale = 1 + CONFIG.difficulty.fallSpeedStep * (level - 1);
  const v = vy0 * scale;
  const g = gravity * scale;
  const distance = despawnY - startY;
  // distance = v*t + 0.5*g*t^2  →  t = (-v + sqrt(v^2 + 2*g*distance)) / g
  return (-v + Math.sqrt(v * v + 2 * g * distance)) / g;
}

/** Batas waktu satu soal, dalam milidetik, untuk level tertentu. */
export function questionTimeMs(level = 1) {
  const { perQuestionSec, minSec } = CONFIG.timer;
  const sec = Math.max(minSec, perQuestionSec - CONFIG.difficulty.timerStepSec * (level - 1));
  return sec * 1000;
}

/** Level kesulitan dari jumlah jawaban benar. */
export function levelForCorrect(correctCount) {
  const level = 1 + Math.floor(correctCount / CONFIG.difficulty.stepEveryCorrect);
  return Math.min(level, CONFIG.difficulty.maxLevel);
}

/** Pengali combo dari jumlah jawaban benar berturut-turut. */
export function multiplierForCombo(combo) {
  const steps = Math.floor(combo / CONFIG.score.comboEvery);
  return Math.min(CONFIG.score.maxMultiplier, 1 + steps);
}
