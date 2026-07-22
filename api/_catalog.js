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

async function getJSON(key, fallback) {
  if (!hasDB) return fallback;
  try {
    const data = await redisCmd(['GET', key]);
    if (!data.result) return fallback;
    const parsed = JSON.parse(data.result);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

async function setJSON(key, value) {
  if (!hasDB) return false;
  await redisCmd(['SET', key, JSON.stringify(value)]);
  return true;
}

export async function getCatalog() {
  const [dbProducts, dbCategories, dbColors, dbSizes, dbShowcase, dbConfig] = await Promise.all([
    getJSON(KEYS.products, null),
    getJSON(KEYS.categories, null),
    getJSON(KEYS.colors, null),
    getJSON(KEYS.sizes, null),
    getJSON(KEYS.showcase, null),
    getJSON(KEYS.config, null),
  ]);
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
