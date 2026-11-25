// Medios de pago de Culqi que se ofrecen en la ventana de pago.

/**
 * Qué medios de Culqi se ofrecen para este monto. Límites de Culqi
 * (docs.culqi.com, 25/11/2026): billeteras con QR de S/ 6 a S/ 500 y
 * Cuotéalo desde S/ 100. Los que van por orden solo si la orden se creó.
 */
export function mediosDeCulqi(total, hayOrden, maxYape = 2000) {
  const t = Number(total) || 0;
  return {
    tarjeta: true,
    yape: t <= maxYape,
    billetera: hayOrden && t >= 6 && t <= 500,
    bancaMovil: hayOrden,
    agente: hayOrden,
    cuotealo: hayOrden && t >= 100,
  };
}
