import { beforeEach, describe, expect, it } from 'vitest';
import { CONFIG } from '../config/gameConfig.js';
import {
  createOrb,
  FADE_MS,
  initialVelocityForLevel,
  isOffscreen,
  markSliced,
  resetOrbIds,
  updateOrb,
} from './Orb.js';

beforeEach(() => {
  resetOrbIds();
});

describe('Orb', () => {
  it('id orb unik', () => {
    const a = createOrb();
    const b = createOrb();
    expect(a.id).not.toBe(b.id);
  });

  it('fisika memakai dt: hasil hampir sama untuk langkah besar dan kecil (bebas FPS)', () => {
    const stepwise = createOrb({ vy: 0.1 });
    updateOrb(stepwise, 0.5);
    updateOrb(stepwise, 0.5);

    const oneshot = createOrb({ vy: 0.1 });
    updateOrb(oneshot, 1);

    // Integrasi semi-implisit, jadi selisihnya kecil tapi tidak nol; yang penting
    // hasilnya tidak bergantung pada ukuran langkah (FPS).
    expect(stepwise.y).toBeCloseTo(oneshot.y, 2);
    expect(stepwise.vy).toBeCloseTo(oneshot.vy, 2);
  });

  it('kecepatan awal naik seiring level', () => {
    expect(initialVelocityForLevel(1)).toBeCloseTo(CONFIG.physics.vy0);
    expect(initialVelocityForLevel(CONFIG.difficulty.maxLevel)).toBeGreaterThan(
      initialVelocityForLevel(1)
    );
  });

  it('orb dianggap keluar layar hanya saat seluruh lingkarannya melewati batas', () => {
    const orb = createOrb({ y: CONFIG.physics.despawnY });
    expect(isOffscreen(orb)).toBe(false); // tepi atas masih terlihat
    orb.y = CONFIG.physics.despawnY + orb.radius + 0.01;
    expect(isOffscreen(orb)).toBe(true);
  });

  it('orb teriris memudar lalu dibuang setelah FADE_MS', () => {
    const orb = createOrb();
    markSliced(orb);
    expect(orb.sliced).toBe(true);

    // Setengah durasi pudar: masih hidup, alpha turun.
    expect(updateOrb(orb, FADE_MS / 2000)).toBe(true);
    expect(orb.fade).toBeCloseTo(0.5, 2);

    // Lewat durasi pudar: orb dibuang.
    expect(updateOrb(orb, FADE_MS / 1000)).toBe(false);
    expect(orb.fade).toBe(0);
  });

  it('orb yang teriris tidak lagi bergerak mengikuti gravitasi', () => {
    const orb = createOrb();
    markSliced(orb);
    const before = { x: orb.x, y: orb.y };
    updateOrb(orb, 0.1);
    expect(orb.x).toBe(before.x);
    expect(orb.y).toBe(before.y);
  });
});
