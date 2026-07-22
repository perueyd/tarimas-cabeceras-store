import { isValidTipo, listPromoCodes, savePromoCodes, validatePromo } from './_promo.js';
import { hasDB } from './_store.js';
import { s } from './_pricing.js';
import { checkAdminAuth } from './_auth.js';
import { clientIp, rateLimitRequest } from './_ratelimit.js';

// GET   ?validar=CODE&total=123           -> público, sin clave. Valida un código para el checkout.
// GET   Authorization: Bearer <admin>     -> lista todos los códigos (panel).
// POST  Authorization: Bearer <admin>     -> crea o edita un código (upsert por "code").
// DELETE Authorization: Bearer <admin>&code=XXX -> elimina un código.
export default async function handler(req, res) {
  if (req.method === 'GET' && req.query.validar) {
    // Sin límite, alguien podría probar códigos al azar hasta adivinar uno.
    if (await rateLimitRequest(`promo-validar:${clientIp(req)}`, 20, 300)) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
    }
    const total = Number(req.query.total);
    const result = await validatePromo(req.query.validar, total);
    if (!result.valid) return res.status(400).json({ error: result.motivo });
    return res.status(200).json({
      ok: true,
      code: result.promo.code,
      tipo: result.promo.tipo,
      valor: result.promo.valor,
      descuento: result.descuento,
    });
  }

  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (req.method === 'GET') {
    const codes = await listPromoCodes();
    return res.status(200).json({ codes });
  }

  if (!hasDB) {
    return res.status(501).json({
      error: 'Base de datos no conectada. Conecta la integración gratuita "Upstash Redis" en Vercel (Storage → Marketplace) para poder crear códigos.',
    });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const code = s(body.code, 30).trim().toUpperCase().replace(/\s+/g, '');
    if (!code) return res.status(400).json({ error: 'El código no puede estar vacío.' });
    if (!/^[A-Z0-9-]{3,30}$/.test(code)) {
      return res.status(400).json({ error: 'El código debe tener 3–30 caracteres: letras, números o guiones.' });
    }
    const tipo = isValidTipo(body.tipo) ? body.tipo : 'porcentaje';
    let valor = Number(body.valor);
    if (!Number.isFinite(valor) || valor <= 0) {
      return res.status(400).json({ error: 'El valor del descuento debe ser mayor a 0.' });
    }
    valor = tipo === 'porcentaje' ? Math.min(valor, 100) : valor;

    let maxUsos = null;
    if (body.maxUsos !== '' && body.maxUsos != null) {
      const n = parseInt(body.maxUsos, 10);
      if (Number.isFinite(n) && n > 0) maxUsos = n;
    }
    let vence = null;
    if (body.vence && /^\d{4}-\d{2}-\d{2}$/.test(body.vence)) vence = body.vence;

    const list = await listPromoCodes();
    const idx = list.findIndex((p) => p.code === code);
    const registro = {
      code,
      tipo,
      valor,
      activo: body.activo !== false,
      maxUsos,
      vence,
      usados: idx >= 0 ? list[idx].usados || 0 : 0,
      creado: idx >= 0 ? list[idx].creado : new Date().toISOString(),
    };
    if (idx >= 0) list[idx] = registro;
    else list.push(registro);

    await savePromoCodes(list);
    return res.status(200).json({ ok: true, codes: list });
  }

  if (req.method === 'DELETE') {
    const code = s(req.query.code, 30).toUpperCase();
    if (!code) return res.status(400).json({ error: 'Falta el código.' });
    const list = (await listPromoCodes()).filter((p) => p.code !== code);
    await savePromoCodes(list);
    return res.status(200).json({ ok: true, codes: list });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
