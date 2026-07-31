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
