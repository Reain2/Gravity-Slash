/**
 * Generator soal + distraktor (PRD bagian 5.1, ARCHITECTURE bagian 7.5).
 * Fungsi murni dan menerima rng, sehingga bisa diuji secara deterministik.
 */

import { CONFIG } from '../config/gameConfig.js';

/** RNG deterministik (mulberry32) supaya pengujian bisa diulang. */
export function createRng(seed = 1) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/**
 * Rentang angka tumbuh pelan seiring level dan berhenti di level maksimum
 * (PRD 5.4: "jangan terlalu banyak baru awal").
 */
export function rangesForLevel(level) {
  const l = Math.min(Math.max(1, Math.floor(level)), CONFIG.difficulty.maxLevel);
  return {
    addSubMax: 20 + (l - 1) * 5, // 20, 25, 30, 35, 40
    mulMax: 12 + (l - 1), // 12, 13, 14, 15, 16
  };
}

/** Operasi yang muncul bertambah satu per satu supaya awal tidak terlalu ramai. */
export function opsForLevel(level) {
  if (level <= 1) return ['+', '-', '×'];
  if (level === 2) return ['+', '-', '×'];
  return ['+', '-', '×', '÷'];
}

/**
 * Satu soal. Hasil selalu bilangan bulat dan tidak negatif; pembagian selalu habis.
 * Bentuk: { text: '7 × 8', answer: 56, op: '×' }
 */
export function generateQuestion(level = 1, rng = createRng(1)) {
  const { addSubMax, mulMax } = rangesForLevel(level);
  const op = pick(rng, opsForLevel(level));

  if (op === '+') {
    const a = randInt(rng, 1, addSubMax);
    const b = randInt(rng, 1, addSubMax);
    return { text: `${a} + ${b}`, answer: a + b, op };
  }

  if (op === '-') {
    const a = randInt(rng, 1, addSubMax);
    const b = randInt(rng, 1, addSubMax);
    const high = Math.max(a, b);
    const low = Math.min(a, b);
    return { text: `${high} − ${low}`, answer: high - low, op };
  }

  if (op === '×') {
    const a = randInt(rng, 2, mulMax);
    const b = randInt(rng, 2, mulMax);
    return { text: `${a} × ${b}`, answer: a * b, op };
  }

  // Pembagian: kebalikan tabel perkalian, jadi selalu habis dibagi.
  const divisor = randInt(rng, 2, mulMax);
  const quotient = randInt(rng, 2, mulMax);
  return { text: `${divisor * quotient} ÷ ${divisor}`, answer: quotient, op };
}

/**
 * Kandidat "salah hitung yang wajar" — bukan angka acak murni (PRD 5.4).
 * Contoh: 7 × 8 dijawab 7 × 7 = 49.
 */
export function mistakeCandidates(question) {
  const out = [];
  const match = /^(\d+)\s([+−×÷])\s(\d+)$/.exec(question.text);
  if (!match) return out;
  const a = Number(match[1]);
  const b = Number(match[3]);

  switch (question.op) {
    case '×':
      out.push(a * (b - 1), a * (b + 1), (a - 1) * b, (a + 1) * b);
      break;
    case '÷':
      out.push(a / (b + 1), a / (b - 1), b, a);
      break;
    case '+':
      out.push(a + b - 1, a + b + 1, a * b === 0 ? 1 : Math.abs(a - b));
      break;
    default: // '−'
      out.push(a - b + 1, a - b - 1, a + b);
      break;
  }
  return out;
}

const DELTAS = [1, -1, 2, -2, 3, -3, 5, -5, 10, -10];

/**
 * `count` pilihan jawaban unik yang memuat jawaban benar.
 * Semua nilai >= 0 dan tidak ada duplikat.
 */
export function generateChoices(question, count = 4, rng = createRng(1)) {
  const total = Math.max(2, Math.floor(count));
  const wrongCount = total - 1;
  const chosen = new Set([question.answer]);

  // 1) Utamakan kesalahan hitung yang masuk akal.
  const mistakes = mistakeCandidates(question);
  for (const value of mistakes) {
    if (chosen.size > wrongCount) break;
    const candidate = Math.round(value);
    if (Number.isFinite(candidate) && candidate >= 0 && !chosen.has(candidate)) {
      chosen.add(candidate);
    }
  }

  // 2) Selisih dekat dengan jawaban benar.
  let guard = 0;
  while (chosen.size <= wrongCount && guard < 400) {
    guard += 1;
    const delta = pick(rng, DELTAS);
    const candidate = question.answer + delta;
    if (candidate >= 0 && !chosen.has(candidate)) chosen.add(candidate);
  }

  // 3) Kalau masih kurang (jawaban kecil), perluas ke atas.
  let extra = 1;
  while (chosen.size <= wrongCount) {
    const candidate = question.answer + wrongCount + extra;
    if (!chosen.has(candidate)) chosen.add(candidate);
    extra += 1;
  }

  return shuffle([...chosen].slice(0, total), rng);
}

/** Fisher-Yates dengan rng yang bisa di-seed. */
export function shuffle(list, rng = createRng(1)) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
