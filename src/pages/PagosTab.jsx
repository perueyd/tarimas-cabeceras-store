import { useState } from 'react';
import { UploadButton } from './editor/comunes.jsx';
import { metodosActivos } from '../lib/metodosPago.js';

// Número, titular y QR de una billetera (Yape o Plin).
function Billetera({ nombre, campo, data, setData, adminKey }) {
  const qr = data[`${campo}Qr`];
  return (
    <section>
      <h3 className="mb-4 text-lg font-semibold">{nombre} directo</h3>
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Número de {nombre}</span>
          <input
            type="text"
            value={data[campo]}
            onChange={(e) => setData({ ...data, [campo]: e.target.value })}
            placeholder="951 278 010"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Titular de la cuenta</span>
          <input
            type="text"
            value={data[`${campo}Titular`]}
            onChange={(e) => setData({ ...data, [`${campo}Titular`]: e.target.value })}
            placeholder="Corporación Agamenón"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <div>
          <span className="text-sm font-medium text-neutral-700">Código QR (opcional)</span>
          <p className="text-xs text-neutral-500">
            En la app de {nombre}: «Mi QR» → descárgalo y súbelo aquí. El cliente lo escanea desde el checkout.
          </p>
          <div className="mt-2 flex items-center gap-3">
            {qr && <img src={qr} alt={`QR de ${nombre}`} className="h-24 w-24 rounded-lg border border-neutral-200 object-contain" />}
            <UploadButton adminKey={adminKey} label={qr ? 'Cambiar QR' : '📷 Subir QR'} onUploaded={(url) => setData({ ...data, [`${campo}Qr`]: url })} />
            {qr && (
              <button onClick={() => setData({ ...data, [`${campo}Qr`]: '' })} className="text-xs text-red-600 hover:underline">
                Quitar
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function PagosTab({ catalog, api, flash, adminKey }) {
  const cfg = catalog.storeConfig || {};
  const [data, setData] = useState({
    yape: cfg.yape || '',
    yapeTitular: cfg.yapeTitular || '',
    yapeQr: cfg.yapeQr || '',
    // Plin suele ir al mismo celular que Yape: si no se configuró aparte, se
    // parte de los datos de Yape.
    plin: cfg.plin || cfg.yape || '',
    plinTitular: cfg.plinTitular || cfg.yapeTitular || '',
    plinQr: cfg.plinQr || '',
    paymentMethods: metodosActivos(cfg.paymentMethods),
    // Por defecto visible, para no cambiar el comportamiento de quien ya lo usa.
    mostrarCupon: cfg.mostrarCupon !== false,
  });
  const [saving, setSaving] = useState(false);

  async function guardar() {
    const pm = data.paymentMethods;
    if (!pm.culqi && !pm.yape && !pm.plin && !pm.transferencia) {
      alert('Deja al menos un método de pago activo — si los apagas todos, nadie podrá pagar.');
      return;
    }
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

      <Billetera nombre="Yape" campo="yape" data={data} setData={setData} adminKey={adminKey} />
      <Billetera nombre="Plin" campo="plin" data={data} setData={setData} adminKey={adminKey} />

      <section>
        <h3 className="mb-4 text-lg font-semibold">Métodos de pago habilitados</h3>
        <div className="space-y-2">
          {[
            ['culqi', 'Culqi (tarjeta, o Yape dentro de Culqi) — se confirma solo'],
            ['yape', 'Yape directo (QR o número) — lo confirmas tú'],
            ['plin', 'Plin directo (QR o número) — lo confirmas tú'],
            ['transferencia', 'Transferencia bancaria — la confirmas tú'],
          ].map(([clave, texto]) => (
            <label key={clave} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={data.paymentMethods[clave] || false}
                onChange={(e) => setData({ ...data, paymentMethods: { ...data.paymentMethods, [clave]: e.target.checked } })}
                className="h-4 w-4"
              />
              <span className="text-sm">{texto}</span>
            </label>
          ))}
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
