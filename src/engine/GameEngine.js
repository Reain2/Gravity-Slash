/**
 * GameEngine — loop game, tanpa React (ARCHITECTURE bagian 7.1).
 *
 * Semua posisi dalam satuan ternormalisasi. `dt` selalu dalam detik sehingga
 * kecepatan tidak bergantung FPS. UI hanya menerima event ringan.
 */

import { CONFIG, levelForCorrect, questionTimeMs } from '../config/gameConfig.js';
import { createTrailPool } from '../input/slashTrail.js';
import { findSlicedOrb } from './collision.js';
import { isOffscreen, markSliced, ORB_KINDS, resetOrbIds, updateOrb } from './Orb.js';
import { createParticleField } from './particles.js';
import { createRenderer } from './renderer.js';
import * as scoring from './scoring.js';
import { createSpawner } from './Spawner.js';

export const STATUS = {
  IDLE: 'idle',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  PAUSED: 'paused',
  OVER: 'over',
};

export const PAUSE_REASON = {
  USER: 'user',
  HIDDEN: 'hidden',
  HAND: 'hand',
};

const MAX_FRAME_DT = 0.1;
const TIMER_EMIT_MS = 50;
const HAND_RESUME_TICKS = 4;
const WATCH_INTERVAL_MS = 150;

export function createGameEngine({ canvas, input, onEvent, rng = Math.random, spawner = createSpawner() }) {
  const renderer = createRenderer(canvas);
  const particles = createParticleField();
  const trails = createTrailPool({
    maxPoints: CONFIG.slash.trailLength,
    maxAgeMs: CONFIG.slash.trailMaxAgeMs,
  });

  const emit = typeof onEvent === 'function' ? onEvent : () => {};

  let status = STATUS.IDLE;
  let pauseReason = '';
  let score = scoring.createScoreState();
  let question = null;
  let questionId = 0;
  let orbs = [];
  let timeLimitMs = 0;
  let timeLeftMs = 0;
  let countdownLeftMs = 0;
  let lastCountdownEmit = -1;
  let lastTimerEmit = 0;
  let handLostMs = 0;
  let handBackTicks = 0;
  let shake = 0;
  let rafHandle = null;
  let watchHandle = null;
  let lastFrame = 0;
  let destroyed = false;

  function emitScore() {
    emit('scoreChanged', {
      score: score.score,
      combo: score.combo,
      multiplier: score.multiplier,
    });
  }

  function emitLives() {
    emit('livesChanged', { lives: score.lives, max: CONFIG.lives.max });
  }

  function emitTimer() {
    emit('timerChanged', { remainingMs: timeLeftMs, totalMs: timeLimitMs });
  }

  function level() {
    return levelForCorrect(score.correctStreak);
  }

  /** Soal baru + gelombang baru; orb lama ditandai memudar dan tidak dinilai lagi. */
  function nextQuestion() {
    questionId += 1;
    for (const orb of orbs) {
      if (!orb.sliced) markSliced(orb);
    }

    const wave = spawner.nextWave({ level: level(), lives: score.lives, rng });
    question = wave.question;
    const created = wave.orbs.map((orb) => ({ ...orb, questionId }));
    orbs = [...created, ...orbs];

    timeLimitMs = questionTimeMs(level());
    timeLeftMs = timeLimitMs;
    lastTimerEmit = 0;

    emit('questionChanged', { question });
    emitTimer();
  }

  function sliceOrb(orb, at) {
    if (orb.sliced) return;
    const scored = orb.questionId === questionId;
    markSliced(orb);
    // Bunyi slash menandai setiap orb yang benar-benar teriris — termasuk sisa
    // gelombang lama yang tidak memberi skor — jadi bunyinya selalu sinkron
    // dengan potongan yang terlihat pemain.
    emit('sliced', { at, kind: orb.kind });

    if (!scored) return; // sisa gelombang lama: tidak menambah atau mengurangi apa pun

    switch (orb.kind) {
      case ORB_KINDS.BOMB: {
        score = scoring.applyBomb(score);
        shake = 1;
        particles.burst(at.x, at.y, {
          count: 18,
          color: readColor('--orb-danger', '#b3001b'),
          speed: 0.6,
        });
        emit('feedback', { type: 'bomb', at });
        emitLives();
        if (score.lives <= 0) gameOver();
        break;
      }
      case ORB_KINDS.HEAL: {
        score = scoring.applyHeal(score);
        particles.burst(at.x, at.y, {
          count: 16,
          color: readColor('--orb-heal', '#ff77bc'),
          speed: 0.4,
        });
        emit('feedback', { type: 'heal', at });
        emitLives();
        break;
      }
      default: {
        if (orb.isCorrect) {
          score = scoring.applyCorrect(score);
          particles.burst(at.x, at.y, {
            count: 26,
            color: readColor('--orb-answer', '#f0f0f0'),
            speed: 0.55,
          });
          emit('feedback', { type: 'correct', at });
          emitScore();
          nextQuestion();
        } else {
          score = scoring.applyWrong(score);
          emit('feedback', { type: 'wrong', at, penalty: score.lastPenalty ?? 0 });
          emitScore();
        }
      }
    }
  }

  /** Timer habis atau orb benar lolos layar (PRD 5.5). */
  function questionFailed(reason) {
    score = scoring.applyQuestionFailed(score);
    emit('feedback', { type: 'timeout', reason });
    emitScore();
    emitLives();
    if (score.lives <= 0) {
      gameOver();
      return;
    }
    nextQuestion();
  }

  function gameOver() {
    status = STATUS.OVER;
    stopLoop();
    emit('gameOver', {
      score: score.score,
      correctStreak: score.correctStreak,
      level: level(),
    });
  }

  function update(dt, now) {
    // Pause otomatis saat tangan hilang (PRD 5.3, Q-06).
    if (input.mode === 'hand') {
      if (input.handPresent) {
        handLostMs = 0;
      } else {
        handLostMs += dt * 1000;
        if (handLostMs > CONFIG.hand.lostGraceMs) {
          pause(PAUSE_REASON.HAND);
          return;
        }
      }
    }

    const pointers = input.read(dt);

    const activeIds = new Set();
    for (const pointer of pointers) {
      activeIds.add(pointer.id);
      trails.get(pointer.id).push(pointer.x, pointer.y, now);
    }
    trails.retain(activeIds, now);

    // Iris: segmen pointer vs lingkaran orb, wajib melewati ambang kecepatan.
    for (const pointer of pointers) {
      const orb = findSlicedOrb(pointer, orbs, CONFIG.slash.minSpeed);
      if (orb) sliceOrb(orb, { x: pointer.x, y: pointer.y });
    }

    // Fisika + pembuangan orb.
    let escapedCorrect = false;
    const survivors = [];
    for (const orb of orbs) {
      const alive = updateOrb(orb, dt);
      if (!alive) continue;
      if (isOffscreen(orb)) {
        if (
          !orb.sliced &&
          orb.kind === ORB_KINDS.ANSWER &&
          orb.isCorrect &&
          orb.questionId === questionId
        ) {
          escapedCorrect = true;
        }
        continue;
      }
      survivors.push(orb);
    }
    orbs = survivors;

    particles.update(dt);
    shake = Math.max(0, shake - dt * 3);

    if (escapedCorrect) {
      questionFailed('escaped');
      return;
    }

    if (status !== STATUS.PLAYING) return;

    // Timer soal: berhenti saat pause (loop memang berhenti), reset tiap soal.
    timeLeftMs -= dt * 1000;
    if (timeLeftMs <= 0) {
      timeLeftMs = 0;
      emitTimer();
      questionFailed('timeout');
      return;
    }
    if (now - lastTimerEmit >= TIMER_EMIT_MS) {
      lastTimerEmit = now;
      emitTimer();
    }
  }

  function render(now) {
    renderer.draw({
      now,
      orbs,
      particles: particles.items,
      trails: trails.list(),
      shake,
      windowMs: CONFIG.slash.trailMaxAgeMs,
    });
  }

  function frame(now) {
    if (destroyed) return;
    if (status !== STATUS.PLAYING && status !== STATUS.COUNTDOWN) return;

    rafHandle = requestAnimationFrame(frame);
    const dt = Math.min(MAX_FRAME_DT, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;

    if (status === STATUS.COUNTDOWN) {
      countdownLeftMs -= dt * 1000;
      const secondsLeft = Math.max(0, Math.ceil(countdownLeftMs / 1000));
      if (secondsLeft !== lastCountdownEmit) {
        lastCountdownEmit = secondsLeft;
        emit('countdownChanged', { remainingSec: secondsLeft });
      }
      if (countdownLeftMs <= 0) {
        // Timer soal baru mulai setelah countdown selesai (T-059).
        status = STATUS.PLAYING;
        nextQuestion();
      }
      render(now);
      return;
    }

    update(dt, now);
    render(now);
  }

  function startLoop() {
    if (rafHandle !== null || destroyed) return;
    lastFrame = performance.now();
    rafHandle = requestAnimationFrame(frame);
  }

  function stopLoop() {
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
  }

  function startHandWatcher() {
    stopHandWatcher();
    handBackTicks = 0;
    watchHandle = window.setInterval(() => {
      if (status !== STATUS.PAUSED || pauseReason !== PAUSE_REASON.HAND) {
        stopHandWatcher();
        return;
      }
      if (input.handPresent) {
        handBackTicks += 1;
        if (handBackTicks >= HAND_RESUME_TICKS) resume();
      } else {
        handBackTicks = 0;
      }
    }, WATCH_INTERVAL_MS);
  }

  function stopHandWatcher() {
    if (watchHandle !== null) {
      window.clearInterval(watchHandle);
      watchHandle = null;
    }
  }

  function pause(reason = PAUSE_REASON.USER) {
    if (status !== STATUS.PLAYING) return;
    status = STATUS.PAUSED;
    pauseReason = reason;
    stopLoop();
    emit('paused', { reason });
    if (reason === PAUSE_REASON.HAND) startHandWatcher();
  }

  function resume() {
    if (status !== STATUS.PAUSED) return;
    stopHandWatcher();
    status = STATUS.PLAYING;
    pauseReason = '';
    handLostMs = 0;
    emit('resumed', {});
    startLoop();
  }

  function handleVisibility() {
    if (typeof document === 'undefined') return;
    if (document.hidden) pause(PAUSE_REASON.HIDDEN);
  }

  function handleResize() {
    renderer.resize();
    render(performance.now());
  }

  return {
    get status() {
      return status;
    },
    get pauseReason() {
      return pauseReason;
    },
    get score() {
      return { ...score };
    },
    get question() {
      return question;
    },
    get orbs() {
      return orbs;
    },

    start() {
      if (destroyed) return;
      resetOrbIds();
      spawner.reset();
      score = scoring.createScoreState();
      question = null;
      questionId = 0;
      orbs = [];
      particles.clear();
      trails.clear();
      shake = 0;
      handLostMs = 0;
      status = STATUS.COUNTDOWN;
      countdownLeftMs = CONFIG.countdown.sec * 1000;
      lastCountdownEmit = -1;

      renderer.resize();
      emitLives();
      emitScore();
      emit('countdownChanged', { remainingSec: CONFIG.countdown.sec });
      emit('started', {});
      startLoop();
    },

    pause,
    resume,

    /** Dipakai tombol pause: paused → lanjut, playing → pause. */
    togglePause() {
      if (status === STATUS.PLAYING) pause(PAUSE_REASON.USER);
      else if (status === STATUS.PAUSED) resume();
    },

    resize: handleResize,

    syncTokens() {
      renderer.refreshTokens();
    },

    destroy() {
      destroyed = true;
      stopLoop();
      stopHandWatcher();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      renderer.destroy();
      orbs = [];
      particles.clear();
      trails.clear();
      status = STATUS.IDLE;
    },

    /** Dipasang sekali dari layar Game. */
    attach() {
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibility);
      }
      window.addEventListener('resize', handleResize);
      renderer.resize();
    },
  };
}

/** Baca token warna dari CSS; renderer punya fallback-nya sendiri juga. */
function readColor(name, fallback) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name);
  return (value || '').trim() || fallback;
}
