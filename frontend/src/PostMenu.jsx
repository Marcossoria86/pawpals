import { useEffect, useRef, useState } from 'react';

// Menú de "..." visible solo en publicaciones propias: eliminar la
// publicación o desactivar/activar sus comentarios.
export default function PostMenu({ commentsDisabled, onDelete, onToggleComments }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleDelete() {
    setOpen(false);
    if (window.confirm('¿Seguro que quieres eliminar esta publicación? No se puede deshacer.')) {
      onDelete();
    }
  }

  function handleToggleComments() {
    setOpen(false);
    onToggleComments();
  }

  return (
    <div className="post-menu" ref={ref}>
      <button type="button" className="post-menu-btn" onClick={() => setOpen((v) => !v)} aria-label="Más opciones">
        ⋮
      </button>
      {open && (
        <div className="post-menu-dropdown">
          <button type="button" onClick={handleToggleComments}>
            {commentsDisabled ? 'Activar comentarios' : 'Desactivar comentarios'}
          </button>
          <button type="button" className="danger" onClick={handleDelete}>
            Eliminar publicación
          </button>
        </div>
      )}
    </div>
  );
}
