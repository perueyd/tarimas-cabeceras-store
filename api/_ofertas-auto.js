// Descuentos automáticos (flash sale, por cantidad, por categoría) calculados
// EN EL SERVIDOR.
//
// Antes solo existían en el navegador: src/pages/Checkout.jsx los calculaba y
// mostraba el total rebajado, pero al cobrar (api/create-charge.js) y al
// guardar el pedido (api/orders.js) el servidor solo restaba el descuento de un
// CÓDIGO promocional. Resultado: la pantalla decía S/ 280, a la tarjeta se le
// cobraban S/ 350, y la página de gracias volvía a decir S/ 280 — el cliente no
// se enteraba de que le habían cobrado de más.
//
// Este módulo es ahora la única fuente de verdad. La lógica es la misma que la
// del checkout a propósito: si las dos no coinciden, el cobro se rechaza en vez
// de pasar callado (ver comprobarMontoEsperado más abajo).

import { hasDB, redisCmd } from './_store.js';

const KEY = 'ofertas:todas';

async function listarOfertas() {
  if (!hasDB) return [];
  try {
    const data = await redisCmd(['GET', KEY]);
    if (!data.result) return [];
    const list = JSON.parse(data.result);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// Devuelve { descuento, aplicadas } para un carrito ya validado por priceOrder.
// `products` es el catálogo, necesario para saber la categoría de cada artículo.
export async function calcularDescuentoAuto(items, total, products) {
  const ofertas = await listarOfertas();
  if (!ofertas.length) return { descuento: 0, aplicadas: [] };

  const cantidadItems = items.reduce((n, i) => n + (i.qty || 0), 0);
  const porId = new Map(products.map((p) => [p.id, p]));
  const categorias = [
    ...new Set(items.map((i) => porId.get(i.productId)?.category).filter(Boolean)),
  ];

  const aplicadas = [];
  const ahora = new Date();

  for (const oferta of ofertas) {
    if (!oferta.activo) continue;
    if (oferta.vence && new Date(oferta.vence + 'T23:59:59') < ahora) continue;

    let aplica = false;
    let razon = '';

    if (oferta.tipo === 'flash-sale') {
      aplica = true;
      razon = 'Flash Sale';
    } else if (oferta.tipo === 'cantidad') {
      if (cantidadItems >= (oferta.cantidadMinima || 2)) {
        aplica = true;
        razon = `${cantidadItems}+ artículos`;
      }
    } else if (oferta.tipo === 'categoria') {
      if (categorias.includes(oferta.categoria)) {
        aplica = true;
        razon = `Categoría: ${oferta.categoria}`;
      }
    }
    if (!aplica) continue;

    let descuento;
    if (oferta.tipoDesc === 'monto') {
      descuento = Math.max(Number(oferta.valor) || 0, 0);
    } else {
      const pct = Math.min(Math.max(Number(oferta.valor) || 0, 0), 100);
      descuento = total * (pct / 100);
    }
    descuento = Math.round(Math.min(descuento, total) * 100) / 100;
    aplicadas.push({ id: oferta.id, tipo: oferta.tipo, descuento, razon });
  }

  // Solo se aplica el MEJOR descuento, no la suma: es lo que hace el checkout.
  const descuento = aplicadas.reduce((max, a) => Math.max(max, a.descuento), 0);
  return { descuento, aplicadas };
}

// Calcula el total definitivo: gana el mejor descuento entre el código
// promocional y los automáticos (no se acumulan).
export function mejorTotal(total, descuentoPromo, descuentoAuto) {
  // El descuento se acota al total: si no, un cupón mal configurado quedaría
  // guardado en el pedido como "descuento de S/ 500" sobre una compra de
  // S/ 100, y las cuentas del panel saldrían mal.
  const mejor = Math.round(Math.min(Math.max(descuentoPromo || 0, descuentoAuto || 0, 0), total) * 100) / 100;
  return {
    descuento: mejor,
    total: Math.round(Math.max(total - mejor, 0) * 100) / 100,
    vieneDePromo: (descuentoPromo || 0) >= (descuentoAuto || 0) && (descuentoPromo || 0) > 0,
  };
}

// Red de seguridad: compara lo que el servidor va a cobrar con lo que el
// navegador dijo que iba a cobrar.
//
// Si el servidor cobra MÁS, el cliente estaría pagando por encima de lo que vio
// en pantalla; eso no se hace nunca en silencio. Suele significar que la oferta
// acaba de vencer entre que cargó la página y pulsó pagar.
// Si el servidor cobra MENOS, se cobra lo del servidor (favorece al cliente).
export function comprobarMontoEsperado(totalServidor, totalNavegador) {
  const esperado = Number(totalNavegador);
  if (!Number.isFinite(esperado) || esperado <= 0) return { ok: true }; // navegador antiguo: no se bloquea
  if (totalServidor > esperado + 0.01) {
    return {
      ok: false,
      error: 'El precio cambió mientras completabas la compra (puede que una oferta acabara de vencer). Recarga la página para ver el total actualizado.',
    };
  }
  return { ok: true };
}
