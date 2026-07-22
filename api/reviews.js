import { hasDB, redisCmd } from './_store.js';
import { s } from './_pricing.js';
import { getCatalog } from './_catalog.js';
import { checkAdminAuth } from './_auth.js';
import { clientIp, rateLimitRequest } from './_ratelimit.js';

// Reseñas de productos (comentarios + estrellas).
// GET  ?product=<id>                     -> reseñas públicas de un producto
// GET  ?all=1  Authorization: Bearer <admin>  -> todas las reseñas (panel admin)
// POST {productId, nombre, estrellas, comentario} -> crea una reseña
// DELETE Authorization: Bearer <admin>, ?product=<id>&id=<reviewId>  -> elimina una reseña (admin)
export default async function handler(req, res) {
  if (req.method === 'GET') {
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
    return res.status(200).json({ reviews: parseAll(data) });
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
    const review = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      productId,
      nombre,
      estrellas,
      comentario,
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

  // PUT: el dueño edita una reseña (estrellas y/o comentario).
  if (req.method === 'PUT') {
    const auth = await checkAdminAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    if (!hasDB) return res.status(501).json({ error: 'Base de datos no conectada.' });
    const productId = s(req.body?.productId, 60);
    const id = s(req.body?.id, 40);
    const comentario = s(req.body?.comentario, 500).trim();
    const estrellas = Math.min(Math.max(parseInt(req.body?.estrellas, 10) || 0, 1), 5);
    if (!productId || !id || !comentario) {
      return res.status(400).json({ error: 'Datos inválidos.' });
    }
    async function editarEnLista(listKey) {
      const data = await redisCmd(['LRANGE', listKey, '0', '499']);
      const list = data.result || [];
      for (let i = 0; i < list.length; i++) {
        try {
          const r = JSON.parse(list[i]);
          if (r.id === id) {
            const actualizada = { ...r, estrellas, comentario, editado: true };
            await redisCmd(['LSET', listKey, String(i), JSON.stringify(actualizada)]);
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
