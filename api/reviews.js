import { hasDB, redisCmd, reemplazarEnLista } from './_store.js';
import { s } from './_pricing.js';
import { getCatalog } from './_catalog.js';
import { checkAdminAuth } from './_auth.js';
import { clientIp, rateLimitRequest } from './_ratelimit.js';

// Reseñas de productos (comentarios + estrellas).
// GET  ?product=<id>                     -> reseñas públicas de un producto
// GET  ?recientes=1                      -> últimas reseñas aprobadas (portada)
// GET  ?all=1  Authorization: Bearer <admin>  -> todas las reseñas (panel admin)
// POST {productId, nombre, estrellas, comentario} -> crea una reseña
// DELETE Authorization: Bearer <admin>, ?product=<id>&id=<reviewId>  -> elimina una reseña (admin)
export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Últimas reseñas para la portada. Público, pero solo devuelve lo que ya
    // es visible en la ficha del producto: nombre, estrellas y comentario.
    // Nada de correo ni teléfono.
    if (req.query.recientes) {
      if (await rateLimitRequest(`reviews-recientes:${clientIp(req)}`, 120, 3600)) {
        return res.status(429).json({ error: 'Demasiadas consultas seguidas.' });
      }
      if (!hasDB) return res.status(200).json({ reviews: [] });
      const data = await redisCmd(['LRANGE', 'reviews:all', '0', '99']);
      const { products } = await getCatalog();
      const nombreDe = new Map(products.map((p) => [p.id, p.name]));
      const reviews = parseAll(data)
        .filter((r) => r.aprobada !== false && r.comentario && nombreDe.has(r.productId))
        .slice(0, 8)
        .map((r) => ({
          id: r.id,
          productId: r.productId,
          productName: nombreDe.get(r.productId),
          nombre: r.nombre,
          estrellas: r.estrellas,
          comentario: r.comentario,
          fecha: r.fecha,
        }));
      return res.status(200).json({ reviews });
    }

    if (req.query.all) {
      const auth = await checkAdminAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
      if (!hasDB) return res.status(200).json({ reviews: [], saved: false });
      const data = await redisCmd(['LRANGE', 'reviews:all', '0', '499']);
      return res.status(200).json({ reviews: parseAll(data) });
    }
    const productId = s(req.query.product, 60);
    const { products } = await getCatalog();
    if (!products.some((p) => p.id === productId)) {
      return res.status(400).json({ error: 'Producto inválido.' });
    }
    if (!hasDB) return res.status(200).json({ reviews: [] });
    const data = await redisCmd(['LRANGE', `reviews:${productId}`, '0', '99']);
    // En público solo se muestran las aprobadas. Las de solo texto no llevan el
    // campo (aprobada === undefined) y siguen siendo visibles; las de foto solo
    // salen cuando el dueño las aprueba (aprobada === true).
    const visibles = parseAll(data).filter((r) => r.aprobada !== false);
    return res.status(200).json({ reviews: visibles });
  }

  if (req.method === 'POST') {
    if (await rateLimitRequest(`reviews-post:${clientIp(req)}`, 8, 3600)) {
      return res.status(429).json({ error: 'Ya enviaste varias reseñas seguidas. Intenta más tarde.' });
    }
    const body = req.body || {};
    const productId = s(body.productId, 60);
    const nombre = s(body.nombre, 60).trim();
    const comentario = s(body.comentario, 500).trim();
    const estrellas = Math.min(Math.max(parseInt(body.estrellas, 10) || 0, 1), 5);
    const { products } = await getCatalog();
    if (!products.some((p) => p.id === productId) || !nombre || !comentario) {
      return res.status(400).json({ error: 'Completa tu nombre y comentario.' });
    }
    // Foto opcional: solo se acepta una URL de NUESTRO almacén (Vercel Blob),
    // subida antes por /api/upload-resena. Cualquier otra URL se descarta.
    const fotoInput = s(body.foto, 300).trim();
    const foto = /^https:\/\/[a-z0-9.-]*\.public\.blob\.vercel-storage\.com\//i.test(fotoInput) ? fotoInput : '';
    // Las reseñas con foto quedan PENDIENTES de aprobación del dueño (para que
    // una imagen indebida no aparezca sola). Las de solo texto siguen saliendo
    // al instante, como hasta ahora.
    const review = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      productId,
      nombre,
      estrellas,
      comentario,
      foto: foto || undefined,
      aprobada: foto ? false : true,
      fecha: new Date().toISOString(),
    };
    if (!hasDB) {
      console.log('RESEÑA (BD no configurada):', JSON.stringify(review));
      return res.status(200).json({ ok: true, saved: false, review });
    }
    const raw = JSON.stringify(review);
    await redisCmd(['LPUSH', `reviews:${productId}`, raw]);
    await redisCmd(['LPUSH', 'reviews:all', raw]);
    return res.status(200).json({ ok: true, saved: true, review });
  }

  // PUT: el dueño edita una reseña (estrellas y/o comentario) o la APRUEBA.
  if (req.method === 'PUT') {
    const auth = await checkAdminAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    if (!hasDB) return res.status(501).json({ error: 'Base de datos no conectada.' });
    const productId = s(req.body?.productId, 60);
    const id = s(req.body?.id, 40);
    const soloAprobar = req.body?.aprobar === true;
    const comentario = s(req.body?.comentario, 500).trim();
    const estrellas = Math.min(Math.max(parseInt(req.body?.estrellas, 10) || 0, 1), 5);
    if (!productId || !id || (!soloAprobar && !comentario)) {
      return res.status(400).json({ error: 'Datos inválidos.' });
    }
    // Aplica el cambio en la lista del producto y en la lista global.
    async function editarEnLista(listKey) {
      const data = await redisCmd(['LRANGE', listKey, '0', '499']);
      const list = data.result || [];
      for (let i = 0; i < list.length; i++) {
        try {
          const r = JSON.parse(list[i]);
          if (r.id === id) {
            const actualizada = soloAprobar
              ? { ...r, aprobada: true }
              : { ...r, estrellas, comentario, editado: true };
            // Por VALOR, no por posición: aprobar una reseña podía pisar otra.
            await reemplazarEnLista(listKey, data.result[i], JSON.stringify(actualizada));
            return actualizada;
          }
        } catch { /* sigue buscando */ }
      }
      return null;
    }
    const actualizada = await editarEnLista(`reviews:${productId}`);
    await editarEnLista('reviews:all');
    if (!actualizada) return res.status(404).json({ error: 'Reseña no encontrada.' });
    return res.status(200).json({ ok: true, review: actualizada });
  }

  if (req.method === 'DELETE') {
    const auth = await checkAdminAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    if (!hasDB) return res.status(501).json({ error: 'Base de datos no conectada.' });
    const productId = s(req.query.product, 60);
    const id = s(req.query.id, 40);
    const data = await redisCmd(['LRANGE', `reviews:${productId}`, '0', '499']);
    const raw = (data.result || []).find((r) => {
      try { return JSON.parse(r).id === id; } catch { return false; }
    });
    if (!raw) return res.status(404).json({ error: 'Reseña no encontrada.' });
    await redisCmd(['LREM', `reviews:${productId}`, '0', raw]);
    await redisCmd(['LREM', 'reviews:all', '0', raw]);

    // La foto también. Antes solo se borraba el texto de la reseña: la imagen
    // seguía publicada en el almacén con su dirección accesible para siempre.
    // Si el dueño rechazaba una foto indebida, seguía en internet — y además
    // ocupando cuota de Blob, que ya se agotó una vez.
    try {
      const { foto } = JSON.parse(raw);
      if (foto && /\.public\.blob\.vercel-storage\.com\//i.test(foto)) {
        const { del } = await import('@vercel/blob');
        await del(foto);
      }
    } catch (err) {
      // No se bloquea el borrado de la reseña por no poder quitar la foto.
      console.error('No se pudo borrar la foto de la reseña:', err?.message);
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

function parseAll(data) {
  return (data.result || [])
    .map((raw) => {
      try { return JSON.parse(raw); } catch { return null; }
    })
    .filter(Boolean);
}
