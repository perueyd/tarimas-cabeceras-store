import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { guardarConsentimiento, leerConsentimiento } from '../lib/consentimiento.js';

// Aviso de cookies. Bloquea de verdad: mientras no se acepte, Google Analytics
// y el píxel de Meta NO se cargan (ver src/lib/analytics.js).
//
// Reglas que cumple, y por qué:
//  · "Rechazar" está tan a mano como "Aceptar" — el RGPD prohíbe los avisos
//    donde aceptar es un botón grande y rechazar está escondido tras tres
//    clics. Es el error más sancionado en Europa.
//  · Nada se carga antes de responder (consentimiento PREVIO, no posterior).
//  · Se puede cambiar de opinión después, desde el pie de página.
//  · Las cookies necesarias (el carrito) no se preguntan: sin ellas la tienda
//    no funciona y no requieren permiso.

export default function AvisoCookies() {
  const [visible, setVisible] = useState(false);
  const [detalle, setDetalle] = useState(false);
  const [analitica, setAnalitica] = useState(true);
  const [marketing, setMarketing] = useState(true);

  useEffect(() => {
    // Se muestra solo si aún no ha respondido.
    if (!leerConsentimiento()) setVisible(true);
    // El pie de página puede reabrirlo para cambiar la elección.
    const abrir = () => { setDetalle(true); setVisible(true); };
    window.addEventListener('ed-abrir-cookies', abrir);
    return () => window.removeEventListener('ed-abrir-cookies', abrir);
  }, []);

  if (!visible) return null;

  function responder(a, m) {
    guardarConsentimiento({ analitica: a, marketing: m });
    setVisible(false);
    setDetalle(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-neutral-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="mx-auto max-w-4xl px-4 py-4 sm:py-5">
        <p className="text-sm font-semibold text-neutral-900">🍪 Cookies</p>
        <p className="mt-1 text-sm leading-relaxed text-neutral-600">
          Usamos cookies propias para que funcione el carrito, y opcionalmente otras para entender
          cómo se usa la web y mostrarte nuestros anuncios. Puedes rechazarlas y la tienda funciona
          igual.{' '}
          <Link to="/politica-privacidad" className="underline hover:text-ink">
            Más información
          </Link>
        </p>

        {detalle && (
          <div className="mt-4 space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <label className="flex cursor-not-allowed items-start gap-3 text-sm opacity-70">
              <input type="checkbox" checked disabled className="mt-0.5 h-4 w-4" />
              <span>
                <strong>Necesarias</strong> — siempre activas
                <span className="block text-xs text-neutral-500">
                  Guardan tu carrito y tu sesión. Sin ellas no puedes comprar.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={analitica}
                onChange={(e) => setAnalitica(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <strong>Analíticas</strong> — Google Analytics
                <span className="block text-xs text-neutral-500">
                  Nos dicen qué productos se miran más. Los datos se procesan en Estados Unidos.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <strong>Publicidad</strong> — Meta (Facebook e Instagram)
                <span className="block text-xs text-neutral-500">
                  Permiten mostrarte nuestros anuncios. Los datos se procesan en Estados Unidos.
                </span>
              </span>
            </label>
          </div>
        )}

        {/* Los dos botones principales pesan lo mismo a propósito. */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => responder(true, true)}
            className="flex-1 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 sm:flex-none"
          >
            Aceptar todas
          </button>
          <button
            onClick={() => responder(false, false)}
            className="flex-1 rounded-lg border border-neutral-400 px-5 py-2.5 text-sm font-medium transition hover:border-ink sm:flex-none"
          >
            Rechazar todas
          </button>
          {detalle ? (
            <button
              onClick={() => responder(analitica, marketing)}
              className="flex-1 rounded-lg border border-neutral-300 px-5 py-2.5 text-sm transition hover:border-ink sm:flex-none"
            >
              Guardar mi elección
            </button>
          ) : (
            <button
              onClick={() => setDetalle(true)}
              className="flex-1 rounded-lg border border-neutral-300 px-5 py-2.5 text-sm transition hover:border-ink sm:flex-none"
            >
              Elegir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
