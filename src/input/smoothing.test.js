import { describe, expect, it } from 'vitest';
import { createSmoother, createSmootherPool, emaStep } from './smoothing.js';

describe('smoothing', () => {
  it('emaStep memakai nilai pertama apa adanya agar tidak melompat dari 0', () => {
    expect(emaStep(NaN, 0.8, 0.5)).toBe(0.8);
    expect(emaStep(1, 0, 0.5)).toBeCloseTo(0.5);
  });

  it('smoother mengembalikan null sebelum ada masukan', () => {
    const smoother = createSmoother();
    expect(smoother.value).toBeNull();
  });

  it('smoother menghaluskan langkah kedua, bukan mengikuti penuh', () => {
    const smoother = createSmoother(0.5);
    expect(smoother.push(0, 0)).toEqual({ x: 0, y: 0 });
    const next = smoother.push(1, 1);
    expect(next.x).toBeCloseTo(0.5);
    expect(next.y).toBeCloseTo(0.5);
  });

  it('reset membuang riwayat supaya pointer baru tidak mewarisi posisi lama', () => {
    const smoother = createSmoother();
    smoother.push(0.9, 0.9);
    smoother.reset();
    expect(smoother.value).toBeNull();
    expect(smoother.push(0.1, 0.1)).toEqual({ x: 0.1, y: 0.1 });
  });

  it('pool membuat smoother terpisah per id dan membuangnya saat drop', () => {
    const pool = createSmootherPool();
    const first = pool.push('a', 0.2, 0.2);
    pool.push('b', 0.8, 0.8);
    expect(pool.size).toBe(2);
    // 'a' melanjutkan riwayatnya sendiri, tidak tercampur dengan 'b'
    const nextA = pool.push('a', 0.2, 0.2);
    expect(nextA.x).toBeCloseTo(first.x);
    pool.drop('a');
    expect(pool.size).toBe(1);
    expect(pool.push('a', 0.5, 0.5)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('penghalusan mengikuti waktu, bukan jumlah sampel', () => {
    // Satu langkah 33 ms harus sama halus dengan dua langkah 16,5 ms: feed
    // OBS 30 fps dan deteksi 60 fps menghasilkan gerakan yang sama.
    const slow = createSmootherPool(0.6, 40);
    const fast = createSmootherPool(0.6, 40);
    slow.push('a', 0, 0, 0.033);
    slow.push('a', 0, 0, 0.033);
    fast.push('b', 0, 0, 0.0165);
    fast.push('b', 0, 0, 0.0165);
    fast.push('b', 0, 0, 0.0165);

    const one = slow.push('a', 1, 0, 0.033);
    fast.push('b', 1, 0, 0.0165);
    const two = fast.push('b', 1, 0, 0.0165);
    expect(two.x).toBeCloseTo(one.x, 6);
  });
});
