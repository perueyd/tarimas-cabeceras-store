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
 * Los horarios que se le pueden ofrecer al cliente para la fecha que eligió.
 *
 * LA REGLA, tal como funciona el taller: el pedido que entra hasta las 8 de la
 * mañana lo fabrican ese día y se lo entregan al dueño A LAS 5 DE LA TARDE.
 * Recién entonces él sale a repartir. Así que para HOY MISMO no hay elección:
 * solo caben los horarios de las 5 en adelante.
 *
 * Para cualquier OTRO día el mueble ya está hecho desde la víspera, así que el
 * cliente elige la hora que quiera — mañana, tarde o noche.
 *
 * Antes se filtraba siempre, cualquier fecha, y eso le quitaba al cliente las
 * entregas de mañana y tarde de los días siguientes sin motivo.
 *
 * Si para hoy no cuadra ningún horario —porque todavía no se han puesto en el
 * panel— se devuelven todos: mejor una hora a coordinar que dejar al cliente
 * sin poder comprar.
 */
export function horariosDeReparto(slots = [], fechaElegida = '', ahora = new Date()) {
  // Solo el mismo día está limitado. Sin fecha elegida todavía, se muestran
  // todos: el cliente aún no ha dicho para cuándo lo quiere.
  if (!fechaElegida || fechaElegida !== diaEnLima(ahora)) return slots;

  const tarde = slots.filter((s) => horaDeInicio(s?.label) >= HORA_DESDE);
  return tarde.length ? tarde : slots;
}

/** La hora a la que empieza un horario escrito como "Noche (6:00 p.m. – ...)". */
function horaDeInicio(label) {
  const m = String(label || '').match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m|p\.?\s*m)/i);
  if (!m) return -1;
  const hora = Number(m[1]) % 12;
  return /p/i.test(m[3]) ? hora + 12 : hora;
}

/** El día de hoy en Lima, como "2026-11-07". */
function diaEnLima(ahora) {
  return enLima(ahora)?.toISOString().slice(0, 10) ?? '';
}
