// Aliados: profesionales externos que venden a través de la tienda.
//
// Sección nueva (noviembre de 2026). Estas pruebas cubren los tres fallos que
// esta sección tenía más a mano, todos ya vistos en la tienda con otra cara:
//
//   · Publicar lo privado. /api/catalog llegó a enviar los tokens de las
//     integraciones y los costos de fabricación. Aquí lo privado es el
//     teléfono del profesional, su comisión y las notas del dueño — y su
//     nombre, si el dueño decidió no mostrarlo.
//   · Creerle al navegador. El precio ya se intentó mandar desde el navegador
//     una vez. Aquí sería el "de parte de quién vengo": si se anotara sin
//     comprobar, cualquiera se atribuiría ventas escribiendo un código.
//   · Cambiar el cobro sin querer. El pedido gana un campo nuevo (referido) y
//     no puede alterar ni el importe ni lo demás.

import test from 'node:test';
import assert from 'node:assert/strict';

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
    case 'DEL': db.delete(key); result = 1; break;
    case 'INCR': { const n = Number(db.get(key) || 0) + 1; db.set(key, String(n)); result = n; break; }
    case 'EXPIRE': result = 1; break;
    case 'HGET': result = db.get(key)?.[args[0]] ?? null; break;
    case 'HSET': { const h = db.get(key) || {}; h[args[0]] = args[1]; db.set(key, h); result = 1; break; }
    case 'LPUSH': { const l = db.get(key) || []; l.unshift(...args); db.set(key, l); result = l.length; break; }
    case 'LTRIM': { const l = db.get(key) || []; db.set(key, l.slice(Number(args[0]), Number(args[1]) + 1)); result = 'OK'; break; }
    case 'LRANGE': result = (db.get(key) || []).slice(Number(args[0]), Number(args[1]) === -1 ? undefined : Number(args[1]) + 1); break;
    default: result = null;
  }
  return { ok: true, json: async () => ({ result }) };
};

const { default: catalogo } = await import('../api/catalog.js');
const { default: pedidos } = await import('../api/orders.js');
const { PARTES } = await import('../api/_respaldos.js');
const { aliadoPublico, conReferencia, creditoDe, limpiarAliado, limpiarPlan, referidoValido } = await import(
  '../src/lib/servicios.js'
);
const fabrica = await import('../src/data/catalog.js');

// --- Ayudantes ---------------------------------------------------------------
const MUEBLE = { id: 'milan', name: 'MILÁN', category: 'cabeceras', sizePricing: { '2plazas': 200 } };
const ANA = {
  id: 'arq-ana',
  nombre: 'Ana Pérez',
  titulo: 'Arquitecta',
  colegiatura: 'CAP 12345',
  telefono: '987654321',
  comision: '15 % de cada venta',
  notas: 'Paga a fin de mes',
};

function tienda() {
  db.clear();
  db.set('catalog:products', JSON.stringify([MUEBLE]));
}

let ip = 0;
async function llamar(manejador, method, { query = {}, body, admin = false } = {}) {
  const res = {
    codigo: 0,
    cuerpo: null,
    status(c) { this.codigo = c; return this; },
    json(x) { this.cuerpo = x; return this; },
  };
  ip += 1;
  await manejador(
    {
      method,
      query,
      body,
      headers: { 'x-real-ip': `10.1.0.${ip}`, ...(admin ? { authorization: 'Bearer clave-de-prueba' } : {}) },
      socket: {},
    },
    res
  );
  return res;
}

const guardarAliado = (aliado) => llamar(catalogo, 'POST', { query: { resource: 'partner' }, body: aliado, admin: true });
const comprar = (extra = {}) =>
  llamar(pedidos, 'POST', {
    body: {
      metodo: 'Yape',
      nombre: 'Cliente de prueba',
      telefono: '999000111',
      montoMostrado: 200,
      items: [{ productId: 'milan', sizeId: '2plazas', qty: 1 }],
      ...extra,
    },
  });
const ultimoPedido = () => JSON.parse(db.get('pedidos')[0]);

// ---------------------------------------------------------------------------
// Lo privado del aliado no sale al público
// ---------------------------------------------------------------------------
test('de fábrica no hay aliados de ejemplo, y la lista entra en las copias', () => {
  assert.deepEqual(fabrica.partners, []);
  assert.ok(PARTES.includes('partners'), 'los aliados no entran en la copia de seguridad');
});

test('/api/catalog público: ni el teléfono, ni la comisión, ni las notas del aliado', async () => {
  tienda();
  assert.equal((await guardarAliado(ANA)).codigo, 200);

  const publico = await llamar(catalogo, 'GET');
  const texto = JSON.stringify(publico.cuerpo.partners);
  for (const secreto of ['987654321', '15 %', 'fin de mes']) {
    assert.ok(!texto.includes(secreto), `sale al público un dato privado del aliado: ${secreto}`);
  }
  assert.deepEqual(publico.cuerpo.partners, [
    { id: 'arq-ana', activo: true, mostrar: true, nombre: 'Ana Pérez', titulo: 'Arquitecta', colegiatura: 'CAP 12345' },
  ]);

  // El panel, con la clave, sí lo ve todo para poder editarlo.
  const panel = await llamar(catalogo, 'GET', { admin: true });
  assert.equal(panel.cuerpo.partners[0].comision, '15 % de cada venta');
});

test('si el dueño no quiere nombrarlo, su nombre tampoco sale por la puerta de atrás', async () => {
  tienda();
  await guardarAliado({ ...ANA, mostrar: false });
  const publico = await llamar(catalogo, 'GET');
  assert.deepEqual(publico.cuerpo.partners, [{ id: 'arq-ana', activo: true, mostrar: false }]);
  assert.ok(!JSON.stringify(publico.cuerpo).includes('Ana Pérez'), 'el nombre oculto viaja en la respuesta pública');
  assert.equal(creditoDe('arq-ana', publico.cuerpo.partners), '', 'se pinta el crédito de un aliado oculto');
});

test('el crédito se arma con profesión, nombre y colegiatura, y solo de un aliado activo', () => {
  const aliados = [limpiarAliado(ANA).item];
  assert.equal(creditoDe('arq-ana', aliados), 'Arquitecta Ana Pérez · CAP 12345');
  assert.equal(creditoDe('otro', aliados), '');
  assert.equal(creditoDe('arq-ana', [{ ...aliados[0], activo: false }]), '');
  assert.deepEqual(Object.keys(aliadoPublico({ ...aliados[0], mostrar: false })).sort(), ['activo', 'id', 'mostrar']);
});

test('un aliado sin nombre o sin código no se guarda', async () => {
  tienda();
  assert.equal((await guardarAliado({ ...ANA, nombre: '  ' })).codigo, 400);
  assert.equal((await guardarAliado({ ...ANA, id: '!!!' })).codigo, 400);
  assert.equal(db.has('catalog:partners'), false);
  assert.equal((await llamar(catalogo, 'POST', { query: { resource: 'partner' }, body: ANA })).codigo, 401);
});

test('un plan recuerda a su profesional, limpio', () => {
  const { item } = limpiarPlan({ id: 'casa', nombre: 'Diseño de vivienda', aliado: 'Arq Ana!' });
  assert.equal(item.aliado, 'arq-ana');
  assert.equal(limpiarPlan({ id: 'x', nombre: 'Plan' }).item.aliado, '');
});

// ---------------------------------------------------------------------------
// "De parte de quién vengo" no se le cree al navegador sin comprobar
// ---------------------------------------------------------------------------
test('el pedido anota al aliado que trajo al cliente', async () => {
  tienda();
  await guardarAliado(ANA);
  const res = await comprar({ referido: 'arq-ana' });
  assert.equal(res.codigo, 200, JSON.stringify(res.cuerpo));
  assert.equal(ultimoPedido().referido, 'arq-ana');
  assert.equal(ultimoPedido().monto, 200, 'venir de parte de un aliado cambió el importe');
});

test('un código inventado, de un aliado inactivo o con trampa no se anota', async () => {
  tienda();
  await guardarAliado(ANA);
  await guardarAliado({ ...ANA, id: 'ing-luis', nombre: 'Luis Rojas', activo: false });

  for (const referido of ['no-existe', 'ing-luis', '<script>', { id: 'arq-ana' }, 'x'.repeat(500)]) {
    const res = await comprar({ referido });
    assert.equal(res.codigo, 200, `el pedido falló por un referido raro: ${JSON.stringify(referido).slice(0, 40)}`);
    assert.equal('referido' in ultimoPedido(), false, `se anotó un referido sin comprobar: ${JSON.stringify(referido).slice(0, 40)}`);
  }
  assert.equal(referidoValido('ARQ ANA', [limpiarAliado(ANA).item]), 'arq-ana');
});

test('sin referido el pedido queda igual que antes', async () => {
  tienda();
  const res = await comprar();
  assert.equal(res.codigo, 200);
  assert.equal('referido' in ultimoPedido(), false);
  assert.equal(ultimoPedido().monto, 200);
});

test('la consulta por WhatsApp lleva la referencia al final', () => {
  assert.equal(conReferencia('Hola, quiero una cotización.', 'arq-ana'), 'Hola, quiero una cotización. (Ref.: arq-ana)');
  assert.equal(conReferencia('Hola.', ''), 'Hola.');
});
