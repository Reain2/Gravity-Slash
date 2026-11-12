import { useMemo, useRef, useState } from 'react';
import { BackdropLayer, TopographyBackdrop } from '../components/Backgrounds.jsx';
import CameraPreview from '../components/CameraPreview.jsx';
import { useBackdropComponent } from '../components/reactbitsLoaders.js';
import { CONFIG } from '../config/gameConfig.js';
import { INPUT_MODES, SCREENS } from '../state/screens.js';
import { useUi, useUiActions } from '../state/uiStore.jsx';
import { readToken } from '../utils/env.js';
import { useHandPointer } from '../utils/handPointer.js';
import { useHoldTarget } from '../utils/useHoldTarget.js';

/**
 * Uji tangan — layar antara pembuka dan menu.
 *
 * Kamera sudah dinyalakan di layar pembuka (izin diminta di sana), jadi layar
 * ini murni untuk mencoba: pratinjau besar, ujung telunjuk menggerakkan bidik,
 * dan pemain memulai lewat tombol **Lanjut** yang harus ditahan ±3 detik.
 * Menahan di tombol (bukan di mana saja) membuat pemain sadar sedang memulai,
 * dan hover bebas tetap dipakai untuk menguji bidik.
 */
const CAMERA_COPY = {
  denied: 'Izin kamera ditolak. Kamu masih bisa main dengan mouse.',
  missing: 'Kamera tidak terdeteksi di perangkat ini.',
  busy: 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi.',
  'model-failed': 'Model deteksi tangan gagal dimuat. Coba lagi, atau main dengan mouse.',
};

export default function HandTest() {
  const { mode } = useUi();
  const { goTo, setMode } = useUiActions();
  const withHand = mode === INPUT_MODES.HAND;
  const containerRef = useRef(null);
  const holdRef = useRef(null);
  const fillRef = useRef(null);
  const [attempt, setAttempt] = useState(0);

  const Crosshair = useBackdropComponent('crosshair');
  const pink = useMemo(() => readToken('--color-pink', '#ff77bc'), []);

  const { video, status, message, present } = useHandPointer({
    enabled: withHand,
    containerRef,
    retryKey: attempt,
  });

  const failed =
    status === 'denied' ||
    status === 'missing' ||
    status === 'busy' ||
    status === 'failed' ||
    status === 'model-failed';
  const requesting = status === 'requesting';
  const holdSeconds = Math.round(CONFIG.hand.confirmHoldMs / 1000);

  const next = () => goTo(SCREENS.INTRO);

  useHoldTarget({
    targetRef: holdRef,
    fillRef,
    ms: CONFIG.hand.confirmHoldMs,
    hover: present,
    onDone: next,
  });

  function startWithHand() {
    setMode(INPUT_MODES.HAND);
    // Percobaan berikutnya butuh adapter baru (stream lama sudah dilepas).
    if (failed) setAttempt((value) => value + 1);
  }

  function usePointer() {
    setMode(INPUT_MODES.POINTER);
    goTo(SCREENS.INTRO);
  }

  return (
    <div className="screen screen--interactive handtest" ref={containerRef}>
      <TopographyBackdrop />

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

      <div className="handtest__content">
        <p className="wordmark handtest__brand" lang="en">
          <span>Gravity</span> <span className="wordmark__accent">Slash</span>
        </p>
        <h1 className="handtest__title">Uji tangan dulu</h1>
        <p className="handtest__lead">
          Angkat tangan ke depan kamera. Ujung telunjuk menggerakkan bidik — coba arahkan ke
          wordmark dan tombol. Kalau sudah siap, berhenti di tombol <strong>Lanjut</strong> dan
          tahan {holdSeconds} detik.
        </p>

        <div className="handtest__stage">
          {video ? <CameraPreview video={video} /> : null}

          {!withHand && !video ? (
            <p className="small muted">Kamera belum menyala. Nyalakan untuk mencoba bidik dengan tangan.</p>
          ) : null}

          {requesting ? <p className="small muted">Menunggu izin kamera…</p> : null}

          {withHand && video && !present ? (
            <p className="small muted">
              Tangan belum terlihat. Angkat ke kamera; jauhkan lampu dari atas.
            </p>
          ) : null}

          {withHand && video && present ? (
            <p className="small muted">Tahan bidik di tombol Lanjut untuk masuk ke menu.</p>
          ) : null}
        </div>

        {failed ? (
          <p className="gate__status gate__status--error handtest__alert" role="alert">
            {CAMERA_COPY[status] ?? message ?? 'Kamera gagal dibuka.'}
          </p>
        ) : null}

        <div className="gate__actions handtest__actions">
          {video ? null : (
            <button
              type="button"
              className="btn btn--primary"
              onClick={startWithHand}
              disabled={requesting}
            >
              {requesting ? 'Menunggu izin…' : failed ? 'Coba lagi' : 'Nyalakan kamera'}
            </button>
          )}
          <button type="button" className="btn" onClick={usePointer}>
            Tanpa kamera
          </button>
        </div>

        <button
          type="button"
          className="btn btn--primary btn--big handtest__next"
          ref={holdRef}
          data-crosshair-target
          onClick={next}
        >
          Lanjut
          <span className="hold-meter__track handtest__hold" aria-hidden="true">
            <span className="hold-meter__fill" ref={fillRef} />
          </span>
        </button>

        {failed ? (
          <p className="small muted handtest__help">
            Kalau kamera tetap tidak bisa dipakai, tekan <strong>Tanpa kamera</strong>. Semua fitur
            game tetap bisa dimainkan dengan mouse atau sentuh.
          </p>
        ) : null}

        <button type="button" className="link-btn handtest__back" onClick={() => goTo(SCREENS.OPENING)}>
          Kembali ke layar pembuka
        </button>
      </div>
    </div>
  );
}
