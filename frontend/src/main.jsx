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

// Alto real de la pantalla para `.phone` — el diagnóstico anterior (usar
// visualViewport, que se ACHICA cuando la barra de Safari está visible)
// estaba mal pensado: eso hace que `.phone` se achique para "no quedar
// tapado" por la barra de Safari, dejando un hueco reservado (la franja
// gris que reportó el usuario) cuando esa barra después se esconde al
// scrollear. Lo que en realidad se quiere (ver captura de Yahoo que mandó
// de referencia) es lo que hace CUALQUIER sitio normal: el contenido
// ocupa SIEMPRE el alto grande de la pantalla, de punta a punta, y la
// barra flotante de Safari se superpone (translúcida) arriba del
// contenido cuando está visible, sin robarle espacio a nadie.
//
// window.innerHeight en iOS Safari es justo eso — el alto "grande" del
// viewport, el que NO se achica cuando aparece la barra de Safari (a
// diferencia de visualViewport.height, que sí) — así que sirve como
// respaldo confiable para navegadores viejos que no soportan `100lvh`
// (large viewport height, la unidad CSS pensada exactamente para esto).
function setAppViewportHeight() {
  document.documentElement.style.setProperty('--app-vh', `${window.innerHeight}px`);
}
setAppViewportHeight();
window.addEventListener('resize', setAppViewportHeight);
window.addEventListener('orientationchange', setAppViewportHeight);

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
