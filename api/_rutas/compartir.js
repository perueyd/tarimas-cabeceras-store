// Vista previa de UN producto para cuando alguien comparte el enlace.
//
// EL PROBLEMA: WhatsApp, Facebook y compañía no "ven" la página como una
// persona — no ejecutan JavaScript. Leen el código crudo que manda el
// servidor, y como toda la tienda entrega el mismo index.html, cada producto
// compartido mostraba la misma imagen genérica de la tienda. Da igual cuál de
// las 34 cabeceras mandaras: siempre la misma tarjeta.
//
// LA SOLUCIÓN: en vercel.json, cuando quien pide /producto/xxx es uno de esos
// robots (se reconocen por su user-agent), la petición viene aquí y se le
// responde una página mínima con el nombre, la descripción y la FOTO de ese
// producto. Los clientes de verdad no pasan por aquí: siguen recibiendo la
// tienda normal.
//
// Vive en api/_rutas/ porque los archivos que empiezan por "_" no cuentan
// contra el límite de 12 funciones del plan gratuito.

import { getCatalog } from '../_catalog.js';

const SITIO = 'https://eydperu.vercel.app';

// Todo lo que sale del catálogo lo escribe el dueño desde el panel, así que
// puede traer comillas o signos que romperían el HTML.
function escapar(t) {
  return String(t || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// La imagen para compartir es un JPG de 1200x630: WhatsApp no siempre muestra
// las WebP, y el JPG lo entienden todos. Se genera junto a la foto (ver
// scripts/elegir-fotos.mjs). Si la foto no es del proyecto se usa tal cual.
function imagenParaCompartir(url, respaldo) {
  if (!url) return respaldo;
  if (url.startsWith('/productos/') && url.endsWith('.webp')) {
    return `${SITIO}${url.replace(/\.webp$/, '-og.jpg')}`;
  }
  return url.startsWith('http') ? url : `${SITIO}${url}`;
}

export default async function handler(req, res) {
  const id = String(req.query?.id || '').slice(0, 60);
  const destino = `${SITIO}/producto/${encodeURIComponent(id)}`;

  let producto = null;
  let nombreTienda = 'E|D Espacios y Diseño';
  let respaldo = `${SITIO}/og-image.png`;
  try {
    const catalog = await getCatalog();
    producto = (catalog.products || []).find((p) => p.id === id) || null;
    if (catalog.storeConfig?.siteName) nombreTienda = catalog.storeConfig.siteName;
    if (catalog.storeConfig?.ogImage) respaldo = catalog.storeConfig.ogImage;
  } catch {
    // Sin catálogo se responde igual con los datos genéricos: es preferible una
    // vista previa pobre a un error al compartir.
  }

  const titulo = producto ? `${producto.name} — ${nombreTienda}` : nombreTienda;
  const descripcion = producto?.shortDescription || 'Tarimas, cabeceras y muebles a medida en Lima. Elige tu tamaño y color.';
  const imagen = producto ? imagenParaCompartir(producto.baseImage, respaldo) : respaldo;

  // Se guarda en caché un rato: los robots piden lo mismo varias veces.
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  // `.end()` y no `.send()`: send() es un añadido de Vercel y el servidor de
  // desarrollo no lo tiene, así que en local reventaba con un 500. end() es de
  // Node y funciona en los dos sitios (igual que hace api/sitemap.js).
  return res.status(200).end(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapar(titulo)}</title>
<meta name="description" content="${escapar(descripcion)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="${escapar(nombreTienda)}">
<meta property="og:title" content="${escapar(titulo)}">
<meta property="og:description" content="${escapar(descripcion)}">
<meta property="og:image" content="${escapar(imagen)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${escapar(destino)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapar(titulo)}">
<meta name="twitter:description" content="${escapar(descripcion)}">
<meta name="twitter:image" content="${escapar(imagen)}">
<link rel="canonical" href="${escapar(destino)}">
</head>
<body>
<h1>${escapar(producto?.name || nombreTienda)}</h1>
<p>${escapar(descripcion)}</p>
<p><a href="${escapar(destino)}">Ver el producto</a></p>
</body>
</html>`);
}
