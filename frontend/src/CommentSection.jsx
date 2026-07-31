import { useState } from 'react';
import { api } from './api';
import PetAvatar from './PetAvatar';
import ReportModal from './ReportModal';
import { IconComment } from './Icons';

export default function CommentSection({ postId, commentsCount, disabled, isPostOwner, showToast, onCountChange }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState(null); // null = todavía no se cargaron
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [reportCommentId, setReportCommentId] = useState(null);

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

  function startEdit(c) {
    setOpenMenuId(null);
    setEditingId(c.id);
    setEditText(c.body);
  }

  async function handleSaveEdit(commentId) {
    if (!editText.trim()) return;
    try {
      const updated = await api.editComment(commentId, editText.trim());
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      setEditingId(null);
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleDelete(commentId) {
    setOpenMenuId(null);
    if (!window.confirm('¿Eliminar este comentario?')) return;
    const prev = comments;
    setComments((cs) => cs.filter((c) => c.id !== commentId));
    onCountChange?.(postId, Math.max(0, (commentsCount || 0) - 1));
    try {
      await api.deleteComment(commentId);
    } catch (err) {
      showToast(err.message);
      setComments(prev);
      onCountChange?.(postId, commentsCount || 0);
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
              {editingId === c.id ? (
                <div className="comment-edit-row">
                  <input
                    type="text"
                    value={editText}
                    maxLength={280}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(c.id); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                  />
                  <button type="button" onClick={() => handleSaveEdit(c.id)} disabled={!editText.trim()}>Guardar</button>
                  <button type="button" className="comment-edit-cancel" onClick={() => setEditingId(null)}>Cancelar</button>
                </div>
              ) : (
                <div className="comment-bubble">
                  <span className="comment-author">{c.pet_name}</span> {c.body}
                  {c.edited_at && <span className="comment-edited-tag"> (editado)</span>}
                </div>
              )}
              {editingId !== c.id && (c.is_mine || isPostOwner) && (
                <div className="post-menu comment-menu">
                  <button
                    type="button"
                    className="post-menu-btn comment-menu-btn"
                    aria-label="Más opciones"
                    onClick={() => setOpenMenuId((v) => (v === c.id ? null : c.id))}
                  >
                    ⋮
                  </button>
                  {openMenuId === c.id && (
                    <div className="post-menu-dropdown">
                      {c.is_mine && <button type="button" onClick={() => startEdit(c)}>Editar</button>}
                      <button type="button" className="danger" onClick={() => handleDelete(c.id)}>Eliminar</button>
                    </div>
                  )}
                </div>
              )}
              {editingId !== c.id && !c.is_mine && !isPostOwner && (
                <div className="post-menu comment-menu">
                  <button
                    type="button"
                    className="post-menu-btn comment-menu-btn"
                    aria-label="Más opciones"
                    onClick={() => setOpenMenuId((v) => (v === c.id ? null : c.id))}
                  >
                    ⋮
                  </button>
                  {openMenuId === c.id && (
                    <div className="post-menu-dropdown">
                      <button type="button" onClick={() => { setOpenMenuId(null); setReportCommentId(c.id); }}>Reportar</button>
                    </div>
                  )}
                </div>
              )}
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

      {reportCommentId !== null && (
        <ReportModal
          targetType="comment"
          targetId={reportCommentId}
          onClose={() => setReportCommentId(null)}
          showToast={showToast}
        />
      )}
    </>
  );
}
