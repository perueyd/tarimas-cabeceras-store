import { newOrderCode, saveOrder } from './_store.js';
import { priceOrder, s } from './_pricing.js';
import { getCatalog } from './_catalog.js';
import { registerPromoUsage, reservarUso, validatePromo } from './_promo.js';
import { clientIp, rateLimitRequest } from './_ratelimit.js';
import { agregarAlHistorial } from './_historial.js';
import { calcularDescuentoAuto, comprobarMontoEsperado, mejorTotal } from './_ofertas-auto.js';

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
  const secretKey = process.env.CULQI_SECRET_KEY;

  if (!secretKey) {
    return res.status(500).json({ error: 'CULQI_SECRET_KEY no está configurada en el servidor.' });
  }
  if (!token || !email) {
    return res.status(400).json({ error: 'Faltan datos para procesar el pago (token, email).' });
  }

  // SEGURIDAD: el monto se recalcula aquí desde el catálogo ACTUAL; se ignora el del navegador.
  const { products } = await getCatalog();
  const priced = priceOrder(products, body.items);
  if (!priced) {
    return res.status(400).json({ error: 'El pedido contiene productos o tamaños inválidos.' });
  }

  // Código promocional (opcional) — se revalida aquí igual que en /api/orders.
  let promoCode = null;
  let promoDescuento = 0;
  const promoInput = s(body.promoCode, 30);
  if (promoInput) {
    const promoResult = await validatePromo(promoInput, priced.total);
    if (promoResult.valid) {
      const reservado = await reservarUso(promoResult.promo.code, promoResult.promo.maxUsos);
      if (reservado) {
        promoDescuento = promoResult.descuento;
        promoCode = promoResult.promo.code;
      }
    }
  }

  // Descuentos automáticos (flash sale, por cantidad, por categoría). Antes
  // solo se calculaban en el navegador, así que el checkout mostraba el precio
  // rebajado y aquí se cobraba el precio completo.
  const { descuento: descuentoAuto } = await calcularDescuentoAuto(priced.items, priced.total, products);
  const { descuento, total: montoFinal, vieneDePromo } = mejorTotal(priced.total, promoDescuento, descuentoAuto);
  const descuentoDePromo = vieneDePromo; // ¿ganó el cupón o la oferta automática?
  promoDescuento = descuento;

  // Nunca cobrar por encima de lo que el cliente vio en pantalla.
  const control = comprobarMontoEsperado(montoFinal, body.montoMostrado);
  if (!control.ok) return res.status(409).json({ error: control.error });

  const amount = Math.round(montoFinal * 100);
  const items = priced.items;

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
        description: `Pedido Espacios y Diseño - ${nombre || ''}`.trim(),
        metadata: { nombre, telefono, zona, direccion, ubicacion, entrega, items: JSON.stringify(items || []) },
      }),
    });

    const data = await culqiRes.json();

    if (!culqiRes.ok) {
      return res.status(culqiRes.status).json(data);
    }

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
        metodo: 'Tarjeta/Yape (Culqi)',
        chargeId: data.id,
        monto: amount / 100,
        promoCode,
        promoDescuento,
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
    return res.status(500).json({ error: 'Error al conectar con Culqi.' });
  }
}
