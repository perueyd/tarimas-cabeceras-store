// Códigos promocionales (cupones de descuento) — vive en Redis, editable desde
// el panel /pedidos → "Promociones". Sin base de datos conectada, los códigos
// simplemente no existen todavía (el checkout sigue funcionando sin ellos).
import { hasDB, redisCmd } from './_store.js';
import { vencida } from './_ofertas-auto.js';

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

// Cupones creados desde la pestaña "Ofertas y descuentos" (tipo 'codigo').
// Se traducen a la misma forma que usan los de 'promo:codes' para poder
// validarlos con las mismas reglas.
async function codigosDesdeOfertas() {
  if (!hasDB) return [];
  try {
    const data = await redisCmd(['GET', 'ofertas:todas']);
    if (!data.result) return [];
    const list = JSON.parse(data.result);
    if (!Array.isArray(list)) return [];
    return list
      .filter((o) => o.tipo === 'codigo' && (o.codigo || o.code))
      .map((o) => ({
        code: normalizeCode(o.codigo || o.code),
        tipo: o.tipoDesc === 'monto' ? 'monto' : 'porcentaje',
        valor: o.valor,
        activo: o.activo !== false,
        vence: o.vence || null,
        maxUsos: o.maxUsos || null,
        usados: o.usados || 0,
        desdeOfertas: true, // el contador de usos vive en la otra clave
      }));
  } catch {
    return [];
  }
}

// Valida un código contra un total dado y calcula el descuento en soles.
// SEGURIDAD: se llama tanto al mostrar el descuento en el checkout como al
// confirmar el pedido — nunca se confía en un "descuento" que mande el
// navegador, siempre se recalcula aquí desde el código guardado en Redis.
export async function validatePromo(rawCode, total, cartInfo = {}) {
  const code = normalizeCode(rawCode);
  if (!code) return { valid: false, motivo: 'Ingresa un código.' };
  if (!(total > 0)) return { valid: false, motivo: 'El carrito está vacío.' };

  // Los códigos viven en DOS sitios por historia del proyecto: los de la
  // pantalla "Códigos de descuento" en 'promo:codes', y los que se crean en
  // "Ofertas y descuentos" con tipo 'codigo' en 'ofertas:todas'. El checkout
  // solo miraba el primero, así que un cupón creado desde Ofertas se repartía
  // y luego era rechazado. Aquí se buscan en los dos.
  const list = [...(await listPromoCodes()), ...(await codigosDesdeOfertas())];
  const promo = list.find((p) => p.code === code);
  if (!promo) return { valid: false, motivo: 'Ese código no existe.' };
  if (!promo.activo) return { valid: false, motivo: 'Ese código ya no está activo.' };
  if (promo.vence && vencida(promo.vence)) {
    return { valid: false, motivo: 'Ese código venció.' };
  }
  if (promo.maxUsos) {
    // Se toma el mayor entre el contador atómico y el guardado en la lista:
    // así los cupones creados antes de existir el contador siguen respetando
    // su límite, y los nuevos no se pasan por una carrera entre dos compras.
    const usados = Math.max(await usosDe(code), promo.usados || 0);
    if (usados >= promo.maxUsos) {
      return { valid: false, motivo: 'Ese código alcanzó su límite de usos.' };
    }
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
    if (d.vence && vencida(d.vence)) continue;

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
// Contador de usos APARTE, con suma atómica.
//
// Antes el uso se apuntaba leyendo la lista entera de cupones, sumando 1 y
// volviendo a guardarla. Dos compras a la vez leían las dos "5 usos" y las dos
// guardaban "6": se perdía un uso. Con un cupón limitado a 10, se podía
// canjear más veces de las permitidas. HINCRBY suma en la base, sin huecos.
const KEY_USOS = 'promo:usos';

export async function usosDe(code) {
  if (!hasDB) return 0;
  try {
    const data = await redisCmd(['HGET', KEY_USOS, normalizeCode(code)]);
    return Number(data.result) || 0;
  } catch {
    return 0;
  }
}

// Reserva un uso ANTES de aplicar el descuento, de forma atómica.
//
// Comprobar el límite y luego sumarlo son dos pasos, y entre medias caben
// otras compras: cinco clientes con el mismo cupón de 3 usos pasaban los cinco
// la comprobación antes de que ninguno hubiera sumado el suyo. Aquí se suma
// PRIMERO (HINCRBY devuelve el nuevo total) y, si se pasó del límite, se
// devuelve el uso y se rechaza. Así nunca se reparten más de los permitidos.
export async function reservarUso(code, maxUsos) {
  const buscado = normalizeCode(code);
  if (!hasDB || !maxUsos) return true; // sin límite, no hay nada que reservar
  try {
    const data = await redisCmd(['HINCRBY', KEY_USOS, buscado, '1']);
    const n = Number(data.result) || 0;
    if (n > maxUsos) {
      await redisCmd(['HINCRBY', KEY_USOS, buscado, '-1']).catch(() => {});
      return false;
    }
    return true;
  } catch {
    return true; // si la base falla, no se bloquea la compra por el cupón
  }
}

export async function registerPromoUsage(code) {
  const buscado = normalizeCode(code);

  // La lista se sigue actualizando para que el panel muestre el número, pero
  // ya no es lo que decide si el cupón se agotó.
  const list = await listPromoCodes();
  const idx = list.findIndex((p) => p.code === buscado);
  if (idx !== -1) {
    list[idx] = { ...list[idx], usados: (list[idx].usados || 0) + 1 };
    await savePromoCodes(list);
    return;
  }

  // El cupón puede venir de la pestaña "Ofertas y descuentos", que guarda en
  // otra clave. Sin esto, el contador de usos se quedaba a cero y un código
  // con límite de 10 usos se podía canjear infinitas veces.
  if (!hasDB) return;
  try {
    const data = await redisCmd(['GET', 'ofertas:todas']);
    if (!data.result) return;
    const ofertas = JSON.parse(data.result);
    if (!Array.isArray(ofertas)) return;
    const i = ofertas.findIndex(
      (o) => o.tipo === 'codigo' && normalizeCode(o.codigo || o.code) === buscado
    );
    if (i === -1) return;
    ofertas[i] = { ...ofertas[i], usados: (ofertas[i].usados || 0) + 1 };
    await redisCmd(['SET', 'ofertas:todas', JSON.stringify(ofertas)]);
  } catch { /* no se bloquea la compra por no poder contar un uso */ }
}

export function isValidTipo(tipo) {
  return TIPOS.includes(tipo);
}

export function isValidTipoDesc(tipo) {
  return TIPOS_DESC.includes(tipo);
}

export { normalizeCode };
