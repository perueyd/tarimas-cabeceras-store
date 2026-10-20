// Pruebas de ESTRUCTURA: no comprueban qué calcula el código, sino que el
// proyecto siga cumpliendo las reglas que ya se rompieron una vez.
//
// Son las más valiosas de todas porque los fallos que cubren compilaban
// perfectamente. `npm run build` decía que todo estaba bien mientras la tienda
// llevaba días congelada o perdiendo pedidos.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

// Todos los .js y .jsx del proyecto (sin node_modules ni dist).
function archivosDeCodigo(dir, acc = []) {
  for (const entrada of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (['node_modules', 'dist', '.git', '.vercel'].includes(entrada.name)) continue;
      archivosDeCodigo(rel, acc);
    } else if (/\.(js|jsx|mjs)$/.test(entrada.name)) {
      acc.push(rel);
    }
  }
  return acc;
}

// ---------------------------------------------------------------------------
// El límite de 12 funciones del plan gratuito de Vercel
//
// El proyecto llegó a 24 y Vercel rechazó TODOS los despliegues durante días
// sin que se notara: la web seguía en línea, pero congelada en una versión
// vieja. Se perdió mucho tiempo buscando el fallo en el código de JARVIS
// cuando el problema era que el código nuevo nunca llegaba a publicarse.
// ---------------------------------------------------------------------------
test('Vercel: no se superan las 12 funciones del plan gratuito', () => {
  // Cuenta igual que Vercel: cada archivo suelto en api/ es una función. Los
  // que empiezan por "_" no cuentan (por eso las rutas de poco tráfico viven
  // en api/_rutas/ y se despachan desde api/[ruta].js).
  const funciones = fs
    .readdirSync(path.join(RAIZ, 'api'), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.js') && !e.name.startsWith('_'))
    .map((e) => e.name);

  assert.ok(
    funciones.length <= 12,
    `Hay ${funciones.length} funciones y el tope es 12. Vercel rechazará TODOS los despliegues.\n` +
      `Mueve la nueva a api/_rutas/ y regístrala en api/[ruta].js.\n` +
      `Actuales: ${funciones.join(', ')}`
  );
});

// ---------------------------------------------------------------------------
// El despachador y las rutas tienen que estar de acuerdo
// ---------------------------------------------------------------------------
const despachador = leer('api/[ruta].js');
const registradas = [...despachador.matchAll(/import\('\.\/_rutas\/([\w-]+)\.js'\)/g)].map((m) => m[1]);
const enDisco = fs
  .readdirSync(path.join(RAIZ, 'api/_rutas'))
  .filter((n) => n.endsWith('.js'))
  .map((n) => n.replace(/\.js$/, ''));

test('rutas: todo lo registrado en el despachador existe en disco', () => {
  for (const nombre of registradas) {
    assert.ok(enDisco.includes(nombre), `api/[ruta].js apunta a _rutas/${nombre}.js y ese archivo no existe.`);
  }
});

test('rutas: todo archivo de _rutas está registrado (si no, /api/eso da 404)', () => {
  for (const nombre of enDisco) {
    assert.ok(
      registradas.includes(nombre),
      `api/_rutas/${nombre}.js existe pero NO está en el mapa de api/[ruta].js, así que ` +
        `/api/${nombre} responde 404. Añádelo al mapa.`
    );
  }
});

test('rutas: cada archivo de _rutas exporta un manejador por defecto', () => {
  for (const nombre of enDisco) {
    const src = leer(`api/_rutas/${nombre}.js`);
    assert.match(
      src,
      /export default (async )?function/,
      `api/_rutas/${nombre}.js no tiene "export default function": el despachador no sabrá llamarlo.`
    );
  }
});

// ---------------------------------------------------------------------------
// La base de datos local tiene que entender los mismos comandos que Redis
//
// Ya pasó con HGET y HINCRBY: el código funcionaba en producción y fallaba en
// local, que es justo donde se prueban los cambios antes de publicarlos.
// ---------------------------------------------------------------------------
test('base local: entiende todos los comandos de Redis que usa el código', () => {
  const soportados = new Set([...leer('api/_localdb.js').matchAll(/case '([A-Z]+)'/g)].map((m) => m[1]));

  const usados = new Map(); // comando -> dónde se usa
  for (const archivo of archivosDeCodigo('api')) {
    if (archivo.endsWith('_localdb.js')) continue;
    for (const m of leer(archivo).matchAll(/redisCmd\(\s*\[\s*'([A-Z]+)'/g)) {
      if (!usados.has(m[1])) usados.set(m[1], archivo);
    }
  }

  const faltan = [...usados].filter(([cmd]) => !soportados.has(cmd));
  assert.deepEqual(
    faltan,
    [],
    'Estos comandos de Redis se usan pero api/_localdb.js no los entiende, así que ' +
      'fallarán en desarrollo local:\n' +
      faltan.map(([cmd, donde]) => `  ${cmd} (en ${donde})`).join('\n')
  );
});

// ---------------------------------------------------------------------------
// LSET por índice destruía pedidos
//
// Los pedidos entran por delante (LPUSH), así que entre leer la lista y
// escribir por índice los índices ya se habían corrido: se sobrescribía el
// pedido equivocado y el original desaparecía. Se usa reemplazarEnLista(),
// que identifica por valor.
// ---------------------------------------------------------------------------
test('nunca se escribe en una lista de Redis por índice (LSET)', () => {
  const culpables = archivosDeCodigo('api')
    .filter((a) => !a.endsWith('_localdb.js')) // ahí LSET es la implementación, no un uso
    .filter((a) => /redisCmd\(\s*\[\s*'LSET'/.test(leer(a)));

  assert.deepEqual(
    culpables,
    [],
    'LSET escribe por índice y los índices se corren con cada pedido nuevo: se pierden ' +
      'pedidos enteros. Usa reemplazarEnLista() de api/_store.js.\nArchivos: ' + culpables.join(', ')
  );
});

// ---------------------------------------------------------------------------
// Las fechas de vencimiento tienen que calcularse en hora de Lima
// ---------------------------------------------------------------------------
test('fechas: no se compara el fin del día sin decir la zona horaria', () => {
  const culpables = [];
  for (const archivo of [...archivosDeCodigo('api'), ...archivosDeCodigo('src')]) {
    // Los dos sitios donde el corte se arma a propósito, con el desfase de Lima pegado.
    if (archivo.endsWith('vencimiento.js') || archivo.endsWith('_ofertas-auto.js')) continue;
    const src = leer(archivo);
    // "T23:59:59" sin un offset (-05:00) pegado detrás.
    for (const m of src.matchAll(/T23:59:59(?!-05:00|\+|Z)/g)) {
      const linea = src.slice(0, m.index).split('\n').length;
      culpables.push(`${archivo}:${linea}`);
    }
  }

  assert.deepEqual(
    culpables,
    [],
    'Un "T23:59:59" sin zona horaria se interpreta en UTC, y Vercel corre en UTC: ' +
      'la oferta moriría a las 7 de la tarde hora de Perú. Usa vencida() de ' +
      'api/_ofertas-auto.js.\nSitios: ' + culpables.join(', ')
  );
});

// ---------------------------------------------------------------------------
// Antes de GUARDAR el catálogo hay que leerlo con la versión que protege
//
// La versión normal devuelve el catálogo DE FÁBRICA (4 productos de ejemplo)
// si Redis falla un instante, y la siguiente escritura lo guardaba encima de
// los reales.
// ---------------------------------------------------------------------------
test('catálogo: no se guarda sin haberlo leído con la versión protegida', () => {
  const src = leer('api/catalog.js');

  // Leer para MOSTRAR la tienda sí usa getCatalog() a secas, y debe seguir
  // siendo así: si Redis falla, es mejor enseñar el catálogo de fábrica que
  // una página rota. Esa lectura es una sola, la del GET público.
  const lecturasSimples = [...src.matchAll(/await getCatalog\(\s*\)/g)].length;
  assert.equal(
    lecturasSimples,
    1,
    'En api/catalog.js solo la lectura pública (el GET) puede usar getCatalog() a secas. ' +
      `Encontradas: ${lecturasSimples}. Todo lo que vaya a GUARDAR debe usar ` +
      'getCatalogParaEditar(), que falla si la base no respondió y guarda una copia antes.'
  );

  // Y cada camino que escribe tiene que haber pasado por la versión protegida.
  const escrituras = [...src.matchAll(/await save(List|Config)\(/g)].length;
  const protegidas = [...src.matchAll(/await getCatalogParaEditar\(\)/g)].length;
  assert.ok(
    protegidas >= escrituras,
    `api/catalog.js guarda ${escrituras} veces pero solo lee ${protegidas} veces con ` +
      'getCatalogParaEditar(). Algún camino está guardando sin protección ni copia de seguridad.'
  );
});

// ---------------------------------------------------------------------------
// Lo privado no puede salir por la puerta pública
// ---------------------------------------------------------------------------
test('privacidad: /api/catalog sigue filtrando los tokens de integraciones', () => {
  const src = leer('api/catalog.js');
  assert.match(src, /integrations/, 'debe seguir existiendo el filtro de datos privados');
  assert.match(src, /ownerEmail/, 'el correo del dueño debe seguir filtrándose');
  assert.match(src, /soloPublico\(/, 'la respuesta pública debe pasar por soloPublico()');
});

test('privacidad: /api/ofertas sigue ocultando los códigos de descuento', () => {
  const src = leer('api/_rutas/ofertas.js');
  assert.match(
    src,
    /codigo/,
    'la ruta pública de ofertas debe seguir excluyendo los cupones de tipo "codigo", ' +
      'o cualquiera que abra esa dirección se los lleva.'
  );
});

// ---------------------------------------------------------------------------
// Las copias de seguridad cubren TODO el catálogo
//
// Si mañana se añade otra lista al catálogo y no se añade aquí, la copia
// quedaría incompleta sin avisar — y eso solo se descubre el día que hace
// falta restaurar.
// ---------------------------------------------------------------------------
test('respaldos: la copia incluye todas las partes del catálogo', async () => {
  const { PARTES } = await import('../api/_respaldos.js');
  const devueltas = [...leer('api/_catalog.js').matchAll(/^\s{4}(\w+): (?:db\w+ \?\?|dbConfig \?)/gm)].map(
    (m) => m[1]
  );

  for (const parte of devueltas) {
    assert.ok(
      PARTES.includes(parte),
      `getCatalog() devuelve "${parte}" pero api/_respaldos.js no la respalda: ` +
        'las copias quedarían incompletas.'
    );
  }
  assert.ok(devueltas.length >= 5, 'no se pudieron leer las partes del catálogo, revisa esta prueba');
});
