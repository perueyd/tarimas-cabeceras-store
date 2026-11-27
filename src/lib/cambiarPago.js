// «Cambiar forma de pago» después de generar un código CIP o elegir Cuotéalo
// (pedido del dueño, 27/11/2026: desde /gracias no se podía volver atrás).
//
// Al registrar el pedido se vacía el carrito. Para que el cliente pueda volver
// al pago sin escribir todo de nuevo, se guarda una copia del carrito y del
// formulario en sessionStorage: vive solo en esa pestaña y se borra al
// cerrarla, así los datos personales no se quedan en el navegador.

const CLAVE = 'cambio-de-pago';

/** Guarda lo necesario para volver al pago con lo mismo. */
export function guardarParaCambiar(datos) {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch {
    // Sin sessionStorage (modo privado antiguo): el botón no se ofrecerá.
  }
}

/** La copia guardada, o null. */
export function leerParaCambiar() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE) || 'null');
  } catch {
    return null;
  }
}

export function borrarParaCambiar() {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {
    // nada que borrar
  }
}
