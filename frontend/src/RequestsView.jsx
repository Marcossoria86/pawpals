import { useEffect, useState } from 'react';
import { api } from './api';
import PetAvatar from './PetAvatar';

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

const STATUS_LABEL = { pending: 'Pendiente', accepted: 'Aceptada', declined: 'Rechazada' };

export default function RequestsView({ showToast, onViewPet }) {
  const [subTab, setSubTab] = useState('incoming');
  const [incoming, setIncoming] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [inc, snt] = await Promise.all([api.playdatesIncoming(), api.playdatesSent()]);
      setIncoming(inc);
      setSent(snt);
    } catch (err) {
      showToast('No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function respond(id, status) {
    const prev = incoming;
    setIncoming((p) => p.map((r) => r.id === id ? { ...r, status } : r));
    try {
      await api.respondPlaydate(id, status);
      showToast(status === 'accepted' ? '¡Cita de juego aceptada!' : 'Solicitud rechazada');
    } catch (err) {
      showToast(err.message);
      setIncoming(prev);
    }
  }

  const pendingIncoming = incoming.filter((r) => r.status === 'pending');
  const resolvedIncoming = incoming.filter((r) => r.status !== 'pending');

  return (
    <section>
      <div className="subtab-row">
        <button className={`subtab ${subTab === 'incoming' ? 'active' : ''}`} onClick={() => setSubTab('incoming')}>
          Recibidas {pendingIncoming.length > 0 ? `(${pendingIncoming.length})` : ''}
        </button>
        <button className={`subtab ${subTab === 'sent' ? 'active' : ''}`} onClick={() => setSubTab('sent')}>
          Enviadas
        </button>
      </div>

      {loading && <div className="section-title">Cargando solicitudes…</div>}

      {!loading && subTab === 'incoming' && (
        <>
          {incoming.length === 0 && <div className="section-title">Todavía no recibiste solicitudes de citas de juego.</div>}
          {[...pendingIncoming, ...resolvedIncoming].map((r) => (
            <div className="request-card" key={r.id}>
              <button className="nearby-link" onClick={() => onViewPet?.(r.pet_id)}>
                <PetAvatar photoUrl={r.photo_url} species={r.species} color={r.color} size={48} />
                <div className="nearby-info">
                  <div className="nearby-name">{r.pet_name}</div>
                  <div className="nearby-sub">{r.breed} · dueño/a: {r.owner_name} · {timeAgo(r.created_at)}</div>
                </div>
              </button>
              {r.status === 'pending' ? (
                <div className="request-actions">
                  <button className="request-accept" onClick={() => respond(r.id, 'accepted')}>Aceptar</button>
                  <button className="request-decline" onClick={() => respond(r.id, 'declined')}>Rechazar</button>
                </div>
              ) : (
                <span className={`pill ${r.status === 'accepted' ? 'pill-accepted' : 'pill-declined'}`}>{STATUS_LABEL[r.status]}</span>
              )}
            </div>
          ))}
        </>
      )}

      {!loading && subTab === 'sent' && (
        <>
          {sent.length === 0 && <div className="section-title">Todavía no enviaste solicitudes de citas de juego.</div>}
          {sent.map((r) => (
            <div className="request-card" key={r.id}>
              <button className="nearby-link" onClick={() => onViewPet?.(r.pet_id)}>
                <PetAvatar photoUrl={r.photo_url} species={r.species} color={r.color} size={48} />
                <div className="nearby-info">
                  <div className="nearby-name">{r.pet_name}</div>
                  <div className="nearby-sub">{r.breed} · dueño/a: {r.owner_name} · {timeAgo(r.created_at)}</div>
                </div>
              </button>
              <span className={`pill ${r.status === 'accepted' ? 'pill-accepted' : r.status === 'declined' ? 'pill-declined' : ''}`}>
                {STATUS_LABEL[r.status]}
              </span>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
