import { limpiarObservaciones } from '../../src/lib/observaciones.js';
import { leerDatosComprobante } from '../../src/lib/documento.js';
import { NOMBRE_TIENDA } from '../../src/data/sitio.js';
import { esLlaveDePrueba, motivoParaNoCobrar } from '../../src/lib/culqiPrueba.js';
import { hasDB, newOrderCode, redisCmd, saveOrder, indexarPedido, actualizarPedido, buscarPedido } from '../_store.js';
import { s } from '../_pricing.js';
import { separarIGV } from '../_impuestos.js';
import { registerPromoUsage } from '../_promo.js';
import { agregarAlHistorial } from '../_historial.js';
import { clientIp, rateLimitRequest } from '../_ratelimit.js';
import { avisarError } from '../_alertas.js';
import { calcularCobro } from '../_cobro.js';

// Órdenes de pago de Culqi: PagoEfectivo (banca móvil, agentes y bodegas),
// billeteras con QR (Yape, Plin…) y Cuotéalo BCP.
//
// Según la guía de Culqi (docs.culqi.com → Órdenes de pago y Webhooks,
// consultada el 25/11/2026) estos medios NO dan un token para cobrar al
// momento: el cliente recibe un código (CIP) o un QR y paga DESPUÉS, a veces
// horas más tarde. Por eso:
//   1. «crear»: antes de abrir la ventana de pago, el servidor calcula el
//      monto (el mismo cálculo que la tarjeta, api/_cobro.js) y crea la orden
//      en Culqi con confirm: false, como pide la guía. Aún NO hay pedido en la
//      tienda: si el cliente termina pagando con tarjeta, esa orden se queda
//      sin usar y vence sola.
//   2. «registrar»: cuando el cliente generó su código o QR, el navegador lo
//      avisa y el pedido se guarda como «Pago por verificar».
//   3. El aviso de Culqi (webhook order.status.changed, culqi-webhook.js)
//      marca el pedido como «Pagado» cuando el dinero llega, o «Cancelado» si
//      la orden vence sin pagarse.
//
// El navegador nunca decide si se pagó: el estado siempre se consulta a Culqi
// con la llave privada.

const API = 'https://api.culqi.com/v2/orders';
// El CIP o el QR vale 24 horas (lo mismo que Culqi pone si no se le dice nada).
const VIGENCIA_SEGUNDOS = 24 * 60 * 60;
// Lo que queda guardado mientras el cliente decide cómo pagar.
const PENDIENTE = (id) => `culqi:orden:${id}`;
// Qué pedido de la tienda corresponde a cada orden de Culqi.
const PEDIDO_DE = (id) => `culqi:pedido:${id}`;
const TRES_DIAS = 3 * 24 * 60 * 60;
const UN_ANIO = 365 * 24 * 60 * 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const accion = String(req.query?.accion || req.body?.accion || '');
  const llave = process.env.CULQI_SECRET_KEY;
  if (!llave) return res.status(500).json({ error: 'El pago con Culqi no está configurado.' });
  const sinCobro = motivoParaNoCobrar(llave, process.env.VERCEL_ENV);
  if (sinCobro) return res.status(503).json({ error: sinCobro });
  if (!hasDB) return res.status(503).json({ error: 'Base de datos no disponible.' });

  if (accion === 'crear') return crear(req, res, llave);
  if (accion === 'registrar') return registrar(req, res, llave);
  return res.status(400).json({ error: 'Acción desconocida.' });
}

async function crear(req, res, llave) {
  if (await rateLimitRequest(`culqi-orden:${clientIp(req)}`, 15, 600)) {
    return res.status(429).json({ error: 'Demasiados intentos de pago seguidos. Espera unos minutos.' });
  }
  const body = req.body || {};
  const cliente = datosDelCliente(body);
  if (!cliente.email) return res.status(400).json({ error: 'Falta el correo.' });

  const cobro = await calcularCobro(body);
  if (cobro.error) return res.status(cobro.status).json({ error: cobro.error });
  const amount = Math.round(cobro.montoFinal * 100);
  const code = newOrderCode();

  const [first_name = '', ...resto] = cliente.nombre.split(/\s+/);
  const respuesta = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${llave}` },
    body: JSON.stringify({
      amount,
      currency_code: 'PEN',
      description: `Pedido ${NOMBRE_TIENDA}`.slice(0, 80),
      order_number: code,
      client_details: {
        first_name: first_name || 'Cliente',
        last_name: resto.join(' ') || first_name || 'Cliente',
        email: cliente.email,
        phone_number: `+51${cliente.telefono.replace(/\D/g, '').slice(-9)}`,
      },
      expiration_date: Math.floor(Date.now() / 1000) + VIGENCIA_SEGUNDOS,
      // La guía de Culqi: para el Checkout la orden se crea sin confirmar.
      confirm: false,
      metadata: { pedido: code },
    }),
  });
  const orden = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || orden?.object !== 'order') {
    await avisarError('orden Culqi', `Culqi no creó la orden: ${respuesta.status} · ${orden?.type || ''} · ${orden?.merchant_message || ''}`.slice(0, 300));
    return res.status(502).json({ error: 'No se pudieron preparar los pagos con PagoEfectivo o billeteras.' });
  }

  const pedido = {
    code,
    monto: amount / 100,
    base: separarIGV(amount / 100).base,
    igv: separarIGV(amount / 100).igv,
    ...leerDatosComprobante(body),
    promoCode: cobro.promoCode,
    promoDescuento: cobro.promoDescuento,
    descuentoDePromo: cobro.descuentoDePromo,
    ...(cobro.referido ? { referido: cobro.referido } : {}),
    ...cliente,
    items: cobro.items,
    ...(esLlaveDePrueba(llave) && { prueba: true }),
  };
  await redisCmd(['SET', PENDIENTE(orden.id), JSON.stringify(pedido)]);
  await redisCmd(['EXPIRE', PENDIENTE(orden.id), String(TRES_DIAS)]);
  return res.status(200).json({ orderId: orden.id, code });
}

async function registrar(req, res, llave) {
  const id = idDeOrden(req.body?.orderId);
  if (!id) return res.status(400).json({ error: 'Orden inválida.' });
  const resultado = await guardarPedidoDeOrden(id, llave);
  if (resultado.error) return res.status(resultado.status || 400).json({ error: resultado.error });
  const { pedido, orden } = resultado;
  return res.status(200).json({
    orderCode: pedido.code,
    estado: pedido.estado,
    monto: pedido.monto,
    cip: orden.payment_code || null,
    vence: orden.expiration_date || null,
  });
}

/** Solo ids con la forma de Culqi (ord_live_… / ord_test_…). */
export function idDeOrden(valor) {
  const v = String(valor || '').trim();
  return /^ord_(live|test)_[A-Za-z0-9]{6,40}$/.test(v) ? v : null;
}

/** La orden tal como la tiene Culqi (consultada con la llave privada), o null. */
export async function leerOrden(id, llave) {
  const r = await fetch(`${API}/${id}`, { headers: { Authorization: `Bearer ${llave}` } });
  const orden = await r.json().catch(() => null);
  return r.ok && orden?.object === 'order' ? orden : null;
}

/**
 * Guarda en la tienda el pedido de una orden de Culqi, si todavía no está.
 * La usan el navegador (cuando el cliente generó su código) y el aviso de
 * Culqi (por si el cliente cerró la página antes). Nunca guarda dos veces.
 */
export async function guardarPedidoDeOrden(id, llave) {
  const orden = await leerOrden(id, llave);
  if (!orden) return { error: 'Culqi no reconoce esa orden.', status: 404 };
  // «created» = el cliente abrió la ventana pero aún no generó código: no es pedido.
  if (!['pending', 'paid'].includes(orden.state)) {
    return { error: 'La orden todavía no tiene un código de pago.', status: 409, orden };
  }

  const yaGuardado = (await redisCmd(['GET', PEDIDO_DE(id)])).result;
  if (yaGuardado) {
    const pedido = await buscarPedido(yaGuardado);
    if (pedido) return { pedido, orden, existia: true };
  }

  const pendiente = JSON.parse((await redisCmd(['GET', PENDIENTE(id)])).result || 'null');
  if (!pendiente) return { error: 'La orden venció o no es de esta tienda.', status: 404, orden };
  // El monto lo pone Culqi: si no coincide con el calculado, algo anda mal.
  if (Math.round(pendiente.monto * 100) !== orden.amount) {
    await avisarError('orden Culqi', `Monto distinto: pedido ${pendiente.code} S/ ${pendiente.monto} vs orden ${orden.amount / 100}`);
    return { error: 'El monto de la orden no coincide.', status: 409, orden };
  }

  const { descuentoDePromo, ...datos } = pendiente;
  const pagado = orden.state === 'paid';
  const pedido = {
    ...datos,
    fecha: new Date().toISOString(),
    estado: pagado ? 'Pagado' : 'Pago por verificar',
    metodo: `${pendiente.prueba ? 'PRUEBA de Culqi · ' : ''}PagoEfectivo / billetera / Cuotéalo (Culqi)`,
    culqiOrderId: id,
    ...(orden.payment_code && { cip: orden.payment_code }),
  };
  const guardado = await saveOrder(pedido);
  if (!guardado) {
    await avisarError('orden Culqi', `No se guardó el pedido ${pedido.code} de la orden ${id}`);
    return { error: 'No pudimos registrar tu pedido. Escríbenos por WhatsApp.', status: 500, orden };
  }
  await indexarPedido(pedido);
  await redisCmd(['SET', PEDIDO_DE(id), pedido.code]);
  await redisCmd(['EXPIRE', PEDIDO_DE(id), String(UN_ANIO)]);
  if (pagado) await contarCupon(pedido, descuentoDePromo);
  else {
    await redisCmd(['SET', `culqi:cupon:${id}`, descuentoDePromo ? '1' : '0']);
    await redisCmd(['EXPIRE', `culqi:cupon:${id}`, String(TRES_DIAS)]);
  }
  return { pedido, orden };
}

/**
 * Lo que dice el aviso de Culqi: «paid» → Pagado; «expired» o «deleted» →
 * Cancelado (si no estaba pagado). Devuelve el pedido como quedó, o null.
 */
export async function aplicarEstadoDeOrden(id, llave) {
  const orden = await leerOrden(id, llave);
  if (!orden) return null;
  if (orden.state === 'paid') {
    const r = await guardarPedidoDeOrden(id, llave);
    if (r.error || !r.pedido) return null;
    if (r.pedido.estado === 'Pagado') return r.pedido;
    const nuevo = await actualizarPedido(r.pedido.code, (p) => ({ ...p, estado: 'Pagado', pagadoEn: new Date().toISOString() }));
    const cupon = (await redisCmd(['GET', `culqi:cupon:${id}`])).result === '1';
    if (nuevo) await contarCupon(nuevo, cupon);
    return nuevo;
  }
  if (['expired', 'deleted'].includes(orden.state)) {
    const code = (await redisCmd(['GET', PEDIDO_DE(id)])).result;
    if (!code) return null;
    return actualizarPedido(code, (p) =>
      p.estado === 'Pagado' ? p : { ...p, estado: 'Cancelado', nota: 'La orden de Culqi venció sin pagarse.' }
    );
  }
  return null;
}

// El uso del cupón solo se cuenta cuando el dinero llegó y el descuento salió de él.
async function contarCupon(pedido, descuentoDePromo) {
  if (!pedido.promoCode || !descuentoDePromo) return;
  await registerPromoUsage(pedido.promoCode).catch(() => {});
  await agregarAlHistorial(pedido.promoCode, { nombre: pedido.nombre, telefono: pedido.telefono, email: pedido.email }, pedido.monto, pedido.promoDescuento).catch(() => {});
}

/** Los datos del cliente que manda el pago, limpios y con tope (como en create-charge.js). */
function datosDelCliente(body) {
  const observaciones = limpiarObservaciones(body.observaciones);
  return {
    email: s(body.email, 120),
    nombre: s(body.nombre, 120).trim(),
    telefono: s(body.telefono, 30),
    zona: s(body.zona, 60),
    direccion: s(body.direccion, 300),
    ubicacion: s(body.ubicacion, 200),
    entrega: s(body.entrega, 120),
    ...(observaciones ? { observaciones } : {}),
  };
}
