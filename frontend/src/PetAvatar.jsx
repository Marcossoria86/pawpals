import PetIllustration from './PetIllustration';

// Avatar de mascota: si tiene foto real subida, la muestra; si no, cae en la
// ilustración propia de su especie. Se usa en feed, cerca de ti, perfil y comentarios.
export default function PetAvatar({ photoUrl, species, color, size = 40, className = '', style = {} }) {
  return (
    <div
      className={`avatar ${className}`}
      style={{ width: size, height: size, background: color, overflow: 'hidden', ...style }}
    >
      {photoUrl
        ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <PetIllustration species={species} size={Math.round(size * 0.65)} />}
    </div>
  );
}
