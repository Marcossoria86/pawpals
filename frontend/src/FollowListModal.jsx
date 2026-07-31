import { useEffect, useState } from 'react';
import { api } from './api';
import PetAvatar from './PetAvatar';
import { IconClose } from './Icons';

// Modal con la lista de seguidores o seguidos de una mascota. Se usa tanto
// desde el perfil propio como desde el de otra mascota.
export default function FollowListModal({ petId, kind, onClose, onViewPet, showToast }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    const fetcher = kind === 'followers' ? api.petFollowers : api.petFollowing;
    fetcher(petId)
      .then(setItems)
      .catch(() => showToast('No se pudo cargar la lista'));
  }, [petId, kind]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card follow-list-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title-row">
          <div className="modal-title">{kind === 'followers' ? 'Seguidores' : 'Siguiendo'}</div>
          <button type="button" className="modal-close-x" onClick={onClose}><IconClose size={18} /></button>
        </div>
        <div className="follow-list">
          {items === null && <div className="thread-empty">Cargando…</div>}
          {items && items.length === 0 && (
            <div className="thread-empty">
              {kind === 'followers' ? 'Todavía no tiene seguidores.' : 'Todavía no sigue a nadie.'}
            </div>
          )}
          {items && items.map((p) => (
            <button
              type="button"
              className="follow-list-row"
              key={p.pet_id}
              onClick={() => { onViewPet?.(p.pet_id); onClose(); }}
            >
              <PetAvatar photoUrl={p.photo_url} species={p.species} color={p.color} size={40} />
              <div className="follow-list-body">
                <div className="follow-list-name">{p.pet_name}</div>
                <div className="follow-list-breed">{p.breed}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
