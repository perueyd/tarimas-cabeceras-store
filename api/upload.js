import { put } from '@vercel/blob';
import { s } from './_pricing.js';
import { checkAdminAuth } from './_auth.js';
import { comprimir, textoAhorro, versionChica } from './_comprimir.js';

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
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  // DELETE: quita una foto del almacén.
  //
  // Hasta ahora solo se podía subir. Una foto reemplazada o subida por error
  // se quedaba publicada en internet para siempre, con su dirección accesible
  // a cualquiera que la tuviera, y gastando cuota — que es justo lo que agotó
  // el plan gratuito en agosto.
  if (req.method === 'DELETE') {
    const url = s(req.query.url, 400);
    // Solo se borra lo que es de esta tienda. Sin esta comprobación, bastaría
    // mandar la dirección de otro almacén para que el servidor la borrara.
    // Se comprueba con la URL ya interpretada en vez de con un patrón de
    // texto: así no hay forma de colar algo como
    // "https://malo.com/?x=.public.blob.vercel-storage.com/productos/".
    let destino;
    try {
      destino = new URL(url);
    } catch {
      destino = null;
    }
    const esNuestra =
      destino?.protocol === 'https:' &&
      destino.hostname.endsWith('.public.blob.vercel-storage.com') &&
      destino.pathname.startsWith('/productos/');

    if (!esNuestra) {
      return res.status(400).json({ error: 'Esa dirección no es una foto de esta tienda.' });
    }
    try {
      const { del } = await import('@vercel/blob');
      // Se borra también su versión chica: si se quedara, ocuparía cuota
      // para siempre sin que nadie la pudiera encontrar ni usar.
      const chica = url.endsWith('.webp') ? `${url.slice(0, -5)}-sm.webp` : url;
      await del(url);
      if (chica !== url) await del(chica).catch(() => {});
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('No se pudo borrar la foto:', err?.message);
      return res.status(503).json({ error: 'No se pudo borrar la foto. Intenta de nuevo.' });
    }
  }
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
    // SIEMPRE se comprime aquí, aunque el navegador ya lo hubiera hecho.
    // Comprimir dos veces una foto ya pequeña no la estropea (sharp no la
    // agranda ni le baja más la calidad de lo pedido), y en cambio garantiza
    // que NADA entre al almacén sin pasar por la misma medida. Así se agotó la
    // cuota en agosto: por fiarse de que el navegador lo había hecho.
    const foto = await comprimir(body);
    const chica = await versionChica(foto.buffer);

    const base = `productos/${Date.now()}-${safe.replace(/.(jpe?g|png|webp)$/, '')}`;
    const [blob, blobChica] = await Promise.all([
      put(`${base}.webp`, foto.buffer, { access: 'public', contentType: 'image/webp' }),
      // La versión chica es la que carga la rejilla del catálogo: pesa una
      // quinta parte y ahí se ve igual.
      put(`${base}-sm.webp`, chica, { access: 'public', contentType: 'image/webp' }),
    ]);

    return res.status(200).json({
      ok: true,
      url: blob.url,
      urlChica: blobChica.url,
      medidas: `${foto.ancho}x${foto.alto}`,
      ahorro: textoAhorro(foto.antes, foto.despues),
    });
  } catch (err) {
    console.error('Error al subir a Blob:', err?.name, err?.message);

    // El almacén se bloquea al superar la cuota gratuita de Vercel, y entonces
    // NINGUNA subida va a funcionar por más veces que se intente. Decir
    // "intenta de nuevo" en ese caso solo hace perder el tiempo: hay que
    // explicar qué pasa y hasta cuándo.
    const texto = `${err?.name || ''} ${err?.message || ''}`.toLowerCase();
    if (/suspend|blocked|quota|limit|store is blocked/.test(texto)) {
      return res.status(507).json({
        error:
          'El almacén de fotos está bloqueado por Vercel: se superó el límite gratuito de 10 GB. ' +
          'No se puede subir nada hasta que se libere (30 días desde el aviso) o se amplíe el plan. ' +
          'No sigas intentando: la foto está bien, el problema es la cuota.',
        motivo: 'almacen-bloqueado',
      });
    }

    if (/network|fetch|timeout|ECONN/i.test(texto)) {
      return res.status(503).json({ error: 'Se cortó la conexión al subir la foto. Intenta de nuevo.' });
    }

    return res.status(500).json({
      error: `No se pudo subir la foto (${err?.name || 'error desconocido'}). Si se repite, avísanos.`,
    });
  }
}
