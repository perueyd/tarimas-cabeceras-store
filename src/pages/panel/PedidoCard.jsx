// La ficha de un pedido: lo que el dueño mira para confirmar un pago, apuntar
// una entrega y emitir el comprobante.
//
// Es la pieza más usada del panel —se abre decenas de veces al día— y por eso
// tiene su propio archivo en vez de vivir perdida en medio de la página.

import { useEffect, useState } from 'react';
import { urlSeguimiento } from '../../data/sitio.js';
import { etiquetaComprobante } from '../../lib/documento.js';
import { separarIGV } from '../../lib/igv.js';
import { calendarUrl } from './descargas.js';

// Campo "Referencia (WSP)" de cada pedido.
//
// Antes escribía directo con onChange, o sea que mandaba un PATCH al servidor
// POR CADA TECLA. Cada respuesta reescribía la lista de pedidos, y al escribir
// rápido las letras se perdían o el cursor saltaba. Ahora se escribe en local y
// se guarda al salir del campo o al pulsar Enter.
export function CampoReferencia({ o, onUpdate }) {
  const [valor, setValor] = useState(o.referencia || '');
  const [guardado, setGuardado] = useState(false);

  // Si el pedido cambia desde fuera (recarga automática), se refresca el campo
  // salvo que se esté escribiendo en él.
  useEffect(() => {
    setValor(o.referencia || '');
  }, [o.referencia]);

  function guardar() {
    const limpio = valor.trim();
    if (limpio === (o.referencia || '')) return;
    onUpdate(o, { referencia: limpio });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 1500);
  }

  return (
    <span className="relative inline-flex items-center">
      <input
        type="text"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
          if (e.key === 'Escape') setValor(o.referencia || '');
        }}
        placeholder="Ej: #1, cliente123, ref001"
        maxLength="60"
        title="Se guarda al salir del campo o al pulsar Enter"
        className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-ink"
      />
      {guardado && <span className="ml-1 text-xs text-green-600">✓</span>}
    </span>
  );
}

export function PedidoCard({ o, onUpdate, onReemplazar, adminKey, onDelete, currencyFormatter, getColorById, getSizeById }) {
  const cal = calendarUrl(o, currencyFormatter);
  const tel = (o.telefono || '').replace(/\D/g, '');
  const waMsg = encodeURIComponent(
    `Hola ${o.nombre}, te escribimos de E|D Espacios y Diseño sobre tu pedido *${o.code}*.\nEstado actual: ${o.estado}.\nPuedes rastrearlo aquí: ${urlSeguimiento(o.code)}`
  );
  const wa = tel ? `https://wa.me/${tel.startsWith('51') ? tel : '51' + tel}?text=${waMsg}` : null;
  const badge =
    o.estado === 'Pagado'
      ? 'bg-green-100 text-green-800'
      : o.estado === 'Entregado'
        ? 'bg-sky-100 text-sky-800'
        : o.estado === 'Cancelado'
          ? 'bg-red-100 text-red-700'
          : 'bg-amber-100 text-amber-800';
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm font-semibold">{o.code}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge}`}>
          {o.estado} · {o.metodo}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <p><span className="text-neutral-500">Cliente:</span> {o.nombre} · {o.telefono}</p>
        <p><span className="text-neutral-500">Monto:</span> {currencyFormatter.format(o.monto)}</p>
        <p><span className="text-neutral-500">Entrega:</span> {o.entrega || '—'}</p>
        <p><span className="text-neutral-500">Fecha:</span> {new Date(o.fecha).toLocaleString('es-PE')}</p>
        <p className="sm:col-span-2"><span className="text-neutral-500">Dirección:</span> {o.direccion || '—'} ({o.zona})</p>
      </div>

      {/* Todo lo que hace falta para emitir el comprobante en SUNAT, junto y
          listo para copiar. Sin esto había que ir sacando los datos de cuatro
          sitios de la pantalla y calcular el IGV a mano — que es justo donde se
          cuela el error de sacar el 18% del total en vez de separarlo. */}
      <BloqueComprobante o={o} currencyFormatter={currencyFormatter} />
      <ComprobanteElectronico o={o} adminKey={adminKey} onReemplazar={onReemplazar} />
      {o.referencia && (
        <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-700">📱 <strong>Referencia:</strong> {o.referencia}</p>
        </div>
      )}
      {o.items?.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-3 text-xs text-neutral-600">
          {o.items.map((i, idx) => (
            <li key={idx}>
              • {i.productName} x{i.qty} — {getSizeById(i.sizeId)?.label || i.sizeId},{' '}
              {getColorById(i.colorId)?.label || i.colorId}
              {i.colorId2 && ` + ${getColorById(i.colorId2)?.label || i.colorId2}`}
              {i.opciones?.length > 0 && `, ${i.opciones.map((o) => `${o.label}: ${o.valor}`).join(', ')}`}
              {' — '}{currencyFormatter.format(i.unitPrice * i.qty)}
            </li>
          ))}
        </ul>
      )}
      {/* Acciones rápidas de productividad */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 text-xs">
        <label className="flex items-center gap-1.5">
          <span className="text-neutral-500">Estado:</span>
          <select
            value={o.estado}
            onChange={(e) => onUpdate(o, { estado: e.target.value })}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 outline-none focus:border-ink"
          >
            <option>Pago por verificar</option>
            <option>Pagado</option>
            <option>Entregado</option>
            <option>Cancelado</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-neutral-500">Método:</span>
          <select
            value={o.metodo}
            onChange={(e) => onUpdate(o, { metodo: e.target.value })}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 outline-none focus:border-ink"
          >
            <option>Yape</option>
            <option>Plin</option>
            <option>Transferencia bancaria</option>
            <option>Tarjeta/Yape (Culqi)</option>
            {/* Solo para pedidos antiguos, de cuando Yape y Plin iban juntos. */}
            {o.metodo === 'Yape/Plin' && <option>Yape/Plin</option>}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-neutral-500">Referencia (WSP):</span>
          <CampoReferencia o={o} onUpdate={onUpdate} />
        </label>
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="rounded-lg bg-[#25D366] px-3 py-1.5 font-medium text-white hover:opacity-90">
            WhatsApp al cliente
          </a>
        )}
        {cal && (
          <a href={cal} target="_blank" rel="noreferrer" className="rounded-lg border border-neutral-300 px-3 py-1.5 font-medium hover:border-ink">
            📅 Agendar en Google Calendar
          </a>
        )}
        {o.ubicacion && (
          <a href={o.ubicacion} target="_blank" rel="noreferrer" className="rounded-lg border border-neutral-300 px-3 py-1.5 font-medium hover:border-ink">
            📍 Mapa
          </a>
        )}
        <button
          onClick={() => onDelete(o)}
          className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 font-medium text-red-600 hover:bg-red-50"
        >
          🗑️ Eliminar pedido
        </button>
      </div>
    </div>
  );
}

// Los datos del pedido tal como hacen falta para emitir la boleta o la
// factura en el portal de SUNAT: documento del cliente, base, IGV y total.
//
// El botón copia las cuatro líneas de una vez. Parece poca cosa, pero es la
// diferencia entre emitir el comprobante en veinte segundos o ir saltando por
// la pantalla a buscar cada dato — que es como se cometen los errores.
export function BloqueComprobante({ o, currencyFormatter }) {
  const [copiado, setCopiado] = useState(false);

  // Los pedidos anteriores a esta función no tienen el desglose guardado, así
  // que se calcula al vuelo. Los nuevos lo traen hecho desde el servidor.
  const base = o.base ?? separarIGV(o.monto).base;
  const igv = o.igv ?? separarIGV(o.monto).igv;
  const etiqueta = etiquetaComprobante({ tipo: o.docTipo, numero: o.docNumero, razonSocial: o.razonSocial });

  function copiar() {
    const lineas = [
      `${o.docTipo === 'factura' ? 'FACTURA' : 'BOLETA'} — pedido ${o.code}`,
      o.docTipo === 'factura'
        ? `RUC: ${o.docNumero}
Razón social: ${o.razonSocial || ''}`
        : `DNI: ${o.docNumero}
Nombre: ${o.nombre}`,
      `Base imponible: S/ ${base.toFixed(2)}`,
      `IGV (18%): S/ ${igv.toFixed(2)}`,
      `Total: S/ ${Number(o.monto || 0).toFixed(2)}`,
    ].join('\n');
    navigator.clipboard?.writeText(lineas).then(
      () => { setCopiado(true); setTimeout(() => setCopiado(false), 2500); },
      () => {}
    );
  }

  if (!o.docNumero) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-neutral-300 px-3 py-2">
        <p className="text-xs text-neutral-500">
          Este pedido no trae DNI ni RUC: pídeselo al cliente por WhatsApp antes de emitir el
          comprobante. Los pedidos nuevos ya lo piden solos.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-neutral-700">Para el comprobante</p>
        <button
          onClick={copiar}
          className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-medium transition hover:border-ink"
        >
          {copiado ? '✓ Copiado' : 'Copiar para SUNAT'}
        </button>
      </div>
      <p className="mt-1 text-xs text-neutral-600">{etiqueta}</p>
      <p className="mt-0.5 text-xs text-neutral-500">
        Base {currencyFormatter.format(base)} · IGV {currencyFormatter.format(igv)} · Total{' '}
        {currencyFormatter.format(o.monto)}
      </p>
    </div>
  );
}

// La boleta o factura electrónica del pedido (facturador propio). Aparece
// cuando el pedido está cobrado: muestra el número, descarga el PDF y, si algo
// falló, permite emitirla de nuevo (nunca sale dos veces el mismo pedido).
// Lo que respondió SUNAT, en palabras del dueño (los códigos vienen del facturador).
export const ESTADO_SUNAT = {
  ACEPTADO: '✅ aceptada por SUNAT',
  ACEPTADO_OBS: '✅ aceptada por SUNAT (con observaciones)',
  PENDIENTE_ENVIO: '⏳ en cola: se envía a SUNAT sola',
  EMITIDO_LOCAL: '⏳ en cola: se envía a SUNAT sola',
  RECHAZADO: '❌ rechazada por SUNAT',
  ANULACION_EN_PROCESO: 'anulación en proceso',
  ANULADO: 'anulada',
};

export function ComprobanteElectronico({ o, adminKey, onReemplazar }) {
  const [ocupado, setOcupado] = useState(false);
  const cobrado = o.estado === 'Pagado' || o.estado === 'Entregado';
  const c = o.comprobante;
  if (!cobrado && !c) return null;

  async function emitir() {
    setOcupado(true);
    try {
      const res = await fetch('/api/comprobante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({ code: o.code }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.order) onReemplazar(data.order);
      else alert(data.error || 'No se pudo emitir.');
    } finally {
      setOcupado(false);
    }
  }

  async function verPdf(formato) {
    // Se descarga con la clave del panel y se abre aquí mismo: la llave del
    // facturador nunca llega al navegador.
    const ventana = window.open('', '_blank');
    const res = await fetch(`/api/comprobante?code=${encodeURIComponent(o.code)}&formato=${formato}`, {
      headers: { Authorization: `Bearer ${adminKey}` },
    });
    if (!res.ok) {
      ventana?.close();
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'No se pudo descargar el PDF.');
      return;
    }
    const url = URL.createObjectURL(await res.blob());
    if (ventana) ventana.location.href = url;
    else window.location.href = url;
  }

  // Rechazada: no vale. Se muestra por qué y se deja emitir otra (con número
  // nuevo) después de corregir el DNI o RUC del pedido.
  //
  // Va ANTES del caso normal de abajo: si no, una rechazada se enseñaría en
  // verde como si estuviera bien.
  if (c?.numero && c.estado === 'RECHAZADO') {
    return (
      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs">
        <p className="text-red-700">
          🧾 SUNAT rechazó la {c.numero.startsWith('F') ? 'factura' : 'boleta'} {c.numero}
          {c.motivo ? `: ${c.motivo}` : '.'}
        </p>
        <p className="mt-1 text-red-700">
          No tiene valor. Corrige los datos del cliente si hace falta y emite una nueva (saldrá
          con otro número).
        </p>
        <button
          onClick={emitir}
          disabled={ocupado}
          className="mt-2 rounded-lg bg-ink px-3 py-1.5 font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {ocupado ? 'Emitiendo...' : 'Emitir una nueva'}
        </button>
      </div>
    );
  }

  if (c?.numero) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs">
        <span className="font-medium text-green-800">
          🧾 {c.numero.startsWith('F') ? 'Factura' : 'Boleta'} {c.numero}
        </span>
        <span className="text-green-700">· {ESTADO_SUNAT[c.estado] || c.estado || '—'}</span>
        <button onClick={emitir} disabled={ocupado} title="Consultar el estado actual en SUNAT" className="text-green-700 hover:underline disabled:opacity-60">
          {ocupado ? '...' : '↻ actualizar'}
        </button>
        <button onClick={() => verPdf('A4')} className="rounded-lg border border-green-300 bg-white px-2.5 py-1 font-medium hover:border-green-600">
          PDF A4
        </button>
        <button onClick={() => verPdf('TICKET_80')} className="rounded-lg border border-green-300 bg-white px-2.5 py-1 font-medium hover:border-green-600">
          Ticket
        </button>
      </div>
    );
  }

  return (
    <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${c?.error ? 'border-red-200 bg-red-50' : 'border-neutral-200 bg-neutral-50'}`}>
      {c?.error ? (
        <p className="text-red-700">🧾 No se emitió el comprobante: {c.error}</p>
      ) : (
        <p className="text-neutral-600">🧾 Este pedido aún no tiene boleta ni factura electrónica.</p>
      )}
      <button
        onClick={emitir}
        disabled={ocupado}
        className="mt-2 rounded-lg bg-ink px-3 py-1.5 font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {ocupado ? 'Emitiendo...' : c?.error ? 'Emitir de nuevo' : 'Emitir comprobante'}
      </button>
    </div>
  );
}
