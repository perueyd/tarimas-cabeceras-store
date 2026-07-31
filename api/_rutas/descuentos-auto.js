import { hasDB, redisCmd } from '../_store.js';
import { s } from '../_pricing.js';
import { checkAdminAuth } from '../_auth.js';
import { isValidTipoDesc, listDescuentosAutomaticos, saveDescuentosAutomaticos } from '../_promo.js';

// GET: lista descuentos automáticos (panel admin)
// POST: crea/edita descuento (admin)
// DELETE ?id=X: elimina descuento (admin)
export default async function handler(req, res) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (req.method === 'GET') {
    const descuentosAuto = await listDescuentosAutomaticos();
    return res.status(200).json({ descuentosAuto });
  }

  if (!hasDB) {
    return res.status(501).json({
      error: 'Base de datos no conectada. Conecta la integración gratuita "Upstash Redis" en Vercel (Storage → Marketplace).',
    });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const tipo = isValidTipoDesc(body.tipo) ? body.tipo : 'flashsale';

    const id = body.id || `desc-${Date.now()}`;
    let descuento = {
      id,
      tipo,
      valor: Number(body.valor) || 10,
      tipoDesc: (body.tipoDesc === 'monto') ? 'monto' : 'porcentaje',
      activo: body.activo !== false,
      vence: body.vence || null,
      creado: body.creado || new Date().toISOString(),
    };

    if (tipo === 'cantidad') {
      descuento.cantidadMinima = Math.max(Number(body.cantidadMinima) || 2, 1);
    } else if (tipo === 'categoria') {
      descuento.categoria = s(body.categoria, 50) || '';
    }

    const list = await listDescuentosAutomaticos();
    const idx = list.findIndex((d) => d.id === id);
    if (idx >= 0) list[idx] = descuento;
    else list.push(descuento);

    await saveDescuentosAutomaticos(list);
    return res.status(200).json({ ok: true, descuentosAuto: list });
  }

  if (req.method === 'DELETE') {
    const id = s(req.query.id, 50);
    if (!id) return res.status(400).json({ error: 'Falta el ID.' });
    const list = (await listDescuentosAutomaticos()).filter((d) => d.id !== id);
    await saveDescuentosAutomaticos(list);
    return res.status(200).json({ ok: true, descuentosAuto: list });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
