import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';
import PetAvatar from './PetAvatar';
import SettingsModal from './SettingsModal';
import { IconClose, IconSettings, IconChevronRight, IconMoon, IconHelp, IconLogout } from './Icons';
import { SUPPORT_EMAIL } from './config';

// Menú lateral que se abre con el ícono de tres líneas del header (estilo
// Facebook: "Configuración y privacidad", modo oscuro, ayuda, cerrar
// sesión). A propósito NO copia TODAS las opciones de Facebook (Actividad
// publicitaria, Pedidos y pagos, Uso de datos del celular, Idioma de la
// app, etc.) — PawPals no tiene publicidad, pagos ni más de un idioma, así
// que esas entradas serían botones que no hacen nada. Lo que sí hay acá es
// 100% funcional: reusa el mismo modal de Configuración que ya existía en
// Mi perfil (privacidad de ubicación, cambiar contraseña/correo, legal,
// borrar cuenta), y suma el modo oscuro manual y cerrar sesión.
export default function SideMenu({ onClose, onLogout, onViewProfile, showToast, theme, onThemeChange }) {
  const [me, setMe] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await api.logout();
    } catch {
      // Si falla el logout del lado del servidor igual sacamos a la persona
      // de la app del lado del cliente (mismo criterio que ProfileView).
    }
    onLogout();
  }

  const pet = me?.pet;

  return (
    <>
      {createPortal(
        <div className="modal-backdrop side-menu-backdrop" onClick={onClose}>
          <div className="side-menu-card" onClick={(e) => e.stopPropagation()}>
            <div className="side-menu-head">
              <button type="button" className="side-menu-pet-row" onClick={onViewProfile}>
                <PetAvatar photoUrl={pet?.photo_url} species={pet?.species} color={pet?.color} size={44} />
                <div>
                  <div className="side-menu-pet-name">{pet?.name || 'Mi perfil'}</div>
                  <div className="side-menu-pet-sub">Ver tu perfil</div>
                </div>
              </button>
              <button type="button" className="modal-close-x" onClick={onClose} aria-label="Cerrar">
                <IconClose size={20} />
              </button>
            </div>

            <div className="side-menu-section">
              <button type="button" className="side-menu-row" onClick={() => setSettingsOpen(true)}>
                <IconSettings size={19} />
                <span>Configuración y privacidad</span>
                <IconChevronRight size={16} className="side-menu-chevron" />
              </button>

              <div className="side-menu-row side-menu-theme-row">
                <IconMoon size={19} />
                <span>Modo oscuro</span>
                <div className="side-menu-theme-options">
                  <button type="button" className={theme === 'system' ? 'active' : ''} onClick={() => onThemeChange('system')}>Auto</button>
                  <button type="button" className={theme === 'light' ? 'active' : ''} onClick={() => onThemeChange('light')}>Claro</button>
                  <button type="button" className={theme === 'dark' ? 'active' : ''} onClick={() => onThemeChange('dark')}>Oscuro</button>
                </div>
              </div>

              <a className="side-menu-row" href={`mailto:${SUPPORT_EMAIL}`}>
                <IconHelp size={19} />
                <span>Ayuda y soporte técnico</span>
              </a>
            </div>

            <div className="side-menu-section">
              <button type="button" className="side-menu-row side-menu-danger" onClick={handleLogout} disabled={loggingOut}>
                <IconLogout size={19} />
                <span>{loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {settingsOpen && me && (
        <SettingsModal
          me={me}
          onClose={() => setSettingsOpen(false)}
          onLogout={onLogout}
          showToast={showToast}
        />
      )}
    </>
  );
}
