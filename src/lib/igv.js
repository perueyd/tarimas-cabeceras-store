// Separar el IGV de un precio que YA lo incluye.
//
// Vive aquí, y no en api/, porque lo necesitan los dos lados: el servidor para
// guardar el desglose de cada pedido, y el panel para enseñarlo sin volver a
// pedirlo. Si cada uno tuviera su copia, el día que cambie la tasa una de las
// dos se quedaría vieja — y entonces la pantalla y la declaración dirían
// cosas distintas.
//
// EL ERROR QUE EVITA: el IGV de un precio que ya lo incluye NO es el 18% del
// total. Si la cabecera cuesta S/ 310 con IGV, el IGV es S/ 47.29, no S/ 55.80.
export const TASA_IGV = 0.18; // incluye el Impuesto de Promoción Municipal

export function separarIGV(totalConIgv) {
  const total = Math.round((Number(totalConIgv) || 0) * 100) / 100;
  if (total <= 0) return { base: 0, igv: 0, total: 0 };
  const base = Math.round((total / (1 + TASA_IGV)) * 100) / 100;
  // El IGV se saca por diferencia, no calculando el 18% de la base: así los
  // céntimos del redondeo nunca hacen que base + igv deje de dar el total.
  const igv = Math.round((total - base) * 100) / 100;
  return { base, igv, total };
}

export function agregarIGV(base) {
  const b = Math.round((Number(base) || 0) * 100) / 100;
  const igv = Math.round(b * TASA_IGV * 100) / 100;
  return { base: b, igv, total: Math.round((b + igv) * 100) / 100 };
}
