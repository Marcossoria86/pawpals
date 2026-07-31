import { useState } from 'react';
import { api } from './api';
import { IconPawPair } from './Icons';

// Pantalla a la que llega la persona al tocar el enlace del mail de
// "recuperar contraseña" (ver AuthView.jsx → "¿Olvidaste tu contraseña?" y
// el backend /api/auth/request-reset). El enlace trae ?resetToken=... en la
// URL — App.jsx detecta ese parámetro y muestra esta pantalla en vez de la
// app normal, sin importar si hay una sesión iniciada o no.
export default function ResetPasswordView({ token, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('La contraseña tiene que tener al menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-title"><IconPawPair size={22} /> PawPals</div>
        <div className="auth-sub">Elegí tu nueva contraseña</div>

        {error && <div className="error-box">{error}</div>}

        {done ? (
          <>
            <p className="settings-help-text">¡Listo! Ya podés iniciar sesión con tu nueva contraseña.</p>
            <button className="primary-btn" onClick={onDone}>Ir a iniciar sesión</button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Nueva contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Repetí la contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <button className="primary-btn" disabled={loading}>
              {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
