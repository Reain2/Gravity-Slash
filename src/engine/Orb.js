/**
 * Orb: data + fisika gravitasi berbasis `dt` (ARCHITECTURE bagian 7.2 & 6.5).
 * Semua posisi dalam ruang ternormalisasi 0..1; radius adalah fraksi lebar layar.
 */

import { CONFIG } from '../config/gameConfig.js';

export const ORB_KINDS = { ANSWER: 'answer', BOMB: 'bomb', HEAL: 'heal' };

export const FADE_MS = 250;

let nextId = 1;

/** Dipakai test supaya id orb deterministik. */
export function resetOrbIds() {
  nextId = 1;
}

export function createOrb({
  kind = ORB_KINDS.ANSWER,
  value = null,
  isCorrect = false,
  x = 0.5,
  y = CONFIG.physics.startY,
  vy = CONFIG.physics.vy0,
  radius = CONFIG.physics.orbRadius,
  rotation = 0,
  spinSpeed = 0,
  questionId = 0,
} = {}) {
  nextId += 1;
  return {
    id: `orb-${nextId}`,
    kind,
    value,
    isCorrect,
    x,
    y,
    vx: 0,
    vy,
    radius,
    rotation,
    spinSpeed,
    sliced: false,
    fade: 1,
    fadeElapsed: 0,
    questionId,
  };
}

/** Gerak satu langkah. `dt` dalam detik, jadi hasilnya tidak bergantung FPS. */
export function updateOrb(orb, dt) {
  if (orb.sliced) {
    orb.fadeElapsed += dt * 1000;
    orb.fade = Math.max(0, 1 - orb.fadeElapsed / FADE_MS);
    return orb.fade > 0;
  }

  orb.vy += CONFIG.physics.gravity * dt;
  orb.x += orb.vx * dt;
  orb.y += orb.vy * dt;
  orb.rotation += orb.spinSpeed * dt;
  return true;
}

/** Orb dianggap keluar layar kalau seluruh lingkarannya melewati batas bawah. */
export function isOffscreen(orb) {
  return orb.y - orb.radius > CONFIG.physics.despawnY;
}

/** Tandai orb memudar tanpa dinilai lagi (dipakai saat soal berganti). */
export function markSliced(orb) {
  orb.sliced = true;
  orb.fadeElapsed = 0;
  orb.fade = 1;
}

/** Kecepatan awal orb dalam satuan per detik, naik pelan seiring level. */
export function initialVelocityForLevel(level = 1) {
  const scale = 1 + CONFIG.difficulty.fallSpeedStep * (Math.max(1, level) - 1);
  return CONFIG.physics.vy0 * scale;
}
