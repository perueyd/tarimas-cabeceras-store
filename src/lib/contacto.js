// El correo de ventas corporativas (empresas, compras por volumen, con
// factura). Pedido del dueño, 22/11/2026: corporacionagamenon@gmail.com.
//
// Lo usan el pie de página, el pago (cuando piden factura), CHAT-ED y los
// datos que lee Google, así que vive en un solo sitio. Se edita en el panel →
// Branding → Contacto; si queda vacío o mal escrito, no se muestra en ninguna
// parte (un enlace roto de correo es peor que no tenerlo).

const FORMA_DE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function correoCorporativo(storeConfig = {}) {
  const correo = String(storeConfig?.contacto?.correoCorporativo || '').trim().toLowerCase();
  return FORMA_DE_CORREO.test(correo) ? correo : '';
}

/** Enlace que abre el correo del cliente con el asunto ya escrito. */
export function enlaceCorreoCorporativo(correo) {
  return `mailto:${correo}?subject=${encodeURIComponent('Ventas corporativas')}`;
}
