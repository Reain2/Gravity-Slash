import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * storage.js membaca `window.localStorage` saat dipakai (bukan saat import),
 * jadi cukup memasang tiruan global sebelum tiap test. Lingkungan test berjalan
 * di node, bukan jsdom.
 */
function installLocalStorage() {
  const map = new Map();
  const mock = {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
    get length() {
      return map.size;
    },
  };
  globalThis.window = { localStorage: mock };
  return map;
}

let storage;
let map;

beforeEach(async () => {
  map = installLocalStorage();
  storage = await import('./storage.js');
});

afterEach(() => {
  delete globalThis.window;
});

describe('storage', () => {
  it('sanitizeName memangkas spasi, membatasi panjang, dan memberi fallback', () => {
    expect(storage.sanitizeName('  Budi   Santoso  ')).toBe('Budi Santoso');
    expect(storage.sanitizeName('')).toBe(storage.DEFAULT_NAME);
    expect(storage.sanitizeName('   ')).toBe(storage.DEFAULT_NAME);
    expect(storage.sanitizeName('a'.repeat(50))).toHaveLength(storage.NAME_MAX);
  });

  it('papan kosong kalau belum ada data', () => {
    expect(storage.getTop()).toEqual([]);
  });

  it('menyimpan dan mengurutkan dari skor tertinggi', () => {
    storage.add({ name: 'A', score: 10 });
    storage.add({ name: 'B', score: 30 });
    storage.add({ name: 'C', score: 20 });
    expect(storage.getTop().map((entry) => entry.score)).toEqual([30, 20, 10]);
  });

  it('hanya menyimpan 10 entri teratas', () => {
    for (let i = 1; i <= 15; i += 1) storage.add({ name: `P${i}`, score: i * 10 });
    const top = storage.getTop();
    expect(top).toHaveLength(storage.MAX_ENTRIES);
    expect(top[0].score).toBe(150);
    expect(top.at(-1).score).toBe(60);
  });

  it('isHighScore benar saat papan belum penuh', () => {
    expect(storage.isHighScore(1)).toBe(true);
  });

  it('isHighScore hanya untuk skor yang mengalahkan peringkat terakhir', () => {
    for (let i = 1; i <= storage.MAX_ENTRIES; i += 1) storage.add({ name: `P${i}`, score: i * 10 });
    const lowest = storage.getTop().at(-1).score;
    expect(storage.isHighScore(lowest)).toBe(false);
    expect(storage.isHighScore(lowest + 1)).toBe(true);
  });

  it('data rusak dibaca sebagai papan kosong, bukan lempar error', () => {
    map.set(storage.LEADERBOARD_KEY, '{bukan json');
    expect(storage.getTop()).toEqual([]);
    map.set(storage.LEADERBOARD_KEY, JSON.stringify([{ name: 'X', score: 'abc' }, null, 5]));
    expect(storage.getTop()).toEqual([]);
  });

  it('menyimpan dan membaca preferensi mute', () => {
    expect(storage.readMuted()).toBe(false);
    storage.writeMuted(true);
    expect(storage.readMuted()).toBe(true);
    storage.writeMuted(false);
    expect(storage.readMuted()).toBe(false);
  });

  it('clear mengosongkan papan', () => {
    storage.add({ name: 'A', score: 10 });
    expect(storage.clear()).toBe(true);
    expect(storage.getTop()).toEqual([]);
  });

  it('tetap aman saat localStorage tidak tersedia', async () => {
    delete globalThis.window;
    const isolated = await import('./storage.js');
    expect(isolated.isStorageAvailable()).toBe(false);
    expect(isolated.getTop()).toEqual([]);
    expect(isolated.add({ name: 'A', score: 5 }).ok).toBe(false);
  });

  it('membaca snapshot sesi terakhir sebagai kosong saat belum ada', () => {
    expect(storage.readLastSession()).toBeNull();
  });

  it('menyimpan dan membaca snapshot sesi terakhir', () => {
    const saved = storage.saveLastSession({ score: 120, level: 3, bestCombo: 4, date: '2026-11-04T00:00:00.000Z' });
    expect(saved).toEqual({ score: 120, level: 3, bestCombo: 4, date: '2026-11-04T00:00:00.000Z' });
    expect(storage.readLastSession()).toEqual(saved);
  });

  it('merapikan angka snapshot yang tidak masuk akal', () => {
    const saved = storage.saveLastSession({ score: -5, level: 0, bestCombo: -2 });
    expect(saved.score).toBe(0);
    expect(saved.level).toBe(1);
    expect(saved.bestCombo).toBe(0);
    expect(typeof saved.date).toBe('string');
  });

  it('snapshot rusak atau tanpa skor dibaca sebagai null', () => {
    map.set(storage.LAST_SESSION_KEY, '{bukan json');
    expect(storage.readLastSession()).toBeNull();
    expect(storage.saveLastSession({ score: 'abc' })).toBeNull();
    expect(storage.readLastSession()).toBeNull();
  });
});
