/**
 * Leaderboard lokal + preferensi mute.
 *
 * Semua akses localStorage dibungkus try/catch (AGENTS.md bagian 7.7) supaya
 * game tetap jalan di mode privat, kalau kuota penuh, atau kalau data rusak.
 */

export const LEADERBOARD_KEY = 'gravityslash:leaderboard:v1';
export const MUTE_KEY = 'gravityslash:muted:v1';
export const LAST_SESSION_KEY = 'gravityslash:lastsession:v1';
export const MAX_ENTRIES = 10;
export const NAME_MAX = 12;
export const DEFAULT_NAME = 'PEMAIN';

/** Ambil localStorage kalau benar-benar bisa dipakai. */
function storage() {
  try {
    if (typeof window === 'undefined') return null;
    const ls = window.localStorage;
    if (!ls) return null;
    // Sentuh sekali: sebagian browser melempar error saat diakses.
    const probe = '__gravityslash_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

export function isStorageAvailable() {
  return storage() !== null;
}

function readRaw(key) {
  const ls = storage();
  if (!ls) return null;
  try {
    return ls.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key, value) {
  const ls = storage();
  if (!ls) return false;
  try {
    ls.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeRaw(key) {
  const ls = storage();
  if (!ls) return false;
  try {
    ls.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Nama pemain: dipangkas, satu spasi, maksimal 12 karakter. Kosong → PEMAIN. */
export function sanitizeName(raw) {
  const cleaned = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
  return cleaned.length > 0 ? cleaned : DEFAULT_NAME;
}

/**
 * Urutan papan skor: skor tertinggi dulu; skor sama → tanggal paling lama dulu
 * (PRD bagian 8).
 */
export function compareEntries(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  const ta = Date.parse(a.date);
  const tb = Date.parse(b.date);
  const va = Number.isFinite(ta) ? ta : 0;
  const vb = Number.isFinite(tb) ? tb : 0;
  return va - vb;
}

function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const score = Number(raw.score);
  if (!Number.isFinite(score)) return null;
  const date = typeof raw.date === 'string' ? raw.date : new Date(0).toISOString();
  return {
    name: sanitizeName(raw.name),
    score: Math.max(0, Math.floor(score)),
    date,
  };
}

/** Daftar top `limit`, sudah bersih dan terurut. Data rusak → daftar kosong. */
export function getTop(limit = MAX_ENTRIES) {
  const raw = readRaw(LEADERBOARD_KEY);
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map(normalizeEntry)
    .filter((entry) => entry !== null)
    .sort(compareEntries)
    .slice(0, Math.max(0, limit));
}

/** Papan belum penuh → semua skor masuk. Kalau penuh, harus mengalahkan peringkat 10. */
export function isHighScore(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return false;
  const top = getTop();
  if (top.length < MAX_ENTRIES) return true;
  return Math.max(0, Math.floor(value)) > top[top.length - 1].score;
}

export function add(entry) {
  const clean = normalizeEntry({
    name: entry?.name,
    score: entry?.score,
    date: entry?.date ?? new Date().toISOString(),
  });
  if (!clean) return { ok: false, entry: null, entries: getTop() };

  const entries = [...getTop(MAX_ENTRIES), clean].sort(compareEntries).slice(0, MAX_ENTRIES);
  const ok = writeRaw(LEADERBOARD_KEY, JSON.stringify(entries));
  return { ok, entry: clean, entries };
}

export function clear() {
  return removeRaw(LEADERBOARD_KEY);
}

export function readMuted() {
  return readRaw(MUTE_KEY) === '1';
}

export function writeMuted(muted) {
  return writeRaw(MUTE_KEY, muted ? '1' : '0');
}

/**
 * Snapshot sesi terakhir (PRD 14.3). Dipakai hanya untuk hiasan bingkai foto,
 * bukan leaderboard. Data rusak → `null`, bukan lemparan.
 */
function normalizeSession(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const score = Number(raw.score);
  if (!Number.isFinite(score)) return null;
  const level = Number(raw.level);
  const bestCombo = Number(raw.bestCombo);
  return {
    score: Math.max(0, Math.floor(score)),
    level: Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1,
    bestCombo: Number.isFinite(bestCombo) ? Math.max(0, Math.floor(bestCombo)) : 0,
    date: typeof raw.date === 'string' ? raw.date : new Date(0).toISOString(),
  };
}

export function saveLastSession(session) {
  const clean = normalizeSession({
    score: session?.score,
    level: session?.level,
    bestCombo: session?.bestCombo,
    date: session?.date ?? new Date().toISOString(),
  });
  if (!clean) return null;
  writeRaw(LAST_SESSION_KEY, JSON.stringify(clean));
  return clean;
}

export function readLastSession() {
  const raw = readRaw(LAST_SESSION_KEY);
  if (!raw) return null;
  try {
    return normalizeSession(JSON.parse(raw));
  } catch {
    return null;
  }
}
