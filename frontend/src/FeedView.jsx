import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import PetIllustration from './PetIllustration';
import PetAvatar from './PetAvatar';
import CommentSection from './CommentSection';
import PostMenu from './PostMenu';

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

export default function FeedView({ showToast, searchQuery = '', onViewPet }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const [shareModalPostId, setShareModalPostId] = useState(null);
  const [shareCaption, setShareCaption] = useState('');
  const [sharing, setSharing] = useState(false);
  const fileInputRef = useRef(null);

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

  useEffect(() => { load(); }, []);

  function handlePickPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Ese archivo no es una imagen');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handlePost() {
    if (!caption.trim()) return;
    setPosting(true);
    try {
      await api.createPost({ caption, photoFile });
      setCaption('');
      clearPhoto();
      showToast('¡Publicado en el feed!');
      await load();
    } catch (err) {
      showToast(err.message);
    } finally {
      setPosting(false);
    }
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
    <section>
      <div className="compose">
        <div className="compose-row compose-row-text">
          <input
            type="text"
            placeholder="¿Qué está haciendo tu mascota hoy?"
            maxLength={140}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handlePost(); }}
          />
        </div>
        <div className="compose-row compose-row-actions">
          <button
            type="button"
            className="photo-btn"
            title="Agregar foto"
            onClick={() => fileInputRef.current?.click()}
          >
            📷
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePickPhoto}
          />
          <button disabled={!caption.trim() || posting} onClick={handlePost}>
            {posting ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
        {photoPreview && (
          <div className="photo-preview">
            <img src={photoPreview} alt="Foto a publicar" />
            <button type="button" onClick={clearPhoto}>Quitar foto</button>
          </div>
        )}
      </div>

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
            {post.is_mine && (
              <PostMenu
                commentsDisabled={post.comments_disabled}
                onDelete={() => handleDeletePost(post.id)}
                onToggleComments={() => handleToggleComments(post.id)}
              />
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
              {post.liked_by_me ? '❤️' : '🤍'} <span>{post.likes_count}</span>
            </button>
            <CommentSection
              postId={post.id}
              commentsCount={post.comments_count || 0}
              disabled={post.comments_disabled}
              showToast={showToast}
              onCountChange={handleCommentCountChange}
            />
            <button className="action" onClick={() => { setShareModalPostId(post.id); setShareCaption(''); }}>
              🔁 <span>Compartir</span>
            </button>
          </div>
        </div>
      ))}

      {shareModalPostId !== null && (
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
        </div>
      )}
    </section>
  );
}
