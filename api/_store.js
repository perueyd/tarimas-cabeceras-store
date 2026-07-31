// Almacén de pedidos usando Upstash Redis (REST, sin dependencias) + copia a
// Google Sheets vía webhook de Apps Script (variable SHEETS_WEBHOOK_URL).
// - Redis se activa al conectar la integración "Upstash Redis" (gratis) en Vercel.
// - La hoja de Google (y el correo automático al cliente) se activan pegando la
//   URL del Apps Script en SHEETS_WEBHOOK_URL (instrucciones en GUIA-EDICION.md).
// Si nada está configurado, los pedidos quedan en los logs de Vercel como respaldo.

import { randomBytes } from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const SHEETS_URL = process.env.SHEETS_WEBHOOK_URL;

const HAY_REDIS = Boolean(REDIS_URL && REDIS_TOKEN);

// Solo en desarrollo local (`npm run dev`), y solo si no hay Redis de verdad:
// se usa una base en archivo para poder probar el panel sin credenciales.
// dev-server.js pone LOCAL_DEV_DB=1; en Vercel nunca está, así que allí esto
// siempre es false y la tienda funciona exactamente igual que antes.
const USAR_DB_LOCAL = !HAY_REDIS && process.env.LOCAL_DEV_DB === '1';

export const hasDB = HAY_REDIS || USAR_DB_LOCAL;

export async function redisCmd(command) {
  if (USAR_DB_LOCAL) {
    const { localRedisCmd } = await import('./_localdb.js');
    return localRedisCmd(command);
  }
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis error ${res.status}`);
  return res.json();
}

// Código de pedido. El seguimiento público (/api/orders?code=) devuelve datos
// del pedido a quien tenga el código, así que el código ES la credencial: tiene
// que ser IMPOSIBLE de adivinar.
//
// Antes se usaba Date.now() + 2 caracteres de Math.random(): la fecha es
// predecible y 2 caracteres son ~1300 combinaciones, así que alguien podía
// probar códigos hasta encontrar pedidos ajenos. Ahora los 10 caracteres
// aleatorios salen de crypto (≈50 bits), lo que vuelve inviable adivinarlos.
// Se mantiene el prefijo ED- y el formato corto para que sea fácil de dictar.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O/0/I/1 (se confunden)

export function newOrderCode() {
  const bytes = randomBytes(10);
  let code = '';
  for (const b of bytes) code += ALFABETO[b % ALFABETO.length];
  return `ED-${code}`;
}

// Notifica al Apps Script de Google: agrega/actualiza la fila en la hoja y
// envía el correo automático al cliente. `evento` indica qué pasó.
export async function notifySheet(payload) {
  if (!SHEETS_URL) return;
  try {
    await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.log('No se pudo notificar a Google Sheets:', err?.message);
  }
}

// `extra` son datos que viajan solo en la notificación (no se guardan en el
// pedido), p. ej. el correo del dueño para que el Apps Script le avise.
export async function saveOrder(order, extra = {}) {
  let saved = false;
  if (hasDB) {
    try {
      await redisCmd(['LPUSH', 'pedidos', JSON.stringify(order)]);
      saved = true;
    } catch (err) {
      console.log('PEDIDO (error Redis):', JSON.stringify(order));
    }
  } else {
    console.log('PEDIDO (BD no configurada):', JSON.stringify(order));
  }
  await notifySheet({ evento: 'creado', ...order, ...extra });
  return saved;
}

// Reemplaza un elemento de una lista de Redis SIN usar su posición.
//
// El patrón anterior era: leer la lista con LRANGE, buscar el índice i, y
// escribir con LSET <i>. Entre esas dos llamadas hay un viaje de red completo,
// y como los elementos entran con LPUSH (por delante), cualquier pedido nuevo
// que llegue en ese hueco corre todos los índices: el LSET pisaba el elemento
// EQUIVOCADO. Un pedido real —con su cliente, dirección y monto— se perdía sin
// recuperación posible, y quedaba duplicado el otro. En el Libro de
// Reclamaciones eso además incumple la Ley 29571.
//
// Aquí se identifica por VALOR (LREM), que no depende de la posición.
// El orden importa: primero se AÑADE el nuevo y luego se quita el viejo. Si
// algo fallara en medio, queda un duplicado (molesto pero recuperable) en vez
// de una pérdida (irrecuperable).
export async function reemplazarEnLista(clave, valorViejo, valorNuevo) {
  if (!hasDB) return false;
  await redisCmd(['LPUSH', clave, valorNuevo]);
  await redisCmd(['LREM', clave, '0', valorViejo]);
  return true;
}

export async function deleteOrder(code) {
  if (!hasDB) return false;
  const data = await redisCmd(['LRANGE', 'pedidos', '0', '499']);
  const list = data.result || [];
  const raw = list.find((x) => {
    try { return JSON.parse(x).code === code; } catch { return false; }
  });
  if (!raw) return false;
  await redisCmd(['LREM', 'pedidos', '0', raw]);
  return true;
}

export async function listOrders(limit = 200) {
  if (!hasDB) return null;
  const data = await redisCmd(['LRANGE', 'pedidos', '0', String(limit - 1)]);
  const pedidos = (data.result || [])
    .map((raw) => {
      try { return JSON.parse(raw); } catch { return null; }
    })
    .filter(Boolean);

  // Editar un pedido lo mueve al principio de la lista (ver reemplazarEnLista),
  // así que el orden de la lista ya no equivale al orden de llegada. Se ordena
  // por FECHA para que el panel muestre siempre los más recientes arriba.
  pedidos.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

  // Si una escritura se quedó a medias podría haber dos copias del mismo
  // pedido; se muestra solo la primera (la más reciente por fecha).
  const vistos = new Set();
  return pedidos.filter((o) => {
    if (!o.code) return true;
    if (vistos.has(o.code)) return false;
    vistos.add(o.code);
    return true;
  });
}
