import { Component } from 'react';
import { IconClose } from './Icons';

// Red de seguridad: si algo dentro (por ejemplo el editor de historias/reels)
// tira un error inesperado, React por defecto "desmonta" toda la app y deja
// la pantalla en blanco — sin ningún aviso ni forma de volver, hay que
// cerrar y volver a abrir la app. Este componente atrapa esos errores acá
// mismo y muestra un cartel con un botón para cerrar, en vez de romper todo.
// Se usa envolviendo pedazos puntuales (el editor, el recorte de fotos) para
// que si algo falla ahí adentro, sólo se cierre esa parte y el resto de la
// app (feed, barra de abajo, etc.) siga andando con normalidad.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary atrapó un error:', error);
  }

  handleClose = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // La versión "fatal" (la que envuelve toda la app en main.jsx) no
      // sabe cómo deshacer lo que falló, así que en vez de "Cerrar" ofrece
      // recargar la app entera.
      const fatal = this.props.fatal;
      return (
        <div className="modal-backdrop" onClick={fatal ? undefined : this.handleClose}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title-row">
              <div className="modal-title">Uy, algo falló</div>
              {!fatal && (
                <button type="button" className="modal-close-x" onClick={this.handleClose} aria-label="Cerrar">
                  <IconClose size={20} />
                </button>
              )}
            </div>
            <p className="error-boundary-text">
              {this.props.message || (fatal
                ? 'Algo salió mal en la app. Probá recargar — tu información está guardada.'
                : 'No pudimos abrir esto. Cerrá e intentá de nuevo — el resto de la app sigue funcionando bien.')}
            </p>
            <div className="modal-actions">
              {fatal
                ? <button className="modal-btn-primary" onClick={this.handleReload}>Recargar</button>
                : <button className="modal-btn-primary" onClick={this.handleClose}>Cerrar</button>}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
