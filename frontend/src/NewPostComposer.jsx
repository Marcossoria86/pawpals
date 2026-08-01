import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';
import PetAvatar from './PetAvatar';
import MediaPickerModal from './MediaPickerModal';
import ImageCropper from './ImageCropper';
import ErrorBoundary from './ErrorBoundary';
import { IconClose, IconCamera } from './Icons';

// Pantalla completa de "Nueva publicación", estilo Facebook: se abre tanto
// al tocar la barra "¿Qué está haciendo tu mascota hoy?" del feed como
// desde el menú "+" del header (ver App.jsx) — por eso vive como su propio
// componente en vez de estar mezclado adentro de FeedView, así las dos
// entradas comparten exactamente la misma pantalla sin duplicar lógica.
export default function NewPostComposer({ me, onClose, onPosted, showToast }) {
  const [caption, setCaption] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cropFile, setCropFile] = useState(null);

  function handlePickerSelect(file) {
    setPickerOpen(false);
    if (!file.type.startsWith('image/')) {
      showToast('Ese archivo no es una imagen');
      return;
    }
    setCropFile(file);
  }

  function handleCropConfirm(cropped) {
    setPhotoFile(cropped);
    setPhotoPreview(URL.createObjectURL(cropped));
    setCropFile(null);
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  async function handlePost() {
    if (!caption.trim() && !photoFile) return;
    setPosting(true);
    try {
      await api.createPost({ caption, photoFile });
      showToast('¡Publicado en el feed!');
      onPosted();
    } catch (err) {
      showToast(err.message);
      setPosting(false);
    }
  }

  const pet = me?.pet;

  return createPortal(
    <div className="postnew-modal">
      <div className="picker-head">
        <button type="button" className="picker-icon-btn" onClick={onClose} disabled={posting} aria-label="Cerrar">
          <IconClose size={22} />
        </button>
        <span className="picker-title">Nueva publicación</span>
        <span style={{ width: 40 }} />
      </div>

      <div className="postnew-user-row">
        <PetAvatar photoUrl={pet?.photo_url} species={pet?.species} color={pet?.color} size={40} />
        <span>{pet?.name || 'Vos'}</span>
      </div>

      <textarea
        className="postnew-textarea"
        placeholder="¿Qué está haciendo tu mascota hoy?"
        maxLength={140}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        autoFocus
      />

      {photoPreview && (
        <div className="postnew-photo-preview">
          <img src={photoPreview} alt="Foto a publicar" />
          <button type="button" onClick={clearPhoto} aria-label="Quitar foto">
            <IconClose size={14} />
          </button>
        </div>
      )}

      <div className="postnew-bottom-row">
        <button type="button" className="postnew-photo-btn" onClick={() => setPickerOpen(true)}>
          <IconCamera size={18} /> {photoFile ? 'Cambiar foto' : 'Foto'}
        </button>
        <button
          type="button"
          className="postnew-publish-btn"
          onClick={handlePost}
          disabled={(!caption.trim() && !photoFile) || posting}
        >
          {posting ? 'Publicando…' : 'Publicar'}
        </button>
      </div>

      {pickerOpen && (
        <MediaPickerModal
          destination="post"
          allowedDestinations={['post']}
          onSelect={handlePickerSelect}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {cropFile && (
        <ErrorBoundary onReset={() => setCropFile(null)} label="newpost-cropper">
          <ImageCropper
            file={cropFile}
            aspect={4 / 3}
            title="Acomodá la foto de tu publicación"
            onConfirm={handleCropConfirm}
            onCancel={() => setCropFile(null)}
          />
        </ErrorBoundary>
      )}
    </div>,
    document.body
  );
}
