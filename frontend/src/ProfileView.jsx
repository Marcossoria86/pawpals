import { useRef, useState, useEffect } from 'react';
import { api } from './api';
import PetAvatar from './PetAvatar';

export default function ProfileView({ onLogout, showToast }) {
  const [me, setMe] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => showToast('No se pudo cargar tu perfil'));
  }, []);

  async function handleLogout() {
    await api.logout();
    onLogout();
  }

  async function handlePickPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Ese archivo no es una imagen');
      return;
    }
    setUploading(true);
    try {
      const result = await api.uploadPetPhoto(file);
      setMe((prev) => ({ ...prev, pet: { ...prev.pet, photo_url: result.photo_url } }));
      showToast('¡Foto de perfil actualizada!');
    } catch (err) {
      showToast(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (!me) return <div className="section-title">Cargando perfil…</div>;

  const { user, pet, stats } = me;

  return (
    <section>
      <div className="profile-hero">
        <div className="profile-avatar-wrap">
          <PetAvatar photoUrl={pet.photo_url} species={pet.species} color={pet.color} size={84} className="profile-avatar" />
          <button
            type="button"
            className="profile-photo-btn"
            title="Cambiar foto de perfil"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? '…' : '📷'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePickPhoto}
          />
        </div>
        <div className="profile-name">{pet.name}</div>
        <div className="profile-sub">{pet.breed} · {pet.age ?? '?'} años · dueño/a: {user.name}</div>
        <div className="stat-row">
          <div className="stat"><b>{stats.posts}</b><span>publicaciones</span></div>
          <div className="stat"><b>{stats.friends}</b><span>mascotas cerca</span></div>
          <div className="stat"><b>{stats.playdates}</b><span>citas de juego</span></div>
        </div>
      </div>
      <div className="section-title">Sobre {pet.name}</div>
      <div className="bio-box">{pet.bio || 'Todavía no hay una biografía para esta mascota.'}</div>
      <button className="logout-btn" onClick={handleLogout}>Cerrar sesión</button>
    </section>
  );
}
