import { describe, expect, it } from 'vitest';
import { CONFIG, fallDurationSec, levelForCorrect, multiplierForCombo, questionTimeMs } from './gameConfig.js';

describe('gameConfig', () => {
  it('menjaga invarian: orb jawaban benar tidak lolos layar sebelum waktu soal habis', () => {
    // Kalau ini gagal, pemain kehilangan nyawa untuk soal yang belum sempat dijawab.
    for (let level = 1; level <= CONFIG.difficulty.maxLevel; level += 1) {
      expect(fallDurationSec(level)).toBeGreaterThan(questionTimeMs(level) / 1000);
    }
  });

  it('timer mengecil seiring level tapi tidak di bawah batas minimum', () => {
    expect(questionTimeMs(1)).toBe(10000);
    for (let level = 1; level <= CONFIG.difficulty.maxLevel; level += 1) {
      expect(questionTimeMs(level)).toBeGreaterThanOrEqual(CONFIG.timer.minSec * 1000);
    }
    expect(questionTimeMs(CONFIG.difficulty.maxLevel)).toBeLessThan(questionTimeMs(1));
  });

  it('level naik tiap `stepEveryCorrect` jawaban benar dan berhenti di batas', () => {
    expect(levelForCorrect(0)).toBe(1);
    expect(levelForCorrect(CONFIG.difficulty.stepEveryCorrect)).toBe(2);
    expect(levelForCorrect(1000)).toBe(CONFIG.difficulty.maxLevel);
  });

  it('pengali combo tidak pernah melewati batas maksimum', () => {
    expect(multiplierForCombo(0)).toBe(1);
    expect(multiplierForCombo(CONFIG.score.comboEvery)).toBe(2);
    expect(multiplierForCombo(1000)).toBe(CONFIG.score.maxMultiplier);
  });
});
