import { useRef, useState, useEffect } from 'react';
import { api } from './api';
import PetAvatar from './PetAvatar';
import ImageCropper from './ImageCropper';
import ErrorBoundary from './ErrorBoundary';
import FollowListModal from './FollowListModal';
import SettingsModal from './SettingsModal';
import EditProfileModal from './EditProfileModal';
import { IconCamera, IconGallery, IconSettings } from './Icons';

export default function ProfileView({ onLogout, showToast, onViewPet }) {
  const [me, setMe] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const [listModal, setListModal] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => showToast('No se pudo cargar tu perfil'));
  }, []);

  async function handleLogout() {
    await api.logout();
    onLogout();
  }

  function handlePickPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Ese archivo no es una imagen');
      return;
    }
    setCropFile(file);
  }

  async function handleCropConfirm(croppedFile) {
    setCropFile(null);
    setUploading(true);
    try {
      const result = await api.uploadPetPhoto(croppedFile);
      setMe((prev) => ({ ...prev, pet: { ...prev.pet, photo_url: result.photo_url } }));
      showToast('¡Foto de perfil actualizada!');
    } catch (err) {
      showToast(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (!me) return <div className="section-title">Cargando perfil…</div>;

  const { user, pet, stats } = me;

  return (
    <section>
      <div className="profile-hero">
        <button
          type="button"
          className="profile-settings-btn"
          title="Configuración"
          aria-label="Configuración"
          onClick={() => setSettingsOpen(true)}
        >
          <IconSettings size={18} />
        </button>
        <div className="profile-avatar-wrap">
          <PetAvatar photoUrl={pet.photo_url} species={pet.species} color={pet.color} size={84} className="profile-avatar" />
          <button
            type="button"
            className="profile-photo-btn"
            title="Tomar foto"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? '…' : <IconCamera size={14} />}
          </button>
          <button
            type="button"
            className="profile-gallery-btn"
            title="Elegir de la galería"
            onClick={() => galleryInputRef.current?.click()}
            disabled={uploading}
          >
            <IconGallery size={12} />
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handlePickPhoto}
          />
          <input
            ref={galleryInputRef}
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
          <button type="button" className="stat stat-btn" onClick={() => setListModal('followers')}>
            <b>{stats.followers}</b><span>seguidores</span>
          </button>
          <button type="button" className="stat stat-btn" onClick={() => setListModal('following')}>
            <b>{stats.following}</b><span>siguiendo</span>
          </button>
          <div className="stat"><b>{stats.playdates}</b><span>citas de juego</span></div>
        </div>
      </div>
      <div className="section-title">Sobre {pet.name}</div>
      <div className="bio-box">{pet.bio || 'Todavía no hay una biografía para esta mascota.'}</div>
      <button className="logout-btn" onClick={() => setEditOpen(true)}>Editar perfil</button>
      <button className="logout-btn" onClick={handleLogout}>Cerrar sesión</button>

      {cropFile && (
        <ErrorBoundary onReset={() => setCropFile(null)} label="profile-cropper">
          <ImageCropper
            file={cropFile}
            aspect={1}
            shape="circle"
            title="Acomodá tu foto de perfil"
            onConfirm={handleCropConfirm}
            onCancel={() => setCropFile(null)}
          />
        </ErrorBoundary>
      )}

      {listModal && (
        <FollowListModal
          petId={pet.id}
          kind={listModal}
          onClose={() => setListModal(null)}
          onViewPet={(id) => { setListModal(null); onViewPet?.(id); }}
          showToast={showToast}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          me={me}
          onClose={() => setSettingsOpen(false)}
          onLogout={onLogout}
          showToast={showToast}
        />
      )}

      {editOpen && (
        <EditProfileModal
          pet={pet}
          onClose={() => setEditOpen(false)}
          showToast={showToast}
          onSaved={(updated) => {
            setEditOpen(false);
            setMe((prev) => ({ ...prev, pet: { ...prev.pet, ...updated } }));
          }}
        />
      )}
    </section>
  );
}
