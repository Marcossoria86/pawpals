import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import PetAvatar from './PetAvatar';
import { IconMessages } from './NavIcons';

function timeAgo(isoLike) {
  const date = new Date(isoLike.replace(' ', 'T') + 'Z');
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `${diffD} d`;
}

// Ventana de un chat: lista de mensajes + compose. Se muestra cuando hay
// una mascota abierta (openPetId), ya sea porque la tocaron en la lista de
// conversaciones o porque llegaron acá desde "Enviar mensaje" en un perfil.
function Thread({ petId, showToast, onBack, onSent }) {
  const [data, setData] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  async function load() {
    try {
      const result = await api.conversationMessages(petId);
      setData(result);
      onSent?.();
    } catch (err) {
      showToast('No se pudo cargar la conversación');
    }
  }

  useEffect(() => { setData(null); load(); }, [petId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [data]);

  async function handleSend() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const created = await api.sendMessage(petId, body);
      setData((prev) => ({ ...prev, messages: [...prev.messages, created] }));
      setText('');
    } catch (err) {
      showToast(err.message);
    } finally {
      setSending(false);
    }
  }

  if (!data) return <div className="section-title">Cargando conversación…</div>;

  return (
    <div className="thread-wrap">
      <div className="thread-head">
        <button className="back-link" onClick={onBack}>← Volver</button>
        <PetAvatar photoUrl={data.partner.photo_url} species={data.partner.species} color={data.partner.color} size={32} />
        <span className="thread-head-name">{data.partner.pet_name}</span>
      </div>
      <div className="thread-messages" ref={listRef}>
        {data.messages.length === 0 && (
          <div className="thread-empty">Todavía no hay mensajes. ¡Decí hola! 👋</div>
        )}
        {data.messages.map((m) => (
          <div key={m.id} className={`msg-bubble-row ${m.is_mine ? 'mine' : ''}`}>
            <div className="msg-bubble">
              {m.body}
              <span className="msg-time">{timeAgo(m.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="thread-compose">
        <input
          type="text"
          placeholder="Escribí un mensaje…"
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
        />
        <button type="button" disabled={!text.trim() || sending} onClick={handleSend}>
          {sending ? '…' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}

export default function MessagesView({ showToast, initialPetId, onRefreshUnread }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openPetId, setOpenPetId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.conversations();
      setConversations(data);
    } catch (err) {
      showToast('No se pudieron cargar los mensajes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (initialPetId != null) setOpenPetId(initialPetId);
  }, [initialPetId]);

  function handleBack() {
    setOpenPetId(null);
    load();
  }

  if (openPetId != null) {
    return (
      <Thread
        petId={openPetId}
        showToast={showToast}
        onBack={handleBack}
        onSent={onRefreshUnread}
      />
    );
  }

  if (loading) return <div className="section-title">Cargando mensajes…</div>;

  return (
    <div className="messages-list-pad">
      {conversations.length === 0 && (
        <div className="empty-state">
          <IconMessages />
          <div className="section-title">Todavía no tienes conversaciones.</div>
          <div className="thread-empty">Entrá al perfil de una mascota cerca tuyo y tocá "Enviar mensaje" para arrancar.</div>
        </div>
      )}
      {conversations.map((c) => (
        <button type="button" className="conversation-row" key={c.pet_id} onClick={() => setOpenPetId(c.pet_id)}>
          <PetAvatar photoUrl={c.photo_url} species={c.species} color={c.color} size={48} />
          <div className="conversation-body">
            <div className="conversation-name">{c.pet_name}</div>
            <div className="conversation-preview">{c.last_message_is_mine ? 'Vos: ' : ''}{c.last_message}</div>
          </div>
          <div className="conversation-side">
            <span className="conversation-time">{timeAgo(c.last_message_at)}</span>
            {c.unread_count > 0 && <span className="conversation-unread">{c.unread_count > 9 ? '9+' : c.unread_count}</span>}
          </div>
        </button>
      ))}
    </div>
  );
}
