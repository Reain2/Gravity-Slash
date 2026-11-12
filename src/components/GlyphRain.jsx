import { useEffect, useRef } from 'react';
import { readToken, useReducedMotion } from '../utils/env.js';

/**
 * GlyphRain — efek original (bukan React Bits) untuk latar layar leaderboard.
 * Hujan glyph bercahaya berlapis, digambar dengan canvas 2D tanpa dependensi.
 *
 * Jumlah kolom selalu dibatasi (T-089) supaya FPS tetap aman di laptop menengah,
 * dan `prefers-reduced-motion` menggantinya dengan satu bingkai statis.
 */

const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789×÷+=−';
const DEFAULT_COLUMN_WIDTH = 26;
const MAX_COLUMNS = 70;

function hexToRgba(hex, alpha) {
  const value = String(hex).trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  let r;
  let g;
  let b;

  if (long) {
    r = parseInt(long[1], 16);
    g = parseInt(long[2], 16);
    b = parseInt(long[3], 16);
  } else if (short) {
    r = parseInt(short[1] + short[1], 16);
    g = parseInt(short[2] + short[2], 16);
    b = parseInt(short[3] + short[3], 16);
  } else {
    return `rgba(46, 28, 99, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function GlyphRain({ className = '', speed = 1 }) {
  const canvasRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const bg = readToken('--bg', '#2e1c63');
    const ink = readToken('--color-white', '#f0f0f0');
    const accent = readToken('--color-violet', '#472e97');
    const accent2 = readToken('--color-pink', '#ff77bc');

    let width = 0;
    let height = 0;
    let dpr = 1;
    let columns = [];
    let frameHandle = null;

    function buildColumns(count) {
      columns = Array.from({ length: count }, () => ({
        y: Math.random() * height,
        velocity: (0.35 + Math.random() * 0.9) * speed,
        glyphs: Array.from({ length: 4 + Math.floor(Math.random() * 6) }, () =>
          GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        ),
        tone: Math.random() < 0.14 ? 'accent2' : Math.random() < 0.45 ? 'accent' : 'ink',
      }));
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) {
        ctx.clearRect(0, 0, width, height);
        drawStatic();
        return;
      }
      const count = Math.max(6, Math.min(MAX_COLUMNS, Math.floor(width / DEFAULT_COLUMN_WIDTH)));
      buildColumns(count);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
    }

    function toneColor(tone) {
      if (tone === 'accent2') return accent2;
      if (tone === 'accent') return accent;
      return ink;
    }

    function drawStatic() {
      ctx.clearRect(0, 0, width, height);
      ctx.font = '15px "Chakra Petch", monospace';
      ctx.textBaseline = 'top';
      const count = Math.max(6, Math.min(MAX_COLUMNS, Math.floor(width / DEFAULT_COLUMN_WIDTH)));
      for (let i = 0; i < count; i += 1) {
        const x = i * DEFAULT_COLUMN_WIDTH + 6;
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = i % 5 === 0 ? accent : ink;
        ctx.fillText(GLYPHS[Math.floor((i * 7) % GLYPHS.length)], x, (i * 53) % height);
        ctx.globalAlpha = 0.12;
        ctx.fillText(GLYPHS[Math.floor((i * 13 + 5) % GLYPHS.length)], x, (i * 91 + 40) % height);
      }
      ctx.globalAlpha = 1;
    }

    function step() {
      frameHandle = requestAnimationFrame(step);

      // Jejak hujan: lapisi dengan latar setengah transparan, bukan hapus penuh.
      ctx.fillStyle = hexToRgba(bg, 0.16);
      ctx.fillRect(0, 0, width, height);

      ctx.font = '15px "Chakra Petch", monospace';
      ctx.textBaseline = 'top';

      for (let i = 0; i < columns.length; i += 1) {
        const column = columns[i];
        const x = i * DEFAULT_COLUMN_WIDTH + 6;

        for (let j = 0; j < column.glyphs.length; j += 1) {
          const y = column.y - j * 18;
          if (y < -20 || y > height + 20) continue;
          ctx.globalAlpha = j === 0 ? 0.95 : Math.max(0, 0.5 - j * 0.075);
          ctx.fillStyle = j === 0 ? ink : toneColor(column.tone);
          ctx.fillText(column.glyphs[j], x, y);
        }

        ctx.globalAlpha = 1;
        column.y += column.velocity;

        if (column.y - column.glyphs.length * 18 > height) {
          column.y = -Math.random() * 120;
          column.velocity = (0.35 + Math.random() * 0.9) * speed;
          column.tone = Math.random() < 0.14 ? 'accent2' : Math.random() < 0.45 ? 'accent' : 'ink';
          column.glyphs = column.glyphs.map(
            () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
          );
        }
      }
    }

    resize();
    if (!reduced) frameHandle = requestAnimationFrame(step);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    return () => {
      if (frameHandle !== null) cancelAnimationFrame(frameHandle);
      observer.disconnect();
    };
  }, [reduced, speed]);

  return <canvas ref={canvasRef} className={`glyph-rain ${className}`.trim()} aria-hidden="true" />;
}

export default GlyphRain;
