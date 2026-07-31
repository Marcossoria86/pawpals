import { useState } from 'react';
import { api } from './api';
import PetIllustration, { SPECIES_LIST } from './PetIllustration';
import LegalModal from './LegalModal';
import { IconPawPair } from './Icons';

// Pide la ubicación real del dispositivo — es lo que dispara el permiso
// nativo de ubicación la primera vez. Nunca rechaza la promesa: si la
// persona lo niega, el navegador tarda, o el dispositivo no lo soporta,
// simplemente seguimos el registro sin ubicación (el backend cae a una
// ubicación por defecto, y se puede activar más tarde desde Configuración).
function getBrowserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({});
    const timeout = setTimeout(() => resolve({}), 7000);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(timeout); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => { clearTimeout(timeout); resolve({}); },
      { enableHighAccuracy: false, timeout: 6500, maximumAge: 60000 }
    );
  });
}

export default function AuthView({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [legalOpen, setLegalOpen] = useState(null); // null | 'terms' | 'privacy'
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '', email: '', password: '',
    petName: '', petSpecies: 'dog', petBreed: '', petAge: '', petBio: ''
  });

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.login(loginForm);
      onAuthenticated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!acceptTerms) {
      setError('Tenés que aceptar los Términos y Condiciones y la Política de Privacidad');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Acá es donde el navegador (o iOS/Android en la app empaquetada)
      // muestra por primera vez el cartel de "¿Permitir que PawPals use tu
      // ubicación?". Si la persona lo rechaza o tarda, seguimos igual: el
      // backend usa una ubicación por defecto y se puede activar/actualizar
      // después desde Configuración.
      const location = await getBrowserLocation();
      await api.register({
        ...registerForm,
        petAge: registerForm.petAge ? Number(registerForm.petAge) : null,
        acceptTerms: true,
        ...location
      });
      onAuthenticated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.requestPasswordReset(forgotEmail.trim());
      setForgotSent(true);
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
        <div className="auth-sub">
          {mode === 'login' && 'Entra a tu cuenta'}
          {mode === 'register' && 'Crea tu cuenta y el perfil de tu mascota'}
          {mode === 'forgot' && 'Recuperá tu contraseña'}
        </div>

        {error && <div className="error-box">{error}</div>}
        {mode === 'login' && (
          <div className="hint-box">Demo: camila@example.com / pawpals123</div>
        )}

        {mode === 'forgot' ? (
          forgotSent ? (
            <>
              <p className="settings-help-text">
                Si ese correo está registrado, te mandamos un enlace para elegir una nueva contraseña. Revisá tu bandeja de entrada (y spam).
              </p>
              <button className="primary-btn" type="button" onClick={() => { setMode('login'); setForgotSent(false); setForgotEmail(''); }}>
                Volver a iniciar sesión
              </button>
            </>
          ) : (
            <form onSubmit={handleForgotSubmit}>
              <div className="field">
                <label>Correo de tu cuenta</label>
                <input type="email" required value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)} />
              </div>
              <button className="primary-btn" disabled={loading}>
                {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
              </button>
            </form>
          )
        ) : mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Correo</label>
              <input type="email" required value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input type="password" required value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
            </div>
            <button className="primary-btn" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
            <button type="button" className="terms-link forgot-pw-link" onClick={() => { setMode('forgot'); setError(''); }}>
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="field">
              <label>Tu nombre</label>
              <input required value={registerForm.name}
                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Correo</label>
              <input type="email" required value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input type="password" required minLength={6} value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} />
            </div>
            <div className="field">
              <label>Nombre de tu mascota</label>
              <input required value={registerForm.petName}
                onChange={(e) => setRegisterForm({ ...registerForm, petName: e.target.value })} />
            </div>
            <div className="field">
              <label>Especie</label>
              <div className="species-picker">
                {SPECIES_LIST.map((s) => (
                  <button
                    type="button"
                    key={s.key}
                    className={`species-option ${registerForm.petSpecies === s.key ? 'selected' : ''}`}
                    onClick={() => setRegisterForm({ ...registerForm, petSpecies: s.key })}
                  >
                    <PetIllustration species={s.key} size={40} />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Edad</label>
              <input type="number" min="0" value={registerForm.petAge}
                onChange={(e) => setRegisterForm({ ...registerForm, petAge: e.target.value })} />
            </div>
            <div className="field">
              <label>Raza</label>
              <input required value={registerForm.petBreed}
                onChange={(e) => setRegisterForm({ ...registerForm, petBreed: e.target.value })} />
            </div>
            <div className="field">
              <label>Sobre tu mascota</label>
              <input value={registerForm.petBio}
                onChange={(e) => setRegisterForm({ ...registerForm, petBio: e.target.value })} />
            </div>
            <label className="terms-row">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <span>
                Acepto los{' '}
                <button type="button" className="terms-link" onClick={() => setLegalOpen('terms')}>
                  Términos y Condiciones
                </button>{' '}
                y la{' '}
                <button type="button" className="terms-link" onClick={() => setLegalOpen('privacy')}>
                  Política de Privacidad
                </button>
              </span>
            </label>
            <button className="primary-btn" disabled={loading || !acceptTerms}>
              {loading ? 'Creando…' : 'Crear cuenta'}
            </button>
          </form>
        )}

        {mode !== 'forgot' && (
          <div className="switch-auth">
            {mode === 'login' ? (
              <>¿No tienes cuenta? <button onClick={() => setMode('register')}>Regístrate</button></>
            ) : (
              <>¿Ya tienes cuenta? <button onClick={() => setMode('login')}>Entra</button></>
            )}
          </div>
        )}
      </div>
      {legalOpen && <LegalModal kind={legalOpen} onClose={() => setLegalOpen(null)} />}
    </div>
  );
}
