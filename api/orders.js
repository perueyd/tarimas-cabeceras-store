import { deleteOrder, hasDB, listOrders, newOrderCode, notifySheet, redisCmd, saveOrder } from './_store.js';
import { priceOrder, s } from './_pricing.js';
import { getCatalog } from './_catalog.js';
import { registerPromoUsage, validatePromo } from './_promo.js';

const ESTADOS_VALIDOS = ['Pago por verificar', 'Pagado', 'Entregado', 'Cancelado'];
const METODOS_VALIDOS = ['Yape/Plin', 'Transferencia bancaria', 'Tarjeta/Yape (Culqi)'];

// POST   -> registra un pedido (pagos manuales: Yape/Plin directo, transferencia).
// GET    -> ?code=  seguimiento público de UN pedido (sin datos sensibles, sin clave).
//        -> ?key=   lista todos los pedidos del negocio (panel admin).
// PATCH  -> el dueño cambia estado y/o método de un pedido. Notifica la hoja + correo.
// DELETE -> el dueño elimina un pedido del panel.
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const body = req.body || {};
    const metodo = s(body.metodo, 40);
    const nombre = s(body.nombre, 120);
    const telefono = s(body.telefono, 30);
    if (!metodo || !nombre || !telefono) {
      return res.status(400).json({ error: 'Faltan datos del pedido (metodo, nombre, telefono).' });
    }
    // SEGURIDAD: el monto se recalcula desde el catálogo ACTUAL; se ignora el del navegador.
    const { products } = await getCatalog();
    const priced = priceOrder(products, body.items);
    if (!priced) {
      return res.status(400).json({ error: 'El pedido contiene productos o tamaños inválidos.' });
    }

    // Código promocional (opcional): se revalida aquí, nunca se confía en el
    // descuento que mande el navegador. Si el código dejó de ser válido justo
    // en este instante (venció, se acabó), simplemente no se aplica — la
    // compra sigue, no se bloquea al cliente por eso.
    let montoFinal = priced.total;
    let promoCode = null;
    let promoDescuento = 0;
    const promoInput = s(body.promoCode, 30);
    if (promoInput) {
      const promoResult = await validatePromo(promoInput, priced.total);
      if (promoResult.valid) {
        promoDescuento = promoResult.descuento;
        montoFinal = Math.round((priced.total - promoDescuento) * 100) / 100;
        promoCode = promoResult.promo.code;
      }
    }

    const order = {
      code: newOrderCode(),
      fecha: new Date().toISOString(),
      estado: 'Pago por verificar',
      metodo,
      monto: montoFinal,
      promoCode,
      promoDescuento,
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
      if (promoCode) registerPromoUsage(promoCode).catch(() => {});
      return res.status(200).json({ ok: true, code: order.code, saved, monto: montoFinal, promoDescuento });
    } catch (err) {
      console.log('PEDIDO (error BD, respaldo):', JSON.stringify(order));
      return res.status(200).json({ ok: true, code: order.code, saved: false, monto: montoFinal, promoDescuento });
    }
  }

  if (req.method === 'GET') {
    // Seguimiento público: cualquier persona con el código puede ver el estado
    // (no requiere clave). Solo se devuelven campos no sensibles.
    if (req.query.code) {
      const code = s(req.query.code, 30);
      if (!hasDB) {
        return res.status(501).json({ error: 'El seguimiento aún no está disponible.' });
      }
      const orders = await listOrders();
      const found = orders?.find((o) => o.code === code);
      if (!found) return res.status(404).json({ error: 'No encontramos un pedido con ese código.' });
      return res.status(200).json({
        order: {
          code: found.code,
          estado: found.estado,
          fecha: found.fecha,
          entrega: found.entrega,
          monto: found.monto,
          items: (found.items || []).map((i) => ({ productName: i.productName, qty: i.qty })),
        },
      });
    }

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

  // PATCH: el dueño cambia el estado y/o el método de un pedido.
  if (req.method === 'PATCH') {
    const adminKey = process.env.ORDERS_ADMIN_KEY;
    if (!adminKey || (req.query.key || '') !== adminKey) {
      return res.status(401).json({ error: 'Clave incorrecta.' });
    }
    if (!hasDB) return res.status(501).json({ error: 'Base de datos no conectada.' });
    const code = s(req.body?.code, 30);
    const estado = req.body?.estado != null ? s(req.body.estado, 30) : null;
    const metodo = req.body?.metodo != null ? s(req.body.metodo, 40) : null;
    if (!code || (!estado && !metodo)) {
      return res.status(400).json({ error: 'Datos inválidos (code y estado o metodo).' });
    }
    if (estado && !ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido.' });
    }
    if (metodo && !METODOS_VALIDOS.includes(metodo)) {
      return res.status(400).json({ error: 'Método inválido.' });
    }
    const data = await redisCmd(['LRANGE', 'pedidos', '0', '499']);
    const list = data.result || [];
    for (let i = 0; i < list.length; i++) {
      try {
        const order = JSON.parse(list[i]);
        if (order.code === code) {
          if (estado) order.estado = estado;
          if (metodo) order.metodo = metodo;
          await redisCmd(['LSET', 'pedidos', String(i), JSON.stringify(order)]);
          // Agrega una fila nueva a la hoja de Google (historial con fecha de cada
          // cambio de estado) y avisa al cliente por correo, si hay email.
          if (estado) {
            notifySheet({
              ...order,
              evento: 'actualizado',
              fecha: new Date().toISOString(), // fecha de ESTE cambio de estado, no la del pedido original
            }).catch(() => {});
          }
          return res.status(200).json({ ok: true, order });
        }
      } catch { /* sigue buscando */ }
    }
    return res.status(404).json({ error: 'Pedido no encontrado.' });
  }

  // DELETE: el dueño elimina un pedido del panel (no borra la fila ya escrita en Sheets).
  if (req.method === 'DELETE') {
    const adminKey = process.env.ORDERS_ADMIN_KEY;
    if (!adminKey || (req.query.key || '') !== adminKey) {
      return res.status(401).json({ error: 'Clave incorrecta.' });
    }
    if (!hasDB) return res.status(501).json({ error: 'Base de datos no conectada.' });
    const code = s(req.query.code, 30);
    if (!code) return res.status(400).json({ error: 'Falta el código del pedido.' });
    const ok = await deleteOrder(code);
    if (!ok) return res.status(404).json({ error: 'Pedido no encontrado.' });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
