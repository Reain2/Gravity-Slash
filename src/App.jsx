import { useEffect, useState } from 'react';
import DevShortcuts from './components/DevShortcuts.jsx';
import { preloadBackdrops, SCREEN_CHUNKS } from './components/reactbitsLoaders.js';
import * as audio from './services/audio.js';
import { SCREENS } from './state/screens.js';
import { useUi } from './state/uiStore.jsx';
import { useReducedMotion } from './utils/env.js';
import HandTest from './screens/HandTest.jsx';
import Game from './screens/Game.jsx';
import GameOver from './screens/GameOver.jsx';
import Intro from './screens/Intro.jsx';
import Leaderboard from './screens/Leaderboard.jsx';
import Menu from './screens/Menu.jsx';
import NameEntry from './screens/NameEntry.jsx';
import Opening from './screens/Opening.jsx';
import Photo from './screens/Photo.jsx';

/**
 * Router layar + transisi.
 *
 * Perpindahan layar tidak boleh terasa seperti potongan keras: tirai slash
 * menyapu menutupi layar lama, layar baru dipasang saat tirai menutup penuh,
 * lalu tirai membuka lagi. `prefers-reduced-motion` melewati tirai sepenuhnya.
 */
const ROUTES = {
  [SCREENS.OPENING]: Opening,
  [SCREENS.HAND_TEST]: HandTest,
  [SCREENS.INTRO]: Intro,
  [SCREENS.MENU]: Menu,
  [SCREENS.PLAYING]: Game,
  [SCREENS.GAME_OVER]: GameOver,
  [SCREENS.NAME_ENTRY]: NameEntry,
  [SCREENS.LEADERBOARD]: Leaderboard,
  [SCREENS.PHOTO]: Photo,
};

/**
 * Durasi tirai. Harus SAMA dengan animasi terpanjang di `ui.css` (`.sweep--*`):
 * kalau waktu tunggu lebih pendek, tirai sudah dibalik sebelum sapuannya
 * selesai dan gerakannya terlihat terpotong. Nilai ini pasangan dari blok
 * `.sweep` di `ui.css` — ubah keduanya bersama.
 */
const COVER_MS = 440;
const REVEAL_MS = 400;

export default function App() {
  const { screen } = useUi();
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(screen);
  const [phase, setPhase] = useState('idle');

  // Panaskan chunk latar layar TUJUAN selagi tirai menutup.
  //
  // Ini bukan sekadar memanaskan unduhan: `loadBackdrop` juga MENYIMPAN
  // komponennya, jadi saat layar baru dipasang (COVER_MS kemudian) komponennya
  // sudah siap dan kanvasnya masuk DOM di frame yang sama dengan pergantian
  // layar. Tanpanya layar baru sempat menampilkan latar statis lebih dulu —
  // "kecut" yang dilaporkan pemilik produk (revisi 4 Nov 2026). Alasan lengkap
  // (kenapa bukan `lazy()` + `<Suspense>`) ada di `reactbitsLoaders.js`.
  useEffect(() => {
    preloadBackdrops(...(SCREEN_CHUNKS[screen] ?? []));
  }, [screen]);

  // Audio hanya boleh dibunyikan setelah gestur pertama (aturan autoplay
  // browser). Pemantau ini menangkap gestur pertama di layar mana pun, jadi
  // alur mode kamera — yang tidak pernah menyentuh canvas game — ikut ter-unlock.
  useEffect(() => {
    let unlockedOnce = false;
    const onFirstGesture = () => {
      if (unlockedOnce) return;
      unlockedOnce = true;
      // Musik latar untuk SELURUH sesi (permintaan pemilik produk, 7 Nov 2026):
      // mulai setelah gestur pertama dan tidak berhenti saat layar berganti,
      // termasuk selama bermain. `startMusic` menjaga agar tidak dobel.
      void audio.unlock().then(() => {
        void audio.startMusic();
      });
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };
    window.addEventListener('pointerdown', onFirstGesture);
    window.addEventListener('keydown', onFirstGesture);
    return () => {
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };
  }, []);

  // Layar tujuan berubah → mulai menutup. Perubahan fase dijadwalkan pada frame
  // berikutnya (`requestAnimationFrame`) supaya tidak ada setState sinkron di
  // badan efek. Selama satu frame itu layar lama masih tampil apa adanya, jadi
  // tidak ada kedipan sebelum tirai bergerak.
  useEffect(() => {
    if (screen === shown) return undefined;
    const frame = window.requestAnimationFrame(() => {
      if (reduced) {
        setShown(screen);
      } else {
        setPhase('cover');
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [screen, shown, reduced]);

  // Tirai menutup penuh → pasang layar baru → buka tirai. Isi layar baru
  // dianimasikan oleh kelas `app--reveal` (lihat `ui.css`), jadi masuknya tidak
  // terasa mendadak walau tirai sudah mulus.
  useEffect(() => {
    if (phase === 'cover') {
      const timer = window.setTimeout(() => {
        setShown(screen);
        setPhase('reveal');
      }, COVER_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase === 'reveal') {
      const timer = window.setTimeout(() => setPhase('idle'), REVEAL_MS);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [phase, screen]);

  const Screen = ROUTES[shown] ?? Opening;

  return (
    <div className={`app${phase === 'reveal' ? ' app--reveal' : ''}`}>
      <div className="app__screen" key={shown}>
        <Screen />
      </div>
      <div className={`sweep sweep--${phase}`} aria-hidden="true">
        <span className="sweep__band sweep__band--support" />
        <span className="sweep__band sweep__band--accent" />
      </div>
      <DevShortcuts />
    </div>
  );
}
