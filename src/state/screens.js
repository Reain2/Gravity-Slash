/**
 * Daftar layar aplikasi. Dipakai store dan App.jsx.
 * Urutan mengikuti diagram di ARCHITECTURE.md bagian 4.
 */
export const SCREENS = {
  OPENING: 'OPENING',
  HAND_TEST: 'HAND_TEST',
  INTRO: 'INTRO',
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER',
  NAME_ENTRY: 'NAME_ENTRY',
  LEADERBOARD: 'LEADERBOARD',
  PHOTO: 'PHOTO',
};

/** Mode input yang dipakai pemain. */
export const INPUT_MODES = {
  POINTER: 'pointer', // mouse / sentuh
  HAND: 'hand', // kamera + MediaPipe
};
