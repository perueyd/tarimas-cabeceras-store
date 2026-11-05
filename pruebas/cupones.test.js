// Los usos de un cupón no se pierden cuando la compra no se cierra.
//
// El fallo que evita: el uso del cupón se RESERVA antes de cobrar (para que
// dos compras a la vez no se pasen del límite), pero nunca se devolvía. Si la
// tarjeta se rechazaba, si el precio no cuadraba con lo mostrado o si ganaba
// una oferta automática, el uso quedaba gastado igual. Un cupón de 10 usos se
// "agotaba" con 3 ventas de verdad y 7 tarjetas rechazadas, y los clientes
// siguientes veían "Ese código alcanzó su límite de usos".
//
// Se prueban los dos sitios que cobran (api/create-charge.js y api/orders.js)
// con una base Redis y un Culqi de mentira, sin tocar nada real.

import test from 'node:test';
import assert from 'node:assert/strict';

// --- Entorno de mentira (antes de importar el código: lo lee al cargar) -----
const REDIS_URL = 'https://redis.prueba.local';
process.env.UPSTASH_REDIS_REST_URL = REDIS_URL;
process.env.UPSTASH_REDIS_REST_TOKEN = 'prueba';
process.env.CULQI_SECRET_KEY = 'sk_prueba';
delete process.env.SHEETS_WEBHOOK_URL;
delete process.env.FACTURADOR_URL;
delete process.env.ALERTAS_URL;

const db = new Map();
function redis([cmd, key, ...args]) {
  switch (cmd) {
    case 'GET': return db.get(key) ?? null;
    case 'SET': db.set(key, args[0]); return 'OK';
    case 'MGET': return [key, ...args].map((k) => db.get(k) ?? null);
    case 'INCR': { const n = Number(db.get(key) || 0) + 1; db.set(key, String(n)); return n; }
    case 'EXPIRE': return 1;
    case 'HGET': return db.get(key)?.[args[0]] ?? null;
    case 'HINCRBY': {
      const h = db.get(key) || {};
      h[args[0]] = String(Number(h[args[0]] || 0) + Number(args[1]));
      db.set(key, h);
      return Number(h[args[0]]);
    }
    case 'HDEL': return 1;
    case 'LPUSH': { const l = db.get(key) || []; l.unshift(...args); db.set(key, l); return l.length; }
    case 'LTRIM': { const l = db.get(key) || []; db.set(key, l.slice(Number(args[0]), Number(args[1]) + 1)); return 'OK'; }
    case 'LRANGE': return (db.get(key) || []).slice(Number(args[0]), Number(args[1]) === -1 ? undefined : Number(args[1]) + 1);
    default: return null;
  }
}

let respuestaCulqi = { ok: true };
globalThis.fetch = async (url, opts = {}) => {
  if (url === REDIS_URL) {
    const result = redis(JSON.parse(opts.body));
    return { ok: true, json: async () => ({ result }) };
  }
  if (String(url).includes('api.culqi.com')) {
    if (respuestaCulqi.lanza) throw new Error('sin conexión');
    const ok = respuestaCulqi.ok;
    return {
      ok,
      status: ok ? 201 : 402,
      json: async () => (ok ? { id: 'chr_prueba' } : { user_message: 'Tarjeta rechazada' }),
    };
  }
  return { ok: true, json: async () => ({}), text: async () => '' };
};

const { default: crearCargo } = await import('../api/create-charge.js');
const { default: pedidos } = await import('../api/orders.js');

// --- Ayudantes ---------------------------------------------------------------
const PRODUCTO = { id: 'milan', name: 'MILÁN', category: 'cabeceras', sizePricing: { '2plazas': 200 } };
const ITEMS = [{ productId: 'milan', sizeId: '2plazas', qty: 1 }];

function prepararTienda({ ofertaAuto = 0 } = {}) {
  db.clear();
  db.set('catalog:products', JSON.stringify([PRODUCTO]));
  // Cupón de 10% (S/ 20 sobre S/ 200) con un límite de 5 usos.
  db.set('promo:codes', JSON.stringify([{ code: 'DIEZ', activo: true, tipo: 'porcentaje', valor: 10, maxUsos: 5 }]));
  if (ofertaAuto) {
    db.set('ofertas:todas', JSON.stringify([{ id: 'f1', tipo: 'flash-sale', activo: true, tipoDesc: 'porcentaje', valor: ofertaAuto }]));
  }
}

const usos = () => Number(db.get('promo:usos')?.DIEZ || 0);

function llamar(handler, body) {
  const req = { method: 'POST', body, headers: {}, query: {}, socket: { remoteAddress: '1.2.3.4' } };
  const res = {
    statusCode: 200,
    cuerpo: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.cuerpo = b; return this; },
    setHeader() {},
  };
  return Promise.resolve(handler(req, res)).then(() => res);
}

const pagoConTarjeta = (extra = {}) =>
  llamar(crearCargo, { token: 'tkn', email: 'a@b.pe', nombre: 'Ana', telefono: '999', items: ITEMS, promoCode: 'DIEZ', montoMostrado: 180, ...extra });

const pedidoYape = (extra = {}) =>
  llamar(pedidos, { metodo: 'Yape', nombre: 'Ana', telefono: '999', items: ITEMS, promoCode: 'DIEZ', montoMostrado: 180, ...extra });

// --- Tarjeta (Culqi) ---------------------------------------------------------
test('cupón + tarjeta rechazada: el uso se devuelve', async () => {
  prepararTienda();
  respuestaCulqi = { ok: false };
  const res = await pagoConTarjeta();
  assert.equal(res.statusCode, 402);
  assert.equal(usos(), 0, 'la tarjeta se rechazó: el cupón no debe contar como usado');
});

test('cupón + Culqi sin conexión: el uso se devuelve', async () => {
  prepararTienda();
  respuestaCulqi = { lanza: true };
  const res = await pagoConTarjeta();
  assert.equal(res.statusCode, 500);
  assert.equal(usos(), 0);
});

test('cupón + tarjeta: si el precio no cuadra con lo mostrado, el uso se devuelve', async () => {
  prepararTienda();
  respuestaCulqi = { ok: true };
  // El cliente vio 150 y el servidor cobraría 180: se rechaza el cobro.
  const res = await pagoConTarjeta({ montoMostrado: 150 });
  assert.equal(res.statusCode, 409);
  assert.equal(usos(), 0);
});

test('cupón + tarjeta: si gana la oferta automática, el cupón no se gasta', async () => {
  prepararTienda({ ofertaAuto: 25 }); // 25% gana al 10% del cupón
  respuestaCulqi = { ok: true };
  const res = await pagoConTarjeta({ montoMostrado: 150 });
  assert.equal(res.statusCode, 200);
  assert.equal(usos(), 0, 'el cliente no disfrutó el cupón: no se le debe gastar');
});

test('cupón + tarjeta aprobada: el uso SÍ se gasta (y solo uno)', async () => {
  prepararTienda();
  respuestaCulqi = { ok: true };
  const res = await pagoConTarjeta();
  assert.equal(res.statusCode, 200);
  assert.equal(res.cuerpo.guardado, true);
  assert.equal(usos(), 1);
});

test('cupón de 5 usos: 5 tarjetas rechazadas no lo agotan', async () => {
  prepararTienda();
  respuestaCulqi = { ok: false };
  for (let i = 0; i < 5; i++) await pagoConTarjeta();
  respuestaCulqi = { ok: true };
  const res = await pagoConTarjeta();
  assert.equal(res.statusCode, 200);
  assert.equal(res.cuerpo.guardado, true, 'la sexta compra, ya con tarjeta buena, debe llevar el cupón');
  assert.equal(usos(), 1);
});

// --- Yape / transferencia (api/orders.js) ------------------------------------
test('pedido Yape: si el precio no cuadra, el uso se devuelve', async () => {
  prepararTienda();
  const res = await pedidoYape({ montoMostrado: 150 });
  assert.equal(res.statusCode, 409);
  assert.equal(usos(), 0);
});

test('pedido Yape: si gana la oferta automática, el cupón no se gasta', async () => {
  prepararTienda({ ofertaAuto: 25 });
  const res = await pedidoYape({ montoMostrado: 150 });
  assert.equal(res.statusCode, 200);
  assert.equal(usos(), 0);
});

test('pedido Yape con cupón: el uso SÍ se gasta', async () => {
  prepararTienda();
  const res = await pedidoYape();
  assert.equal(res.statusCode, 200);
  assert.equal(res.cuerpo.promoDescuento, 20);
  assert.equal(usos(), 1);
});
