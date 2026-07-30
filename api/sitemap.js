// Mapa del sitio para Google, generado desde el catálogo real.
//
// Antes /sitemap.xml no existía: la reescritura lo mandaba a index.html y
// Google recibía HTML donde esperaba XML. Los productos creados desde el panel
// no aparecían en ningún sitemap, así que dependían de que Google los
// encontrara solo.
//
// Se genera en cada petición desde la base de datos, así que un producto nuevo
// entra sin tener que tocar nada.

import { getCatalog } from './_catalog.js';
import { SITIO } from './_sitio.js';

const FIJAS = [
  { url: '/', prioridad: '1.0', frecuencia: 'weekly' },
  { url: '/tienda', prioridad: '0.9', frecuencia: 'daily' },
  { url: '/seguimiento', prioridad: '0.4', frecuencia: 'monthly' },
  { url: '/libro-de-reclamaciones', prioridad: '0.3', frecuencia: 'yearly' },
  { url: '/politica-privacidad', prioridad: '0.2', frecuencia: 'yearly' },
  { url: '/terminos-condiciones', prioridad: '0.2', frecuencia: 'yearly' },
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  let entradas = [...FIJAS];

  try {
    const { products = [], categories = [] } = await getCatalog();

    for (const c of categories.filter((x) => x.active !== false)) {
      entradas.push({ url: `/tienda?categoria=${c.id}`, prioridad: '0.7', frecuencia: 'weekly' });
    }
    // Los borradores (oculto) no se le enseñan a Google.
    for (const p of products.filter((x) => !x.oculto)) {
      entradas.push({ url: `/producto/${p.id}`, prioridad: '0.8', frecuencia: 'weekly' });
    }
  } catch {
    // Sin base de datos se devuelven al menos las páginas fijas: mejor un
    // sitemap corto que un error.
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entradas
  .map(
    (e) => `  <url>
    <loc>${SITIO}${e.url.replace(/&/g, '&amp;')}</loc>
    <lastmod>${hoy}</lastmod>
    <changefreq>${e.frecuencia}</changefreq>
    <priority>${e.prioridad}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).end(xml);
}
