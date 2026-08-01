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
      {/* orejas, con la parte interna más clara para dar volumen */}
      <path d="M16 20 L22 6 L28 22 Z" fill="#d98a4f" />
      <path d="M48 20 L42 6 L36 22 Z" fill="#d98a4f" />
      <path d="M18.5 18 L22.5 10 L26 19 Z" fill="#f3c9a0" />
      <path d="M45.5 18 L41.5 10 L38 19 Z" fill="#f3c9a0" />
      {/* mejillas, para que la cara no quede un círculo plano */}
      <ellipse cx="18" cy="40" rx="10" ry="9" fill="#d98a4f" />
      <ellipse cx="46" cy="40" rx="10" ry="9" fill="#d98a4f" />
      <circle cx="32" cy="35" r="19" fill="#e8a869" />
      <ellipse cx="32" cy="43" rx="11" ry="8" fill="#f8e6d1" />
      <ellipse cx="24" cy="33" rx="3.4" ry="4.2" fill={FACE} />
      <ellipse cx="40" cy="33" rx="3.4" ry="4.2" fill={FACE} />
      <circle cx="25.2" cy="31.3" r="1" fill="#fff" />
      <circle cx="41.2" cy="31.3" r="1" fill="#fff" />
      <path d="M32 40 l-2.6 2.6 h5.2 z" fill="#c9683f" />
      <path d="M32 42.6 q-4 4 -8 1.4" stroke={FACE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M32 42.6 q4 4 8 1.4" stroke={FACE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M10 38 q6 1 10 3" stroke={FACE} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.55" />
      <path d="M10 44 q6 -1 10 -1" stroke={FACE} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.55" />
      <path d="M54 38 q-6 1 -10 3" stroke={FACE} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.55" />
      <path d="M54 44 q-6 -1 -10 -1" stroke={FACE} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.55" />
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

// Accesorios del "avatar personalizado" (ver AvatarPicker) — formas propias
// y simples, sólo INSPIRADAS en la idea de avatares con accesorios tipo
// Duolingo (personalización divertida), no copias de sus personajes. Se
// dibujan en el mismo viewBox 0-0-64-64 que las ilustraciones de especie de
// arriba, así quedan alineados sin importar qué especie tengan debajo.
export const AVATAR_ACCESSORIES = [
  { key: 'none', label: 'Ninguno' },
  { key: 'cap', label: 'Gorra' },
  { key: 'glasses', label: 'Anteojos' },
  { key: 'bow', label: 'Moño' },
  { key: 'bandana', label: 'Pañuelo' },
  { key: 'crown', label: 'Corona' }
];

export const AVATAR_BACKGROUNDS = ['#8ce99a', '#63e6be', '#66d9e8', '#74c0fc', '#b197fc', '#ffa8a8', '#ffd43b', '#ffc078'];

function AccessoryOverlay({ accessory }) {
  if (accessory === 'cap') {
    return (
      <g>
        <path d="M14 24 Q32 6 50 24 L50 28 L14 28 Z" fill="#ef6c4d" />
        <rect x="12" y="25" width="40" height="5" rx="2.5" fill="#d9502f" />
        <circle cx="32" cy="13" r="3" fill="#ffd166" />
      </g>
    );
  }
  if (accessory === 'glasses') {
    return (
      <g stroke="#2b2620" strokeWidth="2" fill="rgba(255,255,255,0.4)">
        <circle cx="23" cy="33" r="7" />
        <circle cx="41" cy="33" r="7" />
        <path d="M30 32 h2" />
        <path d="M16 31 q-4 0 -4 4" fill="none" strokeLinecap="round" />
        <path d="M48 31 q4 0 4 4" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (accessory === 'bow') {
    return (
      <g>
        <path d="M32 46 L23 40 V52 Z" fill="#e64980" />
        <path d="M32 46 L41 40 V52 Z" fill="#e64980" />
        <circle cx="32" cy="46" r="3.2" fill="#c2255c" />
      </g>
    );
  }
  if (accessory === 'bandana') {
    return (
      <g>
        <path d="M11 39 Q32 52 53 39 L53 45 Q32 58 11 45 Z" fill="#4c6ef5" />
        <circle cx="20" cy="43" r="1.4" fill="#fff" />
        <circle cx="32" cy="50" r="1.4" fill="#fff" />
        <circle cx="44" cy="43" r="1.4" fill="#fff" />
      </g>
    );
  }
  if (accessory === 'crown') {
    return (
      <path d="M14 22 L20 9 L28 19 L32 7 L36 19 L44 9 L50 22 L50 28 L14 28 Z" fill="#ffd43b" stroke="#f5a623" strokeWidth="1.2" strokeLinejoin="round" />
    );
  }
  return null;
}

export default function PetIllustration({ species, size = 40, accessory = 'none' }) {
  const Cmp = COMPONENTS[species] || Dog;
  return (
    <div style={{ width: size, height: size, display: 'inline-block', position: 'relative' }}>
      <Cmp />
      {accessory && accessory !== 'none' && (
        <svg viewBox="0 0 64 64" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
          <AccessoryOverlay accessory={accessory} />
        </svg>
      )}
    </div>
  );
}
