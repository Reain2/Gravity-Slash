import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/tokens.css';
import './styles/global.css';
import './styles/ui.css';

import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { UiProvider } from './state/uiStore.jsx';
import { installWebglStrictModeGuard } from './utils/webglStrictModeGuard.js';

// Harus dipasang sebelum render pertama: menjaga latar WebGL dari pembersihan
// palsu StrictMode (BUG-016). Tanpa efek di build produksi.
installWebglStrictModeGuard();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <UiProvider>
        <App />
      </UiProvider>
    </ErrorBoundary>
  </StrictMode>
);
