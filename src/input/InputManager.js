/**
 * InputManager: satu-satunya tempat yang menjamin kontrak pointer.
 *
 * Kontrak (ARCHITECTURE bagian 6.1):
 *   pointers[] maksimal `maxPointers`, koordinat ternormalisasi 0..1.
 * Setiap `read()` mengembalikan posisi sekarang + posisi frame sebelumnya,
 * sehingga engine bisa menguji segmen gerakan (bukan hanya titik) dan
 * menghitung kecepatan untuk ambang iris.
 */

export const MODES = { POINTER: 'pointer', HAND: 'hand' };

export function createInputManager({ maxPointers = 2 } = {}) {
  /** id → { x, y, px, py } */
  const pointers = new Map();

  function setPointer(id, x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;

    const existing = pointers.get(id);
    if (existing) {
      existing.x = clamp01(x);
      existing.y = clamp01(y);
      return true;
    }

    // Batas keras: tangan/pointer ketiga diabaikan (PRD 6.1).
    if (pointers.size >= maxPointers) return false;

    pointers.set(id, { x: clamp01(x), y: clamp01(y), px: clamp01(x), py: clamp01(y) });
    return true;
  }

  return {
    maxPointers,

    setPointer,

    removePointer(id) {
      pointers.delete(id);
    },

    clear() {
      pointers.clear();
    },

    get count() {
      return pointers.size;
    },

    has(id) {
      return pointers.has(id);
    },

    ids() {
      return [...pointers.keys()];
    },

    /**
     * Ambil snapshot untuk frame ini.
     * `dtSec` dipakai menghitung kecepatan segmen (kecepatan = jarak / waktu).
     */
    read(dtSec = 0) {
      const out = [];
      for (const [id, p] of pointers) {
        const dx = p.x - p.px;
        const dy = p.y - p.py;
        const distance = Math.hypot(dx, dy);
        out.push({
          id,
          x: p.x,
          y: p.y,
          px: p.px,
          py: p.py,
          dx,
          dy,
          distance,
          speed: dtSec > 0 ? distance / dtSec : 0,
        });
        p.px = p.x;
        p.py = p.y;
      }
      return out;
    },
  };
}

function clamp01(value) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
