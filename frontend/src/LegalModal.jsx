import { createPortal } from 'react-dom';
import { IconClose } from './Icons';
import { TERMS_SECTIONS, PRIVACY_SECTIONS } from './legalContent';

// Modal de sólo lectura para mostrar los Términos y Condiciones o la
// Política de Privacidad completos — se abre desde el registro (AuthView)
// antes de tildar el checkbox de aceptación. Portal a <body> por la misma
// razón que el resto de los modales de pantalla completa de la app.
export default function LegalModal({ kind, onClose }) {
  const isTerms = kind === 'terms';
  const sections = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS;
  const title = isTerms ? 'Términos y Condiciones' : 'Política de Privacidad';

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card legal-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title-row">
          <div className="modal-title">{title}</div>
          <button type="button" className="modal-close-x" onClick={onClose} aria-label="Cerrar">
            <IconClose size={20} />
          </button>
        </div>
        <div className="legal-modal-body">
          {sections.map((s) => (
            <div key={s.title} className="legal-section">
              <div className="legal-section-title">{s.title}</div>
              {s.body.split('\n\n').map((p, i) => (
                <p key={i} className="legal-section-body">{p}</p>
              ))}
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="modal-btn-primary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
