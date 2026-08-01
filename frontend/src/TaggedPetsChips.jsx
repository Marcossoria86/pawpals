// Fila de "Con: Firulais, Toby" — se muestra debajo de publicaciones,
// comentarios e historias que tienen mascotas etiquetadas (ver
// tagged_pets en las respuestas del backend). Cada nombre es un botón
// que lleva al perfil de esa mascota, igual que el resto de los avatares
// clickeables de la app.
export default function TaggedPetsChips({ pets, onViewPet, compact = false }) {
  if (!pets || pets.length === 0) return null;
  return (
    <div className={`tagged-pets-row ${compact ? 'compact' : ''}`}>
      <span className="tagged-pets-label">Con</span>
      {pets.map((p, i) => (
        <span key={p.pet_id}>
          <button type="button" className="tagged-pet-link" onClick={() => onViewPet?.(p.pet_id)}>
            {p.pet_name}
          </button>
          {i < pets.length - 1 ? ',' : ''}
        </span>
      ))}
    </div>
  );
}
