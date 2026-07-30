import { useState } from 'react';

export default function PagosTab({ catalog, api, flash }) {
  const cfg = catalog.storeConfig || {};
  const [data, setData] = useState({
    yape: cfg.yape || '',
    yapeTitular: cfg.yapeTitular || '',
    paymentMethods: cfg.paymentMethods || {},
    avisoColor: cfg.avisoColor || '',
    // Por defecto visible, para no cambiar el comportamiento de quien ya lo usa.
    mostrarCupon: cfg.mostrarCupon !== false,
  });
  const [saving, setSaving] = useState(false);

  async function guardar() {
    setSaving(true);
    try {
      await api('POST', 'config', { ...data });
      flash('Configuración de pagos actualizada.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h3 className="mb-1 text-lg font-semibold">Campo de código de descuento</h3>
        <p className="mb-3 text-sm text-neutral-500">
          Es el recuadro «¿Tienes un código de descuento?» del checkout.
        </p>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={data.mostrarCupon}
            onChange={(e) => setData({ ...data, mostrarCupon: e.target.checked })}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            Mostrarlo en el checkout
            <span className="mt-0.5 block text-xs text-neutral-500">
              Si aún no repartes cupones, conviene ocultarlo: ver ese campo hace que el cliente se
              vaya a buscar un código a Google y muchos no vuelven.
            </span>
          </span>
        </label>
      </section>

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
