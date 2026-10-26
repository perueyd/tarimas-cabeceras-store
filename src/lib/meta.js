import { useEffect } from 'react';
import { NOMBRE_TIENDA } from '../data/sitio.js';

// Título, descripción y datos estructurados de cada página.
//
// POR QUÉ: la tienda es una sola página que se arma en el navegador, así que
// TODAS las direcciones compartían el mismo título — "Espacios y Diseño —
// Tarimas, Cabeceras y Muebles". En Google, en los marcadores y en las
// pestañas, la ficha de la MILÁN y el Libro de Reclamaciones se veían igual.
//
// Los datos estructurados (schema.org) son la otra mitad: le dicen a Google
// "esto es un producto, cuesta S/ 310, está disponible". Con eso puede mostrar
// el precio y las estrellas directamente en los resultados de búsqueda, en vez
// de un enlace azul sin más.
//
// Se hace a mano, sin librerías: son treinta líneas y una dependencia menos
// que mantener.

const TITULO_BASE = NOMBRE_TIENDA;
// El de index.html: a lo que se vuelve al salir de una página con título propio.
// Tiene que decir LO MISMO que la etiqueta <title> de index.html, o al salir de
// la ficha de un producto la pestaña cambiaría a un nombre distinto del que el
// navegador guardó al abrir la web.
const TITULO_POR_DEFECTO = `${NOMBRE_TIENDA} — Tarimas, Cabeceras y Muebles`;
const ID_DATOS = 'datos-estructurados';

function ponerMeta(nombre, contenido, porPropiedad = false) {
  if (!contenido) return;
  const attr = porPropiedad ? 'property' : 'name';
  let etiqueta = document.head.querySelector(`meta[${attr}="${nombre}"]`);
  if (!etiqueta) {
    etiqueta = document.createElement('meta');
    etiqueta.setAttribute(attr, nombre);
    document.head.appendChild(etiqueta);
  }
  etiqueta.setAttribute('content', contenido);
}

function ponerCanonica(url) {
  let etiqueta = document.head.querySelector('link[rel="canonical"]');
  if (!etiqueta) {
    etiqueta = document.createElement('link');
    etiqueta.setAttribute('rel', 'canonical');
    document.head.appendChild(etiqueta);
  }
  etiqueta.setAttribute('href', url);
}

/**
 * Pone el título, la descripción y (si se le pasan) los datos estructurados
 * de la página actual. Al salir de la página se limpian los datos
 * estructurados, para que la ficha de un producto no se quede pegada a la
 * siguiente página que se visite.
 */
// Se llama useMeta y no usarMeta porque React exige que los ganchos empiecen
// por "use": es como los reconoce su revisor, y el resto del proyecto ya sigue
// esa convención (useCatalog, useReordenar).
export function useMeta({ titulo, descripcion, imagen, datos } = {}) {
  // `datos` es un objeto nuevo en cada render, así que compararlo por
  // identidad haría que este efecto se repitiera sin parar. Se compara por
  // contenido.
  const datosTexto = datos ? JSON.stringify(datos) : '';

  useEffect(() => {
    if (titulo) {
      const completo = titulo.includes(TITULO_BASE) ? titulo : `${titulo} — ${TITULO_BASE}`;
      document.title = completo;
      ponerMeta('og:title', completo, true);
      ponerMeta('twitter:title', completo);
    }
    if (descripcion) {
      ponerMeta('description', descripcion);
      ponerMeta('og:description', descripcion, true);
      ponerMeta('twitter:description', descripcion);
    }
    if (imagen) {
      const absoluta = imagen.startsWith('http') ? imagen : window.location.origin + imagen;
      ponerMeta('og:image', absoluta, true);
      ponerMeta('twitter:image', absoluta);
    }
    ponerMeta('og:url', window.location.href, true);
    // Sin canónica, "?categoria=cabeceras" y "?plaza=queen" se ven en Google
    // como páginas distintas con el mismo contenido, y se reparten el peso.
    ponerCanonica(window.location.origin + window.location.pathname);

    if (datosTexto) {
      let script = document.getElementById(ID_DATOS);
      if (!script) {
        script = document.createElement('script');
        script.id = ID_DATOS;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = datosTexto;
    }

    return () => {
      document.getElementById(ID_DATOS)?.remove();
      // Y se devuelve el título al de la tienda.
      //
      // Sin esto, el título de la última página visitada se quedaba pegado a
      // todas las siguientes: alguien que miraba una cabecera y luego abría el
      // Libro de Reclamaciones veía "MILÁN — desde S/ 220" en la pestaña, y si
      // lo guardaba en marcadores se le guardaba con ese nombre. Las páginas
      // que ponen su propio título lo sobrescriben enseguida, así que esto solo
      // actúa en las que no lo hacen.
      if (titulo) document.title = TITULO_POR_DEFECTO;
    };
  }, [titulo, descripcion, imagen, datosTexto]);
}

/**
 * Datos estructurados de un producto, para que Google pueda enseñar el precio
 * en los resultados.
 *
 * `opiniones` solo se incluye si hay reseñas REALES. Inventar una valoración
 * media es engañar al buscador y al cliente, y en Perú además es publicidad
 * engañosa (Ley 29571).
 */
export function datosDeProducto({ producto, precios, imagen, storeConfig, opiniones = [] }) {
  if (!producto) return null;

  const validos = precios.filter((p) => p.precio > 0);
  if (!validos.length) return null;

  const url = window.location.origin + window.location.pathname;
  const imagenAbsoluta = imagen
    ? imagen.startsWith('http')
      ? imagen
      : window.location.origin + imagen
    : undefined;

  const datos = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.name,
    description: producto.shortDescription || undefined,
    image: imagenAbsoluta ? [imagenAbsoluta] : undefined,
    brand: { '@type': 'Brand', name: TITULO_BASE },
    // Un mueble a medida se fabrica por pedido: cada combinación de tamaño es
    // una oferta distinta, con su propio precio.
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'PEN',
      lowPrice: Math.min(...validos.map((p) => p.precio)),
      highPrice: Math.max(...validos.map((p) => p.precio)),
      offerCount: validos.length,
      availability: 'https://schema.org/InStock',
      url,
      seller: {
        '@type': 'Organization',
        name: storeConfig?.razonSocial || TITULO_BASE,
      },
    },
  };

  const conEstrellas = opiniones.filter((o) => Number(o.estrellas) > 0);
  if (conEstrellas.length) {
    const suma = conEstrellas.reduce((n, o) => n + Number(o.estrellas), 0);
    datos.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round((suma / conEstrellas.length) * 10) / 10,
      reviewCount: conEstrellas.length,
    };
  }

  return datos;
}

/**
 * Datos estructurados del negocio, para la portada. Es lo que alimenta la
 * ficha lateral de Google con la dirección y el teléfono.
 *
 * Todo sale de los datos reales que el dueño ya tiene publicados por
 * obligación legal: nada inventado.
 */
export function datosDelNegocio(storeConfig = {}) {
  const telefono = String(storeConfig.whatsapp || '').replace(/\D/g, '');

  return {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    name: TITULO_BASE,
    legalName: storeConfig.razonSocial || undefined,
    taxID: storeConfig.ruc || undefined,
    url: window.location.origin,
    image: window.location.origin + '/og-image.png',
    telephone: telefono ? `+${telefono}` : undefined,
    address: storeConfig.direccionFiscal
      ? {
          '@type': 'PostalAddress',
          streetAddress: storeConfig.direccionFiscal,
          addressLocality: 'Lima',
          addressCountry: 'PE',
        }
      : undefined,
    areaServed: { '@type': 'Country', name: 'Perú' },
    currenciesAccepted: 'PEN',
  };
}
