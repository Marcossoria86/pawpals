import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';
import ImageCropper from './ImageCropper';
import MediaEditor from './MediaEditor';
import ErrorBoundary from './ErrorBoundary';

// Cuando el selector de fotos (MediaPickerModal) se usa para crear un tipo
// de contenido DISTINTO al "dueño" natural de esa pantalla — por ejemplo,
// elegís "HISTORIA" o "REEL" desde el botón de cámara del feed, o
// "PUBLICACIÓN"/"REEL" desde el de historias — este componente se encarga
// de esa publicación puntual: recorte (si corresponde) + editor + subida,
// el mismo camino que ya usan FeedView/StoriesRow/ReelsView para su propio
// tipo, así no hay que repetir esa lógica en cada lugar tres veces.
//
// kind: 'post' | 'story' | 'reel' — a qué se termina publicando.
// onDone(kind) se llama recién cuando la subida terminó bien, para que
// quien montó este componente pueda avisarle a la pantalla de ese tipo que
// se actualice (ver refreshSignal en App.jsx).
export default function CrossPostFlow({ kind, file, onDone, onCancel, showToast }) {
  const needsCrop = kind !== 'reel' && file.type.startsWith('image/');
  const [stage, setStage] = useState(needsCrop ? 'crop' : kind === 'reel' ? 'caption' : 'editor');
  const [workingFile, setWorkingFile] = useState(needsCrop ? null : file);
  const [mediaUrl, setMediaUrl] = useState(needsCrop ? null : URL.createObjectURL(file));
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    return () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCropConfirm(cropped) {
    setWorkingFile(cropped);
    setMediaUrl(URL.createObjectURL(cropped));
    setStage(kind === 'post' ? 'caption' : 'editor');
  }

  function handleCaptionContinue() {
    if (kind === 'post') {
      finish();
    } else {
      setStage('editor');
    }
  }

  async function finish(editorResult = {}) {
    const { overlays = [], musicFile, muteOriginal, taggedPetIds } = editorResult;
    setPosting(true);
    try {
      if (kind === 'post') {
        await api.createPost({ caption, photoFile: workingFile });
        showToast('¡Publicado en el feed!');
      } else if (kind === 'story') {
        await api.createStory(workingFile, { overlays, musicFile, muteOriginal, taggedPetIds });
        showToast('¡Historia publicada!');
      } else if (kind === 'reel') {
        await api.createReel({ caption, videoFile: workingFile, overlays });
        showToast('¡Reel publicado!');
      }
      onDone(kind);
    } catch (err) {
      showToast(err.message);
      setPosting(false);
    }
  }

  if (stage === 'crop') {
    return (
      <ErrorBoundary onReset={onCancel} label="crosspost-cropper">
        <ImageCropper
          file={file}
          aspect={kind === 'post' ? 4 / 3 : 9 / 16}
          title={kind === 'post' ? 'Acomodá la foto de tu publicación' : 'Acomodá tu historia'}
          onConfirm={handleCropConfirm}
          onCancel={onCancel}
        />
      </ErrorBoundary>
    );
  }

  if (stage === 'caption') {
    // Los reels (y los posts) admiten un texto opcional — pero no pasan
    // por el editor de texto/stickers/música para eso, así que se pide acá
    // antes (para reels) o en vez de (para posts) abrir ese editor.
    return createPortal(
      <div className="modal-backdrop" onClick={() => !posting && onCancel()}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-title">{kind === 'post' ? 'Publicar en el feed' : 'Escribí un texto (opcional)'}</div>
          <input
            type="text"
            className="modal-text-input"
            placeholder={kind === 'post' ? 'Escribí algo (opcional)' : 'Texto del reel (opcional)'}
            maxLength={140}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            autoFocus
          />
          <div className="modal-actions">
            <button className="modal-btn-secondary" onClick={onCancel} disabled={posting}>Cancelar</button>
            <button className="modal-btn-primary" onClick={handleCaptionContinue} disabled={posting}>
              {kind === 'post' ? (posting ? 'Publicando…' : 'Publicar') : 'Continuar'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // stage === 'editor' (historias y reels)
  return (
    <ErrorBoundary onReset={onCancel} label="crosspost-editor" message="No pudimos abrir el editor. Cerrá e intentá de nuevo — podés seguir usando la app mientras tanto.">
      <MediaEditor
        mediaUrl={mediaUrl}
        mediaType={file.type.startsWith('video/') ? 'video' : 'image'}
        aspect={9 / 16}
        allowMusic={kind === 'story'}
        allowTagging={kind === 'story'}
        showToast={showToast}
        title={kind === 'story' ? 'Agregá texto, stickers o música' : 'Agregá texto o stickers al reel'}
        confirmLabel={posting ? 'Publicando…' : kind === 'story' ? 'Publicar historia' : 'Publicar reel'}
        onConfirm={finish}
        onCancel={onCancel}
      />
    </ErrorBoundary>
  );
}
