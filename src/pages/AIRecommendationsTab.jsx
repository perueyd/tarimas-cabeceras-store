import { useEffect, useState } from 'react';
import { useCatalog } from '../context/CatalogContext.jsx';

export default function AIRecommendationsTab({ adminKey }) {
  const { currencyFormatter } = useCatalog();
  const [recomendaciones, setRecomendaciones] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function cargar() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({
          cliente: { telefono: '0', nombre: 'Promedio' },
          producto: { precio: 250, categoria: 'general' },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error al cargar.');
      setRecomendaciones(data.sugerencia);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-sm text-neutral-400">Analizando con IA...</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-900">🤖 IA Recomendador</p>
        <p className="mt-1 text-xs text-blue-800">Descuento óptimo calculado por machine learning</p>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {recomendaciones && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <p className="text-xs text-neutral-500">Descuento Recomendado</p>
              <p className="mt-2 text-2xl font-bold text-ink">{recomendaciones.descuentoRecomendado}%</p>
              <p className="mt-1 text-xs text-neutral-600">{recomendaciones.razon}</p>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <p className="text-xs text-neutral-500">Confianza IA</p>
              <p className="mt-2 text-2xl font-bold text-green-600">{recomendaciones.confianza}%</p>
              <div className="mt-2 h-2 w-full rounded-full bg-neutral-100">
                <div
                  className="h-2 rounded-full bg-green-500"
                  style={{ width: `${recomendaciones.confianza}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-sm font-semibold mb-3">Factores considerados</p>
            <ul className="space-y-2 text-xs">
              {recomendaciones.factores &&
                Object.entries(recomendaciones.factores).map(([key, val]) => (
                  <li key={key} className="flex justify-between">
                    <span className="text-neutral-600">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className={val ? 'text-green-600 font-medium' : 'text-neutral-400'}>
                      {val ? '✓' : '✗'}
                    </span>
                  </li>
                ))}
            </ul>
          </div>

          <button
            onClick={cargar}
            className="w-full rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            🔄 Recalcular con IA
          </button>
        </div>
      )}
    </div>
  );
}
