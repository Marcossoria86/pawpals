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

export function IconPlus({ size = 20 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

// Etiqueta (tag) — se usa en el botón "Etiquetar mascotas" de publicaciones,
// comentarios e historias.
export function IconTag({ size = 18 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M11.6 4H6a2 2 0 0 0-2 2v5.6c0 .53.21 1.04.59 1.41l8.4 8.4c.78.78 2.05.78 2.83 0l5.6-5.6c.78-.78.78-2.05 0-2.83l-8.4-8.4A2 2 0 0 0 11.6 4Z" strokeLinejoin="round" />
      <circle cx="8.5" cy="8.5" r="1.3" />
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

// Menú hamburguesa (tres líneas) — abre el panel lateral de opciones
// (Configuración y privacidad, modo oscuro, ayuda, cerrar sesión), al
// estilo del menú que se abre desde el ícono de tres líneas de Facebook.
export function IconMenu({ size = 22 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M4 6.5h16" />
      <path d="M4 12h16" />
      <path d="M4 17.5h16" />
    </svg>
  );
}

export function IconMoon({ size = 19 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M20 13.8A8.2 8.2 0 1 1 10.2 4a6.4 6.4 0 0 0 9.8 9.8Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconHelp({ size = 19 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" />
      <path d="M9.6 9.4a2.4 2.4 0 1 1 3.5 2.1c-.75.45-1.1.9-1.1 1.7v.3" />
      <circle cx="12" cy="16.6" r="0.15" fill="currentColor" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function IconLogout({ size = 19 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4H9" />
      <path d="M15.5 16 20 12l-4.5-4" />
      <path d="M20 12H9" />
    </svg>
  );
}

// Íconos del menú lateral nuevo (Amigos, Avatares, Chatear con IA,
// Cumpleaños, y las opciones de adentro de Configuración/Ayuda).
export function IconUsers({ size = 19 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <circle cx="9" cy="9" r="3.4" />
      <path d="M2.8 19c1-3.2 3.6-4.8 6.2-4.8s5.2 1.6 6.2 4.8" />
      <path d="M15.5 5.6a3.4 3.4 0 0 1 0 6.6" />
      <path d="M16.8 14.4c2.2 0.4 3.9 1.9 4.6 4.6" />
    </svg>
  );
}

export function IconFace({ size = 19 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="8.9" cy="10.5" r="1" fill="currentColor" />
      <circle cx="15.1" cy="10.5" r="1" fill="currentColor" />
      <path d="M8.5 15c1 1 2.2 1.5 3.5 1.5s2.5-0.5 3.5-1.5" />
    </svg>
  );
}

export function IconSparkle({ size = 19 }) {
  return (
    <svg {...COMMON} width={size} height={size} fill="currentColor" stroke="none" aria-hidden="true">
      <path d="M12 3c.5 3.4 1.7 5.5 5 6-3.3.5-4.5 2.6-5 6-.5-3.4-1.7-5.5-5-6 3.3-.5 4.5-2.6 5-6Z" />
      <path d="M19 14c.25 1.4.9 2.2 2.2 2.5-1.3.3-1.95 1.1-2.2 2.5-.25-1.4-.9-2.2-2.2-2.5 1.3-.3 1.95-1.1 2.2-2.5Z" />
    </svg>
  );
}

export function IconCake({ size = 19 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M4 20v-6.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2V20" strokeLinejoin="round" />
      <path d="M4 20h16" />
      <path d="M4 16.5c1.2.8 2.2.8 3.4 0 1.2-.8 2.2-.8 3.4 0 1.2.8 2.2.8 3.4 0 1.2-.8 2.2-.8 3.4 0" />
      <path d="M12 11.5V8" />
      <path d="M12 8c-1.1 0-1.6-.9-1-2 .3-.5 1-1.6 1-1.6s.7 1.1 1 1.6c.6 1.1.1 2-1 2Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconGlobe({ size = 19 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <ellipse cx="12" cy="12" rx="3.6" ry="8.5" />
      <path d="M3.7 9h16.6" />
      <path d="M3.7 15h16.6" />
    </svg>
  );
}

export function IconAppSquare({ size = 19 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconDoc({ size = 19 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <path d="M14 3.5V8h4" strokeLinejoin="round" />
      <path d="M8.5 12.5h7" />
      <path d="M8.5 16h7" />
    </svg>
  );
}

export function IconLock({ size = 19 }) {
  return (
    <svg {...COMMON} width={size} height={size} aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2.2" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </svg>
  );
}
