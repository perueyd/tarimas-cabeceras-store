// Catálogo editable: vive en Redis (Upstash) y se puede modificar desde el
// panel /pedidos → "Editar página", sin tocar código ni hacer deploy.
// Si Redis no tiene datos todavía (o no está conectado), se usa el catálogo
// estático de src/data/catalog.js como respaldo — la tienda nunca se rompe.
import { hasDB, redisCmd } from './_store.js';
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
export async function getCatalog({ paraEditar = false } = {}) {
  const leidos = await Promise.all([
    getJSON(KEYS.products, null),
    getJSON(KEYS.categories, null),
    getJSON(KEYS.colors, null),
    getJSON(KEYS.sizes, null),
    getJSON(KEYS.showcase, null),
    getJSON(KEYS.config, null),
  ]);

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
