import { hasDB, redisCmd } from './_store.js';
import { s } from './_pricing.js';
import { checkAdminAuth } from './_auth.js';

const KEY = 'ofertas:todas';

async function listarOfertas() {
  if (!hasDB) return [];
  const data = await redisCmd(['GET', KEY]);
  if (!data.result) return [];
  try {
    const list = JSON.parse(data.result);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function guardarOfertas(list) {
  if (!hasDB) return false;
  await redisCmd(['SET', KEY, JSON.stringify(list)]);
  return true;
}

export default async function handler(req, res) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (req.method === 'GET') {
    const ofertas = await listarOfertas();
    return res.status(200).json({ ofertas });
  }

  if (!hasDB) {
    return res.status(501).json({
      error: 'Base de datos no conectada. Conecta la integración gratuita "Upstash Redis" en Vercel (Storage → Marketplace).',
    });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const tipo = body.tipo || 'codigo';

    let oferta = {
      id: body.id || `oferta-${Date.now()}`,
      tipo,
      activo: body.activo !== false,
      creado: body.creado || new Date().toISOString(),
    };

    // Campos comunes
    if (body.valor !== undefined) oferta.valor = Number(body.valor) || 0;
    if (body.tipoDesc) oferta.tipoDesc = body.tipoDesc;
    if (body.vence) oferta.vence = body.vence;
    if (body.usados !== undefined) oferta.usados = Number(body.usados) || 0;

    // Campos específicos por tipo
    if (tipo === 'codigo') {
      oferta.codigo = s(body.codigo, 30).toUpperCase();
      oferta.maxUsos = body.maxUsos ? parseInt(body.maxUsos) : null;
    } else if (tipo === 'cantidad') {
      oferta.cantidadMinima = Math.max(Number(body.cantidadMinima) || 2, 1);
    } else if (tipo === 'categoria') {
      oferta.categoria = body.categoria || '';
    } else if (tipo === 'regalo') {
      oferta.montoMinimo = Number(body.montoMinimo) || 0;
      oferta.montoRegalo = Number(body.montoRegalo) || 0;
    } else if (tipo === 'referido') {
      oferta.cantidadReferidos = Math.max(Number(body.cantidadReferidos) || 3, 1);
    } else if (tipo === 'mostrador') {
      oferta.textoMostrador = s(body.textoMostrador, 60) || '';
    }

    const list = await listarOfertas();
    const idx = list.findIndex((o) => o.id === oferta.id);
    if (idx >= 0) list[idx] = oferta;
    else list.push(oferta);

    await guardarOfertas(list);
    return res.status(200).json({ ok: true, ofertas: list });
  }

  if (req.method === 'DELETE') {
    const id = s(req.query.id, 50);
    if (!id) return res.status(400).json({ error: 'Falta el ID.' });
    const list = (await listarOfertas()).filter((o) => o.id !== id);
    await guardarOfertas(list);
    return res.status(200).json({ ok: true, ofertas: list });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
