import { enLima } from './lima.js';

// Plazo para responder un reclamo o una queja del Libro de Reclamaciones.
//
// Antes la tienda decía «30 días calendario». Desde 2022 son 15 DÍAS HÁBILES
// e improrrogables: Ley 31435 (art. 24.1 del Código del Consumidor) y DS
// 101-2022-PCM, arts. 6 y 6-B del Reglamento (texto oficial en El Peruano,
// revisado el 23/11/2026).
export const PLAZO_RECLAMO_DIAS_HABILES = 15;

// Leyendas que el formato oficial (Anexo I) pone al pie de la hoja.
export const LEYENDAS_RECLAMO = [
  'RECLAMO: disconformidad relacionada a los productos o servicios.',
  'QUEJA: disconformidad no relacionada a los productos o servicios; o malestar o descontento respecto a la atención al público.',
  'La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.',
  `El proveedor debe dar respuesta al reclamo o queja en un plazo no mayor a quince (${PLAZO_RECLAMO_DIAS_HABILES}) días hábiles improrrogables.`,
];

const esHabil = (d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6;

/**
 * Días hábiles que quedan para responder (negativo = vencido). Cuenta de lunes
 * a viernes en hora de Lima. NO descuenta feriados: así el aviso del panel
 * llega antes, nunca después, del vencimiento real.
 */
export function diasHabilesRestantes(fechaReclamo, ahora = new Date()) {
  const inicio = enLima(new Date(fechaReclamo));
  const hoy = enLima(ahora);
  if (!inicio || !hoy) return PLAZO_RECLAMO_DIAS_HABILES;
  const dia = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  let usados = 0;
  const cursor = new Date(dia(inicio));
  const fin = dia(hoy);
  // El día en que se presentó no cuenta; desde el siguiente, cada día hábil sí.
  while (cursor.getTime() < fin) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (esHabil(cursor)) usados += 1;
  }
  return PLAZO_RECLAMO_DIAS_HABILES - usados;
}
