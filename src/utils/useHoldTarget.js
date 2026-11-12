import { useEffect, useRef } from 'react';

/**
 * Tahan untuk memulai — dipakai dua layar (pembuka dan uji tangan).
 *
 * Kursor tangan tidak pernah mengirim `pointerdown`, jadi menahan dengan tangan
 * hanya bisa dibaca dari posisi bidik yang berhenti di atas target. Saat ada
 * tangan di frame (`hover`), cukup berhenti di atas target; tanpa tangan,
 * pemain harus menekan dan menahan (mouse/sentuh).
 *
 * `pointermove` yang disuntikkan `useHandPointer` berhenti begitu tangan
 * pindah elemen, dan tidak ada `pointerleave` untuk target lama. Karena itu
 * posisi "di atas target" dijaga pengawas 250 ms, bukan hanya event masuk.
 */
const HOVER_TIMEOUT_MS = 250;

export function useHoldTarget({ targetRef, fillRef, ms, hover = false, enabled = true, onDone }) {
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const target = targetRef.current;
    if (!enabled || !target) return undefined;

    let raf = 0;
    let since = null;
    let finished = false;
    let over = false;
    let pressed = false;
    let watchdog = 0;
    let painted = -1;

    const paint = (value) => {
      // Nilai yang sama tidak perlu ditulis ulang tiap frame; menulis ulang
      // `style.transform` memaksa style recalc walau hasilnya identik.
      if (Math.abs(value - painted) < 0.004) return;
      painted = value;
      const fill = fillRef.current;
      if (fill) fill.style.transform = `scaleX(${value})`;
    };

    const arrive = () => {
      over = true;
      window.clearTimeout(watchdog);
      watchdog = window.setTimeout(() => {
        // Menekan mouse tidak mengirim `pointermove`, jadi jangan matikan
        // posisi "di atas target" selagi tombol masih ditekan.
        if (!pressed) over = false;
      }, HOVER_TIMEOUT_MS);
    };

    const leave = () => {
      over = false;
      pressed = false;
      window.clearTimeout(watchdog);
    };

    const down = () => {
      pressed = true;
      arrive();
    };

    const up = () => {
      pressed = false;
    };

    target.addEventListener('pointermove', arrive);
    target.addEventListener('pointerenter', arrive);
    target.addEventListener('pointerleave', leave);
    target.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('blur', up);

    const tick = () => {
      raf = window.requestAnimationFrame(tick);
      const active = pressed || (hover && over);
      if (!active) {
        since = null;
        paint(0);
        return;
      }
      const now = performance.now();
      if (since === null) since = now;
      const progress = Math.min(1, (now - since) / ms);
      paint(progress);
      if (progress >= 1 && !finished) {
        finished = true;
        doneRef.current?.();
      }
    };
    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(watchdog);
      target.removeEventListener('pointermove', arrive);
      target.removeEventListener('pointerenter', arrive);
      target.removeEventListener('pointerleave', leave);
      target.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', up);
      paint(0);
    };
  }, [enabled, hover, ms, targetRef, fillRef]);
}

export default useHoldTarget;
