import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import PetAvatar from './PetAvatar';
import CommentSection from './CommentSection';
import { IconHeart, IconComment, IconVolume, IconPlayPause, IconUpload } from './Icons';

function ReelItem({ reel, showToast, onViewPet, onLike, onCommentCountChange }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Ponemos "muted" a mano sobre el elemento de video (no sólo como prop de
  // React) porque algunos navegadores sólo respetan la propiedad real del
  // DOM para permitir el autoplay — si sólo se manda como atributo JSX a
  // veces el video queda "trabado" mostrando el primer cuadro como si fuera
  // una foto y nunca arranca a reproducirse.
  useEffect(() => {
    const el = videoRef.current;
    if (el) el.muted = muted;
  }, [muted]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return undefined;
    el.muted = muted;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: [0, 0.6, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }

  return (
    <div className="reel-item">
      <video
        ref={videoRef}
        className="reel-video"
        src={reel.video_url}
        loop
        muted={muted}
        playsInline
        preload="auto"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {!playing && (
        <div className="reel-pause-overlay" onClick={togglePlay}>
          <IconPlayPause playing={false} size={56} />
        </div>
      )}
      <div className="reel-overlay">
        <button className="reel-pet-link" onClick={() => onViewPet?.(reel.pet_id)}>
          <PetAvatar photoUrl={reel.pet_photo_url} species={reel.species} color={reel.color} size={36} />
          <span>{reel.pet_name}</span>
        </button>
        {reel.caption && <div className="reel-caption">{reel.caption}</div>}
      </div>
      <div className="reel-side-actions">
        <button className={`reel-action ${reel.liked_by_me ? 'liked' : ''}`} onClick={() => onLike(reel.id)}>
          <IconHeart filled={reel.liked_by_me} size={24} />
          <b>{reel.likes_count}</b>
        </button>
        <button className="reel-action" onClick={() => setShowComments((v) => !v)}>
          <IconComment size={24} />
          <b>{reel.comments_count || 0}</b>
        </button>
        <button className="reel-action" onClick={() => setMuted((m) => !m)}>
          <IconVolume muted={muted} size={24} />
        </button>
      </div>
      {showComments && (
        <div className="reel-comments">
          <CommentSection
            postId={reel.id}
            commentsCount={reel.comments_count || 0}
            disabled={false}
            showToast={showToast}
            onCountChange={onCommentCountChange}
          />
        </div>
      )}
    </div>
  );
}

export default function ReelsView({ showToast, onViewPet }) {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.reels();
      setReels(data);
    } catch (err) {
      showToast('No se pudieron cargar los reels');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handlePickVideo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      showToast('Ese archivo no es un video');
      return;
    }
    setVideoFile(file);
  }

  async function handleUpload() {
    if (!videoFile) return;
    setPosting(true);
    try {
      await api.createReel({ caption, videoFile });
      showToast('¡Reel publicado!');
      setCaption('');
      setVideoFile(null);
      setComposerOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } catch (err) {
      showToast(err.message);
    } finally {
      setPosting(false);
    }
  }

  async function handleLike(reelId) {
    setReels((prev) => prev.map((r) => r.id === reelId
      ? { ...r, liked_by_me: !r.liked_by_me, likes_count: r.likes_count + (r.liked_by_me ? -1 : 1) }
      : r));
    try {
      await api.toggleLike(reelId);
    } catch (err) {
      showToast('No se pudo registrar el like');
      load();
    }
  }

  function handleCommentCountChange(reelId, newCount) {
    setReels((prev) => prev.map((r) => r.id === reelId ? { ...r, comments_count: newCount } : r));
  }

  return (
    <div className="reels-wrap">
      <button className="reels-upload-fab" onClick={() => setComposerOpen(true)}>
        <IconUpload size={15} /> <span>Subir</span>
      </button>

      {loading && <div className="reels-loading-label">Cargando reels…</div>}
      {!loading && reels.length === 0 && (
        <div className="reels-loading-label">Todavía no hay reels. ¡Sé el primero en subir uno!</div>
      )}

      <div className="reels-scroll">
        {reels.map((reel) => (
          <ReelItem
            key={reel.id}
            reel={reel}
            showToast={showToast}
            onViewPet={onViewPet}
            onLike={handleLike}
            onCommentCountChange={handleCommentCountChange}
          />
        ))}
      </div>

      {composerOpen && (
        <div className="modal-backdrop" onClick={() => !posting && setComposerOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Subir un reel</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handlePickVideo}
              className="modal-file-input"
            />
            <input
              type="text"
              className="modal-text-input"
              placeholder="Escribe un texto (opcional)"
              maxLength={140}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={() => setComposerOpen(false)} disabled={posting}>Cancelar</button>
              <button className="modal-btn-primary" onClick={handleUpload} disabled={!videoFile || posting}>
                {posting ? 'Subiendo…' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
