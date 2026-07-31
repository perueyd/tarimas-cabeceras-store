import { hasDB, redisCmd } from '../_store.js';
import { s } from '../_pricing.js';
import { checkAdminAuth } from '../_auth.js';
import { clientIp, rateLimitRequest } from '../_ratelimit.js';

// Carritos abandonados: cuando un cliente llena su nombre y teléfono en el
// checkout pero no llega a pagar, guardamos su carrito para que el dueño pueda
// escribirle por WhatsApp y recuperar la venta.
// - Se guarda UNA entrada por teléfono (hash), que se sobrescribe con el
//   carrito más reciente, para no acumular duplicados de la misma persona.
// - Al concretarse un pedido (api/orders.js), se borra la entrada de ese
//   teléfono, así el dueño solo ve los que de verdad quedaron sin comprar.
const KEY = 'carritos:abandonados';

export default async function handler(req, res) {
  // POST público: el checkout lo llama al tener nombre + teléfono. Silencioso:
  // nunca molesta al cliente con errores (es una función de fondo).
  if (req.method === 'POST') {
    if (await rateLimitRequest(`carrito:${clientIp(req)}`, 40, 3600)) {
      return res.status(200).json({ ok: false });
    }
    if (!hasDB) return res.status(200).json({ ok: false });
    const telefono = s(req.body?.telefono, 30).trim();
    const nombre = s(req.body?.nombre, 120).trim();
    if (!telefono || !nombre) return res.status(200).json({ ok: false });
    const items = Array.isArray(req.body?.items)
      ? req.body.items.slice(0, 40).map((i) => ({
          productName: s(i.productName, 120),
          qty: Math.min(Math.max(parseInt(i.qty, 10) || 1, 1), 99),
        }))
      : [];
    if (items.length === 0) return res.status(200).json({ ok: false });
    const total = Math.max(Number(req.body?.total) || 0, 0);
    const registro = { telefono, nombre, items, total, fecha: new Date().toISOString() };
    try {
      await redisCmd(['HSET', KEY, telefono, JSON.stringify(registro)]);
    } catch { /* de fondo: no romper el checkout si falla */ }
    return res.status(200).json({ ok: true });
  }

  // GET admin: lista de carritos abandonados (más recientes primero).
  if (req.method === 'GET') {
    const auth = await checkAdminAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    if (!hasDB) return res.status(200).json({ carritos: [] });
    const data = await redisCmd(['HVALS', KEY]);
    const carritos = (data.result || [])
      .map((raw) => { try { return JSON.parse(raw); } catch { return null; } })
      .filter(Boolean)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return res.status(200).json({ carritos });
  }

  // DELETE admin: quita un carrito (ya lo contactó o ya no aplica).
  if (req.method === 'DELETE') {
    const auth = await checkAdminAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    if (!hasDB) return res.status(200).json({ ok: true });
    const telefono = s(req.query.telefono, 30);
    await redisCmd(['HDEL', KEY, telefono]);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
