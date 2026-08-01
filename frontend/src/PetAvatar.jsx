import PetIllustration from './PetIllustration';

// Avatar de mascota: si tiene foto real subida, la muestra; si no, cae en la
// ilustración propia de su especie. Se usa en feed, cerca de ti, perfil y
// comentarios. avatarBg/avatarAccessory son opcionales (ver AvatarPicker,
// "Avatares" del menú) — si la mascota personalizó su avatar, avatarBg
// reemplaza al color de fondo de siempre y avatarAccessory agrega el
// accesorio elegido; si no se pasan (la mayoría de los usos todavía no los
// manda), el avatar se ve exactamente como antes.
export default function PetAvatar({ photoUrl, species, color, avatarBg, avatarAccessory, size = 40, className = '', style = {} }) {
  return (
    <div
      className={`avatar ${className}`}
      style={{ width: size, height: size, background: avatarBg || color, overflow: 'hidden', ...style }}
    >
      {photoUrl
        ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <PetIllustration species={species} size={Math.round(size * 0.65)} accessory={avatarAccessory} />}
    </div>
  );
}
