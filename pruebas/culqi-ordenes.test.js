// Órdenes de Culqi (PagoEfectivo, billeteras con QR y Cuotéalo).
//
// Lo que evitan estas pruebas:
// - Que un aviso falso a /api/culqi-webhook marque como «Pagado» un pedido que
//   Culqi no cobró: el estado SIEMPRE se consulta a Culqi con la llave privada.
// - Que el mismo pedido se guarde dos veces (el navegador y el aviso de Culqi
//   pueden llegar los dos).
// - Que una orden vencida deje el pedido «por verificar» para siempre.
// - Que se ofrezca un medio fuera de los montos que Culqi acepta.
import test from 'node:test';
import assert from 'node:assert/strict';

const REDIS_URL = 'https://redis.prueba.local';
process.env.UPSTASH_REDIS_REST_URL = REDIS_URL;
process.env.UPSTASH_REDIS_REST_TOKEN = 'prueba';
process.env.CULQI_SECRET_KEY = 'sk_test_prueba';
delete process.env.VERCEL_ENV;
delete process.env.SHEETS_WEBHOOK_URL;
delete process.env.ALERTAS_URL;

const db = new Map();
function redis([cmd, key, ...args]) {
  switch (cmd) {
    case 'GET': return db.get(key) ?? null;
    case 'SET': db.set(key, args[0]); return 'OK';
    case 'MGET': return [key, ...args].map((k) => db.get(k) ?? null);
    case 'INCR': { const n = Number(db.get(key) || 0) + 1; db.set(key, String(n)); return n; }
    case 'EXPIRE': return 1;
    case 'HSET': { const h = db.get(key) || {}; h[args[0]] = args[1]; db.set(key, h); return 1; }
    case 'HGET': return db.get(key)?.[args[0]] ?? null;
    case 'HINCRBY': { const h = db.get(key) || {}; h[args[0]] = String(Number(h[args[0]] || 0) + Number(args[1])); db.set(key, h); return Number(h[args[0]]); }
    case 'LPUSH': { const l = db.get(key) || []; l.unshift(...args); db.set(key, l); return l.length; }
    case 'LREM': { const l = db.get(key) || []; const i = l.indexOf(args[1]); if (i >= 0) l.splice(i, 1); db.set(key, l); return i >= 0 ? 1 : 0; }
    case 'LRANGE': return (db.get(key) || []).slice(Number(args[0]), Number(args[1]) === -1 ? undefined : Number(args[1]) + 1);
    case 'LTRIM': return 'OK';
    default: return null;
  }
}

// Culqi de mentira: guarda las órdenes creadas y deja cambiar su estado.
const ordenes = new Map();
let siguiente = 1;
globalThis.fetch = async (url, opts = {}) => {
  if (url === REDIS_URL) return { ok: true, json: async () => ({ result: redis(JSON.parse(opts.body)) }) };
  const u = String(url);
  if (u === 'https://api.culqi.com/v2/orders' && opts.method === 'POST') {
    const b = JSON.parse(opts.body);
    const id = `ord_test_prueba${String(siguiente++).padStart(4, '0')}`;
    const orden = { object: 'order', id, amount: b.amount, state: 'created', payment_code: null, expiration_date: b.expiration_date };
    ordenes.set(id, orden);
    return { ok: true, status: 201, json: async () => orden };
  }
  const m = u.match(/^https:\/\/api\.culqi\.com\/v2\/orders\/(.+)$/);
  if (m) {
    const orden = ordenes.get(m[1]);
    return orden ? { ok: true, status: 200, json: async () => orden } : { ok: false, status: 404, json: async () => ({ object: 'error' }) };
  }
  return { ok: true, json: async () => ({}), text: async () => '' };
};

const { default: rutaOrden, idDeOrden, enlaceDeCuotealo } = await import('../api/_rutas/culqi-orden.js');
const { default: rutaAviso, idDeOrdenDelAviso } = await import('../api/_rutas/culqi-webhook.js');
const { mediosDeCulqi } = await import('../src/lib/mediosCulqi.js');
const { cuotasValidas } = await import('../api/create-charge.js');

const PRODUCTO = { id: 'milan', name: 'MILÁN', category: 'cabeceras', sizePricing: { '2plazas': 200 } };
const DATOS = { email: 'review@culqi.com', nombre: 'Prueba Culqi', telefono: '999888777', items: [{ productId: 'milan', sizeId: '2plazas', qty: 1 }], montoMostrado: 200, docTipo: 'boleta', docNumero: '12345678' };

function llamar(handler, { query = {}, body = {} } = {}) {
  const req = { method: 'POST', query, body, headers: {}, socket: { remoteAddress: '1.2.3.4' } };
  const res = { statusCode: 200, cuerpo: null, status(c) { this.statusCode = c; return this; }, json(b) { this.cuerpo = b; return this; }, setHeader() {} };
  return Promise.resolve(handler(req, res)).then(() => res);
}
const pedidos = () => (db.get('pedidos') || []).map((x) => JSON.parse(x));
function preparar() {
  db.clear();
  ordenes.clear();
  db.set('catalog:products', JSON.stringify([PRODUCTO]));
}
async function crearYGenerarCodigo() {
  const r = await llamar(rutaOrden, { query: { accion: 'crear' }, body: DATOS });
  assert.equal(r.statusCode, 200, JSON.stringify(r.cuerpo));
  const orden = ordenes.get(r.cuerpo.orderId);
  assert.equal(orden.amount, 20000, 'el monto lo calcula el servidor con el catálogo');
  // El cliente eligió PagoEfectivo y generó su CIP.
  orden.state = 'pending';
  orden.payment_code = '12345678';
  return r.cuerpo.orderId;
}

test('crear una orden no crea un pedido: solo cuando el cliente genera su código', async () => {
  preparar();
  const r = await llamar(rutaOrden, { query: { accion: 'crear' }, body: DATOS });
  assert.equal(r.statusCode, 200);
  assert.equal(pedidos().length, 0, 'si al final paga con tarjeta, no debe quedar un pedido duplicado');
  const sinCodigo = await llamar(rutaOrden, { query: { accion: 'registrar' }, body: { orderId: r.cuerpo.orderId } });
  assert.equal(sinCodigo.statusCode, 409, 'orden «created»: el cliente aún no eligió cómo pagar');
  assert.equal(pedidos().length, 0);
});

test('registrar guarda el pedido «por verificar» con su CIP, una sola vez', async () => {
  preparar();
  const id = await crearYGenerarCodigo();
  const r = await llamar(rutaOrden, { query: { accion: 'registrar' }, body: { orderId: id } });
  assert.equal(r.statusCode, 200);
  assert.equal(r.cuerpo.cip, '12345678');
  assert.equal(r.cuerpo.estado, 'Pago por verificar');
  await llamar(rutaOrden, { query: { accion: 'registrar' }, body: { orderId: id } });
  assert.equal(pedidos().length, 1, 'el mismo pedido no se guarda dos veces');
  assert.equal(pedidos()[0].culqiOrderId, id);
  assert.equal(pedidos()[0].monto, 200);
});

test('un aviso falso no marca nada como pagado: manda lo que diga Culqi', async () => {
  preparar();
  const id = await crearYGenerarCodigo();
  await llamar(rutaOrden, { query: { accion: 'registrar' }, body: { orderId: id } });
  // Alguien manda un aviso diciendo «pagado», pero en Culqi sigue pendiente.
  const falso = await llamar(rutaAviso, { body: { type: 'order.status.changed', data: JSON.stringify({ id, state: 'paid' }) } });
  assert.equal(falso.statusCode, 200);
  assert.equal(pedidos()[0].estado, 'Pago por verificar');
});

test('cuando Culqi cobra, el aviso marca el pedido como Pagado', async () => {
  preparar();
  const id = await crearYGenerarCodigo();
  await llamar(rutaOrden, { query: { accion: 'registrar' }, body: { orderId: id } });
  ordenes.get(id).state = 'paid';
  const r = await llamar(rutaAviso, { body: { type: 'order.status.changed', data: { id } } });
  assert.equal(r.cuerpo.estado, 'Pagado');
  assert.equal(pedidos().length, 1);
  assert.equal(pedidos()[0].estado, 'Pagado');
});

test('si el cliente cerró la página, el aviso de pago igual crea el pedido', async () => {
  preparar();
  const id = await crearYGenerarCodigo();
  ordenes.get(id).state = 'paid';
  await llamar(rutaAviso, { body: { type: 'order.status.changed', data: JSON.stringify({ id }) } });
  assert.equal(pedidos().length, 1);
  assert.equal(pedidos()[0].estado, 'Pagado');
});

test('una orden vencida sin pagar deja el pedido Cancelado', async () => {
  preparar();
  const id = await crearYGenerarCodigo();
  await llamar(rutaOrden, { query: { accion: 'registrar' }, body: { orderId: id } });
  ordenes.get(id).state = 'expired';
  await llamar(rutaAviso, { body: { type: 'order.status.changed', data: { id } } });
  assert.equal(pedidos()[0].estado, 'Cancelado');
});

test('solo se aceptan ids con la forma de Culqi y avisos de órdenes', () => {
  assert.equal(idDeOrden('ord_live_AbC123xyz'), 'ord_live_AbC123xyz');
  assert.equal(idDeOrden('../../pedidos'), null);
  assert.equal(idDeOrdenDelAviso({ type: 'charge.creation.succeeded', data: { id: 'ord_test_AbC123xyz' } }), null);
  assert.equal(idDeOrdenDelAviso({ type: 'order.status.changed', data: '{"id":"ord_test_AbC123xyz"}' }), 'ord_test_AbC123xyz');
});

test('medios de Culqi según los montos que acepta Culqi', () => {
  assert.deepEqual(mediosDeCulqi(220, true), { tarjeta: true, yape: true, billetera: true, bancaMovil: true, agente: true, cuotealo: true });
  assert.equal(mediosDeCulqi(600, true).billetera, false, 'billeteras con QR: hasta S/ 500');
  assert.equal(mediosDeCulqi(80, true).cuotealo, false, 'Cuotéalo: desde S/ 100');
  assert.deepEqual(mediosDeCulqi(220, false), { tarjeta: true, yape: true, billetera: false, bancaMovil: false, agente: false, cuotealo: false }, 'sin orden, solo tarjeta y Yape');
  assert.equal(mediosDeCulqi(2500, true, 2000).yape, false);
});

test('cuotas: solo de 2 a 48', () => {
  assert.equal(cuotasValidas(3), 3);
  assert.equal(cuotasValidas(1), null);
  assert.equal(cuotasValidas('abc'), null);
  assert.equal(cuotasValidas(99), null);
});

// Con Cuotéalo, Culqi abría la página del BCP en otra pestaña justo cuando la
// tienda pasaba a /gracias; el iPhone la bloqueaba y el cliente veía un código
// de PagoEfectivo sin llegar nunca al BCP (25/11/2026). Ahora /gracias recibe
// el enlace y ofrece el botón para continuar.
test('Cuotéalo: registrar devuelve el enlace del BCP y el pedido dice Cuotéalo', async () => {
  preparar();
  const id = await crearYGenerarCodigo();
  ordenes.get(id).cuotealo = 'https://pre1a.payment.pagoefectivo.pe/ABC.html';
  const r = await llamar(rutaOrden, { query: { accion: 'registrar' }, body: { orderId: id } });
  assert.equal(r.cuerpo.cuotealo, 'https://pre1a.payment.pagoefectivo.pe/ABC.html');
  assert.match(pedidos()[0].metodo, /Cuotéalo BCP/);
});

test('enlace de Cuotéalo: solo https', () => {
  assert.equal(enlaceDeCuotealo({ cuotealo: 'javascript:alert(1)' }), null);
  assert.equal(enlaceDeCuotealo({ cuotealo: 'http://x.pe/a' }), null);
  assert.equal(enlaceDeCuotealo({ cuotealo: null }), null);
  assert.equal(enlaceDeCuotealo({}), null);
});
