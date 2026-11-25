import { limpiarObservaciones } from '../src/lib/observaciones.js';
import { newOrderCode, saveOrder } from './_store.js';
import { s } from './_pricing.js';
import { registerPromoUsage, reservaDeCupon } from './_promo.js';
import { calcularCobro } from './_cobro.js';
import { clientIp, rateLimitRequest } from './_ratelimit.js';
import { agregarAlHistorial } from './_historial.js';
import { separarIGV } from './_impuestos.js';
import { leerDatosComprobante } from '../src/lib/documento.js';
import { NOMBRE_TIENDA } from '../src/data/sitio.js';
import { avisarError } from './_alertas.js';
import { esLlaveDePrueba, motivoParaNoCobrar } from '../src/lib/culqiPrueba.js';

// Función serverless (Vercel) que crea el cargo en Culqi desde el backend.
// La llave secreta NUNCA debe usarse en el frontend.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Límite por IP: un intento de "probar" tarjetas robadas hace muchos cargos
  // pequeños seguidos — esto lo frena sin afectar una compra normal.
  if (await rateLimitRequest(`charge:${clientIp(req)}`, 8, 600)) {
    return res.status(429).json({ error: 'Demasiados intentos de pago seguidos. Espera unos minutos e intenta de nuevo.' });
  }

  const body = req.body || {};
  const token = body.token;
  const email = s(body.email, 120);
  const nombre = s(body.nombre, 120);
  const telefono = s(body.telefono, 30);
  const zona = s(body.zona, 60);
  const direccion = s(body.direccion, 300);
  const ubicacion = s(body.ubicacion, 200);
  const entrega = s(body.entrega, 120);
  // Lo que el cliente quiso decirnos al comprar (opcional).
  const observaciones = limpiarObservaciones(body.observaciones);
  // Pasos de la guía de Culqi (docs.culqi.com → Culqi 3DS, 23/11/2026): la
  // huella del dispositivo va en antifraud_details y, si el banco pidió
  // verificar al titular, el segundo intento trae el resultado de esa verificación.
  const huella = huellaValida(body.deviceId);
  const autenticacion3DS = limpiarAutenticacion3DS(body.autenticacion3DS);
  // Cuotas con tarjeta de crédito, si el cliente las eligió en la ventana de Culqi.
  const cuotas = cuotasValidas(body.cuotas);
  const secretKey = process.env.CULQI_SECRET_KEY;

  if (!secretKey) {
    return res.status(500).json({ error: 'CULQI_SECRET_KEY no está configurada en el servidor.' });
  }
  // Una llave de prueba en la tienda publicada daría pedidos «pagados» sin dinero.
  const sinCobro = motivoParaNoCobrar(secretKey, process.env.VERCEL_ENV);
  if (sinCobro) {
    await avisarError('cobro', 'Llave de PRUEBA de Culqi en la tienda publicada: se rechazó un pago con tarjeta.');
    return res.status(503).json({ error: sinCobro });
  }
  const esPrueba = esLlaveDePrueba(secretKey);
  if (!token || !email) {
    return res.status(400).json({ error: 'Faltan datos para procesar el pago (token, email).' });
  }

  // SEGURIDAD: el monto se recalcula aquí desde el catálogo ACTUAL; se ignora
  // el del navegador. Es el MISMO cálculo que usan las órdenes de PagoEfectivo,
  // billeteras y Cuotéalo (api/_cobro.js). Si el cobro no se completa, el uso
  // reservado del cupón se devuelve (reserva.liberar()).
  const reserva = reservaDeCupon();
  const cobro = await calcularCobro(body, { reserva });
  if (cobro.error) return res.status(cobro.status).json({ error: cobro.error });
  const { montoFinal, promoCode, promoDescuento, descuentoDePromo, referido } = cobro;
  const items = cobro.items;

  const amount = Math.round(montoFinal * 100);

  try {
    const culqiRes = await fetch('https://api.culqi.com/v2/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        amount,
        currency_code: 'PEN',
        email,
        source_id: token,
        // Esto es lo que el cliente ve en el estado de cuenta de su tarjeta.
        // Si ahí aparece un nombre que no reconoce, desconoce el cargo y el
        // banco le devuelve el dinero: un contracargo que la tienda paga.
        // Culqi admite como mucho 80 letras en la descripción: con un nombre largo se recorta.
        description: `Pedido ${NOMBRE_TIENDA} - ${nombre || ''}`.trim().slice(0, 80),
        // Culqi rechaza el cobro entero si un valor de la metadata pasa de
        // 200 letras (parameter_error). La lista de productos completa ya
        // pasaba con un solo producto: ahora va un resumen corto y cada valor
        // se recorta. El detalle completo queda en el pedido de la tienda.
        metadata: metadataParaCulqi({ nombre, telefono, zona, direccion, ubicacion, entrega, items: resumenDeItems(items) }),
        // Culqi pide estos datos en cada cargo: su motor antifraude rechaza
        // más compras legítimas cuando no los tiene (docs.culqi.com → Cargos,
        // consultado el 23/11/2026).
        antifraud_details: { ...datosAntifraude({ nombre, telefono, direccion }), ...(huella && { device_finger_print_id: huella }) },
        ...(autenticacion3DS && { authentication_3DS: autenticacion3DS }),
        ...(cuotas && { installments: cuotas }),
      }),
    });

    const data = await culqiRes.json();

    // Solo es venta si Culqi devuelve un CARGO. Ojo: cuando el banco pide
    // verificar al titular (3DS), Culqi responde 200 con action_code «REVIEW»
    // y SIN cobrar; tomar ese 200 como pago dejaba el pedido «Pagado» sin dinero.
    if (!culqiRes.ok || data?.object !== 'charge') {
      // Tarjeta rechazada: el cliente no compró, el cupón vuelve a estar libre.
      await reserva.liberar();
      // El banco pide verificar al titular: el navegador abre la ventana de
      // Culqi 3DS y vuelve a llamar aquí con el resultado. No es un error.
      // (Si ya venía verificado y lo vuelve a pedir, ahí sí se rechaza.)
      if (data?.action_code === 'REVIEW' && !autenticacion3DS) {
        return res.status(200).json({ necesita3DS: true });
      }
      // El detalle técnico de Culqi (sin datos del cliente ni de la tarjeta)
      // va al panel: al cliente solo le llega el mensaje genérico de Culqi.
      await avisarError('cobro', `Culqi no hizo el cargo: ${motivoDeCulqi(data, culqiRes.status)}`);
      if (data?.action_code === 'REVIEW') {
        return res.status(402).json({ error: 'Tu banco no pudo verificar la compra. Prueba con otra tarjeta, con Yape o con transferencia.' });
      }
      return res.status(culqiRes.ok ? 402 : culqiRes.status).json(data);
    }
    // El dinero ya se cobró: desde aquí el uso es definitivo pase lo que pase
    // después (aunque falle guardar el pedido, el cliente SÍ disfrutó el cupón).
    reserva.confirmar();

    // Pago aprobado: registra el pedido.
    //
    // OJO: saveOrder NO lanza si la base falla — devuelve false. Antes ese
    // valor se ignoraba, así que si Redis fallaba justo aquí se cobraba la
    // tarjeta, el pedido no quedaba guardado en ningún sitio y al cliente se
    // le entregaba igualmente un código de seguimiento que no existía: al
    // rastrearlo le decía "no encontramos un pedido con ese código". El dueño
    // tampoco lo veía en el panel. Dinero cobrado y ningún rastro.
    let orderCode = null;
    let guardado = false;
    try {
      orderCode = newOrderCode();
      guardado = await saveOrder({
        code: orderCode,
        fecha: new Date().toISOString(),
        estado: 'Pagado',
        metodo: esPrueba ? 'Tarjeta (PRUEBA de Culqi, sin cobro real)' : 'Tarjeta/Yape (Culqi)',
        ...(esPrueba && { prueba: true }),
        chargeId: data.id,
        ...(cuotas && { cuotas }),
        monto: amount / 100,
        base: separarIGV(amount / 100).base,
        igv: separarIGV(amount / 100).igv,
        // El checkout ya mandaba el DNI o RUC, pero aquí se ignoraba: los
        // pedidos pagados con tarjeta llegaban al panel sin datos para la boleta
        // (que el dueño emite en su facturador, aparte de la tienda).
        ...leerDatosComprobante(body),
        promoCode,
        promoDescuento,
        ...(referido ? { referido } : {}),
        ...(observaciones ? { observaciones } : {}),
        nombre,
        email,
        telefono,
        zona,
        direccion,
        ubicacion,
        entrega,
        items: Array.isArray(items) ? items : [],
      });
      // Solo se gasta un uso del cupón si el descuento que se aplicó salió
      // DE ÉL. Antes se descontaba igual aunque hubiera ganado una oferta
      // automática: el cliente perdía su cupón sin haberlo disfrutado.
      // Y se espera el resultado: en Vercel la función se congela justo
      // después de responder, así que un trabajo sin await se pierde.
      if (promoCode && descuentoDePromo) {
        await registerPromoUsage(promoCode).catch(() => {});
        await agregarAlHistorial(promoCode, { nombre, telefono, email }, amount / 100, promoDescuento).catch(() => {});
      }
    } catch (err) {
      console.log('No se pudo registrar el pedido (pago OK):', err?.message);
    }

    if (!guardado) {
      // El cobro SÍ se hizo: no se puede devolver un error, o el cliente
      // pagaría e intentaría pagar otra vez. Se le avisa con claridad y se
      // deja todo lo necesario en los registros para reconstruirlo a mano.
      console.error(
        'PEDIDO PAGADO SIN GUARDAR — reconstruir a mano:',
        JSON.stringify({ chargeId: data.id, orderCode, monto: amount / 100, nombre, email, telefono, direccion, entrega, items })
      );
      // Lo más grave que puede pasar: dinero cobrado sin pedido. Va al panel
      // y al teléfono con lo mínimo para encontrarlo en Culqi (sin datos del cliente).
      await avisarError('cobro con tarjeta', `PEDIDO PAGADO SIN GUARDAR: ${orderCode} (Culqi ${data.id}, S/ ${amount / 100})`);
      return res.status(200).json({
        ...data,
        orderCode,
        guardado: false,
        aviso:
          'Tu pago se procesó correctamente, pero tuvimos un problema al registrar el pedido. ' +
          'Guarda este comprobante y escríbenos por WhatsApp al +51951278010 para confirmarlo — ' +
          'no vuelvas a pagar.',
      });
    }

    return res.status(200).json({ ...data, orderCode, guardado: true });
  } catch (err) {
    // Un cobro que falla y no deja rastro es lo peor de esta lista: el cliente
    // pone su tarjeta, no pasa nada, y no queda ni una línea que explique por qué.
    console.error('CULQI (no se pudo cobrar):', err?.message);
    // No hace nada si el cobro ya se había aprobado (se confirmó arriba).
    await reserva.liberar();
    await avisarError('cobro con tarjeta', `No se pudo conectar con Culqi: ${err?.message}`);
    return res.status(500).json({ error: 'Error al conectar con Culqi.' });
  }
}

/** Nombre, teléfono y dirección del cliente como los pide Culqi (antifraud_details). */
export function datosAntifraude({ nombre = '', telefono = '', direccion = '' } = {}) {
  const [first_name = '', ...resto] = String(nombre).trim().split(/\s+/);
  const datos = {
    first_name,
    last_name: resto.join(' '),
    address: String(direccion).trim(),
    // Con tarjeta solo se cobra Lima (provincia se coordina por WhatsApp).
    address_city: 'Lima',
    country_code: 'PE',
    phone_number: String(telefono).replace(/\D/g, '').slice(-9),
  };
  // Culqi rechaza campos vacíos: se mandan solo los que hay.
  return Object.fromEntries(Object.entries(datos).filter(([, v]) => v));
}

/** Por qué Culqi no cobró, en una línea y sin datos personales. */
function motivoDeCulqi(data = {}, estado) {
  return [estado, data.object, data.type, data.code, data.decline_code, data.action_code, data.merchant_message]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 300);
}

/** La huella del dispositivo que da Culqi3DS.generateDevice() (un UUID), o null. */
export function huellaValida(valor) {
  const v = String(valor || '').trim();
  return /^[0-9a-f-]{16,64}$/i.test(v) ? v : null;
}

const CAMPOS_3DS = ['eci', 'xid', 'cavv', 'protocolVersion', 'directoryServerTransactionId'];

/** El resultado de la verificación 3DS, solo con los campos que Culqi espera (texto corto). */
export function limpiarAutenticacion3DS(valor) {
  if (!valor || typeof valor !== 'object') return null;
  const limpio = {};
  for (const campo of CAMPOS_3DS) {
    if (typeof valor[campo] === 'string' && valor[campo].trim()) limpio[campo] = valor[campo].trim().slice(0, 200);
  }
  return Object.keys(limpio).length ? limpio : null;
}

/** Culqi solo acepta valores de metadata de hasta 200 letras (docs y error parameter_error, 23/11/2026). */
export const MAX_METADATA_CULQI = 200;

export function metadataParaCulqi(datos = {}) {
  return Object.fromEntries(
    Object.entries(datos)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v).slice(0, MAX_METADATA_CULQI)])
  );
}

/** «1× MILÁN (2plazas); 2× COLCHÓN …» — lo justo para reconocer la venta en el panel de Culqi. */
export function resumenDeItems(items = []) {
  return (items || [])
    .map((i) => `${i.qty || 1}× ${i.productName || i.name || i.productId || ''}${i.sizeId ? ` (${i.sizeId})` : ''}`.trim())
    .join('; ');
}

/** Número de cuotas válido para Culqi (2 a 48), o null si es al contado. */
export function cuotasValidas(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 2 && n <= 48 ? n : null;
}
