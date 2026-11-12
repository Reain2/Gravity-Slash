import { useMemo } from 'react';
import { GhostFibersBackdrop } from '../components/Backgrounds.jsx';
import CameraPreview, { useCameraPreview } from '../components/CameraPreview.jsx';
import { getTop } from '../services/storage.js';
import { INPUT_MODES, SCREENS } from '../state/screens.js';
import { useMuteToggle, useUi, useUiActions } from '../state/uiStore.jsx';

/**
 * F7 T-086 — Menu. Hanya Main dan Leaderboard (TIDAK ada Pengaturan di v1).
 * Latar: GhostFibers (satu-satunya latar animasi di layar ini).
 *
 * Tata letak revisi (pemilik produk, 6 Nov 2026): DUA kolom di layar lebar.
 * Kolom kiri = identitas + aksi (judul, penjelasan, pratinjau kamera, tombol),
 * kolom kanan = papan skor sebagai panel tersendiri. Papan dipindah ke kanan
 * supaya punya ruang sendiri dan angkanya bisa besar — target yang dilihat
 * penonton tidak boleh berebut tempat dengan tombol. Di layar sempit (< 860px)
 * layout otomatis kembali satu kolom bertumpuk. Tidak ada label kecil di atas
 * judul; hierarki dibawa ukuran huruf dan warna aksen, bukan hiasan.
 */
export default function Menu() {
  const { mode, muted } = useUi();
  const { goTo } = useUiActions();
  const toggleMute = useMuteToggle();
  const withHand = mode === INPUT_MODES.HAND;

  // Pratinjau mentah supaya pemain bisa mengatur posisi tangan sebelum bermain.
  const video = useCameraPreview(withHand);

  // Dibaca sekali saat menu dipasang: papan hanya berubah setelah selesai bermain.
  const top = useMemo(() => getTop(5), []);
  const best = top[0] ?? null;

  return (
    <div className="screen menu">
      <GhostFibersBackdrop variant="menu" />

      <div className="menu__grid">
        <div className="menu__main">
          <h1 className="menu__title" lang="en">
            <span className="menu__title-word">Gravity</span>
            <span className="menu__title-word menu__title-word--accent">Slash</span>
          </h1>

          <p className="menu__lead">
            Satu soal, satu gelombang orb. Iris jawaban yang benar sebelum waktunya habis.
          </p>

          {withHand ? (
            <div className="menu__camera">
              {video ? (
                <CameraPreview video={video} />
              ) : (
                <p className="menu__camera-note small">Menunggu izin kamera…</p>
              )}
            </div>
          ) : null}

          <div className="menu__actions">
            <button
              type="button"
              className="btn btn--primary btn--big"
              onClick={() => goTo(SCREENS.PLAYING)}
            >
              Main
            </button>
            <button type="button" className="btn" onClick={() => goTo(SCREENS.PHOTO)}>
              Foto
            </button>
            <button type="button" className="btn" onClick={() => goTo(SCREENS.LEADERBOARD)}>
              Leaderboard
            </button>
          </div>

          <dl className="menu__facts">
            <div className="menu__fact">
              <dt>Mode input</dt>
              <dd>{withHand ? 'Kamera (ujung telunjuk)' : 'Mouse dan sentuh'}</dd>
            </div>
            <div className="menu__fact">
              <dt>Nyawa</dt>
              <dd>3</dd>
            </div>
            <div className="menu__fact">
              <dt>Waktu per soal</dt>
              <dd>10 detik</dd>
            </div>
          </dl>

          <div className="menu__meta">
            <button type="button" className="link-btn" onClick={() => goTo(SCREENS.HAND_TEST)}>
              Ubah mode input
            </button>
            <button type="button" className="link-btn" onClick={toggleMute} aria-pressed={muted}>
              {muted ? 'Nyalakan suara' : 'Bisukan suara'}
            </button>
            <button type="button" className="link-btn" onClick={() => goTo(SCREENS.OPENING)}>
              Kembali ke layar pembuka
            </button>
          </div>
        </div>

        <aside className="menu__aside">
          <section className="menu__board" aria-label="Papan skor">
            {best ? (
              <p className="menu__best">
                <span className="menu__aside-label">Skor terbaik</span>
                <span className="menu__best-score tabular">{best.score}</span>
                <span className="menu__best-name">{best.name}</span>
              </p>
            ) : (
              <p className="menu__best">
                <span className="menu__aside-label">Papan skor</span>
                <span className="menu__best-name">Belum ada skor — jadilah yang pertama.</span>
              </p>
            )}

            {best ? <p className="menu__challenge">Kalahkan skor ini</p> : null}

            {top.length > 1 ? (
              <ol className="menu__top" start={2}>
                {top.slice(1).map((entry, index) => (
                  <li key={`${entry.name}-${entry.date}`} className="menu__top-row">
                    <span className="menu__top-rank tabular">{index + 2}</span>
                    <span className="menu__top-name">{entry.name}</span>
                    <span className="menu__top-score tabular">{entry.score}</span>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>
        </aside>
      </div>

      {import.meta.env.DEV ? (
        <p className="menu__dev small">
          Pintasan dev: Alt+1…0 pindah layar, Alt+M kembali ke menu.
        </p>
      ) : null}
    </div>
  );
}
