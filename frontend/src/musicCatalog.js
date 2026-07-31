// Catálogo de música para historias: un puñado de pistas instrumentales
// cortas y propias (compuestas para esta app, no descargadas de ningún
// lado), así no hay ningún problema de licencias. Se guardan en
// public/music/ y suenan en loop mientras dura la historia. La misma
// lista de "keys" está espejada en el backend (index.js) para validar que
// sólo se guarde una de estas pistas conocidas.
export const MUSIC_TRACKS = [
  { key: 'alegre', label: 'Alegre', emoji: '🎵' },
  { key: 'relax', label: 'Relax', emoji: '🌙' },
  { key: 'fiesta', label: 'Fiesta', emoji: '🎉' },
  { key: 'tierno', label: 'Tierno', emoji: '🎀' },
  { key: 'energico', label: 'Enérgico', emoji: '⚡' }
];

export function musicUrl(key) {
  return `/music/${key}.mp3`;
}

export function musicLabel(key) {
  return MUSIC_TRACKS.find((t) => t.key === key)?.label || '';
}
