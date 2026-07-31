import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Modal para "acomodar" una foto antes de subirla: se ve el marco tal cual
// va a quedar (cuadrado para el perfil o publicaciones, vertical para
// historias), se puede arrastrar para reencuadrar y hay un control de zoom.
// Al confirmar, se recorta de verdad con un canvas — lo que se sube es ya
// la imagen recortada, no la original completa.
export default function ImageCropper({
  file,
  aspect = 1,
  shape = 'rect',
  title = 'Acomodá la foto',
  confirmLabel = 'Usar foto',
  onConfirm,
  onCancel
}) {
  const [imgUrl, setImgUrl] = useState(null);
  const [natural, setNatural] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 300, height: 300 / aspect });
  const [saving, setSaving] = useState(false);
  const containerRef = useRef(null);
  const imgElRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useLayoutEffect(() => {
    function measure() {
      const el = containerRef.current;
      if (!el) return;
      const width = el.clientWidth;
      setContainerSize({ width, height: width / aspect });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [aspect]);

  function computeDisplayed(scaleMultiplier, size) {
    if (!natural) return { w: 0, h: 0 };
    const base = Math.max(size.width / natural.w, size.height / natural.h);
    const eff = base * scaleMultiplier;
    return { w: natural.w * eff, h: natural.h * eff };
  }

  const displayed = computeDisplayed(zoom, containerSize);

  function clamp(o, dW, dH) {
    const minX = Math.min(0, containerSize.width - dW);
    const minY = Math.min(0, containerSize.height - dH);
    return {
      x: Math.max(minX, Math.min(0, o.x)),
      y: Math.max(minY, Math.min(0, o.y))
    };
  }

  function handleImgLoad(e) {
    const w = e.target.naturalWidth;
    const h = e.target.naturalHeight;
    setNatural({ w, h });
    const base = Math.max(containerSize.width / w, containerSize.height / h);
    const dW = w * base;
    const dH = h * base;
    setOffset({ x: (containerSize.width - dW) / 2, y: (containerSize.height - dH) / 2 });
  }

  useEffect(() => {
    if (!natural) return;
    const d = computeDisplayed(zoom, containerSize);
    setOffset((o) => clamp(o, d.w, d.h));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, containerSize.width, containerSize.height, natural]);

  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOffset: offset };
  }
  function handlePointerMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const next = { x: dragRef.current.startOffset.x + dx, y: dragRef.current.startOffset.y + dy };
    setOffset(clamp(next, displayed.w, displayed.h));
  }
  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleConfirm() {
    if (!natural || saving) return;
    setSaving(true);
    const targetW = aspect >= 1 ? 1000 : Math.round(1000 * aspect);
    const targetH = Math.round(targetW / aspect);
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    const canvasScale = targetW / containerSize.width;
    ctx.drawImage(
      imgElRef.current,
      offset.x * canvasScale,
      offset.y * canvasScale,
      displayed.w * canvasScale,
      displayed.h * canvasScale
    );
    canvas.toBlob((blob) => {
      setSaving(false);
      if (!blob) return;
      const croppedFile = new File([blob], (file.name || 'foto').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
      onConfirm(croppedFile);
    }, 'image/jpeg', 0.9);
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card cropper-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div
          className={`cropper-frame ${shape === 'circle' ? 'circle' : ''}`}
          ref={containerRef}
          style={{ aspectRatio: aspect }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {imgUrl && (
            <img
              ref={imgElRef}
              src={imgUrl}
              alt=""
              draggable={false}
              onLoad={handleImgLoad}
              className="cropper-img"
              style={{
                width: displayed.w || '100%',
                height: displayed.h || '100%',
                transform: `translate(${offset.x}px, ${offset.y}px)`
              }}
            />
          )}
        </div>
        <div className="cropper-zoom-row">
          <span className="cropper-zoom-label">Zoom</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.02"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </div>
        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button className="modal-btn-primary" onClick={handleConfirm} disabled={!natural || saving}>
            {saving ? 'Ajustando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
