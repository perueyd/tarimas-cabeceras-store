import { useEffect, useState } from 'react';
import { useCatalog } from '../context/CatalogContext.jsx';
import { SITIO_URL } from '../data/sitio.js';
import { diaLima } from '../lib/lima.js';
import { vencida } from '../lib/vencimiento.js';
import { fechaCorta, textoDeOferta } from '../lib/live.js';

// El live, visto por el dueño.
//
// Desde aquí enciende y apaga la página /live, elige qué código de descuento
// se entrega a quien se registra, y ve la lista de registrados (nombre y
// WhatsApp) para escribirles después.
//
// Está pensado para usarse CON PRISA, a punto de salir en vivo o ya en vivo:
// el estado se ve grande, y encender son dos toques (elegir código, encender).

const CODIGO_NUEVO = { code: '', tipo: 'porcentaje', valor: 10, maxUsos: '', vence: '' };

function fechaLima(iso) {
  // Las fechas llegan en UTC y el dueño está en Lima: sin la zona, un registro
  // de las 8 de la noche saldría con fecha del día siguiente.
  try {
    return new Date(iso).toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function resumenDeCodigo(c) {
  const partes = [textoDeOferta(c)];
  if (c.vence) partes.push(`vence ${fechaCorta(c.vence)}`);
  if (c.maxUsos) partes.push(`${c.usados || 0} de ${c.maxUsos} usos`);
  return `${c.code} — ${partes.filter(Boolean).join(' · ')}`;
}

function sePuedeUsar(c) {
  if (!c.activo) return false;
  if (c.vence && vencida(c.vence)) return false;
  if (c.maxUsos && (c.usados || 0) >= c.maxUsos) return false;
  return true;
}

function descargarRegistrados(registrados) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = registrados.map((r) => [
    r.nombre,
    r.whatsapp,
    fechaLima(r.fecha),
    r.live || '',
    r.promos ? 'Sí' : 'No',
  ]);
  const cabecera = ['Nombre', 'WhatsApp', 'Fecha', 'Live', 'Aceptó recibir ofertas'];
  const csv = '﻿' + [cabecera, ...filas].map((f) => f.map(esc).join(';')).join('\n');
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  enlace.download = `registrados-live-${diaLima()}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

export default function LiveTab({ adminKey, onIr }) {
  const { storeConfig } = useCatalog();
  const [config, setConfig] = useState(null);
  const [registrados, setRegistrados] = useState([]);
  const [codigos, setCodigos] = useState([]);
  const [form, setForm] = useState({ titulo: '', descripcion: '', proximo: '', codigo: '' });
  const [nuevo, setNuevo] = useState(null); // formulario de código nuevo, o null
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [soloEsteLive, setSoloEsteLive] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const cabeceras = { Authorization: `Bearer ${adminKey}` };

  async function pedir(url, opciones = {}) {
    const res = await fetch(url, {
      ...opciones,
      headers: { ...cabeceras, ...(opciones.body ? { 'Content-Type': 'application/json' } : {}) },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'No se pudo completar.');
    return data;
  }

  async function cargar({ conservarFormulario = false } = {}) {
    try {
      const [live, promo] = await Promise.all([pedir('/api/live'), pedir('/api/promo')]);
      setConfig(live.config);
      setRegistrados(live.registrados || []);
      setCodigos(promo.codes || []);
      if (!conservarFormulario) {
        setForm({
          titulo: live.config.titulo || '',
          descripcion: live.config.descripcion || '',
          proximo: live.config.proximo || '',
          codigo: live.config.codigo || '',
        });
      }
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Con el live encendido la lista se refresca sola: el dueño está hablando a
  // la cámara y no puede andar tocando "actualizar" para ver cuántos van.
  useEffect(() => {
    if (!config?.activo) return undefined;
    const reloj = setInterval(() => cargar({ conservarFormulario: true }), 20000);
    return () => clearInterval(reloj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.activo]);

  function avisar(texto) {
    setAviso(texto);
    setTimeout(() => setAviso((a) => (a === texto ? '' : a)), 4000);
  }

  async function guardar(activo) {
    setOcupado(true);
    setError('');
    try {
      const data = await pedir('/api/live?accion=config', {
        method: 'POST',
        body: JSON.stringify({ ...form, activo }),
      });
      setConfig(data.config);
      avisar(activo ? (config?.activo ? 'Cambios guardados. El live sigue encendido.' : '🔴 Live encendido.') : config?.activo ? 'Live apagado.' : 'Guardado.');
      await cargar({ conservarFormulario: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  async function crearCodigo() {
    setOcupado(true);
    setError('');
    try {
      const data = await pedir('/api/promo', { method: 'POST', body: JSON.stringify({ ...nuevo, activo: true }) });
      setCodigos(data.codes || []);
      const creado = String(nuevo.code).trim().toUpperCase().replace(/\s+/g, '');
      setForm((f) => ({ ...f, codigo: creado }));
      setNuevo(null);
      avisar(`Código ${creado} creado y elegido para el live.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  async function borrarUno(r) {
    if (!window.confirm(`¿Borrar a ${r.nombre} (${r.whatsapp}) de la lista? No se puede deshacer.`)) return;
    try {
      await pedir(`/api/live?whatsapp=${encodeURIComponent(r.whatsapp)}`, { method: 'DELETE' });
      await cargar({ conservarFormulario: true });
      avisar('Registro borrado.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function vaciar() {
    if (!window.confirm(`¿Borrar los ${registrados.length} registrados? Descarga la lista antes si la necesitas: no se puede deshacer.`)) return;
    try {
      await pedir('/api/live?todos=1', { method: 'DELETE' });
      await cargar({ conservarFormulario: true });
      avisar('Lista vaciada.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(`${SITIO_URL}/live`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sin permiso para el portapapeles: el enlace está escrito al lado.
    }
  }

  if (!config) {
    return <p className="text-sm text-neutral-500">{error || 'Cargando…'}</p>;
  }

  const usables = codigos.filter(sePuedeUsar);
  const elegido = codigos.find((c) => c.code === form.codigo);
  const delLive = registrados.filter((r) => r.liveId && r.liveId === config.liveId);
  const visibles = soloEsteLive && config.activo ? delLive : registrados;
  // La política de privacidad guardada manda sobre la del proyecto. Si es una
  // versión anterior a esta pestaña, no menciona el registro del live, y
  // recoger datos que la política no declara es justo lo que se sanciona.
  const politica = storeConfig.legal?.privacidadTexto || '';
  const politicaDesfasada = Boolean(politica) && !/transmisi[oó]n(es)? en vivo|live/i.test(politica);
  const campo = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink';

  return (
    <div>
      {/* ===== Estado, bien grande ===== */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 p-5 ${
          config.activo ? 'border-red-500 bg-red-50' : 'border-neutral-200 bg-neutral-50'
        }`}
      >
        <div>
          <p className={`text-xl font-bold ${config.activo ? 'text-red-700' : 'text-neutral-700'}`}>
            {config.activo ? '🔴 El live está ENCENDIDO' : 'El live está apagado'}
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            {config.activo
              ? `Quien entra a la página se registra y ve el código ${config.codigo}. Van ${delLive.length} ${delLive.length === 1 ? 'registrado' : 'registrados'} en este live.`
              : 'La página dice «ahora no estamos en vivo» y no entrega ningún código.'}
          </p>
        </div>
        {config.activo ? (
          <button
            type="button"
            onClick={() => guardar(false)}
            disabled={ocupado}
            className="rounded-xl border-2 border-neutral-900 bg-white px-6 py-3 text-sm font-bold transition hover:bg-neutral-100 disabled:opacity-60"
          >
            Apagar el live
          </button>
        ) : (
          <button
            type="button"
            onClick={() => guardar(true)}
            disabled={ocupado || !form.codigo}
            title={form.codigo ? '' : 'Elige primero el código de descuento'}
            className="rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            🔴 Encender el live
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
        <span>La dirección que dices en la transmisión:</span>
        <code className="rounded bg-white px-2 py-1 font-mono text-sm">{SITIO_URL.replace(/^https?:\/\//, '')}/live</code>
        <button type="button" onClick={copiarEnlace} className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 font-medium hover:border-ink">
          {copiado ? '✓ Copiado' : 'Copiar enlace'}
        </button>
        <a href="/live" target="_blank" rel="noreferrer" className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 font-medium hover:border-ink">
          Ver la página ↗
        </a>
      </div>

      {politicaDesfasada && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          ⚠️ Tu política de privacidad publicada no menciona el registro del live. Antes de encenderlo, ve a{' '}
          <button type="button" onClick={() => onIr?.('editar')} className="font-semibold underline">
            Editar página
          </button>{' '}
          → Ajustes delicados → Legal y pulsa el botón para usar el texto recomendado.
        </div>
      )}

      {error && <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      {aviso && <p className="mt-3 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">{aviso}</p>}

      {/* ===== Qué se ofrece ===== */}
      <div className="mt-6 rounded-xl border border-neutral-200 p-4 sm:p-5">
        <p className="text-sm font-semibold">La oferta de este live</p>

        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Código de descuento que se entrega</span>
          <select value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className={campo}>
            <option value="">— Elige un código —</option>
            {usables.map((c) => (
              <option key={c.code} value={c.code}>
                {resumenDeCodigo(c)}
              </option>
            ))}
            {/* El que estaba elegido se sigue enseñando aunque ya no sirva,
                para que se vea POR QUÉ el live no enciende. */}
            {elegido && !sePuedeUsar(elegido) && (
              <option value={elegido.code}>{resumenDeCodigo(elegido)} — YA NO SE PUEDE USAR</option>
            )}
          </select>
        </label>
        {elegido && !sePuedeUsar(elegido) && (
          <p className="mt-1 text-xs text-red-600">
            Ese código está desactivado, vencido o sin usos. Elige otro o crea uno nuevo.
          </p>
        )}

        {nuevo ? (
          <div className="mt-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-3">
            <p className="text-xs font-medium text-neutral-700">Código nuevo para el live</p>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <label className="col-span-2 text-xs sm:col-span-1">
                <span className="mb-1 block text-neutral-600">Código</span>
                <input
                  value={nuevo.code}
                  onChange={(e) => setNuevo({ ...nuevo, code: e.target.value.toUpperCase() })}
                  placeholder="LIVE15"
                  className={campo}
                />
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-neutral-600">Descuento</span>
                <select value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })} className={campo}>
                  <option value="porcentaje">% del total</option>
                  <option value="monto">Soles fijos</option>
                </select>
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-neutral-600">{nuevo.tipo === 'monto' ? 'Soles' : 'Porcentaje'}</span>
                <input type="number" min="1" value={nuevo.valor} onChange={(e) => setNuevo({ ...nuevo, valor: e.target.value })} className={campo} />
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-neutral-600">Válido hasta</span>
                <input type="date" min={diaLima()} value={nuevo.vence} onChange={(e) => setNuevo({ ...nuevo, vence: e.target.value })} className={campo} />
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-neutral-600">Máx. de compras</span>
                <input type="number" min="1" value={nuevo.maxUsos} onChange={(e) => setNuevo({ ...nuevo, maxUsos: e.target.value })} placeholder="sin tope" className={campo} />
              </label>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Vale hasta el final del día que pongas (hora de Lima). El tope cuenta compras hechas con el código, no
              registros.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={crearCodigo}
                disabled={ocupado || !nuevo.code.trim()}
                className="rounded-lg bg-ink px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                Crear y elegir
              </button>
              <button type="button" onClick={() => setNuevo(null)} className="rounded-lg border border-neutral-300 px-4 py-2 text-xs hover:border-ink">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNuevo({ ...CODIGO_NUEVO, vence: diaLima() })}
            className="mt-2 text-xs font-medium underline"
          >
            + Crear un código nuevo para este live
          </button>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-neutral-700">Título de la página (opcional)</span>
            <input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Oferta del live"
              maxLength={80}
              className={campo}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-neutral-700">Texto bajo el título (opcional)</span>
            <input
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Regístrate y mira al instante la oferta de esta transmisión."
              maxLength={300}
              className={campo}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-neutral-700">Qué decir cuando NO hay live (opcional)</span>
            <input
              value={form.proximo}
              onChange={(e) => setForm({ ...form, proximo: e.target.value })}
              placeholder="ej. Próximo live: sábado 8 pm por TikTok."
              maxLength={160}
              className={campo}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => guardar(config.activo)}
          disabled={ocupado}
          className="mt-4 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:border-ink disabled:opacity-60"
        >
          Guardar cambios
        </button>
      </div>

      {/* ===== Registrados ===== */}
      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">
              Registrados <span className="font-normal text-neutral-400">({visibles.length})</span>
            </p>
            <p className="text-xs text-neutral-500">Se borran solos al cumplir un año.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {config.activo && (
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={soloEsteLive} onChange={(e) => setSoloEsteLive(e.target.checked)} />
                Solo los de este live
              </label>
            )}
            <button type="button" onClick={() => cargar({ conservarFormulario: true })} className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:border-ink">
              Actualizar
            </button>
            {registrados.length > 0 && (
              <>
                <button type="button" onClick={() => descargarRegistrados(visibles)} className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:border-ink">
                  Descargar lista
                </button>
                <button type="button" onClick={vaciar} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-red-600 hover:border-red-400">
                  Vaciar lista
                </button>
              </>
            )}
          </div>
        </div>

        {/* El permiso para escribirle por OTRAS ofertas es aparte del registro.
            Se dice aquí, encima de la lista, porque es donde el dueño decide
            a quién le escribe. */}
        <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
          Puedes escribirles a todos por la oferta de su live. Para avisar de <strong>otras</strong> ofertas, solo a
          quienes dicen «Sí» en la última columna: son los que lo aceptaron. Si alguien te pide que borres sus datos,
          usa «Borrar» en su fila.
        </p>

        {visibles.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            Todavía no hay registrados.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs text-neutral-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Nombre</th>
                  <th className="px-3 py-2 font-medium">WhatsApp</th>
                  <th className="px-3 py-2 font-medium">Cuándo</th>
                  <th className="px-3 py-2 font-medium">¿Acepta otras ofertas?</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {visibles.map((r) => (
                  <tr key={`${r.liveId}-${r.whatsapp}-${r.fecha}`}>
                    <td className="px-3 py-2">{r.nombre}</td>
                    <td className="px-3 py-2">
                      <a href={`https://wa.me/51${r.whatsapp}`} target="_blank" rel="noreferrer" className="font-medium underline">
                        {r.whatsapp}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-neutral-500">{fechaLima(r.fecha)}</td>
                    <td className="px-3 py-2">{r.promos ? 'Sí' : 'No'}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => borrarUno(r)} className="text-xs text-red-600 hover:underline">
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
