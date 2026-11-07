// La ficha de un pedido: lo que el dueño mira para confirmar un pago, apuntar
// una entrega y copiar los datos de la boleta (que emite en su facturador).
//
// Es la pieza más usada del panel —se abre decenas de veces al día— y por eso
// tiene su propio archivo en vez de vivir perdida en medio de la página.

import { useEffect, useState } from 'react';
import { NOMBRE_TIENDA, urlOpinion, urlSeguimiento } from '../../data/sitio.js';
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

// Colores del estado de un pedido. Fuera del componente para no rehacerlos
// en cada dibujado, y en un solo sitio para que la línea plegada y la abierta
// no acaben enseñando colores distintos del mismo estado.
const COLOR_ESTADO = {
  Pagado: 'bg-green-100 text-green-800',
  Entregado: 'bg-sky-100 text-sky-800',
  Cancelado: 'bg-red-100 text-red-700',
  'Pago por verificar': 'bg-amber-100 text-amber-800',
};

const ESTADOS = ['Pago por verificar', 'Pagado', 'Entregado', 'Cancelado'];

function fechaCorta(iso) {
  try {
    return new Date(iso).toLocaleDateString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '';
  }
}

export function PedidoCard({ o, onUpdate, onDelete, currencyFormatter, getColorById, getSizeById }) {
  // Los pedidos que esperan una decisión se abren solos; los ya resueltos
  // empiezan plegados. Antes TODOS enseñaban sus ocho bloques a la vez, y con
  // veinte pedidos en pantalla encontrar el que importaba era un ejercicio de
  // paciencia.
  const [abierto, setAbierto] = useState(o.estado === 'Pago por verificar');

  const cal = calendarUrl(o, currencyFormatter);
  const tel = (o.telefono || '').replace(/\D/g, '');
  const waMsg = encodeURIComponent(
    `Hola ${o.nombre}, te escribimos de ${NOMBRE_TIENDA} sobre tu pedido *${o.code}*.\nEstado actual: ${o.estado}.\nPuedes rastrearlo aquí: ${urlSeguimiento(o.code)}`
  );
  const wa = tel ? `https://wa.me/${tel.startsWith('51') ? tel : '51' + tel}?text=${waMsg}` : null;

  // Pedir la opinión del cliente, una vez que ya tiene su mueble en casa.
  //
  // POR QUÉ EXISTE: los 49 productos estaban con cero opiniones y no había
  // forma de pedirlas. Comprar un mueble de mil soles por internet a una
  // tienda sin una sola opinión es pedirle mucho a un desconocido, y las
  // opiniones no llegan solas: hay que pedirlas, y hay que pedirlas pronto.
  //
  // SOLO cuando el pedido está ENTREGADO. Pedir opinión de algo que todavía
  // no ha llegado molesta al cliente y además no puede opinar de nada.
  //
  // El enlace va a la ficha del primer producto y cae directo en el formulario
  // (#opiniones): cada opinión cuenta para SU producto, que es donde la va a
  // leer el siguiente comprador.
  const primero = o.items?.[0];
  const opinionMsg = primero
    ? encodeURIComponent(
        `Hola ${o.nombre}, te escribimos de ${NOMBRE_TIENDA} 👋\n\n` +
          `¿Qué tal te fue con tu ${primero.productName}?\n\n` +
          `Si quedaste contento, ¿nos dejas tu opinión? Son 30 segundos y le sirve muchísimo a quien está dudando si comprar:\n${urlOpinion(primero.productId)}\n\n` +
          `¡Gracias!`
      )
    : null;
  const waOpinion =
    tel && opinionMsg && o.estado === 'Entregado'
      ? `https://wa.me/${tel.startsWith('51') ? tel : '51' + tel}?text=${opinionMsg}`
      : null;
  const badge = COLOR_ESTADO[o.estado] || 'bg-neutral-100 text-neutral-700';

  return (
    <div className={`rounded-xl border bg-white transition ${abierto ? 'border-neutral-300' : 'border-neutral-200'}`}>
      {/* La línea plegada: lo justo para decidir si hay que abrirla.
          Es un botón entero para poder abrirla tocando en cualquier parte,
          que en un móvil importa más que en una pantalla grande.

          POR QUÉ SE PARTE EN DOS LÍNEAS EN EL MÓVIL: en una sola, el código,
          el nombre, el importe y el estado se repartían 343 píxeles y el
          nombre del cliente acababa en "Clie…". Ahora arriba va lo que se
          busca de un vistazo (quién y cuánto) y debajo lo que identifica el
          pedido (código, fecha y estado). En pantalla grande sí hay sitio,
          así que `sm:contents` deshace las dos líneas y todo vuelve a una. */}
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="flex min-w-0 items-baseline gap-2 sm:contents">
            <span className="min-w-0 flex-1 truncate text-sm font-medium sm:order-2">{o.nombre}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums sm:order-4">
              {currencyFormatter.format(o.monto)}
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-2 sm:contents">
            <span className="shrink-0 font-mono text-xs font-semibold text-neutral-500 sm:order-1">{o.code}</span>
            <span className="shrink-0 text-xs text-neutral-400 sm:order-3">{fechaCorta(o.fecha)}</span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium sm:order-5 ${badge}`}>
              {o.estado}
            </span>
          </span>
        </span>
        <span className={`shrink-0 text-neutral-400 transition ${abierto ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      {abierto && (
        <div className="border-t border-neutral-100 px-4 pb-4 pt-3">
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <p><span className="text-neutral-500">Teléfono:</span> {o.telefono || '—'}</p>
            <p><span className="text-neutral-500">Pagó con:</span> {o.metodo}</p>
            {/* Contra entrega con adelanto: lo que ya está cobrado y lo que
                hay que cobrar al dejar el mueble. Sin esto habría que sacar
                la cuenta a mano delante del cliente. */}
            {o.adelanto > 0 && (
              <p className="sm:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">
                <span className="text-emerald-700">Adelanto cobrado:</span>{' '}
                <strong>{currencyFormatter.format(o.adelanto)}</strong>
                {' · '}
                <span className="text-emerald-700">Cobrar al entregar:</span>{' '}
                <strong>{currencyFormatter.format(o.saldo)}</strong>
              </p>
            )}
            <p><span className="text-neutral-500">Entrega:</span> {o.entrega || '—'}</p>
            <p><span className="text-neutral-500">Pedido el:</span> {new Date(o.fecha).toLocaleString('es-PE')}</p>
            <p className="sm:col-span-2"><span className="text-neutral-500">Dirección:</span> {o.direccion || '—'} ({o.zona})</p>
          </div>

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
                  {i.opciones?.length > 0 && `, ${i.opciones.map((x) => `${x.label}: ${x.valor}`).join(', ')}`}
                  {' — '}{currencyFormatter.format(i.unitPrice * i.qty)}
                </li>
              ))}
            </ul>
          )}

          {/* Todo lo que hace falta para emitir el comprobante en el
              facturador, junto y listo para copiar. */}
          <BloqueComprobante o={o} currencyFormatter={currencyFormatter} />

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 text-xs">
            <label className="flex items-center gap-1.5">
              <span className="text-neutral-500">Estado:</span>
              <select
                value={o.estado}
                onChange={(e) => onUpdate(o, { estado: e.target.value })}
                className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 outline-none focus:border-ink"
              >
                {ESTADOS.map((e) => <option key={e}>{e}</option>)}
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
            {waOpinion && (
              <a
                href={waOpinion}
                target="_blank"
                rel="noreferrer"
                title="Abre WhatsApp con el mensaje escrito y el enlace directo al formulario de opinión"
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 font-medium text-amber-900 hover:border-amber-500"
              >
                ⭐ Pedir opinión
              </a>
            )}
            {cal && (
              <a href={cal} target="_blank" rel="noreferrer" className="rounded-lg border border-neutral-300 px-3 py-1.5 font-medium hover:border-ink">
                Agendar entrega
              </a>
            )}
            {o.ubicacion && (
              <a href={o.ubicacion} target="_blank" rel="noreferrer" className="rounded-lg border border-neutral-300 px-3 py-1.5 font-medium hover:border-ink">
                Ver mapa
              </a>
            )}
            <button
              onClick={() => onDelete(o)}
              className="ml-auto rounded-lg border border-neutral-200 px-3 py-1.5 font-medium text-neutral-500 transition hover:border-red-300 hover:text-red-600"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Los datos del pedido tal como hacen falta para emitir la boleta o la
// factura en el facturador: documento del cliente, base, IGV y total. La
// tienda y el facturador son independientes (decisión del dueño, 07/11/2026):
// la tienda no emite nada, solo junta los datos.
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
