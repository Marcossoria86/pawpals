import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Tipografía propia (Fredoka, redondeada y con personalidad) en vez de la
// fuente del sistema — así se siente una app, no una página web genérica.
// La traemos empaquetada vía npm (@fontsource) en vez de desde Google Fonts
// directo: queda incluida en el build y funciona offline en la app nativa.
import '@fontsource/fredoka/400.css'
import '@fontsource/fredoka/500.css'
import '@fontsource/fredoka/600.css'
import '@fontsource/fredoka/700.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

// Respaldo para el alto real de la pantalla en iOS instalado como PWA.
// `.phone` usa `height:100dvh` (pensado justo para esto), pero hay
// versiones/casos de WebKit en modo standalone donde 100dvh no termina de
// coincidir con el alto visible real — deja una franja del fondo de la
// página (blanca) asomando abajo, debajo de la barra de navegación, como
// reportó el usuario incluso con la app recién instalada. Como respaldo
// medimos el alto real con JS (innerHeight, que en standalone SIEMPRE es
// el alto visible de verdad) y lo guardamos en una variable CSS que
// `.phone` usa si está disponible — si el navegador nunca corre este JS
// (no debería pasar) o dvh ya estaba bien, no cambia nada.
function setAppViewportHeight() {
  const h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  document.documentElement.style.setProperty('--app-vh', `${h}px`);
}
setAppViewportHeight();
window.addEventListener('resize', setAppViewportHeight);
window.addEventListener('orientationchange', setAppViewportHeight);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', setAppViewportHeight);
}

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
    <ErrorBoundary fatal label="app-root">
      <App />
    </ErrorBoundary>
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
