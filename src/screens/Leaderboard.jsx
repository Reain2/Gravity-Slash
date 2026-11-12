import { useState } from 'react';
import GlyphRain from '../components/GlyphRain.jsx';
import { clear, getTop, isStorageAvailable } from '../services/storage.js';
import { SCREENS } from '../state/screens.js';
import { useUiActions } from '../state/uiStore.jsx';

/**
 * F8 T-093/T-094 — Leaderboard lokal top 10.
 * Latar: GlyphRain (efek original). Tombol hapus data memakai konfirmasi dua langkah.
 */
export default function Leaderboard() {
  const { goTo } = useUiActions();
  const [entries, setEntries] = useState(() => getTop());
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState('');
  const storageReady = isStorageAvailable();

  function handleClear() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    const ok = clear();
    setEntries(getTop());
    setConfirming(false);
    setNotice(ok ? 'Data leaderboard sudah dihapus.' : 'Data leaderboard gagal dihapus.');
  }

  return (
    <div className="screen leaderboard">
      <div className="screen__bg" aria-hidden="true">
        <GlyphRain />
      </div>

      <div className="screen__content">
        <p className="kicker">Papan skor lokal</p>
        <h1 className="leaderboard__title">Leaderboard</h1>

        <div className="panel leaderboard__panel">
          {entries.length === 0 ? (
            <p className="muted">
              Belum ada skor di perangkat ini. Selesaikan satu permainan lalu simpan skormu.
            </p>
          ) : (
            <ol className="leaderboard__list">
              {entries.map((entry, index) => (
                <li className="leaderboard__row" key={`${entry.name}-${entry.date}-${index}`}>
                  <span className="leaderboard__rank tabular">{index + 1}</span>
                  <span className="leaderboard__name">{entry.name}</span>
                  <span className="leaderboard__date small muted">
                    {formatDate(entry.date)}
                  </span>
                  <span className="leaderboard__score tabular">{entry.score}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {!storageReady ? (
          <p className="small muted" role="alert">
            Penyimpanan browser tidak tersedia, jadi skor hanya bertahan selama halaman ini terbuka.
          </p>
        ) : null}
        {notice ? (
          <p className="small" role="status">
            {notice}
          </p>
        ) : null}

        <div className="leaderboard__actions">
          <button type="button" className="btn btn--primary" onClick={() => goTo(SCREENS.MENU)}>
            Kembali
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={handleClear}
            disabled={entries.length === 0}
          >
            {confirming ? 'Tekan lagi untuk hapus' : 'Hapus data'}
          </button>
        </div>
        <p className="small muted">
          Skor disimpan di browser ini saja. Tidak ada yang dikirim ke mana pun.
        </p>
      </div>
    </div>
  );
}

function formatDate(iso) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return '—';
  try {
    return new Date(time).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}
