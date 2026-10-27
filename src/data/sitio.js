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

/**
 * La ficha de un producto, abierta ya en su formulario de opinión.
 *
 * Es para pedírsela al cliente por WhatsApp cuando recibió su mueble. Lleva
 * ancla (#opiniones) a propósito: si cae arriba del todo, tiene que pasar las
 * fotos, el configurador y las especificaciones antes de encontrar dónde
 * opinar, y por el camino la mitad se va.
 */
export function urlOpinion(productId) {
  return `${SITIO_URL}/producto/${encodeURIComponent(productId)}#opiniones`;
}

// El nombre de la marca, en UN solo sitio.
//
// POR QUÉ: estaba escrito a mano en el título de cada página, en la etiqueta
// que lee Google, en el vendedor de los datos estructurados y en index.html.
// Al cambiar de nombre la tienda, cualquiera de esas copias que se
// olvidara seguiría enseñando el nombre viejo en los resultados de Google
// durante meses, que es justo donde menos se mira y más se nota.
//
// El nombre LEGAL es otra cosa y no se toca aquí: la razón social y el RUC que
// exige la Ley 29571 salen de lo que esté guardado en el panel, tal como
// figura en SUNAT (CORPORACIÓN AGAMENON S.A.C., sin tilde). Este de aquí es el
// nombre comercial, el que ve el cliente.
export const NOMBRE_TIENDA = 'Corporación Agamenón';

/**
 * Si el logotipo guardado en el panel es la dirección de una imagen (como
 * "/logo.svg") en vez de unas letras (como el antiguo "E|D").
 *
 * Existe para que el panel siga mandando sobre el logotipo: el campo acepta
 * las dos cosas y la cabecera dibuja la que toque. Sin esto habría que elegir
 * entre dejar el logotipo fijo en el código —y un campo del panel que no hace
 * nada, de los que ya hubo trece en este proyecto— o perder el texto.
 */
export function logoEsImagen(logo) {
  return typeof logo === 'string' && /^(\/|https?:\/\/).+\.(svg|png|jpe?g|webp)$/i.test(logo.trim());
}
