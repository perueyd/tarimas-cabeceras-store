// Errores en producción: que lleguen al panel, sin datos personales y sin
// llenar el teléfono de avisos.
//
// El fallo que evita: los errores solo quedaban en los registros de Vercel,
// que nadie mira. Un cobro sin pedido guardado o una pantalla en blanco en el
// móvil de un cliente se descubrían días después, por una queja.

import test from 'node:test';
import assert from 'node:assert/strict';

const REDIS_URL = 'https://redis.prueba.local';
process.env.UPSTASH_REDIS_REST_URL = REDIS_URL;
process.env.UPSTASH_REDIS_REST_TOKEN = 'prueba';
process.env.ALERTAS_URL = 'https://ntfy.prueba.local/tema';

const db = new Map();
const avisos = [];
globalThis.fetch = async (url, opts = {}) => {
  if (url === REDIS_URL) {
    const [cmd, key, ...args] = JSON.parse(opts.body);
    let result = null;
    if (cmd === 'LPUSH') { const l = db.get(key) || []; l.unshift(...args); db.set(key, l); result = l.length; }
    if (cmd === 'LTRIM') db.set(key, (db.get(key) || []).slice(Number(args[0]), Number(args[1]) + 1));
    if (cmd === 'LRANGE') result = (db.get(key) || []).slice(Number(args[0]), Number(args[1]) + 1);
    if (cmd === 'INCR') { const n = Number(db.get(key) || 0) + 1; db.set(key, n); result = n; }
    if (cmd === 'GET') result = db.get(key) ?? null;
    return { ok: true, json: async () => ({ result }) };
  }
  avisos.push({ url, body: opts.body });
  return { ok: true, json: async () => ({}) };
};

const { avisarError, listarErrores } = await import('../api/_alertas.js');
const { default: rutaErrores } = await import('../api/_rutas/errores.js');

test('alertas: el error queda en la lista y avisa al teléfono una sola vez', async () => {
  await avisarError('cobro con tarjeta', 'Culqi no responde');
  await avisarError('cobro con tarjeta', 'Culqi no responde');
  const lista = await listarErrores();
  assert.equal(lista.length, 2, 'en la lista se guardan todos');
  assert.equal(avisos.length, 1, 'al teléfono solo uno: si falla en bucle no se llena de avisos');
  assert.match(avisos[0].body, /Culqi no responde/);
});

test('alertas: la lista no crece sin fin (se quedan los 50 más nuevos)', async () => {
  for (let i = 0; i < 60; i++) await avisarError('prueba', `error ${i}`);
  const lista = await listarErrores();
  assert.equal(lista.length, 50);
  assert.equal(lista[0].mensaje, 'error 59', 'el más nuevo va primero');
});

test('alertas: lo que manda el navegador no guarda la parte "?..." de la dirección', async () => {
  const res = { status() { return this; }, json() { return this; } };
  await rutaErrores(
    { method: 'POST', headers: {}, socket: {}, body: { mensaje: 'x is undefined', donde: '/seguimiento?codigo=ED-123&email=a@b.pe' } },
    res
  );
  const [ultimo] = await listarErrores();
  assert.equal(ultimo.origen, 'navegador /seguimiento');
  assert.doesNotMatch(JSON.stringify(ultimo), /ED-123|a@b\.pe/);
});
