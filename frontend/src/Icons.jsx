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

export function IconText({ size = 20 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M4 6.5h9" />
      <path d="M8.5 6.5v11" />
      <path d="M14.5 12h5.5" />
      <path d="M17.2 12v5.5" />
      <path d="M15.3 9.8 17.2 12l1.9-2.2" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSticker({ size = 20 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
      <path d="M8.5 14c0.9 1.2 2.1 1.8 3.5 1.8s2.6-0.6 3.5-1.8" />
    </svg>
  );
}

export function IconMusic({ size = 20 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M9 17.5V6l10-1.8V15" strokeLinejoin="round" />
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="16.5" cy="15" r="2.5" />
    </svg>
  );
}

export function IconTrash({ size = 18 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M5 7h14" />
      <path d="M9 7V5.3A1.3 1.3 0 0 1 10.3 4h3.4A1.3 1.3 0 0 1 15 5.3V7" />
      <path d="M6.5 7 7.3 19a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
    </svg>
  );
}

export function IconSettings({ size = 20 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.6a1.7 1.7 0 0 0 .34 1.87l.06.06a2.06 2.06 0 1 1-2.92 2.92l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56v.17a2.06 2.06 0 1 1-4.12 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2.06 2.06 0 1 1-2.92-2.92l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03h-.17a2.06 2.06 0 1 1 0-4.12h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2.06 2.06 0 1 1 2.92-2.92l.06.06a1.7 1.7 0 0 0 1.87.34h.08a1.7 1.7 0 0 0 1.03-1.56v-.17a2.06 2.06 0 1 1 4.12 0v.09a1.7 1.7 0 0 0 1.03 1.56h.08a1.7 1.7 0 0 0 1.87-.34l.06-.06a2.06 2.06 0 1 1 2.92 2.92l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03h.17a2.06 2.06 0 1 1 0 4.12h-.09a1.7 1.7 0 0 0-1.56 1.03Z" />
    </svg>
  );
}

export function IconFlag({ size = 18 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M6 20V4" />
      <path d="M6 5c1.6-1 3.4-1 5 0s3.4 1 5 0v8c-1.6 1-3.4 1-5 0s-3.4-1-5 0Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBlock({ size = 18 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M6.3 6.3 17.7 17.7" />
    </svg>
  );
}

export function IconRotate({ size = 16 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M4.5 12a7.5 7.5 0 1 1 2.4 5.5" />
      <path d="M4.2 16.5 4.5 12l4.4 1" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChevronRight({ size = 20 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M9 5.5 15.5 12 9 18.5" />
    </svg>
  );
}

export function IconLocation({ size = 18 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  );
}

// Dos huellitas (como el emoji 🐾, pero dibujado a mano) — es "el ícono de
// PawPals" que se usa junto al nombre de la app en el header y en la
// pantalla de inicio de sesión. Reemplaza al de una sola huella (IconPawSmall,
// que queda para otros usos) porque a la gente le gustaba más el de dos.
export function IconPawPair({ size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" stroke="none" aria-hidden="true">
      <g transform="translate(14,15) rotate(-18) scale(12)">
        <ellipse cx="0" cy="0.16" rx="0.28" ry="0.20" />
        <ellipse cx="-0.28" cy="-0.10" rx="0.10" ry="0.13" />
        <ellipse cx="-0.10" cy="-0.26" rx="0.10" ry="0.135" />
        <ellipse cx="0.10" cy="-0.26" rx="0.10" ry="0.135" />
        <ellipse cx="0.28" cy="-0.10" rx="0.10" ry="0.13" />
      </g>
      <g transform="translate(7,7) rotate(-18) scale(7.2)">
        <ellipse cx="0" cy="0.16" rx="0.28" ry="0.20" />
        <ellipse cx="-0.28" cy="-0.10" rx="0.10" ry="0.13" />
        <ellipse cx="-0.10" cy="-0.26" rx="0.10" ry="0.135" />
        <ellipse cx="0.10" cy="-0.26" rx="0.10" ry="0.135" />
        <ellipse cx="0.28" cy="-0.10" rx="0.10" ry="0.13" />
      </g>
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
