import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';
import PetAvatar from './PetAvatar';
import { IconClose, IconSearch, IconCheck } from './Icons';

// Selector de mascotas para etiquetar, reusado en publicaciones (ver
// NewPostComposer), comentarios (ver CommentSection) e historias (ver
// MediaEditor) — un solo componente para los tres lugares, igual que
// NewPostComposer se reusa desde dos entradas distintas del header.
//
// initialSelected: mascotas ya elegidas (al reabrir el picker sin perder lo
// que se había marcado). onConfirm(selected) se llama al tocar "Listo" con
// la lista final [{ pet_id, pet_name, species, color, photo_url }, ...].
export default function PetTagPicker({ initialSelected = [], onClose, onConfirm, showToast }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(initialSelected);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return undefined;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      api.searchPets(q)
        .then(setResults)
        .catch(() => showToast('No se pudo buscar mascotas'))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  function toggle(pet) {
    setSelected((prev) => {
      const exists = prev.some((p) => p.pet_id === pet.pet_id);
      if (exists) return prev.filter((p) => p.pet_id !== pet.pet_id);
      if (prev.length >= 10) {
        showToast('Podés etiquetar hasta 10 mascotas');
        return prev;
      }
      return [...prev, pet];
    });
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card follow-list-card tag-picker-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title-row">
          <div className="modal-title">Etiquetar mascotas</div>
          <button type="button" className="modal-close-x" onClick={onClose} aria-label="Cerrar"><IconClose size={18} /></button>
        </div>

        {selected.length > 0 && (
          <div className="tag-picker-selected">
            {selected.map((p) => (
              <button type="button" key={p.pet_id} className="tag-chip" onClick={() => toggle(p)}>
                <PetAvatar photoUrl={p.photo_url} species={p.species} color={p.color} size={20} />
                <span>{p.pet_name}</span>
                <IconClose size={12} />
              </button>
            ))}
          </div>
        )}

        <div className="tag-picker-search">
          <IconSearch size={16} />
          <input
            type="text"
            placeholder="Buscar mascota por nombre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="follow-list tag-picker-results">
          {searching && <div className="thread-empty">Buscando…</div>}
          {!searching && query.trim() && results.length === 0 && (
            <div className="thread-empty">Sin resultados para "{query}"</div>
          )}
          {results.map((p) => {
            const isSelected = selected.some((s) => s.pet_id === p.pet_id);
            return (
              <button
                type="button"
                className={`follow-list-row tag-picker-row ${isSelected ? 'selected' : ''}`}
                key={p.pet_id}
                onClick={() => toggle(p)}
              >
                <PetAvatar photoUrl={p.photo_url} species={p.species} color={p.color} size={40} />
                <div className="follow-list-body">
                  <div className="follow-list-name">{p.pet_name}</div>
                  <div className="follow-list-breed">{p.breed}</div>
                </div>
                {isSelected && <IconCheck size={18} />}
              </button>
            );
          })}
        </div>

        <div className="modal-actions">
          <button type="button" className="modal-btn-primary" onClick={() => onConfirm(selected)}>
            Listo{selected.length ? ` (${selected.length})` : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
