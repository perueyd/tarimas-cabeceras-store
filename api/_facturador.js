// Conexión con el facturador electrónico propio (boletas y facturas en SUNAT).
//
// POR QUÉ ASÍ: el comprobante se emite SOLO cuando el pago está garantizado —
// Culqi lo aprobó, o el dueño marcó el pedido como "Pagado" después de ver el
// Yape, el Plin o la transferencia—. Nunca antes.
//
// Está APAGADO mientras no existan FACTURADOR_URL y FACTURADOR_LLAVE en Vercel:
// la tienda funciona exactamente igual que siempre. La llave vive solo aquí, en
// el servidor; el navegador nunca la ve (el PDF se descarga a través de
// /api/comprobante, que pide la clave del panel).
//
// El facturador no emite dos veces el mismo pedido: si se reintenta (porque se
// cortó la conexión o el dueño pulsa "Emitir de nuevo"), devuelve el mismo
// comprobante. Por eso reintentar siempre es seguro.

const URL_FACTURADOR = (process.env.FACTURADOR_URL || '').replace(/\/+$/, '');
const LLAVE = process.env.FACTURADOR_LLAVE || '';

// Vercel puede cortar la función a los ~10 s en el plan gratuito; si el
// facturador tarda más, el comprobante queda pendiente y "Emitir de nuevo" lo
// recupera. Tras un cobro de Culqi se espera menos (ver create-charge.js):
// ahí lo importante es responderle al cliente que ya pagó.
const ESPERA_MS = 8000;

export function facturadorActivo() {
  return Boolean(URL_FACTURADOR && LLAVE);
}

// Cómo se llama cada método de la tienda en el facturador.
// "Yape/Plin" es el nombre de los pedidos antiguos, cuando no se distinguían.
const MEDIO_POR_METODO = {
  'Tarjeta/Yape (Culqi)': 'PASARELA',
  Yape: 'YAPE',
  Plin: 'PLIN',
  'Transferencia bancaria': 'TRANSFERENCIA',
  'Yape/Plin': 'OTRO',
};

// Los montos de la tienda son números de JavaScript; el facturador exige texto
// exacto ("350.00"). Se pasa por céntimos ENTEROS para que 0.1 + 0.2 no
// convierta un descuento en 0.30000000000000004.
const centimos = (n) => Math.round(Number(n || 0) * 100);
const texto = (c) => (c / 100).toFixed(2);

function describir(item, sizes) {
  const partes = [item.productName];
  const medida = sizes.find((s) => s.id === item.sizeId)?.label;
  if (medida) partes.push(medida);
  for (const o of item.opciones || []) partes.push(`${o.label}: ${o.valor}`);
  return partes.join(' — ').slice(0, 250);
}

/**
 * Convierte un pedido en lo que pide el facturador. No llama a nadie: así se
 * puede probar sin red. Devuelve { ok: true, solicitud } o { ok: false, error }.
 */
export function armarSolicitud(order, { sizes = [] } = {}) {
  const items = (order.items || []).map((i) => ({
    codigo: `${i.productId}-${i.sizeId}`.toUpperCase().replace(/[^A-Z0-9._-]/g, '-').slice(0, 40),
    descripcion: describir(i, sizes),
    cantidad: Number(i.qty) || 1,
    precio: texto(centimos(i.unitPrice)),
  }));
  if (items.length === 0) return { ok: false, error: 'El pedido no tiene productos.' };

  // El descuento es lo que separa la suma de los productos de lo que se cobró
  // (cupón u oferta automática). Se calcula así, y no se copia el que trae el
  // pedido, para que la boleta diga EXACTAMENTE el monto cobrado.
  const suma = (order.items || []).reduce((t, i) => t + centimos(i.unitPrice) * (Number(i.qty) || 1), 0);
  const descuento = suma - centimos(order.monto);
  if (descuento < 0) {
    return { ok: false, error: 'El monto cobrado es mayor que la suma de los productos. Revisa el pedido antes de emitir.' };
  }

  const factura = order.docTipo === 'factura' && order.docNumero;
  const cliente = factura
    ? { tipoDocumento: 'RUC', numero: order.docNumero, nombre: order.razonSocial || order.nombre }
    : order.docNumero
      ? { tipoDocumento: 'DNI', numero: order.docNumero, nombre: order.nombre }
      : undefined; // boleta sin documento: el facturador la acepta hasta S/ 700

  const medio = MEDIO_POR_METODO[order.metodo] || 'OTRO';
  const referencia = medio === 'PASARELA' ? order.chargeId : order.referencia;

  return {
    ok: true,
    solicitud: {
      pedido: order.code,
      tipo: factura ? 'FACTURA' : 'BOLETA',
      ...(cliente ? { cliente } : {}),
      items,
      ...(descuento > 0 ? { descuento: texto(descuento) } : {}),
      pago: { medio, ...(referencia ? { referencia: String(referencia).slice(0, 60) } : {}) },
    },
  };
}

async function llamar(ruta, { esperaMs = ESPERA_MS, ...opciones } = {}) {
  return fetch(`${URL_FACTURADOR}${ruta}`, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLAVE}` },
    signal: AbortSignal.timeout(esperaMs),
  });
}

/**
 * Emite el comprobante de un pedido pagado. Nunca lanza: devuelve lo que se
 * guarda en `order.comprobante`, sea el comprobante emitido o el error en
 * español para mostrarlo en el panel.
 */
export async function emitirComprobante(order, { sizes, esperaMs } = {}) {
  const fecha = new Date().toISOString();
  if (!facturadorActivo()) {
    return { error: 'El facturador aún no está conectado (faltan FACTURADOR_URL y FACTURADOR_LLAVE en Vercel).', fecha };
  }
  const armado = armarSolicitud(order, { sizes });
  if (!armado.ok) return { error: armado.error, fecha };

  try {
    const r = await llamar('/v1/comprobantes', { method: 'POST', body: JSON.stringify(armado.solicitud), ...(esperaMs ? { esperaMs } : {}) });
    const datos = await r.json().catch(() => ({}));
    if (r.ok) {
      return { id: datos.id, numero: datos.numero, estado: datos.estado, total: datos.total, fecha };
    }
    const detalles = Array.isArray(datos.error?.detalles) ? ` ${datos.error.detalles.join(' ')}` : '';
    return { error: `${datos.error?.mensaje || `El facturador respondió ${r.status}.`}${detalles}`, fecha };
  } catch (err) {
    const tiempo = err?.name === 'TimeoutError';
    return {
      error: tiempo
        ? 'El facturador tardó en responder. Pulsa "Emitir de nuevo": si ya se emitió, devuelve el mismo comprobante.'
        : 'No se pudo conectar con el facturador. Pulsa "Emitir de nuevo" en unos minutos.',
      fecha,
    };
  }
}

/**
 * Estado actual en SUNAT de un comprobante ya emitido. El facturador lo envía
 * y reintenta por su cuenta, así que lo guardado al emitir ("en cola") puede
 * haber cambiado. Devuelve el estado nuevo, o null si no se pudo consultar.
 */
export async function consultarEstado(id) {
  if (!facturadorActivo() || !id) return null;
  try {
    const r = await llamar(`/v1/comprobantes/${encodeURIComponent(id)}`);
    if (!r.ok) return null;
    return (await r.json()).estado ?? null;
  } catch {
    return null;
  }
}

/** Descarga el PDF de un comprobante ya emitido (A4 o TICKET_80). */
export async function descargarPdf(id, formato) {
  const q = formato === 'TICKET_80' || formato === 'A4' ? `?formato=${formato}` : '';
  return llamar(`/v1/comprobantes/${encodeURIComponent(id)}/pdf${q}`);
}
