import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';
import PetIllustration, { AVATAR_ACCESSORIES, AVATAR_BACKGROUNDS } from './PetIllustration';
import { IconClose, IconCheck } from './Icons';

// "Avatares" del menú — pensado en la MISMA IDEA que los avatares
// personalizables de Duolingo (elegís fondo + accesorio para tu mascota),
// pero con dibujos 100% propios, no copiados de ahí. Sólo se usa cuando la
// mascota no tiene foto de perfil real subida (ver PetAvatar): si hay foto,
// esa foto sigue siendo lo que se muestra.
export default function AvatarPicker({ pet, onClose, onSaved, showToast }) {
  const [bg, setBg] = useState(pet.avatar_bg || AVATAR_BACKGROUNDS[0]);
  const [accessory, setAccessory] = useState(pet.avatar_accessory || 'none');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await api.updatePetAvatar({ bg, accessory });
      showToast('¡Avatar actualizado!');
      onSaved(result);
    } catch (err) {
      showToast(err.message);
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card avatar-picker-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title-row">
          <div className="modal-title">Avatar de {pet.name}</div>
          <button type="button" className="modal-close-x" onClick={onClose} aria-label="Cerrar">
            <IconClose size={20} />
          </button>
        </div>

        {pet.photo_url && (
          <p className="settings-help-text">
            Tenés una foto de perfil subida, así que se sigue mostrando esa — este avatar aparece si en algún momento la sacás.
          </p>
        )}

        <div className="avatar-picker-preview" style={{ background: bg }}>
          <PetIllustration species={pet.species} size={92} accessory={accessory} />
        </div>

        <div className="settings-section-title">Fondo</div>
        <div className="avatar-picker-bg-row">
          {AVATAR_BACKGROUNDS.map((c) => (
            <button
              type="button"
              key={c}
              className={`avatar-picker-swatch ${bg === c ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => setBg(c)}
              aria-label={`Fondo ${c}`}
            >
              {bg === c && <IconCheck size={14} />}
            </button>
          ))}
        </div>

        <div className="settings-section-title">Accesorio</div>
        <div className="avatar-picker-accessory-row">
          {AVATAR_ACCESSORIES.map((a) => (
            <button
              type="button"
              key={a.key}
              className={`avatar-picker-accessory ${accessory === a.key ? 'selected' : ''}`}
              onClick={() => setAccessory(a.key)}
            >
              <div className="avatar-picker-accessory-preview" style={{ background: bg }}>
                <PetIllustration species={pet.species} size={44} accessory={a.key} />
              </div>
              <span>{a.label}</span>
            </button>
          ))}
        </div>

        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="modal-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar avatar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
