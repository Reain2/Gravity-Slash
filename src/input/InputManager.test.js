import { describe, expect, it } from 'vitest';
import { createInputManager } from './InputManager.js';

describe('InputManager', () => {
  it('membatasi jumlah pointer aktif (maksimal 2 secara bawaan)', () => {
    const manager = createInputManager();
    expect(manager.setPointer('a', 0.1, 0.1)).toBe(true);
    expect(manager.setPointer('b', 0.2, 0.2)).toBe(true);
    expect(manager.setPointer('c', 0.3, 0.3)).toBe(false);
    expect(manager.count).toBe(2);
  });

  it('pointer yang sudah ada tetap bisa diperbarui walau sudah penuh', () => {
    const manager = createInputManager({ maxPointers: 2 });
    manager.setPointer('a', 0.1, 0.1);
    manager.setPointer('b', 0.2, 0.2);
    expect(manager.setPointer('a', 0.5, 0.6)).toBe(true);
    expect(manager.count).toBe(2);
  });

  it('menolak koordinat yang bukan angka', () => {
    const manager = createInputManager();
    expect(manager.setPointer('a', NaN, 0.5)).toBe(false);
    expect(manager.setPointer('a', 0.5, Infinity)).toBe(false);
    expect(manager.count).toBe(0);
  });

  it('membatasi koordinat ke rentang 0..1', () => {
    const manager = createInputManager();
    manager.setPointer('a', -1, 2);
    const [pointer] = manager.read(0);
    expect(pointer.x).toBe(0);
    expect(pointer.y).toBe(1);
  });

  it('read mengembalikan posisi sebelumnya dan sekarang untuk menguji segmen', () => {
    const manager = createInputManager();
    manager.setPointer('a', 0.1, 0.1);
    manager.read(0); // menyimpan posisi awal sebagai "previous"
    manager.setPointer('a', 0.4, 0.5);
    const [pointer] = manager.read(0.5);
    expect(pointer.px).toBe(0.1);
    expect(pointer.py).toBe(0.1);
    expect(pointer.x).toBe(0.4);
    expect(pointer.y).toBe(0.5);
    expect(pointer.distance).toBeCloseTo(0.5); // 0.3 / 0.4 / 0.5 segitiga
  });

  it('menghitung kecepatan sebagai jarak dibagi waktu', () => {
    const manager = createInputManager();
    manager.setPointer('a', 0, 0);
    manager.read(0);
    manager.setPointer('a', 0.3, 0.4);
    const [pointer] = manager.read(0.5);
    expect(pointer.speed).toBeCloseTo(1); // 0.5 jarak / 0.5 detik
  });

  it('kecepatan 0 kalau dt tidak valid', () => {
    const manager = createInputManager();
    manager.setPointer('a', 0, 0);
    manager.read(0);
    manager.setPointer('a', 0.3, 0.4);
    expect(manager.read(0)[0].speed).toBe(0);
  });

  it('removePointer dan clear membersihkan state', () => {
    const manager = createInputManager();
    manager.setPointer('a', 0.1, 0.1);
    manager.setPointer('b', 0.2, 0.2);
    manager.removePointer('a');
    expect(manager.has('a')).toBe(false);
    expect(manager.count).toBe(1);
    manager.clear();
    expect(manager.count).toBe(0);
    expect(manager.ids()).toEqual([]);
  });
});
