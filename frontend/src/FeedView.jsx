import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';
import PetIllustration from './PetIllustration';
import PetAvatar from './PetAvatar';
import CommentSection from './CommentSection';
import PostMenu from './PostMenu';
import ReportModal from './ReportModal';
import NewPostComposer from './NewPostComposer';
import { IconHeart, IconShare, IconFlag, IconCamera } from './Icons';

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

export default function FeedView({
  me,
  showToast,
  searchQuery = '',
  onViewPet,
  scrollContainerRef,
  refreshSignal = 0
}) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composeHidden, setComposeHidden] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [shareModalPostId, setShareModalPostId] = useState(null);
  const [shareCaption, setShareCaption] = useState('');
  const [sharing, setSharing] = useState(false);
  const [reportPostId, setReportPostId] = useState(null);
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const lastScrollY = useRef(0);

  async function load() {
    setLoading(true);
    try {
      const data = await api.feed();
      setPosts(data);
    } catch (err) {
      showToast('No se pudo cargar el feed');
    } finally {
      setLoading(false);
    }
  }

  // El signal cambia cuando OTRA pantalla (historias/reels, o el menú "+"
  // del header) crea un post — así el feed se entera y se actualiza solo.
  // También carga la primera vez (mount).
  useEffect(() => { load(); }, [refreshSignal]);

  // Esconde el cuadro de "publicar" al bajar en el feed (para que no tape
  // el contenido) y lo vuelve a mostrar al subir, como pidió el usuario.
  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!el) return undefined;
    lastScrollY.current = el.scrollTop;
    function onScroll() {
      const y = el.scrollTop;
      const diff = y - lastScrollY.current;
      if (y < 40) {
        setComposeHidden(false);
      } else if (diff > 6) {
        setComposeHidden(true);
      } else if (diff < -6) {
        setComposeHidden(false);
      }
      lastScrollY.current = y;
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollContainerRef]);

  function handlePosted() {
    setComposerOpen(false);
    load();
  }

  async function handleLike(postId) {
    setPosts((prev) => prev.map((p) => p.id === postId
      ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.likes_count + (p.liked_by_me ? -1 : 1) }
      : p));
    try {
      await api.toggleLike(postId);
    } catch (err) {
      showToast('No se pudo registrar el like');
      load();
    }
  }

  function handleCommentCountChange(postId, newCount) {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments_count: newCount } : p));
  }

  async function handleDeletePost(postId) {
    const prev = posts;
    setPosts((p) => p.filter((post) => post.id !== postId));
    try {
      await api.deletePost(postId);
      showToast('Publicación eliminada');
    } catch (err) {
      showToast(err.message);
      setPosts(prev);
    }
  }

  async function handleToggleComments(postId) {
    try {
      const result = await api.toggleComments(postId);
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments_disabled: result.comments_disabled } : p));
      showToast(result.comments_disabled ? 'Comentarios desactivados' : 'Comentarios activados');
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleShare() {
    if (shareModalPostId === null) return;
    setSharing(true);
    try {
      await api.sharePost(shareModalPostId, shareCaption);
      showToast('¡Publicación compartida!');
      setShareModalPostId(null);
      setShareCaption('');
      await load();
    } catch (err) {
      showToast(err.message);
    } finally {
      setSharing(false);
    }
  }

  const q = searchQuery.trim().toLowerCase();
  const visiblePosts = q
    ? posts.filter((p) =>
        p.caption.toLowerCase().includes(q) ||
        p.pet_name.toLowerCase().includes(q) ||
        p.breed.toLowerCase().includes(q))
    : posts;

  return (
    <>
      <button
        type="button"
        className={`compose compose-trigger ${composeHidden ? 'hidden' : ''}`}
        onClick={() => setComposerOpen(true)}
      >
        <PetAvatar photoUrl={me?.pet?.photo_url} species={me?.pet?.species} color={me?.pet?.color} size={36} />
        <span className="compose-trigger-text">¿Qué está haciendo tu mascota hoy?</span>
        <span className="compose-trigger-camera"><IconCamera size={18} /></span>
      </button>

      <section className="feed-posts">
        {loading && <div className="section-title">Cargando feed…</div>}
        {!loading && q && visiblePosts.length === 0 && (
          <div className="section-title">Sin resultados para "{searchQuery}"</div>
        )}

        {visiblePosts.map((post) => (
          <div className="post" key={post.id}>
            <div className="post-head">
              <button className="post-head-link" onClick={() => onViewPet?.(post.pet_id)}>
                <PetAvatar photoUrl={post.pet_photo_url} species={post.species} color={post.color} size={40} />
                <div>
                  <div className="post-name">{post.pet_name}</div>
                  <div className="post-meta">{post.breed} · {timeAgo(post.created_at)}</div>
                </div>
              </button>
              {post.is_mine ? (
                <PostMenu
                  commentsDisabled={post.comments_disabled}
                  onDelete={() => handleDeletePost(post.id)}
                  onToggleComments={() => handleToggleComments(post.id)}
                />
              ) : (
                <div className="post-menu">
                  <button
                    type="button"
                    className="post-menu-btn"
                    aria-label="Más opciones"
                    onClick={() => setOpenMenuPostId((v) => (v === post.id ? null : post.id))}
                  >
                    ⋮
                  </button>
                  {openMenuPostId === post.id && (
                    <div className="post-menu-dropdown">
                      <button type="button" onClick={() => { setOpenMenuPostId(null); setReportPostId(post.id); }}>
                        <IconFlag size={15} /> Reportar publicación
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {!post.shared_post_id && (
              <div className="post-media" style={{ background: post.color }}>
                {post.image_url
                  ? <img className="post-photo" src={post.image_url} alt={post.caption} />
                  : post.pet_photo_url
                    ? <img className="post-photo" src={post.pet_photo_url} alt={post.caption} />
                    : <PetIllustration species={post.species} size={96} />}
              </div>
            )}
            {post.caption && <div className="post-body">{post.caption}</div>}
            {post.shared_post_id && (
              <div className="shared-embed">
                {post.shared_pet_name ? (
                  <>
                    <div className="shared-embed-head">
                      <div className="avatar" style={{ width: 28, height: 28, background: post.shared_color }}>
                        <PetIllustration species={post.shared_species} size={18} />
                      </div>
                      <span className="shared-embed-name">{post.shared_pet_name}</span>
                    </div>
                    {post.shared_image_url && <img className="shared-embed-photo" src={post.shared_image_url} alt="" />}
                    {post.shared_caption && <div className="shared-embed-caption">{post.shared_caption}</div>}
                  </>
                ) : (
                  <div className="shared-embed-caption">Esta publicación ya no está disponible.</div>
                )}
              </div>
            )}
            <div className="post-actions">
              <button className={`action ${post.liked_by_me ? 'liked' : ''}`} onClick={() => handleLike(post.id)}>
                <IconHeart filled={post.liked_by_me} size={22} /> <span>{post.likes_count}</span>
              </button>
              <CommentSection
                postId={post.id}
                commentsCount={post.comments_count || 0}
                disabled={post.comments_disabled}
                isPostOwner={post.is_mine}
                showToast={showToast}
                onCountChange={handleCommentCountChange}
              />
              <button className="action" onClick={() => { setShareModalPostId(post.id); setShareCaption(''); }}>
                <IconShare size={22} /> <span>Compartir</span>
              </button>
            </div>
          </div>
        ))}

        {shareModalPostId !== null && createPortal(
          <div className="modal-backdrop" onClick={() => !sharing && setShareModalPostId(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-title">Compartir publicación</div>
              <input
                type="text"
                className="modal-text-input"
                placeholder="Agrega un comentario (opcional)"
                maxLength={140}
                value={shareCaption}
                onChange={(e) => setShareCaption(e.target.value)}
                autoFocus
              />
              <div className="modal-actions">
                <button className="modal-btn-secondary" onClick={() => setShareModalPostId(null)} disabled={sharing}>Cancelar</button>
                <button className="modal-btn-primary" onClick={handleShare} disabled={sharing}>
                  {sharing ? 'Compartiendo…' : 'Compartir'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {reportPostId !== null && (
          <ReportModal
            targetType="post"
            targetId={reportPostId}
            onClose={() => setReportPostId(null)}
            showToast={showToast}
          />
        )}
      </section>

      {composerOpen && (
        <NewPostComposer
          me={me}
          onClose={() => setComposerOpen(false)}
          onPosted={handlePosted}
          showToast={showToast}
        />
      )}
    </>
  );
}
