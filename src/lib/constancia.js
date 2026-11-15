// La constancia de pedido: el documento propio de la tienda.
//
// La tienda NO emite boletas ni facturas (eso lo hace el facturador, aparte).
// Lo que sí da es una constancia: qué se pidió, cuánto se pagó y en qué estado
// está. El dueño usa las dos cosas: la constancia de la página y el
// comprobante electrónico del facturador.
//
// LO QUE NO SE PUEDE ROMPER: la constancia nunca puede pasar por un
// comprobante de pago. Entregar en su lugar un documento "no previsto como
// comprobante de pago" es una infracción (Código Tributario, art. 174 num. 1;
// fuente: tabla de infracciones de SUNAT, consultada el 14/11/2026). Por eso:
//   · no se llama boleta, factura ni comprobante;
//   · no lleva serie ni correlativo propios, solo el código del pedido;
//   · lleva SIEMPRE, bien visible, la leyenda de abajo.
export const TITULO_CONSTANCIA = 'Constancia de pedido';

export const LEYENDA_CONSTANCIA =
  'Este documento NO es un comprobante de pago y no tiene valor tributario. Es la constancia de tu pedido en nuestra tienda. La boleta o factura electrónica se emite por separado.';

// El número de un comprobante electrónico tal como se anota en el pedido:
// "B001-123" -> "B001-00000123". Devuelve '' si viene vacío (se borra) y
// false si lo escrito no tiene forma de serie y número.
export function numeroDeComprobante(valor) {
  const texto = String(valor ?? '').trim().toUpperCase().replace(/\s+/g, '');
  if (!texto) return '';
  const m = /^([A-Z0-9]{4})-?(\d{1,8})$/.exec(texto);
  if (!m) return false;
  return `${m[1]}-${m[2].padStart(8, '0')}`;
}

// La dirección de la constancia pública de un pedido.
export function rutaDeConstancia(codigo) {
  return `/constancia?codigo=${encodeURIComponent(codigo)}`;
}
