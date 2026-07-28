import { useState } from 'react';

export default function PagosTab({ catalog, api, flash }) {
  const cfg = catalog.storeConfig || {};
  const [data, setData] = useState({
    yape: cfg.yape || '',
    yapeTitular: cfg.yapeTitular || '',
    paymentMethods: cfg.paymentMethods || {},
    avisoColor: cfg.avisoColor || '',
  });
  const [saving, setSaving] = useState(false);

  async function guardar() {
    setSaving(true);
    try {
      const res = await fetch('/api/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('key') || ''}` },
        body: JSON.stringify({ ...cfg, ...data }),
      });
      if (res.ok) {
        flash('Configuración de pagos actualizada.');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-4 text-lg font-semibold">Yape/Plin Directo</h3>
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Número Yape/Plin</span>
            <input
              type="text"
              value={data.yape}
              onChange={(e) => setData({ ...data, yape: e.target.value })}
              placeholder="951 278 010"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Titular de la cuenta</span>
            <input
              type="text"
              value={data.yapeTitular}
              onChange={(e) => setData({ ...data, yapeTitular: e.target.value })}
              placeholder="E|D Espacios y Diseño"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Métodos de Pago Habilitados</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.paymentMethods.culqi || false}
              onChange={(e) => setData({ ...data, paymentMethods: { ...data.paymentMethods, culqi: e.target.checked } })}
              className="h-4 w-4"
            />
            <span className="text-sm">Tarjeta (Culqi)</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.paymentMethods.yapePlin || false}
              onChange={(e) => setData({ ...data, paymentMethods: { ...data.paymentMethods, yapePlin: e.target.checked } })}
              className="h-4 w-4"
            />
            <span className="text-sm">Yape/Plin (Culqi)</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.paymentMethods.transferencia || false}
              onChange={(e) => setData({ ...data, paymentMethods: { ...data.paymentMethods, transferencia: e.target.checked } })}
              className="h-4 w-4"
            />
            <span className="text-sm">Transferencia bancaria</span>
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Aviso de Color (Producto)</h3>
        <textarea
          value={data.avisoColor}
          onChange={(e) => setData({ ...data, avisoColor: e.target.value })}
          placeholder="Aviso que aparece bajo selector de color..."
          rows={3}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
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
