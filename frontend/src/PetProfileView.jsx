import { useEffect, useState } from 'react';
import { api } from './api';
import PetAvatar from './PetAvatar';

export default function PetProfileView({ petId, onBack, showToast }) {
  const [data, setData] = useState(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    setData(null);
    api.pet(petId).then(setData).catch(() => showToast('No se pudo cargar el perfil de la mascota'));
  }, [petId]);

  async function handlePlaydate() {
    setRequesting(true);
    try {
      await api.requestPlaydate(petId);
      setData((prev) => ({ ...prev, playdate_status: 'pending' }));
      showToast('Solicitud de cita de juego enviada 🐾');
    } catch (err) {
      showToast(err.message);
    } finally {
      setRequesting(false);
    }
  }

  if (!data) return <div className="section-title">Cargando perfil…</div>;

  const { pet, owner_name, distance_km, playdate_status, is_me, stats } = data;

  return (
    <section>
      <button className="back-link" onClick={onBack}>← Volver</button>
      <div className="profile-hero">
        <PetAvatar photoUrl={pet.photo_url} species={pet.species} color={pet.color} size={84} className="profile-avatar" />
        <div className="profile-name">{pet.name}</div>
        <div className="profile-sub">{pet.breed} · {pet.age ?? '?'} años · dueño/a: {owner_name}</div>
        {!is_me && distance_km != null && (
          <div className="profile-sub">{distance_km.toFixed(1)} km de ti</div>
        )}
        <div className="stat-row">
          <div className="stat"><b>{stats.posts}</b><span>publicaciones</span></div>
        </div>
        {!is_me && (
          <button
            className={`match-btn profile-match-btn ${playdate_status ? 'sent' : ''}`}
            disabled={!!playdate_status || requesting}
            onClick={handlePlaydate}
          >
            {playdate_status ? 'Solicitud enviada' : requesting ? 'Enviando…' : 'Proponer cita de juego'}
          </button>
        )}
      </div>
      <div className="section-title">Sobre {pet.name}</div>
      <div className="bio-box">{pet.bio || 'Todavía no hay una biografía para esta mascota.'}</div>
    </section>
  );
}
