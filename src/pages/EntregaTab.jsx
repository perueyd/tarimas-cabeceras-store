import { useState } from 'react';
import {
  REGLAS_DE_FABRICA,
  horaLegible,
  limpiarRegla,
  reglasDeEntrega,
  respuestaDeEntrega,
  textoDePlazo,
} from '../lib/entrega.js';

const HORAS_CORTE = [6, 7, 8, 9, 10, 11, 12];
const HORAS_REPARTO = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

// Lo que se edita: las reglas vigentes; un tipo sin regla propia queda en null.
function reglasGuardables(cfg) {
  const reglas = reglasDeEntrega(cfg);
  for (const clave of Object.keys(REGLAS_DE_FABRICA)) if (!reglas[clave]) reglas[clave] = null;
  return reglas;
}

export default function EntregaTab({ catalog, api, flash }) {
  const cfg = catalog.storeConfig || {};
  // Una fila por tipo de producto del catálogo, y la general al final.
  const filasDeReglas = [
    ...(catalog.categories || []).map((c) => ({ id: c.id, nombre: c.label || c.name || c.id })),
    { id: 'general', nombre: 'General' },
  ];
  // Para la pregunta frecuente y CHAT-ED solo cuentan los tipos que de verdad se venden.
  const conProductos = new Set((catalog.products || []).filter((p) => !p.oculto && !p.esServicio).map((p) => p.category));
  const categoriasALaVenta = filasDeReglas.filter((f) => conProductos.has(f.id)).map((f) => ({ id: f.id, label: f.nombre }));
  const [data, setData] = useState({
    reglasEntrega: reglasGuardables(cfg),
    pesoEnvio: cfg.pesoEnvio || '',
    deliveryMinDays: cfg.deliveryMinDays || 4,
    envioTexto: cfg.envioTexto ?? '',
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

  function usarGeneral(id, si) {
    const propia = REGLAS_DE_FABRICA[id] || data.reglasEntrega.general;
    setData({ ...data, reglasEntrega: { ...data.reglasEntrega, [id]: si ? null : { ...propia } } });
  }

  function cambiarRegla(id, campo, valor) {
    setData({ ...data, reglasEntrega: { ...data.reglasEntrega, [id]: { ...data.reglasEntrega[id], [campo]: valor } } });
  }

  // Lo que se guarda: cada regla limpia, y null en los tipos que usan la general.
  function reglasAGuardar() {
    const fuera = {};
    for (const [id, regla] of Object.entries(data.reglasEntrega)) fuera[id] = regla ? limpiarRegla(regla) : null;
    fuera.general = limpiarRegla(data.reglasEntrega.general || {});
    return fuera;
  }

  const respuestaFrecuente = respuestaDeEntrega(reglasDeEntrega({ reglasEntrega: reglasAGuardar() }), categoriasALaVenta);

  async function ponerEnPreguntasFrecuentes() {
    const faq = [...(cfg.faq || [])];
    const i = faq.findIndex((f) => /demora|tarda|cu[aá]ndo llega|plazo|entrega/i.test(f.q || f.pregunta || ''));
    if (i >= 0) faq[i] = { ...faq[i], a: respuestaFrecuente };
    else faq.push({ q: '¿Cuánto demora la entrega?', a: respuestaFrecuente });
    setSaving(true);
    try {
      await api('POST', 'config', { ...data, reglasEntrega: reglasAGuardar(), faq });
      flash('Reglas guardadas y pregunta frecuente actualizada.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function guardar() {
    setSaving(true);
    try {
      await api('POST', 'config', { ...data, reglasEntrega: reglasAGuardar() });
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
        <h3 className="mb-1 text-lg font-semibold">Cuándo se entrega cada tipo de producto</h3>
        <p className="mb-4 text-sm text-neutral-600">
          De aquí salen la fecha más cercana que se ofrece al pagar, lo que dice cada ficha y lo que contesta
          CHAT-ED. Debajo de cada regla ves la frase exacta que lee el cliente.
        </p>
        <div className="space-y-3">
          {filasDeReglas.map(({ id, nombre }) => {
            const general = id === 'general';
            const usaGeneral = !general && !data.reglasEntrega[id];
            const regla = usaGeneral ? data.reglasEntrega.general : data.reglasEntrega[id];
            return (
              <div key={id} className="rounded-xl border border-neutral-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{general ? 'Regla general (lo que no tiene regla propia)' : nombre}</p>
                  {!general && (
                    <label className="flex items-center gap-2 text-xs text-neutral-600">
                      <input type="checkbox" checked={usaGeneral} onChange={(e) => usarGeneral(id, e.target.checked)} className="h-4 w-4" />
                      Usa la regla general
                    </label>
                  )}
                </div>
                {!usaGeneral && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-1 block text-neutral-700">Entra para HOY si lo piden hasta las</span>
                      <select
                        value={regla.corte ?? ''}
                        onChange={(e) => cambiarRegla(id, 'corte', e.target.value === '' ? null : Number(e.target.value))}
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                      >
                        <option value="">No hay entrega el mismo día</option>
                        {HORAS_CORTE.map((h) => <option key={h} value={h}>{horaLegible(h)}</option>)}
                      </select>
                    </label>
                    {regla.corte !== null && (
                      <label className="text-sm">
                        <span className="mb-1 block text-neutral-700">Hoy se reparte desde las</span>
                        <select
                          value={regla.desde}
                          onChange={(e) => cambiarRegla(id, 'desde', Number(e.target.value))}
                          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                        >
                          {HORAS_REPARTO.map((h) => <option key={h} value={h}>{horaLegible(h)}</option>)}
                        </select>
                      </label>
                    )}
                    {regla.corte !== null && (
                      <label className="flex items-start gap-2 text-sm sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={!regla.seguro}
                          onChange={(e) => cambiarRegla(id, 'seguro', !e.target.checked)}
                          className="mt-0.5 h-4 w-4"
                        />
                        <span>Lo de hoy depende de la disponibilidad del taller (se le confirma al cliente por WhatsApp)</span>
                      </label>
                    )}
                    <label className="text-sm sm:col-span-2">
                      <span className="mb-1 block text-neutral-700">Si hay muchos pedidos, puede demorar (déjalo vacío si no)</span>
                      <input
                        value={regla.demora}
                        onChange={(e) => cambiarRegla(id, 'demora', e.target.value)}
                        maxLength={40}
                        placeholder="ej. 1 a 3 días"
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                      />
                    </label>
                  </div>
                )}
                <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                  El cliente lee: «{textoDePlazo(limpiarRegla(regla))}»
                </p>
              </div>
            );
          })}
        </div>

        {/* La pregunta frecuente es texto libre: se quedó diciendo la regla vieja
            («hasta las 8 a. m.» para todo) y CHAT-ED la repetía. Un botón la pone
            al día con lo de arriba, sin tener que redactarla. */}
        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <p className="font-medium">Pregunta frecuente «¿Cuánto demora la entrega?»</p>
          <p className="mt-1 whitespace-pre-line text-xs">{respuestaFrecuente}</p>
          <button
            type="button"
            onClick={ponerEnPreguntasFrecuentes}
            disabled={saving}
            className="mt-3 rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-medium hover:border-ink disabled:opacity-60"
          >
            Guardar las reglas y usar este texto en las preguntas frecuentes
          </button>
        </div>

        <label className="mt-6 block">
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
        <label className="mt-3 block">
          <span className="text-sm font-medium text-neutral-700">Costo del envío (lo lee el cliente en el carrito)</span>
          <input
            type="text"
            maxLength="120"
            value={data.envioTexto}
            onChange={(e) => setData({ ...data, envioTexto: e.target.value })}
            placeholder="Ej. Envío incluido en Lima Metropolitana"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-neutral-500">
            Déjalo vacío y no se muestra nada. El día que cobres envío, cámbialo aquí
            — por ejemplo «Envío S/ 20 en Lima · provincia se cotiza».
          </span>
        </label>
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
