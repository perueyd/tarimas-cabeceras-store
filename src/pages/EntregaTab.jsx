import { useState } from 'react';

export default function EntregaTab({ catalog, api, flash }) {
  const cfg = catalog.storeConfig || {};
  const [data, setData] = useState({
    leadTime: cfg.leadTime || '',
    pesoEnvio: cfg.pesoEnvio || '',
    deliveryMinDays: cfg.deliveryMinDays || 4,
    deliverySlots: cfg.deliverySlots || [],
  });
  const [saving, setSaving] = useState(false);

  function updateSlot(i, field, value) {
    setData({
      ...data,
      deliverySlots: data.deliverySlots.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)),
    });
  }

  function addSlot() {
    setData({
      ...data,
      deliverySlots: [...data.deliverySlots, { id: `slot-${Date.now()}`, label: '' }],
    });
  }

  function removeSlot(i) {
    setData({
      ...data,
      deliverySlots: data.deliverySlots.filter((_, idx) => idx !== i),
    });
  }

  async function guardar() {
    setSaving(true);
    try {
      await api('POST', 'config', { ...data });
      flash('Configuración de entrega actualizada.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-4 text-lg font-semibold">Tiempo de Entrega</h3>
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Texto de lead time (ej: 3 a 4 días hábiles)</span>
            <input
              type="text"
              value={data.leadTime}
              onChange={(e) => setData({ ...data, leadTime: e.target.value })}
              placeholder="3 a 4 días hábiles"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          {/* Lo que la agencia de transporte necesita para cotizar. Sin esto el
              cliente de provincia no puede pedir precio y termina preguntando
              por WhatsApp una y otra vez. */}
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">
              Peso y medida del bulto (para que el cliente cotice con la agencia)
            </span>
            <input
              type="text"
              value={data.pesoEnvio}
              onChange={(e) => setData({ ...data, pesoEnvio: e.target.value })}
              placeholder="30 kg aprox. y la caja mide lo mismo que el mueble"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-neutral-500">
              Aparece en el aviso de envío a provincia. Si lo dejas vacío, no se muestra.
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Días mínimos para elegir entrega (desde hoy)</span>
            <input
              type="number"
              value={data.deliveryMinDays}
              onChange={(e) => setData({ ...data, deliveryMinDays: parseInt(e.target.value) || 0 })}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Horarios de Entrega Disponibles</h3>
        <div className="space-y-3">
          {data.deliverySlots.map((slot, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={slot.label}
                onChange={(e) => updateSlot(i, 'label', e.target.value)}
                placeholder="Ej: Mañana (9:00 a.m. – 1:00 p.m.)"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeSlot(i)}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSlot}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium hover:border-neutral-500"
          >
            + Agregar horario
          </button>
        </div>
      </section>

      <button
        onClick={guardar}
        disabled={saving}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  );
}
