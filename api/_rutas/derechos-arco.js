// Solicitudes de derechos ARCO (Acceso, Rectificación, Cancelación, Oposición).
//
// La Ley 29733 y su reglamento obligan a poner a disposición del titular un
// canal para ejercer estos derechos, y a responder en plazo: 20 días hábiles
// para el acceso y 10 días hábiles para los demás.
//
// Antes no existía ningún canal: la política los mencionaba pero no había
// forma de ejercerlos, que es justo lo que la ANPD sanciona.
//
// POST  público -> el cliente registra su solicitud
// GET   admin   -> el dueño ve las pendientes y sus plazos

import { hasDB, redisCmd } from '../_store.js';
import { s } from '../_pricing.js';
import { checkAdminAuth } from '../_auth.js';
import { clientIp, rateLimitRequest } from '../_ratelimit.js';

const KEY = 'arco:solicitudes';

const TIPOS = {
  acceso: { label: 'Acceso', diasHabiles: 20 },
  rectificacion: { label: 'Rectificación', diasHabiles: 10 },
  cancelacion: { label: 'Cancelación', diasHabiles: 10 },
  oposicion: { label: 'Oposición', diasHabiles: 10 },
  revocacion: { label: 'Revocación del consentimiento', diasHabiles: 10 },
};

// Suma días HÁBILES (sin sábados ni domingos). No contempla feriados, así que
// la fecha mostrada es orientativa y siempre a favor del cliente.
function sumarHabiles(desde, dias) {
  const f = new Date(desde);
  let restan = dias;
  while (restan > 0) {
    f.setDate(f.getDate() + 1);
    const d = f.getDay();
    if (d !== 0 && d !== 6) restan--;
  }
  return f.toISOString();
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    if (await rateLimitRequest(`arco:${clientIp(req)}`, 5, 3600)) {
      return res.status(429).json({ error: 'Ya enviaste varias solicitudes. Escríbenos por WhatsApp.' });
    }

    const body = req.body || {};
    const tipo = s(body.tipo, 20);
    const nombre = s(body.nombre, 120).trim();
    const documento = s(body.documento, 20).trim();
    const email = s(body.email, 120).trim();
    const detalle = s(body.detalle, 1000).trim();

    if (!TIPOS[tipo]) return res.status(400).json({ error: 'Elige qué derecho quieres ejercer.' });
    if (!nombre || !documento || !email) {
      return res.status(400).json({ error: 'Necesitamos tu nombre, documento y correo para responderte.' });
    }

    const ahora = new Date().toISOString();
    const solicitud = {
      folio: `ARCO-${Date.now().toString(36).toUpperCase()}`,
      tipo,
      tipoLabel: TIPOS[tipo].label,
      nombre,
      documento,
      email,
      telefono: s(body.telefono, 30).trim(),
      detalle,
      fecha: ahora,
      // El plazo se calcula al registrar, no al responder: así queda constancia
      // de cuándo vencía, aunque el dueño lo mire tarde.
      venceEl: sumarHabiles(ahora, TIPOS[tipo].diasHabiles),
      estado: 'Pendiente',
    };

    if (!hasDB) {
      console.log('SOLICITUD ARCO (sin base de datos):', JSON.stringify(solicitud));
      return res.status(200).json({ ok: true, folio: solicitud.folio, guardado: false });
    }

    try {
      await redisCmd(['LPUSH', KEY, JSON.stringify(solicitud)]);
      return res.status(200).json({ ok: true, folio: solicitud.folio, guardado: true });
    } catch {
      console.log('SOLICITUD ARCO (error BD):', JSON.stringify(solicitud));
      return res.status(200).json({ ok: true, folio: solicitud.folio, guardado: false });
    }
  }

  if (req.method === 'GET') {
    const auth = await checkAdminAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    if (!hasDB) return res.status(200).json({ solicitudes: [] });

    const data = await redisCmd(['LRANGE', KEY, '0', '299']);
    const solicitudes = (data.result || [])
      .map((raw) => {
        try { return JSON.parse(raw); } catch { return null; }
      })
      .filter(Boolean)
      .map((x) => ({
        ...x,
        // Días que quedan para responder; negativo si ya venció.
        diasRestantes: Math.ceil((new Date(x.venceEl) - Date.now()) / 86400000),
      }));

    return res.status(200).json({ solicitudes });
  }

  // PATCH: el dueño marca una solicitud como atendida.
  if (req.method === 'PATCH') {
    const auth = await checkAdminAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    if (!hasDB) return res.status(501).json({ error: 'Base de datos no conectada.' });

    const folio = s(req.body?.folio, 40);
    const respuesta = s(req.body?.respuesta, 1000).trim();
    if (!folio) return res.status(400).json({ error: 'Falta el folio.' });

    const data = await redisCmd(['LRANGE', KEY, '0', '299']);
    const list = data.result || [];
    for (const raw of list) {
      try {
        const x = JSON.parse(raw);
        if (x.folio !== folio) continue;
        const actualizada = {
          ...x,
          estado: 'Atendida',
          respuesta,
          fechaRespuesta: new Date().toISOString(),
        };
        // Por valor, no por posición (ver reemplazarEnLista en _store.js).
        await redisCmd(['LPUSH', KEY, JSON.stringify(actualizada)]);
        await redisCmd(['LREM', KEY, '0', raw]);
        return res.status(200).json({ ok: true, solicitud: actualizada });
      } catch { /* sigue buscando */ }
    }
    return res.status(404).json({ error: 'Solicitud no encontrada.' });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
