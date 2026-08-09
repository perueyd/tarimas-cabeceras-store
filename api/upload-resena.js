import { put } from '@vercel/blob';
import { s } from './_pricing.js';
import { clientIp, rateLimitRequest } from './_ratelimit.js';

// Subida de foto para una reseña de cliente. A diferencia de /api/upload (solo
// dueño), esta es PÚBLICA, así que va con candados:
//  - Límite por IP (pocas por hora) para que nadie abuse del almacenamiento.
//  - Tamaño máximo y verificación de los primeros bytes (que sea imagen real).
//  - Solo JPG/PNG/WEBP.
// Además, la reseña con foto queda PENDIENTE de aprobación del dueño antes de
// mostrarse (ver api/reviews.js), así una imagen indebida nunca sale sola.
const EXTENSIONES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const MAX_BYTES = 4.4 * 1024 * 1024;

function sniffImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  // Máximo 6 fotos por hora por IP.
  if (await rateLimitRequest(`upload-resena:${clientIp(req)}`, 6, 3600)) {
    return res.status(429).json({ error: 'Subiste varias fotos seguidas. Intenta más tarde.' });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(501).json({ error: 'La subida de fotos no está disponible por ahora.' });
  }

  const rawName = s(req.query.filename, 100) || 'foto.jpg';
  const ext = rawName.split('.').pop().toLowerCase();
  if (!EXTENSIONES[ext]) {
    return res.status(400).json({ error: 'Formato no permitido. Usa JPG, PNG o WEBP.' });
  }

  let body = req.body;
  if (!Buffer.isBuffer(body)) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = Buffer.concat(chunks);
  }
  if (!body || body.length === 0) {
    return res.status(400).json({ error: 'No llegó ningún archivo.' });
  }
  if (body.length > MAX_BYTES) {
    return res.status(413).json({ error: 'La foto pesa más de 4 MB. Redúcela un poco.' });
  }
  const tipoReal = sniffImageType(body);
  const extNormalizada = ext === 'jpeg' ? 'jpg' : ext;
  if (!tipoReal || tipoReal !== extNormalizada) {
    return res.status(400).json({ error: 'El archivo no es una imagen JPG, PNG o WEBP válida.' });
  }

  try {
    const blob = await put(`resenas/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extNormalizada}`, body, {
      access: 'public',
      contentType: EXTENSIONES[ext],
    });
    return res.status(200).json({ ok: true, url: blob.url });
  } catch (err) {
    console.error('Error al subir foto de reseña:', err?.name, err?.message);

    // Si el almacén está bloqueado por cuota, reintentar no sirve de nada. Al
    // cliente no se le cuentan los problemas internos de la tienda: se le dice
    // que deje su opinión sin foto, que es lo que sí puede hacer.
    const texto = `${err?.name || ''} ${err?.message || ''}`.toLowerCase();
    if (/suspend|blocked|quota|limit|store is blocked/.test(texto)) {
      return res.status(507).json({
        error: 'Ahora mismo no podemos recibir fotos. Puedes dejar tu reseña solo con texto.',
      });
    }

    return res.status(500).json({ error: 'No se pudo subir la foto. Puedes dejar tu reseña sin ella.' });
  }
}
