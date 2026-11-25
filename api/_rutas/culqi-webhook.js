import { motivoParaNoCobrar } from '../../src/lib/culqiPrueba.js';
import { hasDB } from '../_store.js';
import { avisarError } from '../_alertas.js';
import { aplicarEstadoDeOrden, idDeOrden } from './culqi-orden.js';

// Aviso de Culqi cuando cambia una orden de pago (evento order.status.changed).
// Se configura en el CulqiPanel → Eventos → Webhooks → +Añadir, con la
// dirección https://www.corporacionagamenon.com/api/culqi-webhook
// (docs.culqi.com → Webhooks, consultado el 25/11/2026).
//
// SEGURIDAD: cualquiera podría llamar a esta dirección. Por eso NO se cree lo
// que dice el aviso: de él solo se saca el id de la orden y su estado se
// consulta a Culqi con la llave privada (aplicarEstadoDeOrden). Un aviso falso
// no puede marcar como pagado un pedido que Culqi no cobró.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const llave = process.env.CULQI_SECRET_KEY;
  if (!llave || motivoParaNoCobrar(llave, process.env.VERCEL_ENV) || !hasDB) {
    return res.status(503).json({ error: 'No configurado.' });
  }
  const id = idDeOrdenDelAviso(req.body);
  // Avisos de otros eventos (cargos, tokens…): no hay nada que hacer.
  if (!id) return res.status(200).json({ ok: true, ignorado: true });
  try {
    const pedido = await aplicarEstadoDeOrden(id, llave);
    return res.status(200).json({ ok: true, estado: pedido?.estado || null });
  } catch (err) {
    await avisarError('aviso de Culqi', `No se pudo aplicar la orden ${id}: ${err?.message}`);
    // 500: Culqi vuelve a intentar el aviso más tarde.
    return res.status(500).json({ error: 'Reintentar' });
  }
}

/**
 * El id de la orden que trae el aviso. Culqi manda { type, data } y «data» a
 * veces llega como texto JSON y a veces como objeto: se aceptan los dos.
 */
export function idDeOrdenDelAviso(body = {}) {
  if (!body || typeof body !== 'object') return null;
  if (body.type && body.type !== 'order.status.changed') return null;
  let data = body.data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { data = null; }
  }
  return idDeOrden(data?.id || data?.order_id || body.id);
}
