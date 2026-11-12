import { useState } from 'react';
import { AsciiBackdrop } from '../components/Backgrounds.jsx';
import { DEFAULT_NAME, NAME_MAX, add, isStorageAvailable, sanitizeName } from '../services/storage.js';
import { SCREENS } from '../state/screens.js';
import { useUi, useUiActions } from '../state/uiStore.jsx';

/**
 * F8 T-090 — Input nama lalu simpan ke leaderboard.
 * Nama dikosongkan → dipakai PEMAIN. Maksimal 12 karakter (PRD bagian 8).
 * Latar gradien ASCII bentuk `rise`: cahaya naik, menemani langkah lanjut.
 */
export default function NameEntry() {
  const { lastResult } = useUi();
  const { goTo } = useUiActions();
  const [name, setName] = useState('');
  const [warning, setWarning] = useState('');
  const storageReady = isStorageAvailable();

  function handleSubmit(event) {
    event.preventDefault();
    const result = add({ name: sanitizeName(name), score: lastResult.score });
    if (!result.ok) {
      setWarning('Skor tidak bisa disimpan karena penyimpanan browser tidak tersedia. Kamu tetap bisa lanjut.');
    }
    goTo(SCREENS.LEADERBOARD);
  }

  return (
    <div className="screen">
      <AsciiBackdrop shape="rise" />
      <div className="screen__content">
        <p className="kicker">Simpan skor</p>
        <h1 className="name__title">Namamu untuk papan skor</h1>

        <div className="panel name__panel">
          <p className="muted">
            Skor <strong className="tabular">{lastResult.score}</strong> siap disimpan.
          </p>

          <form className="name__form" onSubmit={handleSubmit}>
            <label className="name__label" htmlFor="player-name">
              Nama pemain (maksimal {NAME_MAX} karakter)
            </label>
            <input
              id="player-name"
              className="name__input"
              type="text"
              value={name}
              maxLength={NAME_MAX}
              autoComplete="off"
              spellCheck="false"
              placeholder={DEFAULT_NAME}
              onChange={(event) => setName(event.target.value)}
            />
            <p className="small muted">Kalau dikosongkan, namamu dicatat sebagai {DEFAULT_NAME}.</p>

            {!storageReady ? (
              <p className="name__warning" role="alert">
                Penyimpanan browser tidak tersedia. Skor ini tidak akan tersimpan setelah halaman
                ditutup.
              </p>
            ) : null}
            {warning ? (
              <p className="name__warning" role="alert">
                {warning}
              </p>
            ) : null}

            <div className="name__actions">
              <button type="submit" className="btn btn--primary">
                Simpan
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => goTo(SCREENS.MENU)}>
                Lewati
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
