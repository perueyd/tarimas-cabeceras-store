import { enLima } from './lima.js';

// Cuándo se puede entregar un pedido.
//
// La regla del negocio, en palabras del dueño: la entrega es de un día para
// otro. Si el cliente pide HASTA LAS 8 DE LA MAÑANA, se le puede entregar ESE
// MISMO DÍA a partir de las 5 de la tarde. Si pide después de las 8, pasa al
// día siguiente con la misma regla.
//
// Vive en su propio archivo y no dentro del checkout porque es una promesa al
// cliente, no un detalle de una pantalla: la fecha que se le ofrece al comprar
// tiene que ser la misma que luego se le dice por WhatsApp y la misma que ve
// el dueño en el panel. Cuando una regla así está escrita en un solo sitio no
// puede desviarse entre pantallas.
//
// Todo se calcula en hora de LIMA, no en la del navegador: un cliente que
// compra desde el extranjero —o con el reloj del teléfono mal puesto— tiene
// que recibir la misma fecha que uno de Lima, porque quien fabrica y reparte
// está en Lima.

/** Hasta esta hora (inclusive) el pedido todavía entra para hoy. */
export const HORA_CORTE = 8;

/** Antes de esta hora no se reparte. */
export const HORA_DESDE = 17;

/**
 * El primer día en que se puede entregar, como "2026-10-29".
 * @param {Date} ahora  momento de la compra (por defecto, ahora mismo)
 */
export function primerDiaDeEntrega(ahora = new Date()) {
  const lima = enLima(ahora);
  if (!lima) return null;

  // getUTC* porque `enLima` ya devuelve el instante corrido a hora de Lima:
  // leerlo con getHours() volvería a aplicar la zona del navegador encima.
  const minutos = lima.getUTCHours() * 60 + lima.getUTCMinutes();
  const paraHoy = minutos <= HORA_CORTE * 60;

  const dia = new Date(lima.getTime());
  if (!paraHoy) dia.setUTCDate(dia.getUTCDate() + 1);
  return dia.toISOString().slice(0, 10);
}

/**
 * Si el pedido hecho en este momento alcanza para entregarse hoy mismo.
 * Sirve para decírselo al cliente mientras decide ("pídelo antes de las 8").
 */
export function alcanzaParaHoy(ahora = new Date()) {
  const lima = enLima(ahora);
  if (!lima) return false;
  return lima.getUTCHours() * 60 + lima.getUTCMinutes() <= HORA_CORTE * 60;
}

/**
 * De los horarios que el dueño tenga configurados, los que empiezan a las 5
 * de la tarde o después.
 *
 * Si ninguno cumple —porque todavía no los ha actualizado en el panel— se
 * devuelven todos: es preferible ofrecer un horario que quizá haya que
 * coordinar a dejar al cliente sin poder elegir ninguno y sin poder comprar.
 */
export function horariosDeReparto(slots = []) {
  const tarde = slots.filter((s) => {
    const m = String(s?.label || '').match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m|p\.?\s*m)/i);
    if (!m) return false;
    let hora = Number(m[1]) % 12;
    if (/p/i.test(m[3])) hora += 12;
    return hora >= HORA_DESDE;
  });
  return tarde.length ? tarde : slots;
}
