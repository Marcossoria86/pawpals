import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';
import PetAvatar from './PetAvatar';
import ImageCropper from './ImageCropper';
import MediaEditor from './MediaEditor';
import MediaPickerModal from './MediaPickerModal';
import OverlayLayer from './OverlayLayer';
import ErrorBoundary from './ErrorBoundary';
import { IconCamera, IconClose, IconPawSmall, IconVolume } from './Icons';

// Música de una historia — un audio que la propia persona subió (no una
// librería nuestra). Mismo patrón que StoryVideo: "muted" a mano sobre el
// elemento real y un botón para (des)silenciar, así el navegador no bloquea
// el autoplay por no ser un gesto directo del usuario. `offset` la corre un
// poco a la izquierda cuando el video de la historia TAMBIÉN tiene su
// propio botón de silenciar (para que no queden los dos pisados).
function StoryAudio({ src, offset }) {
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = muted;
    el.play().catch(() => {});
  }, [muted, src]);

  return (
    <>
      <audio ref={audioRef} src={src} autoPlay loop muted={muted} />
      <button
        type="button"
        className={`story-mute-btn story-music-btn ${offset ? 'offset' : ''}`}
        onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
      >
        <IconVolume muted={muted} size={18} />
      </button>
    </>
  );
}

// El video de una historia, con el mismo arreglo que le hicimos a los
// reels: fijamos "muted" a mano sobre el elemento (no sólo como prop de
// React) porque si no, algunos navegadores no dejan arrancar el video solo
// y queda trabado en un cuadro negro. `forceMuted` se usa cuando la
// historia tiene música propia Y quien la subió eligió silenciar el audio
// original: ahí no tiene sentido mostrar un botón para "des-silenciarlo".
function StoryVideo({ src, onEnded, forceMuted = false }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const effectiveMuted = forceMuted || muted;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = effectiveMuted;
    el.play().catch(() => {});
  }, [effectiveMuted, src]);

  return (
    <>
      <video ref={videoRef} src={src} autoPlay playsInline muted={effectiveMuted} onEnded={onEnded} />
      {!forceMuted && (
        <button
          type="button"
          className="story-mute-btn"
          onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
        >
          <IconVolume muted={muted} size={18} />
        </button>
      )}
    </>
  );
}

// El visor de historias se monta con un Portal directo a <body> — así queda
// SIEMPRE por encima de todo (header, cuadro de "publicar", barra de abajo)
// sin importar en qué parte del feed esté anidado, evitando el bug de
// z-index/posición fija dentro de contenedores con scroll en Safari/iOS.
function StoryViewerOverlay({ group, storyIndex, onClose, onNext, onPrev }) {
  const story = group.stories[storyIndex];
  const hasMusic = !!story.music_url;
  const isVideo = story.media_type === 'video';
  // Sólo forzamos mute del video si hay música Y la persona pidió
  // silenciarlo — si no, se escuchan las dos cosas (audio original + su
  // música) porque eligió no silenciarlo.
  const forceMuted = hasMusic && isVideo && story.mute_original;
  // Si el video conserva su propio audio Y además hay música, van a
  // convivir dos botones de silenciar — así que corremos el de la música un
  // poco para el costado para que no se pisen.
  const musicOffset = isVideo && hasMusic && !story.mute_original;
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
          {isVideo
            ? <StoryVideo src={story.media_url} onEnded={onNext} forceMuted={forceMuted} />
            : <img src={story.media_url} alt="" />}
          {hasMusic && <StoryAudio src={story.music_url} offset={musicOffset} />}
          <OverlayLayer overlays={story.overlays} />
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
  const [editFile, setEditFile] = useState(null);
  const [editUrl, setEditUrl] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const timerRef = useRef(null);

  function uploadStoryFile(file, extra) {
    setUploading(true);
    api.createStory(file, extra)
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

  function handlePickerSelect(file) {
    setPickerOpen(false);
    // Las fotos se pueden acomodar (recortar) antes de subir; los videos no
    // (recortar un video ya no es un simple "encuadre" como con una
    // imagen). Ambos pasan por el editor de texto/stickers/música antes de
    // publicarse.
    if (file.type.startsWith('image/')) {
      setCropFile(file);
    } else {
      openEditor(file);
    }
  }

  function openEditor(file) {
    setEditFile(file);
    setEditUrl(URL.createObjectURL(file));
  }

  function closeEditor() {
    if (editUrl) URL.revokeObjectURL(editUrl);
    setEditFile(null);
    setEditUrl(null);
  }

  function handleCropConfirm(croppedFile) {
    setCropFile(null);
    openEditor(croppedFile);
  }

  function handleEditorConfirm({ overlays, musicFile, muteOriginal }) {
    const file = editFile;
    closeEditor();
    uploadStoryFile(file, { overlays, musicFile, muteOriginal });
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
            <div className="story-avatar-empty" onClick={() => setPickerOpen(true)}>
              <IconPawSmall size={26} />
            </div>
          )}
          <span
            className="story-add-badge"
            onClick={(e) => { e.stopPropagation(); setPickerOpen(true); }}
            title="Agregar historia"
          >
            {uploading ? '…' : <IconCamera size={15} />}
          </span>
        </div>
        <span className="story-label">Tu historia</span>
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

      {pickerOpen && (
        <MediaPickerModal
          destination="story"
          allowedDestinations={['post', 'story', 'reel']}
          onSelect={handlePickerSelect}
          onClose={() => setPickerOpen(false)}
          showToast={showToast}
        />
      )}

      {cropFile && (
        <ErrorBoundary onReset={() => setCropFile(null)} label="story-cropper">
          <ImageCropper
            file={cropFile}
            aspect={9 / 16}
            title="Acomodá tu historia"
            onConfirm={handleCropConfirm}
            onCancel={() => setCropFile(null)}
          />
        </ErrorBoundary>
      )}

      {editFile && (
        <ErrorBoundary onReset={closeEditor} label="story-editor" message="No pudimos abrir el editor de texto/stickers. Cerrá e intentá de nuevo — podés seguir usando la app mientras tanto.">
          <MediaEditor
            mediaUrl={editUrl}
            mediaType={editFile.type.startsWith('video/') ? 'video' : 'image'}
            aspect={9 / 16}
            allowMusic
            title="Agregá texto, stickers o música"
            confirmLabel="Publicar historia"
            onConfirm={handleEditorConfirm}
            onCancel={closeEditor}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
