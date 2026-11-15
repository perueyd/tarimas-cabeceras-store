// El botón «Reiniciar» de la tienda.
//
// Función nueva (noviembre de 2026): deja en cero todo lo de clientes para
// empezar limpio antes de vender. Es, con diferencia, el botón más peligroso
// del panel, y la tienda ya perdió datos una vez por menos: los 33 productos
// desaparecieron de la base y hubo que dictarlos de nuevo uno por uno.
//
// Estas pruebas vigilan lo que un botón así no puede hacer nunca:
//   · llevarse lo que no es de clientes (el catálogo, los cupones) ni lo que
//     la ley obliga a conservar (el Libro de Reclamaciones);
//   · perder algo: todo lo que quita tiene que poder volver, idéntico;
//   · ejecutarse por accidente o sin la clave del administrador.

import test from 'node:test';
import assert from 'node:assert/strict';

// --- Entorno de mentira (antes de importar el código: lo lee al cargar) -----
const REDIS_URL = 'https://redis.prueba.local';
process.env.UPSTASH_REDIS_REST_URL = REDIS_URL;
process.env.UPSTASH_REDIS_REST_TOKEN = 'prueba';
process.env.ORDERS_ADMIN_KEY = 'clave-de-prueba';

let db = new Map();
const comoPatron = (p) => new RegExp('^' + p.split('*').map((t) => t.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
globalThis.fetch = async (url, opts = {}) => {
  if (url !== REDIS_URL) return { ok: true, json: async () => ({}), text: async () => '' };
  const [cmd, key, ...args] = JSON.parse(opts.body);
  let result = null;
  switch (cmd) {
    case 'GET': result = db.get(key) ?? null; break;
    case 'SET': db.set(key, args[0]); result = 'OK'; break;
    case 'DEL': result = db.delete(key) ? 1 : 0; break;
    case 'INCR': { const n = Number(db.get(key) || 0) + 1; db.set(key, String(n)); result = n; break; }
    case 'EXPIRE': result = 1; break;
    case 'HVALS': result = Object.values(db.get(key) || {}); break;
    case 'LRANGE': result = [...(db.get(key) || [])]; break;
    case 'KEYS': result = [...db.keys()].filter((k) => comoPatron(key).test(k)); break;
    case 'RENAME':
      // Como en Redis: cambiar de nombre algo que no existe es un error.
      if (!db.has(key)) return { ok: false, status: 400, json: async () => ({ error: 'ERR no such key' }) };
      db.set(args[0], db.get(key));
      db.delete(key);
      result = 'OK';
      break;
    default: result = null;
  }
  return { ok: true, json: async () => ({ result }) };
};

const { default: reiniciar, SE_REINICIA } = await import('../api/_rutas/reiniciar.js');

// --- Ayudantes ---------------------------------------------------------------
// Lo que es de clientes…
const DE_CLIENTES = {
  pedidos: ['{"code":"ED-1","monto":200}', '{"code":"ED-2","monto":310}'],
  'pedidos:idx': { 'ED-1': '{"code":"ED-1"}', 'ED-2': '{"code":"ED-2"}' },
  'carritos:abandonados': { '987654321': '{"total":200}' },
  'visitas:2026-11-14': { total: '12' },
  'visitas:2026-11-15': { total: '30' },
  'historial:codigos': '[{"code":"LIVE15"}]',
  'promo:usos': { LIVE15: '3' },
  'reviews:all': ['{"estrellas":5}'],
  'reviews:milan': ['{"estrellas":5}'],
  'newsletter:list': ['{"email":"a@b.pe"}'],
  'newsletter:emails': ['a@b.pe'],
  encuestas: ['{"respuesta":"bien"}'],
  'live:registrados': ['{"nombre":"Ana","whatsapp":"987654321"}'],
  'live:vistos:abc123': ['huella'],
};
// …y lo que el botón no puede tocar.
const INTOCABLE = {
  'catalog:products': '[{"id":"milan"}]',
  'catalog:config': '{"ruc":"20616613074"}',
  'catalog:services': '[{"id":"plan"}]',
  'catalog:projects': '[]',
  'catalog:partners': '[{"id":"arq-ana"}]',
  'catalog:respaldos': '[{"id":"2026-11-14"}]',
  'catalog:respaldo:2026-11-14': '{"products":[]}',
  'descuentos:automaticos': '[{"id":"d1"}]',
  reclamos: ['{"folio":"2026-0001"}'],
  'reclamos:contador:2026': '1',
  'arco:solicitudes': ['{"tipo":"acceso"}'],
  'live:config': '{"activo":false}',
  'errores:recientes': ['{"origen":"x"}'],
};
const CUPONES = '[{"code":"LIVE15","tipo":"porcentaje","valor":15,"activo":true,"maxUsos":20,"usados":3}]';

function tienda() {
  db = new Map([
    ...Object.entries(structuredClone(DE_CLIENTES)),
    ...Object.entries(structuredClone(INTOCABLE)),
    ['promo:codes', CUPONES],
    ['ofertas:todas', '[{"id":"o1","tipo":"codigo","codigo":"VERANO","usados":2}]'],
  ]);
}
const foto = () => JSON.stringify([...db.entries()].sort());

let ip = 0;
async function llamar(method, { query = {}, body, admin = true } = {}) {
  const res = { codigo: 0, cuerpo: null, status(c) { this.codigo = c; return this; }, json(x) { this.cuerpo = x; return this; } };
  ip += 1;
  await reiniciar(
    { method, query, body, headers: { 'x-real-ip': `10.3.0.${ip}`, ...(admin ? { authorization: 'Bearer clave-de-prueba' } : {}) }, socket: {} },
    res
  );
  return res;
}
const reiniciarYa = () => llamar('POST', { body: { confirmar: 'REINICIAR' } });

// ---------------------------------------------------------------------------
// No se ejecuta por accidente ni sin la clave
// ---------------------------------------------------------------------------
test('sin la clave del administrador no se puede ver, reiniciar, restaurar ni borrar', async () => {
  tienda();
  const antes = foto();
  for (const [method, extra] of [
    ['GET', {}],
    ['POST', { body: { confirmar: 'REINICIAR' } }],
    ['POST', { body: { accion: 'restaurar', id: '2026-11-15T10-00-00' } }],
    ['DELETE', { query: { id: '2026-11-15T10-00-00' } }],
  ]) {
    assert.equal((await llamar(method, { ...extra, admin: false })).codigo, 401, `${method} funcionó sin clave`);
  }
  assert.equal(foto(), antes);
});

test('sin escribir la palabra REINICIAR no pasa nada', async () => {
  tienda();
  const antes = foto();
  for (const confirmar of [undefined, '', 'reiniciar', 'SI', true]) {
    assert.equal((await llamar('POST', { body: { confirmar } })).codigo, 400);
  }
  assert.equal(foto(), antes, 'se tocó la base sin la confirmación');
});

// ---------------------------------------------------------------------------
// Se lleva lo de clientes, y solo eso
// ---------------------------------------------------------------------------
test('reiniciar deja en cero todo lo de clientes', async () => {
  tienda();
  const res = await reiniciarYa();
  assert.equal(res.codigo, 200, JSON.stringify(res.cuerpo));
  for (const clave of Object.keys(DE_CLIENTES)) {
    assert.equal(db.has(clave), false, `«${clave}» sigue ahí después de reiniciar`);
  }
  assert.deepEqual(res.cuerpo.ahora, {
    pedidos: 0, carritos: 0, resenas: 0, suscriptores: 0, encuestas: 0, registrados: 0, diasDeVisitas: 0,
  });
  // Lo que había queda dicho en la copia, para saber qué se guardó.
  assert.equal(res.cuerpo.copia.resumen.pedidos, 2);
  assert.equal(res.cuerpo.copia.resumen.diasDeVisitas, 2);
});

test('reiniciar no toca el catálogo, los cupones ni el Libro de Reclamaciones', async () => {
  tienda();
  await reiniciarYa();
  for (const [clave, valor] of Object.entries(INTOCABLE)) {
    assert.deepEqual(db.get(clave), valor, `reiniciar cambió o borró «${clave}»`);
  }
  // Los cupones siguen existiendo; solo su contador de usos vuelve a cero.
  const cupones = JSON.parse(db.get('promo:codes'));
  assert.equal(cupones.length, 1);
  assert.equal(cupones[0].code, 'LIVE15');
  assert.equal(cupones[0].maxUsos, 20);
  assert.equal(cupones[0].usados, 0);
  assert.equal(JSON.parse(db.get('ofertas:todas'))[0].usados, 0);
});

test('ningún patrón del reinicio alcanza una clave protegida', () => {
  // Si alguien añade mañana un patrón demasiado ancho ("catalog:*", "re*"…),
  // esto salta antes de que se lleve la tienda por delante.
  const protegidas = [...Object.keys(INTOCABLE), 'promo:codes', 'ofertas:todas', 'catalog:colors', 'catalog:sizes', 'ratelimit:auth-fail:abc'];
  for (const { patron } of SE_REINICIA) {
    for (const clave of protegidas) {
      assert.ok(!comoPatron(patron).test(clave), `el patrón «${patron}» se llevaría «${clave}»`);
    }
  }
});

// ---------------------------------------------------------------------------
// Nada se pierde: todo lo que quita puede volver
// ---------------------------------------------------------------------------
test('restaurar la copia deja la tienda exactamente como estaba', async () => {
  tienda();
  const antes = foto();
  const { cuerpo } = await reiniciarYa();
  assert.notEqual(foto(), antes);

  const res = await llamar('POST', { body: { accion: 'restaurar', id: cuerpo.copia.id } });
  assert.equal(res.codigo, 200, JSON.stringify(res.cuerpo));
  // Lo único que queda de más es la lista (vacía) de copias.
  db.delete('reinicio:copias');
  assert.equal(foto(), antes, 'después de restaurar, la base no es idéntica a como estaba');
});

// Este caso encontró un fallo de verdad mientras se escribía: reiniciar y
// restaurar en el mismo segundo daban a las dos copias el mismo nombre, y la
// segunda pisaba a la primera — se "restauraba" lo nuevo y lo antiguo se perdía.
test('restaurar no pierde lo que entró después del reinicio: lo aparta en otra copia', async () => {
  tienda();
  const { cuerpo } = await reiniciarYa();
  db.set('pedidos', ['{"code":"ED-NUEVO","monto":99}']); // una venta real después de reiniciar

  const res = await llamar('POST', { body: { accion: 'restaurar', id: cuerpo.copia.id } });
  assert.deepEqual(db.get('pedidos'), DE_CLIENTES.pedidos, 'no volvieron los pedidos de la copia');
  assert.ok(res.cuerpo.apartada, 'el pedido nuevo se perdió al restaurar');
  assert.deepEqual(db.get(`reinicio:${res.cuerpo.apartada}:pedidos`), ['{"code":"ED-NUEVO","monto":99}']);
  assert.deepEqual(res.cuerpo.copias.map((c) => c.id), [res.cuerpo.apartada]);
  assert.notEqual(res.cuerpo.apartada, cuerpo.copia.id, 'dos copias comparten nombre: una pisa a la otra');
});

test('dos reinicios en el mismo instante no comparten copia', async () => {
  tienda();
  const reloj = Date;
  globalThis.Date = class extends reloj { constructor(...a) { super(...(a.length ? a : [reloj.UTC(2026, 10, 15, 9, 0, 0)])); } };
  try {
    const primera = (await reiniciarYa()).cuerpo.copia.id;
    db.set('pedidos', ['{"code":"ED-OTRO"}']);
    const segunda = (await reiniciarYa()).cuerpo.copia.id;
    assert.notEqual(primera, segunda);
    assert.deepEqual(db.get(`reinicio:${primera}:pedidos`), DE_CLIENTES.pedidos, 'la segunda copia pisó a la primera');
    assert.deepEqual(db.get(`reinicio:${segunda}:pedidos`), ['{"code":"ED-OTRO"}']);
  } finally {
    globalThis.Date = reloj;
  }
});

test('se guardan las tres últimas copias y las viejas se borran de verdad', async () => {
  tienda();
  const ids = [];
  const reloj = Date;
  for (let i = 0; i < 4; i++) {
    // Cada reinicio en un segundo distinto, como ocurriría de verdad.
    globalThis.Date = class extends reloj { constructor(...a) { super(...(a.length ? a : [reloj.UTC(2026, 10, 15, 10, 0, i)])); } };
    db.set('pedidos', [`{"code":"ED-${i}"}`]);
    ids.push((await reiniciarYa()).cuerpo.copia.id);
  }
  globalThis.Date = reloj;

  const { cuerpo } = await llamar('GET');
  assert.deepEqual(cuerpo.copias.map((c) => c.id), ids.slice(1).reverse());
  assert.equal([...db.keys()].some((k) => k.startsWith(`reinicio:${ids[0]}:`)), false, 'la copia más vieja salió de la lista pero sus datos siguen guardados');
});

test('borrar una copia quita sus datos y no toca la tienda', async () => {
  tienda();
  const { cuerpo } = await reiniciarYa();
  db.set('pedidos', ['{"code":"ED-NUEVO"}']);
  const res = await llamar('DELETE', { query: { id: cuerpo.copia.id } });
  assert.equal(res.codigo, 200);
  assert.deepEqual(res.cuerpo.copias, []);
  assert.equal([...db.keys()].some((k) => k.startsWith(`reinicio:${cuerpo.copia.id}`)), false);
  assert.deepEqual(db.get('pedidos'), ['{"code":"ED-NUEVO"}']);
  assert.deepEqual(db.get('catalog:products'), INTOCABLE['catalog:products']);
});

test('reiniciar una tienda que ya está en cero no crea copias vacías', async () => {
  db = new Map(Object.entries(structuredClone(INTOCABLE)));
  const res = await reiniciarYa();
  assert.equal(res.codigo, 200);
  assert.equal(res.cuerpo.copia, null);
  assert.deepEqual(res.cuerpo.copias, []);
});
