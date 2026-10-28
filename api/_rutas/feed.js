// El catálogo en el formato que leen las plataformas de publicidad.
//
// POR QUÉ EXISTE: para anunciar productos en Google Shopping, Instagram,
// Facebook o TikTok hay que subirles el catálogo. Hacerlo a mano son 49 fichas
// con foto, precio, medidas y disponibilidad — y cada vez que cambia un precio
// hay que repetirlo en las cuatro. En la práctica eso significa que los
// anuncios acaban enseñando precios viejos, y un precio distinto al de la web
// es publicidad engañosa (Ley 29571).
//
// Con esto se les da UNA dirección y ellos la releen solos cada día. El precio
// del anuncio sale siempre del mismo sitio que el de la tienda.
//
//   /api/feed            -> XML para Google Merchant Center
//   /api/feed?formato=csv -> CSV para Meta (Instagram y Facebook) y TikTok
//
// Es público a propósito: las plataformas lo leen sin clave. No lleva nada que
// no esté ya visible en la tienda.

import { getCatalog } from '../_catalog.js';
import { getEffectivePrice } from '../../src/lib/pricing.js';
import { NOMBRE_TIENDA } from '../../src/data/sitio.js';

const SITIO = 'https://eydperu.vercel.app';
const MONEDA = 'PEN';

function escaparXML(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Una fila por producto Y tamaño. Las plataformas tratan cada medida como un
// artículo distinto porque tiene su propio precio: anunciar "desde S/ 220" y
// luego cobrar S/ 410 por la King hace que te rechacen el anuncio.
function filas(catalog) {
  const { products = [], sizes = [] } = catalog;
  const nombreMedida = new Map(sizes.map((s) => [s.id, s.label || s.id]));
  // La marca que ve el comprador en el anuncio es el nombre COMERCIAL, no la
  // razón social: nadie busca "S.A.C." ni la reconoce. La razón social es un
  // dato legal y va en el pie de la tienda, no en la ficha de un anuncio.
  const marca = NOMBRE_TIENDA;
  const lista = [];

  for (const p of products) {
    if (p.oculto) continue;
    const foto = p.baseImage || Object.values(p.sizeImages || {})[0];
    if (!foto) continue; // sin foto las plataformas rechazan el artículo

    for (const sizeId of Object.keys(p.sizePricing || {})) {
      const precio = getEffectivePrice(p, sizeId);
      if (!precio?.final || precio.final <= 0) continue;

      const medida = nombreMedida.get(sizeId) || sizeId;
      lista.push({
        id: `${p.id}-${sizeId}`,
        titulo: `${p.name} — ${medida}`,
        // La descripción no puede ir vacía: sin ella el artículo se rechaza.
        descripcion:
          p.shortDescription ||
          `${p.name} en medida ${medida}. Mueble a medida fabricado en Lima, Perú.`,
        enlace: `${SITIO}/producto/${p.id}?tamano=${encodeURIComponent(sizeId)}`,
        foto: foto.startsWith('http') ? foto : SITIO + foto,
        fotosExtra: (p.gallery || [])
          .map((g) => (typeof g === 'string' ? g : g?.url))
          .filter(Boolean)
          .slice(0, 10)
          .map((u) => (u.startsWith('http') ? u : SITIO + u)),
        precio: precio.final,
        // Se fabrica a pedido, así que siempre hay: no es un stock que se agote.
        disponibilidad: 'in stock',
        marca,
        categoria: p.category || '',
        // Sin código de barras ni de fabricante, hay que declararlo o el
        // artículo se rechaza por "faltan identificadores".
        tieneIdentificador: 'no',
        condicion: 'new',
      });
    }
  }
  return lista;
}

function comoXML(lista) {
  const items = lista
    .map(
      (f) => `    <item>
      <g:id>${escaparXML(f.id)}</g:id>
      <g:title>${escaparXML(f.titulo.slice(0, 150))}</g:title>
      <g:description>${escaparXML(f.descripcion.slice(0, 5000))}</g:description>
      <g:link>${escaparXML(f.enlace)}</g:link>
      <g:image_link>${escaparXML(f.foto)}</g:image_link>
${f.fotosExtra.map((u) => `      <g:additional_image_link>${escaparXML(u)}</g:additional_image_link>`).join('\n')}
      <g:availability>${f.disponibilidad}</g:availability>
      <g:price>${f.precio.toFixed(2)} ${MONEDA}</g:price>
      <g:brand>${escaparXML(f.marca)}</g:brand>
      <g:condition>${f.condicion}</g:condition>
      <g:identifier_exists>${f.tieneIdentificador}</g:identifier_exists>
      <g:product_type>${escaparXML(f.categoria)}</g:product_type>
    </item>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${NOMBRE_TIENDA} — Catálogo</title>
    <link>${SITIO}</link>
    <description>Tarimas, cabeceras y muebles a medida en Perú.</description>
${items}
  </channel>
</rss>`;
}

function comoCSV(lista) {
  // Los nombres de columna son los que espera Meta (Instagram y Facebook).
  // TikTok acepta el mismo formato.
  const columnas = [
    'id', 'title', 'description', 'availability', 'condition',
    'price', 'link', 'image_link', 'brand', 'product_type',
  ];
  const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const filasCSV = lista.map((f) =>
    [
      f.id, f.titulo, f.descripcion, f.disponibilidad, f.condicion,
      `${f.precio.toFixed(2)} ${MONEDA}`, f.enlace, f.foto, f.marca, f.categoria,
    ].map(celda).join(',')
  );

  return [columnas.join(','), ...filasCSV].join('\n');
}

export default async function handler(req, res) {
  try {
    const catalog = await getCatalog();
    const lista = filas(catalog);

    // Se cachea una hora en el CDN: las plataformas lo piden a diario y no
    // tiene sentido leer la base de datos en cada petición. No hay riesgo de
    // servir datos de administrador porque esta dirección nunca los devuelve.
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

    if (String(req.query.formato || '').toLowerCase() === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline; filename="catalogo-eyd.csv"');
      return res.status(200).end(comoCSV(lista));
    }

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.status(200).end(comoXML(lista));
  } catch (err) {
    console.error('feed:', err?.message);
    return res.status(503).end('No se pudo generar el catálogo.');
  }
}
