import { describe, expect, it } from 'vitest';
import {
  closestPointOnSegment,
  distanceSqToSegment,
  findSlicedOrb,
  segmentIntersectsCircle,
  segmentLength,
  segmentSpeed,
} from './collision.js';

function orb(overrides = {}) {
  return { id: 'o1', x: 0.5, y: 0.5, radius: 0.05, sliced: false, ...overrides };
}

function pointer(overrides = {}) {
  return { id: 'p1', px: 0.4, py: 0.5, x: 0.6, y: 0.5, speed: 1, ...overrides };
}

describe('collision', () => {
  it('jarak ke segmen: titik di ujung segmen berjarak 0', () => {
    expect(distanceSqToSegment(0, 0, 0, 0, 1, 0)).toBeCloseTo(0);
    expect(distanceSqToSegment(2, 0, 0, 0, 1, 0)).toBeCloseTo(1);
    expect(distanceSqToSegment(0.5, 3, 0, 0, 1, 0)).toBeCloseTo(9);
  });

  it('segmen yang melewati lingkaran terdeteksi, yang jauh tidak', () => {
    expect(segmentIntersectsCircle(0.4, 0.5, 0.6, 0.5, 0.5, 0.5, 0.05)).toBe(true);
    expect(segmentIntersectsCircle(0.4, 0.9, 0.6, 0.9, 0.5, 0.5, 0.05)).toBe(false);
  });

  it('titik terdekat di segmen berada di antara kedua ujung', () => {
    const point = closestPointOnSegment(0.5, 0.9, 0.4, 0.5, 0.6, 0.5);
    expect(point.x).toBeCloseTo(0.5);
    expect(point.y).toBeCloseTo(0.5);
  });

  it('kecepatan segmen = panjang / waktu', () => {
    expect(segmentLength(0, 0, 3, 4)).toBe(5);
    expect(segmentSpeed(0, 0, 3, 4, 2)).toBe(2.5);
    expect(segmentSpeed(0, 0, 3, 4, 0)).toBe(0);
  });

  it('iris diabaikan kalau di bawah ambang kecepatan', () => {
    const target = orb();
    expect(findSlicedOrb(pointer({ speed: 0.1 }), [target], 0.7)).toBeNull();
    expect(findSlicedOrb(pointer({ speed: 1 }), [target], 0.7)).toBe(target);
  });

  it('orb yang sudah teriris tidak pernah diproses lagi', () => {
    const target = orb({ sliced: true });
    expect(findSlicedOrb(pointer(), [target], 0.7)).toBeNull();
  });

  it('telunjuk yang diam tidak mengiris (titik di luar orb + kecepatan 0)', () => {
    const target = orb();
    expect(findSlicedOrb(pointer({ px: 0.1, py: 0.1, x: 0.1, y: 0.1, speed: 0 }), [target], 0.7)).toBeNull();
  });
});
