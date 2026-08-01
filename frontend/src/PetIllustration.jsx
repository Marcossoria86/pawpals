// Ilustraciones propias (SVG) para cada especie, en vez de emojis.
// Un solo estilo consistente: forma de cabeza redondeada + rasgos simples,
// usando los mismos colores de marca que el resto de la app.
//
// Cada especie de mamífero (perro/gato/conejo) dibuja además un cuerpo con
// hombros visible debajo de la cabeza — antes la cabeza sola ocupaba casi
// todo el cuadro, así que accesorios como el moño o el pañuelo terminaban
// superpuestos sobre la boca. Con hombros de verdad esos accesorios tienen
// su propio lugar (a la altura del pecho/cuello) sin pisar la cara.

export const SPECIES_LIST = [
  { key: 'dog', label: 'Perro' },
  { key: 'cat', label: 'Gato' },
  { key: 'rabbit', label: 'Conejo' },
  { key: 'bird', label: 'Ave' },
  { key: 'turtle', label: 'Tortuga' }
];

const FACE = '#2b2620';

// Los mamíferos (perro/gato/conejo) achican y suben la cabeza para dejar
// lugar al cuerpo — este transform se reusa igual en los 3 para no tener
// que retocar a mano cada trazo existente.
const HEAD_TRANSFORM = 'translate(5.8,0) scale(0.82)';

function MammalBody({ color, shade }) {
  return (
    <g>
      <path d="M6 64 Q6 43 19 39 Q32 35 45 39 Q58 43 58 64 Z" fill={color} />
      <ellipse cx="32" cy="58" rx="15" ry="9" fill={shade} opacity="0.55" />
    </g>
  );
}

// ---------- Perro ----------
function DogHead({ ear, fur }) {
  return (
    <g>
      <ellipse cx="16" cy="22" rx="8" ry="11" fill={ear} transform="rotate(-18 16 22)" />
      <ellipse cx="48" cy="22" rx="8" ry="11" fill={ear} transform="rotate(18 48 22)" />
      <circle cx="32" cy="34" r="20" fill={fur} />
      <circle cx="23" cy="32" r="3.2" fill={FACE} />
      <circle cx="41" cy="32" r="3.2" fill={FACE} />
      <ellipse cx="32" cy="41" rx="5" ry="3.6" fill={FACE} />
      <path d="M32 44 v4" stroke={FACE} strokeWidth="2" strokeLinecap="round" />
      <path d="M24 48 q8 6 16 0" stroke={FACE} strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function DogVariant({ palette }) {
  const { ear, fur, chest, pattern } = palette;
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <MammalBody color={fur} shade={chest} />
      {pattern === 'spots' && (
        <>
          <ellipse cx="21" cy="53" rx="4.2" ry="5.4" fill={ear} opacity="0.85" />
          <ellipse cx="44" cy="57" rx="3.6" ry="4.6" fill={ear} opacity="0.85" />
        </>
      )}
      <g transform={HEAD_TRANSFORM}>
        <DogHead ear={ear} fur={fur} />
      </g>
    </svg>
  );
}

const DOG_PALETTES = {
  'dog-1': { ear: '#c9683f', fur: '#e9b494', chest: '#f6ded0' },
  'dog-2': { ear: '#2f2f33', fur: '#54545c', chest: '#75757e' },
  'dog-3': { ear: '#c9683f', fur: '#f3e6d3', chest: '#e9b494', pattern: 'spots' }
};

// ---------- Gato ----------
function CatHead({ earOuter, earInner, furMid, furLight }) {
  return (
    <g>
      <path d="M16 20 L22 6 L28 22 Z" fill={earOuter} />
      <path d="M48 20 L42 6 L36 22 Z" fill={earOuter} />
      <path d="M18.5 18 L22.5 10 L26 19 Z" fill={earInner} />
      <path d="M45.5 18 L41.5 10 L38 19 Z" fill={earInner} />
      <ellipse cx="18" cy="40" rx="10" ry="9" fill={earOuter} />
      <ellipse cx="46" cy="40" rx="10" ry="9" fill={earOuter} />
      <circle cx="32" cy="35" r="19" fill={furMid} />
      <ellipse cx="32" cy="43" rx="11" ry="8" fill={furLight} />
      <ellipse cx="24" cy="33" rx="3.4" ry="4.2" fill={FACE} />
      <ellipse cx="40" cy="33" rx="3.4" ry="4.2" fill={FACE} />
      <circle cx="25.2" cy="31.3" r="1" fill="#fff" />
      <circle cx="41.2" cy="31.3" r="1" fill="#fff" />
      <path d="M32 40 l-2.6 2.6 h5.2 z" fill={earOuter} />
      <path d="M32 42.6 q-4 4 -8 1.4" stroke={FACE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M32 42.6 q4 4 8 1.4" stroke={FACE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </g>
  );
}

function CatVariant({ palette }) {
  const { earOuter, earInner, furMid, furLight, pattern } = palette;
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <MammalBody color={furMid} shade={furLight} />
      {pattern === 'stripes' && (
        <>
          <path d="M13 49 q9 -4 15 -1" stroke={earOuter} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.55" />
          <path d="M51 49 q-9 -4 -15 -1" stroke={earOuter} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.55" />
          <path d="M21 60 q11 -4 22 0" stroke={earOuter} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.4" />
        </>
      )}
      <g transform={HEAD_TRANSFORM}>
        <CatHead earOuter={earOuter} earInner={earInner} furMid={furMid} furLight={furLight} />
      </g>
    </svg>
  );
}

const CAT_PALETTES = {
  'cat-1': { earOuter: '#d98a4f', earInner: '#f3c9a0', furMid: '#e8a869', furLight: '#f8e6d1', pattern: 'stripes' },
  'cat-2': { earOuter: '#2f2f33', earInner: '#4a4a52', furMid: '#3a3a40', furLight: '#54545c' },
  'cat-3': { earOuter: '#f3c9a0', earInner: '#f9dfc4', furMid: '#faf3e8', furLight: '#ffffff' }
};

// ---------- Conejo ----------
function RabbitHead({ earOuter, earInner, fur }) {
  return (
    <g>
      <ellipse cx="24" cy="14" rx="6" ry="16" fill={earOuter} transform="rotate(-10 24 14)" />
      <ellipse cx="40" cy="14" rx="6" ry="16" fill={earOuter} transform="rotate(10 40 14)" />
      <ellipse cx="24" cy="16" rx="2.6" ry="10" fill={earInner} transform="rotate(-10 24 16)" />
      <ellipse cx="40" cy="16" rx="2.6" ry="10" fill={earInner} transform="rotate(10 40 16)" />
      <circle cx="32" cy="38" r="18" fill={fur} />
      <circle cx="24" cy="36" r="3" fill={FACE} />
      <circle cx="40" cy="36" r="3" fill={FACE} />
      <path d="M32 42 l-3 3 h6 z" fill={earInner} />
      <path d="M26 47 q6 4 12 0" stroke={FACE} strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function RabbitVariant({ palette }) {
  const { earOuter, earInner, fur } = palette;
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <MammalBody color={fur} shade={earInner} />
      <g transform={HEAD_TRANSFORM}>
        <RabbitHead earOuter={earOuter} earInner={earInner} fur={fur} />
      </g>
    </svg>
  );
}

const RABBIT_PALETTES = {
  'rabbit-1': { earOuter: '#efe6da', earInner: '#e3b9c9', fur: '#f7f1e8' },
  'rabbit-2': { earOuter: '#a9a9ad', earInner: '#c9c9cf', fur: '#c4c4ca' },
  'rabbit-3': { earOuter: '#c9a071', earInner: '#e3b9c9', fur: '#dcb98d' }
};

// ---------- Ave ----------
// El ave y la tortuga ya tenían "cuerpo" propio en su diseño original (el
// círculo grande del ave, el caparazón de la tortuga) — no hacía falta
// agregarles hombros aparte, así que estas dos mantienen su geometría de
// siempre y sólo cambian de paleta según la variante.
function BirdVariant({ palette }) {
  const { bodyColor, headColor, beak, belly } = palette;
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <circle cx="32" cy="32" r="20" fill={bodyColor} />
      <circle cx="32" cy="24" r="12" fill={headColor} />
      <circle cx="27" cy="22" r="2.6" fill={FACE} />
      <path d="M32 26 l8 3 l-8 3 z" fill={beak} />
      <path d="M16 40 q16 12 32 0" fill={belly} />
      <path d="M22 12 q4 -6 8 -1" stroke={FACE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

const BIRD_PALETTES = {
  'bird-1': { bodyColor: '#4f7d6b', headColor: '#6fa08b', beak: '#c9683f', belly: '#e1ede8' },
  'bird-2': { bodyColor: '#3f6fa8', headColor: '#5f93c9', beak: '#f0a83f', belly: '#e6f0f7' },
  'bird-3': { bodyColor: '#c99a2e', headColor: '#e0bd54', beak: '#e0673f', belly: '#fff6e0' }
};

// ---------- Tortuga ----------
function TurtleVariant({ palette }) {
  const { shell, shellLight, head } = palette;
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="32" cy="34" rx="21" ry="17" fill={shell} />
      <path d="M32 20 L41 30 L36 42 L28 42 L23 30 Z" fill={shellLight} stroke={shell} strokeWidth="1.5" />
      <path d="M14 30 L23 30 L28 42 L18 46 Z" fill={shellLight} stroke={shell} strokeWidth="1.5" />
      <path d="M50 30 L41 30 L36 42 L46 46 Z" fill={shellLight} stroke={shell} strokeWidth="1.5" />
      <circle cx="46" cy="20" r="8" fill={head} />
      <circle cx="49" cy="18" r="1.8" fill={FACE} />
    </svg>
  );
}

const TURTLE_PALETTES = {
  'turtle-1': { shell: '#4f7d6b', shellLight: '#6fa08b', head: '#8fbfa8' },
  'turtle-2': { shell: '#6b6b3f', shellLight: '#8f8f5f', head: '#b3b380' },
  'turtle-3': { shell: '#2f8f8a', shellLight: '#4fb3ac', head: '#8fd6d0' }
};

const SPECIES_VARIANT_COMPONENT = { dog: DogVariant, cat: CatVariant, rabbit: RabbitVariant, bird: BirdVariant, turtle: TurtleVariant };
const ALL_PALETTES = { ...DOG_PALETTES, ...CAT_PALETTES, ...RABBIT_PALETTES, ...BIRD_PALETTES, ...TURTLE_PALETTES };
const COMPACT_SPECIES = new Set(['dog', 'cat', 'rabbit']);

// Tres "looks" (variantes) distintas por especie, para elegir como avatar —
// ver AvatarPicker. La mascota sigue siendo la misma especie/raza real en su
// perfil; esto es sólo la ilustración que se usa como foto cuando no hay
// una foto real subida.
export const AVATAR_VARIANTS = {
  dog: [
    { key: 'dog-1', label: 'Marrón' },
    { key: 'dog-2', label: 'Negro' },
    { key: 'dog-3', label: 'Manchado' }
  ],
  cat: [
    { key: 'cat-1', label: 'Atigrado' },
    { key: 'cat-2', label: 'Negro' },
    { key: 'cat-3', label: 'Blanco' }
  ],
  rabbit: [
    { key: 'rabbit-1', label: 'Blanco' },
    { key: 'rabbit-2', label: 'Gris' },
    { key: 'rabbit-3', label: 'Marrón' }
  ],
  bird: [
    { key: 'bird-1', label: 'Verde' },
    { key: 'bird-2', label: 'Azul' },
    { key: 'bird-3', label: 'Amarillo' }
  ],
  turtle: [
    { key: 'turtle-1', label: 'Verde' },
    { key: 'turtle-2', label: 'Oliva' },
    { key: 'turtle-3', label: 'Turquesa' }
  ]
};

export const AVATAR_VARIANT_KEYS = Object.keys(ALL_PALETTES);

function speciesOfVariant(key) {
  return String(key || '').split('-')[0];
}

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

// compact=true (perro/gato/conejo): la gorra/anteojos/corona van sobre la
// cabeza, que ahora está achicada y subida, así que reusan el mismo
// transform que la cabeza para seguir quedando bien puestos. El moño y el
// pañuelo en cambio van sobre el pecho/cuello — el lugar que antes no
// existía y que causaba que se vieran encima de la boca — así que usan
// coordenadas nuevas, pensadas para la zona de hombros.
function AccessoryOverlay({ accessory, compact }) {
  if (accessory === 'cap') {
    const cap = (
      <g>
        <path d="M14 24 Q32 6 50 24 L50 28 L14 28 Z" fill="#ef6c4d" />
        <rect x="12" y="25" width="40" height="5" rx="2.5" fill="#d9502f" />
        <circle cx="32" cy="13" r="3" fill="#ffd166" />
      </g>
    );
    return compact ? <g transform={HEAD_TRANSFORM}>{cap}</g> : cap;
  }
  if (accessory === 'glasses') {
    const glasses = (
      <g stroke="#2b2620" strokeWidth="2" fill="rgba(255,255,255,0.4)">
        <circle cx="23" cy="33" r="7" />
        <circle cx="41" cy="33" r="7" />
        <path d="M30 32 h2" />
        <path d="M16 31 q-4 0 -4 4" fill="none" strokeLinecap="round" />
        <path d="M48 31 q4 0 4 4" fill="none" strokeLinecap="round" />
      </g>
    );
    return compact ? <g transform={HEAD_TRANSFORM}>{glasses}</g> : glasses;
  }
  if (accessory === 'crown') {
    const crown = <path d="M14 22 L20 9 L28 19 L32 7 L36 19 L44 9 L50 22 L50 28 L14 28 Z" fill="#ffd43b" stroke="#f5a623" strokeWidth="1.2" strokeLinejoin="round" />;
    return compact ? <g transform={HEAD_TRANSFORM}>{crown}</g> : crown;
  }
  if (accessory === 'bow') {
    return compact ? (
      <g>
        <path d="M32 50 L24 45 V56 Z" fill="#e64980" />
        <path d="M32 50 L40 45 V56 Z" fill="#e64980" />
        <circle cx="32" cy="50" r="3" fill="#c2255c" />
      </g>
    ) : (
      <g>
        <path d="M32 46 L23 40 V52 Z" fill="#e64980" />
        <path d="M32 46 L41 40 V52 Z" fill="#e64980" />
        <circle cx="32" cy="46" r="3.2" fill="#c2255c" />
      </g>
    );
  }
  if (accessory === 'bandana') {
    return compact ? (
      <g>
        <path d="M12 45 Q32 58 52 45 L52 51 Q32 62 12 51 Z" fill="#4c6ef5" />
        <circle cx="20" cy="49" r="1.4" fill="#fff" />
        <circle cx="32" cy="55" r="1.4" fill="#fff" />
        <circle cx="44" cy="49" r="1.4" fill="#fff" />
      </g>
    ) : (
      <g>
        <path d="M11 39 Q32 52 53 39 L53 45 Q32 58 11 45 Z" fill="#4c6ef5" />
        <circle cx="20" cy="43" r="1.4" fill="#fff" />
        <circle cx="32" cy="50" r="1.4" fill="#fff" />
        <circle cx="44" cy="43" r="1.4" fill="#fff" />
      </g>
    );
  }
  return null;
}

// species: la especie real de la mascota (siempre define el "molde" — un
// gato sigue siendo gato). variant: opcional, cuál de los 3 looks de esa
// especie usar; si no se pasa (la mayoría de los usos actuales, como el
// selector de especie del registro o la foto de respaldo en el feed) cae en
// el primer look de esa especie, que mantiene los mismos colores que la
// ilustración original de siempre — cero cambio visual para quien no
// personalizó nada.
export default function PetIllustration({ species, variant, size = 40, accessory = 'none' }) {
  const fallbackKey = `${species}-1`;
  const variantKey = variant && ALL_PALETTES[variant] ? variant : fallbackKey;
  const resolvedSpecies = ALL_PALETTES[variantKey] ? speciesOfVariant(variantKey) : 'dog';
  const Cmp = SPECIES_VARIANT_COMPONENT[resolvedSpecies] || DogVariant;
  const palette = ALL_PALETTES[variantKey] || DOG_PALETTES['dog-1'];
  const compact = COMPACT_SPECIES.has(resolvedSpecies);
  return (
    <div style={{ width: size, height: size, display: 'inline-block', position: 'relative' }}>
      <Cmp palette={palette} />
      {accessory && accessory !== 'none' && (
        <svg viewBox="0 0 64 64" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
          <AccessoryOverlay accessory={accessory} compact={compact} />
        </svg>
      )}
    </div>
  );
}
