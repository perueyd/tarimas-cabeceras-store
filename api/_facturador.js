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
const LLAVE = limpiarLlave(process.env.FACTURADOR_LLAVE);

/**
 * La llave copiada de la ventana negra puede traer espacios delante (el comando
 * la muestra con sangría) o un salto de línea: con eso el facturador la rechaza
 * como "inválida". Ninguna llave lleva espacios ni comillas, así que se quitan.
 */
export function limpiarLlave(valor) {
  return String(valor || '').replace(/[\s"']/g, '');
}

// Formato de las llaves del facturador: fk_ + 12 hexadecimales + _ + 43 caracteres.
const FORMATO_LLAVE = /^fk_[0-9a-f]{12}_[A-Za-z0-9_-]{43}$/;
const LLAVE_MAL = 'La llave FACTURADOR_LLAVE de Vercel no coincide con el facturador. Créala de nuevo (npm run llave-api -- crear …), pégala en Vercel y haz Redeploy.';

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
  if (!FORMATO_LLAVE.test(LLAVE)) return { error: LLAVE_MAL, fecha };
  const armado = armarSolicitud(order, { sizes });
  if (!armado.ok) return { error: armado.error, fecha };

  try {
    const r = await llamar('/v1/comprobantes', { method: 'POST', body: JSON.stringify(armado.solicitud), ...(esperaMs ? { esperaMs } : {}) });
    const datos = await r.json().catch(() => ({}));
    if (r.ok) {
      return { id: datos.id, numero: datos.numero, estado: datos.estado, total: datos.total, ...enlaceDe(datos), fecha };
    }
    if (r.status === 401) return { error: LLAVE_MAL, fecha };
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

// Enlace firmado para que el CLIENTE vea su comprobante sin llave (vence al año;
// cada consulta al facturador entrega uno nuevo).
const enlaceDe = (datos) => (typeof datos.enlaces?.cliente === 'string' ? { enlace: datos.enlaces.cliente } : {});

/**
 * Estado actual en SUNAT de un comprobante ya emitido. El facturador lo envía
 * y reintenta por su cuenta, así que lo guardado al emitir ("en cola") puede
 * haber cambiado. Devuelve { estado, enlace, motivo? } actuales, o null si no se pudo consultar.
 */
export async function consultarEstado(id) {
  if (!facturadorActivo() || !id) return null;
  try {
    const r = await llamar(`/v1/comprobantes/${encodeURIComponent(id)}`);
    if (!r.ok) return null;
    const datos = await r.json();
    if (!datos.estado) return null;
    // Si SUNAT lo rechazó, el motivo: sin él no se sabe qué corregir.
    const motivo = datos.estado === 'RECHAZADO' && datos.sunat?.mensaje ? { motivo: String(datos.sunat.mensaje).slice(0, 300) } : {};
    return { estado: datos.estado, ...enlaceDe(datos), ...motivo };
  } catch {
    return null;
  }
}

/**
 * Lo que ve el cliente en el seguimiento público: número y enlace al PDF. Nada
 * si no hay comprobante o si SUNAT lo rechazó (ese no vale como comprobante).
 */
export function comprobanteParaCliente(c) {
  if (!comprobanteVigente(c) || !c.enlace) return undefined;
  return { numero: c.numero, enlace: c.enlace };
}

/**
 * ¿El pedido tiene una boleta o factura que vale? Mientras la tenga, el pedido
 * no se puede borrar ni cambiar de documento o de medio de pago: la boleta ya
 * dice otra cosa y solo se corrige con nota de crédito.
 */
export function comprobanteVigente(c) {
  return Boolean(c?.numero) && c.estado !== 'RECHAZADO' && c.estado !== 'ANULADO';
}

/**
 * Comprueba la conexión y la llave sin emitir nada: pide un pedido que no
 * existe. 404 = la llave vale (el facturador la aceptó y buscó); 401 = no vale.
 * Devuelve también el prefijo PÚBLICO de la llave (fk_ + 12 caracteres), para
 * compararlo con `npm run llave-api -- listar` sin mostrar la parte secreta.
 */
export async function probarConexion() {
  if (!URL_FACTURADOR || !LLAVE) {
    return { ok: false, mensaje: 'Faltan FACTURADOR_URL o FACTURADOR_LLAVE en Vercel.' };
  }
  const prefijo = /^fk_[0-9a-f]{12}/.exec(LLAVE)?.[0];
  if (!FORMATO_LLAVE.test(LLAVE)) {
    return { ok: false, prefijo, mensaje: `La llave de Vercel no tiene el formato correcto (tiene ${LLAVE.length} caracteres; deben ser 59). Seguramente se copió incompleta: créala de nuevo.` };
  }
  try {
    const r = await llamar('/v1/comprobantes?pedido=__prueba-de-conexion__');
    if (r.status === 404) return { ok: true, prefijo, mensaje: 'Conectado: el facturador responde y la llave es válida.' };
    if (r.status === 401) return { ok: false, prefijo, mensaje: `El facturador no reconoce la llave ${prefijo}… Compara con "npm run llave-api -- listar" o créala de nuevo.` };
    if (r.status === 403) return { ok: false, prefijo, mensaje: 'La llave existe pero no tiene permiso "consultar". Créala con --permisos emitir,consultar,cobrar.' };
    return { ok: false, prefijo, mensaje: `El facturador respondió ${r.status}. Prueba de nuevo en un minuto.` };
  } catch (err) {
    return {
      ok: false,
      prefijo,
      mensaje: err?.name === 'TimeoutError'
        ? 'El facturador está despertando (plan gratis de Render). Prueba de nuevo en un minuto.'
        : 'No se pudo conectar con el facturador. Revisa FACTURADOR_URL en Vercel.',
    };
  }
}

/** Descarga el PDF de un comprobante ya emitido (A4 o TICKET_80). */
export async function descargarPdf(id, formato) {
  const q = formato === 'TICKET_80' || formato === 'A4' ? `?formato=${formato}` : '';
  return llamar(`/v1/comprobantes/${encodeURIComponent(id)}/pdf${q}`);
}
