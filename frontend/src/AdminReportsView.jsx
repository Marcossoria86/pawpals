import { useEffect, useState } from 'react';
import { api } from './api';

function formatDate(isoLike) {
  try {
    const date = new Date(isoLike.replace(' ', 'T') + 'Z');
    return date.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoLike;
  }
}

// Pantalla simple y sólo para vos (el dueño de la app): lista todos los
// reportes que mandó la gente sobre publicaciones, comentarios o perfiles.
// No hay un sistema de usuarios "admin" todavía, así que esta pantalla no
// pasa por el login normal — se protege con una clave secreta que va en la
// URL (ver ADMIN_KEY en el backend y ?adminKey= acá). Guardá ese link en
// un lugar seguro, como guardarías cualquier contraseña.
export default function AdminReportsView({ adminKey }) {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('open');
  const [busyId, setBusyId] = useState(null);

  function load() {
    setError('');
    api.adminReports(adminKey)
      .then(setReports)
      .catch((err) => setError(err.message || 'No se pudo cargar'));
  }

  useEffect(() => { load(); }, [adminKey]);

  async function toggleStatus(report) {
    const nextStatus = report.status === 'open' ? 'resolved' : 'open';
    setBusyId(report.id);
    try {
      await api.adminSetReportStatus(adminKey, report.id, nextStatus);
      setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status: nextStatus } : r)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const visible = reports ? reports.filter((r) => (filter === 'all' ? true : r.status === filter)) : [];
  const openCount = reports ? reports.filter((r) => r.status === 'open').length : 0;

  return (
    <div className="admin-reports-page">
      <div className="admin-reports-head">
        <h1>Reportes de PawPals</h1>
        {reports && <span className="admin-reports-count">{openCount} sin revisar</span>}
      </div>

      {error && (
        <div className="admin-reports-error">
          {error === 'Clave incorrecta' ? 'La clave del link no es correcta.' : error}
        </div>
      )}

      {!error && !reports && <div className="admin-reports-loading">Cargando…</div>}

      {reports && (
        <>
          <div className="admin-reports-filters">
            <button className={filter === 'open' ? 'active' : ''} onClick={() => setFilter('open')}>Sin revisar</button>
            <button className={filter === 'resolved' ? 'active' : ''} onClick={() => setFilter('resolved')}>Revisados</button>
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todos</button>
          </div>

          {visible.length === 0 && <div className="admin-reports-empty">No hay reportes acá.</div>}

          <div className="admin-reports-list">
            {visible.map((r) => (
              <div key={r.id} className={`admin-report-card ${r.status === 'resolved' ? 'resolved' : ''}`}>
                <div className="admin-report-top">
                  <span className="admin-report-reason">{r.reason}</span>
                  <span className="admin-report-date">{formatDate(r.created_at)}</span>
                </div>
                <div className="admin-report-target">{r.target_summary}</div>
                {r.details && <div className="admin-report-details">"{r.details}"</div>}
                <div className="admin-report-reporter">Reportado por {r.reporter_name} ({r.reporter_email})</div>
                <div className="admin-report-actions">
                  <button disabled={busyId === r.id} onClick={() => toggleStatus(r)}>
                    {r.status === 'open' ? 'Marcar como revisado' : 'Volver a abrir'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
