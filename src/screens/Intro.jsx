import { useEffect } from 'react';
import { ParticleTitle } from '../components/Backgrounds.jsx';
import { SCREENS } from '../state/screens.js';
import { useUiActions } from '../state/uiStore.jsx';
import { useReducedMotion } from '../utils/env.js';

/**
 * Lama intro ditahan. Cukup panjang supaya judul partikel menyatu (gather
 * 1500ms + stagger 380ms) dan tiga aturan sempat terbaca, tapi tidak sampai
 * pemain menunggu. Bilah durasi di bawah menunjukkan sisa waktunya.
 */
const HOLD_MS = 8200;

/**
 * F7 T-083/T-084 — Intro GRAVITY SLASH.
 * Satu momen gerak utama aplikasi. Setelah animasi selesai (atau dilewati),
 * pindah ke Menu. Versi reduksi gerak memakai judul statis dan durasi singkat.
 */
export default function Intro() {
  const { goTo } = useUiActions();
  const reduced = useReducedMotion();

  useEffect(() => {
    const holdMs = reduced ? 1600 : HOLD_MS;
    const timer = window.setTimeout(() => goTo(SCREENS.MENU), holdMs);
    return () => window.clearTimeout(timer);
  }, [goTo, reduced]);

  return (
    <div className="screen intro">
      {/* Komposisi 60-30-10: malam (dominan) — violet (pendukung) — pink (aksen). */}
      <div className="intro__field" aria-hidden="true">
        <span className="intro__slash intro__slash--1" />
        <span className="intro__slash intro__slash--2" />
        <span className="intro__band intro__band--support" />
        <span className="intro__band intro__band--accent" />
      </div>

      <div className="intro__content">
        <div className="intro__hero">
          <ParticleTitle text="GRAVITY SLASH" />
        </div>

        <div className="intro__brief">
          <p className="intro__sub">Hitung cepat. Iris orb yang benar. Hindari orb bahaya.</p>

          <ol className="intro__rules">
            <li>
              <span className="intro__rule-index tabular">1</span>
              <span>Satu soal muncul, lalu satu gelombang orb jatuh melintasi layar.</span>
            </li>
            <li>
              <span className="intro__rule-index tabular">2</span>
              <span>Iris orb yang angka jawabannya benar sebelum waktu soal habis.</span>
            </li>
            <li>
              <span className="intro__rule-index tabular">3</span>
              <span>Waktu habis atau orb benar terlewat: beruntun putus, nyawa berkurang.</span>
            </li>
          </ol>

          <div className="intro__foot">
            <div
              className="intro__progress"
              style={{ '--intro-hold': `${HOLD_MS}ms` }}
              role="presentation"
            >
              <span className="intro__progress-fill" />
            </div>
            <button type="button" className="btn btn--ghost" onClick={() => goTo(SCREENS.MENU)}>
              Lewati
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
