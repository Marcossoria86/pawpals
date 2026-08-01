import { useEffect, useState } from 'react';
import { api } from './api';
import PetAvatar from './PetAvatar';
import { IconHeart, IconComment, IconShare, IconPawSmall, IconCheck, IconClose, IconAddUser, IconTag } from './Icons';
import { IconBell } from './NavIcons';

function timeAgo(isoLike) {
  const date = new Date(isoLike.replace(' ', 'T') + 'Z');
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `hace ${diffD} d`;
}

function messageFor(n) {
  const who = n.actor_pet_name || 'Alguien';
  switch (n.type) {
    case 'like': return `${who} le dio like a tu publicación`;
    case 'comment': return `${who} comentó tu publicación`;
    case 'share': return `${who} compartió tu publicación`;
    case 'playdate_request': return `${who} te envió una solicitud de cita de juego`;
    case 'playdate_accepted': return `${who} aceptó tu solicitud de cita de juego`;
    case 'playdate_declined': return `${who} rechazó tu solicitud de cita de juego`;
    case 'follow': return `${who} empezó a seguirte`;
    case 'tag_post': return `${who} etiquetó a tu mascota en una publicación`;
    case 'tag_comment': return `${who} etiquetó a tu mascota en un comentario`;
    case 'tag_story': return `${who} etiquetó a tu mascota en una historia`;
    default: return `${who} interactuó contigo`;
  }
}

function iconFor(type) {
  switch (type) {
    case 'like': return <IconHeart filled size={16} />;
    case 'comment': return <IconComment size={16} />;
    case 'share': return <IconShare size={16} />;
    case 'playdate_request': return <IconPawSmall size={17} />;
    case 'playdate_accepted': return <IconCheck size={16} />;
    case 'playdate_declined': return <IconClose size={16} />;
    case 'follow': return <IconAddUser size={16} />;
    case 'tag_post':
    case 'tag_comment':
    case 'tag_story':
      return <IconTag size={16} />;
    default: return <IconBell />;
  }
}

export default function NotificationsView({ showToast, onViewPet, onRead }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.notifications()
      .then((data) => {
        setItems(data);
        return api.markNotificationsRead();
      })
      .then(() => onRead?.())
      .catch(() => showToast('No se pudieron cargar las notificaciones'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="section-title">Cargando notificaciones…</div>;

  return (
    <section>
      {items.length === 0 && <div className="section-title">Todavía no tienes notificaciones.</div>}
      {items.map((n) => (
        <button
          type="button"
          className={`notif-row ${n.is_read ? '' : 'unread'}`}
          key={n.id}
          onClick={() => n.actor_pet_id && onViewPet?.(n.actor_pet_id)}
        >
          <PetAvatar photoUrl={n.actor_photo_url} species={n.actor_species} color={n.actor_color} size={44} />
          <div className="notif-body">
            <div className="notif-icon-badge">{iconFor(n.type)}</div>
            <div>
              <div className="notif-text">{messageFor(n)}</div>
              <div className="notif-meta">{timeAgo(n.created_at)}</div>
            </div>
          </div>
        </button>
      ))}
    </section>
  );
}
