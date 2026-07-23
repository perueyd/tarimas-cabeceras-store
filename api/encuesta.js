import { hasDB, redisCmd } from './_store.js';
import { s } from './_pricing.js';
import { checkAdminAuth } from './_auth.js';
import { clientIp, rateLimitRequest } from './_ratelimit.js';

// Respuestas de la encuesta post-compra (opcional para el cliente).
// POST {orderCode?, respuestas: {preguntaId: valor}}  -> público (rate-limited)
// GET  Authorization: Bearer <admin>                   -> lista de respuestas (panel)
export default async function handler(req, res) {
  if (req.method === 'POST') {
    if (await rateLimitRequest(`encuesta:${clientIp(req)}`, 15, 3600)) {
      return res.status(429).json({ error: 'Demasiados envíos seguidos. Espera unos minutos.' });
    }
    const body = req.body || {};
    const respuestasRaw = body.respuestas && typeof body.respuestas === 'object' ? body.respuestas : {};
    // Se recorta cada respuesta y se limita la cantidad de preguntas a un
    // máximo razonable, para no guardar payloads gigantes.
    const respuestas = {};
    let n = 0;
    for (const [key, val] of Object.entries(respuestasRaw)) {
      if (n >= 20) break;
      const k = s(key, 40);
      const v = s(val, 500);
      if (k && v.trim()) {
        respuestas[k] = v;
        n++;
      }
    }
    if (Object.keys(respuestas).length === 0) {
      return res.status(400).json({ error: 'La encuesta está vacía.' });
    }
    const registro = {
      fecha: new Date().toISOString(),
      orderCode: s(body.orderCode, 30),
      respuestas,
    };
    if (!hasDB) {
      console.log('ENCUESTA (BD no configurada):', JSON.stringify(registro));
      return res.status(200).json({ ok: true, saved: false });
    }
    try {
      await redisCmd(['LPUSH', 'encuestas', JSON.stringify(registro)]);
    } catch (err) {
      console.log('ENCUESTA (error Redis):', JSON.stringify(registro));
      return res.status(200).json({ ok: true, saved: false });
    }
    return res.status(200).json({ ok: true, saved: true });
  }

  if (req.method === 'GET') {
    const auth = await checkAdminAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    if (!hasDB) return res.status(200).json({ encuestas: [] });
    const data = await redisCmd(['LRANGE', 'encuestas', '0', '999']);
    const encuestas = (data.result || [])
      .map((r) => {
        try { return JSON.parse(r); } catch { return null; }
      })
      .filter(Boolean);
    return res.status(200).json({ encuestas });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
