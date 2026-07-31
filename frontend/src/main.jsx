import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// El meta viewport (user-scalable=no) no alcanza para bloquear el pellizco
// para hacer zoom en Safari/iOS moderno: WebKit lo ignora a propósito desde
// hace varias versiones. La única forma confiable de bloquearlo de verdad
// es interceptar los eventos de gesto y de touch con más de un dedo.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length > 1) e.preventDefault();
  },
  { passive: false }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registra el service worker que permite instalar PawPals como app (PWA):
// ícono propio en la pantalla de inicio, abre en pantalla completa. Sólo en
// producción (build), no en `npm run dev`, para no complicar el desarrollo
// con caché mientras se está programando.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
