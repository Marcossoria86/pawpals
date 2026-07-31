import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import PetAvatar from './PetAvatar';

// Fila de historias arriba del feed, estilo Facebook/Instagram: círculos con
// las mascotas que publicaron algo en las últimas 24hs, la propia primero,
// más un botón para agregar una historia nueva (foto o video corto).
export default function StoriesRow({ showToast }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null); // { groupIndex, storyIndex }
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);

  async function load() {
    try {
      const data = await api.stories();
      setGroups(data);
    } catch (err) {
      // Las historias son un extra visual: si fallan, no bloqueamos el feed.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handlePickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      showToast('Ese archivo no es una foto ni un video');
      return;
    }
    setUploading(true);
    api.createStory(file)
      .then(() => { showToast('¡Historia publicada!'); return load(); })
      .catch((err) => showToast(err.message))
      .finally(() => {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
  }

  function openViewer(groupIndex) {
    setViewer({ groupIndex, storyIndex: 0 });
  }

  function closeViewer() {
    setViewer(null);
  }

  function nextStory() {
    setViewer((v) => {
      if (!v) return v;
      const group = groups[v.groupIndex];
      if (!group) return null;
      if (v.storyIndex < group.stories.length - 1) return { ...v, storyIndex: v.storyIndex + 1 };
      if (v.groupIndex < groups.length - 1) return { groupIndex: v.groupIndex + 1, storyIndex: 0 };
      return null;
    });
  }

  function prevStory() {
    setViewer((v) => {
      if (!v) return v;
      if (v.storyIndex > 0) return { ...v, storyIndex: v.storyIndex - 1 };
      if (v.groupIndex > 0) {
        const prevGroup = groups[v.groupIndex - 1];
        return { groupIndex: v.groupIndex - 1, storyIndex: prevGroup.stories.length - 1 };
      }
      return v;
    });
  }

  // Auto-avance para historias de foto (los videos avanzan solos con onEnded).
  useEffect(() => {
    if (!viewer) return;
    const group = groups[viewer.groupIndex];
    const story = group?.stories[viewer.storyIndex];
    if (!story || story.media_type === 'video') return;
    timerRef.current = setTimeout(nextStory, 4500);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, groups]);

  if (loading) return null;

  const myGroupIndex = groups.findIndex((g) => g.is_mine);
  const others = groups.filter((g) => !g.is_mine);

  return (
    <div className="stories-row">
      <div className="story-circle add-story" onClick={() => fileInputRef.current?.click()}>
        <div className="story-avatar-wrap add">
          {myGroupIndex >= 0
            ? (
              <span onClick={(e) => { e.stopPropagation(); openViewer(myGroupIndex); }}>
                <PetAvatar photoUrl={groups[myGroupIndex].photo_url} species={groups[myGroupIndex].species} color={groups[myGroupIndex].color} size={56} />
              </span>
            )
            : <div className="story-avatar-empty">🐾</div>}
          <span className="story-add-badge">{uploading ? '…' : '+'}</span>
        </div>
        <span className="story-label">Tu historia</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={handlePickFile}
        />
      </div>

      {others.map((g) => {
        const idx = groups.indexOf(g);
        return (
          <div className="story-circle" key={g.pet_id} onClick={() => openViewer(idx)}>
            <div className="story-avatar-wrap">
              <PetAvatar photoUrl={g.photo_url} species={g.species} color={g.color} size={56} />
            </div>
            <span className="story-label">{g.pet_name}</span>
          </div>
        );
      })}

      {viewer && groups[viewer.groupIndex] && (
        <div className="story-viewer" onClick={closeViewer}>
          <div className="story-viewer-inner" onClick={(e) => e.stopPropagation()}>
            <div className="story-progress-row">
              {groups[viewer.groupIndex].stories.map((s, i) => (
                <div key={s.id} className="story-progress-bar">
                  <div className={`story-progress-fill ${i < viewer.storyIndex ? 'full' : i === viewer.storyIndex ? 'active' : ''}`} />
                </div>
              ))}
            </div>
            <div className="story-viewer-head">
              <PetAvatar photoUrl={groups[viewer.groupIndex].photo_url} species={groups[viewer.groupIndex].species} color={groups[viewer.groupIndex].color} size={32} />
              <span>{groups[viewer.groupIndex].pet_name}</span>
              <button className="story-close" onClick={closeViewer}>✕</button>
            </div>
            <div className="story-media">
              {groups[viewer.groupIndex].stories[viewer.storyIndex].media_type === 'video'
                ? <video src={groups[viewer.groupIndex].stories[viewer.storyIndex].media_url} autoPlay playsInline onEnded={nextStory} />
                : <img src={groups[viewer.groupIndex].stories[viewer.storyIndex].media_url} alt="" />}
            </div>
            <div className="story-tap-zone left" onClick={prevStory} />
            <div className="story-tap-zone right" onClick={nextStory} />
          </div>
        </div>
      )}
    </div>
  );
}
