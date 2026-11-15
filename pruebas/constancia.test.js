// La constancia de pedido: el documento propio de la tienda.
//
// Función nueva (noviembre de 2026). El dueño usa dos documentos: esta
// constancia y la boleta o factura del facturador. Lo que estas pruebas
// vigilan son los dos fallos que eso podía traer, ambos ya vistos aquí:
//
//   · Publicar datos personales. El seguimiento por código devolvía "solo lo
//     no sensible"; para la constancia hubo que ampliarlo (precios, forma de
//     pago), y ampliar es justo cuando se cuela un nombre o un DNI.
//   · Hacer pasar una cosa por otra. Hubo testimonios de ejemplo publicados
//     como reales. Aquí el riesgo es mayor: una constancia que parezca boleta
//     es una infracción tributaria (Código Tributario, art. 174 num. 1).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// --- Entorno de mentira (antes de importar el código: lo lee al cargar) -----
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
    case 'HDEL': { const h = db.get(key) || {}; delete h[args[0]]; result = 1; break; }
    case 'LPUSH': { const l = db.get(key) || []; l.unshift(...args); db.set(key, l); result = l.length; break; }
    case 'LTRIM': result = 'OK'; break;
    case 'LRANGE': result = (db.get(key) || []).slice(Number(args[0]), Number(args[1]) === -1 ? undefined : Number(args[1]) + 1); break;
    case 'LREM': { const l = db.get(key) || []; const q = l.filter((x) => x !== args[1]); db.set(key, q); result = l.length - q.length; break; }
    default: result = null;
  }
  return { ok: true, json: async () => ({ result }) };
};

const { default: pedidos } = await import('../api/orders.js');
const { LEYENDA_CONSTANCIA, TITULO_CONSTANCIA, numeroDeComprobante } = await import('../src/lib/constancia.js');

// --- Ayudantes ---------------------------------------------------------------
const PERSONAL = {
  nombre: 'María Fernanda Quispe',
  telefono: '987654321',
  email: 'maria@correo.pe',
  direccion: 'Jr. Los Olivos 245, Surco',
  ubicacion: 'https://maps.google.com/?q=-12.1,-77.0',
  docTipo: 'boleta',
  docNumero: '45678912',
};

let ip = 0;
async function llamar(method, { query = {}, body, admin = false } = {}) {
  const res = { codigo: 0, cuerpo: null, status(c) { this.codigo = c; return this; }, json(x) { this.cuerpo = x; return this; } };
  ip += 1;
  await pedidos(
    { method, query, body, headers: { 'x-real-ip': `10.2.0.${ip}`, ...(admin ? { authorization: 'Bearer clave-de-prueba' } : {}) }, socket: {} },
    res
  );
  return res;
}

async function pedidoNuevo() {
  db.clear();
  db.set('catalog:products', JSON.stringify([{ id: 'milan', name: 'MILÁN', category: 'cabeceras', sizePricing: { queen: 310 } }]));
  const res = await llamar('POST', {
    body: { metodo: 'Yape', zona: 'Lima', montoMostrado: 310, items: [{ productId: 'milan', sizeId: 'queen', colorId: 'azul', qty: 1 }], ...PERSONAL },
  });
  assert.equal(res.codigo, 200, JSON.stringify(res.cuerpo));
  return res.cuerpo.code;
}

// ---------------------------------------------------------------------------
// Con el código se ve el pedido, no a la persona
// ---------------------------------------------------------------------------
test('la consulta por código trae lo que necesita la constancia', async () => {
  const code = await pedidoNuevo();
  const { cuerpo } = await llamar('GET', { query: { code } });
  assert.equal(cuerpo.order.code, code);
  assert.equal(cuerpo.order.monto, 310);
  assert.equal(cuerpo.order.metodo, 'Yape');
  assert.equal(cuerpo.order.estado, 'Pago por verificar');
  // Tal como viaja por la red (lo que no tiene valor, no viaja).
  assert.deepEqual(JSON.parse(JSON.stringify(cuerpo.order.items)), [
    { productName: 'MILÁN', qty: 1, unitPrice: 310, sizeId: 'queen', colorId: 'azul', opciones: [] },
  ]);
});

test('la consulta por código no trae ningún dato personal', async () => {
  const code = await pedidoNuevo();
  const { cuerpo } = await llamar('GET', { query: { code } });
  const texto = JSON.stringify(cuerpo);
  for (const [campo, valor] of Object.entries(PERSONAL)) {
    if (campo === 'docTipo') continue; // "boleta" no identifica a nadie
    assert.ok(!texto.includes(valor), `la constancia pública deja ver ${campo} del cliente`);
  }
  // Y si mañana se añade un campo al pedido, no sale solo: la lista es cerrada.
  assert.deepEqual(Object.keys(cuerpo.order).sort(), [
    'adelanto', 'code', 'comprobante', 'entrega', 'estado', 'fecha', 'items', 'metodo', 'monto', 'promoDescuento', 'saldo',
  ]);
});

// ---------------------------------------------------------------------------
// La boleta o factura del facturador, anotada en el pedido
// ---------------------------------------------------------------------------
test('el dueño anota el número de la boleta y queda escrito igual que en el comprobante', async () => {
  const code = await pedidoNuevo();
  const res = await llamar('PATCH', { body: { code, comprobante: 'b001-123' }, admin: true });
  assert.equal(res.codigo, 200, JSON.stringify(res.cuerpo));
  assert.equal(res.cuerpo.order.comprobante, 'B001-00000123');
  assert.equal((await llamar('GET', { query: { code } })).cuerpo.order.comprobante, 'B001-00000123');

  // Vaciar el campo lo borra (se anotó en el pedido equivocado).
  await llamar('PATCH', { body: { code, comprobante: '' }, admin: true });
  assert.equal((await llamar('GET', { query: { code } })).cuerpo.order.comprobante, '');
});

test('un número que no es serie y correlativo no se guarda, ni sin la clave del panel', async () => {
  const code = await pedidoNuevo();
  for (const comprobante of ['boleta 5', '123', 'B001-', 'B001-123456789', '<b>']) {
    const res = await llamar('PATCH', { body: { code, comprobante }, admin: true });
    assert.equal(res.codigo, 400, `se aceptó como comprobante: ${comprobante}`);
  }
  assert.equal((await llamar('PATCH', { body: { code, comprobante: 'B001-1' } })).codigo, 401);
  assert.equal(numeroDeComprobante('F001 45'), 'F001-00000045');
});

// ---------------------------------------------------------------------------
// La constancia no se puede confundir con una boleta
// ---------------------------------------------------------------------------
test('la constancia dice que no es un comprobante de pago, y no se llama como uno', () => {
  assert.match(LEYENDA_CONSTANCIA, /NO es un comprobante de pago/);
  assert.match(LEYENDA_CONSTANCIA, /no tiene valor tributario/);
  assert.match(LEYENDA_CONSTANCIA, /boleta o factura electrónica se emite por separado/);
  assert.ok(!/boleta|factura|comprobante|ticket/i.test(TITULO_CONSTANCIA), 'el título de la constancia suena a comprobante de pago');
});

test('el documento pinta siempre la leyenda y no inventa serie ni correlativo', () => {
  const fuente = fs.readFileSync(new URL('../src/components/Constancia.jsx', import.meta.url), 'utf8');
  assert.match(fuente, /\{LEYENDA_CONSTANCIA\}/, 'la constancia se puede imprimir sin la leyenda');
  assert.match(fuente, /\{TITULO_CONSTANCIA\}/);
  // Su único número es el código del pedido: una serie propia (B001-…) la
  // haría pasar por boleta.
  assert.ok(!/serie|correlativo/i.test(fuente.replace(/\/\/.*$/gm, '')), 'la constancia lleva una numeración propia');
});
