// Observaciones del cliente al comprar (pedido del dueño, 19/11/2026).
//
// Qué vigila: que lo que el cliente escribe llegue al pedido limpio y con
// tope (lo que viene del navegador nunca se guarda sin revisar: ya se guardó
// una vez la IP en claro), y que el campo NO salga en el seguimiento público
// por código, que no devuelve datos personales.

import test from 'node:test';
import assert from 'node:assert/strict';

const REDIS_URL = 'https://redis.prueba.local';
process.env.UPSTASH_REDIS_REST_URL = REDIS_URL;
process.env.UPSTASH_REDIS_REST_TOKEN = 'prueba';
process.env.ORDERS_ADMIN_KEY = 'clave-de-prueba';
delete process.env.SHEETS_WEBHOOK_URL;
delete process.env.ALERTAS_URL;

const db = new Map();
globalThis.fetch = async (url, opts = {}) => {
  if (url !== REDIS_URL) return { ok: true, json: async () => ({}), text: async () => '' };
  const [cmd, key, ...args] = JSON.parse(opts.body);
  let result = null;
  switch (cmd) {
    case 'GET': result = db.get(key) ?? null; break;
    case 'MGET': result = [key, ...args].map((k) => db.get(k) ?? null); break;
    case 'SET': db.set(key, args[0]); result = 'OK'; break;
    case 'INCR': { const n = Number(db.get(key) || 0) + 1; db.set(key, String(n)); result = n; break; }
    case 'EXPIRE': result = 1; break;
    case 'HGET': result = db.get(key)?.[args[0]] ?? null; break;
    case 'HSET': { const h = db.get(key) || {}; h[args[0]] = args[1]; db.set(key, h); result = 1; break; }
    case 'LPUSH': { const l = db.get(key) || []; l.unshift(...args); db.set(key, l); result = l.length; break; }
    case 'LTRIM': result = 'OK'; break;
    case 'LRANGE': result = db.get(key) || []; break;
    default: result = null;
  }
  return { ok: true, json: async () => ({ result }) };
};

const { default: pedidos } = await import('../api/orders.js');
const { limpiarObservaciones, MAX_OBSERVACIONES } = await import('../src/lib/observaciones.js');

let ip = 0;
async function llamar(method, { query = {}, body } = {}) {
  const res = { codigo: 0, cuerpo: null, status(c) { this.codigo = c; return this; }, json(x) { this.cuerpo = x; return this; } };
  ip += 1;
  await pedidos({ method, query, body, headers: { 'x-real-ip': `10.2.0.${ip}` }, socket: {} }, res);
  return res;
}
const comprar = (extra = {}) => {
  db.clear();
  db.set('catalog:products', JSON.stringify([{ id: 'milan', name: 'MILÁN', category: 'cabeceras', sizePricing: { '2plazas': 200 } }]));
  return llamar('POST', {
    body: { metodo: 'Yape', nombre: 'Cliente de prueba', telefono: '999000111', montoMostrado: 200, items: [{ productId: 'milan', sizeId: '2plazas', qty: 1 }], ...extra },
  });
};
const ultimoPedido = () => JSON.parse(db.get('pedidos')[0]);

test('las observaciones del cliente llegan al pedido', async () => {
  const res = await comprar({ observaciones: '  Llamar antes de llegar.\n\nDejarlo con el portero.  ' });
  assert.equal(res.codigo, 200, JSON.stringify(res.cuerpo));
  assert.equal(ultimoPedido().observaciones, 'Llamar antes de llegar.\n\nDejarlo con el portero.');
});

test('sin observaciones el pedido queda igual que antes', async () => {
  for (const valor of [undefined, '', '   ', null]) {
    await comprar({ observaciones: valor });
    assert.equal('observaciones' in ultimoPedido(), false, `se guardó un campo vacío con ${JSON.stringify(valor)}`);
  }
});

test('se limpian y tienen tope: lo que manda el navegador no se guarda tal cual', async () => {
  await comprar({ observaciones: 'x'.repeat(5000) });
  assert.equal(ultimoPedido().observaciones.length, MAX_OBSERVACIONES);
  await comprar({ observaciones: { trampa: 1 } });
  assert.equal('observaciones' in ultimoPedido(), false, 'un objeto no puede colarse en el pedido');
  assert.equal(limpiarObservaciones('a\u0000b\tc\n\n\n\nd'), 'ab c\n\nd');
});

test('el seguimiento público por código no las enseña (pueden llevar datos personales)', async () => {
  await comprar({ observaciones: 'Mi vecino de la casa 12 recibe' });
  const { code } = ultimoPedido();
  const res = await llamar('GET', { query: { code } });
  assert.equal(res.codigo, 200, JSON.stringify(res.cuerpo));
  assert.ok(!JSON.stringify(res.cuerpo).includes('vecino'), 'las observaciones salen en el seguimiento público');
});
