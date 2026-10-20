// ¿Ya venció una oferta? La respuesta tiene que ser LA MISMA en el servidor y
// en el navegador, y por eso vive aquí sola.
//
// El problema que resuelve: una oferta vence "el 1 de agosto", y eso significa
// el final del 1 de agosto EN PERÚ. Pero `new Date('2026-08-01T23:59:59')` sin
// decir la zona se interpreta en la zona de quien ejecute el código:
//
//   · el servidor de Vercel corre en UTC  -> la oferta moría a las 19:00 de Lima
//   · el navegador usa la hora del cliente -> un comprador en España veía otra cosa
//
// Cuando las dos respuestas no coinciden pasa esto: la pantalla muestra el
// precio rebajado, el servidor calcula el precio sin rebaja, y la compra se
// rechaza con "el precio cambió mientras completabas la compra". El cliente no
// entiende nada y se va.
//
// Con el "-05:00" explícito, el corte es el mismo para todos: la medianoche de
// Lima. Perú no cambia de hora, así que el desfase es siempre ese.
const OFFSET_LIMA = '-05:00';

export function vencida(fechaISO) {
  if (!fechaISO) return false;
  const fin = new Date(`${fechaISO}T23:59:59${OFFSET_LIMA}`);
  if (Number.isNaN(fin.getTime())) return false; // fecha rara: no se bloquea la oferta
  return fin.getTime() < Date.now();
}
