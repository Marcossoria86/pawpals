import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';
import PetAvatar from './PetAvatar';
import ImageCropper from './ImageCropper';
import { IconCamera, IconGallery, IconClose, IconPawSmall, IconVolume } from './Icons';

// El video de una historia, con el mismo arreglo que le hicimos a los
// reels: fijamos "muted" a mano sobre el elemento (no sólo como prop de
// React) porque si no, algunos navegadores no dejan arrancar el video solo
// y queda trabado en un cuadro negro. También agregamos un botón de
// silenciar aparte, igual que en reels.
function StoryVideo({ src, onEnded }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = muted;
    el.play().catch(() => {});
  }, [muted, src]);

  return (
    <>
      <video ref={videoRef} src={src} autoPlay playsInline muted={muted} onEnded={onEnded} />
      <button
        type="button"
        className="story-mute-btn"
        onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
      >
        <IconVolume muted={muted} size={18} />
      </button>
    </>
  );
}

// El visor de historias se monta con un Portal directo a <body> — así queda
// SIEMPRE por encima de todo (header, cuadro de "publicar", barra de abajo)
// sin importar en qué parte del feed esté anidado, evitando el bug de
// z-index/posición fija dentro de contenedores con scroll en Safari/iOS.
function StoryViewerOverlay({ group, storyIndex, onClose, onNext, onPrev }) {
  const story = group.stories[storyIndex];
  return createPortal(
    <div className="story-viewer" onClick={onClose}>
      <div className="story-viewer-inner" onClick={(e) => e.stopPropagation()}>
        <div className="story-progress-row">
          {group.stories.map((s, i) => (
            <div key={s.id} className="story-progress-bar">
              <div className={`story-progress-fill ${i < storyIndex ? 'full' : i === storyIndex ? 'active' : ''}`} />
            </div>
          ))}
        </div>
        <div className="story-viewer-head">
          <PetAvatar photoUrl={group.photo_url} species={group.species} color={group.color} size={32} />
          <span>{group.pet_name}</span>
          <button className="story-close" onClick={onClose}><IconClose size={18} /></button>
        </div>
        <div className="story-media">
          {story.media_type === 'video'
            ? <StoryVideo src={story.media_url} onEnded={onNext} />
            : <img src={story.media_url} alt="" />}
        </div>
        <div className="story-tap-zone left" onClick={onPrev} />
        <div className="story-tap-zone right" onClick={onNext} />
      </div>
    </div>,
    document.body
  );
}

// Fila de historias arriba del feed, estilo Facebook/Instagram: círculos con
// las mascotas que publicaron algo en las últimas 24hs, la propia primero,
// más un botón para agregar una historia nueva (foto o video corto).
export default function StoriesRow({ showToast }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null); // { groupIndex, storyIndex }
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const timerRef = useRef(null);

  function uploadStoryFile(file) {
    setUploading(true);
    api.createStory(file)
      .then(() => { showToast('¡Historia publicada!'); return load(); })
      .catch((err) => showToast(err.message))
      .finally(() => setUploading(false));
  }

  async function load() {
    try {
      const data = await api.stories();
      setGroups(data);
    } catch (err) {
      // Las historias son un extra visual: si fallan, no bloqueamos el feed.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handlePickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      showToast('Ese archivo no es una foto ni un video');
      return;
    }
    // Las fotos se pueden acomodar antes de subir; los videos se suben tal
    // cual (recortar un video ya no es un simple "encuadre" como con una
    // imagen).
    if (file.type.startsWith('image/')) {
      setCropFile(file);
    } else {
      uploadStoryFile(file);
    }
  }

  function handleCropConfirm(croppedFile) {
    setCropFile(null);
    uploadStoryFile(croppedFile);
  }

  function openViewer(groupIndex) {
    setViewer({ groupIndex, storyIndex: 0 });
  }

  function closeViewer() {
    setViewer(null);
  }

  function nextStory() {
    setViewer((v) => {
      if (!v) return v;
      const group = groups[v.groupIndex];
      if (!group) return null;
      if (v.storyIndex < group.stories.length - 1) return { ...v, storyIndex: v.storyIndex + 1 };
      if (v.groupIndex < groups.length - 1) return { groupIndex: v.groupIndex + 1, storyIndex: 0 };
      return null;
    });
  }

  function prevStory() {
    setViewer((v) => {
      if (!v) return v;
      if (v.storyIndex > 0) return { ...v, storyIndex: v.storyIndex - 1 };
      if (v.groupIndex > 0) {
        const prevGroup = groups[v.groupIndex - 1];
        return { groupIndex: v.groupIndex - 1, storyIndex: prevGroup.stories.length - 1 };
      }
      return v;
    });
  }

  // Auto-avance para historias de foto (los videos avanzan solos con onEnded).
  useEffect(() => {
    if (!viewer) return;
    const group = groups[viewer.groupIndex];
    const story = group?.stories[viewer.storyIndex];
    if (!story || story.media_type === 'video') return;
    timerRef.current = setTimeout(nextStory, 4500);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, groups]);

  if (loading) return null;

  const myGroupIndex = groups.findIndex((g) => g.is_mine);
  const hasMyStory = myGroupIndex >= 0;
  const others = groups.filter((g) => !g.is_mine);

  return (
    <div className="stories-row">
      <div className="story-circle add-story">
        {/* El anillo de color (como en Instagram) sólo aparece cuando ya hay
            una historia activa; si no hay, el anillo queda gris y tocar el
            avatar abre la cámara para crear la primera. */}
        <div className={`story-avatar-wrap ${hasMyStory ? '' : 'add'}`}>
          {hasMyStory ? (
            <span onClick={() => openViewer(myGroupIndex)}>
              <PetAvatar photoUrl={groups[myGroupIndex].photo_url} species={groups[myGroupIndex].species} color={groups[myGroupIndex].color} size={56} />
            </span>
          ) : (
            <div className="story-avatar-empty" onClick={() => cameraInputRef.current?.click()}>
              <IconPawSmall size={26} />
            </div>
          )}
          <span
            className="story-add-badge"
            onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
            title="Tomar foto o video"
          >
            {uploading ? '…' : <IconCamera size={15} />}
          </span>
          <span
            className="story-gallery-badge"
            onClick={(e) => { e.stopPropagation(); galleryInputRef.current?.click(); }}
            title="Elegir de la galería"
          >
            <IconGallery size={12} />
          </span>
        </div>
        <span className="story-label">Tu historia</span>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handlePickFile}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={handlePickFile}
        />
      </div>

      {others.map((g) => {
        const idx = groups.indexOf(g);
        return (
          <div className="story-circle" key={g.pet_id} onClick={() => openViewer(idx)}>
            <div className="story-avatar-wrap">
              <PetAvatar photoUrl={g.photo_url} species={g.species} color={g.color} size={56} />
            </div>
            <span className="story-label">{g.pet_name}</span>
          </div>
        );
      })}

      {viewer && groups[viewer.groupIndex] && (
        <StoryViewerOverlay
          group={groups[viewer.groupIndex]}
          storyIndex={viewer.storyIndex}
          onClose={closeViewer}
          onNext={nextStory}
          onPrev={prevStory}
        />
      )}

      {cropFile && (
        <ImageCropper
          file={cropFile}
          aspect={9 / 16}
          title="Acomodá tu historia"
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  );
}
