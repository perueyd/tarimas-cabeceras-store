// La pestaña del live: registro con nombre y WhatsApp, y la oferta al instante.
//
// Es una sección nueva (noviembre de 2026), así que estas pruebas no nacen de
// un fallo que ya ocurrió aquí, sino de los que esta sección tenía más fácil
// cometer, porque la tienda ya los cometió en otros sitios:
//
//   · Filtrar lo que no debía salir. /api/catalog publicaba los tokens de las
//     integraciones. Aquí el secreto es el código de descuento: si sale en la
//     respuesta pública, registrarse deja de hacer falta.
//   · Prometer un descuento que el pago rechaza. Un cupón creado en un sitio
//     se repartía y luego el checkout no lo reconocía. Aquí sería entregar un
//     código vencido o agotado.
//   · Guardar datos personales de más. La IP quedaba escrita en claro en la
//     base. Aquí son nombre y WhatsApp: solo con consentimiento, borrables
//     uno a uno, y con fecha de caducidad.

import test from 'node:test';
import assert from 'node:assert/strict';

// --- Entorno de mentira (antes de importar el código: lo lee al cargar) -----
const REDIS_URL = 'https://redis.prueba.local';
process.env.UPSTASH_REDIS_REST_URL = REDIS_URL;
process.env.UPSTASH_REDIS_REST_TOKEN = 'prueba';
process.env.ORDERS_ADMIN_KEY = 'clave-de-prueba';

const db = new Map();
globalThis.fetch = async (url, opts = {}) => {
  if (url !== REDIS_URL) return { ok: true, json: async () => ({}), text: async () => '' };
  const [cmd, key, ...args] = JSON.parse(opts.body);
  let result = null;
  switch (cmd) {
    case 'GET': result = db.get(key) ?? null; break;
    case 'SET': db.set(key, args[0]); result = 'OK'; break;
    case 'DEL': db.delete(key); result = 1; break;
    case 'INCR': { const n = Number(db.get(key) || 0) + 1; db.set(key, String(n)); result = n; break; }
    case 'EXPIRE': result = 1; break;
    case 'HGET': result = db.get(key)?.[args[0]] ?? null; break;
    case 'SADD': {
      const set = db.get(key) || new Set();
      const antes = set.size;
      set.add(args[0]);
      db.set(key, set);
      result = set.size - antes;
      break;
    }
    case 'LPUSH': { const l = db.get(key) || []; l.unshift(...args); db.set(key, l); result = l.length; break; }
    case 'LTRIM': { const l = db.get(key) || []; db.set(key, l.slice(Number(args[0]), Number(args[1]) + 1)); result = 'OK'; break; }
    case 'LRANGE': result = (db.get(key) || []).slice(Number(args[0]), Number(args[1]) + 1); break;
    case 'LREM': {
      const l = db.get(key) || [];
      const quedan = l.filter((x) => x !== args[1]);
      db.set(key, quedan);
      result = l.length - quedan.length;
      break;
    }
    default: result = null;
  }
  return { ok: true, json: async () => ({ result }) };
};

const { default: live } = await import('../api/_rutas/live.js');
const { validatePromo } = await import('../api/_promo.js');
const { PRIVACIDAD } = await import('../src/data/textosLegales.js');
const { normalizarWhatsApp, normalizarNombre, textoDeOferta } = await import('../src/lib/live.js');

// --- Ayudantes ---------------------------------------------------------------
const MANANA = new Date(Date.now() + 36 * 3600 * 1000).toISOString().slice(0, 10);
const AYER = new Date(Date.now() - 48 * 3600 * 1000).toISOString().slice(0, 10);

function tienda({ cupon = {} } = {}) {
  db.clear();
  db.set(
    'promo:codes',
    JSON.stringify([{ code: 'LIVE15', tipo: 'porcentaje', valor: 15, activo: true, maxUsos: 20, vence: MANANA, usados: 0, ...cupon }])
  );
}

let ip = 0;
async function llamar(method, { query = {}, body, admin = false, mismaIp = false } = {}) {
  const res = {
    codigo: 0,
    cuerpo: null,
    status(c) { this.codigo = c; return this; },
    json(x) { this.cuerpo = x; return this; },
  };
  // Cada llamada viene de una IP distinta salvo que se pida lo contrario: así
  // el límite de intentos no se mezcla con lo que cada prueba quiere medir.
  if (!mismaIp) ip += 1;
  await live(
    {
      method,
      query,
      body,
      headers: { 'x-real-ip': `10.0.0.${ip}`, ...(admin ? { authorization: 'Bearer clave-de-prueba' } : {}) },
      socket: {},
    },
    res
  );
  return res;
}

const encender = (extra = {}) =>
  llamar('POST', { query: { accion: 'config' }, admin: true, body: { activo: true, codigo: 'LIVE15', titulo: 'Live de hoy', ...extra } });
const apagar = () => llamar('POST', { query: { accion: 'config' }, admin: true, body: { activo: false, codigo: 'LIVE15' } });
const ANA = { nombre: 'Ana Quispe', whatsapp: '987 654 321', acepta: true };
const registrados = async () => (await llamar('GET', { admin: true })).cuerpo.registrados;

// ---------------------------------------------------------------------------
// El código solo sale después de registrarse
// ---------------------------------------------------------------------------
test('la consulta pública nunca trae el código, ni con el live encendido', async () => {
  tienda();
  await encender();
  const res = await llamar('GET');
  assert.equal(res.codigo, 200);
  assert.equal(res.cuerpo.activo, true);
  assert.equal(res.cuerpo.titulo, 'Live de hoy');
  assert.ok(!JSON.stringify(res.cuerpo).includes('LIVE15'), 'el código de descuento sale sin registrarse');
  assert.deepEqual(Object.keys(res.cuerpo).sort(), ['activo', 'descripcion', 'liveId', 'proximo', 'titulo']);
});

test('con el live apagado nadie se registra ni recibe código', async () => {
  tienda();
  const res = await llamar('POST', { body: ANA });
  assert.equal(res.codigo, 409);
  assert.equal(res.cuerpo.terminado, true);
  assert.ok(!JSON.stringify(res.cuerpo).includes('LIVE15'));
  assert.equal((await registrados()).length, 0, 'se guardaron datos de alguien que no pudo registrarse');
});

test('registrarse entrega el código y lo que da', async () => {
  tienda();
  await encender();
  const res = await llamar('POST', { body: ANA });
  assert.equal(res.codigo, 200, JSON.stringify(res.cuerpo));
  assert.equal(res.cuerpo.codigo, 'LIVE15');
  assert.equal(res.cuerpo.oferta, '15% de descuento');
  assert.equal(res.cuerpo.vence, MANANA);

  const lista = await registrados();
  assert.equal(lista.length, 1);
  assert.equal(lista[0].nombre, 'Ana Quispe');
  assert.equal(lista[0].whatsapp, '987654321');
  assert.equal(lista[0].promos, false, 'el permiso para otras ofertas no puede darse por marcado');
});

test('el código entregado es uno que el pago acepta', async () => {
  tienda();
  await encender();
  const { cuerpo } = await llamar('POST', { body: ANA });
  const validado = await validatePromo(cuerpo.codigo, 400);
  assert.equal(validado.valid, true, 'se entrega en el live un código que el checkout rechaza');
  assert.equal(validado.descuento, 60);
});

// ---------------------------------------------------------------------------
// No se promete un descuento que ya no existe
// ---------------------------------------------------------------------------
test('no se puede encender el live con un código vencido, agotado o inexistente', async () => {
  for (const [cupon, codigo] of [
    [{ vence: AYER }, 'LIVE15'],
    [{ activo: false }, 'LIVE15'],
    [{ maxUsos: 5, usados: 5 }, 'LIVE15'],
    [{}, 'NOEXISTE'],
    [{}, ''],
  ]) {
    tienda({ cupon });
    const res = await encender({ codigo });
    assert.equal(res.codigo, 400, `se encendió el live con ${JSON.stringify(cupon)} / ${codigo}`);
    assert.equal((await llamar('GET')).cuerpo.activo, false);
  }
});

test('si el cupón se agota a mitad del live, deja de entregarse', async () => {
  tienda({ cupon: { maxUsos: 2 } });
  await encender();
  assert.equal((await llamar('POST', { body: ANA })).codigo, 200);

  // Dos compras lo agotan (el contador de usos vive aparte, en promo:usos).
  db.set('promo:usos', { LIVE15: '2' });
  const res = await llamar('POST', { body: { ...ANA, whatsapp: '912345678' } });
  assert.equal(res.codigo, 409);
  assert.ok(!JSON.stringify(res.cuerpo).includes('LIVE15'), 'se entregó un código que ya no tiene usos');
  assert.equal((await registrados()).length, 1, 'se guardaron los datos de alguien que no recibió oferta');
});

// ---------------------------------------------------------------------------
// Datos personales: lo justo y con permiso
// ---------------------------------------------------------------------------
test('sin la casilla de consentimiento no se guarda nada', async () => {
  tienda();
  await encender();
  for (const acepta of [undefined, false, 'true', 1]) {
    const res = await llamar('POST', { body: { ...ANA, acepta } });
    assert.equal(res.codigo, 400, `se aceptó un registro con acepta=${JSON.stringify(acepta)}`);
    assert.ok(!JSON.stringify(res.cuerpo).includes('LIVE15'));
  }
  assert.equal((await registrados()).length, 0);
});

test('el nombre y el número se revisan antes de guardar', async () => {
  tienda();
  await encender();
  for (const body of [
    { ...ANA, nombre: '' },
    { ...ANA, nombre: 'A' },
    { ...ANA, whatsapp: '12345' },
    { ...ANA, whatsapp: '887654321' }, // 9 dígitos pero no es celular
    { ...ANA, whatsapp: '<script>' },
  ]) {
    assert.equal((await llamar('POST', { body })).codigo, 400, JSON.stringify(body));
  }
  assert.equal((await registrados()).length, 0);

  // El +51 delante y los espacios se entienden: así se copia de WhatsApp.
  assert.equal(normalizarWhatsApp('+51 987-654-321'), '987654321');
  assert.equal(normalizarNombre('  María   José <b>  '), 'María José b');
  assert.equal(textoDeOferta({ tipo: 'monto', valor: 50 }), 'S/ 50 de descuento');
});

test('la misma persona no ocupa dos filas en un live, pero sí puede volver en el siguiente', async () => {
  tienda();
  await encender();
  await llamar('POST', { body: ANA });
  const otraVez = await llamar('POST', { body: { ...ANA, whatsapp: '+51987654321' } });
  assert.equal(otraVez.cuerpo.codigo, 'LIVE15', 'quien recarga la página tiene que volver a ver su código');
  assert.equal((await registrados()).length, 1, 'la misma persona quedó apuntada dos veces');

  await apagar();
  await encender();
  await llamar('POST', { body: ANA });
  assert.equal((await registrados()).length, 2, 'en un live nuevo no se la dejó registrarse');
});

test('la lista de registrados solo se ve con la clave del panel', async () => {
  tienda();
  await encender();
  await llamar('POST', { body: ANA });

  const sinClave = await llamar('GET');
  assert.ok(!JSON.stringify(sinClave.cuerpo).includes('987654321'), 'la lista de teléfonos sale sin clave');
  assert.equal(sinClave.cuerpo.registrados, undefined);

  const res = { codigo: 0, cuerpo: null, status(c) { this.codigo = c; return this; }, json(x) { this.cuerpo = x; return this; } };
  await live({ method: 'GET', query: {}, headers: { authorization: 'Bearer otra-clave', 'x-real-ip': '10.9.9.9' }, socket: {} }, res);
  assert.equal(res.codigo, 401);

  const cambiar = await llamar('POST', { query: { accion: 'config' }, body: { activo: false } });
  assert.equal(cambiar.codigo, 401, 'cualquiera puede apagar o encender el live');
});

test('se puede borrar a una persona (derecho de cancelación) sin tocar a las demás', async () => {
  tienda();
  await encender();
  await llamar('POST', { body: ANA });
  await llamar('POST', { body: { nombre: 'Luis Rojas', whatsapp: '911222333', acepta: true, promos: true } });

  const res = await llamar('DELETE', { query: { whatsapp: '987654321' }, admin: true });
  assert.equal(res.cuerpo.borrados, 1);
  const quedan = await registrados();
  assert.deepEqual(quedan.map((r) => r.nombre), ['Luis Rojas']);
  assert.equal(quedan[0].promos, true);

  await llamar('DELETE', { query: { todos: '1' }, admin: true });
  assert.equal((await registrados()).length, 0);
});

test('los registros de hace más de un año se borran solos de la base', async () => {
  tienda();
  await encender();
  await llamar('POST', { body: ANA });
  const viejo = JSON.stringify({ nombre: 'Registro Viejo', whatsapp: '900000001', fecha: '2024-01-01T00:00:00.000Z', liveId: 'x' });
  db.get('live:registrados').push(viejo);

  const lista = await registrados();
  assert.deepEqual(lista.map((r) => r.nombre), ['Ana Quispe']);
  assert.ok(!db.get('live:registrados').includes(viejo), 'el registro caducado dejó de enseñarse pero sigue guardado');
});

test('el registro tiene límite de intentos por visitante', async () => {
  tienda();
  await encender();
  // El tope es alto porque muchos celulares comparten dirección de internet
  // (ver REGISTROS_POR_HORA), pero existe.
  const respuestas = [];
  for (let i = 0; i < 61; i++) {
    const numero = `9${String(10000000 + i)}`;
    respuestas.push((await llamar('POST', { body: { ...ANA, whatsapp: numero }, mismaIp: i > 0 })).codigo);
  }
  assert.equal(respuestas[19], 200, 'veinte personas con la misma conexión móvil no pudieron registrarse');
  assert.equal(respuestas[60], 429, 'un solo visitante puede llenar la lista de registros falsos sin tope');
});

test('la política de privacidad declara el registro del live', () => {
  // Recoger un dato que la política no menciona es lo que sanciona la ANPD.
  assert.match(PRIVACIDAD, /transmisi[oó]n en vivo/i);
  assert.match(PRIVACIDAD, /WhatsApp, si te registras/);
  assert.match(PRIVACIDAD, /un año como máximo/);
});
