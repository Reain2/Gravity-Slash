/**
 * Hud — nyawa, skor, combo, soal di tengah layar, bilah waktu, mute, pause.
 * Semua nilainya datang dari event engine; HUD tidak pernah membaca posisi orb.
 */

function LifeIcon({ filled }) {
  return <span className={`life ${filled ? 'life--on' : 'life--off'}`} aria-hidden="true" />;
}

function VolumeIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      {muted ? (
        <path
          d="M16 9l5 6M21 9l-5 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function PauseIcon({ paused }) {
  if (paused) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path d="M8 5l11 7-11 7z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
    </svg>
  );
}

export function Hud({
  lives = 0,
  maxLives = 3,
  score = 0,
  combo = 0,
  multiplier = 1,
  question = null,
  remainingMs = 0,
  totalMs = 0,
  muted = false,
  paused = false,
  onToggleMute,
  onTogglePause,
}) {
  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
  const low = ratio <= 0.3;

  return (
    <div className="hud">
      <div className="hud__top">
        <div className="hud__side hud__side--start">
          <p className="hud__label">Skor</p>
          <p className="hud__score tabular" aria-live="polite">
            {score}
          </p>
          {combo > 1 ? (
            <p className="hud__combo">
              <span className="hud__combo-count tabular">{combo}</span> beruntun
              {multiplier > 1 ? <span className="hud__multiplier">×{multiplier}</span> : null}
            </p>
          ) : (
            <p className="hud__combo hud__combo--idle">Belum ada beruntun</p>
          )}
        </div>

        <div className="hud__question" aria-live="polite">
          {question ? (
            <>
              <span className="hud__question-text tabular">{question.text}</span>
              <span className="hud__question-eq"> = ?</span>
            </>
          ) : (
            <span className="hud__question-wait">Siap-siap…</span>
          )}
        </div>

        <div className="hud__side hud__side--end">
          <p className="hud__label">Nyawa</p>
          <p className="hud__lives" role="status" aria-label={`${lives} nyawa tersisa`}>
            {Array.from({ length: maxLives }, (_, index) => (
              <LifeIcon key={index} filled={index < lives} />
            ))}
          </p>
          <div className="hud__buttons">
            <button
              type="button"
              className="icon-btn"
              onClick={onToggleMute}
              aria-pressed={muted}
              aria-label={muted ? 'Nyalakan suara' : 'Bisukan suara'}
              title={muted ? 'Nyalakan suara' : 'Bisukan suara'}
            >
              <VolumeIcon muted={muted} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={onTogglePause}
              aria-pressed={paused}
              aria-label={paused ? 'Lanjutkan permainan' : 'Jeda permainan'}
              title={paused ? 'Lanjutkan (Esc)' : 'Jeda (Esc)'}
            >
              <PauseIcon paused={paused} />
            </button>
          </div>
        </div>
      </div>

      <div className="hud__timer" role="presentation">
        <div
          className={`hud__timer-fill ${low ? 'hud__timer-fill--low' : ''}`}
          style={{ transform: `scaleX(${ratio})` }}
        />
        <span className="hud__timer-value tabular">{secondsLeft}s</span>
      </div>
    </div>
  );
}

export default Hud;
