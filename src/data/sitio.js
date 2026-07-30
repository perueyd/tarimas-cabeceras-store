// Dirección pública de la tienda, en UN solo sitio.
//
// Estaba escrita a mano en varios archivos con el dominio antiguo
// (tarimas-cabeceras-store.vercel.app), que hoy solo redirige. Eso hacía que
// los enlaces de seguimiento enviados por WhatsApp y las vistas previas al
// compartir la web apuntaran al sitio viejo.
//
// Si algún día contratas un dominio propio (p. ej. eydperu.com), cambia solo
// esta línea — y la de <index.html>, que es HTML estático y no puede leer esto.
export const SITIO_URL = 'https://eydperu.vercel.app';

export function urlSeguimiento(codigo) {
  return `${SITIO_URL}/seguimiento?codigo=${encodeURIComponent(codigo)}`;
}
