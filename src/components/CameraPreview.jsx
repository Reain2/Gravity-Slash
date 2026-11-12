import { useCallback, useEffect, useRef, useState } from 'react';

/** Kode kesalahan kamera yang bisa diterjemahkan UI menjadi pesan yang jelas. */
export const CAMERA_ERROR = {
  DENIED: 'denied',
  MISSING: 'missing',
  BUSY: 'busy',
  UNSUPPORTED: 'unsupported',
  UNKNOWN: 'unknown',
};

function classifyCameraError(error) {
  const name = error?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return CAMERA_ERROR.DENIED;
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') {
    return CAMERA_ERROR.MISSING;
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return CAMERA_ERROR.BUSY;
  }
  return CAMERA_ERROR.UNKNOWN;
}

/**
 * useCameraStream — pratinjau kamera mentah (tanpa MediaPipe) beserta statusnya.
 *
 * Dipakai layar Foto, yang perlu membedakan "sedang meminta izin", "siap", dan
 * "gagal karena apa" (PRD 14.5). `useCameraPreview` adalah pembungkus tipis di
 * atasnya untuk layar yang hanya butuh elemen video.
 *
 * Stream dilepas sepenuhnya saat komponen dilepas (AGENTS.md bagian 7.8).
 * Frame tidak pernah dikirim atau disimpan (AGENTS.md bagian 7.10).
 */
export function useCameraStream(enabled) {
  const [state, setState] = useState({ video: null, status: 'idle', error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let stream = null;
    let element = null;

    // Semua `setState` ada di dalam fungsi bersarang (async / cleanup), bukan di
    // badan efek langsung: aturan React Compiler menolak setState sinkron di
    // badan efek karena memicu render berantai.
    (async () => {
      setState({ video: null, status: 'requesting', error: null });

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setState({ video: null, status: 'error', error: CAMERA_ERROR.UNSUPPORTED });
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        });
      } catch (error) {
        if (!cancelled) setState({ video: null, status: 'error', error: classifyCameraError(error) });
        return;
      }
      if (cancelled) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }

      element = document.createElement('video');
      element.playsInline = true;
      element.muted = true;
      element.autoplay = true;
      element.srcObject = stream;
      try {
        await element.play();
      } catch {
        /* autoplay bisa ditunda; frame pertama tetap muncul */
      }
      if (cancelled) {
        for (const track of stream.getTracks()) track.stop();
        element.srcObject = null;
        return;
      }
      setState({ video: element, status: 'ready', error: null });
    })();

    return () => {
      cancelled = true;
      if (stream) for (const track of stream.getTracks()) track.stop();
      if (element) element.srcObject = null;
      setState({ video: null, status: 'idle', error: null });
    };
  }, [enabled, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return { video: state.video, status: state.status, error: state.error, retry };
}

/** Versi ringkas: hanya elemen video, tanpa status. */
export function useCameraPreview(enabled) {
  return useCameraStream(enabled).video;
}

/**
 * CameraStage — bingkai persegi yang menampung elemen video dari
 * `useCameraStream`. Elemen dipegang pemanggil; komponen ini hanya menempelkan
 * dan melepasnya. `filterCss` dipasang lewat gaya bingkai, bukan dengan
 * mengubah elemen video secara manual.
 */
export function CameraStage({ video, filterCss = 'none', busy = false }) {
  const frameRef = useRef(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !video) return undefined;
    video.classList.add('photo__video');
    frame.appendChild(video);
    // Elemen sempat dicabut dari DOM saat fase hasil, dan peramban menjeda
    // pemutaran video yang terlepas. Tanpa `play()` lagi pratinjau "Jepret lagi"
    // membeku dan frame tangkapan berikutnya bisa kosong/basi.
    if (video.paused) void video.play().catch(() => {});
    return () => {
      if (video.parentNode === frame) frame.removeChild(video);
    };
  }, [video]);

  return <div className="photo__frame" ref={frameRef} style={{ filter: filterCss }} aria-busy={busy} />;
}

/**
 * CameraPreview — pratinjau kecil di pojok, bisa disembunyikan (FR-15).
 * Elemen <video> dipegang pemanggil; komponen ini hanya menempelkannya ke DOM
 * dan melepasnya lagi saat layar berganti.
 */
export function CameraPreview({ video, visible = true, onToggleVisible }) {
  const holderRef = useRef(null);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder || !video) return undefined;

    video.classList.add('camera-preview__video');
    holder.appendChild(video);
    // Sama seperti panggung Foto: video yang sempat dicabut dari DOM dijeda
    // peramban, jadi pratinjau layar berikutnya harus diminta main lagi.
    if (video.paused) void video.play().catch(() => {});

    return () => {
      if (video.parentNode === holder) holder.removeChild(video);
    };
  }, [video]);

  if (!video) return null;

  return (
    <div className={`camera-preview ${visible ? '' : 'camera-preview--hidden'}`}>
      <div className="camera-preview__frame">
        <div ref={holderRef} className="camera-preview__holder" />
      </div>
      {!visible ? <p className="camera-preview__off small">Pratinjau disembunyikan</p> : null}
      <button
        type="button"
        className="icon-btn icon-btn--tiny"
        onClick={onToggleVisible}
        aria-pressed={!visible}
        aria-label={visible ? 'Sembunyikan pratinjau kamera' : 'Tampilkan pratinjau kamera'}
      >
        <span aria-hidden="true">{visible ? '◉' : '◌'}</span>
      </button>
    </div>
  );
}

export default CameraPreview;
