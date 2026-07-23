import { useState } from 'react';
import { useCatalog } from '../context/CatalogContext.jsx';

// Encuesta opcional en la página de gracias. El cliente puede responderla o
// no — no bloquea nada. Las preguntas son editables desde el panel.
export default function PostPurchaseSurvey({ orderCode }) {
  const { storeConfig } = useCatalog();
  const encuesta = storeConfig.encuesta || {};
  const preguntas = Array.isArray(encuesta.preguntas) ? encuesta.preguntas : [];

  const [respuestas, setRespuestas] = useState({});
  const [estado, setEstado] = useState('idle'); // idle | enviando | ok | oculta
  const [error, setError] = useState('');

  if (encuesta.activa === false || preguntas.length === 0 || estado === 'oculta') return null;

  function set(id, valor) {
    setRespuestas((prev) => ({ ...prev, [id]: valor }));
  }

  async function enviar() {
    const llenas = Object.fromEntries(Object.entries(respuestas).filter(([, v]) => String(v).trim()));
    if (Object.keys(llenas).length === 0) {
      setError('Marca o escribe al menos una respuesta, o toca "Ahora no".');
      return;
    }
    setEstado('enviando');
    setError('');
    try {
      await fetch('/api/encuesta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderCode, respuestas: llenas }),
      });
      setEstado('ok');
    } catch {
      // Aunque falle el guardado, no molestamos al cliente: es opcional.
      setEstado('ok');
    }
  }

  if (estado === 'ok') {
    return (
      <div className="mx-auto mt-8 max-w-md rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
        ¡Gracias por tu opinión! 🙌
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-md rounded-xl border border-neutral-200 bg-white p-5 text-left">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-neutral-800">{encuesta.titulo || '¿Nos ayudas con una encuesta rápida?'}</p>
        <button onClick={() => setEstado('oculta')} className="shrink-0 text-xs text-neutral-400 hover:text-neutral-600">
          Ahora no
        </button>
      </div>
      {encuesta.descripcion && <p className="mt-1 text-xs text-neutral-500">{encuesta.descripcion}</p>}

      <div className="mt-4 space-y-4">
        {preguntas.map((p) => (
          <div key={p.id}>
            <p className="mb-1.5 text-sm font-medium text-neutral-700">{p.label}</p>
            {p.tipo === 'opciones' ? (
              <div className="flex flex-wrap gap-2">
                {(p.opciones || []).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => set(p.id, op)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      respuestas[p.id] === op ? 'border-ink bg-ink text-white' : 'border-neutral-300 text-neutral-600 hover:border-neutral-500'
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                value={respuestas[p.id] || ''}
                onChange={(e) => set(p.id, e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
              />
            )}
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <button
        onClick={enviar}
        disabled={estado === 'enviando'}
        className="mt-4 w-full rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
      >
        {estado === 'enviando' ? 'Enviando...' : 'Enviar mi opinión'}
      </button>
    </div>
  );
}
