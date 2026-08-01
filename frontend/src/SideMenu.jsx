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

const LANGUAGE_KEY = 'pawpals-language';

// Ocho idiomas para elegir (ver pedido del usuario: "tal vez la peguemos en
// otro país cuando subamos la app"). Guardamos la preferencia de verdad,
// pero somos honestos: el CONTENIDO de la app (textos, botones, etc.)
// todavía está solo en español, así que si eligen otro idioma se lo
// avisamos con un toast en vez de simular que ya está traducido.
const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'Inglés (English)' },
  { code: 'pt', label: 'Portugués (Português)' },
  { code: 'fr', label: 'Francés (Français)' },
  { code: 'it', label: 'Italiano' },
  { code: 'de', label: 'Alemán (Deutsch)' },
  { code: 'zh', label: 'Chino (中文)' },
  { code: 'ja', label: 'Japonés (日本語)' }
];

function ComingSoonRow({ icon, label }) {
  return (
    <div className="side-menu-row side-menu-row-disabled">
      {icon}
      <span>{label}</span>
      <span className="side-menu-soon-badge">Pronto</span>
    </div>
  );
}

// Cabecera de cada "pestaña"/sección del menú (todo menos la portada
// principal): flecha para volver + título. Reemplaza al patrón anterior de
// acordeón (CollapsibleSection, que expandía la lista ahí mismo) porque el
// usuario pidió que cada desplegable se abra como una sección propia, no
// como una ventana emergente ni un expandible en el medio de la lista.
function PanelHead({ title, onBack }) {
  return (
    <div className="side-menu-panel-head">
      <button type="button" className="side-menu-back-btn" onClick={onBack} aria-label="Volver">
        <IconChevronRight size={19} />
      </button>
      <span className="side-menu-panel-title">{title}</span>
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
// Ícono de la app, Asistente de ayuda de IA) se ve marcado como "Pronto" en
// vez de simular que funciona.
//
// Navegación: "panel" indica qué "pestaña" se ve — null es la portada
// principal, y 'settings'/'help'/'language'/'legal' son sub-secciones a
// pantalla completa (dentro de la tarjeta del menú) con su propio botón de
// volver, en vez de expandirse en el lugar como antes.
export default function SideMenu({ onClose, onLogout, onViewProfile, onViewPet, showToast, theme, onThemeChange }) {
  const [me, setMe] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(null); // null | 'terms' | 'privacy'
  const [loggingOut, setLoggingOut] = useState(false);
  const [panel, setPanel] = useState(null); // null | 'settings' | 'help' | 'language' | 'legal'
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem(LANGUAGE_KEY) || 'es'; } catch { return 'es'; }
  });

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

  function handleLanguageChange(code) {
    setLanguage(code);
    try { localStorage.setItem(LANGUAGE_KEY, code); } catch { /* noop */ }
    if (code === 'es') {
      showToast('Idioma guardado');
    } else {
      showToast('Guardado — por ahora la app se sigue viendo en español, ¡ya estamos trabajando en la traducción!');
    }
  }

  // A dónde vuelve cada sección al tocar la flecha de atrás: language y
  // legal son sub-secciones DENTRO de settings/help, así que vuelven ahí
  // (no directo a la portada) — un "back" de verdad, no un cierre general.
  function goBack() {
    if (panel === 'language') return setPanel('settings');
    if (panel === 'legal') return setPanel('help');
    return setPanel(null);
  }

  const pet = me?.pet;

  return (
    <>
      {createPortal(
        <div className="modal-backdrop side-menu-backdrop" onClick={onClose}>
          <div className="side-menu-card" onClick={(e) => e.stopPropagation()}>
            {panel === null && (
              <>
                <div className="side-menu-head">
                  <button type="button" className="side-menu-pet-row" onClick={onViewProfile}>
                    <PetAvatar
                      photoUrl={pet?.photo_url}
                      species={pet?.species}
                      color={pet?.color}
                      avatarBg={pet?.avatar_bg}
                      avatarAccessory={pet?.avatar_accessory}
                      avatarVariant={pet?.avatar_variant}
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
                  <button type="button" className="side-menu-row" onClick={() => setPanel('settings')}>
                    <IconSettings size={19} />
                    <span>Configuración y privacidad</span>
                    <span className="side-menu-chevron"><IconChevronRight size={16} /></span>
                  </button>
                  <button type="button" className="side-menu-row" onClick={() => setPanel('help')}>
                    <IconHelp size={19} />
                    <span>Ayuda y soporte técnico</span>
                    <span className="side-menu-chevron"><IconChevronRight size={16} /></span>
                  </button>
                </div>

                <div className="side-menu-section">
                  <button type="button" className="side-menu-row side-menu-danger" onClick={handleLogout} disabled={loggingOut}>
                    <IconLogout size={19} />
                    <span>{loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</span>
                  </button>
                </div>
              </>
            )}

            {panel === 'settings' && (
              <div className="side-menu-panel">
                <PanelHead title="Configuración y privacidad" onBack={goBack} />
                <div className="side-menu-section side-menu-section-flush">
                  <button type="button" className="side-menu-row" onClick={() => setSettingsOpen(true)}>
                    <IconSettings size={19} />
                    <span>Configuración</span>
                  </button>
                  <button type="button" className="side-menu-row" onClick={() => setSettingsOpen(true)}>
                    <IconLock size={19} />
                    <span>Centro de privacidad</span>
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
                  <button type="button" className="side-menu-row" onClick={() => setPanel('language')}>
                    <IconGlobe size={19} />
                    <span>Idioma de la app</span>
                    <span className="side-menu-value-badge">{LANGUAGES.find((l) => l.code === language)?.label || 'Español'}</span>
                    <span className="side-menu-chevron"><IconChevronRight size={16} /></span>
                  </button>
                  <div className="side-menu-row side-menu-row-disabled">
                    <IconAppSquare size={19} />
                    <span>Ícono de la app</span>
                    <span className="side-menu-soon-badge">Pronto</span>
                  </div>
                </div>
              </div>
            )}

            {panel === 'language' && (
              <div className="side-menu-panel">
                <PanelHead title="Idioma de la app" onBack={goBack} />
                <div className="side-menu-lang-note">
                  La app todavía se muestra solo en español. Elegí tu idioma preferido igual: guardamos tu elección y te avisamos apenas esté lista la traducción completa.
                </div>
                <div className="side-menu-section side-menu-section-flush">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      className={`side-menu-row side-menu-lang-row ${language === l.code ? 'active' : ''}`}
                      onClick={() => handleLanguageChange(l.code)}
                    >
                      <span>{l.label}</span>
                      {language === l.code && <span className="side-menu-lang-check">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {panel === 'help' && (
              <div className="side-menu-panel">
                <PanelHead title="Ayuda y soporte técnico" onBack={goBack} />
                <div className="side-menu-section side-menu-section-flush">
                  <div className="side-menu-row side-menu-row-disabled">
                    <IconSparkle size={19} />
                    <span>Asistente de ayuda de IA</span>
                    <span className="side-menu-soon-badge">Pronto</span>
                  </div>
                  <a className="side-menu-row" href={`mailto:${SUPPORT_EMAIL}`}>
                    <IconHelp size={19} />
                    <span>Ayuda</span>
                  </a>
                  <a className="side-menu-row" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Reportar un problema en PawPals')}`}>
                    <IconFlag size={19} />
                    <span>Reportar un problema</span>
                  </a>
                  <button type="button" className="side-menu-row" onClick={() => setPanel('legal')}>
                    <IconDoc size={19} />
                    <span>Condiciones y políticas</span>
                    <span className="side-menu-chevron"><IconChevronRight size={16} /></span>
                  </button>
                </div>
              </div>
            )}

            {panel === 'legal' && (
              <div className="side-menu-panel">
                <PanelHead title="Condiciones y políticas" onBack={goBack} />
                <div className="side-menu-section side-menu-section-flush">
                  <button type="button" className="side-menu-row" onClick={() => setLegalOpen('terms')}>
                    <IconDoc size={19} />
                    <span>Términos y Condiciones</span>
                  </button>
                  <button type="button" className="side-menu-row" onClick={() => setLegalOpen('privacy')}>
                    <IconLock size={19} />
                    <span>Política de Privacidad</span>
                  </button>
                </div>
              </div>
            )}
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
