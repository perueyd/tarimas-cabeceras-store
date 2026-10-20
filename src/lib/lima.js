// La hora de Perú, en un solo sitio.
//
// POR QUÉ EXISTE: Vercel corre en UTC y Lima va cinco horas por detrás. Esa
// diferencia ya rompió cosas dos veces:
//
//   · Las ofertas morían a las 7 de la tarde el último día, mientras el
//     navegador del cliente seguía mostrando el descuento. Cinco horas con un
//     precio en pantalla y el cobro rechazándose.
//   · Lo vendido después de las 7 pm del último día del mes se contaba en el
//     mes siguiente, y la declaración no cuadraba con las ventas reales.
//
// Cuando se arregló, la cuenta acabó copiada en cuatro archivos. Cuatro copias
// son cuatro sitios donde equivocarse, y basta que una se quede atrás para que
// los números dejen de cuadrar entre pantallas sin que nadie sepa por qué.
//
// Perú no cambia de hora, así que el desfase es siempre el mismo.
export const MINUTOS_DETRAS_DE_UTC = 5 * 60;
const MS_LIMA = -MINUTOS_DETRAS_DE_UTC * 60 * 1000;

/** El mismo instante, corrido a la hora de Lima. Para cortar por día o mes. */
export function enLima(fecha = new Date()) {
  const f = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(f.getTime())) return null;
  return new Date(f.getTime() + MS_LIMA);
}

/** El día en Lima, como "2026-10-20". */
export function diaLima(fecha = new Date()) {
  return enLima(fecha)?.toISOString().slice(0, 10) ?? null;
}

/** El mes en Lima, como "2026-10". */
export function mesLima(fecha = new Date()) {
  return enLima(fecha)?.toISOString().slice(0, 7) ?? null;
}

/** El año en Lima, como "2026". */
export function anioLima(fecha = new Date()) {
  return enLima(fecha)?.toISOString().slice(0, 4) ?? null;
}

/**
 * Una fecha y hora escritas para una persona en Perú.
 * Usa la zona horaria de verdad, no el desfase a mano: así el navegador
 * escribe el mes y el formato como se espera aquí.
 */
export function textoLima(iso, opciones = {}) {
  try {
    return new Date(iso).toLocaleString('es-PE', { timeZone: 'America/Lima', ...opciones });
  } catch {
    return String(iso ?? '');
  }
}
