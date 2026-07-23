import { getUnitPrice } from '../src/lib/pricing.js';

// SEGURIDAD: el total SIEMPRE se recalcula en el servidor a partir del catálogo
// ACTUAL (Redis si está editado, o el estático como respaldo — ver _catalog.js),
// aplicando el mismo descuento de oferta y los mismos recargos por opciones que
// ve el cliente (getUnitPrice). Nunca se confía en los precios ni en los
// recargos que envíe el navegador (un atacante podría manipularlos): las
// opciones elegidas se revalidan contra el catálogo. Si un item no existe o no
// tiene precio, el pedido se rechaza.
export function priceOrder(products, rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 20) return null;
  let total = 0;
  const items = [];
  for (const it of rawItems) {
    const p = products.find((x) => x.id === it?.productId);
    if (!p) return null;
    const priceInfo = getUnitPrice(p, it.sizeId, it.opciones);
    if (!priceInfo) return null;
    const unitPrice = priceInfo.unitPrice;
    const qty = Math.min(Math.max(parseInt(it.qty, 10) || 0, 1), 20);
    total += unitPrice * qty;
    items.push({
      productId: p.id,
      productName: p.name,
      sizeId: String(it.sizeId).slice(0, 30),
      colorId: String(it.colorId || '').slice(0, 30),
      // Segundo color, solo en muebles de dos telas.
      colorId2: it.colorId2 ? String(it.colorId2).slice(0, 30) : undefined,
      qty,
      unitPrice,
      // Texto legible de las opciones elegidas, ej. "Brazos: Con brazos".
      // Sale del catálogo, no de lo que mandó el navegador.
      opciones: priceInfo.detalle.map((d) => ({ label: d.grupoLabel, valor: d.valorLabel })),
    });
  }
  return { total: Math.round(total * 100) / 100, items };
}

// Recorta un texto a un largo máximo (contra payloads gigantes).
export function s(value, max) {
  return String(value ?? '').slice(0, max);
}
