// Llaves de PRUEBA de Culqi (pk_test_… / sk_test_…).
//
// Con llaves de prueba Culqi aprueba tarjetas de mentira y no cobra nada. Si
// esas llaves llegaran a la tienda publicada, un cliente real podría «pagar»
// con una tarjeta de prueba y el pedido quedaría como PAGADO sin que entre un
// sol: el dueño fabricaría y entregaría un mueble gratis. Por eso:
//   · en la tienda publicada (VERCEL_ENV = production) el servidor se niega a
//     cobrar con una llave de prueba;
//   · en las versiones de prueba (Preview) el pedido se marca «prueba» y el
//     pago muestra un aviso, para que nadie lo confunda con una venta.

export const esLlaveDePrueba = (llave) => /^(pk|sk)_test_/.test(String(llave || '').trim());

/** null si se puede cobrar; si no, el motivo en palabras. */
export function motivoParaNoCobrar(llaveSecreta, entorno) {
  if (entorno === 'production' && esLlaveDePrueba(llaveSecreta)) {
    return 'La tienda publicada tiene puesta una llave de PRUEBA de Culqi: no se puede cobrar con ella. Usa otro método de pago.';
  }
  return null;
}
