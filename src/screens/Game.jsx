import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CameraPreview from '../components/CameraPreview.jsx';
import FlashOverlay from '../components/FlashOverlay.jsx';
import Hud from '../components/Hud.jsx';
import { CONFIG } from '../config/gameConfig.js';
import { createGameEngine, PAUSE_REASON } from '../engine/GameEngine.js';
import { CAMERA_STATUS, createHandTrackingAdapter } from '../input/HandTrackingAdapter.js';
import { createInputManager } from '../input/InputManager.js';
import { createPointerAdapter } from '../input/PointerAdapter.js';
import * as audio from '../services/audio.js';
import { isHighScore, saveLastSession } from '../services/storage.js';
import { INPUT_MODES, SCREENS } from '../state/screens.js';
import { useUi, useUiActions, useMuteToggle } from '../state/uiStore.jsx';

const FLASH_MS = 420;

const PAUSE_COPY = {
  [PAUSE_REASON.HAND]: {
    title: 'Tangan tidak terdeteksi',
    body: 'Dekatkan tangan ke kamera untuk lanjut. Permainan berjalan lagi sendiri begitu tangan terlihat.',
  },
  [PAUSE_REASON.HIDDEN]: {
    title: 'Permainan dijeda',
    body: 'Tab ini tidak aktif, jadi timer dihentikan supaya tidak ada soal yang gagal tanpa kamu lihat.',
  },
  [PAUSE_REASON.USER]: {
    title: 'Permainan dijeda',
    body: 'Tekan Lanjut atau tombol Esc untuk kembali bermain.',
  },
};

/**
 * F6 — Layar Game. Memasang canvas + GameEngine, lalu membersihkannya saat
 * layar dilepas (kamera mati, loop berhenti, canvas dibersihkan).
 */
export default function Game() {
  const { mode, muted } = useUi();
  const { goTo, setMode, setResult } = useUiActions();
  const toggleMute = useMuteToggle();

  const areaRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const flashTimerRef = useRef(null);
  // Combo tertinggi selama sesi ini; dipakai bingkai foto (PRD 14.3).
  const bestComboRef = useRef(0);

  const [hud, setHud] = useState(() => ({
    lives: CONFIG.lives.start,
    score: 0,
    combo: 0,
    multiplier: 1,
    question: null,
    remainingMs: 0,
    totalMs: 0,
  }));
  const [countdown, setCountdown] = useState(null);
  const [paused, setPaused] = useState(null);
  const [flash, setFlash] = useState(null);
  const [video, setVideo] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [cameraProblem, setCameraProblem] = useState(null);
  const [announcement, setAnnouncement] = useState('');

  const ensureAudio = useCallback(async () => {
    const context = await audio.unlock();
    if (context) void audio.preload();
  }, []);

  useEffect(() => {
    audio.setMuted(muted);
  }, [muted]);

  const handleEvent = useCallback(
    (type, payload = {}) => {
      switch (type) {
        case 'started':
          bestComboRef.current = 0;
          setCountdown(CONFIG.countdown.sec);
          setPaused(null);
          setAnnouncement('Permainan dimulai');
          break;

        case 'countdownChanged':
          setCountdown(payload.remainingSec > 0 ? payload.remainingSec : null);
          break;

        case 'questionChanged':
          setHud((previous) => ({ ...previous, question: payload.question }));
          break;

        case 'scoreChanged':
          if (payload.combo > bestComboRef.current) bestComboRef.current = payload.combo;
          setHud((previous) => ({
            ...previous,
            score: payload.score,
            combo: payload.combo,
            multiplier: payload.multiplier,
          }));
          break;

        case 'livesChanged':
          setHud((previous) => ({ ...previous, lives: payload.lives }));
          break;

        case 'timerChanged':
          setHud((previous) => ({
            ...previous,
            remainingMs: payload.remainingMs,
            totalMs: payload.totalMs,
          }));
          break;

        case 'sliced':
          // Efek ayunan untuk tiap orb yang teriris (T-101); efek hasil
          // (benar/salah/bahaya/nyawa) dimainkan terpisah lewat `feedback`.
          void audio.play('slash');
          break;

        case 'feedback': {
          setFlash({ ...payload, key: `${type}-${payload.type}-${performance.now()}` });
          if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
          flashTimerRef.current = window.setTimeout(() => setFlash(null), FLASH_MS);

          if (payload.type === 'correct') {
            void audio.play('correct');
            setAnnouncement('Jawaban benar');
          } else if (payload.type === 'wrong') {
            void audio.play('wrong');
            setAnnouncement(`Jawaban salah, skor berkurang ${payload.penalty ?? 0}`);
          } else if (payload.type === 'bomb') {
            void audio.play('bomb');
            setAnnouncement('Orb bahaya, nyawa berkurang');
          } else if (payload.type === 'heal') {
            void audio.play('heal');
            setAnnouncement('Nyawa bertambah');
          } else if (payload.type === 'timeout') {
            void audio.play('wrong');
            setAnnouncement('Waktu habis, nyawa berkurang');
          }
          break;
        }

        case 'paused':
          setPaused({ reason: payload.reason });
          break;

        case 'resumed':
          setPaused(null);
          break;

        case 'gameOver': {
          const high = isHighScore(payload.score);
          void audio.play('gameOver');
          // Snapshot sesi terakhir untuk hiasan bingkai foto (PRD 14.3).
          saveLastSession({
            score: payload.score,
            level: payload.level ?? 1,
            bestCombo: bestComboRef.current,
          });
          setResult(payload.score, payload.level ?? 1, high);
          goTo(SCREENS.GAME_OVER);
          break;
        }

        default:
          break;
      }
    },
    [goTo, setResult]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const area = areaRef.current;
    if (!canvas || !area) return undefined;

    // Setiap pemasangan efek punya flag sendiri. StrictMode memasang efek dua
    // kali: satu flag bersama membuat hasil `start()` milik efek yang sudah
    // dibersihkan menimpa elemen video milik efek yang masih hidup — akibatnya
    // pratinjau kamera tidak pernah muncul.
    let cancelled = false;
    const manager = createInputManager({ maxPointers: CONFIG.maxPointers });
    let adapter;

    if (mode === INPUT_MODES.HAND) {
      const handAdapter = createHandTrackingAdapter({
        manager,
        maxHands: CONFIG.hand.maxHands,
      });
      adapter = handAdapter;
      handAdapter.start().then((status) => {
        if (cancelled) return;
        if (status === CAMERA_STATUS.READY) {
          setVideo(handAdapter.videoElement);
          setCameraProblem(null);
        } else {
          setCameraProblem({ status, message: handAdapter.message });
        }
      });
    } else {
      adapter = createPointerAdapter({ target: area, manager, onInteraction: ensureAudio });
    }

    const engine = createGameEngine({ canvas, input: adapter, onEvent: handleEvent });
    engineRef.current = engine;
    engine.attach();
    engine.start();

    return () => {
      cancelled = true;
      engine.destroy();
      engineRef.current = null;
      adapter.destroy();
      setVideo(null);
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    };
  }, [mode, handleEvent, ensureAudio]);

  // Pause lewat tombol: Esc atau Spasi (FR-14).
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape' || event.key === ' ') {
        event.preventDefault();
        engineRef.current?.togglePause();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const pauseCopy = useMemo(() => PAUSE_COPY[paused?.reason] ?? PAUSE_COPY[PAUSE_REASON.USER], [paused]);

  return (
    <div className="game" ref={areaRef} data-mode={mode}>
      <canvas ref={canvasRef} className="game__canvas" />

      <Hud
        lives={hud.lives}
        maxLives={CONFIG.lives.max}
        score={hud.score}
        combo={hud.combo}
        multiplier={hud.multiplier}
        question={hud.question}
        remainingMs={hud.remainingMs}
        totalMs={hud.totalMs}
        muted={muted}
        paused={Boolean(paused)}
        onToggleMute={toggleMute}
        onTogglePause={() => engineRef.current?.togglePause()}
      />

      <FlashOverlay feedback={flash} />

      {video ? (
        <CameraPreview
          video={video}
          visible={previewVisible}
          onToggleVisible={() => setPreviewVisible((value) => !value)}
        />
      ) : null}

      {countdown !== null && !paused ? (
        <div className="overlay overlay--countdown" role="status">
          <p className="countdown__number tabular">{countdown}</p>
          <p className="countdown__hint">Siapkan tangan atau kursor…</p>
        </div>
      ) : null}

      {paused ? (
        <div className="overlay overlay--pause">
          <div className="panel overlay__panel">
            <h2>{pauseCopy.title}</h2>
            <p className="muted">{pauseCopy.body}</p>
            <div className="overlay__actions">
              {paused.reason !== PAUSE_REASON.HAND ? (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => engineRef.current?.resume()}
                >
                  Lanjut
                </button>
              ) : null}
              <button type="button" className="btn" onClick={() => goTo(SCREENS.MENU)}>
                Keluar ke menu
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cameraProblem ? (
        <div className="overlay overlay--error">
          <div className="panel overlay__panel">
            <h2>Kamera tidak siap</h2>
            <p className="muted">{cameraProblem.message || 'Kamera gagal dibuka.'}</p>
            <div className="overlay__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  setCameraProblem(null);
                  setMode(INPUT_MODES.POINTER);
                }}
              >
                Lanjut dengan mouse
              </button>
              <button type="button" className="btn" onClick={() => goTo(SCREENS.HAND_TEST)}>
                Kembali ke gerbang kamera
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <p className="visually-hidden" aria-live="assertive">
        {announcement}
      </p>
    </div>
  );
}
