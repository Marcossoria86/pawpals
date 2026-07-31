import { useEffect, useState, useCallback } from 'react';
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
import { IconHome, IconReels, IconRequests, IconNearby, IconBell, IconProfile } from './NavIcons';

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
    const interval = setInterval(refreshUnread, 20000);
    return () => clearInterval(interval);
  }, [authenticated, refreshUnread]);

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
          <div className="logo"><span>🐾</span> PawPals</div>
        )}
        {searchableTab && (
          <div className="icon-btn" onClick={toggleSearch}>{searchOpen ? '✕' : '🔍'}</div>
        )}
      </header>

      <main className={tab === 'reels' ? 'no-pad' : ''}>
        {viewingPetId ? (
          <PetProfileView
            petId={viewingPetId}
            showToast={showToast}
            onBack={() => setViewingPetId(null)}
          />
        ) : (
          <>
            {tab === 'feed' && (
              <>
                <StoriesRow showToast={showToast} />
                <FeedView showToast={showToast} searchQuery={searchQuery} onViewPet={setViewingPetId} />
              </>
            )}
            {tab === 'reels' && <ReelsView showToast={showToast} onViewPet={setViewingPetId} />}
            {tab === 'requests' && <RequestsView showToast={showToast} onViewPet={setViewingPetId} />}
            {tab === 'nearby' && <NearbyView showToast={showToast} searchQuery={searchQuery} onViewPet={setViewingPetId} />}
            {tab === 'notifications' && (
              <NotificationsView showToast={showToast} onViewPet={setViewingPetId} onRead={() => setUnreadCount(0)} />
            )}
            {tab === 'profile' && <ProfileView showToast={showToast} onLogout={() => setAuthenticated(false)} />}
          </>
        )}
      </main>

      <nav className="tabbar">
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
