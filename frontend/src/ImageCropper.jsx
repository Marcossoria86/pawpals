import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from './Icons';

// Modal para "acomodar" una foto antes de subirla: se ve el marco tal cual
// va a quedar (cuadrado para el perfil o publicaciones, vertical para
// historias), se puede arrastrar para reencuadrar (en cualquier dirección) y
// hay zoom por gesto de pellizco (pinch) con dos dedos — sin botón ni
// control aparte, como en Instagram. Al confirmar, se recorta de verdad con
// un canvas: lo que se sube es ya la imagen recortada, no la original
// completa.
//
// Se monta con un Portal directo a <body> (igual que el visor de historias)
// para que quede SIEMPRE por encima de todo — header, cuadro de "publicar",
// barra de abajo — sin importar en qué parte del feed esté anidado. Sin
// esto, en Safari/iOS un elemento position:fixed anidado dentro de un
// contenedor con scroll puede terminar "atrapado" ahí adentro: se ve el
// cuadro de publicar de fondo, aparece una barra de scroll fantasma y la
// barra de navegación de abajo tapa los botones.
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Ángulo (en grados) entre dos puntos — mide cuánto giraron los dos dedos
// del pellizco entre un instante y el siguiente, igual que en MediaEditor.
function angleBetween(a, b) {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

function normalizeAngle(deg) {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

// Antes, al abrir el recorte sin tocar el pellizco de zoom, la foto se
// mostraba exactamente "a medida" del marco (cubriéndolo justo, sin
// sobrante) — así que si la foto tenía casi la misma proporción que el
// marco, uno de los dos ejes (típicamente el vertical) quedaba sin ningún
// margen para arrastrar: quedaba "pegada" y no se podía reencuadrar en esa
// dirección hasta pellizcar para agrandarla primero. Con este 18% de
// sobrante de fábrica, la foto siempre entra un poco más grande que el
// marco por los cuatro lados, así que siempre hay margen para arrastrarla
// en cualquier dirección (vertical incluida) sin necesitar zoom primero.
const MIN_OVERSCAN = 1.18;

// Cuánto hay que agrandar la foto (además del zoom que ya eligió la
// persona) para que, al girarla "rotationDeg" grados, siga tapando todo el
// marco sin dejar huecos transparentes en las esquinas — el mismo problema
// que resolver "¿cuánto tengo que acercar la cámara para que, aunque gire
// el encuadre, no se vea nada fuera de la foto?".
//
// Se calcula pasando las 4 esquinas del marco a las coordenadas propias de
// la foto (sin girar), tomando como centro el punto real donde está
// centrada la foto ahora mismo (ex, ey) — no el centro del marco — porque
// si la foto está arrastrada hacia un costado, la esquina más lejana del
// marco necesita más margen que si estuviera centrada. Con esas 4 esquinas
// ya "desgiradas", el tamaño mínimo que necesita la foto para seguir
// cubriéndolas es el doble del valor absoluto más grande en cada eje.
function getRotationExtraScale(rotationDeg, dW, dH, containerW, containerH, ex, ey) {
  if (!rotationDeg || !dW || !dH) return 1;
  const theta = (rotationDeg * Math.PI) / 180;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const corners = [
    [-containerW / 2 - ex, -containerH / 2 - ey],
    [containerW / 2 - ex, -containerH / 2 - ey],
    [-containerW / 2 - ex, containerH / 2 - ey],
    [containerW / 2 - ex, containerH / 2 - ey]
  ];
  let maxAbsX = 0;
  let maxAbsY = 0;
  for (const [cx, cy] of corners) {
    const px = cx * cosT + cy * sinT;
    const py = -cx * sinT + cy * cosT;
    maxAbsX = Math.max(maxAbsX, Math.abs(px));
    maxAbsY = Math.max(maxAbsY, Math.abs(py));
  }
  const scaleX = (maxAbsX * 2) / dW;
  const scaleY = (maxAbsY * 2) / dH;
  return Math.max(scaleX, scaleY, 1);
}

// Ángulos "derechos" a los que conviene que el giro se pegue solo (como el
// imán al centrar un ícono en apps de diseño) — así es fácil volver a dejar
// la foto perfectamente alineada después de haber probado a girarla.
const ROTATION_SNAP_TARGETS = [-180, -90, 0, 90, 180];
const ROTATION_SNAP_THRESHOLD = 3;
function snapRotation(deg) {
  for (const target of ROTATION_SNAP_TARGETS) {
    if (Math.abs(deg - target) < ROTATION_SNAP_THRESHOLD) return target;
  }
  return deg;
}

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
  const [rotation, setRotation] = useState(0);
  const [straightening, setStraightening] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 300, height: 300 / aspect });
  const [saving, setSaving] = useState(false);
  const containerRef = useRef(null);
  const imgElRef = useRef(null);
  const dragRef = useRef(null);
  const pinchRef = useRef(null);
  const pointersRef = useRef(new Map());

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
    const base = Math.max(size.width / natural.w, size.height / natural.h) * MIN_OVERSCAN;
    const eff = base * scaleMultiplier;
    return { w: natural.w * eff, h: natural.h * eff };
  }

  const displayed = computeDisplayed(zoom, containerSize);
  // Centro actual de la foto respecto del centro del marco (0,0 = está
  // perfectamente centrada) — lo necesita getRotationExtraScale para saber
  // cuánto agrandar cuando además está arrastrada hacia un costado.
  const centerEx = offset.x + displayed.w / 2 - containerSize.width / 2;
  const centerEy = offset.y + displayed.h / 2 - containerSize.height / 2;
  const rotationExtraScale = getRotationExtraScale(
    rotation, displayed.w, displayed.h, containerSize.width, containerSize.height, centerEx, centerEy
  );

  // Antes el zoom mínimo era siempre 1 (la foto "tapando" el marco de punta
  // a punta, sin dejar ver nada fuera de ella) — a pedido del usuario ahora
  // se puede achicar un poco más, hasta dejar ver la foto ENTERA encuadrada
  // (con una franja negra pareja en el eje que sobre, como el letterboxing
  // de un video). Se calcula la relación entre "cubrir" el marco y
  // "contener" la foto completa para ese tamaño puntual de imagen — cada
  // foto tiene su propio mínimo según su proporción.
  function getMinZoom() {
    if (!natural) return 1;
    const coverScale = Math.max(containerSize.width / natural.w, containerSize.height / natural.h);
    const containScale = Math.min(containerSize.width / natural.w, containerSize.height / natural.h);
    return Math.min(1, containScale / (coverScale * MIN_OVERSCAN));
  }

  function clamp(o, dW, dH) {
    // Si la foto (a este zoom) es más chica que el marco en algún eje —
    // porque la achicaron para verla entera — no hay nada para arrastrar
    // ahí: la centramos con margen parejo en vez de pegarla a un borde.
    const x = dW <= containerSize.width
      ? (containerSize.width - dW) / 2
      : Math.max(containerSize.width - dW, Math.min(0, o.x));
    const y = dH <= containerSize.height
      ? (containerSize.height - dH) / 2
      : Math.max(containerSize.height - dH, Math.min(0, o.y));
    return { x, y };
  }

  function handleImgLoad(e) {
    const w = e.target.naturalWidth;
    const h = e.target.naturalHeight;
    setNatural({ w, h });
    const base = Math.max(containerSize.width / w, containerSize.height / h) * MIN_OVERSCAN;
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

  // Un dedo (o el mouse) arrastra la foto para reencuadrarla, en cualquier
  // dirección — horizontal y vertical — dentro del margen que deje el zoom
  // actual. Dos dedos hacen zoom Y giro a la vez, tipo "pellizcar y
  // torcer", sin ningún botón ni slider: al bajar el segundo dedo
  // guardamos la distancia y el ángulo entre ambos, más el zoom/giro de
  // partida, y mientras se mueven vamos recalculando los dos según cuánto
  // cambiaron esa distancia y ese ángulo.
  function handlePointerDown(e) {
    // Si falla la captura (puede pasar con algunos navegadores al bajar el
    // segundo dedo casi al mismo tiempo que el primero) seguimos igual: no
    // queremos perder el segundo puntero y que el gesto quede roto.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      pinchRef.current = {
        startDist: dist(pts[0], pts[1]) || 1,
        startAngle: angleBetween(pts[0], pts[1]),
        startZoom: zoom,
        startRotation: rotation
      };
      dragRef.current = null;
      setStraightening(true);
    } else if (pointersRef.current.size === 1) {
      dragRef.current = { startX: e.clientX, startY: e.clientY, startOffset: offset };
      pinchRef.current = null;
    }
  }

  function handlePointerMove(e) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const d = dist(pts[0], pts[1]);
      const angle = angleBetween(pts[0], pts[1]);
      const ratio = d / pinchRef.current.startDist;
      const nextZoom = Math.max(getMinZoom(), Math.min(4, pinchRef.current.startZoom * ratio));
      const nextRotation = snapRotation(normalizeAngle(pinchRef.current.startRotation + (angle - pinchRef.current.startAngle)));
      setZoom(nextZoom);
      setRotation(nextRotation);
      return;
    }

    if (pointersRef.current.size === 1 && dragRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const next = { x: dragRef.current.startOffset.x + dx, y: dragRef.current.startOffset.y + dy };
      setOffset(clamp(next, displayed.w, displayed.h));
    }
  }

  function handlePointerUp(e) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 1) {
      // Quedó un solo dedo apoyado (se levantó uno de los dos del pellizco):
      // reiniciamos la referencia de arrastre con la posición actual para
      // que la foto no "salte" de golpe.
      const [, pt] = Array.from(pointersRef.current.entries())[0];
      dragRef.current = { startX: pt.x, startY: pt.y, startOffset: offset };
      pinchRef.current = null;
      setStraightening(false);
    } else if (pointersRef.current.size === 0) {
      dragRef.current = null;
      pinchRef.current = null;
      setStraightening(false);
    }
  }

  // Zoom con rueda/trackpad para quien está en la versión web de escritorio
  // (no tiene pantalla táctil para pellizcar).
  function handleWheel(e) {
    setZoom((z) => Math.max(getMinZoom(), Math.min(4, z - e.deltaY * 0.0015)));
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
    // Si la foto quedó achicada (para verla entera encuadrada), el canvas
    // deja ver de fondo esas franjas — sin esto, el JPEG final las guarda
    // como negro "sucio"/al azar en vez de un negro prolijo a propósito.
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, targetW, targetH);
    const canvasScale = targetW / containerSize.width;
    if (!rotation) {
      ctx.drawImage(
        imgElRef.current,
        offset.x * canvasScale,
        offset.y * canvasScale,
        displayed.w * canvasScale,
        displayed.h * canvasScale
      );
    } else {
      // Mismo razonamiento que el transform CSS de más abajo (ver el estilo
      // inline de .cropper-img): centramos, giramos, agrandamos lo que haga
      // falta para tapar el marco, y recién ahí dibujamos la foto — así el
      // archivo final queda exactamente igual a lo que se veía en la vista
      // previa.
      const cx = (offset.x + displayed.w / 2) * canvasScale;
      const cy = (offset.y + displayed.h / 2) * canvasScale;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(rotationExtraScale * canvasScale, rotationExtraScale * canvasScale);
      ctx.drawImage(imgElRef.current, -displayed.w / 2, -displayed.h / 2, displayed.w, displayed.h);
      ctx.restore();
    }
    canvas.toBlob((blob) => {
      setSaving(false);
      if (!blob) return;
      const croppedFile = new File([blob], (file.name || 'foto').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
      onConfirm(croppedFile);
    }, 'image/jpeg', 0.9);
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card cropper-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title-row">
          <div className="modal-title">{title}</div>
          <button type="button" className="modal-close-x" onClick={onCancel} disabled={saving} aria-label="Cerrar">
            <IconClose size={20} />
          </button>
        </div>
        <div
          className={`cropper-frame ${shape === 'circle' ? 'circle' : ''}`}
          ref={containerRef}
          style={{ aspectRatio: aspect }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
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
                transformOrigin: '0 0',
                transform: rotation
                  ? `translate(${offset.x + displayed.w / 2}px, ${offset.y + displayed.h / 2}px) rotate(${rotation}deg) scale(${rotationExtraScale}) translate(${-displayed.w / 2}px, ${-displayed.h / 2}px)`
                  : `translate(${offset.x}px, ${offset.y}px)`
              }}
            />
          )}
          {/* Grilla de alineación + indicador de grados (tipo "enderezar" de
              Instagram): sólo se ven mientras los dos dedos están apoyados
              girando la foto, para ayudar a dejarla derecha — no quedan
              permanentemente en el medio tapando la imagen. Girar ahora es
              con los dedos (torciendo, igual que el pellizco de zoom), no
              con un slider aparte. */}
          {straightening && (
            <>
              <div className="cropper-grid" aria-hidden="true">
                <span /><span /><span /><span />
              </div>
              <div className="cropper-angle-badge">{Math.round(rotation)}°</div>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button className="modal-btn-primary" onClick={handleConfirm} disabled={!natural || saving}>
            {saving ? 'Ajustando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
