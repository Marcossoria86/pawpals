// Set de íconos propios (SVG, trazo simple) para botones de toda la app:
// me gusta, comentar, compartir, silenciar, cámara, galería, buscar, cerrar,
// reproducir/pausar, aceptado/rechazado. Mismo estilo que NavIcons.jsx —
// stroke="currentColor" para heredar el color del botón que los contiene.

const COMMON = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

export function IconHeart({ filled = false, size = 20 }) {
  return (
    <svg {...COMMON} width={size} height={size} fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
      <path d="M12 20.2c-4.4-2.9-8.4-6.3-8.4-10.4 0-2.6 2.1-4.6 4.6-4.6 1.6 0 3 0.8 3.8 2 0.8-1.2 2.2-2 3.8-2 2.5 0 4.6 2 4.6 4.6 0 4.1-4 7.5-8.4 10.4Z" />
    </svg>
  );
}

export function IconComment({ size = 20 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M4 5.5h16v10.5H9.5L5 19.5v-3.5H4Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconShare({ size = 20 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M4 12.5v6a1.5 1.5 0 0 0 1.5 1.5H18.5A1.5 1.5 0 0 0 20 18.5v-6" />
      <path d="M16 8 12 4 8 8" />
      <path d="M12 4.5v11.5" />
    </svg>
  );
}

export function IconVolume({ muted = false, size = 20 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M4 9.5h3.2L12 6v12l-4.8-3.5H4z" strokeLinejoin="round" />
      {muted ? (
        <path d="M16 9.5 20 13.5M20 9.5 16 13.5" />
      ) : (
        <>
          <path d="M15.5 9.2a3.3 3.3 0 0 1 0 5.6" />
          <path d="M18 7a6.3 6.3 0 0 1 0 10" />
        </>
      )}
    </svg>
  );
}

export function IconCamera({ size = 20 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M4 8.3A1.3 1.3 0 0 1 5.3 7h2l1-2h7.4l1 2h2A1.3 1.3 0 0 1 20 8.3v9.4A1.3 1.3 0 0 1 18.7 19H5.3A1.3 1.3 0 0 1 4 17.7Z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

export function IconGallery({ size = 20 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 16.5 8.5 12l3 3 3-4L20 16" />
    </svg>
  );
}

export function IconSearch({ size = 18 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.2" />
      <path d="M19 19 15.2 15.2" />
    </svg>
  );
}

export function IconClose({ size = 18 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M6 6 18 18M18 6 6 18" />
    </svg>
  );
}

export function IconPlayPause({ playing = true, size = 34 }) {
  return (
    <svg {...COMMON} width={size} height={size} fill="currentColor" stroke="none" aria-hidden="true">
      {playing ? (
        <path d="M9 6.5v11l9-5.5Z" />
      ) : (
        <>
          <rect x="7.5" y="6.5" width="3" height="11" rx="1" />
          <rect x="13.5" y="6.5" width="3" height="11" rx="1" />
        </>
      )}
    </svg>
  );
}

export function IconCheck({ size = 20 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M4.5 12.5 9 17 19.5 6.5" />
    </svg>
  );
}

export function IconUpload({ size = 16 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M12 15V4" />
      <path d="M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4 15.5v2A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-2" />
    </svg>
  );
}

export function IconAddUser({ size = 20 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <circle cx="10" cy="8.3" r="3.3" />
      <path d="M3.8 19c0.9-3 3.4-4.6 6.2-4.6 1 0 1.9 0.2 2.8 0.6" />
      <path d="M18 8.5v6" />
      <path d="M15 11.5h6" />
    </svg>
  );
}

export function IconPawSmall({ size = 22 }) {
  return (
    <svg {...COMMON} width={size} height={size} fill="currentColor" stroke="none" aria-hidden="true">
      <circle cx="8.2" cy="8" r="1.9" />
      <circle cx="12" cy="6.3" r="1.9" />
      <circle cx="15.8" cy="8" r="1.9" />
      <path d="M8.4 12.5c0-1.9 1.7-2.9 3.6-2.9s3.6 1 3.6 2.9c0 2.3-1.8 2.3-3.6 4.6-1.8-2.3-3.6-2.3-3.6-4.6Z" />
    </svg>
  );
}
