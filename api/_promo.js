// Códigos promocionales (cupones de descuento) — vive en Redis, editable desde
// el panel /pedidos → "Promociones". Sin base de datos conectada, los códigos
// simplemente no existen todavía (el checkout sigue funcionando sin ellos).
import { hasDB, redisCmd } from './_store.js';

const KEY = 'promo:codes';
const TIPOS = ['porcentaje', 'monto'];

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
export async function validatePromo(rawCode, total) {
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

export { normalizeCode };
