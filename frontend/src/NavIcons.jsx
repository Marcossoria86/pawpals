// Íconos propios (SVG, trazo simple) para la barra de navegación, en vez de
// emojis. Usan stroke="currentColor" a propósito: así heredan el color que
// ya define .tab / .tab.active en el CSS (gris cuando está inactivo, color
// de marca cuando está activo) sin necesitar props extra ni duplicar reglas.

const COMMON = {
  width: 25,
  height: 25,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.1,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

export function IconHome() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <path d="M3.5 11.5 12 4l8.5 7.5" />
      <path d="M5.5 9.8V20h13V9.8" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

export function IconReels() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <rect x="4" y="4.5" width="16" height="15" rx="3.5" />
      <path d="M10.3 9.3v5.4l4.6-2.7Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconRequests() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <circle cx="8.3" cy="8" r="1.7" />
      <circle cx="12" cy="6.3" r="1.7" />
      <circle cx="15.7" cy="8" r="1.7" />
      <path d="M8.7 12.2c0-1.7 1.5-2.6 3.3-2.6s3.3 0.9 3.3 2.6c0 2-1.6 2-3.3 4.1-1.7-2.1-3.3-2.1-3.3-4.1Z" />
    </svg>
  );
}

export function IconNearby() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <path d="M12 21s7-6.3 7-11.6A7 7 0 0 0 5 9.4C5 14.7 12 21 12 21Z" />
      <circle cx="12" cy="9.3" r="2.3" />
    </svg>
  );
}

export function IconBell() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <path d="M6 10.5a6 6 0 0 1 12 0c0 3.6 1.2 5 1.9 5.7H4.1c.7-.7 1.9-2.1 1.9-5.7Z" />
      <path d="M10.2 19a1.9 1.9 0 0 0 3.6 0" />
    </svg>
  );
}

export function IconMessages({ size } = {}) {
  return (
    <svg {...COMMON} {...(size ? { width: size, height: size } : {})} aria-hidden="true">
      <path d="M4.5 4.5 19.5 12 4.5 19.5 8 12Z" strokeLinejoin="round" />
      <path d="M8 12h7" />
    </svg>
  );
}

export function IconProfile() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <circle cx="12" cy="8.3" r="3.3" />
      <path d="M4.8 20c1-3.3 3.8-5 7.2-5s6.2 1.7 7.2 5" />
    </svg>
  );
}
