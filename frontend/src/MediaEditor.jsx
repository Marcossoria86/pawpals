import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconClose, IconText, IconSticker, IconMusic, IconTrash, IconPlayPause } from './Icons';

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Ángulo (en grados) entre dos puntos, para medir cuánto giraron los dos
// dedos de un pellizco entre un instante y el siguiente.
function angleBetween(a, b) {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

// Lleva cualquier ángulo a un valor equivalente entre -180 y 180 — así el
// giro nunca "se sale" del rango que después valida el backend (ver
// sanitizeOverlays en el servidor), sin que eso le cambie el aspecto visual
// (girar 190° se ve igual que girar -170°).
function normalizeAngle(deg) {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

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
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

  const frameRef = useRef(null);
  const dragRef = useRef(null);
  const pinchRef = useRef(null);
  const pointersRef = useRef(new Map());
  const lastTapRef = useRef({ id: null, time: 0 });
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

  function patchOverlay(id, patch) {
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function deleteSelected() {
    setOverlays((prev) => prev.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  }

  // Un dedo mueve el texto/sticker de lugar (como antes). Dos dedos sobre el
  // elemento seleccionado lo agrandan/achican y lo giran a la vez — el mismo
  // gesto de "pellizcar" que ya se usa para hacer zoom a una foto, en vez de
  // sliders aparte. Un doble toque rápido sobre el elemento lo vuelve a su
  // tamaño y giro original, por si te "pasaste" y querés arrancar de nuevo
  // sin tener que ir ajustando a mano.
  function handleItemPointerDown(e, id) {
    e.stopPropagation();
    setSelectedId(id);
    setPanel(null);
    // Si falla la captura (puede pasar en algunos navegadores, sobre todo
    // al bajar el segundo dedo casi junto con el primero) seguimos igual:
    // no queremos que el gesto quede roto por eso.
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* noop */ }
    const item = overlays.find((o) => o.id === id);
    if (!item) return;

    const now = Date.now();
    if (lastTapRef.current.id === id && now - lastTapRef.current.time < 320) {
      patchOverlay(id, { scale: 1, rotation: 0 });
      lastTapRef.current = { id: null, time: 0 };
    } else {
      lastTapRef.current = { id, time: now };
    }

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      // El segundo dedo bajó justo sobre el elemento (en vez de sobre el
      // fondo del marco, que es lo que maneja handleFramePointerDown) —
      // arrancamos el pellizco acá directamente.
      startPinch(id, item);
    } else if (pointersRef.current.size === 1) {
      dragRef.current = { id, startX: e.clientX, startY: e.clientY, startXPct: item.xPct, startYPct: item.yPct };
      pinchRef.current = null;
    }
  }

  // El segundo dedo del pellizco casi siempre cae sobre el fondo del marco
  // (no exactamente sobre el textito o sticker, que es chico) — por eso el
  // marco también necesita su propio onPointerDown para sumarlo a
  // pointersRef y, si ya hay un elemento seleccionado, arrancar el pellizco.
  function handleFramePointerDown(e) {
    if (!selected) return;
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* noop */ }
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      startPinch(selected.id, selected);
    }
  }

  function startPinch(id, item) {
    const pts = Array.from(pointersRef.current.values());
    pinchRef.current = {
      id,
      startDist: dist(pts[0], pts[1]) || 1,
      startAngle: angleBetween(pts[0], pts[1]),
      startScale: item.scale,
      startRotation: item.rotation || 0
    };
    dragRef.current = null;
  }

  function handleFramePointerMove(e) {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (pointersRef.current.size === 2 && pinchRef.current) {
      // Ver el mismo comentario de "drag" más abajo: guardamos pinch acá en
      // una variable local para no volver a leer pinchRef.current adentro
      // del callback de setOverlays, por si cambia entre medio.
      const pinch = pinchRef.current;
      const pts = Array.from(pointersRef.current.values());
      const d = dist(pts[0], pts[1]);
      const angle = angleBetween(pts[0], pts[1]);
      const scaleRatio = d / pinch.startDist;
      const nextScale = Math.max(0.5, Math.min(2.5, pinch.startScale * scaleRatio));
      const nextRotation = normalizeAngle(pinch.startRotation + (angle - pinch.startAngle));
      setOverlays((prev) => prev.map((o) => (o.id === pinch.id ? { ...o, scale: nextScale, rotation: nextRotation } : o)));
      return;
    }

    if (!dragRef.current || !frameRef.current) return;
    // Guardamos el arrastre actual en una variable local ("drag") en vez de
    // seguir leyendo dragRef.current más abajo, adentro del callback de
    // setOverlays. Motivo (bug real, encontrado con el reporte de error
    // remoto): React no siempre ejecuta ese callback en el mismo instante en
    // que se llama a setOverlays — con varios eventos "pointermove" seguidos
    // de un "pointerup" muy rápido (típico de un arrastre con el dedo en
    // iPhone, algo que un mouse simulado en pruebas automáticas no reproduce
    // igual), handleFramePointerUp podía poner dragRef.current en null ANTES
    // de que se ejecutara el callback de un setOverlays anterior, y ese
    // callback explotaba al hacer dragRef.current.id sobre null. Al guardar
    // "drag" acá, el callback usa ese valor fijo capturado en este momento,
    // sin importar qué pase con dragRef.current después.
    const drag = dragRef.current;
    const rect = frameRef.current.getBoundingClientRect();
    const dxPct = ((e.clientX - drag.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - drag.startY) / rect.height) * 100;
    const xPct = Math.max(4, Math.min(96, drag.startXPct + dxPct));
    const yPct = Math.max(4, Math.min(96, drag.startYPct + dyPct));
    setOverlays((prev) => prev.map((o) => (o.id === drag.id ? { ...o, xPct, yPct } : o)));
  }

  function handleFramePointerUp(e) {
    if (e && pointersRef.current.has(e.pointerId)) {
      pointersRef.current.delete(e.pointerId);
    } else if (!e) {
      pointersRef.current.clear();
    }
    if (pointersRef.current.size === 1 && pinchRef.current) {
      // Quedó un dedo solo apoyado (se levantó uno de los dos del
      // pellizco): volvemos a arrastre normal con ese dedo, sin que el
      // elemento "salte" de golpe.
      const id = pinchRef.current.id;
      const [, pt] = Array.from(pointersRef.current.entries())[0];
      const item = overlays.find((o) => o.id === id);
      dragRef.current = item ? { id, startX: pt.x, startY: pt.y, startXPct: item.xPct, startYPct: item.yPct } : null;
      pinchRef.current = null;
    } else if (pointersRef.current.size === 0) {
      dragRef.current = null;
      pinchRef.current = null;
    }
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
    setRightsConfirmed(false);
  }

  function removeMusic() {
    previewAudioRef.current?.pause();
    if (musicPreviewUrl) URL.revokeObjectURL(musicPreviewUrl);
    setMusicFile(null);
    setMusicPreviewUrl(null);
    setPreviewPlaying(false);
    setRightsConfirmed(false);
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
    if (musicFile && !rightsConfirmed) return;
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
          onPointerDown={handleFramePointerDown}
          onPointerMove={handleFramePointerMove}
          onPointerUp={handleFramePointerUp}
          onPointerLeave={handleFramePointerUp}
          onPointerCancel={handleFramePointerUp}
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
                // La clase .overlay-item ya centra el texto/sticker con
                // translate(-50%,-50%) — como acá lo fijamos por style
                // (para poder sumarle la rotación), hay que repetir ese
                // translate acá también, si no el style inline lo pisaría.
                transform: `translate(-50%, -50%) rotate(${o.rotation || 0}deg)`,
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
          <div className="editor-selected-row editor-selected-row-compact">
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
            {musicFile && (
              <label className="editor-mute-row editor-rights-row">
                <input
                  type="checkbox"
                  checked={rightsConfirmed}
                  onChange={(e) => setRightsConfirmed(e.target.checked)}
                />
                <span>Confirmo que tengo los derechos para usar este audio</span>
              </label>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onCancel}>Cancelar</button>
          <button
            className="modal-btn-primary"
            onClick={handleConfirm}
            disabled={!!musicFile && !rightsConfirmed}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
