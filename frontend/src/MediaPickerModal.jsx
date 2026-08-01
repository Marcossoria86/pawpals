import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconClose, IconChevronRight, IconCamera, IconGallery, IconCheck, IconPlayPause } from './Icons';

const DEST_LABELS = { post: 'PUBLICACIÓN', story: 'HISTORIA', reel: 'REEL' };
const DEST_TITLES = { post: 'Nueva publicación', story: 'Nueva historia', reel: 'Nuevo reel', profile: 'Foto de perfil', cover: 'Foto de portada' };

function acceptFor(dest) {
  if (dest === 'reel') return 'video/*';
  if (dest === 'story') return 'image/*,video/*';
  return 'image/*'; // post, profile
}

function fitsDestination(item, dest) {
  const accept = acceptFor(dest);
  if (accept === 'video/*') return item.kind === 'video';
  if (accept === 'image/*') return item.kind === 'image';
  return true; // image/*,video/*
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

let itemIdCounter = 1;

// Selector de fotos/videos a pantalla completa, estilo Instagram: es lo que
// se abre al tocar la cámara en el feed, en historias o en el perfil, con
// la misma pinta en los tres lugares.
//
// Ojo con una limitación real: un sitio web (ni siquiera instalado como
// app/PWA) no puede mostrar de entrada una grilla con "tus últimas fotos"
// sin que vos elijas antes con el selector nativo del sistema — los
// navegadores no dan ese acceso por privacidad. Por eso acá se ve una
// grilla vacía con un botón para elegir (que abre el selector nativo, que
// en el celular ya te muestra tus fotos recientes primero) y, una vez que
// elegís, esas quedan mostradas en ESTA grilla propia para poder tocar y
// cambiar cuál usar sin tener que volver a abrir el selector del sistema.
//
// La píldora de abajo (PUBLICACIÓN/HISTORIA/REEL) es de verdad funcional:
// tocarla cambia a qué tipo de contenido se manda lo que elijas — el
// componente que abrió este selector (Feed/Historias) decide qué hacer
// según el destino que reciba en onSelect(file, destination).
export default function MediaPickerModal({
  destination: initialDestination = 'post',
  allowedDestinations = ['post'],
  onSelect,
  onClose
}) {
  const [destination, setDestination] = useState(initialDestination);
  const [activeTab, setActiveTab] = useState('recientes');
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    return () => {
      items.forEach((it) => URL.revokeObjectURL(it.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si cambiás de PUBLICACIÓN a REEL (por ejemplo) y lo que tenías elegido
  // era una foto, esa selección ya no vale para el nuevo tipo — la
  // soltamos para no confirmar por error algo que no corresponde.
  useEffect(() => {
    setSelectedId((id) => {
      const item = items.find((it) => it.id === id);
      return item && fitsDestination(item, destination) ? id : null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination]);

  function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const newItems = files.map((file) => ({
      id: itemIdCounter++,
      file,
      url: URL.createObjectURL(file),
      kind: file.type.startsWith('video/') ? 'video' : 'image'
    }));
    setItems((prev) => [...newItems, ...prev]);
    setSelectedId(newItems[0].id);
  }

  function handleGalleryChange(e) {
    addFiles(e.target.files);
    e.target.value = '';
  }

  function handleCameraChange(e) {
    addFiles(e.target.files);
    e.target.value = '';
  }

  function handleConfirm() {
    const chosen = items.find((it) => it.id === selectedId);
    if (!chosen) return;
    onSelect(chosen.file, destination);
  }

  const previewItem = items.find((it) => it.id === selectedId);
  const visibleItems = items.filter((it) => fitsDestination(it, destination));
  const showSwitcher = allowedDestinations.length > 1;

  return createPortal(
    <div className="picker-modal">
      <div className="picker-head">
        <button type="button" className="picker-icon-btn" onClick={onClose} aria-label="Cerrar">
          <IconClose size={22} />
        </button>
        <span className="picker-title">{DEST_TITLES[destination] || 'Nueva publicación'}</span>
        <button
          type="button"
          className="picker-icon-btn picker-next-btn"
          onClick={handleConfirm}
          disabled={!selectedId}
          aria-label="Siguiente"
        >
          <IconChevronRight size={24} />
        </button>
      </div>

      <div className="picker-preview">
        {previewItem ? (
          previewItem.kind === 'video' ? (
            <video src={previewItem.url} className="picker-preview-media" autoPlay muted loop playsInline />
          ) : (
            <img src={previewItem.url} alt="" className="picker-preview-media" />
          )
        ) : (
          <div className="picker-preview-empty">
            <IconGallery size={40} />
            <span>Elegí una foto o un video</span>
          </div>
        )}
      </div>

      <div className="picker-tabs-row">
        <div className="picker-tabs">
          <button
            type="button"
            className={activeTab === 'recientes' ? 'active' : ''}
            onClick={() => setActiveTab('recientes')}
          >
            Recientes
          </button>
          <button
            type="button"
            className={activeTab === 'borradores' ? 'active' : ''}
            onClick={() => setActiveTab('borradores')}
          >
            Borradores
          </button>
        </div>
      </div>

      {activeTab === 'recientes' ? (
        <div className="picker-grid">
          <button type="button" className="picker-grid-tile picker-tile-camera" onClick={() => cameraInputRef.current?.click()}>
            <IconCamera size={26} />
          </button>
          <button type="button" className="picker-grid-tile picker-tile-gallery" onClick={() => galleryInputRef.current?.click()}>
            <IconGallery size={24} />
            <span>Elegir</span>
          </button>
          {visibleItems.map((it) => {
            const selected = it.id === selectedId;
            return (
              <button
                type="button"
                key={it.id}
                className={`picker-grid-tile picker-thumb ${selected ? 'selected' : ''}`}
                onClick={() => setSelectedId(it.id)}
              >
                {it.kind === 'video' ? (
                  <VideoThumb url={it.url} />
                ) : (
                  <img src={it.url} alt="" />
                )}
                {it.kind === 'video' && <span className="picker-thumb-play"><IconPlayPause playing size={14} /></span>}
                {selected && (
                  <span className="picker-thumb-check"><IconCheck size={14} /></span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="picker-drafts-empty">Todavía no tenés borradores guardados.</div>
      )}

      {showSwitcher && (
        <div className="picker-dest-pill-row">
          <div className="picker-dest-pill">
            {allowedDestinations.map((d) => (
              <button
                key={d}
                type="button"
                className={d === destination ? 'active' : ''}
                onClick={() => setDestination(d)}
              >
                {DEST_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        ref={galleryInputRef}
        type="file"
        accept={acceptFor(destination)}
        style={{ display: 'none' }}
        onChange={handleGalleryChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={acceptFor(destination)}
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleCameraChange}
      />
    </div>,
    document.body
  );
}

// Miniatura de un video elegido: no podemos pedirle al navegador un
// "thumbnail" ya hecho, así que mostramos el primer cuadro pausado (con
// preload="metadata", liviano) y calculamos la duración para el badge.
function VideoThumb({ url }) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(null);

  function handleLoaded() {
    const d = videoRef.current?.duration;
    if (Number.isFinite(d)) setDuration(d);
  }

  return (
    <>
      <video ref={videoRef} src={url} muted preload="metadata" onLoadedMetadata={handleLoaded} />
      {duration != null && <span className="picker-thumb-duration">{formatDuration(duration)}</span>}
    </>
  );
}
