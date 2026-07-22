// Cálculo de precio con descuento de catálogo (oferta directa, sin código).
// Función PURA sin dependencias — se usa igual en el navegador (para mostrar
// el precio tachado) y en el servidor (para cobrar exactamente lo mismo que
// se muestra, sin importar lo que mande el navegador).
//
// product.offerPricing[sizeId] es el precio de oferta EDITADO DIRECTAMENTE
// por el admin (no un porcentaje). Solo se aplica si es un número mayor a 0
// y menor al precio regular de ese tamaño — evita un error de tipeo que
// regale el producto o "descuente" a un precio más caro.
//
// product.discountPercent es el mecanismo antiguo (por porcentaje) — se
// mantiene como respaldo para productos que aún no tienen offerPricing.
export function getEffectivePrice(product, sizeId) {
  const original = product?.sizePricing?.[sizeId];
  if (original == null) return null;

  const offer = product?.offerPricing?.[sizeId];
  if (isValidOffer(offer, original)) {
    const final = round2(offer);
    const discountPercent = round2(((original - final) / original) * 100);
    return { original, final, discountPercent };
  }

  const pct = clampPercent(product?.discountPercent);
  const final = pct > 0 ? round2(original * (1 - pct / 100)) : original;
  return { original, final, discountPercent: pct };
}

function isValidOffer(offer, original) {
  const n = Number(offer);
  return Number.isFinite(n) && n > 0 && n < original;
}

export function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, 90);
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}
