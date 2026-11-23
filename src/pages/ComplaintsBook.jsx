import { useState } from 'react';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useMeta } from '../lib/meta.js';
import HojaImprimible from '../components/HojaImprimible.jsx';
import { LEYENDAS_RECLAMO, PLAZO_RECLAMO_DIAS_HABILES } from '../lib/reclamos.js';

// Campos y leyendas según el formato oficial de la Hoja de Reclamación
// (Anexo I del DS 011-2011-PCM, modificado por el DS 101-2022-PCM): monto
// reclamado, padre o madre si quien reclama es menor de edad, cómo quiere
// recibir la respuesta y una copia que el consumidor pueda imprimir.

const CAMPOS_VACIOS = {
  tipo: 'Reclamo',
  nombre: '',
  tipoDocumento: 'DNI',
  numeroDocumento: '',
  domicilio: '',
  telefono: '',
  email: '',
  bienTipo: 'Producto',
  bienDescripcion: '',
  montoReclamado: '',
  menorDeEdad: false,
  padreMadre: '',
  respuestaPor: 'Correo electrónico',
  detalle: '',
  pedido: '',
};

export default function ComplaintsBook() {
  useMeta({
    titulo: 'Libro de Reclamaciones',
    descripcion: `Registra tu queja o reclamo. Recibirás un número de hoja y te respondemos en un máximo de ${PLAZO_RECLAMO_DIAS_HABILES} días hábiles.`,
  });

  const { storeConfig } = useCatalog();
  const [form, setForm] = useState(CAMPOS_VACIOS);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [registrado, setRegistrado] = useState(null); // { folio, fecha }

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const completo =
    form.nombre.trim() &&
    form.numeroDocumento.trim() &&
    form.domicilio.trim() &&
    form.telefono.trim() &&
    form.email.trim() &&
    form.detalle.trim() &&
    (!form.menorDeEdad || form.padreMadre.trim());

  async function enviar(e) {
    e.preventDefault();
    if (!completo) return;
    setEnviando(true);
    setError('');
    try {
      const res = await fetch('/api/reclamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo registrar tu reclamo.');
      setRegistrado({ folio: data.folio, fecha: data.fecha || new Date().toISOString() });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (registrado) {
    const hoja = <HojaDeReclamacion form={form} registrado={registrado} storeConfig={storeConfig} />;
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-3xl">✓</p>
          <h1 className="mt-2 text-xl font-semibold">Tu {form.tipo.toLowerCase()} fue registrado</h1>
          <p className="mt-2 font-mono text-sm text-neutral-600">N.° de hoja: {registrado.folio}</p>
          <p className="mt-4 text-sm text-neutral-600">
            Guarda este número. Por ley, te responderemos en un plazo máximo de {PLAZO_RECLAMO_DIAS_HABILES} días
            hábiles, por {form.respuestaPor === 'Carta a mi domicilio' ? 'carta a tu domicilio' : 'correo electrónico'}.
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-5 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Imprimir o guardar mi hoja en PDF
          </button>
        </div>
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">{hoja}</div>
        <HojaImprimible>{hoja}</HojaImprimible>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Libro de Reclamaciones</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Conforme a lo establecido en el Código de Protección y Defensa del Consumidor, este
        establecimiento cuenta con un Libro de Reclamaciones a tu disposición. Puedes registrar
        tu reclamo o queja aquí sin necesidad de haber comprado antes.
      </p>

      {(storeConfig.razonSocial || storeConfig.ruc || storeConfig.direccionFiscal) && (
        <div className="mt-4 space-y-0.5 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
          {storeConfig.razonSocial && <p>Proveedor: {storeConfig.razonSocial}</p>}
          {storeConfig.ruc && <p>RUC: {storeConfig.ruc}</p>}
          {storeConfig.direccionFiscal && <p>Domicilio: {storeConfig.direccionFiscal}</p>}
        </div>
      )}

      <form onSubmit={enviar} className="mt-6 space-y-5">
        <div>
          <p className="mb-1 text-sm font-medium text-neutral-700">Tipo</p>
          <div className="flex gap-3">
            {['Reclamo', 'Queja'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('tipo', t)}
                className={`rounded-lg border px-4 py-2 text-sm transition ${
                  form.tipo === t ? 'border-ink bg-ink text-white' : 'border-neutral-300 text-neutral-600 hover:border-neutral-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {form.tipo === 'Reclamo'
              ? 'Disconformidad relacionada a un producto o servicio.'
              : 'Malestar no relacionado al producto o servicio (ej. atención al cliente).'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nombre completo" value={form.nombre} onChange={(v) => set('nombre', v)} />
          <div className="flex gap-2">
            <label className="w-28 shrink-0 text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Documento</span>
              <select
                value={form.tipoDocumento}
                onChange={(e) => set('tipoDocumento', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 outline-none focus:border-ink"
              >
                <option>DNI</option>
                <option>CE</option>
                <option>Pasaporte</option>
              </select>
            </label>
            <div className="flex-1">
              <Campo label="N.° de documento" value={form.numeroDocumento} onChange={(v) => set('numeroDocumento', v)} />
            </div>
          </div>
          <Campo label="Domicilio" value={form.domicilio} onChange={(v) => set('domicilio', v)} full />
          <Campo label="Teléfono" value={form.telefono} onChange={(v) => set('telefono', v)} />
          <Campo label="Correo electrónico" type="email" value={form.email} onChange={(v) => set('email', v)} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-neutral-700">El reclamo es sobre</span>
            <select
              value={form.bienTipo}
              onChange={(e) => set('bienTipo', e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-ink"
            >
              <option>Producto</option>
              <option>Servicio</option>
            </select>
          </label>
          <Campo
            label="¿Cuál? (opcional)"
            value={form.bienDescripcion}
            onChange={(v) => set('bienDescripcion', v)}
            placeholder="Ej. Tarima Clásica Tapizada, o código de pedido ED-XXXX"
          />
          <Campo
            label="Monto reclamado en S/ (opcional)"
            value={form.montoReclamado}
            onChange={(v) => set('montoReclamado', v.replace(/[^\d.,]/g, '').slice(0, 12))}
            placeholder="Ej. 220.00"
          />
        </div>

        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2 text-neutral-700">
            <input type="checkbox" checked={form.menorDeEdad} onChange={(e) => set('menorDeEdad', e.target.checked)} className="h-4 w-4" />
            Soy menor de edad
          </label>
          {form.menorDeEdad && (
            <Campo label="Nombre del padre o la madre" value={form.padreMadre} onChange={(v) => set('padreMadre', v)} full />
          )}
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Detalle</span>
          <textarea
            value={form.detalle}
            onChange={(e) => set('detalle', e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
            placeholder="Cuéntanos qué pasó"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-neutral-700">¿Qué solicitas? (opcional)</span>
          <textarea
            value={form.pedido}
            onChange={(e) => set('pedido', e.target.value)}
            rows={2}
            maxLength={1000}
            className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
            placeholder="Ej. cambio, devolución, reparación"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-neutral-700">¿Cómo quieres recibir la respuesta?</span>
          <select
            value={form.respuestaPor}
            onChange={(e) => set('respuestaPor', e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-ink"
          >
            <option>Correo electrónico</option>
            <option>Carta a mi domicilio</option>
          </select>
        </label>

        <ul className="space-y-1 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
          {LEYENDAS_RECLAMO.map((l) => (
            <li key={l}>* {l}</li>
          ))}
        </ul>

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={enviando || !completo}
          className="w-full rounded-lg bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {enviando ? 'Enviando...' : `Registrar ${form.tipo.toLowerCase()}`}
        </button>
      </form>
    </main>
  );
}

function Campo({ label, value, onChange, type = 'text', placeholder, full = false }) {
  return (
    <label className={`text-sm ${full ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block font-medium text-neutral-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
      />
    </label>
  );
}

/** La hoja tal como la registró el consumidor, con los datos del proveedor y las leyendas: es su copia. */
function HojaDeReclamacion({ form, registrado, storeConfig }) {
  const fecha = new Date(registrado.fecha).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'long', timeStyle: 'short' });
  const fila = (k, v) =>
    v ? (
      <p>
        <span className="text-neutral-500">{k}:</span> {v}
      </p>
    ) : null;
  return (
    <div className="space-y-3 text-left text-sm text-neutral-800">
      <div className="flex flex-wrap justify-between gap-2 border-b border-neutral-200 pb-2">
        <p className="font-semibold">LIBRO DE RECLAMACIONES — HOJA DE RECLAMACIÓN</p>
        <p className="font-mono">N.° {registrado.folio}</p>
      </div>
      <p className="text-xs text-neutral-500">Fecha: {fecha}</p>
      <div className="text-xs">
        {fila('Proveedor', storeConfig.razonSocial)}
        {fila('RUC', storeConfig.ruc)}
        {fila('Domicilio', storeConfig.direccionFiscal)}
      </div>
      <div>
        <p className="font-medium">1. Identificación del consumidor reclamante</p>
        {fila('Nombre', form.nombre)}
        {fila('Domicilio', form.domicilio)}
        {fila(form.tipoDocumento, form.numeroDocumento)}
        {fila('Teléfono / correo', `${form.telefono} / ${form.email}`)}
        {form.menorDeEdad && fila('Padre o madre', form.padreMadre)}
      </div>
      <div>
        <p className="font-medium">2. Identificación del bien contratado</p>
        {fila('Tipo', form.bienTipo)}
        {fila('Monto reclamado', form.montoReclamado && `S/ ${form.montoReclamado}`)}
        {fila('Descripción', form.bienDescripcion)}
      </div>
      <div>
        <p className="font-medium">3. Detalle de la reclamación y pedido del consumidor</p>
        {fila('Tipo', form.tipo)}
        {fila('Detalle', form.detalle)}
        {fila('Pedido', form.pedido)}
        {fila('Respuesta por', form.respuestaPor)}
      </div>
      <ul className="space-y-1 border-t border-neutral-200 pt-2 text-xs text-neutral-500">
        {LEYENDAS_RECLAMO.map((l) => (
          <li key={l}>* {l}</li>
        ))}
      </ul>
    </div>
  );
}
