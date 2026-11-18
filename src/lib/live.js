// Reglas del registro del live que comparten la página y el servidor.
//
// La página las usa para avisar al momento ("ese número no parece un
// celular") y el servidor las vuelve a aplicar antes de guardar: lo que llega
// del navegador nunca se cree sin comprobar.

// Un celular peruano: 9 dígitos y empieza por 9. Se acepta escrito con
// espacios, guiones o con el +51 delante, que es como la gente lo copia de
// WhatsApp. Devuelve los 9 dígitos, o '' si no es un celular.
export function normalizarWhatsApp(valor) {
  let digitos = String(valor ?? '').replace(/\D/g, '');
  if (digitos.length === 11 && digitos.startsWith('51')) digitos = digitos.slice(2);
  return /^9\d{8}$/.test(digitos) ? digitos : '';
}

// El nombre tal como se guarda: sin espacios de más y sin caracteres que no
// son de un nombre. No se exige apellido: es un registro rápido en mitad de
// una transmisión, y cada campo de más es gente que no termina.
export function normalizarNombre(valor) {
  return String(valor ?? '')
    .replace(/[^\p{L}\p{M}' .-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

// Lo que el menú de la tienda necesita saber del live: si está encendido
// («🔴 En vivo») o si el dueño escribió cuándo es el próximo («Live»). Viaja
// dentro del catálogo, que descarga cualquiera, así que son solo dos sí/no
// armados a mano: el código de descuento NUNCA puede salir por aquí (el
// registro dejaría de hacer falta).
export function liveParaElMenu(config) {
  return {
    enVivo: config?.activo === true,
    anunciado: typeof config?.proximo === 'string' && config.proximo.trim() !== '',
  };
}

// "15% de descuento" o "S/ 50 de descuento": lo que da el cupón, dicho como
// lo diría el dueño en el live.
export function textoDeOferta(promo) {
  const valor = Number(promo?.valor) || 0;
  if (!(valor > 0)) return '';
  if (promo.tipo === 'monto') return `S/ ${Number.isInteger(valor) ? valor : valor.toFixed(2)} de descuento`;
  return `${valor}% de descuento`;
}

// "2026-11-13" -> "13/11/2026", para leerlo como se escribe en Perú.
export function fechaCorta(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

// El código del live viaja de la página del live al pago por la memoria de la
// pestaña: así el cliente lo encuentra ya escrito y no tiene que apuntarlo en
// mitad de la transmisión. Se borra al cerrar la pestaña.
const CLAVE_CODIGO = 'ed-codigo-live';

export function recordarCodigoDelLive(codigo) {
  try {
    sessionStorage.setItem(CLAVE_CODIGO, String(codigo || ''));
  } catch {
    // Navegador con el almacenamiento bloqueado: el cliente lo escribe a mano.
  }
}

export function codigoDelLive() {
  try {
    return sessionStorage.getItem(CLAVE_CODIGO) || '';
  } catch {
    return '';
  }
}
