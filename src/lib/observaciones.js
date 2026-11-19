// Las observaciones que el cliente escribe al comprar («llamar antes de
// llegar», «dejarlo con el portero», una duda sobre el color…). Pedido del
// dueño, 19/11/2026: antes no había dónde ponerlas y llegaban sueltas por
// WhatsApp, separadas del pedido.
//
// La usan el pago (para el tope de letras) y el servidor (para limpiarlas
// antes de guardar): lo que llega del navegador nunca se guarda sin revisar.

export const MAX_OBSERVACIONES = 500;

/** Texto limpio: sin caracteres de control (sí con saltos de línea), sin espacios de más y con tope. */
export function limpiarObservaciones(valor) {
  // Solo texto: un objeto llegaría como «[object Object]».
  return (typeof valor === 'string' ? valor : '')
    .replace(/[^\S\n]+/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_OBSERVACIONES);
}
