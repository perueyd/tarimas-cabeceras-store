import { Component } from 'react';
import { reportarError } from '../lib/reportarError.js';

// Red de seguridad para toda la tienda.
//
// Sin esto, un error en CUALQUIER componente (un producto con un dato raro,
// una foto que no carga como se esperaba) desmonta la página entera y el
// cliente ve una pantalla en blanco, sin botón ni explicación. Ya pasó dos
// veces con el panel. Ahora ve un mensaje con salida (recargar o escribir por
// WhatsApp) y el error llega al panel para poder arreglarlo.
//
// Tiene que ser una clase: React solo ofrece esta función
// (getDerivedStateFromError / componentDidCatch) a componentes de clase.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { fallo: false };
  }

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch(error, info) {
    reportarError(error, info?.componentStack?.split('\n').slice(0, 6).join('\n'));
  }

  render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
          <p className="text-3xl" aria-hidden>🛠️</p>
          <h1 className="mt-3 text-lg font-semibold text-neutral-900">Algo salió mal al mostrar esta página</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Ya nos llegó el aviso para revisarlo. Tu carrito sigue guardado: recarga la página para continuar.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Recargar la página
            </button>
            {/* Número fijo a propósito: este aviso se muestra justo cuando la
                tienda falló, y puede que el catálogo (de donde sale el número
                del botón flotante) sea lo que falló. Es el mismo de create-charge.js. */}
            <a
              href="https://wa.me/51951278010"
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
            >
              Escribir por WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }
}
