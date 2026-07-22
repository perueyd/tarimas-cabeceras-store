import { put } from '@vercel/blob';
import { s } from './_pricing.js';
import { checkAdminAuth } from './_auth.js';

const EXTENSIONES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const MAX_BYTES = 4.4 * 1024 * 1024; // límite práctico de las funciones de Vercel (~4.5 MB)

// Revisa los primeros bytes del archivo (no el nombre) para confirmar que es
// una imagen de verdad — evita que alguien suba, por ejemplo, un HTML o SVG
// con script adentro disfrazado de "foto.jpg".
function sniffImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

// Sube una foto al almacén de Vercel Blob y devuelve su URL pública.
// Protegido con la clave de administrador — solo el dueño puede subir.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(501).json({
      error: 'El almacén de fotos no está conectado. En Vercel: Storage → Create Database → Blob → conectar al proyecto → Redeploy.',
    });
  }

  const rawName = s(req.query.filename, 100) || 'foto.jpg';
  const ext = rawName.split('.').pop().toLowerCase();
  if (!EXTENSIONES[ext]) {
    return res.status(400).json({ error: 'Formato no permitido. Usa JPG, PNG o WEBP.' });
  }

  // El archivo llega como cuerpo binario; según el content-type Vercel puede
  // haberlo dejado ya como Buffer o aún en el stream.
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
    return res.status(413).json({ error: 'La foto pesa más de 4 MB. Redúcela un poco (1200 px de ancho es suficiente).' });
  }
  const tipoReal = sniffImageType(body);
  const extNormalizada = ext === 'jpeg' ? 'jpg' : ext;
  if (!tipoReal || tipoReal !== extNormalizada) {
    return res.status(400).json({ error: 'El archivo no es una imagen JPG, PNG o WEBP válida.' });
  }

  const safe = rawName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/[^a-z0-9.]+/g, '-');

  try {
    const blob = await put(`productos/${Date.now()}-${safe}`, body, {
      access: 'public',
      contentType: EXTENSIONES[ext],
    });
    return res.status(200).json({ ok: true, url: blob.url });
  } catch (err) {
    console.log('Error al subir a Blob:', err?.message);
    return res.status(500).json({ error: 'No se pudo subir la foto. Intenta de nuevo.' });
  }
}
