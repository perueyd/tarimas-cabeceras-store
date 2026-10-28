// La dirección pública de la tienda, para el lado del servidor.
//
// NO la escribe aquí: la trae de src/data/sitio.js, que es el único sitio
// donde está escrita. Antes estaba copiada en siete archivos (este, el de
// compartir, el del catálogo de anuncios, el del contador de visitas, el que
// le dicta la web al chatbot y tres veces en index.html). El día que se
// cambie de dominio, olvidarse de una copia significa tarjetas de WhatsApp
// que apuntan a una web que ya no existe, y un mapa del sitio que le da a
// Google direcciones muertas — sin que nada dé error.
//
// index.html es la excepción: es HTML estático y no puede leer esto. Por eso
// hay una prueba que comprueba que dice lo mismo (pruebas/marca.test.js).
export { SITIO_URL as SITIO } from '../src/data/sitio.js';
