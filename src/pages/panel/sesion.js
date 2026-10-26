// La clave del panel: dónde se guarda y cuánto dura.
//
// Vive en sessionStorage y no en localStorage, y caduca a las 8 horas: así una
// sesión olvidada en una computadora compartida no deja el negocio abierto
// para siempre.

// La clave de administrador se guarda en sessionStorage (no en localStorage) y
// con fecha de caducidad. Motivo: la clave es la credencial completa del panel.
// En localStorage quedaba guardada para siempre, así que en una computadora
// compartida o prestada el siguiente que abriera /pedidos entraba directo. En
// sessionStorage se borra al cerrar la pestaña, y además caduca a las 8 horas.
export const CLAVE_STORAGE = 'ed-orders-key';
export const CLAVE_HORAS = 8;

export function leerClaveGuardada() {
  try {
    // Limpieza de la versión anterior, que guardaba la clave sin caducidad.
    localStorage.removeItem(CLAVE_STORAGE);
    const raw = sessionStorage.getItem(CLAVE_STORAGE);
    if (!raw) return '';
    const { key, exp } = JSON.parse(raw);
    if (!key || !exp || Date.now() > exp) {
      sessionStorage.removeItem(CLAVE_STORAGE);
      return '';
    }
    return key;
  } catch {
    return '';
  }
}

export function guardarClave(key) {
  try {
    sessionStorage.setItem(
      CLAVE_STORAGE,
      JSON.stringify({ key, exp: Date.now() + CLAVE_HORAS * 3600 * 1000 })
    );
  } catch {
    // Si el navegador bloquea el almacenamiento, el panel sigue funcionando
    // en esta pantalla; solo habrá que reingresar la clave al recargar.
  }
}
