import { useEffect, useState } from 'react';
import { useCatalog } from '../context/CatalogContext.jsx';

export default function HistorialCodigosTab({ adminKey }) {
  const { currencyFormatter } = useCatalog();
  const [historial, setHistorial] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState(1);

  async function cargar() {
    setLoading(true);
    setError('');
    try {
      let url = `/api/historial?pagina=${pagina}`;
      if (filtro.trim()) {
        // Si parece un teléfono, busca por cliente; si no, por código
        if (/^\d{6,}$/.test(filtro.trim())) {
          url += `&telefono=${encodeURIComponent(filtro.trim())}`;
        } else {
          url += `&codigo=${encodeURIComponent(filtro.trim())}`;
        }
      }

      const res = await fetch(url, { headers: { Authorization: `Bearer ${adminKey}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar.');
      setHistorial(data);
    } catch (err) {
      setError(err.message);
      setHistorial(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, filtro]);

  if (loading) return <p className="text-sm text-neutral-400">Cargando historial...</p>;

  return (
    <div>
      <div className="mb-4">
        <p className="mb-3 text-sm text-neutral-600">
          <strong>Trazabilidad completa de códigos usados.</strong> Busca por código o teléfono del cliente.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={filtro}
            onChange={(e) => { setFiltro(e.target.value); setPagina(1); }}
            placeholder="Buscar por código o teléfono..."
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </div>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {!historial?.historial || historial.historial.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">
          {filtro ? 'No hay registros que coincidan con tu búsqueda.' : 'Aún no hay uso de códigos.'}
        </p>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between text-xs text-neutral-600">
            <span>Total: {historial.total} registros</span>
            <span>Página {historial.pagina} de {historial.totalPaginas}</span>
          </div>

          <div className="space-y-2">
            {historial.historial.map((r, idx) => (
              <div key={idx} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{r.codigo}</span>
                    <span className="text-xs text-neutral-500">{new Date(r.fecha).toLocaleString('es-PE')}</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-600">
                    {r.cliente.nombre} · {r.cliente.telefono}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Monto: {currencyFormatter.format(r.monto)} · Descuento: -{currencyFormatter.format(r.descuento)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setPagina(Math.max(1, pagina - 1))}
              disabled={pagina === 1}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs hover:border-ink disabled:opacity-50"
            >
              ← Anterior
            </button>
            {Array.from({ length: Math.min(5, historial.totalPaginas) }, (_, i) => {
              const p = Math.max(1, pagina - 2) + i;
              return p <= historial.totalPaginas ? (
                <button
                  key={p}
                  onClick={() => setPagina(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    pagina === p
                      ? 'border-ink bg-ink text-white'
                      : 'border border-neutral-300 hover:border-ink'
                  }`}
                >
                  {p}
                </button>
              ) : null;
            })}
            <button
              onClick={() => setPagina(Math.min(historial.totalPaginas, pagina + 1))}
              disabled={pagina === historial.totalPaginas}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs hover:border-ink disabled:opacity-50"
            >
              Siguiente →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
