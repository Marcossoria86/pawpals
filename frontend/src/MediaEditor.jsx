import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconClose, IconText, IconSticker, IconMusic, IconTrash, IconPlayPause } from './Icons';

const TEXT_COLORS = ['#ffffff', '#2b2320', '#c9683f', '#5b8c6e', '#e0b23c', '#7a5fb0'];
const EMOJIS = ['🐾', '❤️', '😂', '😍', '🥰', '🎉', '🔥', '⭐', '😺', '🐶', '🦴', '🎾', '✨', '👀', '😴', '🥺', '💛', '🐦', '🐰', '🌈', '☀️', '🌙', '💯', '👏'];

// Editor tipo Instagram para agregar texto, stickers de emoji y (en
// historias) música propia arriba de una foto o video — historias y reels
// comparten este mismo componente. El texto/sticker no se "quema" en los
// píxeles: se guarda como una lista aparte (overlays) con la posición en
// porcentaje del marco, y esa lista se dibuja arriba del medio tanto acá
// (para poder moverlos) como después, al verlo, con OverlayLayer.
//
// La música es un audio que la propia persona elige de su teléfono — no
// hay ninguna librería de canciones con derechos de autor de por medio; la
// responsabilidad de tener permiso para usar ese audio es de quien lo sube
// (mismo esquema que YouTube/SoundCloud), por eso el aviso abajo del picker.
//
// Portal a <body> por la misma razón que el resto de los modales de
// pantalla completa de la app (ver ImageCropper).
export default function MediaEditor({
  mediaUrl,
  mediaType = 'image',
  aspect = 9 / 16,
  allowMusic = false,
  title = 'Editar',
  confirmLabel = 'Publicar',
  onConfirm,
  onCancel
}) {
  const [overlays, setOverlays] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [panel, setPanel] = useState(null); // null | 'text' | 'sticker' | 'music'
  const [textDraft, setTextDraft] = useState('');
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);
  const [musicFile, setMusicFile] = useState(null);
  const [musicPreviewUrl, setMusicPreviewUrl] = useState(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [muteOriginal, setMuteOriginal] = useState(false);

  const frameRef = useRef(null);
  const dragRef = useRef(null);
  const idCounterRef = useRef(1);
  const previewAudioRef = useRef(null);
  const musicInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (musicPreviewUrl) URL.revokeObjectURL(musicPreviewUrl);
    };
  }, [musicPreviewUrl]);

  function nextId() {
    idCounterRef.current += 1;
    return idCounterRef.current;
  }

  function addOverlay(type, content, extra = {}) {
    const id = nextId();
    setOverlays((prev) => [...prev, { id, type, content, xPct: 50, yPct: 45, scale: 1, ...extra }]);
    setSelectedId(id);
    setPanel(null);
  }

  function handleAddText() {
    const text = textDraft.trim();
    if (!text) return;
    addOverlay('text', text.slice(0, 60), { color: textColor });
    setTextDraft('');
  }

  function updateSelected(patch) {
    setOverlays((prev) => prev.map((o) => (o.id === selectedId ? { ...o, ...patch } : o)));
  }

  function deleteSelected() {
    setOverlays((prev) => prev.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  }

  function handleItemPointerDown(e, id) {
    e.stopPropagation();
    setSelectedId(id);
    setPanel(null);
    // Si falla la captura (puede pasar en algunos navegadores) seguimos
    // igual: no queremos que el arrastre quede roto por eso.
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* noop */ }
    const item = overlays.find((o) => o.id === id);
    if (!item) return;
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, startXPct: item.xPct, startYPct: item.yPct };
  }

  function handleFramePointerMove(e) {
    if (!dragRef.current || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const dxPct = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
    const xPct = Math.max(4, Math.min(96, dragRef.current.startXPct + dxPct));
    const yPct = Math.max(4, Math.min(96, dragRef.current.startYPct + dyPct));
    setOverlays((prev) => prev.map((o) => (o.id === dragRef.current.id ? { ...o, xPct, yPct } : o)));
  }

  function handleFramePointerUp() {
    dragRef.current = null;
  }

  function handlePickMusic(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) return;
    if (musicPreviewUrl) URL.revokeObjectURL(musicPreviewUrl);
    setMusicFile(file);
    setMusicPreviewUrl(URL.createObjectURL(file));
    setPreviewPlaying(false);
  }

  function removeMusic() {
    previewAudioRef.current?.pause();
    if (musicPreviewUrl) URL.revokeObjectURL(musicPreviewUrl);
    setMusicFile(null);
    setMusicPreviewUrl(null);
    setPreviewPlaying(false);
  }

  function togglePreview() {
    const el = previewAudioRef.current;
    if (!el) return;
    if (previewPlaying) {
      el.pause();
      setPreviewPlaying(false);
    } else {
      el.currentTime = 0;
      el.play().catch(() => {});
      setPreviewPlaying(true);
    }
  }

  function handleConfirm() {
    previewAudioRef.current?.pause();
    onConfirm({ overlays, musicFile, muteOriginal });
  }

  const selected = overlays.find((o) => o.id === selectedId);

  return createPortal(
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card cropper-card editor-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title-row">
          <div className="modal-title">{title}</div>
          <button type="button" className="modal-close-x" onClick={onCancel} aria-label="Cerrar">
            <IconClose size={20} />
          </button>
        </div>

        <div
          className="cropper-frame editor-frame"
          ref={frameRef}
          style={{ aspectRatio: aspect }}
          onPointerMove={handleFramePointerMove}
          onPointerUp={handleFramePointerUp}
          onPointerLeave={handleFramePointerUp}
          onClick={() => setSelectedId(null)}
        >
          {mediaType === 'video' ? (
            <video className="editor-media" src={mediaUrl} autoPlay muted loop playsInline />
          ) : (
            <img className="editor-media" src={mediaUrl} alt="" />
          )}
          {overlays.map((o) => (
            <div
              key={o.id}
              className={`overlay-item overlay-${o.type} editor-overlay-item ${o.id === selectedId ? 'selected' : ''}`}
              style={{
                left: `${o.xPct}%`,
                top: `${o.yPct}%`,
                fontSize: o.type === 'text' ? `${22 * o.scale}px` : `${34 * o.scale}px`,
                color: o.type === 'text' ? o.color : undefined
              }}
              onPointerDown={(e) => handleItemPointerDown(e, o.id)}
            >
              {o.content}
            </div>
          ))}
        </div>

        {selected && (
          <div className="editor-selected-row">
            <span className="cropper-zoom-label">Tamaño</span>
            <input
              type="range" min="0.5" max="2.5" step="0.05"
              value={selected.scale}
              onChange={(e) => updateSelected({ scale: Number(e.target.value) })}
            />
            <button type="button" className="editor-delete-btn" onClick={deleteSelected} aria-label="Eliminar">
              <IconTrash size={17} />
            </button>
          </div>
        )}

        <div className="editor-toolbar">
          <button type="button" className={`editor-tool-btn ${panel === 'text' ? 'active' : ''}`} onClick={() => setPanel((p) => (p === 'text' ? null : 'text'))}>
            <IconText size={18} /> <span>Texto</span>
          </button>
          <button type="button" className={`editor-tool-btn ${panel === 'sticker' ? 'active' : ''}`} onClick={() => setPanel((p) => (p === 'sticker' ? null : 'sticker'))}>
            <IconSticker size={18} /> <span>Stickers</span>
          </button>
          {allowMusic && (
            <button type="button" className={`editor-tool-btn ${panel === 'music' ? 'active' : ''} ${musicFile || muteOriginal ? 'has-value' : ''}`} onClick={() => setPanel((p) => (p === 'music' ? null : 'music'))}>
              <IconMusic size={18} /> <span>{musicFile ? 'Tu música' : 'Música'}</span>
            </button>
          )}
        </div>

        {panel === 'text' && (
          <div className="editor-panel">
            <input
              type="text" className="modal-text-input editor-text-input"
              placeholder="Escribí algo…" maxLength={60} autoFocus
              value={textDraft} onChange={(e) => setTextDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddText(); }}
            />
            <div className="editor-color-row">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c} type="button"
                  className={`editor-color-swatch ${textColor === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setTextColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
            <button type="button" className="modal-btn-primary editor-panel-confirm" onClick={handleAddText} disabled={!textDraft.trim()}>
              Agregar texto
            </button>
          </div>
        )}

        {panel === 'sticker' && (
          <div className="editor-panel">
            <div className="editor-emoji-grid">
              {EMOJIS.map((em) => (
                <button key={em} type="button" className="editor-emoji-btn" onClick={() => addOverlay('sticker', em)}>
                  {em}
                </button>
              ))}
            </div>
          </div>
        )}

        {panel === 'music' && allowMusic && (
          <div className="editor-panel">
            {mediaType === 'video' && (
              <label className="editor-mute-row">
                <input
                  type="checkbox"
                  checked={muteOriginal}
                  onChange={(e) => setMuteOriginal(e.target.checked)}
                />
                <span>Silenciar el audio original del video</span>
              </label>
            )}

            {!musicFile ? (
              <button type="button" className="editor-reopen-btn editor-pick-music-btn" onClick={() => musicInputRef.current?.click()}>
                <IconMusic size={15} /> Elegir audio de tu teléfono
              </button>
            ) : (
              <div className="editor-music-row selected">
                <button type="button" className="editor-music-preview-btn" onClick={togglePreview}>
                  <IconPlayPause playing={previewPlaying} size={16} />
                </button>
                <span className="editor-music-name-btn" style={{ flex: 1 }}>{musicFile.name}</span>
                <button type="button" className="editor-delete-btn" onClick={removeMusic} aria-label="Quitar música">
                  <IconTrash size={15} />
                </button>
              </div>
            )}
            <input
              ref={musicInputRef}
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={handlePickMusic}
            />
            {musicPreviewUrl && (
              <audio ref={previewAudioRef} src={musicPreviewUrl} onEnded={() => setPreviewPlaying(false)} />
            )}
            <p className="editor-music-disclaimer">
              Es tu responsabilidad tener los derechos para usar este audio (por ejemplo, una grabación propia).
            </p>
          </div>
        )}

        <div className="cropper-hint">Arrastrá el texto o el sticker para moverlo</div>
        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="modal-btn-primary" onClick={handleConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
