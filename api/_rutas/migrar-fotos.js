// Herramienta de rescate: comprueba si las fotos guardadas en Vercel Blob se
// pueden seguir leyendo DESDE EL SERVIDOR aunque el almacén esté bloqueado
// para el público, y permite descargarlas para moverlas al proyecto.
//
// Contexto: al superar los 10 GB de transferencia gratuitos, Vercel bloqueó el
// almacén y las 33 fotos de los productos pasaron a devolver 403 "Your store is
// blocked". La tienda quedó sin imágenes. Como el token de Blob solo existe en
// el servidor, esta comprobación no se puede hacer desde el navegador.
//
// GET  ?diagnostico=1 -> dice si se pueden leer y cuántas hay
// GET  ?descargar=<pathname> -> devuelve UNA foto (para bajarlas y guardarlas)
//
// Es de un solo uso: cuando las fotos estén movidas, este archivo se borra.

import { list, head } from '@vercel/blob';
import { checkAdminAuth } from '../_auth.js';

export default async function handler(req, res) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'No hay BLOB_READ_WRITE_TOKEN en el servidor.' });
  }

  // Diagnóstico: ¿el almacén responde a la API aunque esté bloqueado al público?
  if (req.query.diagnostico) {
    const resultado = { listar: null, leer: null, blobs: [] };

    try {
      const { blobs } = await list({ token, limit: 200 });
      resultado.listar = 'ok';
      resultado.total = blobs.length;
      resultado.pesoTotalMB = Math.round(blobs.reduce((t, b) => t + (b.size || 0), 0) / 1048576 * 10) / 10;
      resultado.blobs = blobs.slice(0, 200).map((b) => ({
        pathname: b.pathname,
        size: b.size,
        url: b.url,
      }));
    } catch (err) {
      resultado.listar = `falla: ${err?.name || ''} ${err?.message || ''}`.trim();
    }

    // ¿Se puede LEER el contenido? Es lo que decide si se pueden rescatar.
    if (resultado.blobs.length) {
      try {
        const r = await fetch(resultado.blobs[0].url, { headers: { Authorization: `Bearer ${token}` } });
        resultado.leer = r.ok ? `ok (${r.status})` : `falla: HTTP ${r.status}`;
      } catch (err) {
        resultado.leer = `falla: ${err?.message}`;
      }
    }

    return res.status(200).json(resultado);
  }

  // Descarga UNA foto: se devuelve tal cual para poder guardarla en el proyecto.
  const pathname = String(req.query.descargar || '');
  if (pathname) {
    try {
      const meta = await head(pathname, { token });
      const r = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return res.status(502).json({ error: `El almacén respondió ${r.status}` });
      const buf = Buffer.from(await r.arrayBuffer());
      res.setHeader('Content-Type', meta.contentType || 'application/octet-stream');
      return res.status(200).end(buf);
    } catch (err) {
      return res.status(502).json({ error: err?.message || 'No se pudo leer la foto.' });
    }
  }

  return res.status(400).json({ error: 'Usa ?diagnostico=1 o ?descargar=<pathname>' });
}
