import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { readMuted } from '../services/storage.js';
import { INPUT_MODES, SCREENS } from './screens.js';

/**
 * State UI ringan (React Context + useReducer, tanpa Zustand).
 * Data per-frame TIDAK boleh masuk ke sini (AGENTS.md bagian 7.1).
 *
 * State dan aksi dipisah supaya fungsi aksi stabil dan tidak memicu re-render
 * pada konsumen yang hanya butuh mengubah layar.
 */

const UiStateContext = createContext(null);
const UiActionsContext = createContext(null);

/** Layar awal: `#menu` dipakai ErrorBoundary untuk pemulihan. */
function initialScreen() {
  if (typeof window === 'undefined') return SCREENS.OPENING;
  if (window.location.hash === '#menu') return SCREENS.MENU;
  return SCREENS.OPENING;
}

const initialState = {
  screen: initialScreen(),
  mode: INPUT_MODES.POINTER,
  cameraStatus: 'idle',
  cameraMessage: '',
  muted: readMuted(),
  lastResult: { score: 0, level: 1, isHighScore: false },
};

export const ACTIONS = {
  GOTO: 'GOTO',
  SET_MODE: 'SET_MODE',
  SET_CAMERA: 'SET_CAMERA',
  SET_MUTED: 'SET_MUTED',
  SET_RESULT: 'SET_RESULT',
};

function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.GOTO:
      return state.screen === action.screen ? state : { ...state, screen: action.screen };
    case ACTIONS.SET_MODE:
      return state.mode === action.mode ? state : { ...state, mode: action.mode };
    case ACTIONS.SET_CAMERA:
      if (state.cameraStatus === action.status && state.cameraMessage === (action.message ?? '')) {
        return state;
      }
      return { ...state, cameraStatus: action.status, cameraMessage: action.message ?? '' };
    case ACTIONS.SET_MUTED:
      return state.muted === action.muted ? state : { ...state, muted: action.muted };
    case ACTIONS.SET_RESULT:
      return {
        ...state,
        lastResult: {
          score: action.score,
          level: action.level,
          isHighScore: action.isHighScore,
        },
      };
    default:
      return state;
  }
}

export function UiProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = useMemo(
    () => ({
      goTo: (screen) => dispatch({ type: ACTIONS.GOTO, screen }),
      setMode: (mode) => dispatch({ type: ACTIONS.SET_MODE, mode }),
      setCamera: (status, message = '') =>
        dispatch({ type: ACTIONS.SET_CAMERA, status, message }),
      setMuted: (muted) => dispatch({ type: ACTIONS.SET_MUTED, muted }),
      setResult: (score, level, isHighScore) =>
        dispatch({ type: ACTIONS.SET_RESULT, score, level, isHighScore }),
    }),
    []
  );

  return (
    <UiActionsContext.Provider value={actions}>
      <UiStateContext.Provider value={state}>{children}</UiStateContext.Provider>
    </UiActionsContext.Provider>
  );
}

/** State layar. Komponen yang memakainya akan ikut render saat state berubah. */
export function useUi() {
  const context = useContext(UiStateContext);
  if (!context) throw new Error('useUi harus dipakai di dalam <UiProvider>');
  return context;
}

/** Aksi saja. Stabil, jadi aman dipakai di dependency array. */
export function useUiActions() {
  const context = useContext(UiActionsContext);
  if (!context) throw new Error('useUiActions harus dipakai di dalam <UiProvider>');
  return context;
}

/** Toggle mute yang sekaligus menyimpan preferensi. */
export function useMuteToggle() {
  const { muted } = useUi();
  const { setMuted } = useUiActions();
  return useCallback(() => {
    const next = !muted;
    setMuted(next);
    return next;
  }, [muted, setMuted]);
}
