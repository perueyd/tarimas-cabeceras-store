// Reiniciar la tienda: dejar en cero todo lo de clientes, guardando una copia.
//
// Para qué sirve: antes de empezar a vender de verdad, el panel está lleno de
// pedidos de prueba, visitas propias y registros de ensayo. El dueño pidió un
// botón que lo deje limpio — y que guarde una copia, por si acaso.
//
//   GET    -> qué hay ahora (para enseñarlo antes de borrar) y las copias guardadas.
//   POST   {confirmar:'REINICIAR'}        -> hace la copia y deja todo en cero.
//   POST   {accion:'restaurar', id}       -> vuelve a como estaba en esa copia.
//   DELETE ?id=…                          -> borra una copia para siempre.
// Todo exige la clave de administrador.
//
// CÓMO SE HACE SIN PERDER NADA: los datos no se borran, se CAMBIAN DE NOMBRE
// (RENAME) a un cajón aparte, "reinicio:<fecha>:…". La tienda deja de verlos,
// así que queda en cero, pero siguen enteros en la base. Restaurar es
// devolverles su nombre. No hay que copiar nada de un lado a otro, así que no
// hay un instante en que el dato exista a medias.
//
// LO QUE ESTE BOTÓN NO TOCA NUNCA, y hay una prueba que lo vigila:
//   · el catálogo (productos, precios, textos, servicios, portafolio, aliados);
//   · los cupones y ofertas (solo se pone a cero cuántas veces se usaron);
//   · el Libro de Reclamaciones y las solicitudes de datos personales, que la
//     ley obliga a conservar (2 años los reclamos).

import { hasDB, redisCmd } from '../_store.js';
import { s } from '../_pricing.js';
import { checkAdminAuth } from '../_auth.js';
import { listPromoCodes, savePromoCodes } from '../_promo.js';

const PREFIJO = 'reinicio:';
const CLAVE_INDICE = 'reinicio:copias';
const CUANTAS_COPIAS = 3;
// Dónde se guardan, dentro de la copia, los usos de los cupones.
const SUFIJO_USOS = '_usos-de-cupones';

// Todo lo que es "de clientes". Cada entrada es un patrón de KEYS: un nombre
// exacto, o un prefijo con "*" cuando hay una clave por día o por producto.
export const SE_REINICIA = [
  { patron: 'pedidos', que: 'pedidos' },
  { patron: 'pedidos:idx', que: 'pedidos' },
  { patron: 'carritos:abandonados', que: 'carritos' },
  { patron: 'visitas:*', que: 'visitas' },
  { patron: 'historial:codigos', que: 'historial' },
  { patron: 'promo:usos', que: 'cupones' },
  { patron: 'reviews:*', que: 'reseñas' },
  { patron: 'newsletter:*', que: 'suscriptores' },
  { patron: 'encuestas', que: 'encuestas' },
  { patron: 'live:registrados', que: 'live' },
  { patron: 'live:vistos:*', que: 'live' },
];

async function clavesDe(patron) {
  const data = await redisCmd(['KEYS', patron]);
  return Array.isArray(data?.result) ? data.result : [];
}

async function leerIndice() {
  const data = await redisCmd(['GET', CLAVE_INDICE]);
  try {
    const lista = JSON.parse(data?.result || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

const largoDeLista = async (clave) => ((await redisCmd(['LRANGE', clave, '0', '-1']))?.result || []).length;

// Cuánto hay de cada cosa, para que el dueño vea qué va a dejar en cero.
async function resumen() {
  const [pedidos, resenas, suscriptores, encuestas, registrados, carritos, visitas] = await Promise.all([
    largoDeLista('pedidos'),
    largoDeLista('reviews:all'),
    largoDeLista('newsletter:list'),
    largoDeLista('encuestas'),
    largoDeLista('live:registrados'),
    redisCmd(['HVALS', 'carritos:abandonados']).then((d) => (d?.result || []).length),
    clavesDe('visitas:*').then((k) => k.length),
  ]);
  return { pedidos, carritos, resenas, suscriptores, encuestas, registrados, diasDeVisitas: visitas };
}

// Las veces que se usó cada cupón viven dentro de la propia lista de cupones.
// Los cupones se quedan; lo que vuelve a cero es su contador (los usos venían
// de los pedidos que se están quitando). Se guardan en la copia para poder
// devolverlos.
async function reiniciarUsosDeCupones(id) {
  const codigos = await listPromoCodes();
  const usos = Object.fromEntries(codigos.filter((c) => c.usados > 0).map((c) => [c.code, c.usados]));

  let ofertas = [];
  try {
    ofertas = JSON.parse((await redisCmd(['GET', 'ofertas:todas']))?.result || '[]');
  } catch {
    ofertas = [];
  }
  const usosDeOfertas = Object.fromEntries(
    (Array.isArray(ofertas) ? ofertas : []).filter((o) => o.usados > 0).map((o) => [o.id, o.usados])
  );

  if (!Object.keys(usos).length && !Object.keys(usosDeOfertas).length) return;
  await redisCmd(['SET', `${PREFIJO}${id}:${SUFIJO_USOS}`, JSON.stringify({ codigos: usos, ofertas: usosDeOfertas })]);
  if (Object.keys(usos).length) await savePromoCodes(codigos.map((c) => ({ ...c, usados: 0 })));
  if (Object.keys(usosDeOfertas).length) {
    await redisCmd(['SET', 'ofertas:todas', JSON.stringify(ofertas.map((o) => ({ ...o, usados: 0 })))]);
  }
}

async function devolverUsosDeCupones(id) {
  const clave = `${PREFIJO}${id}:${SUFIJO_USOS}`;
  const data = await redisCmd(['GET', clave]);
  if (!data?.result) return;
  try {
    const { codigos = {}, ofertas = {} } = JSON.parse(data.result);
    if (Object.keys(codigos).length) {
      const lista = await listPromoCodes();
      await savePromoCodes(lista.map((c) => (codigos[c.code] ? { ...c, usados: codigos[c.code] } : c)));
    }
    if (Object.keys(ofertas).length) {
      const actuales = JSON.parse((await redisCmd(['GET', 'ofertas:todas']))?.result || '[]');
      if (Array.isArray(actuales)) {
        await redisCmd(['SET', 'ofertas:todas', JSON.stringify(actuales.map((o) => (ofertas[o.id] ? { ...o, usados: ofertas[o.id] } : o)))]);
      }
    }
  } catch {
    // Una copia con ese apunte dañado no impide restaurar lo demás.
  }
  await redisCmd(['DEL', clave]);
}

// El nombre de una copia nueva, que NO puede coincidir con el de otra.
//
// RENAME pisa lo que haya en el destino sin avisar. Dos copias hechas en el
// mismo instante (reiniciar y, enseguida, restaurar) compartían nombre, y la
// segunda escribía encima de la primera: se restauraba lo nuevo y lo antiguo
// desaparecía. Lo cazó una prueba antes de publicarse. Ahora el nombre lleva
// los milisegundos y, además, se comprueba que ese cajón esté vacío.
async function idLibre(ahora) {
  const base = ahora.toISOString().replace(/[:.]/g, '-').slice(0, 23);
  const enUso = new Set((await leerIndice()).map((c) => c.id));
  for (let n = 0; ; n += 1) {
    const id = n ? `${base}-${n}` : base;
    if (!enUso.has(id) && (await clavesDe(`${PREFIJO}${id}:*`)).length === 0) return id;
  }
}

// Aparta todo lo de clientes en una copia nueva. Devuelve la copia, o null si
// no había nada que apartar.
async function apartar(motivo) {
  const antes = await resumen();
  const claves = [...new Set((await Promise.all(SE_REINICIA.map((x) => clavesDe(x.patron)))).flat())];

  const ahora = new Date();
  const id = await idLibre(ahora);
  for (const clave of claves) {
    await redisCmd(['RENAME', clave, `${PREFIJO}${id}:${clave}`]);
  }
  await reiniciarUsosDeCupones(id);

  const guardadas = await clavesDe(`${PREFIJO}${id}:*`);
  if (!guardadas.length) return null;

  const copia = { id, fecha: ahora.toISOString(), motivo, claves: guardadas.length, resumen: antes };
  const indice = [copia, ...(await leerIndice())];
  // Las copias que sobran se borran de verdad: son datos personales y no
  // deben quedarse para siempre en un cajón que nadie mira.
  for (const vieja of indice.slice(CUANTAS_COPIAS)) await borrarCopia(vieja.id);
  await redisCmd(['SET', CLAVE_INDICE, JSON.stringify(indice.slice(0, CUANTAS_COPIAS))]);
  return copia;
}

async function borrarCopia(id) {
  for (const clave of await clavesDe(`${PREFIJO}${id}:*`)) await redisCmd(['DEL', clave]);
}

const idValido = (id) => /^[0-9T-]{19,30}$/.test(id);

export default async function handler(req, res) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  if (!hasDB) {
    return res.status(501).json({ error: 'Base de datos no conectada: no hay nada que reiniciar ni dónde guardar la copia.' });
  }

  if (req.method === 'GET') {
    return res.status(200).json({ ahora: await resumen(), copias: await leerIndice() });
  }

  if (req.method === 'POST' && s(req.body?.accion, 20) === 'restaurar') {
    const id = s(req.body?.id, 30);
    const indice = await leerIndice();
    if (!idValido(id) || !indice.some((c) => c.id === id)) {
      return res.status(404).json({ error: 'Esa copia ya no existe.' });
    }
    const guardadas = await clavesDe(`${PREFIJO}${id}:*`);
    // Lo que haya AHORA en la tienda tampoco se pierde: se aparta en su
    // propia copia antes de devolver la antigua. Restaurar es intercambiar.
    const deAhora = await apartar('Lo que había antes de restaurar una copia');
    for (const guardada of guardadas) {
      const original = guardada.slice(`${PREFIJO}${id}:`.length);
      if (original === SUFIJO_USOS) continue;
      await redisCmd(['RENAME', guardada, original]);
    }
    await devolverUsosDeCupones(id);
    const queda = (await leerIndice()).filter((c) => c.id !== id);
    await redisCmd(['SET', CLAVE_INDICE, JSON.stringify(queda)]);
    return res.status(200).json({ ok: true, restaurada: id, apartada: deAhora?.id || null, ahora: await resumen(), copias: queda });
  }

  if (req.method === 'POST') {
    // La palabra escrita a mano: que un toque de más en el celular no pueda
    // dejar el panel en cero.
    if (s(req.body?.confirmar, 20) !== 'REINICIAR') {
      return res.status(400).json({ error: 'Para reiniciar escribe la palabra REINICIAR.' });
    }
    const copia = await apartar('Reinicio desde el panel');
    if (!copia) return res.status(200).json({ ok: true, copia: null, mensaje: 'No había nada que reiniciar.', ahora: await resumen(), copias: await leerIndice() });
    return res.status(200).json({ ok: true, copia, ahora: await resumen(), copias: await leerIndice() });
  }

  if (req.method === 'DELETE') {
    const id = s(req.query.id, 30);
    if (!idValido(id)) return res.status(400).json({ error: 'Falta la copia a borrar.' });
    await borrarCopia(id);
    const queda = (await leerIndice()).filter((c) => c.id !== id);
    await redisCmd(['SET', CLAVE_INDICE, JSON.stringify(queda)]);
    return res.status(200).json({ ok: true, copias: queda });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
