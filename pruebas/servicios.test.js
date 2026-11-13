// Servicios y portafolio.
//
// Esta sección es nueva (noviembre de 2026), así que estas pruebas no nacen
// de un fallo que ya ocurrió con ella, sino de los que ya ocurrieron en la
// tienda y que esta sección podía repetir:
//
//   · Se perdieron los 33 productos una vez. Guardar un plan de servicio
//     ESCRIBE en la lista de productos (crea el producto oculto con el que se
//     cobra), así que es el sitio perfecto para volver a perderlos.
//   · Se cobró un precio distinto del mostrado. El precio de un plan vive en
//     dos sitios (el plan y su producto); si se separan, la tarjeta diría un
//     número y el cobro otro.
//   · Se publicaron testimonios de ejemplo como reales. Un portafolio o un
//     plan de muestra sería lo mismo, así que la sección tiene que nacer vacía
//     y oculta.
//
// Se prueba el camino completo (api/catalog.js) con una base Redis de mentira.

import test from 'node:test';
import assert from 'node:assert/strict';

// --- Entorno de mentira (antes de importar el código: lo lee al cargar) -----
const REDIS_URL = 'https://redis.prueba.local';
process.env.UPSTASH_REDIS_REST_URL = REDIS_URL;
process.env.UPSTASH_REDIS_REST_TOKEN = 'prueba';
process.env.ORDERS_ADMIN_KEY = 'clave-de-prueba';

const db = new Map();
let redisCaido = false;
globalThis.fetch = async (url, opts = {}) => {
  if (url !== REDIS_URL) return { ok: true, json: async () => ({}), text: async () => '' };
  if (redisCaido) return { ok: false, status: 500, json: async () => ({}) };
  const [cmd, key, ...args] = JSON.parse(opts.body);
  let result = null;
  if (cmd === 'GET') result = db.get(key) ?? null;
  if (cmd === 'MGET') result = [key, ...args].map((k) => db.get(k) ?? null);
  if (cmd === 'SET') { db.set(key, args[0]); result = 'OK'; }
  if (cmd === 'DEL') { db.delete(key); result = 1; }
  return { ok: true, json: async () => ({ result }) };
};

const { default: catalogo } = await import('../api/catalog.js');
const { restaurarCatalogo } = await import('../api/_catalog.js');
const { priceOrder } = await import('../api/_pricing.js');
const { PARTES } = await import('../api/_respaldos.js');
const {
  TAMANO_SERVICIO,
  cobroDePlan,
  hayServicios,
  idProductoDePlan,
  limpiarPlan,
  limpiarProyecto,
  planesVisibles,
  proyectosVisibles,
  sincronizarProductos,
  textosDeServicios,
} = await import('../src/lib/servicios.js');
const fabrica = await import('../src/data/catalog.js');

// --- Ayudantes ---------------------------------------------------------------
const MUEBLES = [
  { id: 'milan', name: 'MILÁN', category: 'cabeceras', sizePricing: { '2plazas': 200 }, availableColors: ['azul'] },
  { id: 'verona', name: 'VERONA', category: 'cabeceras', sizePricing: { queen: 310 }, availableColors: ['gris'] },
];

function tiendaConMuebles() {
  db.clear();
  redisCaido = false;
  db.set('catalog:products', JSON.stringify(MUEBLES));
}

const leer = (clave) => JSON.parse(db.get(clave) || 'null');

async function llamar(method, query, body, { conClave = true } = {}) {
  const res = {
    codigo: 0,
    cuerpo: null,
    status(c) { this.codigo = c; return this; },
    json(x) { this.cuerpo = x; return this; },
  };
  const req = {
    method,
    query,
    body,
    headers: conClave ? { authorization: 'Bearer clave-de-prueba' } : {},
    socket: { remoteAddress: '127.0.0.1' },
  };
  await catalogo(req, res);
  return res;
}

const PLAN_FIJO = {
  id: 'diseno-dormitorio',
  area: 'Diseño de interiores',
  nombre: 'Diseño de dormitorio',
  descripcion: 'Propuesta completa para un dormitorio.',
  incluye: ['Visita para medir', 'Propuesta en 3D'],
  modo: 'pagar',
  precio: 350,
};
const PLAN_A_COTIZAR = { id: 'retapizado', area: 'Tapicería', nombre: 'Retapizado de sofá', modo: 'cotizar', precioTexto: 'Desde S/ 280' };

// ---------------------------------------------------------------------------
// Nada inventado: la sección nace vacía y oculta
// ---------------------------------------------------------------------------
test('de fábrica no hay ni un plan ni un proyecto de ejemplo', () => {
  assert.deepEqual(fabrica.services, [], 'el catálogo de fábrica trae planes de ejemplo: se publicarían como reales');
  assert.deepEqual(fabrica.projects, [], 'el catálogo de fábrica trae proyectos de ejemplo: se publicarían como reales');
  assert.equal(hayServicios({ services: fabrica.services, projects: fabrica.projects }), false);
});

test('la sección sigue oculta si lo único que hay no se puede enseñar', () => {
  // Un plan despublicado y un proyecto sin fotos no bastan para abrir la página.
  const catalog = {
    services: [{ id: 'a', nombre: 'Plan', activo: false }],
    projects: [{ id: 'b', titulo: 'Sala', fotos: [] }],
  };
  assert.equal(planesVisibles(catalog.services).length, 0);
  assert.equal(proyectosVisibles(catalog.projects).length, 0);
  assert.equal(hayServicios(catalog), false);

  catalog.projects[0].fotos = ['/productos/sala.webp'];
  assert.equal(hayServicios(catalog), true, 'con un proyecto con foto la sección ya debe aparecer');
});

test('los textos de partida no prometen nada, y un título vacío no deja la página sin título', () => {
  const textos = textosDeServicios({});
  assert.equal(textos.descripcion, '', 'la descripción la escribe el dueño');
  assert.deepEqual(textos.pasos, [], 'los pasos de trabajo los escribe el dueño');

  const editados = textosDeServicios({ servicios: { titulo: '   ', ctaTexto: '', fotoPortada: 'javascript:alert(1)' } });
  assert.equal(editados.titulo, 'Servicios');
  assert.equal(editados.ctaTexto, '', 'un texto borrado a propósito se respeta');
  assert.equal(editados.fotoPortada, '', 'una dirección de foto que no es https ni del sitio no se usa');
});

// ---------------------------------------------------------------------------
// Guardar un plan no puede costar los productos
// ---------------------------------------------------------------------------
test('sincronizar: los muebles salen idénticos y en el mismo orden', () => {
  const { products, cambio } = sincronizarProductos(MUEBLES, [PLAN_FIJO, PLAN_A_COTIZAR]);
  assert.equal(cambio, true);
  assert.deepEqual(products.slice(0, 2), MUEBLES, 'un mueble cambió al guardar un plan de servicio');
  assert.equal(products.length, 3, 'solo debe añadirse el producto del plan de precio fijo');

  const delPlan = products[2];
  assert.equal(delPlan.id, idProductoDePlan(PLAN_FIJO.id));
  assert.equal(delPlan.oculto, true, 'el producto del plan aparecería en la tienda entre los muebles');
  assert.equal(delPlan.esServicio, true);
  assert.deepEqual(delPlan.sizePricing, { [TAMANO_SERVICIO]: 350 });
});

test('sincronizar: si nada cambió, no pide escribir la lista de productos', () => {
  const primera = sincronizarProductos(MUEBLES, [PLAN_FIJO]);
  const segunda = sincronizarProductos(primera.products, [PLAN_FIJO]);
  assert.equal(segunda.cambio, false, 'se reescribiría la lista de productos sin motivo en cada guardado');
  assert.deepEqual(segunda.products, primera.products);
});

test('sincronizar: un mueble que ya usa ese identificador no se pisa ni se duplica', () => {
  const mueble = { id: idProductoDePlan(PLAN_FIJO.id), name: 'Mueble con ese nombre', sizePricing: { queen: 900 } };
  const { products, cambio } = sincronizarProductos([...MUEBLES, mueble], [PLAN_FIJO]);
  assert.equal(cambio, false);
  assert.deepEqual(products, [...MUEBLES, mueble]);
  // Y el plan no ofrece cobrar con el precio de ese mueble: pasa a cotizarse.
  assert.equal(cobroDePlan(PLAN_FIJO, products), null);
});

test('API: guardar un plan de precio fijo crea su producto y conserva los muebles', async () => {
  tiendaConMuebles();
  const res = await llamar('POST', { resource: 'service' }, PLAN_FIJO);
  assert.equal(res.codigo, 200, JSON.stringify(res.cuerpo));

  const productos = leer('catalog:products');
  assert.deepEqual(productos.slice(0, 2), MUEBLES, 'guardar un plan cambió o borró un mueble');
  assert.equal(productos.length, 3);
  assert.equal(leer('catalog:services').length, 1);
});

test('API: si la base no responde, no se guarda nada (ni plan ni productos)', async () => {
  tiendaConMuebles();
  redisCaido = true;
  const res = await llamar('POST', { resource: 'service' }, PLAN_FIJO);
  assert.equal(res.codigo, 503);
  redisCaido = false;
  assert.deepEqual(leer('catalog:products'), MUEBLES, 'se escribió la lista de productos con la base caída');
  assert.equal(db.has('catalog:services'), false);
});

test('API: pasar el plan a «cotizar» o borrarlo quita su producto, y solo ese', async () => {
  tiendaConMuebles();
  await llamar('POST', { resource: 'service' }, PLAN_FIJO);
  await llamar('POST', { resource: 'service' }, { ...PLAN_FIJO, modo: 'cotizar', precio: 350 });
  assert.deepEqual(leer('catalog:products'), MUEBLES, 'quedó un producto huérfano cobrable de un plan que ya no se vende en la web');
  assert.equal(leer('catalog:services')[0].precio, null, 'un plan a cotizar no guarda un precio que nadie va a respetar');

  await llamar('POST', { resource: 'service' }, PLAN_FIJO);
  assert.equal(leer('catalog:products').length, 3);
  await llamar('DELETE', { resource: 'service', id: PLAN_FIJO.id });
  assert.deepEqual(leer('catalog:products'), MUEBLES);
  assert.deepEqual(leer('catalog:services'), []);
});

test('API: un plan despublicado deja de poder cobrarse', async () => {
  tiendaConMuebles();
  await llamar('POST', { resource: 'service' }, PLAN_FIJO);
  await llamar('POST', { resource: 'service' }, { ...PLAN_FIJO, activo: false });
  const productos = leer('catalog:products');
  assert.deepEqual(productos, MUEBLES, 'el plan ya no se ve, pero su producto seguía siendo comprable');
  assert.equal(
    priceOrder(productos, [{ productId: idProductoDePlan(PLAN_FIJO.id), sizeId: TAMANO_SERVICIO, qty: 1 }]),
    null
  );

  // Al volver a publicarlo se puede cobrar otra vez, al mismo precio.
  await llamar('POST', { resource: 'service' }, { ...PLAN_FIJO, activo: true });
  assert.equal(cobroDePlan(leer('catalog:services')[0], leer('catalog:products')).precio, 350);
});

test('API: sin la clave de administrador no se puede crear ni borrar nada', async () => {
  tiendaConMuebles();
  const crear = await llamar('POST', { resource: 'service' }, PLAN_FIJO, { conClave: false });
  assert.equal(crear.codigo, 401);
  const borrar = await llamar('DELETE', { resource: 'project', id: 'x' }, null, { conClave: false });
  assert.equal(borrar.codigo, 401);
  assert.equal(db.has('catalog:services'), false);
});

// ---------------------------------------------------------------------------
// El precio mostrado es el cobrado
// ---------------------------------------------------------------------------
test('el precio de la tarjeta del plan es el mismo que cobra el servidor', async () => {
  tiendaConMuebles();
  await llamar('POST', { resource: 'service' }, PLAN_FIJO);
  const productos = leer('catalog:products');
  const plan = leer('catalog:services')[0];

  const cobro = cobroDePlan(plan, productos);
  assert.equal(cobro.precio, 350);

  // Lo que manda el navegador al contratar (con un precio falso, que se ignora).
  const pedido = priceOrder(productos, [
    { productId: cobro.producto.id, sizeId: TAMANO_SERVICIO, colorId: '', qty: 1, unitPrice: 1 },
  ]);
  assert.equal(pedido.total, cobro.precio, 'el servidor cobraría un importe distinto del que enseña la tarjeta');
  assert.equal(pedido.items[0].productName, 'Diseño de dormitorio — Diseño de interiores');
});

test('al cambiar el precio del plan cambia lo que se cobra', async () => {
  tiendaConMuebles();
  await llamar('POST', { resource: 'service' }, PLAN_FIJO);
  await llamar('POST', { resource: 'service' }, { ...PLAN_FIJO, precio: '420.50' });
  const productos = leer('catalog:products');
  const cobro = cobroDePlan(leer('catalog:services')[0], productos);
  assert.equal(cobro.precio, 420.5);
  assert.equal(priceOrder(productos, [{ productId: cobro.producto.id, sizeId: TAMANO_SERVICIO, qty: 1 }]).total, 420.5);
});

test('un plan a cotizar no se puede cobrar por ningún camino', async () => {
  tiendaConMuebles();
  await llamar('POST', { resource: 'service' }, PLAN_A_COTIZAR);
  const productos = leer('catalog:products');
  assert.equal(cobroDePlan(leer('catalog:services')[0], productos), null);
  assert.equal(
    priceOrder(productos, [{ productId: idProductoDePlan(PLAN_A_COTIZAR.id), sizeId: TAMANO_SERVICIO, qty: 1 }]),
    null,
    'se pudo armar un pedido de un plan que no tiene precio'
  );
});

test('un plan de precio fijo sin un precio válido no se guarda', async () => {
  tiendaConMuebles();
  for (const precio of ['', 0, -50, 'gratis', 99999999]) {
    const res = await llamar('POST', { resource: 'service' }, { ...PLAN_FIJO, precio });
    assert.equal(res.codigo, 400, `se aceptó el precio ${JSON.stringify(precio)}`);
    assert.match(res.cuerpo.error, /precio/i);
  }
  assert.equal(db.has('catalog:services'), false);
  assert.deepEqual(leer('catalog:products'), MUEBLES);
});

// ---------------------------------------------------------------------------
// Lo que se guarda es lo que ve el cliente
// ---------------------------------------------------------------------------
test('un plan se guarda limpio: sin campos extraños, con la lista de «incluye» ordenada', () => {
  const { item } = limpiarPlan({
    id: 'Diseño de SALA!!',
    nombre: '  Diseño   de sala  ',
    incluye: '  Visita \n\n Planos\n',
    foto: 'http://sitio-sin-candado.com/foto.jpg',
    modo: 'pagar',
    precio: '1250.50',
    costo: 100,
    oculto: true,
  });
  assert.equal(item.id, 'diseno-de-sala');
  assert.equal(item.nombre, 'Diseño de sala');
  assert.deepEqual(item.incluye, ['Visita', 'Planos']);
  assert.equal(item.foto, '', 'una foto por http (sin candado) dejaría un hueco roto en la página');
  assert.equal(item.precio, 1250.5);
  assert.equal('costo' in item, false, 'se guardó un campo que no es del plan y saldría por /api/catalog');
  assert.equal(limpiarPlan({ id: 'x', nombre: '' }).error, 'Escribe el nombre del plan.');
});

test('un proyecto guarda solo fotos válidas y como mucho doce', () => {
  const fotos = Array.from({ length: 15 }, (_, i) => `/productos/sala-${i}.webp`);
  const { item } = limpiarProyecto({ id: 'sala', titulo: 'Sala en Surco', anio: 'año 2026', fotos: ['javascript:x', ...fotos] });
  assert.equal(item.fotos.length, 12);
  assert.equal(item.fotos[0], '/productos/sala-0.webp');
  assert.equal(item.anio, '2026');
  assert.equal(limpiarProyecto({ id: 'x', titulo: ' ' }).error, 'Escribe el título del proyecto.');
});

test('API: los proyectos se guardan, se reordenan y se borran', async () => {
  tiendaConMuebles();
  await llamar('POST', { resource: 'project' }, { id: 'sala', titulo: 'Sala', fotos: ['/productos/a.webp'] });
  await llamar('POST', { resource: 'project' }, { id: 'cocina', titulo: 'Cocina', fotos: ['/productos/b.webp'] });
  assert.deepEqual(leer('catalog:projects').map((p) => p.id), ['sala', 'cocina']);

  await llamar('POST', { resource: 'project', action: 'reorder' }, { ids: ['cocina', 'sala'] });
  assert.deepEqual(leer('catalog:projects').map((p) => p.id), ['cocina', 'sala']);

  await llamar('DELETE', { resource: 'project', id: 'sala' });
  assert.deepEqual(leer('catalog:projects').map((p) => p.id), ['cocina']);
  assert.deepEqual(leer('catalog:products'), MUEBLES, 'tocar el portafolio cambió los productos');
});

test('lo publicado sale en /api/catalog para que la tienda lo pinte', async () => {
  tiendaConMuebles();
  await llamar('POST', { resource: 'service' }, PLAN_A_COTIZAR);
  await llamar('POST', { resource: 'project' }, { id: 'sala', titulo: 'Sala', fotos: ['/productos/a.webp'] });
  const res = await llamar('GET', {}, null, { conClave: false });
  assert.equal(res.cuerpo.services[0].nombre, 'Retapizado de sofá');
  assert.equal(res.cuerpo.projects[0].titulo, 'Sala');
});

// ---------------------------------------------------------------------------
// Las copias de seguridad incluyen las dos listas nuevas
// ---------------------------------------------------------------------------
test('respaldos: restaurar una copia antigua no deja un plan de precio fijo sin poder cobrarse', async () => {
  tiendaConMuebles();
  await llamar('POST', { resource: 'service' }, PLAN_FIJO);

  // Una copia de antes de que existieran los servicios: solo trae muebles.
  await restaurarCatalogo({ products: [MUEBLES[0]] });

  const productos = leer('catalog:products');
  assert.deepEqual(productos[0], MUEBLES[0], 'el mueble restaurado no es el de la copia');
  assert.equal(productos.filter((p) => !p.esServicio).length, 1, 'se restauraron muebles que no estaban en la copia');
  assert.equal(
    cobroDePlan(leer('catalog:services')[0], productos)?.precio,
    350,
    'el plan sigue publicado como «se paga en la web» pero ya no tiene con qué cobrarse'
  );
});

// ---------------------------------------------------------------------------
// Editar sobre la página no puede costarle nada al cliente
//
// El panel se cargaba entero con la tienda y cada cliente descargaba sus ~20
// pestañas antes de ver la portada. La página de servicios se puede editar
// "como la ve el cliente", y es justo el sitio donde ese fallo volvería: si
// importara los formularios del panel directamente, cada visitante bajaría el
// editor completo para leer una página.
// ---------------------------------------------------------------------------
test('la página de servicios no arrastra los formularios del panel', async () => {
  const fs = await import('node:fs');
  const pagina = fs.readFileSync(new URL('../src/pages/Servicios.jsx', import.meta.url), 'utf8');
  const ligero = fs.readFileSync(new URL('../src/pages/servicios/edicion.jsx', import.meta.url), 'utf8');

  for (const [nombre, fuente] of [['Servicios.jsx', pagina], ['servicios/edicion.jsx', ligero]]) {
    assert.ok(
      !/^import [^;]*from '[^']*\/editor\//m.test(fuente),
      `${nombre} importa algo de src/pages/editor/: el cliente descargaría los formularios del panel`
    );
  }
  assert.match(
    pagina,
    /lazy\(\(\) => import\('\.\/servicios\/EdicionModal\.jsx'\)\)/,
    'los formularios del modo edición tienen que cargarse aparte, solo cuando el dueño los abre'
  );
  // Y sin la sesión del panel no hay modo edición que valga.
  assert.match(ligero, /if \(!clave\) return null;/, 'el modo edición debe apagarse entero si no hay sesión del panel');
});

test('respaldos: los planes y los proyectos entran en la copia', () => {
  assert.ok(PARTES.includes('services'), 'los planes de servicio no entran en la copia de seguridad');
  assert.ok(PARTES.includes('projects'), 'el portafolio no entra en la copia de seguridad');
});
