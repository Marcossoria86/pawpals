import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';
import { IconClose } from './Icons';

const REASONS = [
  'Spam o publicidad no deseada',
  'Contenido inapropiado o sensible',
  'Acoso o intimidación',
  'Información falsa o engañosa',
  'Otro motivo'
];

// Modal genérico de "reportar": se usa para publicaciones, comentarios y
// perfiles de mascota (targetType/targetId cambian según desde dónde se
// abra). No borra ni oculta nada automáticamente — sólo queda registrado
// para que el equipo lo revise (ver tabla "reports" en el backend).
export default function ReportModal({ targetType, targetId, onClose, showToast }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!reason) return;
    setSending(true);
    try {
      await api.submitReport({ targetType, targetId, reason, details });
      setSent(true);
    } catch (err) {
      showToast(err.message);
    } finally {
      setSending(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title-row">
          <div className="modal-title">Reportar</div>
          <button type="button" className="modal-close-x" onClick={onClose} aria-label="Cerrar">
            <IconClose size={20} />
          </button>
        </div>

        {sent ? (
          <>
            <p className="settings-help-text">Gracias — recibimos tu reporte y lo vamos a revisar.</p>
            <div className="modal-actions">
              <button className="modal-btn-primary" onClick={onClose}>Listo</button>
            </div>
          </>
        ) : (
          <>
            <p className="settings-help-text">¿Por qué querés reportar esto?</p>
            <div className="report-reason-list">
              {REASONS.map((r) => (
                <label className="report-reason-row" key={r}>
                  <input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} />
                  <span>{r}</span>
                </label>
              ))}
            </div>
            <textarea
              className="modal-text-input"
              placeholder="Contanos más (opcional)"
              maxLength={500}
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={onClose} disabled={sending}>Cancelar</button>
              <button className="modal-btn-primary" onClick={handleSubmit} disabled={!reason || sending}>
                {sending ? 'Enviando…' : 'Enviar reporte'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
