import { useEffect, useMemo, useRef } from 'react';
import { GhostFibersBackdrop, BackdropLayer } from '../components/Backgrounds.jsx';
import CameraPreview from '../components/CameraPreview.jsx';
import { preloadAllBackdrops, useBackdropComponent } from '../components/reactbitsLoaders.js';
import { CONFIG } from '../config/gameConfig.js';
import { INPUT_MODES, SCREENS } from '../state/screens.js';
import { useUiActions } from '../state/uiStore.jsx';
import { hasWebGL, readToken, useReducedMotion } from '../utils/env.js';
import { useHandPointer } from '../utils/handPointer.js';
import { useHoldTarget } from '../utils/useHoldTarget.js';

/**
 * F7 T-098 — Layar pembuka.
 *
 * Kesan pertama: nama permainan di atas serat cahaya violet→pink
 * (`GhostFibersBackdrop`, T-140). Sejak revisi 7 Nov 2026 kamera langsung
 * diminta di sini (permintaan pemilik produk), jadi pemain bisa menguji bidik
 * tangan sejak detik pertama dan memulai dengan **menahan bidik di wordmark**
 * selama `CONFIG.hand.confirmHoldMs`.
 *
 * Mouse/sentuh tetap bisa: klik tetap memulai (jalur cadangan), dan menekan
 * wordmark selama durasi tahan juga mengisi bilah. Enter/Space langsung mulai
 * karena menahan tombol keyboard beberapa detik tidak nyaman.
 *
 * Sekalian menjadi tempat memanaskan chunk animasi berikutnya (BUG-013).
 */
const STATUS_COPY = {
  requesting: 'Menunggu izin kamera…',
  denied: 'Izin kamera ditolak. Kamu tetap bisa mulai dengan mouse.',
  missing: 'Kamera tidak terdeteksi. Kamu tetap bisa mulai dengan mouse.',
  busy: 'Kamera dipakai aplikasi lain. Kamu tetap bisa mulai dengan mouse.',
  failed: 'Kamera gagal dibuka. Kamu tetap bisa mulai dengan mouse.',
  'model-failed': 'Deteksi tangan gagal dimuat. Kamu tetap bisa mulai dengan mouse.',
};

export default function Opening() {
  const { goTo, setMode, setCamera } = useUiActions();
  const reduced = useReducedMotion();
  const containerRef = useRef(null);
  const holdRef = useRef(null);
  const fillRef = useRef(null);

  // Crosshair menerima warna sebagai nilai nyata (bukan `var()`): kanvas tidak
  // bisa membaca custom property.
  const pink = useMemo(() => readToken('--color-pink', '#ff77bc'), []);

  // Crosshair milik pustaka bebas React Bits di-`import()` dinamis supaya tidak
  // ikut bundel awal (ARCHITECTURE bagian 8). Isinya tidak diubah.
  const Crosshair = useBackdropComponent('crosshair');

  // Kamera menyala sejak layar pertama: izin diminta di sini, bukan di layar uji.
  const { video, status, message, present } = useHandPointer({ enabled: true, containerRef });

  useEffect(() => {
    setCamera(status, message);
    // Kamera siap → mode tangan. Pemain tetap bisa memilih "Tanpa kamera" di
    // layar uji, yang mengembalikan mode ke pointer.
    if (video && status === 'ready') setMode(INPUT_MODES.HAND);
  }, [status, message, video, setMode, setCamera]);

  useEffect(() => {
    if (reduced || !hasWebGL()) return undefined;
    const warm = () => preloadAllBackdrops();
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warm, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(warm, 400);
    return () => window.clearTimeout(timer);
  }, [reduced]);

  const holdSeconds = Math.round(CONFIG.hand.confirmHoldMs / 1000);
  const start = () => goTo(SCREENS.HAND_TEST);

  useHoldTarget({
    targetRef: holdRef,
    fillRef,
    ms: CONFIG.hand.confirmHoldMs,
    hover: present,
    onDone: start,
  });

  // Papan ketik: Enter/Space juga memulai, tanpa perlu Tab ke tombol lebih dulu.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      goTo(SCREENS.HAND_TEST);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goTo]);

  const note = STATUS_COPY[status];

  return (
    <div className="screen screen--interactive opening" ref={containerRef}>
      <GhostFibersBackdrop variant="opening" />

      {Crosshair ? (
        <BackdropLayer
          Component={Crosshair}
          containerRef={containerRef}
          color={pink}
          thickness={1}
          opacity={0.9}
          smoothing={0.4}
          showCoordinates={false}
          targetEffect="lock"
          targetSelector="[data-crosshair-target]"
          clickPulse
        />
      ) : null}

      <div className="opening__content">
        <button
          type="button"
          className="opening__start"
          ref={holdRef}
          data-crosshair-target
          onClick={start}
        >
          <span className="wordmark opening__wordmark" lang="en">
            <span>Gravity</span> <span className="wordmark__accent">Slash</span>
          </span>
          <span className="opening__hint">Tahan {holdSeconds} detik di sini untuk mulai</span>
          <span className="hold-meter__track opening__hold" aria-hidden="true">
            <span className="hold-meter__fill" ref={fillRef} />
          </span>
        </button>

        <div className="opening__stage">
          {video ? <CameraPreview video={video} /> : null}
          {note ? <p className="small muted">{note}</p> : null}
          {present ? (
            <p className="small muted">Arahkan ujung telunjuk ke Gravity Slash, lalu tahan.</p>
          ) : null}
        </div>
      </div>

      {/* Peringatan privasi di layar pertama (permintaan pemilik produk, 7 Nov
          2026) supaya pemain tahu batasnya sebelum kamera dipakai. */}
      <p className="opening__privacy small">
        Kamera hanya dipakai untuk melacak tangan di dalam browser ini. Tidak ada gambar yang
        dikirim, disimpan, atau direkam, dan kamera dimatikan begitu kamu keluar dari layar uji.
        Deteksi tangan memakai model lokal, tanpa CDN pihak ketiga.
      </p>
    </div>
  );
}
