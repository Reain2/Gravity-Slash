/**
 * Deteksi iris: segmen (posisi pointer sebelumnya → sekarang) versus lingkaran orb.
 * Titik saja tidak cukup karena pointer bergerak cepat antar frame.
 */

/** Kuadrat jarak dari titik (px,py) ke segmen (x1,y1)-(x2,y2). */
export function distanceSqToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    const ox = px - x1;
    const oy = py - y1;
    return ox * ox + oy * oy;
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = t < 0 ? 0 : t > 1 ? 1 : t;

  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  const ox = px - cx;
  const oy = py - cy;
  return ox * ox + oy * oy;
}

/** Apakah segmen menyentuh lingkaran (cx, cy, radius)? */
export function segmentIntersectsCircle(x1, y1, x2, y2, cx, cy, radius) {
  return distanceSqToSegment(cx, cy, x1, y1, x2, y2) <= radius * radius;
}

export function segmentLength(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

/** Kecepatan segmen dalam satuan ternormalisasi per detik. */
export function segmentSpeed(x1, y1, x2, y2, dtSec) {
  if (!(dtSec > 0)) return 0;
  return segmentLength(x1, y1, x2, y2) / dtSec;
}

/** Titik potong kira-kira, untuk menaruh efek pecah & angka penalti. */
export function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return { x: x1, y: y1 };
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return { x: x1 + t * dx, y: y1 + t * dy };
}

/**
 * Cari orb pertama yang teriris oleh satu pointer.
 * Ambang kecepatan wajib dilewati supaya telunjuk diam tidak mengiris (PRD 6.1).
 */
export function findSlicedOrb(pointer, orbs, minSpeed) {
  if (!pointer || pointer.speed < minSpeed) return null;
  for (const orb of orbs) {
    if (orb.sliced) continue;
    if (
      segmentIntersectsCircle(
        pointer.px,
        pointer.py,
        pointer.x,
        pointer.y,
        orb.x,
        orb.y,
        orb.radius
      )
    ) {
      return orb;
    }
  }
  return null;
}
