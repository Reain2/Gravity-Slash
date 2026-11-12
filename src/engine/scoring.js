/**
 * Aturan skor murni (ARCHITECTURE bagian 7.4).
 * Tidak menyentuh DOM, tidak menyimpan state internal, mudah diuji.
 * Semua angka dibaca dari `gameConfig.js`.
 */

import { CONFIG, multiplierForCombo } from '../config/gameConfig.js';

export function createScoreState(overrides = {}) {
  return {
    lives: CONFIG.lives.start,
    score: 0,
    combo: 0,
    multiplier: 1,
    correctStreak: 0,
    ...overrides,
  };
}

export function comboBonusQuestion(combo) {
  return multiplierForCombo(combo);
}

/** Jawaban benar: +10 × pengali combo; combo bertambah. */
export function applyCorrect(state) {
  const combo = state.combo + 1;
  const multiplier = multiplierForCombo(combo);
  const gained = CONFIG.score.correct * multiplier;
  return {
    ...state,
    combo,
    multiplier,
    correctStreak: state.correctStreak + 1,
    score: state.score + gained,
    lastGain: gained,
  };
}

/** Jawaban salah: −5, skor tidak boleh di bawah 0, combo reset. */
export function applyWrong(state) {
  const penalty = Math.min(CONFIG.score.wrongPenalty, state.score);
  return {
    ...state,
    combo: 0,
    multiplier: 1,
    score: state.score - penalty,
    lastPenalty: penalty,
  };
}

/** Orb bahaya: −1 nyawa, skor tidak berubah, combo reset. */
export function applyBomb(state) {
  return {
    ...state,
    lives: Math.max(0, state.lives - 1),
    combo: 0,
    multiplier: 1,
  };
}

/** Orb nyawa: +1 nyawa, maksimal 3. */
export function applyHeal(state) {
  return {
    ...state,
    lives: Math.min(CONFIG.lives.max, state.lives + 1),
  };
}

/**
 * Soal gagal: timer habis ATAU orb jawaban benar lolos layar (PRD 5.5).
 * Combo reset dan nyawa −1.
 */
export function applyQuestionFailed(state) {
  return {
    ...state,
    combo: 0,
    multiplier: 1,
    lives: Math.max(0, state.lives - 1),
  };
}

/** Semua orb lama tidak bisa dinilai lagi saat soal berganti (PRD 5.5). */
export function clearOrbs(orbs, markSliced) {
  for (const orb of orbs) {
    if (!orb.sliced) markSliced(orb);
  }
  return orbs;
}
