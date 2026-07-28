// Códigos promocionales (cupones de descuento) — vive en Redis, editable desde
// el panel /pedidos → "Promociones". Sin base de datos conectada, los códigos
// simplemente no existen todavía (el checkout sigue funcionando sin ellos).
import { hasDB, redisCmd } from './_store.js';

const KEY = 'promo:codes';
const KEY_DESCUENTOS = 'descuentos:automaticos';
const TIPOS = ['porcentaje', 'monto'];
const TIPOS_DESC = ['flashsale', 'cantidad', 'categoria'];

export async function listPromoCodes() {
  if (!hasDB) return [];
  const data = await redisCmd(['GET', KEY]);
  if (!data.result) return [];
  try {
    const list = JSON.parse(data.result);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function listDescuentosAutomaticos() {
  if (!hasDB) return [];
  const data = await redisCmd(['GET', KEY_DESCUENTOS]);
  if (!data.result) return [];
  try {
    const list = JSON.parse(data.result);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveDescuentosAutomaticos(list) {
  if (!hasDB) return false;
  await redisCmd(['SET', KEY_DESCUENTOS, JSON.stringify(list)]);
  return true;
}

export async function savePromoCodes(list) {
  if (!hasDB) return false;
  await redisCmd(['SET', KEY, JSON.stringify(list)]);
  return true;
}

function normalizeCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

// Valida un código contra un total dado y calcula el descuento en soles.
// SEGURIDAD: se llama tanto al mostrar el descuento en el checkout como al
// confirmar el pedido — nunca se confía en un "descuento" que mande el
// navegador, siempre se recalcula aquí desde el código guardado en Redis.
export async function validatePromo(rawCode, total, cartInfo = {}) {
  const code = normalizeCode(rawCode);
  if (!code) return { valid: false, motivo: 'Ingresa un código.' };
  if (!(total > 0)) return { valid: false, motivo: 'El carrito está vacío.' };

  const list = await listPromoCodes();
  const promo = list.find((p) => p.code === code);
  if (!promo) return { valid: false, motivo: 'Ese código no existe.' };
  if (!promo.activo) return { valid: false, motivo: 'Ese código ya no está activo.' };
  if (promo.vence && new Date(promo.vence + 'T23:59:59') < new Date()) {
    return { valid: false, motivo: 'Ese código venció.' };
  }
  if (promo.maxUsos && (promo.usados || 0) >= promo.maxUsos) {
    return { valid: false, motivo: 'Ese código alcanzó su límite de usos.' };
  }

  let descuento;
  if (promo.tipo === 'monto') {
    descuento = Math.max(Number(promo.valor) || 0, 0);
  } else {
    const pct = Math.min(Math.max(Number(promo.valor) || 0, 0), 100);
    descuento = total * (pct / 100);
  }
  descuento = Math.round(Math.min(descuento, total) * 100) / 100; // nunca más que el total

  return { valid: true, promo, descuento };
}

// Calcula descuentos automáticos (flash sale, cantidad, categoría)
// sin necesidad de código promocional.
export async function calcularDescuentosAutomaticos(total, cartInfo = {}) {
  if (!(total > 0)) return { descuentos: [] };

  const descuentos = await listDescuentosAutomaticos();
  const aplicables = [];

  for (const d of descuentos) {
    if (!d.activo) continue;
    if (d.vence && new Date(d.vence + 'T23:59:59') < new Date()) continue;

    let aplica = false;
    let razon = '';

    if (d.tipo === 'flashsale') {
      aplica = true;
      razon = '🎉 Flash Sale';
    } else if (d.tipo === 'cantidad') {
      const cantidadItems = cartInfo.cantidadItems || 0;
      if (cantidadItems >= (d.cantidadMinima || 2)) {
        aplica = true;
        razon = `Llevas ${cantidadItems}+ productos`;
      }
    } else if (d.tipo === 'categoria') {
      const categorias = cartInfo.categorias || [];
      if (categorias.includes(d.categoria)) {
        aplica = true;
        razon = `Descuento en ${d.categoria}`;
      }
    }

    if (aplica) {
      let descuento;
      if (d.tipoDesc === 'monto') {
        descuento = Math.max(Number(d.valor) || 0, 0);
      } else {
        const pct = Math.min(Math.max(Number(d.valor) || 0, 0), 100);
        descuento = total * (pct / 100);
      }
      descuento = Math.round(Math.min(descuento, total) * 100) / 100;
      aplicables.push({ id: d.id, tipo: d.tipo, valor: d.valor, tipoDesc: d.tipoDesc, descuento, razon });
    }
  }

  return { descuentos: aplicables };
}

// Suma un uso al código (se llama SOLO tras confirmar el pedido, nunca antes).
export async function registerPromoUsage(code) {
  const list = await listPromoCodes();
  const idx = list.findIndex((p) => p.code === normalizeCode(code));
  if (idx === -1) return;
  list[idx] = { ...list[idx], usados: (list[idx].usados || 0) + 1 };
  await savePromoCodes(list);
}

export function isValidTipo(tipo) {
  return TIPOS.includes(tipo);
}

export function isValidTipoDesc(tipo) {
  return TIPOS_DESC.includes(tipo);
}

export { normalizeCode };
