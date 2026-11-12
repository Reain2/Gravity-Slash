import { BlurTitle, FluxLinesBackdrop } from '../components/Backgrounds.jsx';
import { SCREENS } from '../state/screens.js';
import { useUi, useUiActions } from '../state/uiStore.jsx';

/**
 * F6 T-074 / F7 T-085 — Layar game over.
 * Teks GAME OVER memakai Blur Text. Skor yang masuk top 10 ditawarkan untuk
 * disimpan ke leaderboard.
 *
 * Latar: FluxLines (aliran violet→pink yang bergerak terus). Sebelumnya Gradient
 * ASCII `eclipse` — gradien tenang yang terbaca sebagai layar diam, sehingga
 * pemain bingung "ini apa" (revisi pemilik produk, 4 Nov 2026).
 */
export default function GameOver() {
  const { lastResult } = useUi();
  const { goTo } = useUiActions();

  return (
    <div className="screen gameover">
      <FluxLinesBackdrop />
      <div className="screen__content gameover__content">
        <BlurTitle text="GAME OVER" className="gameover__title" />

        <div className="panel gameover__panel">
          <p className="kicker">Skor akhir</p>
          <p className="gameover__score tabular">{lastResult.score}</p>
          <p className="muted">Mencapai level {lastResult.level}</p>

          {lastResult.isHighScore ? (
            <p className="gameover__badge">Skor ini masuk 10 besar di perangkat ini.</p>
          ) : (
            <p className="small muted">Skor ini belum masuk 10 besar. Coba lagi, ya.</p>
          )}
        </div>

        <div className="gameover__actions">
          <button type="button" className="btn btn--primary" onClick={() => goTo(SCREENS.PLAYING)}>
            Main lagi
          </button>
          {lastResult.isHighScore ? (
            <button
              type="button"
              className="btn btn--accent"
              onClick={() => goTo(SCREENS.NAME_ENTRY)}
            >
              Simpan skor
            </button>
          ) : null}
          <button type="button" className="btn btn--ghost" onClick={() => goTo(SCREENS.MENU)}>
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}
