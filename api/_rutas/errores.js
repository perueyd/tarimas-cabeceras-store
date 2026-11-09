// Errores recientes de la tienda (ver api/_alertas.js).
//
// POST público -> el navegador avisa de un fallo que vio el cliente (pantalla
//                 en blanco, error de JavaScript). Sin datos personales: solo
//                 el mensaje, dónde pasó y las primeras líneas de la pila.
// GET  admin   -> la lista para el panel.
// DELETE admin -> la vacía cuando el dueño ya los revisó.

import { checkAdminAuth } from '../_auth.js';
import { s } from '../_pricing.js';
import { clientIp, rateLimitRequest } from '../_ratelimit.js';
import { avisarError, borrarErrores, listarErrores } from '../_alertas.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Un navegador roto puede repetir el mismo error en bucle: con 10 cada
    // 10 minutos por IP basta para enterarse sin que nadie llene la lista.
    if (await rateLimitRequest(`errores:${clientIp(req)}`, 10, 600)) {
      return res.status(200).json({ ok: false });
    }
    const body = req.body || {};
    // Solo la ruta, sin "?..." : ahí podría ir un código de pedido o un correo.
    const donde = s(body.donde, 120).split('?')[0];
    await avisarError(`navegador ${donde}`.trim(), s(body.mensaje, 300), s(body.pila, 1500));
    return res.status(200).json({ ok: true });
  }

  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (req.method === 'GET') {
    return res.status(200).json({ errores: await listarErrores() });
  }
  if (req.method === 'DELETE') {
    await borrarErrores();
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Método no permitido' });
}
