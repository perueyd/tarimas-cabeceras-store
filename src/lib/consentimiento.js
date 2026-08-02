// Consentimiento de cookies — de verdad, no decorativo.
//
// Antes Google Analytics y el píxel de Meta se cargaban en cuanto alguien
// abría la web, sin preguntar nada. Los dos ponen cookies de seguimiento y
// mandan datos de navegación a Estados Unidos, así que:
//   · En Perú, la Ley 29733 exige consentimiento previo, informado y expreso
//     para tratar datos personales (y el comportamiento de navegación lo es).
//   · Para cualquier visitante de la Unión Europea, el RGPD exige lo mismo y
//     con multas mucho más altas.
//
// La regla que se aplica aquí: hasta que la persona diga que sí, NO se carga
// ningún rastreador. Rechazar es tan fácil como aceptar (eso también lo exige
// el RGPD: no valen los "aceptar" gigantes con un "rechazar" escondido).

const CLAVE = 'ed-consentimiento';
const VERSION = 1; // subir esto obliga a volver a preguntar si cambian los usos

// Las cookies necesarias (carrito, sesión del panel) no se consultan: sin
// ellas la tienda no funciona y la ley no exige permiso para esas.
export function leerConsentimiento() {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (v?.version !== VERSION) return null;
    return v; // { analitica: bool, marketing: bool, fecha, version }
  } catch {
    return null;
  }
}

export function guardarConsentimiento({ analitica, marketing }) {
  const valor = {
    analitica: !!analitica,
    marketing: !!marketing,
    fecha: new Date().toISOString(),
    version: VERSION,
  };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(valor));
  } catch { /* modo incógnito: vale para esta visita */ }
  // Avisa a quien esté escuchando (analytics.js) para que arranque o pare.
  window.dispatchEvent(new CustomEvent('ed-consentimiento', { detail: valor }));
  return valor;
}

export function borrarConsentimiento() {
  try { localStorage.removeItem(CLAVE); } catch { /* da igual */ }
  window.dispatchEvent(new CustomEvent('ed-consentimiento', { detail: null }));
}

export function aceptaAnalitica() {
  return leerConsentimiento()?.analitica === true;
}

export function aceptaMarketing() {
  return leerConsentimiento()?.marketing === true;
}
