import { useEffect, useMemo, useState } from 'react';
import { useCatalog } from '../context/CatalogContext.jsx';

export default function AnalyticsOfertasTab({ adminKey }) {
  const { currencyFormatter } = useCatalog();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroRango, setFiltroRango] = useState('30'); // días

  async function cargarAnalytics() {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics-ofertas?dias=${filtroRango}`, {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error al cargar.');
      setAnalytics(data);
    } catch (err) {
      console.error(err);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroRango]);

  if (loading) return <p className="text-sm text-neutral-400">Calculando analytics...</p>;
  if (!analytics) return <p className="text-sm text-red-600">Error al cargar analytics.</p>;

  const {
    totalOfertas,
    ofertasActivas,
    usosTotales,
    descuentoTotalOtorgado,
    descuentoPromedio,
    codigoTop,
    tiposPopulares,
    evolucionDiaria,
    eficiencia,
  } = analytics;

  return (
    <div className="space-y-6">
      {/* Filtro de rango */}
      <div className="flex gap-2">
        {[
          { value: '7', label: 'Última semana' },
          { value: '30', label: 'Último mes' },
          { value: '90', label: 'Últimos 3 meses' },
          { value: '365', label: 'Último año' },
        ].map((r) => (
          <button
            key={r.value}
            onClick={() => setFiltroRango(r.value)}
            className={`rounded-lg px-3 py-1.5 text-xs transition ${
              filtroRango === r.value
                ? 'border-ink bg-ink text-white'
                : 'border border-neutral-300 text-neutral-600 hover:border-ink'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de ofertas" value={totalOfertas} />
        <StatCard label="Activas ahora" value={ofertasActivas} accent />
        <StatCard label="Usos totales" value={usosTotales} />
        <StatCard label="Desc. otorgado" value={currencyFormatter.format(descuentoTotalOtorgado)} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Eficiencia */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-700">Eficiencia de descuentos</p>
          <p className="text-xs text-neutral-500 mt-1">Promedio por código</p>
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Descuento promedio</span>
                <span className="font-medium">{currencyFormatter.format(descuentoPromedio)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-100">
                <div
                  className="h-2 rounded-full bg-green-500"
                  style={{ width: `${Math.min((descuentoPromedio / 100) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Tasa de conversion</span>
                <span className="font-medium">{eficiencia?.conversion || 0}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-100">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${eficiencia?.conversion || 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>ROI aproximado</span>
                <span className="font-medium">{eficiencia?.roi || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top código */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-700">Código más popular</p>
          <p className="text-xs text-neutral-500 mt-1">Más usado en el período</p>
          {codigoTop ? (
            <div className="mt-4 rounded-lg bg-neutral-50 p-3">
              <p className="font-mono text-lg font-semibold text-ink">{codigoTop.codigo}</p>
              <div className="mt-2 space-y-1 text-xs text-neutral-600">
                <p>Usado: {codigoTop.usos} veces</p>
                <p>Desc. otorgado: {currencyFormatter.format(codigoTop.descuentoTotal)}</p>
                <p>Desc. promedio: {currencyFormatter.format(codigoTop.descuentoPromedio)}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs text-neutral-400">Sin datos</p>
          )}
        </div>
      </div>

      {/* Tipos populares */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-sm font-medium text-neutral-700">Tipos de ofertas más usados</p>
        <div className="mt-3 space-y-2">
          {tiposPopulares && tiposPopulares.length > 0 ? (
            tiposPopulares.map((t) => {
              const max = Math.max(...tiposPopulares.map((x) => x.usos), 1);
              return (
                <div key={t.tipo}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-600">{t.tipo}</span>
                    <span className="font-medium">{t.usos} usos</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-neutral-100">
                    <div
                      className="h-2 rounded-full bg-purple-500"
                      style={{ width: `${(t.usos / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-neutral-400">Sin datos</p>
          )}
        </div>
      </div>

      {/* Evolución diaria */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-sm font-medium text-neutral-700">Evolución diaria de usos</p>
        <div className="mt-4 flex gap-1 items-end" style={{ height: '150px' }}>
          {evolucionDiaria && evolucionDiaria.length > 0 ? (
            evolucionDiaria.map((d, i) => {
              const max = Math.max(...evolucionDiaria.map((x) => x.usos), 1);
              const altura = (d.usos / max) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-blue-300 group relative hover:from-blue-600"
                  style={{ height: `${altura || 5}%`, minHeight: '5px' }}
                  title={`${d.fecha}: ${d.usos} usos`}
                >
                  <span className="absolute -top-5 left-0 text-[10px] text-neutral-500 opacity-0 group-hover:opacity-100">
                    {d.usos}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-neutral-400 w-full text-center py-12">Sin datos</p>
          )}
        </div>
        <p className="mt-2 text-xs text-neutral-500 text-center">
          {evolucionDiaria?.length} días | Últimas {filtroRango} días
        </p>
      </div>

      {/* Insights */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-medium text-blue-900">💡 Insights</p>
        <ul className="mt-2 space-y-1 text-xs text-blue-800">
          {eficiencia?.insights?.map((insight, i) => (
            <li key={i}>• {insight}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = false }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        accent ? 'border-amber-200 bg-amber-50' : 'border-neutral-200 bg-white'
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900">{value}</p>
    </div>
  );
}
