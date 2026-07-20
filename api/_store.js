// Almacén de pedidos usando Upstash Redis (REST, sin dependencias).
// Se activa al conectar la integración "Upstash Redis" (gratis) en Vercel:
// el proyecto recibe las variables UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
// (o KV_REST_API_URL / KV_REST_API_TOKEN) automáticamente.
// Si aún no está conectada, los pedidos quedan en los logs de Vercel como respaldo.

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function redis(command) {
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

export async function saveOrder(order) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    // Respaldo: queda en los logs de la función en Vercel.
    console.log('PEDIDO (BD no configurada):', JSON.stringify(order));
    return false;
  }
  await redis(['LPUSH', 'pedidos', JSON.stringify(order)]);
  return true;
}

export async function listOrders(limit = 200) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const data = await redis(['LRANGE', 'pedidos', '0', String(limit - 1)]);
  return (data.result || [])
    .map((s) => {
      try { return JSON.parse(s); } catch { return null; }
    })
    .filter(Boolean);
}
