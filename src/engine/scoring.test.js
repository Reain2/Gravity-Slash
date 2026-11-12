import { describe, expect, it } from 'vitest';
import { CONFIG, multiplierForCombo } from '../config/gameConfig.js';
import {
  applyBomb,
  applyCorrect,
  applyHeal,
  applyQuestionFailed,
  applyWrong,
  createScoreState,
} from './scoring.js';

describe('scoring', () => {
  it('state awal sesuai konfigurasi', () => {
    const state = createScoreState();
    expect(state.lives).toBe(CONFIG.lives.start);
    expect(state.score).toBe(0);
    expect(state.combo).toBe(0);
    expect(state.multiplier).toBe(1);
  });

  it('jawaban benar menambah skor, combo, dan pengali', () => {
    let state = createScoreState();
    state = applyCorrect(state);
    expect(state.score).toBe(CONFIG.score.correct);
    expect(state.combo).toBe(1);
    expect(state.multiplier).toBe(1);

    for (let i = 0; i < CONFIG.score.comboEvery; i += 1) state = applyCorrect(state);
    expect(state.combo).toBe(CONFIG.score.comboEvery + 1);
    expect(state.multiplier).toBe(multiplierForCombo(state.combo));
  });

  it('jawaban salah mengurangi 5 dan tidak menurunkan skor di bawah 0', () => {
    let state = createScoreState();
    state = applyWrong(state);
    expect(state.score).toBe(0); // sudah 0, tetap 0

    state = createScoreState({ score: 12 });
    state = applyWrong(state);
    expect(state.score).toBe(12 - CONFIG.score.wrongPenalty);
    expect(state.combo).toBe(0);
    expect(state.multiplier).toBe(1);
  });

  it('orb bahaya mengurangi satu nyawa dan tidak mengubah skor', () => {
    let state = createScoreState({ score: 40, combo: 4, multiplier: 2 });
    state = applyBomb(state);
    expect(state.lives).toBe(CONFIG.lives.start - 1);
    expect(state.score).toBe(40);
    expect(state.combo).toBe(0);
  });

  it('nyawa tidak pernah turun di bawah 0', () => {
    let state = createScoreState({ lives: 0 });
    state = applyBomb(state);
    expect(state.lives).toBe(0);
    state = applyQuestionFailed(state);
    expect(state.lives).toBe(0);
  });

  it('orb nyawa menambah satu nyawa sampai batas maksimum', () => {
    let state = createScoreState({ lives: 1 });
    state = applyHeal(state);
    expect(state.lives).toBe(2);

    state = createScoreState({ lives: CONFIG.lives.max });
    state = applyHeal(state);
    expect(state.lives).toBe(CONFIG.lives.max);
  });

  it('soal gagal mereset combo dan mengurangi satu nyawa', () => {
    const state = applyQuestionFailed(createScoreState({ combo: 3, multiplier: 2 }));
    expect(state.combo).toBe(0);
    expect(state.multiplier).toBe(1);
    expect(state.lives).toBe(CONFIG.lives.start - 1);
  });

  it('fungsi skor tidak mengubah objek masukan', () => {
    const state = createScoreState();
    const snapshot = { ...state };
    applyCorrect(state);
    applyWrong(state);
    applyBomb(state);
    expect(state).toEqual(snapshot);
  });
});
