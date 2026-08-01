import { useEffect, useState, useCallback, useRef } from 'react';
import './App.css';
import { api } from './api';
import AuthView from './AuthView';
import ResetPasswordView from './ResetPasswordView';
import AdminReportsView from './AdminReportsView';
import FeedView from './FeedView';
import NearbyView from './NearbyView';
import ProfileView from './ProfileView';
import PetProfileView from './PetProfileView';
import StoriesRow from './StoriesRow';
import ReelsView from './ReelsView';
import RequestsView from './RequestsView';
import NotificationsView from './NotificationsView';
import MessagesView from './MessagesView';
import NewPostComposer from './NewPostComposer';
import MediaPickerModal from './MediaPickerModal';
import CrossPostFlow from './CrossPostFlow';
import SideMenu from './SideMenu';
import { IconHome, IconReels, IconRequests, IconNearby, IconBell, IconProfile, IconMessages } from './NavIcons';
import { IconSearch, IconClose, IconPawPair, IconPlus, IconGallery, IconCamera, IconMenu } from './Icons';

// Barra inferior estilo Facebook: Feed, Reels, Solicitudes (citas de juego
// pendientes de aceptar/rechazar), Cerca de ti (ocupa el lugar que en
// Facebook sería Marketplace), Notificaciones y Mi perfil. Los íconos son
// dibujos propios (NavIcons.jsx), no emojis.
//
// El ícono de "Solicitudes" (una huella hecha de varias formas finitas) se
// ve más chico que sus vecinos (un solo trazo grueso) aunque compartan el
// mismo tamaño base — por eso acá se lo agranda un poco a mano (30 en vez
// de 25) para que se vea parejo con el resto a simple vista.
const TABS = [
  { key: 'feed', label: 'Feed', icon: <IconHome /> },
  { key: 'reels', label: 'Reels', icon: <IconReels /> },
  { key: 'requests', label: 'Solicitudes', icon: <IconRequests size={30} /> },
  { key: 'nearby', label: 'Cerca de ti', icon: <IconNearby /> },
  { key: 'notifications', label: 'Notificaciones', icon: <IconBell /> },
  { key: 'profile', label: 'Mi perfil', icon: <IconProfile /> }
];

// Tema claro/oscuro/automático (ver SideMenu → "Modo oscuro"). Por defecto
// sigue la preferencia del sistema operativo (ver el @media de index.css);
// si la persona elige "Claro" u "Oscuro" a mano, se guarda en localStorage y
// se fuerza con una clase en <html> que le gana al @media (ver index.css:
// :root.force-light / :root.force-dark, ambas con más especificidad que la
// regla del @media).
const THEME_KEY = 'pawpals-theme';
function applyTheme(theme) {
  document.documentElement.classList.remove('force-light', 'force-dark');
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.classList.add(`force-${theme}`);
  }
}

function App() {
  // El enlace del mail de "recuperar contraseña" apunta acá con
  // ?resetToken=... — si está presente, mostramos esa pantalla en vez del
  // login/app normal, sin importar si ya había una sesión iniciada.
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get('resetToken'));
  // Pantalla de reportes, sólo para vos: ?adminKey=... en la URL, sin pasar
  // por el login normal (ver ADMIN_KEY en el backend). No se guarda en
  // ningún lado más que en la URL que vos abras.
  const adminKey = new URLSearchParams(window.location.search).get('adminKey');
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState('feed');
  const [toast, setToast] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingPetId, setViewingPetId] = useState(null);
  const [me, setMe] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [messagesInitialPetId, setMessagesInitialPetId] = useState(null);
  const [tabbarHidden, setTabbarHidden] = useState(false);
  // Cuando el selector de fotos de una pantalla crea contenido de OTRO tipo
  // (por ejemplo, elegís "Historia" desde la cámara del feed), esa otra
  // pantalla no se entera sola — bumpeamos un contador que cada una mira
  // para recargar su lista (ver refreshSignal más abajo y CrossPostFlow).
  const [feedRefreshTick, setFeedRefreshTick] = useState(0);
  const [storiesRefreshTick, setStoriesRefreshTick] = useState(0);
  const [reelsRefreshTick, setReelsRefreshTick] = useState(0);
  // Menú "+" del header (Publicación/Historia/Reel, estilo Facebook): vive
  // acá arriba (no adentro de FeedView/StoriesRow) porque tiene que poder
  // abrirse sin importar en qué pestaña esté la persona.
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [plusPostOpen, setPlusPostOpen] = useState(false);
  const [plusPickerDest, setPlusPickerDest] = useState(null); // 'story' | 'reel'
  const [plusCrossPost, setPlusCrossPost] = useState(null); // { kind, file }
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  });
  const mainRef = useRef(null);
  const navRef = useRef(null);
  const lastScrollTopRef = useRef(0);

  // Se engancha en <main> con onScrollCapture (fase de "captura"), que sí
  // detecta el scroll de contenedores internos (como el feed vertical de
  // reels o la lista de mensajes) aunque el evento "scroll" del DOM no
  // burbujee — así una sola función cubre todas las pestañas. El nav es
  // position:fixed (ver App.css) a propósito: esconderlo nunca cambia el
  // tamaño de <main>, así que no hay riesgo de que este mismo cambio
  // dispare otro evento de scroll y termine parpadeando solo.
  //
  // lastScrollTopRef sólo se actualiza cuando de verdad decidimos
  // mostrar/esconder (no en cada evento): así queda como una "banda" de
  // referencia — hace falta moverse más de UMBRAL píxeles netos desde la
  // última decisión para que vuelva a cambiar. Sin esto, el rebote/inercia
  // natural del scroll por inercia en el teléfono (que va y viene unos
  // pocos píxeles mientras frena) hace que la barra parpadee sola.
  const SCROLL_HIDE_THRESHOLD = 40;
  function handleScrollCapture(e) {
    const top = e.target.scrollTop ?? 0;
    if (top < 24) {
      setTabbarHidden(false);
      lastScrollTopRef.current = top;
      return;
    }
    const delta = top - lastScrollTopRef.current;
    if (delta > SCROLL_HIDE_THRESHOLD) {
      setTabbarHidden(true);
      lastScrollTopRef.current = top;
    } else if (delta < -SCROLL_HIDE_THRESHOLD) {
      setTabbarHidden(false);
      lastScrollTopRef.current = top;
    }
  }

  function openNewPost() {
    setPlusMenuOpen(false);
    setPlusPostOpen(true);
  }

  function openQuickPicker(dest) {
    setPlusMenuOpen(false);
    setPlusPickerDest(dest);
  }

  function handleQuickPickerSelect(file) {
    const dest = plusPickerDest;
    setPlusPickerDest(null);
    setPlusCrossPost({ kind: dest, file });
  }

  function handleQuickCrossPostDone(kind) {
    setPlusCrossPost(null);
    if (kind === 'story') setStoriesRefreshTick((t) => t + 1);
    if (kind === 'reel') setReelsRefreshTick((t) => t + 1);
  }

  function toggleSearch() {
    setSearchOpen((prev) => {
      const next = !prev;
      if (!next) setSearchQuery('');
      return next;
    });
  }

  function selectTab(key) {
    setTab(key);
    setViewingPetId(null);
    setSearchOpen(false);
    setSearchQuery('');
    // selectTab es la navegación "normal" (tabs de abajo, ícono de mensajes
    // del header): siempre entra a la bandeja por la lista. Sólo
    // goToMessages (desde "Enviar mensaje" en un perfil) abre directo una
    // conversación puntual.
    setMessagesInitialPetId(null);
    // Al cambiar de pestaña siempre mostramos la barra de nuevo — si no, se
    // podía quedar escondida de la pestaña anterior sin forma de recuperarla.
    lastScrollTopRef.current = 0;
    setTabbarHidden(false);
  }

  // Tocar las patitas / "PawPals" del header vuelve al feed y lo desplaza
  // hasta arriba del todo, como pidió el usuario.
  function goHome() {
    setViewingPetId(null);
    setSearchOpen(false);
    setSearchQuery('');
    setMessagesInitialPetId(null);
    setTab('feed');
    lastScrollTopRef.current = 0;
    setTabbarHidden(false);
    requestAnimationFrame(() => {
      mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  useEffect(() => { applyTheme(theme); }, [theme]);

  function handleThemeChange(next) {
    setTheme(next);
    if (next === 'system') {
      localStorage.removeItem(THEME_KEY);
    } else {
      localStorage.setItem(THEME_KEY, next);
    }
  }

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }, []);

  const refreshUnread = useCallback(() => {
    api.notifications()
      .then((list) => setUnreadCount(list.filter((n) => !n.is_read).length))
      .catch(() => {});
  }, []);

  const refreshUnreadMessages = useCallback(() => {
    api.unreadMessagesCount()
      .then((r) => setUnreadMessages(r.count))
      .catch(() => {});
  }, []);

  // Vamos a la bandeja de mensajes y abrimos directo la conversación con
  // esa mascota — se usa desde el botón "Enviar mensaje" de un perfil.
  function goToMessages(petId) {
    setViewingPetId(null);
    setSearchOpen(false);
    setSearchQuery('');
    setTab('messages');
    setMessagesInitialPetId(petId);
    lastScrollTopRef.current = 0;
    setTabbarHidden(false);
  }

  useEffect(() => {
    api.me()
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!authenticated) return undefined;
    api.me().then(setMe).catch(() => {});
    refreshUnread();
    refreshUnreadMessages();
    const interval = setInterval(() => { refreshUnread(); refreshUnreadMessages(); }, 20000);
    return () => clearInterval(interval);
  }, [authenticated, refreshUnread, refreshUnreadMessages]);

  if (adminKey) {
    return <AdminReportsView adminKey={adminKey} />;
  }

  if (resetToken) {
    return (
      <ResetPasswordView
        token={resetToken}
        onDone={() => {
          // Limpiamos el ?resetToken de la URL para no volver a esta
          // pantalla si la persona recarga después de cambiar la contraseña.
          window.history.replaceState({}, '', window.location.pathname);
          setResetToken(null);
        }}
      />
    );
  }

  if (!authChecked) {
    return <div className="loading-screen">Cargando PawPals…</div>;
  }

  if (!authenticated) {
    return <AuthView onAuthenticated={() => setAuthenticated(true)} />;
  }

  const searchableTab = tab === 'feed' || tab === 'nearby';

  return (
    <div className="phone">
      <header className="appbar">
        <div className="appbar-left">
          {!searchOpen && (
            <button type="button" className="icon-btn hamburger-btn" onClick={() => setSideMenuOpen(true)} title="Menú" aria-label="Menú">
              <IconMenu size={20} />
            </button>
          )}
          {searchOpen ? (
            <input
              autoFocus
              className="search-input"
              type="text"
              placeholder={tab === 'nearby' ? 'Buscar por nombre, raza o dueño…' : 'Buscar en el feed…'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          ) : (
            <button type="button" className="logo logo-btn" onClick={goHome} title="Ir al inicio">
              <IconPawPair size={34} /> PawPals
            </button>
          )}
        </div>
        <div className="appbar-actions">
          {/* El "+" (nueva publicación/historia/reel) no tiene sentido dentro
              de la bandeja de Mensajes — además, ahí el menú desplegable
              (que se abre hacia la izquierda desde este botón) quedaba fuera
              de la pantalla porque en esa pestaña es el único ícono visible,
              pegado contra el borde derecho. Por eso se esconde en esta
              pestaña. */}
          {!searchOpen && tab !== 'messages' && (
            <div className="header-plus-wrap">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPlusMenuOpen((v) => !v)}
                title="Crear"
                aria-label="Crear"
              >
                <IconPlus size={22} />
              </button>
              {plusMenuOpen && (
                <div className="header-plus-dropdown">
                  <button type="button" onClick={openNewPost}>
                    <IconGallery size={17} /> Publicación
                  </button>
                  <button type="button" onClick={() => openQuickPicker('story')}>
                    <IconCamera size={17} /> Historia
                  </button>
                  <button type="button" onClick={() => openQuickPicker('reel')}>
                    <IconReels /> Reel
                  </button>
                </div>
              )}
            </div>
          )}
          {searchableTab && (
            <div className="icon-btn" onClick={toggleSearch}>{searchOpen ? <IconClose size={18} /> : <IconSearch size={20} />}</div>
          )}
          {!searchOpen && tab !== 'messages' && (
            <button type="button" className="icon-btn messages-icon-btn" onClick={() => selectTab('messages')} title="Mensajes" aria-label="Mensajes">
              <IconMessages size={22} />
              {unreadMessages > 0 && <span className="tab-badge header-badge">{unreadMessages > 9 ? '9+' : unreadMessages}</span>}
            </button>
          )}
        </div>
      </header>

      {sideMenuOpen && (
        <SideMenu
          onClose={() => setSideMenuOpen(false)}
          onLogout={() => { setSideMenuOpen(false); setAuthenticated(false); }}
          onViewProfile={() => { setSideMenuOpen(false); selectTab('profile'); }}
          showToast={showToast}
          theme={theme}
          onThemeChange={handleThemeChange}
        />
      )}

      <main
        ref={mainRef}
        className={tab === 'reels' || tab === 'messages' ? 'no-pad' : ''}
        onScrollCapture={handleScrollCapture}
      >
        {viewingPetId ? (
          <PetProfileView
            petId={viewingPetId}
            showToast={showToast}
            onBack={() => setViewingPetId(null)}
            onViewPet={setViewingPetId}
            onMessagePet={goToMessages}
          />
        ) : (
          <>
            {tab === 'feed' && (
              <div className="feed-tab">
                <StoriesRow
                  showToast={showToast}
                  refreshSignal={storiesRefreshTick}
                  onCreatedPost={() => setFeedRefreshTick((t) => t + 1)}
                  onCreatedReel={() => setReelsRefreshTick((t) => t + 1)}
                  onViewPet={setViewingPetId}
                />
                <FeedView
                  me={me}
                  showToast={showToast}
                  searchQuery={searchQuery}
                  onViewPet={setViewingPetId}
                  scrollContainerRef={mainRef}
                  refreshSignal={feedRefreshTick}
                />
              </div>
            )}
            {tab === 'reels' && (
              <ReelsView showToast={showToast} onViewPet={setViewingPetId} refreshSignal={reelsRefreshTick} />
            )}
            {tab === 'requests' && <RequestsView showToast={showToast} onViewPet={setViewingPetId} />}
            {tab === 'nearby' && <NearbyView showToast={showToast} searchQuery={searchQuery} onViewPet={setViewingPetId} />}
            {tab === 'notifications' && (
              <NotificationsView showToast={showToast} onViewPet={setViewingPetId} onRead={() => setUnreadCount(0)} />
            )}
            {tab === 'messages' && (
              <MessagesView
                showToast={showToast}
                initialPetId={messagesInitialPetId}
                onRefreshUnread={refreshUnreadMessages}
              />
            )}
            {tab === 'profile' && <ProfileView showToast={showToast} onLogout={() => setAuthenticated(false)} onViewPet={setViewingPetId} />}
          </>
        )}
      </main>

      <nav ref={navRef} className={`tabbar ${tabbarHidden ? 'tabbar-hidden' : ''}`}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => selectTab(t.key)}
            title={t.label}
            aria-label={t.label}
          >
            <div className="tab-icon">
              {t.key === 'profile' && me?.pet?.photo_url
                ? <img className="tab-avatar" src={me.pet.photo_url} alt="" />
                : t.icon}
              {t.key === 'notifications' && unreadCount > 0 && (
                <span className="tab-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </div>
          </button>
        ))}
      </nav>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>

      {plusPostOpen && (
        <NewPostComposer
          me={me}
          onClose={() => setPlusPostOpen(false)}
          onPosted={() => {
            setPlusPostOpen(false);
            setFeedRefreshTick((t) => t + 1);
            if (tab !== 'feed') selectTab('feed');
          }}
          showToast={showToast}
        />
      )}

      {plusPickerDest && (
        <MediaPickerModal
          destination={plusPickerDest}
          allowedDestinations={[plusPickerDest]}
          onSelect={handleQuickPickerSelect}
          onClose={() => setPlusPickerDest(null)}
        />
      )}

      {plusCrossPost && (
        <CrossPostFlow
          kind={plusCrossPost.kind}
          file={plusCrossPost.file}
          showToast={showToast}
          onCancel={() => setPlusCrossPost(null)}
          onDone={handleQuickCrossPostDone}
        />
      )}
    </div>
  );
}

export default App;
