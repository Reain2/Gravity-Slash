/**
 * FlashOverlay — umpan balik iris.
 * Flash benar/bahaya/nyawa, plus teks "JAWABAN SALAH" dan angka pengurang
 * skor tepat di titik iris (PRD 7.2).
 */

const TEXT = {
  wrong: 'JAWABAN SALAH',
  timeout: 'WAKTU HABIS',
  bomb: 'ORB BAHAYA',
  heal: 'NYAWA BERTAMBAH',
  correct: 'BENAR',
};

export function FlashOverlay({ feedback }) {
  if (!feedback) return null;

  const { type, at, penalty } = feedback;
  const style =
    at && Number.isFinite(at.x) && Number.isFinite(at.y)
      ? { left: `${at.x * 100}%`, top: `${at.y * 100}%` }
      : undefined;

  return (
    <div className={`flash flash--${type}`} aria-hidden="true">
      <div className="flash__veil" />
      {TEXT[type] ? (
        <p className="flash__text" lang={type === 'wrong' || type === 'timeout' ? 'id' : 'en'}>
          {TEXT[type]}
        </p>
      ) : null}
      {type === 'wrong' && penalty ? (
        <span className="flash__penalty tabular" style={style}>
          −{penalty}
        </span>
      ) : null}
      {type === 'correct' && at ? <span className="flash__mark" style={style} /> : null}
      {type === 'bomb' && at ? <span className="flash__mark flash__mark--bomb" style={style} /> : null}
    </div>
  );
}

export default FlashOverlay;
