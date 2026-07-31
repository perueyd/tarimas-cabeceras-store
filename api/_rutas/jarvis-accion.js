// Ejecuta una acción que JARVIS pidió, y devuelve el resultado REAL.
//
// Las que consultan datos (ventas, productos, pedidos) se resuelven aquí, en el
// servidor, porque necesitan la base de datos. Las de navegación las ejecuta el
// navegador directamente — no hacen falta datos.
//
// Solo el dueño: exige la clave del panel, igual que /api/jarvis.

import { listOrders } from '../_store.js';
import { getCatalog } from '../_catalog.js';
import { checkAdminAuth } from '../_auth.js';
import { clientIp, rateLimitRequest } from '../_ratelimit.js';
import { s } from '../_pricing.js';

const esVenta = (o) => o.estado === 'Pagado' || o.estado === 'Entregado';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (await rateLimitRequest(`jarvis-accion:${clientIp(req)}`, 120, 3600)) {
    return res.status(429).json({ error: 'Demasiadas consultas seguidas.' });
  }

  const { accion, args } = req.body || {};

  try {
    if (accion === 'consultar_ventas') {
      const dias = Math.min(Math.max(parseInt(args?.dias, 10) || 30, 1), 365);
      const desde = Date.now() - dias * 86400000;
      const pedidos = (await listOrders()) || [];
      const enRango = pedidos.filter((o) => new Date(o.fecha).getTime() >= desde);
      const ventas = enRango.filter(esVenta);

      const porProducto = {};
      for (const o of ventas) {
        for (const it of o.items || []) {
          porProducto[it.productName] ||= { unidades: 0, soles: 0 };
          porProducto[it.productName].unidades += it.qty;
          porProducto[it.productName].soles += it.unitPrice * it.qty;
        }
      }
      const top = Object.entries(porProducto)
        .sort((a, b) => b[1].soles - a[1].soles)
        .slice(0, 5)
        .map(([nombre, d]) => ({ nombre, unidades: d.unidades, soles: Math.round(d.soles) }));

      return res.status(200).json({
        resultado: {
          dias,
          totalSoles: Math.round(ventas.reduce((t, o) => t + (o.monto || 0), 0)),
          pedidosConfirmados: ventas.length,
          porVerificar: enRango.filter((o) => o.estado === 'Pago por verificar').length,
          cancelados: enRango.filter((o) => o.estado === 'Cancelado').length,
          masVendidos: top,
        },
      });
    }

    if (accion === 'buscar_producto') {
      const q = s(args?.nombre, 60).toLowerCase().trim();
      const { products } = await getCatalog();
      const encontrados = products
        .filter((p) => p.name.toLowerCase().includes(q))
        .slice(0, 6)
        .map((p) => {
          const precios = Object.values(p.sizePricing || {}).filter((n) => Number(n) > 0);
          return {
            nombre: p.name,
            categoria: p.category,
            precios: p.sizePricing || {},
            desde: precios.length ? Math.min(...precios) : null,
            hasta: precios.length ? Math.max(...precios) : null,
            oculto: !!p.oculto,
            descuento: p.discountPercent || 0,
          };
        });
      return res.status(200).json({
        resultado: encontrados.length
          ? { encontrados }
          : { encontrados: [], aviso: `Ningún producto contiene "${q}".` },
      });
    }

    if (accion === 'buscar_pedido') {
      const q = s(args?.busqueda, 60).toLowerCase().trim();
      const pedidos = (await listOrders()) || [];
      const encontrados = pedidos
        .filter(
          (o) =>
            (o.code || '').toLowerCase().includes(q) ||
            (o.nombre || '').toLowerCase().includes(q) ||
            (o.telefono || '').includes(q)
        )
        .slice(0, 5)
        // Solo lo necesario para responder: no se mandan al modelo la dirección
        // ni el correo del cliente, que no hacen falta para dar un estado.
        .map((o) => ({
          codigo: o.code,
          cliente: o.nombre,
          estado: o.estado,
          monto: o.monto,
          metodo: o.metodo,
          fecha: o.fecha,
          entrega: o.entrega,
          productos: (o.items || []).map((i) => `${i.productName} x${i.qty}`),
        }));
      return res.status(200).json({
        resultado: encontrados.length
          ? { encontrados }
          : { encontrados: [], aviso: `Ningún pedido coincide con "${q}".` },
      });
    }

    return res.status(400).json({ error: `Acción desconocida: ${accion}` });
  } catch (err) {
    console.error('jarvis-accion:', err?.message);
    return res.status(200).json({
      resultado: { error: 'No se pudo consultar ese dato ahora mismo.' },
    });
  }
}
