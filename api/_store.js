// Almacén de pedidos usando Upstash Redis (REST, sin dependencias) + copia a
// Google Sheets vía webhook de Apps Script (variable SHEETS_WEBHOOK_URL).
// - Redis se activa al conectar la integración "Upstash Redis" (gratis) en Vercel.
// - La hoja de Google se activa pegando la URL del Apps Script en SHEETS_WEBHOOK_URL
//   (instrucciones en GUIA-EDICION.md).
// Si nada está configurado, los pedidos quedan en los logs de Vercel como respaldo.

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const SHEETS_URL = process.env.SHEETS_WEBHOOK_URL;

export const hasDB = Boolean(REDIS_URL && REDIS_TOKEN);

export async function redisCmd(command) {
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

export function newOrderCode() {
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `ED-${Date.now().toString(36).toUpperCase()}${rand}`;
}

async function sendToSheet(order) {
  if (!SHEETS_URL) return;
  try {
    await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
  } catch (err) {
    console.log('No se pudo enviar el pedido a Google Sheets:', err?.message);
  }
}

export async function saveOrder(order) {
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
  await sendToSheet(order); // copia a la hoja de Google (si está configurada)
  return saved;
}

export async function listOrders(limit = 200) {
  if (!hasDB) return null;
  const data = await redisCmd(['LRANGE', 'pedidos', '0', String(limit - 1)]);
  return (data.result || [])
    .map((raw) => {
      try { return JSON.parse(raw); } catch { return null; }
    })
    .filter(Boolean);
}
