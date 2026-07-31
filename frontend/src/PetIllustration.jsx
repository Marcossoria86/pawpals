// Ilustraciones propias (SVG) para cada especie, en vez de emojis.
// Un solo estilo consistente: forma de cabeza redondeada + rasgos simples,
// usando los mismos colores de marca que el resto de la app.

export const SPECIES_LIST = [
  { key: 'dog', label: 'Perro' },
  { key: 'cat', label: 'Gato' },
  { key: 'rabbit', label: 'Conejo' },
  { key: 'bird', label: 'Ave' },
  { key: 'turtle', label: 'Tortuga' }
];

const FACE = '#2b2620';

function Dog() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="16" cy="22" rx="8" ry="11" fill="#c9683f" transform="rotate(-18 16 22)" />
      <ellipse cx="48" cy="22" rx="8" ry="11" fill="#c9683f" transform="rotate(18 48 22)" />
      <circle cx="32" cy="34" r="20" fill="#e9b494" />
      <circle cx="23" cy="32" r="3.2" fill={FACE} />
      <circle cx="41" cy="32" r="3.2" fill={FACE} />
      <ellipse cx="32" cy="41" rx="5" ry="3.6" fill={FACE} />
      <path d="M32 44 v4" stroke={FACE} strokeWidth="2" strokeLinecap="round" />
      <path d="M24 48 q8 6 16 0" stroke={FACE} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Cat() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <path d="M14 14 L24 28 L12 30 Z" fill="#4f7d6b" />
      <path d="M50 14 L40 28 L52 30 Z" fill="#4f7d6b" />
      <circle cx="32" cy="36" r="19" fill="#f4d9c6" />
      <ellipse cx="23" cy="34" rx="3" ry="3.6" fill={FACE} />
      <ellipse cx="41" cy="34" rx="3" ry="3.6" fill={FACE} />
      <path d="M32 40 l-3 3 h6 z" fill="#c9683f" />
      <path d="M14 30 q6 4 4 9" stroke={FACE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M50 30 q-6 4 -4 9" stroke={FACE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M26 46 q6 4 12 0" stroke={FACE} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Rabbit() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="24" cy="14" rx="6" ry="16" fill="#efe6da" transform="rotate(-10 24 14)" />
      <ellipse cx="40" cy="14" rx="6" ry="16" fill="#efe6da" transform="rotate(10 40 14)" />
      <ellipse cx="24" cy="16" rx="2.6" ry="10" fill="#e3b9c9" transform="rotate(-10 24 16)" />
      <ellipse cx="40" cy="16" rx="2.6" ry="10" fill="#e3b9c9" transform="rotate(10 40 16)" />
      <circle cx="32" cy="38" r="18" fill="#f7f1e8" />
      <circle cx="24" cy="36" r="3" fill={FACE} />
      <circle cx="40" cy="36" r="3" fill={FACE} />
      <path d="M32 42 l-3 3 h6 z" fill="#e3b9c9" />
      <path d="M26 47 q6 4 12 0" stroke={FACE} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Bird() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <circle cx="32" cy="32" r="20" fill="#4f7d6b" />
      <circle cx="32" cy="24" r="12" fill="#6fa08b" />
      <circle cx="27" cy="22" r="2.6" fill={FACE} />
      <path d="M32 26 l8 3 l-8 3 z" fill="#c9683f" />
      <path d="M16 40 q16 12 32 0" fill="#e1ede8" />
      <path d="M22 12 q4 -6 8 -1" stroke="#2b2620" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Turtle() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="32" cy="34" rx="21" ry="17" fill="#4f7d6b" />
      <path d="M32 20 L41 30 L36 42 L28 42 L23 30 Z" fill="#6fa08b" stroke="#3c6a58" strokeWidth="1.5" />
      <path d="M14 30 L23 30 L28 42 L18 46 Z" fill="#6fa08b" stroke="#3c6a58" strokeWidth="1.5" />
      <path d="M50 30 L41 30 L36 42 L46 46 Z" fill="#6fa08b" stroke="#3c6a58" strokeWidth="1.5" />
      <circle cx="46" cy="20" r="8" fill="#8fbfa8" />
      <circle cx="49" cy="18" r="1.8" fill={FACE} />
    </svg>
  );
}

const COMPONENTS = { dog: Dog, cat: Cat, rabbit: Rabbit, bird: Bird, turtle: Turtle };

export default function PetIllustration({ species, size = 40 }) {
  const Cmp = COMPONENTS[species] || Dog;
  return (
    <div style={{ width: size, height: size, display: 'inline-block' }}>
      <Cmp />
    </div>
  );
}
