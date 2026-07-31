import { useEffect, useState } from 'react';
import { api } from './api';
import PetAvatar from './PetAvatar';
import FollowListModal from './FollowListModal';
import { IconComment, IconAddUser, IconCheck } from './Icons';

export default function PetProfileView({ petId, onBack, showToast, onMessagePet, onViewPet }) {
  const [data, setData] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [listModal, setListModal] = useState(null); // 'followers' | 'following' | null

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

  async function handleToggleFollow() {
    setFollowBusy(true);
    try {
      const result = await api.toggleFollow(petId);
      setData((prev) => ({
        ...prev,
        is_following: result.following,
        stats: { ...prev.stats, followers: result.followers_count }
      }));
      showToast(result.following ? '¡Ahora seguís a esta mascota!' : 'Dejaste de seguir a esta mascota');
    } catch (err) {
      showToast(err.message);
    } finally {
      setFollowBusy(false);
    }
  }

  if (!data) return <div className="section-title">Cargando perfil…</div>;

  const { pet, owner_name, distance_km, playdate_status, is_me, is_following, stats } = data;

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
          <button type="button" className="stat stat-btn" onClick={() => setListModal('followers')}>
            <b>{stats.followers}</b><span>seguidores</span>
          </button>
          <button type="button" className="stat stat-btn" onClick={() => setListModal('following')}>
            <b>{stats.following}</b><span>siguiendo</span>
          </button>
        </div>
        {!is_me && (
          <div className="profile-action-row">
            <button
              type="button"
              className={`match-btn ${is_following ? 'sent' : ''}`}
              disabled={followBusy}
              onClick={handleToggleFollow}
            >
              {is_following ? <><IconCheck size={15} /> Siguiendo</> : <><IconAddUser size={15} /> Seguir</>}
            </button>
            <button type="button" className="match-btn" onClick={() => onMessagePet?.(petId)}>
              <IconComment size={15} /> Enviar mensaje
            </button>
          </div>
        )}
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

      {listModal && (
        <FollowListModal
          petId={petId}
          kind={listModal}
          onClose={() => setListModal(null)}
          onViewPet={(id) => { setListModal(null); onViewPet?.(id); }}
          showToast={showToast}
        />
      )}
    </section>
  );
}
