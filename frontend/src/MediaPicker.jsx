import { useRef } from 'react';
import { IconCamera, IconGallery } from './Icons';

// Botones de foto/video reutilizables en toda la app: uno abre la cámara del
// celular directamente (capture="environment"), el otro abre el selector
// normal para elegir algo ya guardado. Los separamos a propósito porque
// antes un solo botón abría el selector genérico del sistema operativo
// (que igual mezclaba cámara y galería) y eso no dejaba ir directo a sacar
// una foto nueva.
//
// Nota técnica: un sitio web no puede mostrar una miniatura real de "la
// última foto" del celular sin que la persona la elija primero — los
// navegadores no dan acceso a la galería salvo a través de este selector,
// por privacidad. Por eso el botón de galería abre el selector del sistema
// en vez de mostrar una miniatura de antemano.
export default function MediaPicker({
  accept = 'image/*',
  onPick,
  cameraClassName = '',
  galleryClassName = '',
  size = 18,
  disabled = false,
  cameraTitle = 'Tomar foto',
  galleryTitle = 'Elegir de la galería'
}) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  function handleChange(e) {
    const file = e.target.files?.[0];
    if (file) onPick(file);
    e.target.value = '';
  }

  return (
    <>
      <button
        type="button"
        className={cameraClassName}
        title={cameraTitle}
        disabled={disabled}
        onClick={() => cameraRef.current?.click()}
      >
        <IconCamera size={size} />
      </button>
      <button
        type="button"
        className={galleryClassName}
        title={galleryTitle}
        disabled={disabled}
        onClick={() => galleryRef.current?.click()}
      >
        <IconGallery size={size} />
      </button>
      <input
        ref={cameraRef}
        type="file"
        accept={accept}
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </>
  );
}
