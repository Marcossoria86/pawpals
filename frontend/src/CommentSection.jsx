import { useState } from 'react';
import { api } from './api';
import PetAvatar from './PetAvatar';
import { IconComment } from './Icons';

export default function CommentSection({ postId, commentsCount, disabled, showToast, onCountChange }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState(null); // null = todavía no se cargaron
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function toggleOpen() {
    if (disabled) return;
    const next = !open;
    setOpen(next);
    if (next && comments === null) {
      setLoading(true);
      try {
        const data = await api.comments(postId);
        setComments(data);
      } catch (err) {
        showToast('No se pudieron cargar los comentarios');
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const created = await api.addComment(postId, text.trim());
      setComments((prev) => [...(prev || []), created]);
      setText('');
      onCountChange?.(postId, (commentsCount || 0) + 1);
    } catch (err) {
      showToast(err.message);
    } finally {
      setSending(false);
    }
  }

  if (disabled) {
    return <div className="action action-disabled"><IconComment size={18} /> <span>Comentarios desactivados</span></div>;
  }

  return (
    <>
      <button className="action" onClick={toggleOpen}>
        <IconComment size={18} /> <span>{commentsCount > 0 ? `${commentsCount} comentario${commentsCount === 1 ? '' : 's'}` : 'Comentar'}</span>
      </button>

      {open && (
        <div className="comment-panel">
          {loading && <div className="comment-loading">Cargando comentarios…</div>}
          {!loading && comments && comments.length === 0 && (
            <div className="comment-loading">Sé el primero en comentar.</div>
          )}
          {comments && comments.map((c) => (
            <div className="comment-row" key={c.id}>
              <PetAvatar photoUrl={c.photo_url} species={c.species} color={c.color} size={28} />
              <div className="comment-bubble">
                <span className="comment-author">{c.pet_name}</span> {c.body}
              </div>
            </div>
          ))}
          <div className="comment-compose">
            <input
              type="text"
              placeholder="Escribe un comentario…"
              maxLength={280}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            />
            <button type="button" disabled={!text.trim() || sending} onClick={handleSend}>
              {sending ? '…' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
