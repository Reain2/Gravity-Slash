/**
 * Penghalusan posisi pointer (EMA). Dipakai adapter tangan agar ujung telunjuk
 * tidak bergetar (PRD bagian 6.1), tanpa menambah latensi yang terasa.
 *
 * `DEFAULT_ALPHA` di sini hanya cadangan pustaka. Aplikasi memakai
 * `CONFIG.hand.smoothingAlpha` (gameConfig.js) supaya bobotnya bisa disetel
 * tanpa menyentuh modul ini.
 */

export const DEFAULT_ALPHA = 0.45;

/** EMA murni satu sumbu. Nilai pertama langsung dipakai agar tidak ada lompatan dari 0. */
export function emaStep(previous, next, alpha = DEFAULT_ALPHA) {
  if (!Number.isFinite(previous)) return next;
  return alpha * next + (1 - alpha) * previous;
}

export function createSmoother(alpha = DEFAULT_ALPHA, tauMs = 0) {
  let x = NaN;
  let y = NaN;

  return {
    /**
     * `dtSec` (opsional) mengubah bobot EMA menjadi fungsi waktu, bukan fungsi
     * jumlah sampel: alpha = 1 - e^(-dt/tau). Dengan begitu kehalusan pointer
     * sama di 30 fps (OBS Virtual Camera) dan 45 fps, dan celah antar deteksi
     * yang lebih panjang tidak membuat gerakan terasa "patah".
     */
    push(nextX, nextY, dtSec = 0) {
      const weight =
        tauMs > 0 && dtSec > 0 ? 1 - Math.exp(-dtSec / (tauMs / 1000)) : alpha;
      x = emaStep(x, nextX, weight);
      y = emaStep(y, nextY, weight);
      return { x, y };
    },
    reset() {
      x = NaN;
      y = NaN;
    },
    get value() {
      return Number.isFinite(x) ? { x, y } : null;
    },
  };
}

/**
 * Satu smoother per pointer id, dibuang saat pointer hilang supaya jejak
 * pointer baru tidak mewarisi posisi lama (R-14: jejak tertukar).
 */
export function createSmootherPool(alpha = DEFAULT_ALPHA, tauMs = 0) {
  const pool = new Map();
  return {
    push(id, nextX, nextY, dtSec = 0) {
      let smoother = pool.get(id);
      if (!smoother) {
        smoother = createSmoother(alpha, tauMs);
        pool.set(id, smoother);
      }
      return smoother.push(nextX, nextY, dtSec);
    },
    /** Posisi terakhir tanpa mengubah state; dipakai cek lompatan posisi. */
    peek(id) {
      return pool.get(id)?.value ?? null;
    },
    drop(id) {
      pool.delete(id);
    },
    clear() {
      pool.clear();
    },
    get size() {
      return pool.size;
    },
  };
}
