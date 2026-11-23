// La «Política de cambios y devoluciones» que piden las pasarelas de pago
// (requisitos de URL de Culqi) y el Código del Consumidor.
//
// No es un texto nuevo: son las secciones de devolución y garantía de los
// Términos y Condiciones que el dueño ya publicó. Así no hay dos textos que
// puedan contradecirse: si cambia los Términos, esta página cambia con ellos.

const TITULO_DE_SECCION = /^\d+\.\s+[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ ,()-]+$/;
const ES_DE_DEVOLUCION = /DEVOL|CAMBIO|GARANT/;

/** Las secciones de los Términos que tratan de cambios, devoluciones y garantía. */
export function seccionesDeDevolucion(terminos = '') {
  const secciones = [];
  let actual = null;
  for (const linea of String(terminos).split('\n')) {
    if (TITULO_DE_SECCION.test(linea.trim())) {
      actual = { titulo: linea.trim().replace(/^\d+\.\s+/, ''), lineas: [] };
      secciones.push(actual);
    } else if (actual) {
      actual.lineas.push(linea);
    }
  }
  return secciones
    .filter((s) => ES_DE_DEVOLUCION.test(s.titulo))
    .map((s) => ({ titulo: s.titulo, texto: s.lineas.join('\n').trim() }))
    .filter((s) => s.texto);
}
