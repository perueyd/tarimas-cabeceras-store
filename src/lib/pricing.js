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

// Opciones del producto (ej. "Con brazos / Sin brazos", tipo de patas, tipo de
// botón). Devuelve cuánto suman al precio y el detalle legible de lo elegido.
//
// SEGURIDAD: solo cuenta grupos y valores que existan DE VERDAD en el producto
// del catálogo — si el navegador manda una opción inventada o un recargo
// distinto, se ignora y se usa el del catálogo. Los recargos negativos se
// tratan como 0 (para "más barato sin brazos", pon el precio base sin brazos
// y cobra un extra por ponerlos).
export function resolveOpciones(product, seleccion) {
  const grupos = Array.isArray(product?.opciones) ? product.opciones : [];
  const sel = seleccion && typeof seleccion === 'object' ? seleccion : {};
  let extra = 0;
  const detalle = [];
  for (const g of grupos) {
    const valor = (g.valores || []).find((v) => v.id === sel[g.id]);
    if (!valor) continue;
    const precioExtra = Math.max(Number(valor.precioExtra) || 0, 0);
    extra += precioExtra;
    detalle.push({
      grupoId: g.id,
      grupoLabel: g.label,
      valorId: valor.id,
      valorLabel: valor.label,
      precioExtra,
    });
  }
  return { extra: round2(extra), detalle };
}

// Precio unitario final: precio del tamaño (con su oferta si tiene) + los
// recargos de las opciones elegidas.
export function getUnitPrice(product, sizeId, seleccionOpciones) {
  const base = getEffectivePrice(product, sizeId);
  if (!base) return null;
  const { extra, detalle } = resolveOpciones(product, seleccionOpciones);
  return { ...base, extra, detalle, unitPrice: round2(base.final + extra) };
}

/**
 * Lo que cuesta HOY una línea del carrito, con sus opciones incluidas.
 *
 * POR QUÉ EXISTE: el carrito vive en el navegador y guarda el precio del día
 * en que se añadió. Para refrescarlo se restaba un campo `precioBase` que
 * NADIE escribía nunca, así que el recargo calculado salía siempre 0 y se
 * perdía: una cabecera King con tela antifluido (+S/ 50) pasaba de S/ 460 a
 * S/ 410 sola, en cuanto cargaba el catálogo.
 *
 * Lo caro no era el descuento regalado: el servidor recalcula el precio de
 * verdad, ve que cobraría MÁS de lo que decía la pantalla y RECHAZA el cargo
 * para no cobrar de más. O sea que la venta no se caía por S/ 50 — se caía
 * entera, y el cliente no entendía por qué.
 *
 * Ahora se recalcula todo de cero desde el catálogo. No depende de ningún
 * campo guardado, así que arregla también los carritos que la gente ya tenga
 * abiertos en su navegador.
 */
export function precioDeLinea(product, item) {
  const info = getUnitPrice(product, item?.sizeId, item?.opciones);
  return info ? info.unitPrice : null;
}

export function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, 90);
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}
