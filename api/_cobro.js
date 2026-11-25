import { priceOrder, s } from './_pricing.js';
import { getCatalog } from './_catalog.js';
import { validatePromo } from './_promo.js';
import { calcularDescuentoAuto, comprobarMontoEsperado, mejorTotal } from './_ofertas-auto.js';
import { referidoValido } from '../src/lib/servicios.js';

/**
 * Cuánto se cobra por un pedido, calculado SIEMPRE en el servidor con el
 * catálogo actual: precio de cada producto, cupón, ofertas automáticas y el
 * control de que no se cobre más de lo que el cliente vio en pantalla.
 *
 * Lo usan los dos caminos de cobro de Culqi —el cargo con tarjeta o Yape
 * (create-charge.js) y las órdenes de PagoEfectivo, billeteras y Cuotéalo
 * (_rutas/culqi-orden.js)— para que nunca den un número distinto.
 *
 * @param body     lo que manda el navegador (items, promoCode, referido, montoMostrado)
 * @param reserva  si viene (reservaDeCupon()), el uso del cupón se reserva y se
 *                 devuelve en todos los caminos que no terminan en venta
 * @returns {{ error: string, status: number } | { items, montoFinal, promoCode, promoDescuento, descuentoDePromo, referido }}
 */
export async function calcularCobro(body = {}, { reserva } = {}) {
  const { products, partners } = await getCatalog();
  const priced = priceOrder(products, body.items);
  if (!priced) return { error: 'El pedido contiene productos o tamaños inválidos.', status: 400 };
  // Qué profesional aliado trajo a este cliente, si vino por su enlace.
  const referido = referidoValido(body.referido, partners);

  // Código promocional (opcional), revalidado aquí como en /api/orders.
  let promoCode = null;
  let promoDescuento = 0;
  const promoInput = s(body.promoCode, 30);
  if (promoInput) {
    const promoResult = await validatePromo(promoInput, priced.total);
    if (promoResult.valid && (!reserva || (await reserva.reservar(promoResult.promo)))) {
      promoDescuento = promoResult.descuento;
      promoCode = promoResult.promo.code;
    }
  }

  // Descuentos automáticos (flash sale, por cantidad, por categoría). Antes
  // solo se calculaban en el navegador: el pago mostraba el precio rebajado y
  // aquí se cobraba el completo.
  const { descuento: descuentoAuto } = await calcularDescuentoAuto(priced.items, priced.total, products);
  const { descuento, total: montoFinal, vieneDePromo } = mejorTotal(priced.total, promoDescuento, descuentoAuto);
  // Ganó la oferta automática: el cupón no se usa, así que su uso se devuelve.
  if (!vieneDePromo) await reserva?.liberar();

  // Nunca cobrar por encima de lo que el cliente vio en pantalla.
  const control = comprobarMontoEsperado(montoFinal, body.montoMostrado);
  if (!control.ok) {
    await reserva?.liberar();
    return { error: control.error, status: 409 };
  }

  return {
    items: priced.items,
    montoFinal,
    promoCode,
    promoDescuento: descuento,
    descuentoDePromo: vieneDePromo,
    referido,
  };
}
