import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config/gameConfig.js';
import { createRng, generateChoices, generateQuestion, rangesForLevel, shuffle } from './questions.js';

// `op` memakai tanda hubung ASCII untuk pengurangan; teks soal memakai tanda minus.
const OPS = ['+', '-', '×', '÷'];

describe('questions', () => {
  it('rng dengan seed yang sama menghasilkan urutan yang sama', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('selalu menghasilkan jawaban bilangan bulat dan tidak negatif di semua level', () => {
    const rng = createRng(7);
    for (let level = 1; level <= CONFIG.difficulty.maxLevel; level += 1) {
      for (let i = 0; i < 200; i += 1) {
        const question = generateQuestion(level, rng);
        expect(Number.isInteger(question.answer)).toBe(true);
        expect(question.answer).toBeGreaterThanOrEqual(0);
        expect(OPS).toContain(question.op);
        expect(question.text).toMatch(/^\d+\s[+−×÷]\s\d+$/);
      }
    }
  });

  it('pembagian selalu habis dibagi', () => {
    const rng = createRng(11);
    let sawDivision = false;
    for (let i = 0; i < 500; i += 1) {
      const question = generateQuestion(5, rng);
      if (question.op !== '÷') continue;
      sawDivision = true;
      const [a, b] = question.text.split(' ÷ ').map(Number);
      expect(a % b).toBe(0);
      expect(a / b).toBe(question.answer);
    }
    expect(sawDivision).toBe(true);
  });

  it('rentang angka tumbuh pelan dan berhenti di level maksimum', () => {
    expect(rangesForLevel(1).addSubMax).toBe(20);
    expect(rangesForLevel(99)).toEqual(rangesForLevel(CONFIG.difficulty.maxLevel));
  });

  it('pilihan jawaban unik, memuat jawaban benar, dan tidak negatif', () => {
    const rng = createRng(3);
    for (let level = 1; level <= CONFIG.difficulty.maxLevel; level += 1) {
      for (let i = 0; i < 100; i += 1) {
        const question = generateQuestion(level, rng);
        const choices = generateChoices(question, 4, rng);
        expect(choices).toHaveLength(4);
        expect(new Set(choices).size).toBe(4);
        expect(choices).toContain(question.answer);
        for (const value of choices) {
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('shuffle tidak menghilangkan atau menggandakan elemen', () => {
    const input = [1, 2, 3, 4, 5];
    const output = shuffle(input, createRng(5));
    expect(output.slice().sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]); // input tidak diubah
  });
});
