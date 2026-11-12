import { useEffect, useRef } from 'react';
import { readToken, useReducedMotion } from '../utils/env.js';

/**
 * Jejak slash yang mengikuti kursor di layar menu dan idle.
 *
 * Ini murni dekorasi umpan balik ("ada yang bergerak mengikuti saya"), bukan
 * gameplay — gameplay tetap butuh tombol ditekan. Karena itu kanvas ini
 * `pointer-events: none` dan tidak pernah menyentuh state React per frame.
 */

const MAX_POINTS = 18;
const MAX_AGE_MS = 260;

export default function SlashCursor() {
  const reduced = useReducedMotion();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (reduced) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const points = [];
    const ink = readToken('--color-white', '#f0f0f0');
    const accent = readToken('--color-pink', '#ff77bc');
    let width = 0;
    let height = 0;
    let frame = null;

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function onMove(event) {
      points.push({ x: event.clientX, y: event.clientY, t: performance.now() });
      if (points.length > MAX_POINTS) points.shift();
    }

    function draw(now) {
      frame = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, width, height);
      while (points.length > 0 && now - points[0].t > MAX_AGE_MS) points.shift();
      if (points.length < 2) return;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < points.length; i += 1) {
        const previous = points[i - 1];
        const current = points[i];
        const life = Math.max(0, 1 - (now - current.t) / MAX_AGE_MS);
        if (life <= 0) continue;
        ctx.globalAlpha = life * 0.85;
        ctx.strokeStyle = i === points.length - 1 ? accent : ink;
        ctx.lineWidth = 1.5 + life * 4;
        ctx.beginPath();
        ctx.moveTo(previous.x, previous.y);
        ctx.lineTo(current.x, current.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    resize();
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('resize', resize);
    frame = requestAnimationFrame(draw);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
    };
  }, [reduced]);

  if (reduced) return null;
  return <canvas ref={canvasRef} className="slash-cursor" aria-hidden="true" />;
}
