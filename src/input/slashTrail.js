/**
 * Riwayat posisi sebuah pointer untuk menggambar jejak slash.
 * Hanya menyimpan beberapa titik terakhir dan membuang yang terlalu tua,
 * sehingga biaya gambarnya tetap (ARCHITECTURE bagian 6.4).
 */

export const DEFAULT_MAX_POINTS = 12;
export const DEFAULT_MAX_AGE_MS = 120;

export function createTrail({ maxPoints = DEFAULT_MAX_POINTS, maxAgeMs = DEFAULT_MAX_AGE_MS } = {}) {
  const points = [];

  function trim(now) {
    while (points.length > maxPoints) points.shift();
    while (points.length > 0 && now - points[0].t > maxAgeMs) points.shift();
  }

  return {
    push(x, y, t) {
      points.push({ x, y, t });
      trim(t);
      return points.length;
    },
    clear() {
      points.length = 0;
    },
    /** Panjang jejak yang masih hidup pada waktu `now`. */
    lengthAt(now) {
      trim(now);
      return points.length;
    },
    get points() {
      return points;
    },
    get head() {
      return points.length ? points[points.length - 1] : null;
    },
  };
}

/** Kumpulan jejak per pointer id. */
export function createTrailPool(options) {
  const pool = new Map();
  return {
    get(id) {
      let trail = pool.get(id);
      if (!trail) {
        trail = createTrail(options);
        pool.set(id, trail);
      }
      return trail;
    },
    has(id) {
      return pool.has(id);
    },
    drop(id) {
      pool.delete(id);
    },
    /** Buang jejak milik pointer yang sudah tidak aktif. */
    retain(activeIds, now) {
      for (const [id, trail] of pool) {
        if (!activeIds.has(id) || trail.lengthAt(now) === 0) pool.delete(id);
      }
    },
    clear() {
      pool.clear();
    },
    entries() {
      return pool.entries();
    },
    /** Semua jejak aktif sebagai array. Dipakai renderer tiap frame. */
    list() {
      return [...pool.values()];
    },
    get size() {
      return pool.size;
    },
  };
}
