import { useState } from 'react';

export default function EmailMarketingTab({ catalog, api, flash }) {
  const cfg = catalog.storeConfig || {};
  const emailMarketing = cfg.emailMarketing || {};
  const [data, setData] = useState({
    activo: emailMarketing.activo !== false,
    campanaActiva: emailMarketing.campanaActiva || false,
    tipoTemplatePlantilla: emailMarketing.tipoTemplatePlantilla || 'bienvenida',
    asuntoTemplate: emailMarketing.asuntoTemplate || 'Bienvenido a tu tienda',
    contenidoTemplate: emailMarketing.contenidoTemplate || 'Gracias por tu compra.',
    segmentacion: emailMarketing.segmentacion || ['todos'],
    abtestingActivo: emailMarketing.abtestingActivo || false,
    asuntoVarianteA: emailMarketing.asuntoVarianteA || 'Oferta especial para ti',
    asuntoVarianteB: emailMarketing.asuntoVarianteB || '¡50% descuento dentro!',
    frecuenciaEnvio: emailMarketing.frecuenciaEnvio || 'semanal',
    analistica: {
      openRate: emailMarketing.analistica?.openRate || 0,
      clickRate: emailMarketing.analistica?.clickRate || 0,
      conversionRate: emailMarketing.analistica?.conversionRate || 0,
    },
  });
  const [saving, setSaving] = useState(false);

  async function guardar() {
    setSaving(true);
    try {
      const res = await fetch('/api/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('key') || ''}` },
        body: JSON.stringify({ ...cfg, emailMarketing: data }),
      });
      if (res.ok) flash('Email Marketing actualizado.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleSegmentacion(seg) {
    setData({
      ...data,
      segmentacion: data.segmentacion.includes(seg)
        ? data.segmentacion.filter((s) => s !== seg)
        : [...data.segmentacion, seg],
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-900">
        Campañas de email automáticas, segmentadas, y con análisis en tiempo real.
      </div>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Activación</h3>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={data.activo}
            onChange={(e) => setData({ ...data, activo: e.target.checked })}
            className="h-4 w-4"
          />
          <span className="text-sm">🚀 Habilitar Email Marketing automático</span>
        </label>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Plantilla de Email</h3>
        <div className="space-y-3">
          <label className="block text-xs">
            <span className="text-neutral-600">Tipo de plantilla</span>
            <select
              value={data.tipoTemplatePlantilla}
              onChange={(e) => setData({ ...data, tipoTemplatePlantilla: e.target.value })}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            >
              <option value="bienvenida">Bienvenida (primer email)</option>
              <option value="carritAbandonado">Carrito abandonado</option>
              <option value="postCompra">Post-compra (gracias)</option>
              <option value="ofertas">Ofertas exclusivas</option>
              <option value="ventacruzada">Venta cruzada (recomendaciones)</option>
            </select>
          </label>
          <label className="block text-xs">
            <span className="text-neutral-600">Asunto del email</span>
            <input
              type="text"
              value={data.asuntoTemplate}
              onChange={(e) => setData({ ...data, asuntoTemplate: e.target.value })}
              placeholder="Ej: Bienvenido a E|D Espacios"
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="block text-xs">
            <span className="text-neutral-600">Contenido del email (HTML)</span>
            <textarea
              value={data.contenidoTemplate}
              onChange={(e) => setData({ ...data, contenidoTemplate: e.target.value })}
              placeholder="<h1>Hola</h1><p>Bienvenido...</p>"
              rows={4}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm font-mono text-xs"
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Segmentación</h3>
        <div className="space-y-2">
          {['todos', 'nuevos', 'recurrentes', 'porZona', 'porProducto'].map((seg) => (
            <label key={seg} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={data.segmentacion.includes(seg)}
                onChange={() => toggleSegmentacion(seg)}
                className="h-4 w-4"
              />
              <span className="text-sm">
                {seg === 'todos' && '👥 Todos los clientes'}
                {seg === 'nuevos' && '🆕 Solo clientes nuevos'}
                {seg === 'recurrentes' && '🔁 Solo recurrentes'}
                {seg === 'porZona' && '📍 Por zona geográfica'}
                {seg === 'porProducto' && '🛍️ Por producto comprado'}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">A/B Testing</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.abtestingActivo}
              onChange={(e) => setData({ ...data, abtestingActivo: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">🧪 Habilitar A/B testing (asunto vs asunto)</span>
          </label>
          {data.abtestingActivo && (
            <div className="space-y-2 rounded-lg bg-neutral-50 p-3">
              <label className="block text-xs">
                <span className="text-neutral-600">Variante A (asunto)</span>
                <input
                  type="text"
                  value={data.asuntoVarianteA}
                  onChange={(e) => setData({ ...data, asuntoVarianteA: e.target.value })}
                  className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-neutral-600">Variante B (asunto)</span>
                <input
                  type="text"
                  value={data.asuntoVarianteB}
                  onChange={(e) => setData({ ...data, asuntoVarianteB: e.target.value })}
                  className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                />
              </label>
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Configuración</h3>
        <label className="block text-xs">
          <span className="text-neutral-600">Frecuencia de envío</span>
          <select
            value={data.frecuenciaEnvio}
            onChange={(e) => setData({ ...data, frecuenciaEnvio: e.target.value })}
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
          >
            <option value="diaria">Diaria</option>
            <option value="semanal">Semanal</option>
            <option value="mensual">Mensual</option>
            <option value="automática">Automática (según evento)</option>
          </select>
        </label>
      </section>

      <section className="rounded-lg bg-blue-50 p-3">
        <h3 className="mb-3 text-sm font-semibold text-blue-900">📊 Análisis de campañas</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{data.analistica.openRate}%</p>
            <p className="text-xs text-blue-700">Tasa de apertura</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{data.analistica.clickRate}%</p>
            <p className="text-xs text-blue-700">Tasa de click</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{data.analistica.conversionRate}%</p>
            <p className="text-xs text-blue-700">Tasa de conversión</p>
          </div>
        </div>
      </section>

      <button onClick={guardar} disabled={saving} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </div>
  );
}
