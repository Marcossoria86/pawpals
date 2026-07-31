import { useEffect, useState, useCallback, useRef } from 'react';
import './App.css';
import { api } from './api';
import AuthView from './AuthView';
import FeedView from './FeedView';
import NearbyView from './NearbyView';
import ProfileView from './ProfileView';
import PetProfileView from './PetProfileView';
import StoriesRow from './StoriesRow';
import ReelsView from './ReelsView';
import RequestsView from './RequestsView';
import NotificationsView from './NotificationsView';
import MessagesView from './MessagesView';
import { IconHome, IconReels, IconRequests, IconNearby, IconBell, IconProfile, IconMessages } from './NavIcons';
import { IconSearch, IconClose, IconPawSmall } from './Icons';

// Barra inferior estilo Facebook: Feed, Reels, Solicitudes (citas de juego
// pendientes de aceptar/rechazar), Cerca de ti (ocupa el lugar que en
// Facebook sería Marketplace), Notificaciones y Mi perfil. Los íconos son
// dibujos propios (NavIcons.jsx), no emojis.
const TABS = [
  { key: 'feed', label: 'Feed', icon: <IconHome /> },
  { key: 'reels', label: 'Reels', icon: <IconReels /> },
  { key: 'requests', label: 'Solicitudes', icon: <IconRequests /> },
  { key: 'nearby', label: 'Cerca de ti', icon: <IconNearby /> },
  { key: 'notifications', label: 'Notificaciones', icon: <IconBell /> },
  { key: 'profile', label: 'Mi perfil', icon: <IconProfile /> }
];

function App() {
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
            <IconPawSmall size={20} /> PawPals
          </button>
        )}
        {searchableTab && (
          <div className="icon-btn" onClick={toggleSearch}>{searchOpen ? <IconClose size={16} /> : <IconSearch size={16} />}</div>
        )}
        {!searchOpen && tab !== 'messages' && (
          <button type="button" className="icon-btn messages-icon-btn" onClick={() => selectTab('messages')} title="Mensajes" aria-label="Mensajes">
            <IconMessages size={18} />
            {unreadMessages > 0 && <span className="tab-badge header-badge">{unreadMessages > 9 ? '9+' : unreadMessages}</span>}
          </button>
        )}
      </header>

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
              <>
                <StoriesRow showToast={showToast} />
                <FeedView showToast={showToast} searchQuery={searchQuery} onViewPet={setViewingPetId} scrollContainerRef={mainRef} />
              </>
            )}
            {tab === 'reels' && <ReelsView showToast={showToast} onViewPet={setViewingPetId} />}
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
    </div>
  );
}

export default App;
