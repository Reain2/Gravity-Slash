import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CAMERA_ERROR, CameraStage, useCameraStream } from '../components/CameraPreview.jsx';
import { CONFIG } from '../config/gameConfig.js';
import {
  PHOTO_SIZE,
  defaultEffects,
  drawPhoto,
  findFilter,
  filtersFor,
  previewFilterCss,
} from '../engine/photoStudio.js';
import { buildPhotoFile, canShareFile, downloadBlob, makePhotoFilename, shareOrDownload } from '../services/share.js';
import { readLastSession } from '../services/storage.js';
import { SCREENS } from '../state/screens.js';
import { useUiActions } from '../state/uiStore.jsx';
import { readToken, useReducedMotion } from '../utils/env.js';

/**
 * F11 T-133 — Layar Foto / selfie (PRD bagian 14).
 *
 * Layar ini membuka stream kamera sendiri (tanpa MediaPipe) dan menutupnya lagi
 * saat dilepas. Efek digambar ke kanvas 1080×1080 oleh `engine/photoStudio.js`,
 * jadi modul itu tetap murni dan bisa diuji tanpa React.
 *
 * Latar animasi layar TIDAK dipakai di sini: "latar animasi" hanyalah salah satu
 * pilihan efek yang digambar ke dalam foto (PRD 14.6).
 */

const CAMERA_COPY = {
  [CAMERA_ERROR.DENIED]: 'Izin kamera ditolak. Izinkan akses kamera lewat pengaturan peramban, lalu coba lagi.',
  [CAMERA_ERROR.MISSING]: 'Kamera tidak ditemukan di perangkat ini. Pasang kamera, lalu coba lagi.',
  [CAMERA_ERROR.BUSY]: 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu, lalu coba lagi.',
  [CAMERA_ERROR.UNSUPPORTED]: 'Peramban ini tidak menyediakan akses kamera. Fitur foto hanya jalan di peramban yang mendukung kamera.',
  [CAMERA_ERROR.UNKNOWN]: 'Kamera gagal dinyalakan. Coba lagi sebentar lagi.',
};

/** Palet dibaca dari `tokens.css` supaya tidak ada hex baru di kode (AGENTS.md 6). */
function readPalette() {
  return {
    white: readToken('--color-white', '#f0f0f0'),
    violet: readToken('--color-violet', '#472e97'),
    pink: readToken('--color-pink', '#ff77bc'),
    night: readToken('--color-night', '#2e1c63'),
  };
}

const EFFECT_TOGGLES = [
  { key: 'frame', label: 'Bingkai dan skor' },
  { key: 'slash', label: 'Jejak iris' },
  { key: 'backdrop', label: 'Latar animasi' },
  { key: 'sticker', label: 'Stiker teks' },
];

export default function Photo() {
  const { goTo } = useUiActions();
  const reduced = useReducedMotion();
  const { video: streamVideo, status, error, retry } = useCameraStream(true);

  // Video hanya dipakai setelah benar-benar siap, supaya tombol Jepret tidak
  // bisa ditekan saat elemen belum punya frame.
  const video = status === 'ready' ? streamVideo : null;

  const filters = useMemo(() => filtersFor(readPalette()), []);
  const session = useMemo(() => readLastSession(), []);

  const [filterId, setFilterId] = useState('asli');
  const [effects, setEffects] = useState(defaultEffects);
  const [sticker, setSticker] = useState('');
  const [phase, setPhase] = useState('setup');
  const [countdown, setCountdown] = useState(0);
  const [result, setResult] = useState(null);
  const [notice, setNotice] = useState('');
  const [announce, setAnnounce] = useState('');

  const activeFilter = useMemo(() => findFilter(filters, filterId), [filters, filterId]);

  const capture = useCallback(async () => {
    if (!video) return;
    // Frame harus segar: video yang sempat dicabut dari DOM bisa berhenti
    // (readyState < HAVE_CURRENT_DATA), dan menggambarnya menghasilkan foto
    // kosong. Minta main lagi lalu lanjut.
    if (video.readyState < 2) {
      await video.play().catch(() => {});
    }
    const canvas = document.createElement('canvas');
    canvas.width = PHOTO_SIZE;
    canvas.height = PHOTO_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setNotice('Kanvas tidak tersedia di peramban ini, jadi foto tidak bisa dibuat.');
      setPhase('setup');
      return;
    }

    drawPhoto(ctx, {
      source: video,
      palette: readPalette(),
      filter: activeFilter,
      session,
      effects,
      sticker,
      seed: Math.floor(Math.random() * 2 ** 31),
    });

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
    if (!blob) {
      setNotice('Foto gagal diproses. Coba jepret lagi.');
      setPhase('setup');
      return;
    }

    const filename = makePhotoFilename();
    const file = buildPhotoFile(blob, filename);
    let shareReady;
    try {
      shareReady = canShareFile(file);
    } catch {
      shareReady = false;
    }

    setResult({ file, canvas, filename, shareReady });
    setPhase('result');
    setAnnounce('Foto siap. Pilih unduh atau bagikan.');
  }, [video, activeFilter, session, effects, sticker]);

  const captureRef = useRef(capture);
  useEffect(() => {
    captureRef.current = capture;
  }, [capture]);

  // Hitung mundur berjalan sendiri dengan satu interval; `capture` dipanggil
  // lewat ref supaya perubahan pilihan efek tidak me-restart hitungan. Nilai
  // awal dipasang di `startCountdown`, bukan di badan efek (aturan React
  // Compiler melarang setState sinkron di badan efek).
  useEffect(() => {
    if (phase !== 'counting') return undefined;
    let remaining = CONFIG.photo.countdownSec;
    const interval = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining > 0) setAnnounce(`Menjepret dalam ${remaining} detik.`);
      if (remaining <= 0) {
        clearInterval(interval);
        captureRef.current?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const showPreview = phase !== 'result';

  // Tempelkan kanvas hasil ke panggung saat fase result.
  const resultRef = useRef(null);
  useEffect(() => {
    const holder = resultRef.current;
    if (!holder || !result) return undefined;
    result.canvas.classList.add('photo__canvas');
    holder.appendChild(result.canvas);
    return () => {
      if (result.canvas.parentNode === holder) holder.removeChild(result.canvas);
    };
  }, [result]);

  function toggleEffect(key) {
    setEffects((previous) => ({ ...previous, [key]: !previous[key] }));
  }

  function startCountdown() {
    setNotice('');
    setResult(null);
    setCountdown(CONFIG.photo.countdownSec);
    setAnnounce(`Menjepret dalam ${CONFIG.photo.countdownSec} detik.`);
    setPhase('counting');
  }

  function backToSetup() {
    setNotice('');
    setAnnounce('');
    // Buang hasil lama supaya efek kanvas membersihkan dirinya; tanpa ini
    // kanvas hasil lama tertinggal di panggung dan menutupi pratinjau.
    setResult(null);
    setPhase('setup');
  }

  function handleDownload() {
    if (!result) return;
    const outcome = downloadBlob(result.file, result.filename);
    if (outcome.ok) {
      setAnnounce('Foto diunduh.');
    } else {
      setNotice('Peramban ini tidak bisa mengunduh foto.');
    }
  }

  async function handleShare() {
    if (!result) return;
    setNotice('');
    const outcome = await shareOrDownload(result.file, {
      title: 'Gravity Slash',
      text: session ? `Skor ${session.score}, level ${session.level}.` : 'Foto dari Gravity Slash.',
    });
    if (outcome.ok) {
      setAnnounce('Foto dibagikan.');
    } else if (!outcome.canceled) {
      setNotice('Peramban ini tidak bisa membagikan foto.');
    }
  }

  const cameraFailed = status === 'error';

  return (
    <div className="screen photo">
      <div className="photo__content">
        <header className="photo__head">
          <h1 className="photo__title">Foto</h1>
          <p className="photo__lead">
            Pilih efek, lalu jepret. Foto diproses di perangkat ini dan tidak pernah diunggah.
          </p>
        </header>

        <div className="photo__grid">
          <div className="photo__stage-wrap">
            {!showPreview && result ? (
              <div className="photo__stage photo__stage--result" ref={resultRef} aria-label="Hasil foto" />
            ) : (
              <div className="photo__stage">
                {status === 'requesting' ? <p className="photo__stage-note">Menyalakan kamera…</p> : null}

                <CameraStage
                  video={video}
                  busy={phase === 'counting'}
                  filterCss={previewFilterCss(activeFilter)}
                />

                {activeFilter?.tint ? (
                  <span
                    className="photo__veil"
                    aria-hidden="true"
                    style={{
                      background: activeFilter.tint.color,
                      mixBlendMode: activeFilter.tint.blend,
                      opacity: activeFilter.tint.alpha,
                    }}
                  />
                ) : null}

                {phase === 'counting' ? (
                  <div className={`photo__countdown ${reduced ? '' : 'photo__countdown--pulse'}`} role="presentation">
                    <span className="photo__count-number tabular">{countdown > 0 ? countdown : 'Jepret'}</span>
                  </div>
                ) : null}
              </div>
            )}

            {cameraFailed ? (
              <div className="photo__error" role="alert">
                <p>{CAMERA_COPY[error] ?? CAMERA_COPY[CAMERA_ERROR.UNKNOWN]}</p>
                <div className="photo__actions">
                  <button type="button" className="btn btn--primary" onClick={retry}>
                    Coba lagi
                  </button>
                  <button type="button" className="btn" onClick={() => goTo(SCREENS.MENU)}>
                    Menu
                  </button>
                </div>
              </div>
            ) : null}

            {notice ? (
              <p className="photo__notice" role="status">
                {notice}
              </p>
            ) : null}
          </div>

          <aside className="panel photo__panel">
            <fieldset className="photo__group">
              <legend className="photo__legend">Filter warna</legend>
              <div className="photo__chips">
                {filters.map((filter) => (
                  <label
                    key={filter.id}
                    className={`photo__chip ${filterId === filter.id ? 'photo__chip--on' : ''}`}
                  >
                    <input
                      type="radio"
                      name="photo-filter"
                      value={filter.id}
                      checked={filterId === filter.id}
                      onChange={() => setFilterId(filter.id)}
                    />
                    <span>{filter.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="photo__group">
              <legend className="photo__legend">Efek</legend>
              <div className="photo__switches">
                {EFFECT_TOGGLES.map((toggle) => (
                  <label
                    key={toggle.key}
                    className={`photo__switch ${effects[toggle.key] ? 'photo__switch--on' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={effects[toggle.key]}
                      onChange={() => toggleEffect(toggle.key)}
                    />
                    <span className="photo__switch-mark" aria-hidden="true" />
                    <span>{toggle.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="photo__group">
              <label className="photo__legend" htmlFor="photo-sticker">
                Stiker teks
              </label>
              <input
                id="photo-sticker"
                className="photo__input"
                type="text"
                value={sticker}
                maxLength={CONFIG.photo.stickerMaxLength}
                placeholder="Contoh: COMBO x5"
                disabled={!effects.sticker}
                onChange={(event) => setSticker(event.target.value)}
              />
              <p className="photo__hint small muted">
                Maksimal {CONFIG.photo.stickerMaxLength} karakter. Nyalakan "Stiker teks" untuk memakainya.
              </p>
            </div>

            <div className="photo__actions photo__actions--wide">
              {phase === 'result' ? (
                <>
                  <button type="button" className="btn btn--primary" onClick={handleDownload}>
                    Unduh PNG
                  </button>
                  {result?.shareReady ? (
                    <button type="button" className="btn btn--accent" onClick={handleShare}>
                      Bagikan
                    </button>
                  ) : null}
                  <button type="button" className="btn" onClick={backToSetup}>
                    Jepret lagi
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary btn--big"
                  onClick={startCountdown}
                  disabled={!video || phase === 'counting'}
                >
                  {phase === 'counting' ? 'Menyiapkan…' : 'Jepret'}
                </button>
              )}
              <button type="button" className="link-btn" onClick={() => goTo(SCREENS.MENU)}>
                Kembali ke menu
              </button>
            </div>
          </aside>
        </div>
      </div>

      <p className="visually-hidden" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
