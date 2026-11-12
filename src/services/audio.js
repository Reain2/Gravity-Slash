/**
 * Audio memakai Web Audio API tanpa Howler (AGENTS.md bagian 3).
 *
 * F9 (aset audio) belum diisi: pemilik produk akan mengimpor berkasnya sendiri
 * ke `public/audio/`. Modul ini sudah siap dan **tidak boleh gagal** kalau
 * berkasnya belum ada — semua kegagalan ditelan diam-diam supaya game tetap
 * jalan.
 */

import { CONFIG } from '../config/gameConfig.js';
import { readMuted, writeMuted } from './storage.js';

export const SFX_NAMES = ['slash', 'correct', 'wrong', 'bomb', 'heal', 'gameOver'];
export const MUSIC_NAME = 'music';

/** Nama berkas yang diharapkan ada di `public/audio/`. */
export const AUDIO_FILES = {
  slash: '/audio/slash.mp3',
  correct: '/audio/correct.mp3',
  wrong: '/audio/wrong.mp3',
  bomb: '/audio/bomb.mp3',
  heal: '/audio/heal.mp3',
  gameOver: '/audio/game-over.mp3',
  music: '/audio/music.mp3',
};

let context = null;
let masterGain = null;
let unlocked = false;
let muted = readMuted();
let musicSource = null;
let musicGain = null;
// Penanda generasi: `startMusic` memuat buffer secara asinkron, jadi layar bisa
// sudah dilepas sebelum buffer siap. Tanpa penanda ini, musik bisa mulai berbunyi
// setelah `stopMusic` dipanggil.
let musicToken = 0;

const buffers = new Map();

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = Boolean(value);
  writeMuted(muted);
  if (masterGain && context) {
    masterGain.gain.setTargetAtTime(muted ? 0 : 1, context.currentTime, 0.01);
  }
  return muted;
}

export function toggleMuted() {
  return setMuted(!muted);
}

/** Harus dipanggil dari gestur pengguna (klik/tap) sekali sebelum bunyi apa pun. */
export async function unlock() {
  if (unlocked) return context;
  if (typeof window === 'undefined') return null;

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;

  try {
    context = new AudioCtor();
    masterGain = context.createGain();
    masterGain.gain.value = muted ? 0 : 1;
    masterGain.connect(context.destination);
    if (context.state === 'suspended') await context.resume();
    unlocked = true;
    void preload();
    return context;
  } catch {
    context = null;
    masterGain = null;
    return null;
  }
}

async function loadBuffer(url) {
  if (!context) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.arrayBuffer();
    return await context.decodeAudioData(data);
  } catch {
    return null;
  }
}

/** Memuat efek di latar belakang; berkas yang belum ada cukup dilewati. */
export async function preload() {
  if (!context) return;
  await Promise.all(
    SFX_NAMES.map(async (name) => {
      if (buffers.has(name)) return;
      const buffer = await loadBuffer(AUDIO_FILES[name]);
      if (buffer) buffers.set(name, buffer);
    })
  );
}

export function play(name, { volume, rate = 1 } = {}) {
  if (muted || !context || !masterGain) return false;
  const buffer = buffers.get(name);
  if (!buffer) return false;
  const level = volume ?? CONFIG.audio.sfx[name] ?? 1;
  try {
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    gain.gain.value = level;
    source.connect(gain);
    gain.connect(masterGain);
    source.start();
    return true;
  } catch {
    return false;
  }
}

export async function startMusic({ volume = 0.35, loop = true } = {}) {
  if (!context || musicSource) return false;
  const token = ++musicToken;
  let buffer = buffers.get(MUSIC_NAME);
  if (!buffer) {
    buffer = await loadBuffer(AUDIO_FILES[MUSIC_NAME]);
    if (buffer) buffers.set(MUSIC_NAME, buffer);
  }
  // Layar sudah dilepas (atau musik lain diminta) saat buffer selesai dimuat.
  if (token !== musicToken || !buffer) return false;
  try {
    musicSource = context.createBufferSource();
    musicSource.buffer = buffer;
    musicSource.loop = loop;
    musicGain = context.createGain();
    musicGain.gain.value = volume;
    musicSource.connect(musicGain);
    musicGain.connect(masterGain);
    musicSource.start();
    return true;
  } catch {
    musicSource = null;
    musicGain = null;
    return false;
  }
}

export function stopMusic() {
  musicToken += 1;
  if (!musicSource) return;
  try {
    musicSource.stop();
  } catch {
    /* sudah berhenti */
  }
  musicSource = null;
  musicGain = null;
}

/** Dipakai layar agar tidak ada bunyi tertinggal saat berpindah layar. */
export function reset() {
  stopMusic();
}
