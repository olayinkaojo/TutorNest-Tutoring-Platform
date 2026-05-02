import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { Toaster } from './components/ui/sonner.tsx';
import './index.css';
import { initSentry } from './utils/sentry-init';
import { initLogRocket } from './utils/logrocket-init';

initSentry();
initLogRocket();

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
    <Toaster richColors position="top-right" />
  </BrowserRouter>
);
  