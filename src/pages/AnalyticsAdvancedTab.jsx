import { useState } from 'react';

export default function AnalyticsAdvancedTab({ catalog, api, flash }) {
  const cfg = catalog.storeConfig || {};
  const analytics = cfg.analytics || {};
  const [data, setData] = useState({
    dashboardActivo: analytics.dashboardActivo !== false,
    graficasEnTiempoReal: analytics.graficasEnTiempoReal !== false,
    segmentacionActiva: analytics.segmentacionActiva !== false,
    reportesPDFActivos: analytics.reportesPDFActivos !== false,
    prediccionDemanda: analytics.prediccionDemanda !== false,
    churnDetection: analytics.churnDetection !== false,
    frecuenciaActualizacion: analytics.frecuenciaActualizacion || '15',
    metricasVisibles: analytics.metricasVisibles || [
      'ventasTotal',
      'clientesNuevos',
      'tasaConversion',
      'ticketPromedio',
      'churnRate',
      'nps',
    ],
  });
  const [saving, setSaving] = useState(false);

  const metricasDisponibles = [
    { id: 'ventasTotal', label: 'Ventas totales' },
    { id: 'clientesNuevos', label: 'Clientes nuevos' },
    { id: 'tasaConversion', label: 'Tasa de conversión' },
    { id: 'ticketPromedio', label: 'Ticket promedio' },
    { id: 'churnRate', label: 'Tasa de churn (clientes perdidos)' },
    { id: 'nps', label: 'NPS (satisfacción)' },
    { id: 'ventasPorProducto', label: 'Ventas por producto' },
    { id: 'ventasPorZona', label: 'Ventas por zona' },
    { id: 'rentabilidad', label: 'Rentabilidad' },
  ];

  function toggleMetrica(id) {
    setData({
      ...data,
      metricasVisibles: data.metricasVisibles.includes(id)
        ? data.metricasVisibles.filter((m) => m !== id)
        : [...data.metricasVisibles, id],
    });
  }

  async function guardar() {
    setSaving(true);
    try {
      await api('POST', 'config', { analytics: data });
      flash('Analytics actualizado.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-green-50 p-3 text-sm text-green-900">
        Dashboard profesional con gráficas en tiempo real, segmentación de clientes y predicciones.
      </div>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Funcionalidades</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.dashboardActivo}
              onChange={(e) => setData({ ...data, dashboardActivo: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">📊 Dashboard principal (gráficas)</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.graficasEnTiempoReal}
              onChange={(e) => setData({ ...data, graficasEnTiempoReal: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">⚡ Actualización en tiempo real</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.segmentacionActiva}
              onChange={(e) => setData({ ...data, segmentacionActiva: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">👥 Segmentación (por zona, producto, etc)</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.prediccionDemanda}
              onChange={(e) => setData({ ...data, prediccionDemanda: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">🔮 Predicción de demanda (próximos 30 días)</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.churnDetection}
              onChange={(e) => setData({ ...data, churnDetection: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">⚠️ Detección de churn (clientes en riesgo)</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.reportesPDFActivos}
              onChange={(e) => setData({ ...data, reportesPDFActivos: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">📄 Reportes PDF descargables</span>
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Métricas a mostrar</h3>
        <div className="space-y-2">
          {metricasDisponibles.map((metrica) => (
            <label key={metrica.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={data.metricasVisibles.includes(metrica.id)}
                onChange={() => toggleMetrica(metrica.id)}
                className="h-4 w-4"
              />
              <span className="text-sm">{metrica.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Configuración</h3>
        <label className="block text-xs">
          <span className="text-neutral-600">Frecuencia de actualización (segundos)</span>
          <select
            value={data.frecuenciaActualizacion}
            onChange={(e) => setData({ ...data, frecuenciaActualizacion: e.target.value })}
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
          >
            <option value="5">Cada 5 segundos (en vivo)</option>
            <option value="15">Cada 15 segundos</option>
            <option value="30">Cada 30 segundos</option>
            <option value="60">Cada 1 minuto</option>
            <option value="300">Cada 5 minutos</option>
          </select>
        </label>
      </section>

      <button
        onClick={guardar}
        disabled={saving}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {saving ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </div>
  );
}
