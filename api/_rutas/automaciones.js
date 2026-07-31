import { hasDB, redisCmd } from '../_store.js';
import { s } from '../_pricing.js';
import { checkAdminAuth } from '../_auth.js';

const KEY = 'automaciones:todas';

async function listarAutomaciones() {
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

async function guardarAutomaciones(list) {
  if (!hasDB) return false;
  await redisCmd(['SET', KEY, JSON.stringify(list)]);
  return true;
}

export default async function handler(req, res) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (req.method === 'GET') {
    const automaciones = await listarAutomaciones();
    return res.status(200).json({ automaciones });
  }

  if (!hasDB) {
    return res.status(501).json({
      error: 'Base de datos no conectada. Conecta Upstash Redis en Vercel.',
    });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const id = body.id || `auto-${Date.now()}`;

    const automacion = {
      id,
      tipo: body.tipo || 'notificacion',
      activa: body.activa !== false,
      creado: body.creado || new Date().toISOString(),
      mensaje: body.mensaje || '',
      mensajeWhatsapp: body.mensajeWhatsapp || '',
      condicion: body.condicion || '',
    };

    const list = await listarAutomaciones();
    const idx = list.findIndex((a) => a.id === id);
    if (idx >= 0) list[idx] = automacion;
    else list.push(automacion);

    await guardarAutomaciones(list);
    return res.status(200).json({ ok: true, automaciones: list });
  }

  if (req.method === 'DELETE') {
    const id = s(req.query.id, 50);
    if (!id) return res.status(400).json({ error: 'Falta el ID.' });
    const list = (await listarAutomaciones()).filter((a) => a.id !== id);
    await guardarAutomaciones(list);
    return res.status(200).json({ ok: true, automaciones: list });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
