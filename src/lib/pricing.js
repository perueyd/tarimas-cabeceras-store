// Cálculo de precio con descuento de catálogo (oferta directa, sin código).
// Función PURA sin dependencias — se usa igual en el navegador (para mostrar
// el precio tachado) y en el servidor (para cobrar exactamente lo mismo que
// se muestra, sin importar lo que mande el navegador).
//
// product.discountPercent es OPCIONAL: 0, null o undefined = sin oferta.
// Tope de seguridad: nunca se acepta más de 90% (evita un error de tipeo de
// "10%" -> "100%" que regale el producto por accidente).
export function getEffectivePrice(product, sizeId) {
  const original = product?.sizePricing?.[sizeId];
  if (original == null) return null;
  const pct = clampPercent(product?.discountPercent);
  const final = pct > 0 ? round2(original * (1 - pct / 100)) : original;
  return { original, final, discountPercent: pct };
}

export function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, 90);
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}
