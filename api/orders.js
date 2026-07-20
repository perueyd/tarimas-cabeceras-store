import { listOrders, newOrderCode, saveOrder } from './_store.js';
import { priceOrder, s } from './_pricing.js';

// POST  -> registra un pedido (pagos manuales: Yape/Plin directo, transferencia).
// GET   -> lista los pedidos del negocio. Protegido con ?key=<ORDERS_ADMIN_KEY>.
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const body = req.body || {};
    const metodo = s(body.metodo, 40);
    const nombre = s(body.nombre, 120);
    const telefono = s(body.telefono, 30);
    if (!metodo || !nombre || !telefono) {
      return res.status(400).json({ error: 'Faltan datos del pedido (metodo, nombre, telefono).' });
    }
    // SEGURIDAD: el monto se recalcula desde el catálogo; se ignora el del navegador.
    const priced = priceOrder(body.items);
    if (!priced) {
      return res.status(400).json({ error: 'El pedido contiene productos o tamaños inválidos.' });
    }
    const order = {
      code: newOrderCode(),
      fecha: new Date().toISOString(),
      estado: 'Pago por verificar',
      metodo,
      monto: priced.total,
      nombre,
      email: s(body.email, 120),
      telefono,
      zona: s(body.zona, 60),
      direccion: s(body.direccion, 300),
      ubicacion: s(body.ubicacion, 200),
      entrega: s(body.entrega, 120),
      items: priced.items,
    };
    try {
      const saved = await saveOrder(order);
      return res.status(200).json({ ok: true, code: order.code, saved });
    } catch (err) {
      console.log('PEDIDO (error BD, respaldo):', JSON.stringify(order));
      return res.status(200).json({ ok: true, code: order.code, saved: false });
    }
  }

  if (req.method === 'GET') {
    const adminKey = process.env.ORDERS_ADMIN_KEY;
    if (!adminKey) {
      return res.status(501).json({ error: 'Configura la variable ORDERS_ADMIN_KEY en Vercel para ver los pedidos.' });
    }
    if ((req.query.key || '') !== adminKey) {
      return res.status(401).json({ error: 'Clave incorrecta.' });
    }
    try {
      const orders = await listOrders();
      if (orders === null) {
        return res.status(501).json({
          error: 'Base de datos no conectada. Agrega la integración gratuita "Upstash Redis" a tu proyecto en Vercel (Storage → Marketplace) y redepliega. Mientras tanto, los pedidos quedan en los logs de Vercel y en tu panel de Culqi.',
        });
      }
      return res.status(200).json({ orders });
    } catch (err) {
      return res.status(500).json({ error: 'Error al leer los pedidos.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
