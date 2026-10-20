// Copias de seguridad del catálogo.
//
// POR QUÉ EXISTE ESTO: en agosto de 2026 los 33 productos de la tienda
// desaparecieron de Redis (los colores, medidas y configuración quedaron
// intactos — solo la lista de productos se vació). No había ninguna copia, así
// que el dueño tuvo que dictar los 33 productos uno por uno, con sus
// descripciones y precios. Horas de trabajo perdidas por no tener un archivo
// de 100 KB guardado.
//
// CÓMO FUNCIONA: antes de la PRIMERA escritura de cada día, se guarda una foto
// completa del catálogo tal como estaba. Se conservan las últimas 7 (una semana
// de margen para darse cuenta de que algo se rompió). Si la foto del día ya
// existe, no se vuelve a hacer: el dueño edita muchos campos seguidos y no
// tiene sentido guardar 40 copias idénticas de la misma tarde.
//
// DÓNDE SE GUARDA: el índice (ligero, solo fechas y conteos) en una clave, y
// cada foto completa en su propia clave. Así listar las copias en el panel no
// descarga 700 KB — solo unas pocas líneas.
import { hasDB, redisCmd } from './_store.js';

const CLAVE_INDICE = 'catalog:respaldos';
const PREFIJO_FOTO = 'catalog:respaldo:';
const CUANTAS_GUARDAR = 7;

// Lima va 5 horas por detrás de UTC y Vercel corre en UTC. Sin esto, "el
// respaldo de hoy" cambiaba de día a las 7 de la noche hora de Perú — el mismo
// error que ya había costado que las ofertas murieran antes de tiempo.
const MS_LIMA = -5 * 60 * 60 * 1000;

export function diaLima(fecha = new Date()) {
  return new Date(fecha.getTime() + MS_LIMA).toISOString().slice(0, 10);
}

// Las partes del catálogo que se respaldan. Es TODO lo que vive en Redis: si
// mañana se añade otra lista al catálogo, hay que añadirla aquí también, o la
// copia quedará incompleta sin avisar.
const PARTES = ['products', 'categories', 'colors', 'sizes', 'showcase', 'storeConfig'];

function resumir(catalog) {
  const cuenta = {};
  for (const parte of PARTES) {
    const valor = catalog?.[parte];
    if (Array.isArray(valor)) cuenta[parte] = valor.length;
  }
  return cuenta;
}

async function leerJSON(clave) {
  const data = await redisCmd(['GET', clave]);
  if (!data?.result) return null;
  try {
    return JSON.parse(data.result);
  } catch {
    return null;
  }
}

export async function listarRespaldos() {
  if (!hasDB) return [];
  const indice = await leerJSON(CLAVE_INDICE);
  return Array.isArray(indice) ? indice : [];
}

export async function leerRespaldo(id) {
  if (!hasDB) return null;
  // El id se usa para construir una clave de Redis, así que se limita a lo que
  // este módulo genera (fecha y hora). Sin esto, un id inventado podría leer
  // otras claves de la base.
  if (!/^[0-9a-zA-Z_-]{1,40}$/.test(String(id || ''))) return null;
  return leerJSON(PREFIJO_FOTO + id);
}

// Guarda una copia del catálogo. `forzar: true` la hace aunque ya exista la
// del día (es lo que usa el botón "Guardar copia ahora" del panel).
//
// NUNCA lanza: un fallo al respaldar no debe impedir que el dueño guarde su
// trabajo. Si algo sale mal se anota en el log y la edición continúa.
export async function respaldar(catalog, { forzar = false } = {}) {
  if (!hasDB || !catalog) return null;

  try {
    const hoy = diaLima();
    const indice = await listarRespaldos();

    if (!forzar && indice.some((r) => r.dia === hoy)) return null;

    // Un catálogo vacío no se respalda: si Redis acaba de perder los productos,
    // guardar esa foto significaría empujar la última copia buena fuera de la
    // lista de 7. El respaldo debe proteger, no acelerar la pérdida.
    if (!Array.isArray(catalog.products) || catalog.products.length === 0) {
      console.warn('respaldos: catálogo sin productos, no se guarda copia.');
      return null;
    }

    const ahora = new Date();
    const id = ahora.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const foto = {};
    for (const parte of PARTES) foto[parte] = catalog[parte] ?? null;

    await redisCmd(['SET', PREFIJO_FOTO + id, JSON.stringify(foto)]);

    const entrada = { id, dia: hoy, fecha: ahora.toISOString(), resumen: resumir(catalog) };
    const nuevo = [entrada, ...indice];

    // Las que sobran se borran de verdad, no solo del índice: una clave
    // huérfana en Redis seguiría ocupando espacio para siempre.
    const sobrantes = nuevo.slice(CUANTAS_GUARDAR);
    await redisCmd(['SET', CLAVE_INDICE, JSON.stringify(nuevo.slice(0, CUANTAS_GUARDAR))]);
    for (const vieja of sobrantes) {
      await redisCmd(['DEL', PREFIJO_FOTO + vieja.id]).catch(() => {});
    }

    return entrada;
  } catch (err) {
    console.error('respaldos: no se pudo guardar la copia:', err?.message);
    return null;
  }
}

export { PARTES };
