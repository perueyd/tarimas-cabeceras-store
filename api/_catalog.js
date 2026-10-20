// Catálogo editable: vive en Redis (Upstash) y se puede modificar desde el
// panel /pedidos → "Editar página", sin tocar código ni hacer deploy.
// Si Redis no tiene datos todavía (o no está conectado), se usa el catálogo
// estático de src/data/catalog.js como respaldo — la tienda nunca se rompe.
import { hasDB, redisCmd } from './_store.js';
import { respaldar } from './_respaldos.js';
import { categories, colors, products, showcase, sizes, storeConfig } from '../src/data/catalog.js';

const KEYS = {
  products: 'catalog:products',
  categories: 'catalog:categories',
  colors: 'catalog:colors',
  sizes: 'catalog:sizes',
  showcase: 'catalog:showcase',
  config: 'catalog:config',
};

// Distingue "la base dice que no hay nada" de "la base no respondió".
// Confundirlas era capaz de borrar el catálogo entero: si Redis fallaba un
// instante, getCatalog devolvía el catálogo DE FÁBRICA (4 productos de
// ejemplo), y la siguiente edición desde el panel guardaba esos 4 encima de
// los 33 reales, sin vuelta atrás.
const FALLO = Symbol('fallo-al-leer');

async function getJSON(key, fallback) {
  if (!hasDB) return fallback;
  try {
    const data = await redisCmd(['GET', key]);
    if (!data.result) return fallback;
    const parsed = JSON.parse(data.result);
    return parsed ?? fallback;
  } catch (err) {
    console.error(`No se pudo leer ${key} de Redis:`, err?.message);
    return FALLO;
  }
}

async function setJSON(key, value) {
  if (!hasDB) return false;
  await redisCmd(['SET', key, JSON.stringify(value)]);
  return true;
}

// `paraEditar: true` cuando lo que sigue es GUARDAR. En ese caso, si la base
// no respondió se lanza un error en vez de devolver el catálogo de fábrica:
// es preferible que el panel diga "no se pudo guardar" a que borre la tienda.
// Las seis partes del catálogo, en una sola petición a Redis.
//
// Antes eran seis GET sueltos, así que CADA visita a la tienda gastaba seis
// comandos del plan gratuito de Upstash (500.000 al mes). Con MGET es uno:
// el mismo dato por la sexta parte de cuota, y además una sola ida y vuelta
// por la red en vez de seis, que se nota en lo que tarda en aparecer el
// catálogo.
//
// No se cachea la respuesta en el CDN a propósito: la misma dirección devuelve
// el catálogo COMPLETO cuando lleva la clave de administrador, y una caché
// compartida podría acabar sirviéndole a un cliente la respuesta del panel,
// con los tokens de integraciones dentro.
const ORDEN = ['products', 'categories', 'colors', 'sizes', 'showcase', 'config'];

async function leerTodo() {
  if (!hasDB) return ORDEN.map(() => null);
  try {
    const data = await redisCmd(['MGET', ...ORDEN.map((k) => KEYS[k])]);
    const valores = Array.isArray(data?.result) ? data.result : [];
    return ORDEN.map((_, i) => {
      const crudo = valores[i];
      if (crudo == null) return null;
      try {
        return JSON.parse(crudo) ?? null;
      } catch {
        return null;
      }
    });
  } catch (err) {
    console.error('No se pudo leer el catálogo de Redis:', err?.message);
    // Un fallo de lectura es distinto de "no hay nada": si se confundieran,
    // la siguiente escritura guardaría el catálogo de fábrica encima del real.
    return ORDEN.map(() => FALLO);
  }
}

export async function getCatalog({ paraEditar = false } = {}) {
  const leidos = await leerTodo();

  if (paraEditar && leidos.some((x) => x === FALLO)) {
    throw new Error(
      'No se pudo leer el catálogo de la base de datos. No se guardó nada para no perder tus productos. Intenta de nuevo en un momento.'
    );
  }

  // Para MOSTRAR la tienda sí se usa el catálogo de fábrica si la base falla:
  // una tienda con productos de ejemplo es mejor que una página rota.
  const [dbProducts, dbCategories, dbColors, dbSizes, dbShowcase, dbConfig] = leidos.map((x) =>
    x === FALLO ? null : x
  );

  return {
    products: dbProducts ?? products,
    categories: dbCategories ?? categories,
    colors: dbColors ?? colors,
    sizes: dbSizes ?? sizes,
    showcase: dbShowcase ?? showcase,
    storeConfig: dbConfig ? { ...storeConfig, ...dbConfig } : storeConfig,
  };
}

const LIST_RESOURCES = { product: 'products', category: 'categories', color: 'colors', size: 'sizes', showcase: 'showcase' };

export function listKeyFor(resource) {
  return LIST_RESOURCES[resource] || null;
}

export async function saveList(resourceKey, list) {
  await setJSON(KEYS[resourceKey], list);
}

export async function saveConfig(config) {
  await setJSON(KEYS.config, config);
}

// Úsalo SIEMPRE antes de guardar, en lugar de getCatalog({ paraEditar: true }).
// Hace dos cosas en el orden correcto: lee el catálogo (y lanza si la base no
// respondió, para no guardar encima de nada) y guarda una copia de seguridad de
// cómo estaba ANTES del cambio. Ese orden importa: si la edición que viene a
// continuación destruye algo, la copia ya tiene la versión buena.
export async function getCatalogParaEditar() {
  const catalog = await getCatalog({ paraEditar: true });
  await respaldar(catalog);
  return catalog;
}

// Devuelve el catálogo a como estaba en una copia de seguridad.
//
// Solo escribe las partes que la copia realmente trae: una copia vieja a la que
// le falte una lista nueva no debe dejar esa lista en blanco. Y si no trae
// productos, no se restaura nada — sería cambiar una tienda viva por una vacía.
export async function restaurarCatalogo(foto) {
  if (!foto || !Array.isArray(foto.products) || foto.products.length === 0) {
    throw new Error('Esa copia no tiene productos. No se restauró nada.');
  }

  // Antes de pisar lo que hay, se guarda una copia del estado actual: si el
  // dueño restaura por error, lo de ahora tampoco se pierde.
  await respaldar(await getCatalog({ paraEditar: true }), { forzar: true });

  const aLista = { products: 'products', categories: 'categories', colors: 'colors', sizes: 'sizes', showcase: 'showcase' };
  for (const [parte, listKey] of Object.entries(aLista)) {
    if (Array.isArray(foto[parte])) await saveList(listKey, foto[parte]);
  }
  if (foto.storeConfig && typeof foto.storeConfig === 'object') {
    await saveConfig(foto.storeConfig);
  }
  return getCatalog();
}
