import { hasDB, redisCmd } from './_store.js';
import { s } from './_pricing.js';

// Libro de Reclamaciones Virtual — exigido por el Código de Protección y
// Defensa del Consumidor (Ley 29571) y su reglamento (D.S. 011-2011-PCM y
// modificatorias) para todo establecimiento comercial, incluidas las tiendas
// online. Debe estar accesible sin necesidad de comprar ni iniciar sesión.
//
// POST  -> registra un reclamo o queja (público, cualquier visitante, sin clave).
// GET   -> ?key=admin  lista todos los reclamos (panel del negocio).
// PATCH -> ?key=admin  el dueño registra su respuesta a un reclamo (por folio).
// No hay DELETE a propósito: los reclamos son un registro legal, no se borran.

const TIPOS_DOC = ['DNI', 'CE', 'Pasaporte'];
const TIPOS_RECLAMO = ['Reclamo', 'Queja'];
const TIPOS_BIEN = ['Producto', 'Servicio'];

async function nextFolio() {
  const year = new Date().getFullYear();
  if (hasDB) {
    try {
      const data = await redisCmd(['INCR', `reclamos:contador:${year}`]);
      return `RC-${year}-${String(data.result).padStart(4, '0')}`;
    } catch { /* usa el respaldo de abajo */ }
  }
  return `RC-${year}-${Date.now().toString(36).toUpperCase()}`;
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const body = req.body || {};
    const tipo = TIPOS_RECLAMO.includes(body.tipo) ? body.tipo : null;
    const nombre = s(body.nombre, 150).trim();
    const tipoDocumento = TIPOS_DOC.includes(body.tipoDocumento) ? body.tipoDocumento : null;
    const numeroDocumento = s(body.numeroDocumento, 20).trim();
    const domicilio = s(body.domicilio, 300).trim();
    const telefono = s(body.telefono, 30).trim();
    const email = s(body.email, 120).trim();
    const bienTipo = TIPOS_BIEN.includes(body.bienTipo) ? body.bienTipo : 'Producto';
    const bienDescripcion = s(body.bienDescripcion, 300).trim();
    const detalle = s(body.detalle, 2000).trim();
    const pedido = s(body.pedido, 1000).trim();

    if (!tipo || !nombre || !tipoDocumento || !numeroDocumento || !domicilio || !telefono || !email || !detalle) {
      return res.status(400).json({ error: 'Completa todos los campos obligatorios.' });
    }

    const reclamo = {
      folio: await nextFolio(),
      fecha: new Date().toISOString(),
      tipo,
      consumidor: { nombre, tipoDocumento, numeroDocumento, domicilio, telefono, email },
      bien: { tipo: bienTipo, descripcion: bienDescripcion },
      detalle,
      pedido,
      estado: 'Pendiente',
      respuesta: '',
      fechaRespuesta: null,
    };

    if (hasDB) {
      try {
        await redisCmd(['LPUSH', 'reclamos', JSON.stringify(reclamo)]);
      } catch (err) {
        console.log('RECLAMO (error Redis, respaldo en logs):', JSON.stringify(reclamo));
      }
    } else {
      console.log('RECLAMO (BD no configurada):', JSON.stringify(reclamo));
    }

    return res.status(200).json({ ok: true, folio: reclamo.folio });
  }

  if (req.method === 'GET') {
    const adminKey = process.env.ORDERS_ADMIN_KEY;
    if (!adminKey || (req.query.key || '') !== adminKey) {
      return res.status(401).json({ error: 'Clave incorrecta.' });
    }
    if (!hasDB) return res.status(200).json({ reclamos: [] });
    const data = await redisCmd(['LRANGE', 'reclamos', '0', '499']);
    const reclamos = (data.result || [])
      .map((r) => {
        try { return JSON.parse(r); } catch { return null; }
      })
      .filter(Boolean);
    return res.status(200).json({ reclamos });
  }

  if (req.method === 'PATCH') {
    const adminKey = process.env.ORDERS_ADMIN_KEY;
    if (!adminKey || (req.query.key || '') !== adminKey) {
      return res.status(401).json({ error: 'Clave incorrecta.' });
    }
    if (!hasDB) return res.status(501).json({ error: 'Base de datos no conectada.' });
    const folio = s(req.body?.folio, 30);
    const respuesta = s(req.body?.respuesta, 2000).trim();
    if (!folio || !respuesta) return res.status(400).json({ error: 'Falta el folio o la respuesta.' });

    const data = await redisCmd(['LRANGE', 'reclamos', '0', '499']);
    const list = data.result || [];
    for (let i = 0; i < list.length; i++) {
      try {
        const r = JSON.parse(list[i]);
        if (r.folio === folio) {
          r.respuesta = respuesta;
          r.estado = 'Respondido';
          r.fechaRespuesta = new Date().toISOString();
          await redisCmd(['LSET', 'reclamos', String(i), JSON.stringify(r)]);
          return res.status(200).json({ ok: true, reclamo: r });
        }
      } catch { /* sigue buscando */ }
    }
    return res.status(404).json({ error: 'Reclamo no encontrado.' });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
