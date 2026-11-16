import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/bricolage-grotesque/500.css';
import '@fontsource/bricolage-grotesque/700.css';
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/500.css';
import '@fontsource/public-sans/600.css';
import './styles/styles.css';
import App from './App';

// La page claude.ai fournit son propre <html> sans attribut lang.
document.documentElement.lang = 'fr';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
