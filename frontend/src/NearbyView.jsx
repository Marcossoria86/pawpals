import { useEffect, useState } from 'react';
import { api } from './api';
import PetAvatar from './PetAvatar';

export default function NearbyView({ showToast, searchQuery = '', onViewPet }) {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await api.nearby();
      setPets(data);
    } catch (err) {
      showToast('No se pudo cargar "cerca de ti"');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRequest(petId) {
    setPets((prev) => prev.map((p) => p.id === petId ? { ...p, status: 'pending' } : p));
    try {
      await api.requestPlaydate(petId);
      const pet = pets.find((p) => p.id === petId);
      showToast(`Solicitud de cita de juego enviada a ${pet?.owner_name || ''} 🐾`);
    } catch (err) {
      showToast(err.message);
      load();
    }
  }

  const q = searchQuery.trim().toLowerCase();
  const visiblePets = q
    ? pets.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.breed.toLowerCase().includes(q) ||
        p.owner_name.toLowerCase().includes(q))
    : pets;

  return (
    <section>
      <div className="section-title">Mascotas cerca de ti</div>
      {loading && <div className="section-title">Buscando mascotas cercanas…</div>}
      {!loading && q && visiblePets.length === 0 && (
        <div className="section-title">Sin resultados para "{searchQuery}"</div>
      )}
      {visiblePets.map((pet) => (
        <div className="nearby-card" key={pet.id}>
          <button className="nearby-link" onClick={() => onViewPet?.(pet.id)}>
            <PetAvatar photoUrl={pet.photo_url} species={pet.species} color={pet.color} size={48} />
            <div className="nearby-info">
              <div className="nearby-name">{pet.name} · {pet.breed}</div>
              <div className="nearby-sub">
                {pet.distance_km != null ? `${pet.distance_km.toFixed(1)} km de ti` : 'Distancia desconocida'} · dueño/a: {pet.owner_name}
              </div>
              <span className="pill">Disponible para socializar</span>
            </div>
          </button>
          <button
            className={`match-btn ${pet.status ? 'sent' : ''}`}
            disabled={!!pet.status}
            onClick={() => handleRequest(pet.id)}
          >
            {pet.status ? 'Solicitud enviada' : 'Proponer cita'}
          </button>
        </div>
      ))}
    </section>
  );
}
