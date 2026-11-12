import { describe, expect, it, vi } from 'vitest';
import {
  createRng,
  defaultEffects,
  drawPhoto,
  findFilter,
  filtersFor,
  coverRect,
  previewFilterCss,
  sanitizeSticker,
} from './photoStudio.js';

const palette = { white: '#f0f0f0', violet: '#472e97', pink: '#ff77bc', night: '#2e1c63' };

/** Kumpulan operasi yang dicatat supaya hasil gambar bisa diperiksa tanpa DOM. */
function createCtx() {
  const ops = [];
  const gradient = { addColorStop: vi.fn() };
  const push = (name) => (...args) => {
    ops.push(args.length ? [name, ...args] : name);
  };
  return {
    ops,
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
    globalCompositeOperation: 'source-over',
    filter: 'none',
    font: '',
    textAlign: '',
    textBaseline: '',
    lineCap: '',
    save: push('save'),
    restore: push('restore'),
    clearRect: push('clearRect'),
    fillRect: push('fillRect'),
    beginPath: push('beginPath'),
    closePath: push('closePath'),
    moveTo: push('moveTo'),
    lineTo: push('lineTo'),
    arc: push('arc'),
    arcTo: push('arcTo'),
    fill: push('fill'),
    stroke: push('stroke'),
    clip: push('clip'),
    translate: push('translate'),
    scale: push('scale'),
    drawImage: push('drawImage'),
    fillText: push('fillText'),
    measureText: (text) => ({ width: text.length * 10 }),
    createLinearGradient: () => gradient,
  };
}

function textsOf(ops) {
  return ops.filter((op) => Array.isArray(op) && op[0] === 'fillText').map((op) => op[1]);
}

describe('coverRect', () => {
  it('memotong sisi kiri-kanan untuk sumber lanskap', () => {
    // 1280x720 ke 1080x1080: skala 1.5, jadi 720x720 di tengah.
    expect(coverRect(1280, 720, 1080, 1080)).toEqual({ sx: 280, sy: 0, sw: 720, sh: 720 });
  });

  it('memotong atas-bawah untuk sumber potret', () => {
    expect(coverRect(720, 1280, 1080, 1080)).toEqual({ sx: 0, sy: 280, sw: 720, sh: 720 });
  });

  it('tidak memotong sumber persegi', () => {
    expect(coverRect(640, 640, 1080, 1080)).toEqual({ sx: 0, sy: 0, sw: 640, sh: 640 });
  });

  it('kembali ke kotak penuh saat ukuran sumber tidak masuk akal', () => {
    expect(coverRect(0, 0, 1080, 1080)).toEqual({ sx: 0, sy: 0, sw: 1080, sh: 1080 });
  });
});

describe('sanitizeSticker', () => {
  it('merapikan spasi dan memangkas', () => {
    expect(sanitizeSticker('  COMBO   x5  ')).toBe('COMBO x5');
  });

  it('membatasi panjang sesuai konfigurasi', () => {
    expect(sanitizeSticker('a'.repeat(80))).toHaveLength(20);
  });

  it('kosong untuk null dan undefined', () => {
    expect(sanitizeSticker(null)).toBe('');
    expect(sanitizeSticker(undefined)).toBe('');
  });
});

describe('createRng', () => {
  it('memberi urutan yang sama untuk seed yang sama', () => {
    const a = createRng(42);
    const b = createRng(42);
    const first = [a(), a(), a(), a(), a()];
    expect(first).toEqual([b(), b(), b(), b(), b()]);
  });

  it('memberi urutan berbeda untuk seed berbeda', () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });

  it('selalu di rentang 0..1', () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('filtersFor', () => {
  const filters = filtersFor(palette);

  it('menyediakan Asli sebagai pilihan pertama', () => {
    expect(filters[0].id).toBe('asli');
    expect(previewFilterCss(filters[0])).toBe('none');
  });

  it('memuat filter bertema palet', () => {
    expect(filters.map((filter) => filter.id)).toContain('galactic');
    expect(findFilter(filters, 'galactic').tint.color).toBe(palette.violet);
    expect(findFilter(filters, 'bubblegum').tint.color).toBe(palette.pink);
    expect(findFilter(filters, 'mono').desaturate).toBe(true);
  });

  it('kembali ke pilihan pertama saat id tidak dikenal', () => {
    expect(findFilter(filters, 'tidak-ada')).toBe(filters[0]);
  });

  it('previewFilterCss mengembalikan none untuk filter kosong', () => {
    expect(previewFilterCss(undefined)).toBe('none');
  });
});

describe('defaultEffects', () => {
  it('menyalakan bingkai dan latar, mematikan iris dan stiker', () => {
    expect(defaultEffects()).toEqual({ backdrop: true, slash: false, frame: true, sticker: false });
  });
});

describe('drawPhoto', () => {
  const source = { videoWidth: 1280, videoHeight: 720 };

  it('menggambar kamera sekali dan membersihkan kanvas', () => {
    const ctx = createCtx();
    drawPhoto(ctx, { source, palette, filter: filtersFor(palette)[0], size: 1080, seed: 5 });
    expect(ctx.ops.some((op) => Array.isArray(op) && op[0] === 'clearRect')).toBe(true);
    expect(ctx.ops.filter((op) => Array.isArray(op) && op[0] === 'drawImage')).toHaveLength(1);
  });

  it('menulis wordmark tanpa angka palsu saat belum ada sesi', () => {
    const ctx = createCtx();
    drawPhoto(ctx, {
      source,
      palette,
      filter: filtersFor(palette)[0],
      effects: { backdrop: true, slash: false, frame: true, sticker: false },
      size: 1080,
    });
    const texts = textsOf(ctx.ops);
    expect(texts).toContain('GRAVITY SLASH');
    expect(texts.some((text) => text.startsWith('SKOR'))).toBe(false);
  });

  it('menampilkan skor dan combo dari sesi terakhir', () => {
    const ctx = createCtx();
    drawPhoto(ctx, {
      source,
      palette,
      filter: filtersFor(palette)[0],
      session: { score: 120, level: 3, bestCombo: 4 },
      effects: { backdrop: true, slash: false, frame: true, sticker: false },
      size: 1080,
    });
    const texts = textsOf(ctx.ops);
    expect(texts).toContain('SKOR 120');
    expect(texts).toContain('LEVEL 3');
    expect(texts).toContain('COMBO x4');
  });

  it('menggambar stiker hanya saat efeknya menyala dan teksnya ada', () => {
    const off = createCtx();
    drawPhoto(off, {
      source,
      palette,
      filter: filtersFor(palette)[0],
      effects: { backdrop: false, slash: false, frame: false, sticker: false },
      sticker: 'HALO',
      size: 1080,
    });
    expect(textsOf(off.ops)).not.toContain('HALO');

    const on = createCtx();
    drawPhoto(on, {
      source,
      palette,
      filter: filtersFor(palette)[0],
      effects: { backdrop: false, slash: false, frame: false, sticker: true },
      sticker: 'HALO',
      size: 1080,
    });
    expect(textsOf(on.ops)).toContain('HALO');
  });

  it('menggambar lebih banyak hiasan saat semua efek menyala', () => {
    const plain = createCtx();
    drawPhoto(plain, {
      source,
      palette,
      filter: filtersFor(palette)[0],
      effects: { backdrop: false, slash: false, frame: false, sticker: false },
      size: 1080,
      seed: 9,
    });

    const full = createCtx();
    drawPhoto(full, {
      source,
      palette,
      filter: filtersFor(palette)[0],
      effects: { backdrop: true, slash: true, frame: true, sticker: true },
      sticker: 'GRAVITY',
      size: 1080,
      seed: 9,
    });

    expect(full.ops.length).toBeGreaterThan(plain.ops.length);
  });
});
