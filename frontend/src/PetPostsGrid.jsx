import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';
import TaggedPetsChips from './TaggedPetsChips';
import { IconClose, IconHeart, IconComment } from './Icons';

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

// Grilla de "todo lo que se estuvo compartiendo" en un perfil — antes las
// publicaciones sólo se contaban en las estadísticas ("N publicaciones")
// sin ninguna forma de verlas ahí mismo. Se usa tanto en Mi perfil como en
// el perfil de otras mascotas (mismo componente, sólo cambia el petId).
export default function PetPostsGrid({ petId, onViewPet, showToast }) {
  const [posts, setPosts] = useState(null);
  const [openPost, setOpenPost] = useState(null);

  useEffect(() => {
    setPosts(null);
    api.petPosts(petId).then(setPosts).catch(() => {
      setPosts([]);
      showToast?.('No se pudieron cargar las publicaciones');
    });
  }, [petId]);

  if (posts === null) {
    return <div className="section-title">Cargando publicaciones…</div>;
  }

  if (posts.length === 0) {
    return <div className="section-title">Todavía no compartió ninguna publicación.</div>;
  }

  return (
    <>
      <div className="pet-posts-grid">
        {posts.map((p) => {
          const thumb = p.image_url || p.shared_image_url || null;
          return (
            <button type="button" key={p.id} className="pet-posts-grid-item" onClick={() => setOpenPost(p)}>
              {thumb ? (
                <img src={thumb} alt={p.caption || 'Publicación'} />
              ) : (
                <div className="pet-posts-grid-textonly" style={{ background: p.color }}>
                  {p.caption}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {openPost && createPortal(
        <div className="modal-backdrop" onClick={() => setOpenPost(null)}>
          <div className="modal-card pet-post-lightbox" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title-row">
              <div className="modal-title">{timeAgo(openPost.created_at)}</div>
              <button type="button" className="modal-close-x" onClick={() => setOpenPost(null)} aria-label="Cerrar">
                <IconClose size={20} />
              </button>
            </div>
            {(openPost.image_url || openPost.shared_image_url) && (
              <img
                className="pet-post-lightbox-photo"
                src={openPost.image_url || openPost.shared_image_url}
                alt={openPost.caption || 'Publicación'}
              />
            )}
            {openPost.caption && <div className="pet-post-lightbox-caption">{openPost.caption}</div>}
            <TaggedPetsChips pets={openPost.tagged_pets} onViewPet={(id) => { setOpenPost(null); onViewPet?.(id); }} />
            <div className="pet-post-lightbox-stats">
              <span><IconHeart size={16} filled={openPost.liked_by_me} /> {openPost.likes_count}</span>
              <span><IconComment size={16} /> {openPost.comments_count}</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
