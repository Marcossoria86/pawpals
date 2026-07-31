import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';
import PetIllustration, { SPECIES_LIST } from './PetIllustration';
import { IconClose } from './Icons';

// Modal para editar los datos de la mascota (nombre, especie, raza, edad,
// biografía) desde Mi perfil — la foto se sigue editando aparte, con el
// mismo botón de cámara/galería que ya había en el avatar.
export default function EditProfileModal({ pet, onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    name: pet.name || '',
    species: pet.species || 'dog',
    breed: pet.breed || '',
    age: pet.age ?? '',
    bio: pet.bio || ''
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.breed.trim()) return;
    setSaving(true);
    try {
      await api.updatePetProfile({ ...form, age: form.age ? Number(form.age) : null });
      showToast('¡Perfil actualizado!');
      onSaved({ ...form, age: form.age ? Number(form.age) : null });
    } catch (err) {
      showToast(err.message);
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title-row">
          <div className="modal-title">Editar perfil</div>
          <button type="button" className="modal-close-x" onClick={onClose} aria-label="Cerrar">
            <IconClose size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Nombre de tu mascota</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Especie</label>
            <div className="species-picker">
              {SPECIES_LIST.map((s) => (
                <button
                  type="button"
                  key={s.key}
                  className={`species-option ${form.species === s.key ? 'selected' : ''}`}
                  onClick={() => setForm({ ...form, species: s.key })}
                >
                  <PetIllustration species={s.key} size={40} />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Edad</label>
            <input type="number" min="0" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
          </div>
          <div className="field">
            <label>Raza</label>
            <input required value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
          </div>
          <div className="field">
            <label>Sobre {form.name || 'tu mascota'}</label>
            <input value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="modal-btn-primary" disabled={saving || !form.name.trim() || !form.breed.trim()}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
