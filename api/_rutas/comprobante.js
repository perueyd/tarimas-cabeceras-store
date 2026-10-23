// Boletas y facturas electrónicas de los pedidos — desde el panel.
//
// La lógica está en api/_facturador.js; esto es la puerta del panel. Todo
// exige la clave de administrador, y la llave del facturador nunca sale del
// servidor: el PDF se descarga A TRAVÉS de esta ruta.
//
// POST admin { code }                         -> emite (o reintenta) el comprobante del pedido;
//                                                 si ya existe, actualiza su estado en SUNAT
// GET  admin ?code=ED-XXX[&formato=TICKET_80] -> PDF del comprobante (A4 por defecto)

import { getCatalog } from '../_catalog.js';
import { checkAdminAuth } from '../_auth.js';
import { consultarEstado, descargarPdf, emitirComprobante } from '../_facturador.js';
import { s } from '../_pricing.js';
import { actualizarPedido, buscarPedido, hasDB } from '../_store.js';

export default async function handler(req, res) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  if (!hasDB) return res.status(501).json({ error: 'Base de datos no conectada.' });

  const code = s(req.method === 'POST' ? req.body?.code : req.query.code, 30);
  const order = code ? await buscarPedido(code) : null;
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });

  if (req.method === 'POST') {
    // Solo pedidos cobrados: emitir antes de confirmar el pago es justo lo que
    // esta conexión debe impedir.
    if (order.estado !== 'Pagado' && order.estado !== 'Entregado') {
      return res.status(409).json({ error: 'Marca primero el pedido como "Pagado".' });
    }
    if (order.comprobante?.numero) {
      const estado = await consultarEstado(order.comprobante.id);
      if (!estado || estado === order.comprobante.estado) return res.status(200).json({ ok: true, order });
      const nuevo = await actualizarPedido(code, (o) => ({ ...o, comprobante: { ...o.comprobante, estado } }));
      return res.status(200).json({ ok: true, order: nuevo || order });
    }
    const { sizes } = await getCatalog();
    const comprobante = await emitirComprobante(order, { sizes });
    const nuevo = await actualizarPedido(code, (o) => ({ ...o, comprobante }));
    return res.status(200).json({ ok: true, order: nuevo || { ...order, comprobante } });
  }

  if (req.method === 'GET') {
    if (!order.comprobante?.id) return res.status(404).json({ error: 'Este pedido aún no tiene comprobante.' });
    try {
      const r = await descargarPdf(order.comprobante.id, s(req.query.formato, 12));
      if (!r.ok) return res.status(502).json({ error: 'El facturador no entregó el PDF. Intenta de nuevo en unos minutos.' });
      const pdf = Buffer.from(await r.arrayBuffer());
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${order.comprobante.numero || code}.pdf"`);
      res.setHeader('Cache-Control', 'no-store');
      // `.end()` y no `.send()`: send() es un añadido de Vercel y el servidor
      // local de desarrollo no lo tiene.
      return res.status(200).end(pdf);
    } catch {
      return res.status(502).json({ error: 'No se pudo conectar con el facturador.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
