/**
 * photoStudio — menggambar hasil foto selfie ke kanvas 2D (PRD bagian 14).
 *
 * Modul ini **murni**: tidak meng-import React, tidak menyentuh DOM selain
 * `ctx` yang diberikan, dan tidak membaca `tokens.css` sendiri. Palet dikirim
 * oleh pemanggil (dibaca lewat `readToken`) supaya warna tetap satu sumber dan
 * modul ini bisa diuji di Node.
 *
 * Semua keacakan memakai PRNG ber-*seed* supaya hasil foto bisa direproduksi:
 * dengan pilihan efek dan seed yang sama, gambarnya identik.
 */

import { CONFIG } from '../config/gameConfig.js';

export const PHOTO_SIZE = CONFIG.photo.size;

/**
 * Daftar filter warna. `css` dipakai untuk pratinjau (CSS filter di `<video>`
 * dan, kalau didukung browser, saat menggambar ke kanvas). `tint` selalu
 * digambar sebagai lapisan warna supaya filter tetap terlihat walau
 * `ctx.filter` tidak didukung. `desaturate` adalah cadangan untuk `Mono`.
 */
export function filtersFor(palette) {
  return [
    { id: 'asli', label: 'Asli', css: 'none', tint: null, desaturate: false },
    {
      id: 'starlight',
      label: 'Starlight',
      css: 'brightness(1.08) contrast(1.04) saturate(1.05)',
      tint: { color: palette.white, alpha: 0.06, blend: 'screen' },
      desaturate: false,
    },
    {
      id: 'galactic',
      label: 'Galactic',
      css: 'contrast(1.08) saturate(1.12)',
      tint: { color: palette.violet, alpha: 0.22, blend: 'screen' },
      desaturate: false,
    },
    {
      id: 'bubblegum',
      label: 'Bubblegum',
      css: 'contrast(1.05) saturate(1.15)',
      tint: { color: palette.pink, alpha: 0.24, blend: 'soft-light' },
      desaturate: false,
    },
    {
      id: 'mono',
      label: 'Mono',
      css: 'grayscale(1) contrast(1.08)',
      tint: null,
      desaturate: true,
    },
  ];
}

export function findFilter(filters, id) {
  return filters.find((filter) => filter.id === id) ?? filters[0];
}

/** Efek yang aktif secara default saat layar Foto dibuka. */
export function defaultEffects() {
  return { backdrop: true, slash: false, frame: true, sticker: false };
}

/** Bersihkan stiker teks: satu spasi, dipangkas, maksimal `stickerMaxLength`. */
export function sanitizeSticker(raw) {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CONFIG.photo.stickerMaxLength);
}

/** PRNG kecil ber-*seed* (mulberry32) supaya hiasan bisa direproduksi. */
export function createRng(seed) {
  let state = (Number.isFinite(seed) ? Math.floor(seed) : 1) >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Kotak sumber untuk *cover crop*: mengisi seluruh bidang tujuan tanpa
 * mengubah rasio (tidak gepeng). Sumber yang lebih lebar dipotong kiri-kanan.
 */
export function coverRect(sourceW, sourceH, destW, destH) {
  if (!(sourceW > 0) || !(sourceH > 0)) {
    return { sx: 0, sy: 0, sw: destW, sh: destH };
  }
  const scale = Math.max(destW / sourceW, destH / sourceH);
  const cropW = destW / scale;
  const cropH = destH / scale;
  return { sx: (sourceW - cropW) / 2, sy: (sourceH - cropH) / 2, sw: cropW, sh: cropH };
}

function roundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** `ctx.filter` belum ada di semua mesin; kalau tidak ada, tint tetap dipakai. */
function supportsCanvasFilter(ctx) {
  return typeof ctx.filter === 'string';
}

function drawBackdrop(ctx, palette, size, seed) {
  const gradient = ctx.createLinearGradient(0, 0, size * 0.4, size);
  gradient.addColorStop(0, palette.night);
  gradient.addColorStop(1, palette.violet);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Cincin orbit tipis sebagai penanda tema.
  ctx.save();
  ctx.strokeStyle = palette.pink;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.max(1, size * 0.004);
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.52, size * 0.42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const rng = createRng(seed);
  const stars = 90;
  ctx.save();
  for (let index = 0; index < stars; index += 1) {
    ctx.globalAlpha = 0.25 + rng() * 0.6;
    ctx.fillStyle = rng() > 0.7 ? palette.pink : palette.white;
    const radius = size * (0.0015 + rng() * 0.0035);
    ctx.beginPath();
    ctx.arc(rng() * size, rng() * size, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCamera(ctx, source, { size, inset, filter, palette }) {
  const box = size - inset * 2;
  const sourceW = source?.videoWidth || source?.width || box;
  const sourceH = source?.videoHeight || source?.height || box;
  const rect = coverRect(sourceW, sourceH, box, box);
  const radius = inset > 0 ? Math.round(box * 0.06) : 0;

  ctx.save();
  roundRectPath(ctx, inset, inset, box, box, radius);
  ctx.clip();
  if (filter && filter.css && filter.css !== 'none' && supportsCanvasFilter(ctx)) {
    ctx.filter = filter.css;
  }
  // Cermin sumbu X supaya hasil cocok dengan cermin selfie di pratinjau.
  ctx.translate(inset + box, inset);
  ctx.scale(-1, 1);
  ctx.drawImage(source, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, box, box);
  if (supportsCanvasFilter(ctx)) ctx.filter = 'none';
  ctx.restore();

  if (filter?.tint) {
    ctx.save();
    roundRectPath(ctx, inset, inset, box, box, radius);
    ctx.clip();
    ctx.globalCompositeOperation = filter.tint.blend;
    ctx.globalAlpha = filter.tint.alpha;
    ctx.fillStyle = filter.tint.color;
    ctx.fillRect(inset, inset, box, box);
    ctx.restore();
  }

  if (filter?.desaturate) {
    ctx.save();
    roundRectPath(ctx, inset, inset, box, box, radius);
    ctx.clip();
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = 'hsl(0, 0%, 50%)';
    ctx.fillRect(inset, inset, box, box);
    ctx.restore();
  }

  if (inset > 0) {
    ctx.save();
    ctx.lineWidth = Math.max(2, Math.round(size * 0.006));
    ctx.strokeStyle = palette.white;
    roundRectPath(ctx, inset, inset, box, box, radius);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSlash(ctx, palette, size, seed) {
  const rng = createRng(seed);
  const strokes = 3;
  ctx.save();
  ctx.lineCap = 'round';
  for (let index = 0; index < strokes; index += 1) {
    const x0 = size * 0.12 + rng() * size * 0.5;
    const y0 = size * 0.2 + rng() * size * 0.5;
    const length = size * (0.35 + rng() * 0.3);
    const angle = -0.4 + rng() * 0.9;
    const x1 = x0 + Math.cos(angle) * length;
    const y1 = y0 + Math.sin(angle) * length;

    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, palette.white);
    gradient.addColorStop(1, palette.pink);
    ctx.strokeStyle = gradient;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = size * 0.013 * (1 - index * 0.22);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    for (let dot = 0; dot < 5; dot += 1) {
      const t = rng();
      ctx.globalAlpha = 0.45 + rng() * 0.45;
      ctx.fillStyle = rng() > 0.5 ? palette.pink : palette.violet;
      ctx.beginPath();
      ctx.arc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, size * (0.004 + rng() * 0.006), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawFrame(ctx, palette, session, size) {
  const pad = Math.round(size * 0.035);
  const radius = Math.round(size * 0.03);

  ctx.save();
  ctx.lineWidth = Math.max(3, Math.round(size * 0.008));
  ctx.strokeStyle = palette.violet;
  roundRectPath(ctx, pad, pad, size - pad * 2, size - pad * 2, radius);
  ctx.stroke();

  // Bilah aksen + wordmark di kiri bawah.
  const wordSize = Math.round(size * 0.042);
  ctx.fillStyle = palette.pink;
  ctx.fillRect(pad + size * 0.02, size - pad - size * 0.055, size * 0.012, wordSize * 1.15);
  ctx.fillStyle = palette.white;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 ${wordSize}px "Chakra Petch", "IBM Plex Sans", sans-serif`;
  ctx.fillText('GRAVITY SLASH', pad + size * 0.048, size - pad - size * 0.02);

  if (session) {
    const lines = [`SKOR ${session.score}`, `LEVEL ${session.level}`];
    if (session.bestCombo > 0) lines.push(`COMBO x${session.bestCombo}`);

    const boxW = size * 0.3;
    const lineH = size * 0.052;
    const boxH = lines.length * lineH + size * 0.03;
    const x = size - pad - size * 0.02 - boxW;
    const y = pad + size * 0.02;

    ctx.globalAlpha = 0.82;
    ctx.fillStyle = palette.night;
    roundRectPath(ctx, x, y, boxW, boxH, size * 0.02);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(2, Math.round(size * 0.004));
    ctx.strokeStyle = palette.violet;
    roundRectPath(ctx, x, y, boxW, boxH, size * 0.02);
    ctx.stroke();

    ctx.fillStyle = palette.white;
    ctx.font = `600 ${Math.round(size * 0.032)}px "IBM Plex Sans", sans-serif`;
    lines.forEach((line, index) => {
      ctx.fillText(line, x + size * 0.025, y + size * 0.045 + index * lineH);
    });
  }
  ctx.restore();
}

function drawSticker(ctx, palette, text, size) {
  const fontSize = Math.round(size * 0.048);
  ctx.save();
  ctx.font = `600 ${fontSize}px "IBM Plex Sans", sans-serif`;
  const metrics = typeof ctx.measureText === 'function' ? ctx.measureText(text) : null;
  const measured = metrics && Number.isFinite(metrics.width) ? metrics.width : text.length * fontSize * 0.6;
  const padX = size * 0.03;
  const boxH = fontSize * 1.9;
  const boxW = measured + padX * 2;
  const x = (size - boxW) / 2;
  const y = size * 0.12;

  ctx.fillStyle = palette.violet;
  roundRectPath(ctx, x, y, boxW, boxH, boxH / 2);
  ctx.fill();

  ctx.fillStyle = palette.white;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, y + boxH / 2 + fontSize * 0.04);
  ctx.restore();
}

/**
 * Gambar satu foto lengkap ke `ctx`. Urutan lapisan: latar → kamera → efek
 * iris → bingkai → stiker, supaya teks selalu di atas.
 */
export function drawPhoto(ctx, options) {
  const {
    source,
    palette,
    filter,
    session = null,
    effects = defaultEffects(),
    sticker = '',
    size = PHOTO_SIZE,
    seed = 1,
  } = options;

  const inset = effects.backdrop ? Math.round(size * 0.06) : 0;

  ctx.save();
  ctx.clearRect(0, 0, size, size);

  if (effects.backdrop) drawBackdrop(ctx, palette, size, seed);
  drawCamera(ctx, source, { size, inset, filter, palette });
  if (effects.slash) drawSlash(ctx, palette, size, seed);
  if (effects.frame) drawFrame(ctx, palette, session, size);
  if (effects.sticker) {
    const clean = sanitizeSticker(sticker);
    if (clean) drawSticker(ctx, palette, clean, size);
  }

  ctx.restore();
}

/** CSS filter untuk pratinjau `<video>`; selalu sinkron dengan hasil foto. */
export function previewFilterCss(filter) {
  return filter?.css && filter.css !== 'none' ? filter.css : 'none';
}
