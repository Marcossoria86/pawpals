// Capa de texto/stickers que se dibuja arriba de una foto o video (historia
// o reel). Las posiciones se guardan en porcentaje (xPct/yPct) del marco,
// así se ven en el mismo lugar relativo sin importar el tamaño real de la
// pantalla de quien mira. Este componente es de sólo lectura (no se puede
// arrastrar acá) — se usa tanto en el visor de historias como en los reels;
// el que sí permite arrastrar/editar es MediaEditor.
export default function OverlayLayer({ overlays }) {
  if (!overlays || overlays.length === 0) return null;
  return (
    <div className="overlay-layer">
      {overlays.map((o) => (
        <div
          key={o.id}
          className={`overlay-item overlay-${o.type}`}
          style={{
            left: `${o.xPct}%`,
            top: `${o.yPct}%`,
            fontSize: o.type === 'text' ? `${22 * (o.scale || 1)}px` : `${34 * (o.scale || 1)}px`,
            color: o.type === 'text' ? (o.color || '#ffffff') : undefined
          }}
        >
          {o.content}
        </div>
      ))}
    </div>
  );
}
