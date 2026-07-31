import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';
import LegalModal from './LegalModal';
import PetAvatar from './PetAvatar';
import { IconClose, IconLocation } from './Icons';
import { SUPPORT_EMAIL } from './config';

// Pide la ubicación real del dispositivo para el botón "Actualizar mi
// ubicación ahora" — si la persona nunca dio permiso (o lo había negado),
// esto es lo que dispara de nuevo el cartel nativo de permiso.
function requestLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Tu navegador no soporta ubicación'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('No pudimos acceder a tu ubicación — revisá los permisos de la app')),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
    );
  });
}

// Modal de Configuración accesible desde el ícono de engranaje en Mi perfil.
// Reúne lo que antes no tenía un lugar propio: privacidad de ubicación,
// acceso rápido a los documentos legales, contacto de ayuda, y la opción de
// borrar la cuenta (obligatoria para publicar en la App Store si la app
// permite crear cuentas).
export default function SettingsModal({ me, onClose, onLogout, showToast }) {
  const [shareLocation, setShareLocation] = useState(!!me?.pet?.share_location);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [legalOpen, setLegalOpen] = useState(null); // null | 'terms' | 'privacy'
  const [deleteStep, setDeleteStep] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [currentPwForPw, setCurrentPwForPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [currentPwForEmail, setCurrentPwForEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [blockedPets, setBlockedPets] = useState(null);

  useEffect(() => {
    api.blockedPets().then(setBlockedPets).catch(() => setBlockedPets([]));
  }, []);

  async function handleChangePassword() {
    if (!currentPwForPw || newPw.length < 6) return;
    setSavingPw(true);
    try {
      await api.changePassword(currentPwForPw, newPw);
      setCurrentPwForPw('');
      setNewPw('');
      showToast('¡Contraseña actualizada!');
    } catch (err) {
      showToast(err.message);
    } finally {
      setSavingPw(false);
    }
  }

  async function handleChangeEmail() {
    if (!newEmail.trim() || !currentPwForEmail) return;
    setSavingEmail(true);
    try {
      await api.changeEmail(newEmail.trim(), currentPwForEmail);
      setCurrentPwForEmail('');
      setNewEmail('');
      showToast('¡Correo actualizado!');
    } catch (err) {
      showToast(err.message);
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleUnblock(petId) {
    try {
      await api.toggleBlock(petId);
      setBlockedPets((prev) => prev.filter((p) => p.id !== petId));
      showToast('Desbloqueado');
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleToggleShareLocation(e) {
    const next = e.target.checked;
    setShareLocation(next);
    try {
      await api.updateLocationPrivacy(next);
      showToast(next ? 'Tu ubicación vuelve a ser visible en "Cerca de ti"' : 'Ya no aparecés en "Cerca de ti" para otras personas');
    } catch (err) {
      setShareLocation(!next);
      showToast(err.message);
    }
  }

  async function handleUpdateLocation() {
    setUpdatingLocation(true);
    try {
      const { lat, lng } = await requestLocation();
      await api.updateMyLocation({ lat, lng });
      showToast('¡Ubicación actualizada!');
    } catch (err) {
      showToast(err.message);
    } finally {
      setUpdatingLocation(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deletePassword) return;
    setDeleting(true);
    try {
      await api.deleteAccount(deletePassword);
      await api.logout().catch(() => {});
      onLogout();
    } catch (err) {
      showToast(err.message);
      setDeleting(false);
    }
  }

  return (
    <>
      {createPortal(
        <div className="modal-backdrop" onClick={onClose}>
          <div className="modal-card settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title-row">
              <div className="modal-title">Configuración</div>
              <button type="button" className="modal-close-x" onClick={onClose} aria-label="Cerrar">
                <IconClose size={20} />
              </button>
            </div>

            <div className="settings-body">
              <div className="settings-section-title">Privacidad</div>
              <label className="editor-mute-row">
                <input type="checkbox" checked={shareLocation} onChange={handleToggleShareLocation} />
                <span>Compartir mi ubicación en &quot;Cerca de ti&quot;</span>
              </label>
              <button type="button" className="settings-secondary-btn" onClick={handleUpdateLocation} disabled={updatingLocation}>
                <IconLocation size={15} /> {updatingLocation ? 'Actualizando…' : 'Actualizar mi ubicación ahora'}
              </button>

              {blockedPets && blockedPets.length > 0 && (
                <>
                  <div className="settings-section-title">Cuentas bloqueadas</div>
                  {blockedPets.map((p) => (
                    <div className="settings-blocked-row" key={p.id}>
                      <PetAvatar photoUrl={p.photo_url} species={p.species} color={p.color} size={30} />
                      <span className="settings-blocked-name">{p.name}</span>
                      <button type="button" className="settings-unblock-btn" onClick={() => handleUnblock(p.id)}>
                        Desbloquear
                      </button>
                    </div>
                  ))}
                </>
              )}

              <div className="settings-section-title">Seguridad</div>
              <div className="settings-form-row">
                <label>Cambiar contraseña</label>
                <input
                  type="password"
                  placeholder="Contraseña actual"
                  value={currentPwForPw}
                  onChange={(e) => setCurrentPwForPw(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Nueva contraseña (mínimo 6 caracteres)"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="settings-primary-btn"
                onClick={handleChangePassword}
                disabled={!currentPwForPw || newPw.length < 6 || savingPw}
              >
                {savingPw ? 'Guardando…' : 'Actualizar contraseña'}
              </button>

              <div className="settings-form-row">
                <label>Cambiar correo (actual: {me?.user?.email})</label>
                <input
                  type="email"
                  placeholder="Nuevo correo"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Tu contraseña actual"
                  value={currentPwForEmail}
                  onChange={(e) => setCurrentPwForEmail(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="settings-primary-btn"
                onClick={handleChangeEmail}
                disabled={!newEmail.trim() || !currentPwForEmail || savingEmail}
              >
                {savingEmail ? 'Guardando…' : 'Actualizar correo'}
              </button>

              <div className="settings-section-title">Legal</div>
              <button type="button" className="settings-secondary-btn" onClick={() => setLegalOpen('terms')}>
                Ver Términos y Condiciones
              </button>
              <button type="button" className="settings-secondary-btn" onClick={() => setLegalOpen('privacy')}>
                Ver Política de Privacidad
              </button>

              <div className="settings-section-title">Ayuda</div>
              <p className="settings-help-text">
                ¿Tenés un problema, querés reportar contenido, o pedir acceso o borrado de tus datos? Escribinos a{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
              </p>

              <div className="settings-section-title danger">Cuenta</div>
              {!deleteStep ? (
                <button type="button" className="settings-danger-btn" onClick={() => setDeleteStep(true)}>
                  Eliminar mi cuenta
                </button>
              ) : (
                <div className="settings-delete-confirm">
                  <p className="settings-help-text">
                    Esto borra tu cuenta, tu mascota, tus publicaciones, historias, reels y mensajes para siempre — no se puede deshacer. Ingresá tu contraseña para confirmar.
                  </p>
                  <input
                    type="password"
                    className="modal-text-input"
                    placeholder="Tu contraseña"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                  />
                  <div className="modal-actions">
                    <button className="modal-btn-secondary" onClick={() => { setDeleteStep(false); setDeletePassword(''); }}>
                      Cancelar
                    </button>
                    <button className="settings-danger-btn" onClick={handleDeleteAccount} disabled={!deletePassword || deleting}>
                      {deleting ? 'Eliminando…' : 'Eliminar definitivamente'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
      {legalOpen && <LegalModal kind={legalOpen} onClose={() => setLegalOpen(null)} />}
    </>
  );
}
