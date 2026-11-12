import { useEffect, useState } from 'react';
import { CONFIG } from '../config/gameConfig.js';
import { createHandTrackingAdapter } from '../input/HandTrackingAdapter.js';
import { createInputManager } from '../input/InputManager.js';

/**
 * useHandPointer — jalankan deteksi tangan di layar non-permainan (layar mulai).
 *
 * Sebelumnya deteksi tangan hanya hidup di dalam `Game.jsx`. Layar mulai juga
 * butuh tangan: pemain ingin melihat ujung telunjuknya menggerakkan crosshair
 * dan "mengunci" pada nama produk serta tombol Mulai sebelum bermain. Jadi
 * adapter yang sama dipakai di sini.
 *
 * Kontrak penting (keputusan pemilik produk, T-141):
 *   - Tangan HANYA untuk melihat: hover dan kunci bidik. Modul ini tidak
 *     mengirim `pointerdown`/`pointerup`/`click`, dan **tidak** menerjemahkan
 *     lambaian cepat menjadi "mulai" — getaran tangan sempat memicu start
 *     sendiri saat pemain cuma mau menguji bidik, jadi jalur itu dibuang.
 *   - Modul hanya melaporkan `present` (ada tangan di frame). Layar idle
 *     memakai itu untuk dwell konfirmasi mode tangan (7 Nov 2026) — menahan
 *     diam beberapa detik, bukan lambaian. Mulai juga tetap bisa lewat tombol
 *     Mulai (klik), Enter, atau iris mouse.
 *   - Kunci bidik dipakai ulang dari komponen `Crosshair` React Bits yang
 *     disalin apa adanya. Itu tidak bisa diubah, jadi cara bicaranya adalah
 *     menyuntik `pointermove` asli ke elemen di bawah ujung telunjuk —
 *     persis event yang diterima mouse. Tidak ada berkas React Bits yang
 *     disentuh.
 *
 * Pengembalian `video` adalah elemen <video> milik adapter supaya pratinjau
 * memakai stream yang sama — bukan membuka kamera kedua (dua stream ke satu
 * kamera gagal di banyak perangkat).
 */
export function useHandPointer({ enabled, containerRef, retryKey = 0 }) {
  const [state, setState] = useState({ video: null, status: 'idle', message: '', present: false });

  useEffect(() => {
    if (!enabled) return undefined;
    const container = containerRef?.current;
    if (!container) return undefined;

    let cancelled = false;
    let raf = 0;
    let handShown = false;
    /** Emisi terakhir: posisi dan waktu, untuk menahan event duplikat. */
    let emittedX = 0;
    let emittedY = 0;
    let emittedAt = 0;
    let hasEmitted = false;
    /** Kotak layar di-cache; `getBoundingClientRect` tiap frame = layout paksa. */
    let rect = container.getBoundingClientRect();

    const manager = createInputManager({ maxPointers: CONFIG.maxPointers });

    let adapter = null;
    const onStatus = (status, message) => {
      if (cancelled) return;
      setState((prev) => ({ ...prev, video: adapter?.videoElement ?? null, status, message }));
    };
    adapter = createHandTrackingAdapter({
      manager,
      maxHands: CONFIG.hand.maxHands,
      onStatus,
    });
    adapter.start().then(() => {
      if (cancelled) return;
      setState((prev) => ({
        ...prev,
        video: adapter.videoElement,
        status: adapter.status,
        message: adapter.message,
      }));
    });

    const refreshRect = () => {
      rect = container.getBoundingClientRect();
    };

    /** Suntik satu `pointermove` asli ke elemen paling atas di titik itu. */
    const emitMove = (clientX, clientY) => {
      if (typeof window.PointerEvent !== 'function') return;
      const target =
        (typeof document.elementFromPoint === 'function' &&
          document.elementFromPoint(clientX, clientY)) ||
        container;
      target.dispatchEvent(
        new window.PointerEvent('pointermove', {
          clientX,
          clientY,
          bubbles: true,
          cancelable: false,
          pointerType: 'mouse',
          buttons: 0,
        })
      );
    };

    const emitLeave = () => {
      if (typeof window.PointerEvent !== 'function') return;
      container.dispatchEvent(
        new window.PointerEvent('pointerleave', { bubbles: false, cancelable: false })
      );
    };

    const setPresent = (value) => {
      if (cancelled) return;
      setState((prev) => (prev.present === value ? prev : { ...prev, present: value }));
    };

    const loop = () => {
      raf = window.requestAnimationFrame(loop);

      const pointers = adapter.read(0);
      if (pointers.length === 0) {
        // Jangan langsung dianggap hilang. Adapter sudah punya jendela
        // `presentWindowMs` (280 ms); memakai itu mencegah crosshair dan baris
        // status berkedip saat satu-dua deteksi meleset, dan mencegah tata
        // letak lompat karena baris status muncul-hilang.
        const alive = adapter.handPresent;
        setPresent(alive);
        if (handShown && !alive) {
          handShown = false;
          hasEmitted = false;
          emitLeave();
        }
        return;
      }

      // Ambil kursor utama, bukan indeks pertama: MediaPipe kadang mengembalikan
      // dua deteksi (tangan kedua, lengan, objek mirip) dan urutannya berubah.
      const point =
        pointers.find((candidate) => candidate.id === adapter.primaryId) ?? pointers[0];
      if (rect.width === 0 || rect.height === 0) return;
      if (!handShown) {
        handShown = true;
        setPresent(true);
      }

      const x = rect.left + point.x * rect.width;
      const y = rect.top + point.y * rect.height;
      const now = performance.now();
      const moved =
        !hasEmitted || Math.hypot(x - emittedX, y - emittedY) >= CONFIG.hand.emitMinMovePx;

      // Tangan yang diam tetap mengirim getaran sub-piksel dari MediaPipe.
      // Menyuntik setiap frame membuat Crosshair tidak pernah berhenti
      // menggambar dan mengunci target terus-menerus; cukup kirim saat posisi
      // benar-benar berubah, plus detak pelan agar hover-tahan tetap hidup.
      if (!moved && now - emittedAt < CONFIG.hand.emitHeartbeatMs) return;

      emittedX = x;
      emittedY = y;
      emittedAt = now;
      hasEmitted = true;
      emitMove(x, y);
    };

    const resizeObserver = new ResizeObserver(refreshRect);
    resizeObserver.observe(container);
    window.addEventListener('resize', refreshRect);
    raf = window.requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener('resize', refreshRect);
      adapter.destroy();
    };
  }, [enabled, containerRef, retryKey]);

  return state;
}
