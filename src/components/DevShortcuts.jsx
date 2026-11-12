import { useEffect } from 'react';
import { SCREENS } from '../state/screens.js';
import { useUiActions } from '../state/uiStore.jsx';

/**
 * T-009: pintasan pengembangan untuk melompat antar layar.
 * Hanya aktif saat `import.meta.env.DEV`, dan tidak dirender di produksi.
 * Alt+1..9 → sembilan layar pertama di bawah, Alt+0 → layar kesepuluh.
 * Alt+M → Menu.
 */
const ORDER = [
  SCREENS.OPENING,
  SCREENS.HAND_TEST,
  SCREENS.INTRO,
  SCREENS.MENU,
  SCREENS.PLAYING,
  SCREENS.GAME_OVER,
  SCREENS.NAME_ENTRY,
  SCREENS.LEADERBOARD,
  SCREENS.PHOTO,
];

export function DevShortcuts() {
  const { goTo } = useUiActions();

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;

    function onKeyDown(event) {
      if (!event.altKey || event.metaKey || event.ctrlKey) return;
      const key = event.key.toLowerCase();
      if (key === 'm') {
        goTo(SCREENS.MENU);
        return;
      }
      const index = key === '0' ? 9 : Number(key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < ORDER.length) {
        goTo(ORDER[index]);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goTo]);

  return null;
}

export default DevShortcuts;
