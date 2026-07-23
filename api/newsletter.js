import { hasDB, redisCmd } from './_store.js';
import { s } from './_pricing.js';
import { checkAdminAuth } from './_auth.js';
import { clientIp, rateLimitRequest } from './_ratelimit.js';

// Suscripciones al newsletter (solo el correo + fecha).
// POST {email}                        -> público, se suscribe (rate-limited)
// GET  Authorization: Bearer <admin>  -> lista de suscriptores (panel)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    if (await rateLimitRequest(`newsletter:${clientIp(req)}`, 10, 3600)) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
    }
    const email = s(req.body?.email, 120).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Ingresa un correo válido.' });
    }
    if (!hasDB) {
      console.log('SUSCRIPCIÓN (BD no configurada):', email);
      return res.status(200).json({ ok: true, saved: false });
    }
    try {
      // Un set evita duplicados: si ya estaba suscrito, no se agrega de nuevo.
      const yaExiste = await redisCmd(['SISMEMBER', 'newsletter:emails', email]);
      if (yaExiste.result === 1) {
        return res.status(200).json({ ok: true, saved: true, yaSuscrito: true });
      }
      await redisCmd(['SADD', 'newsletter:emails', email]);
      await redisCmd(['LPUSH', 'newsletter:list', JSON.stringify({ email, fecha: new Date().toISOString() })]);
    } catch (err) {
      console.log('SUSCRIPCIÓN (error Redis):', email);
      return res.status(200).json({ ok: true, saved: false });
    }
    return res.status(200).json({ ok: true, saved: true });
  }

  if (req.method === 'GET') {
    const auth = await checkAdminAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    if (!hasDB) return res.status(200).json({ suscriptores: [] });
    const data = await redisCmd(['LRANGE', 'newsletter:list', '0', '4999']);
    const suscriptores = (data.result || [])
      .map((r) => {
        try { return JSON.parse(r); } catch { return null; }
      })
      .filter(Boolean);
    return res.status(200).json({ suscriptores });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
