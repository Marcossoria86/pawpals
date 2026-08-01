import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';
import PetAvatar from './PetAvatar';
import SettingsModal from './SettingsModal';
import AvatarPicker from './AvatarPicker';
import LegalModal from './LegalModal';
import FollowListModal from './FollowListModal';
import {
  IconClose, IconSettings, IconChevronRight, IconMoon, IconHelp, IconLogout,
  IconUsers, IconFace, IconSparkle, IconCake, IconGlobe, IconAppSquare, IconDoc, IconLock, IconFlag
} from './Icons';
import { SUPPORT_EMAIL } from './config';

// Fila del menú que todavía no existe como funcionalidad real (Chatear con
// IA, Cumpleaños, Idioma, Ícono de la app) — se muestra bien visible pero
// deshabilitada con un "Pronto" en vez de ser un botón que no hace nada al
// tocarlo (eso sería engañoso). Ídem para la línea "Asistente de ayuda de
// IA" adentro de Ayuda.
function ComingSoonRow({ icon, label }) {
  return (
    <div className="side-menu-row side-menu-row-disabled">
      {icon}
      <span>{label}</span>
      <span className="side-menu-soon-badge">Pronto</span>
    </div>
  );
}

// Sección desplegable (Configuración y privacidad / Ayuda y soporte
// técnico) — mismo patrón que ya existía en SettingsModal.jsx.
function CollapsibleSection({ icon, title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="side-menu-collapsible">
      <button type="button" className="side-menu-row" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {icon}
        <span>{title}</span>
        <span className={`side-menu-chevron ${open ? 'open' : ''}`}>
          <IconChevronRight size={16} />
        </span>
      </button>
      {open && <div className="side-menu-collapsible-body">{children}</div>}
    </div>
  );
}

// Menú lateral que se abre con el ícono de tres líneas del header (estilo
// Facebook). No todas las opciones son 100% nuevas funcionalidades propias:
// "Configuración" y "Centro de privacidad" abren la MISMA pantalla de
// siempre (ya cubre privacidad de ubicación, seguridad, legal y borrado de
// cuenta) porque separarlas en dos pantallas distintas hoy sería duplicar
// contenido — se puede separar de verdad más adelante si hace falta. Lo que
// todavía no existe como funcionalidad real (Chatear con IA, Cumpleaños,
// Idioma de la app, Ícono de la app, Asistente de ayuda de IA) se ve
// marcado como "Pronto" en vez de simular que funciona.
export default function SideMenu({ onClose, onLogout, onViewProfile, onViewPet, showToast, theme, onThemeChange }) {
  const [me, setMe] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(null); // null | 'terms' | 'privacy'
  const [legalPickerOpen, setLegalPickerOpen] = useState(false);
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
                <PetAvatar
                  photoUrl={pet?.photo_url}
                  species={pet?.species}
                  color={pet?.color}
                  avatarBg={pet?.avatar_bg}
                  avatarAccessory={pet?.avatar_accessory}
                  size={44}
                />
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
              <button type="button" className="side-menu-row" onClick={() => setFriendsOpen(true)}>
                <IconUsers size={19} />
                <span>Amigos</span>
              </button>
              <button type="button" className="side-menu-row" onClick={() => setAvatarOpen(true)} disabled={!pet}>
                <IconFace size={19} />
                <span>Avatares</span>
              </button>
              <ComingSoonRow icon={<IconSparkle size={19} />} label="Chatear con IA" />
              <ComingSoonRow icon={<IconCake size={19} />} label="Cumpleaños" />
            </div>

            <div className="side-menu-section">
              <CollapsibleSection icon={<IconSettings size={19} />} title="Configuración y privacidad">
                <button type="button" className="side-menu-row side-menu-subrow" onClick={() => setSettingsOpen(true)}>
                  <IconSettings size={17} />
                  <span>Configuración</span>
                </button>
                <button type="button" className="side-menu-row side-menu-subrow" onClick={() => setSettingsOpen(true)}>
                  <IconLock size={17} />
                  <span>Centro de privacidad</span>
                </button>
                <div className="side-menu-row side-menu-subrow side-menu-theme-row">
                  <IconMoon size={17} />
                  <span>Modo oscuro</span>
                  <div className="side-menu-theme-options">
                    <button type="button" className={theme === 'system' ? 'active' : ''} onClick={() => onThemeChange('system')}>Auto</button>
                    <button type="button" className={theme === 'light' ? 'active' : ''} onClick={() => onThemeChange('light')}>Claro</button>
                    <button type="button" className={theme === 'dark' ? 'active' : ''} onClick={() => onThemeChange('dark')}>Oscuro</button>
                  </div>
                </div>
                <div className="side-menu-row side-menu-subrow side-menu-row-disabled">
                  <IconGlobe size={17} />
                  <span>Idioma de la app</span>
                  <span className="side-menu-soon-badge">Español</span>
                </div>
                <div className="side-menu-row side-menu-subrow side-menu-row-disabled">
                  <IconAppSquare size={17} />
                  <span>Ícono de la app</span>
                  <span className="side-menu-soon-badge">Pronto</span>
                </div>
              </CollapsibleSection>

              <CollapsibleSection icon={<IconHelp size={19} />} title="Ayuda y soporte técnico">
                <div className="side-menu-row side-menu-subrow side-menu-row-disabled">
                  <IconSparkle size={17} />
                  <span>Asistente de ayuda de IA</span>
                  <span className="side-menu-soon-badge">Pronto</span>
                </div>
                <a className="side-menu-row side-menu-subrow" href={`mailto:${SUPPORT_EMAIL}`}>
                  <IconHelp size={17} />
                  <span>Ayuda</span>
                </a>
                <a className="side-menu-row side-menu-subrow" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Reportar un problema en PawPals')}`}>
                  <IconFlag size={17} />
                  <span>Reportar un problema</span>
                </a>
                <button type="button" className="side-menu-row side-menu-subrow" onClick={() => setLegalPickerOpen((v) => !v)}>
                  <IconDoc size={17} />
                  <span>Condiciones y políticas</span>
                </button>
                {legalPickerOpen && (
                  <div className="side-menu-legal-choices">
                    <button type="button" onClick={() => setLegalOpen('terms')}>Ver Términos y Condiciones</button>
                    <button type="button" onClick={() => setLegalOpen('privacy')}>Ver Política de Privacidad</button>
                  </div>
                )}
              </CollapsibleSection>
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
      {avatarOpen && pet && (
        <AvatarPicker
          pet={pet}
          onClose={() => setAvatarOpen(false)}
          showToast={showToast}
          onSaved={(result) => {
            setMe((prev) => ({ ...prev, pet: { ...prev.pet, ...result } }));
            setAvatarOpen(false);
          }}
        />
      )}
      {friendsOpen && pet && (
        <FollowListModal
          petId={pet.id}
          kind="followers"
          onClose={() => setFriendsOpen(false)}
          onViewPet={(id) => { setFriendsOpen(false); onClose(); onViewPet?.(id); }}
          showToast={showToast}
        />
      )}
      {legalOpen && <LegalModal kind={legalOpen} onClose={() => setLegalOpen(null)} />}
    </>
  );
}
