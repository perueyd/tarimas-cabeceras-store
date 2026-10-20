// Validar el DNI o el RUC que el cliente escribe al comprar.
//
// POR QUÉ IMPORTA: con estos datos se emite la boleta o la factura. Un dígito
// mal y el comprobante sale a nombre de otra persona o directamente lo rechaza
// la SUNAT — y para entonces el mueble ya se entregó. Es mucho más barato
// cazar el error mientras el cliente todavía está en la pantalla.
//
// Vive en src/lib para que lo usen los dos lados: el navegador avisa al
// instante, y el servidor vuelve a comprobarlo porque nada que venga del
// navegador se cree sin revisar.

/** DNI peruano: 8 dígitos. No tiene dígito verificador que se pueda comprobar. */
export function dniValido(valor) {
  return /^\d{8}$/.test(String(valor || '').trim());
}

// Los dos primeros dígitos del RUC dicen qué tipo de contribuyente es:
//   10 = persona natural con negocio   ·   15 y 17 = casos especiales
//   20 = persona jurídica (empresa)
// Cualquier otro inicio es un número inventado.
const INICIOS_RUC = ['10', '15', '17', '20'];

/**
 * RUC peruano: 11 dígitos, y el último es un dígito verificador que se calcula
 * a partir de los otros diez. Comprobarlo detecta la mayoría de los errores de
 * tecleo sin preguntarle nada a nadie.
 */
export function rucValido(valor) {
  const ruc = String(valor || '').trim();
  if (!/^\d{11}$/.test(ruc)) return false;
  if (!INICIOS_RUC.includes(ruc.slice(0, 2))) return false;

  // Cada posición pesa distinto; se suman los productos y el verificador es
  // lo que falta para llegar al siguiente múltiplo de 11.
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((total, peso, i) => total + peso * Number(ruc[i]), 0);
  const resto = 11 - (suma % 11);
  const esperado = resto === 10 ? 0 : resto === 11 ? 1 : resto;
  return esperado === Number(ruc[10]);
}

/**
 * Revisa los datos del comprobante y devuelve el primer problema encontrado,
 * o null si está todo bien. El mensaje se le enseña tal cual al cliente, así
 * que dice qué hacer, no qué falló.
 */
export function revisarComprobante({ tipo, numero, razonSocial } = {}) {
  if (tipo === 'factura') {
    if (!rucValido(numero)) {
      return 'El RUC debe tener 11 dígitos y empezar en 10, 15, 17 o 20. Revisa que no falte ninguno.';
    }
    if (!String(razonSocial || '').trim()) {
      return 'Escribe la razón social o el nombre de la empresa, tal como figura en la SUNAT.';
    }
    return null;
  }
  // Por defecto, boleta.
  if (!dniValido(numero)) return 'El DNI debe tener 8 dígitos.';
  return null;
}

/** Texto corto para enseñar el documento en el panel y en los correos. */
export function etiquetaComprobante({ tipo, numero, razonSocial } = {}) {
  if (!numero) return '';
  return tipo === 'factura'
    ? `Factura · RUC ${numero}${razonSocial ? ` · ${razonSocial}` : ''}`
    : `Boleta · DNI ${numero}`;
}
