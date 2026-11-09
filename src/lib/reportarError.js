// Avisa al servidor de un error que vio el cliente en su navegador.
//
// Sin esto, una pantalla en blanco en el móvil de un comprador no dejaba
// ningún rastro: el servidor no se entera de lo que falla en el navegador.
// Ahora llega a la lista de errores del panel (y al teléfono si está
// configurado ALERTAS_URL — ver api/_alertas.js).
//
// No manda datos personales: ni nombre, ni teléfono, ni la parte "?..." de la
// dirección. Solo el mensaje del error, la página y unas líneas de la pila.
// Por eso no necesita el consentimiento de cookies.

const yaAvisados = new Set();
const MAX_POR_VISITA = 5;

export function reportarError(error, extra = '') {
  try {
    if (typeof window === 'undefined') return;
    const mensaje = String(error?.message || error || 'Error desconocido').slice(0, 300);
    // El mismo error repetido en bucle se avisa una vez; y como mucho 5 por visita.
    if (yaAvisados.has(mensaje) || yaAvisados.size >= MAX_POR_VISITA) return;
    yaAvisados.add(mensaje);
    const pila = [String(error?.stack || '').split('\n').slice(0, 8).join('\n'), extra]
      .filter(Boolean)
      .join('\n')
      .slice(0, 1500);
    const cuerpo = JSON.stringify({ mensaje, donde: window.location.pathname, pila });
    // keepalive: que el aviso salga aunque el cliente cierre la pestaña.
    fetch('/api/errores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: cuerpo,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Avisar de un error nunca puede causar otro.
  }
}

// Errores que React no ve: los de código asíncrono, eventos y promesas.
export function vigilarErroresGlobales() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => {
    // Un <img> roto también dispara "error" pero sin e.error: no es un fallo del código.
    if (e.error) reportarError(e.error);
  });
  window.addEventListener('unhandledrejection', (e) => reportarError(e.reason));
}
