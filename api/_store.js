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
  await notifySheet({ evento: 'creado', ...order });
  return saved;
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
  return (data.result || [])
    .map((raw) => {
      try { return JSON.parse(raw); } catch { return null; }
    })
    .filter(Boolean);
}
