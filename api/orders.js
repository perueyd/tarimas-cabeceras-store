import { actualizarPedido, deleteOrder, hasDB, buscarPedido, listOrders, newOrderCode, notifySheet, redisCmd, saveOrder } from './_store.js';
import { priceOrder, s } from './_pricing.js';
import { getCatalog } from './_catalog.js';
import { registerPromoUsage, reservarUso, validatePromo } from './_promo.js';
import { checkAdminAuth } from './_auth.js';
import { agregarAlHistorial } from './_historial.js';
import { clientIp, rateLimitRequest } from './_ratelimit.js';
import { calcularDescuentoAuto, comprobarMontoEsperado, mejorTotal } from './_ofertas-auto.js';
import { separarIGV } from './_impuestos.js';
import { leerDatosComprobante, revisarComprobante } from '../src/lib/documento.js';
import { comprobanteParaCliente, comprobanteVigente, emitirComprobante } from './_facturador.js';

const ESTADOS_VALIDOS = ['Pago por verificar', 'Pagado', 'Entregado', 'Cancelado'];
// 'Yape/Plin' queda solo para los pedidos antiguos: ahora se distinguen, porque
// la boleta debe decir con qué se pagó.
const METODOS_VALIDOS = ['Yape', 'Plin', 'Transferencia bancaria', 'Tarjeta/Yape (Culqi)', 'Yape/Plin'];

// POST   -> registra un pedido (pagos manuales: Yape/Plin directo, transferencia).
// GET    -> ?code=  seguimiento público de UN pedido (sin datos sensibles, sin clave).
//        -> Authorization: Bearer <admin>  lista todos los pedidos del negocio (panel admin).
// PATCH  -> el dueño cambia estado y/o método de un pedido. Notifica la hoja + correo.
// DELETE -> el dueño elimina un pedido del panel.
export default async function handler(req, res) {
  if (req.method === 'POST') {
    if (await rateLimitRequest(`orders-post:${clientIp(req)}`, 15, 3600)) {
      return res.status(429).json({ error: 'Demasiados pedidos seguidos. Espera unos minutos o escríbenos por WhatsApp.' });
    }
    const body = req.body || {};
    const metodo = s(body.metodo, 40);
    const nombre = s(body.nombre, 120);
    const telefono = s(body.telefono, 30);
    if (!metodo || !nombre || !telefono) {
      return res.status(400).json({ error: 'Faltan datos del pedido (metodo, nombre, telefono).' });
    }
    // SEGURIDAD: el monto se recalcula desde el catálogo ACTUAL; se ignora el del navegador.
    const catalog = await getCatalog();
    const { products } = catalog;
    const priced = priceOrder(products, body.items);
    if (!priced) {
      return res.status(400).json({ error: 'El pedido contiene productos o tamaños inválidos.' });
    }

    // Código promocional (opcional): se revalida aquí, nunca se confía en el
    // descuento que mande el navegador. Si el código dejó de ser válido justo
    // en este instante (venció, se acabó), simplemente no se aplica — la
    // compra sigue, no se bloquea al cliente por eso.
    let promoCode = null;
    let promoDescuento = 0;
    const promoInput = s(body.promoCode, 30);
    if (promoInput) {
      const promoResult = await validatePromo(promoInput, priced.total);
      if (promoResult.valid) {
        // Se reserva el uso de forma atomica ANTES de aplicar el descuento:
        // si el cupon se agoto justo ahora, no se aplica.
        const reservado = await reservarUso(promoResult.promo.code, promoResult.promo.maxUsos);
        if (reservado) {
          promoDescuento = promoResult.descuento;
          promoCode = promoResult.promo.code;
        }
      }
    }

    // Los descuentos automáticos también valen para Yape/transferencia: antes
    // el pedido se guardaba al precio completo aunque el cliente viera otro.
    const { descuento: descuentoAuto } = await calcularDescuentoAuto(priced.items, priced.total, products);
    const { descuento, total: montoFinal, vieneDePromo } = mejorTotal(priced.total, promoDescuento, descuentoAuto);
    const descuentoDePromo = vieneDePromo;
    promoDescuento = descuento;

    const control = comprobarMontoEsperado(montoFinal, body.montoMostrado);
    if (!control.ok) return res.status(409).json({ error: control.error });

    // Datos del comprobante, revisados otra vez: lo que llega del navegador no
    // se cree sin comprobar (ver leerDatosComprobante).
    const datosComprobante = leerDatosComprobante(body);

    const order = {
      code: newOrderCode(),
      fecha: new Date().toISOString(),
      estado: 'Pago por verificar',
      metodo,
      monto: montoFinal,
      // El desglose se guarda CON el pedido, no se recalcula al mirarlo.
      // Si mañana cambia la tasa del IGV, los pedidos viejos deben seguir
      // mostrando el IGV que de verdad se les cobró, no el de hoy.
      base: separarIGV(montoFinal).base,
      igv: separarIGV(montoFinal).igv,
      promoCode,
      promoDescuento,
      // Lo que hace falta para emitir la boleta o la factura en SUNAT.
      ...datosComprobante,
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
      const saved = await saveOrder(order, { ownerEmail: s(catalog.storeConfig?.ownerEmail, 120) });
      // Solo se gasta el cupón si el descuento aplicado salió de él, y se
      // espera: en Vercel la función se congela tras responder.
      if (promoCode && descuentoDePromo) {
        await registerPromoUsage(promoCode).catch(() => {});
        // Deja constancia de quien uso el cupon: es lo que alimenta las
        // pestanas Historial de codigos y Analytics de ofertas, que hasta
        // ahora salian siempre vacias porque nadie escribia nada.
        await agregarAlHistorial(promoCode, { nombre, telefono, email: s(body.email, 120) }, montoFinal, descuento).catch(() => {});
      }
      // Ya compró: quita su carrito de la lista de "abandonados".
      if (hasDB && telefono) redisCmd(['HDEL', 'carritos:abandonados', telefono]).catch(() => {});
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
      if (await rateLimitRequest(`orders-track:${clientIp(req)}`, 40, 600)) {
        return res.status(429).json({ error: 'Demasiadas búsquedas seguidas. Espera un momento.' });
      }
      const code = s(req.query.code, 30);
      if (!hasDB) {
        return res.status(501).json({ error: 'El seguimiento aún no está disponible.' });
      }
      // Busca por indice: no depende de cuantos pedidos haya acumulados.
      const found = await buscarPedido(code);
      if (!found) return res.status(404).json({ error: 'No encontramos un pedido con ese código.' });
      return res.status(200).json({
        order: {
          code: found.code,
          estado: found.estado,
          fecha: found.fecha,
          entrega: found.entrega,
          monto: found.monto,
          items: (found.items || []).map((i) => ({ productName: i.productName, qty: i.qty })),
          // La boleta o factura, para que el cliente la descargue (obligatorio entregársela).
          comprobante: comprobanteParaCliente(found.comprobante),
        },
      });
    }

    if (!process.env.ORDERS_ADMIN_KEY) {
      return res.status(501).json({ error: 'Configura la variable ORDERS_ADMIN_KEY en Vercel para ver los pedidos.' });
    }
    const auth = await checkAdminAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
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

  // PATCH: el dueño cambia el estado, el método, la referencia (nº de
  // operación) o los datos del comprobante. Al pasar a "Pagado" se emite la
  // boleta o factura en el facturador (si está conectado).
  if (req.method === 'PATCH') {
    const auth = await checkAdminAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    if (!hasDB) return res.status(501).json({ error: 'Base de datos no conectada.' });
    const b = req.body || {};
    const code = s(b.code, 30);
    const estado = b.estado != null ? s(b.estado, 30) : null;
    const metodo = b.metodo != null ? s(b.metodo, 40) : null;
    const referencia = b.referencia != null ? s(b.referencia, 60) : null;
    const cambiaDocumento = b.docNumero != null;
    if (!code || (!estado && !metodo && referencia === null && !cambiaDocumento)) {
      return res.status(400).json({ error: 'Datos inválidos (code y estado, metodo, referencia o documento).' });
    }
    if (estado && !ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido.' });
    }
    if (metodo && !METODOS_VALIDOS.includes(metodo)) {
      return res.status(400).json({ error: 'Método inválido.' });
    }
    let documento = {};
    if (cambiaDocumento) {
      documento = leerDatosComprobante(b);
      if (!documento.docNumero) {
        const tipo = b.docTipo === 'factura' ? 'factura' : 'boleta';
        return res.status(400).json({ error: revisarComprobante({ tipo, numero: s(b.docNumero, 15).trim(), razonSocial: s(b.razonSocial, 150) }) || 'Documento inválido.' });
      }
    }

    // Con la boleta ya emitida, cambiar el documento o el medio de pago dejaría el
    // pedido diciendo una cosa y la boleta otra.
    const previo = await buscarPedido(code);
    if (!previo) return res.status(404).json({ error: 'Pedido no encontrado.' });
    const emitido = comprobanteVigente(previo.comprobante) ? previo.comprobante.numero : null;
    if (emitido && (cambiaDocumento || (metodo && metodo !== previo.metodo))) {
      return res.status(409).json({ error: `Este pedido ya tiene el comprobante ${emitido}: el documento y el medio de pago ya no se cambian. Si están mal, hay que emitir una nota de crédito.` });
    }

    let order = await actualizarPedido(code, (o) => {
      if (estado) o.estado = estado;
      if (metodo) o.metodo = metodo;
      if (referencia !== null) o.referencia = referencia;
      if (cambiaDocumento) {
        delete o.razonSocial;
        Object.assign(o, documento);
      }
      return o;
    });
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });

    // Cobrado y sin comprobante todavía: se emite. También al pasar directo a
    // "Entregado" (antes ese pedido se quedaba sin boleta). Se espera la
    // respuesta porque en Vercel la función se congela al responder.
    if ((estado === 'Pagado' || estado === 'Entregado') && !order.comprobante?.numero) {
      const { sizes } = await getCatalog();
      const comprobante = await emitirComprobante(order, { sizes });
      order = (await actualizarPedido(code, (o) => ({ ...o, comprobante }))) || order;
    }

    // Agrega una fila nueva a la hoja de Google (historial con fecha de cada
    // cambio de estado) y avisa al cliente por correo, si hay email.
    if (estado) {
      notifySheet({
        ...order,
        evento: 'actualizado',
        fecha: new Date().toISOString(), // fecha de ESTE cambio de estado, no la del pedido original
      }).catch(() => {});
    }
    // Cancelar el pedido NO anula la boleta en SUNAT: se avisa para que no se
    // dé por anulada una venta que sigue declarada.
    const aviso = emitido && (estado === 'Cancelado' || estado === 'Pago por verificar')
      ? `Ojo: el comprobante ${emitido} sigue vigente en SUNAT. Cambiar el estado del pedido no lo anula; para eso hay que emitir una nota de crédito.`
      : undefined;
    return res.status(200).json({ ok: true, order, ...(aviso ? { aviso } : {}) });
  }

  // DELETE: el dueño elimina un pedido del panel (no borra la fila ya escrita en Sheets).
  if (req.method === 'DELETE') {
    const auth = await checkAdminAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    if (!hasDB) return res.status(501).json({ error: 'Base de datos no conectada.' });
    const code = s(req.query.code, 30);
    if (!code) return res.status(400).json({ error: 'Falta el código del pedido.' });
    // Nunca se borra un pedido con boleta o factura vigente: se perdería en el
    // panel el único enlace a un comprobante que SUNAT sí tiene.
    const pedido = await buscarPedido(code);
    if (comprobanteVigente(pedido?.comprobante)) {
      return res.status(409).json({ error: `No se puede eliminar: tiene el comprobante ${pedido.comprobante.numero}. Márcalo como "Cancelado" si hace falta.` });
    }
    const ok = await deleteOrder(code);
    if (!ok) return res.status(404).json({ error: 'Pedido no encontrado.' });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
